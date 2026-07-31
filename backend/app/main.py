from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import SessionLocal

from app.routers.recognition import router as recognition_router
from app.routers.customer import router as customer_router
from app.routers.analytics import router as analytics_router
from app.routers.auth import router as auth_router
from app.routers.visits import router as visits_router
from app.routers.recognition_logs import router as recognition_logs_router
from app.routers.users import router as users_router
from app.routers.menu import router as menu_router
from app.routers.pos import router as pos_router
from app.routers.association import router as association_router
from app.routers.workflow import router as workflow_router
from app.routers.recommendation import router as recommendation_router

from app.services.recognition_service import recognition_service

print("STARTING APP")
app = FastAPI(title="Cafe CRM API", version="1.0.0")

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load FAISS gallery at startup (safe — won't crash if gallery is empty)
db = SessionLocal()
try:
    n = recognition_service.load_gallery(db)
    print(f"[STARTUP] FAISS gallery loaded — {n} embedding(s).")
except Exception as e:
    print(f"[STARTUP] Warning: could not load gallery: {e}")
    print(f"[STARTUP] Recognition will return 'unknown' until customers are enrolled.")
finally:
    db.close()

# Routers
app.include_router(auth_router)
app.include_router(recognition_router)
app.include_router(customer_router)
app.include_router(analytics_router)
app.include_router(visits_router)
app.include_router(recognition_logs_router)
app.include_router(users_router)
app.include_router(menu_router)
app.include_router(pos_router)
app.include_router(association_router)
app.include_router(workflow_router)
app.include_router(recommendation_router)

print("LOADED ROUTERS")
