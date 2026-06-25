from fastapi import FastAPI

from database import SessionLocal

from app.routers.recognition import (
    router as recognition_router
)

from app.routers.customer import (
    router as customer_router
)

from app.services.recognition_service import (
    recognition_service
)

from app.routers.analytics import (
    router as analytics_router
)

print("STARTING APP")
app = FastAPI()

# Load FAISS gallery saat startup
db = SessionLocal()

recognition_service.load_gallery(
    db
)

db.close()

# Routers
app.include_router(
    recognition_router
)

app.include_router(
    customer_router
)

app.include_router(
    analytics_router
)

print("LOADED ROUTERS")
