import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";
import path from "node:path";
import pkg from "./package.json" with { type: "json" };

/**
 * Endereço público do jogo (links de compartilhar e de desafio, prévia do link).
 * Ordem: VITE_SITE_URL; na Vercel, o domínio de produção do projeto; senão o
 * endereço principal na Vercel. Fica em process.env para o Vite trocar %VITE_SITE_URL% no
 * index.html e expor import.meta.env.VITE_SITE_URL no jogo.
 */
const withSlash = url => (url.endsWith("/") ? url : `${url}/`);
process.env.VITE_SITE_URL = withSlash(
  process.env.VITE_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://dogcity-lunar-launch.vercel.app/")
);

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
  // Caminhos relativos: funciona na raiz do domínio (Vercel) e em /nome-do-repo/ (GitHub Pages).
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
        // Por pacote exato: na forma de objeto o Rollup leva junto as dependências
        // compartilhadas, e a tela inicial acabava baixando o motor 3D inteiro.
        manualChunks(id) {
          // Carregador de módulos do Vite: a tela inicial usa, então não pode cair no pacote 3D.
          if (id.includes("vite/preload-helper")) return "ui";
          const pkg = id.match(/node_modules[\/]((?:@[^\/]+[\/])?[^\/]+)/)?.[1]?.replace("\\", "/");
          if (!pkg) return;
          if (pkg === "three") return "three";
          if (["@react-three/fiber", "@react-three/drei", "@react-three/postprocessing", "postprocessing"].includes(pkg)) return "r3f";
          if (["react", "react-dom", "scheduler", "framer-motion", "canvas-confetti", "base64-js", "ieee754", "buffer"].includes(pkg)) return "ui";
        },
      },
    },
  },
});
