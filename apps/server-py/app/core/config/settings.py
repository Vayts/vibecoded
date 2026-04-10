from functools import lru_cache

from pydantic import BaseModel

from app.core.config.api import APIConfig
from app.core.config.gcs import GCSConfig
from app.core.config.jwt import JWTConfig
from app.core.config.langsmith import LangSmithConfig
from app.core.config.oauth import OAuthConfig
from app.core.config.openai import OpenAIConfig
from app.core.config.postgres import PostgresConfig
from app.core.config.revenuecat import RevenueCatConfig
from app.core.config.security import SecurityConfig


class Settings(BaseModel):
    api: APIConfig
    postgres: PostgresConfig
    jwt: JWTConfig
    security: SecurityConfig
    openai: OpenAIConfig
    oauth: OAuthConfig
    gcs: GCSConfig
    revenuecat: RevenueCatConfig
    langsmith: LangSmithConfig


@lru_cache
def get_settings() -> Settings:
    return Settings(
        api=APIConfig(),
        postgres=PostgresConfig(),
        jwt=JWTConfig(),
        security=SecurityConfig(),
        openai=OpenAIConfig(),
        oauth=OAuthConfig(),
        gcs=GCSConfig(),
        revenuecat=RevenueCatConfig(),
        langsmith=LangSmithConfig(),
    )


settings = get_settings()
