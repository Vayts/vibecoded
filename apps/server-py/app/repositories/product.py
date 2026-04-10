from typing import Any

from sqlalchemy import select

from app.models.product import Product
from app.repositories.base import PaginateRepositoryMixin, SQLAlchemyRepository


class ProductRepository(PaginateRepositoryMixin[Product], SQLAlchemyRepository[Product]):
    model = Product

    async def get_by_barcode(self, barcode: str) -> Product | None:
        return await self.get_one_or_none(barcode=barcode)

    async def find_similar(self, embedding: list[float], limit: int = 10) -> list[Any]:
        """Return products ordered by cosine distance to the given embedding vector."""
        statement = (
            select(Product)
            .where(Product.embedding_vector.isnot(None))
            .order_by(Product.embedding_vector.cosine_distance(embedding))
            .limit(limit)
        )
        return await self.execute(statement=statement, action=lambda r: r.scalars().all())
