from unittest.mock import MagicMock

from app.constants.geofence import GeofenceEventType
from app.services.event_detection_service import EventDetectionService


class TestDetermineEventType:

    def setup_method(self):
        self.service = EventDetectionService()

    def test_outside_to_inside_returns_enter(self):
        result = self.service._determine_event_type(
            previous_state=GeofenceEventType.OUTSIDE,
            current_state=GeofenceEventType.INSIDE,
        )

        assert result == GeofenceEventType.ENTER

    def test_inside_to_inside_returns_inside(self):
        result = self.service._determine_event_type(
            previous_state=GeofenceEventType.INSIDE,
            current_state=GeofenceEventType.INSIDE,
        )

        assert result == GeofenceEventType.INSIDE

    def test_inside_to_outside_returns_exit(self):
        result = self.service._determine_event_type(
            previous_state=GeofenceEventType.INSIDE,
            current_state=GeofenceEventType.OUTSIDE,
        )

        assert result == GeofenceEventType.EXIT

    def test_outside_to_outside_returns_none(self):
        result = self.service._determine_event_type(
            previous_state=GeofenceEventType.OUTSIDE,
            current_state=GeofenceEventType.OUTSIDE,
        )

        assert result is None


class TestDetectAndCreateEvents:

    def setup_method(self):
        self.service = EventDetectionService()

        self.service.geofence_event_repository = MagicMock()

        self.db = MagicMock()

    def test_outside_to_inside_creates_enter_event(self):
        self.service.geofence_event_repository.get_latest_for_device_and_geofence.return_value = None

        detection_results = [
            {
                "geofence_id": 1,
                "state": GeofenceEventType.INSIDE,
            }
        ]

        events = self.service.detect_and_create_events(
            db=self.db,
            device_id=1,
            user_id=1,
            latitude=11.0168,
            longitude=76.9558,
            recorded_at="2026-09-29T10:00:00",
            detection_results=detection_results,
        )

        assert len(events) == 1

        event = events[0]

        assert event.device_id == 1
        assert event.user_id == 1
        assert event.geofence_id == 1
        assert event.event_type == GeofenceEventType.ENTER
        assert event.previous_state == GeofenceEventType.OUTSIDE
        assert event.current_state == GeofenceEventType.INSIDE

        self.service.geofence_event_repository.create.assert_called_once()

    def test_inside_to_inside_creates_inside_event(self):
        latest_event = MagicMock()
        latest_event.current_state = GeofenceEventType.INSIDE

        self.service.geofence_event_repository.get_latest_for_device_and_geofence.return_value = latest_event

        detection_results = [
            {
                "geofence_id": 1,
                "state": GeofenceEventType.INSIDE,
            }
        ]

        events = self.service.detect_and_create_events(
            db=self.db,
            device_id=1,
            user_id=1,
            latitude=11.0170,
            longitude=76.9560,
            recorded_at="2026-09-29T10:05:00",
            detection_results=detection_results,
        )

        assert len(events) == 1

        event = events[0]

        assert event.event_type == GeofenceEventType.INSIDE
        assert event.previous_state == GeofenceEventType.INSIDE
        assert event.current_state == GeofenceEventType.INSIDE

        self.service.geofence_event_repository.create.assert_called_once()

    def test_inside_to_outside_creates_exit_event(self):
        latest_event = MagicMock()
        latest_event.current_state = GeofenceEventType.INSIDE

        self.service.geofence_event_repository.get_latest_for_device_and_geofence.return_value = latest_event

        detection_results = [
            {
                "geofence_id": 1,
                "state": GeofenceEventType.OUTSIDE,
            }
        ]

        events = self.service.detect_and_create_events(
            db=self.db,
            device_id=1,
            user_id=1,
            latitude=11.0300,
            longitude=76.9800,
            recorded_at="2026-09-29T10:10:00",
            detection_results=detection_results,
        )

        assert len(events) == 1

        event = events[0]

        assert event.event_type == GeofenceEventType.EXIT
        assert event.previous_state == GeofenceEventType.INSIDE
        assert event.current_state == GeofenceEventType.OUTSIDE

        self.service.geofence_event_repository.create.assert_called_once()

    def test_outside_to_outside_does_not_create_event(self):
        latest_event = MagicMock()
        latest_event.current_state = GeofenceEventType.OUTSIDE

        self.service.geofence_event_repository.get_latest_for_device_and_geofence.return_value = latest_event

        detection_results = [
            {
                "geofence_id": 1,
                "state": GeofenceEventType.OUTSIDE,
            }
        ]

        events = self.service.detect_and_create_events(
            db=self.db,
            device_id=1,
            user_id=1,
            latitude=11.0300,
            longitude=76.9800,
            recorded_at="2026-09-29T10:15:00",
            detection_results=detection_results,
        )

        assert events == []

        self.service.geofence_event_repository.create.assert_not_called()

    def test_uncertain_does_not_create_event(self):
        latest_event = MagicMock()
        latest_event.current_state = GeofenceEventType.INSIDE

        self.service.geofence_event_repository.get_latest_for_device_and_geofence.return_value = latest_event

        detection_results = [
            {
                "geofence_id": 1,
                "state": "UNCERTAIN",
            }
        ]

        events = self.service.detect_and_create_events(
            db=self.db,
            device_id=1,
            user_id=1,
            latitude=11.0210,
            longitude=76.9558,
            recorded_at="2026-09-29T10:20:00",
            detection_results=detection_results,
        )

        assert events == []

        self.service.geofence_event_repository.create.assert_not_called()

        self.service.geofence_event_repository.get_latest_for_device_and_geofence.assert_not_called()