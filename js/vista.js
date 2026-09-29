// Qué vista mostrar según el TIPO DE APARATO (T042, T054, T060, RF-018).
// Una sola app y un solo link:
//   - celular o tablet -> pantalla de carga, SIEMPRE (el celular es solo para
//     cargar; una tablet cuenta como celular);
//   - computadora -> dashboard, SIEMPRE, sin importar el tamaño de la ventana ni el
//     zoom del navegador (los médicos usan zoom).
//
// La regla (T060), en este orden:
//   1) Es CELULAR o TABLET si:
//      a) el propio navegador dice que es móvil: navigator.userAgentData.mobile, o
//         el "user agent" dice Android, iPhone, iPad, iPod o Mobile, o es un iPad
//         que se presenta como Mac (MacIntel con pantalla táctil); o
//      b) el puntero PRINCIPAL es el dedo y no hay "hover": (pointer: coarse) and
//         (hover: none). Cubre el Android en modo "sitio de escritorio" y las
//         tablets solo táctiles (también las de Windows).
//   2) Si no, es COMPUTADORA cuando tiene algún puntero preciso (any-pointer: fine):
//      mouse o trackpad. Así una notebook con pantalla táctil sigue viendo el
//      dashboard.
//   3) Si el navegador no informa nada del puntero, se decide por el ancho
//      (1024 px), como antes.
//
// Por qué primero el paso 1: hasta la T060 la regla era solo "any-pointer: fine =
// compu", y un accesorio del celular (un mouse o teclado Bluetooth, "Vincular con
// Windows" / Phone Link, un lápiz) puede hacer que el celular informe un puntero
// preciso: el celular de Mauro empezó a mostrar el dashboard. El paso 1 no se deja
// engañar por eso.
// Los celulares con S Pen quedan cubiertos por el paso 1a (su navegador dice que
// es móvil), pero NO se probaron en un aparato real.
//
// La vista se decide UNA sola vez: al abrir la app o al iniciar sesión. No cambia
// sola después (si aparece o desaparece un puntero en medio de una carga, la
// planilla no se oculta ni se pierde). No hay botón manual para cambiarla.

const DEDO_PRINCIPAL = window.matchMedia('(pointer: coarse) and (hover: none)');
const PUNTERO_PRECISO = window.matchMedia('(any-pointer: fine)');
const PUNTERO_INFORMADO = window.matchMedia('(any-pointer: fine), (any-pointer: coarse), (any-pointer: none)');
const ANCHO_DE_COMPU = window.matchMedia('(min-width: 1024px)');

// Paso 1: ¿es celular o tablet?
function esCelularOTablet() {
  const datos = navigator.userAgentData;
  if (datos && datos.mobile === true) return true;
  if (/Android|iPhone|iPad|iPod|Mobile/.test(navigator.userAgent || '')) return true;
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true;   // iPad que se presenta como Mac
  return DEDO_PRINCIPAL.matches;
}

function esComputadora() {
  if (esCelularOTablet()) return false;
  if (PUNTERO_INFORMADO.matches) return PUNTERO_PRECISO.matches;
  return ANCHO_DE_COMPU.matches;   // el navegador no informa: se decide por el ancho
}

// La pantalla a la que se llega al abrir la app (con sesión) o al iniciar sesión
function pantallaPrincipal() {
  return esComputadora() ? 'dashboard' : 'carga';
}
