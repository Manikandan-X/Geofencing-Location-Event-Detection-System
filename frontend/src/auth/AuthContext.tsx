import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi } from "../api/endpoints";
import { setUnauthorizedHandler, tokenStore } from "../api/client";
import type { User } from "../api/types";
import { ROLE_NAMES, roleFromToken } from "../lib/auth-utils";

interface AuthState {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  roleName: string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (u: User) => void;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(roleFromToken(tokenStore.get()));
  const [loading, setLoading] = useState<boolean>(!!tokenStore.get());

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setRole(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  useEffect(() => {
    if (!tokenStore.get()) return;
    authApi
      .me()
      .then(setUser)
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const { access_token } = await authApi.login(email, password);
    tokenStore.set(access_token);
    setRole(roleFromToken(access_token));
    setUser(await authApi.me());
  }, []);

  const value = useMemo<AuthState>(() => {
    const roleName = role ?? (user ? ROLE_NAMES[user.role_id] ?? "User" : "User");
    return { user, loading, login, logout, setUser, roleName, isAdmin: roleName === "Admin" };
  }, [user, role, loading, login, logout]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used inside <AuthProvider>");
  return v;
};
