// Keeps the dashboard able to open without a connection. Pages are fetched fresh whenever the network is there
// (so new versions always arrive); the last good copy is only used when it isn't. Data calls are never cached here:
// the app keeps its own last-good data on the device.
const VERSION = "v1";
const PAGES = `hunter-pages-${VERSION}`;
const STATIC = `hunter-static-${VERSION}`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (!key.endsWith(VERSION)) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname === "/sw.js") return;

  // Pages: network first, last good copy when offline
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok && !res.redirected) (await caches.open(PAGES)).put(req, res.clone());
        return res;
      } catch {
        return (await caches.match(req, { ignoreSearch: true })) || Response.error();
      }
    })());
    return;
  }

  // Scripts, fonts and icons: they never change for a given address, so serve from the cache when we have them
  if (url.pathname.startsWith("/_next/static/") || /\.(png|ico|webmanifest)$/.test(url.pathname)) {
    event.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) (await caches.open(STATIC)).put(req, res.clone());
      return res;
    })());
  }
});
