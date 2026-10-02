from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class GeofencePointCreate(BaseModel):
    latitude: float = Field(
        ge=-90,
        le=90,
    )
    longitude: float = Field(
        ge=-180,
        le=180,
    )


class GeofenceCreate(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=100,
    )

    description: str | None = Field(
        default=None,
        max_length=1000,
    )

    boundary_type: Literal["CIRCLE", "POLYGON"]

    center_latitude: float | None = Field(
        default=None,
        ge=-90,
        le=90,
    )

    center_longitude: float | None = Field(
        default=None,
        ge=-180,
        le=180,
    )

    radius_meters: float | None = Field(
        default=None,
        gt=0,
    )

    points: list[GeofencePointCreate] | None = None

    @model_validator(mode="after")
    def validate_boundary(self):
        if self.boundary_type == "CIRCLE":
            if self.center_latitude is None:
                raise ValueError(
                    "center_latitude is required for a circle geofence"
                )

            if self.center_longitude is None:
                raise ValueError(
                    "center_longitude is required for a circle geofence"
                )

            if self.radius_meters is None:
                raise ValueError(
                    "radius_meters is required for a circle geofence"
                )

            if self.points:
                raise ValueError(
                    "points are not allowed for a circle geofence"
                )

        if self.boundary_type == "POLYGON":
            if not self.points:
                raise ValueError(
                    "points are required for a polygon geofence"
                )

            if len(self.points) < 3:
                raise ValueError(
                    "A polygon geofence requires at least 3 points"
                )

            if (
                self.center_latitude is not None
                or self.center_longitude is not None
                or self.radius_meters is not None
            ):
                raise ValueError(
                    "Circle fields are not allowed for a polygon geofence"
                )

        return self


class GeofenceUpdate(BaseModel):
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )

    description: str | None = Field(
        default=None,
        max_length=1000,
    )

    boundary_type: Literal["CIRCLE", "POLYGON"] | None = None

    center_latitude: float | None = Field(
        default=None,
        ge=-90,
        le=90,
    )

    center_longitude: float | None = Field(
        default=None,
        ge=-180,
        le=180,
    )

    radius_meters: float | None = Field(
        default=None,
        gt=0,
    )

    points: list[GeofencePointCreate] | None = None


class GeofencePointResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    geofence_id: int
    latitude: float
    longitude: float
    point_order: int
    created_at: datetime
    updated_at: datetime


class GeofenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    boundary_type: str
    center_latitude: float | None
    center_longitude: float | None
    radius_meters: float | None
    is_active: bool
    created_by: int
    created_at: datetime
    updated_at: datetime
    points: list[GeofencePointResponse]


class GeofenceListResponse(BaseModel):
    items: list[GeofenceResponse]
    total: int
    page: int
    page_size: int
    total_pages: int