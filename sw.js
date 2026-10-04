/* Trip Trail service worker: lets the app open with no signal and keeps map areas you've already viewed. */
const SHELL = 'tt-shell-v1', LIBS = 'tt-libs-v1', TILES = 'tt-tiles-v1', MAX_TILES = 2500;
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(['./', 'icon.png'])).catch(() => {}));
});
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

async function netFirst(req) {           // the app itself: newest version when online, saved copy when not
  const cache = await caches.open(SHELL);
  try {
    const res = await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(rej, 4000))]);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    return (await cache.match(req, { ignoreSearch: true })) || (await cache.match('./')) || Response.error();
  }
}
async function cacheFirst(req, name, max) {   // map tiles, fonts and libraries: saved copy first
  const cache = await caches.open(name), hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && (res.ok || res.type === 'opaque')) {
    cache.put(req, res.clone());
    if (max && Math.random() < .02) cache.keys().then(k => { if (k.length > max) k.slice(0, k.length - max + 200).forEach(x => cache.delete(x)); });
  }
  return res;
}
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin === location.origin) e.respondWith(netFirst(req));
  else if (u.hostname === 'tile.openstreetmap.org') e.respondWith(cacheFirst(req, TILES, MAX_TILES));
  else if (['unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(u.hostname)) e.respondWith(cacheFirst(req, LIBS));
});
