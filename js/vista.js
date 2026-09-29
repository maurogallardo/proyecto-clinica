// Qué vista mostrar según el TIPO DE APARATO (T042, T054, RF-018).
// Una sola app y un solo link:
//   - con mouse o trackpad (computadora) -> dashboard, SIEMPRE, sin importar el
//     tamaño de la ventana ni el zoom del navegador (los médicos usan zoom);
//   - solo pantalla táctil (celular, tablet) -> pantalla de carga, SIEMPRE, aunque
//     esté acostado. El teclado no cuenta.
//
// La señal: la consulta "any-pointer: fine" del navegador = "¿este aparato tiene
// ALGÚN puntero preciso?" (mouse o trackpad: sí; dedo: no). Se usa "alguno" y no
// "el principal" para que una notebook con pantalla táctil (tiene trackpad) o una
// tablet con mouse conectado vean el dashboard. No se usa "hover" porque algunos
// Android lo informan mal.
// Red de seguridad: si el navegador no informa el puntero, decide por el ancho
// (1024 px), como antes.

const PUNTERO_PRECISO = window.matchMedia('(any-pointer: fine)');
const PUNTERO_INFORMADO = window.matchMedia('(any-pointer: fine), (any-pointer: coarse), (any-pointer: none)');
const ANCHO_DE_COMPU = window.matchMedia('(min-width: 1024px)');

function esComputadora() {
  if (PUNTERO_INFORMADO.matches) return PUNTERO_PRECISO.matches;
  return ANCHO_DE_COMPU.matches;   // el navegador no informa: se decide por el ancho
}

// La pantalla a la que se llega después del login
function pantallaPrincipal() {
  return esComputadora() ? 'dashboard' : 'carga';
}

// Si con la sesión abierta cambia el aparato (se conecta o desconecta un mouse)
// o, sin información del puntero, cambia el ancho: se pasa a la otra vista. La
// planilla de carga no se pierde: queda en pantalla, solo oculta.
function acompanarCambioDeAparato() {
  const actual = document.querySelector('.pantalla:not([hidden])');
  if (!actual || (actual.id !== 'carga' && actual.id !== 'dashboard')) return;
  const correcta = pantallaPrincipal();
  if (actual.id !== correcta) mostrarPantalla(correcta);
}

[PUNTERO_PRECISO, PUNTERO_INFORMADO, ANCHO_DE_COMPU].forEach((consulta) => {
  consulta.addEventListener('change', acompanarCambioDeAparato);
});
