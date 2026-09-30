/* BlockSystem offline shell. Server data is deliberately never cached here. */
// Bump this deliberately with every release that changes the offline shell.
// It makes browsers install the new worker and removes obsolete shell entries
// only after the user accepts the existing update prompt.
const CACHE = "blocksystem-shell-v1.0.0";
const SHELL = ["/", "/offline", "/manifest.webmanifest", "/favicon.ico", "/icons/icon-192.svg", "/icons/icon-512.svg"];
const sensitive = (path) => path.startsWith("/api/") || path.startsWith("/verify/");
const cacheable = (path) => path === "/" || path === "/offline" || path === "/favicon.ico" || path === "/manifest.webmanifest" || path.startsWith("/_next/static/") || path.startsWith("/icons/");
self.addEventListener("install", (event) => { event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL))); });
self.addEventListener("message", (event) => { if (event.data?.type === "SKIP_WAITING") self.skipWaiting(); });
self.addEventListener("activate", (event) => { event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || sensitive(url.pathname)) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then((response) => response).catch(() => caches.match("/offline")));
    return;
  }
  if (!cacheable(url.pathname)) return;
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => { if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone())); return response; })));
});
