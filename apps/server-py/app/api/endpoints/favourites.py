from typing import Optional

from fastapi import APIRouter, Query

from app.api.deps import CurrentUserDep, UnitOfWorkDep
from app.schemas.favourites import (
    AddFavouriteRequest,
    FavouriteListResponse,
    FavouriteStatusResponse,
)
from app.services.favourites_service import FavouritesService

router = APIRouter(prefix="/favourites", tags=["favourites"])

_favourites_service = FavouritesService()


@router.get("", response_model=FavouriteListResponse)
async def get_favourites(
    current_user: CurrentUserDep,
    uow: UnitOfWorkDep,
    cursor: Optional[str] = Query(None),
    limit: Optional[int] = Query(None, ge=1, le=100),
) -> FavouriteListResponse:
    return await _favourites_service.get_list(uow, user_id=current_user.id, cursor=cursor, limit=limit)


@router.post("", status_code=200)
async def add_favourite(
    body: AddFavouriteRequest,
    current_user: CurrentUserDep,
    uow: UnitOfWorkDep,
) -> dict:
    await _favourites_service.add(uow, user_id=current_user.id, product_id=body.productId)
    return {"success": True}


@router.delete("/{product_id}", status_code=200)
async def remove_favourite(
    product_id: str,
    current_user: CurrentUserDep,
    uow: UnitOfWorkDep,
) -> dict:
    await _favourites_service.remove(uow, user_id=current_user.id, product_id=product_id)
    return {"success": True}


@router.get("/status/{product_id}", response_model=FavouriteStatusResponse)
async def favourite_status(
    product_id: str,
    current_user: CurrentUserDep,
    uow: UnitOfWorkDep,
) -> FavouriteStatusResponse:
    is_fav = await _favourites_service.is_favourite(uow, user_id=current_user.id, product_id=product_id)
    return FavouriteStatusResponse(isFavourite=is_fav)
