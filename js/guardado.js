// Guardado del estudio (T023 y T024, con las fotos de T027 y T028).
//   1) Revisa: datos mínimos (en el ergométrico, DNI y nombre), números bien
//      escritos, campos de valores fijos (en el N° 5, Trámite adm.: SÍ o NO), que
//      no haya un dictado a medias ni fotos preparándose.
//   2) Cartel "¿Confirmar estudio?".
//   3) Guarda estudio + etapas de una sola vez (función guardar_estudio de la base:
//      todo o nada). Después, cada foto: el archivo al depósito y su fila en
//      `imagenes` (js/fotos.js). Es el orden de la T024.
//   4) Cartel "Estudio guardado — N° X", el de fotos pendientes con "Reintentar
//      fotos", o el de error con "Reintentar".
// Una vez guardado, el estudio no se edita desde el celular (se corrige desde el
// dashboard, T032): la planilla vuelve a empezar.
//
// Los datos mínimos, la función de la base y los textos de pantalla salen de la
// planilla activa (PLANILLA y textoDePlanilla, js/planillas/activa.js).

const TIEMPO_MAXIMO_GUARDADO_MS = 30000;

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
// Cambia cada vez que se cierra la sesión: si pasa en medio de un guardado, lo
// que responda después ya no muestra carteles (la pantalla ya es el login)
let vueltaDeCarga = 0;

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

// Los datos mínimos de la planilla (en el ergométrico, DNI y nombre): si falta
// alguno, avisa cuál y va a ese campo (también lo usa la edición del dashboard)
function faltanDatosMinimos(estudio, contenedor = contenedorCarga) {
  const faltan = PLANILLA.datosMinimos.filter(({ columna, soloCifras }) => {
    const valor = estudio[columna];
    return valor === null || (soloCifras && String(valor).replace(/\D/g, '') === '');
  });
  if (faltan.length === 0) return false;
  const lista = faltan.map((d) => d.falta).join(' y ');
  mostrarAviso(textoDePlanilla('faltanDatos', { lista }), 'error', 5000);
  irAlCampo(controlDeCampo(contenedor, faltan[0].columna));
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

// Campos de valores fijos: la planilla los declara con "opciones" (en el N° 5,
// Trámite adm.: "SÍ" o "NO"). El ergométrico no tiene ninguno. También los usa la
// edición del dashboard.
const camposConOpciones = (planilla) => planilla.secciones.flatMap((s) => s.campos || []).filter((c) => c.opciones);
const comparable = (texto) => String(texto).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// "si", "Sí" o "no" pasan a la forma de la planilla ("SÍ", "NO"); se ve en
// pantalla antes del cartel de confirmar. Lo vacío queda vacío (se guarda como null).
function ponerOpcionesEnSuFormaEn(contenedor, planilla) {
  camposConOpciones(planilla).forEach((campo) => {
    const control = controlDeCampo(contenedor, campo.columna);
    if (!control || control.value.trim() === '') return;
    const opcion = campo.opciones.find((o) => comparable(o) === comparable(control.value));
    if (opcion && opcion !== control.value) escribirValor(control, opcion);
  });
}

// Un valor que no es ninguna de las opciones no se puede guardar (la base lo
// rechazaría): se avisa cuál y se va a ese campo
function hayOpcionNoPermitida(contenedor, planilla) {
  const campo = camposConOpciones(planilla).find((c) => {
    const control = controlDeCampo(contenedor, c.columna);
    const valor = control ? control.value.trim() : '';
    return valor !== '' && !c.opciones.includes(valor);
  });
  if (!campo) return false;
  mostrarAviso(`"${campo.etiqueta}" tiene que ser ${campo.opciones.join(' o ')}.`, 'error', 5000);
  irAlCampo(controlDeCampo(contenedor, campo.columna));
  return true;
}

// --- 2 y 3) Confirmar y guardar ---------------------------------------------------------

// Primera letra en mayúscula en los textos libres (js/formulario.js)
function ponerMayusculaInicial() {
  ponerMayusculaInicialEn(contenedorCarga, PLANILLA);
}

async function confirmarEstudio() {
  if (ocupado || hayDictadoAMedias()) return;
  if (hayFotosPreparando()) {
    mostrarAviso('Esperá que terminen de prepararse las fotos.', 'error', 5000);
    return;
  }
  ocupado = true;
  try {
    // Primera letra en mayúscula en los textos libres (se ve en pantalla antes del
    // cartel: se guarda exactamente lo que se revisó y se confirmó)
    ponerMayusculaInicial();
    ponerOpcionesEnSuFormaEn(contenedorCarga, PLANILLA);
    const datos = datosParaGuardar();
    if (faltanDatosMinimos(datos.estudio) || hayNumeroMalEscrito(contenedorCarga)
        || hayOpcionNoPermitida(contenedorCarga, PLANILLA)) return;
    const confirma = await preguntar({
      titulo: textoDePlanilla('confirmarTitulo'),
      texto: textoDePlanilla('confirmarTexto', datos.estudio),
      textoConfirmar: 'Confirmar y guardar',
    });
    if (confirma) await guardarEstudio(datos);
  } finally {
    ocupado = false;
  }
}

// Lo que se manda a la base (js/formulario.js): lo vacío en null, DNI limpio y sin
// filas de etapa completamente vacías
function datosParaGuardar() {
  return datosParaGuardarDe(contenedorCarga);
}

function ponerBoton(texto, desactivado) {
  const boton = botonConfirmar();
  boton.textContent = texto;
  boton.disabled = desactivado;
}

async function guardarEstudio(datos) {
  const vuelta = vueltaDeCarga;
  ponerBoton('Guardando…', true);
  bloquearFotos(true);   // mientras se guarda, no se agregan ni se quitan fotos
  idEstudioEnCurso = idEstudioEnCurso || crypto.randomUUID();

  let resultado = null;
  let tipoDeError = null;
  try {
    if (!navigator.onLine) throw new Error('sin conexión');
    const cortar = new AbortController();
    const reloj = setTimeout(() => cortar.abort(), TIEMPO_MAXIMO_GUARDADO_MS);
    const { data, error } = await clienteSupabase
      .rpc(PLANILLA.base.guardar, { p_id: idEstudioEnCurso, p_estudio: datos.estudio, p_etapas: datos.etapas })
      .abortSignal(cortar.signal);
    clearTimeout(reloj);
    if (error) throw error;
    resultado = data;
  } catch (error) {
    const mensaje = String((error && error.message) || '');
    tipoDeError = !navigator.onLine || /fetch|network|abort|sin conexión/i.test(mensaje) ? 'conexion' : 'general';
    console.error('No se pudo guardar el estudio');   // sin datos del paciente en el registro
  } finally {
    ponerBoton(textoDePlanilla('botonConfirmar'), false);
  }

  if (vuelta !== vueltaDeCarga) return;   // se cerró la sesión mientras guardaba
  if (resultado) {
    await subirLasFotos(resultado);
  } else {
    bloquearFotos(false);
    await errorAlGuardar(tipoDeError, datos);
  }
}

// --- 4) Después de guardar: las fotos --------------------------------------------------------

// El estudio ya quedó guardado. Sube las fotos que falten (a la carpeta de ESE
// estudio) y, si alguna no se pudo, las deja en el celular para reintentar.
async function subirLasFotos(guardado) {
  if (fotosSinGuardar().length > 0) {
    const vuelta = vueltaDeCarga;
    ponerBoton('Subiendo fotos…', true);
    await subirFotos(guardado.id);
    ponerBoton(textoDePlanilla('botonConfirmar'), false);
    if (vuelta !== vueltaDeCarga) return;   // se cerró la sesión mientras subía
  }
  const faltan = fotosSinGuardar().length;
  if (faltan === 0) {
    await estudioGuardado(guardado.numero);
    return;
  }
  await fotosPendientes(guardado, faltan);
}

async function fotosPendientes(guardado, faltan) {
  const cuales = faltan === 1 ? 'no se pudo subir 1 foto' : `no se pudieron subir ${faltan} fotos`;
  const eleccion = await preguntar({
    titulo: textoDePlanilla('guardadoSinFotos', { numero: guardado.numero, cuales }),
    texto: navigator.onLine
      ? 'Las fotos que faltan siguen en el celular.'
      : 'Sin conexión. Las fotos que faltan siguen en el celular: probá de nuevo cuando tengas señal.',
    icono: 'error',
    textoConfirmar: 'Reintentar fotos',
    textoVolver: textoDePlanilla('cargarOtro'),
    textoTercero: 'Cerrar sesión',
    columna: true,
    cancelable: false,
    enfocar: 'confirmar',
  });

  if (eleccion === true) {
    await subirLasFotos(guardado);   // solo las que faltan, al mismo estudio
    return;
  }
  // "Cargar nuevo estudio" o "Cerrar sesión": primero, que decida si pierde las fotos
  const pierde = await preguntar({
    titulo: '¿Seguir sin esas fotos?',
    texto: textoDePlanilla('seguirSinFotos', { numero: guardado.numero, cuantas: faltan === 1 ? '1 foto' : `${faltan} fotos` }),
    textoConfirmar: 'Seguir sin las fotos',
    textoVolver: 'Volver',
    peligro: true,
  });
  if (!pierde) {
    await fotosPendientes(guardado, faltan);
    return;
  }
  if (eleccion === 'tercero') {
    await Sesion.salir();   // al cerrarse la sesión se borra todo y vuelve al login
    return;
  }
  empezarDeNuevo();
}

// --- 5) Después de guardar: la planilla vuelve a empezar ---------------------------------------

// Una vez guardado, no se edita desde el celular: planilla, audio y fotos afuera
function empezarDeNuevo() {
  idEstudioEnCurso = null;
  reiniciarGrabacion();
  reiniciarCarga();
  reiniciarFotos();
  document.querySelector('.carga__desplazable').scrollTo(0, 0);
}

async function estudioGuardado(numero) {
  empezarDeNuevo();

  const cargarOtro = await preguntar({
    titulo: textoDePlanilla('guardado', { numero }),
    texto: 'Los datos se guardaron correctamente.',
    icono: 'exito',
    textoConfirmar: textoDePlanilla('cargarOtro'),
    textoVolver: 'Cerrar sesión',
    columna: true,
    cancelable: false,    // así nadie cierra sesión sin querer tocando afuera
    enfocar: 'confirmar',
  });
  if (!cargarOtro) await Sesion.salir();   // al cerrarse la sesión, vuelve al login
}

async function errorAlGuardar(tipo, datos) {
  const reintentar = await preguntar({
    titulo: textoDePlanilla('errorAlGuardar'),
    texto: MENSAJES_GUARDADO[tipo] || MENSAJES_GUARDADO.general,
    icono: 'error',
    textoConfirmar: 'Reintentar',
  });
  if (reintentar) await guardarEstudio(datos);   // lo mismo que se confirmó
}

// Al empezar de nuevo (cerrar sesión), el próximo estudio lleva otro código
function olvidarEstudioEnCurso() {
  idEstudioEnCurso = null;
  vueltaDeCarga++;
}

// El botón dice lo de la planilla activa (en el ergométrico, "Confirmar estudio")
botonConfirmar().textContent = textoDePlanilla('botonConfirmar');
botonConfirmar().addEventListener('click', confirmarEstudio);
