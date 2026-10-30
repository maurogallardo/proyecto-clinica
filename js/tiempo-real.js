// Tiempo real del dashboard (T023 del Formulario N° 5): mientras el dashboard está
// abierto, la base avisa cuando cambia una hoja (nueva, editada, mandada a la
// Papelera o restaurada) y la lista se pone al día sola. Usa Supabase Realtime (viene
// en supabase-js; la tabla está en la publicación "supabase_realtime",
// supabase/formulario5.sql). Realtime respeta las reglas de la base: cada usuario
// recibe solo los avisos de lo suyo.
//
// - El aviso sirve SOLO para disparar: lo que trae no se lee ni se muestra. Los datos
//   se vuelven a pedir con la consulta normal (que respeta las reglas de la base).
// - Varios avisos seguidos se juntan en uno: el primero espera "esperaMs" y los que
//   llegan mientras tanto van en la misma puesta al día.
// - Si se corta la conexión, se avisa una vez; al volver, se avisa y se pone al día.
// - La suscripción se cierra al cerrar sesión o si la sesión vence (detener, desde
//   js/dashboard.js). No se guarda nada en el navegador.
// - Solo para las planillas que lo piden (PLANILLA.tiempoReal; el ergométrico no).

const TIEMPO_REAL = { esperaMs: 1000 };

const TiempoReal = (() => {
  let canal = null;
  let listo = false;      // la base confirmó la suscripción (SUBSCRIBED)
  let iniciando = false;  // esperando la sesión para suscribirse
  let vuelta = 0;         // cada inicio tiene su número: uno viejo (sesión cerrada) no se suscribe
  let espera = null;      // la puesta al día que está por hacerse (agrupa los avisos)
  let cortado = false;
  let acciones = null;

  function programarPuestaAlDia() {
    if (espera) return;   // ya hay una en camino: este aviso va en esa
    espera = setTimeout(() => {
      espera = null;
      if (canal && acciones) acciones.alCambiar();
    }, TIEMPO_REAL.esperaMs);
  }

  function seCorto() {
    if (!canal || cortado) return;
    cortado = true;
    acciones.alCortarse();
  }

  function volvio() {
    if (!canal || !cortado) return;
    cortado = false;
    acciones.alVolver();
  }

  // tabla: la de la planilla (PLANILLA.base.tabla)
  // alCambiar: hubo cambios (ya agrupados); alCortarse / alVolver: la conexión
  // Antes de suscribirse, el tiempo real lleva el token de la sesión de la persona que
  // ingresó (así la base aplica SUS reglas); sin sesión, no se suscribe. El canal
  // queda "listo" recién cuando la base confirma la suscripción (SUBSCRIBED).
  async function iniciar({ tabla, alCambiar, alCortarse, alVolver }) {
    detener();
    const esta = ++vuelta;
    iniciando = true;
    try {
      const sesion = await Sesion.actual();
      if (esta !== vuelta || !sesion) return;   // mientras tanto se cerró la sesión, o no hay
      await clienteSupabase.realtime.setAuth(sesion.access_token);
      if (esta !== vuelta) return;
    } catch {
      return;   // sin sesión no hay tiempo real (la lista se sigue pidiendo con "Actualizar")
    } finally {
      if (esta === vuelta) iniciando = false;
    }
    acciones = { alCambiar, alCortarse, alVolver };
    cortado = false;
    const este = clienteSupabase.channel(`tiempo-real-${tabla}`);
    canal = este;
    este
      .on('postgres_changes', { event: '*', schema: 'public', table: tabla }, () => {
        if (canal === este) programarPuestaAlDia();   // el aviso no se lee: solo dispara
      })
      .subscribe((estado) => {
        if (canal !== este) return;   // un canal ya cerrado (por ejemplo, al cerrar sesión)
        if (estado === 'SUBSCRIBED') {
          listo = true;
          volvio();
        } else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT' || estado === 'CLOSED') {
          listo = false;
          seCorto();
        }
      });
  }

  // Cierra la suscripción (al cerrar sesión o si la sesión vence)
  function detener() {
    vuelta++;
    iniciando = false;
    listo = false;
    clearTimeout(espera);
    espera = null;
    cortado = false;
    acciones = null;
    if (!canal) return;
    const viejo = canal;
    canal = null;
    clienteSupabase.removeChannel(viejo);
  }

  // Sin internet en la computadora: se avisa; al volver, se pone al día
  window.addEventListener('offline', seCorto);
  window.addEventListener('online', volvio);

  // activo: suscripto o suscribiéndose (para no abrir dos); listo: confirmado por la base
  return { iniciar, detener, activo: () => canal !== null || iniciando, listo: () => listo };
})();
