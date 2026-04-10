from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.exc.base import UnauthorizedException
from app.models.user import User
from app.utils.token_service import TokenService
from app.utils.unitofwork import UnitOfWork

_bearer = HTTPBearer()

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


CurrentUserDep = Annotated[User, Depends(get_current_user)]
