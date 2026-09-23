// Cambio de pantalla: muestra una (splash, login, carga...) y oculta las demás.
// Cada pantalla es un <section class="pantalla" id="..."> en index.html.
// (Misma idea que mostrarPantalla de LoMar.)

// Pantalla a la que se llega después del login: la carga del estudio (T013)
const PANTALLA_PRINCIPAL = 'carga';

function mostrarPantalla(id) {
  document.querySelectorAll('.pantalla').forEach((pantalla) => {
    pantalla.hidden = pantalla.id !== id;
  });
  // Aviso para quien necesite acomodarse al aparecer (por ejemplo, las cajas de texto)
  document.dispatchEvent(new CustomEvent('pantallamostrada', { detail: { id } }));
}
