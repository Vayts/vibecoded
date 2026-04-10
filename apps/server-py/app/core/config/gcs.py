from app.core.config.base import BaseConfig


class GCSConfig(BaseConfig):
    GCS_BUCKET_NAME: str = ""
    GCS_SIGNED_URL_EXPIRY_SECONDS: int = 900  # 15 min
    GOOGLE_APPLICATION_CREDENTIALS: str = ""
