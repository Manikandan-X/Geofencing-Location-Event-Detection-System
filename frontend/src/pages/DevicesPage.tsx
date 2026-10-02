import { useState } from "react";
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment, MenuItem, Stack, Switch,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { devicesApi } from "../api/endpoints";
import { errorMessage } from "../api/client";
import type { Device } from "../api/types";
import { ActiveChip, ConfirmDialog, EmptyState, ErrorState, Loading, PageHeader, Pager, Panel, useDebounced } from "../components/common";
import { useToast } from "../components/Toast";
import { fmtDate } from "../lib/format";
import { useUserDirectory } from "../lib/hooks";

function DeviceDialog({ open, device, onClose }: { open: boolean; device: Device | null; onClose: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const { users } = useUserDirectory();
  const [f, setF] = useState({ user_id: "", device_identifier: "", name: "" });
  const [err, setErr] = useState("");
  const [seed, setSeed] = useState<number | null>(null);

  // Reset the form each time the dialog opens for a different target.
  const key = open ? (device?.id ?? 0) : null;
  if (key !== seed) {
    setSeed(key);
    if (open) {
      setF(device ? { user_id: String(device.user_id), device_identifier: device.device_identifier, name: device.name } : { user_id: "", device_identifier: "", name: "" });
      setErr("");
    }
  }

  const save = useMutation({
    mutationFn: () => {
      const body = { user_id: Number(f.user_id), device_identifier: f.device_identifier.trim(), name: f.name.trim() };
      return device ? devicesApi.update(device.id, body) : devicesApi.create(body);
    },
    onSuccess: () => {
      toast.success(device ? "Device updated" : "Device created");
      qc.invalidateQueries({ queryKey: ["devices"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
      onClose();
    },
    onError: (e) => setErr(errorMessage(e)),
  });

  const valid = f.user_id && f.device_identifier.trim() && f.name.trim();

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontFamily: '"Bricolage Grotesque"', fontWeight: 700 }}>{device ? "Edit device" : "New device"}</DialogTitle>
      <DialogContent>
        <Stack gap={2} pt={1}>
          {err && <Alert severity="error">{err}</Alert>}
          <TextField select label="Owner" value={f.user_id} onChange={(e) => setF({ ...f, user_id: e.target.value })} required
            helperText="Only the owner can send locations for this device.">
            {users.filter((u) => u.is_active || u.id === device?.user_id).map((u) => (
              <MenuItem key={u.id} value={String(u.id)}>{u.first_name} {u.last_name} · {u.email}</MenuItem>
            ))}
          </TextField>
          <TextField label="Device name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} inputProps={{ maxLength: 100 }} required />
          <TextField label="Device identifier" value={f.device_identifier} onChange={(e) => setF({ ...f, device_identifier: e.target.value })}
            helperText="A unique ID such as an IMEI or serial number." inputProps={{ maxLength: 255 }} required />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="inherit" onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!valid || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? "Saving…" : device ? "Save changes" : "Create device"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function DevicesPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const { users, name: userName } = useUserDirectory();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [owner, setOwner] = useState("");
  const [status, setStatus] = useState("");
  const debounced = useDebounced(search);
  const [dlg, setDlg] = useState<{ open: boolean; d: Device | null }>({ open: false, d: null });
  const [del, setDel] = useState<Device | null>(null);

  const q = useQuery({
    queryKey: ["devices", "list", page, pageSize, debounced, owner, status],
    queryFn: () => devicesApi.list({ page, page_size: pageSize, search: debounced, user_id: owner ? Number(owner) : undefined, is_active: status === "" ? undefined : status === "active" }),
    placeholderData: keepPreviousData,
  });

  const refresh = () => { qc.invalidateQueries({ queryKey: ["devices"] }); qc.invalidateQueries({ queryKey: ["audit"] }); };
  const toggle = useMutation({
    mutationFn: (d: Device) => (d.is_active ? devicesApi.deactivate(d.id) : devicesApi.activate(d.id)),
    onSuccess: (d) => { toast.success(`${d.name} ${d.is_active ? "activated" : "deactivated"}`); refresh(); },
    onError: (e) => { toast.error(errorMessage(e)); refresh(); },
  });
  const remove = useMutation({
    mutationFn: (d: Device) => devicesApi.remove(d.id),
    onSuccess: () => { toast.success("Device deleted"); setDel(null); refresh(); },
    onError: (e) => { toast.error(errorMessage(e)); setDel(null); },
  });

  return (
    <>
      <PageHeader title="Devices" subtitle="Register the phones and trackers that report locations. Inactive devices can't send locations."
        actions={<Button variant="contained" startIcon={<AddRounded />} onClick={() => setDlg({ open: true, d: null })}>New device</Button>} />
      <Panel p={0}>
        <Stack direction={{ xs: "column", md: "row" }} gap={1.5} p={2}>
          <TextField placeholder="Search name or identifier" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment> }} sx={{ maxWidth: { md: 320 } }} />
          <TextField select label="Owner" value={owner} onChange={(e) => { setOwner(e.target.value); setPage(1); }} sx={{ maxWidth: { md: 260 } }}>
            <MenuItem value="">All owners</MenuItem>
            {users.map((u) => <MenuItem key={u.id} value={String(u.id)}>{u.first_name} {u.last_name}</MenuItem>)}
          </TextField>
          <TextField select label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} sx={{ maxWidth: { md: 180 } }}>
            <MenuItem value="">Any status</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </TextField>
        </Stack>
        {q.isLoading ? <Loading /> : q.isError ? <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} /> :
          q.data!.items.length === 0 ? <EmptyState title="No devices found" hint="Add a device and assign it to a user so they can start sending locations." /> : (
            <TableContainer>
              <Table>
                <TableHead><TableRow>
                  <TableCell>ID</TableCell><TableCell>Device</TableCell><TableCell>Identifier</TableCell><TableCell>Owner</TableCell>
                  <TableCell>Status</TableCell><TableCell>Created</TableCell><TableCell align="center">Active</TableCell><TableCell align="right">Actions</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {q.data!.items.map((d) => (
                    <TableRow key={d.id} hover>
                      <TableCell>{d.id}</TableCell>
                      <TableCell><Typography fontWeight={700}>{d.name}</Typography></TableCell>
                      <TableCell>{d.device_identifier}</TableCell>
                      <TableCell>{userName(d.user_id)}</TableCell>
                      <TableCell><ActiveChip active={d.is_active} /></TableCell>
                      <TableCell>{fmtDate(d.created_at)}</TableCell>
                      <TableCell align="center"><Switch checked={d.is_active} disabled={toggle.isPending} onChange={() => toggle.mutate(d)} inputProps={{ "aria-label": `Toggle ${d.name}` }} /></TableCell>
                      <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                        <Tooltip title="Edit"><IconButton aria-label="Edit" onClick={() => setDlg({ open: true, d })}><EditRounded fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Delete"><IconButton aria-label="Delete" color="error" onClick={() => setDel(d)}><DeleteOutlineRounded fontSize="small" /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        {q.data && q.data.total > 0 && <Pager total={q.data.total} page={page} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />}
      </Panel>
      <DeviceDialog open={dlg.open} device={dlg.d} onClose={() => setDlg({ open: false, d: null })} />
      <ConfirmDialog open={!!del} danger title="Delete this device?" confirmLabel="Delete device" busy={remove.isPending}
        body="The device is removed permanently. If it already has recorded locations or events the server may refuse — deactivate it instead."
        onClose={() => setDel(null)} onConfirm={() => del && remove.mutate(del)} />
    </>
  );
}
