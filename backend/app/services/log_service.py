from app.models.recognition_log import RecognitionLog


class LogService:

    @staticmethod
    def create_log(
        db,
        customer_id,
        score,
        recognized,
        model_name="magface",
        camera_id="camera_1"
    ):

        log = RecognitionLog(
            customer_id=customer_id,
            similarity_score=score,
            recognized=recognized,
            model_used=model_name,
            camera_id=camera_id,
            is_correct=None
        )

        db.add(log)
        db.commit()

        return log