from typing import Optional

from fastapi import APIRouter, Query

from app.api.deps import CurrentUserDep, UnitOfWorkDep
from app.core.exc.base import ObjectNotFoundException
from app.schemas.scans import ScanDetailResponse, ScanHistoryResponse
from app.services.scans_service import ScansService

router = APIRouter(prefix="/scans", tags=["scans"])

_scans_service = ScansService()


@router.get("/history", response_model=ScanHistoryResponse)
async def get_scan_history(
    current_user: CurrentUserDep,
    uow: UnitOfWorkDep,
    cursor: Optional[str] = Query(None),
    limit: Optional[int] = Query(None, ge=1, le=100),
) -> ScanHistoryResponse:
    return await _scans_service.get_history(uow, user_id=current_user.id, cursor=cursor, limit=limit)


@router.get("/{scan_id}", response_model=ScanDetailResponse)
async def get_scan(
    scan_id: str,
    current_user: CurrentUserDep,
    uow: UnitOfWorkDep,
) -> ScanDetailResponse:
    scan = await _scans_service.get_scan(uow, scan_id=scan_id, user_id=current_user.id)
    if scan is None:
        raise ObjectNotFoundException("Scan not found")
    return scan
