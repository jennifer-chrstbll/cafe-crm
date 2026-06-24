from pydantic import BaseModel


class RecognitionRequest(BaseModel):
    embedding: list[float]


class RecognitionResponse(BaseModel):
    recognized: bool
    customer_id: str | None = None
    customer_name: str | None = None
    score: float | None = None