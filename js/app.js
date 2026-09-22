// Punto de entrada de la app: acá arranca la lógica del frontend.

// Registrar el service worker (sw.js), necesario para que la app se pueda
// instalar. Si el navegador no lo soporta, la app funciona igual como página web.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('No se pudo registrar el service worker:', error);
    });
  });
}
