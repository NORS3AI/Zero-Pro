// sw.js — Service Worker: cache-first offline support for Zero Pro
// Phase 8: Enhanced with background sync and full asset caching

const CACHE    = 'zeropro-v4';
const CDN_URLS = [
  'https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js',
  'https://cdn.jsdelivr.net/npm/html-docx-js@0.3.1/dist/html-docx.js',
  'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
];

const APP_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  // CSS
  './css/main.css',
  './css/sidebar.css',
  './css/editor.css',
  './css/corkboard.css',
  './css/outline.css',
  './css/inspector.css',
  './css/ai.css',
  './css/settings.css',
  './css/publish.css',
  './css/phase7.css',
  './css/phase8.css',
  './css/responsive.css',
  // JS
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
  './js/settings.js',
  './js/publish.js',
  './js/media.js',
  './js/snapshots.js',
  './js/ambient.js',
  './js/streak.js',
  './js/sync.js',
  './js/collab.js',
  './js/offline-queue.js',
  './js/touch.js',
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

  // Never intercept API calls to AI providers or Supabase
  const isApiCall = [
    'api.anthropic.com',
    'api.openai.com',
    'generativelanguage.googleapis.com',
    'supabase.co',
    'supabase.io',
  ].some(host => url.hostname.includes(host));
  if (isApiCall) return;

  // Never intercept WebSocket upgrade requests
  if (event.request.headers.get('Upgrade') === 'websocket') return;

  // Never intercept Yjs signaling
  if (url.hostname === 'signaling.yjs.dev') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // Not in cache — fetch from network and store if cacheable
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
      }).catch(() => {
        // Network failed and nothing in cache — return offline fallback
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// ─── Background Sync ─────────────────────────────────────────────────────────

self.addEventListener('sync', event => {
  if (event.tag === 'zeropro-sync') {
    event.waitUntil(_backgroundSync());
  }
});

async function _backgroundSync() {
  // Notify all clients to flush their offline queues
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_FLUSH' });
  });
}

// ─── Push Notifications (future) ─────────────────────────────────────────────

self.addEventListener('push', event => {
  if (!event.data) return;

  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'Zero Pro', {
      body: data.body || '',
      icon: './assets/icons/icon-192.png',
      badge: './assets/icons/icon-72.png',
    })
  );
});

// ─── Notification Click ──────────────────────────────────────────────────────

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      // Focus existing window or open new one
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow('./');
    })
  );
});
