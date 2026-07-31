from __future__ import annotations

import asyncio
import re
import time
from dataclasses import dataclass, field
from typing import Any

from fastapi import WebSocket

from .database import Database


PARTICIPANTS = ("P01", "P02")
VIDEO_CONDITIONS = {"normal", "disabled", "blurred", "grayscale", "reducedFrameRate"}
FEEDBACK_MODES = {"warm", "neutral"}
SPOTLIGHT_CONTEXT_MODES = {"rich", "reduced"}
CONDITION_LABELS = {
    "normal": "normal",
    "disabled": "disabled",
    "blurred": "blurred",
    "grayscale": "grayscale",
    "reducedFrameRate": "reduced frame rate",
}
LABEL_TO_CONDITION = {label: condition for condition, label in CONDITION_LABELS.items()}
PARTICIPANT_VALUE = re.compile(r"^(.*) \((P01|P02)\)$")


def _token(token_id: str, shape: str, color: str, pattern: str) -> dict[str, str]:
    return {"id": token_id, "shape": shape, "color": color, "pattern": pattern}


SIGNAL_ROUNDS: tuple[dict[str, Any], ...] = (
    {
        "id": "signal-01",
        "clues": {
            "P01": {"kind": "shape", "value": "circle", "label": "Circle"},
            "P02": {"kind": "color", "value": "magenta", "label": "Magenta"},
        },
        "targetId": "s01-magenta-circle",
        "tokens": [
            _token("s01-violet-diamond", "diamond", "violet", "striped"),
            _token("s01-magenta-circle", "circle", "magenta", "solid"),
            _token("s01-gold-hexagon", "hexagon", "gold", "dotted"),
            _token("s01-teal-circle", "circle", "teal", "striped"),
            _token("s01-magenta-triangle", "triangle", "magenta", "dotted"),
            _token("s01-violet-hexagon", "hexagon", "violet", "solid"),
        ],
    },
    {
        "id": "signal-02",
        "clues": {
            "P01": {"kind": "color", "value": "violet", "label": "Violet"},
            "P02": {"kind": "shape", "value": "diamond", "label": "Diamond"},
        },
        "targetId": "s02-violet-diamond",
        "tokens": [
            _token("s02-teal-triangle", "triangle", "teal", "solid"),
            _token("s02-violet-circle", "circle", "violet", "dotted"),
            _token("s02-gold-diamond", "diamond", "gold", "striped"),
            _token("s02-magenta-hexagon", "hexagon", "magenta", "solid"),
            _token("s02-violet-diamond", "diamond", "violet", "solid"),
            _token("s02-teal-diamond", "diamond", "teal", "dotted"),
        ],
    },
    {
        "id": "signal-03",
        "clues": {
            "P01": {"kind": "shape", "value": "triangle", "label": "Triangle"},
            "P02": {"kind": "color", "value": "gold", "label": "Gold"},
        },
        "targetId": "s03-gold-triangle",
        "tokens": [
            _token("s03-magenta-circle", "circle", "magenta", "striped"),
            _token("s03-gold-hexagon", "hexagon", "gold", "solid"),
            _token("s03-violet-triangle", "triangle", "violet", "dotted"),
            _token("s03-teal-diamond", "diamond", "teal", "striped"),
            _token("s03-gold-triangle", "triangle", "gold", "solid"),
            _token("s03-magenta-diamond", "diamond", "magenta", "dotted"),
        ],
    },
    {
        "id": "signal-04",
        "clues": {
            "P01": {"kind": "color", "value": "teal", "label": "Teal"},
            "P02": {"kind": "shape", "value": "hexagon", "label": "Hexagon"},
        },
        "targetId": "s04-teal-hexagon",
        "tokens": [
            _token("s04-violet-circle", "circle", "violet", "solid"),
            _token("s04-teal-triangle", "triangle", "teal", "dotted"),
            _token("s04-gold-diamond", "diamond", "gold", "solid"),
            _token("s04-magenta-hexagon", "hexagon", "magenta", "striped"),
            _token("s04-teal-hexagon", "hexagon", "teal", "solid"),
            _token("s04-gold-circle", "circle", "gold", "dotted"),
        ],
    },
)


def _spotlight_object(
    object_id: str,
    label: str,
    kind: str,
    color: str,
    x: float,
    y: float,
    region: str,
) -> dict[str, Any]:
    return {
        "id": object_id,
        "label": label,
        "kind": kind,
        "color": color,
        "x": x,
        "y": y,
        "region": region,
    }


# Mirrors src/lib/spotlight-sync/rounds.ts. Regions follow the Surface Guidance
# Framework: `<surface>-<zone>`, where the surface is what a WHERE clue names.
SPOTLIGHT_OBJECTS: tuple[dict[str, Any], ...] = (
    _spotlight_object("jar", "Specimen jar", "specimen", "#7fe0d4", 0.088, 0.188, "upper-left"),
    _spotlight_object("books", "Book stack", "books", "#e8579c", 0.222, 0.192, "upper-left"),
    _spotlight_object("ivy", "Trailing ivy", "ivy", "#68c99b", 0.148, 0.334, "upper-left"),
    _spotlight_object("clock", "Wall clock", "clock", "#f3c96b", 0.412, 0.145, "upper-centre"),
    _spotlight_object("bulb", "Pendant bulb", "bulb", "#ffd489", 0.598, 0.196, "upper-centre"),
    _spotlight_object("moth", "Violet moth", "moth", "#c08cf5", 0.836, 0.198, "upper-right"),
    _spotlight_object("star", "Paper star", "star", "#ffd477", 0.944, 0.322, "upper-right"),
    _spotlight_object("key", "Brass key", "key", "#f6c453", 0.168, 0.575, "mid-left"),
    _spotlight_object("camera", "Camera", "camera", "#9b8fa8", 0.298, 0.562, "mid-left"),
    _spotlight_object("notebook", "Notebook", "notebook", "#e3539a", 0.418, 0.578, "mid-centre"),
    _spotlight_object("flask", "Teal flask", "flask", "#4fd0c0", 0.532, 0.556, "mid-centre"),
    _spotlight_object("headphones", "Headphones", "headphones", "#a989e8", 0.688, 0.512, "mid-right"),
    _spotlight_object("mug", "Rose mug", "mug", "#f472ac", 0.812, 0.5, "mid-right"),
    _spotlight_object("glasses", "Glasses", "glasses", "#d8c8e1", 0.918, 0.524, "mid-right"),
    _spotlight_object("crate", "Wooden crate", "crate", "#c08a5e", 0.082, 0.862, "lower-left"),
    _spotlight_object("fern", "Potted fern", "plant", "#5fc496", 0.246, 0.806, "lower-left"),
    _spotlight_object("toolbox", "Toolbox", "toolbox", "#8fa5c4", 0.338, 0.882, "lower-left"),
    _spotlight_object("spool", "Cable spool", "spool", "#a6b3c9", 0.512, 0.838, "lower-centre"),
    _spotlight_object("boot", "Rain boot", "boot", "#a67ce6", 0.668, 0.862, "lower-right"),
    _spotlight_object("can", "Watering can", "can", "#b7c3d6", 0.864, 0.82, "lower-right"),
)


def _clue(kind: str, label: str, candidates: tuple[str, ...]) -> dict[str, Any]:
    return {
        "kind": kind,
        "label": label,
        "shortLabel": "WHAT" if kind == "object" else "WHERE",
        "candidates": list(candidates),
    }


_LIQUID = ("jar", "flask", "mug", "can")
_MID_ALL = ("key", "camera", "notebook", "flask", "headphones", "mug", "glasses")
_LOWER_ALL = ("crate", "fern", "toolbox", "spool", "boot", "can")

# Each round pairs one object-content clue with one scene-context clue. Neither
# is decisive alone; together they intersect on exactly one object.
SPOTLIGHT_ROUNDS: tuple[dict[str, Any], ...] = (
    {
        "id": "spotlight-01",
        "clues": {
            "P01": _clue("object", "It holds liquid", _LIQUID),
            "P02": _clue("context", "Desk height · right side", ("headphones", "mug", "glasses")),
        },
        "targetId": "mug",
    },
    {
        "id": "spotlight-02",
        "clues": {
            "P01": _clue("context", "Up high · right side", ("moth", "star")),
            "P02": _clue("object", "Violet", ("moth", "headphones", "boot")),
        },
        "targetId": "moth",
    },
    {
        "id": "spotlight-03",
        "clues": {
            "P01": _clue("object", "Brass, a warm yellow metal", ("clock", "key")),
            "P02": _clue("context", "Desk height", _MID_ALL),
        },
        "targetId": "key",
    },
    {
        "id": "spotlight-04",
        "clues": {
            "P01": _clue("context", "Floor level", _LOWER_ALL),
            "P02": _clue("object", "Alive and growing", ("ivy", "moth", "fern")),
        },
        "targetId": "fern",
    },
    {
        "id": "spotlight-05",
        "clues": {
            "P01": _clue("object", "Glass, and it holds liquid", ("jar", "flask", "mug")),
            "P02": _clue("context", "Up high · left side", ("jar", "books", "ivy")),
        },
        "targetId": "jar",
    },
    {
        "id": "spotlight-06",
        "clues": {
            "P01": _clue("context", "Floor level", _LOWER_ALL),
            "P02": _clue("object", "It holds liquid", _LIQUID),
        },
        "targetId": "can",
    },
)


SPOTLIGHT_OBJECT_BY_ID = {
    object_definition["id"]: object_definition
    for object_definition in SPOTLIGHT_OBJECTS
}


def _now_ms() -> int:
    return round(time.time() * 1000)


def _parse_value(value: str) -> dict[str, str]:
    parsed: dict[str, str] = {}
    for part in value.split(";"):
        key, separator, item = part.partition("=")
        if separator:
            parsed[key] = item
    return parsed


@dataclass
class TaskRuntime:
    status: str = "idle"
    phase: str = "idle"
    current_round_index: int = 0
    selections: dict[str, str | None] = field(
        default_factory=lambda: {"P01": None, "P02": None}
    )
    selection_times: dict[str, int | None] = field(
        default_factory=lambda: {"P01": None, "P02": None}
    )
    stats: dict[str, int] = field(
        default_factory=lambda: {
            "hits": 0,
            "misses": 0,
            "streak": 0,
            "bestStreak": 0,
            "syncTotalMs": 0,
            "syncSamples": 0,
        }
    )
    history: list[dict[str, Any]] = field(default_factory=list)
    last_outcome: dict[str, Any] | None = None
    feedback_mode: str = "warm"
    started_at: int | None = None
    round_started_at: int | None = None

    def round(self) -> dict[str, Any] | None:
        if self.status == "idle":
            return None
        return SIGNAL_ROUNDS[self.current_round_index]

    def public(self, viewer: str | None = None) -> dict[str, Any]:
        round_definition = self.round()
        current_round = None
        selections = dict(self.selections)
        selection_times = dict(self.selection_times)
        if round_definition:
            current_round = {
                "id": round_definition["id"],
                "tokens": round_definition["tokens"],
                "clue": (
                    round_definition["clues"][viewer]
                    if viewer in PARTICIPANTS
                    else None
                ),
            }
            if viewer is None:
                current_round["researcherClues"] = round_definition["clues"]
                current_round["targetId"] = round_definition["targetId"]
            elif self.phase == "playing":
                other = "P02" if viewer == "P01" else "P01"
                selections[other] = None
                selection_times[other] = None

        return {
            "status": self.status,
            "phase": self.phase,
            "currentRoundIndex": self.current_round_index,
            "roundCount": len(SIGNAL_ROUNDS),
            "currentRound": current_round,
            "selections": selections,
            "selectionTimes": selection_times,
            "stats": dict(self.stats),
            "history": list(self.history),
            "lastOutcome": self.last_outcome,
            "feedbackMode": self.feedback_mode,
            "startedAt": self.started_at,
            "roundStartedAt": self.round_started_at,
        }


@dataclass
class SpotlightTaskRuntime:
    status: str = "idle"
    phase: str = "idle"
    current_round_index: int = 0
    selections: dict[str, str | None] = field(
        default_factory=lambda: {"P01": None, "P02": None}
    )
    selection_times: dict[str, int | None] = field(
        default_factory=lambda: {"P01": None, "P02": None}
    )
    stats: dict[str, int] = field(
        default_factory=lambda: {
            "hits": 0,
            "misses": 0,
            "streak": 0,
            "bestStreak": 0,
            "convergenceTotalMs": 0,
            "convergenceSamples": 0,
        }
    )
    history: list[dict[str, Any]] = field(default_factory=list)
    last_outcome: dict[str, Any] | None = None
    feedback_mode: str = "warm"
    context_mode: str = "rich"
    started_at: int | None = None
    round_started_at: int | None = None

    def round(self) -> dict[str, Any] | None:
        if self.status == "idle":
            return None
        return SPOTLIGHT_ROUNDS[self.current_round_index]

    def public(self, viewer: str | None = None) -> dict[str, Any]:
        round_definition = self.round()
        current_round = None
        selections = dict(self.selections)
        selection_times = dict(self.selection_times)
        if round_definition:
            current_round = {
                "id": round_definition["id"],
                "objects": list(SPOTLIGHT_OBJECTS),
                "clue": (
                    round_definition["clues"][viewer]
                    if viewer in PARTICIPANTS
                    else None
                ),
            }
            if viewer is None:
                current_round["researcherClues"] = round_definition["clues"]
                current_round["targetId"] = round_definition["targetId"]
            elif self.phase == "playing":
                other = "P02" if viewer == "P01" else "P01"
                selections[other] = None
                selection_times[other] = None

        return {
            "status": self.status,
            "phase": self.phase,
            "currentRoundIndex": self.current_round_index,
            "roundCount": len(SPOTLIGHT_ROUNDS),
            "currentRound": current_round,
            "selections": selections,
            "selectionTimes": selection_times,
            "stats": dict(self.stats),
            "history": list(self.history),
            "lastOutcome": self.last_outcome,
            "feedbackMode": self.feedback_mode,
            "contextMode": self.context_mode,
            "startedAt": self.started_at,
            "roundStartedAt": self.round_started_at,
        }


@dataclass
class SessionRuntime:
    code: str
    participants: dict[str, set[WebSocket]] = field(
        default_factory=lambda: {"P01": set(), "P02": set()}
    )
    researchers: set[WebSocket] = field(default_factory=set)
    conditions: dict[str, str] = field(
        default_factory=lambda: {"P01": "normal", "P02": "normal"}
    )
    self_view_hidden: dict[str, bool] = field(
        default_factory=lambda: {"P01": False, "P02": False}
    )
    participant_media: dict[str, dict[str, bool]] = field(
        default_factory=lambda: {
            "P01": {"camera": False, "microphone": False},
            "P02": {"camera": False, "microphone": False},
        }
    )
    media_reported: dict[str, bool] = field(
        default_factory=lambda: {"P01": False, "P02": False}
    )
    task: TaskRuntime = field(default_factory=TaskRuntime)
    spotlight_task: SpotlightTaskRuntime = field(default_factory=SpotlightTaskRuntime)
    spotlight_positions: dict[str, dict[str, float] | None] = field(
        default_factory=lambda: {
            "P01": {"x": 0.26, "y": 0.7},
            "P02": {"x": 0.76, "y": 0.28},
        }
    )
    lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    def presence(self) -> dict[str, bool]:
        return {
            participant: bool(connections)
            for participant, connections in self.participants.items()
        }

    def condition_state(self) -> dict[str, dict[str, Any]]:
        return {
            participant: {
                "videoCondition": self.conditions[participant],
                "selfViewHidden": self.self_view_hidden[participant],
            }
            for participant in PARTICIPANTS
        }

    def media_state(self) -> dict[str, dict[str, bool]]:
        return {
            participant: dict(self.participant_media[participant])
            for participant in PARTICIPANTS
        }


class ConnectionManager:
    def __init__(self, database: Database):
        self.database = database
        self.runtimes: dict[str, SessionRuntime] = {}
        self.runtime_lock = asyncio.Lock()

    async def get_runtime(self, code: str) -> SessionRuntime | None:
        normalized = code.upper()
        if self.database.get_session(normalized) is None:
            return None
        async with self.runtime_lock:
            runtime = self.runtimes.get(normalized)
            if runtime is None:
                runtime = SessionRuntime(code=normalized)
                self._replay(runtime, self.database.list_events(normalized))
                self.runtimes[normalized] = runtime
                if runtime.task.status == "active" and runtime.task.phase == "feedback":
                    asyncio.create_task(
                        self._advance_round_after(
                            runtime, runtime.task.current_round_index
                        )
                    )
                if (
                    runtime.spotlight_task.status == "active"
                    and runtime.spotlight_task.phase == "feedback"
                ):
                    asyncio.create_task(
                        self._advance_spotlight_round_after(
                            runtime, runtime.spotlight_task.current_round_index
                        )
                    )
            return runtime

    def _replay(self, runtime: SessionRuntime, events: list[dict[str, Any]]) -> None:
        for event in events:
            event_type = event["type"]
            value = event["value"]
            fields = _parse_value(value)
            if event_type == "video_condition":
                match = PARTICIPANT_VALUE.match(value)
                if match and match.group(1) in LABEL_TO_CONDITION:
                    runtime.conditions[match.group(2)] = LABEL_TO_CONDITION[match.group(1)]
            elif event_type == "self_view":
                match = PARTICIPANT_VALUE.match(value)
                if match:
                    runtime.self_view_hidden[match.group(2)] = match.group(1) == "hidden"
            elif event_type == "feedback_condition":
                runtime.task.feedback_mode = fields.get("mode", "warm")
            elif event_type == "task_started":
                feedback_mode = runtime.task.feedback_mode
                runtime.task = TaskRuntime(
                    status="active",
                    phase="playing",
                    feedback_mode=feedback_mode,
                    started_at=_now_ms(),
                    round_started_at=_now_ms(),
                )
            elif event_type == "round_started":
                runtime.task.current_round_index = max(0, int(fields.get("round", "1")) - 1)
                runtime.task.phase = "playing"
                runtime.task.selections = {"P01": None, "P02": None}
                runtime.task.selection_times = {"P01": None, "P02": None}
                runtime.task.last_outcome = None
                runtime.task.round_started_at = _now_ms()
            elif event_type == "signal_selected" and event["actor"] in PARTICIPANTS:
                runtime.task.selections[event["actor"]] = fields.get("signal")
                runtime.task.selection_times[event["actor"]] = event["elapsedMs"]
            elif event_type in {"joint_target_found", "joint_target_missed"}:
                success = event_type == "joint_target_found"
                sync_ms = int(fields.get("sync_ms", "0"))
                streak = runtime.task.stats["streak"] + 1 if success else 0
                runtime.task.stats["hits"] += int(success)
                runtime.task.stats["misses"] += int(not success)
                runtime.task.stats["streak"] = streak
                runtime.task.stats["bestStreak"] = max(runtime.task.stats["bestStreak"], streak)
                runtime.task.stats["syncTotalMs"] += sync_ms
                runtime.task.stats["syncSamples"] += 1
                round_definition = runtime.task.round()
                if round_definition:
                    outcome = {
                        "roundId": round_definition["id"],
                        "success": success,
                        "targetId": round_definition["targetId"],
                        "selections": dict(runtime.task.selections),
                        "reactionTimeMs": int(fields.get("rt_ms", "0")),
                        "syncDeltaMs": sync_ms,
                    }
                    runtime.task.last_outcome = outcome
                    runtime.task.history.append(outcome)
                runtime.task.phase = "feedback"
            elif event_type == "task_stopped":
                runtime.task.status = "idle"
                runtime.task.phase = "idle"
            elif event_type == "task_completed":
                runtime.task.status = "completed"
                runtime.task.phase = "completed"
            elif event_type == "spotlight_context_condition":
                runtime.spotlight_task.context_mode = fields.get("mode", "rich")
            elif event_type == "spotlight_feedback_condition":
                runtime.spotlight_task.feedback_mode = fields.get("mode", "warm")
            elif event_type == "spotlight_task_started":
                context_mode = runtime.spotlight_task.context_mode
                feedback_mode = runtime.spotlight_task.feedback_mode
                runtime.spotlight_task = SpotlightTaskRuntime(
                    status="active",
                    phase="playing",
                    context_mode=context_mode,
                    feedback_mode=feedback_mode,
                    started_at=_now_ms(),
                    round_started_at=_now_ms(),
                )
            elif event_type == "spotlight_round_started":
                runtime.spotlight_task.current_round_index = max(
                    0, int(fields.get("round", "1")) - 1
                )
                runtime.spotlight_task.phase = "playing"
                runtime.spotlight_task.selections = {"P01": None, "P02": None}
                runtime.spotlight_task.selection_times = {"P01": None, "P02": None}
                runtime.spotlight_task.last_outcome = None
                runtime.spotlight_task.round_started_at = _now_ms()
            elif event_type == "spotlight_focus" and event["actor"] in PARTICIPANTS:
                runtime.spotlight_task.selections[event["actor"]] = fields.get("object")
                runtime.spotlight_task.selection_times[event["actor"]] = event["elapsedMs"]
            elif event_type in {"spotlight_joint_found", "spotlight_joint_missed"}:
                success = event_type == "spotlight_joint_found"
                convergence_ms = int(fields.get("convergence_ms", "0"))
                streak = runtime.spotlight_task.stats["streak"] + 1 if success else 0
                runtime.spotlight_task.stats["hits"] += int(success)
                runtime.spotlight_task.stats["misses"] += int(not success)
                runtime.spotlight_task.stats["streak"] = streak
                runtime.spotlight_task.stats["bestStreak"] = max(
                    runtime.spotlight_task.stats["bestStreak"], streak
                )
                runtime.spotlight_task.stats["convergenceTotalMs"] += convergence_ms
                runtime.spotlight_task.stats["convergenceSamples"] += 1
                round_definition = runtime.spotlight_task.round()
                if round_definition:
                    outcome = {
                        "roundId": round_definition["id"],
                        "success": success,
                        "targetId": round_definition["targetId"],
                        "selections": dict(runtime.spotlight_task.selections),
                        "reactionTimeMs": int(fields.get("rt_ms", "0")),
                        "convergenceMs": convergence_ms,
                    }
                    runtime.spotlight_task.last_outcome = outcome
                    runtime.spotlight_task.history.append(outcome)
                runtime.spotlight_task.phase = "feedback"
            elif event_type == "spotlight_task_stopped":
                runtime.spotlight_task.status = "idle"
                runtime.spotlight_task.phase = "idle"
            elif event_type == "spotlight_task_completed":
                runtime.spotlight_task.status = "completed"
                runtime.spotlight_task.phase = "completed"

        # A persisted focus time is session-relative, while live focus times use
        # the current process clock. Restart an unfinished dyadic choice so a
        # participant returning after a server restart cannot produce a bogus
        # convergence interval with a stale partner selection.
        if (
            runtime.spotlight_task.status == "active"
            and runtime.spotlight_task.phase == "playing"
            and any(runtime.spotlight_task.selections.values())
        ):
            runtime.spotlight_task.selections = {"P01": None, "P02": None}
            runtime.spotlight_task.selection_times = {"P01": None, "P02": None}
            runtime.spotlight_task.last_outcome = None
            runtime.spotlight_task.round_started_at = _now_ms()

    async def connect(
        self,
        websocket: WebSocket,
        code: str,
        role: str,
        participant: str | None,
    ) -> SessionRuntime | None:
        runtime = await self.get_runtime(code)
        if runtime is None:
            await websocket.accept()
            await websocket.send_json({"type": "error", "message": "Session not found"})
            await websocket.close(code=4404)
            return None

        await websocket.accept()
        first_participant_connection = False
        async with runtime.lock:
            if role == "researcher":
                runtime.researchers.add(websocket)
            else:
                assert participant is not None
                first_participant_connection = not runtime.participants[participant]
                runtime.participants[participant].add(websocket)

        await websocket.send_json(
            {
                "type": "welcome",
                "code": runtime.code,
                "role": role,
                "participant": participant,
                "presence": runtime.presence(),
                "conditions": runtime.condition_state(),
                "mediaState": runtime.media_state(),
                "task": runtime.task.public(participant if role == "participant" else None),
                "spotlightTask": runtime.spotlight_task.public(
                    participant if role == "participant" else None
                ),
                "spotlightPositions": dict(runtime.spotlight_positions),
            }
        )
        if role == "participant" and participant:
            if first_participant_connection:
                event = self.database.record_event(
                    runtime.code, participant, "joined_session", "successful"
                )
                await self.broadcast_researchers(runtime, {"type": "event", "event": event})
            await self.broadcast(
                runtime,
                {
                    "type": "presence",
                    "participant": participant,
                    "connected": True,
                    "presence": runtime.presence(),
                },
            )
        return runtime

    async def disconnect(
        self,
        runtime: SessionRuntime,
        websocket: WebSocket,
        role: str,
        participant: str | None,
    ) -> None:
        disconnected = False
        async with runtime.lock:
            if role == "researcher":
                runtime.researchers.discard(websocket)
            elif participant:
                runtime.participants[participant].discard(websocket)
                disconnected = not runtime.participants[participant]
                if disconnected:
                    runtime.participant_media[participant] = {
                        "camera": False,
                        "microphone": False,
                    }
                    runtime.media_reported[participant] = False
        if disconnected and participant:
            await self.broadcast(
                runtime,
                {
                    "type": "presence",
                    "participant": participant,
                    "connected": False,
                    "presence": runtime.presence(),
                },
            )
            await self.broadcast_researchers(
                runtime,
                {
                    "type": "media_state",
                    "participant": participant,
                    "camera": False,
                    "microphone": False,
                    "mediaState": runtime.media_state(),
                },
            )

    async def broadcast(self, runtime: SessionRuntime, message: dict[str, Any]) -> None:
        recipients = list(runtime.researchers)
        for participant_connections in runtime.participants.values():
            recipients.extend(participant_connections)
        for recipient in recipients:
            try:
                await recipient.send_json(message)
            except RuntimeError:
                pass

    async def broadcast_researchers(
        self, runtime: SessionRuntime, message: dict[str, Any]
    ) -> None:
        for recipient in list(runtime.researchers):
            try:
                await recipient.send_json(message)
            except RuntimeError:
                pass

    async def broadcast_task(self, runtime: SessionRuntime) -> None:
        for recipient in list(runtime.researchers):
            try:
                await recipient.send_json({"type": "task_state", "task": runtime.task.public()})
            except RuntimeError:
                pass
        for participant in PARTICIPANTS:
            message = {"type": "task_state", "task": runtime.task.public(participant)}
            for recipient in list(runtime.participants[participant]):
                try:
                    await recipient.send_json(message)
                except RuntimeError:
                    pass

    async def broadcast_spotlight_task(self, runtime: SessionRuntime) -> None:
        for recipient in list(runtime.researchers):
            try:
                await recipient.send_json(
                    {
                        "type": "spotlight_task_state",
                        "task": runtime.spotlight_task.public(),
                    }
                )
            except RuntimeError:
                pass
        for participant in PARTICIPANTS:
            message = {
                "type": "spotlight_task_state",
                "task": runtime.spotlight_task.public(participant),
            }
            for recipient in list(runtime.participants[participant]):
                try:
                    await recipient.send_json(message)
                except RuntimeError:
                    pass

    async def send_to_participant(
        self, runtime: SessionRuntime, participant: str, message: dict[str, Any]
    ) -> None:
        for recipient in list(runtime.participants[participant]):
            try:
                await recipient.send_json(message)
            except RuntimeError:
                pass

    async def handle_message(
        self,
        runtime: SessionRuntime,
        websocket: WebSocket,
        role: str,
        participant: str | None,
        message: dict[str, Any],
    ) -> None:
        message_type = message.get("type")
        if message_type == "media_state" and role == "participant" and participant:
            camera = message.get("camera")
            microphone = message.get("microphone")
            if not isinstance(camera, bool) or not isinstance(microphone, bool):
                await websocket.send_json(
                    {"type": "error", "message": "Invalid media state"}
                )
                return
            async with runtime.lock:
                previous = runtime.participant_media[participant]
                first_report = not runtime.media_reported[participant]
                changed = previous != {
                    "camera": camera,
                    "microphone": microphone,
                }
                runtime.participant_media[participant] = {
                    "camera": camera,
                    "microphone": microphone,
                }
                runtime.media_reported[participant] = True
                event = (
                    self.database.record_event(
                        runtime.code,
                        participant,
                        "media_state",
                        (
                            f"camera={'on' if camera else 'off'},"
                            f"microphone={'on' if microphone else 'off'}"
                        ),
                    )
                    if first_report or changed
                    else None
                )
            await self.broadcast_researchers(
                runtime,
                {
                    "type": "media_state",
                    "participant": participant,
                    "camera": camera,
                    "microphone": microphone,
                    "mediaState": runtime.media_state(),
                },
            )
            if event:
                await self.broadcast_researchers(
                    runtime, {"type": "event", "event": event}
                )
            return
        if message_type == "request_monitor_stream" and role == "researcher":
            target = message.get("participant")
            if target not in PARTICIPANTS:
                await websocket.send_json(
                    {"type": "error", "message": "Invalid monitor target"}
                )
                return
            await self.send_to_participant(
                runtime, target, {"type": "monitor_requested"}
            )
            return
        if message_type == "monitor_signal":
            payload = message.get("payload")
            if not isinstance(payload, dict):
                await websocket.send_json(
                    {"type": "error", "message": "Invalid monitor signaling message"}
                )
                return
            if role == "participant" and participant:
                await self.broadcast_researchers(
                    runtime,
                    {
                        "type": "monitor_signal",
                        "from": participant,
                        "payload": payload,
                    },
                )
                return
            if role == "researcher":
                target = message.get("target")
                if target not in PARTICIPANTS:
                    await websocket.send_json(
                        {"type": "error", "message": "Invalid monitor target"}
                    )
                    return
                await self.send_to_participant(
                    runtime,
                    target,
                    {
                        "type": "monitor_signal",
                        "from": "researcher",
                        "payload": payload,
                    },
                )
                return
        if message_type == "signal" and role == "participant" and participant:
            target = message.get("target")
            payload = message.get("payload")
            if target not in PARTICIPANTS or target == participant or not isinstance(payload, dict):
                await websocket.send_json({"type": "error", "message": "Invalid signaling message"})
                return
            await self.send_to_participant(
                runtime, target, {"type": "signal", "from": participant, "payload": payload}
            )
            return
        if message_type == "set_condition" and role == "researcher":
            await self._set_condition(runtime, websocket, message)
            return
        if message_type == "set_self_view" and role == "researcher":
            await self._set_self_view(runtime, websocket, message)
            return
        if message_type == "set_feedback" and role == "researcher":
            await self._set_feedback(runtime, websocket, message)
            return
        if message_type == "task_control" and role == "researcher":
            await self._task_control(runtime, websocket, message)
            return
        if message_type == "signal_select" and role == "participant" and participant:
            await self._signal_select(runtime, websocket, participant, message)
            return
        if message_type == "set_spotlight_context" and role == "researcher":
            await self._set_spotlight_context(runtime, websocket, message)
            return
        if message_type == "set_spotlight_feedback" and role == "researcher":
            await self._set_spotlight_feedback(runtime, websocket, message)
            return
        if message_type == "spotlight_task_control" and role == "researcher":
            await self._spotlight_task_control(runtime, websocket, message)
            return
        if message_type == "spotlight_move" and role == "participant" and participant:
            await self._spotlight_move(runtime, websocket, participant, message)
            return
        if message_type == "spotlight_select" and role == "participant" and participant:
            await self._spotlight_select(runtime, websocket, participant, message)
            return
        await websocket.send_json({"type": "error", "message": "Unsupported message"})

    async def _set_condition(
        self, runtime: SessionRuntime, websocket: WebSocket, message: dict[str, Any]
    ) -> None:
        participant = message.get("participant")
        condition = message.get("condition")
        if participant not in PARTICIPANTS or condition not in VIDEO_CONDITIONS:
            await websocket.send_json({"type": "error", "message": "Invalid condition change"})
            return
        async with runtime.lock:
            if runtime.conditions[participant] == condition:
                return
            runtime.conditions[participant] = condition
            event = self.database.record_event(
                runtime.code,
                "researcher",
                "video_condition",
                f"{CONDITION_LABELS[condition]} ({participant})",
            )
        await self.send_to_participant(
            runtime,
            participant,
            {"type": "condition_change", "participant": participant, "condition": condition},
        )
        await self.broadcast(
            runtime, {"type": "condition_state", "conditions": runtime.condition_state()}
        )
        await self.broadcast_researchers(runtime, {"type": "event", "event": event})

    async def _set_self_view(
        self, runtime: SessionRuntime, websocket: WebSocket, message: dict[str, Any]
    ) -> None:
        participant = message.get("participant")
        hidden = message.get("hidden")
        if participant not in PARTICIPANTS or not isinstance(hidden, bool):
            await websocket.send_json({"type": "error", "message": "Invalid self-view change"})
            return
        async with runtime.lock:
            if runtime.self_view_hidden[participant] == hidden:
                return
            runtime.self_view_hidden[participant] = hidden
            event = self.database.record_event(
                runtime.code,
                "researcher",
                "self_view",
                f"{'hidden' if hidden else 'visible'} ({participant})",
            )
        await self.send_to_participant(
            runtime,
            participant,
            {"type": "self_view_change", "participant": participant, "hidden": hidden},
        )
        await self.broadcast(
            runtime, {"type": "condition_state", "conditions": runtime.condition_state()}
        )
        await self.broadcast_researchers(runtime, {"type": "event", "event": event})

    async def _set_feedback(
        self, runtime: SessionRuntime, websocket: WebSocket, message: dict[str, Any]
    ) -> None:
        mode = message.get("mode")
        if mode not in FEEDBACK_MODES:
            await websocket.send_json({"type": "error", "message": "Invalid feedback mode"})
            return
        async with runtime.lock:
            if runtime.task.feedback_mode == mode:
                return
            runtime.task.feedback_mode = mode
            event = self.database.record_event(
                runtime.code, "researcher", "feedback_condition", f"mode={mode}"
            )
        await self.broadcast_task(runtime)
        await self.broadcast_researchers(runtime, {"type": "event", "event": event})

    async def _task_control(
        self, runtime: SessionRuntime, websocket: WebSocket, message: dict[str, Any]
    ) -> None:
        action = message.get("action")
        if action not in {"start", "stop"}:
            await websocket.send_json({"type": "error", "message": "Invalid task action"})
            return
        events: list[dict[str, Any]] = []
        async with runtime.lock:
            if action == "start":
                if runtime.task.status == "active":
                    return
                now = _now_ms()
                runtime.task = TaskRuntime(
                    status="active",
                    phase="playing",
                    feedback_mode=runtime.task.feedback_mode,
                    started_at=now,
                    round_started_at=now,
                )
                events.append(
                    self.database.record_event(
                        runtime.code,
                        "researcher",
                        "task_started",
                        f"task=signal_sync;rounds={len(SIGNAL_ROUNDS)}",
                    )
                )
                events.append(
                    self.database.record_event(runtime.code, "session", "round_started", "round=1")
                )
                self.database.set_session_status(runtime.code, "active")
            else:
                if runtime.task.status != "active":
                    return
                runtime.task.status = "idle"
                runtime.task.phase = "idle"
                events.append(
                    self.database.record_event(
                        runtime.code, "researcher", "task_stopped", "manual_stop"
                    )
                )
        await self.broadcast_task(runtime)
        for event in events:
            await self.broadcast_researchers(runtime, {"type": "event", "event": event})

    async def _signal_select(
        self,
        runtime: SessionRuntime,
        websocket: WebSocket,
        participant: str,
        message: dict[str, Any],
    ) -> None:
        signal_id = message.get("signal_id")
        round_definition = runtime.task.round()
        valid_ids = {token["id"] for token in round_definition["tokens"]} if round_definition else set()
        if signal_id not in valid_ids:
            await websocket.send_json({"type": "error", "message": "Invalid signal selection"})
            return

        events: list[dict[str, Any]] = []
        completed_round: int | None = None
        async with runtime.lock:
            if runtime.task.status != "active" or runtime.task.phase != "playing":
                await websocket.send_json({"type": "error", "message": "The round is not active"})
                return
            if runtime.task.selections[participant] is not None:
                return

            now = _now_ms()
            round_definition = runtime.task.round()
            assert round_definition is not None
            runtime.task.selections[participant] = signal_id
            runtime.task.selection_times[participant] = now
            reaction_ms = max(0, now - (runtime.task.round_started_at or now))
            events.append(
                self.database.record_event(
                    runtime.code,
                    participant,
                    "signal_selected",
                    (
                        f"round={runtime.task.current_round_index + 1};signal={signal_id};"
                        f"correct={str(signal_id == round_definition['targetId']).lower()};rt_ms={reaction_ms}"
                    ),
                )
            )

            p01_selection = runtime.task.selections["P01"]
            p02_selection = runtime.task.selections["P02"]
            p01_time = runtime.task.selection_times["P01"]
            p02_time = runtime.task.selection_times["P02"]
            if p01_selection and p02_selection and p01_time and p02_time:
                success = (
                    p01_selection == round_definition["targetId"]
                    and p02_selection == round_definition["targetId"]
                )
                sync_ms = abs(p01_time - p02_time)
                total_reaction_ms = max(p01_time, p02_time) - (
                    runtime.task.round_started_at or now
                )
                streak = runtime.task.stats["streak"] + 1 if success else 0
                runtime.task.stats["hits"] += int(success)
                runtime.task.stats["misses"] += int(not success)
                runtime.task.stats["streak"] = streak
                runtime.task.stats["bestStreak"] = max(
                    runtime.task.stats["bestStreak"], streak
                )
                runtime.task.stats["syncTotalMs"] += sync_ms
                runtime.task.stats["syncSamples"] += 1
                outcome = {
                    "roundId": round_definition["id"],
                    "success": success,
                    "targetId": round_definition["targetId"],
                    "selections": dict(runtime.task.selections),
                    "reactionTimeMs": total_reaction_ms,
                    "syncDeltaMs": sync_ms,
                }
                runtime.task.history.append(outcome)
                runtime.task.last_outcome = outcome
                runtime.task.phase = "feedback"
                completed_round = runtime.task.current_round_index
                events.append(
                    self.database.record_event(
                        runtime.code,
                        "session",
                        "joint_target_found" if success else "joint_target_missed",
                        (
                            f"round={runtime.task.current_round_index + 1};"
                            f"sync_ms={sync_ms};rt_ms={total_reaction_ms}"
                        ),
                    )
                )

        await self.broadcast_task(runtime)
        for event in events:
            await self.broadcast_researchers(runtime, {"type": "event", "event": event})
        if completed_round is not None:
            asyncio.create_task(self._advance_round_after(runtime, completed_round))

    async def _advance_round_after(
        self, runtime: SessionRuntime, completed_round: int
    ) -> None:
        await asyncio.sleep(1.35)
        event: dict[str, Any] | None = None
        async with runtime.lock:
            if (
                runtime.task.status != "active"
                or runtime.task.phase != "feedback"
                or runtime.task.current_round_index != completed_round
            ):
                return
            next_round = completed_round + 1
            if next_round >= len(SIGNAL_ROUNDS):
                runtime.task.status = "completed"
                runtime.task.phase = "completed"
                accuracy = round(runtime.task.stats["hits"] / len(SIGNAL_ROUNDS) * 100)
                mean_sync = round(
                    runtime.task.stats["syncTotalMs"]
                    / max(1, runtime.task.stats["syncSamples"])
                )
                event = self.database.record_event(
                    runtime.code,
                    "session",
                    "task_completed",
                    (
                        f"hits={runtime.task.stats['hits']};misses={runtime.task.stats['misses']};"
                        f"accuracy={accuracy};mean_sync_ms={mean_sync}"
                    ),
                )
                self.database.set_session_status(runtime.code, "completed")
            else:
                runtime.task.current_round_index = next_round
                runtime.task.phase = "playing"
                runtime.task.selections = {"P01": None, "P02": None}
                runtime.task.selection_times = {"P01": None, "P02": None}
                runtime.task.last_outcome = None
                runtime.task.round_started_at = _now_ms()
                event = self.database.record_event(
                    runtime.code, "session", "round_started", f"round={next_round + 1}"
                )
        await self.broadcast_task(runtime)
        if event:
            await self.broadcast_researchers(runtime, {"type": "event", "event": event})

    async def _set_spotlight_context(
        self, runtime: SessionRuntime, websocket: WebSocket, message: dict[str, Any]
    ) -> None:
        mode = message.get("mode")
        if mode not in SPOTLIGHT_CONTEXT_MODES:
            await websocket.send_json(
                {"type": "error", "message": "Invalid Spotlight Sync context mode"}
            )
            return
        async with runtime.lock:
            if runtime.spotlight_task.context_mode == mode:
                return
            runtime.spotlight_task.context_mode = mode
            event = self.database.record_event(
                runtime.code,
                "researcher",
                "spotlight_context_condition",
                f"mode={mode}",
            )
        await self.broadcast_spotlight_task(runtime)
        await self.broadcast_researchers(runtime, {"type": "event", "event": event})

    async def _set_spotlight_feedback(
        self, runtime: SessionRuntime, websocket: WebSocket, message: dict[str, Any]
    ) -> None:
        mode = message.get("mode")
        if mode not in FEEDBACK_MODES:
            await websocket.send_json(
                {"type": "error", "message": "Invalid Spotlight Sync feedback mode"}
            )
            return
        async with runtime.lock:
            if runtime.spotlight_task.feedback_mode == mode:
                return
            runtime.spotlight_task.feedback_mode = mode
            event = self.database.record_event(
                runtime.code,
                "researcher",
                "spotlight_feedback_condition",
                f"mode={mode}",
            )
        await self.broadcast_spotlight_task(runtime)
        await self.broadcast_researchers(runtime, {"type": "event", "event": event})

    async def _spotlight_task_control(
        self, runtime: SessionRuntime, websocket: WebSocket, message: dict[str, Any]
    ) -> None:
        action = message.get("action")
        if action not in {"start", "stop"}:
            await websocket.send_json(
                {"type": "error", "message": "Invalid Spotlight Sync task action"}
            )
            return
        events: list[dict[str, Any]] = []
        async with runtime.lock:
            if action == "start":
                if runtime.spotlight_task.status == "active":
                    return
                now = _now_ms()
                runtime.spotlight_task = SpotlightTaskRuntime(
                    status="active",
                    phase="playing",
                    context_mode=runtime.spotlight_task.context_mode,
                    feedback_mode=runtime.spotlight_task.feedback_mode,
                    started_at=now,
                    round_started_at=now,
                )
                runtime.spotlight_positions = {
                    "P01": {"x": 0.26, "y": 0.7},
                    "P02": {"x": 0.76, "y": 0.28},
                }
                events.append(
                    self.database.record_event(
                        runtime.code,
                        "researcher",
                        "spotlight_task_started",
                        f"task=spotlight_sync;rounds={len(SPOTLIGHT_ROUNDS)}",
                    )
                )
                events.append(
                    self.database.record_event(
                        runtime.code,
                        "session",
                        "spotlight_round_started",
                        "round=1",
                    )
                )
                self.database.set_session_status(runtime.code, "active")
            else:
                if runtime.spotlight_task.status != "active":
                    return
                runtime.spotlight_task.status = "idle"
                runtime.spotlight_task.phase = "idle"
                events.append(
                    self.database.record_event(
                        runtime.code,
                        "researcher",
                        "spotlight_task_stopped",
                        "manual_stop",
                    )
                )
        await self.broadcast_spotlight_task(runtime)
        for event in events:
            await self.broadcast_researchers(runtime, {"type": "event", "event": event})

    async def _spotlight_move(
        self,
        runtime: SessionRuntime,
        websocket: WebSocket,
        participant: str,
        message: dict[str, Any],
    ) -> None:
        x = message.get("x")
        y = message.get("y")
        if (
            not isinstance(x, (int, float))
            or isinstance(x, bool)
            or not isinstance(y, (int, float))
            or isinstance(y, bool)
            or not 0 <= float(x) <= 1
            or not 0 <= float(y) <= 1
        ):
            await websocket.send_json(
                {"type": "error", "message": "Invalid Spotlight Sync position"}
            )
            return
        point = {"x": round(float(x), 4), "y": round(float(y), 4)}
        runtime.spotlight_positions[participant] = point
        await self.broadcast(
            runtime,
            {
                "type": "spotlight_position",
                "participant": participant,
                "point": point,
            },
        )

    async def _spotlight_select(
        self,
        runtime: SessionRuntime,
        websocket: WebSocket,
        participant: str,
        message: dict[str, Any],
    ) -> None:
        object_id = message.get("object_id")
        if object_id not in SPOTLIGHT_OBJECT_BY_ID:
            await websocket.send_json(
                {"type": "error", "message": "Invalid Spotlight Sync object"}
            )
            return

        events: list[dict[str, Any]] = []
        completed_round: int | None = None
        async with runtime.lock:
            if (
                runtime.spotlight_task.status != "active"
                or runtime.spotlight_task.phase != "playing"
            ):
                await websocket.send_json(
                    {"type": "error", "message": "The Spotlight Sync round is not active"}
                )
                return
            if runtime.spotlight_task.selections[participant] is not None:
                return

            now = _now_ms()
            round_definition = runtime.spotlight_task.round()
            assert round_definition is not None
            runtime.spotlight_task.selections[participant] = object_id
            runtime.spotlight_task.selection_times[participant] = now
            object_definition = SPOTLIGHT_OBJECT_BY_ID[object_id]
            runtime.spotlight_positions[participant] = {
                "x": object_definition["x"],
                "y": object_definition["y"],
            }
            reaction_ms = max(
                0, now - (runtime.spotlight_task.round_started_at or now)
            )
            events.append(
                self.database.record_event(
                    runtime.code,
                    participant,
                    "spotlight_focus",
                    (
                        f"round={runtime.spotlight_task.current_round_index + 1};"
                        f"object={object_id};"
                        f"correct={str(object_id == round_definition['targetId']).lower()};"
                        f"rt_ms={reaction_ms};x={object_definition['x']};"
                        f"y={object_definition['y']}"
                    ),
                )
            )

            p01_selection = runtime.spotlight_task.selections["P01"]
            p02_selection = runtime.spotlight_task.selections["P02"]
            p01_time = runtime.spotlight_task.selection_times["P01"]
            p02_time = runtime.spotlight_task.selection_times["P02"]
            if p01_selection and p02_selection and p01_time and p02_time:
                success = (
                    p01_selection == round_definition["targetId"]
                    and p02_selection == round_definition["targetId"]
                )
                convergence_ms = abs(p01_time - p02_time)
                total_reaction_ms = max(p01_time, p02_time) - (
                    runtime.spotlight_task.round_started_at or now
                )
                streak = (
                    runtime.spotlight_task.stats["streak"] + 1 if success else 0
                )
                runtime.spotlight_task.stats["hits"] += int(success)
                runtime.spotlight_task.stats["misses"] += int(not success)
                runtime.spotlight_task.stats["streak"] = streak
                runtime.spotlight_task.stats["bestStreak"] = max(
                    runtime.spotlight_task.stats["bestStreak"], streak
                )
                runtime.spotlight_task.stats["convergenceTotalMs"] += convergence_ms
                runtime.spotlight_task.stats["convergenceSamples"] += 1
                outcome = {
                    "roundId": round_definition["id"],
                    "success": success,
                    "targetId": round_definition["targetId"],
                    "selections": dict(runtime.spotlight_task.selections),
                    "reactionTimeMs": total_reaction_ms,
                    "convergenceMs": convergence_ms,
                }
                runtime.spotlight_task.history.append(outcome)
                runtime.spotlight_task.last_outcome = outcome
                runtime.spotlight_task.phase = "feedback"
                completed_round = runtime.spotlight_task.current_round_index
                events.append(
                    self.database.record_event(
                        runtime.code,
                        "session",
                        (
                            "spotlight_joint_found"
                            if success
                            else "spotlight_joint_missed"
                        ),
                        (
                            f"round={runtime.spotlight_task.current_round_index + 1};"
                            f"convergence_ms={convergence_ms};rt_ms={total_reaction_ms}"
                        ),
                    )
                )

        await self.broadcast_spotlight_task(runtime)
        for event in events:
            await self.broadcast_researchers(runtime, {"type": "event", "event": event})
        if completed_round is not None:
            asyncio.create_task(
                self._advance_spotlight_round_after(runtime, completed_round)
            )

    async def _advance_spotlight_round_after(
        self, runtime: SessionRuntime, completed_round: int
    ) -> None:
        await asyncio.sleep(1.35)
        event: dict[str, Any] | None = None
        async with runtime.lock:
            if (
                runtime.spotlight_task.status != "active"
                or runtime.spotlight_task.phase != "feedback"
                or runtime.spotlight_task.current_round_index != completed_round
            ):
                return
            next_round = completed_round + 1
            if next_round >= len(SPOTLIGHT_ROUNDS):
                runtime.spotlight_task.status = "completed"
                runtime.spotlight_task.phase = "completed"
                accuracy = round(
                    runtime.spotlight_task.stats["hits"]
                    / len(SPOTLIGHT_ROUNDS)
                    * 100
                )
                mean_convergence = round(
                    runtime.spotlight_task.stats["convergenceTotalMs"]
                    / max(
                        1,
                        runtime.spotlight_task.stats["convergenceSamples"],
                    )
                )
                event = self.database.record_event(
                    runtime.code,
                    "session",
                    "spotlight_task_completed",
                    (
                        f"hits={runtime.spotlight_task.stats['hits']};"
                        f"misses={runtime.spotlight_task.stats['misses']};"
                        f"accuracy={accuracy};"
                        f"mean_convergence_ms={mean_convergence}"
                    ),
                )
                self.database.set_session_status(runtime.code, "completed")
            else:
                runtime.spotlight_task.current_round_index = next_round
                runtime.spotlight_task.phase = "playing"
                runtime.spotlight_task.selections = {"P01": None, "P02": None}
                runtime.spotlight_task.selection_times = {"P01": None, "P02": None}
                runtime.spotlight_task.last_outcome = None
                runtime.spotlight_task.round_started_at = _now_ms()
                event = self.database.record_event(
                    runtime.code,
                    "session",
                    "spotlight_round_started",
                    f"round={next_round + 1}",
                )
        await self.broadcast_spotlight_task(runtime)
        if event:
            await self.broadcast_researchers(runtime, {"type": "event", "event": event})

    async def snapshot(self, code: str) -> dict[str, Any] | None:
        runtime = await self.get_runtime(code)
        if runtime is None:
            return None
        session = self.database.get_session(code)
        assert session is not None
        return {
            "code": runtime.code,
            "created_at": session["created_at"],
            "status": session["status"],
            "event_count": session["event_count"],
            "presence": runtime.presence(),
            "conditions": runtime.condition_state(),
            "mediaState": runtime.media_state(),
            "task": runtime.task.public(),
            "spotlightTask": runtime.spotlight_task.public(),
            "spotlightPositions": dict(runtime.spotlight_positions),
        }
