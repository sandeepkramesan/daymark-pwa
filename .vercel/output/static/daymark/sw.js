const CACHE = "daymark-v23";
const FILES = [
  "./",
  "./index.html",
  "./app.css",
  "./app.js",
  "./logic.js",
  "./manifest.webmanifest",
  "./icons/daymark-192.png",
  "./icons/daymark-512.png",
  "./icons/daymark-maskable-192.png",
  "./icons/daymark-maskable-512.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      } catch {
        const cached = await cache.match(request);
        if (cached) return cached;
        if (request.mode === "navigate") {
          const shell = await cache.match("./index.html");
          if (shell) return shell;
        }
        throw new Error("offline");
      }
    })(),
  );
});
