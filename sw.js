// Service worker: un "ayudante" que el navegador ejecuta aparte de la página.
// Por ahora solo existe para que la app se pueda instalar como PWA.
// NO guarda copias de nada (ni pantallas ni datos de pacientes): el uso sin
// conexión es posterior a la demo (RF-024). Así la app siempre muestra la
// última versión publicada.

// Cuando llega una versión nueva de este archivo, que se active enseguida
// en lugar de esperar a que se cierren todas las pestañas de la app.
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Al activarse, que tome el control de las pestañas que ya estaban abiertas.
self.addEventListener('activate', (evento) => {
  evento.waitUntil(self.clients.claim());
});
