import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Caminhos relativos: funciona na raiz do domínio e em /nome-do-repo/ (GitHub Pages).
  base: "./",
  plugins: [react(), tailwindcss()],
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
