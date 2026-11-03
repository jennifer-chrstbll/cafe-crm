"""
snapshot_service.py
-------------------
In-memory temporary snapshot cache for Privacy by Design (UU PDP No. 27/2022 & GDPR Art. 5).
Stores temporary face snapshots only while a customer's visit session is ACTIVE.
Automatically purges snapshots when:
1. Visit session is marked as EXITED (via VisitWorkflowEngine).
2. TTL expires (default: 60 minutes).
3. Explicit checkout / purge is requested.

No raw face photos are written permanently to disk or the customers table.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


class TemporarySnapshot:
    def __init__(self, customer_id: str, image_data: str, expires_at: datetime):
        self.customer_id = customer_id
        self.image_data = image_data  # base64 data url or image url
        self.created_at = datetime.now(timezone.utc)
        self.expires_at = expires_at

    def is_expired(self) -> bool:
        return datetime.now(timezone.utc) >= self.expires_at


class TemporarySnapshotStore:
    def __init__(self, default_ttl_minutes: int = 60):
        self.default_ttl = timedelta(minutes=default_ttl_minutes)
        self._store: Dict[str, TemporarySnapshot] = {}

    def save_snapshot(self, customer_id: str, image_data: str, ttl_minutes: Optional[int] = None) -> None:
        """Stores a temporary snapshot in-memory for active session only."""
        if not customer_id or not image_data:
            return
        ttl = timedelta(minutes=ttl_minutes) if ttl_minutes else self.default_ttl
        expires_at = datetime.now(timezone.utc) + ttl
        self._store[customer_id] = TemporarySnapshot(
            customer_id=customer_id,
            image_data=image_data,
            expires_at=expires_at
        )
        logger.info(f"[SnapshotStore] Saved temporary snapshot for customer {customer_id} (TTL: {ttl})")

    def get_snapshot(self, customer_id: str) -> Optional[str]:
        """Returns temporary snapshot if active and not expired, else None."""
        if not customer_id:
            return None
        snapshot = self._store.get(customer_id)
        if not snapshot:
            return None
        if snapshot.is_expired():
            logger.info(f"[SnapshotStore] Snapshot for customer {customer_id} expired. Purging.")
            del self._store[customer_id]
            return None
        return snapshot.image_data

    def clear_snapshot(self, customer_id: str) -> None:
        """Explicitly purges snapshot upon customer exit (Privacy by Design)."""
        if customer_id in self._store:
            del self._store[customer_id]
            logger.info(f"[SnapshotStore] Purged temporary snapshot for customer {customer_id} on exit.")

    def cleanup_expired(self) -> int:
        """Purges all expired snapshots."""
        now = datetime.now(timezone.utc)
        expired_keys = [k for k, v in self._store.items() if now >= v.expires_at]
        for k in expired_keys:
            del self._store[k]
        if expired_keys:
            logger.info(f"[SnapshotStore] Cleaned up {len(expired_keys)} expired temporary snapshots.")
        return len(expired_keys)


snapshot_store = TemporarySnapshotStore(default_ttl_minutes=60)
