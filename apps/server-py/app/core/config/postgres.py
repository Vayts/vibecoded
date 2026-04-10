from app.core.config.base import BaseConfig


class PostgresConfig(BaseConfig):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/yuka"
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_RECYCLE: int = 1800
