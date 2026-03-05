import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const isProduction = mode === "production";

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173
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
