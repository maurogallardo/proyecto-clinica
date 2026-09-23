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

// Selector de modo claro / oscuro / automático: marca el botón elegido y le
// avisa a js/tema.js cuando la persona toca otro.
function prepararSelectorTema() {
  const botones = document.querySelectorAll('.selector-tema button');

  function marcarElegido() {
    botones.forEach((boton) => {
      boton.setAttribute('aria-pressed', String(boton.dataset.modo === window.Tema.eleccion()));
    });
  }

  botones.forEach((boton) => {
    boton.addEventListener('click', () => window.Tema.elegir(boton.dataset.modo));
  });
  document.addEventListener('temacambiado', marcarElegido);
  marcarElegido();
}

prepararSelectorTema();
