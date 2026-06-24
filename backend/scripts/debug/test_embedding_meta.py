# test_embedding_meta.py

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent
sys.path.append(str(ROOT))

from database import SessionLocal
from app.models.embedding import Embedding

db = SessionLocal()

row = db.query(
    Embedding.embedding_id,
    Embedding.model_name
).first()

print(row)