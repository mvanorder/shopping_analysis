from fastapi.testclient import TestClient


def test_health_returns_ok(client: TestClient) -> None:
    """Verify ``GET /health`` reports liveness with a static ok payload.

    :param client: The app's test client, injected via fixture.
    :type client: TestClient
    """
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
