from fastapi import APIRouter

from app.api.deps import CurrentUserDep, UnitOfWorkDep
from app.core.exc.base import ObjectNotFoundException
from app.schemas.family_members import (
    CreateFamilyMemberRequest,
    FamilyMemberResponse,
    UpdateFamilyMemberRequest,
)
from app.services.family_members_service import FamilyMembersService

router = APIRouter(prefix="/family-members", tags=["family-members"])

_family_members_service = FamilyMembersService()


@router.get("", response_model=list[FamilyMemberResponse])
async def get_family_members(
    current_user: CurrentUserDep,
    uow: UnitOfWorkDep,
) -> list[FamilyMemberResponse]:
    return await _family_members_service.get_list(uow, user_id=current_user.id)


@router.post("", response_model=FamilyMemberResponse, status_code=201)
async def create_family_member(
    body: CreateFamilyMemberRequest,
    current_user: CurrentUserDep,
    uow: UnitOfWorkDep,
) -> FamilyMemberResponse:
    return await _family_members_service.create(uow, user_id=current_user.id, data=body)


@router.patch("/{member_id}", response_model=FamilyMemberResponse)
async def update_family_member(
    member_id: str,
    body: UpdateFamilyMemberRequest,
    current_user: CurrentUserDep,
    uow: UnitOfWorkDep,
) -> FamilyMemberResponse:
    try:
        return await _family_members_service.update(uow, user_id=current_user.id, member_id=member_id, data=body)
    except ObjectNotFoundException:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail={"error": "Family member not found", "code": "NOT_FOUND"})


@router.delete("/{member_id}", status_code=200)
async def delete_family_member(
    member_id: str,
    current_user: CurrentUserDep,
    uow: UnitOfWorkDep,
) -> dict:
    try:
        await _family_members_service.delete(uow, user_id=current_user.id, member_id=member_id)
    except ObjectNotFoundException:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail={"error": "Family member not found", "code": "NOT_FOUND"})
    return {"success": True}
