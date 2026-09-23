// Dibuja una planilla a partir de su configuración (js/planillas/...) y lee lo
// cargado. Sirve para cualquier planilla: sumar una nueva es escribir su
// configuración, sin tocar este archivo.

let contadorEtapas = 0;   // para que cada etapa tenga ids únicos

// --- Dibujar ---------------------------------------------------------------

function dibujarPlanilla(planilla, contenedor) {
  contadorEtapas = 0;
  contenedor.replaceChildren(...planilla.secciones.map((seccion) => dibujarSeccion(seccion, planilla)));
  ajustarTodasLasAlturas(contenedor);
}

function dibujarSeccion(seccion, planilla) {
  const tarjeta = crear('section', 'tarjeta seccion');
  tarjeta.append(crear('h2', 'titulo-seccion', seccion.titulo));

  if (seccion.tipo === 'etapas') {
    const lista = crear('div', 'etapas');
    lista.id = 'etapas';
    planilla.etapas.iniciales.forEach((valores) => {
      lista.append(dibujarEtapa(planilla.etapas.campos, valores));
    });
    tarjeta.append(lista, dibujarBotonAgregarEtapa(planilla.etapas.campos, lista));
    return tarjeta;
  }

  const grilla = crear('div', 'grilla-campos');
  seccion.campos.forEach((campo) => {
    grilla.append(campo.subtitulo
      ? crear('p', 'subtitulo-campos a-lo-ancho', campo.subtitulo)
      : dibujarCampo(campo, `campo-${campo.columna}`));
  });
  tarjeta.append(grilla);
  return tarjeta;
}

// Tarjeta de etapa (como la tarjeta "Control" de LoMar): rótulo y tacho arriba;
// Tiempo y Carga destacados; MET, T.A., F.C., ECG y Clínica en grilla
function dibujarEtapa(campos, valores = {}) {
  const numero = contadorEtapas++;
  const tarjeta = crear('div', 'etapa');

  const encabezado = crear('div', 'etapa__encabezado');
  const botonQuitar = crear('button', 'etapa__quitar');
  botonQuitar.type = 'button';
  botonQuitar.setAttribute('aria-label', 'Quitar esta etapa');
  botonQuitar.innerHTML = ICONO_TACHO;
  botonQuitar.addEventListener('click', () => quitarEtapa(tarjeta));
  encabezado.append(crear('span', 'etapa__rotulo', 'Etapa'), botonQuitar);

  const cabecera = crear('div', 'etapa__cabecera');
  const grilla = crear('div', 'etapa__grilla');
  campos.forEach((campo) => {
    const grupo = dibujarCampo(campo, `etapa-${numero}-${campo.columna}`, valores[campo.columna]);
    (campo.destacado ? cabecera : grilla).append(grupo);
  });
  tarjeta.append(encabezado, cabecera, grilla);
  return tarjeta;
}

// "+ Agregar etapa" (como "+ Agregar control" de LoMar). La etapa nueva arranca
// VACÍA, también Tiempo y Carga: los completa el profesional (nunca inventar).
function dibujarBotonAgregarEtapa(campos, lista) {
  const boton = crear('button', 'agregar-etapa', '+ Agregar etapa');
  boton.type = 'button';
  boton.addEventListener('click', () => {
    const nueva = dibujarEtapa(campos);
    nueva.classList.add('etapa--nueva');
    lista.append(nueva);
    ajustarTodasLasAlturas(nueva);
    // El cursor queda en Tiempo (y la pantalla va hasta ahí)
    nueva.querySelector('[data-columna]').focus();
  });
  return boton;
}

// Quitar una etapa: si tiene datos medidos, antes se pregunta (un toque sin
// querer no puede borrar datos dictados). Si solo tiene Tiempo y Carga, se
// quita enseguida, como en LoMar.
async function quitarEtapa(tarjeta) {
  if (etapaTieneDatos(tarjeta)) {
    const identificacion = [...tarjeta.querySelectorAll('.etapa__cabecera [data-columna]')]
      .filter((control) => control.value.trim() !== '')
      .map((control) => `${control.labels[0].textContent} ${control.value.trim()}`)
      .join(' · ');
    const quitar = await preguntar({
      titulo: '¿Quitar esta etapa?',
      texto: `${identificacion ? `${identificacion}. ` : ''}Se van a borrar los datos cargados en esta etapa.`,
      textoConfirmar: 'Quitar',
      peligro: true,
    });
    if (!quitar) return;
  }
  const seccion = tarjeta.closest('.seccion');
  tarjeta.remove();
  // El foco pasa al botón "+ Agregar etapa" (no se pierde en la pantalla)
  seccion.querySelector('.agregar-etapa').focus();
}

// ¿Tiene algo cargado aparte de Tiempo y Carga?
function etapaTieneDatos(tarjeta) {
  return [...tarjeta.querySelectorAll('.etapa__grilla [data-columna]')]
    .some((control) => control.value.trim() !== '');
}

// Ícono de tacho (el mismo de LoMar)
const ICONO_TACHO = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
  stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <polyline points="3 6 5 6 21 6"/>
  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
  <path d="M10 11v6"/><path d="M14 11v6"/>
  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
</svg>`;

function dibujarCampo(campo, id, valor) {
  const grupo = crear('div', campo.ancho === 'completo' ? 'campo-grupo a-lo-ancho' : 'campo-grupo');
  const etiqueta = crear('label', campo.etiquetaOculta ? 'campo-etiqueta solo-lectores' : 'campo-etiqueta', campo.etiqueta);
  etiqueta.htmlFor = id;

  const control = crearControl(campo);
  control.id = id;
  control.dataset.columna = campo.columna;
  control.dataset.tipo = campo.tipo;
  if (valor !== undefined && valor !== null) control.value = valor;
  else if (campo.valorInicial === 'hoy') control.value = fechaDeHoy();

  grupo.append(etiqueta, control);
  return grupo;
}

// Fecha de hoy según el reloj del dispositivo, en el formato de los campos de
// fecha (AAAA-MM-DD). No se usa la hora universal: en Argentina, después de
// las 21 h ya sería "mañana".
function fechaDeHoy() {
  const hoy = new Date();
  const dosCifras = (numero) => String(numero).padStart(2, '0');
  return `${hoy.getFullYear()}-${dosCifras(hoy.getMonth() + 1)}-${dosCifras(hoy.getDate())}`;
}

function crearControl(campo) {
  let control;
  if (campo.tipo === 'texto' || campo.tipo === 'texto-largo') {
    // Caja que crece con lo que se escribe o dicta (como en LoMar)
    control = document.createElement('textarea');
    control.rows = campo.tipo === 'texto-largo' ? 2 : 1;
    control.addEventListener('input', () => ajustarAltura(control));
    if (campo.tipo === 'texto') {
      // Un campo corto no lleva "Enter" (no tiene renglones)
      control.addEventListener('keydown', (evento) => {
        if (evento.key === 'Enter') evento.preventDefault();
      });
    }
  } else {
    control = document.createElement('input');
    control.type = campo.tipo === 'fecha' ? 'date' : 'text';
    if (campo.tipo === 'entero') control.inputMode = 'numeric';
    if (campo.tipo === 'decimal') control.inputMode = 'decimal';
  }
  if (campo.teclado) control.inputMode = campo.teclado;
  control.className = campo.tipo === 'entero' || campo.tipo === 'decimal' ? 'campo numeros' : 'campo';
  control.autocomplete = 'off';
  return control;
}

// --- Altura de las cajas de texto (copia de autoResizeTextarea de LoMar) ---

function ajustarAltura(caja) {
  caja.style.height = 'auto';
  const bordes = caja.offsetHeight - caja.clientHeight;
  caja.style.height = `${caja.scrollHeight + bordes}px`;
}

function ajustarTodasLasAlturas(contenedor = document) {
  contenedor.querySelectorAll('textarea.campo').forEach(ajustarAltura);
}

// Una caja oculta mide 0: se recalcula al mostrar la pantalla o cambiar el ancho
document.addEventListener('pantallamostrada', () => ajustarTodasLasAlturas());
window.addEventListener('resize', () => ajustarTodasLasAlturas());

// --- Leer lo cargado ---------------------------------------------------------

// Devuelve { estudio: {columna: valor}, etapas: [{columna: valor}, ...] }.
// Lo que no se cargó queda en null: nunca se completa nada por cuenta propia.
function leerPlanilla(contenedor) {
  const estudio = {};
  contenedor.querySelectorAll('[data-columna]').forEach((control) => {
    if (!control.closest('.etapa')) estudio[control.dataset.columna] = leerValor(control);
  });

  const etapas = [...contenedor.querySelectorAll('.etapa')].map((tarjeta) => {
    const etapa = {};
    tarjeta.querySelectorAll('[data-columna]').forEach((control) => {
      etapa[control.dataset.columna] = leerValor(control);
    });
    return etapa;
  });

  return { estudio, etapas };
}

function leerValor(control) {
  const texto = control.value.trim();
  if (texto === '') return null;
  const tipo = control.dataset.tipo;
  if (tipo === 'entero' || tipo === 'decimal') {
    const numero = Number(texto.replace(',', '.'));   // acepta "72,5" y "72.5"
    // Si no es un número válido se devuelve tal cual: la revisión (T022) lo señala
    return Number.isFinite(numero) ? numero : texto;
  }
  return texto;
}

// --- Ayudante ------------------------------------------------------------------

function crear(etiqueta, clase, texto) {
  const elemento = document.createElement(etiqueta);
  if (clase) elemento.className = clase;
  if (texto) elemento.textContent = texto;
  return elemento;
}
