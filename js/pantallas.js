// Cambio de pantalla: muestra una (splash, login, carga...) y oculta las demás.
// Cada pantalla es un <section class="pantalla" id="..."> en index.html.
// (Misma idea que mostrarPantalla de LoMar.)

// Pantalla a la que se llega después del login. Por ahora, la muestra de la
// base visual (T045); cuando exista la carga del estudio (T013), pasa a ser esa.
const PANTALLA_PRINCIPAL = 'muestra';

function mostrarPantalla(id) {
  document.querySelectorAll('.pantalla').forEach((pantalla) => {
    pantalla.hidden = pantalla.id !== id;
  });
}
