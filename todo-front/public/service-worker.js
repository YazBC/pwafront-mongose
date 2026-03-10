const CACHE_NAME = 'Todo-cahce-v1'
const urlsToCache = [
    "/",
    "/style.css",
    "/main.js",
    "/icons/icon-192x192.png",
    "/icons/icon-512x512.png",
];

self.addEventListener('install', (event) =>{
    event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>{
        return cache.addAll(urlsToCache);
    })
);
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cachesNames) =>{
            return Promise.all(
                cachesNames.map((cachesName) => {
                    if (cachesName !== CACHE_NAME){
                        return caches.delete(cachesName);
                    }
                })
            );
        })
    );
});

// ==========================================
// ESCUCHAR LAS NOTIFICACIONES PUSH
// ==========================================
self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json(); // Leemos el JSON que manda el backend
    
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png', // <-- Usando tu propio icono
      badge: '/icons/icon-192x192.png',
      vibrate: [100, 50, 100], // Hace vibrar el celular
    };

    // Mostramos la notificación visual
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Qué hacer cuando el usuario le da clic a la notificación
self.addEventListener('notificationclick', function(event) {
  event.notification.close(); // Cerramos el mensajito
  event.waitUntil(
    clients.openWindow('/') // Abrimos la app
  );
});