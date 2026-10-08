import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// One app, one port. The patient site lives at /, the doctor workspace at /doctor and the
// management console at /management. In production the API serves the built files too.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true, proxy: { "/api": "http://localhost:8000" } },
});
