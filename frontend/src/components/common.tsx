import { useEffect, useState, type ReactNode } from "react";
import {
  Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  Stack, TablePagination, Typography,
} from "@mui/material";
import { eventColor, tokens } from "../theme";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "flex-end" }} gap={2} mb={3}>
      <Box>
        <Typography variant="h4" component="h1">{title}</Typography>
        {subtitle && <Typography color="text.secondary" mt={0.5} maxWidth={620}>{subtitle}</Typography>}
      </Box>
      {actions && <Stack direction="row" gap={1} flexWrap="wrap">{actions}</Stack>}
    </Stack>
  );
}

export function Panel({ children, p = 2.5, sx }: { children: ReactNode; p?: number; sx?: object }) {
  return (
    <Box sx={{ background: tokens.paper, border: `1px solid ${tokens.line}`, borderRadius: 3, p, ...sx }}>{children}</Box>
  );
}

export function EventChip({ type, size = "small" }: { type: string; size?: "small" | "medium" }) {
  const c = eventColor(type);
  return (
    <Chip
      size={size}
      label={type.charAt(0) + type.slice(1).toLowerCase()}
      sx={{ background: `${c}1A`, color: c, border: `1px solid ${c}55` }}
    />
  );
}

export function ActiveChip({ active, on = "Active", off = "Inactive" }: { active: boolean; on?: string; off?: string }) {
  const c = active ? tokens.enter : tokens.outside;
  return <Chip size="small" label={active ? on : off} sx={{ background: `${c}1A`, color: c, border: `1px solid ${c}55` }} />;
}

export function RoleChip({ name }: { name: string }) {
  const admin = name === "Admin";
  return (
    <Chip
      size="small"
      label={name}
      sx={admin ? { background: tokens.primaryTint, color: tokens.primaryDark, border: `1px solid ${tokens.primary}44` } : { background: "#F2F4F8", color: tokens.muted }}
    />
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <Stack alignItems="center" justifyContent="center" py={8} gap={1.5} role="status">
      <CircularProgress size={28} />
      <Typography color="text.secondary" variant="body2">{label}</Typography>
    </Stack>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <Stack alignItems="center" textAlign="center" py={7} px={2} gap={1}>
      <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden>
        <circle cx="32" cy="32" r="28" fill="none" stroke={tokens.line} strokeWidth="2" strokeDasharray="4 5" />
        <circle cx="32" cy="32" r="14" fill="none" stroke={tokens.primary} strokeOpacity=".5" strokeWidth="2" />
        <circle cx="32" cy="32" r="3" fill={tokens.marigold} />
      </svg>
      <Typography variant="h6">{title}</Typography>
      {hint && <Typography color="text.secondary" maxWidth={420}>{hint}</Typography>}
      {action}
    </Stack>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <EmptyState
      title="Couldn't load this data"
      hint={message}
      action={onRetry && <Button variant="outlined" onClick={onRetry}>Try again</Button>}
    />
  );
}

export function ConfirmDialog({
  open, title, body, confirmLabel, danger, busy, onConfirm, onClose,
}: {
  open: boolean; title: string; body: ReactNode; confirmLabel: string; danger?: boolean; busy?: boolean;
  onConfirm: () => void; onClose: () => void;
}) {
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontFamily: '"Bricolage Grotesque"', fontWeight: 700 }}>{title}</DialogTitle>
      <DialogContent><DialogContentText component="div">{body}</DialogContentText></DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={busy} color="inherit">Cancel</Button>
        <Button onClick={onConfirm} disabled={busy} variant="contained" color={danger ? "error" : "primary"}>
          {busy ? "Working…" : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** Server-side pagination footer. `page` is 1-based like the API. */
export function Pager({
  total, page, pageSize, onPage, onPageSize,
}: { total: number; page: number; pageSize: number; onPage: (p: number) => void; onPageSize: (s: number) => void }) {
  return (
    <TablePagination
      component="div"
      count={total}
      page={Math.max(0, page - 1)}
      rowsPerPage={pageSize}
      rowsPerPageOptions={[10, 20, 50, 100]}
      onPageChange={(_, p) => onPage(p + 1)}
      onRowsPerPageChange={(e) => { onPageSize(Number(e.target.value)); onPage(1); }}
      sx={{ borderTop: `1px solid ${tokens.line}` }}
    />
  );
}

export function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

export const mono = { fontFamily: '"Hanken Grotesk"', fontVariantNumeric: "tabular-nums" as const };
