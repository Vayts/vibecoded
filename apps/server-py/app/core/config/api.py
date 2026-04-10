from app.core.config.base import BaseConfig


class APIConfig(BaseConfig):
    HOST: str = "0.0.0.0"
    PORT: int = 3000
    RELOAD: bool = False
    DEBUG: bool = False
