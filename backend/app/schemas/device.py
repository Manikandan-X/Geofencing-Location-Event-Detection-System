from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DeviceCreate(BaseModel):
    user_id: int = Field(gt=0)
    device_identifier: str = Field(
        min_length=1,
        max_length=255,
    )
    name: str = Field(
        min_length=1,
        max_length=100,
    )


class DeviceUpdate(BaseModel):
    user_id: int | None = Field(
        default=None,
        gt=0,
    )
    device_identifier: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
    )
    name: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
    )


class DeviceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    device_identifier: str
    name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class DeviceListResponse(BaseModel):
    items: list[DeviceResponse]
    total: int
    page: int
    page_size: int
    total_pages: int