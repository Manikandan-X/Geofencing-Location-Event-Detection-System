import pytest

from app.utils.geographic import (
    calculate_distance_meters,
    get_circle_location_state,
    is_point_inside_circle,
    is_point_inside_polygon,
)


class TestCalculateDistanceMeters:

    def test_same_location_returns_zero(self):
        distance = calculate_distance_meters(
            latitude1=11.0168,
            longitude1=76.9558,
            latitude2=11.0168,
            longitude2=76.9558,
        )

        assert distance == pytest.approx(0, abs=0.01)

    def test_different_locations_returns_positive_distance(self):
        distance = calculate_distance_meters(
            latitude1=11.0168,
            longitude1=76.9558,
            latitude2=11.0178,
            longitude2=76.9558,
        )

        assert distance > 0


class TestIsPointInsideCircle:

    def test_point_inside_circle(self):
        result = is_point_inside_circle(
            latitude=11.0168,
            longitude=76.9558,
            center_latitude=11.0168,
            center_longitude=76.9558,
            radius_meters=500,
        )

        assert result is True

    def test_point_outside_circle(self):
        result = is_point_inside_circle(
            latitude=11.0300,
            longitude=76.9800,
            center_latitude=11.0168,
            center_longitude=76.9558,
            radius_meters=500,
        )

        assert result is False

    def test_point_on_circle_boundary_is_inside(self):
        result = is_point_inside_circle(
            latitude=11.02128,
            longitude=76.9558,
            center_latitude=11.0168,
            center_longitude=76.9558,
            radius_meters=500,
        )

        assert result is True


class TestGetCircleLocationState:

    def test_accuracy_none_inside(self):
        result = get_circle_location_state(
            latitude=11.0168,
            longitude=76.9558,
            center_latitude=11.0168,
            center_longitude=76.9558,
            radius_meters=500,
            accuracy_meters=None,
        )

        assert result == "INSIDE"

    def test_accuracy_none_outside(self):
        result = get_circle_location_state(
            latitude=11.0300,
            longitude=76.9800,
            center_latitude=11.0168,
            center_longitude=76.9558,
            radius_meters=500,
            accuracy_meters=None,
        )

        assert result == "OUTSIDE"

    def test_clearly_inside_with_accuracy(self):
        result = get_circle_location_state(
            latitude=11.0168,
            longitude=76.9558,
            center_latitude=11.0168,
            center_longitude=76.9558,
            radius_meters=500,
            accuracy_meters=10,
        )

        assert result == "INSIDE"

    def test_clearly_outside_with_accuracy(self):
        result = get_circle_location_state(
            latitude=11.0300,
            longitude=76.9800,
            center_latitude=11.0168,
            center_longitude=76.9558,
            radius_meters=500,
            accuracy_meters=10,
        )

        assert result == "OUTSIDE"

    def test_uncertain_when_accuracy_overlaps_boundary(self):
        result = get_circle_location_state(
            latitude=11.0213,
            longitude=76.9558,
            center_latitude=11.0168,
            center_longitude=76.9558,
            radius_meters=500,
            accuracy_meters=100,
        )

        assert result == "UNCERTAIN"


class TestIsPointInsidePolygon:

    def test_point_inside_polygon(self):
        polygon = [
            (11.0100, 76.9500),
            (11.0100, 76.9600),
            (11.0200, 76.9600),
            (11.0200, 76.9500),
        ]

        result = is_point_inside_polygon(
            latitude=11.0150,
            longitude=76.9550,
            polygon_points=polygon,
        )

        assert result is True

    def test_point_outside_polygon(self):
        polygon = [
            (11.0100, 76.9500),
            (11.0100, 76.9600),
            (11.0200, 76.9600),
            (11.0200, 76.9500),
        ]

        result = is_point_inside_polygon(
            latitude=11.0300,
            longitude=76.9800,
            polygon_points=polygon,
        )

        assert result is False

    def test_polygon_with_less_than_three_points_returns_false(self):
        polygon = [
            (11.0100, 76.9500),
            (11.0200, 76.9600),
        ]

        result = is_point_inside_polygon(
            latitude=11.0150,
            longitude=76.9550,
            polygon_points=polygon,
        )

        assert result is False