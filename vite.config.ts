import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    hmr: { clientPort: 443 },
    allowedHosts: [
      // allow CodeSandbox preview hosts
      "zv6df2-5173.csb.app",  // replace with your sandbox subdomain if different
      ".csb.app"              // wildcard for any sandbox
    ]
  },
  preview: {
    host: "0.0.0.0",
    port: 5173
  }
});
