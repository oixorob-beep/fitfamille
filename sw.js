/* Service worker : met l'appli en cache pour qu'elle fonctionne hors ligne (réseau d'abord, cache en secours) */
const CACHE = 'fitfamille-v4';
const FILES = ['./', 'index.html', 'css/style.css', 'js/data.js', 'js/figure.js', 'js/store.js', 'js/player.js', 'js/planning.js', 'js/ingredients.js', 'js/pantry.js', 'js/app.js', 'icon.svg', 'manifest.webmanifest'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request))
  );
});
