import { addData } from "../utility/indexedDB";

const CACHE_NAME = "ble-app-cache-v1";
const urlsToCache = [
  "/",
  "/public/index.html",
  "/src/App.css",
  "/src/App.js",
  "/src/Home.js",
  "/src/store.js",
  "/src/components/BleButtons/BleButtons.jsx",
  "/src/components/BleButtons/BottomActionBar.jsx",
  "/src/components/DeviceDetails/ATTPage.jsx",
  "/src/components/DeviceDetails/STSPage.jsx",
  "/src/components/DeviceDetails/CMDPage.jsx",
  "/src/components/DeviceDetails/DTAPage.jsx",
  "/src/components/DeviceDetails/DIAPage.jsx",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache");
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        // Return cached response but revalidate it in the background
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
        });
        return response;
      }

      // Network-first strategy: fallback to cache on failure
      return fetch(event.request)
        .then((response) => {
          if (
            !response ||
            response.status !== 200 ||
            response.type !== "basic"
          ) {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          // Store JSON response data in IndexedDB
          if (
            response.headers.get("content-type").includes("application/json")
          ) {
            response
              .clone()
              .json()
              .then((data) => {
                addData(data); // Ensure addData handles errors appropriately
              });
          }
          return response;
        })
        .catch(() => caches.match(event.request)); // Fallback to cache if network fails
    })
  );
});

self.addEventListener("activate", (event) => {
  const currentCacheName = "ble-app-cache-v2"; // New version for cache

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== currentCacheName) {
              console.log("Deleting old cache:", cacheName);
              return caches.delete(cacheName); // Delete old caches
            }
          })
        );
      })
      .then(() => {
        // Optionally update the new cache by fetching fresh resources
        return caches.open(currentCacheName).then((cache) => {
          return cache.addAll(urlsToCache); // Re-cache updated resources
        });
      })
  );
});
