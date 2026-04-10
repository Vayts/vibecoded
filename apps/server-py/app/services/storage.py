"""Object storage utilities for product images. Supports GCS and MinIO backends."""

import os
from typing import AsyncIterator, Optional
from uuid import uuid4

from loguru import logger

from app.core.config.settings import settings

_STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "gcs" if os.getenv("NODE_ENV") == "production" else "minio")
_BUCKET = os.getenv("GCS_BUCKET", "acme-images")
_MINIO_ENDPOINT = os.getenv("GCS_ENDPOINT", "http://localhost:9000")
_MINIO_ACCESS_KEY = os.getenv("GCS_ACCESS_KEY", "minioadmin")
_MINIO_SECRET_KEY = os.getenv("GCS_SECRET_KEY", "minioadmin123")


class StorageNotFoundError(Exception):
    pass


async def get_object_stream(object_key: str) -> tuple[AsyncIterator[bytes], str, int]:
    """Stream an object from storage. Returns (async_iterator, content_type, size)."""
    key = object_key.lstrip("/")

    if _STORAGE_BACKEND == "gcs":
        if not settings.gcs.GCS_BUCKET_NAME:
            raise StorageNotFoundError("GCS not configured")
        try:
            from google.cloud import storage as gcs_storage

            client = gcs_storage.Client()
            bucket = client.bucket(settings.gcs.GCS_BUCKET_NAME)
            blob = bucket.blob(key)
            if not blob.exists():
                raise StorageNotFoundError(f"Object not found: {key}")
            blob.reload()
            data = blob.download_as_bytes()
            content_type = blob.content_type or "image/jpeg"

            async def _iter():
                yield data

            return _iter(), content_type, len(data)
        except StorageNotFoundError:
            raise
        except Exception as exc:
            logger.error(f"[Storage] GCS stream failed for {key}: {exc}")
            raise StorageNotFoundError(str(exc))

    # MinIO backend
    try:
        from miniopy_async import Minio

        client = Minio(
            _MINIO_ENDPOINT.replace("http://", "").replace("https://", ""),
            access_key=_MINIO_ACCESS_KEY,
            secret_key=_MINIO_SECRET_KEY,
            secure=_MINIO_ENDPOINT.startswith("https://"),
        )
        stat = await client.stat_object(_BUCKET, key)
        response = await client.get_object(_BUCKET, key)
        data = await response.read()
        content_type = stat.content_type or "image/jpeg"

        async def _iter_minio():
            yield data

        return _iter_minio(), content_type, len(data)
    except Exception as exc:
        err_str = str(exc).lower()
        if "not found" in err_str or "nosuchkey" in err_str or "404" in err_str:
            raise StorageNotFoundError(f"Object not found: {key}")
        logger.error(f"[Storage] MinIO stream failed for {key}: {exc}")
        raise StorageNotFoundError(str(exc))


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
