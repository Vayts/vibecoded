from typing import Optional

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import selectinload

from app.models.favorite import Favorite
from app.models.scan import Scan
from app.enums import ScanType
from app.schemas.favourites import (
    FavouriteItem,
    FavouriteListResponse,
)
from app.schemas.scans import ProductSummary
from app.services.scans_service import _extract_profile_chips
from app.utils.unitofwork import UnitOfWork

DEFAULT_PAGE_SIZE = 20


class FavouritesService:
    async def get_list(
        self,
        uow: UnitOfWork,
        *,
        user_id: str,
        cursor: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> FavouriteListResponse:
        take = limit or DEFAULT_PAGE_SIZE

        async with uow:
            stmt = (
                select(Favorite)
                .where(Favorite.user_id == user_id)
                .options(selectinload(Favorite.product))
                .order_by(Favorite.created_at.desc(), Favorite.id.desc())
                .limit(take + 1)
            )

            if cursor:
                cursor_stmt = select(Favorite.created_at, Favorite.id).where(Favorite.id == cursor)
                cursor_row = (await uow.session.execute(cursor_stmt)).one_or_none()
                if cursor_row:
                    stmt = stmt.where(
                        or_(
                            Favorite.created_at < cursor_row.created_at,
                            and_(
                                Favorite.created_at == cursor_row.created_at,
                                Favorite.id < cursor,
                            ),
                        )
                    )

            result = await uow.session.execute(stmt)
            favourites = list(result.scalars().all())

            # Get latest scan per product for these favourites
            product_ids = [f.product.id for f in favourites if f.product]
            scan_map: dict[str, Scan] = {}
            if product_ids:
                # Subquery: latest scan id per product_id for this user
                from sqlalchemy import func

                sub = (
                    select(
                        Scan.product_id,
                        func.max(Scan.created_at).label("max_created_at"),
                    )
                    .where(
                        Scan.user_id == user_id,
                        Scan.type == ScanType.product,
                        Scan.product_id.in_(product_ids),
                    )
                    .group_by(Scan.product_id)
                    .subquery()
                )

                scans_stmt = (
                    select(Scan)
                    .join(
                        sub,
                        and_(
                            Scan.product_id == sub.c.product_id,
                            Scan.created_at == sub.c.max_created_at,
                        ),
                    )
                    .where(Scan.user_id == user_id, Scan.type == ScanType.product)
                )

                scans_result = await uow.session.execute(scans_stmt)
                for scan in scans_result.scalars().all():
                    if scan.product_id and scan.product_id not in scan_map:
                        scan_map[scan.product_id] = scan

        has_more = len(favourites) > take
        items_raw = favourites[:take]
        next_cursor = items_raw[-1].id if has_more and items_raw else None

        items = []
        for fav in items_raw:
            scan = scan_map.get(fav.product_id) if fav.product_id else None
            raw = (scan.personal_result or {}) if scan else {}
            profiles = raw.get("profiles", []) if isinstance(raw, dict) else []
            first = profiles[0] if profiles else {}
            personal_score = first.get("score") if isinstance(first, dict) else None
            personal_rating = first.get("fitLabel") if isinstance(first, dict) else None

            product_summary = None
            if fav.product:
                product_summary = ProductSummary(
                    id=fav.product.id,
                    barcode=fav.product.barcode,
                    product_name=fav.product.product_name,
                    brands=fav.product.brands,
                    image_url=fav.product.image_url,
                    nutriscore_grade=fav.product.nutriscore_grade,
                )

            items.append(
                FavouriteItem(
                    favouriteId=fav.id,
                    id=scan.id if scan else fav.id,
                    type="product",
                    createdAt=(scan.created_at if scan else fav.created_at).isoformat(),
                    source=scan.source if scan else "barcode",
                    overallScore=scan.overall_score if scan else None,
                    overallRating=scan.overall_rating if scan else None,
                    personalScore=personal_score,
                    personalRating=personal_rating,
                    personalAnalysisStatus=scan.personal_analysis_status if scan else None,
                    isFavourite=True,
                    profileChips=_extract_profile_chips(scan.multi_profile_result if scan else None),
                    product=product_summary,
                )
            )

        return FavouriteListResponse(items=items, nextCursor=next_cursor)

    async def add(self, uow: UnitOfWork, *, user_id: str, product_id: str) -> None:
        async with uow:
            existing = await uow.favorites.get_one_or_none(user_id=user_id, product_id=product_id)
            if existing is None:
                await uow.favorites.create({"user_id": user_id, "product_id": product_id})

    async def remove(self, uow: UnitOfWork, *, user_id: str, product_id: str) -> None:
        async with uow:
            await uow.favorites.delete(return_object=False, user_id=user_id, product_id=product_id)

    async def is_favourite(self, uow: UnitOfWork, *, user_id: str, product_id: str) -> bool:
        async with uow:
            existing = await uow.favorites.get_one_or_none(user_id=user_id, product_id=product_id)
        return existing is not None
