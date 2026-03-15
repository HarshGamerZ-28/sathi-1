/**
 * SATHI – Service Worker
 * Caches the mobile page + assets for offline use.
 * Patients who scanned a QR at the kiosk can still see directions
 * even if they lose signal inside the hospital.
 */

const CACHE_NAME = 'sathi-v1';
const OFFLINE_CACHE = [
  '/mobile',
  '/assets/config.js',
  '/assets/images/map.jpg',
  '/assets/images/3.jpeg',
  '/assets/images/4.jpeg',
  '/assets/images/5.jpeg',
  '/assets/images/7.jpeg',
  '/assets/images/8.jpeg',
  '/assets/images/9.jpeg',
  '/assets/images/10.jpeg',
  '/assets/images/11.jpeg',
  '/assets/images/12.jpeg',
  '/assets/images/13.jpeg',
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700&family=Exo+2:wght@400;600;700;800&display=swap',
];

// Install: pre-cache all static assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_CACHE))
  );
  self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for static assets, network-first for API
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // API calls: network-first, fall back to cache
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Static assets: cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
