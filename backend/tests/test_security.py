import uuid
from datetime import UTC, datetime, timedelta

import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from app import security


def _generate_keypair() -> tuple[str, str]:
    """Generate a throwaway RSA keypair as PEM strings, for JWT round-trip tests.

    :returns: A ``(private_key_pem, public_key_pem)`` pair.
    :rtype: tuple[str, str]
    """
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("utf-8")
    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    ).decode("utf-8")
    return private_pem, public_pem


@pytest.fixture(scope="module")
def keypair() -> tuple[str, str]:
    """Provide a module-scoped RSA keypair, so it's only generated once per file.

    :returns: A ``(private_key_pem, public_key_pem)`` pair.
    :rtype: tuple[str, str]
    """
    return _generate_keypair()


def test_hash_password_round_trips_via_verify_password() -> None:
    """Verify a hashed password is accepted by ``verify_password`` with the same plaintext."""
    hashed = security.hash_password("correct horse battery staple")

    assert security.verify_password(hashed, "correct horse battery staple") is True


def test_verify_password_rejects_wrong_password() -> None:
    """Verify the wrong plaintext against a real hash returns False, not raising."""
    hashed = security.hash_password("correct horse battery staple")

    assert security.verify_password(hashed, "wrong password") is False


def test_verify_password_rejects_corrupt_hash() -> None:
    """Verify a malformed/unrecognized hash returns False rather than raising."""
    assert security.verify_password("not-a-real-argon2-hash", "anything") is False


def test_create_and_decode_access_token_round_trips(keypair: tuple[str, str]) -> None:
    """Verify a token created with the private key decodes correctly with the public key."""
    private_pem, public_pem = keypair
    user_id = uuid.uuid4()

    token = security.create_access_token(user_id, private_pem, ttl=timedelta(minutes=15))
    claims = security.decode_access_token(token, public_pem)

    assert claims.user_id == user_id
    assert claims.expires_at > datetime.now(UTC)


def test_decode_access_token_rejects_expired_token(keypair: tuple[str, str]) -> None:
    """Verify a token whose TTL has already elapsed is rejected as a TokenError."""
    private_pem, public_pem = keypair
    token = security.create_access_token(uuid.uuid4(), private_pem, ttl=timedelta(seconds=-1))

    with pytest.raises(security.TokenError):
        security.decode_access_token(token, public_pem)


def test_decode_access_token_rejects_wrong_keypair(keypair: tuple[str, str]) -> None:
    """Verify a token verified against an unrelated public key is rejected."""
    private_pem, _ = keypair
    _, other_public_pem = _generate_keypair()
    token = security.create_access_token(uuid.uuid4(), private_pem, ttl=timedelta(minutes=15))

    with pytest.raises(security.TokenError):
        security.decode_access_token(token, other_public_pem)


def test_decode_access_token_rejects_malformed_token(keypair: tuple[str, str]) -> None:
    """Verify garbage input is rejected as a TokenError, not an unhandled exception."""
    _, public_pem = keypair

    with pytest.raises(security.TokenError):
        security.decode_access_token("not-a-jwt", public_pem)


def test_decode_access_token_rejects_missing_sub_claim(keypair: tuple[str, str]) -> None:
    """Verify a validly-signed token missing ``sub`` is rejected, not crashing on KeyError."""
    private_pem, public_pem = keypair
    now = datetime.now(UTC)
    token = jwt.encode({"iat": now, "exp": now + timedelta(minutes=15)}, private_pem, "RS256")

    with pytest.raises(security.TokenError):
        security.decode_access_token(token, public_pem)


def test_decode_access_token_rejects_non_uuid_sub_claim(keypair: tuple[str, str]) -> None:
    """Verify a validly-signed token whose ``sub`` isn't a UUID is rejected cleanly."""
    private_pem, public_pem = keypair
    now = datetime.now(UTC)
    token = jwt.encode(
        {"sub": "not-a-uuid", "iat": now, "exp": now + timedelta(minutes=15)}, private_pem, "RS256"
    )

    with pytest.raises(security.TokenError):
        security.decode_access_token(token, public_pem)


def test_generate_refresh_token_produces_unique_values() -> None:
    """Verify two generated refresh tokens differ (random, not a fixed/predictable value)."""
    assert security.generate_refresh_token() != security.generate_refresh_token()


def test_hash_refresh_token_is_deterministic() -> None:
    """Verify hashing the same token twice yields the same hash (needed for lookup by hash)."""
    token = security.generate_refresh_token()

    assert security.hash_refresh_token(token) == security.hash_refresh_token(token)


def test_hash_refresh_token_differs_for_different_tokens() -> None:
    """Verify two distinct tokens hash to two distinct values."""
    first = security.hash_refresh_token(security.generate_refresh_token())
    second = security.hash_refresh_token(security.generate_refresh_token())

    assert first != second
