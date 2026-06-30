from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime, timezone
from typing import Optional, List
from uuid import UUID

from database import SessionLocal
from app.models.visit import Visit
from app.models.order import Order
from app.models.menu import Menu
from app.models.customer import Customer

router = APIRouter(
    prefix="/pos",
    tags=["POS"]
)


class CartItem(BaseModel):
    menu_id: str
    qty: int


class CheckoutRequest(BaseModel):
    customer_id: str
    items: List[CartItem]


class OrderItemResponse(BaseModel):
    menu_id: str
    menu_name: str
    qty: int
    price: Decimal
    subtotal: Decimal


class CheckoutResponse(BaseModel):
    visit_id: str
    customer_name: str
    total: Decimal
    items: List[OrderItemResponse]
    created_at: datetime


@router.post("/checkout", response_model=CheckoutResponse)
def checkout(request: CheckoutRequest):
    db = SessionLocal()
    try:
        # Validate customer
        customer = db.query(Customer).filter(
            Customer.customer_id == request.customer_id,
            Customer.is_active == True
        ).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")

        if not request.items:
            raise HTTPException(status_code=400, detail="Cart is empty")

        now = datetime.now(timezone.utc)

        # Create a new Visit
        visit = Visit(
            customer_id=customer.customer_id,
            entry_time=now,
            exit_time=now,
            duration_minutes=0,
        )
        db.add(visit)
        db.flush()  # get visit_id without committing

        # Build order items
        order_items_resp = []
        total = Decimal("0")

        for cart_item in request.items:
            menu = db.query(Menu).filter(
                Menu.menu_id == cart_item.menu_id,
                Menu.is_active == True
            ).first()
            if not menu:
                raise HTTPException(status_code=404, detail=f"Menu {cart_item.menu_id} not found")

            subtotal = menu.price * cart_item.qty
            total += subtotal

            order = Order(
                visit_id=visit.visit_id,
                menu_id=menu.menu_id,
                qty=cart_item.qty,
                subtotal=subtotal,
                created_at=now,
            )
            db.add(order)

            order_items_resp.append(OrderItemResponse(
                menu_id=str(menu.menu_id),
                menu_name=menu.name,
                qty=cart_item.qty,
                price=menu.price,
                subtotal=subtotal,
            ))

        db.commit()

        return CheckoutResponse(
            visit_id=str(visit.visit_id),
            customer_name=customer.name,
            total=total,
            items=order_items_resp,
            created_at=now,
        )
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
