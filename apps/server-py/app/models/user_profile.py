from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, Enum as SAEnum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.enums import Allergy, DietType, MainGoal, NutritionPriority, Restriction
from app.models.base import Base, TimestampModel, UUIDModel

if TYPE_CHECKING:
    from app.models.user import User


class UserProfile(UUIDModel, TimestampModel, Base):
    __tablename__ = "user_profiles"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )

    # Legacy single diet type (kept for backwards compat)
    legacy_diet_type: Mapped[Optional[DietType]] = mapped_column(
        SAEnum(DietType, name="diet_type_enum"), nullable=True, name="diet_type"
    )
    main_goal: Mapped[Optional[MainGoal]] = mapped_column(SAEnum(MainGoal, name="main_goal_enum"), nullable=True)
    restrictions: Mapped[list[str]] = mapped_column(
        ARRAY(SAEnum(Restriction, name="restriction_enum")), default=list, nullable=False
    )
    allergies: Mapped[list[str]] = mapped_column(
        ARRAY(SAEnum(Allergy, name="allergy_enum")), default=list, nullable=False
    )
    other_allergies_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    nutrition_priorities: Mapped[list[str]] = mapped_column(
        ARRAY(SAEnum(NutritionPriority, name="nutrition_priority_enum")),
        default=list,
        nullable=False,
    )
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="profile")
