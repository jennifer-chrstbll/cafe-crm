from pathlib import Path
import sys
import numpy as np
import faiss

ROOT = Path(__file__).resolve().parent.parent
sys.path.append(str(ROOT))

from database import SessionLocal
from app.models.embedding import Embedding
from app.models.customer import Customer

db = SessionLocal()

rows = (
    db.query(
        Embedding,
        Customer
    )
    .join(
        Customer,
        Embedding.customer_id == Customer.customer_id
    )
    .all()
)

labels = []
embeddings = []

for emb, customer in rows:

    vec = np.array(
        emb.embedding_vector,
        dtype=np.float32
    )

    labels.append(customer.name)
    embeddings.append(vec)

embeddings = np.stack(embeddings)

index = faiss.IndexFlatIP(512)

index.add(embeddings)

print("People:", len(set(labels)))
print("Embeddings:", len(labels))
print("FAISS ntotal:", index.ntotal)