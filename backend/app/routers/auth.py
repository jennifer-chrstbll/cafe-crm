from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone

from database import SessionLocal
from app.models.user import User
from app.core.security import verify_password, create_access_token

router = APIRouter(
    prefix="/auth",
    tags=["Auth"]
)


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    name: str
    email: str
    role: str


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest):
    db = SessionLocal()
    try:
        user = db.query(User).filter(
            User.email == request.email,
            User.is_active == True
        ).first()

        if not user or not verify_password(request.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Email atau password salah")

        # Update last_login
        user.last_login = datetime.now(timezone.utc)
        db.commit()

        token = create_access_token({
            "sub": str(user.user_id),
            "role": user.role.value,
            "name": user.name,
            "email": user.email,
        })

        return LoginResponse(
            access_token=token,
            token_type="bearer",
            user_id=str(user.user_id),
            name=user.name,
            email=user.email,
            role=user.role.value,
        )
    finally:
        db.close()


@router.get("/me")
def get_me():
    """Placeholder - real implementation would verify JWT from header."""
    return {"message": "Use JWT token from /auth/login"}
