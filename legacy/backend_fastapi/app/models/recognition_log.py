from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    ForeignKey,
    Float,
    Boolean,
    String,
    DateTime,
    func,
)

from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class RecognitionLog(Base):
    __tablename__ = "recognition_logs"

    log_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4
    )

    customer_id: Mapped[UUID | None] = mapped_column(
        ForeignKey(
            "customers.customer_id",
            ondelete="SET NULL"
        )
    )

    similarity_score: Mapped[float | None] = mapped_column(
        Float
    )

    model_used: Mapped[str | None] = mapped_column(
        String(50)
    )

    camera_id: Mapped[str | None] = mapped_column(
        String(50)
    )

    is_correct: Mapped[bool | None] = mapped_column(
        Boolean
    )

    recognized: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )

