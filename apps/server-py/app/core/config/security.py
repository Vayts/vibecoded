from app.core.config.base import BaseConfig


class SecurityConfig(BaseConfig):
    ARGON2_TIME_COST: int = 2
    ARGON2_MEMORY_COST: int = 65536
    ARGON2_PARALLELISM: int = 2
