from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.device import Device
    from app.models.geofence import Geofence
    from app.models.user import User


class GeofenceEvent(Base, TimestampMixin):
    __tablename__ = "geofence_events"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    device_id: Mapped[int] = mapped_column(
        ForeignKey("devices.id"),
        nullable=False,
        index=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    geofence_id: Mapped[int] = mapped_column(
        ForeignKey("geofences.id"),
        nullable=False,
        index=True,
    )

    event_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
    )

    latitude: Mapped[float] = mapped_column(
        nullable=False,
    )

    longitude: Mapped[float] = mapped_column(
        nullable=False,
    )

    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )

    previous_state: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    current_state: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    device: Mapped["Device"] = relationship(
        "Device",
    )

    user: Mapped["User"] = relationship(
        "User",
    )

    geofence: Mapped["Geofence"] = relationship(
        "Geofence",
    )