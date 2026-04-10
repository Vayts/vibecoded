import time

import httpx
import jwt
from jwt import PyJWKClient

from app.core.config import settings
from app.core.exc.base import UnauthorizedException

_APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys"
_APPLE_ISSUER = "https://appleid.apple.com"
_JWKS_TTL = 3600  # cache Apple public keys for 1 hour

_jwks_cache: dict = {"client": None, "fetched_at": 0.0}


async def _get_jwks_client() -> PyJWKClient:
    now = time.monotonic()
    if _jwks_cache["client"] and now - _jwks_cache["fetched_at"] < _JWKS_TTL:
        return _jwks_cache["client"]

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(_APPLE_JWKS_URL)
        resp.raise_for_status()
        jwks_data = resp.json()

    # PyJWKClient expects a URL or a pre-fetched JWKS dict — write to temp file approach
    # is fragile; instead we use the data directly via PyJWKSet
    from jwt import PyJWKSet

    jwks_client = PyJWKSet.from_dict(jwks_data)
    _jwks_cache["client"] = jwks_client
    _jwks_cache["fetched_at"] = now
    return jwks_client


async def verify_apple_token(token: str, *, full_name: dict | None = None) -> dict:
    """Verify an Apple ID token and return extracted claims.

    Notes:
    - email is only present on the first sign-in; subsequent logins only include sub.
    - audience must match APPLE_BUNDLE_ID.
    """
    if not settings.oauth.APPLE_BUNDLE_ID:
        raise UnauthorizedException(detail="Apple auth is not configured")

    try:
        unverified_header = jwt.get_unverified_header(token)
    except jwt.exceptions.PyJWTError as e:
        raise UnauthorizedException(detail=f"Invalid Apple token header: {e}")

    kid = unverified_header.get("kid")
    if not kid:
        raise UnauthorizedException(detail="Apple token missing key ID")

    jwks_set = await _get_jwks_client()

    try:
        signing_key = jwks_set[kid]
    except (KeyError, Exception):
        raise UnauthorizedException(detail="Apple signing key not found")

    try:
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=settings.oauth.APPLE_BUNDLE_ID,
            issuer=_APPLE_ISSUER,
        )
    except jwt.ExpiredSignatureError:
        raise UnauthorizedException(detail="Apple token has expired")
    except jwt.PyJWTError as e:
        raise UnauthorizedException(detail=f"Invalid Apple token: {e}")

    name = None
    if full_name:
        parts = [full_name.get("first"), full_name.get("last")]
        name = " ".join(p for p in parts if p) or None

    return {
        "provider_uid": payload["sub"],
        "email": payload.get("email"),
        "name": name,
    }
