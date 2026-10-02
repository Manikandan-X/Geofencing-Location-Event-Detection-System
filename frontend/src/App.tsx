import type { ReactNode } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Box, Button, Typography } from "@mui/material";
import { useAuth } from "./auth/AuthContext";
import { Layout } from "./components/Layout";
import { Loading } from "./components/common";
import { LoginPage, RegisterPage } from "./pages/AuthPages";
import DashboardPage from "./pages/DashboardPage";
import MapPage from "./pages/MapPage";
import GeofencesPage from "./pages/GeofencesPage";
import DevicesPage from "./pages/DevicesPage";
import LocationsPage from "./pages/LocationsPage";
import EventsPage from "./pages/EventsPage";
import UsersPage from "./pages/UsersPage";
import AuditLogsPage from "./pages/AuditLogsPage";
import ProfilePage from "./pages/ProfilePage";

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Loading label="Checking your session…" />;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  return <>{children}</>;
}

function AdminOnly({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return (
      <Box textAlign="center" py={10}>
        <Typography variant="h5">Admins only</Typography>
        <Typography color="text.secondary" mt={1} mb={3}>Your role doesn't include access to this page.</Typography>
        <Button href="/" variant="contained">Back to dashboard</Button>
      </Box>
    );
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<DashboardPage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="geofences" element={<AdminOnly><GeofencesPage /></AdminOnly>} />
        <Route path="devices" element={<AdminOnly><DevicesPage /></AdminOnly>} />
        <Route path="locations" element={<LocationsPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="users" element={<AdminOnly><UsersPage /></AdminOnly>} />
        <Route path="audit-logs" element={<AuditLogsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
