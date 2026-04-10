from typing import TYPE_CHECKING, Optional

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.enums import AuthProviderEnum
from app.models.base import Base, TimestampModel, UUIDModel

if TYPE_CHECKING:
    from app.models.user import User


class UserIdentity(UUIDModel, TimestampModel, Base):
    """Stores OAuth provider links and the password hash for email auth.

    Replaces BetterAuth's Account table.
    One user can have multiple identities (email + google + apple).
    """

    __tablename__ = "user_identities"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider: Mapped[AuthProviderEnum] = mapped_column(
        SAEnum(AuthProviderEnum, name="auth_provider_enum"), nullable=False
    )
    # External account ID for OAuth providers; None for email auth
    account_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    # Argon2 hash; only set for email/password accounts
    password_hash: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="identities")
