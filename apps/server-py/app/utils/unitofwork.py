from typing import Any

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exc.base import BaseHTTPException
from app.db.postgres import async_session_factory
from app.repositories import (
    ComparisonRepository,
    FamilyMemberRepository,
    FavoriteRepository,
    ProductIngredientCacheRepository,
    ProductRepository,
    ScanRepository,
    UserIdentityRepository,
    UserProfileRepository,
    UserRepository,
)


class UnitOfWork:
    session: AsyncSession
    users: UserRepository
    user_identities: UserIdentityRepository
    user_profiles: UserProfileRepository
    products: ProductRepository
    scans: ScanRepository
    comparisons: ComparisonRepository
    favorites: FavoriteRepository
    family_members: FamilyMemberRepository
    ingredient_cache: ProductIngredientCacheRepository

    def __init__(self) -> None:
        self.session_factory = async_session_factory

    async def __aenter__(self) -> "UnitOfWork":
        self.session = self.session_factory()

        self.users = UserRepository(self.session)
        self.user_identities = UserIdentityRepository(self.session)
        self.user_profiles = UserProfileRepository(self.session)
        self.products = ProductRepository(self.session)
        self.scans = ScanRepository(self.session)
        self.comparisons = ComparisonRepository(self.session)
        self.favorites = FavoriteRepository(self.session)
        self.family_members = FamilyMemberRepository(self.session)
        self.ingredient_cache = ProductIngredientCacheRepository(self.session)

        return self

    async def __aexit__(self, exc_type: Any, exc: Any, tb: Any) -> None:
        if not exc_type:
            await self.session.commit()
            await self.session.close()
            return

        if not issubclass(exc_type, BaseHTTPException):
            logger.error("Request error — rolling back. Error: {exc}", exc=exc)

        await self.session.rollback()
        await self.session.close()
        await logger.complete()
        raise exc
