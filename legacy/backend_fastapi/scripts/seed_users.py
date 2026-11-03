"""
Script to update dummy users with real bcrypt password hashes.
Run from backend dir: python scripts/seed_users.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import bcrypt
from database import SessionLocal
from app.models.user import User

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()

USERS = [
    {
        "email": "owner@cafecrm.com",
        "password": "admin123",
    },
    {
        "email": "cashier@cafecrm.com",
        "password": "cashier123",
    },
]


def seed():
    db = SessionLocal()
    try:
        for u in USERS:
            user = db.query(User).filter(User.email == u["email"]).first()
            if user:
                user.password_hash = hash_password(u["password"])
                print(f"Updated password for {u['email']}")
            else:
                print(f"User {u['email']} not found")
        db.commit()
        print("Done.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
