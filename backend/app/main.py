from __future__ import annotations

import csv
import io
import json
import os
import time
from collections import defaultdict, deque
from pathlib import Path
from typing import Any
from urllib.parse import urlencode, urlsplit

from fastapi import FastAPI, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field

from .database import EXPORT_HEADER, Database
from .realtime import PARTICIPANTS, ConnectionManager


DEFAULT_DATABASE_PATH = Path(__file__).resolve().parents[1] / "dyadlab.db"
MAX_WEBSOCKET_MESSAGE_BYTES = 64 * 1024
WEBSOCKET_RATE_WINDOW_SECONDS = 10
WEBSOCKET_RATE_LIMIT = 240


class SessionCreate(BaseModel):
    join_base_url: str | None = Field(default=None, max_length=2048)


class FixedWindowRateLimiter:
    def __init__(self, limit: int, window_seconds: int):
        self.limit = limit
        self.window_seconds = window_seconds
        self.hits: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        bucket = self.hits[key]
        while bucket and bucket[0] <= now - self.window_seconds:
            bucket.popleft()
        if len(bucket) >= self.limit:
            return False
        bucket.append(now)
        return True


def normalize_code(code: str) -> str:
    return code.strip().upper()


def normalize_join_base_url(value: str | None) -> str:
    candidate = (value or "http://localhost:3000").rstrip("/")
    parsed = urlsplit(candidate)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise HTTPException(status_code=400, detail="join_base_url must be an HTTP(S) origin")
    return f"{parsed.scheme}://{parsed.netloc}"


def create_app(database_path: str | Path | None = None) -> FastAPI:
    resolved_database_path = database_path or os.getenv(
        "DYADLAB_DATABASE_PATH",
        str(DEFAULT_DATABASE_PATH),
    )
    database = Database(resolved_database_path)
    manager = ConnectionManager(database)
    create_limiter = FixedWindowRateLimiter(
        limit=max(1, int(os.getenv("DYADLAB_CREATE_RATE_LIMIT", "12"))),
        window_seconds=60,
    )

    app = FastAPI(
        title="DyadLab API",
        description="Persistent sessions, WebRTC signaling, and research-event exports.",
        version="2.0.0",
    )
    app.state.database = database
    app.state.manager = manager

    configured_origins = os.getenv(
        "DYADLAB_ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    )
    origins = {
        origin.strip().rstrip("/")
        for origin in configured_origins.split(",")
        if origin.strip()
    }
    app.add_middleware(
        CORSMiddleware,
        allow_origins=sorted(origins),
        allow_credentials=False,
        allow_methods=["GET", "POST", "DELETE"],
        allow_headers=["Content-Type"],
    )

    @app.middleware("http")
    async def add_security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-Frame-Options"] = "DENY"
        return response

    def require_access(
        code: str,
        token: str,
        role: str,
        participant: str | None = None,
    ) -> str:
        normalized = normalize_code(code)
        session = database.get_session(normalized)
        if session is None:
            raise HTTPException(status_code=404, detail="Session not found")
        if session["status"] == "expired":
            raise HTTPException(status_code=410, detail="Session has expired")
        if not database.verify_token(normalized, token, role, participant):
            raise HTTPException(status_code=403, detail="Invalid session credential")
        return normalized

    @app.get("/health")
    def health() -> dict[str, str]:
        database.expire_sessions()
        return {"status": "ok", "version": "2"}

    @app.post("/sessions", status_code=201)
    def create_session(payload: SessionCreate, request: Request) -> dict[str, Any]:
        client_key = request.client.host if request.client else "unknown"
        if not create_limiter.allow(client_key):
            raise HTTPException(
                status_code=429,
                detail="Too many sessions were created. Try again in one minute.",
            )

        session = database.create_session()
        join_base_url = normalize_join_base_url(payload.join_base_url)
        participant_urls = {
            participant: (
                f"{join_base_url}/session?"
                + urlencode(
                    {
                        "code": session["code"],
                        "participant": participant,
                        "token": session["participant_tokens"][participant],
                    }
                )
            )
            for participant in PARTICIPANTS
        }
        researcher_url = (
            f"{join_base_url}/dashboard?"
            + urlencode(
                {
                    "code": session["code"],
                    "token": session["researcher_token"],
                }
            )
        )
        return {
            "code": session["code"],
            "created_at": session["created_at"],
            "expires_at": session["expires_at"],
            "status": session["status"],
            "protocol_version": session["protocol_version"],
            "researcher_token": session["researcher_token"],
            "researcher_url": researcher_url,
            "participant_urls": participant_urls,
            "join_urls": [participant_urls[participant] for participant in PARTICIPANTS],
        }

    @app.get("/sessions/{code}")
    async def get_session(
        code: str,
        token: str = Query(..., min_length=20, max_length=128),
        role: str = Query("researcher", pattern="^(researcher|participant)$"),
        participant: str | None = Query(default=None, pattern="^(P01|P02)$"),
    ) -> dict[str, Any]:
        if role == "participant" and participant not in PARTICIPANTS:
            raise HTTPException(status_code=400, detail="Participant role requires P01 or P02")
        normalized = require_access(code, token, role, participant)
        snapshot = await manager.snapshot(
            normalized,
            participant if role == "participant" else None,
        )
        if snapshot is None:
            raise HTTPException(status_code=404, detail="Session not found")
        return snapshot

    @app.get("/sessions/{code}/events")
    def get_events(
        code: str,
        token: str = Query(..., min_length=20, max_length=128),
    ) -> list[dict[str, Any]]:
        normalized = require_access(code, token, "researcher")
        return database.list_events(normalized)

    @app.get("/sessions/{code}/events.json")
    def export_events_json(
        code: str,
        token: str = Query(..., min_length=20, max_length=128),
    ) -> Response:
        normalized = require_access(code, token, "researcher")
        content = json.dumps(database.export_json_rows(normalized), indent=2)
        return Response(
            content=content,
            media_type="application/json",
            headers={
                "Content-Disposition": (
                    f'attachment; filename="dyadlab-{normalized}-events.json"'
                )
            },
        )

    @app.get("/sessions/{code}/events.csv")
    def export_events_csv(
        code: str,
        token: str = Query(..., min_length=20, max_length=128),
    ) -> Response:
        normalized = require_access(code, token, "researcher")
        buffer = io.StringIO(newline="")
        writer = csv.writer(buffer, quoting=csv.QUOTE_ALL, lineterminator="\n")
        writer.writerow(EXPORT_HEADER)
        for row in database.export_rows(normalized):
            writer.writerow([row[column] for column in EXPORT_HEADER])
        return Response(
            content=buffer.getvalue(),
            media_type="text/csv",
            headers={
                "Content-Disposition": (
                    f'attachment; filename="dyadlab-{normalized}-events.csv"'
                )
            },
        )

    @app.delete("/sessions/{code}", status_code=204)
    async def delete_session(
        code: str,
        token: str = Query(..., min_length=20, max_length=128),
    ) -> Response:
        normalized = require_access(code, token, "researcher")
        await manager.remove_runtime(normalized)
        database.delete_session(normalized)
        return Response(status_code=204)

    @app.websocket("/ws/{session_code}")
    async def websocket_endpoint(
        websocket: WebSocket,
        session_code: str,
        role: str = Query(...),
        token: str = Query(..., min_length=20, max_length=128),
        participant: str | None = Query(default=None),
    ) -> None:
        normalized_code = normalize_code(session_code)
        normalized_participant = participant.upper() if participant else None
        origin = websocket.headers.get("origin")

        if origin and origin.rstrip("/") not in origins:
            await websocket.accept()
            await websocket.send_json({"type": "error", "message": "Origin is not allowed"})
            await websocket.close(code=4403)
            return
        if role not in {"participant", "researcher"}:
            await websocket.accept()
            await websocket.send_json({"type": "error", "message": "Invalid role"})
            await websocket.close(code=4400)
            return
        if role == "participant" and normalized_participant not in PARTICIPANTS:
            await websocket.accept()
            await websocket.send_json(
                {"type": "error", "message": "Participant must be P01 or P02"}
            )
            await websocket.close(code=4400)
            return
        session = database.get_session(normalized_code)
        if session is None:
            await websocket.accept()
            await websocket.send_json({"type": "error", "message": "Session not found"})
            await websocket.close(code=4404)
            return
        if session["status"] == "expired":
            await websocket.accept()
            await websocket.send_json({"type": "error", "message": "Session has expired"})
            await websocket.close(code=4410)
            return
        if not database.verify_token(
            normalized_code,
            token,
            role,
            normalized_participant,
        ):
            await websocket.accept()
            await websocket.send_json(
                {"type": "error", "message": "Invalid session credential"}
            )
            await websocket.close(code=4403)
            return

        runtime = await manager.connect(
            websocket,
            normalized_code,
            role,
            normalized_participant,
        )
        if runtime is None:
            return

        message_times: deque[float] = deque()
        try:
            while True:
                raw_message = await websocket.receive_text()
                if len(raw_message.encode("utf-8")) > MAX_WEBSOCKET_MESSAGE_BYTES:
                    await websocket.send_json(
                        {"type": "error", "message": "Message is too large"}
                    )
                    await websocket.close(code=1009)
                    return

                now = time.monotonic()
                while (
                    message_times
                    and message_times[0] <= now - WEBSOCKET_RATE_WINDOW_SECONDS
                ):
                    message_times.popleft()
                if len(message_times) >= WEBSOCKET_RATE_LIMIT:
                    await websocket.send_json(
                        {"type": "error", "message": "Message rate limit exceeded"}
                    )
                    await websocket.close(code=4429)
                    return
                message_times.append(now)

                try:
                    message = json.loads(raw_message)
                except (ValueError, json.JSONDecodeError):
                    await websocket.send_json(
                        {"type": "error", "message": "Message must be valid JSON"}
                    )
                    continue
                if not isinstance(message, dict):
                    await websocket.send_json(
                        {"type": "error", "message": "Message must be an object"}
                    )
                    continue
                await manager.handle_message(
                    runtime,
                    websocket,
                    role,
                    normalized_participant,
                    message,
                )
        except WebSocketDisconnect:
            pass
        finally:
            await manager.disconnect(
                runtime,
                websocket,
                role,
                normalized_participant,
            )

    return app


app = create_app()
