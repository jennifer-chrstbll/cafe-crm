from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import ForeignKey, Integer, DateTime, String
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Visit(Base):
    __tablename__ = "visits"

    visit_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4
    )

    customer_id: Mapped[UUID] = mapped_column(
        ForeignKey("customers.customer_id", ondelete="CASCADE")
    )

    track_id_aktif: Mapped[str | None] = mapped_column(
        String(50)
    )

    entry_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True)
    )

    exit_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )

    duration_minutes: Mapped[int | None] = mapped_column(
        Integer
    )