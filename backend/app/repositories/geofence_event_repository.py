from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.geofence_event import GeofenceEvent


class GeofenceEventRepository:
    def get_by_id(
        self,
        db: Session,
        geofence_event_id: int,
    ) -> GeofenceEvent | None:
        return db.get(GeofenceEvent, geofence_event_id)

    def get_all(
        self,
        db: Session,
        page: int,
        page_size: int,
        device_id: int | None = None,
        user_id: int | None = None,
        geofence_id: int | None = None,
        event_type: str | None = None,
    ) -> tuple[list[GeofenceEvent], int]:

        query = select(GeofenceEvent)
        count_query = select(func.count(GeofenceEvent.id))

        if device_id is not None:
            query = query.where(
                GeofenceEvent.device_id == device_id
            )
            count_query = count_query.where(
                GeofenceEvent.device_id == device_id
            )

        if user_id is not None:
            query = query.where(
                GeofenceEvent.user_id == user_id
            )
            count_query = count_query.where(
                GeofenceEvent.user_id == user_id
            )

        if geofence_id is not None:
            query = query.where(
                GeofenceEvent.geofence_id == geofence_id
            )
            count_query = count_query.where(
                GeofenceEvent.geofence_id == geofence_id
            )

        if event_type is not None:
            query = query.where(
                GeofenceEvent.event_type == event_type
            )
            count_query = count_query.where(
                GeofenceEvent.event_type == event_type
            )

        query = (
            query
            .order_by(
                GeofenceEvent.recorded_at.desc(),
                GeofenceEvent.id.desc(),
            )
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        events = list(db.scalars(query).all())
        total = db.scalar(count_query) or 0

        return events, total

    def get_latest_for_device_and_geofence(
        self,
        db: Session,
        device_id: int,
        geofence_id: int,
    ) -> GeofenceEvent | None:

        query = (
            select(GeofenceEvent)
            .where(
                GeofenceEvent.device_id == device_id,
                GeofenceEvent.geofence_id == geofence_id,
            )
            .order_by(
                GeofenceEvent.recorded_at.desc(),
                GeofenceEvent.id.desc(),
            )
            .limit(1)
        )

        return db.scalars(query).first()

    def create(
        self,
        db: Session,
        geofence_event: GeofenceEvent,
    ) -> GeofenceEvent:

        db.add(geofence_event)
        db.flush()
        db.refresh(geofence_event)

        return geofence_event