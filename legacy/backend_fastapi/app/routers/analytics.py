from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime, date, timedelta, timezone
from typing import Optional
from decimal import Decimal

from database import SessionLocal
from sqlalchemy import func
from sqlalchemy import cast
from sqlalchemy import Date, extract

from app.models.customer import Customer
from app.models.visit import Visit
from app.models.recognition_log import RecognitionLog
from app.models.order import Order
from app.models.menu import Menu

from app.schemas.analytics import (
    AnalyticsOverviewResponse,
    TopCustomerResponse,
    VisitTrendResponse,
    RecentVisitResponse,
    RecentRecognitionResponse
)


class DashboardSummaryResponse(BaseModel):
    total_customers: int
    today_visits: int
    recognized_today: int
    unknown_today: int
    total_orders: int
    total_revenue: Decimal


class CustomerGrowthResponse(BaseModel):
    month: str
    new_customers: int


class PeakHourResponse(BaseModel):
    hour: int
    visits: int


class ReturningRateResponse(BaseModel):
    returning: int
    new_customers: int
    returning_percent: float


class RecognitionAccuracyResponse(BaseModel):
    known: int
    unknown: int
    known_percent: float

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


@router.get("/dashboard-summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary():
    db = SessionLocal()
    try:
        today = datetime.now(timezone.utc).date()

        total_customers = (
            db.query(Customer)
            .filter(Customer.is_active == True)
            .count()
        )

        today_visits = (
            db.query(Visit)
            .filter(cast(Visit.entry_time, Date) == today)
            .count()
        )

        recognized_today = (
            db.query(RecognitionLog)
            .filter(
                cast(RecognitionLog.created_at, Date) == today,
                RecognitionLog.recognized == True
            )
            .count()
        )

        unknown_today = (
            db.query(RecognitionLog)
            .filter(
                cast(RecognitionLog.created_at, Date) == today,
                RecognitionLog.recognized == False
            )
            .count()
        )

        total_orders = db.query(Order).count()

        total_revenue = (
            db.query(func.coalesce(func.sum(Order.subtotal), 0))
            .scalar()
        ) or Decimal("0")

        return DashboardSummaryResponse(
            total_customers=total_customers,
            today_visits=today_visits,
            recognized_today=recognized_today,
            unknown_today=unknown_today,
            total_orders=total_orders,
            total_revenue=total_revenue,
        )
    finally:
        db.close()


@router.get("/customer-growth", response_model=list[CustomerGrowthResponse])
def get_customer_growth():
    """Monthly new customer count for the last 6 months."""
    db = SessionLocal()
    try:
        from sqlalchemy import text
        rows = db.execute(text("""
            SELECT
                TO_CHAR(created_at, 'YYYY-MM') AS month,
                COUNT(*) AS new_customers
            FROM customers
            WHERE created_at >= NOW() - INTERVAL '6 months'
            GROUP BY month
            ORDER BY month
        """)).fetchall()
        return [CustomerGrowthResponse(month=r[0], new_customers=r[1]) for r in rows]
    finally:
        db.close()


@router.get("/peak-hours", response_model=list[PeakHourResponse])
def get_peak_hours():
    """Visits grouped by hour of day."""
    db = SessionLocal()
    try:
        rows = (
            db.query(
                extract('hour', Visit.entry_time).label('hour'),
                func.count(Visit.visit_id).label('visits')
            )
            .group_by(extract('hour', Visit.entry_time))
            .order_by(extract('hour', Visit.entry_time))
            .all()
        )
        return [PeakHourResponse(hour=int(r.hour), visits=r.visits) for r in rows]
    finally:
        db.close()


@router.get("/returning-rate", response_model=ReturningRateResponse)
def get_returning_rate():
    """Returning vs new customers (>1 visit = returning)."""
    db = SessionLocal()
    try:
        subq = (
            db.query(
                Visit.customer_id,
                func.count(Visit.visit_id).label('visit_count')
            )
            .group_by(Visit.customer_id)
            .subquery()
        )
        total = db.query(subq).count()
        returning = db.query(subq).filter(subq.c.visit_count > 1).count()
        new_c = total - returning
        pct = round((returning / total * 100) if total > 0 else 0, 1)
        return ReturningRateResponse(returning=returning, new_customers=new_c, returning_percent=pct)
    finally:
        db.close()


@router.get("/recognition-accuracy", response_model=RecognitionAccuracyResponse)
def get_recognition_accuracy():
    """Known vs unknown recognition stats."""
    db = SessionLocal()
    try:
        total = db.query(RecognitionLog).count()
        known = db.query(RecognitionLog).filter(RecognitionLog.recognized == True).count()
        unknown = total - known
        pct = round((known / total * 100) if total > 0 else 0, 1)
        return RecognitionAccuracyResponse(known=known, unknown=unknown, known_percent=pct)
    finally:
        db.close()


class ProductAnalyticsResponse(BaseModel):
    menu_name: str
    category: str
    total_qty: int
    total_revenue: Decimal


class CustomerSegmentResponse(BaseModel):
    segment: str
    count: int


@router.get("/product-analytics", response_model=list[ProductAnalyticsResponse])
def get_product_analytics():
    """Most ordered items with total revenue."""
    db = SessionLocal()
    try:
        rows = (
            db.query(
                Menu.name.label('menu_name'),
                Menu.category.label('category'),
                func.sum(Order.qty).label('total_qty'),
                func.sum(Order.subtotal).label('total_revenue'),
            )
            .join(Menu, Menu.menu_id == Order.menu_id)
            .group_by(Menu.menu_id, Menu.name, Menu.category)
            .order_by(func.sum(Order.qty).desc())
            .all()
        )
        return [
            ProductAnalyticsResponse(
                menu_name=r.menu_name,
                category=r.category.value if hasattr(r.category, 'value') else str(r.category),
                total_qty=r.total_qty or 0,
                total_revenue=r.total_revenue or Decimal('0'),
            )
            for r in rows
        ]
    finally:
        db.close()


@router.get("/customer-segments", response_model=list[CustomerSegmentResponse])
def get_customer_segments():
    """Customer segmentation: VIP (>=15 visits), Regular (5-14), New (<5)."""
    db = SessionLocal()
    try:
        subq = (
            db.query(
                Visit.customer_id,
                func.count(Visit.visit_id).label('visit_count')
            )
            .group_by(Visit.customer_id)
            .subquery()
        )
        vip = db.query(subq).filter(subq.c.visit_count >= 15).count()
        regular = db.query(subq).filter(
            subq.c.visit_count >= 5, subq.c.visit_count < 15
        ).count()
        new_c = db.query(subq).filter(subq.c.visit_count < 5).count()

        return [
            CustomerSegmentResponse(segment="VIP", count=vip),
            CustomerSegmentResponse(segment="Regular", count=regular),
            CustomerSegmentResponse(segment="New", count=new_c),
        ]
    finally:
        db.close()