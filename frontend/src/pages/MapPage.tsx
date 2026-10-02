import { useEffect, useMemo, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import {
  Box, Chip, Divider, FormControlLabel, IconButton, Link, MenuItem, Stack, Switch, TextField, Tooltip as MuiTooltip, Typography, useMediaQuery, useTheme,
} from "@mui/material";
import TuneRounded from "@mui/icons-material/TuneRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import EastRounded from "@mui/icons-material/EastRounded";
import { Marker, Polyline, Popup, CircleMarker } from "react-leaflet";
import { useQuery } from "@tanstack/react-query";
import { eventsApi, locationsApi } from "../api/endpoints";
import type { EventType, Geofence } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { EventChip } from "../components/common";
import { BaseMap, deviceIcon, eventIcon, FitBounds, FlyTo, GeofenceLayer } from "../components/MapParts";
import { fmtCoord, fmtDateTime, fmtMeters } from "../lib/format";
import { geofenceBoundsPoints } from "../lib/geo";
import { useDeviceDirectory, useGeofenceDirectory, useUserDirectory } from "../lib/hooks";
import { eventColor, tokens } from "../theme";

const TYPES: EventType[] = ["ENTER", "EXIT", "INSIDE", "OUTSIDE"];
type LL = [number, number];

export default function MapPage() {
  const { isAdmin } = useAuth();
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up("md"));
  const [params] = useSearchParams();
  const { geofences } = useGeofenceDirectory();
  const { devices, name: deviceNameAdmin } = useDeviceDirectory();
  const { name: userName } = useUserDirectory();
  const deviceName = (id: number) => (isAdmin ? deviceNameAdmin(id) : `Device #${id}`);

  const [panel, setPanel] = useState(desktop);
  const [layers, setLayers] = useState({ geofences: true, devices: true, events: true, trail: true });
  const [device, setDevice] = useState("");
  const [types, setTypes] = useState<Set<EventType>>(new Set(TYPES));
  const [selected, setSelected] = useState<Geofence | null>(null);
  const [fly, setFly] = useState<LL | null>(null);

  const events = useQuery({
    queryKey: ["map", "events", device],
    queryFn: () => eventsApi.list({ page: 1, page_size: 100, device_id: device ? Number(device) : undefined }),
    refetchInterval: 15_000,
  });
  const locations = useQuery({
    queryKey: ["map", "locations", device],
    queryFn: () => locationsApi.list({ page: 1, page_size: 100, device_id: device ? Number(device) : undefined }),
    refetchInterval: 15_000,
  });

  const evItems = useMemo(() => (events.data?.items ?? []).filter((e) => types.has(e.event_type)), [events.data, types]);

  // Devices reporting positions I own (from location history, newest first) → solid markers + trails.
  const trails = useMemo(() => {
    const m = new Map<number, { id: number; lat: number; lng: number; at: string; acc: number | null }[]>();
    (locations.data?.items ?? []).forEach((l) => {
      const arr = m.get(l.device_id) ?? [];
      arr.push({ id: l.id, lat: l.latitude, lng: l.longitude, at: l.recorded_at, acc: l.accuracy_meters });
      m.set(l.device_id, arr);
    });
    return m;
  }, [locations.data]);

  // Devices I can't read locations for: fall back to the newest event position (hollow marker).
  const lastSeenElsewhere = useMemo(() => {
    const seen = new Map<number, (typeof evItems)[number]>();
    (events.data?.items ?? []).forEach((e) => { if (!trails.has(e.device_id) && !seen.has(e.device_id)) seen.set(e.device_id, e); });
    return [...seen.values()];
  }, [events.data, trails]);

  // Focus requested from other pages (?geofence=, ?lat=&lng=)
  const focusGeofenceId = Number(params.get("geofence")) || null;
  const focusLat = parseFloat(params.get("lat") ?? "");
  const focusLng = parseFloat(params.get("lng") ?? "");
  const focusPoint: LL | null = Number.isFinite(focusLat) && Number.isFinite(focusLng) ? [focusLat, focusLng] : null;

  const fitPositions = useMemo<LL[]>(() => {
    if (focusPoint) return [focusPoint];
    const target = selected ?? geofences.find((g) => g.id === focusGeofenceId);
    if (target) return geofenceBoundsPoints(target);
    return geofences.flatMap(geofenceBoundsPoints);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geofences, selected, focusGeofenceId, focusLat, focusLng]);

  // With no geofences to frame (non-admins), frame the first batch of data once instead of every refresh.
  const [frozen, setFrozen] = useState<LL[] | null>(null);
  useEffect(() => {
    if (frozen || fitPositions.length) return;
    const pts: LL[] = [...evItems.map((e) => [e.latitude, e.longitude] as LL), ...[...trails.values()].flat().map((p) => [p.lat, p.lng] as LL)];
    if (pts.length) setFrozen(pts);
  }, [frozen, fitPositions.length, evItems, trails]);

  const updated = Math.max(events.dataUpdatedAt, locations.dataUpdatedAt);
  const toggleType = (t: EventType) => setTypes((s) => { const n = new Set(s); n.has(t) ? n.delete(t) : n.add(t); return n; });
  const select = (g: Geofence) => { setSelected(g); setLayers((l) => ({ ...l, geofences: true })); };
  const deviceOptions = isAdmin ? devices.map((d) => ({ id: d.id, label: d.name })) : [...new Set([...trails.keys(), ...(events.data?.items ?? []).map((e) => e.device_id)])].map((id) => ({ id, label: `Device #${id}` }));

  return (
    <Box sx={{ position: "relative", height: "100%" }}>
      <BaseMap>
        <FitBounds positions={fitPositions.length ? fitPositions : frozen ?? []} maxZoom={17} />
        <FlyTo target={fly} zoom={16} />

        {layers.geofences && <GeofenceLayer geofences={geofences} selectedId={selected?.id ?? focusGeofenceId} onSelect={select} />}

        {layers.trail && [...trails.entries()].filter(([id]) => !device || id === Number(device)).map(([id, pts]) => {
          const asc = [...pts].reverse().map((p) => [p.lat, p.lng] as LL);
          return (
            <Box key={`t${id}`} component="span">
              <Polyline positions={asc} pathOptions={{ color: tokens.primary, weight: 3, opacity: 0.55, dashArray: "2 7" }} />
              {pts.slice(1).map((p) => (
                <CircleMarker key={p.id} center={[p.lat, p.lng]} radius={3.5} pathOptions={{ color: "#fff", weight: 1, fillColor: tokens.primary, fillOpacity: 0.8 }}>
                  <Popup>{deviceName(id)}<br />{fmtDateTime(p.at)}<br />{fmtCoord(p.lat)}, {fmtCoord(p.lng)}{p.acc != null && <><br />±{Math.round(p.acc)} m</>}</Popup>
                </CircleMarker>
              ))}
            </Box>
          );
        })}

        {layers.events && evItems.map((e) => (
          <Marker key={`e${e.id}`} position={[e.latitude, e.longitude]} icon={eventIcon(e.event_type)}>
            <Popup>
              <Stack gap={0.75}>
                <Stack direction="row" gap={0.75} alignItems="center"><EventChip type={e.event_type} /><span>{geofences.find((g) => g.id === e.geofence_id)?.name ?? `Geofence #${e.geofence_id}`}</span></Stack>
                <span>{deviceName(e.device_id)} · {userName(e.user_id)}</span>
                <Stack direction="row" gap={0.5} alignItems="center">{e.previous_state.toLowerCase()} <EastRounded sx={{ fontSize: 14 }} /> {e.current_state.toLowerCase()}</Stack>
                <span>{fmtDateTime(e.recorded_at)}</span>
              </Stack>
            </Popup>
          </Marker>
        ))}

        {layers.devices && [...trails.entries()].filter(([id]) => !device || id === Number(device)).map(([id, pts]) => (
          <Marker key={`d${id}`} position={[pts[0].lat, pts[0].lng]} icon={deviceIcon()} zIndexOffset={1000}>
            <Popup><b>{deviceName(id)}</b><br />Latest location<br />{fmtDateTime(pts[0].at)}<br />{fmtCoord(pts[0].lat)}, {fmtCoord(pts[0].lng)}{pts[0].acc != null && <><br />±{Math.round(pts[0].acc)} m</>}</Popup>
          </Marker>
        ))}
        {layers.devices && lastSeenElsewhere.filter((e) => !device || e.device_id === Number(device)).map((e) => (
          <Marker key={`s${e.device_id}`} position={[e.latitude, e.longitude]} icon={deviceIcon(true)} zIndexOffset={900}>
            <Popup><b>{deviceName(e.device_id)}</b> · {userName(e.user_id)}<br />Last seen at an event<br />{fmtDateTime(e.recorded_at)}</Popup>
          </Marker>
        ))}
      </BaseMap>

      {!panel && (
        <IconButton aria-label="Open map controls" onClick={() => setPanel(true)}
          sx={{ position: "absolute", top: 12, left: desktop ? 12 : 60, zIndex: 1000, background: "#fff", border: `1px solid ${tokens.line}`, "&:hover": { background: "#fff" } }}>
          <TuneRounded />
        </IconButton>
      )}

      {panel && (
        <Box sx={{
          position: "absolute", zIndex: 1000, top: 12, left: desktop ? 12 : 60, right: desktop ? "auto" : 12, width: desktop ? 340 : "auto",
          maxHeight: "calc(100% - 24px)", overflowY: "auto", background: "rgba(255,255,255,.97)", border: `1px solid ${tokens.line}`,
          borderRadius: 3, boxShadow: "0 12px 40px rgba(23,32,51,.16)", p: 2,
        }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
            <Typography variant="h6" sx={{ fontFamily: '"Bricolage Grotesque"', fontWeight: 700 }}>Live map</Typography>
            <IconButton size="small" aria-label="Collapse panel" onClick={() => setPanel(false)}><CloseRounded fontSize="small" /></IconButton>
          </Stack>
          <Typography variant="body2" color="text.secondary" mb={1.5}>
            {updated ? `Updated ${new Date(updated).toLocaleTimeString()} · refreshes every 15 s` : "Loading…"}
          </Typography>

          <TextField select label="Device" value={device} onChange={(e) => setDevice(e.target.value)}>
            <MenuItem value="">All devices</MenuItem>
            {deviceOptions.map((d) => <MenuItem key={d.id} value={String(d.id)}>{d.label}</MenuItem>)}
          </TextField>

          <Box mt={1.5}>
            {([
              ["geofences", "Geofences", isAdmin], ["devices", "Device positions", true], ["events", "Event markers", true], ["trail", "Location history", true],
            ] as const).filter(([, , show]) => show).map(([k, label]) => (
              <FormControlLabel key={k} sx={{ display: "flex", justifyContent: "space-between", ml: 0, mr: 0 }} labelPlacement="start"
                control={<Switch size="small" checked={layers[k]} onChange={(e) => setLayers({ ...layers, [k]: e.target.checked })} />} label={<Typography variant="body2">{label}</Typography>} />
            ))}
          </Box>

          <Divider sx={{ my: 1.5 }} />
          <Typography variant="body2" fontWeight={700} mb={0.75}>Event types</Typography>
          <Stack direction="row" gap={0.75} flexWrap="wrap">
            {TYPES.map((t) => {
              const c = eventColor(t);
              const on = types.has(t);
              const count = (events.data?.items ?? []).filter((e) => e.event_type === t).length;
              return (
                <Chip key={t} clickable onClick={() => toggleType(t)} size="small" label={`${t.charAt(0) + t.slice(1).toLowerCase()} · ${count}`} aria-pressed={on}
                  sx={{ background: on ? `${c}22` : "transparent", color: on ? c : "text.secondary", border: `1px solid ${on ? c : tokens.line}` }} />
              );
            })}
          </Stack>
          {(events.data?.total ?? 0) > 100 && <Typography variant="caption" color="text.secondary" display="block" mt={0.75}>Showing the latest 100 of {events.data!.total} events.</Typography>}

          {isAdmin ? (
            <>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="body2" fontWeight={700} mb={0.5}>Geofences ({geofences.length})</Typography>
              {selected && (
                <Box sx={{ background: tokens.primaryTint, borderRadius: 2, p: 1.25, mb: 1 }}>
                  <Typography fontWeight={700}>{selected.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selected.boundary_type === "CIRCLE" ? `Circle · ${fmtMeters(selected.radius_meters)} radius` : `Polygon · ${selected.points.length} corners`} · {selected.is_active ? "Enabled" : "Disabled"}
                  </Typography>
                  {selected.description && <Typography variant="body2" mt={0.5}>{selected.description}</Typography>}
                  <Link component={RouterLink} to="/geofences" variant="body2" fontWeight={600}>Manage geofences</Link>
                </Box>
              )}
              <Stack sx={{ maxHeight: 180, overflowY: "auto" }}>
                {geofences.map((g) => (
                  <Box key={g.id} role="button" tabIndex={0} onClick={() => select(g)} onKeyDown={(e) => e.key === "Enter" && select(g)}
                    sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.75, px: 0.75, borderRadius: 1.5, cursor: "pointer", opacity: g.is_active ? 1 : 0.55, background: selected?.id === g.id ? "#F2F4FA" : "transparent", "&:hover": { background: "#F2F4FA" } }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: g.boundary_type === "CIRCLE" ? "50%" : "2px", background: g.boundary_type === "CIRCLE" ? tokens.primary : "#C98A0B", flexShrink: 0 }} />
                    <Typography variant="body2" noWrap flex={1}>{g.name}</Typography>
                  </Box>
                ))}
              </Stack>
            </>
          ) : (
            <Typography variant="caption" color="text.secondary" display="block" mt={1.5}>Geofence shapes are visible to admins only. Your events and locations are shown above.</Typography>
          )}

          <Divider sx={{ my: 1.5 }} />
          <Typography variant="body2" fontWeight={700} mb={0.5}>Latest events</Typography>
          {evItems.length === 0 ? <Typography variant="body2" color="text.secondary">No events match the current filters.</Typography> : (
            <Stack>
              {evItems.slice(0, 6).map((e) => (
                <MuiTooltip key={e.id} title="Centre on map" placement="right">
                  <Box role="button" tabIndex={0} onClick={() => setFly([e.latitude, e.longitude])} onKeyDown={(k) => k.key === "Enter" && setFly([e.latitude, e.longitude])}
                    sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.75, px: 0.75, borderRadius: 1.5, cursor: "pointer", "&:hover": { background: "#F2F4FA" } }}>
                    <EventChip type={e.event_type} />
                    <Typography variant="body2" noWrap flex={1}>{deviceName(e.device_id)}</Typography>
                    <Typography variant="caption" color="text.secondary">{new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(e.recorded_at) ? e.recorded_at : `${e.recorded_at}Z`).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Typography>
                  </Box>
                </MuiTooltip>
              ))}
            </Stack>
          )}
          {!isAdmin && trails.size === 0 && <Typography variant="caption" color="text.secondary" display="block" mt={1}>Send a location from the Locations page to see your device here.</Typography>}
        </Box>
      )}
    </Box>
  );
}
