from fastapi import FastAPI

from database import SessionLocal

from app.routers.recognition import (
    router as recognition_router
)

from app.services.recognition_service import (
    recognition_service
)

app = FastAPI()

db = SessionLocal()

recognition_service.load_gallery(
    db
)

db.close()

app.include_router(
    recognition_router
)