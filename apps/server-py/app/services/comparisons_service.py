from typing import Optional

from sqlalchemy import and_, or_, select
from sqlalchemy.orm import selectinload

from app.models.comparison import Comparison
from app.schemas.comparisons import (
    ComparisonDetailResponse,
    ComparisonHistoryItem,
    ComparisonHistoryResponse,
    ComparisonProductSummary,
)
from app.utils.unitofwork import UnitOfWork

DEFAULT_PAGE_SIZE = 20


def _comparison_product_summary(product) -> Optional[ComparisonProductSummary]:
    if product is None:
        return None
    return ComparisonProductSummary(
        id=product.id,
        barcode=product.barcode,
        product_name=product.product_name,
        brands=product.brands,
        image_url=product.image_url,
    )


class ComparisonsService:
    async def get_list(
        self,
        uow: UnitOfWork,
        *,
        user_id: str,
        cursor: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> ComparisonHistoryResponse:
        take = limit or DEFAULT_PAGE_SIZE

        async with uow:
            stmt = (
                select(Comparison)
                .where(Comparison.user_id == user_id)
                .options(
                    selectinload(Comparison.product1),
                    selectinload(Comparison.product2),
                )
                .order_by(Comparison.created_at.desc(), Comparison.id.desc())
                .limit(take + 1)
            )

            if cursor:
                cursor_stmt = select(Comparison.created_at, Comparison.id).where(Comparison.id == cursor)
                cursor_row = (await uow.session.execute(cursor_stmt)).one_or_none()
                if cursor_row:
                    stmt = stmt.where(
                        or_(
                            Comparison.created_at < cursor_row.created_at,
                            and_(
                                Comparison.created_at == cursor_row.created_at,
                                Comparison.id < cursor,
                            ),
                        )
                    )

            result = await uow.session.execute(stmt)
            comparisons = list(result.scalars().all())

        has_more = len(comparisons) > take
        items = comparisons[:take]
        next_cursor = items[-1].id if has_more and items else None

        history_items = [
            ComparisonHistoryItem(
                id=c.id,
                createdAt=c.created_at.isoformat(),
                product1=_comparison_product_summary(c.product1),
                product2=_comparison_product_summary(c.product2),
            )
            for c in items
        ]

        return ComparisonHistoryResponse(items=history_items, nextCursor=next_cursor)

    async def get_comparison(
        self,
        uow: UnitOfWork,
        *,
        comparison_id: str,
        user_id: str,
    ) -> Optional[ComparisonDetailResponse]:
        async with uow:
            stmt = (
                select(Comparison)
                .where(Comparison.id == comparison_id, Comparison.user_id == user_id)
                .options(
                    selectinload(Comparison.product1),
                    selectinload(Comparison.product2),
                )
            )
            result = await uow.session.execute(stmt)
            comparison = result.scalars().one_or_none()

        if comparison is None:
            return None

        return ComparisonDetailResponse(
            id=comparison.id,
            createdAt=comparison.created_at.isoformat(),
            comparisonResult=comparison.comparison_result,
        )
