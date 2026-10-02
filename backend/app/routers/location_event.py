from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.location_event import (
    LocationEventCreate,
    LocationEventListResponse,
    LocationEventResponse,
)
from app.services.location_event_service import LocationEventService


router = APIRouter(
    prefix="/locations",
    tags=["Location Events"],
)

location_event_service = LocationEventService()


@router.post(
    "",
    response_model=LocationEventResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_location_event(
    data: LocationEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return location_event_service.create_location_event(
        db=db,
        data=data,
        current_user=current_user,
    )


@router.get(
    "",
    response_model=LocationEventListResponse,
)
def get_location_events(
    page: int = Query(
        default=1,
        ge=1,
    ),
    page_size: int = Query(
        default=20,
        ge=1,
        le=100,
    ),
    device_id: int | None = Query(
        default=None,
        gt=0,
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return location_event_service.get_location_events(
        db=db,
        page=page,
        page_size=page_size,
        current_user=current_user,
        device_id=device_id,
    )


@router.get(
    "/latest/{device_id}",
    response_model=LocationEventResponse,
)
def get_latest_location(
    device_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return location_event_service.get_latest_location(
        db=db,
        device_id=device_id,
        current_user=current_user,
    )


@router.get(
    "/{location_event_id}",
    response_model=LocationEventResponse,
)
def get_location_event(
    location_event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return location_event_service.get_location_event_by_id(
        db=db,
        location_event_id=location_event_id,
        current_user=current_user,
    )