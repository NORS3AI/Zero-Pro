// sw.js — Service Worker: cache-first offline support for Zero Pro
// Paths are relative to this file's location (docs/)

const CACHE    = 'zeropro-v2';
const CDN_URLS = [
  'https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js',
  'https://cdn.jsdelivr.net/npm/html-docx-js@0.3.1/dist/html-docx.js',
];

const APP_ASSETS = [
  './',
  './index.html',
  './css/main.css',
  './css/sidebar.css',
  './css/editor.css',
  './css/corkboard.css',
  './css/outline.css',
  './css/inspector.css',
  './css/ai.css',
  './css/responsive.css',
  './js/app.js',
  './js/storage.js',
  './js/editor.js',
  './js/binder.js',
  './js/export.js',
  './js/import.js',
  './js/ui.js',
  './js/corkboard.js',
  './js/outline.js',
  './js/inspector.js',
  './js/ai.js',
  './js/find-replace.js',
  './js/command-palette.js',
];

// ─── Install: pre-cache all assets ───────────────────────────────────────────

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll([...APP_ASSETS, ...CDN_URLS]))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()) // don't block install if a CDN asset fails
  );
});

// ─── Activate: remove stale caches ───────────────────────────────────────────

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ─── Fetch: cache-first for app assets; network-only for API calls ────────────

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Never intercept API calls to AI providers
  const isApiCall = [
    'api.anthropic.com',
    'api.openai.com',
    'generativelanguage.googleapis.com',
  ].some(host => url.hostname === host);
  if (isApiCall) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // Not in cache — fetch from network and store if it's a cacheable origin
      return fetch(event.request).then(response => {
        const cacheable =
          response.ok &&
          (url.origin === self.location.origin ||
           url.hostname.includes('jsdelivr.net'));

        if (cacheable) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
