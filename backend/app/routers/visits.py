from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date, timedelta, timezone

from database import SessionLocal
from sqlalchemy import cast, Date, func
from app.models.visit import Visit
from app.models.customer import Customer

router = APIRouter(
    prefix="/visits",
    tags=["Visits"]
)


class VisitResponse(BaseModel):
    visit_id: str
    customer_id: str
    customer_name: str
    entry_time: datetime
    exit_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None


@router.get("", response_model=list[VisitResponse])
def get_visits(
    filter: Optional[str] = Query(None, description="today | week | month"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    db = SessionLocal()
    try:
        query = (
            db.query(
                Visit.visit_id,
                Visit.customer_id,
                Customer.name.label("customer_name"),
                Visit.entry_time,
                Visit.exit_time,
                Visit.duration_minutes,
            )
            .join(Customer, Customer.customer_id == Visit.customer_id)
            .order_by(Visit.entry_time.desc())
        )

        now = datetime.now(timezone.utc)
        today = now.date()

        if filter == "today":
            query = query.filter(cast(Visit.entry_time, Date) == today)
        elif filter == "week":
            start = today - timedelta(days=today.weekday())
            query = query.filter(cast(Visit.entry_time, Date) >= start)
        elif filter == "month":
            start = today.replace(day=1)
            query = query.filter(cast(Visit.entry_time, Date) >= start)

        rows = query.offset(offset).limit(limit).all()

        return [
            VisitResponse(
                visit_id=str(r.visit_id),
                customer_id=str(r.customer_id),
                customer_name=r.customer_name,
                entry_time=r.entry_time,
                exit_time=r.exit_time,
                duration_minutes=r.duration_minutes,
            )
            for r in rows
        ]
    finally:
        db.close()
