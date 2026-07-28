from datetime import datetime
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import (
    ForeignKey,
    Integer,
    Numeric,
    Text,
    DateTime,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class Order(Base):
    __tablename__ = "orders"

    order_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4
    )

    visit_id: Mapped[UUID] = mapped_column(
        ForeignKey("visits.visit_id", ondelete="CASCADE")
    )

    transaction_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("transactions.transaction_id", ondelete="SET NULL")
    )

    menu_id: Mapped[UUID] = mapped_column(
        ForeignKey("menu.menu_id")
    )

    qty: Mapped[int] = mapped_column(Integer)

    subtotal: Mapped[Decimal] = mapped_column(
        Numeric(10, 2)
    )

    notes: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True)
    )