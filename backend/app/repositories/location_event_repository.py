from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.location_event import LocationEvent


class LocationEventRepository:
    def get_by_id(
        self,
        db: Session,
        location_event_id: int,
    ) -> LocationEvent | None:
        return db.get(LocationEvent, location_event_id)

    def get_all(
        self,
        db: Session,
        page: int,
        page_size: int,
        device_id: int | None = None,
        user_id: int | None = None,
    ) -> tuple[list[LocationEvent], int]:

        query = select(LocationEvent)
        count_query = select(func.count(LocationEvent.id))

        if device_id is not None:
            query = query.where(
                LocationEvent.device_id == device_id
            )
            count_query = count_query.where(
                LocationEvent.device_id == device_id
            )

        if user_id is not None:
            query = query.where(
                LocationEvent.user_id == user_id
            )
            count_query = count_query.where(
                LocationEvent.user_id == user_id
            )

        query = (
            query
            .order_by(LocationEvent.recorded_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        location_events = list(
            db.scalars(query).all()
        )

        total = db.scalar(count_query) or 0

        return location_events, total

    def get_latest_by_device(
        self,
        db: Session,
        device_id: int,
    ) -> LocationEvent | None:
        query = (
            select(LocationEvent)
            .where(
                LocationEvent.device_id == device_id
            )
            .order_by(
                LocationEvent.recorded_at.desc(),
                LocationEvent.id.desc(),
            )
            .limit(1)
        )

        return db.scalars(query).first()

    def get_latest_by_user(
        self,
        db: Session,
        user_id: int,
    ) -> LocationEvent | None:
        query = (
            select(LocationEvent)
            .where(
                LocationEvent.user_id == user_id
            )
            .order_by(
                LocationEvent.recorded_at.desc(),
                LocationEvent.id.desc(),
            )
            .limit(1)
        )

        return db.scalars(query).first()

    def create(
        self,
        db: Session,
        location_event: LocationEvent,
    ) -> LocationEvent:
        db.add(location_event)
        db.flush()
        db.refresh(location_event)

        return location_event