from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.dependencies.auth import require_admin
from app.models.user import User
from app.schemas.geofence import (
    GeofenceCreate,
    GeofenceListResponse,
    GeofenceResponse,
    GeofenceUpdate,
)
from app.services.geofence_service import GeofenceService


router = APIRouter(
    prefix="/geofences",
    tags=["Geofences"],
)

geofence_service = GeofenceService()


@router.post(
    "",
    response_model=GeofenceResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_geofence(
    data: GeofenceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return geofence_service.create_geofence(
        db=db,
        data=data,
        current_user=current_user,
    )


@router.get(
    "",
    response_model=GeofenceListResponse,
)
def get_geofences(
    page: int = Query(
        default=1,
        ge=1,
    ),
    page_size: int = Query(
        default=20,
        ge=1,
        le=100,
    ),
    is_active: bool | None = None,
    boundary_type: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return geofence_service.get_geofences(
        db=db,
        page=page,
        page_size=page_size,
        is_active=is_active,
        boundary_type=boundary_type,
        search=search,
    )


@router.get(
    "/{geofence_id}",
    response_model=GeofenceResponse,
)
def get_geofence(
    geofence_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return geofence_service.get_geofence_by_id(
        db=db,
        geofence_id=geofence_id,
    )


@router.put(
    "/{geofence_id}",
    response_model=GeofenceResponse,
)
def update_geofence(
    geofence_id: int,
    data: GeofenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return geofence_service.update_geofence(
        db=db,
        geofence_id=geofence_id,
        data=data,
        current_user=current_user,
    )


@router.patch(
    "/{geofence_id}/enable",
    response_model=GeofenceResponse,
)
def enable_geofence(
    geofence_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return geofence_service.activate_geofence(
        db=db,
        geofence_id=geofence_id,
        current_user=current_user,
    )


@router.patch(
    "/{geofence_id}/disable",
    response_model=GeofenceResponse,
)
def disable_geofence(
    geofence_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return geofence_service.deactivate_geofence(
        db=db,
        geofence_id=geofence_id,
        current_user=current_user,
    )


@router.delete(
    "/{geofence_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_geofence(
    geofence_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    geofence_service.delete_geofence(
        db=db,
        geofence_id=geofence_id,
        current_user=current_user,
    )