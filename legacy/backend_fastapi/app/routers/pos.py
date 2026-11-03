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
from app.models.transaction import Transaction
from app.models.enums import PaymentMethod

router = APIRouter(
    prefix="/pos",
    tags=["POS"]
)


# =====================================================
# Shared schemas
# =====================================================

class CartItem(BaseModel):
    menu_id: str
    qty: int


class OrderItemResponse(BaseModel):
    order_id: str
    menu_id: str
    menu_name: str
    qty: int
    price: Decimal
    subtotal: Decimal


# =====================================================
# POST /pos/order
# Buat order baru untuk seorang customer. Defaultnya UNPAID
# (transaction_id NULL) supaya bisa diedit/dibatalkan sebelum
# bayar (Fase 5). Kalau pay_now=True, order langsung dibayar
# dalam request yang sama (dipakai untuk alur "bayar sekarang"
# yang sebelumnya jadi satu-satunya alur di endpoint checkout).
#
# Kalau customer sudah punya visit yang masih terbuka (belum
# exit_time / belum keluar kafe), order baru ditambahkan ke
# visit itu juga -- bukan bikin visit baru -- supaya riwayat
# kunjungannya tidak terpecah saat customer pesan ulang.
# =====================================================

class CreateOrderRequest(BaseModel):
    customer_id: str
    items: List[CartItem]
    visit_id: Optional[str] = None
    pay_now: bool = False
    payment_method: Optional[PaymentMethod] = None


class CreateOrderResponse(BaseModel):
    visit_id: str
    customer_name: str
    status: str  # "UNPAID" or "PAID"
    transaction_id: Optional[str] = None
    total: Decimal
    items: List[OrderItemResponse]
    created_at: datetime


def _get_or_create_open_visit(db, customer: Customer, visit_id: Optional[str], now: datetime) -> Visit:
    if visit_id:
        visit = db.query(Visit).filter(
            Visit.visit_id == visit_id,
            Visit.customer_id == customer.customer_id,
        ).first()
        if not visit:
            raise HTTPException(status_code=404, detail="Visit not found for this customer")
        if visit.exit_time is not None:
            raise HTTPException(status_code=400, detail="Visit sudah selesai (customer sudah keluar)")
        return visit

    # Cari visit yang masih terbuka (belum ada exit_time) untuk customer ini
    open_visit = db.query(Visit).filter(
        Visit.customer_id == customer.customer_id,
        Visit.exit_time.is_(None),
    ).order_by(Visit.entry_time.desc()).first()

    if open_visit:
        return open_visit

    visit = Visit(
        customer_id=customer.customer_id,
        entry_time=now,
        exit_time=None,
        duration_minutes=None,
    )
    db.add(visit)
    db.flush()
    return visit


@router.post("/order", response_model=CreateOrderResponse)
def create_order(request: CreateOrderRequest):
    db = SessionLocal()
    try:
        customer = db.query(Customer).filter(
            Customer.customer_id == request.customer_id,
            Customer.is_active == True
        ).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")

        if not request.items:
            raise HTTPException(status_code=400, detail="Cart is empty")

        if request.pay_now and not request.payment_method:
            raise HTTPException(status_code=422, detail="payment_method wajib diisi kalau pay_now=True")

        now = datetime.now(timezone.utc)

        visit = _get_or_create_open_visit(db, customer, request.visit_id, now)

        transaction: Optional[Transaction] = None
        if request.pay_now:
            transaction = Transaction(
                visit_id=visit.visit_id,
                status="PAID",
                total_amount=Decimal("0"),
                payment_method=request.payment_method.value,
                paid_at=now,
                created_at=now,
            )
            db.add(transaction)
            db.flush()

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
                transaction_id=transaction.transaction_id if transaction else None,
                qty=cart_item.qty,
                subtotal=subtotal,
                created_at=now,
            )
            db.add(order)
            db.flush()

            order_items_resp.append(OrderItemResponse(
                order_id=str(order.order_id),
                menu_id=str(menu.menu_id),
                menu_name=menu.name,
                qty=cart_item.qty,
                price=menu.price,
                subtotal=subtotal,
            ))

        if transaction:
            transaction.total_amount = total

        db.commit()

        return CreateOrderResponse(
            visit_id=str(visit.visit_id),
            customer_name=customer.name,
            status="PAID" if transaction else "UNPAID",
            transaction_id=str(transaction.transaction_id) if transaction else None,
            total=total,
            items=order_items_resp,
            created_at=now,
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# =====================================================
# PATCH /pos/order/{order_id}  &  DELETE /pos/order/{order_id}
# Edit qty atau batalkan order -- hanya boleh selama order masih
# UNPAID (transaction_id IS NULL). Setelah dibayar, order terkunci;
# perubahan berikutnya harus jadi order baru (sesuai Fase 5).
# =====================================================

class UpdateOrderRequest(BaseModel):
    qty: int


@router.patch("/order/{order_id}", response_model=OrderItemResponse)
def update_order(order_id: str, request: UpdateOrderRequest):
    db = SessionLocal()
    try:
        order = db.query(Order).filter(Order.order_id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        if order.transaction_id is not None:
            raise HTTPException(status_code=400, detail="Order sudah dibayar, tidak bisa diedit")
        if request.qty <= 0:
            raise HTTPException(status_code=422, detail="qty harus lebih dari 0")

        menu = db.query(Menu).filter(Menu.menu_id == order.menu_id).first()
        if not menu:
            raise HTTPException(status_code=404, detail="Menu not found")

        order.qty = request.qty
        order.subtotal = menu.price * request.qty
        db.commit()

        return OrderItemResponse(
            order_id=str(order.order_id),
            menu_id=str(order.menu_id),
            menu_name=menu.name,
            qty=order.qty,
            price=menu.price,
            subtotal=order.subtotal,
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@router.delete("/order/{order_id}")
def cancel_order(order_id: str):
    db = SessionLocal()
    try:
        order = db.query(Order).filter(Order.order_id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        if order.transaction_id is not None:
            raise HTTPException(status_code=400, detail="Order sudah dibayar, tidak bisa dibatalkan")

        db.delete(order)
        db.commit()
        return {"cancelled": True, "order_id": order_id}
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# =====================================================
# POST /pos/checkout
# Bayar order-order yang masih UNPAID (transaction_id IS NULL)
# di sebuah visit -- ini yang dipakai saat customer "stay-in"
# lalu balik ke kasir buat bayar (identity association lewat
# track_id_aktif nge-resolve visit_id-nya di luar endpoint ini).
# Kalau order_ids tidak dikirim, semua order UNPAID di visit
# tersebut ikut dibayar.
# =====================================================

class CheckoutRequest(BaseModel):
    visit_id: str
    order_ids: Optional[List[str]] = None
    payment_method: PaymentMethod


class CheckoutResponse(BaseModel):
    transaction_id: str
    visit_id: str
    customer_name: str
    total: Decimal
    items: List[OrderItemResponse]
    paid_at: datetime


@router.post("/checkout", response_model=CheckoutResponse)
def checkout(request: CheckoutRequest):
    db = SessionLocal()
    try:
        visit = db.query(Visit).filter(Visit.visit_id == request.visit_id).first()
        if not visit:
            raise HTTPException(status_code=404, detail="Visit not found")

        customer = db.query(Customer).filter(Customer.customer_id == visit.customer_id).first()
        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")

        query = db.query(Order).filter(
            Order.visit_id == visit.visit_id,
            Order.transaction_id.is_(None),
        )
        if request.order_ids:
            query = query.filter(Order.order_id.in_(request.order_ids))

        unpaid_orders = query.all()

        if not unpaid_orders:
            raise HTTPException(status_code=400, detail="Tidak ada order UNPAID untuk dibayar pada visit ini")

        if request.order_ids and len(unpaid_orders) != len(set(request.order_ids)):
            raise HTTPException(
                status_code=400,
                detail="Sebagian order_ids tidak ditemukan, sudah dibayar, atau bukan milik visit ini"
            )

        now = datetime.now(timezone.utc)
        total = sum((o.subtotal for o in unpaid_orders), Decimal("0"))

        transaction = Transaction(
            visit_id=visit.visit_id,
            status="PAID",
            total_amount=total,
            payment_method=request.payment_method.value,
            paid_at=now,
            created_at=now,
        )
        db.add(transaction)
        db.flush()

        items_resp = []
        for order in unpaid_orders:
            order.transaction_id = transaction.transaction_id
            menu = db.query(Menu).filter(Menu.menu_id == order.menu_id).first()
            items_resp.append(OrderItemResponse(
                order_id=str(order.order_id),
                menu_id=str(order.menu_id),
                menu_name=menu.name if menu else "Unknown",
                qty=order.qty,
                price=(order.subtotal / order.qty) if order.qty else Decimal("0"),
                subtotal=order.subtotal,
            ))

        db.commit()

        return CheckoutResponse(
            transaction_id=str(transaction.transaction_id),
            visit_id=str(visit.visit_id),
            customer_name=customer.name,
            total=total,
            items=items_resp,
            paid_at=now,
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
