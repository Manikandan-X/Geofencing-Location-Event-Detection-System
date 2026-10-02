from sqlalchemy.orm import Session

from app.constants.geofence import GeofenceEventType
from app.models.geofence_event import GeofenceEvent
from app.repositories.geofence_event_repository import (
    GeofenceEventRepository,
)


class EventDetectionService:

    def __init__(self):
        self.geofence_event_repository = GeofenceEventRepository()

    def detect_and_create_events(
        self,
        db: Session,
        device_id: int,
        user_id: int,
        latitude: float,
        longitude: float,
        recorded_at,
        detection_results: list[dict],
    ) -> list[GeofenceEvent]:

        events = []

        for result in detection_results:

            geofence_id = result["geofence_id"]
            current_state = result["state"]

            # GPS accuracy is not reliable enough to determine
            # whether the device is inside or outside.
            #
            # Do not create an event and do not change the
            # previously known state.
            if current_state == "UNCERTAIN":
                continue

            latest_event = (
                self.geofence_event_repository
                .get_latest_for_device_and_geofence(
                    db=db,
                    device_id=device_id,
                    geofence_id=geofence_id,
                )
            )

            if latest_event is None:
                previous_state = GeofenceEventType.OUTSIDE
            else:
                previous_state = latest_event.current_state

            event_type = self._determine_event_type(
                previous_state=previous_state,
                current_state=current_state,
            )

            # OUTSIDE → OUTSIDE does not create an event.
            if event_type is None:
                continue

            geofence_event = GeofenceEvent(
                device_id=device_id,
                user_id=user_id,
                geofence_id=geofence_id,
                event_type=event_type,
                latitude=latitude,
                longitude=longitude,
                recorded_at=recorded_at,
                previous_state=previous_state,
                current_state=current_state,
            )

            self.geofence_event_repository.create(
                db=db,
                geofence_event=geofence_event,
            )

            events.append(geofence_event)

        return events

    def _determine_event_type(
        self,
        previous_state: str,
        current_state: str,
    ) -> str | None:

        if (
            previous_state == GeofenceEventType.OUTSIDE
            and current_state == GeofenceEventType.INSIDE
        ):
            return GeofenceEventType.ENTER

        if (
            previous_state == GeofenceEventType.INSIDE
            and current_state == GeofenceEventType.OUTSIDE
        ):
            return GeofenceEventType.EXIT

        if (
            previous_state == GeofenceEventType.INSIDE
            and current_state == GeofenceEventType.INSIDE
        ):
            return GeofenceEventType.INSIDE

        return None