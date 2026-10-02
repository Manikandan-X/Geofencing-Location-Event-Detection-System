import { useMemo, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Alert, Box, Button, Chip, Link, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import SendRounded from "@mui/icons-material/SendRounded";
import { Circle, Marker } from "react-leaflet";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { devicesApi, eventsApi, locationsApi } from "../api/endpoints";
import { errorMessage } from "../api/client";
import type { GeofenceEvent } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { EmptyState, ErrorState, EventChip, Loading, PageHeader, Pager, Panel } from "../components/common";
import { BaseMap, ClickHandler, deviceIcon, FitBounds } from "../components/MapParts";
import { useToast } from "../components/Toast";
import { fmtCoord, fmtDateTime, toLocalInput } from "../lib/format";
import { previewState } from "../lib/geo";
import { useGeofenceDirectory } from "../lib/hooks";
import { tokens } from "../theme";

export default function LocationsPage() {
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const { geofences } = useGeofenceDirectory();

  // Only the owner of a device can send for it, so admins pick from devices assigned to themselves.
  const myDevices = useQuery({
    queryKey: ["devices", "mine", user?.id],
    queryFn: () => devicesApi.list({ page: 1, page_size: 100, user_id: user!.id }),
    enabled: isAdmin && !!user,
  });

  const [deviceId, setDeviceId] = useState("");
  const [pos, setPos] = useState<[number, number] | null>(null);
  const [latS, setLatS] = useState("");
  const [lngS, setLngS] = useState("");
  const [accuracy, setAccuracy] = useState("");
  const [when, setWhen] = useState(toLocalInput(new Date()));
  const [err, setErr] = useState("");
  const [result, setResult] = useState<GeofenceEvent[] | null>(null);

  const [histDevice, setHistDevice] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const setPoint = (lat: number, lng: number) => {
    setPos([lat, lng]); setLatS(lat.toFixed(6)); setLngS(lng.toFixed(6));
  };
  const typed = (la: string, lo: string) => {
    setLatS(la); setLngS(lo);
    const a = parseFloat(la), b = parseFloat(lo);
    setPos(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a) <= 90 && Math.abs(b) <= 180 ? [a, b] : null);
  };

  const acc = accuracy === "" ? null : Number(accuracy);
  const coordsOk = pos !== null;
  const accOk = acc === null || acc > 0;
  const dev = Number(deviceId);

  const send = useMutation({
    mutationFn: async () => {
      const loc = await locationsApi.create({
        device_id: dev, latitude: pos![0], longitude: pos![1], accuracy_meters: acc, recorded_at: new Date(when).toISOString(),
      });
      const evs = await eventsApi.list({ page: 1, page_size: 10, device_id: dev }).catch(() => null);
      return { loc, events: (evs?.items ?? []).filter((e) => e.recorded_at.slice(0, 19) === loc.recorded_at.slice(0, 19)) };
    },
    onSuccess: ({ events }) => {
      setErr(""); setResult(events);
      toast.success(events.length ? `Location recorded · ${events.length} event${events.length > 1 ? "s" : ""} detected` : "Location recorded · no state change");
      ["locations", "events", "map", "dashboard"].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
    onError: (e) => { setErr(errorMessage(e)); setResult(null); },
  });

  const preview = useMemo(
    () => (pos ? geofences.filter((g) => g.is_active).map((g) => ({ g, s: previewState(g, pos[0], pos[1], acc) })) : []),
    [pos, acc, geofences],
  );

  const hist = useQuery({
    queryKey: ["locations", page, pageSize, histDevice],
    queryFn: () => locationsApi.list({ page, page_size: pageSize, device_id: histDevice ? Number(histDevice) : undefined }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader title="Locations" subtitle="Send a position for one of your devices and see what the detection engine does with it." />
      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", lg: "380px 1fr" }, alignItems: "start", mb: 3 }}>
        <Panel>
          <Typography variant="h6" mb={2}>Send a location</Typography>
          <Stack gap={2}>
            {err && <Alert severity="error">{err}</Alert>}
            {isAdmin ? (
              <TextField select label="Device" value={deviceId} onChange={(e) => setDeviceId(e.target.value)}
                helperText={myDevices.data && myDevices.data.items.length === 0 ? "No devices are assigned to you. Create one on the Devices page and set yourself as owner." : "Devices assigned to you"}>
                {(myDevices.data?.items ?? []).map((d) => <MenuItem key={d.id} value={String(d.id)} disabled={!d.is_active}>{d.name} (#{d.id}){!d.is_active && " · inactive"}</MenuItem>)}
              </TextField>
            ) : (
              <TextField label="Device ID" type="number" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} helperText="Ask an admin for the ID of the device assigned to you." />
            )}
            <Stack direction="row" gap={2}>
              <TextField label="Latitude" value={latS} onChange={(e) => typed(e.target.value, lngS)} error={!!latS && !coordsOk} />
              <TextField label="Longitude" value={lngS} onChange={(e) => typed(latS, e.target.value)} error={!!lngS && !coordsOk} />
            </Stack>
            {(latS || lngS) && !coordsOk && <Typography variant="body2" color="error">Latitude must be between −90 and 90, longitude between −180 and 180.</Typography>}
            <Stack direction="row" gap={2}>
              <TextField label="GPS accuracy (m)" type="number" value={accuracy} onChange={(e) => setAccuracy(e.target.value)} error={!accOk} helperText={accOk ? "Optional" : "Must be above 0"} inputProps={{ min: 0, step: 1 }} />
              <TextField label="Recorded at" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} InputLabelProps={{ shrink: true }} />
            </Stack>
            <Button variant="contained" size="large" startIcon={<SendRounded />} disabled={!deviceId || !coordsOk || !accOk || !when || send.isPending} onClick={() => send.mutate()}>
              {send.isPending ? "Sending…" : "Send location"}
            </Button>
            {result && (
              <Alert severity={result.length ? "success" : "info"} icon={false}>
                {result.length === 0 ? "Recorded. The device's state didn't change for any enabled geofence." : (
                  <Stack gap={0.75}>
                    <b>Detected:</b>
                    {result.map((e) => <Stack key={e.id} direction="row" alignItems="center" gap={1}><EventChip type={e.event_type} /> Geofence #{e.geofence_id}</Stack>)}
                  </Stack>
                )}
              </Alert>
            )}
            {preview.length > 0 && (
              <Box>
                <Typography variant="body2" fontWeight={700} mb={0.75}>Preview against enabled geofences</Typography>
                <Stack gap={0.75}>
                  {preview.map(({ g, s }) => (
                    <Stack key={g.id} direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2">{g.name}</Typography>
                      {s === "UNCERTAIN"
                        ? <Chip size="small" label="Uncertain · ignored" sx={{ background: `${tokens.uncertain}1F`, color: tokens.uncertain }} />
                        : <EventChip type={s} />}
                    </Stack>
                  ))}
                </Stack>
                <Typography variant="caption" color="text.secondary">Estimate only; the server makes the final call and compares with the device's previous state.</Typography>
              </Box>
            )}
          </Stack>
        </Panel>

        <Panel p={0} sx={{ overflow: "hidden", height: { xs: 380, lg: "100%" }, minHeight: 440 }}>
          <BaseMap>
            {pos && <FitBounds positions={[pos]} />}
            <ClickHandler onClick={setPoint} />
            {pos && <Marker position={pos} icon={deviceIcon()} />}
            {pos && acc != null && acc > 0 && <Circle center={pos} radius={acc} pathOptions={{ color: tokens.primary, weight: 1, fillOpacity: 0.08, dashArray: "4 4" }} />}
            {geofences.filter((g) => g.is_active && g.boundary_type === "CIRCLE" && g.center_latitude != null).map((g) => (
              <Circle key={g.id} center={[g.center_latitude!, g.center_longitude!]} radius={g.radius_meters!} pathOptions={{ color: tokens.primary, weight: 2, fillOpacity: 0.1 }} />
            ))}
          </BaseMap>
        </Panel>
      </Box>

      <Panel p={0}>
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} gap={1.5} p={2}>
          <Typography variant="h6">Your location history</Typography>
          <TextField label="Device ID" type="number" value={histDevice} onChange={(e) => { setHistDevice(e.target.value); setPage(1); }} sx={{ maxWidth: 160 }} />
        </Stack>
        {hist.isLoading ? <Loading /> : hist.isError ? <ErrorState message={errorMessage(hist.error)} onRetry={() => hist.refetch()} /> :
          hist.data!.items.length === 0 ? <EmptyState title="No locations recorded" hint="Send a location above and it will show up here." /> : (
            <TableContainer>
              <Table>
                <TableHead><TableRow><TableCell>Recorded</TableCell><TableCell>Device</TableCell><TableCell>Latitude</TableCell><TableCell>Longitude</TableCell><TableCell>Accuracy</TableCell></TableRow></TableHead>
                <TableBody>
                  {hist.data!.items.map((l) => (
                    <TableRow key={l.id} hover>
                      <TableCell>{fmtDateTime(l.recorded_at)}</TableCell>
                      <TableCell>#{l.device_id}</TableCell>
                      <TableCell>{fmtCoord(l.latitude)}</TableCell>
                      <TableCell>{fmtCoord(l.longitude)}</TableCell>
                      <TableCell>{l.accuracy_meters != null ? `±${Math.round(l.accuracy_meters)} m` : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        {hist.data && hist.data.total > 0 && <Pager total={hist.data.total} page={page} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />}
        <Box px={2} pb={2}><Typography variant="body2" color="text.secondary">See these points as a trail on the <Link component={RouterLink} to="/map">live map</Link>.</Typography></Box>
      </Panel>
    </>
  );
}
