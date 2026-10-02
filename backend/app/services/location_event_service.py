from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestException, NotFoundException
from app.models.location_event import LocationEvent
from app.models.user import User
from app.repositories.device_repository import DeviceRepository
from app.repositories.location_event_repository import LocationEventRepository
from app.schemas.location_event import LocationEventCreate
from app.services.event_detection_service import EventDetectionService
from app.services.geographic_detection_service import (
    GeographicDetectionService,
)


class LocationEventService:

    def __init__(self):
        self.location_event_repository = LocationEventRepository()
        self.device_repository = DeviceRepository()
        self.geographic_detection_service = GeographicDetectionService()
        self.event_detection_service = EventDetectionService()

    def create_location_event(
        self,
        db: Session,
        data: LocationEventCreate,
        current_user: User,
    ) -> LocationEvent:

        device = self.device_repository.get_by_id(
            db=db,
            device_id=data.device_id,
        )

        if device is None:
            raise NotFoundException(
                "Device not found"
            )

        if not device.is_active:
            raise BadRequestException(
                "Device is inactive"
            )

        if device.user_id != current_user.id:
            raise BadRequestException(
                "Device does not belong to the current user"
            )

        try:
            # 1. Save the location
            location_event = LocationEvent(
                device_id=device.id,
                user_id=device.user_id,
                latitude=data.latitude,
                longitude=data.longitude,
                accuracy_meters=data.accuracy_meters,
                recorded_at=data.recorded_at,
            )

            self.location_event_repository.create(
                db=db,
                location_event=location_event,
            )

            # 2. Detect current geographic state
            detection_results = (
                self.geographic_detection_service.detect_geofences(
                    db=db,
                    latitude=data.latitude,
                    longitude=data.longitude,
                    accuracy_meters=data.accuracy_meters,
                )
            )

            # 3. Generate geofence events
            self.event_detection_service.detect_and_create_events(
                db=db,
                device_id=device.id,
                user_id=device.user_id,
                latitude=data.latitude,
                longitude=data.longitude,
                recorded_at=data.recorded_at,
                detection_results=detection_results,
            )

            # 4. Commit location + geofence events together
            db.commit()
            db.refresh(location_event)

            return location_event

        except Exception:
            db.rollback()
            raise

    def get_location_event_by_id(
        self,
        db: Session,
        location_event_id: int,
        current_user: User,
    ) -> LocationEvent:

        location_event = (
            self.location_event_repository.get_by_id(
                db=db,
                location_event_id=location_event_id,
            )
        )

        if location_event is None:
            raise NotFoundException(
                "Location event not found"
            )

        if location_event.user_id != current_user.id:
            raise BadRequestException(
                "Location event does not belong to the current user"
            )

        return location_event

    def get_location_events(
        self,
        db: Session,
        page: int,
        page_size: int,
        current_user: User,
        device_id: int | None = None,
    ) -> dict:

        location_events, total = (
            self.location_event_repository.get_all(
                db=db,
                page=page,
                page_size=page_size,
                device_id=device_id,
                user_id=current_user.id,
            )
        )

        total_pages = (
            (total + page_size - 1) // page_size
            if total > 0
            else 0
        )

        return {
            "items": location_events,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        }

    def get_latest_location(
        self,
        db: Session,
        device_id: int,
        current_user: User,
    ) -> LocationEvent:

        device = self.device_repository.get_by_id(
            db=db,
            device_id=device_id,
        )

        if device is None:
            raise NotFoundException(
                "Device not found"
            )

        if device.user_id != current_user.id:
            raise BadRequestException(
                "Device does not belong to the current user"
            )

        location_event = (
            self.location_event_repository.get_latest_by_device(
                db=db,
                device_id=device_id,
            )
        )

        if location_event is None:
            raise NotFoundException(
                "No location found for this device"
            )

        return location_event