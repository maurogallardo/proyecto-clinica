// Grabación de voz (T015): copia de la grabación "estilo WhatsApp" de LoMar
// (lomar-smart-pwa/js/app.js, sección "Grabación de audio estilo WhatsApp").
//
//   - Mantener apretado el micrófono: graba (cronómetro, onda y vibración).
//   - Soltar: vista previa para escuchar, descartar o enviar.
//   - Deslizar a la izquierda: cancela.  Deslizar hacia arriba: traba con candado.
//
// Todavía NO transcribe: "Enviar" avisa y deja el audio en la vista previa.
// La transcripción se conecta en la T016, en la función enviarAudio() (al final).

// Tope de una grabación. Al llegar, se detiene sola y pasa a la vista previa.
const GRABACION = {
  maximoMs: 5 * 60 * 1000,   // 5 minutos
};

const UMBRAL_CANCELAR_PX = 80;   // cuánto deslizar a la izquierda para cancelar
const UMBRAL_TRABAR_PX = 60;     // cuánto deslizar hacia arriba para trabar

// Resguardos para que la grabación nunca quede colgada (ver T015 en tasks.md)
const PEDAZO_AUDIO_MS = 1000;             // el audio se guarda en memoria de a 1 segundo
const ESPERA_DETENER_MS = 3000;           // si el grabador no confirma que paró, se sigue igual
const MICROFONO_SILENCIADO_MS = 2000;     // micrófono silenciado por el sistema más de esto: se detiene

// Formatos de audio, en orden de preferencia (los mismos de LoMar). El iPhone usa audio/mp4.
const FORMATOS_AUDIO = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg', 'audio/mp4'];

// Estados: 'reposo' | 'grabando' | 'trabado' | 'vista-previa' | 'enviando'
let estadoGrabacion = 'reposo';
let grabador = null;              // MediaRecorder
let pedazosAudio = [];
let flujoMicrofono = null;        // lo que entrega el micrófono (MediaStream)
let contextoAudio = null;
let analizador = null;            // mide el volumen para la onda
let trabado = false;
let accionPendiente = null;       // si se suelta o cancela antes de que arranque: 'cancelar' | 'detenerSinVista'
let esperandoMicrofono = false;   // se pidió el micrófono y todavía no arrancó
let grabacionAbierta = false;     // hay una grabación sin terminar (se cierra una sola vez)
let relojDetener = null;
let relojSilenciado = null;
let microfonoInterrumpido = false;
let descartarAlDetener = false;
let enviarAlDetener = false;
let topeAlcanzado = false;

let cronometro = null;
let inicioTramoMs = 0;
let acumuladoMs = 0;              // tiempo grabado antes de la última pausa

let audioVistaPrevia = null;      // el audio grabado (Blob)
let urlVistaPrevia = null;

// --- Ayudantes -----------------------------------------------------------------

// Vibración con el resguardo de LoMar: el iPhone no tiene vibración y no se rompe nada
function vibrar(patron) {
  try {
    if (typeof navigator.vibrate === 'function') navigator.vibrate(patron);
  } catch { /* sin vibración, no pasa nada */ }
}

function formatearTiempo(ms) {
  const segundos = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(segundos / 60)).padStart(2, '0');
  const ss = String(segundos % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

// "5 minutos", "1 minuto" o, si es menos de un minuto, "30 segundos"
function describirDuracion(ms) {
  const minutos = Math.round(ms / 60000);
  if (minutos >= 1) return `${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}`;
  return `${Math.round(ms / 1000)} segundos`;
}

function mostrarTiempo(ms) {
  document.getElementById('tiempo-grabacion').textContent = formatearTiempo(ms);
}

// Los íconos son dibujos SVG, y en un SVG ".hidden = ..." no hace nada:
// hay que poner o sacar el atributo "hidden" directamente.
function mostrarIcono(id, ver) {
  document.getElementById(id).toggleAttribute('hidden', !ver);
}

function mostrarIconoPausa(verPausa) {
  mostrarIcono('icono-pausar', verPausa);
  mostrarIcono('icono-seguir', !verPausa);
}

function mostrarIconoEscuchar(verEscuchar) {
  mostrarIcono('icono-escuchar', verEscuchar);
  mostrarIcono('icono-pausar-escucha', !verEscuchar);
}

// --- Estados de la barra (como setRecorderState de LoMar) ----------------------

function cambiarEstado(estado) {
  estadoGrabacion = estado;
  const barra = document.getElementById('barra-voz');
  const botonMicrofono = document.getElementById('microfono');
  const enVistaPrevia = estado === 'vista-previa' || estado === 'enviando';

  // Grabando o trabado: se esconden el clip y la cámara (le dejan el ancho a la onda)
  barra.classList.toggle('esta-grabando', estado === 'grabando' || estado === 'trabado');
  barra.classList.toggle('esta-ocupada', enVistaPrevia);

  botonMicrofono.hidden = estado !== 'reposo' && estado !== 'grabando';
  botonMicrofono.classList.toggle('esta-grabando', estado === 'grabando');
  if (estado === 'reposo') botonMicrofono.style.transform = '';

  document.getElementById('guia-candado').classList.toggle('esta-visible', estado === 'grabando');
  document.getElementById('pista-cancelar').hidden = estado !== 'grabando';
  document.getElementById('tiempo-grabacion').hidden = estado === 'reposo';
  document.getElementById('controles-trabado').hidden = estado !== 'trabado';
  document.getElementById('boton-descartar-grabacion').hidden = estado !== 'trabado';
  document.getElementById('controles-vista-previa').hidden = !enVistaPrevia;
  if (estado === 'grabando') mostrarIconoPausa(true);   // cada grabación arranca con "pausar"

  // Enviando: la barra queda ocupada, sin poder tocar sus botones
  barra.setAttribute('aria-busy', String(estado === 'enviando'));
  document.querySelectorAll('#controles-vista-previa button').forEach((boton) => {
    boton.disabled = estado === 'enviando';
  });

  ajustarLienzo(lienzoOnda());
  if (estado === 'reposo') dibujarOndaReposo();
}

// --- Micrófono y analizador ----------------------------------------------------------

function soltarMicrofono() {
  if (flujoMicrofono) {
    flujoMicrofono.getTracks().forEach((pista) => pista.stop());
    flujoMicrofono = null;
  }
}

function prepararAnalizador(flujo) {
  try {
    const ContextoAudio = window.AudioContext || window.webkitAudioContext;
    contextoAudio = new ContextoAudio();
    const fuente = contextoAudio.createMediaStreamSource(flujo);
    analizador = contextoAudio.createAnalyser();
    analizador.fftSize = 256;
    fuente.connect(analizador);
    despertarAudio();
  } catch (error) {
    console.error('No se pudo iniciar el analizador de audio', error);
    analizador = null;
  }
}

// Algunos celulares crean el medidor de volumen "dormido" (la onda queda plana):
// se lo despierta al arrancar y con cualquier toque. El audio grabado no depende de esto.
function despertarAudio() {
  if (contextoAudio && contextoAudio.state !== 'running' && contextoAudio.state !== 'closed') {
    contextoAudio.resume().catch(() => {});
  }
}
document.addEventListener('pointerup', despertarAudio, true);

function cerrarAnalizador() {
  if (contextoAudio) {
    contextoAudio.close().catch(() => {});
    contextoAudio = null;
  }
  analizador = null;
}

// --- Cronómetro (y control del tope) ------------------------------------------------

function iniciarCronometro() {
  acumuladoMs = 0;
  reanudarCronometro();
}

function reanudarCronometro() {
  inicioTramoMs = performance.now();
  clearInterval(cronometro);
  cronometro = setInterval(controlarTiempo, 100);
  controlarTiempo();
}

function pausarCronometro() {
  if (!cronometro) return;
  clearInterval(cronometro);
  cronometro = null;
  acumuladoMs += performance.now() - inicioTramoMs;
}

function detenerCronometro() {
  clearInterval(cronometro);
  cronometro = null;
}

// Tiempo grabado de verdad (sin contar las pausas)
function tiempoGrabadoMs() {
  return acumuladoMs + (cronometro ? performance.now() - inicioTramoMs : 0);
}

function controlarTiempo() {
  const ms = tiempoGrabadoMs();
  mostrarTiempo(Math.min(ms, GRABACION.maximoMs));
  if (ms >= GRABACION.maximoMs) detenerPorTope();
}

// Llegó al tope: se detiene sola y pasa a la vista previa (el aviso sale al detenerse)
function detenerPorTope() {
  if (topeAlcanzado) return;
  topeAlcanzado = true;
  detenerCronometro();
  detenerGrabacion();
}

// --- "Deslizá para cancelar": vibra una vez al acercarse al umbral ------------------

let yaVibroCercaDeCancelar = false;

function reiniciarPistaCancelar() {
  yaVibroCercaDeCancelar = false;
  document.getElementById('pista-cancelar').classList.remove('esta-cerca');
}

function actualizarPistaCancelar(distanciaPx) {
  const cerca = distanciaPx > UMBRAL_CANCELAR_PX * 0.6;
  document.getElementById('pista-cancelar').classList.toggle('esta-cerca', cerca);
  if (cerca && !yaVibroCercaDeCancelar) {
    vibrar(45);
    yaVibroCercaDeCancelar = true;
  } else if (!cerca) {
    yaVibroCercaDeCancelar = false;
  }
}

// --- Grabar ------------------------------------------------------------------------------

function iniciarGrabacion() {
  // Sin micrófono disponible (por ejemplo, un navegador viejo): se avisa
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
    accionPendiente = null;
    mostrarAviso('No se pudo acceder al micrófono', 'error');
    return;
  }

  esperandoMicrofono = true;
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then((flujo) => {
      esperandoMicrofono = false;
      // Mientras el micrófono arrancaba, se soltó, se canceló, la app pasó a segundo
      // plano o se cerró la sesión: no hay nada que grabar
      if (accionPendiente) {
        accionPendiente = null;
        flujo.getTracks().forEach((pista) => pista.stop());
        cambiarEstado('reposo');
        return;
      }
      flujoMicrofono = flujo;
      reiniciarOnda();
      const formato = FORMATOS_AUDIO.find((tipo) => MediaRecorder.isTypeSupported(tipo)) || 'audio/ogg';
      const este = new MediaRecorder(flujo, { mimeType: formato });
      const pedazos = [];
      grabador = este;
      pedazosAudio = pedazos;
      grabacionAbierta = true;
      microfonoInterrumpido = false;

      este.addEventListener('dataavailable', (evento) => {
        if (evento.data && evento.data.size > 0) pedazos.push(evento.data);
      });
      // Cada aviso cuenta solo si viene de la grabación actual (no de una anterior)
      este.addEventListener('stop', () => { if (grabador === este) alTerminarGrabacion(formato); });
      este.addEventListener('error', () => { if (grabador === este) interrumpirPorMicrofono(); });
      vigilarMicrofono(flujo, este);

      prepararAnalizador(flujo);
      // De a pedazos de 1 segundo: si algo falla de golpe, queda lo grabado hasta ahí
      este.start(PEDAZO_AUDIO_MS);
      vibrar(35);   // vibra al empezar a grabar
      cambiarEstado('grabando');
      iniciarCronometro();
      iniciarBucleOnda(analizador);
    })
    .catch((error) => {
      esperandoMicrofono = false;
      console.error(error);
      soltarMicrofono();   // por si el error fue después de abrir el micrófono
      accionPendiente = null;
      cambiarEstado('reposo');
      let mensaje;
      if (error.name === 'NotAllowedError') {
        mensaje = 'No se pudo acceder al micrófono, revisá los permisos';
      } else if (error.name === 'NotReadableError' || error.name === 'AbortError') {
        mensaje = 'El micrófono está siendo usado por otra app. Cerrala e intentá de nuevo.';
      } else {
        mensaje = 'No se pudo acceder al micrófono';
      }
      mostrarAviso(mensaje, 'error');
    });
}

// Cuando el grabador se detiene (por soltar, enviar, cancelar o el tope)
// (o por el resguardo de los 3 segundos). Corre una sola vez por grabación.
function alTerminarGrabacion(formato) {
  if (!grabacionAbierta) return;
  grabacionAbierta = false;
  clearTimeout(relojDetener);
  clearTimeout(relojSilenciado);
  detenerBucleOnda();
  cerrarAnalizador();
  detenerCronometro();
  soltarMicrofono();

  const interrumpido = microfonoInterrumpido;
  const porTope = topeAlcanzado;
  microfonoInterrumpido = false;
  topeAlcanzado = false;

  if (descartarAlDetener || pedazosAudio.length === 0) {
    descartarAlDetener = false;
    enviarAlDetener = false;
    pedazosAudio = [];
    trabado = false;
    cambiarEstado('reposo');
    if (interrumpido) mostrarAviso('Se interrumpió el micrófono y no llegó a grabarse nada. Probá de nuevo.', 'error', 6000);
    return;
  }

  const audio = new Blob(pedazosAudio, { type: grabador.mimeType || formato });
  pedazosAudio = [];
  trabado = false;
  mostrarVistaPrevia(audio);

  if (interrumpido) {
    mostrarAviso('Se interrumpió el micrófono: la grabación se detuvo. Escuchala o enviala.', 'error', 6000);
  } else if (porTope) {
    mostrarAviso(`Llegaste al máximo de ${describirDuracion(GRABACION.maximoMs)}: la grabación se detuvo sola. Escuchala o enviala.`, 'info', 5000);
  }
  if (enviarAlDetener) {
    enviarAlDetener = false;
    enviarAudio(audio);
  }
}

// Detener sin guardar nada (cancelar o descartar)
function finalizarSinVistaPrevia() {
  descartarAlDetener = true;
  if (grabacionAbierta) {
    detenerGrabacion();
  } else {
    descartarAlDetener = false;
    cambiarEstado('reposo');
  }
}

// Pide al grabador que pare. Si no confirma en 3 segundos (falla del celular),
// se cierra igual con los pedazos que ya había: la barra nunca queda colgada.
function detenerGrabacion() {
  if (!grabacionAbierta) return;
  const formato = grabador.mimeType;
  try {
    if (grabador.state !== 'inactive') grabador.stop();
  } catch { /* ya estaba detenido */ }
  clearTimeout(relojDetener);
  relojDetener = setTimeout(() => alTerminarGrabacion(formato), ESPERA_DETENER_MS);
}

// El sistema cortó el micrófono o el grabador falló: se detiene con lo grabado
function interrumpirPorMicrofono() {
  if (!grabacionAbierta || descartarAlDetener) return;
  microfonoInterrumpido = true;
  detenerGrabacion();
}

// Si Android corta el micrófono (lo toma otra app, una llamada, el asistente) o lo
// silencia más de 2 segundos, la grabación no sigue "grabando silencio"
function vigilarMicrofono(flujo, este) {
  flujo.getAudioTracks().forEach((pista) => {
    pista.addEventListener('ended', () => { if (grabador === este) interrumpirPorMicrofono(); });
    pista.addEventListener('mute', () => {
      clearTimeout(relojSilenciado);
      relojSilenciado = setTimeout(() => { if (grabador === este) interrumpirPorMicrofono(); }, MICROFONO_SILENCIADO_MS);
    });
    pista.addEventListener('unmute', () => clearTimeout(relojSilenciado));
  });
}

function cancelar() {
  if (grabacionAbierta) finalizarSinVistaPrevia();
  else accionPendiente = 'cancelar';
}

function trabar() {
  if (trabado || !grabacionAbierta) return;
  trabado = true;
  vibrar(45);   // vibra al trabar con el candado
  const circulo = document.getElementById('guia-candado-circulo');
  circulo.classList.add('esta-trabando');
  setTimeout(() => {
    circulo.classList.remove('esta-trabando');
    if (estadoGrabacion === 'grabando') cambiarEstado('trabado');
  }, 250);
}

// --- Gestos sobre el micrófono (como bindMicFab de LoMar) --------------------------------

function prepararMicrofono() {
  const botonMicrofono = document.getElementById('microfono');
  let punteroActivo = null;
  let inicioX = 0;
  let inicioY = 0;

  botonMicrofono.addEventListener('pointerdown', (evento) => {
    // Un toque nuevo mientras graba quiere decir que el que empezó ya no está (el
    // sistema se quedó con él sin avisar): frena y pasa a la vista previa con lo grabado
    if (estadoGrabacion === 'grabando') {
      punteroActivo = null;
      botonMicrofono.style.transform = '';
      detenerGrabacion();
      return;
    }
    if (estadoGrabacion !== 'reposo' || esperandoMicrofono) return;
    trabado = false;
    accionPendiente = null;
    inicioX = evento.clientX;
    inicioY = evento.clientY;
    punteroActivo = evento.pointerId;
    botonMicrofono.setPointerCapture(evento.pointerId);
    reiniciarPistaCancelar();
    iniciarGrabacion();
  });

  botonMicrofono.addEventListener('pointermove', (evento) => {
    // Trabado o ya en vista previa (por el tope): el dedo ya no manda
    if (evento.pointerId !== punteroActivo || trabado || estadoGrabacion === 'vista-previa') return;
    const deltaX = evento.clientX - inicioX;
    const deltaY = inicioY - evento.clientY;

    const arrastreX = Math.max(Math.min(deltaX, 0), -UMBRAL_CANCELAR_PX);
    // Se mantiene el "crecer" del estado grabando: este transform pisa al del CSS
    botonMicrofono.style.transform = `translateX(${arrastreX}px) scale(1.15)`;
    actualizarPistaCancelar(-arrastreX);

    if (deltaX < -UMBRAL_CANCELAR_PX) {
      punteroActivo = null;
      botonMicrofono.style.transform = '';
      vibrar(20);
      cancelar();
      return;
    }
    if (deltaY > UMBRAL_TRABAR_PX) trabar();
  });

  const alSoltar = (evento) => {
    if (evento.pointerId !== punteroActivo) return;
    punteroActivo = null;
    botonMicrofono.style.transform = '';
    // Trabado: sigue grabando. En vista previa (llegó al tope): no hay nada que detener.
    if (trabado || estadoGrabacion === 'vista-previa') return;
    if (grabacionAbierta) detenerGrabacion();
    else accionPendiente = 'detenerSinVista';
  };

  // El sistema canceló o se quedó con el toque (gesto de Android, notificación...):
  // no se sabe si la persona terminó de hablar, así que se traba con el candado.
  // Sigue grabando y aparecen Pausar, Enviar y Descartar: no se pierde nada.
  const alPerderElToque = (evento) => {
    if (evento.pointerId !== punteroActivo) return;   // ya se había soltado normalmente
    punteroActivo = null;
    botonMicrofono.style.transform = '';
    if (trabado || estadoGrabacion === 'vista-previa') return;
    if (grabacionAbierta) trabar();
    else accionPendiente = 'detenerSinVista';   // todavía no había arrancado: no hay nada grabado
  };

  botonMicrofono.addEventListener('pointerup', alSoltar);
  botonMicrofono.addEventListener('pointercancel', alPerderElToque);
  botonMicrofono.addEventListener('lostpointercapture', alPerderElToque);
}

// Si la app pasa a segundo plano (inicio, pantalla apagada, abrir una notificación),
// se detiene con lo grabado y pasa a la vista previa: el micrófono no queda abierto de fondo
function prepararSegundoPlano() {
  const alIrseDePantalla = () => {
    document.getElementById('audio-vista-previa').pause();
    if (esperandoMicrofono) accionPendiente = 'cancelar';
    if (grabacionAbierta && !descartarAlDetener) detenerGrabacion();
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden) alIrseDePantalla(); });
  window.addEventListener('pagehide', alIrseDePantalla);
}

// --- Controles con candado: pausar / seguir, enviar, descartar ---------------------------

function prepararControlesTrabado() {
  document.getElementById('boton-pausar').addEventListener('click', () => {
    if (!grabador || !grabacionAbierta) return;
    if (grabador.state === 'recording') {
      grabador.pause();
      pausarCronometro();
      pausarBucleOnda();
      mostrarIconoPausa(false);
    } else if (grabador.state === 'paused') {
      grabador.resume();
      reanudarCronometro();
      reanudarBucleOnda();
      mostrarIconoPausa(true);
    }
  });

  // Enviar: detiene la grabación, pasa a la vista previa y "envía" (por ahora, avisa)
  document.getElementById('boton-enviar-grabacion').addEventListener('click', () => {
    enviarAlDetener = true;
    detenerGrabacion();
  });

  document.getElementById('boton-descartar-grabacion').addEventListener('click', finalizarSinVistaPrevia);
}

// --- Vista previa: escuchar, descartar, enviar --------------------------------------------

function mostrarVistaPrevia(audio) {
  audioVistaPrevia = audio;
  urlVistaPrevia = URL.createObjectURL(audio);
  document.getElementById('audio-vista-previa').src = urlVistaPrevia;
  mostrarIconoEscuchar(true);
  mostrarTiempo(0);
  document.getElementById('boton-enviar-audio').disabled = false;
  // Primero se acomoda la barra y después se mide la onda (así usa el ancho final)
  cambiarEstado('vista-previa');
  prepararOndaVistaPrevia();
  ondaDesdeElAudio(audio);
}

function cerrarVistaPrevia() {
  const reproductor = document.getElementById('audio-vista-previa');
  reproductor.pause();
  reproductor.removeAttribute('src');
  reproductor.load();
  if (urlVistaPrevia) {
    URL.revokeObjectURL(urlVistaPrevia);
    urlVistaPrevia = null;
  }
  audioVistaPrevia = null;
  nivelesVistaPrevia = [];
  olvidarTranscripcionPendiente();
  cambiarEstado('reposo');
}

function prepararControlesVistaPrevia() {
  const reproductor = document.getElementById('audio-vista-previa');

  document.getElementById('boton-escuchar').addEventListener('click', () => {
    if (!audioVistaPrevia) return;
    if (reproductor.paused) reproductor.play();
    else reproductor.pause();
  });

  reproductor.addEventListener('play', () => mostrarIconoEscuchar(false));
  reproductor.addEventListener('pause', () => mostrarIconoEscuchar(true));
  reproductor.addEventListener('ended', () => {
    mostrarIconoEscuchar(true);
    mostrarTiempo(0);
    dibujarOndaVistaPrevia(0);
  });
  reproductor.addEventListener('timeupdate', () => {
    mostrarTiempo(reproductor.currentTime * 1000);
    if (!Number.isFinite(reproductor.duration) || reproductor.duration === 0) return;
    dibujarOndaVistaPrevia(reproductor.currentTime / reproductor.duration);
  });
  reproductor.addEventListener('loadedmetadata', () => {
    // Falla conocida de los navegadores con audio webm: la duración llega como
    // "infinito". Se fuerza a calcularla (igual que en LoMar).
    if (!Number.isFinite(reproductor.duration)) {
      reproductor.currentTime = 1e101;
      const alConocerDuracion = () => {
        reproductor.removeEventListener('durationchange', alConocerDuracion);
        reproductor.currentTime = 0;
      };
      reproductor.addEventListener('durationchange', alConocerDuracion);
    }
  });

  document.getElementById('boton-descartar-audio').addEventListener('click', cerrarVistaPrevia);
  document.getElementById('boton-enviar-audio').addEventListener('click', () => {
    if (audioVistaPrevia) enviarAudio(audioVistaPrevia);
  });
}

// --- Enviar: el dictado llena la planilla (T016 y T017, en js/dictado.js) -------------------

// Mientras procesa, la barra queda ocupada (no se puede grabar ni tocar sus botones).
// Si sale bien, el audio se borra del celular (los datos ya están en la planilla).
// Si falla, vuelve a la vista previa con el audio, para reintentar.
async function enviarAudio(audio) {
  document.getElementById('audio-vista-previa').pause();
  cambiarEstado('enviando');
  const salioBien = await procesarDictado(audio);
  if (estadoGrabacion !== 'enviando') return;   // mientras tanto se cerró la sesión
  if (salioBien) cerrarVistaPrevia();
  else cambiarEstado('vista-previa');
}

// --- Refuerzo: en la barra y en la guía del candado, el apretón largo no abre ---
// --- ningún menú ni empieza a seleccionar texto (el CSS ya lo impide)          ---

function bloquearMenusDelApretonLargo() {
  ['barra-voz', 'guia-candado'].forEach((id) => {
    const zona = document.getElementById(id);
    zona.addEventListener('contextmenu', (evento) => evento.preventDefault());
    zona.addEventListener('selectstart', (evento) => evento.preventDefault());
  });
}

// --- Volver a empezar (al cerrar sesión: no queda ningún audio guardado) --------------------

function reiniciarGrabacion() {
  accionPendiente = esperandoMicrofono ? 'cancelar' : null;
  trabado = false;
  enviarAlDetener = false;
  topeAlcanzado = false;
  microfonoInterrumpido = false;
  clearTimeout(relojDetener);
  clearTimeout(relojSilenciado);
  if (grabador && grabador.state !== 'inactive') {
    try { grabador.stop(); } catch { /* ya estaba detenido */ }
  }
  // Lo que avise después este grabador se ignora: no queda ningún audio
  grabacionAbierta = false;
  grabador = null;
  pedazosAudio = [];
  descartarAlDetener = false;
  soltarMicrofono();
  detenerBucleOnda();
  cerrarAnalizador();
  detenerCronometro();
  reiniciarOnda();
  cerrarVistaPrevia();
}

// --- Arranque ------------------------------------------------------------------------------

prepararMicrofono();
prepararControlesTrabado();
prepararControlesVistaPrevia();
prepararSegundoPlano();
bloquearMenusDelApretonLargo();
cambiarEstado('reposo');

// La onda en reposo se redibuja cuando la barra aparece o cambia de ancho
document.addEventListener('pantallamostrada', (evento) => {
  if (evento.detail.id === 'carga' && estadoGrabacion === 'reposo') dibujarOndaReposo();
});
window.addEventListener('resize', () => {
  if (estadoGrabacion === 'reposo') dibujarOndaReposo();
});
document.addEventListener('temacambiado', () => {
  if (estadoGrabacion === 'reposo') dibujarOndaReposo();
});
