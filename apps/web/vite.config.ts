import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/** Port of the local server that the dev server forwards `/api` to (overview §5). */
const SERVER_ORIGIN = "http://127.0.0.1:4318";

/** Vite configuration of the site: dev server on 127.0.0.1:5173 with `/api` proxied. */
export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: { "/api": SERVER_ORIGIN },
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
  },
});
