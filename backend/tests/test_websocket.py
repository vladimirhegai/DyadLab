import time

from fastapi.testclient import TestClient

from backend.app.main import create_app
from backend.app.realtime import SPOTLIGHT_OBJECT_BY_ID


def create_session(client: TestClient):
    return client.post("/sessions", json={}).json()


def researcher_socket(session):
    return (
        f"/ws/{session['code']}?role=researcher"
        f"&token={session['researcher_token']}"
    )


def participant_socket(session, participant: str):
    participant_url = session["participant_urls"][participant]
    token = participant_token(session, participant)
    return (
        f"/ws/{session['code']}?role=participant&participant={participant}"
        f"&token={token}"
    )


def participant_token(session, participant: str):
    return session["participant_urls"][participant].split("token=", 1)[1]


def researcher_params(session):
    return {"token": session["researcher_token"]}


def receive_until(websocket, message_type: str):
    for _ in range(12):
        message = websocket.receive_json()
        if message.get("type") == message_type:
            return message
    raise AssertionError(f"Did not receive a {message_type!r} message")


def receive_spotlight_phase(websocket, phase: str):
    for _ in range(40):
        message = websocket.receive_json()
        if (
            message.get("type") == "spotlight_task_state"
            and message["task"]["phase"] == phase
        ):
            return message["task"]
    raise AssertionError(f"Did not receive Spotlight Sync phase {phase!r}")


def test_websocket_rejects_invalid_roles_origins_and_duplicate_participants(tmp_path):
    app = create_app(tmp_path / "test.db")

    with TestClient(app) as client:
        session = create_session(client)
        code = session["code"]

        with client.websocket_connect(
            f"/ws/{code}?role=researcher&token={'x' * 32}"
        ) as unauthorized:
            assert unauthorized.receive_json()["message"] == "Invalid session credential"

        with client.websocket_connect(
            researcher_socket(session),
            headers={"origin": "https://evil.example"},
        ) as hostile_origin:
            assert hostile_origin.receive_json()["message"] == "Origin is not allowed"

        with client.websocket_connect(
            participant_socket(session, "P01")
        ) as first:
            assert first.receive_json()["type"] == "welcome"
            with client.websocket_connect(
                participant_socket(session, "P01")
            ) as duplicate:
                message = duplicate.receive_json()
                assert message["type"] == "error"
                assert "already connected" in message["message"]


def test_condition_change_is_pushed_and_persisted(tmp_path):
    app = create_app(tmp_path / "test.db")

    with TestClient(app) as client:
        session = create_session(client)
        code = session["code"]

        with client.websocket_connect(researcher_socket(session)) as researcher:
            assert researcher.receive_json()["type"] == "welcome"

            with client.websocket_connect(
                participant_socket(session, "P01")
            ) as participant:
                assert participant.receive_json()["type"] == "welcome"
                receive_until(researcher, "presence")

                researcher.send_json(
                    {
                        "type": "set_condition",
                        "participant": "P01",
                        "condition": "blurred",
                    }
                )

                condition = receive_until(participant, "condition_change")
                assert condition["condition"] == "blurred"

        events = client.get(
            f"/sessions/{code}/events",
            params=researcher_params(session),
        ).json()
        assert [event["type"] for event in events] == [
            "joined_session",
            "video_condition",
        ]
        assert events[-1]["value"] == "blurred (P01)"


def test_optional_media_state_and_researcher_monitor_signaling(tmp_path):
    app = create_app(tmp_path / "test.db")

    with TestClient(app) as client:
        session = create_session(client)
        code = session["code"]

        with client.websocket_connect(researcher_socket(session)) as researcher:
            welcome = researcher.receive_json()
            assert welcome["mediaState"]["P01"] == {
                "camera": False,
                "microphone": False,
            }

            with client.websocket_connect(
                participant_socket(session, "P01")
            ) as participant:
                participant_welcome = participant.receive_json()
                assert participant_welcome["mediaState"]["P01"] == {
                    "camera": False,
                    "microphone": False,
                }
                receive_until(researcher, "presence")

                participant.send_json(
                    {
                        "type": "media_state",
                        "camera": False,
                        "microphone": False,
                    }
                )
                media_state = receive_until(researcher, "media_state")
                assert media_state["participant"] == "P01"
                assert media_state["camera"] is False
                assert media_state["microphone"] is False

                researcher.send_json(
                    {"type": "request_monitor_stream", "participant": "P01"}
                )
                assert receive_until(participant, "monitor_requested") == {
                    "type": "monitor_requested"
                }

                participant.send_json(
                    {
                        "type": "monitor_signal",
                        "payload": {
                            "description": {"type": "offer", "sdp": "test-offer"}
                        },
                    }
                )
                offer = receive_until(researcher, "monitor_signal")
                assert offer["from"] == "P01"
                assert offer["payload"]["description"]["type"] == "offer"

                researcher.send_json(
                    {
                        "type": "monitor_signal",
                        "target": "P01",
                        "payload": {
                            "description": {"type": "answer", "sdp": "test-answer"}
                        },
                    }
                )
                answer = receive_until(participant, "monitor_signal")
                assert answer["from"] == "researcher"
                assert answer["payload"]["description"]["type"] == "answer"

        events = client.get(
            f"/sessions/{code}/events",
            params=researcher_params(session),
        ).json()
        assert [event["type"] for event in events] == [
            "joined_session",
            "media_state",
        ]
        assert events[-1]["value"] == "camera=off,microphone=off"


def test_spotlight_sync_shares_positions_but_keeps_clues_private(tmp_path):
    app = create_app(tmp_path / "test.db")

    with TestClient(app) as client:
        credentials = create_session(client)
        code = credentials["code"]

        with client.websocket_connect(researcher_socket(credentials)) as researcher:
            researcher.receive_json()
            with client.websocket_connect(
                participant_socket(credentials, "P01")
            ) as p01:
                p01.receive_json()
                with client.websocket_connect(
                    participant_socket(credentials, "P02")
                ) as p02:
                    p02.receive_json()
                    researcher.send_json(
                        {"type": "spotlight_task_control", "action": "start"}
                    )

                    p01_task = receive_spotlight_phase(p01, "playing")
                    p02_task = receive_spotlight_phase(p02, "playing")
                    assert p01_task["currentRound"]["clue"]["label"] == "It holds liquid"
                    assert (
                        p02_task["currentRound"]["clue"]["label"]
                        == "Desk height · right side"
                    )
                    assert "targetId" not in p01_task["currentRound"]
                    assert "researcherClues" not in p02_task["currentRound"]

                    participant_snapshot = client.get(
                        f"/sessions/{code}",
                        params={
                            "role": "participant",
                            "participant": "P01",
                            "token": participant_token(credentials, "P01"),
                        },
                    ).json()
                    participant_round = participant_snapshot["spotlightTask"][
                        "currentRound"
                    ]
                    assert participant_round["clue"]["label"] == "It holds liquid"
                    assert "targetId" not in participant_round
                    assert "researcherClues" not in participant_round

                    researcher_snapshot = client.get(
                        f"/sessions/{code}",
                        params=researcher_params(credentials),
                    ).json()
                    researcher_round = researcher_snapshot["spotlightTask"][
                        "currentRound"
                    ]
                    assert researcher_round["targetId"] == "mug"
                    assert set(researcher_round["researcherClues"]) == {
                        "P01",
                        "P02",
                    }

                    p01.send_json({"type": "spotlight_move", "x": 0.78, "y": 0.73})
                    position = receive_until(p02, "spotlight_position")
                    assert position["participant"] == "P01"
                    assert position["point"] == {"x": 0.78, "y": 0.73}

                    targets = ("mug", "moth", "key", "fern", "jar", "can")
                    for index, target in enumerate(targets):
                        target_object = SPOTLIGHT_OBJECT_BY_ID[target]
                        point = {
                            "type": "spotlight_move",
                            "x": target_object["x"],
                            "y": target_object["y"],
                        }
                        p01.send_json(point)
                        p02.send_json(point)
                        time.sleep(0.7)
                        p01.send_json(
                            {"type": "spotlight_select", "object_id": target}
                        )
                        p02.send_json(
                            {"type": "spotlight_select", "object_id": target}
                        )
                        feedback = receive_spotlight_phase(researcher, "feedback")
                        assert feedback["lastOutcome"]["success"] is True
                        if index < len(targets) - 1:
                            playing = receive_spotlight_phase(researcher, "playing")
                            assert playing["currentRoundIndex"] == index + 1
                        else:
                            completed = receive_spotlight_phase(
                                researcher, "completed"
                            )
                            assert completed["stats"]["hits"] == 6

        session = client.get(
            f"/sessions/{code}",
            params=researcher_params(credentials),
        ).json()
        assert session["status"] == "completed"
        assert session["spotlightTask"]["stats"]["hits"] == 6
        assert len(session["spotlightTask"]["history"]) == 6

        event_types = [
            event["type"]
            for event in client.get(
                f"/sessions/{code}/events",
                params=researcher_params(credentials),
            ).json()
        ]
        assert "spotlight_position_sample" in event_types
        assert "spotlight_focus" in event_types
        assert event_types[-1] == "spotlight_task_completed"


def test_spotlight_sync_restarts_an_active_round_after_server_restart(tmp_path):
    database_path = tmp_path / "test.db"
    app = create_app(database_path)

    with TestClient(app) as client:
        credentials = create_session(client)
        code = credentials["code"]

        with client.websocket_connect(researcher_socket(credentials)) as researcher:
            researcher.receive_json()
            with client.websocket_connect(
                participant_socket(credentials, "P01")
            ) as p01:
                p01.receive_json()
                with client.websocket_connect(
                    participant_socket(credentials, "P02")
                ) as p02:
                    p02.receive_json()
                    researcher.send_json(
                        {"type": "spotlight_task_control", "action": "start"}
                    )
                    receive_spotlight_phase(researcher, "playing")
                    receive_spotlight_phase(p01, "playing")
                    receive_spotlight_phase(p02, "playing")

                    active = client.get(
                        f"/sessions/{code}",
                        params=researcher_params(credentials),
                    ).json()["spotlightTask"]
                    assert active["status"] == "active"
                    assert active["phase"] == "playing"

    restarted_app = create_app(database_path)
    with TestClient(restarted_app) as restarted_client:
        spotlight_task = restarted_client.get(
            f"/sessions/{code}",
            params=researcher_params(credentials),
        ).json()["spotlightTask"]
        assert spotlight_task["status"] == "active"
        assert spotlight_task["phase"] == "playing"
        assert spotlight_task["selections"] == {"P01": None, "P02": None}
        assert spotlight_task["selectionTimes"] == {"P01": None, "P02": None}
