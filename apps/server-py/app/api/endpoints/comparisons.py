from typing import Optional

from fastapi import APIRouter, Query

from app.api.deps import CurrentUserDep, UnitOfWorkDep
from app.core.exc.base import ObjectNotFoundException
from app.schemas.comparisons import ComparisonDetailResponse, ComparisonHistoryResponse
from app.services.comparisons_service import ComparisonsService

router = APIRouter(prefix="/comparisons", tags=["comparisons"])

_comparisons_service = ComparisonsService()


@router.get("", response_model=ComparisonHistoryResponse)
async def get_comparisons(
    current_user: CurrentUserDep,
    uow: UnitOfWorkDep,
    cursor: Optional[str] = Query(None),
    limit: Optional[int] = Query(None, ge=1, le=100),
) -> ComparisonHistoryResponse:
    return await _comparisons_service.get_list(uow, user_id=current_user.id, cursor=cursor, limit=limit)


@router.get("/{comparison_id}", response_model=ComparisonDetailResponse)
async def get_comparison(
    comparison_id: str,
    current_user: CurrentUserDep,
    uow: UnitOfWorkDep,
) -> ComparisonDetailResponse:
    comparison = await _comparisons_service.get_comparison(uow, comparison_id=comparison_id, user_id=current_user.id)
    if comparison is None:
        raise ObjectNotFoundException("Comparison not found")
    return comparison
