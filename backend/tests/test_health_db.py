from collections.abc import Callable

from fastapi.testclient import TestClient


def test_health_db_success(db_client_factory: Callable[[bool], TestClient]) -> None:
    """Verify ``GET /health/db`` reports ok when the query succeeds.

    :param db_client_factory: Factory fixture producing a ``TestClient``
        with ``get_db`` stubbed to a working session.
    :type db_client_factory: Callable[[bool], TestClient]
    """
    client = db_client_factory(False)

    response = client.get("/health/db")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_db_failure(db_client_factory: Callable[[bool], TestClient]) -> None:
    """Verify ``GET /health/db`` reports 503 when the query raises.

    :param db_client_factory: Factory fixture producing a ``TestClient``
        with ``get_db`` stubbed to a failing session.
    :type db_client_factory: Callable[[bool], TestClient]
    """
    client = db_client_factory(True)

    response = client.get("/health/db")

    assert response.status_code == 503
    assert response.json() == {"detail": "Database unavailable"}
