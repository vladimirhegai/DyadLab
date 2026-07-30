from fastapi.testclient import TestClient

from backend.app.database import EXPORT_HEADER
from backend.app.main import create_app


def test_session_creation_and_empty_exports(tmp_path):
    app = create_app(tmp_path / "test.db")

    with TestClient(app) as client:
        response = client.post(
            "/sessions",
            json={"join_base_url": "https://dyadlab.example"},
        )
        assert response.status_code == 201
        payload = response.json()
        assert len(payload["code"]) == 6
        assert payload["participant_urls"]["P01"].endswith(
            f"/session?code={payload['code']}&participant=P01"
        )
        assert payload["participant_urls"]["P02"].endswith(
            f"/session?code={payload['code']}&participant=P02"
        )

        session = client.get(f"/sessions/{payload['code']}")
        assert session.status_code == 200
        assert session.json()["status"] == "active"

        csv_response = client.get(f"/sessions/{payload['code']}/events.csv")
        assert csv_response.status_code == 200
        assert csv_response.text.strip() == ",".join(
            f'"{column}"' for column in EXPORT_HEADER
        )

        json_response = client.get(f"/sessions/{payload['code']}/events.json")
        assert json_response.status_code == 200
        assert json_response.json() == []


def test_unknown_session_returns_not_found(tmp_path):
    app = create_app(tmp_path / "test.db")

    with TestClient(app) as client:
        assert client.get("/sessions/ABC123").status_code == 404
        assert client.get("/sessions/ABC123/events.csv").status_code == 404
