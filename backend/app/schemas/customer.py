from uuid import UUID
from datetime import date, datetime

from pydantic import BaseModel

class CustomerSummaryResponse(BaseModel):
    customer_id: UUID
    name: str
    visit_count: int
    recognition_count: int
    last_visit: datetime | None

class CustomerVisitResponse(BaseModel):
    visit_id: UUID
    entry_time: datetime

    model_config = {
        "from_attributes": True
    }

class CustomerResponse(BaseModel):
    customer_id: UUID
    name: str
    phone_number: str | None = None
    email: str | None = None

    model_config = {
        "from_attributes": True
    }


class CustomerDetailResponse(BaseModel):
    customer_id: UUID
    name: str
    phone_number: str | None = None
    email: str | None = None
    gender: str | None = None
    visit_count: int
    segment: str | None = None

    model_config = {
        "from_attributes": True
    }

class CustomerCreateRequest(BaseModel):
    name: str
    phone_number: str | None = None
    email: str | None = None
    gender: str | None = None
    date_of_birth: date | None = None
    notes: str | None = None