from fastapi import APIRouter

from database import SessionLocal
from sqlalchemy import func
from sqlalchemy import cast
from sqlalchemy import Date

from app.models.customer import Customer
from app.models.visit import Visit
from app.models.recognition_log import RecognitionLog

from app.schemas.analytics import (
    AnalyticsOverviewResponse,
    TopCustomerResponse,
    VisitTrendResponse,
    RecentVisitResponse,
    RecentRecognitionResponse
)

router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"]
)


@router.get(
    "/overview",
    response_model=AnalyticsOverviewResponse
)
def get_overview():

    db = SessionLocal()

    try:

        total_customers = (
            db.query(Customer)
            .filter(
                Customer.is_active == True
            )
            .count()
        )

        total_visits = (
            db.query(Visit)
            .count()
        )

        total_recognition_logs = (
            db.query(RecognitionLog)
            .count()
        )

        return AnalyticsOverviewResponse(
            total_customers=total_customers,
            total_visits=total_visits,
            total_recognition_logs=total_recognition_logs
        )

    finally:

        db.close()

@router.get(
    "/top-customers",
    response_model=list[TopCustomerResponse]
)
def get_top_customers():

    db = SessionLocal()

    try:

        rows = (
            db.query(
                Customer.name,
                func.count(
                    Visit.visit_id
                ).label(
                    "visit_count"
                )
            )
            .join(
                Visit,
                Visit.customer_id ==
                Customer.customer_id
            )
            .group_by(
                Customer.customer_id,
                Customer.name
            )
            .order_by(
                func.count(
                    Visit.visit_id
                ).desc()
            )
            .limit(10)
            .all()
        )

        return [
            TopCustomerResponse(
                customer_name=row.name,
                visit_count=row.visit_count
            )
            for row in rows
        ]

    finally:

        db.close()

@router.get(
    "/visit-trend",
    response_model=list[VisitTrendResponse]
)
def get_visit_trend():

    db = SessionLocal()

    try:

        rows = (
            db.query(
                cast(
                    Visit.entry_time,
                    Date
                ).label(
                    "visit_date"
                ),

                func.count(
                    Visit.visit_id
                ).label(
                    "visits"
                )
            )
            .group_by(
                cast(
                    Visit.entry_time,
                    Date
                )
            )
            .order_by(
                cast(
                    Visit.entry_time,
                    Date
                )
            )
            .all()
        )

        return [
            VisitTrendResponse(
                date=str(
                    row.visit_date
                ),
                visits=row.visits
            )
            for row in rows
        ]

    finally:

        db.close()

@router.get(
    "/recent-visits",
    response_model=list[RecentVisitResponse]
)
def get_recent_visits():

    db = SessionLocal()

    try:

        rows = (
            db.query(
                Customer.name,
                Visit.entry_time
            )
            .join(
                Visit,
                Visit.customer_id ==
                Customer.customer_id
            )
            .order_by(
                Visit.entry_time.desc()
            )
            .limit(20)
            .all()
        )

        return [
            RecentVisitResponse(
                customer_name=row.name,
                entry_time=row.entry_time
            )
            for row in rows
        ]

    finally:

        db.close()

@router.get(
    "/recent-recognitions",
    response_model=list[RecentRecognitionResponse]
)
def get_recent_recognitions():

    db = SessionLocal()

    try:

        rows = (
            db.query(
                Customer.name,
                RecognitionLog.similarity_score,
                RecognitionLog.created_at
            )
            .join(
                Customer,
                Customer.customer_id ==
                RecognitionLog.customer_id
            )
            .order_by(
                RecognitionLog.created_at.desc()
            )
            .limit(20)
            .all()
        )

        return [
            RecentRecognitionResponse(
                customer_name=row.name,
                score=row.similarity_score,
                created_at=row.created_at
            )
            for row in rows
        ]

    finally:

        db.close()