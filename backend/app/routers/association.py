from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from uuid import UUID
from sqlalchemy.orm import Session

from database import get_db
from app.services.identity_association_service import association_engine
from app.models.camera_track import CameraTrack

router = APIRouter(
    prefix="/association",
    tags=["Identity Association"]
)


class AssociationBindRequest(BaseModel):
    customer_id: str = Field(..., description="UUID of recognized customer")
    camera_id: str = Field(default="CAM_1", description="Camera ID at POS Cashier")
    pos_x: float = Field(default=640.0, description="Cashier POS centroid X coordinate")
    pos_y: float = Field(default=360.0, description="Cashier POS centroid Y coordinate")
    face_timestamp: Optional[datetime] = Field(default=None, description="Timestamp of face recognition")


class AssociationCandidateItem(BaseModel):
    raw_track_id: str
    camera_id: str
    pos_x: Optional[float]
    pos_y: Optional[float]
    velocity_x: Optional[float]
    velocity_y: Optional[float]
    status: str
    last_seen_at: datetime


@router.post("/bind")
def bind_identity_at_cashier(
    request: AssociationBindRequest,
    db: Session = Depends(get_db)
):
    """
    Trigger Identity Association Engine when face is recognized at cashier POS.
    Calculates composite score S_assoc and binds Customer ID <-> Track ID.
    """
    try:
        cust_uuid = UUID(request.customer_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid customer_id UUID format")

    result = association_engine.associate_identity(
        db=db,
        customer_id=cust_uuid,
        camera_id=request.camera_id,
        pos_x=request.pos_x,
        pos_y=request.pos_y,
        face_timestamp=request.face_timestamp
    )
    return result


@router.get("/candidates/{camera_id}", response_model=List[AssociationCandidateItem])
def get_active_candidates(
    camera_id: str,
    db: Session = Depends(get_db)
):
    """Retrieve active tracking candidates near cashier camera for manual confirmation GUI."""
    tracks = (
        db.query(CameraTrack)
        .filter(CameraTrack.camera_id == camera_id)
        .filter(CameraTrack.status.in_(["ACTIVE", "LOST"]))
        .order_by(CameraTrack.last_seen_at.desc())
        .limit(20)
        .all()
    )

    return [
        AssociationCandidateItem(
            raw_track_id=t.raw_track_id,
            camera_id=t.camera_id,
            pos_x=t.pos_x,
            pos_y=t.pos_y,
            velocity_x=t.velocity_x,
            velocity_y=t.velocity_y,
            status=t.status,
            last_seen_at=t.last_seen_at
        )
        for t in tracks
    ]
