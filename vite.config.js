import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";
import path from "node:path";
import pkg from "./package.json" with { type: "json" };

/** Carimba a versão e a hora do build no service worker (nome do cache). */
function stampServiceWorker() {
  let outDir = "dist";
  return {
    name: "stamp-service-worker",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const file = path.resolve(outDir, "sw.js");
      if (!fs.existsSync(file)) return;
      const stamp = `${pkg.version}-${Date.now().toString(36)}`;
      fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace("'dogcity-__BUILD__'", `'dogcity-${stamp}'`));
    },
  };
}

export default defineConfig({
  // Caminhos relativos: funciona na raiz do domínio e em /nome-do-repo/ (GitHub Pages).
  base: "./",
  plugins: [react(), tailwindcss(), stampServiceWorker()],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
          r3f: ["@react-three/fiber", "@react-three/drei", "@react-three/postprocessing", "postprocessing"],
          ui: ["react", "react-dom", "framer-motion", "canvas-confetti"],
        },
      },
    },
  },
});
