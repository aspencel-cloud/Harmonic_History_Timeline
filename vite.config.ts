// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5174, // <— move off 5173
    strictPort: true,
    hmr: { clientPort: 443 },
    allowedHosts: [".csb.app"], // trust CSB preview domain
  },
  preview: {
    host: "0.0.0.0",
    port: 5174,
  },
});
