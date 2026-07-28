# scripts/import_gallery.py

from pathlib import Path
import sys
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.append(str(ROOT))

from database import SessionLocal

from app.models.customer import Customer
from app.models.embedding import Embedding

EMBEDDING_DIR = Path(
    r"D:\Projects\cafe_facerec\embeddings\arcface"
)

db = SessionLocal()

files = list(EMBEDDING_DIR.glob("*.npy"))

print(f"Found {len(files)} people")

for file in files:

    person_name = file.stem

    customer = (
        db.query(Customer)
        .filter(Customer.name == person_name)
        .first()
    )

    if customer is None:

        customer = Customer(
            name=person_name
        )

        db.add(customer)
        db.commit()
        db.refresh(customer)

        print(f"Created customer: {person_name}")

    arr = np.load(file)

    inserted = 0

    for emb in arr:

        row = Embedding(
            customer_id=customer.customer_id,
            embedding_vector=emb.tolist(),
            model_name="arcface",
            is_primary=False
        )

        db.add(row)

        inserted += 1

    db.commit()

    print(
        f"{person_name}: {inserted} embeddings"
    )

print("Done")