from pydantic import Field

from app.core.config.base import BaseConfig


class PostgresConfig(BaseConfig):
    USER: str = Field(default="postgres", alias="DB_USER")
    PASSWORD: str = Field(default="postgres", alias="DB_PASSWORD")
    HOST: str = Field(default="localhost", alias="DB_HOST")
    PORT: str = Field(default="5432", alias="DB_PORT")
    NAME: str = Field(default="yuka", alias="DB_NAME")

    POOL_SIZE: int = 50
    MAX_OVERFLOW: int = 10
    POOL_RECYCLE: int = 1800

    @property
    def url(self) -> str:
        return f"postgresql+asyncpg://{self.USER}:{self.PASSWORD}@{self.HOST}:{self.PORT}/{self.NAME}"
