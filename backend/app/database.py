from __future__ import annotations

import hashlib
import json
import os
import secrets
import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any


SESSION_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
EVENT_SCHEMA_VERSION = 2
PROTOCOL_VERSION = "spotlight-sync-v2"
EXPORT_HEADER = [
    "schema_version",
    "session_code",
    "event_id",
    "sequence",
    "elapsed_ms",
    "recorded_at_utc",
    "round",
    "participant",
    "event",
    "payload_json",
    "value",
]


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def format_elapsed(elapsed_ms: int) -> str:
    total_seconds = max(0, elapsed_ms // 1000)
    hours, remainder = divmod(total_seconds, 3600)
    minutes, seconds = divmod(remainder, 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def parse_event_value(value: str) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    for part in value.replace(",", ";").split(";"):
        key, separator, item = part.partition("=")
        if not separator:
            continue
        normalized_key = key.strip()
        normalized_value = item.strip()
        if not normalized_key:
            continue
        if normalized_value.lower() in {"true", "false"}:
            payload[normalized_key] = normalized_value.lower() == "true"
            continue
        try:
            payload[normalized_key] = (
                float(normalized_value)
                if "." in normalized_value
                else int(normalized_value)
            )
        except ValueError:
            payload[normalized_key] = normalized_value
    if not payload and value:
        payload["rawValue"] = value
    return payload


class Database:
    def __init__(self, path: str | Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.session_ttl_hours = max(
            1,
            int(os.getenv("DYADLAB_SESSION_TTL_HOURS", "24")),
        )
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
                    expires_at TEXT,
                    status TEXT NOT NULL DEFAULT 'active',
                    researcher_token_hash TEXT,
                    p01_token_hash TEXT,
                    p02_token_hash TEXT,
                    protocol_version TEXT NOT NULL DEFAULT 'spotlight-sync-v2'
                );

                CREATE TABLE IF NOT EXISTS events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id INTEGER NOT NULL,
                    sequence INTEGER,
                    elapsed_ms INTEGER NOT NULL,
                    actor TEXT NOT NULL,
                    type TEXT NOT NULL,
                    value TEXT NOT NULL,
                    payload_json TEXT,
                    round_index INTEGER,
                    schema_version INTEGER NOT NULL DEFAULT 2,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_events_session_id
                    ON events(session_id, id);
                """
            )
            self._migrate_schema(connection)

    def _migrate_schema(self, connection: sqlite3.Connection) -> None:
        session_columns = {
            row["name"] for row in connection.execute("PRAGMA table_info(sessions)")
        }
        session_additions = {
            "expires_at": "TEXT",
            "researcher_token_hash": "TEXT",
            "p01_token_hash": "TEXT",
            "p02_token_hash": "TEXT",
            "protocol_version": f"TEXT NOT NULL DEFAULT '{PROTOCOL_VERSION}'",
        }
        for column, definition in session_additions.items():
            if column not in session_columns:
                connection.execute(
                    f"ALTER TABLE sessions ADD COLUMN {column} {definition}"
                )

        event_columns = {
            row["name"] for row in connection.execute("PRAGMA table_info(events)")
        }
        event_additions = {
            "sequence": "INTEGER",
            "payload_json": "TEXT",
            "round_index": "INTEGER",
            "schema_version": f"INTEGER NOT NULL DEFAULT {EVENT_SCHEMA_VERSION}",
        }
        for column, definition in event_additions.items():
            if column not in event_columns:
                connection.execute(
                    f"ALTER TABLE events ADD COLUMN {column} {definition}"
                )

        sessions = connection.execute(
            """
            SELECT id, created_at, expires_at, researcher_token_hash,
                   p01_token_hash, p02_token_hash
            FROM sessions
            """
        ).fetchall()
        for session in sessions:
            created_at = datetime.fromisoformat(session["created_at"])
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
            expires_at = session["expires_at"] or (
                created_at + timedelta(hours=self.session_ttl_hours)
            ).isoformat()
            connection.execute(
                """
                UPDATE sessions
                SET expires_at = ?,
                    researcher_token_hash = COALESCE(researcher_token_hash, ?),
                    p01_token_hash = COALESCE(p01_token_hash, ?),
                    p02_token_hash = COALESCE(p02_token_hash, ?),
                    protocol_version = COALESCE(protocol_version, ?)
                WHERE id = ?
                """,
                (
                    expires_at,
                    hash_token(secrets.token_urlsafe(32)),
                    hash_token(secrets.token_urlsafe(32)),
                    hash_token(secrets.token_urlsafe(32)),
                    PROTOCOL_VERSION,
                    session["id"],
                ),
            )

        session_ids = [
            row["id"] for row in connection.execute("SELECT id FROM sessions")
        ]
        for session_id in session_ids:
            rows = connection.execute(
                """
                SELECT id, value, sequence, payload_json
                FROM events
                WHERE session_id = ?
                ORDER BY id ASC
                """,
                (session_id,),
            ).fetchall()
            for sequence, row in enumerate(rows, start=1):
                payload = (
                    row["payload_json"]
                    if row["payload_json"]
                    else json.dumps(parse_event_value(row["value"]), separators=(",", ":"))
                )
                parsed = json.loads(payload)
                raw_round = parsed.get("round")
                round_index = (
                    int(raw_round)
                    if isinstance(raw_round, (int, float, str))
                    and str(raw_round).isdigit()
                    else None
                )
                connection.execute(
                    """
                    UPDATE events
                    SET sequence = COALESCE(sequence, ?),
                        payload_json = ?,
                        round_index = COALESCE(round_index, ?),
                        schema_version = COALESCE(schema_version, ?)
                    WHERE id = ?
                    """,
                    (
                        sequence,
                        payload,
                        round_index,
                        EVENT_SCHEMA_VERSION,
                        row["id"],
                    ),
                )

        connection.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS idx_events_session_sequence
            ON events(session_id, sequence)
            """
        )

    def expire_sessions(self) -> list[str]:
        now = utc_now().isoformat()
        with self.connect() as connection:
            rows = connection.execute(
                """
                SELECT code FROM sessions
                WHERE status != 'expired' AND expires_at <= ?
                """,
                (now,),
            ).fetchall()
            if rows:
                connection.execute(
                    """
                    UPDATE sessions SET status = 'expired'
                    WHERE status != 'expired' AND expires_at <= ?
                    """,
                    (now,),
                )
        return [row["code"] for row in rows]

    def create_session(self) -> dict[str, Any]:
        self.expire_sessions()
        created_at = utc_now()
        expires_at = created_at + timedelta(hours=self.session_ttl_hours)
        researcher_token = secrets.token_urlsafe(32)
        participant_tokens = {
            "P01": secrets.token_urlsafe(32),
            "P02": secrets.token_urlsafe(32),
        }
        with self.connect() as connection:
            for _ in range(20):
                code = "".join(secrets.choice(SESSION_ALPHABET) for _ in range(6))
                try:
                    cursor = connection.execute(
                        """
                        INSERT INTO sessions (
                            code, created_at, expires_at, status,
                            researcher_token_hash, p01_token_hash, p02_token_hash,
                            protocol_version
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            code,
                            created_at.isoformat(),
                            expires_at.isoformat(),
                            "active",
                            hash_token(researcher_token),
                            hash_token(participant_tokens["P01"]),
                            hash_token(participant_tokens["P02"]),
                            PROTOCOL_VERSION,
                        ),
                    )
                    return {
                        "id": cursor.lastrowid,
                        "code": code,
                        "created_at": created_at.isoformat(),
                        "expires_at": expires_at.isoformat(),
                        "status": "active",
                        "researcher_token": researcher_token,
                        "participant_tokens": participant_tokens,
                        "protocol_version": PROTOCOL_VERSION,
                    }
                except sqlite3.IntegrityError:
                    continue
        raise RuntimeError("Could not generate a unique session code")

    def get_session(self, code: str) -> dict[str, Any] | None:
        self.expire_sessions()
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

    def verify_token(
        self,
        code: str,
        token: str,
        role: str,
        participant: str | None = None,
    ) -> bool:
        session = self.get_session(code)
        if session is None or session["status"] == "expired" or not token:
            return False
        if role == "researcher":
            expected = session["researcher_token_hash"]
        elif role == "participant" and participant in {"P01", "P02"}:
            expected = session[f"{participant.lower()}_token_hash"]
        else:
            return False
        return bool(expected) and secrets.compare_digest(hash_token(token), expected)

    def set_session_status(self, code: str, status: str) -> None:
        with self.connect() as connection:
            connection.execute(
                "UPDATE sessions SET status = ? WHERE code = ?",
                (status, code.upper()),
            )

    def delete_session(self, code: str) -> bool:
        with self.connect() as connection:
            cursor = connection.execute(
                "DELETE FROM sessions WHERE code = ?",
                (code.upper(),),
            )
        return cursor.rowcount > 0

    def record_event(
        self,
        code: str,
        actor: str,
        event_type: str,
        value: str,
        payload: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        now = utc_now()
        structured_payload = payload or parse_event_value(value)
        raw_round = structured_payload.get("round")
        round_index = (
            int(raw_round)
            if isinstance(raw_round, (int, float, str)) and str(raw_round).isdigit()
            else None
        )
        payload_json = json.dumps(
            structured_payload,
            separators=(",", ":"),
            sort_keys=True,
        )
        with self.connect() as connection:
            connection.execute("BEGIN IMMEDIATE")
            session = connection.execute(
                "SELECT id, created_at FROM sessions WHERE code = ?",
                (code.upper(),),
            ).fetchone()
            if session is None:
                raise KeyError(code)

            started_at = datetime.fromisoformat(session["created_at"])
            if started_at.tzinfo is None:
                started_at = started_at.replace(tzinfo=timezone.utc)
            elapsed_ms = max(0, int((now - started_at).total_seconds() * 1000))
            sequence = connection.execute(
                """
                SELECT COALESCE(MAX(sequence), 0) + 1
                FROM events
                WHERE session_id = ?
                """,
                (session["id"],),
            ).fetchone()[0]
            cursor = connection.execute(
                """
                INSERT INTO events (
                    session_id, sequence, elapsed_ms, actor, type, value,
                    payload_json, round_index, schema_version, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    session["id"],
                    sequence,
                    elapsed_ms,
                    actor,
                    event_type,
                    value,
                    payload_json,
                    round_index,
                    EVENT_SCHEMA_VERSION,
                    now.isoformat(),
                ),
            )

        return {
            "id": f"evt-{cursor.lastrowid}",
            "sequence": sequence,
            "sessionCode": code.upper(),
            "schemaVersion": EVENT_SCHEMA_VERSION,
            "elapsedMs": elapsed_ms,
            "timestamp": format_elapsed(elapsed_ms),
            "recordedAt": now.isoformat(),
            "round": round_index,
            "actor": actor,
            "type": event_type,
            "payload": structured_payload,
            "value": value,
        }

    def list_events(self, code: str) -> list[dict[str, Any]]:
        with self.connect() as connection:
            rows = connection.execute(
                """
                SELECT events.id, events.sequence, events.elapsed_ms,
                       events.actor, events.type, events.value,
                       events.payload_json, events.round_index,
                       events.schema_version, events.created_at
                FROM events
                JOIN sessions ON sessions.id = events.session_id
                WHERE sessions.code = ?
                ORDER BY events.sequence ASC, events.id ASC
                """,
                (code.upper(),),
            ).fetchall()

        return [
            {
                "id": f"evt-{row['id']}",
                "sequence": row["sequence"],
                "sessionCode": code.upper(),
                "schemaVersion": row["schema_version"],
                "elapsedMs": row["elapsed_ms"],
                "timestamp": format_elapsed(row["elapsed_ms"]),
                "recordedAt": row["created_at"],
                "round": row["round_index"],
                "actor": row["actor"],
                "type": row["type"],
                "payload": json.loads(row["payload_json"] or "{}"),
                "value": row["value"],
            }
            for row in rows
        ]

    def export_rows(self, code: str) -> list[dict[str, Any]]:
        return [
            {
                "schema_version": event["schemaVersion"],
                "session_code": event["sessionCode"],
                "event_id": event["id"],
                "sequence": event["sequence"],
                "elapsed_ms": event["elapsedMs"],
                "recorded_at_utc": event["recordedAt"],
                "round": event["round"] if event["round"] is not None else "",
                "participant": event["actor"],
                "event": event["type"],
                "payload_json": json.dumps(
                    event["payload"],
                    separators=(",", ":"),
                    sort_keys=True,
                ),
                "value": event["value"],
            }
            for event in self.list_events(code)
        ]

    def export_json_rows(self, code: str) -> list[dict[str, Any]]:
        return [
            {
                "schema_version": event["schemaVersion"],
                "session_code": event["sessionCode"],
                "event_id": event["id"],
                "sequence": event["sequence"],
                "elapsed_ms": event["elapsedMs"],
                "recorded_at_utc": event["recordedAt"],
                "round": event["round"],
                "participant": event["actor"],
                "event": event["type"],
                "payload": event["payload"],
                "value": event["value"],
            }
            for event in self.list_events(code)
        ]
