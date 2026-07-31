from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session

from database import get_db
from app.services.recommendation_service import recommendation_engine
from app.models.customer import Customer

router = APIRouter(
    prefix="/recommendation",
    tags=["Personalized Recommendation"]
)


class RecommendationItemResponse(BaseModel):
    menu_id: str
    name: str
    category: str
    price: float
    score: float
    reason: str


class RecommendationResponse(BaseModel):
    customer_id: str
    strategy: str
    transaction_count: int
    recommendations_count: int
    recommendations: List[RecommendationItemResponse]


@router.get("/{customer_id}", response_model=RecommendationResponse)
def get_personalized_recommendation(
    customer_id: str,
    top_n: int = 3,
    db: Session = Depends(get_db)
):
    """
    Get Top-N Personalized Menu Recommendations for Customer at Cashier POS:
    - If customer has >= 3 transactions: Item-Based Collaborative Filtering.
    - If customer is new / has < 3 transactions: Cold-Start Popularity-Based Fallback.
    """
    try:
        cust_uuid = UUID(customer_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid customer_id UUID format")

    customer = db.query(Customer).filter(Customer.customer_id == cust_uuid).first()
    if not customer:
        raise HTTPException(status_code=404, detail=f"Customer with ID '{customer_id}' not found")

    result = recommendation_engine.get_recommendations(db=db, customer_id=cust_uuid, top_n=top_n)
    return result
