import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.append(str(ROOT))

from database import SessionLocal
from app.models.customer import Customer

db = SessionLocal()

try:
    customer = Customer(
        name="Jennifer",
        phone_number="08123456789",
        email="jennifer@test.com",
        gender="Female"
    )

    db.add(customer)
    db.commit()
    db.refresh(customer)

    print("Customer inserted!")
    print("ID:", customer.customer_id)

except Exception as e:
    db.rollback()
    print("ERROR:", e)

finally:
    db.close()