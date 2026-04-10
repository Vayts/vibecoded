from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampModel, UUIDModel

if TYPE_CHECKING:
    from app.models.comparison import Comparison
    from app.models.family_member import FamilyMember
    from app.models.favorite import Favorite
    from app.models.scan import Scan
    from app.models.user_identity import UserIdentity
    from app.models.user_profile import UserProfile


class User(UUIDModel, TimestampModel, Base):
    __tablename__ = "users"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    image: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)

    # Subscription fields (RevenueCat)
    subscription_status: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    subscription_plan: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    subscription_expiry: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    revenuecat_app_user_id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True)

    # Generation balance (free tier)
    free_generations_balance: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    last_monthly_top_up: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relations
    identities: Mapped[list["UserIdentity"]] = relationship(
        "UserIdentity", back_populates="user", cascade="all, delete-orphan"
    )
    profile: Mapped[Optional["UserProfile"]] = relationship(
        "UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    scans: Mapped[list["Scan"]] = relationship("Scan", back_populates="user", cascade="all, delete-orphan")
    comparisons: Mapped[list["Comparison"]] = relationship(
        "Comparison", back_populates="user", cascade="all, delete-orphan"
    )
    favorites: Mapped[list["Favorite"]] = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")
    family_members: Mapped[list["FamilyMember"]] = relationship(
        "FamilyMember", back_populates="user", cascade="all, delete-orphan"
    )
