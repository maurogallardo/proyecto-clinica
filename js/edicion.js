// Editar un estudio desde el dashboard (T061). La ficha pasa a la MISMA planilla del
// celular (js/formulario.js + js/planillas/ergometrico.js) con los datos del
// estudio, solo con teclado: sin micrófono, sin grabación y sin fotos. Se pueden
// cambiar los datos y las etapas (cambiar, agregar y quitar); el número no.
// Valen los mismos criterios que en la carga: decimales con coma en pantalla,
// mayúscula inicial en los textos libres, DNI y nombre obligatorios, y números
// bien escritos.
//
// Se guarda SOLO con la función de la base editar_estudio (supabase/edicion.sql):
// todo o nada, y antes guarda en el historial cómo estaba. Para detectar que otra
// persona u otra pestaña lo cambió mientras tanto, se le devuelve el modificado_en
// que tenía la ficha al abrir, TAL CUAL vino del servidor (texto: si se pasara por
// Date de JavaScript perdería los microsegundos y nunca coincidiría).
//
// Los botones ("Cancelar" y "Guardar cambios") y el ir y venir con la ficha los
// maneja js/ficha.js.

const EDICION = { tiempoMaximoMs: 20000, prefijo: 'edicion-' };

const Edicion = (() => {
  const el = {
    zona: document.getElementById('ficha-edicion'),
    formulario: document.getElementById('ficha-edicion-formulario'),
  };
  let estudio = null;   // como vino del servidor (con modificado_en como texto)
  let inicial = null;   // lo que mostraba la planilla al abrir: para saber si hubo cambios
  let vuelta = 0;       // cambia al cerrar: una respuesta tardía ya no hace nada

  const datos = () => datosParaGuardarDe(el.formulario);
  const esSinConexion = (error) => !navigator.onLine || /fetch|network|abort|sin conexión/i.test(String(error && error.message));

  function abrir(datosDelEstudio) {
    vuelta++;
    estudio = datosDelEstudio;
    el.zona.hidden = false;
    dibujarPlanilla(PLANILLA_ERGOMETRICO, el.formulario, {
      prefijo: EDICION.prefijo,
      valores: { estudio: datosDelEstudio, etapas: datosDelEstudio.etapas || [] },
    });
    inicial = JSON.stringify(datos());
  }

  const hayCambios = () => Boolean(estudio) && JSON.stringify(datos()) !== inicial;

  // El primer campo, para dejarle el cursor al entrar
  const primerCampo = () => el.formulario.querySelector('[data-columna]');

  // Errores en criollo, sin detalles técnicos (y sin datos del paciente)
  function mensajeDeError(error) {
    const mensaje = String((error && error.message) || '');
    if (esSinConexion(error)) return 'Sin conexión o el servidor tardó demasiado. Los cambios siguen en pantalla: probá de nuevo.';
    if (/No se encontró el estudio/i.test(mensaje)) return 'No se encontró el estudio (puede que no sea tuyo o que ya no exista).';
    if (/Papelera/i.test(mensaje)) return 'Este estudio está en la Papelera: no se puede editar.';
    if (/iniciar sesión|jwt/i.test(mensaje)) return 'Tu sesión se cerró. Volvé a iniciar sesión y probá de nuevo.';
    return 'No se pudieron guardar los cambios. Probá de nuevo.';
  }

  // Guardar. Devuelve qué pasó, para que la ficha sepa a dónde ir:
  //   'guardado'     -> se guardó
  //   'sin-cambios'  -> no había nada que guardar
  //   'recargar'     -> edición cruzada y se eligió cargar la versión nueva
  //   null           -> se queda editando (canceló el cartel, faltan datos o hubo un error)
  // alEmpezar() se llama justo antes de mandar a la base (para deshabilitar los botones).
  async function guardar({ alEmpezar = () => {} } = {}) {
    if (!estudio) return null;
    if (!hayCambios()) {
      mostrarAviso('No hay cambios para guardar');
      return 'sin-cambios';
    }
    ponerMayusculaInicialEn(el.formulario, PLANILLA_ERGOMETRICO);   // se ve antes del cartel
    const nuevos = datos();
    if (faltanDatosMinimos(nuevos.estudio, el.formulario) || hayNumeroMalEscrito(el.formulario)) return null;
    const esta = vuelta;
    const si = await preguntar({
      titulo: '¿Guardar los cambios?',
      texto: `Se van a guardar los cambios del estudio N° ${estudio.numero}. Queda registrado cómo estaba antes.`,
      textoConfirmar: 'Guardar cambios',
    });
    if (!si || esta !== vuelta) return null;

    alEmpezar();
    let respuesta = null;
    let falla = null;
    try {
      if (!navigator.onLine) throw new Error('sin conexión');
      const cortar = new AbortController();
      const reloj = setTimeout(() => cortar.abort(), EDICION.tiempoMaximoMs);
      const { data, error } = await clienteSupabase.rpc('editar_estudio', {
        p_id: estudio.id,
        p_estudio: nuevos.estudio,
        p_etapas: nuevos.etapas,
        p_modificado_en: estudio.modificado_en ?? null,   // tal cual vino del servidor
      }).abortSignal(cortar.signal);
      clearTimeout(reloj);
      if (error) throw error;
      respuesta = data;
    } catch (error) {
      falla = error;
      console.error('No se pudieron guardar los cambios');   // sin datos del paciente en la consola
    }
    if (esta !== vuelta) return null;   // mientras tanto se canceló o se cerró la sesión

    if (falla && falla.code === 'CL409') return edicionCruzada();
    if (falla) {
      mostrarAviso(mensajeDeError(falla), 'error', 6000);
      return null;
    }
    if (respuesta.sin_cambios) {
      mostrarAviso('No hay cambios para guardar');
      return 'sin-cambios';
    }
    mostrarAviso(`Cambios guardados en el estudio N° ${respuesta.numero}`, 'exito', 4000);
    return 'guardado';
  }

  // Otra persona u otra pestaña lo cambió mientras tanto: no se guardó nada. Se
  // elige: cargar la versión nueva (se pierde lo escrito acá) o seguir editando
  // (por ejemplo, para copiar lo propio antes de cargarla).
  async function edicionCruzada() {
    const esta = vuelta;
    const recargar = await preguntar({
      titulo: 'No se guardó tu cambio',
      texto: 'Este estudio lo modificó otra persona o se editó en otra pestaña mientras lo editabas. No se guardó tu cambio. Si cargás la versión nueva, se pierde lo que escribiste acá.',
      icono: 'error',
      textoConfirmar: 'Cargar la versión nueva',
      textoVolver: 'Seguir editando',
      peligro: true,
      cancelable: false,
    });
    if (esta !== vuelta) return null;
    return recargar ? 'recargar' : null;
  }

  // Cancelar, volver o cerrar sesión: la planilla se borra de la pantalla
  function cerrar() {
    vuelta++;
    estudio = null;
    inicial = null;
    el.formulario.replaceChildren();
    el.zona.hidden = true;
  }

  // Si se intenta cerrar o recargar la pestaña con cambios sin guardar, el
  // navegador pregunta antes
  window.addEventListener('beforeunload', (evento) => {
    if (!hayCambios()) return;
    evento.preventDefault();
    evento.returnValue = '';
  });

  return { abrir, guardar, cerrar, hayCambios, primerCampo, abierta: () => Boolean(estudio) };
})();
