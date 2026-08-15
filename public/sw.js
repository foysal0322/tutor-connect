// Service worker for nsuOne.
// Responsibilities:
//   1. Push notifications + notification clicks (kept from the original file).
//   2. App-shell caching so the site launches fast and works briefly offline.
//      This fetch handler is also what makes the site a valid *installable* PWA,
//      which is required for the Play Store TWA wrapper.
//
// Strategy (dependency-free, no Workbox/Serwist to avoid Next 16 build risk):
//   - navigations (HTML pages): network-first, fall back to cache, then offline page
//   - hashed static assets under /_next/static/: cache-first (they are immutable)
//   - other same-origin GET: stale-while-revalidate
//   - non-GET and cross-origin: pass through to the network (never cached)
//
// Bump CACHE_VERSION when you change precaching or the fetch strategy so old
// caches are cleaned up on activate.

var CACHE_VERSION = 'v2';
var CACHE_NAME = 'nsuone-shell-' + CACHE_VERSION;
var PRECACHE_URLS = [
  '/',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
];

var OFFLINE_BODY = [
  '<!doctype html>',
  '<html lang="en">',
  '<head>',
  '<meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width, initial-scale=1">',
  '<title>Offline</title>',
  '<style>',
  'body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:2.5rem 1.5rem;',
  'color:#374151;background:#ffffff;text-align:center}',
  'h1{color:#4f46e5;font-size:1.5rem;margin:0 0 .5rem}',
  'p{margin:0;line-height:1.5}',
  '</style>',
  '</head>',
  '<body>',
  '<h1>You are offline</h1>',
  '<p>Check your connection and try again.</p>',
  '</body>',
  '</html>',
].join('');

// --- Install: precache the app shell, then activate as soon as possible. ---
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      // addAll is all-or-nothing; cache each URL independently so a single
      // offline asset does not abort the whole install.
      .then(function (cache) {
        return Promise.all(
          PRECACHE_URLS.map(function (url) {
            return cache.add(url).catch(function () {
              // Ignore individual precache failures (e.g. transient network).
            });
          }),
        );
      })
      .then(function () {
        return self.skipWaiting();
      }),
  );
});

// --- Activate: drop caches from previous versions and take control now. ---
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) {
              return key !== CACHE_NAME;
            })
            .map(function (key) {
              return caches.delete(key);
            }),
        );
      })
      .then(function () {
        return self.clients.claim();
      }),
  );
});

// --- Fetch: serve from cache or network depending on request type. ---
self.addEventListener('fetch', function (event) {
  var request = event.request;

  // Only handle same-origin GET; let the browser handle everything else
  // (POST/PUT/DELETE, cross-origin API/CDN calls, etc.).
  if (request.method !== 'GET') {
    return;
  }

  var url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  // HTML navigations: network-first with cache + offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(function (response) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(request, copy).catch(function () {});
          });
          return response;
        })
        .catch(function () {
          return caches.match(request).then(function (cached) {
            if (cached) return cached;
            // Fall back to the cached shell root, then the offline page.
            return caches.match('/').then(function (root) {
              return root || new Response(OFFLINE_BODY, {
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
              });
            });
          });
        }),
    );
    return;
  }

  // Hashed build assets under /_next/static/ are immutable: cache-first.
  // Dev servers reuse these URLs across restarts and send no `immutable`
  // Cache-Control header, so we only cache responses the server explicitly
  // marked immutable — otherwise dev would serve stale chunks forever.
  if (url.pathname.indexOf('/_next/static/') === 0) {
    event.respondWith(
      caches.match(request).then(function (cached) {
        if (cached) return cached;
        return fetch(request)
          .then(function (response) {
            var cacheControl =
              response && response.headers.get('Cache-Control');
            if (
              response &&
              response.status === 200 &&
              cacheControl &&
              cacheControl.indexOf('immutable') !== -1
            ) {
              var copy = response.clone();
              caches.open(CACHE_NAME).then(function (cache) {
                cache.put(request, copy).catch(function () {});
              });
            }
            return response;
          })
          .catch(function () {
            return cached;
          });
      }),
    );
    return;
  }

  // Other same-origin GET: stale-while-revalidate.
  event.respondWith(
    caches.match(request).then(function (cached) {
      var network = fetch(request)
        .then(function (response) {
          if (response && response.status === 200) {
            var copy = response.clone();
            caches.open(CACHE_NAME).then(function (cache) {
              cache.put(request, copy).catch(function () {});
            });
          }
          return response;
        })
        .catch(function () {
          return cached;
        });
      return cached || network;
    }),
  );
});

// --- Push notifications (preserved from original nsuOne sw.js). ---
self.addEventListener('push', function (event) {
  if (event.data) {
    var data = event.data.json();
    var options = {
      body: data.body,
      icon: data.icon || '/android-chrome-192x192.png',
      badge: data.badge || '/android-chrome-192x192.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '2',
        url: data.url || '/',
      },
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

// --- Notification click: focus an open tab or open a new one (preserved). ---
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var targetUrl =
    event.notification.data && event.notification.data.url
      ? event.notification.data.url
      : '/';
  var urlToOpen = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (windowClients) {
        for (var i = 0; i < windowClients.length; i++) {
          var client = windowClients[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      }),
  );
});
