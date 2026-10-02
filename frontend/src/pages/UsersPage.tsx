import { useState } from "react";
import {
  Alert, Avatar, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment, MenuItem, Stack,
  Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import PersonAddAltRounded from "@mui/icons-material/PersonAddAltRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "../api/endpoints";
import { errorMessage } from "../api/client";
import type { User } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { ActiveChip, ConfirmDialog, EmptyState, ErrorState, Loading, PageHeader, Pager, Panel, RoleChip, useDebounced } from "../components/common";
import { useToast } from "../components/Toast";
import { ROLE_NAMES, ROLE_OPTIONS } from "../lib/auth-utils";
import { fmtDate, initials } from "../lib/format";
import { tokens } from "../theme";

function UserDialog({ open, target, onClose }: { open: boolean; target: User | null; onClose: () => void }) {
  const toast = useToast();
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const [f, setF] = useState({ first_name: "", last_name: "", email: "", password: "", role_id: "2" });
  const [err, setErr] = useState("");
  const [seed, setSeed] = useState<number | null>(null);
  const key = open ? (target?.id ?? 0) : null;
  if (key !== seed) {
    setSeed(key);
    if (open) {
      setErr("");
      setF(target
        ? { first_name: target.first_name, last_name: target.last_name, email: target.email, password: "", role_id: String(target.role_id) }
        : { first_name: "", last_name: "", email: "", password: "", role_id: "2" });
    }
  }
  const isSelf = target?.id === me?.id;

  const save = useMutation({
    mutationFn: async () => {
      if (!target) {
        return usersApi.create({ first_name: f.first_name.trim(), last_name: f.last_name.trim(), email: f.email.trim(), password: f.password, role_id: Number(f.role_id) });
      }
      let u = await usersApi.update(target.id, { first_name: f.first_name.trim(), last_name: f.last_name.trim(), email: f.email.trim() });
      if (Number(f.role_id) !== target.role_id) u = await usersApi.changeRole(target.id, Number(f.role_id));
      return u;
    },
    onSuccess: () => {
      toast.success(target ? "User updated" : "User created");
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["audit"] });
      onClose();
    },
    onError: (e) => setErr(errorMessage(e)),
  });

  const valid = f.first_name.trim() && f.last_name.trim() && f.email.trim() && (target || f.password.length >= 8);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontFamily: '"Bricolage Grotesque"', fontWeight: 700 }}>{target ? "Edit user" : "New user"}</DialogTitle>
      <DialogContent>
        <Stack gap={2} pt={1}>
          {err && <Alert severity="error">{err}</Alert>}
          <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
            <TextField label="First name" value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} inputProps={{ maxLength: 100 }} required />
            <TextField label="Last name" value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} inputProps={{ maxLength: 100 }} required />
          </Stack>
          <TextField label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
          {!target && <TextField label="Temporary password" type="password" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} helperText="At least 8 characters. The user can change it from their profile." required />}
          <TextField select label="Role" value={f.role_id} onChange={(e) => setF({ ...f, role_id: e.target.value })} disabled={isSelf}
            helperText={isSelf ? "You can't change your own role." : "Admins can manage geofences, devices and users."}>
            {ROLE_OPTIONS.map((r) => <MenuItem key={r.id} value={String(r.id)}>{r.name}</MenuItem>)}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button color="inherit" onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={!valid || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? "Saving…" : target ? "Save changes" : "Create user"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function UsersPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const { user: me } = useAuth();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const debounced = useDebounced(search);
  const [dlg, setDlg] = useState<{ open: boolean; u: User | null }>({ open: false, u: null });
  const [del, setDel] = useState<User | null>(null);

  const q = useQuery({
    queryKey: ["users", "list", page, pageSize, debounced, role, status],
    queryFn: () => usersApi.list({ page, page_size: pageSize, search: debounced, role_id: role ? Number(role) : undefined, is_active: status === "" ? undefined : status === "active" }),
    placeholderData: keepPreviousData,
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["users"] }); qc.invalidateQueries({ queryKey: ["audit"] }); };

  const toggle = useMutation({
    mutationFn: (u: User) => (u.is_active ? usersApi.deactivate(u.id) : usersApi.activate(u.id)),
    onSuccess: (u) => { toast.success(`${u.first_name} ${u.last_name} ${u.is_active ? "activated" : "deactivated"}`); refresh(); },
    onError: (e) => { toast.error(errorMessage(e)); refresh(); },
  });
  const remove = useMutation({
    mutationFn: (u: User) => usersApi.remove(u.id),
    onSuccess: () => { toast.success("User deleted"); setDel(null); refresh(); },
    onError: (e) => { toast.error(errorMessage(e)); setDel(null); },
  });

  return (
    <>
      <PageHeader title="Users" subtitle="Create accounts, assign roles and deactivate access. Deactivated users can't sign in."
        actions={<Button variant="contained" startIcon={<PersonAddAltRounded />} onClick={() => setDlg({ open: true, u: null })}>New user</Button>} />
      <Panel p={0}>
        <Stack direction={{ xs: "column", md: "row" }} gap={1.5} p={2}>
          <TextField placeholder="Search name or email" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment> }} sx={{ maxWidth: { md: 320 } }} />
          <TextField select label="Role" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} sx={{ maxWidth: { md: 180 } }}>
            <MenuItem value="">All roles</MenuItem>
            {ROLE_OPTIONS.map((r) => <MenuItem key={r.id} value={String(r.id)}>{r.name}</MenuItem>)}
          </TextField>
          <TextField select label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} sx={{ maxWidth: { md: 180 } }}>
            <MenuItem value="">Any status</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </TextField>
        </Stack>
        {q.isLoading ? <Loading /> : q.isError ? <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} /> :
          q.data!.items.length === 0 ? <EmptyState title="No users match" hint="Try clearing a filter or search term." /> : (
            <TableContainer>
              <Table>
                <TableHead><TableRow>
                  <TableCell>User</TableCell><TableCell>Role</TableCell><TableCell>Status</TableCell><TableCell>Joined</TableCell>
                  <TableCell align="center">Active</TableCell><TableCell align="right">Actions</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {q.data!.items.map((u) => {
                    const self = u.id === me?.id;
                    return (
                      <TableRow key={u.id} hover>
                        <TableCell>
                          <Stack direction="row" alignItems="center" gap={1.5}>
                            <Avatar sx={{ width: 36, height: 36, fontSize: 13, fontWeight: 700, bgcolor: tokens.primaryTint, color: tokens.primaryDark }}>{initials(u.first_name, u.last_name)}</Avatar>
                            <div>
                              <Typography fontWeight={700}>{u.first_name} {u.last_name}{self && <Typography component="span" color="text.secondary"> (you)</Typography>}</Typography>
                              <Typography variant="body2" color="text.secondary">{u.email}</Typography>
                            </div>
                          </Stack>
                        </TableCell>
                        <TableCell><RoleChip name={ROLE_NAMES[u.role_id] ?? `Role ${u.role_id}`} /></TableCell>
                        <TableCell><ActiveChip active={u.is_active} /></TableCell>
                        <TableCell>{fmtDate(u.created_at)}</TableCell>
                        <TableCell align="center">
                          <Tooltip title={self ? "You can't change your own status" : ""}>
                            <span><Switch checked={u.is_active} disabled={self || toggle.isPending} onChange={() => toggle.mutate(u)} inputProps={{ "aria-label": `Toggle ${u.first_name}` }} /></span>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                          <Tooltip title="Edit"><IconButton aria-label="Edit" onClick={() => setDlg({ open: true, u })}><EditRounded fontSize="small" /></IconButton></Tooltip>
                          <Tooltip title={self ? "You can't delete your own account" : "Delete"}>
                            <span><IconButton aria-label="Delete" color="error" disabled={self} onClick={() => setDel(u)}><DeleteOutlineRounded fontSize="small" /></IconButton></span>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        {q.data && q.data.total > 0 && <Pager total={q.data.total} page={page} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />}
      </Panel>
      <UserDialog open={dlg.open} target={dlg.u} onClose={() => setDlg({ open: false, u: null })} />
      <ConfirmDialog open={!!del} danger title="Delete this user?" confirmLabel="Delete user" busy={remove.isPending}
        body={<>{del?.first_name} {del?.last_name} ({del?.email}) will be removed permanently. If they own devices or events the server may refuse — deactivate them instead.</>}
        onClose={() => setDel(null)} onConfirm={() => del && remove.mutate(del)} />
    </>
  );
}
