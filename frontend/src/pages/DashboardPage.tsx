import { Link as RouterLink } from "react-router-dom";
import { Box, Button, Divider, Stack, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { Marker } from "react-leaflet";
import { devicesApi, eventsApi, geofencesApi, locationsApi, usersApi } from "../api/endpoints";
import { useAuth } from "../auth/AuthContext";
import { EmptyState, EventChip, Loading, PageHeader, Panel } from "../components/common";
import { BaseMap, eventIcon, FitBounds, GeofenceLayer } from "../components/MapParts";
import { fmtDateTime } from "../lib/format";
import { geofenceBoundsPoints } from "../lib/geo";
import { useDeviceDirectory, useGeofenceDirectory, useUserDirectory } from "../lib/hooks";
import { eventColor, tokens } from "../theme";

const total = <T extends { total: number }>(q: { data?: T }) => q.data?.total ?? "—";

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const { name: userName } = useUserDirectory();
  const { name: deviceName } = useDeviceDirectory();
  const { geofences, name: geoName } = useGeofenceDirectory();

  const events = useQuery({ queryKey: ["dashboard", "events"], queryFn: () => eventsApi.list({ page: 1, page_size: 100 }), refetchInterval: 30_000 });
  const gAll = useQuery({ queryKey: ["dashboard", "g-all"], queryFn: () => geofencesApi.list({ page: 1, page_size: 1 }), enabled: isAdmin });
  const gOn = useQuery({ queryKey: ["dashboard", "g-on"], queryFn: () => geofencesApi.list({ page: 1, page_size: 1, is_active: true }), enabled: isAdmin });
  const dAll = useQuery({ queryKey: ["dashboard", "d-all"], queryFn: () => devicesApi.list({ page: 1, page_size: 1 }), enabled: isAdmin });
  const dOn = useQuery({ queryKey: ["dashboard", "d-on"], queryFn: () => devicesApi.list({ page: 1, page_size: 1, is_active: true }), enabled: isAdmin });
  const uAll = useQuery({ queryKey: ["dashboard", "u-all"], queryFn: () => usersApi.list({ page: 1, page_size: 1 }), enabled: isAdmin });
  const locs = useQuery({ queryKey: ["dashboard", "locs"], queryFn: () => locationsApi.list({ page: 1, page_size: 1 }) });

  const items = events.data?.items ?? [];
  const mix = (["ENTER", "EXIT", "INSIDE"] as const).map((t) => ({ t, n: items.filter((e) => e.event_type === t).length }));
  const mixTotal = mix.reduce((s, m) => s + m.n, 0);

  const stats = isAdmin
    ? [
        { k: "Geofences", v: total(gAll), sub: `${total(gOn)} enabled` },
        { k: "Devices", v: total(dAll), sub: `${total(dOn)} active` },
        { k: "Users", v: total(uAll), sub: "with access" },
        { k: "Events recorded", v: total(events), sub: "all time" },
      ]
    : [
        { k: "Events recorded", v: total(events), sub: "for your devices" },
        { k: "Locations sent", v: total(locs), sub: "all time" },
      ];

  const fit = [...geofences.flatMap(geofenceBoundsPoints), ...items.slice(0, 30).map((e) => [e.latitude, e.longitude] as [number, number])];

  return (
    <>
      <PageHeader title={`Welcome back, ${user?.first_name}`} subtitle="Here is what the detection engine has seen recently."
        actions={<Button variant="contained" component={RouterLink} to="/map">Open live map</Button>} />

      <Panel p={0} sx={{ mb: 3 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: `repeat(${stats.length}, 1fr)` } }}>
          {stats.map((s, i) => (
            <Box key={s.k} sx={{ p: 2.5, borderLeft: { md: i ? `1px solid ${tokens.line}` : 0 }, borderTop: { xs: i > 1 ? `1px solid ${tokens.line}` : 0, md: 0 } }}>
              <Typography color="text.secondary" fontWeight={600}>{s.k}</Typography>
              <Typography sx={{ fontFamily: '"Bricolage Grotesque"', fontWeight: 700, fontSize: 40, lineHeight: 1.1, mt: 0.5 }}>{s.v}</Typography>
              <Typography variant="body2" color="text.secondary">{s.sub}</Typography>
            </Box>
          ))}
        </Box>
      </Panel>

      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", lg: "minmax(0,1fr) minmax(0,1.1fr)" }, alignItems: "start" }}>
        <Panel p={0}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" p={2.5} pb={1.5}>
            <Typography variant="h6">Recent events</Typography>
            <Button component={RouterLink} to="/events" size="small">View all</Button>
          </Stack>
          {events.isLoading ? <Loading /> : items.length === 0 ? (
            <EmptyState title="No events yet" hint="Send a location from a device that crosses a geofence boundary and the enter or exit will appear here." />
          ) : (
            <Stack divider={<Divider />}>
              {items.slice(0, 8).map((e) => (
                <Stack key={e.id} direction="row" alignItems="center" gap={1.5} px={2.5} py={1.5}>
                  <EventChip type={e.event_type} />
                  <Box minWidth={0} flex={1}>
                    <Typography fontWeight={600} noWrap>{isAdmin ? geoName(e.geofence_id) : `Geofence #${e.geofence_id}`}</Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>{isAdmin ? deviceName(e.device_id) : `Device #${e.device_id}`} · {userName(e.user_id)}</Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>{fmtDateTime(e.recorded_at)}</Typography>
                </Stack>
              ))}
            </Stack>
          )}
          {mixTotal > 0 && (
            <Box p={2.5} sx={{ borderTop: `1px solid ${tokens.line}` }}>
              <Typography variant="body2" fontWeight={700} mb={1}>Mix across the latest {items.length} events</Typography>
              <Stack direction="row" sx={{ height: 10, borderRadius: 5, overflow: "hidden", background: tokens.line }}>
                {mix.filter((m) => m.n).map((m) => <Box key={m.t} sx={{ width: `${(m.n / mixTotal) * 100}%`, background: eventColor(m.t) }} />)}
              </Stack>
              <Stack direction="row" gap={2.5} mt={1} flexWrap="wrap">
                {mix.map((m) => (
                  <Stack key={m.t} direction="row" alignItems="center" gap={0.75}>
                    <Box sx={{ width: 9, height: 9, borderRadius: "50%", background: eventColor(m.t) }} />
                    <Typography variant="body2">{m.t.charAt(0) + m.t.slice(1).toLowerCase()} {m.n}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Box>
          )}
        </Panel>

        <Panel p={0} sx={{ overflow: "hidden", height: { xs: 360, lg: 520 } }}>
          <BaseMap>
            <FitBounds positions={fit} maxZoom={15} />
            <GeofenceLayer geofences={geofences} />
            {items.slice(0, 30).map((e) => <Marker key={e.id} position={[e.latitude, e.longitude]} icon={eventIcon(e.event_type)} />)}
          </BaseMap>
        </Panel>
      </Box>
    </>
  );
}
