from loguru import logger

from app.models.user import User
from app.models.user_profile import UserProfile
from app.utils.unitofwork import UnitOfWork


class UserService:
    async def get_me(self, user: User) -> User:
        return user

    async def update_me(self, uow: UnitOfWork, *, user: User, data: dict) -> User:
        update_data = {k: v for k, v in data.items() if v is not None}
        if not update_data:
            return user

        async with uow:
            updated = await uow.users.update(update_data, return_object=True, id=user.id)

        logger.info(f"[USER] Updated user {user.id}: {list(update_data.keys())}")
        return updated

    async def delete_me(self, uow: UnitOfWork, *, user: User) -> None:
        async with uow:
            await uow.users.delete(return_object=False, id=user.id)

        logger.info(f"[USER] Deleted user {user.id}")

    async def get_profile(self, uow: UnitOfWork, *, user: User) -> UserProfile | None:
        async with uow:
            profile = await uow.user_profiles.get_one_or_none(user_id=user.id)
        return profile

    async def upsert_profile(self, uow: UnitOfWork, *, user: User, data: dict) -> UserProfile:
        update_data = {k: v for k, v in data.items() if v is not None}

        async with uow:
            profile = await uow.user_profiles.get_one_or_none(user_id=user.id)

            if profile is None:
                profile = await uow.user_profiles.create({"user_id": user.id, **update_data})
                logger.info(f"[USER] Created profile for user {user.id}")
            else:
                if update_data:
                    profile = await uow.user_profiles.update(update_data, return_object=True, id=profile.id)
                logger.info(f"[USER] Updated profile for user {user.id}")

        return profile
