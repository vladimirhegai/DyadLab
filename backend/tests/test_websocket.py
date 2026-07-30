from fastapi.testclient import TestClient

from backend.app.main import create_app


def receive_until(websocket, message_type: str):
    for _ in range(12):
        message = websocket.receive_json()
        if message.get("type") == message_type:
            return message
    raise AssertionError(f"Did not receive a {message_type!r} message")


def receive_task_phase(websocket, phase: str):
    for _ in range(40):
        message = websocket.receive_json()
        if (
            message.get("type") == "task_state"
            and message["task"]["phase"] == phase
        ):
            return message["task"]
    raise AssertionError(f"Did not receive task phase {phase!r}")


def receive_spotlight_phase(websocket, phase: str):
    for _ in range(40):
        message = websocket.receive_json()
        if (
            message.get("type") == "spotlight_task_state"
            and message["task"]["phase"] == phase
        ):
            return message["task"]
    raise AssertionError(f"Did not receive Spotlight Sync phase {phase!r}")


def test_condition_change_is_pushed_and_persisted(tmp_path):
    app = create_app(tmp_path / "test.db")

    with TestClient(app) as client:
        code = client.post("/sessions", json={}).json()["code"]

        with client.websocket_connect(f"/ws/{code}?role=researcher") as researcher:
            assert researcher.receive_json()["type"] == "welcome"

            with client.websocket_connect(
                f"/ws/{code}?role=participant&participant=P01"
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

        events = client.get(f"/sessions/{code}/events").json()
        assert [event["type"] for event in events] == [
            "joined_session",
            "video_condition",
        ]
        assert events[-1]["value"] == "blurred (P01)"


def test_signal_sync_is_private_and_server_authoritative(tmp_path):
    app = create_app(tmp_path / "test.db")

    with TestClient(app) as client:
        code = client.post("/sessions", json={}).json()["code"]

        with client.websocket_connect(f"/ws/{code}?role=researcher") as researcher:
            researcher.receive_json()
            with client.websocket_connect(
                f"/ws/{code}?role=participant&participant=P01"
            ) as p01:
                p01.receive_json()
                with client.websocket_connect(
                    f"/ws/{code}?role=participant&participant=P02"
                ) as p02:
                    p02.receive_json()
                    researcher.send_json({"type": "task_control", "action": "start"})

                    p01_task = receive_task_phase(p01, "playing")
                    p02_task = receive_task_phase(p02, "playing")
                    assert p01_task["currentRound"]["clue"]["label"] == "Circle"
                    assert p02_task["currentRound"]["clue"]["label"] == "Magenta"
                    assert "targetId" not in p01_task["currentRound"]
                    assert "researcherClues" not in p02_task["currentRound"]

                    targets = (
                        "s01-magenta-circle",
                        "s02-violet-diamond",
                        "s03-gold-triangle",
                        "s04-teal-hexagon",
                    )
                    for index, target in enumerate(targets):
                        p01.send_json({"type": "signal_select", "signal_id": target})
                        p02.send_json({"type": "signal_select", "signal_id": target})
                        feedback = receive_task_phase(researcher, "feedback")
                        assert feedback["lastOutcome"]["success"] is True
                        if index < len(targets) - 1:
                            playing = receive_task_phase(researcher, "playing")
                            assert playing["currentRoundIndex"] == index + 1
                        else:
                            completed = receive_task_phase(researcher, "completed")
                            assert completed["stats"]["hits"] == 4

        session = client.get(f"/sessions/{code}").json()
        assert session["status"] == "completed"
        assert session["task"]["stats"]["hits"] == 4
        assert len(session["task"]["history"]) == 4


def test_spotlight_sync_shares_positions_but_keeps_clues_private(tmp_path):
    app = create_app(tmp_path / "test.db")

    with TestClient(app) as client:
        code = client.post("/sessions", json={}).json()["code"]

        with client.websocket_connect(f"/ws/{code}?role=researcher") as researcher:
            researcher.receive_json()
            with client.websocket_connect(
                f"/ws/{code}?role=participant&participant=P01"
            ) as p01:
                p01.receive_json()
                with client.websocket_connect(
                    f"/ws/{code}?role=participant&participant=P02"
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

                    p01.send_json({"type": "spotlight_move", "x": 0.78, "y": 0.73})
                    position = receive_until(p02, "spotlight_position")
                    assert position["participant"] == "P01"
                    assert position["point"] == {"x": 0.78, "y": 0.73}

                    targets = ("mug", "moth", "key", "fern", "jar", "can")
                    for index, target in enumerate(targets):
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

        session = client.get(f"/sessions/{code}").json()
        assert session["status"] == "completed"
        assert session["spotlightTask"]["stats"]["hits"] == 6
        assert len(session["spotlightTask"]["history"]) == 6

        event_types = [
            event["type"]
            for event in client.get(f"/sessions/{code}/events").json()
        ]
        assert "spotlight_focus" in event_types
        assert event_types[-1] == "spotlight_task_completed"


def test_spotlight_sync_restarts_an_incomplete_choice_after_server_restart(tmp_path):
    database_path = tmp_path / "test.db"
    app = create_app(database_path)

    with TestClient(app) as client:
        code = client.post("/sessions", json={}).json()["code"]

        with client.websocket_connect(f"/ws/{code}?role=researcher") as researcher:
            researcher.receive_json()
            with client.websocket_connect(
                f"/ws/{code}?role=participant&participant=P01"
            ) as p01:
                p01.receive_json()
                researcher.send_json(
                    {"type": "spotlight_task_control", "action": "start"}
                )
                receive_spotlight_phase(researcher, "playing")
                receive_spotlight_phase(p01, "playing")

                p01.send_json(
                    {"type": "spotlight_select", "object_id": "mug"}
                )
                partial = receive_spotlight_phase(researcher, "playing")
                assert partial["selections"]["P01"] == "mug"
                assert partial["selections"]["P02"] is None

    restarted_app = create_app(database_path)
    with TestClient(restarted_app) as restarted_client:
        spotlight_task = restarted_client.get(f"/sessions/{code}").json()[
            "spotlightTask"
        ]
        assert spotlight_task["status"] == "active"
        assert spotlight_task["phase"] == "playing"
        assert spotlight_task["selections"] == {"P01": None, "P02": None}
        assert spotlight_task["selectionTimes"] == {"P01": None, "P02": None}
