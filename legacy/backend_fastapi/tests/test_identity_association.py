import math
import unittest
from datetime import datetime, timezone
from uuid import uuid4

from app.services.identity_association_service import IdentityAssociationEngine, association_engine


class TestIdentityAssociationEngine(unittest.TestCase):
    def test_spatial_score_calculation(self):
        engine = IdentityAssociationEngine(sigma_spatial=200.0)
        
        # Distance = 0 -> score = 1.0
        score_exact = engine.compute_spatial_score(640.0, 360.0, 640.0, 360.0)
        self.assertAlmostEqual(score_exact, 1.0, places=3)

        # Distance = 200px -> exp(-0.5) ~ 0.6065
        score_200 = engine.compute_spatial_score(840.0, 360.0, 640.0, 360.0)
        self.assertAlmostEqual(score_200, math.exp(-0.5), places=3)

    def test_kinematic_score_calculation(self):
        engine = IdentityAssociationEngine(sigma_kinematic=50.0)
        
        # Stationary person (vx=0, vy=0) -> score = 1.0
        score_stat = engine.compute_kinematic_score(0.0, 0.0)
        self.assertAlmostEqual(score_stat, 1.0, places=3)

        # Moving person (vx=50, vy=0) -> exp(-0.5) ~ 0.6065
        score_move = engine.compute_kinematic_score(50.0, 0.0)
        self.assertAlmostEqual(score_move, math.exp(-0.5), places=3)

    def test_composite_association_score_queue_ranking(self):
        engine = IdentityAssociationEngine(
            weight_spatial=0.50,
            weight_kinematic=0.30,
            weight_temporal=0.20,
            theta_assoc=0.60
        )

        # Candidate 1: At cashier (dist=20px), standing still (v=2px/s), recent (t=0.5s)
        cand1 = engine.calculate_association_score(
            track_x=650.0, track_y=370.0, vx=2.0, vy=0.0, pos_x=640.0, pos_y=360.0, delta_sec=0.5
        )

        # Candidate 2: In queue behind (dist=310px), moving (v=35px/s), older (t=2.5s)
        cand2 = engine.calculate_association_score(
            track_x=950.0, track_y=360.0, vx=35.0, vy=10.0, pos_x=640.0, pos_y=360.0, delta_sec=2.5
        )

        self.assertGreater(cand1["composite_score"], cand2["composite_score"])
        self.assertGreaterEqual(cand1["composite_score"], 0.85)
        self.assertLess(cand2["composite_score"], 0.60)

    def test_low_score_rejection(self):
        engine = IdentityAssociationEngine(theta_assoc=0.60)
        
        # Far away track (dist=600px), moving fast (v=100px/s)
        cand_far = engine.calculate_association_score(
            track_x=1240.0, track_y=960.0, vx=100.0, vy=50.0, pos_x=640.0, pos_y=360.0, delta_sec=5.0
        )
        
        self.assertLess(cand_far["composite_score"], engine.theta_assoc)


if __name__ == '__main__':
    unittest.main()
