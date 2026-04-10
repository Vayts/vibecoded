from sqlalchemy import String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampModel, UUIDModel


class ProductIngredientCache(UUIDModel, TimestampModel, Base):
    """Caches AI ingredient analysis per product+profile combo to avoid redundant AI calls."""

    __tablename__ = "product_ingredient_cache"
    __table_args__ = (UniqueConstraint("barcode", "profile_hash", name="uq_ingredient_cache_barcode_profile"),)

    barcode: Mapped[str] = mapped_column(String(100), nullable=False)
    profile_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    result: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
