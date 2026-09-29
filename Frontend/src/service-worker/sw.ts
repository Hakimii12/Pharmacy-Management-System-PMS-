/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute, createHandlerBoundToURL } from "workbox-precaching"
import { NavigationRoute, registerRoute } from "workbox-routing"
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from "workbox-strategies"
import { ExpirationPlugin } from "workbox-expiration"
import { CacheableResponsePlugin } from "workbox-cacheable-response"

declare const self: ServiceWorkerGlobalScope

const SYNC_TAG = "pharmacy-sync-queue"

// Injected at build time by vite-plugin-pwa.
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

self.addEventListener("install", () => {
  void self.skipWaiting()
})

registerRoute(
  new NavigationRoute(createHandlerBoundToURL("index.html"), {
    denylist: [/^\/api\//],
  }),
)

registerRoute(
  ({ url }) => url.origin === "https://fonts.googleapis.com",
  new StaleWhileRevalidate({ cacheName: "google-fonts-stylesheets" }),
)

registerRoute(
  ({ url }) => url.origin === "https://fonts.gstatic.com",
  new CacheFirst({
    cacheName: "google-fonts-webfonts",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  }),
)

registerRoute(
  ({ url, request }) =>
    request.method === "GET" &&
    url.pathname.startsWith("/api/") &&
    (url.pathname.includes("/product/") ||
      url.pathname.includes("/form/") ||
      url.pathname.includes("/notify/")),
  new NetworkFirst({
    cacheName: "api-reference-data",
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 7 }),
    ],
  }),
)

self.addEventListener("message", (event) => {
  // Sent by the update banner when the operator accepts a new build.
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting()
})

self.addEventListener("sync", (event) => {
  const syncEvent = event as ExtendableEvent & { tag?: string }
  if (syncEvent.tag !== SYNC_TAG) return

  syncEvent.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
      for (const client of clients) {
        client.postMessage({ type: "SYNC_QUEUE" })
      }
    })(),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})
