/* Form Filler service worker: lets the app open instantly and work offline after the first visit. */
const CACHE = 'form-filler-v10';
const CORE = ['./', './index.html', './manifest.json', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
const LIB_HOSTS = ['cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !LIB_HOSTS.includes(url.hostname)) return;

  // The app page: try the network first so updates arrive, fall back to the saved copy offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return r; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Everything else (PDF tools, fonts, icons): use the saved copy, refresh it in the background.
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req)
        .then(r => {
          if (r && (r.ok || r.type === 'opaque')) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
          return r;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});
