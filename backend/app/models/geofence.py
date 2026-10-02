from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.geofence_point import GeofencePoint


class Geofence(Base, TimestampMixin):
    __tablename__ = "geofences"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    boundary_type: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
    )

    center_latitude: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    center_longitude: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    radius_meters: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        index=True,
    )

    created_by: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    creator: Mapped["User"] = relationship(
        "User",
    )

    points: Mapped[list["GeofencePoint"]] = relationship(
        "GeofencePoint",
        back_populates="geofence",
        cascade="all, delete-orphan",
        order_by="GeofencePoint.point_order",
    )