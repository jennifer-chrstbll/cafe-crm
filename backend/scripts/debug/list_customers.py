import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT))

from database import SessionLocal
from app.models.customer import Customer

db = SessionLocal()

customers = db.query(Customer).all()

for c in customers:
    print(
        c.customer_id,
        c.name,
        c.phone_number
    )

db.close()