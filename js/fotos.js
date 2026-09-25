// Fotos del estudio (T025 a T029).
//   - Clip: elegir fotos de la galería (varias). Cámara: sacar una en el momento.
//   - Cada foto se pasa a WebP en el celular apenas se agrega (T026).
//   - Hasta confirmar, viven SOLO en la memoria del celular (RF-013): nada se sube.
//   - Al guardar (js/guardado.js), después del estudio: se sube cada foto a la
//     carpeta del estudio (T027) y se guarda su fila en `imagenes` (T028).
//   - Ver las fotos de un estudio guardado es en el dashboard (Fase 4), con
//     enlaces firmados que caducan: enlaceFirmado() queda lista (T029).

const FOTOS = {
  maximo: 10,                            // por estudio
  porFila: 5,                            // miniaturas: dos filas de hasta 5, todas a la vista
  ladoMaximoPx: 3000,                    // se lee bien un electro sacado con el celular
  calidad: 0.85,
  calidadMinima: 0.6,
  pesoMaximo: 4.5 * 1024 * 1024,         // con margen: el depósito acepta hasta 5 MB
  tipo: 'electro',                       // en la demo no se pregunta el tipo
  deposito: 'imagenes-estudios',
  tiempoMaximoSubidaMs: 60000,
  enlaceSegundos: 10 * 60,               // los enlaces firmados caducan a los 10 minutos
};

// Cada foto: { id, estado: 'preparando' | 'lista', webp (Blob), url (para la
// miniatura), subida (archivo en el depósito), guardada (fila en imagenes) }.
// El id se arma al agregarla y es el nombre del archivo y el id de su fila:
// así un reintento nunca duplica ni archivos ni filas.
let fotos = [];
let fotosBloqueadas = false;   // mientras se guarda, no se agregan ni se quitan

// --- ¿Este celular puede crear WebP? (Chrome de Android sí; el iPhone quizás no) ---

let pruebaWebP = null;
function puedeCrearWebP() {
  if (!pruebaWebP) {
    pruebaWebP = new Promise((responder) => {
      const lienzo = document.createElement('canvas');
      lienzo.width = 1;
      lienzo.height = 1;
      lienzo.toBlob((blob) => responder(!!blob && blob.type === 'image/webp'), 'image/webp', 0.8);
    });
  }
  return pruebaWebP;
}

// --- Pasar a WebP (T026) ------------------------------------------------------------
// Lado largo hasta 3000 px y calidad 85 %. Si igual pesa demasiado, baja la
// calidad y, si hace falta, el tamaño, hasta que entre con margen en 5 MB.
// Se hace en el ayudante (js/fotos-trabajo.js) para no trabar la pantalla; si
// este celular no puede, se hace acá, de la forma de siempre.

class ErrorDeFoto extends Error {
  constructor(motivo) {
    super(motivo);
    this.motivo = motivo;   // 'lectura', 'formato' o 'tamano'
  }
}

let ayudante;              // undefined: sin probar; null: no se puede usar
const pedidosAlAyudante = new Map();

function elAyudante() {
  if (ayudante !== undefined) return ayudante;
  try {
    if (typeof OffscreenCanvas !== 'function' || typeof Worker !== 'function') throw new Error('no');
    ayudante = new Worker('js/fotos-trabajo.js');
    ayudante.addEventListener('message', ({ data }) => {
      const pedido = pedidosAlAyudante.get(data.id);
      if (!pedido) return;
      pedidosAlAyudante.delete(data.id);
      pedido(data);
    });
    ayudante.addEventListener('error', () => {
      // El ayudante no arrancó: lo pendiente se hace acá
      ayudante = null;
      pedidosAlAyudante.forEach((pedido) => pedido({ error: 'sin-webp' }));
      pedidosAlAyudante.clear();
    });
  } catch {
    ayudante = null;
  }
  return ayudante;
}

function convertirConAyudante(blob) {
  const trabajador = elAyudante();
  if (!trabajador) return Promise.resolve({ error: 'sin-webp' });
  const id = crypto.randomUUID();
  return new Promise((responder) => {
    pedidosAlAyudante.set(id, responder);
    trabajador.postMessage({ id, foto: blob, opciones: FOTOS });
  });
}

async function abrirImagen(blob) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(blob, { imageOrientation: 'from-image' });
    } catch { /* se prueba de la otra forma */ }
  }
  const url = URL.createObjectURL(blob);
  try {
    const imagen = new Image();
    imagen.src = url;
    await imagen.decode();
    return imagen;
  } catch {
    throw new ErrorDeFoto('formato');
  } finally {
    URL.revokeObjectURL(url);
  }
}

function lienzoABlob(lienzo, calidad) {
  return new Promise((responder) => lienzo.toBlob(responder, 'image/webp', calidad));
}

// La forma de siempre, en la pantalla (si el ayudante no se puede usar)
async function convertirEnPantalla(blob) {
  const imagen = await abrirImagen(blob);
  const ancho = imagen.width;
  const alto = imagen.height;
  let escala = Math.min(1, FOTOS.ladoMaximoPx / Math.max(ancho, alto));
  let calidad = FOTOS.calidad;
  const lienzo = document.createElement('canvas');
  try {
    for (let intento = 0; intento < 12; intento++) {
      lienzo.width = Math.max(1, Math.round(ancho * escala));
      lienzo.height = Math.max(1, Math.round(alto * escala));
      const pincel = lienzo.getContext('2d');
      pincel.imageSmoothingQuality = 'high';
      pincel.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
      const webp = await lienzoABlob(lienzo, calidad);
      if (!webp || webp.type !== 'image/webp') throw new ErrorDeFoto('formato');
      if (webp.size <= FOTOS.pesoMaximo) return webp;
      if (calidad > FOTOS.calidadMinima + 0.01) calidad -= 0.1;
      else escala *= 0.85;
    }
    throw new ErrorDeFoto('tamano');
  } finally {
    if (typeof imagen.close === 'function') imagen.close();
    lienzo.width = 0;   // libera la memoria del lienzo
    lienzo.height = 0;
  }
}

async function convertirAWebP(blob) {
  const respuesta = await convertirConAyudante(blob);
  if (respuesta.webp) return respuesta.webp;
  if (respuesta.error === 'formato' || respuesta.error === 'tamano') throw new ErrorDeFoto(respuesta.error);
  return convertirEnPantalla(blob);   // 'sin-webp': el ayudante no pudo; se hace acá
}

// --- Leer lo elegido apenas llega ----------------------------------------------------------
// Android da permiso para leer las fotos elegidas solo por un rato: si se leen
// de a una, a medida que se preparan, las últimas pueden no poder leerse. Por
// eso se leen TODAS apenas llegan (y se reintenta una vez) y después se preparan
// de a una desde la memoria del celular.

async function leerArchivo(archivo) {
  for (let intento = 0; intento < 2; intento++) {
    try {
      const datos = await archivo.arrayBuffer();
      if (datos.byteLength === 0) throw new Error('vacío');
      return new Blob([datos], { type: archivo.type });
    } catch {
      if (intento === 0) await new Promise((r) => setTimeout(r, 400));
    }
  }
  throw new ErrorDeFoto('lectura');
}

// --- Agregar y quitar -------------------------------------------------------------------

function cantidadDeFotos() {
  return fotos.length;
}

function hayFotosPreparando() {
  return fotos.some((foto) => foto.estado === 'preparando');
}

// Las que todavía no quedaron guardadas del todo (archivo + fila)
function fotosSinGuardar() {
  return fotos.filter((foto) => !foto.guardada);
}

const plural = (n, uno, varios) => (n === 1 ? uno : varios.replace('#', n));

// Un solo aviso al final, que dice qué pasó con las que no entraron
function avisoDeFotos({ agregadas, noImagenes, sobrantes, lectura, formato }) {
  const problemas = [];
  if (lectura) problemas.push(plural(lectura, '1 no se pudo abrir: probá elegirla de nuevo.', '# no se pudieron abrir: probá elegirlas de nuevo.'));
  if (formato) problemas.push(plural(formato, '1 no se pudo preparar (el formato no es compatible).', '# no se pudieron preparar (el formato no es compatible).'));
  if (noImagenes) problemas.push(plural(noImagenes, 'Solo se pueden adjuntar fotos: 1 archivo no se agregó.', 'Solo se pueden adjuntar fotos: # archivos no se agregaron.'));
  if (sobrantes) problemas.push(`Máximo ${FOTOS.maximo} fotos por estudio: ${plural(sobrantes, '1 no se agregó.', '# no se agregaron.')}`);
  if (problemas.length === 0) return;
  const inicio = agregadas > 0 ? `${plural(agregadas, 'Se agregó 1 foto.', 'Se agregaron # fotos.')} ` : '';
  mostrarAviso(inicio + problemas.join(' '), 'error', 7000);
}

// Devuelve { leidas, preparadas }: dos promesas, para cuando ya se leyó todo lo
// elegido y para cuando ya se preparó todo
async function agregarFotos(archivos) {
  const nada = { leidas: Promise.resolve(), preparadas: Promise.resolve() };
  if (fotosBloqueadas) return nada;
  const lista = [...archivos];
  if (lista.length === 0) return nada;

  if (!(await puedeCrearWebP())) {
    mostrarAviso('Este celular no puede preparar las fotos en el formato que pide el sistema (WebP). Por ahora, adjuntalas desde un celular Android.', 'error', 7000);
    return nada;
  }

  const imagenes = lista.filter((archivo) => archivo.type.startsWith('image/'));
  const nuevas = imagenes.slice(0, Math.max(0, FOTOS.maximo - fotos.length));
  const resumen = { agregadas: 0, noImagenes: lista.length - imagenes.length, sobrantes: imagenes.length - nuevas.length, lectura: 0, formato: 0 };
  if (nuevas.length === 0 && resumen.noImagenes === 0) {
    mostrarAviso(`Ya hay ${FOTOS.maximo} fotos: es el máximo por estudio.`, 'error', 5000);
    return nada;
  }

  const entradas = nuevas.map(() => ({ id: crypto.randomUUID(), estado: 'preparando' }));
  fotos.push(...entradas);
  dibujarMiniaturas();

  // Todas se leen ya, juntas (antes de que Android retire el permiso)
  const lecturas = nuevas.map((archivo) => leerArchivo(archivo).then((blob) => ({ blob }), (error) => ({ error })));

  // Después se preparan de a una, para no ocupar tanta memoria. Si una falla,
  // se descarta solo esa y las demás siguen.
  const preparadas = (async () => {
    for (const [indice, foto] of entradas.entries()) {
      const leida = await lecturas[indice];
      try {
        if (leida.error) throw leida.error;
        const webp = await convertirAWebP(leida.blob);
        if (!fotos.includes(foto)) continue;   // mientras tanto la quitaron o se cerró la sesión
        foto.webp = webp;
        foto.url = URL.createObjectURL(webp);
        foto.estado = 'lista';
        resumen.agregadas++;
      } catch (error) {
        const motivo = error && error.motivo === 'lectura' ? 'lectura' : 'formato';
        if (fotos.includes(foto)) {
          fotos.splice(fotos.indexOf(foto), 1);
          resumen[motivo]++;
        }
        console.error(`No se pudo preparar una foto (${motivo})`);   // sin datos del paciente
      } finally {
        leida.blob = null;   // la original no se guarda: queda solo la WebP
        dibujarMiniaturas();
      }
    }
    avisoDeFotos(resumen);
  })();

  return { leidas: Promise.all(lecturas), preparadas };
}

function quitarFoto(id) {
  if (fotosBloqueadas) return;
  const foto = fotos.find((f) => f.id === id);
  if (!foto) return;
  if (foto.url) URL.revokeObjectURL(foto.url);
  fotos = fotos.filter((f) => f !== foto);
  dibujarMiniaturas();
}

// Todas afuera del celular (al guardar bien, al empezar otro estudio o al cerrar sesión)
function reiniciarFotos() {
  fotos.forEach((foto) => { if (foto.url) URL.revokeObjectURL(foto.url); });
  fotos = [];
  fotosBloqueadas = false;
  dibujarMiniaturas();
}

function bloquearFotos(bloquear) {
  fotosBloqueadas = bloquear;
  dibujarMiniaturas();
}

// --- Miniaturas -------------------------------------------------------------------------

function dibujarMiniaturas() {
  const tira = document.getElementById('miniaturas');
  tira.replaceChildren(...fotos.map((foto, indice) => {
    const miniatura = document.createElement('div');
    miniatura.className = `miniatura${foto.estado === 'preparando' ? ' miniatura--preparando' : ''}`;
    if (foto.url) {
      const imagen = document.createElement('img');
      imagen.src = foto.url;
      imagen.alt = `Foto ${indice + 1}`;
      miniatura.append(imagen);
    } else {
      miniatura.setAttribute('aria-label', `Foto ${indice + 1}: preparando`);
    }
    const quitar = document.createElement('button');
    quitar.type = 'button';
    quitar.className = 'miniatura__quitar';
    quitar.setAttribute('aria-label', `Quitar foto ${indice + 1}`);
    quitar.textContent = '✕';
    quitar.disabled = fotosBloqueadas;
    quitar.addEventListener('click', () => quitarFoto(foto.id));
    miniatura.append(quitar);
    return miniatura;
  }));
  tira.hidden = fotos.length === 0;
  // Con fotos, la planilla suma aire abajo (una o dos filas): la tira no tapa
  // "Confirmar estudio" ni el último campo
  const carga = document.getElementById('carga');
  carga.classList.toggle('hay-fotos', fotos.length > 0);
  carga.classList.toggle('hay-fotos-2-filas', fotos.length > FOTOS.porFila);
}

// --- Subir (T027) y guardar la fila (T028) ------------------------------------------------

function conTiempoMaximo(promesa, ms) {
  let reloj;
  return Promise.race([
    promesa,
    new Promise((_, rechazar) => { reloj = setTimeout(() => rechazar(new Error('tiempo')), ms); }),
  ]).finally(() => clearTimeout(reloj));
}

function rutaDeFoto(estudioId, foto) {
  return `${estudioId}/${foto.id}.webp`;
}

// Sube las que faltan, de a una. Devuelve cuántas no se pudieron subir.
// Lo que ya estaba (archivo o fila de un intento anterior) cuenta como hecho.
async function subirFotos(estudioId) {
  for (const foto of fotosSinGuardar()) {
    if (!navigator.onLine) break;
    const ruta = rutaDeFoto(estudioId, foto);
    try {
      if (!foto.subida) {
        const { error } = await conTiempoMaximo(clienteSupabase.storage.from(FOTOS.deposito)
          .upload(ruta, foto.webp, { contentType: 'image/webp', upsert: false }), FOTOS.tiempoMaximoSubidaMs);
        const yaEstaba = error && (String(error.statusCode) === '409' || error.status === 409 || /exists|duplicate/i.test(error.message || ''));
        if (error && !yaEstaba) throw error;
        foto.subida = true;
      }
      const { error } = await conTiempoMaximo(clienteSupabase.from('imagenes')
        .insert({ id: foto.id, estudio_id: estudioId, ruta_archivo: ruta, tipo: FOTOS.tipo }), FOTOS.tiempoMaximoSubidaMs);
      if (error && error.code !== '23505') throw error;   // 23505: la fila ya estaba
      foto.guardada = true;
    } catch {
      console.error('No se pudo subir una foto');   // sin datos del paciente en el registro
    }
  }
  // Las que ya quedaron guardadas salen del celular; quedan solo las que faltan
  fotos.filter((foto) => foto.guardada).forEach((foto) => { if (foto.url) URL.revokeObjectURL(foto.url); });
  fotos = fotosSinGuardar();
  dibujarMiniaturas();
  return fotos.length;
}

// --- Enlaces firmados que caducan (T029): para el dashboard (Fase 4) ------------------------

async function enlaceFirmado(ruta, segundos = FOTOS.enlaceSegundos) {
  const { data, error } = await clienteSupabase.storage.from(FOTOS.deposito).createSignedUrl(ruta, segundos);
  return error ? null : data.signedUrl;
}

// --- Clip y cámara ---------------------------------------------------------------------------

function prepararFotos() {
  const abrirSelector = (idInput) => () => {
    if (fotosBloqueadas) return;
    if (fotos.length >= FOTOS.maximo) {
      mostrarAviso(`Ya hay ${FOTOS.maximo} fotos: es el máximo por estudio.`, 'error', 5000);
      return;
    }
    document.getElementById(idInput).click();
  };
  document.getElementById('boton-adjuntar').addEventListener('click', abrirSelector('input-fotos'));
  document.getElementById('boton-camara').addEventListener('click', abrirSelector('input-camara'));

  ['input-fotos', 'input-camara'].forEach((id) => {
    const input = document.getElementById(id);
    input.addEventListener('change', async () => {
      const { leidas } = await agregarFotos(input.files);
      await leidas;
      input.value = '';   // recién cuando ya se leyó todo: así se puede volver a elegir la misma foto
    });
  });
}

prepararFotos();
