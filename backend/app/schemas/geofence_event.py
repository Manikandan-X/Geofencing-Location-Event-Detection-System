from datetime import datetime

from pydantic import BaseModel, ConfigDict


class GeofenceEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    device_id: int
    user_id: int
    geofence_id: int
    event_type: str
    latitude: float
    longitude: float
    recorded_at: datetime
    previous_state: str
    current_state: str
    created_at: datetime
    updated_at: datetime


class GeofenceEventListResponse(BaseModel):
    items: list[GeofenceEventResponse]
    total: int
    page: int
    page_size: int
    total_pages: int