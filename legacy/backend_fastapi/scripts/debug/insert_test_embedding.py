import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.append(str(ROOT))

import numpy as np

from database import SessionLocal
from app.models.embedding import Embedding
from app.models.customer import Customer

db = SessionLocal()

customer = (
    db.query(Customer)
    .filter(Customer.name == "Jennifer")
    .first()
)

if customer is None:
    print("Customer not found")
    exit()

arr = np.load(
    r"D:\Projects\cafe_facerec\embeddings\arcface\Jennifer.npy"
)

embedding = arr[0].tolist()

row = Embedding(
    customer_id=customer.customer_id,
    embedding_vector=embedding,
    model_name="arcface",
    is_primary=True
)

db.add(row)
db.commit()

print("Embedding inserted")