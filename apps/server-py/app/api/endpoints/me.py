from fastapi import APIRouter

from app.api.deps import CurrentUserDep, UnitOfWorkDep
from app.schemas.user import (
    UpdateMeRequest,
    UpsertProfileRequest,
    UserProfileResponse,
    UserResponse,
)
from app.services.user_service import UserService

router = APIRouter(prefix="/me", tags=["me"])

_user_service = UserService()


@router.get("", response_model=UserResponse)
async def get_me(current_user: CurrentUserDep) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.patch("", response_model=UserResponse)
async def update_me(body: UpdateMeRequest, current_user: CurrentUserDep, uow: UnitOfWorkDep) -> UserResponse:
    updated = await _user_service.update_me(uow, user=current_user, data=body.model_dump(exclude_unset=True))
    return UserResponse.model_validate(updated)


@router.delete("", status_code=204)
async def delete_me(current_user: CurrentUserDep, uow: UnitOfWorkDep) -> None:
    await _user_service.delete_me(uow, user=current_user)


@router.get("/profile", response_model=UserProfileResponse | None)
async def get_profile(current_user: CurrentUserDep, uow: UnitOfWorkDep) -> UserProfileResponse | None:
    profile = await _user_service.get_profile(uow, user=current_user)
    if profile is None:
        return None
    return UserProfileResponse.model_validate(profile)


@router.put("/profile", response_model=UserProfileResponse)
async def upsert_profile(
    body: UpsertProfileRequest, current_user: CurrentUserDep, uow: UnitOfWorkDep
) -> UserProfileResponse:
    profile = await _user_service.upsert_profile(uow, user=current_user, data=body.model_dump(exclude_unset=True))
    return UserProfileResponse.model_validate(profile)
