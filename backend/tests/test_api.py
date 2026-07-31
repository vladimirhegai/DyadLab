from urllib.parse import parse_qs, urlparse

from fastapi.testclient import TestClient

from backend.app.database import EXPORT_HEADER
from backend.app.main import create_app


def test_session_creation_uses_role_scoped_credentials_and_structured_exports(tmp_path):
    app = create_app(tmp_path / "test.db")

    with TestClient(app) as client:
        response = client.post(
            "/sessions",
            json={"join_base_url": "https://dyadlab.example"},
        )
        assert response.status_code == 201
        payload = response.json()
        code = payload["code"]
        researcher_token = payload["researcher_token"]

        assert len(code) == 6
        assert len(researcher_token) >= 20
        for participant in ("P01", "P02"):
            parsed = urlparse(payload["participant_urls"][participant])
            query = parse_qs(parsed.query)
            assert parsed.path == "/session"
            assert query["code"] == [code]
            assert query["participant"] == [participant]
            assert len(query["token"][0]) >= 20

        assert client.get(f"/sessions/{code}").status_code == 422
        session = client.get(
            f"/sessions/{code}",
            params={"token": researcher_token},
        )
        assert session.status_code == 200
        assert session.json()["status"] == "active"
        assert session.json()["protocol_version"] == "spotlight-sync-v2"

        csv_response = client.get(
            f"/sessions/{code}/events.csv",
            params={"token": researcher_token},
        )
        assert csv_response.status_code == 200
        assert csv_response.text.strip() == ",".join(
            f'"{column}"' for column in EXPORT_HEADER
        )

        json_response = client.get(
            f"/sessions/{code}/events.json",
            params={"token": researcher_token},
        )
        assert json_response.status_code == 200
        assert json_response.json() == []


def test_session_data_requires_researcher_token_and_can_be_deleted(tmp_path):
    app = create_app(tmp_path / "test.db")

    with TestClient(app) as client:
        payload = client.post("/sessions", json={}).json()
        code = payload["code"]
        token = payload["researcher_token"]

        assert client.get(
            f"/sessions/{code}",
            params={"token": "x" * 32},
        ).status_code == 403
        assert client.get(
            f"/sessions/{code}/events",
            params={"token": "x" * 32},
        ).status_code == 403
        assert client.delete(
            f"/sessions/{code}",
            params={"token": token},
        ).status_code == 204
        assert client.get(
            f"/sessions/{code}",
            params={"token": token},
        ).status_code == 404


def test_unknown_session_returns_not_found(tmp_path):
    app = create_app(tmp_path / "test.db")

    with TestClient(app) as client:
        params = {"token": "x" * 32}
        assert client.get("/sessions/ABC123", params=params).status_code == 404
        assert (
            client.get("/sessions/ABC123/events.csv", params=params).status_code
            == 404
        )
