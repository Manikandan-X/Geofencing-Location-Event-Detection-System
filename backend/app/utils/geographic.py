from math import atan2, cos, radians, sin, sqrt


EARTH_RADIUS_METERS = 6_371_000


def calculate_distance_meters(
    latitude1: float,
    longitude1: float,
    latitude2: float,
    longitude2: float,
) -> float:
    lat1 = radians(latitude1)
    lat2 = radians(latitude2)

    delta_lat = radians(latitude2 - latitude1)
    delta_lon = radians(longitude2 - longitude1)

    a = (
        sin(delta_lat / 2) ** 2
        + cos(lat1)
        * cos(lat2)
        * sin(delta_lon / 2) ** 2
    )

    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return EARTH_RADIUS_METERS * c


def is_point_inside_circle(
    latitude: float,
    longitude: float,
    center_latitude: float,
    center_longitude: float,
    radius_meters: float,
) -> bool:
    distance = calculate_distance_meters(
        latitude1=latitude,
        longitude1=longitude,
        latitude2=center_latitude,
        longitude2=center_longitude,
    )

    return distance <= radius_meters


def get_circle_location_state(
    latitude: float,
    longitude: float,
    center_latitude: float,
    center_longitude: float,
    radius_meters: float,
    accuracy_meters: float | None,
) -> str:
    """
    Determine whether a location is clearly inside, clearly outside,
    or uncertain because of GPS accuracy.
    """

    distance = calculate_distance_meters(
        latitude1=latitude,
        longitude1=longitude,
        latitude2=center_latitude,
        longitude2=center_longitude,
    )

    # If GPS accuracy is unavailable, use normal detection.
    if accuracy_meters is None:
        return (
            "INSIDE"
            if distance <= radius_meters
            else "OUTSIDE"
        )

    # Clearly inside the geofence.
    if distance + accuracy_meters < radius_meters:
        return "INSIDE"

    # Clearly outside the geofence.
    if distance - accuracy_meters > radius_meters:
        return "OUTSIDE"

    # GPS uncertainty overlaps the boundary.
    return "UNCERTAIN"


def is_point_inside_polygon(
    latitude: float,
    longitude: float,
    polygon_points: list[tuple[float, float]],
) -> bool:
    if len(polygon_points) < 3:
        return False

    inside = False

    j = len(polygon_points) - 1

    for i in range(len(polygon_points)):
        latitude_i, longitude_i = polygon_points[i]
        latitude_j, longitude_j = polygon_points[j]

        intersects = (
            (longitude_i > longitude)
            != (longitude_j > longitude)
        ) and (
            latitude
            < (
                (latitude_j - latitude_i)
                * (longitude - longitude_i)
                / (longitude_j - longitude_i)
                + latitude_i
            )
        )

        if intersects:
            inside = not inside

        j = i

    return inside