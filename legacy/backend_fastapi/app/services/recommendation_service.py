import math
from typing import List, Dict, Any, Optional
from uuid import UUID
from collections import defaultdict
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.visit import Visit
from app.models.order import Order
from app.models.menu import Menu
from app.models.customer import Customer


class RecommendationEngine:
    """
    Bab III.9 Recommendation Engine:
    - Item-Based Collaborative Filtering (Cosine Similarity) for customers with >= 3 transactions.
    - Popularity-Based Fallback for Cold-Start customers (< 3 transactions / new customer).
    
    Uses actual Order schema: one row per menu_item with menu_id & qty.
    """
    def __init__(self, min_transactions_threshold: int = 3):
        self.min_transactions = min_transactions_threshold

    def _get_popularity_recommendations(self, db: Session, top_n: int = 3) -> List[Dict[str, Any]]:
        """Cold-Start Fallback: Returns top-N best-selling menu items across all cafe order history."""
        # Aggregate qty per menu_id directly from Order rows
        qty_rows = (
            db.query(Order.menu_id, func.sum(Order.qty).label("total_qty"))
            .group_by(Order.menu_id)
            .all()
        )
        item_qty_counter = {str(row.menu_id): int(row.total_qty or 0) for row in qty_rows}

        # Fetch menu details — use is_active instead of is_available
        menus = db.query(Menu).filter(Menu.is_active.is_(True)).all()
        scored_menus = []
        for m in menus:
            m_id_str = str(m.menu_id)
            total_qty = item_qty_counter.get(m_id_str, 0)
            scored_menus.append({
                "menu_id": m_id_str,
                "name": m.name,
                "category": m.category,
                "price": float(m.price),
                "score": float(total_qty),
                "reason": f"Populer di kafe (terjual {total_qty}x)"
            })

        scored_menus.sort(key=lambda x: x["score"], reverse=True)
        return scored_menus[:top_n]

    def _compute_cosine_similarity(self, vec1: Dict[str, float], vec2: Dict[str, float]) -> float:
        """Cosine similarity between two item purchase vectors."""
        common_custs = set(vec1.keys()) & set(vec2.keys())
        if not common_custs:
            return 0.0

        dot_prod = sum(vec1[c] * vec2[c] for c in common_custs)
        norm1 = math.sqrt(sum(v ** 2 for v in vec1.values()))
        norm2 = math.sqrt(sum(v ** 2 for v in vec2.values()))

        if norm1 == 0 or norm2 == 0:
            return 0.0
        return dot_prod / (norm1 * norm2)

    def _get_collaborative_recommendations(self, db: Session, customer_id: UUID, top_n: int = 3) -> List[Dict[str, Any]]:
        """Item-Based Collaborative Filtering for customer with >= 3 transactions."""
        # Build item-customer purchase matrix from actual Order rows
        # Order joins Visit to get customer_id
        all_orders = (
            db.query(Order.menu_id, Order.qty, Visit.customer_id)
            .join(Visit, Order.visit_id == Visit.visit_id)
            .all()
        )

        item_cust_matrix: Dict[str, Dict[str, float]] = defaultdict(lambda: defaultdict(float))
        cust_purchased_items: Dict[str, set] = defaultdict(set)

        for row in all_orders:
            m_id = str(row.menu_id)
            c_id = str(row.customer_id)
            qty = float(row.qty or 1)
            item_cust_matrix[m_id][c_id] += qty
            cust_purchased_items[c_id].add(m_id)

        target_cust_id_str = str(customer_id)
        target_history = cust_purchased_items.get(target_cust_id_str, set())

        if not target_history:
            return self._get_popularity_recommendations(db, top_n)

        # Compute item-item similarity matrix S(i, j)
        all_menu_ids = list(item_cust_matrix.keys())
        item_sim_matrix: Dict[str, Dict[str, float]] = defaultdict(dict)

        for i in range(len(all_menu_ids)):
            m1 = all_menu_ids[i]
            v1 = item_cust_matrix[m1]
            for j in range(i + 1, len(all_menu_ids)):
                m2 = all_menu_ids[j]
                v2 = item_cust_matrix[m2]
                sim = self._compute_cosine_similarity(dict(v1), dict(v2))
                item_sim_matrix[m1][m2] = sim
                item_sim_matrix[m2][m1] = sim

        # Predict score for candidate items not yet heavily purchased by target customer
        all_available_menus = db.query(Menu).filter(Menu.is_active.is_(True)).all()
        scored_list = []

        for menu in all_available_menus:
            m_id_str = str(menu.menu_id)
            if m_id_str in target_history:
                continue  # Skip items already ordered

            num = sum(item_sim_matrix.get(m_id_str, {}).get(h, 0.0) for h in target_history)
            den = sum(abs(item_sim_matrix.get(m_id_str, {}).get(h, 0.0)) for h in target_history)
            rec_score = (num / den) if den > 0 else 0.0

            scored_list.append({
                "menu_id": m_id_str,
                "name": menu.name,
                "category": menu.category,
                "price": float(menu.price),
                "score": round(rec_score, 3),
                "reason": "Rekomendasi personal berdasarkan riwayat favorit Anda"
            })

        scored_list.sort(key=lambda x: x["score"], reverse=True)

        if not scored_list or scored_list[0]["score"] == 0.0:
            return self._get_popularity_recommendations(db, top_n)

        return scored_list[:top_n]

    def get_recommendations(self, db: Session, customer_id: UUID, top_n: int = 3) -> Dict[str, Any]:
        """
        Main Entry Point:
        Routes to Collaborative Filtering or Cold-Start Popularity based on visit count.
        """
        visit_count = (
            db.query(Visit)
            .filter(Visit.customer_id == customer_id)
            .count()
        )

        if visit_count >= self.min_transactions:
            recs = self._get_collaborative_recommendations(db, customer_id, top_n)
            strategy = "COLLABORATIVE_FILTERING"
        else:
            recs = self._get_popularity_recommendations(db, top_n)
            strategy = "COLD_START_POPULARITY"

        return {
            "customer_id": str(customer_id),
            "strategy": strategy,
            "transaction_count": visit_count,
            "recommendations_count": len(recs),
            "recommendations": recs
        }


recommendation_engine = RecommendationEngine()
