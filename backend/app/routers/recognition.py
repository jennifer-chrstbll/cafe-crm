from fastapi import APIRouter, UploadFile, File, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
import numpy as np
import os

from app.services.recognition_service import recognition_service
from app.schemas.recognition import RecognitionRequest, RecognitionResponse

from database import SessionLocal
from app.models.recognition_log import RecognitionLog
from app.models.customer import Customer
from app.models.order import Order
from app.models.menu import Menu
from app.models.embedding import Embedding
from app.models.visit import Visit
from sqlalchemy import func
from datetime import datetime, timezone
from uuid import uuid4

router = APIRouter(
    prefix="/recognition",
    tags=["Recognition"]
)


@router.post(
    "/search",
    response_model=RecognitionResponse
)
def search_face(request: RecognitionRequest):
    embedding = np.array(request.embedding, dtype=np.float32)
    return recognition_service.recognize_embedding(embedding)


class FavoriteItem(BaseModel):
    menu_name: str
    total_qty: int


class LiveEventResponse(BaseModel):
    log_id: str
    recognized: bool
    customer_id: Optional[str] = None
    customer_name: Optional[str] = None
    similarity_score: Optional[float] = None
    visit_count: Optional[int] = None
    segment: Optional[str] = None
    member_since: Optional[str] = None
    favorites: list[FavoriteItem] = []
    created_at: str


def _get_segment(visit_count: int) -> str:
    if visit_count >= 15:
        return "VIP"
    elif visit_count >= 5:
        return "Regular"
    return "New"


@router.get("/latest", response_model=LiveEventResponse)
def get_latest_recognition():
    """Return the single most recent recognition event with full customer context."""
    db = SessionLocal()
    try:
        log = (
            db.query(RecognitionLog)
            .order_by(RecognitionLog.created_at.desc())
            .first()
        )

        if not log:
            raise HTTPException(status_code=404, detail="No recognition events yet")

        customer_name = None
        customer_id_str = None
        visit_count = None
        segment = None
        member_since = None
        favorites = []

        if log.recognized and log.customer_id:
            customer = db.query(Customer).filter(
                Customer.customer_id == log.customer_id
            ).first()

            if customer:
                customer_name = customer.name
                customer_id_str = str(customer.customer_id)

                visit_count = (
                    db.query(Visit)
                    .filter(Visit.customer_id == customer.customer_id)
                    .count()
                )
                segment = _get_segment(visit_count)
                member_since = customer.date_of_birth  # fallback, use created_at if available

                # Top 3 favorite menu items from order history
                fav_rows = (
                    db.query(
                        Menu.name.label("menu_name"),
                        func.sum(Order.qty).label("total_qty"),
                    )
                    .join(Menu, Menu.menu_id == Order.menu_id)
                    .join(Visit, Visit.visit_id == Order.visit_id)
                    .filter(Visit.customer_id == customer.customer_id)
                    .group_by(Menu.menu_id, Menu.name)
                    .order_by(func.sum(Order.qty).desc())
                    .limit(3)
                    .all()
                )
                favorites = [
                    FavoriteItem(menu_name=r.menu_name, total_qty=r.total_qty)
                    for r in fav_rows
                ]

        return LiveEventResponse(
            log_id=str(log.log_id),
            recognized=log.recognized,
            customer_id=customer_id_str,
            customer_name=customer_name or ("Unknown" if not log.recognized else ""),
            similarity_score=log.similarity_score,
            visit_count=visit_count,
            segment=segment,
            member_since=str(member_since) if member_since else None,
            favorites=favorites,
            created_at=log.created_at.isoformat(),
        )
    finally:
        db.close()


class EnrollRequest(BaseModel):
    name: str
    phone_number: Optional[str] = None
    email: Optional[str] = None
    gender: Optional[str] = None


class EnrollResponse(BaseModel):
    customer_id: str
    name: str
    enrolled: bool
    message: str

import fastapi

@router.post("/enroll", response_model=EnrollResponse)
async def enroll_customer(request: Request):
    """
    Register a new customer and link their face embedding.
    If no photo is provided, it fetches the face currently seen by the CCTV server (cafe_facerec).
    """
    form = await request.form()
    name = form.get("name")
    if not name:
        raise HTTPException(status_code=422, detail="Name is required")
        
    phone_number = form.get("phone_number")
    email = form.get("email")
    gender = form.get("gender")
    photo = form.get("photo") if hasattr(form.get("photo"), "filename") else None
    db = SessionLocal()
    try:
        # Create customer record
        customer = Customer(
            name=name,
            phone_number=phone_number,
            email=email,
            gender=gender,
            is_active=True,
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)

        enrolled_embedding = False
        facerec_url = os.getenv("FACEREC_URL", "http://localhost:5001")

        import httpx
        
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                if photo:
                    # Fallback: Extract from uploaded photo
                    photo_bytes = await photo.read()
                    resp = await client.post(
                        f"{facerec_url}/extract-embedding",
                        files={"file": (photo.filename, photo_bytes, photo.content_type)},
                    )
                else:
                    # Magic: Grab the face currently looking at the CCTV camera
                    resp = await client.get(f"{facerec_url}/latest-embedding")
                    
                if resp.status_code == 200:
                    emb_data = resp.json()
                    embedding_vector = emb_data.get("embedding")
                    
                    if embedding_vector:
                        emb = Embedding(
                            customer_id=customer.customer_id,
                            embedding_vector=embedding_vector,
                            model_name="magface",
                            is_primary=True,
                            created_at=datetime.now(timezone.utc),
                        )
                        db.add(emb)
                        db.commit()
                        enrolled_embedding = True
                        
                        # Reload gallery so new customer is recognizable immediately
                        recognition_service.load_gallery(db)
                else:
                    error_msg = resp.json().get("detail", "FaceRec API error")
                    raise HTTPException(status_code=400, detail=f"Gagal mengambil wajah: {error_msg}")
                    
        except httpx.RequestError as e:
            print(f"[enroll] HTTP request to facerec failed: {e}")
            raise HTTPException(status_code=500, detail="Tidak dapat terhubung ke CCTV server. Pastikan api_server.py menyala.")
        except HTTPException:
            raise
        except Exception as e:
            print(f"[enroll] facerec embedding failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))

        return EnrollResponse(
            customer_id=str(customer.customer_id),
            name=customer.name,
            enrolled=enrolled_embedding,
            message=(
                "Customer berhasil didaftarkan dan wajahnya telah disimpan!"
                if enrolled_embedding
                else "Customer tersimpan tanpa wajah."
            ),
        )
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()