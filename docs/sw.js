// sw.js — Zero Pro Service Worker (Phase 8)
// Provides full offline support via Cache API + Background Sync.

const CACHE_NAME = 'zeropro-v1.7';

const CDN_URLS = [
  'https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js',
  'https://cdn.jsdelivr.net/npm/html-docx-js@0.3.1/dist/html-docx.js',
  'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
];

const APP_ASSETS = [
  './',
  './index.html',
  './manifest.json',
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
  './js/patchnotes.js',
  './js/publish.js',
  './js/media.js',
  './js/snapshots.js',
  './js/ambient.js',
  './js/streak.js',
  './js/sync.js',
  './js/offline-queue.js',
  './js/collab.js',
  './js/touch.js',
  './js/wizard.js',
  './js/toolbar-loop.js',
  './js/config.js',
  './css/wizard.css',
];

// ─── Install: pre-cache all assets ───────────────────────────────────────────

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // App assets — don't fail on individual 404s
      const appPromises = APP_ASSETS.map(url =>
        cache.add(url).catch(() => {})
      );
      // CDN assets — best effort
      const cdnPromises = CDN_URLS.map(url =>
        cache.add(url).catch(() => {})
      );
      return Promise.all([...appPromises, ...cdnPromises]);
    }).then(() => self.skipWaiting())
  );
});

// ─── Activate: remove stale caches ───────────────────────────────────────────

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ─── Fetch: network-first for app shell, cache-first for CDN ─────────────────

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Never intercept AI provider API calls
  const AI_HOSTS = [
    'api.anthropic.com',
    'api.openai.com',
    'generativelanguage.googleapis.com',
    'supabase.co',
  ];
  if (AI_HOSTS.some(h => url.hostname.endsWith(h))) return;

  // CDN: cache-first
  if (url.hostname.includes('jsdelivr.net')) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Same-origin app assets: network-first with offline fallback
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(event.request));
  }
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Navigation fallback — return app shell so routing works offline
    if (request.mode === 'navigate') {
      const shell = await cache.match('./index.html');
      if (shell) return shell;
    }
    return new Response('Zero Pro is offline. Please check your connection.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return new Response('Resource unavailable offline.', { status: 503 });
  }
}

// ─── Background Sync: flush offline write queue ───────────────────────────────

self.addEventListener('sync', event => {
  if (event.tag === 'zeropro-sync') {
    event.waitUntil(
      self.clients.matchAll({ includeUncontrolled: true }).then(clients => {
        clients.forEach(client => client.postMessage({ type: 'FLUSH_QUEUE' }));
      })
    );
  }
});

// ─── Push Notifications (stub — extend when backend is live) ──────────────────

self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'Zero Pro', {
      body: data.body || '',
      icon: './assets/icons/icon-192.png',
      badge: './assets/icons/icon-72.png',
      tag: 'zeropro-notification',
    })
  );
});
