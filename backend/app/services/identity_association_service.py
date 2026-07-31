import math
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.camera_track import CameraTrack
from app.models.visit import Visit
from app.models.customer import Customer


class IdentityAssociationEngine:
    """
    Bab III.8 Identity Association Engine:
    Bridges Face Recognition (Customer ID) at Cashier POS with Person Tracking (Track ID).
    Calculates Composite Association Score:
        S_assoc = w_s * S_spatial + w_k * S_kinematic + w_t * S_temporal
    """
    def __init__(
        self,
        weight_spatial: float = 0.50,
        weight_kinematic: float = 0.30,
        weight_temporal: float = 0.20,
        sigma_spatial: float = 200.0,    # Spatial distance standard deviation (pixels)
        sigma_kinematic: float = 50.0,   # Kinematic velocity standard deviation (px/sec)
        sigma_temporal: float = 3.0,     # Temporal time delta standard deviation (seconds)
        theta_assoc: float = 0.60        # Association acceptance threshold
    ):
        self.w_s = weight_spatial
        self.w_k = weight_kinematic
        self.w_t = weight_temporal
        self.sigma_s = sigma_spatial
        self.sigma_k = sigma_kinematic
        self.sigma_t = sigma_temporal
        self.theta_assoc = theta_assoc

    def compute_spatial_score(self, track_x: float, track_y: float, pos_x: float, pos_y: float) -> float:
        """S_spatial = exp(-d_pos^2 / (2 * sigma_s^2))"""
        dist_sq = (track_x - pos_x) ** 2 + (track_y - pos_y) ** 2
        return math.exp(-dist_sq / (2.0 * (self.sigma_s ** 2)))

    def compute_kinematic_score(self, vx: float, vy: float) -> float:
        """S_kinematic = exp(-v_track^2 / (2 * sigma_k^2)) (Customer at cashier is stationary v ~ 0)"""
        v_sq = (vx ** 2) + (vy ** 2)
        return math.exp(-v_sq / (2.0 * (self.sigma_k ** 2)))

    def compute_temporal_score(self, delta_sec: float) -> float:
        """S_temporal = exp(-delta_t^2 / (2 * sigma_t^2))"""
        return math.exp(-(delta_sec ** 2) / (2.0 * (self.sigma_t ** 2)))

    def calculate_association_score(
        self,
        track_x: float,
        track_y: float,
        vx: float,
        vy: float,
        pos_x: float,
        pos_y: float,
        delta_sec: float
    ) -> Dict[str, float]:
        s_spatial = self.compute_spatial_score(track_x, track_y, pos_x, pos_y)
        s_kinematic = self.compute_kinematic_score(vx, vy)
        s_temporal = self.compute_temporal_score(delta_sec)

        composite_score = (
            self.w_s * s_spatial +
            self.w_k * s_kinematic +
            self.w_t * s_temporal
        )

        return {
            "spatial_score": round(s_spatial, 4),
            "kinematic_score": round(s_kinematic, 4),
            "temporal_score": round(s_temporal, 4),
            "composite_score": round(composite_score, 4)
        }

    def associate_identity(
        self,
        db: Session,
        customer_id: UUID,
        camera_id: str,
        pos_x: float,
        pos_y: float,
        face_timestamp: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Main Association Pipeline:
        1. Find recent candidate tracks in POS camera area
        2. Evaluate single candidate vs queue multi-candidate scoring
        3. Bind customer_id <-> track_id in database if score >= theta_assoc
        """
        if face_timestamp is None:
            face_timestamp = datetime.now(timezone.utc)
        elif face_timestamp.tzinfo is None:
            face_timestamp = face_timestamp.replace(tzinfo=timezone.utc)

        # 1. Query active / recent tracks in this camera
        candidate_tracks = (
            db.query(CameraTrack)
            .filter(CameraTrack.camera_id == camera_id)
            .filter(CameraTrack.status.in_(["ACTIVE", "LOST"]))
            .order_by(CameraTrack.last_seen_at.desc())
            .limit(20)
            .all()
        )

        if not candidate_tracks:
            return {
                "status": "UNMATCHED",
                "reason": "NO_CANDIDATE_TRACKS",
                "customer_id": str(customer_id),
                "matched_track_id": None,
                "association_score": 0.0,
                "evaluated_candidates": 0
            }

        # 2. Evaluate candidate tracks
        evaluations = []
        for track in candidate_tracks:
            tx = track.pos_x or pos_x
            ty = track.pos_y or pos_y
            vx = track.velocity_x or 0.0
            vy = track.velocity_y or 0.0

            last_seen = track.last_seen_at
            if last_seen.tzinfo is None:
                last_seen = last_seen.replace(tzinfo=timezone.utc)

            delta_t = abs((face_timestamp - last_seen).total_seconds())

            scores = self.calculate_association_score(tx, ty, vx, vy, pos_x, pos_y, delta_t)
            evaluations.append({
                "track": track,
                "scores": scores
            })

        # Sort candidates by composite_score descending
        evaluations.sort(key=lambda x: x["scores"]["composite_score"], reverse=True)
        top_eval = evaluations[0]
        top_track: CameraTrack = top_eval["track"]
        top_score = top_eval["scores"]["composite_score"]

        # 3. Decision & Database Binding
        if top_score >= self.theta_assoc:
            # Bind track in camera_tracks table
            top_track.status = "ASSOCIATED"
            top_track.association_score = top_score

            # Lookup or create active visit for customer
            visit = (
                db.query(Visit)
                .filter(Visit.customer_id == customer_id)
                .filter(Visit.exit_time.is_(None))
                .order_by(Visit.entry_time.desc())
                .first()
            )

            if not visit:
                visit = Visit(
                    customer_id=customer_id,
                    track_id_aktif=top_track.raw_track_id,
                    entry_time=face_timestamp
                )
                db.add(visit)
                db.flush()
            else:
                visit.track_id_aktif = top_track.raw_track_id

            top_track.visit_id = visit.visit_id
            db.commit()

            return {
                "status": "MATCHED",
                "customer_id": str(customer_id),
                "matched_track_id": top_track.raw_track_id,
                "visit_id": str(visit.visit_id),
                "association_score": top_score,
                "score_details": top_eval["scores"],
                "evaluated_candidates": len(evaluations)
            }
        else:
            return {
                "status": "UNMATCHED",
                "reason": "LOW_ASSOCIATION_SCORE",
                "customer_id": str(customer_id),
                "best_candidate_track_id": top_track.raw_track_id,
                "association_score": top_score,
                "score_details": top_eval["scores"],
                "evaluated_candidates": len(evaluations)
            }


association_engine = IdentityAssociationEngine()
