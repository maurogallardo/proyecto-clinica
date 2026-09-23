// Zoom bloqueado (decisión del proyecto): la pantalla queda siempre ajustada
// al ancho. Android respeta la línea "viewport" de index.html y el CSS; el
// iPhone ignora el "viewport" a propósito, así que acá se cancelan sus gestos.

// Pellizco en iPhone (Safari tiene eventos propios para ese gesto)
['gesturestart', 'gesturechange', 'gestureend'].forEach((tipo) => {
  document.addEventListener(tipo, (evento) => evento.preventDefault(), { passive: false });
});

// Cualquier movimiento con dos o más dedos (pellizco en cualquier navegador)
document.addEventListener('touchmove', (evento) => {
  if (evento.touches.length > 1) evento.preventDefault();
}, { passive: false });
