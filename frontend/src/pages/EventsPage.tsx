import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, IconButton, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography } from "@mui/material";
import EastRounded from "@mui/icons-material/EastRounded";
import PlaceRounded from "@mui/icons-material/PlaceRounded";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { eventsApi } from "../api/endpoints";
import { errorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { EmptyState, ErrorState, EventChip, Loading, PageHeader, Pager, Panel } from "../components/common";
import { fmtCoord, fmtDateTime } from "../lib/format";
import { useDeviceDirectory, useGeofenceDirectory, useUserDirectory } from "../lib/hooks";

export default function EventsPage() {
  const { isAdmin } = useAuth();
  const nav = useNavigate();
  const { name: userName, users } = useUserDirectory();
  const { name: deviceName, devices } = useDeviceDirectory();
  const { name: geoName, geofences } = useGeofenceDirectory();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [type, setType] = useState("");
  const [geofence, setGeofence] = useState("");
  const [device, setDevice] = useState("");
  const [user, setUser] = useState("");

  const q = useQuery({
    queryKey: ["events", page, pageSize, type, geofence, device, user],
    queryFn: () => eventsApi.list({ page, page_size: pageSize, event_type: type, geofence_id: geofence ? Number(geofence) : undefined, device_id: device ? Number(device) : undefined, user_id: user ? Number(user) : undefined }),
    placeholderData: keepPreviousData,
    refetchInterval: 20_000,
  });
  const f = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };

  return (
    <>
      <PageHeader title="Event history" subtitle="Every state change the system detected, with where the device was and what it was doing before." />
      <Panel p={0}>
        <Box sx={{ display: "grid", gap: 1.5, p: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: isAdmin ? "repeat(4, 1fr)" : "repeat(2, 1fr) 1fr 1fr" } }}>
          <TextField select label="Event" value={type} onChange={(e) => f(setType)(e.target.value)}>
            <MenuItem value="">All events</MenuItem>
            {["ENTER", "EXIT", "INSIDE", "OUTSIDE"].map((t) => <MenuItem key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</MenuItem>)}
          </TextField>
          {isAdmin ? (
            <TextField select label="Geofence" value={geofence} onChange={(e) => f(setGeofence)(e.target.value)}>
              <MenuItem value="">All geofences</MenuItem>
              {geofences.map((g) => <MenuItem key={g.id} value={String(g.id)}>{g.name}</MenuItem>)}
            </TextField>
          ) : <TextField label="Geofence ID" type="number" value={geofence} onChange={(e) => f(setGeofence)(e.target.value)} />}
          {isAdmin ? (
            <TextField select label="Device" value={device} onChange={(e) => f(setDevice)(e.target.value)}>
              <MenuItem value="">All devices</MenuItem>
              {devices.map((d) => <MenuItem key={d.id} value={String(d.id)}>{d.name}</MenuItem>)}
            </TextField>
          ) : <TextField label="Device ID" type="number" value={device} onChange={(e) => f(setDevice)(e.target.value)} />}
          {isAdmin && (
            <TextField select label="User" value={user} onChange={(e) => f(setUser)(e.target.value)}>
              <MenuItem value="">All users</MenuItem>
              {users.map((u) => <MenuItem key={u.id} value={String(u.id)}>{u.first_name} {u.last_name}</MenuItem>)}
            </TextField>
          )}
        </Box>
        {q.isLoading ? <Loading /> : q.isError ? <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} /> :
          q.data!.items.length === 0 ? <EmptyState title="No events yet" hint="Events appear once a device sends a location that changes its state against an enabled geofence." /> : (
            <TableContainer>
              <Table>
                <TableHead><TableRow>
                  <TableCell>Recorded</TableCell><TableCell>Event</TableCell><TableCell>State change</TableCell><TableCell>Geofence</TableCell>
                  <TableCell>Device</TableCell><TableCell>User</TableCell><TableCell>Location</TableCell><TableCell align="right">Map</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {q.data!.items.map((e) => (
                    <TableRow key={e.id} hover>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{fmtDateTime(e.recorded_at)}</TableCell>
                      <TableCell><EventChip type={e.event_type} /></TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" gap={0.75}>
                          <EventChip type={e.previous_state} /><EastRounded fontSize="small" sx={{ color: "text.secondary" }} /><EventChip type={e.current_state} />
                        </Stack>
                      </TableCell>
                      <TableCell><Typography fontWeight={600}>{geoName(e.geofence_id)}</Typography></TableCell>
                      <TableCell>{deviceName(e.device_id)}</TableCell>
                      <TableCell>{userName(e.user_id)}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{fmtCoord(e.latitude)}, {fmtCoord(e.longitude)}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Show on map"><IconButton aria-label="Show on map" onClick={() => nav(`/map?event=${e.id}&lat=${e.latitude}&lng=${e.longitude}`)}><PlaceRounded fontSize="small" /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        {q.data && q.data.total > 0 && <Pager total={q.data.total} page={page} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />}
      </Panel>
    </>
  );
}
