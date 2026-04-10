from app.core.config.base import BaseConfig


class OAuthConfig(BaseConfig):
    GOOGLE_CLIENT_ID: str = ""
    APPLE_TEAM_ID: str = ""
    APPLE_KEY_ID: str = ""
    APPLE_PRIVATE_KEY: str = ""
    APPLE_BUNDLE_ID: str = ""
