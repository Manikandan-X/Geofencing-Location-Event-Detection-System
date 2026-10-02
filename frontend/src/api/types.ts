// Mirrors the FastAPI Pydantic schemas (app/schemas/*.py)

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  role_id: number;
  created_at: string;
  updated_at: string;
}
export interface UserCreate {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  role_id: number;
}
export interface UserUpdate {
  first_name?: string;
  last_name?: string;
  email?: string;
}
export interface RegisterPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}
export interface PasswordChange {
  current_password: string;
  new_password: string;
}

export interface Device {
  id: number;
  user_id: number;
  device_identifier: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
export interface DeviceCreate {
  user_id: number;
  device_identifier: string;
  name: string;
}
export type DeviceUpdate = Partial<DeviceCreate>;

export type BoundaryType = "CIRCLE" | "POLYGON";
export interface GeofencePoint {
  id: number;
  geofence_id: number;
  latitude: number;
  longitude: number;
  point_order: number;
}
export interface Geofence {
  id: number;
  name: string;
  description: string | null;
  boundary_type: BoundaryType;
  center_latitude: number | null;
  center_longitude: number | null;
  radius_meters: number | null;
  is_active: boolean;
  created_by: number;
  created_at: string;
  updated_at: string;
  points: GeofencePoint[];
}
export interface LatLngPoint {
  latitude: number;
  longitude: number;
}
export interface GeofencePayload {
  name?: string;
  description?: string | null;
  boundary_type?: BoundaryType;
  center_latitude?: number;
  center_longitude?: number;
  radius_meters?: number;
  points?: LatLngPoint[];
}

export interface LocationEvent {
  id: number;
  device_id: number;
  user_id: number;
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
  recorded_at: string;
  created_at: string;
}
export interface LocationCreate {
  device_id: number;
  latitude: number;
  longitude: number;
  accuracy_meters?: number | null;
  recorded_at: string;
}

export type EventType = "ENTER" | "EXIT" | "INSIDE" | "OUTSIDE";
export interface GeofenceEvent {
  id: number;
  device_id: number;
  user_id: number;
  geofence_id: number;
  event_type: EventType;
  latitude: number;
  longitude: number;
  recorded_at: string;
  previous_state: EventType;
  current_state: EventType;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: string | null;
  created_at: string;
}
