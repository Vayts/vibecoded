from loguru import logger
from sqlalchemy import select

from app.core.exc.base import ObjectNotFoundException
from app.models.family_member import FamilyMember
from app.schemas.family_members import (
    CreateFamilyMemberRequest,
    FamilyMemberResponse,
    UpdateFamilyMemberRequest,
)
from app.utils.unitofwork import UnitOfWork

MAX_FAMILY_MEMBERS = 10


def _serialize(member: FamilyMember) -> FamilyMemberResponse:
    return FamilyMemberResponse(
        id=member.id,
        name=member.name,
        mainGoal=member.main_goal,
        restrictions=list(member.restrictions),
        allergies=list(member.allergies),
        otherAllergiesText=member.other_allergies_text,
        nutritionPriorities=list(member.nutrition_priorities),
        createdAt=member.created_at.isoformat(),
        updatedAt=member.updated_at.isoformat(),
    )


class FamilyMembersService:
    async def get_list(self, uow: UnitOfWork, *, user_id: str) -> list[FamilyMemberResponse]:
        async with uow:
            stmt = select(FamilyMember).where(FamilyMember.user_id == user_id).order_by(FamilyMember.created_at.asc())
            result = await uow.session.execute(stmt)
            members = result.scalars().all()
        return [_serialize(m) for m in members]

    async def create(self, uow: UnitOfWork, *, user_id: str, data: CreateFamilyMemberRequest) -> FamilyMemberResponse:
        async with uow:
            count = await uow.family_members.get_count(user_id=user_id)
            if count >= MAX_FAMILY_MEMBERS:
                from fastapi import HTTPException

                raise HTTPException(
                    status_code=400,
                    detail={
                        "error": f"You can add up to {MAX_FAMILY_MEMBERS} family members",
                        "code": "LIMIT_REACHED",
                    },
                )

            member = await uow.family_members.create(
                {
                    "user_id": user_id,
                    "name": data.name,
                    "main_goal": data.mainGoal,
                    "restrictions": data.restrictions or [],
                    "allergies": data.allergies or [],
                    "other_allergies_text": data.otherAllergiesText,
                    "nutrition_priorities": data.nutritionPriorities or [],
                }
            )

        logger.info(f"[FamilyMembers] Created member {member.id} for user {user_id}")
        return _serialize(member)

    async def update(
        self,
        uow: UnitOfWork,
        *,
        user_id: str,
        member_id: str,
        data: UpdateFamilyMemberRequest,
    ) -> FamilyMemberResponse:
        async with uow:
            existing = await uow.family_members.get_one_or_none(id=member_id, user_id=user_id)
            if existing is None:
                raise ObjectNotFoundException("Family member not found")

            update_data = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
            # Remap camelCase → snake_case for DB fields
            field_map = {
                "mainGoal": "main_goal",
                "otherAllergiesText": "other_allergies_text",
                "nutritionPriorities": "nutrition_priorities",
            }
            remapped = {field_map.get(k, k): v for k, v in update_data.items()}

            if remapped:
                updated = await uow.family_members.update(remapped, return_object=True, id=member_id, user_id=user_id)
            else:
                updated = existing

        logger.info(f"[FamilyMembers] Updated member {member_id}")
        return _serialize(updated)

    async def delete(self, uow: UnitOfWork, *, user_id: str, member_id: str) -> None:
        async with uow:
            existing = await uow.family_members.get_one_or_none(id=member_id, user_id=user_id)
            if existing is None:
                raise ObjectNotFoundException("Family member not found")

            await uow.family_members.delete(return_object=False, id=member_id, user_id=user_id)

        logger.info(f"[FamilyMembers] Deleted member {member_id}")
