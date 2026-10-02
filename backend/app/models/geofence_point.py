from typing import TYPE_CHECKING

from sqlalchemy import Float, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.geofence import Geofence


class GeofencePoint(Base, TimestampMixin):
    __tablename__ = "geofence_points"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True,
    )

    geofence_id: Mapped[int] = mapped_column(
        ForeignKey("geofences.id"),
        nullable=False,
        index=True,
    )

    latitude: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    longitude: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    point_order: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    geofence: Mapped["Geofence"] = relationship(
        "Geofence",
        back_populates="points",
    )