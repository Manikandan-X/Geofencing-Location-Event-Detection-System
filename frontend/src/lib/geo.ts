import type { Geofence } from "../api/types";

const R = 6_371_000;
const rad = (d: number) => (d * Math.PI) / 180;

export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function pointInPolygon(lat: number, lon: number, pts: [number, number][]) {
  if (pts.length < 3) return false;
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [lati, loni] = pts[i];
    const [latj, lonj] = pts[j];
    if (loni > lon !== lonj > lon && lat < ((latj - lati) * (lon - loni)) / (lonj - loni) + lati) inside = !inside;
  }
  return inside;
}

export type PreviewState = "INSIDE" | "OUTSIDE" | "UNCERTAIN";

/**
 * Client-side preview of what the backend will decide. Mirrors
 * app/utils/geographic.py so the simulator can explain the result before sending.
 */
export function previewState(g: Geofence, lat: number, lon: number, accuracy: number | null): PreviewState {
  if (g.boundary_type === "CIRCLE" && g.center_latitude != null && g.center_longitude != null && g.radius_meters != null) {
    const d = distanceMeters(lat, lon, g.center_latitude, g.center_longitude);
    if (accuracy == null) return d <= g.radius_meters ? "INSIDE" : "OUTSIDE";
    if (d + accuracy < g.radius_meters) return "INSIDE";
    if (d - accuracy > g.radius_meters) return "OUTSIDE";
    return "UNCERTAIN";
  }
  const pts = g.points.map((p) => [p.latitude, p.longitude] as [number, number]);
  return pointInPolygon(lat, lon, pts) ? "INSIDE" : "OUTSIDE";
}

export const geofenceCenter = (g: Geofence): [number, number] | null => {
  if (g.boundary_type === "CIRCLE" && g.center_latitude != null && g.center_longitude != null) {
    return [g.center_latitude, g.center_longitude];
  }
  if (g.points.length) {
    const lat = g.points.reduce((s, p) => s + p.latitude, 0) / g.points.length;
    const lon = g.points.reduce((s, p) => s + p.longitude, 0) / g.points.length;
    return [lat, lon];
  }
  return null;
};

/** Points that enclose a geofence — used to fit the map view around it. */
export function geofenceBoundsPoints(g: Geofence): [number, number][] {
  if (g.boundary_type === "CIRCLE" && g.center_latitude != null && g.center_longitude != null && g.radius_meters != null) {
    const dLat = g.radius_meters / 111_320;
    const dLon = g.radius_meters / (111_320 * Math.max(0.01, Math.cos(rad(g.center_latitude))));
    const { center_latitude: la, center_longitude: lo } = g;
    return [[la + dLat, lo], [la - dLat, lo], [la, lo + dLon], [la, lo - dLon]];
  }
  return g.points.map((p) => [p.latitude, p.longitude] as [number, number]);
}
