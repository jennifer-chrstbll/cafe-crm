from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    String,
    Text,
    Enum,
    DateTime,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base
from .enums import UserRole


class User(Base):
    __tablename__ = "users"

    user_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4
    )

    name: Mapped[str] = mapped_column(String(100))

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True
    )

    password_hash: Mapped[str] = mapped_column(Text)

    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole)
    )

    last_login: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )

    is_active: Mapped[bool] = mapped_column(default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True)
    )