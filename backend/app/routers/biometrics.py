"""
biometrics.py
-------------
Biometric Retention Policy & Consent Management (UU PDP No. 27/2022 & GDPR Art. 5).
Manages biometric face embeddings storage limitation, retention cleanup, and right to erasure.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from uuid import UUID
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db, SessionLocal
from app.models.embedding import Embedding
from app.models.customer import Customer
from app.models.visit import Visit
from app.services.recognition_service import recognition_service

router = APIRouter(
    prefix="/biometrics",
    tags=["Biometric Privacy & Retention"]
)


class RetentionStatusResponse(BaseModel):
    total_embeddings: int
    total_customers_with_face: int
    configured_retention_days: int
    inactive_candidates_count: int
    oldest_embedding_created_at: Optional[str] = None
    legal_basis: str = "UU PDP No. 27/2022 Pasal 35 & GDPR Art. 5(1)(e)"
    policy_description: str = "Prinsip Pembatasan Penyimpanan (Storage Limitation) Data Biometrik"


class RetentionCleanupRequest(BaseModel):
    retention_days: int = Field(default=90, ge=7, le=730, description="Masa retensi dalam hari (7 - 730 hari)")
    dry_run: bool = Field(default=False, description="Jika True, hanya menghitung tanpa menghapus")


class RetentionCleanupResponse(BaseModel):
    status: str
    retention_days_applied: int
    candidates_count: int
    deleted_embeddings_count: int
    remaining_embeddings_count: int
    reloaded_faiss_count: int
    dry_run: bool
    executed_at: str


@router.get("/retention-status", response_model=RetentionStatusResponse)
def get_retention_status(
    retention_days: int = 90,
    db: Session = Depends(get_db)
):
    """
    Returns biometric embedding retention statistics and compliance status.
    Calculates how many customer embeddings are older than the retention window without recent visits.
    """
    total_embeddings = db.query(Embedding).count()
    total_customers_with_face = (
        db.query(func.count(func.distinct(Embedding.customer_id)))
        .filter(Embedding.customer_id.isnot(None))
        .scalar() or 0
    )

    oldest_emb = db.query(Embedding).order_by(Embedding.created_at.asc()).first()
    oldest_date_str = oldest_emb.created_at.isoformat() if oldest_emb and oldest_emb.created_at else None

    # Calculate inactive embeddings candidates (no visit within retention_days)
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=retention_days)
    
    # Subquery for customers who visited after cutoff
    recent_visitors = (
        db.query(Visit.customer_id)
        .filter(Visit.entry_time >= cutoff_date)
        .distinct()
        .subquery()
    )

    # Inactive embeddings: customer has not visited since cutoff_date
    inactive_candidates = (
        db.query(Embedding)
        .filter(Embedding.customer_id.isnot(None))
        .filter(~Embedding.customer_id.in_(recent_visitors))
        .count()
    )

    return RetentionStatusResponse(
        total_embeddings=total_embeddings,
        total_customers_with_face=total_customers_with_face,
        configured_retention_days=retention_days,
        inactive_candidates_count=inactive_candidates,
        oldest_embedding_created_at=oldest_date_str,
    )


@router.post("/retention-cleanup", response_model=RetentionCleanupResponse)
def execute_retention_cleanup(
    request: RetentionCleanupRequest,
    db: Session = Depends(get_db)
):
    """
    Executes automated Biometric Retention Cleanup (UU PDP Pasal 35).
    Purges face vector embeddings for customers who have not visited the cafe within retention_days.
    Retains customer transaction/CRM history, deleting only the biometric vector.
    Automatically reloads FAISS recognition index in RAM.
    """
    now = datetime.now(timezone.utc)
    cutoff_date = now - timedelta(days=request.retention_days)

    recent_visitors = (
        db.query(Visit.customer_id)
        .filter(Visit.entry_time >= cutoff_date)
        .distinct()
        .subquery()
    )

    expired_query = (
        db.query(Embedding)
        .filter(Embedding.customer_id.isnot(None))
        .filter(~Embedding.customer_id.in_(recent_visitors))
    )

    candidates_count = expired_query.count()
    deleted_count = 0

    if not request.dry_run and candidates_count > 0:
        deleted_count = expired_query.delete(synchronize_session=False)
        db.commit()

        # Reload FAISS Gallery into RAM
        reloaded_count = recognition_service.load_gallery(db)
    else:
        reloaded_count = recognition_service.index.ntotal if recognition_service.index else 0

    remaining_count = db.query(Embedding).count()

    return RetentionCleanupResponse(
        status="SUCCESS",
        retention_days_applied=request.retention_days,
        candidates_count=candidates_count,
        deleted_embeddings_count=deleted_count,
        remaining_embeddings_count=remaining_count,
        reloaded_faiss_count=reloaded_count,
        dry_run=request.dry_run,
        executed_at=now.isoformat()
    )


@router.delete("/customer-embedding/{customer_id}")
def delete_single_customer_embedding(
    customer_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Right to Erasure (Hak Penarikan Persetujuan UU PDP Pasal 8).
    Deletes the biometric face embedding of a specific customer upon request.
    """
    customer = db.query(Customer).filter(Customer.customer_id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer tidak ditemukan")

    deleted = db.query(Embedding).filter(Embedding.customer_id == customer_id).delete()
    customer.consent_given = False
    db.commit()

    reloaded_count = recognition_service.load_gallery(db)

    return {
        "status": "SUCCESS",
        "customer_id": str(customer_id),
        "customer_name": customer.name,
        "deleted_embeddings": deleted,
        "reloaded_faiss_count": reloaded_count,
        "message": "Data biometrik wajah berhasil dihapus sesuai hak privasi pelanggan (UU PDP)."
    }
