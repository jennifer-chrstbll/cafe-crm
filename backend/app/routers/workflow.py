from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session

from database import get_db
from app.services.workflow_service import workflow_engine

router = APIRouter(
    prefix="/workflow",
    tags=["Workflow & Transactions"]
)


class OrderItemRequest(BaseModel):
    menu_id: str
    quantity: int = Field(default=1, ge=1)


class CreateOrderRequest(BaseModel):
    customer_id: str
    order_type: str = Field(default="pay_now", description="'pay_now' or 'pay_later'")
    payment_method: str = Field(default="QRIS", description="'QRIS', 'CASH', 'CARD'")
    items: List[OrderItemRequest]


class CheckoutUnpaidRequest(BaseModel):
    customer_id: str
    payment_method: str = Field(default="QRIS")


class ExitCheckRequest(BaseModel):
    exit_timeout_seconds: Optional[float] = Field(default=3600.0, description="1 hour exit timeout (3600s)")


@router.post("/order")
def create_order_workflow(
    request: CreateOrderRequest,
    db: Session = Depends(get_db)
):
    """
    State Machine Order Creation:
    - pay_now: Creates order & transaction immediately (status = PAID).
    - pay_later: Creates order (status = UNPAID) for stay-in customer to pay before exiting.
    """
    try:
        cust_uuid = UUID(request.customer_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid customer_id UUID format")

    items_data = [{"menu_id": it.menu_id, "quantity": it.quantity} for it in request.items]
    result = workflow_engine.process_order(
        db=db,
        customer_id=cust_uuid,
        items=items_data,
        order_type=request.order_type,
        payment_method=request.payment_method
    )
    return result


@router.post("/checkout-unpaid")
def checkout_unpaid_stayin_customer(
    request: CheckoutUnpaidRequest,
    db: Session = Depends(get_db)
):
    """Pay Later Checkout: Converts UNPAID stay-in order to PAID when customer pays at cashier."""
    try:
        cust_uuid = UUID(request.customer_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid customer_id UUID format")

    result = workflow_engine.checkout_unpaid_order(
        db=db,
        customer_id=cust_uuid,
        payment_method=request.payment_method
    )
    if result.get("status") == "ERROR":
        raise HTTPException(status_code=400, detail=result.get("reason"))
    return result


@router.post("/exit-check")
def trigger_visit_exit_check(
    request: Optional[ExitCheckRequest] = None,
    db: Session = Depends(get_db)
):
    """
    Visit Exit Detection Engine:
    Checks active visits. If customer has not been seen on CCTV for > 1 hour (3600s),
    marks visit as EXITED and calculates duration_minutes.
    """
    timeout = request.exit_timeout_seconds if request else 3600.0
    closed_visits = workflow_engine.process_visit_exits(db=db, exit_timeout_sec=timeout)
    return {
        "status": "SUCCESS",
        "timeout_seconds_applied": timeout,
        "closed_visits_count": len(closed_visits),
        "closed_visits": closed_visits
    }
