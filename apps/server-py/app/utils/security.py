from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.core.config import settings

_ph = PasswordHasher(
    time_cost=settings.security.ARGON2_TIME_COST,
    memory_cost=settings.security.ARGON2_MEMORY_COST,
    parallelism=settings.security.ARGON2_PARALLELISM,
    hash_len=32,
    salt_len=16,
)


def hash_password(password: str) -> str:
    return _ph.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        _ph.verify(hashed, plain)
        return True
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def needs_rehash(hashed: str) -> bool:
    """True if the hash was produced with outdated parameters.

    Call after a successful login and silently re-hash when True,
    so users are upgraded whenever cost parameters increase.
    """
    return _ph.check_needs_rehash(hashed)
