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
    tarjeta.append(lista);
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

// Tarjeta de etapa (como la tarjeta "Control" de LoMar):
// Tiempo y Carga destacados arriba; MET, T.A., F.C., ECG y Clínica en grilla
function dibujarEtapa(campos, valores = {}) {
  const numero = contadorEtapas++;
  const tarjeta = crear('div', 'etapa');
  const cabecera = crear('div', 'etapa__cabecera');
  const grilla = crear('div', 'etapa__grilla');
  campos.forEach((campo) => {
    const grupo = dibujarCampo(campo, `etapa-${numero}-${campo.columna}`, valores[campo.columna]);
    (campo.destacado ? cabecera : grilla).append(grupo);
  });
  tarjeta.append(cabecera, grilla);
  return tarjeta;
}

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
