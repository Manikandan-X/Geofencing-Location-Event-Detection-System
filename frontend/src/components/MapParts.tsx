import { useEffect } from "react";
import L from "leaflet";
import { Circle, LayersControl, MapContainer, Polygon, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import type { Geofence } from "../api/types";
import { eventColor, tokens } from "../theme";

export const WORLD_CENTER: [number, number] = [20, 0];

export function BaseMap({
  children, center = WORLD_CENTER, zoom = 2, style,
}: { children?: React.ReactNode; center?: [number, number]; zoom?: number; style?: React.CSSProperties }) {
  return (
    <MapContainer center={center} zoom={zoom} minZoom={2} worldCopyJump style={{ height: "100%", width: "100%", ...style }}>
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="OpenStreetMap">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Light">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={20}
          />
        </LayersControl.BaseLayer>
      </LayersControl>
      {children}
    </MapContainer>
  );
}

/** Re-fits the viewport whenever the set of positions changes (by signature). */
export function FitBounds({ positions, padding = 60, maxZoom = 16 }: { positions: [number, number][]; padding?: number; maxZoom?: number }) {
  const map = useMap();
  const sig = positions.map((p) => p.join(",")).join("|");
  useEffect(() => {
    if (!positions.length) return;
    map.invalidateSize();
    if (positions.length === 1) map.setView(positions[0], Math.min(15, maxZoom));
    else map.fitBounds(L.latLngBounds(positions), { padding: [padding, padding], maxZoom });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, map]);
  return null;
}

export function FlyTo({ target, zoom = 15 }: { target: [number, number] | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, zoom, { duration: 0.8 });
  }, [target, zoom, map]);
  return null;
}

export function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      const w = e.latlng.wrap(); // keep longitude within -180..180 for the API validator
      onClick(w.lat, w.lng);
    },
  });
  return null;
}

/** Circle → ultramarine, polygon → marigold, disabled → grey and dashed. */
export function geofenceStyle(g: Geofence, selected = false): L.PathOptions {
  const color = !g.is_active ? tokens.outside : g.boundary_type === "CIRCLE" ? tokens.primary : "#C98A0B";
  return {
    color,
    weight: selected ? 4 : 2.5,
    fillColor: color,
    fillOpacity: g.is_active ? (selected ? 0.28 : 0.16) : 0.06,
    dashArray: g.is_active ? undefined : "6 6",
  };
}

export function GeofenceLayer({
  geofences, selectedId, onSelect,
}: { geofences: Geofence[]; selectedId?: number | null; onSelect?: (g: Geofence) => void }) {
  return (
    <>
      {geofences.map((g) => {
        const handlers = { click: () => onSelect?.(g) };
        const tip = (
          <Tooltip sticky>
            <b>{g.name}</b> · {g.boundary_type === "CIRCLE" ? "Circle" : "Polygon"}
            {!g.is_active && " · disabled"}
          </Tooltip>
        );
        if (g.boundary_type === "CIRCLE" && g.center_latitude != null && g.center_longitude != null && g.radius_meters != null) {
          return (
            <Circle key={g.id} center={[g.center_latitude, g.center_longitude]} radius={g.radius_meters}
              pathOptions={geofenceStyle(g, g.id === selectedId)} eventHandlers={handlers}>{tip}</Circle>
          );
        }
        if (g.boundary_type === "POLYGON" && g.points.length >= 3) {
          return (
            <Polygon key={g.id} positions={g.points.map((p) => [p.latitude, p.longitude] as [number, number])}
              pathOptions={geofenceStyle(g, g.id === selectedId)} eventHandlers={handlers}>{tip}</Polygon>
          );
        }
        return null;
      })}
    </>
  );
}

export const deviceIcon = (stale = false) =>
  L.divIcon({
    className: `dev-pin${stale ? " stale" : ""}`,
    html: '<div class="ring"></div><div class="dot"></div>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

export const eventIcon = (type: string) =>
  L.divIcon({
    className: "",
    html: `<div class="ev-pin" style="background:${eventColor(type)}"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

export const vertexIcon = (first = false) =>
  L.divIcon({ className: "", html: `<div class="vertex-pin${first ? " first" : ""}"></div>`, iconSize: [14, 14], iconAnchor: [7, 7] });
