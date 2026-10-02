from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class LocationEventCreate(BaseModel):
    device_id: int = Field(
        gt=0,
    )

    latitude: float = Field(
        ge=-90,
        le=90,
    )

    longitude: float = Field(
        ge=-180,
        le=180,
    )

    accuracy_meters: float | None = Field(
        default=None,
        gt=0,
    )

    recorded_at: datetime


class LocationEventResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
    )

    id: int
    device_id: int
    user_id: int
    latitude: float
    longitude: float
    accuracy_meters: float | None
    recorded_at: datetime
    created_at: datetime
    updated_at: datetime


class LocationEventListResponse(BaseModel):
    items: list[LocationEventResponse]
    total: int
    page: int
    page_size: int
    total_pages: int