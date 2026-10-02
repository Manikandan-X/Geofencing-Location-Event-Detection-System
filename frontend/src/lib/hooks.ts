import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthContext";
import { devicesApi, geofencesApi, usersApi } from "../api/endpoints";
import type { Device, Geofence, User } from "../api/types";

/** Users, devices and geofences are admin-only endpoints; non-admins fall back to "#id" labels. */
export function useUserDirectory() {
  const { user, isAdmin } = useAuth();
  const q = useQuery({
    queryKey: ["users", "directory"],
    queryFn: () => usersApi.list({ page: 1, page_size: 100 }),
    enabled: isAdmin,
    staleTime: 60_000,
  });
  const users: User[] = useMemo(() => q.data?.items ?? (user ? [user] : []), [q.data, user]);
  const byId = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const name = (id: number | null | undefined) => {
    if (id == null) return "System";
    const u = byId.get(id) ?? (user && user.id === id ? user : undefined);
    return u ? `${u.first_name} ${u.last_name}` : `User #${id}`;
  };
  return { users, name, truncated: (q.data?.total ?? 0) > 100 };
}

export function useDeviceDirectory() {
  const { isAdmin } = useAuth();
  const q = useQuery({
    queryKey: ["devices", "directory"],
    queryFn: () => devicesApi.list({ page: 1, page_size: 100 }),
    enabled: isAdmin,
    staleTime: 60_000,
  });
  const devices: Device[] = useMemo(() => q.data?.items ?? [], [q.data]);
  const byId = useMemo(() => new Map(devices.map((d) => [d.id, d])), [devices]);
  const name = (id: number) => byId.get(id)?.name ?? `Device #${id}`;
  return { devices, byId, name };
}

export function useGeofenceDirectory() {
  const { isAdmin } = useAuth();
  const q = useQuery({
    queryKey: ["geofences", "directory"],
    queryFn: () => geofencesApi.list({ page: 1, page_size: 100 }),
    enabled: isAdmin,
    staleTime: 30_000,
  });
  const geofences: Geofence[] = useMemo(() => q.data?.items ?? [], [q.data]);
  const byId = useMemo(() => new Map(geofences.map((g) => [g.id, g])), [geofences]);
  const name = (id: number) => byId.get(id)?.name ?? `Geofence #${id}`;
  return { geofences, byId, name, loading: q.isLoading };
}
