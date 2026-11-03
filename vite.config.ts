import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: true,
  },
  build: {
    outDir: "dist/public",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("@supabase") || id.includes("@tanstack")) return "data-client";
          if (id.includes("react-dom") || id.includes("react-router") || id.includes("/react/")) return "react-vendor";
        },
      },
    },
  },
});
