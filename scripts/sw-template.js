/* Service worker for ไปต่อ (SPEC §7, §12). Generated into public/sw.js by
 * scripts/build-sw.mjs — edit this template, not the output.
 *
 * - Precaches the app shell (4 pages) and every static asset of this build.
 * - Pages: cache first (the shell is static and client-rendered; data lives
 *   in IndexedDB), so the app opens instantly even in airplane mode.
 * - /_next/static: cache first (immutable, hashed).
 * - Never touches other origins (Supabase) or /api/*.
 * - A new version waits until the page asks it to take over ("โหลดใหม่").
 * - Shows Web Push alerts sent by /api/push/tick and opens the app on tap.
 */

const VERSION = "__VERSION__";
const PAGES = __PAGES__;
const ASSETS = __ASSETS__;
const CACHE = `paito-${VERSION}`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // cache: "reload" bypasses the HTTP cache so we store this build's files
      await cache.addAll([...PAGES, ...ASSETS].map((url) => new Request(url, { cache: "reload" })));
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("paito-") && k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

function shellFor(pathname) {
  const clean = pathname.replace(/\/+$/, "") || "/";
  return PAGES.includes(clean) ? clean : null;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase etc.: straight to the network
  if (url.pathname.startsWith("/api/")) return;

  // Full page loads: serve this build's shell for the route
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const shell = shellFor(url.pathname);
        const cached = shell ? await cache.match(shell) : undefined;
        if (cached) return cached;
        try {
          return await fetch(request);
        } catch {
          return (await cache.match("/")) ?? Response.error();
        }
      })(),
    );
    return;
  }

  // Hashed build assets, icons, manifest: cache first, fill on miss
  if (url.pathname.startsWith("/_next/static/") || ASSETS.includes(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE);
        const cached = await cache.match(request, { ignoreSearch: url.pathname.startsWith("/_next/static/") });
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })(),
    );
  }
  // Everything else (e.g. RSC payloads for client navigation): network as usual.
  // Offline, Next.js falls back to a full navigation, which the shell above serves.
});

// Web Push (api/push/tick): { title, body, tag, url }
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "ไปต่อ", {
      body: data.body || "",
      tag: data.tag,
      icon: "/icons/icon-192.png",
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (open) {
        await open.focus();
        if ("navigate" in open && open.url !== url) await open.navigate(url).catch(() => undefined);
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
