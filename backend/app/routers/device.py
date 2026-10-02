from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.dependencies.auth import require_admin
from app.db.session import get_db
from app.models.user import User
from app.schemas.device import (
    DeviceCreate,
    DeviceListResponse,
    DeviceResponse,
    DeviceUpdate,
)
from app.services.device_service import DeviceService


router = APIRouter(
    prefix="/devices",
    tags=["Devices"],
)

device_service = DeviceService()


@router.post(
    "",
    response_model=DeviceResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_device(
    data: DeviceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return device_service.create_device(
        db=db,
        data=data,
        current_user=current_user,
    )


@router.get(
    "",
    response_model=DeviceListResponse,
)
def get_devices(
    page: int = Query(
        default=1,
        ge=1,
    ),
    page_size: int = Query(
        default=20,
        ge=1,
        le=100,
    ),
    user_id: int | None = Query(
        default=None,
        gt=0,
    ),
    is_active: bool | None = None,
    search: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return device_service.get_devices(
        db=db,
        page=page,
        page_size=page_size,
        user_id=user_id,
        is_active=is_active,
        search=search,
    )


@router.get(
    "/{device_id}",
    response_model=DeviceResponse,
)
def get_device(
    device_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return device_service.get_device_by_id(
        db=db,
        device_id=device_id,
    )


@router.put(
    "/{device_id}",
    response_model=DeviceResponse,
)
def update_device(
    device_id: int,
    data: DeviceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return device_service.update_device(
        db=db,
        device_id=device_id,
        data=data,
        current_user=current_user,
    )


@router.patch(
    "/{device_id}/activate",
    response_model=DeviceResponse,
)
def activate_device(
    device_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return device_service.activate_device(
        db=db,
        device_id=device_id,
        current_user=current_user,
    )


@router.patch(
    "/{device_id}/deactivate",
    response_model=DeviceResponse,
)
def deactivate_device(
    device_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    return device_service.deactivate_device(
        db=db,
        device_id=device_id,
        current_user=current_user,
    )


@router.delete(
    "/{device_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_device(
    device_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    device_service.delete_device(
        db=db,
        device_id=device_id,
        current_user=current_user,
    )