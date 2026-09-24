// Dictado (T016 a T020): el audio grabado llena la planilla.
//   1) "transcribir": el audio se convierte en texto (función de Supabase).
//   2) "estructurar": el texto + la planilla como está en pantalla -> lo dictado en
//      esta grabación, ubicado en la planilla (función de Supabase).
//   3) Se suma a lo que ya estaba: se escriben en pantalla solo los campos que el
//      dictado cambió (un vacío nunca borra nada).
// La transcripción NO se muestra en ningún lado. Si falla solo el paso 2, el
// texto queda en la memoria del celular y el reintento hace solo ese paso.

const TIEMPO_MAXIMO_MS = { transcribir: 90000, estructurar: 60000 };

const MENSAJES_DE_ERROR = {
  conexion: 'Sin conexión. El audio quedó guardado: probá enviarlo de nuevo.',
  tiempo: 'Tardó demasiado. El audio quedó guardado: probá enviarlo de nuevo.',
  sesion: 'Tu sesión venció. Volvé a ingresar.',
  'no-se-entendio': 'No se entendió el audio. Probá grabarlo de nuevo.',
  general: 'No se pudo completar la planilla. El audio quedó guardado: probá de nuevo.',
};

// Transcripción ya hecha de un audio, por si falló solo el paso de ordenar
let transcripcionPendiente = null;   // { audio, texto }

class ErrorDelDictado extends Error {
  constructor(tipo) {
    super(tipo);
    this.tipo = tipo;
  }
}

// Llama a una función de Supabase con la sesión del usuario (sin sesión, no se puede)
async function llamarFuncion(nombre, cuerpo) {
  const sesion = await Sesion.actual();
  if (!sesion) throw new ErrorDelDictado('sesion');

  const esFormulario = cuerpo instanceof FormData;
  const cortar = new AbortController();
  const reloj = setTimeout(() => cortar.abort(), TIEMPO_MAXIMO_MS[nombre]);
  let respuesta;
  try {
    respuesta = await fetch(`${SUPABASE_URL}/functions/v1/${nombre}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${sesion.access_token}`,
        apikey: SUPABASE_CLAVE_PUBLICA,
        ...(esFormulario ? {} : { 'Content-Type': 'application/json' }),
      },
      body: esFormulario ? cuerpo : JSON.stringify(cuerpo),
      signal: cortar.signal,
    });
  } catch {
    throw new ErrorDelDictado(cortar.signal.aborted ? 'tiempo' : 'conexion');
  } finally {
    clearTimeout(reloj);
  }
  if (respuesta.status === 401) throw new ErrorDelDictado('sesion');
  if (!respuesta.ok) throw new ErrorDelDictado('general');
  return respuesta.json();
}

async function transcribirAudio(audio) {
  const formulario = new FormData();
  formulario.append('audio', audio, 'dictado');
  const { texto } = await llamarFuncion('transcribir', formulario);
  return (texto || '').trim();
}

// Paso 2 y 3: ordena el texto en la planilla y escribe lo que cambió.
// (También lo usan las pruebas, con textos de ejemplo.)
async function completarPlanillaConTexto(texto) {
  const contenedor = document.getElementById('carga-formulario');
  const foto = tomarFotoPlanilla(contenedor);
  const antes = leerPlanilla(contenedor);

  const planillaNueva = await llamarFuncion('estructurar', {
    planilla: PLANILLA_ERGOMETRICO.id,
    texto,
    campos: camposDePlanilla(PLANILLA_ERGOMETRICO),
    actual: antes,
  });
  return aplicarDictado(foto, antes, planillaNueva);
}

// Escribe en pantalla solo lo que el dictado cambió. Reglas que asegura el código:
//   - un valor vacío (null) nunca borra lo que ya había;
//   - solo se tocan los campos cuyo valor cambió respecto de la "foto" (si mientras
//     tanto se escribió algo a mano en otro campo, no se pisa);
//   - las etapas van a la tarjeta que tenía ese número de fila en la foto (nunca se
//     crean filas; si la tarjeta ya no está, se ignora).
// Devuelve false si la planilla ya no está (por ejemplo, se cerró la sesión).
function aplicarDictado(foto, antes, nueva) {
  const primerCampo = Object.values(foto.estudio)[0];
  if (!primerCampo || !primerCampo.isConnected) return false;

  const cambio = (valor, anterior) => valor !== null && valor !== undefined && String(valor) !== String(anterior ?? '');

  Object.entries(nueva.estudio || {}).forEach(([columna, valor]) => {
    const control = foto.estudio[columna];
    if (control && control.isConnected && cambio(valor, antes.estudio[columna])) escribirValor(control, valor);
  });

  (nueva.etapas || []).forEach((etapa) => {
    const controles = foto.etapas[etapa.fila];
    if (!controles) return;
    Object.entries(etapa).forEach(([columna, valor]) => {
      if (columna === 'fila') return;
      const control = controles[columna];
      if (control && control.isConnected && cambio(valor, antes.etapas[etapa.fila][columna])) escribirValor(control, valor);
    });
  });
  return true;
}

// Todo el camino: audio -> texto -> planilla. Devuelve true si salió bien.
async function procesarDictado(audio) {
  if (!navigator.onLine) {
    mostrarAviso(MENSAJES_DE_ERROR.conexion, 'error', 5000);
    return false;
  }
  try {
    let texto = transcripcionPendiente && transcripcionPendiente.audio === audio ? transcripcionPendiente.texto : null;
    if (texto === null) {
      mostrarAviso('Subiendo audio…', 'info', 120000);
      texto = await transcribirAudio(audio);
      if (!texto) throw new ErrorDelDictado('no-se-entendio');
      transcripcionPendiente = { audio, texto };
    }

    mostrarAviso('Completando planilla…', 'info', 120000);
    const aplicado = await completarPlanillaConTexto(texto);
    transcripcionPendiente = null;
    if (!aplicado) return false;   // la planilla ya no está (se cerró la sesión): no se avisa nada
    mostrarAviso('Planilla actualizada, revisá los campos', 'exito', 4000);
    return true;
  } catch (error) {
    const tipo = error instanceof ErrorDelDictado ? error.tipo : 'general';
    mostrarAviso(MENSAJES_DE_ERROR[tipo] || MENSAJES_DE_ERROR.general, 'error', 6000);
    return false;
  }
}

// Si se descarta el audio (o se cierra la sesión), se olvida su transcripción
function olvidarTranscripcionPendiente() {
  transcripcionPendiente = null;
}
