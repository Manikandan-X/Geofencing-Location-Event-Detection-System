from sqlalchemy.orm import Session

from app.constants.geofence import GeofenceBoundaryType
from app.repositories.geofence_repository import GeofenceRepository
from app.utils.geographic import (
    get_circle_location_state,
    is_point_inside_polygon,
)


class GeographicDetectionService:

    def __init__(self):
        self.geofence_repository = GeofenceRepository()

    def detect_geofences(
        self,
        db: Session,
        latitude: float,
        longitude: float,
        accuracy_meters: float | None = None,
    ) -> list[dict]:

        geofences, _ = self.geofence_repository.get_all(
            db=db,
            page=1,
            page_size=100,
            is_active=True,
        )

        results = []

        for geofence in geofences:

            state = "OUTSIDE"
            is_inside = False
            is_uncertain = False

            if geofence.boundary_type == GeofenceBoundaryType.CIRCLE:

                state = get_circle_location_state(
                    latitude=latitude,
                    longitude=longitude,
                    center_latitude=geofence.center_latitude,
                    center_longitude=geofence.center_longitude,
                    radius_meters=geofence.radius_meters,
                    accuracy_meters=accuracy_meters,
                )

                is_inside = state == "INSIDE"
                is_uncertain = state == "UNCERTAIN"

            elif geofence.boundary_type == GeofenceBoundaryType.POLYGON:

                polygon_points = [
                    (
                        point.latitude,
                        point.longitude,
                    )
                    for point in geofence.points
                ]

                is_inside = is_point_inside_polygon(
                    latitude=latitude,
                    longitude=longitude,
                    polygon_points=polygon_points,
                )

                state = "INSIDE" if is_inside else "OUTSIDE"

            results.append(
                {
                    "geofence_id": geofence.id,
                    "geofence_name": geofence.name,
                    "boundary_type": geofence.boundary_type,
                    "is_inside": is_inside,
                    "is_uncertain": is_uncertain,
                    "state": state,
                }
            )

        return results