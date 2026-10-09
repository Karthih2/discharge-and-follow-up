import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// One app, one port. The patient site lives at /, the doctor workspace at /doctor and the
// management console at /management. In production the API serves the built files too.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true, proxy: { "/api": "http://localhost:8000" } },
  build: {
    rollupOptions: {
      output: {
        // Shared libraries get their own long-lived files, so each app downloads only what it uses.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return "react";
          if (/node_modules\/(react-router|react-router-dom|@remix-run)\//.test(id)) return "router";
          if (/node_modules\/(recharts|d3-|victory-vendor|recharts-scale|decimal\.js-light|lodash|react-smooth|react-transition-group|prop-types|fast-equals|clsx|tiny-invariant|eventemitter3)/.test(id)) return "charts";
          return undefined;
        },
      },
    },
  },
});
