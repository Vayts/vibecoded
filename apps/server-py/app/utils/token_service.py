from datetime import datetime, timedelta, timezone

import jwt

from app.core.config import settings
from app.core.exc.base import UnauthorizedException


class TokenService:
    def create_access_token(self, user_id: str) -> str:
        return self._encode(
            subject=user_id,
            token_type="access",
            expires_delta=timedelta(minutes=settings.jwt.ACCESS_TOKEN_EXPIRE_MINUTES),
        )

    def create_refresh_token(self, user_id: str) -> str:
        return self._encode(
            subject=user_id,
            token_type="refresh",
            expires_delta=timedelta(days=settings.jwt.REFRESH_TOKEN_EXPIRE_DAYS),
        )

    def decode(self, token: str, *, expected_type: str) -> dict:
        try:
            payload = jwt.decode(
                token,
                settings.jwt.JWT_SECRET,
                algorithms=[settings.jwt.JWT_ALGORITHM],
            )
        except jwt.ExpiredSignatureError:
            raise UnauthorizedException(detail="Token has expired")
        except jwt.InvalidTokenError:
            raise UnauthorizedException(detail="Invalid token")

        if payload.get("type") != expected_type:
            raise UnauthorizedException(detail="Invalid token type")

        return payload

    @staticmethod
    def _encode(subject: str, token_type: str, expires_delta: timedelta) -> str:
        expire = datetime.now(timezone.utc) + expires_delta
        payload = {"sub": subject, "exp": expire, "type": token_type}
        return jwt.encode(payload, settings.jwt.JWT_SECRET, algorithm=settings.jwt.JWT_ALGORITHM)
