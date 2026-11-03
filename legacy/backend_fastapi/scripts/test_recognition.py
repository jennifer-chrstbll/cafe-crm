from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent
sys.path.append(str(ROOT))

import numpy as np
import faiss

from database import SessionLocal
from app.models.embedding import Embedding
from app.models.customer import Customer

db = SessionLocal()

# ====================================
# BUILD GALLERY
# ====================================

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
gallery = []

for emb, customer in rows:

    vec = np.array(
        emb.embedding_vector,
        dtype=np.float32
    )

    labels.append(customer.name)
    gallery.append(vec)

gallery = np.stack(gallery)

index = faiss.IndexFlatIP(512)
index.add(gallery)

print("Gallery size:", index.ntotal)

# ====================================
# PROBE
# ====================================

probe = np.load(
    r"D:\Projects\cafe_facerec\embeddings\arcface\Jennifer.npy"
)

probe_embedding = probe[0].astype(np.float32)

# ====================================
# SEARCH
# ====================================

D, I = index.search(
    probe_embedding.reshape(1, -1),
    k=5
)

print("\nTop 5 Results:\n")

for rank in range(5):

    idx = int(I[0][rank])

    print(
        rank + 1,
        labels[idx],
        float(D[0][rank])
    )