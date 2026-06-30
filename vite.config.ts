import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 5310,
    strictPort: false,
    proxy: {
      "/api": {
        target: "http://localhost:4310",
        changeOrigin: true,
      },
    },
  },
});
