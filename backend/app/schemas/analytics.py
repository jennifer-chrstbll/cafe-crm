from pydantic import BaseModel
from datetime import datetime

class AnalyticsOverviewResponse(BaseModel):
    total_customers: int
    total_visits: int
    total_recognition_logs: int


class TopCustomerResponse(BaseModel):
    customer_name: str
    visit_count: int

class VisitTrendResponse(BaseModel):
    date: str
    visits: int

class RecentVisitResponse(BaseModel):
    customer_name: str
    entry_time: datetime

class RecentRecognitionResponse(BaseModel):
    customer_name: str
    score: float
    created_at: datetime | None