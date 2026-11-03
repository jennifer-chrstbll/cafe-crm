from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from database import SessionLocal
from app.models.recognition_log import RecognitionLog
from app.models.customer import Customer

router = APIRouter(
    prefix="/recognition-logs",
    tags=["Recognition Logs"]
)


class RecognitionLogResponse(BaseModel):
    log_id: str
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    similarity_score: Optional[float] = None
    recognized: bool
    camera_id: Optional[str] = None
    model_used: Optional[str] = None
    created_at: datetime


@router.get("", response_model=list[RecognitionLogResponse])
def get_recognition_logs(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    recognized: Optional[bool] = Query(None),
):
    db = SessionLocal()
    try:
        query = (
            db.query(
                RecognitionLog.log_id,
                RecognitionLog.customer_id,
                Customer.name.label("customer_name"),
                RecognitionLog.similarity_score,
                RecognitionLog.recognized,
                RecognitionLog.camera_id,
                RecognitionLog.model_used,
                RecognitionLog.created_at,
            )
            .outerjoin(
                Customer,
                Customer.customer_id == RecognitionLog.customer_id
            )
            .order_by(RecognitionLog.created_at.desc())
        )

        if recognized is not None:
            query = query.filter(RecognitionLog.recognized == recognized)

        rows = query.offset(offset).limit(limit).all()

        return [
            RecognitionLogResponse(
                log_id=str(r.log_id),
                customer_id=str(r.customer_id) if r.customer_id else None,
                customer_name=r.customer_name,
                similarity_score=r.similarity_score,
                recognized=r.recognized,
                camera_id=r.camera_id,
                model_used=r.model_used,
                created_at=r.created_at,
            )
            for r in rows
        ]
    finally:
        db.close()
