from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    ForeignKey,
    Boolean,
    String,
    DateTime,
)

from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from pgvector.sqlalchemy import Vector

from .base import Base


class Embedding(Base):
    __tablename__ = "embeddings"

    embedding_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4
    )

    customer_id: Mapped[UUID] = mapped_column(
        ForeignKey(
            "customers.customer_id",
            ondelete="CASCADE"
        )
    )

    embedding_vector: Mapped[list[float]] = mapped_column(
        Vector(512)
    )

    model_name: Mapped[str] = mapped_column(
        String(50)
    )

    is_primary: Mapped[bool] = mapped_column(
        Boolean,
        default=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True)
    )