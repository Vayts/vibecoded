from typing import Annotated, Optional

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.exc.base import UnauthorizedException
from app.models.user import User
from app.utils.token_service import TokenService
from app.utils.unitofwork import UnitOfWork

_bearer = HTTPBearer()
_bearer_optional = HTTPBearer(auto_error=False)

UnitOfWorkDep = Annotated[UnitOfWork, Depends(UnitOfWork)]


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    uow: UnitOfWork = Depends(UnitOfWork),
) -> User:
    token_service = TokenService()
    payload = token_service.decode(credentials.credentials, expected_type="access")

    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedException(detail="Invalid token payload")

    async with uow:
        user = await uow.users.get_one_or_none(id=user_id)

    if user is None:
        raise UnauthorizedException(detail="User not found")

    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_optional),
    uow: UnitOfWork = Depends(UnitOfWork),
) -> Optional[User]:
    if not credentials:
        return None
    try:
        token_service = TokenService()
        payload = token_service.decode(credentials.credentials, expected_type="access")
        user_id = payload.get("sub")
        if not user_id:
            return None
        async with uow:
            return await uow.users.get_one_or_none(id=user_id)
    except Exception:
        return None


CurrentUserDep = Annotated[User, Depends(get_current_user)]
OptionalCurrentUserDep = Annotated[Optional[User], Depends(get_current_user_optional)]
