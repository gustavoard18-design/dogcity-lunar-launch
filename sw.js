// Service worker do DogCity Lunar Launch: guarda o jogo no aparelho para abrir
// rápido e funcionar sem internet. Páginas: rede primeiro (pega a versão nova);
// arquivos (JS, CSS, artes, modelos, fontes): cache primeiro, atualizando por trás.
// O ranking e o saldo DOG (Supabase) nunca passam pelo cache.
// O build troca __BUILD__ por um carimbo novo: cada deploy usa um cache limpo
// (artes com nome fixo são baixadas de novo e os bundles antigos são apagados).
const CACHE = 'dogcity-2.7.0-muhjfmly';

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', './index.html', './manifest.webmanifest', './icon-192.png'])));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

const cacheable = url =>
  url.origin === self.location.origin || url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!cacheable(url)) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          // Só a página do jogo vira a cópia offline (um 404 do GitHub Pages não).
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put('./index.html', copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE).then(async cache => {
      const hit = await cache.match(req);
      const fresh = fetch(req)
        .then(res => {
          if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
          return res;
        })
        .catch(() => hit);
      return hit ?? fresh;
    })
  );
});
