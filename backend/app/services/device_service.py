from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.constants.audit import AuditAction, AuditEntity
from app.core.exceptions import (
    BadRequestException,
    ConflictException,
    NotFoundException,
)
from app.models.device import Device
from app.models.user import User
from app.repositories.device_repository import DeviceRepository
from app.repositories.user_repository import UserRepository
from app.schemas.device import DeviceCreate, DeviceUpdate
from app.services.audit_log_service import AuditLogService


class DeviceService:
    def __init__(self) -> None:
        self.device_repository = DeviceRepository()
        self.user_repository = UserRepository()
        self.audit_log_service = AuditLogService()

    def create_device(
        self,
        db: Session,
        data: DeviceCreate,
        current_user: User,
    ) -> Device:
        existing_device = (
            self.device_repository.get_by_identifier(
                db=db,
                device_identifier=data.device_identifier,
            )
        )

        if existing_device is not None:
            raise ConflictException(
                "Device identifier already exists"
            )

        user = self.user_repository.get_by_id(
            db=db,
            user_id=data.user_id,
        )

        if user is None:
            raise NotFoundException(
                "User not found"
            )

        if not user.is_active:
            raise BadRequestException(
                "Cannot assign a device to an inactive user"
            )

        device = Device(
            user_id=data.user_id,
            device_identifier=data.device_identifier,
            name=data.name,
            is_active=True,
        )

        try:
            device = self.device_repository.create(
                db=db,
                device=device,
            )

            self.audit_log_service.create_log(
                db=db,
                user_id=current_user.id,
                action=AuditAction.DEVICE_CREATED,
                entity_type=AuditEntity.DEVICE,
                entity_id=device.id,
                details={
                    "user_id": device.user_id,
                    "device_identifier": device.device_identifier,
                    "name": device.name,
                },
            )

            db.commit()
            db.refresh(device)

            return device

        except IntegrityError:
            db.rollback()
            raise ConflictException(
                "Unable to create device because of a database conflict"
            )

    def get_device_by_id(
        self,
        db: Session,
        device_id: int,
    ) -> Device:
        device = self.device_repository.get_by_id(
            db=db,
            device_id=device_id,
        )

        if device is None:
            raise NotFoundException(
                "Device not found"
            )

        return device

    def get_devices(
        self,
        db: Session,
        page: int,
        page_size: int,
        user_id: int | None = None,
        is_active: bool | None = None,
        search: str | None = None,
    ) -> dict:
        devices, total = self.device_repository.get_all(
            db=db,
            page=page,
            page_size=page_size,
            user_id=user_id,
            is_active=is_active,
            search=search,
        )

        total_pages = (
            (total + page_size - 1) // page_size
            if total > 0
            else 0
        )

        return {
            "items": devices,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        }

    def update_device(
        self,
        db: Session,
        device_id: int,
        data: DeviceUpdate,
        current_user: User,
    ) -> Device:
        device = self.get_device_by_id(
            db=db,
            device_id=device_id,
        )

        if data.device_identifier is not None:
            existing_device = (
                self.device_repository.get_by_identifier(
                    db=db,
                    device_identifier=data.device_identifier,
                )
            )

            if (
                existing_device is not None
                and existing_device.id != device.id
            ):
                raise ConflictException(
                    "Device identifier already exists"
                )

        if data.user_id is not None:
            user = self.user_repository.get_by_id(
                db=db,
                user_id=data.user_id,
            )

            if user is None:
                raise NotFoundException(
                    "User not found"
                )

            if not user.is_active:
                raise BadRequestException(
                    "Cannot assign a device to an inactive user"
                )

            device.user_id = data.user_id

        if data.device_identifier is not None:
            device.device_identifier = data.device_identifier

        if data.name is not None:
            device.name = data.name

        try:
            device = self.device_repository.update(
                db=db,
                device=device,
            )

            self.audit_log_service.create_log(
                db=db,
                user_id=current_user.id,
                action=AuditAction.DEVICE_UPDATED,
                entity_type=AuditEntity.DEVICE,
                entity_id=device.id,
                details={
                    "user_id": device.user_id,
                    "device_identifier": device.device_identifier,
                    "name": device.name,
                },
            )

            db.commit()
            db.refresh(device)

            return device

        except IntegrityError:
            db.rollback()
            raise ConflictException(
                "Unable to update device because of a database conflict"
            )

    def activate_device(
        self,
        db: Session,
        device_id: int,
        current_user: User,
    ) -> Device:
        device = self.get_device_by_id(
            db=db,
            device_id=device_id,
        )

        if device.is_active:
            raise BadRequestException(
                "Device is already active"
            )

        device = self.device_repository.set_active_status(
            db=db,
            device=device,
            is_active=True,
        )

        self.audit_log_service.create_log(
            db=db,
            user_id=current_user.id,
            action=AuditAction.DEVICE_ACTIVATED,
            entity_type=AuditEntity.DEVICE,
            entity_id=device.id,
            details={
                "device_identifier": device.device_identifier,
            },
        )

        db.commit()
        db.refresh(device)

        return device

    def deactivate_device(
        self,
        db: Session,
        device_id: int,
        current_user: User,
    ) -> Device:
        device = self.get_device_by_id(
            db=db,
            device_id=device_id,
        )

        if not device.is_active:
            raise BadRequestException(
                "Device is already inactive"
            )

        device = self.device_repository.set_active_status(
            db=db,
            device=device,
            is_active=False,
        )

        self.audit_log_service.create_log(
            db=db,
            user_id=current_user.id,
            action=AuditAction.DEVICE_DEACTIVATED,
            entity_type=AuditEntity.DEVICE,
            entity_id=device.id,
            details={
                "device_identifier": device.device_identifier,
            },
        )

        db.commit()
        db.refresh(device)

        return device

    def delete_device(
        self,
        db: Session,
        device_id: int,
        current_user: User,
    ) -> None:
        device = self.get_device_by_id(
            db=db,
            device_id=device_id,
        )

        try:
            self.audit_log_service.create_log(
                db=db,
                user_id=current_user.id,
                action=AuditAction.DEVICE_DELETED,
                entity_type=AuditEntity.DEVICE,
                entity_id=device.id,
                details={
                    "user_id": device.user_id,
                    "device_identifier": device.device_identifier,
                    "name": device.name,
                },
            )

            self.device_repository.delete(
                db=db,
                device=device,
            )

            db.commit()

        except IntegrityError:
            db.rollback()
            raise ConflictException(
                "Cannot delete device because it is referenced by other records"
            )