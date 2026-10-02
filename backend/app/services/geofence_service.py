from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.constants.audit import AuditAction, AuditEntity
from app.constants.geofence import GeofenceBoundaryType
from app.core.exceptions import (
    BadRequestException,
    ConflictException,
    NotFoundException,
)
from app.models.geofence import Geofence
from app.models.geofence_point import GeofencePoint
from app.models.user import User
from app.repositories.geofence_repository import GeofenceRepository
from app.schemas.geofence import GeofenceCreate, GeofenceUpdate
from app.services.audit_log_service import AuditLogService


class GeofenceService:
    def __init__(self) -> None:
        self.geofence_repository = GeofenceRepository()
        self.audit_log_service = AuditLogService()

    def create_geofence(
        self,
        db: Session,
        data: GeofenceCreate,
        current_user: User,
    ) -> Geofence:

        geofence = Geofence(
            name=data.name,
            description=data.description,
            boundary_type=data.boundary_type,
            center_latitude=data.center_latitude,
            center_longitude=data.center_longitude,
            radius_meters=data.radius_meters,
            is_active=True,
            created_by=current_user.id,
        )

        try:
            geofence = self.geofence_repository.create(
                db=db,
                geofence=geofence,
            )

            if data.boundary_type == GeofenceBoundaryType.POLYGON:
                for index, point_data in enumerate(
                    data.points or [],
                    start=1,
                ):
                    point = GeofencePoint(
                        geofence_id=geofence.id,
                        latitude=point_data.latitude,
                        longitude=point_data.longitude,
                        point_order=index,
                    )

                    self.geofence_repository.add_point(
                        db=db,
                        point=point,
                    )

            self.audit_log_service.create_log(
                db=db,
                user_id=current_user.id,
                action=AuditAction.GEOFENCE_CREATED,
                entity_type=AuditEntity.GEOFENCE,
                entity_id=geofence.id,
                details={
                    "name": geofence.name,
                    "boundary_type": geofence.boundary_type,
                },
            )

            db.commit()
            db.refresh(geofence)

            return geofence

        except IntegrityError:
            db.rollback()
            raise ConflictException(
                "Unable to create geofence because of a database conflict"
            )

    def get_geofence_by_id(
        self,
        db: Session,
        geofence_id: int,
    ) -> Geofence:

        geofence = self.geofence_repository.get_by_id(
            db=db,
            geofence_id=geofence_id,
        )

        if geofence is None:
            raise NotFoundException(
                "Geofence not found"
            )

        return geofence

    def get_geofences(
        self,
        db: Session,
        page: int,
        page_size: int,
        is_active: bool | None = None,
        boundary_type: str | None = None,
        search: str | None = None,
    ) -> dict:

        geofences, total = self.geofence_repository.get_all(
            db=db,
            page=page,
            page_size=page_size,
            is_active=is_active,
            boundary_type=boundary_type,
            search=search,
        )

        total_pages = (
            (total + page_size - 1) // page_size
            if total > 0
            else 0
        )

        return {
            "items": geofences,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        }

    def update_geofence(
        self,
        db: Session,
        geofence_id: int,
        data: GeofenceUpdate,
        current_user: User,
    ) -> Geofence:

        geofence = self.get_geofence_by_id(
            db=db,
            geofence_id=geofence_id,
        )

        update_data = data.model_dump(
            exclude_unset=True,
        )

        if not update_data:
            raise BadRequestException(
                "At least one field is required for update"
            )

        new_boundary_type = data.boundary_type

        if new_boundary_type is None:
            new_boundary_type = geofence.boundary_type

        if new_boundary_type not in {
            GeofenceBoundaryType.CIRCLE,
            GeofenceBoundaryType.POLYGON,
        }:
            raise BadRequestException(
                "Invalid geofence boundary type"
            )

        if new_boundary_type == GeofenceBoundaryType.CIRCLE:
            self._validate_circle_update(
                geofence=geofence,
                data=data,
            )

        if new_boundary_type == GeofenceBoundaryType.POLYGON:
            self._validate_polygon_update(
                geofence=geofence,
                data=data,
            )

        try:
            if data.name is not None:
                geofence.name = data.name

            if "description" in update_data:
                geofence.description = data.description

            if data.boundary_type is not None:
                geofence.boundary_type = data.boundary_type

            if new_boundary_type == GeofenceBoundaryType.CIRCLE:
                geofence.center_latitude = (
                    data.center_latitude
                    if data.center_latitude is not None
                    else geofence.center_latitude
                )

                geofence.center_longitude = (
                    data.center_longitude
                    if data.center_longitude is not None
                    else geofence.center_longitude
                )

                geofence.radius_meters = (
                    data.radius_meters
                    if data.radius_meters is not None
                    else geofence.radius_meters
                )

                self.geofence_repository.delete_points(
                    db=db,
                    geofence_id=geofence.id,
                )

            elif new_boundary_type == GeofenceBoundaryType.POLYGON:
                geofence.center_latitude = None
                geofence.center_longitude = None
                geofence.radius_meters = None

                if data.points is not None:
                    self.geofence_repository.delete_points(
                        db=db,
                        geofence_id=geofence.id,
                    )

                    for index, point_data in enumerate(
                        data.points,
                        start=1,
                    ):
                        point = GeofencePoint(
                            geofence_id=geofence.id,
                            latitude=point_data.latitude,
                            longitude=point_data.longitude,
                            point_order=index,
                        )

                        self.geofence_repository.add_point(
                            db=db,
                            point=point,
                        )

            geofence = self.geofence_repository.update(
                db=db,
                geofence=geofence,
            )

            self.audit_log_service.create_log(
                db=db,
                user_id=current_user.id,
                action=AuditAction.GEOFENCE_UPDATED,
                entity_type=AuditEntity.GEOFENCE,
                entity_id=geofence.id,
                details={
                    "name": geofence.name,
                    "boundary_type": geofence.boundary_type,
                },
            )

            db.commit()
            db.refresh(geofence)

            return geofence

        except IntegrityError:
            db.rollback()
            raise ConflictException(
                "Unable to update geofence because of a database conflict"
            )

    def activate_geofence(
        self,
        db: Session,
        geofence_id: int,
        current_user: User,
    ) -> Geofence:

        geofence = self.get_geofence_by_id(
            db=db,
            geofence_id=geofence_id,
        )

        if geofence.is_active:
            raise BadRequestException(
                "Geofence is already active"
            )

        geofence = self.geofence_repository.set_active_status(
            db=db,
            geofence=geofence,
            is_active=True,
        )

        self.audit_log_service.create_log(
            db=db,
            user_id=current_user.id,
            action=AuditAction.GEOFENCE_ENABLED,
            entity_type=AuditEntity.GEOFENCE,
            entity_id=geofence.id,
            details={
                "name": geofence.name,
            },
        )

        db.commit()
        db.refresh(geofence)

        return geofence

    def deactivate_geofence(
        self,
        db: Session,
        geofence_id: int,
        current_user: User,
    ) -> Geofence:

        geofence = self.get_geofence_by_id(
            db=db,
            geofence_id=geofence_id,
        )

        if not geofence.is_active:
            raise BadRequestException(
                "Geofence is already inactive"
            )

        geofence = self.geofence_repository.set_active_status(
            db=db,
            geofence=geofence,
            is_active=False,
        )

        self.audit_log_service.create_log(
            db=db,
            user_id=current_user.id,
            action=AuditAction.GEOFENCE_DISABLED,
            entity_type=AuditEntity.GEOFENCE,
            entity_id=geofence.id,
            details={
                "name": geofence.name,
            },
        )

        db.commit()
        db.refresh(geofence)

        return geofence

    def delete_geofence(
        self,
        db: Session,
        geofence_id: int,
        current_user: User,
    ) -> None:

        geofence = self.get_geofence_by_id(
            db=db,
            geofence_id=geofence_id,
        )

        try:
            self.audit_log_service.create_log(
                db=db,
                user_id=current_user.id,
                action=AuditAction.GEOFENCE_DELETED,
                entity_type=AuditEntity.GEOFENCE,
                entity_id=geofence.id,
                details={
                    "action": "DELETE",
                    "name": geofence.name,
                    "boundary_type": geofence.boundary_type,
                },
            )

            self.geofence_repository.delete(
                db=db,
                geofence=geofence,
            )

            db.commit()

        except IntegrityError:
            db.rollback()
            raise ConflictException(
                "Cannot delete geofence because it is referenced by other records"
            )

    def _validate_circle_update(
        self,
        geofence: Geofence,
        data: GeofenceUpdate,
    ) -> None:

        if data.points is not None:
            raise BadRequestException(
                "Points are not allowed for a circle geofence"
            )

        center_latitude = (
            data.center_latitude
            if data.center_latitude is not None
            else geofence.center_latitude
        )

        center_longitude = (
            data.center_longitude
            if data.center_longitude is not None
            else geofence.center_longitude
        )

        radius_meters = (
            data.radius_meters
            if data.radius_meters is not None
            else geofence.radius_meters
        )

        if center_latitude is None:
            raise BadRequestException(
                "center_latitude is required for a circle geofence"
            )

        if center_longitude is None:
            raise BadRequestException(
                "center_longitude is required for a circle geofence"
            )

        if radius_meters is None:
            raise BadRequestException(
                "radius_meters is required for a circle geofence"
            )

    def _validate_polygon_update(
        self,
        geofence: Geofence,
        data: GeofenceUpdate,
    ) -> None:

        if (
            data.center_latitude is not None
            or data.center_longitude is not None
            or data.radius_meters is not None
        ):
            raise BadRequestException(
                "Circle fields are not allowed for a polygon geofence"
            )

        if data.points is not None:
            if len(data.points) < 3:
                raise BadRequestException(
                    "A polygon geofence requires at least 3 points"
                )

            return

        if geofence.boundary_type != GeofenceBoundaryType.POLYGON:
            raise BadRequestException(
                "Points are required when changing a geofence to polygon"
            )

        existing_points = self.geofence_repository.get_points(
            db=None,
            geofence_id=geofence.id,
        )