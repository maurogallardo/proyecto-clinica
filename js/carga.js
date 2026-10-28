// Pantalla de carga (T013): el título y el formulario de la planilla activa (PLANILLA,
// ver js/planillas/activa.js) y el menú del encabezado (modo de color y "Cerrar sesión").

const contenedorCarga = document.getElementById('carga-formulario');

// Formulario vacío (con las filas de etapas que trae impresas el papel)
function reiniciarCarga() {
  dibujarPlanilla(PLANILLA, contenedorCarga);
}

// Lo cargado hasta ahora (lo usarán la revisión y el guardado: T022 y T024)
function leerCarga() {
  return leerPlanilla(contenedorCarga);
}

// Menú del encabezado: se abre con el botón y se cierra al tocar afuera o con Escape
function prepararMenu() {
  const boton = document.getElementById('menu-boton');
  const panel = document.getElementById('menu-panel');

  boton.addEventListener('click', (evento) => {
    evento.stopPropagation();
    abrirMenu(panel.hidden);
  });
  document.addEventListener('click', (evento) => {
    if (!panel.hidden && !panel.contains(evento.target)) abrirMenu(false);
  });
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') abrirMenu(false);
  });
}

function abrirMenu(abrir) {
  document.getElementById('menu-panel').hidden = !abrir;
  document.getElementById('menu-boton').setAttribute('aria-expanded', String(abrir));
}

document.getElementById('carga-titulo').textContent = PLANILLA.titulo;   // en el ergométrico, "Estudio ergométrico"
reiniciarCarga();
prepararMenu();
