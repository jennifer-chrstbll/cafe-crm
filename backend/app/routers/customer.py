from uuid import UUID

from fastapi import APIRouter
from fastapi import HTTPException

from database import SessionLocal

from app.models.customer import Customer
from app.models.visit import Visit
from app.models.order import Order
from app.models.menu import Menu
from app.models.recognition_log import RecognitionLog

from app.schemas.customer import (
    CustomerResponse,
    CustomerDetailResponse,
    CustomerVisitResponse,
    CustomerCreateRequest,
    CustomerSummaryResponse
)
from sqlalchemy import func
from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime
from typing import Optional


def get_segment(visit_count: int) -> str:
    if visit_count >= 15:
        return "VIP"
    elif visit_count >= 5:
        return "Regular"
    return "New"


router = APIRouter(
    prefix="/customers",
    tags=["Customers"]
)


@router.get(
    "",
    response_model=list[CustomerResponse]
)
def get_customers():

    db = SessionLocal()

    try:

        customers = (
            db.query(Customer)
            .filter(
                Customer.is_active == True
            )
            .order_by(
                Customer.name
            )
            .all()
        )

        return customers

    finally:

        db.close()


@router.get(
    "/{customer_id}",
    response_model=CustomerDetailResponse
)
def get_customer_detail(
    customer_id: UUID
):

    db = SessionLocal()

    try:

        customer = (
            db.query(Customer)
            .filter(
                Customer.customer_id == customer_id
            )
            .first()
        )

        if customer is None:

            raise HTTPException(
                status_code=404,
                detail="Customer not found"
            )

        visit_count = (
            db.query(Visit)
            .filter(
                Visit.customer_id == customer_id
            )
            .count()
        )

        return CustomerDetailResponse(
            customer_id=str(customer.customer_id),
            name=customer.name,
            phone_number=customer.phone_number,
            email=customer.email,
            gender=customer.gender,
            visit_count=visit_count,
            segment=get_segment(visit_count),
        )

    finally:

        db.close()


class OrderItemDetail(BaseModel):
    menu_name: str
    qty: int
    subtotal: Decimal


class CustomerOrderResponse(BaseModel):
    visit_id: str
    entry_time: datetime
    items: list[OrderItemDetail]
    total: Decimal


@router.get(
    "/{customer_id}/orders",
    response_model=list[CustomerOrderResponse]
)
def get_customer_orders(customer_id: UUID):
    db = SessionLocal()
    try:
        visits = (
            db.query(Visit)
            .filter(Visit.customer_id == customer_id)
            .order_by(Visit.entry_time.desc())
            .limit(20)
            .all()
        )

        result = []
        for visit in visits:
            orders = (
                db.query(Order, Menu)
                .join(Menu, Menu.menu_id == Order.menu_id)
                .filter(Order.visit_id == visit.visit_id)
                .all()
            )
            if not orders:
                continue
            items = [
                OrderItemDetail(
                    menu_name=menu.name,
                    qty=order.qty,
                    subtotal=order.subtotal,
                )
                for order, menu in orders
            ]
            total = sum(i.subtotal for i in items)
            result.append(CustomerOrderResponse(
                visit_id=str(visit.visit_id),
                entry_time=visit.entry_time,
                items=items,
                total=total,
            ))

        return result
    finally:
        db.close()

@router.get(
    "/{customer_id}/visits",
    response_model=list[CustomerVisitResponse]
)
def get_customer_visits(
    customer_id: UUID
):

    db = SessionLocal()

    try:

        visits = (
            db.query(Visit)
            .filter(
                Visit.customer_id == customer_id
            )
            .order_by(
                Visit.entry_time.desc()
            )
            .all()
        )

        return visits

    finally:

        db.close()

@router.post(
    "",
    response_model=CustomerResponse
)
def create_customer(
    request: CustomerCreateRequest
):

    db = SessionLocal()

    try:

        customer = Customer(
            name=request.name,
            phone_number=request.phone_number,
            email=request.email,
            gender=request.gender,
            date_of_birth=request.date_of_birth,
            notes=request.notes,
            is_active=True
        )

        db.add(customer)

        db.commit()

        db.refresh(customer)

        return customer

    finally:

        db.close()

@router.get(
    "/{customer_id}/summary",
    response_model=CustomerSummaryResponse
)
def get_customer_summary(
    customer_id: str
):

    db = SessionLocal()

    try:

        customer = (
            db.query(Customer)
            .filter(
                Customer.customer_id == customer_id
            )
            .first()
        )

        if not customer:
            raise HTTPException(
                status_code=404,
                detail="Customer not found"
            )

        visit_count = (
            db.query(Visit)
            .filter(
                Visit.customer_id ==
                customer.customer_id
            )
            .count()
        )

        recognition_count = (
            db.query(RecognitionLog)
            .filter(
                RecognitionLog.customer_id ==
                customer.customer_id
            )
            .count()
        )

        last_visit = (
            db.query(
                func.max(
                    Visit.entry_time
                )
            )
            .filter(
                Visit.customer_id ==
                customer.customer_id
            )
            .scalar()
        )

        return CustomerSummaryResponse(
            customer_id=str(
                customer.customer_id
            ),
            name=customer.name,
            visit_count=visit_count,
            recognition_count=recognition_count,
            last_visit=last_visit
        )

    finally:

        db.close()


class RecommendResponse(BaseModel):
    menu_name: str
    total_qty: int


@router.get("/{customer_id}/recommend", response_model=list[RecommendResponse])
def get_customer_recommendations(customer_id: UUID):
    """Return top 3 favorite menu items for the customer."""
    db = SessionLocal()
    try:
        fav_rows = (
            db.query(
                Menu.name.label("menu_name"),
                func.sum(Order.qty).label("total_qty"),
            )
            .join(Menu, Menu.menu_id == Order.menu_id)
            .join(Visit, Visit.visit_id == Order.visit_id)
            .filter(Visit.customer_id == customer_id)
            .group_by(Menu.menu_id, Menu.name)
            .order_by(func.sum(Order.qty).desc())
            .limit(3)
            .all()
        )
        return [
            RecommendResponse(menu_name=r.menu_name, total_qty=r.total_qty)
            for r in fav_rows
        ]
    finally:
        db.close()