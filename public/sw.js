/* Northstar Diagnostics LIMS service worker.
   SECURITY: This is a medical application. No API response, authenticated page,
   or patient/report data is ever cached. Only static assets and the public
   offline page are stored. All navigations go network-first with a single
   offline fallback. */

const VERSION = "v1";
const STATIC_CACHE = `lims-static-${VERSION}`;
const RUNTIME_CACHE = `lims-runtime-${VERSION}`;
const OFFLINE_URL = "/offline";

// Static assets safe to precache (icons + offline page shell).
const PRECACHE_URLS = [
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-192.png",
  "/icons/maskable-512.png",
  OFFLINE_URL,
];

// Never cache anything under these path prefixes (medical data, auth, APIs).
const NEVER_CACHE_PREFIXES = [
  "/api/",
  "/admin",
  "/dashboard",
  "/reception",
  "/patients",
  "/reports",
  "/tests",
  "/catalog",
  "/login",
  "/_next/data",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Remove caches from previous versions.
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("lims-") && key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

// Tell clients a new version is waiting (update flow).
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

function isNeverCachePath(pathname) {
  return NEVER_CACHE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Sensitive routes: network only, never cached. Page navigations fall back
  // to the generic offline page (contains no data); API calls simply fail.
  if (isNeverCachePath(url.pathname)) {
    if (request.mode === "navigate") {
      event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    }
    return;
  }

  // Static build assets (_next/static, icons): cache-first, they are immutable.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
    return;
  }

  // Public page navigations: network-first, fall back to offline page when
  // the network is unavailable. Cached page HTML is never served for
  // authenticated routes (those are excluded above).
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then(
          (offline) =>
            offline ||
            new Response(
              "<!doctype html><html><head><meta charset='utf-8'><title>Offline</title></head><body style='font-family:sans-serif;text-align:center;padding:3rem'><h1>You're offline</h1><p>Northstar Diagnostics needs an internet connection. Please reconnect and try again.</p></body></html>",
              { headers: { "Content-Type": "text/html" } }
            )
        )
      )
    );
    return;
  }

  // Everything else on this origin (public CSS/JS chunks not under
  // _next/static, fonts): stale-while-revalidate with a small runtime cache.
  event.respondWith(
    caches.open(RUNTIME_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
