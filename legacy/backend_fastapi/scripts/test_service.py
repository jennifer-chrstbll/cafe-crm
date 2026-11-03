from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent.parent
sys.path.append(str(ROOT))

import numpy as np

from database import SessionLocal

from app.services.recognition_service import (
    RecognitionService
)

db = SessionLocal()

service = RecognitionService()

service.load_gallery(db)

probe = np.load(
    r"D:\Projects\cafe_facerec\embeddings\arcface\Jennifer.npy"
)

result = service.recognize_embedding(
    probe[0]
)

print(result)