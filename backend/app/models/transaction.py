from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import ForeignKey, Numeric, String, DateTime
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Transaction(Base):
    __tablename__ = "transactions"

    transaction_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4
    )

    visit_id: Mapped[UUID] = mapped_column(
        ForeignKey("visits.visit_id", ondelete="CASCADE")
    )

    # UNPAID / PAID / CANCELLED
    status: Mapped[str] = mapped_column(String(20), default="UNPAID")

    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), default=0
    )

    payment_method: Mapped[str | None] = mapped_column(String(50))

    paid_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True)
    )
