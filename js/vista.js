// Qué vista mostrar según el tamaño de la pantalla (T042, RF-018).
// Una sola app y un solo link:
//   - pantalla chica (celular)  -> pantalla de carga: el celular es solo para cargar;
//   - pantalla grande (compu)   -> dashboard.
// Corte: 1024 px de ancho. Un celular acostado mide menos y sigue viendo la carga.

const MEDIDA_PANTALLA_GRANDE = window.matchMedia('(min-width: 1024px)');

function esPantallaGrande() {
  return MEDIDA_PANTALLA_GRANDE.matches;
}

// La pantalla a la que se llega después del login
function pantallaPrincipal() {
  return esPantallaGrande() ? 'dashboard' : 'carga';
}

// Si con la sesión abierta la ventana cruza el corte (por ejemplo, se achica
// mucho en la compu), se pasa a la otra vista. La planilla de carga no se pierde:
// queda en pantalla, solo oculta.
MEDIDA_PANTALLA_GRANDE.addEventListener('change', () => {
  const actual = document.querySelector('.pantalla:not([hidden])');
  if (actual && (actual.id === 'carga' || actual.id === 'dashboard')) mostrarPantalla(pantallaPrincipal());
});
