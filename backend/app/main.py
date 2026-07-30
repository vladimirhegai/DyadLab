from __future__ import annotations

import csv
import io
import json
import os
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

from .database import EXPORT_HEADER, Database
from .realtime import PARTICIPANTS, ConnectionManager


DEFAULT_DATABASE_PATH = Path(__file__).resolve().parents[1] / "dyadlab.db"


class SessionCreate(BaseModel):
    join_base_url: str | None = None


def normalize_code(code: str) -> str:
    return code.strip().upper()


def create_app(database_path: str | Path | None = None) -> FastAPI:
    resolved_database_path = database_path or os.getenv(
        "DYADLAB_DATABASE_PATH",
        str(DEFAULT_DATABASE_PATH),
    )
    database = Database(resolved_database_path)
    manager = ConnectionManager(database)

    app = FastAPI(
        title="DyadLab API",
        description="Persistent sessions, WebRTC signaling, and research-event exports.",
        version="1.0.0",
    )
    app.state.database = database
    app.state.manager = manager

    configured_origins = os.getenv(
        "DYADLAB_ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    )
    origins = [origin.strip() for origin in configured_origins.split(",") if origin.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.post("/sessions", status_code=201)
    def create_session(payload: SessionCreate) -> dict[str, Any]:
        session = database.create_session()
        join_base_url = (payload.join_base_url or "http://localhost:3000").rstrip("/")
        participant_urls = {
            participant: (
                f"{join_base_url}/session?code={session['code']}&participant={participant}"
            )
            for participant in PARTICIPANTS
        }
        return {
            "code": session["code"],
            "created_at": session["created_at"],
            "status": session["status"],
            "participant_urls": participant_urls,
            "join_urls": [participant_urls[participant] for participant in PARTICIPANTS],
        }

    @app.get("/sessions/{code}")
    async def get_session(code: str) -> dict[str, Any]:
        snapshot = await manager.snapshot(normalize_code(code))
        if snapshot is None:
            raise HTTPException(status_code=404, detail="Session not found")
        return snapshot

    @app.get("/sessions/{code}/events")
    def get_events(code: str) -> list[dict[str, Any]]:
        normalized = normalize_code(code)
        if database.get_session(normalized) is None:
            raise HTTPException(status_code=404, detail="Session not found")
        return database.list_events(normalized)

    @app.get("/sessions/{code}/events.json")
    def export_events_json(code: str) -> Response:
        normalized = normalize_code(code)
        if database.get_session(normalized) is None:
            raise HTTPException(status_code=404, detail="Session not found")
        content = json.dumps(database.export_rows(normalized), indent=2)
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
    def export_events_csv(code: str) -> Response:
        normalized = normalize_code(code)
        if database.get_session(normalized) is None:
            raise HTTPException(status_code=404, detail="Session not found")
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

    @app.websocket("/ws/{session_code}")
    async def websocket_endpoint(
        websocket: WebSocket,
        session_code: str,
        role: str = Query(...),
        participant: str | None = Query(default=None),
    ) -> None:
        normalized_code = normalize_code(session_code)
        normalized_participant = participant.upper() if participant else None

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

        runtime = await manager.connect(
            websocket,
            normalized_code,
            role,
            normalized_participant,
        )
        if runtime is None:
            return

        try:
            while True:
                try:
                    message = await websocket.receive_json()
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
