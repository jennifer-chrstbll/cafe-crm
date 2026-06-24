# scripts/test_vector_raw.py

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent
sys.path.append(str(ROOT))

from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    result = conn.execute(
        text("""
        SELECT embedding_vector
        FROM embeddings
        LIMIT 1
        """)
    )

    row = result.fetchone()

    print(type(row[0]))
    print(str(row[0])[:100])