from fastapi import APIRouter
import bcrypt
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from database import SessionLocal
from app.models.user import User
from app.models.enums import UserRole

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

def _hash(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


class UserResponse(BaseModel):
    user_id: str
    name: str
    email: str
    role: str
    is_active: bool
    created_at: Optional[datetime] = None


class CreateUserRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "CASHIER"


class UpdatePasswordRequest(BaseModel):
    new_password: str


@router.get("", response_model=list[UserResponse])
def get_users():
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.is_active == True).all()
        return [
            UserResponse(
                user_id=str(u.user_id),
                name=u.name,
                email=u.email,
                role=u.role.value,
                is_active=u.is_active,
                created_at=u.created_at,
            )
            for u in users
        ]
    finally:
        db.close()


@router.post("", response_model=UserResponse)
def create_user(request: CreateUserRequest):
    db = SessionLocal()
    try:
        from fastapi import HTTPException
        existing = db.query(User).filter(User.email == request.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email sudah digunakan")

        user = User(
            name=request.name,
            email=request.email,
            password_hash=_hash(request.password),
            role=UserRole(request.role),
            is_active=True,
            created_at=datetime.utcnow(),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return UserResponse(
            user_id=str(user.user_id),
            name=user.name,
            email=user.email,
            role=user.role.value,
            is_active=user.is_active,
            created_at=user.created_at,
        )
    finally:
        db.close()


@router.delete("/{user_id}")
def delete_user(user_id: str):
    db = SessionLocal()
    try:
        from fastapi import HTTPException
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User tidak ditemukan")
        user.is_active = False
        db.commit()
        return {"message": "User berhasil dihapus"}
    finally:
        db.close()


@router.put("/{user_id}/password")
def update_password(user_id: str, request: UpdatePasswordRequest):
    db = SessionLocal()
    try:
        from fastapi import HTTPException
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User tidak ditemukan")
        user.password_hash = _hash(request.new_password)
        db.commit()
        return {"message": "Password berhasil diubah"}
    finally:
        db.close()


@router.put("/me/password")
def update_my_password(request: UpdatePasswordRequest, current_user_id: str):
    """Update own password"""
    return update_password(current_user_id, request)
