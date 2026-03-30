import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const isProduction = mode === "production";
  const apiTarget = process.env.API_PROXY_TARGET || "http://localhost:8080";

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      proxy: {
        "/api": { target: apiTarget, changeOrigin: true },
        "/health": { target: apiTarget, changeOrigin: true },
        "/ready": { target: apiTarget, changeOrigin: true },
        "/sitemap.xml": { target: apiTarget, changeOrigin: true }
      }
    },
    build: {
      sourcemap: false,
      minify: "esbuild",
      target: "es2019",
      cssMinify: true
    },
    esbuild: isProduction
      ? {
          drop: ["console", "debugger"]
        }
      : undefined
  };
});
