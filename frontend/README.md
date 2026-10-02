# Meridian: Geofence Console (Frontend)

Web console for the **Geofencing & Location Event Detection System**. It talks to your FastAPI backend and covers geofence management, device and user management, location submission, event history, a live map, audit logs and profile management.

**Stack:** React 18 · TypeScript · Vite 6 · Material UI v6 · Leaflet / OpenStreetMap · Axios · TanStack React Query · React Router 6

---

## Contents

1. [Prerequisites](#1-prerequisites)
2. [Backend setup (required first)](#2-backend-setup-required-first)
3. [Frontend setup](#3-frontend-setup)
4. [Create your first admin](#4-create-your-first-admin)
5. [Scripts](#5-scripts)
6. [Environment variables](#6-environment-variables)
7. [Using the app](#7-using-the-app)
8. [Pages, roles and API mapping](#8-pages-roles-and-api-mapping)
9. [How event detection is shown in the UI](#9-how-event-detection-is-shown-in-the-ui)
10. [Project structure](#10-project-structure)
11. [Production build and deployment](#11-production-build-and-deployment)
12. [Troubleshooting](#12-troubleshooting)
13. [Known backend limitations](#13-known-backend-limitations)

---

## 1. Prerequisites

| Tool | Version | Notes |
|---|---|---|
| Node.js | 18.18+ (20 or 22 recommended) | `node -v` |
| npm | 9+ | ships with Node |
| Python | 3.12 | for the backend |
| MySQL | 8.x | backend database |
| Redis | 6+ | the backend settings require Redis values (see below) |

Optional: MySQL Workbench, Postman, Docker.

---

## 2. Backend setup (required first)

The frontend is only useful with the API running. From your backend project root (the folder that contains `app/`):

### 2.1 Virtual environment and dependencies

```bash
python -m venv .venv

# macOS / Linux
source .venv/bin/activate
# Windows (PowerShell)
.venv\Scripts\Activate.ps1

pip install -r requirements.txt
```

### 2.2 Backend `.env`

`app/core/config.py` requires **all** of these keys. Missing ones stop the app from starting.

```env
APP_NAME=Geofencing System
APP_VERSION=1.0.0
DEBUG=true

MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=geofence_db
MYSQL_USER=geofence_user
MYSQL_PASSWORD=change_me
MYSQL_ROOT_PASSWORD=change_me_root

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_URL=redis://localhost:6379/0
REDIS_CACHE_TTL=300

JWT_SECRET_KEY=replace-with-a-long-random-string
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60

DATABASE_URL=mysql+pymysql://geofence_user:change_me@localhost:3306/geofence_db
```

Adjust the `DATABASE_URL` driver prefix (`mysql+pymysql`, `mysql+mysqlconnector`, and so on) to whichever driver is in your `requirements.txt`.

### 2.3 Create the database

```sql
CREATE DATABASE geofence_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'geofence_user'@'%' IDENTIFIED BY 'change_me';
GRANT ALL PRIVILEGES ON geofence_db.* TO 'geofence_user'@'%';
FLUSH PRIVILEGES;
```

### 2.4 Run migrations and seed roles

```bash
alembic upgrade head          # creates the tables (use your project's Alembic setup)
python -m app.db.seed         # creates the roles: Admin (id 1) and User (id 2)
```

> The seed script must run **before** anyone registers. `/auth/register` assigns the `User` role and fails with "Default User role not found" if roles are missing.

### 2.5 Start Redis and the API

```bash
redis-server                                  # or: docker run -p 6379:6379 redis:7
uvicorn app.main:app --reload --port 8000
```

Check it:

- Health: <http://localhost:8000/health>
- Swagger UI: <http://localhost:8000/docs>

### 2.6 CORS

`app/main.py` allows only these browser origins:

```
http://localhost:5174
http://127.0.0.1:5174
```

The frontend dev server is pinned to port **5174** for this reason. If you serve the frontend from another host or port, add it to `allow_origins` in `main.py`.

---

## 3. Frontend setup

```bash
# 1. Go into the project
cd frontend

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.example .env          # Windows: copy .env.example .env

# 4. Start the dev server
npm run dev
```

Open **<http://localhost:5174>**.

`vite.config.ts` uses `strictPort: true`. If something else is using 5174, Vite will exit instead of choosing a different port, which would break CORS. Free the port or update the backend CORS list.

---

## 4. Create your first admin

Registration always creates a regular **User**. Promote your first account to Admin once:

1. Open <http://localhost:5174/register> and create your account.
2. In MySQL Workbench (or the `mysql` CLI), run:

```sql
UPDATE users SET role_id = 1 WHERE email = 'you@example.com';
```

3. **Sign out and sign in again.** The role is read from the JWT, so an existing token still says "User".

From then on, an admin can create further users and change roles from the **Users** page.

> `role_id = 1` assumes the default seed order (Admin first, then User). Confirm with `SELECT id, name FROM roles;`. If your ids differ, edit `ROLE_NAMES` in `src/lib/auth-utils.ts`.

---

## 5. Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload on port 5174 |
| `npm run build` | Type-check (`tsc -b`) and build to `dist/` |
| `npm run preview` | Serve the production build on port 5174 |

---

## 6. Environment variables

Defined in `.env` (copied from `.env.example`). Vite only exposes variables prefixed with `VITE_`.

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Base URL of the FastAPI server. No trailing slash and **no `/api` suffix**: the routers are mounted at the root (`/auth`, `/users`, `/geofences`, and so on). Do **not** point this at `/docs`. |

Restart `npm run dev` after changing `.env`.

---

## 7. Using the app

A suggested first run, to see everything working end to end:

1. **Sign in** as the admin.
2. **Geofences → New geofence.**
   - *Circle:* click the map to place the centre, then set the radius with the slider or the number field.
   - *Polygon:* click at least 3 corners in order. Drag a corner to move it. Use Undo or Clear to correct mistakes.
   - Use the search box or the "use my location" button to jump to an area.
3. **Devices → New device.** Assign it to **yourself** if you want to send test locations from the UI, because the API only accepts locations from the device's owner.
4. **Locations.** Pick the device, click the map (or type coordinates), optionally set GPS accuracy, and press **Send location**. The panel shows what the server detected, and a preview lists INSIDE / OUTSIDE / UNCERTAIN per enabled geofence before you send.
5. Send a second location **outside** the geofence to produce an **Exit**, and a third **inside** again to produce an **Enter**.
6. **Events** shows the history with previous state → current state. **Live map** shows geofences, the latest device position, event markers and the location trail.
7. **Audit logs** records every geofence, device and user change. **Profile** lets you edit your details and change your password.

---

## 8. Pages, roles and API mapping

| Route | Page | Access | Endpoints used |
|---|---|---|---|
| `/login` | Sign in | public | `POST /auth/login`, `GET /auth/me` |
| `/register` | Create account | public | `POST /auth/register` |
| `/` | Dashboard | signed in | `/geofence-events`, `/locations`, plus `/geofences`, `/devices`, `/users` for admins |
| `/map` | Live map | signed in (geofence shapes: admin) | `/geofences`, `/geofence-events`, `/locations` |
| `/geofences` | Geofences + editor | **admin** | `GET/POST/PUT/DELETE /geofences`, `PATCH /geofences/{id}/enable` and `/disable` |
| `/devices` | Devices | **admin** | `GET/POST/PUT/DELETE /devices`, `PATCH /devices/{id}/activate` and `/deactivate` |
| `/locations` | Send and review locations | signed in | `POST /locations`, `GET /locations` |
| `/events` | Event history | signed in (own events unless admin) | `GET /geofence-events` |
| `/users` | User management | **admin** | `GET/POST/PUT/DELETE /users`, `PATCH /users/{id}/role`, `/activate`, `/deactivate` |
| `/audit-logs` | Audit logs | signed in (own) / admin (all) | `GET /audit-logs`, `GET /audit-logs/all` |
| `/profile` | Profile | signed in | `PUT /auth/me`, `PUT /auth/me/password`, `GET /audit-logs` |

Non-admins don't see the admin menu entries, and visiting those URLs directly shows an "Admins only" page. The backend enforces the same rules.

---

## 9. How event detection is shown in the UI

The UI mirrors the backend (`event_detection_service.py`, `utils/geographic.py`):

| Previous state | Current reading | Event created |
|---|---|---|
| Outside (or no history) | Inside | **Enter** |
| Inside | Outside | **Exit** |
| Inside | Inside | **Inside** |
| Outside | Outside | none (no duplicate events) |

- **GPS accuracy (circles):** a reading is *uncertain* when the accuracy radius overlaps the circle edge (`|distance − radius| ≤ accuracy`). Uncertain readings are ignored. They create no event and don't change the stored state, so jitter on the boundary can't cause false enters or exits.
- **Polygons** use a ray-casting point-in-polygon test.
- **Multiple geofences:** each geofence is evaluated independently for every location, so one reading can produce several events.
- **Disabled geofences** are skipped.
- The preview on the Locations page is a client-side estimate. The server's result is final.

Map colours: circle = ultramarine, polygon = marigold, disabled = grey dashed. Event markers are green (enter), red (exit), blue (inside) and grey (outside).

---

## 10. Project structure

```
frontend/
├─ index.html
├─ package.json
├─ vite.config.ts            # port 5174, strictPort
├─ tsconfig.json
├─ .env.example
├─ public/favicon.svg
└─ src/
   ├─ main.tsx               # providers: theme, React Query, toast, auth, router
   ├─ App.tsx                # routes, auth guard, admin-only guard
   ├─ theme.ts               # Meridian design tokens + MUI theme
   ├─ index.css              # Leaflet, marker and login-art styles
   ├─ api/
   │  ├─ types.ts            # TypeScript mirror of the Pydantic schemas
   │  ├─ client.ts           # Axios instance, bearer token, 401 handling, error parsing
   │  └─ endpoints.ts        # one function per backend endpoint
   ├─ auth/AuthContext.tsx   # session state; token in sessionStorage; role from JWT
   ├─ components/
   │  ├─ Layout.tsx          # sidebar / mobile drawer
   │  ├─ MapParts.tsx        # base map, geofence layers, markers
   │  ├─ common.tsx          # page header, tables helpers, chips, dialogs, pager
   │  ├─ Toast.tsx
   │  └─ Brand.tsx
   ├─ lib/
   │  ├─ geo.ts              # distance, point-in-polygon, state preview
   │  ├─ format.ts           # dates, coordinates, distances
   │  ├─ hooks.ts            # user / device / geofence lookups for names
   │  └─ auth-utils.ts       # JWT role decoding, role id → name map
   └─ pages/                 # one file per screen (+ GeofenceEditor)
```

---

## 11. Production build and deployment

```bash
npm run build        # outputs static files to dist/
npm run preview      # quick local check on http://localhost:5174
```

`dist/` is a static single-page app. For deployment:

1. Set `VITE_API_BASE_URL` to your public API URL **before** building (the value is baked in at build time).
2. Add your production frontend origin to `allow_origins` in the backend `main.py`.
3. Serve `dist/` from any static host and rewrite all unknown paths to `index.html`, since the app uses client-side routing.

Nginx example:

```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;
  location / { try_files $uri /index.html; }
}
```

Docker example (`Dockerfile` for the frontend):

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
RUN printf 'server { listen 80; root /usr/share/nginx/html; location / { try_files $uri /index.html; } }' > /etc/nginx/conf.d/default.conf
```

```bash
docker build -t meridian-frontend --build-arg VITE_API_BASE_URL=https://api.example.com .
docker run -p 8080:80 meridian-frontend
```

---

## 12. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| "Cannot reach the server" toast or banner | API isn't running, or `VITE_API_BASE_URL` is wrong. Open `<API URL>/health` in the browser. |
| Browser console: CORS error | The page's origin isn't in `allow_origins`. Use exactly `http://localhost:5174` (not `127.0.0.1` unless it's listed, and not another port). |
| `Port 5174 is already in use` on start | Another process holds the port. Stop it. Don't change the port without updating backend CORS. |
| Every request returns 404 | `VITE_API_BASE_URL` has an extra path such as `/api` or `/docs`. Use only `http://host:port`. |
| Register fails with "Default User role not found" | Roles weren't seeded. Run `python -m app.db.seed`. |
| Admin menu missing after `UPDATE users SET role_id = 1` | Sign out and in again; the role comes from the JWT issued at login. |
| Wrong role label in the Users table | Your role ids differ from 1 / 2. Update `ROLE_NAMES` in `src/lib/auth-utils.ts`. |
| Signed out unexpectedly | Token expired (`JWT_ACCESS_TOKEN_EXPIRE_MINUTES`) or the account was deactivated. Sign in again. The session is kept in `sessionStorage`, so closing the tab also ends it. |
| "Device does not belong to the current user" | Locations can only be sent by the device owner. Assign the device to the signed-in user on the Devices page. |
| "Device is inactive" | Activate the device on the Devices page. |
| Location sent but no event appeared | A first reading outside a geofence creates no event, and a reading whose accuracy overlaps a circle edge is ignored. Send a clear inside reading, then a clear outside one. |
| Validation error (422) on send | Latitude must be −90…90, longitude −180…180, accuracy above 0. The form flags these before submitting. |
| Map tiles are blank | The browser can't reach `tile.openstreetmap.org`. Check your network, a proxy or a firewall. Use the layer switcher (top right of the map) to try the alternate light base map. |
| Place search says it's unavailable | The geofence editor's search uses the public Nominatim service, which can rate-limit. Click the map directly instead. |
| Times look offset | The API stores timestamps without a timezone. The UI treats API timestamps as UTC and shows them in your local timezone. Locations you send use your local time converted to UTC. |
| Delete returns a conflict / "referenced by other records" | The geofence, device or user already has events or locations. Disable or deactivate it instead of deleting. |
| Dependency install errors | Delete `node_modules` and `package-lock.json`, then run `npm install` again. Ensure Node 18.18+. |

---

## 13. Known backend limitations

These come from the current backend API, not from the frontend:

1. **No per-geofence event rules.** The geofence model has no field for rules, so the editor can't assign them. Adding an `event_rules` column, migration and schema fields to the backend would enable it.
2. **Regular users can't list their devices or read geofences** (`/devices` and `/geofences` are admin-only). Non-admins therefore enter a device ID by hand on the Locations page and see only their own events and trail on the map.
3. **Admins can't read other users' latest locations.** `/locations` and `/locations/latest/{id}` are scoped to the signed-in user. Other users' devices appear on the map as "last seen at an event".
4. **Polygon update without points** crashes in `geofence_service._validate_polygon_update` (`get_points(db=None, ...)`). The editor always sends the full point list, so it doesn't trigger this.
5. **No `/roles` endpoint** and `UserResponse` only includes `role_id`. The frontend reads the role from the JWT and maps ids to names locally.
6. **Directory lookups are capped at 100 records.** Names for users, devices and geofences come from the first 100 of each; entries beyond that show as `#id`.