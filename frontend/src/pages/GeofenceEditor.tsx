import { useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment, Slider,
  Stack, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from "@mui/material";
import SearchRounded from "@mui/icons-material/SearchRounded";
import MyLocationRounded from "@mui/icons-material/MyLocationRounded";
import UndoRounded from "@mui/icons-material/UndoRounded";
import DeleteSweepRounded from "@mui/icons-material/DeleteSweepRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import { Circle, Marker, Polygon, Polyline } from "react-leaflet";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { geofencesApi } from "../api/endpoints";
import { errorMessage } from "../api/client";
import type { BoundaryType, Geofence, GeofencePayload } from "../api/types";
import { BaseMap, ClickHandler, FitBounds, FlyTo, vertexIcon } from "../components/MapParts";
import { useToast } from "../components/Toast";
import { fmtCoord } from "../lib/format";
import { tokens } from "../theme";

type Pt = [number, number];

export default function GeofenceEditor({
  open, geofence, onClose,
}: { open: boolean; geofence: Geofence | null; onClose: () => void }) {
  const editing = !!geofence;
  const toast = useToast();
  const qc = useQueryClient();

  const [mapReady, setMapReady] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<BoundaryType>("CIRCLE");
  const [center, setCenter] = useState<Pt | null>(null);
  const [radius, setRadius] = useState<number>(200);
  const [points, setPoints] = useState<Pt[]>([]);
  const [search, setSearch] = useState("");
  const [fly, setFly] = useState<Pt | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setSearch("");
    setFly(null);
    if (geofence) {
      setName(geofence.name);
      setDescription(geofence.description ?? "");
      setType(geofence.boundary_type);
      setCenter(geofence.center_latitude != null && geofence.center_longitude != null ? [geofence.center_latitude, geofence.center_longitude] : null);
      setRadius(geofence.radius_meters ?? 200);
      setPoints(geofence.points.map((p) => [p.latitude, p.longitude] as Pt));
    } else {
      setName(""); setDescription(""); setType("CIRCLE"); setCenter(null); setRadius(200); setPoints([]);
    }
  }, [open, geofence]);

  const fitTargets = useMemo<Pt[]>(() => {
    if (geofence?.boundary_type === "POLYGON") return geofence.points.map((p) => [p.latitude, p.longitude] as Pt);
    if (geofence?.center_latitude != null && geofence.center_longitude != null) return [[geofence.center_latitude, geofence.center_longitude]];
    return [];
  }, [geofence]);

  const save = useMutation({
    mutationFn: () => {
      const base: GeofencePayload = { name: name.trim(), description: description.trim() ? description.trim() : null, boundary_type: type };
      // The API rejects circle fields on polygons and points on circles, so send only the relevant half.
      const payload: GeofencePayload =
        type === "CIRCLE"
          ? { ...base, center_latitude: center![0], center_longitude: center![1], radius_meters: radius }
          : { ...base, points: points.map(([latitude, longitude]) => ({ latitude, longitude })) };
      if (!editing) {
        if (payload.description === null) delete payload.description;
        return geofencesApi.create(payload);
      }
      return geofencesApi.update(geofence!.id, payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Geofence updated" : "Geofence created");
      qc.invalidateQueries({ queryKey: ["geofences"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
      onClose();
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const problems: string[] = [];
  if (!name.trim()) problems.push("Add a name");
  if (type === "CIRCLE" && !center) problems.push("Click the map to place the centre");
  if (type === "CIRCLE" && !(radius > 0)) problems.push("Radius must be greater than 0");
  if (type === "POLYGON" && points.length < 3) problems.push(`Add at least 3 points (${points.length} so far)`);

  const onMapClick = (lat: number, lng: number) => {
    if (type === "CIRCLE") setCenter([lat, lng]);
    else setPoints((p) => [...p, [lat, lng]]);
  };

  const wrapLL = (ll: { lat: number; lng: number }): Pt => {
    const lng = ((((ll.lng + 180) % 360) + 360) % 360) - 180;
    return [ll.lat, lng];
  };

  const geocode = async () => {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(search)}`);
      const j = (await r.json()) as { lat: string; lon: string }[];
      if (j[0]) setFly([parseFloat(j[0].lat), parseFloat(j[0].lon)]);
      else toast.info("No place found for that search");
    } catch {
      toast.error("Place search is unavailable right now");
    } finally {
      setSearching(false);
    }
  };

  const locate = () =>
    navigator.geolocation?.getCurrentPosition(
      (p) => setFly([p.coords.latitude, p.coords.longitude]),
      () => toast.error("Couldn't read your location. Allow location access in the browser."),
    );

  return (
    <Dialog
      open={open}
      onClose={save.isPending ? undefined : onClose}
      fullWidth
      maxWidth="lg"
      TransitionProps={{ onEntered: () => setMapReady(true), onExited: () => setMapReady(false) }}
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: '"Bricolage Grotesque"', fontWeight: 700 }}>
        {editing ? `Edit ${geofence!.name}` : "New geofence"}
        <IconButton aria-label="Close" onClick={onClose}><CloseRounded /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "340px 1fr" }, minHeight: 520 }}>
          <Stack gap={2} p={2.5} sx={{ borderRight: { md: `1px solid ${tokens.line}` } }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} inputProps={{ maxLength: 100 }} required />
            <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)} multiline minRows={2} inputProps={{ maxLength: 1000 }} />

            <Box>
              <Typography variant="body2" fontWeight={700} mb={0.75}>Boundary shape</Typography>
              <ToggleButtonGroup exclusive fullWidth size="small" value={type} onChange={(_, v) => v && setType(v)} color="primary">
                <ToggleButton value="CIRCLE">Circle</ToggleButton>
                <ToggleButton value="POLYGON">Polygon</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {type === "CIRCLE" ? (
              <Box>
                <Typography variant="body2" fontWeight={700}>Radius</Typography>
                <Stack direction="row" gap={2} alignItems="center">
                  <Slider value={Math.min(radius, 5000)} min={10} max={5000} step={10} onChange={(_, v) => setRadius(v as number)} aria-label="Radius in metres" />
                  <TextField
                    type="number" value={radius} sx={{ width: 120 }}
                    onChange={(e) => setRadius(Number(e.target.value))}
                    InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }}
                    inputProps={{ min: 1, step: 10 }}
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary" mt={1}>
                  Centre: {center ? `${fmtCoord(center[0])}, ${fmtCoord(center[1])}` : "click the map to place it"}
                </Typography>
              </Box>
            ) : (
              <Box>
                <Typography variant="body2" fontWeight={700}>Corners ({points.length})</Typography>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  Click the map to add corners in order. Drag a corner to move it.
                </Typography>
                <Stack direction="row" gap={1}>
                  <Button size="small" startIcon={<UndoRounded />} disabled={!points.length} onClick={() => setPoints((p) => p.slice(0, -1))}>Undo</Button>
                  <Button size="small" color="inherit" startIcon={<DeleteSweepRounded />} disabled={!points.length} onClick={() => setPoints([])}>Clear</Button>
                </Stack>
              </Box>
            )}

            <Alert severity="info" icon={false} sx={{ fontSize: 13, "& .MuiAlert-message": { p: 0 } }}>
              <b>How events fire.</b> Outside → inside is an <b>Enter</b>, inside → outside is an <b>Exit</b>, and each further
              reading inside is <b>Inside</b>. A circle reading whose GPS accuracy overlaps the edge is uncertain and is ignored, so it
              can't cause a false enter or exit.
            </Alert>
            {problems.length > 0 && <Typography variant="body2" color="warning.main">{problems[0]}</Typography>}
          </Stack>

          <Box sx={{ position: "relative", minHeight: { xs: 380, md: 520 } }}>
            <Stack direction="row" gap={1} sx={{ position: "absolute", top: 12, left: 56, right: 12, zIndex: 1000, maxWidth: 420 }}>
              <TextField
                placeholder="Search for a place"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), geocode())}
                sx={{ background: "#fff", borderRadius: 1 }}
                InputProps={{ endAdornment: <IconButton size="small" aria-label="Search" onClick={geocode} disabled={searching}><SearchRounded fontSize="small" /></IconButton> }}
              />
              <IconButton aria-label="Use my location" onClick={locate} sx={{ background: "#fff", border: `1px solid ${tokens.line}`, borderRadius: 1 }}>
                <MyLocationRounded fontSize="small" />
              </IconButton>
            </Stack>
            {mapReady && (
              <BaseMap>
                <FitBounds positions={fitTargets} maxZoom={17} />
                <FlyTo target={fly} />
                <ClickHandler onClick={onMapClick} />
                {type === "CIRCLE" && center && (
                  <>
                    <Circle center={center} radius={radius > 0 ? radius : 1} pathOptions={{ color: tokens.primary, fillOpacity: 0.18, weight: 3 }} />
                    <Marker position={center} icon={vertexIcon(true)} draggable
                      eventHandlers={{ dragend: (e) => setCenter(wrapLL((e.target as import("leaflet").Marker).getLatLng())) }} />
                  </>
                )}
                {type === "POLYGON" && points.length >= 3 && (
                  <Polygon positions={points} pathOptions={{ color: "#C98A0B", fillOpacity: 0.18, weight: 3 }} />
                )}
                {type === "POLYGON" && points.length > 0 && points.length < 3 && (
                  <Polyline positions={points} pathOptions={{ color: "#C98A0B", weight: 3, dashArray: "6 6" }} />
                )}
                {type === "POLYGON" && points.map((p, i) => (
                  <Marker key={`${i}-${p[0]}-${p[1]}`} position={p} icon={vertexIcon(i === 0)} draggable
                    eventHandlers={{ dragend: (e) => { const np = wrapLL((e.target as import("leaflet").Marker).getLatLng()); setPoints((arr) => arr.map((q, k) => (k === i ? np : q))); } }} />
                ))}
              </BaseMap>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button color="inherit" onClick={onClose} disabled={save.isPending}>Cancel</Button>
        <Button variant="contained" disabled={problems.length > 0 || save.isPending} onClick={() => { setError(""); save.mutate(); }}>
          {save.isPending ? "Saving…" : editing ? "Save changes" : "Create geofence"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
