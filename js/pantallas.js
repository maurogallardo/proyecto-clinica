// Cambio de pantalla: muestra una (splash, login, carga...) y oculta las demás.
// Cada pantalla es un <section class="pantalla" id="..."> en index.html.
// (Misma idea que mostrarPantalla de LoMar.)

// La pantalla a la que se llega después del login la decide js/vista.js según
// el tipo de aparato: la carga del estudio (T013) o el dashboard (T030).

function mostrarPantalla(id) {
  document.querySelectorAll('.pantalla').forEach((pantalla) => {
    pantalla.hidden = pantalla.id !== id;
  });
  // Aviso para quien necesite acomodarse al aparecer (por ejemplo, las cajas de texto)
  document.dispatchEvent(new CustomEvent('pantallamostrada', { detail: { id } }));
}
