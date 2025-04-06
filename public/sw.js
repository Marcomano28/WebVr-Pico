// Service Worker básico para PWA
const CACHE_NAME = 'webvr-cache-v3';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/models/AlfredAvatar.glb',
  '/models/fbx/Standing W_Briefcase Idle (1).fbx',
  '/models/fbx/Standing Idle.fbx',
  '/models/lamborghini_huracan.glb',
  '/models/SamiAvatar.glb',
  '/models/mclaren_senna.glb'
];

// Instalación del service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache abierto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activación del service worker
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Responder a las peticiones de red
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Devuelve la respuesta cacheada si existe
        if (response) {
          return response;
        }
        
        // Si no está en caché, intenta obtenerlo de la red
        return fetch(event.request).then(
          (response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clonar la respuesta para poder almacenarla en cache y devolverla
            var responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
  );
}); 