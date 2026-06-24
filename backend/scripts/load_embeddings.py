from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent
sys.path.append(str(ROOT))

from database import SessionLocal
from app.models.embedding import Embedding

db = SessionLocal()

rows = db.query(Embedding).all()

print(f"Found {len(rows)} embeddings")

for row in rows:
    print(row.embedding_id)
    print(row.model_name)
    print(len(row.embedding_vector))