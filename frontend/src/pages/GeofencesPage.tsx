import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Button, Chip, IconButton, InputAdornment, MenuItem, Stack, Switch, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import AddRounded from "@mui/icons-material/AddRounded";
import EditRounded from "@mui/icons-material/EditRounded";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import MapRounded from "@mui/icons-material/MapRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { geofencesApi } from "../api/endpoints";
import { errorMessage } from "../api/client";
import type { Geofence } from "../api/types";
import { ConfirmDialog, EmptyState, ErrorState, Loading, PageHeader, Pager, Panel, useDebounced } from "../components/common";
import { useToast } from "../components/Toast";
import { fmtDate, fmtMeters } from "../lib/format";
import { useUserDirectory } from "../lib/hooks";
import { tokens } from "../theme";
import GeofenceEditor from "./GeofenceEditor";

export default function GeofencesPage() {
  const toast = useToast();
  const qc = useQueryClient();
  const nav = useNavigate();
  const { name: userName } = useUserDirectory();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const debounced = useDebounced(search);
  const [editor, setEditor] = useState<{ open: boolean; g: Geofence | null }>({ open: false, g: null });
  const [del, setDel] = useState<Geofence | null>(null);

  const q = useQuery({
    queryKey: ["geofences", "list", page, pageSize, debounced, type, status],
    queryFn: () => geofencesApi.list({ page, page_size: pageSize, search: debounced, boundary_type: type, is_active: status === "" ? undefined : status === "active" }),
    placeholderData: keepPreviousData,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["geofences"] });
    qc.invalidateQueries({ queryKey: ["audit"] });
  };

  const toggle = useMutation({
    mutationFn: (g: Geofence) => (g.is_active ? geofencesApi.disable(g.id) : geofencesApi.enable(g.id)),
    onSuccess: (g) => { toast.success(`${g.name} ${g.is_active ? "enabled" : "disabled"}`); refresh(); },
    onError: (e) => { toast.error(errorMessage(e)); refresh(); },
  });

  const remove = useMutation({
    mutationFn: (g: Geofence) => geofencesApi.remove(g.id),
    onSuccess: () => { toast.success("Geofence deleted"); setDel(null); refresh(); },
    onError: (e) => { toast.error(errorMessage(e)); setDel(null); },
  });

  const reset = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };

  return (
    <>
      <PageHeader
        title="Geofences"
        subtitle="Draw the boundaries you want to watch. Disabled geofences are skipped when locations are processed."
        actions={<Button variant="contained" startIcon={<AddRounded />} onClick={() => setEditor({ open: true, g: null })}>New geofence</Button>}
      />
      <Panel p={0}>
        <Stack direction={{ xs: "column", md: "row" }} gap={1.5} p={2}>
          <TextField placeholder="Search by name" value={search} onChange={(e) => reset(setSearch)(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment> }} sx={{ maxWidth: { md: 320 } }} />
          <TextField select label="Shape" value={type} onChange={(e) => reset(setType)(e.target.value)} sx={{ maxWidth: { md: 180 } }}>
            <MenuItem value="">All shapes</MenuItem>
            <MenuItem value="CIRCLE">Circle</MenuItem>
            <MenuItem value="POLYGON">Polygon</MenuItem>
          </TextField>
          <TextField select label="Status" value={status} onChange={(e) => reset(setStatus)(e.target.value)} sx={{ maxWidth: { md: 180 } }}>
            <MenuItem value="">Any status</MenuItem>
            <MenuItem value="active">Enabled</MenuItem>
            <MenuItem value="inactive">Disabled</MenuItem>
          </TextField>
        </Stack>
        {q.isLoading ? <Loading /> : q.isError ? <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} /> :
          q.data!.items.length === 0 ? (
            <EmptyState title="No geofences yet" hint="Create a circle or polygon to start detecting enters and exits." />
          ) : (
            <TableContainer>
              <Table size="medium">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell><TableCell>Shape</TableCell><TableCell>Size</TableCell>
                    <TableCell>Created by</TableCell><TableCell>Updated</TableCell>
                    <TableCell align="center">Enabled</TableCell><TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {q.data!.items.map((g) => (
                    <TableRow key={g.id} hover sx={{ opacity: g.is_active ? 1 : 0.7 }}>
                      <TableCell sx={{ maxWidth: 320 }}>
                        <Typography fontWeight={700}>{g.name}</Typography>
                        {g.description && <Typography variant="body2" color="text.secondary" noWrap>{g.description}</Typography>}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={g.boundary_type === "CIRCLE" ? "Circle" : "Polygon"}
                          sx={g.boundary_type === "CIRCLE" ? { background: tokens.primaryTint, color: tokens.primaryDark } : { background: "#FBF0D6", color: "#8A5E05" }} />
                      </TableCell>
                      <TableCell>{g.boundary_type === "CIRCLE" ? `${fmtMeters(g.radius_meters)} radius` : `${g.points.length} corners`}</TableCell>
                      <TableCell>{userName(g.created_by)}</TableCell>
                      <TableCell>{fmtDate(g.updated_at)}</TableCell>
                      <TableCell align="center">
                        <Switch checked={g.is_active} disabled={toggle.isPending} onChange={() => toggle.mutate(g)}
                          inputProps={{ "aria-label": `${g.is_active ? "Disable" : "Enable"} ${g.name}` }} />
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                        <Tooltip title="Show on map"><IconButton aria-label="Show on map" onClick={() => nav(`/map?geofence=${g.id}`)}><MapRounded fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Edit"><IconButton aria-label="Edit" onClick={() => setEditor({ open: true, g })}><EditRounded fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Delete"><IconButton aria-label="Delete" color="error" onClick={() => setDel(g)}><DeleteOutlineRounded fontSize="small" /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        {q.data && q.data.total > 0 && <Pager total={q.data.total} page={page} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />}
      </Panel>

      <GeofenceEditor open={editor.open} geofence={editor.g} onClose={() => setEditor({ open: false, g: null })} />
      <ConfirmDialog
        open={!!del} danger title="Delete this geofence?" confirmLabel="Delete geofence" busy={remove.isPending}
        body={<Box>“{del?.name}” will be removed permanently. If it already has recorded events, the server may refuse — disable it instead.</Box>}
        onClose={() => setDel(null)} onConfirm={() => del && remove.mutate(del)}
      />
    </>
  );
}
