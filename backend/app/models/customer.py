from datetime import date
from uuid import UUID, uuid4

from sqlalchemy import String, Text, Date
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Customer(Base):
    __tablename__ = "customers"

    customer_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4
    )

    name: Mapped[str] = mapped_column(String(100))

    phone_number: Mapped[str | None] = mapped_column(
        String(30),
        unique=True
    )

    email: Mapped[str | None] = mapped_column(String(255))

    gender: Mapped[str | None] = mapped_column(String(20))

    date_of_birth: Mapped[date | None] = mapped_column(Date)

    notes: Mapped[str | None] = mapped_column(Text)

    is_active: Mapped[bool] = mapped_column(default=True)