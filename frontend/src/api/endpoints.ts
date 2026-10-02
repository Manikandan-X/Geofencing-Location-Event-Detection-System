import { api } from "./client";
import type {
  AuditLog, Device, DeviceCreate, DeviceUpdate, Geofence, GeofenceEvent, GeofencePayload,
  LocationCreate, LocationEvent, PasswordChange, Paginated, RegisterPayload, User, UserCreate, UserUpdate,
} from "./types";

type Params = Record<string, string | number | boolean | undefined | null>;
/** Drops empty filters so they are not sent as "?search=". */
const clean = (p: Params = {}) =>
  Object.fromEntries(Object.entries(p).filter(([, v]) => v !== "" && v !== undefined && v !== null));

// ---- Auth / profile
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ access_token: string; token_type: string }>("/auth/login", { email, password }).then((r) => r.data),
  register: (data: RegisterPayload) => api.post<User>("/auth/register", data).then((r) => r.data),
  me: () => api.get<User>("/auth/me").then((r) => r.data),
  updateMe: (data: UserUpdate) => api.put<User>("/auth/me", data).then((r) => r.data),
  changePassword: (data: PasswordChange) => api.put<User>("/auth/me/password", data).then((r) => r.data),
};

// ---- Users (admin)
export const usersApi = {
  list: (p: Params) => api.get<Paginated<User>>("/users", { params: clean(p) }).then((r) => r.data),
  create: (d: UserCreate) => api.post<User>("/users", d).then((r) => r.data),
  update: (id: number, d: UserUpdate) => api.put<User>(`/users/${id}`, d).then((r) => r.data),
  changeRole: (id: number, role_id: number) => api.patch<User>(`/users/${id}/role`, { role_id }).then((r) => r.data),
  activate: (id: number) => api.patch<User>(`/users/${id}/activate`).then((r) => r.data),
  deactivate: (id: number) => api.patch<User>(`/users/${id}/deactivate`).then((r) => r.data),
  remove: (id: number) => api.delete(`/users/${id}`).then(() => undefined),
};

// ---- Devices (admin)
export const devicesApi = {
  list: (p: Params) => api.get<Paginated<Device>>("/devices", { params: clean(p) }).then((r) => r.data),
  create: (d: DeviceCreate) => api.post<Device>("/devices", d).then((r) => r.data),
  update: (id: number, d: DeviceUpdate) => api.put<Device>(`/devices/${id}`, d).then((r) => r.data),
  activate: (id: number) => api.patch<Device>(`/devices/${id}/activate`).then((r) => r.data),
  deactivate: (id: number) => api.patch<Device>(`/devices/${id}/deactivate`).then((r) => r.data),
  remove: (id: number) => api.delete(`/devices/${id}`).then(() => undefined),
};

// ---- Geofences (admin)
export const geofencesApi = {
  list: (p: Params) => api.get<Paginated<Geofence>>("/geofences", { params: clean(p) }).then((r) => r.data),
  create: (d: GeofencePayload) => api.post<Geofence>("/geofences", d).then((r) => r.data),
  update: (id: number, d: GeofencePayload) => api.put<Geofence>(`/geofences/${id}`, d).then((r) => r.data),
  enable: (id: number) => api.patch<Geofence>(`/geofences/${id}/enable`).then((r) => r.data),
  disable: (id: number) => api.patch<Geofence>(`/geofences/${id}/disable`).then((r) => r.data),
  remove: (id: number) => api.delete(`/geofences/${id}`).then(() => undefined),
};

// ---- Locations (own devices only)
export const locationsApi = {
  create: (d: LocationCreate) => api.post<LocationEvent>("/locations", d).then((r) => r.data),
  list: (p: Params) => api.get<Paginated<LocationEvent>>("/locations", { params: clean(p) }).then((r) => r.data),
  latest: (deviceId: number) => api.get<LocationEvent>(`/locations/latest/${deviceId}`).then((r) => r.data),
};

// ---- Geofence events
export const eventsApi = {
  list: (p: Params) => api.get<Paginated<GeofenceEvent>>("/geofence-events", { params: clean(p) }).then((r) => r.data),
};

// ---- Audit logs
export const auditApi = {
  mine: (p: Params) => api.get<Paginated<AuditLog>>("/audit-logs", { params: clean(p) }).then((r) => r.data),
  all: (p: Params) => api.get<Paginated<AuditLog>>("/audit-logs/all", { params: clean(p) }).then((r) => r.data),
};
