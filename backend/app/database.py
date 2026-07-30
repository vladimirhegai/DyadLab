from __future__ import annotations

import secrets
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


SESSION_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
EXPORT_HEADER = ["timestamp", "participant", "event", "value"]


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def format_elapsed(elapsed_ms: int) -> str:
    total_seconds = max(0, elapsed_ms // 1000)
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"


class Database:
    def __init__(self, path: str | Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.initialize()

    def connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path, timeout=10)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA busy_timeout = 10000")
        return connection

    def initialize(self) -> None:
        with self.connect() as connection:
            connection.execute("PRAGMA journal_mode = WAL")
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    code TEXT NOT NULL UNIQUE,
                    created_at TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'active'
                );

                CREATE TABLE IF NOT EXISTS events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id INTEGER NOT NULL,
                    elapsed_ms INTEGER NOT NULL,
                    actor TEXT NOT NULL,
                    type TEXT NOT NULL,
                    value TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_events_session_id
                    ON events(session_id, id);
                """
            )

    def create_session(self) -> dict[str, Any]:
        created_at = utc_now().isoformat()
        with self.connect() as connection:
            for _ in range(20):
                code = "".join(secrets.choice(SESSION_ALPHABET) for _ in range(6))
                try:
                    cursor = connection.execute(
                        "INSERT INTO sessions (code, created_at, status) VALUES (?, ?, ?)",
                        (code, created_at, "active"),
                    )
                    return {
                        "id": cursor.lastrowid,
                        "code": code,
                        "created_at": created_at,
                        "status": "active",
                    }
                except sqlite3.IntegrityError:
                    continue
        raise RuntimeError("Could not generate a unique session code")

    def get_session(self, code: str) -> dict[str, Any] | None:
        with self.connect() as connection:
            row = connection.execute(
                """
                SELECT sessions.*, COUNT(events.id) AS event_count
                FROM sessions
                LEFT JOIN events ON events.session_id = sessions.id
                WHERE sessions.code = ?
                GROUP BY sessions.id
                """,
                (code.upper(),),
            ).fetchone()
        return dict(row) if row else None

    def set_session_status(self, code: str, status: str) -> None:
        with self.connect() as connection:
            connection.execute(
                "UPDATE sessions SET status = ? WHERE code = ?",
                (status, code.upper()),
            )

    def record_event(self, code: str, actor: str, event_type: str, value: str) -> dict[str, Any]:
        now = utc_now()
        with self.connect() as connection:
            session = connection.execute(
                "SELECT id, created_at FROM sessions WHERE code = ?",
                (code.upper(),),
            ).fetchone()
            if session is None:
                raise KeyError(code)

            started_at = datetime.fromisoformat(session["created_at"])
            elapsed_ms = max(0, int((now - started_at).total_seconds() * 1000))
            cursor = connection.execute(
                """
                INSERT INTO events (
                    session_id, elapsed_ms, actor, type, value, created_at
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                (session["id"], elapsed_ms, actor, event_type, value, now.isoformat()),
            )

        return {
            "id": f"evt-{cursor.lastrowid}",
            "elapsedMs": elapsed_ms,
            "timestamp": format_elapsed(elapsed_ms),
            "actor": actor,
            "type": event_type,
            "value": value,
        }

    def list_events(self, code: str) -> list[dict[str, Any]]:
        with self.connect() as connection:
            rows = connection.execute(
                """
                SELECT events.id, events.elapsed_ms, events.actor, events.type, events.value
                FROM events
                JOIN sessions ON sessions.id = events.session_id
                WHERE sessions.code = ?
                ORDER BY events.id ASC
                """,
                (code.upper(),),
            ).fetchall()

        return [
            {
                "id": f"evt-{row['id']}",
                "elapsedMs": row["elapsed_ms"],
                "timestamp": format_elapsed(row["elapsed_ms"]),
                "actor": row["actor"],
                "type": row["type"],
                "value": row["value"],
            }
            for row in rows
        ]

    def export_rows(self, code: str) -> list[dict[str, str]]:
        return [
            {
                "timestamp": event["timestamp"],
                "participant": event["actor"],
                "event": event["type"],
                "value": event["value"],
            }
            for event in self.list_events(code)
        ]
