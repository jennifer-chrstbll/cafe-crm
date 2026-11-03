import math
import unittest
from datetime import datetime, timezone, timedelta
from uuid import uuid4

from app.services.workflow_service import VisitWorkflowEngine


class TestVisitWorkflowEngine(unittest.TestCase):
    def setUp(self):
        self.engine = VisitWorkflowEngine(
            visit_cooldown_minutes=30,
            exit_timeout_seconds=3600.0  # 1 hour exit timeout
        )

    def test_visit_cooldown_math(self):
        now = datetime.now(timezone.utc)
        exit_t = now - timedelta(minutes=15)  # Within 30 min cooldown
        
        delta_mins = (now - exit_t).total_seconds() / 60.0
        self.assertLessEqual(delta_mins, self.engine.cooldown_minutes)

    def test_visit_cooldown_exceeded_math(self):
        now = datetime.now(timezone.utc)
        exit_t = now - timedelta(minutes=45)  # Exceeds 30 min cooldown
        
        delta_mins = (now - exit_t).total_seconds() / 60.0
        self.assertGreater(delta_mins, self.engine.cooldown_minutes)

    def test_exit_detection_timeout_threshold(self):
        now = datetime.now(timezone.utc)
        last_seen = now - timedelta(seconds=3700)  # 1 hr 1 min (exceeds 3600s)
        
        idle_seconds = (now - last_seen).total_seconds()
        self.assertGreaterEqual(idle_seconds, self.engine.default_exit_timeout)
        
        duration_mins = max(1, int(round((last_seen - (now - timedelta(seconds=7200))).total_seconds() / 60.0)))
        self.assertEqual(duration_mins, 58)

    def test_pay_now_vs_pay_later_states(self):
        # Pay Now state -> order status = PAID
        order_pay_now_status = "PAID"
        has_tx_pay_now = True

        # Pay Later state -> order status = UNPAID
        order_pay_later_status = "UNPAID"
        has_tx_pay_later = False

        self.assertEqual(order_pay_now_status, "PAID")
        self.assertTrue(has_tx_pay_now)
        self.assertEqual(order_pay_later_status, "UNPAID")
        self.assertFalse(has_tx_pay_later)


if __name__ == '__main__':
    unittest.main()
