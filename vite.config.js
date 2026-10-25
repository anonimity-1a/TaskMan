import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

function tolerateBusyWatch() {
  return {
    name: "tolerate-busy-watch",
    configureServer(server) {
      server.watcher.on("error", (error) => {
        if (error?.code === "EBUSY" || error?.code === "EPERM") return;
        console.error(error);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), tolerateBusyWatch()],
  base: "./",
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    allowedHosts: [".aamoghtech.org"],
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
        timeout: 0,
        proxyTimeout: 0,
      },
    },
    watch: {
      ignored: ["**/*.crdownload", "**/*.~tmp", "**/*.tmp"],
    },
  },
});
