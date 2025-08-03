// Service Worker for TTS Model Precaching
// This service worker caches TTS models and other assets for offline use

const CACHE_NAME = 'voice-assistant-v1';
const TTS_MODELS_CACHE = 'tts-models-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/tts-demo',
  '/manifest.json',
  // Add other static assets as needed
];

// TTS model files to cache
const TTS_MODEL_FILES = [
  '/models/tts/en_US-lessac-medium.onnx',
  '/models/tts/en_US-lessac-medium.onnx.json',
  // Add other model files as they become available
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Attempt to cache TTS models (may fail if not available)
      caches.open(TTS_MODELS_CACHE).then(async (cache) => {
        console.log('[SW] Attempting to cache TTS models');
        for (const modelFile of TTS_MODEL_FILES) {
          try {
            const response = await fetch(modelFile);
            if (response.ok) {
              await cache.put(modelFile, response);
              console.log(`[SW] Cached TTS model: ${modelFile}`);
            } else {
              console.log(`[SW] TTS model not available: ${modelFile}`);
            }
          } catch (error) {
            console.log(`[SW] Failed to cache TTS model ${modelFile}:`, error);
          }
        }
      })
    ])
  );
  
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== TTS_MODELS_CACHE) {
            console.log(`[SW] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle TTS model requests
  if (url.pathname.includes('/models/tts/')) {
    event.respondWith(
      caches.open(TTS_MODELS_CACHE).then(async (cache) => {
        // Try cache first
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          console.log(`[SW] Serving TTS model from cache: ${url.pathname}`);
          return cachedResponse;
        }
        
        // Fallback to network
        try {
          console.log(`[SW] Fetching TTS model from network: ${url.pathname}`);
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            // Cache the response for future use
            cache.put(request, networkResponse.clone());
            return networkResponse;
          }
          throw new Error(`Network response not ok: ${networkResponse.status}`);
        } catch (error) {
          console.error(`[SW] Failed to fetch TTS model: ${url.pathname}`, error);
          // Return a meaningful error response
          return new Response(
            JSON.stringify({ 
              error: 'TTS model not available offline',
              message: `Model ${url.pathname} requires internet connection to download initially`
            }),
            { 
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }
      })
    );
    return;
  }
  
  // Handle other requests with cache-first strategy
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(request).then((response) => {
        // Don't cache non-successful responses
        if (!response.ok) {
          return response;
        }
        
        // Clone the response since it can only be consumed once
        const responseClone = response.clone();
        
        // Cache static assets
        if (request.method === 'GET' && url.origin === self.location.origin) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        
        return response;
      });
    })
  );
});

// Message event - handle commands from main thread
self.addEventListener('message', (event) => {
  const { data } = event;
  
  if (data.type === 'CACHE_TTS_MODEL') {
    const { modelUrl } = data;
    
    caches.open(TTS_MODELS_CACHE).then(async (cache) => {
      try {
        console.log(`[SW] Manually caching TTS model: ${modelUrl}`);
        const response = await fetch(modelUrl);
        if (response.ok) {
          await cache.put(modelUrl, response);
          event.ports[0].postMessage({ success: true });
        } else {
          throw new Error(`Failed to fetch: ${response.status}`);
        }
      } catch (error) {
        console.error(`[SW] Failed to cache model ${modelUrl}:`, error);
        event.ports[0].postMessage({ success: false, error: error.message });
      }
    });
  }
  
  if (data.type === 'GET_CACHE_STATUS') {
    Promise.all([
      caches.open(CACHE_NAME).then(cache => cache.keys()),
      caches.open(TTS_MODELS_CACHE).then(cache => cache.keys())
    ]).then(([staticKeys, modelKeys]) => {
      event.ports[0].postMessage({
        staticAssets: staticKeys.length,
        ttsModels: modelKeys.length,
        totalSize: staticKeys.length + modelKeys.length
      });
    });
  }
});

console.log('[SW] Service worker script loaded');
