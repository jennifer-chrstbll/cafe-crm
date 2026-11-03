from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import String, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class OccupancyLog(Base):
    __tablename__ = "occupancy_logs"

    log_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4
    )

    camera_id: Mapped[str] = mapped_column(String(50))

    person_count: Mapped[int] = mapped_column(Integer)

    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True)
    )
