import uuid
from collections.abc import Callable

from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError

from app.models import AuthIdentity, User
from tests.fakes import FakeSession


def test_register_success(session_client_factory: Callable[[FakeSession], TestClient]) -> None:
    """Verify a new email registers, staging both a ``User`` and a password ``AuthIdentity``."""
    # Two queued results: the email pre-check, then upsert_password_identity's
    # own lookup for an existing password identity (there isn't one yet).
    session = FakeSession(execute_results=[None, None])
    client = session_client_factory(session)

    response = client.post(
        "/auth/register",
        json={"email": "new@example.com", "password": "correct horse", "display_name": "New"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "new@example.com"
    assert body["display_name"] == "New"
    assert "id" in body
    assert session.committed is True
    assert len(session.added) == 2
    assert isinstance(session.added[0], User)
    identity = session.added[1]
    assert isinstance(identity, AuthIdentity)
    assert identity.provider == "password"


def test_register_duplicate_email_precheck(
    session_client_factory: Callable[[FakeSession], TestClient],
) -> None:
    """Verify a pre-existing email is rejected without touching the DB further."""
    existing = User(email="taken@example.com")
    existing.id = uuid.uuid4()
    session = FakeSession(execute_results=[existing])
    client = session_client_factory(session)

    response = client.post(
        "/auth/register",
        json={"email": "taken@example.com", "password": "correct horse"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Email already registered"
    assert session.added == []
    assert session.committed is False


def test_register_duplicate_email_race(
    session_client_factory: Callable[[FakeSession], TestClient],
) -> None:
    """Verify a unique-constraint violation at insert time is reported the same way."""
    session = FakeSession(
        execute_results=[None],
        flush_error=IntegrityError("insert", {}, Exception("duplicate key")),
    )
    client = session_client_factory(session)

    response = client.post(
        "/auth/register",
        json={"email": "race@example.com", "password": "correct horse"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Email already registered"
    assert session.rolled_back is True
    assert session.committed is False


def test_register_password_too_short(
    session_client_factory: Callable[[FakeSession], TestClient],
) -> None:
    """Verify a too-short password is rejected by validation before touching the DB."""
    session = FakeSession(execute_results=[])
    client = session_client_factory(session)

    response = client.post(
        "/auth/register", json={"email": "new@example.com", "password": "short"}
    )

    assert response.status_code == 422
    assert session.added == []
    assert session.committed is False


def test_register_malformed_email(
    session_client_factory: Callable[[FakeSession], TestClient],
) -> None:
    """Verify a malformed email is rejected by validation before touching the DB."""
    session = FakeSession(execute_results=[])
    client = session_client_factory(session)

    response = client.post(
        "/auth/register", json={"email": "not-an-email", "password": "correct horse"}
    )

    assert response.status_code == 422
    assert session.added == []
