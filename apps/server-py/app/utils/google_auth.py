import asyncio

from google.auth.exceptions import GoogleAuthError
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from app.core.config import settings
from app.core.exc.base import UnauthorizedException

_google_request = google_requests.Request()


async def verify_google_token(token: str) -> dict:
    """Verify a Google ID token and return extracted claims.

    Runs the blocking google-auth call in a thread pool to avoid blocking the event loop.
    """
    if not settings.oauth.GOOGLE_CLIENT_ID:
        raise UnauthorizedException(detail="Google auth is not configured")

    try:
        idinfo = await asyncio.to_thread(
            id_token.verify_oauth2_token,
            token,
            _google_request,
            settings.oauth.GOOGLE_CLIENT_ID,
        )
    except (GoogleAuthError, ValueError) as e:
        raise UnauthorizedException(detail=f"Invalid Google token: {e}")

    return {
        "provider_uid": idinfo["sub"],
        "email": idinfo.get("email"),
        "name": idinfo.get("name"),
        "avatar_url": idinfo.get("picture"),
    }
