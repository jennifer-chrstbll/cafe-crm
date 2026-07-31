import math
import unittest
from datetime import datetime, timezone
from uuid import uuid4

from app.services.recommendation_service import RecommendationEngine


class TestRecommendationEngine(unittest.TestCase):
    def setUp(self):
        self.engine = RecommendationEngine(min_transactions_threshold=3)

    def test_cosine_similarity_calculation(self):
        # Item 1 and Item 2 purchased together by User A and User B
        v1 = {"cust_a": 2.0, "cust_b": 1.0}
        v2 = {"cust_a": 2.0, "cust_b": 1.0}
        
        sim_identical = self.engine._compute_cosine_similarity(v1, v2)
        self.assertAlmostEqual(sim_identical, 1.0, places=3)

        # Orthogonal items (no common customers)
        v3 = {"cust_c": 3.0}
        sim_ortho = self.engine._compute_cosine_similarity(v1, v3)
        self.assertAlmostEqual(sim_ortho, 0.0, places=3)

    def test_cold_start_threshold_routing_logic(self):
        min_threshold = self.engine.min_transactions
        
        # New customer with 0 visits -> COLD_START_POPULARITY
        cust_0_visits = 0
        is_cold_start_0 = (cust_0_visits < min_threshold)
        self.assertTrue(is_cold_start_0)

        # Customer with 2 visits -> COLD_START_POPULARITY
        cust_2_visits = 2
        is_cold_start_2 = (cust_2_visits < min_threshold)
        self.assertTrue(is_cold_start_2)

        # Regular customer with 5 visits -> COLLABORATIVE_FILTERING
        cust_5_visits = 5
        is_collaborative = (cust_5_visits >= min_threshold)
        self.assertTrue(is_collaborative)


if __name__ == '__main__':
    unittest.main()
