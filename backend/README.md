# Geofencing & Location Event Detection System — Backend

A backend system built with **FastAPI** for managing geofences, registering devices, receiving GPS locations, detecting geofence state changes, and generating geofence events.

The system supports both **circular** and **polygon** geofences and automatically detects:

* ENTER
* EXIT
* INSIDE
* OUTSIDE state

GPS accuracy is also considered for circular geofences. When the GPS accuracy overlaps the geofence boundary, the location is treated as **UNCERTAIN** and no state transition event is generated.

---

## 1. Project Objective

The purpose of this system is to process device location data and determine whether a device is inside or outside configured geographical boundaries.

The backend provides APIs for:

* User authentication
* Role-based access control
* Device management
* Geofence management
* Location tracking
* Geofence event detection
* Event history
* Audit logging

The system is designed so that a client only needs to submit a `device_id` and location information.

The backend automatically:

1. Identifies the user who owns the device.
2. Saves the location.
3. Checks the location against active geofences.
4. Determines the current geographic state.
5. Compares the current state with the previous state.
6. Generates an ENTER, EXIT, or INSIDE event when appropriate.

---

# 2. Technologies

| Technology      | Purpose                                          |
| --------------- | ------------------------------------------------ |
| Python 3.12     | Programming language                             |
| FastAPI         | REST API framework                               |
| Pydantic        | Request/response validation                      |
| SQLAlchemy      | ORM and database operations                      |
| MySQL 8         | Relational database                              |
| Alembic         | Database migrations                              |
| Redis           | Distributed geofence locking/concurrency control |
| JWT             | Authentication                                   |
| Argon2          | Password hashing                                 |
| Docker          | Containerization                                 |
| Docker Compose  | Multi-container development                      |
| Pytest          | Unit testing                                     |
| Swagger/OpenAPI | API documentation and testing                    |
| Postman         | API testing                                      |

---

# 3. Backend Architecture

The backend follows a layered architecture.

```text
Client
  │
  ▼
FastAPI Router
  │
  ▼
Service Layer
  │
  ├──────────────► Geographic Detection
  │
  ├──────────────► Event Detection
  │
  ▼
Repository Layer
  │
  ▼
SQLAlchemy
  │
  ▼
MySQL
```

Supporting components:

```text
FastAPI
 ├── Authentication / JWT
 ├── RBAC
 ├── Services
 ├── Repositories
 ├── Geographic utilities
 ├── Audit logging
 └── Exception handling

Redis
 └── Geofence concurrency locking
```

---

# 4. Main Database Tables

The backend contains the following main tables:

```text
roles
users
devices
geofences
geofence_points
location_events
geofence_events
audit_logs
```

## Relationships

```text
User
 │
 └──< Device
        │
        └──< LocationEvent

Geofence
 │
 └──< GeofencePoint

Device + User + Geofence
          │
          ▼
    GeofenceEvent
```

A user can own multiple devices.

A device belongs to one user.

A location event belongs to a device and its user.

A location can be checked against multiple active geofences.

A geofence event records the relationship between:

* Device
* User
* Geofence
* Event type
* Previous state
* Current state
* Location
* Timestamp

---

# 5. Geofence Types

The system supports two types of geofences.

## Circle

A circle is defined using:

```text
center_latitude
center_longitude
radius_meters
```

Example:

```text
Center:
Latitude  = 11.0168
Longitude = 76.9558

Radius:
500 meters
```

## Polygon

A polygon is defined using multiple latitude/longitude points.

Example:

```text
Point 1
Point 2
Point 3
Point 4
```

At least three points are required.

---

# 6. Geofence Event Detection

The system uses state transitions.

```text
Previous State    Current State       Event
------------------------------------------------
OUTSIDE           OUTSIDE             No event
OUTSIDE           INSIDE              ENTER
INSIDE            INSIDE              INSIDE
INSIDE            OUTSIDE             EXIT
```

For example:

```text
Device outside
      │
      │ location update
      ▼
Inside geofence
      │
      ▼
ENTER event
```

Then:

```text
Device inside
      │
      │ location update
      ▼
Still inside
      │
      ▼
INSIDE event
```

Then:

```text
Device inside
      │
      │ location update
      ▼
Outside geofence
      │
      ▼
EXIT event
```

Repeated OUTSIDE locations do not create unnecessary events.

---

# 7. GPS Accuracy Handling

Location requests can contain:

```text
accuracy_meters
```

For circular geofences, the backend considers the GPS accuracy when determining the state.

### Clearly inside

```text
distance + accuracy < radius
```

Result:

```text
INSIDE
```

### Clearly outside

```text
distance - accuracy > radius
```

Result:

```text
OUTSIDE
```

### Boundary uncertainty

If GPS uncertainty overlaps the geofence boundary:

```text
UNCERTAIN
```

No ENTER or EXIT event is generated.

The previous known state is preserved until a sufficiently clear location is received.

---

# 8. Location Processing Flow

The main location endpoint is:

```text
POST /locations
```

The request contains:

```json
{
  "device_id": 1,
  "latitude": 11.0168,
  "longitude": 76.9558,
  "accuracy_meters": 8.5,
  "recorded_at": "2026-09-29T10:00:00Z"
}
```

The backend processing flow is:

```text
POST /locations
       │
       ▼
Validate request
       │
       ▼
Find Device
       │
       ▼
Find device owner
       │
       ▼
Save LocationEvent
       │
       ▼
Get all active geofences
       │
       ▼
Check location against each geofence
       │
       ▼
Determine INSIDE / OUTSIDE / UNCERTAIN
       │
       ▼
Compare with previous state
       │
       ▼
Create GeofenceEvent if required
       │
       ▼
Commit transaction
```

---

# 9. Device and Geofence Relationship

The client does not need to send `user_id` or `geofence_id` when submitting a location.

For example:

```json
{
  "device_id": 1,
  "latitude": 11.0168,
  "longitude": 76.9558,
  "accuracy_meters": 8.5,
  "recorded_at": "2026-09-29T10:00:00Z"
}
```

The backend uses `device_id` to find the device:

```text
Device
----------------
id       = 1
user_id  = 1
```

Therefore:

```text
device_id = 1
       │
       ▼
user_id = 1
```

The backend then checks the location against all active geofences.

For example:

```text
Location
   │
   ├── Geofence 1 → INSIDE
   ├── Geofence 2 → OUTSIDE
   └── Geofence 3 → OUTSIDE
```

The corresponding `geofence_id` is automatically included when creating the geofence event.

---

# 10. Filtering Geofence Events

Geofence event history can be filtered using:

```text
GET /geofence-events
```

For a specific geofence:

```text
GET /geofence-events?geofence_id=1
```

For a specific device:

```text
GET /geofence-events?device_id=1
```

For a specific event type:

```text
GET /geofence-events?event_type=ENTER
```

Filters can also be combined:

```text
GET /geofence-events?geofence_id=1&device_id=1&event_type=ENTER
```

---

# 11. Authentication

The backend uses JWT-based authentication.

Authentication flow:

```text
Register
   │
   ▼
Login
   │
   ▼
JWT Access Token
   │
   ▼
Authorization Header
   │
   ▼
Protected API
```

The token contains information such as:

```text
sub
role
exp
```

Passwords are hashed using **Argon2**.

---

# 12. Roles

The system currently supports:

```text
Admin
User
```

## Admin

Admins can manage administrative resources such as:

* Users
* Devices
* Geofences
* Audit logs

## User

Normal users can access resources belonging to them according to the implemented authorization rules.

---

# 13. API Endpoints

## Authentication

```text
POST /auth/register
POST /auth/login
GET  /auth/me
PUT  /auth/me
PUT  /auth/me/password
```

## Users

```text
POST   /users
GET    /users
GET    /users/{user_id}
PUT    /users/{user_id}
PATCH  /users/{user_id}/activate
PATCH  /users/{user_id}/deactivate
PATCH  /users/{user_id}/role
DELETE /users/{user_id}
```

## Devices

```text
POST   /devices
GET    /devices
GET    /devices/{device_id}
PUT    /devices/{device_id}
PATCH  /devices/{device_id}/activate
PATCH  /devices/{device_id}/deactivate
DELETE /devices/{device_id}
```

## Geofences

```text
POST   /geofences
GET    /geofences
GET    /geofences/{geofence_id}
PUT    /geofences/{geofence_id}
PATCH  /geofences/{geofence_id}/enable
PATCH  /geofences/{geofence_id}/disable
DELETE /geofences/{geofence_id}
```

## Location Events

```text
POST /locations
GET  /locations
GET  /locations/latest/{device_id}
GET  /locations/{location_event_id}
```

## Geofence Events

```text
GET /geofence-events
GET /geofence-events/{geofence_event_id}
```

## Audit Logs

```text
GET /audit-logs
GET /audit-logs/all
```

---

# 14. Project Structure

```text
backend/
│
├── app/
│   ├── constants/
│   │   ├── audit.py
│   │   └── geofence.py
│   │
│   ├── core/
│   │   ├── config.py
│   │   ├── exceptions.py
│   │   ├── logging.py
│   │   ├── redis.py
│   │   └── security.py
│   │
│   ├── db/
│   │   ├── base.py
│   │   ├── base_class.py
│   │   ├── seed.py
│   │   └── session.py
│   │
│   ├── dependencies/
│   │   └── auth.py
│   │
│   ├── models/
│   │   ├── audit_log.py
│   │   ├── device.py
│   │   ├── geofence.py
│   │   ├── geofence_event.py
│   │   ├── geofence_point.py
│   │   ├── location_event.py
│   │   ├── role.py
│   │   └── user.py
│   │
│   ├── repositories/
│   │   ├── audit_log_repository.py
│   │   ├── device_repository.py
│   │   ├── geofence_event_repository.py
│   │   ├── geofence_repository.py
│   │   ├── location_event_repository.py
│   │   └── user_repository.py
│   │
│   ├── routers/
│   │   ├── audit_log.py
│   │   ├── auth.py
│   │   ├── device.py
│   │   ├── geofence.py
│   │   ├── geofence_event.py
│   │   ├── location_event.py
│   │   └── user.py
│   │
│   ├── schemas/
│   │   ├── audit_log.py
│   │   ├── auth.py
│   │   ├── common.py
│   │   ├── device.py
│   │   ├── geofence.py
│   │   ├── geofence_event.py
│   │   ├── location_event.py
│   │   └── user.py
│   │
│   ├── services/
│   │   ├── audit_log_service.py
│   │   ├── auth_service.py
│   │   ├── device_service.py
│   │   ├── event_detection_service.py
│   │   ├── geographic_detection_service.py
│   │   ├── geofence_event_service.py
│   │   ├── geofence_service.py
│   │   ├── location_event_service.py
│   │   └── user_service.py
│   │
│   ├── utils/
│   │   └── geographic.py
│   │
│   └── main.py
│
├── alembic/
│   ├── versions/
│   ├── env.py
│   └── script.py.mako
│
├── tests/
│   ├── test_geographic.py
│   └── test_event_detection_service.py
│
├── .env
├── .gitignore
├── alembic.ini
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── README.md
```

---

# 15. Environment Configuration

Create a `.env` file in the backend root directory.

Example:

```env
APP_NAME=Geofencing Location Event Detection System
APP_VERSION=1.0.0
DEBUG=True

MYSQL_HOST=mysql
MYSQL_PORT=3306
MYSQL_DATABASE=geofence_db
MYSQL_USER=geofence_user
MYSQL_PASSWORD=your_password
MYSQL_ROOT_PASSWORD=your_root_password
DATABASE_URL=mysql+pymysql://geofence_user:your_password@mysql:3306/geofence_db

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0
REDIS_URL=redis://redis:6379/0
REDIS_CACHE_TTL=300

JWT_SECRET_KEY=change-this-to-a-new-geofence-secret-key
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
```

Do not commit real passwords or JWT secrets to Git.

---

# 16. Docker Setup

The backend uses Docker Compose with separate containers for:

```text
geofence_backend
geofence_mysql
geofence_redis
```

The backend runs inside Docker on port `8000`.

The host exposes it on:

```text
localhost:8001
```

MySQL is exposed on:

```text
localhost:3308
```

Redis is exposed on:

```text
localhost:6380
```

The ports inside the Docker network remain:

```text
Backend → 8000
MySQL   → 3306
Redis   → 6379
```

---

# 17. Start the Backend

Open PowerShell in the backend directory:

```powershell
cd "C:\Projects\Geofencing & Location Event Detection System\backend"
```

Start the containers:

```powershell
docker compose up -d
```

Check running containers:

```powershell
docker compose ps
```

View backend logs:

```powershell
docker compose logs -f backend
```

---

# 18. Rebuild After Changing Requirements

If `requirements.txt` is changed:

```powershell
docker compose up -d --build
```

Or:

```powershell
docker compose build backend
docker compose up -d
```

Restart only the backend:

```powershell
docker compose restart backend
```

Do not use `docker compose down -v` during normal development because it removes Docker volumes and can delete the MySQL data stored in those volumes.

---

# 19. Database Migrations

The project uses Alembic for database schema management.

Check current migration:

```powershell
docker compose exec backend alembic current
```

Create a migration after changing SQLAlchemy models:

```powershell
docker compose exec backend alembic revision --autogenerate -m "description of change"
```

Apply migrations:

```powershell
docker compose exec backend alembic upgrade head
```

Check migration history:

```powershell
docker compose exec backend alembic history
```

---

# 20. Database Seeding

The project provides role seeding for the default roles:

```text
Admin
User
```

Run the seed script using:

```powershell
docker compose exec backend python -m app.db.seed
```

---

# 21. Swagger API Documentation

After starting the backend, open:

```text
http://localhost:8001/docs
```

Swagger provides interactive API documentation.

Alternative OpenAPI JSON:

```text
http://localhost:8001/openapi.json
```

---

# 22. Basic API Testing Flow

A typical manual testing flow is:

```text
1. Register user
       ↓
2. Login
       ↓
3. Copy JWT access token
       ↓
4. Authorize protected endpoints
       ↓
5. Create device
       ↓
6. Create geofence
       ↓
7. Send location
       ↓
8. Check generated geofence events
```

Example:

```text
POST /locations
```

Request:

```json
{
  "device_id": 1,
  "latitude": 11.0168,
  "longitude": 76.9558,
  "accuracy_meters": 8.5,
  "recorded_at": "2026-09-29T10:00:00Z"
}
```

Then check:

```text
GET /geofence-events
```

Or filter for a particular geofence:

```text
GET /geofence-events?geofence_id=1
```

---

# 23. Running Unit Tests

The project uses `pytest`.

Run all tests:

```powershell
docker compose exec backend pytest -v
```

Run the geographic tests:

```powershell
docker compose exec backend pytest tests/test_geographic.py -v
```

Run event detection tests:

```powershell
docker compose exec backend pytest tests/test_event_detection_service.py -v
```

Run tests with coverage:

```powershell
docker compose exec backend pytest --cov=app --cov-report=term-missing
```

---

# 24. Current Unit Test Coverage

The current unit tests cover the core geofencing logic.

### Geographic utilities

```text
Distance calculation
Circle inside/outside
Circle boundary
GPS accuracy handling
Polygon inside/outside
Invalid polygon
```

### Event detection

```text
OUTSIDE → INSIDE
INSIDE → INSIDE
INSIDE → OUTSIDE
OUTSIDE → OUTSIDE
UNCERTAIN
```

Additional schema, service, integration, and security tests can be added as the project testing phase continues.

---

# 25. Exception Handling

The backend provides centralized exception handling.

Custom exceptions include:

```text
BadRequestException       400
UnauthorizedException    401
ForbiddenException       403
NotFoundException        404
ConflictException        409
```

Validation errors are handled through FastAPI/Pydantic validation.

Database errors and unexpected application errors are also handled centrally.

---

# 26. Audit Logging

Audit logs are used for important administrative/business actions such as:

```text
USER_CREATED
USER_UPDATED
USER_ROLE_CHANGED
USER_ACTIVATED
USER_DEACTIVATED
USER_DELETED

GEOFENCE_CREATED
GEOFENCE_UPDATED
GEOFENCE_ENABLED
GEOFENCE_DISABLED
GEOFENCE_DELETED

DEVICE_CREATED
DEVICE_UPDATED
DEVICE_ACTIVATED
DEVICE_DEACTIVATED
DEVICE_DELETED
```

Regular GPS location updates and geofence state events are operational data and are stored in:

```text
location_events
geofence_events
```

They are not written to the audit log for every location update.

---

# 27. Redis Usage

Redis is used for geofence concurrency control.

It provides a distributed lock so that simultaneous location processing can be controlled when necessary.

Redis is not used as the permanent source of truth for geofence state.

Permanent data is stored in MySQL.

```text
MySQL
 └── Permanent application data

Redis
 └── Temporary/concurrency control
```

---

# 28. Important Design Principles

### Repository Layer

Responsible for database operations.

```text
Repository
    ↓
SQLAlchemy
    ↓
MySQL
```

### Service Layer

Responsible for business logic.

Examples:

```text
GeofenceService
LocationEventService
GeographicDetectionService
EventDetectionService
DeviceService
UserService
```

### Router Layer

Responsible for HTTP/API handling.

```text
Router
   ↓
Service
   ↓
Repository
```

### Schema Layer

Responsible for validating API input and formatting API responses.

### Model Layer

Responsible for SQLAlchemy database models.

---

# 29. Security

The backend implements:

* JWT authentication
* Password hashing with Argon2
* Role-based authorization
* Active/inactive user checks
* Active/inactive device checks
* Device ownership validation
* User ownership validation
* Input validation
* Centralized exception handling

Production deployments should use:

* Strong JWT secret
* Strong database passwords
* HTTPS
* Secure environment variables/secrets
* Debug mode disabled

---

# 30. Development Commands

Start:

```powershell
docker compose up -d
```

Start with rebuild:

```powershell
docker compose up -d --build
```

Stop containers without removing volumes:

```powershell
docker compose down
```

Restart backend:

```powershell
docker compose restart backend
```

View backend logs:

```powershell
docker compose logs -f backend
```

View all container status:

```powershell
docker compose ps
```

Open backend shell:

```powershell
docker compose exec backend bash
```

Run Alembic:

```powershell
docker compose exec backend alembic upgrade head
```

Run tests:

```powershell
docker compose exec backend pytest -v
```

---

# 31. Backend URL

Development API:

```text
http://localhost:8001
```

Swagger:

```text
http://localhost:8001/docs
```

OpenAPI:

```text
http://localhost:8001/openapi.json
```

---

# 32. Project Status

Current backend implementation includes:

* [x] FastAPI setup
* [x] Docker setup
* [x] MySQL setup
* [x] Redis setup
* [x] Alembic migrations
* [x] Authentication
* [x] JWT authorization
* [x] Role-based access control
* [x] User management
* [x] Device management
* [x] Circle geofences
* [x] Polygon geofences
* [x] Geofence enable/disable
* [x] Location tracking
* [x] Geographic detection
* [x] GPS accuracy handling
* [x] ENTER detection
* [x] EXIT detection
* [x] INSIDE detection
* [x] Duplicate OUTSIDE prevention
* [x] Multiple geofence detection
* [x] Geofence event history
* [x] Geofence event filtering
* [x] Audit logging
* [x] Geographic unit tests
* [x] Event detection unit tests
* [ ] Additional schema tests
* [ ] Additional service tests
* [ ] Integration/API tests
* [ ] Security/RBAC tests

---

# 33. Summary

The Geofencing & Location Event Detection System backend receives GPS locations from registered devices and automatically determines their relationship with active geographical boundaries.

The core processing pipeline is:

```text
Device
   │
   ▼
Location
   │
   ▼
Active Geofences
   │
   ▼
Geographic Detection
   │
   ├── INSIDE
   ├── OUTSIDE
   └── UNCERTAIN
   │
   ▼
State Comparison
   │
   ├── ENTER
   ├── EXIT
   └── INSIDE
   │
   ▼
Geofence Event History
```

The backend is containerized using Docker and provides interactive Swagger documentation for API testing.
