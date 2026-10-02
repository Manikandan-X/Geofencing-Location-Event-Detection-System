from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.device import Device


class DeviceRepository:
    def get_by_id(
        self,
        db: Session,
        device_id: int,
    ) -> Device | None:
        return db.get(Device, device_id)

    def get_by_identifier(
        self,
        db: Session,
        device_identifier: str,
    ) -> Device | None:
        return db.scalar(
            select(Device).where(
                Device.device_identifier == device_identifier
            )
        )

    def get_all(
        self,
        db: Session,
        page: int,
        page_size: int,
        user_id: int | None = None,
        is_active: bool | None = None,
        search: str | None = None,
    ) -> tuple[list[Device], int]:

        query = select(Device)
        count_query = select(func.count(Device.id))

        if user_id is not None:
            query = query.where(Device.user_id == user_id)
            count_query = count_query.where(Device.user_id == user_id)

        if is_active is not None:
            query = query.where(Device.is_active == is_active)
            count_query = count_query.where(Device.is_active == is_active)

        if search:
            search_pattern = f"%{search}%"

            search_condition = (
                Device.name.ilike(search_pattern)
                | Device.device_identifier.ilike(search_pattern)
            )

            query = query.where(search_condition)
            count_query = count_query.where(search_condition)

        query = (
            query
            .order_by(Device.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )

        devices = list(db.scalars(query).all())
        total = db.scalar(count_query) or 0

        return devices, total

    def create(
        self,
        db: Session,
        device: Device,
    ) -> Device:
        db.add(device)
        db.flush()
        db.refresh(device)

        return device

    def update(
        self,
        db: Session,
        device: Device,
    ) -> Device:
        db.flush()
        db.refresh(device)

        return device

    def delete(
        self,
        db: Session,
        device: Device,
    ) -> None:
        db.delete(device)
        db.flush()

    def set_active_status(
        self,
        db: Session,
        device: Device,
        is_active: bool,
    ) -> Device:
        device.is_active = is_active

        db.flush()
        db.refresh(device)

        return device