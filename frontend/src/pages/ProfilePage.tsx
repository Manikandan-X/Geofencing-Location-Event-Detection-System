import { useEffect, useState } from "react";
import { Alert, Avatar, Box, Button, Divider, Stack, TextField, Typography } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { auditApi, authApi } from "../api/endpoints";
import { errorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { EmptyState, PageHeader, Panel, RoleChip } from "../components/common";
import { useToast } from "../components/Toast";
import { fmtDate, fmtDateTime, humanizeAction, initials } from "../lib/format";
import { tokens } from "../theme";

export default function ProfilePage() {
  const { user, setUser, roleName } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();

  const [f, setF] = useState({ first_name: "", last_name: "", email: "" });
  const [profileErr, setProfileErr] = useState("");
  useEffect(() => { if (user) setF({ first_name: user.first_name, last_name: user.last_name, email: user.email }); }, [user]);

  const [pw, setPw] = useState({ current_password: "", new_password: "", confirm: "" });
  const [pwErr, setPwErr] = useState("");

  const dirty = !!user && (f.first_name !== user.first_name || f.last_name !== user.last_name || f.email !== user.email);

  const saveProfile = useMutation({
    mutationFn: () => authApi.updateMe({ first_name: f.first_name.trim(), last_name: f.last_name.trim(), email: f.email.trim() }),
    onSuccess: (u) => { setUser(u); setProfileErr(""); toast.success("Profile updated"); qc.invalidateQueries({ queryKey: ["audit"] }); },
    onError: (e) => setProfileErr(errorMessage(e)),
  });

  const changePw = useMutation({
    mutationFn: () => authApi.changePassword({ current_password: pw.current_password, new_password: pw.new_password }),
    onSuccess: () => { setPw({ current_password: "", new_password: "", confirm: "" }); setPwErr(""); toast.success("Password changed"); qc.invalidateQueries({ queryKey: ["audit"] }); },
    onError: (e) => setPwErr(errorMessage(e)),
  });

  const activity = useQuery({ queryKey: ["audit", "mine", "profile"], queryFn: () => auditApi.mine({ page: 1, page_size: 6 }) });

  if (!user) return null;
  const mismatch = pw.confirm.length > 0 && pw.confirm !== pw.new_password;
  const pwValid = pw.current_password && pw.new_password.length >= 8 && pw.new_password === pw.confirm;

  return (
    <>
      <PageHeader title="Your profile" subtitle="Update your details and keep your password current." />
      <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", lg: "340px 1fr" }, alignItems: "start" }}>
        <Panel>
          <Stack alignItems="center" textAlign="center" gap={1.25} py={1}>
            <Avatar sx={{ width: 84, height: 84, fontSize: 30, fontWeight: 700, fontFamily: '"Bricolage Grotesque"', bgcolor: tokens.primary }}>{initials(user.first_name, user.last_name)}</Avatar>
            <Typography variant="h5">{user.first_name} {user.last_name}</Typography>
            <Typography color="text.secondary">{user.email}</Typography>
            <RoleChip name={roleName} />
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Stack gap={1}>
            <Row k="Member since" v={fmtDate(user.created_at)} />
            <Row k="Last updated" v={fmtDate(user.updated_at)} />
            <Row k="Account" v={user.is_active ? "Active" : "Inactive"} />
          </Stack>
        </Panel>

        <Stack gap={3}>
          <Panel>
            <Typography variant="h6" mb={2}>Personal details</Typography>
            <Stack gap={2} maxWidth={560}>
              {profileErr && <Alert severity="error">{profileErr}</Alert>}
              <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
                <TextField label="First name" value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} inputProps={{ maxLength: 100 }} />
                <TextField label="Last name" value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} inputProps={{ maxLength: 100 }} />
              </Stack>
              <TextField label="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
              <Stack direction="row" gap={1}>
                <Button variant="contained" disabled={!dirty || saveProfile.isPending || !f.first_name.trim() || !f.last_name.trim() || !f.email.trim()} onClick={() => saveProfile.mutate()}>
                  {saveProfile.isPending ? "Saving…" : "Save changes"}
                </Button>
                <Button color="inherit" disabled={!dirty} onClick={() => setF({ first_name: user.first_name, last_name: user.last_name, email: user.email })}>Discard</Button>
              </Stack>
            </Stack>
          </Panel>

          <Panel>
            <Typography variant="h6" mb={2}>Change password</Typography>
            <Stack gap={2} maxWidth={560}>
              {pwErr && <Alert severity="error">{pwErr}</Alert>}
              <TextField label="Current password" type="password" autoComplete="current-password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} />
              <TextField label="New password" type="password" autoComplete="new-password" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} helperText="At least 8 characters" />
              <TextField label="Confirm new password" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} error={mismatch} helperText={mismatch ? "Passwords don't match" : " "} />
              <Box><Button variant="contained" disabled={!pwValid || changePw.isPending} onClick={() => changePw.mutate()}>{changePw.isPending ? "Updating…" : "Update password"}</Button></Box>
            </Stack>
          </Panel>

          <Panel>
            <Typography variant="h6" mb={1}>Recent activity on your account</Typography>
            {activity.data?.items.length ? (
              <Stack divider={<Divider />}>
                {activity.data.items.map((a) => (
                  <Stack key={a.id} direction="row" justifyContent="space-between" py={1.25} gap={2}>
                    <Typography fontWeight={600}>{humanizeAction(a.action)}</Typography>
                    <Typography color="text.secondary" variant="body2" noWrap>{fmtDateTime(a.created_at)}</Typography>
                  </Stack>
                ))}
              </Stack>
            ) : <EmptyState title="Nothing yet" hint="Changes you make will be listed here and on the Audit logs page." />}
          </Panel>
        </Stack>
      </Box>
    </>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => (
  <Stack direction="row" justifyContent="space-between"><Typography color="text.secondary">{k}</Typography><Typography fontWeight={600}>{v}</Typography></Stack>
);
