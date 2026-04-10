from datetime import datetime
from typing import Annotated
from uuid import uuid4

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


# Reusable column aliases
str_pk = Annotated[str, mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))]
created_at_col = Annotated[
    datetime,
    mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False),
]
updated_at_col = Annotated[
    datetime,
    mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    ),
]


class UUIDModel(Base):
    """Abstract base with a string primary key (UUID)."""

    __abstract__ = True

    id: Mapped[str_pk]


class CreatedAtModel(Base):
    __abstract__ = True

    created_at: Mapped[created_at_col]


class UpdatedAtModel(Base):
    __abstract__ = True

    updated_at: Mapped[updated_at_col]


class TimestampModel(CreatedAtModel, UpdatedAtModel):
    __abstract__ = True
