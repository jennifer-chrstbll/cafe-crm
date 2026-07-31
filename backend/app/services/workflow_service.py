import math
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import List, Dict, Any, Optional
from uuid import UUID, uuid4
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.visit import Visit
from app.models.customer import Customer
from app.models.order import Order
from app.models.transaction import Transaction
from app.models.menu import Menu
from app.models.camera_track import CameraTrack
from app.models.occupancy_log import OccupancyLog


class VisitWorkflowEngine:
    """
    Fase 5 Business Logic Engine:
    - State Machine Transaksi (Pay Now vs Pay Later / Stay-in)
    - Visit Cooldown (30 Menit)
    - Visit Exit Detection (Default timeout: 1 Jam / 3600 Detik)
    """
    def __init__(self, visit_cooldown_minutes: int = 30, exit_timeout_seconds: float = 3600.0):
        self.cooldown_minutes = visit_cooldown_minutes
        self.default_exit_timeout = exit_timeout_seconds

    def get_or_create_active_visit(self, db: Session, customer_id: UUID, now: Optional[datetime] = None) -> Visit:
        """Visit Cooldown Logic (30 Mins): re-uses existing active visit if within 30 mins."""
        if now is None:
            now = datetime.now(timezone.utc)
        elif now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)

        # Look for open visit
        active_visit = (
            db.query(Visit)
            .filter(Visit.customer_id == customer_id)
            .filter(Visit.exit_time.is_(None))
            .order_by(Visit.entry_time.desc())
            .first()
        )

        if active_visit:
            return active_visit

        # Look for recent visit within cooldown window (30 minutes)
        recent_visit = (
            db.query(Visit)
            .filter(Visit.customer_id == customer_id)
            .order_by(Visit.entry_time.desc())
            .first()
        )

        if recent_visit and recent_visit.exit_time:
            ex_time = recent_visit.exit_time
            if ex_time.tzinfo is None:
                ex_time = ex_time.replace(tzinfo=timezone.utc)
            delta_mins = (now - ex_time).total_seconds() / 60.0
            if delta_mins <= self.cooldown_minutes:
                # Re-open recent visit
                recent_visit.exit_time = None
                recent_visit.duration_minutes = None
                db.commit()
                return recent_visit

        # Create new VisitSession
        new_visit = Visit(
            customer_id=customer_id,
            entry_time=now
        )
        db.add(new_visit)
        db.commit()
        db.refresh(new_visit)
        return new_visit

    def process_order(
        self,
        db: Session,
        customer_id: UUID,
        items: List[Dict[str, Any]],
        order_type: str = "pay_now",  # "pay_now" or "pay_later"
        payment_method: str = "QRIS"
    ) -> Dict[str, Any]:
        """
        Pay Now: Creates Order rows & Transaction immediately (status = PAID).
        Pay Later: Creates Order rows (transaction_id = NULL) for stay-in customer.
        Uses the same schema as pos.py (one Order row per menu item).
        """
        now = datetime.now(timezone.utc)
        visit = self.get_or_create_active_visit(db, customer_id, now)

        # Create Transaction upfront if Pay Now
        transaction: Optional[Transaction] = None
        if order_type == "pay_now":
            transaction = Transaction(
                visit_id=visit.visit_id,
                status="PAID",
                total_amount=Decimal("0"),
                payment_method=payment_method,
                paid_at=now,
                created_at=now,
            )
            db.add(transaction)
            db.flush()

        total_amount = Decimal("0")
        created_orders = []

        for item in items:
            menu_id = item.get("menu_id")
            qty = int(item.get("quantity", 1))
            menu = db.query(Menu).filter(Menu.menu_id == menu_id).first()
            if not menu:
                continue
            subtotal = menu.price * qty
            total_amount += subtotal

            new_order = Order(
                visit_id=visit.visit_id,
                menu_id=menu.menu_id,
                transaction_id=transaction.transaction_id if transaction else None,
                qty=qty,
                subtotal=subtotal,
                created_at=now,
            )
            db.add(new_order)
            db.flush()
            created_orders.append({
                "order_id": str(new_order.order_id),
                "menu_name": menu.name,
                "qty": qty,
                "subtotal": float(subtotal),
            })

        if transaction:
            transaction.total_amount = total_amount

        db.commit()

        return {
            "status": "SUCCESS",
            "order_type": order_type,
            "order_status": "PAID" if transaction else "UNPAID",
            "transaction_id": str(transaction.transaction_id) if transaction else None,
            "visit_id": str(visit.visit_id),
            "total_amount": float(total_amount),
            "items_count": len(created_orders)
        }

    def checkout_unpaid_order(
        self,
        db: Session,
        customer_id: UUID,
        payment_method: str = "QRIS"
    ) -> Dict[str, Any]:
        """Pay Later Checkout: creates a Transaction and links all UNPAID orders for the active visit."""
        now = datetime.now(timezone.utc)
        visit = (
            db.query(Visit)
            .filter(Visit.customer_id == customer_id)
            .filter(Visit.exit_time.is_(None))
            .order_by(Visit.entry_time.desc())
            .first()
        )

        if not visit:
            return {"status": "ERROR", "reason": "NO_ACTIVE_VISIT"}

        # Find all orders with no transaction (UNPAID) for this visit
        unpaid_orders = (
            db.query(Order)
            .filter(Order.visit_id == visit.visit_id)
            .filter(Order.transaction_id.is_(None))
            .all()
        )

        if not unpaid_orders:
            return {"status": "ERROR", "reason": "NO_UNPAID_ORDER"}

        total_amount = sum(o.subtotal for o in unpaid_orders)

        new_tx = Transaction(
            visit_id=visit.visit_id,
            status="PAID",
            total_amount=total_amount,
            payment_method=payment_method,
            paid_at=now,
            created_at=now,
        )
        db.add(new_tx)
        db.flush()

        for o in unpaid_orders:
            o.transaction_id = new_tx.transaction_id

        db.commit()

        return {
            "status": "SUCCESS",
            "transaction_id": str(new_tx.transaction_id),
            "total_paid": float(total_amount),
            "payment_method": payment_method,
            "orders_settled": len(unpaid_orders)
        }

    def process_visit_exits(self, db: Session, exit_timeout_sec: Optional[float] = None) -> List[Dict[str, Any]]:
        """
        Visit Exit Detection Engine:
        If a customer's active track has not been seen on any CCTV camera for > 1 hour (3600s),
        marks the visit session as exited and calculates duration_minutes.
        """
        if exit_timeout_sec is None:
            exit_timeout_sec = self.default_exit_timeout

        now = datetime.now(timezone.utc)
        open_visits = (
            db.query(Visit)
            .filter(Visit.exit_time.is_(None))
            .all()
        )

        closed_visits = []
        for visit in open_visits:
            # Query latest track timestamp for this visit
            latest_track = (
                db.query(CameraTrack)
                .filter(CameraTrack.visit_id == visit.visit_id)
                .order_by(CameraTrack.last_seen_at.desc())
                .first()
            )

            last_active = latest_track.last_seen_at if latest_track else visit.entry_time
            if last_active.tzinfo is None:
                last_active = last_active.replace(tzinfo=timezone.utc)

            idle_seconds = (now - last_active).total_seconds()
            if idle_seconds >= exit_timeout_sec:
                # Mark visit as EXITED
                visit.exit_time = last_active
                entry_t = visit.entry_time
                if entry_t.tzinfo is None:
                    entry_t = entry_t.replace(tzinfo=timezone.utc)

                duration_mins = max(1, int(round((last_active - entry_t).total_seconds() / 60.0)))
                visit.duration_minutes = duration_mins

                # Record OccupancyLog
                occ_log = OccupancyLog(
                    camera_id="SYSTEM_EXIT",
                    floor=1,
                    person_count=0,
                    recorded_at=now
                )
                db.add(occ_log)

                closed_visits.append({
                    "visit_id": str(visit.visit_id),
                    "customer_id": str(visit.customer_id),
                    "entry_time": entry_t.isoformat(),
                    "exit_time": last_active.isoformat(),
                    "duration_minutes": duration_mins,
                    "idle_seconds": idle_seconds
                })

        if closed_visits:
            db.commit()

        return closed_visits


workflow_engine = VisitWorkflowEngine()
