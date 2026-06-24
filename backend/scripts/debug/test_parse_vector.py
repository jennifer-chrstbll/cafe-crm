# scripts/test_parse_vector.py

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.append(str(ROOT))

from database import SessionLocal
from app.models.embedding import Embedding

db = SessionLocal()

row = db.query(Embedding).first()

print(type(row.embedding_vector))
print(row.embedding_vector[:100])