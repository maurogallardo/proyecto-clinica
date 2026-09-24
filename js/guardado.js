// Guardado del estudio (T023 y T024).
//   1) Revisa: datos mínimos (DNI y nombre), números bien escritos y que no haya
//      un dictado a medias.
//   2) Cartel "¿Confirmar estudio?".
//   3) Guarda estudio + etapas de una sola vez (función guardar_estudio de la base:
//      todo o nada). Orden de la T024: estudio -> etapas (imágenes: Fase 3).
//   4) Cartel "Estudio guardado — N° X" o cartel de error con "Reintentar".
// Una vez guardado, el estudio no se edita desde el celular (se corrige desde el
// dashboard, T032): la planilla vuelve a empezar.

const TIEMPO_MAXIMO_GUARDADO_MS = 30000;

// Datos mínimos para guardar (RF-023)
const DATOS_MINIMOS = [
  { columna: 'documento', falta: 'el DNI' },
  { columna: 'nombre_paciente', falta: 'el nombre' },
];

const MENSAJES_GUARDADO = {
  conexion: 'Sin conexión. La planilla sigue en pantalla: probá de nuevo cuando tengas señal.',
  general: 'Hubo un error al guardar. La planilla sigue en pantalla: probá de nuevo.',
};

// El código (id) del estudio se arma antes del primer intento y se repite en cada
// reintento: si el guardado se completó pero la respuesta se perdió, la base
// devuelve el mismo estudio en lugar de crear otro. Se renueva al empezar de nuevo.
let idEstudioEnCurso = null;
// Desde que se toca "Confirmar estudio" hasta que se cierra el último cartel, el
// botón no vuelve a arrancar el guardado (así un doble toque no guarda dos veces)
let ocupado = false;

function botonConfirmar() {
  return document.getElementById('boton-confirmar-estudio');
}

// Lleva la pantalla a un campo y deja el cursor ahí
function irAlCampo(control) {
  control.scrollIntoView({ block: 'center' });
  control.focus({ preventScroll: true });
}

// --- 1) Revisiones antes de preguntar ------------------------------------------------

// No se guarda con un dictado a medias (el audio se perdería al limpiar la planilla)
function hayDictadoAMedias() {
  if (estadoGrabacion === 'reposo') return false;
  mostrarAviso(estadoGrabacion === 'enviando'
    ? 'Esperá que termine de completarse la planilla antes de guardar.'
    : 'Enviá o descartá el audio antes de guardar.', 'error', 5000);
  return true;
}

// DNI y nombre: si falta alguno, avisa cuál y va a ese campo
function faltanDatosMinimos(estudio) {
  const faltan = DATOS_MINIMOS.filter(({ columna }) => {
    const valor = estudio[columna];
    return valor === null || (columna === 'documento' && String(valor).replace(/\D/g, '') === '');
  });
  if (faltan.length === 0) return false;
  const lista = faltan.map((d) => d.falta).join(' y ');
  mostrarAviso(`Para guardar, falta ${lista} del paciente.`, 'error', 5000);
  irAlCampo(document.getElementById(`campo-${faltan[0].columna}`));
  return true;
}

// Un número mal escrito a mano haría fallar el guardado entero: se avisa antes
function hayNumeroMalEscrito(contenedor) {
  const controles = [...contenedor.querySelectorAll('[data-tipo="entero"], [data-tipo="decimal"]')];
  const malo = controles.find((control) => {
    const valor = leerValor(control);
    if (valor === null) return false;
    if (typeof valor !== 'number') return true;
    return control.dataset.tipo === 'entero' && !Number.isInteger(valor);
  });
  if (!malo) return false;
  const etiqueta = malo.labels[0] ? malo.labels[0].textContent : 'Un campo';
  const tipo = malo.dataset.tipo === 'entero' ? 'un número entero' : 'un número';
  mostrarAviso(`"${etiqueta}" tiene que ser ${tipo}.`, 'error', 5000);
  irAlCampo(malo);
  return true;
}

// --- 2 y 3) Confirmar y guardar ---------------------------------------------------------

async function confirmarEstudio() {
  if (ocupado || hayDictadoAMedias()) return;
  ocupado = true;
  try {
    // Se guarda exactamente lo que se revisó y se confirmó
    const datos = datosParaGuardar();
    if (faltanDatosMinimos(datos.estudio) || hayNumeroMalEscrito(contenedorCarga)) return;
    const confirma = await preguntar({
      titulo: '¿Confirmar estudio?',
      texto: `Se va a guardar el estudio de ${datos.estudio.nombre_paciente}.`,
      textoConfirmar: 'Confirmar y guardar',
    });
    if (confirma) await guardarEstudio(datos);
  } finally {
    ocupado = false;
  }
}

// Lo que se manda a la base: los campos de la planilla (lo vacío va en null)
function datosParaGuardar() {
  const { estudio, etapas } = leerCarga();
  if (estudio.documento !== null) estudio.documento = estudio.documento.replace(/\D/g, '');   // DNI limpio, sin puntos
  // Una fila de etapa completamente vacía no tiene ningún dato: no se guarda
  const conDatos = etapas.filter((etapa) => Object.values(etapa).some((valor) => valor !== null));
  return { estudio, etapas: conDatos };
}

async function guardarEstudio(datos) {
  const boton = botonConfirmar();
  boton.disabled = true;
  boton.textContent = 'Guardando…';
  idEstudioEnCurso = idEstudioEnCurso || crypto.randomUUID();

  let resultado = null;
  let tipoDeError = null;
  try {
    if (!navigator.onLine) throw new Error('sin conexión');
    const cortar = new AbortController();
    const reloj = setTimeout(() => cortar.abort(), TIEMPO_MAXIMO_GUARDADO_MS);
    const { data, error } = await clienteSupabase
      .rpc('guardar_estudio', { p_id: idEstudioEnCurso, p_estudio: datos.estudio, p_etapas: datos.etapas })
      .abortSignal(cortar.signal);
    clearTimeout(reloj);
    if (error) throw error;
    resultado = data;
  } catch (error) {
    const mensaje = String((error && error.message) || '');
    tipoDeError = !navigator.onLine || /fetch|network|abort|sin conexión/i.test(mensaje) ? 'conexion' : 'general';
    console.error('No se pudo guardar el estudio');   // sin datos del paciente en el registro
  } finally {
    boton.disabled = false;
    boton.textContent = 'Confirmar estudio';
  }

  if (resultado) await estudioGuardado(resultado.numero);
  else await errorAlGuardar(tipoDeError, datos);
}

// --- 4) Después de guardar ------------------------------------------------------------------

async function estudioGuardado(numero) {
  // Una vez guardado, no se edita desde el celular: la planilla vuelve a empezar
  idEstudioEnCurso = null;
  reiniciarGrabacion();
  reiniciarCarga();
  document.querySelector('.carga__desplazable').scrollTo(0, 0);

  const cargarOtro = await preguntar({
    titulo: `Estudio guardado — N° ${numero}`,
    texto: 'Los datos se guardaron correctamente.',
    icono: 'exito',
    textoConfirmar: 'Cargar nuevo estudio',
    textoVolver: 'Cerrar sesión',
    columna: true,
    cancelable: false,    // así nadie cierra sesión sin querer tocando afuera
    enfocar: 'confirmar',
  });
  if (!cargarOtro) await Sesion.salir();   // al cerrarse la sesión, vuelve al login
}

async function errorAlGuardar(tipo, datos) {
  const reintentar = await preguntar({
    titulo: 'No se pudo guardar el estudio',
    texto: MENSAJES_GUARDADO[tipo] || MENSAJES_GUARDADO.general,
    icono: 'error',
    textoConfirmar: 'Reintentar',
  });
  if (reintentar) await guardarEstudio(datos);   // lo mismo que se confirmó
}

// Al empezar de nuevo (cerrar sesión), el próximo estudio lleva otro código
function olvidarEstudioEnCurso() {
  idEstudioEnCurso = null;
}

botonConfirmar().addEventListener('click', confirmarEstudio);
