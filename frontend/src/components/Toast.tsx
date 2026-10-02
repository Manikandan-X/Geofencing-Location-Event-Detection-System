import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { Alert, Snackbar } from "@mui/material";

type Kind = "success" | "error" | "info";
interface ToastApi {
  success: (m: string) => void;
  error: (m: string) => void;
  info: (m: string) => void;
}
const Ctx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<{ msg: string; kind: Kind; key: number } | null>(null);
  const show = useCallback((kind: Kind) => (msg: string) => setT({ msg, kind, key: Date.now() }), []);
  const api: ToastApi = { success: show("success"), error: show("error"), info: show("info") };
  return (
    <Ctx.Provider value={api}>
      {children}
      <Snackbar
        key={t?.key}
        open={!!t}
        autoHideDuration={t?.kind === "error" ? 7000 : 3500}
        onClose={(_, r) => r !== "clickaway" && setT(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {t ? (
          <Alert severity={t.kind} variant="filled" onClose={() => setT(null)} sx={{ maxWidth: 560, alignItems: "center" }}>
            {t.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Ctx.Provider>
  );
}

export const useToast = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToast must be used inside <ToastProvider>");
  return v;
};
