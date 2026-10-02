import { Stack, Typography } from "@mui/material";

export function BrandMark({ size = 32, light = false }: { size?: number; light?: boolean }) {
  const fg = light ? "#fff" : "#fff";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="8" fill={light ? "rgba(255,255,255,.18)" : "#3B47E0"} />
      <circle cx="16" cy="16" r="11" fill="none" stroke={fg} strokeOpacity=".45" strokeWidth="2" />
      <circle cx="16" cy="16" r="6" fill="none" stroke={fg} strokeWidth="2" />
      <circle cx="16" cy="16" r="2" fill="#F4B63F" />
    </svg>
  );
}

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Stack direction="row" alignItems="center" gap={1.25}>
      <BrandMark light={light} />
      <Typography sx={{ fontFamily: '"Bricolage Grotesque"', fontWeight: 700, fontSize: 21, letterSpacing: "-0.02em", color: light ? "#fff" : "text.primary" }}>
        Meridian
      </Typography>
    </Stack>
  );
}
