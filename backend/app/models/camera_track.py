from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import ForeignKey, Float, String, DateTime
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class CameraTrack(Base):
    __tablename__ = "camera_tracks"

    camera_track_id: Mapped[UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid4
    )

    visit_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("visits.visit_id", ondelete="SET NULL")
    )

    camera_id: Mapped[str] = mapped_column(String(50))

    raw_track_id: Mapped[str] = mapped_column(String(50))

    pos_x: Mapped[float | None] = mapped_column(Float)
    pos_y: Mapped[float | None] = mapped_column(Float)

    velocity_x: Mapped[float | None] = mapped_column(Float)
    velocity_y: Mapped[float | None] = mapped_column(Float)

    # ACTIVE / LOST / ASSOCIATED
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")

    association_score: Mapped[float | None] = mapped_column(Float)

    first_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True)
    )

    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True)
    )
