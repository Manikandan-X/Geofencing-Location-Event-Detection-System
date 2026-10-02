import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Avatar, Box, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Stack, Typography,
  useMediaQuery, useTheme,
} from "@mui/material";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import MapRounded from "@mui/icons-material/MapRounded";
import HexagonRounded from "@mui/icons-material/HexagonOutlined";
import DevicesRounded from "@mui/icons-material/PhoneIphoneRounded";
import MyLocationRounded from "@mui/icons-material/MyLocationRounded";
import BoltRounded from "@mui/icons-material/BoltRounded";
import GroupRounded from "@mui/icons-material/GroupRounded";
import HistoryRounded from "@mui/icons-material/ManageSearchRounded";
import PersonRounded from "@mui/icons-material/PersonRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import MenuRounded from "@mui/icons-material/MenuRounded";
import { useAuth } from "../auth/AuthContext";
import { Brand } from "./Brand";
import { RoleChip } from "./common";
import { initials } from "../lib/format";
import { tokens } from "../theme";

const NAV = [
  { to: "/", label: "Dashboard", icon: <DashboardRounded />, end: true },
  { to: "/map", label: "Live map", icon: <MapRounded /> },
  { to: "/geofences", label: "Geofences", icon: <HexagonRounded />, admin: true },
  { to: "/devices", label: "Devices", icon: <DevicesRounded />, admin: true },
  { to: "/locations", label: "Locations", icon: <MyLocationRounded /> },
  { to: "/events", label: "Events", icon: <BoltRounded /> },
  { to: "/users", label: "Users", icon: <GroupRounded />, admin: true },
  { to: "/audit-logs", label: "Audit logs", icon: <HistoryRounded /> },
  { to: "/profile", label: "Profile", icon: <PersonRounded /> },
];

const WIDTH = 248;

export function Layout() {
  const { user, isAdmin, roleName, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up("md"));
  const [open, setOpen] = useState(false);
  const fullBleed = loc.pathname === "/map";

  const rail = (
    <Stack sx={{ height: "100%", p: 2 }} role="navigation" aria-label="Main">
      <Box px={1} py={1.5} mb={1}><Brand /></Box>
      <List disablePadding sx={{ flex: 1, display: "grid", gap: 0.5, alignContent: "start" }}>
        {NAV.filter((n) => !n.admin || isAdmin).map((n) => (
          <ListItemButton
            key={n.to}
            component={NavLink}
            to={n.to}
            end={n.end}
            onClick={() => setOpen(false)}
            sx={{
              borderRadius: 2.5, py: 1, color: "text.secondary",
              "& .MuiListItemIcon-root": { minWidth: 38, color: "inherit" },
              "&.active": { background: tokens.primaryTint, color: tokens.primaryDark, "& .MuiListItemText-primary": { fontWeight: 700 } },
              "&:hover": { background: "#F2F4FA" },
            }}
          >
            <ListItemIcon>{n.icon}</ListItemIcon>
            <ListItemText primary={n.label} primaryTypographyProps={{ fontWeight: 600, fontSize: 15 }} />
          </ListItemButton>
        ))}
      </List>
      <Divider sx={{ my: 1.5 }} />
      <Stack direction="row" alignItems="center" gap={1.25} px={0.5}>
        <Avatar sx={{ bgcolor: tokens.primary, width: 38, height: 38, fontSize: 14, fontWeight: 700 }}>
          {initials(user?.first_name, user?.last_name)}
        </Avatar>
        <Box minWidth={0} flex={1}>
          <Typography noWrap fontWeight={700} fontSize={14}>{user?.first_name} {user?.last_name}</Typography>
          <RoleChip name={roleName} />
        </Box>
        <IconButton aria-label="Sign out" onClick={() => { logout(); nav("/login"); }}>
          <LogoutRounded fontSize="small" />
        </IconButton>
      </Stack>
    </Stack>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100%", background: tokens.ground }}>
      {desktop ? (
        <Box component="aside" sx={{ width: WIDTH, flexShrink: 0, position: "sticky", top: 0, height: "100vh", background: tokens.paper, borderRight: `1px solid ${tokens.line}` }}>
          {rail}
        </Box>
      ) : (
        <>
          <Drawer open={open} onClose={() => setOpen(false)} PaperProps={{ sx: { width: WIDTH } }}>{rail}</Drawer>
          <IconButton
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
            sx={{ position: "fixed", top: 10, left: 10, zIndex: 1200, background: tokens.paper, border: `1px solid ${tokens.line}` }}
          >
            <MenuRounded />
          </IconButton>
        </>
      )}
      <Box
        component="main"
        sx={{
          flex: 1, minWidth: 0,
          p: fullBleed ? 0 : { xs: 2, md: 4 },
          pt: fullBleed ? 0 : { xs: 8, md: 4 },
          height: fullBleed ? "100vh" : "auto",
        }}
      >
        <Box sx={{ maxWidth: fullBleed ? "none" : 1280, mx: "auto", height: fullBleed ? "100%" : "auto" }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
