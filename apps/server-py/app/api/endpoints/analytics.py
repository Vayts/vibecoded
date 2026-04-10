from typing import Any

from fastapi import APIRouter

from app.api.deps import CurrentUserDep

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.post("/event", status_code=200)
async def track_event(
    body: dict[str, Any],
    current_user: CurrentUserDep,
) -> dict:
    return {"ok": True}
