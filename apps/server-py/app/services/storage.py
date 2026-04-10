"""Google Cloud Storage utilities for product images."""

from typing import Optional
from uuid import uuid4

from loguru import logger

from app.core.config import settings


async def upload_product_image(raw_bytes: bytes) -> Optional[str]:
    """Upload image bytes to GCS and return the public URL."""
    if not settings.gcs.GCS_BUCKET_NAME or not settings.gcs.GOOGLE_APPLICATION_CREDENTIALS:
        logger.warning("[Storage] GCS not configured — skipping image upload")
        return None

    try:
        from google.cloud import storage as gcs_storage
        from PIL import Image
        import io

        # Process image (resize to max 1024px, convert to JPEG)
        img = Image.open(io.BytesIO(raw_bytes))
        img.thumbnail((1024, 1024), Image.LANCZOS)
        output = io.BytesIO()
        img.save(output, format="JPEG", quality=85)
        output.seek(0)

        filename = f"products/{uuid4()}.jpg"
        client = gcs_storage.Client()
        bucket = client.bucket(settings.gcs.GCS_BUCKET_NAME)
        blob = bucket.blob(filename)
        blob.upload_from_file(output, content_type="image/jpeg")
        blob.make_public()

        url = f"https://storage.googleapis.com/{settings.gcs.GCS_BUCKET_NAME}/{filename}"
        logger.info(f"[Storage] Uploaded image: {url}")
        return url

    except Exception as exc:
        logger.error(f"[Storage] Upload failed: {exc}")
        return None
