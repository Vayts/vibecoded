from typing import TYPE_CHECKING, Optional

from sqlalchemy import Enum as SAEnum, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.enums import Allergy, MainGoal, NutritionPriority, Restriction
from app.models.base import Base, TimestampModel, UUIDModel

if TYPE_CHECKING:
    from app.models.user import User


class FamilyMember(UUIDModel, TimestampModel, Base):
    __tablename__ = "family_members"
    __table_args__ = (Index("ix_family_members_user_id", "user_id"),)

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
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

    user: Mapped["User"] = relationship("User", back_populates="family_members")
