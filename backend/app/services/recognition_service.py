from sqlalchemy.orm import Session
from app.services.visit_service import VisitService
import numpy as np
import faiss

from database import SessionLocal
from app.services.log_service import LogService

from app.models.embedding import Embedding
from app.models.customer import Customer


class RecognitionService:

    def __init__(self):
        self.index = None
        self.labels = []
        self.customer_ids = []

    def load_gallery(self, db: Session):

        rows = (
            db.query(
                Embedding,
                Customer
            )
            .join(
                Customer,
                Embedding.customer_id == Customer.customer_id
            )
            .filter(
                Embedding.model_name == "arcface"
            )
            .all()
        )

        gallery = []

        self.labels = []
        self.customer_ids = []

        for emb, customer in rows:

            vec = np.array(
                emb.embedding_vector,
                dtype=np.float32
            )

            gallery.append(vec)

            self.labels.append(
                customer.name
            )

            self.customer_ids.append(
                customer.customer_id
            )

        if len(gallery) == 0:
            raise RuntimeError(
                "No embeddings found"
            )

        gallery = np.stack(
            gallery
        ).astype(np.float32)

        self.index = faiss.IndexFlatIP(
            512
        )

        self.index.add(
            gallery
        )

        print(
            f"[RecognitionService] Loaded "
            f"{self.index.ntotal} embeddings"
        )

    def recognize_embedding(
        self,
        embedding: np.ndarray,
        threshold: float = 0.35
    ):

        if self.index is None:
            raise RuntimeError(
                "Gallery not loaded"
            )

        embedding = embedding.astype(
            np.float32
        )

        D, I = self.index.search(
            embedding.reshape(1, -1),
            k=1
        )

        print("distance =", float(D[0][0]))
        print("idx =", int(I[0][0]))

        score = float(
            D[0][0]
        )

        idx = int(
            I[0][0]
        )

        if score < threshold:

            db = SessionLocal()

            try:

                LogService.create_log(
                    db=db,
                    customer_id=None,
                    score=score,
                    recognized=False
                )

            finally:

                db.close()

            return {
                "recognized": False,
                "customer_id": None,
                "customer_name": "Unknown",
                "score": score
            }

        db = SessionLocal()

        try:

            LogService.create_log(
                db=db,
                customer_id=self.customer_ids[idx],
                score=score,
                recognized=True
            )

            VisitService.create_visit(
                db=db,
                customer_id=self.customer_ids[idx]
            )

        finally:

            db.close()

        return {
            "recognized": True,
            "customer_id": str(
                self.customer_ids[idx]
            ),
            "customer_name": self.labels[idx],
            "score": score
        }


recognition_service = RecognitionService()