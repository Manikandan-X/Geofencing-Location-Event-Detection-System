from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.geofence import Geofence
from app.models.geofence_point import GeofencePoint


class GeofenceRepository:
    def get_by_id(
        self,
        db: Session,
        geofence_id: int,
    ) -> Geofence | None:
        return db.get(Geofence, geofence_id)

    def get_all(
        self,
        db: Session,
        page: int,
        page_size: int,
        is_active: bool | None = None,
        boundary_type: str | None = None,
        search: str | None = None,
    ) -> tuple[list[Geofence], int]:

        query = select(Geofence)
        count_query = select(func.count(Geofence.id))

        if is_active is not None:
            query = query.where(
                Geofence.is_active == is_active
            )
            count_query = count_query.where(
                Geofence.is_active == is_active
            )

        if boundary_type is not None:
            query = query.where(
                Geofence.boundary_type == boundary_type
            )
            count_query = count_query.where(
                Geofence.boundary_type == boundary_type
            )

        if search:
            search_pattern = f"%{search}%"

            search_condition = (
                Geofence.name.ilike(search_pattern)
                | Geofence.description.ilike(search_pattern)
            )

            query = query.where(search_condition)
            count_query = count_query.where(search_condition)

        query = (
            query
            .order_by(Geofence.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        geofences = list(db.scalars(query).all())
        total = db.scalar(count_query) or 0

        return geofences, total

    def create(
        self,
        db: Session,
        geofence: Geofence,
    ) -> Geofence:
        db.add(geofence)
        db.flush()
        db.refresh(geofence)

        return geofence

    def update(
        self,
        db: Session,
        geofence: Geofence,
    ) -> Geofence:
        db.flush()
        db.refresh(geofence)

        return geofence

    def delete(
        self,
        db: Session,
        geofence: Geofence,
    ) -> None:
        db.delete(geofence)
        db.flush()

    def set_active_status(
        self,
        db: Session,
        geofence: Geofence,
        is_active: bool,
    ) -> Geofence:
        geofence.is_active = is_active

        db.flush()
        db.refresh(geofence)

        return geofence

    def add_point(
        self,
        db: Session,
        point: GeofencePoint,
    ) -> GeofencePoint:
        db.add(point)
        db.flush()
        db.refresh(point)

        return point

    def delete_points(
        self,
        db: Session,
        geofence_id: int,
    ) -> None:
        points = list(
            db.scalars(
                select(GeofencePoint).where(
                    GeofencePoint.geofence_id == geofence_id
                )
            ).all()
        )

        for point in points:
            db.delete(point)

        db.flush()

    def get_points(
        self,
        db: Session,
        geofence_id: int,
    ) -> list[GeofencePoint]:
        query = (
            select(GeofencePoint)
            .where(
                GeofencePoint.geofence_id == geofence_id
            )
            .order_by(GeofencePoint.point_order.asc())
        )

        return list(db.scalars(query).all())