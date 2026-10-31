const CACHE_NAME = 'vetflow-v1';
const urlsToCache = [
  './',
  './index.html',
  './apps.html',
  './kunden_app.html',
  './tierarzt_app.html',
  './praxis_dashboard.html',
  './config.js',
  './store.js',
  './icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

