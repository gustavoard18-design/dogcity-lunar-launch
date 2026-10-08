// Desliga o service worker antigo do GitHub Pages: apaga o jogo guardado no
// aparelho e recarrega as abas, que passam a ver a página de mudança.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) await caches.delete(key);
      await self.registration.unregister();
      for (const client of await self.clients.matchAll({ type: 'window' })) client.navigate(client.url);
    })()
  );
});
