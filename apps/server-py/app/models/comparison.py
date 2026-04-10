from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, CreatedAtModel, UUIDModel

if TYPE_CHECKING:
    from app.models.product import Product
    from app.models.user import User


class Comparison(UUIDModel, CreatedAtModel, Base):
    __tablename__ = "comparisons"
    __table_args__ = (Index("ix_comparisons_user_created", "user_id", "created_at"),)

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product1_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("products.id", ondelete="SET NULL"), nullable=True
    )
    product2_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("products.id", ondelete="SET NULL"), nullable=True
    )
    barcode1: Mapped[str] = mapped_column(String(100), nullable=False)
    barcode2: Mapped[str] = mapped_column(String(100), nullable=False)
    comparison_result: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    user: Mapped["User"] = relationship("User", back_populates="comparisons")
    product1: Mapped[Optional["Product"]] = relationship(
        "Product",
        back_populates="comparisons_as_product1",
        foreign_keys=[product1_id],
    )
    product2: Mapped[Optional["Product"]] = relationship(
        "Product",
        back_populates="comparisons_as_product2",
        foreign_keys=[product2_id],
    )
