from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

engine = create_async_engine(
    settings.postgres.DATABASE_URL,
    pool_size=settings.postgres.DB_POOL_SIZE,
    max_overflow=settings.postgres.DB_MAX_OVERFLOW,
    pool_recycle=settings.postgres.DB_POOL_RECYCLE,
    echo=settings.api.DEBUG,
)

async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


async def get_session() -> AsyncGenerator[AsyncSession]:
    async with async_session_factory() as session:
        yield session
