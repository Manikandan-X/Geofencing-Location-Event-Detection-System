import { useState, type FormEvent, type ReactNode } from "react";
import { Link as RouterLink, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Alert, Box, Button, Link, Stack, TextField, Typography } from "@mui/material";
import { useAuth } from "../auth/AuthContext";
import { authApi } from "../api/endpoints";
import { errorMessage } from "../api/client";
import { Brand } from "../components/Brand";
import { useToast } from "../components/Toast";
import { tokens } from "../theme";

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <Box sx={{ minHeight: "100vh", display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0,1.05fr) minmax(0,1fr)" } }}>
      <Box
        sx={{
          display: { xs: "none", md: "flex" }, position: "relative", overflow: "hidden", p: 6, color: "#fff",
          flexDirection: "column", justifyContent: "space-between",
          background: `linear-gradient(160deg, ${tokens.primary} 0%, ${tokens.primaryDark} 100%)`,
        }}
      >
        <Brand light />
        <svg viewBox="0 0 400 400" className="rings" style={{ position: "absolute", right: -90, top: "18%", width: 520, opacity: 0.9 }} aria-hidden>
          <circle cx="200" cy="200" r="190" fill="none" stroke="#fff" strokeOpacity=".18" strokeWidth="2" />
          <circle cx="200" cy="200" r="140" fill="none" stroke="#fff" strokeOpacity=".3" strokeWidth="2" />
          <circle cx="200" cy="200" r="90" fill="none" stroke="#fff" strokeOpacity=".5" strokeWidth="2" strokeDasharray="6 8" />
          <circle cx="200" cy="200" r="42" fill="rgba(244,182,63,.18)" stroke="#F4B63F" strokeWidth="3" />
          <circle cx="200" cy="200" r="6" fill="#F4B63F" />
        </svg>
        <Box position="relative" maxWidth={440}>
          <Typography variant="h3" sx={{ fontSize: 40, lineHeight: 1.08 }}>
            Know the moment something crosses the line.
          </Typography>
          <Typography mt={2} sx={{ opacity: 0.85, fontSize: 17 }}>
            Draw boundaries, track devices and review every enter and exit with the state it came from.
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: "grid", placeItems: "center", p: { xs: 3, md: 6 }, background: tokens.paper }}>
        <Box width="100%" maxWidth={400}>
          <Box display={{ md: "none" }} mb={4}><Brand /></Box>
          <Typography variant="h4" component="h1">{title}</Typography>
          <Typography color="text.secondary" mt={0.75} mb={3.5}>{subtitle}</Typography>
          {children}
        </Box>
      </Box>
    </Box>
  );
}

export function LoginPage() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={loc.state?.from ?? "/"} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await login(email.trim(), password);
      nav(loc.state?.from ?? "/", { replace: true });
    } catch (ex) {
      setErr(errorMessage(ex));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell title="Sign in" subtitle="Use the email and password for your Meridian account.">
      <form onSubmit={submit} noValidate>
        <Stack gap={2}>
          {err && <Alert severity="error">{err}</Alert>}
          <TextField label="Email" type="email" autoComplete="username" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} required />
          <TextField label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Button type="submit" variant="contained" size="large" disabled={busy || !email || !password}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            New here? <Link component={RouterLink} to="/register" fontWeight={600}>Create an account</Link>
          </Typography>
        </Stack>
      </form>
    </Shell>
  );
}

export function RegisterPage() {
  const toast = useToast();
  const nav = useNavigate();
  const [f, setF] = useState({ first_name: "", last_name: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await authApi.register({ ...f, email: f.email.trim() });
      toast.success("Account created. Sign in to continue.");
      nav("/login");
    } catch (ex) {
      setErr(errorMessage(ex));
    } finally {
      setBusy(false);
    }
  };

  const valid = f.first_name.trim().length >= 2 && f.last_name.trim().length >= 2 && f.email && f.password.length >= 8;

  return (
    <Shell title="Create your account" subtitle="New accounts get the User role. An admin can change it later.">
      <form onSubmit={submit} noValidate>
        <Stack gap={2}>
          {err && <Alert severity="error">{err}</Alert>}
          <Stack direction="row" gap={2}>
            <TextField label="First name" value={f.first_name} onChange={set("first_name")} required autoFocus />
            <TextField label="Last name" value={f.last_name} onChange={set("last_name")} required />
          </Stack>
          <TextField label="Email" type="email" autoComplete="username" value={f.email} onChange={set("email")} required />
          <TextField label="Password" type="password" autoComplete="new-password" value={f.password} onChange={set("password")} helperText="At least 8 characters" required />
          <Button type="submit" variant="contained" size="large" disabled={busy || !valid}>
            {busy ? "Creating account…" : "Create account"}
          </Button>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Already registered? <Link component={RouterLink} to="/login" fontWeight={600}>Sign in</Link>
          </Typography>
        </Stack>
      </form>
    </Shell>
  );
}
