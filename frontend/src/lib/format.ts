const dt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
const dts = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" });

/** created_at comes back as a naive UTC string (no "Z"); treat those as UTC. */
export const parseApiDate = (s: string) => new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : `${s}Z`);
export const fmtDate = (s?: string | null) => (s ? dt.format(parseApiDate(s)) : "—");
export const fmtDateTime = (s?: string | null) => (s ? dts.format(parseApiDate(s)) : "—");
export const fmtCoord = (n?: number | null) => (n == null ? "—" : n.toFixed(5));
export const fmtMeters = (m?: number | null) =>
  m == null ? "—" : m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;

export const initials = (first?: string, last?: string) =>
  `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";

/** Value for <input type="datetime-local"> in local time. */
export const toLocalInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export const prettyDetails = (raw: string | null): string => {
  if (!raw) return "";
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
};

export const humanizeAction = (a: string) =>
  a.toLowerCase().replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
