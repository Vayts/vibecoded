from typing import TYPE_CHECKING, Optional

from sqlalchemy import Enum as SAEnum, ForeignKey, Index, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.enums import PersonalAnalysisStatus, ScanSource, ScanType
from app.models.base import Base, CreatedAtModel, UUIDModel

if TYPE_CHECKING:
    from app.models.product import Product
    from app.models.user import User


class Scan(UUIDModel, CreatedAtModel, Base):
    __tablename__ = "scans"
    __table_args__ = (Index("ix_scans_user_created", "user_id", "created_at"),)

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type: Mapped[ScanType] = mapped_column(
        SAEnum(ScanType, name="scan_type_enum"), default=ScanType.product, nullable=False
    )
    product_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("products.id", ondelete="SET NULL"), nullable=True
    )
    product2_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("products.id", ondelete="SET NULL"), nullable=True
    )
    barcode: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    source: Mapped[ScanSource] = mapped_column(SAEnum(ScanSource, name="scan_source_enum"), nullable=False)
    overall_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    overall_rating: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    personal_analysis_status: Mapped[Optional[PersonalAnalysisStatus]] = mapped_column(
        SAEnum(PersonalAnalysisStatus, name="personal_analysis_status_enum"), nullable=True
    )
    personal_analysis_job_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    evaluation: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    personal_result: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    multi_profile_result: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    comparison_result: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    photo_image_path: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="scans")
    product: Mapped[Optional["Product"]] = relationship("Product", back_populates="scans", foreign_keys=[product_id])
    product2: Mapped[Optional["Product"]] = relationship(
        "Product", back_populates="scans_as_product2", foreign_keys=[product2_id]
    )
