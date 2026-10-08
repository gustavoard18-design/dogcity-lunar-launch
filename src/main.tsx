import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { importTransferFromLocation } from "./lib/transfer";

// Progresso trazido do endereço antigo (#import=…) entra antes do jogo abrir.
importTransferFromLocation().finally(() => ReactDOM.createRoot(document.getElementById("root")!).render(<App />));

// App instalável (PWA): só no jogo publicado, para o cache não atrapalhar o `npm run dev`.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(e => console.warn('[pwa] service worker não registrado', e));
  });
}
