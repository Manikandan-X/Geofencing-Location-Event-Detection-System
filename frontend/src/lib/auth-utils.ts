/** Reads the `role` claim the backend puts in the JWT (create_access_token). */
export function roleFromToken(token: string | null): string | null {
  if (!token) return null;
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(payload));
    return typeof json.role === "string" ? json.role : null;
  } catch {
    return null;
  }
}

/**
 * The API has no /roles endpoint. db/seed.py creates Admin first, then User,
 * so ids are 1 and 2. If your database differs, change this one map.
 */
export const ROLE_NAMES: Record<number, string> = { 1: "Admin", 2: "User" };
export const ROLE_OPTIONS = Object.entries(ROLE_NAMES).map(([id, name]) => ({ id: Number(id), name }));
