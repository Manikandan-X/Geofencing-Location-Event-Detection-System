from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestException, NotFoundException
from app.models.geofence_event import GeofenceEvent
from app.models.user import User
from app.repositories.geofence_event_repository import (
    GeofenceEventRepository,
)


class GeofenceEventService:

    def __init__(self):
        self.geofence_event_repository = GeofenceEventRepository()

    def get_geofence_event_by_id(
        self,
        db: Session,
        geofence_event_id: int,
        current_user: User,
    ) -> GeofenceEvent:

        geofence_event = (
            self.geofence_event_repository.get_by_id(
                db=db,
                geofence_event_id=geofence_event_id,
            )
        )

        if geofence_event is None:
            raise NotFoundException("Geofence event not found")

        # Normal users can only view their own events.
        # Admin authorization can be handled by the router/service
        # if you decide to expose all events to admins.
        if current_user.role.name != "Admin":
            if geofence_event.user_id != current_user.id:
                raise BadRequestException(
                    "Geofence event does not belong to the current user"
                )

        return geofence_event

    def get_geofence_events(
        self,
        db: Session,
        page: int,
        page_size: int,
        current_user: User,
        device_id: int | None = None,
        user_id: int | None = None,
        geofence_id: int | None = None,
        event_type: str | None = None,
    ) -> dict:

        # Normal users are restricted to their own events.
        # Admins can optionally filter by any user.
        if current_user.role.name != "Admin":
            user_id = current_user.id

        events, total = (
            self.geofence_event_repository.get_all(
                db=db,
                page=page,
                page_size=page_size,
                device_id=device_id,
                user_id=user_id,
                geofence_id=geofence_id,
                event_type=event_type,
            )
        )

        total_pages = (
            (total + page_size - 1) // page_size
            if total > 0
            else 0
        )

        return {
            "items": events,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        }