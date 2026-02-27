

const CACHE_NAME   = 'lifeline-ai-v1';


const PRECACHE_URLS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
];



self.addEventListener('install', event => {
  console.log('[SW] Installing — pre-caching core assets…');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => {
        console.log('[SW] Pre-cache complete.');
        return self.skipWaiting();  
      })
      .catch(err => console.error('[SW] Pre-cache error:', err))
  );
});


/* ─── ACTIVATE ───────────────────────────────────────────── */
self.addEventListener('activate', event => {
  console.log('[SW] Activating — removing old caches…');
  event.waitUntil(
    caches.keys()
      .then(names =>
        Promise.all(
          names
            .filter(n => n !== CACHE_NAME)
            .map(n => {
              console.log('[SW] Deleting old cache:', n);
              return caches.delete(n);
            })
        )
      )
      .then(() => self.clients.claim())  // control all tabs immediately
  );
});


/* ─── FETCH ──────────────────────────────────────────────── */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  /* Skip cross-origin requests (Google Maps, Google Fonts, etc.) */
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      /* Cache hit → serve directly */
      if (cached) return cached;

      /* Cache miss → network, then cache response */
      return fetch(event.request)
        .then(res => {
          if (!res || res.status !== 200 || res.type !== 'basic') return res;

          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => {
          /* Network failed — offline fallback for HTML pages */
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
    })
  );
});