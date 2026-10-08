import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { redirectNewVisitors } from "./lib/hosting";

// O jogo mudou para a Vercel: no endereço antigo, só fica quem já tem progresso lá.
if (!redirectNewVisitors()) ReactDOM.createRoot(document.getElementById("root")!).render(<App />);

// App instalável (PWA): só no jogo publicado, para o cache não atrapalhar o `npm run dev`.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(e => console.warn('[pwa] service worker não registrado', e));
  });
}
