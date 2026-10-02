import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The backend CORS policy only allows http://localhost:5174 and http://127.0.0.1:5174
export default defineConfig({
  plugins: [react()],
  server: { port: 5174, strictPort: true, host: true },
  preview: { port: 5174, strictPort: true },
});
