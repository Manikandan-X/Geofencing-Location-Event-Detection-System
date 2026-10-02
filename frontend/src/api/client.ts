import axios, { AxiosError } from "axios";

const TOKEN_KEY = "geofence.token";

export const tokenStore = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (t: string) => sessionStorage.setItem(TOKEN_KEY, t),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn;
};

api.interceptors.response.use(
  (r) => r,
  (error: AxiosError) => {
    const url = error.config?.url ?? "";
    // 401 on login itself is just "wrong password" — don't treat it as an expired session.
    if (error.response?.status === 401 && !url.includes("/auth/login")) {
      tokenStore.clear();
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

interface ApiErrorBody {
  detail?: string | { msg: string }[];
  errors?: { field: string; message: string }[];
}

/** Turns any backend error shape into a readable message. */
export function errorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) return "Cannot reach the server. Check that the API is running and CORS allows this origin.";
    const body = err.response.data as ApiErrorBody | undefined;
    if (body?.errors?.length) {
      return body.errors.map((e) => (e.field ? `${e.field}: ${e.message}` : e.message)).join(" · ");
    }
    if (typeof body?.detail === "string") return body.detail;
    if (Array.isArray(body?.detail)) return body.detail.map((d) => d.msg).join(" · ");
    return err.message || fallback;
  }
  return err instanceof Error ? err.message : fallback;
}
