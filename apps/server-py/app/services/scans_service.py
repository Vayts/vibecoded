from typing import Optional

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import selectinload

from app.enums import ScanType
from app.models.product import Product
from app.models.scan import Scan
from app.schemas.scans import (
    ProfileChip,
    ProductSummary,
    ScanDetailResponse,
    ScanHistoryItem,
    ScanHistoryResponse,
)
from app.utils.unitofwork import UnitOfWork

DEFAULT_PAGE_SIZE = 20


def _product_summary(product: Optional[Product]) -> Optional[ProductSummary]:
    if product is None:
        return None
    return ProductSummary(
        id=product.id,
        barcode=product.barcode,
        product_name=product.product_name,
        brands=product.brands,
        image_url=product.image_url,
        nutriscore_grade=product.nutriscore_grade,
    )


def _extract_profile_chips(multi_profile_result: Optional[dict]) -> Optional[list[ProfileChip]]:
    if not multi_profile_result or not isinstance(multi_profile_result, dict):
        return None
    profiles = multi_profile_result.get("profiles")
    if not isinstance(profiles, list) or not profiles:
        return None
    chips = []
    for p in profiles:
        if not isinstance(p, dict):
            continue
        profile_id = p.get("profileId")
        name = p.get("name")
        if profile_id and name:
            chips.append(
                ProfileChip(
                    profileId=profile_id,
                    name=name,
                    score=p.get("score"),
                    fitLabel=p.get("fitLabel"),
                )
            )
    return chips or None


class ScansService:
    async def get_history(
        self,
        uow: UnitOfWork,
        *,
        user_id: str,
        cursor: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> ScanHistoryResponse:
        take = limit or DEFAULT_PAGE_SIZE

        async with uow:
            stmt = (
                select(Scan)
                .where(Scan.user_id == user_id, Scan.type == ScanType.product)
                .options(
                    selectinload(Scan.product),
                    selectinload(Scan.product2),
                )
                .order_by(Scan.created_at.desc(), Scan.id.desc())
                .limit(take + 1)
            )

            if cursor:
                cursor_stmt = select(Scan.created_at, Scan.id).where(Scan.id == cursor)
                cursor_row = (await uow.session.execute(cursor_stmt)).one_or_none()
                if cursor_row:
                    stmt = stmt.where(
                        or_(
                            Scan.created_at < cursor_row.created_at,
                            and_(
                                Scan.created_at == cursor_row.created_at,
                                Scan.id < cursor,
                            ),
                        )
                    )

            result = await uow.session.execute(stmt)
            scans = list(result.scalars().all())

            # Collect product ids and check favourites
            product_ids = [s.product.id for s in scans if s.product]
            favourite_set: set[str] = set()
            if product_ids:
                from app.models.favorite import Favorite

                fav_stmt = select(Favorite.product_id).where(
                    Favorite.user_id == user_id,
                    Favorite.product_id.in_(product_ids),
                )
                fav_result = await uow.session.execute(fav_stmt)
                favourite_set = set(fav_result.scalars().all())

        has_more = len(scans) > take
        items = scans[:take]
        next_cursor = items[-1].id if has_more and items else None

        history_items = []
        for scan in items:
            raw = scan.personal_result or {}
            profiles = raw.get("profiles", []) if isinstance(raw, dict) else []
            first = profiles[0] if profiles else {}
            personal_score = first.get("score") if isinstance(first, dict) else None
            personal_rating = first.get("fitLabel") if isinstance(first, dict) else None

            history_items.append(
                ScanHistoryItem(
                    id=scan.id,
                    type=scan.type,
                    createdAt=scan.created_at.isoformat(),
                    source=scan.source,
                    overallScore=scan.overall_score,
                    overallRating=scan.overall_rating,
                    personalScore=personal_score,
                    personalRating=personal_rating,
                    personalAnalysisStatus=scan.personal_analysis_status,
                    isFavourite=bool(scan.product and scan.product.id in favourite_set),
                    profileChips=_extract_profile_chips(scan.multi_profile_result),
                    product=_product_summary(scan.product),
                    product2=_product_summary(scan.product2),
                )
            )

        return ScanHistoryResponse(items=history_items, nextCursor=next_cursor)

    async def get_scan(
        self,
        uow: UnitOfWork,
        *,
        scan_id: str,
        user_id: str,
    ) -> Optional[ScanDetailResponse]:
        async with uow:
            stmt = (
                select(Scan)
                .where(Scan.id == scan_id, Scan.user_id == user_id)
                .options(
                    selectinload(Scan.product),
                    selectinload(Scan.product2),
                )
            )
            result = await uow.session.execute(stmt)
            scan = result.scalars().one_or_none()

            if scan is None:
                return None

            is_fav = False
            if scan.product_id:
                from app.models.favorite import Favorite

                fav_stmt = select(Favorite.id).where(
                    Favorite.user_id == user_id,
                    Favorite.product_id == scan.product_id,
                )
                fav_result = await uow.session.execute(fav_stmt)
                is_fav = fav_result.scalar_one_or_none() is not None

        # Build product data dict if available
        product_data = None
        if scan.product:
            p = scan.product
            product_data = {
                "code": p.code,
                "product_name": p.product_name,
                "brands": p.brands,
                "image_url": p.image_url,
                "ingredients_text": p.ingredients_text,
                "nutriscore_grade": p.nutriscore_grade,
                "categories": p.categories,
                "quantity": p.quantity,
                "serving_size": p.serving_size,
                "ingredients": p.ingredients,
                "allergens": p.allergens,
                "additives": p.additives,
                "additives_count": p.additives_count,
                "traces": p.traces,
                "countries": p.countries,
                "category_tags": p.category_tags,
                "images": p.images,
                "nutrition": p.nutrition,
                "scores": p.scores,
            }

        return ScanDetailResponse(
            id=scan.id,
            type=scan.type,
            analysisId=scan.personal_analysis_job_id,
            createdAt=scan.created_at.isoformat(),
            source=scan.source,
            overallScore=scan.overall_score,
            overallRating=scan.overall_rating,
            personalAnalysisStatus=scan.personal_analysis_status,
            barcode=scan.barcode,
            productId=scan.product_id,
            isFavourite=is_fav,
            product=product_data,
            analysisResult=scan.personal_result,
            comparisonResult=scan.comparison_result if scan.type == ScanType.comparison else None,
        )
