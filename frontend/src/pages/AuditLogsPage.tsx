import { Fragment, useState } from "react";
import {
  Box, Chip, Collapse, FormControlLabel, IconButton, MenuItem, Switch, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { auditApi } from "../api/endpoints";
import { errorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { EmptyState, ErrorState, Loading, PageHeader, Pager, Panel, useDebounced } from "../components/common";
import { fmtDateTime, humanizeAction, prettyDetails } from "../lib/format";
import { useUserDirectory } from "../lib/hooks";
import { tokens } from "../theme";

// Mirrors app/constants/audit.py
const ACTIONS = [
  "USER_CREATED", "USER_UPDATED", "USER_ROLE_CHANGED", "USER_ACTIVATED", "USER_DEACTIVATED", "USER_DELETED", "USER_PASSWORD_CHANGED",
  "GEOFENCE_CREATED", "GEOFENCE_UPDATED", "GEOFENCE_ENABLED", "GEOFENCE_DISABLED", "GEOFENCE_DELETED",
  "DEVICE_CREATED", "DEVICE_UPDATED", "DEVICE_ACTIVATED", "DEVICE_DEACTIVATED", "DEVICE_DELETED",
];
const ENTITIES = ["USER", "GEOFENCE", "DEVICE"];

const tone = (a: string) =>
  /DELETED|DEACTIVATED|DISABLED/.test(a) ? tokens.exit : /CREATED|ACTIVATED|ENABLED/.test(a) ? tokens.enter : tokens.primary;

/** Backend compares against naive datetimes, so send UTC without an offset. */
const toNaiveUtc = (local: string) => (local ? new Date(local).toISOString().slice(0, 19) : undefined);

export default function AuditLogsPage() {
  const { isAdmin } = useAuth();
  const { name: userName } = useUserDirectory();
  const [onlyMine, setOnlyMine] = useState(!isAdmin);
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [entityId, setEntityId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [open, setOpen] = useState<number | null>(null);
  const dId = useDebounced(entityId);

  const scopeAll = isAdmin && !onlyMine;
  const q = useQuery({
    queryKey: ["audit", scopeAll ? "all" : "mine", page, pageSize, action, entity, dId, from, to, sort],
    queryFn: () => (scopeAll ? auditApi.all : auditApi.mine)({
      page, page_size: pageSize, action, entity_type: entity, entity_id: dId,
      from_date: toNaiveUtc(from), to_date: toNaiveUtc(to), sort_order: sort,
    }),
    placeholderData: keepPreviousData,
  });
  const f = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1); };

  return (
    <>
      <PageHeader
        title="Audit logs"
        subtitle={scopeAll ? "Every change made to users, geofences and devices." : "Changes made by you."}
        actions={isAdmin ? (
          <FormControlLabel control={<Switch checked={onlyMine} onChange={(e) => f(setOnlyMine)(e.target.checked)} />} label="Only my activity" />
        ) : undefined}
      />
      <Panel p={0}>
        <Box sx={{ display: "grid", gap: 1.5, p: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(6, 1fr)" } }}>
          <TextField select label="Action" value={action} onChange={(e) => f(setAction)(e.target.value)}>
            <MenuItem value="">All actions</MenuItem>
            {ACTIONS.map((a) => <MenuItem key={a} value={a}>{humanizeAction(a)}</MenuItem>)}
          </TextField>
          <TextField select label="Entity" value={entity} onChange={(e) => f(setEntity)(e.target.value)}>
            <MenuItem value="">All entities</MenuItem>
            {ENTITIES.map((a) => <MenuItem key={a} value={a}>{a.charAt(0) + a.slice(1).toLowerCase()}</MenuItem>)}
          </TextField>
          <TextField label="Entity ID" value={entityId} onChange={(e) => f(setEntityId)(e.target.value)} inputProps={{ maxLength: 100 }} />
          <TextField label="From" type="datetime-local" value={from} onChange={(e) => f(setFrom)(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField label="To" type="datetime-local" value={to} onChange={(e) => f(setTo)(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField select label="Order" value={sort} onChange={(e) => f(setSort)(e.target.value)}>
            <MenuItem value="desc">Newest first</MenuItem>
            <MenuItem value="asc">Oldest first</MenuItem>
          </TextField>
        </Box>
        {q.isLoading ? <Loading /> : q.isError ? <ErrorState message={errorMessage(q.error)} onRetry={() => q.refetch()} /> :
          q.data!.items.length === 0 ? <EmptyState title="No log entries" hint="Nothing matches these filters yet." /> : (
            <TableContainer>
              <Table>
                <TableHead><TableRow>
                  <TableCell width={48} /><TableCell>When</TableCell><TableCell>Action</TableCell><TableCell>Entity</TableCell><TableCell>Done by</TableCell>
                </TableRow></TableHead>
                <TableBody>
                  {q.data!.items.map((a) => {
                    const details = prettyDetails(a.details);
                    const c = tone(a.action);
                    return (
                      <Fragment key={a.id}>
                        <TableRow hover sx={{ cursor: details ? "pointer" : "default", "& > td": { borderBottom: open === a.id ? 0 : undefined } }} onClick={() => details && setOpen(open === a.id ? null : a.id)}>
                          <TableCell>
                            {details && (
                              <IconButton size="small" aria-label={open === a.id ? "Hide details" : "Show details"} aria-expanded={open === a.id}
                                sx={{ transform: open === a.id ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
                                <ExpandMoreRounded fontSize="small" />
                              </IconButton>
                            )}
                          </TableCell>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>{fmtDateTime(a.created_at)}</TableCell>
                          <TableCell><Chip size="small" label={humanizeAction(a.action)} sx={{ background: `${c}1A`, color: c, border: `1px solid ${c}55` }} /></TableCell>
                          <TableCell>{a.entity_type.charAt(0) + a.entity_type.slice(1).toLowerCase()}{a.entity_id && <Typography component="span" color="text.secondary"> #{a.entity_id}</Typography>}</TableCell>
                          <TableCell>{userName(a.user_id)}</TableCell>
                        </TableRow>
                        {details && (
                          <TableRow>
                            <TableCell colSpan={5} sx={{ py: 0, border: 0 }}>
                              <Collapse in={open === a.id} unmountOnExit>
                                <Box component="pre" sx={{ m: 0, mb: 1.5, p: 1.5, borderRadius: 2, background: "#F4F6FB", fontSize: 13, overflowX: "auto", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{details}</Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        {q.data && q.data.total > 0 && <Pager total={q.data.total} page={page} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />}
      </Panel>
    </>
  );
}
