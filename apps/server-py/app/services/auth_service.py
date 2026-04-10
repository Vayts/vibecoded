from loguru import logger

from app.core.exc.base import ObjectExistsException, UnauthorizedException
from app.enums import AuthProviderEnum
from app.models.user import User
from app.schemas.auth import TokenResponse
from app.utils.security import hash_password, needs_rehash, verify_password
from app.utils.token_service import TokenService
from app.utils.unitofwork import UnitOfWork


class AuthService:
    def __init__(self) -> None:
        self.token_service = TokenService()

    def _tokens(self, user_id: str) -> TokenResponse:
        return TokenResponse(
            access_token=self.token_service.create_access_token(user_id),
            refresh_token=self.token_service.create_refresh_token(user_id),
        )

    async def register(self, uow: UnitOfWork, *, email: str, password: str, name: str) -> TokenResponse:
        async with uow:
            if await uow.users.get_one_or_none(email=email):
                raise ObjectExistsException(detail=f"Email {email} is already registered")

            user: User = await uow.users.create({"email": email, "name": name, "email_verified": False})
            await uow.user_identities.create(
                {
                    "user_id": user.id,
                    "provider": AuthProviderEnum.email,
                    "account_id": email,
                    "password_hash": hash_password(password),
                }
            )

        logger.info(f"[AUTH] Registered user {email} — id: {user.id}")
        return self._tokens(user.id)

    async def login(self, uow: UnitOfWork, *, email: str, password: str) -> TokenResponse:
        async with uow:
            identity = await uow.user_identities.get_one_or_none(
                provider=AuthProviderEnum.email,
                account_id=email,
            )
            if identity is None or not identity.password_hash:
                raise UnauthorizedException(detail="Invalid credentials")

            if not verify_password(password, identity.password_hash):
                raise UnauthorizedException(detail="Invalid credentials")

            user = await uow.users.get_one(id=identity.user_id)

            if needs_rehash(identity.password_hash):
                await uow.user_identities.update({"password_hash": hash_password(password)}, id=identity.id)

        logger.info(f"[AUTH] User {email} logged in")
        return self._tokens(user.id)

    async def refresh(self, uow: UnitOfWork, *, refresh_token: str) -> TokenResponse:
        payload = self.token_service.decode(refresh_token, expected_type="refresh")
        user_id = payload["sub"]

        async with uow:
            user = await uow.users.get_one_or_none(id=user_id)

        if user is None:
            raise UnauthorizedException(detail="User not found")

        return self._tokens(user.id)

    async def google_auth(self, uow: UnitOfWork, *, id_token: str) -> TokenResponse:
        from app.utils.google_auth import verify_google_token

        claims = await verify_google_token(id_token)
        return await self._oauth_upsert(
            uow,
            provider=AuthProviderEnum.google,
            provider_uid=claims["provider_uid"],
            email=claims.get("email"),
            name=claims.get("name"),
            image=claims.get("avatar_url"),
            allow_email_merge=True,
        )

    async def apple_auth(self, uow: UnitOfWork, *, id_token: str, full_name: dict | None) -> TokenResponse:
        from app.utils.apple_auth import verify_apple_token

        claims = await verify_apple_token(id_token, full_name=full_name)
        return await self._oauth_upsert(
            uow,
            provider=AuthProviderEnum.apple,
            provider_uid=claims["provider_uid"],
            email=claims.get("email"),
            name=claims.get("name"),
            # Apple never merges by email — relay addresses change per app
            allow_email_merge=False,
        )

    async def _oauth_upsert(
        self,
        uow: UnitOfWork,
        *,
        provider: AuthProviderEnum,
        provider_uid: str,
        email: str | None,
        name: str | None = None,
        image: str | None = None,
        allow_email_merge: bool,
    ) -> TokenResponse:
        async with uow:
            # Returning user — identity already exists
            identity = await uow.user_identities.get_one_or_none(
                provider=provider,
                account_id=provider_uid,
            )
            if identity:
                user = await uow.users.get_one(id=identity.user_id)
                logger.info(f"[AUTH] {user.email} logged in via {provider}")
                return self._tokens(user.id)

            # Merge with existing email account (Google only)
            user = None
            if email and allow_email_merge:
                user = await uow.users.get_one_or_none(email=email)

            # New user
            if user is None:
                user_data: dict = {"email_verified": bool(email)}
                if email:
                    user_data["email"] = email
                if name:
                    user_data["name"] = name
                if image:
                    user_data["image"] = image
                if not user_data.get("name"):
                    user_data["name"] = (email or "").split("@")[0] or "User"
                user = await uow.users.create(user_data)
                logger.info(f"[AUTH] Registered {user.email} via {provider}")
            else:
                logger.info(f"[AUTH] Linked {provider} to existing account {user.email}")

            await uow.user_identities.create(
                {
                    "user_id": user.id,
                    "provider": provider,
                    "account_id": provider_uid,
                }
            )

        return self._tokens(user.id)
