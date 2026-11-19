// Service Worker per FiguTrivia PWA / TWA
// Strategia Network-First: garantisce che ogni aggiornamento al sito o al dataset figurine
// sia immediatamente visibile nell'App senza dover reinstallare nulla.
const CACHE_NAME = "figutrivia-live-v3";
const PRECACHE_URLS = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      )
    )
  );
  return self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Non intercettare mai chiamate API tRPC/auth
  if (url.pathname.startsWith("/api/")) return;

  // Per navigazione HTML e dataset JSON: sempre rete fresca (no-cache) con fallback cache offline
  const isAlwaysFresh =
    req.mode === "navigate" ||
    url.pathname.endsWith(".json") ||
    url.pathname === "/";

  event.respondWith(
    fetch(req, isAlwaysFresh ? { cache: "no-cache" } : undefined)
      .then((response) => {
        if (response && response.status === 200 && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(req).then((cached) => cached || caches.match("/"))
      )
  );
});
