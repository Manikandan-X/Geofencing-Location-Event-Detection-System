import { createTheme, alpha } from "@mui/material/styles";

/** Meridian design tokens — a cool chart-paper ground, ultramarine ink, marigold for polygons. */
export const tokens = {
  ground: "#EEF1F7",
  paper: "#FFFFFF",
  ink: "#172033",
  muted: "#5B6577",
  line: "#DCE2EC",
  primary: "#3B47E0",
  primaryDark: "#2A33B5",
  primaryTint: "#E6E8FC",
  marigold: "#F4B63F",
  enter: "#1E9E6A",
  exit: "#E5484D",
  inside: "#3B47E0",
  outside: "#7C8798",
  uncertain: "#C98A0B",
};

export const eventColor = (t: string) =>
  t === "ENTER" ? tokens.enter : t === "EXIT" ? tokens.exit : t === "INSIDE" ? tokens.inside : tokens.outside;

const display = '"Bricolage Grotesque", "Hanken Grotesk", system-ui, sans-serif';
const body = '"Hanken Grotesk", system-ui, -apple-system, "Segoe UI", sans-serif';

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: tokens.primary, dark: tokens.primaryDark, light: tokens.primaryTint, contrastText: "#fff" },
    secondary: { main: tokens.marigold, contrastText: tokens.ink },
    success: { main: tokens.enter },
    error: { main: tokens.exit },
    warning: { main: tokens.uncertain },
    background: { default: tokens.ground, paper: tokens.paper },
    text: { primary: tokens.ink, secondary: tokens.muted },
    divider: tokens.line,
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: body,
    h1: { fontFamily: display, fontWeight: 700, letterSpacing: "-0.02em" },
    h2: { fontFamily: display, fontWeight: 700, letterSpacing: "-0.02em" },
    h3: { fontFamily: display, fontWeight: 700, letterSpacing: "-0.015em" },
    h4: { fontFamily: display, fontWeight: 700, letterSpacing: "-0.015em", fontSize: "1.75rem" },
    h5: { fontFamily: display, fontWeight: 700, letterSpacing: "-0.01em" },
    h6: { fontFamily: display, fontWeight: 500, letterSpacing: "-0.005em" },
    subtitle1: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600, letterSpacing: 0 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { fontVariantNumeric: "tabular-nums" },
        "*:focus-visible": { outline: `2px solid ${tokens.primary}`, outlineOffset: 2 },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 9, paddingInline: 16 },
        containedPrimary: { "&:hover": { background: tokens.primaryDark } },
      },
    },
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: "none" } } },
    MuiTextField: { defaultProps: { size: "small", fullWidth: true } },
    MuiSelect: { defaultProps: { size: "small" } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
    MuiTableCell: {
      styleOverrides: {
        root: { borderColor: tokens.line, paddingBlock: 12 },
        head: { fontWeight: 700, color: tokens.muted, fontSize: 13, background: "#F7F9FC", whiteSpace: "nowrap" },
      },
    },
    MuiTableRow: { styleOverrides: { root: { "&:last-child td": { borderBottom: 0 } } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 14 } } },
    MuiTooltip: { styleOverrides: { tooltip: { background: tokens.ink, fontSize: 12 } } },
    MuiSwitch: {
      styleOverrides: {
        switchBase: { "&.Mui-checked + .MuiSwitch-track": { backgroundColor: alpha(tokens.enter, 0.9), opacity: 1 } },
      },
    },
  },
});
