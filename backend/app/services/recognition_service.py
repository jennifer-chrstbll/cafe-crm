"""
recognition_service.py
-----------------------
In-memory FAISS gallery for 1:N face recognition.

Gallery is loaded from Supabase (embeddings table) at startup via load_gallery().
Threshold τ defaults to 0.258 (ArcFace EER threshold from evaluate.py benchmark).
Override by setting FACEREC_THRESHOLD env var.
"""

from __future__ import annotations

import logging
import os

from sqlalchemy.orm import Session
import numpy as np
import faiss

from database import SessionLocal
from app.services.log_service import LogService
from app.services.visit_service import VisitService
from app.services.snapshot_service import snapshot_store
from app.models.embedding import Embedding
from app.models.customer import Customer

logger = logging.getLogger(__name__)

# Default threshold: ArcFace EER threshold from benchmark (evaluate.py)
# Override with env var FACEREC_THRESHOLD if needed
_DEFAULT_THRESHOLD = 0.258


class RecognitionService:

    def __init__(self):
        self.index        = None
        self.labels: list[str]      = []   # customer display names
        self.customer_ids: list     = []   # UUID objects from DB

    def load_gallery(self, db: Session) -> int:
        """
        Load all ArcFace embeddings from Supabase into FAISS index.
        Returns number of embeddings loaded.
        Safe to call when gallery is empty (returns 0, does NOT raise).
        """
        rows = (
            db.query(Embedding, Customer)
            .join(Customer, Embedding.customer_id == Customer.customer_id)
            .filter(Embedding.model_name == "arcface")
            .all()
        )

        if not rows:
            logger.warning(
                "[RecognitionService] No ArcFace embeddings found in DB. "
                "Gallery is empty — recognition will always return 'unknown' until "
                "customers are enrolled."
            )
            self.index        = None
            self.labels       = []
            self.customer_ids = []
            return 0

        gallery = []
        self.labels       = []
        self.customer_ids = []

        for emb, customer in rows:
            vec = np.array(emb.embedding_vector, dtype=np.float32)
            # Ensure L2-normalized
            norm = np.linalg.norm(vec)
            if norm > 1e-6:
                vec = vec / norm
            gallery.append(vec)
            self.labels.append(customer.name)
            self.customer_ids.append(customer.customer_id)

        gallery_np = np.stack(gallery).astype(np.float32)
        self.index = faiss.IndexFlatIP(512)
        self.index.add(gallery_np)

        logger.info(
            f"[RecognitionService] Loaded {self.index.ntotal} embeddings "
            f"({len(set(self.labels))} unique customers) into FAISS."
        )
        return self.index.ntotal

    def recognize_embedding(
        self,
        embedding: np.ndarray,
        threshold: float | None = None,
        snapshot_image: str | None = None,
    ) -> dict:
        """
        1:N recognition.

        Parameters
        ----------
        embedding      : 512-d float32 ArcFace embedding (L2-normalized).
        threshold      : Cosine similarity threshold τ.
                         None = use env var FACEREC_THRESHOLD or default 0.258.
        snapshot_image : Optional base64/URL snapshot frame from camera for temporary active session avatar.

        Returns
        -------
        dict:
            recognized    : bool
            customer_id   : str | None
            customer_name : str
            score         : float
            snapshot_url  : str | None
        """
        if threshold is None:
            threshold = float(os.getenv("FACEREC_THRESHOLD", str(_DEFAULT_THRESHOLD)))

        # Gallery is empty — return unknown without crashing
        if self.index is None or len(self.labels) == 0:
            logger.warning("[RecognitionService] Gallery empty — returning unknown.")
            self._log(customer_id=None, score=0.0, recognized=False)
            return {
                "recognized":    False,
                "customer_id":   None,
                "customer_name": "Unknown",
                "score":         0.0,
                "snapshot_url":  None,
            }

        embedding = np.array(embedding, dtype=np.float32)
        # Re-normalize just in case
        norm = np.linalg.norm(embedding)
        if norm > 1e-6:
            embedding = embedding / norm

        D, I = self.index.search(embedding.reshape(1, -1), k=1)
        score = float(D[0][0])
        idx   = int(I[0][0])

        logger.debug(f"[RecognitionService] score={score:.4f}  idx={idx}  τ={threshold:.4f}")

        if score < threshold:
            self._log(customer_id=None, score=score, recognized=False)
            return {
                "recognized":    False,
                "customer_id":   None,
                "customer_name": "Unknown",
                "score":         score,
                "snapshot_url":  None,
            }

        customer_id = self.customer_ids[idx]
        cust_id_str = str(customer_id)
        self._log(customer_id=customer_id, score=score, recognized=True)
        self._record_visit(customer_id=customer_id)

        # Privacy by Design: Save temporary snapshot in-memory only during active session
        if snapshot_image:
            snapshot_store.save_snapshot(customer_id=cust_id_str, image_data=snapshot_image)

        return {
            "recognized":    True,
            "customer_id":   cust_id_str,
            "customer_name": self.labels[idx],
            "score":         score,
            "snapshot_url":  f"/api/recognition/snapshot/{cust_id_str}",
        }

    def _log(self, customer_id, score: float, recognized: bool):
        db = SessionLocal()
        try:
            LogService.create_log(db=db, customer_id=customer_id, score=score, recognized=recognized)
        except Exception as e:
            logger.error(f"[RecognitionService] Failed to write recognition log: {e}")
        finally:
            db.close()

    def _record_visit(self, customer_id):
        db = SessionLocal()
        try:
            VisitService.create_visit(db=db, customer_id=customer_id)
        except Exception as e:
            logger.error(f"[RecognitionService] Failed to create visit record: {e}")
        finally:
            db.close()


recognition_service = RecognitionService()