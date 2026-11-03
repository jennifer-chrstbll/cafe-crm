# test_embedding_import.py

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent
sys.path.append(str(ROOT))

from app.models.embedding import Embedding

print("Embedding model loaded")