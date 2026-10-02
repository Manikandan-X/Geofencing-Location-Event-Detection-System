# Meridian — Geofence Console (frontend)

React 18 · TypeScript · Vite · Material UI v6 · Leaflet / OpenStreetMap · Axios · React Query · React Router

## Run

```bash
npm install
cp .env.example .env     # VITE_API_BASE_URL=http://localhost:8000
npm run dev              # http://localhost:5174
```

The port is fixed to **5174** because the backend CORS list only allows `http://localhost:5174` / `http://127.0.0.1:5174`.
The API has no `/api` prefix, so `VITE_API_BASE_URL` is just the host and port.

First admin: register, then set `role_id = 1` for that user in MySQL (roles are seeded as Admin = 1, User = 2).
Role ids live in `src/lib/auth-utils.ts` if yours differ.

## Pages

| Page | Who | Backend |
|---|---|---|
| Sign in / Register | everyone | `/auth/login`, `/auth/register`, `/auth/me` |
| Dashboard | everyone | `/geofence-events`, `/geofences`, `/devices`, `/users`, `/locations` |
| Live map | everyone (geofence shapes: admin) | `/geofences`, `/geofence-events`, `/locations` |
| Geofences + editor (circle/polygon, enable/disable) | admin | `/geofences/*` |
| Devices | admin | `/devices/*` |
| Locations (send + history + preview) | everyone | `/locations/*` |
| Event history | everyone (own events unless admin) | `/geofence-events` |
| Users | admin | `/users/*` |
| Audit logs | everyone (own) / admin (all) | `/audit-logs`, `/audit-logs/all` |
| Profile (details, password) | everyone | `/auth/me`, `/auth/me/password` |

## Structure

```
src/
  api/        types.ts mirrors Pydantic schemas · client.ts (axios, 401 handling, error parsing) · endpoints.ts
  auth/       AuthContext (token in sessionStorage, role from JWT claim)
  components/ Layout, MapParts (Leaflet helpers), common (tables, chips, dialogs), Toast
  lib/        geo.ts (client-side state preview), format.ts, hooks.ts (user/device/geofence lookups)
  pages/      one file per screen
  theme.ts    Meridian tokens
```
