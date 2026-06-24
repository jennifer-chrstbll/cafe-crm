# test_pg.py

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent
sys.path.append(str(ROOT))

from database import SessionLocal

print("Connected")