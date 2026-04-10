import re

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.services.storage import StorageNotFoundError, get_object_stream

router = APIRouter(prefix="/storage", tags=["storage"])

_SAFE_FILENAME = re.compile(r"^[\w\-]+\.\w+$")


@router.get("/products/{filename}")
async def get_product_image(filename: str) -> StreamingResponse:
    if not _SAFE_FILENAME.match(filename):
        from fastapi import HTTPException

        raise HTTPException(
            status_code=400,
            detail={"error": "Invalid filename", "code": "VALIDATION_ERROR"},
        )

    try:
        stream, content_type, size = await get_object_stream(f"products/{filename}")
    except StorageNotFoundError:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=404,
            detail={"error": "Image not found", "code": "NOT_FOUND"},
        )

    return StreamingResponse(
        stream,
        media_type=content_type,
        headers={
            "Content-Length": str(size),
            "Cache-Control": "public, max-age=31536000, immutable",
        },
    )
