"""
JWT + password hashing utilities.
Uses PyJWT (not python-jose) since bcrypt is already installed.
"""
import os
import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional

import logging

logger = logging.getLogger(__name__)

SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    SECRET_KEY = "cafe-crm-super-secret-key-2026-development-only"
    logger.warning(
        "[SECURITY WARNING] JWT_SECRET_KEY environment variable is not set! "
        "Using temporary development fallback key. "
        "PLEASE SET A SECURE JWT_SECRET_KEY IN PRODUCTION (.env)!"
    )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8  # 8 hours


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None
