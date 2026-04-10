from typing import TYPE_CHECKING, Optional

from pgvector.sqlalchemy import Vector
from sqlalchemy import Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampModel, UUIDModel

if TYPE_CHECKING:
    from app.models.comparison import Comparison
    from app.models.favorite import Favorite
    from app.models.scan import Scan


class Product(UUIDModel, TimestampModel, Base):
    __tablename__ = "products"

    barcode: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(100), nullable=False)
    product_name: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    brands: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    embedding_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    embedding_vector: Mapped[Optional[list[float]]] = mapped_column(Vector(1536), nullable=True)
    ingredients_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    nutriscore_grade: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    categories: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    quantity: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    serving_size: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    ingredients: Mapped[list[str]] = mapped_column(ARRAY(String), default=list, nullable=False)
    allergens: Mapped[list[str]] = mapped_column(ARRAY(String), default=list, nullable=False)
    additives: Mapped[list[str]] = mapped_column(ARRAY(String), default=list, nullable=False)
    additives_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    traces: Mapped[list[str]] = mapped_column(ARRAY(String), default=list, nullable=False)
    countries: Mapped[list[str]] = mapped_column(ARRAY(String), default=list, nullable=False)
    category_tags: Mapped[list[str]] = mapped_column(ARRAY(String), default=list, nullable=False)
    images: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    nutrition: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    scores: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    scans: Mapped[list["Scan"]] = relationship(
        "Scan",
        back_populates="product",
        foreign_keys="Scan.product_id",
    )
    scans_as_product2: Mapped[list["Scan"]] = relationship(
        "Scan",
        back_populates="product2",
        foreign_keys="Scan.product2_id",
    )
    comparisons_as_product1: Mapped[list["Comparison"]] = relationship(
        "Comparison",
        back_populates="product1",
        foreign_keys="Comparison.product1_id",
    )
    comparisons_as_product2: Mapped[list["Comparison"]] = relationship(
        "Comparison",
        back_populates="product2",
        foreign_keys="Comparison.product2_id",
    )
    favorites: Mapped[list["Favorite"]] = relationship(
        "Favorite", back_populates="product", cascade="all, delete-orphan"
    )
