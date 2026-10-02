from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.geofence_event import (
    GeofenceEventListResponse,
    GeofenceEventResponse,
)
from app.services.geofence_event_service import GeofenceEventService


router = APIRouter(
    prefix="/geofence-events",
    tags=["Geofence Events"],
)

geofence_event_service = GeofenceEventService()


@router.get(
    "",
    response_model=GeofenceEventListResponse,
)
def get_geofence_events(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    device_id: int | None = Query(default=None, gt=0),
    user_id: int | None = Query(default=None, gt=0),
    geofence_id: int | None = Query(default=None, gt=0),
    event_type: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return geofence_event_service.get_geofence_events(
        db=db,
        page=page,
        page_size=page_size,
        current_user=current_user,
        device_id=device_id,
        user_id=user_id,
        geofence_id=geofence_id,
        event_type=event_type,
    )


@router.get(
    "/{geofence_event_id}",
    response_model=GeofenceEventResponse,
)
def get_geofence_event(
    geofence_event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return geofence_event_service.get_geofence_event_by_id(
        db=db,
        geofence_event_id=geofence_event_id,
        current_user=current_user,
    )