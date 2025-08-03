const CACHE_NAME = "pharmacy-app-cache-v1"
const urlsToCache = [
  "/",
  "/index.html",
  // Vite typically places bundled assets in 'assets/' with hashed names.
  // It's generally better to let the fetch handler cache these dynamically
  // after the first visit, as their names change with each build.
  // However, if you have specific static assets in your public folder, list them here:
  "/assets/hamzMesgedDrugStroe.png", // Your logo
  // If you have other static files in your public directory, add them here.
  // For example, if you have a 'public/data/API.json' file:
  // '/data/API.json'
]

// Install event: Caches static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Service Worker: Opened cache")
        return cache.addAll(urlsToCache)
      })
      .catch((error) => {
        console.error("Service Worker: Failed to cache during install:", error)
      }),
  )
})

// Fetch event: Intercepts network requests
self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url)

  // Check if the request is for an API call (e.g., starts with /api)
  const isApiRequest = requestUrl.pathname.includes("/api/")

  if (isApiRequest) {
    // For API requests, try network first, then cache
    event.respondWith(
      fetch(event.request)
        .then(async (response) => {
          // Check if we received a valid response before caching
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response
          }

          // Cache successful API responses
          const responseClone = response.clone()
          const cache = await caches.open(CACHE_NAME)
          cache.put(event.request, responseClone)
          return response
        })
        .catch(async () => {
          // If network fails, try to serve from cache
          const cachedResponse = await caches.match(event.request)
          if (cachedResponse) {
            console.log("Service Worker: Serving API from cache:", event.request.url)
            return cachedResponse
          }
          // If not in cache, return a fallback or error
          return new Response("Offline: API data not available", {
            status: 503,
            statusText: "Service Unavailable",
            headers: new Headers({ "Content-Type": "text/plain" }),
          })
        }),
    )
  } else {
    // For other requests (static assets, HTML, JS, CSS), try cache first, then network
    event.respondWith(
      caches.match(event.request).then((response) => {
        // Cache hit - return response
        if (response) {
          return response
        }
        // No cache hit - fetch from network
        return fetch(event.request).then((response) => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response
          }

          // IMPORTANT: Clone the response. A response is a stream
          // and can only be consumed once. We must clone it so that
          // we can consume the original for the browser and the clone for the cache.
          const responseToCache = response.clone()

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })

          return response
        })
      }),
    )
  }
})

// Activate event: Cleans up old caches
self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME]
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Delete old caches
            console.log("Service Worker: Deleting old cache:", cacheName)
            return caches.delete(cacheName)
          }
        }),
      )
    }),
  )
})
