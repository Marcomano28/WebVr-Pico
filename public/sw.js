// Service Worker básico para PWA
const CACHE_NAME = 'webvr-cache-v4';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
  // Los modelos 3D no se cachearán para asegurar que siempre se cargan frescos
];

// Instalación del service worker
self.addEventListener('install', (event) => {
  // Forzar la activación inmediata del nuevo service worker
  self.skipWaiting();
  
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
  // Tomar el control inmediatamente sin esperar a la recarga
  event.waitUntil(clients.claim());
  
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Responder a las peticiones de red
self.addEventListener('fetch', (event) => {
  // No cachear archivos de modelos 3D (.glb, .fbx)
  if (event.request.url.match(/\.(glb|fbx)$/i)) {
    console.log('Cargando modelo fresco:', event.request.url);
    event.respondWith(fetch(event.request));
    return;
  }
  
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