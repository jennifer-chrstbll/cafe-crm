from fastapi import APIRouter

import numpy as np

from app.services.recognition_service import (
    recognition_service
)

from app.schemas.recognition import (
    RecognitionRequest,
    RecognitionResponse
)

router = APIRouter(
    prefix="/recognition",
    tags=["Recognition"]
)


@router.post(
    "/search",
    response_model=RecognitionResponse
)
def search_face(
    request: RecognitionRequest
):

    embedding = np.array(
        request.embedding,
        dtype=np.float32
    )

    return recognition_service.recognize_embedding(
        embedding
    )