from pydantic import BaseModel
from typing import Optional


class RecognitionRequest(BaseModel):
    embedding: list[float]
    snapshot_image: Optional[str] = None  # Optional base64 snapshot captured from live camera for active session


class RecognitionResponse(BaseModel):
    recognized: bool
    customer_id: str | None = None
    customer_name: str | None = None
    score: float | None = None
    snapshot_url: str | None = None
    photo_temporary: bool = True