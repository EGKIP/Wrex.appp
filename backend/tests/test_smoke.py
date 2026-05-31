from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


SAMPLE_TEXT = (
    "Writing becomes stronger when a student explains a specific moment from "
    "their own experience. In this draft, the writer connects a classroom "
    "discussion to a personal decision and then adds concrete details that "
    "make the argument easier to trust."
)


def test_healthcheck() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_analyze_returns_authenticity_result() -> None:
    response = client.post("/analyze", json={"text": SAMPLE_TEXT})

    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload["score"], int)
    assert payload["stats"]["word_count"] >= 25
    assert payload["quota"] is None


def test_analyze_enforces_free_word_limit() -> None:
    response = client.post("/analyze", json={"text": "word " * 501})

    assert response.status_code == 422
    assert "Free plan limit is 500 words" in response.json()["detail"]


def test_empty_grammar_check_does_not_call_external_service() -> None:
    response = client.post("/grammar-check", json={"text": ""})

    assert response.status_code == 200
    assert response.json() == {"matches": [], "language": "en-US"}
