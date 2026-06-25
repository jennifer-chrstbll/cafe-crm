from datetime import datetime, timedelta

from app.models.visit import Visit


class VisitService:

    VISIT_COOLDOWN_MINUTES = 30

    @staticmethod
    def create_visit(
        db,
        customer_id
    ):

        latest_visit = (
            db.query(Visit)
            .filter(
                Visit.customer_id == customer_id
            )
            .order_by(
                Visit.entry_time.desc()
            )
            .first()
        )

        now = datetime.utcnow()

        if latest_visit:

            elapsed = (
                now -
                latest_visit.entry_time.replace(
                    tzinfo=None
                )
            )

            if elapsed < timedelta(
                minutes=VisitService.VISIT_COOLDOWN_MINUTES
            ):

                return None

        visit = Visit(
            customer_id=customer_id,
            entry_time=now,
            exit_time=None,
            duration_minutes=None
        )

        db.add(visit)
        db.commit()
        db.refresh(visit)

        return visit