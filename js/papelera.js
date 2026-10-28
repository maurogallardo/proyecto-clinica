// Papelera (T059): los estudios "borrados" desde la ficha. Nunca se borran de
// verdad: quedan en la base (con sus etapas y sus fotos), con quién los mandó a
// la Papelera y cuándo, y se pueden restaurar. Se usa SOLO con las funciones de
// anular y restaurar de la base (en el ergométrico, anular_estudio y
// restaurar_estudio de supabase/papelera.sql): la app no puede hacerlo de otra
// forma. Desde acá no se abren ni se editan.
//
// La tabla de la base, esas dos funciones, las columnas de la planilla y los textos
// salen de la planilla activa (PLANILLA y textoDePlanilla, js/planillas/activa.js).

const PAPELERA = { tiempoMaximoMs: 20000 };

// Las columnas de la Papelera, iguales en todas las planillas: van después de las
// de la planilla (y al final, el botón "Restaurar")
const COLUMNAS_DE_LA_PAPELERA = [
  { columna: 'en_papelera_por_correo', titulo: 'Borrado por', estilo: 'correo' },
  { columna: 'en_papelera_desde', titulo: 'Fecha y hora', forma: 'fechaHora', ancho: 'fecha', estilo: 'fecha' },
];

const Papelera = (() => {
  const $ = (id) => document.getElementById(id);
  const el = {
    titulo: document.querySelector('#vista-papelera .encabezado-seccion__titulo'),
    contador: $('papelera-contador'),
    actualizar: $('papelera-actualizar'),
    cargando: $('papelera-cargando'),
    error: $('papelera-error'),
    errorTexto: $('papelera-error-texto'),
    vacio: $('papelera-vacio'),
    tabla: $('papelera-tabla'),
    encabezado: $('papelera-encabezado'),
    filas: $('papelera-filas'),
  };
  const columnas = [...PLANILLA.papelera.columnas, ...COLUMNAS_DE_LA_PAPELERA];
  // Lo que se le pide a la base: el id (para restaurar) y las columnas de la tabla
  // (en_papelera_desde también ordena la lista)
  const columnasPedidas = ['id', ...PLANILLA.papelera.columnas.map((c) => c.columna), 'en_papelera_desde', 'en_papelera_por_correo'].join(', ');
  let lista = [];
  let pedido = 0;   // cada carga tiene su número: una respuesta vieja no pisa a una nueva
  let vueltaDeSesion = 0;   // cambia al cerrar sesión
  let alRestaurar = () => {};

  const tieneValor = (v) => v !== null && v !== undefined && String(v).trim() !== '';
  const esSinConexion = (error) => !navigator.onLine || /fetch|network|abort|sin conexión/i.test(String(error && error.message));

  // Errores en criollo, sin detalles técnicos (y sin datos del paciente)
  function mensajeDeError(error, queSeHacia) {
    const mensaje = String((error && error.message) || '');
    if (esSinConexion(error)) return 'Sin conexión o el servidor tardó demasiado. Revisá internet y probá de nuevo.';
    if (/No se encontró el estudio/i.test(mensaje)) return textoDePlanilla('noEncontrado');
    if (/iniciar sesión|jwt/i.test(mensaje)) return 'Tu sesión se cerró. Volvé a iniciar sesión y probá de nuevo.';
    return `No se pudo ${queSeHacia}. Probá de nuevo.`;
  }

  // Llama a una de las dos funciones de la base. Devuelve { numero } o { problema }.
  async function llamar(funcion, id, queSeHacia) {
    try {
      if (!navigator.onLine) throw new Error('sin conexión');
      const cortar = new AbortController();
      const reloj = setTimeout(() => cortar.abort(), PAPELERA.tiempoMaximoMs);
      const { data, error } = await clienteSupabase.rpc(funcion, { p_id: id }).abortSignal(cortar.signal);
      clearTimeout(reloj);
      if (error) throw error;
      return { numero: data.numero };
    } catch (error) {
      console.error(`No se pudo ${queSeHacia}`);   // sin datos del paciente en la consola
      return { problema: mensajeDeError(error, queSeHacia) };
    }
  }

  // Mandar a la Papelera (lo usa la ficha). Si ya estaba (otra pestaña), da lo mismo.
  const anular = (id) => llamar(PLANILLA.base.anular, id, textoDePlanilla('queSeHaciaAnular'));
  const restaurar = (id) => llamar(PLANILLA.base.restaurar, id, textoDePlanilla('queSeHaciaRestaurar'));

  // --- La lista ---------------------------------------------------------------------------

  function mostrarSolo(parte) {
    el.cargando.hidden = parte !== 'cargando';
    el.error.hidden = parte !== 'error';
    el.vacio.hidden = parte !== 'vacio';
    el.tabla.hidden = parte !== 'tabla';
  }

  function celda(valor, clase) {
    const td = document.createElement('td');
    if (clase) td.className = clase;
    if (tieneValor(valor)) {
      td.textContent = String(valor).trim();
    } else {
      td.textContent = '—';
      td.classList.add('vacio');
    }
    return td;
  }

  // Encabezados de la tabla: los de las columnas y, al final, el del botón
  function dibujarEncabezado() {
    const ths = columnas.map((c) => {
      const th = document.createElement('th');
      th.scope = 'col';
      if (c.ancho) th.className = `tabla-panel__col-${c.ancho}`;
      th.textContent = c.titulo;
      return th;
    });
    const accion = document.createElement('th');
    accion.scope = 'col';
    accion.className = 'tabla-panel__col-accion';
    const nombre = document.createElement('span');
    nombre.className = 'solo-lectores';
    nombre.textContent = 'Acción';
    accion.appendChild(nombre);
    el.encabezado.replaceChildren(...ths, accion);
  }

  function filaDe(estudio) {
    const tr = document.createElement('tr');
    tr.dataset.estudioId = estudio.id;
    columnas.forEach((c) => {
      const valor = c.forma === 'fechaHora' ? Ficha.fechaHora(estudio[c.columna]) : estudio[c.columna];
      tr.appendChild(celda(valor, c.estilo ? `celda-${c.estilo}` : undefined));
    });
    const accion = document.createElement('td');
    accion.className = 'celda-accion';
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'panel-boton panel-boton--fantasma papelera__restaurar';
    boton.textContent = 'Restaurar';
    boton.setAttribute('aria-label', textoDePlanilla('restaurarEtiqueta', { numero: estudio.numero }));
    accion.appendChild(boton);
    tr.appendChild(accion);
    return tr;
  }

  function dibujar() {
    el.filas.replaceChildren();
    el.contador.textContent = lista.length === 1
      ? textoDePlanilla('contadorUno')
      : textoDePlanilla('contadorVarios', { cantidad: Number(lista.length).toLocaleString('es-AR') });
    el.contador.hidden = false;
    el.actualizar.hidden = false;
    if (lista.length === 0) {
      mostrarSolo('vacio');
      return;
    }
    const fragmento = document.createDocumentFragment();
    lista.forEach((e) => fragmento.appendChild(filaDe(e)));
    el.filas.appendChild(fragmento);
    mostrarSolo('tabla');
  }

  // Se carga cada vez que se entra a la Papelera (así siempre está al día)
  async function cargar() {
    const este = ++pedido;
    mostrarSolo('cargando');
    el.contador.hidden = true;
    el.actualizar.hidden = true;
    try {
      if (!navigator.onLine) throw new Error('sin conexión');
      const cortar = new AbortController();
      const reloj = setTimeout(() => cortar.abort(), PAPELERA.tiempoMaximoMs);
      const { data, error } = await clienteSupabase.from(PLANILLA.base.tabla)
        .select(columnasPedidas)
        .eq('en_papelera', true)
        .order('en_papelera_desde', { ascending: false })
        .abortSignal(cortar.signal);
      clearTimeout(reloj);
      if (este !== pedido) return;
      if (error) throw error;
      lista = data;
      dibujar();
    } catch (error) {
      if (este !== pedido) return;
      el.errorTexto.textContent = esSinConexion(error)
        ? 'Sin conexión o el servidor tardó demasiado. Revisá internet y probá de nuevo.'
        : 'No se pudo cargar la papelera. Probá de nuevo.';
      mostrarSolo('error');
      console.error('No se pudo cargar la papelera');
    }
  }

  // "Restaurar": vuelve a la lista de estudios y sale de la Papelera
  el.filas.addEventListener('click', async (evento) => {
    const boton = evento.target.closest('.papelera__restaurar');
    if (!boton || boton.disabled) return;
    const fila = boton.closest('tr[data-estudio-id]');
    const id = fila.dataset.estudioId;
    const sesion = vueltaDeSesion;
    const vuelta = pedido;
    boton.disabled = true;   // un doble clic no hace nada dos veces
    boton.textContent = 'Restaurando…';
    const { numero, problema } = await restaurar(id);
    if (sesion !== vueltaDeSesion) return;   // mientras tanto se cerró la sesión
    if (problema) {
      boton.disabled = false;
      boton.textContent = 'Restaurar';
      mostrarAviso(problema, 'error', 5000);
      return;
    }
    mostrarAviso(textoDePlanilla('restaurado', { numero }), 'exito');
    alRestaurar();
    if (vuelta !== pedido) return;   // mientras tanto se volvió a cargar la lista: ya viene sin él
    // Se saca la fila y el foco pasa al "Restaurar" siguiente (o al título si no queda ninguno)
    const indice = lista.findIndex((e) => e.id === id);
    if (indice >= 0) lista.splice(indice, 1);
    dibujar();
    const siguiente = el.filas.querySelectorAll('.papelera__restaurar')[Math.min(indice, lista.length - 1)];
    (siguiente || el.titulo).focus();
  });

  el.titulo.tabIndex = -1;   // para poder dejarle el foco
  document.querySelector('.papelera__ayuda').textContent = textoDePlanilla('papeleraAyuda');
  dibujarEncabezado();
  el.actualizar.addEventListener('click', cargar);
  $('papelera-reintentar').addEventListener('click', cargar);

  // Al cerrar sesión: nada de la papelera queda en la pantalla
  function reiniciar() {
    pedido++;
    vueltaDeSesion++;
    lista = [];
    el.filas.replaceChildren();
    el.contador.hidden = true;
    el.actualizar.hidden = true;
    mostrarSolo('cargando');
  }

  return {
    cargar,
    anular,
    reiniciar,
    alRestaurarUno: (funcion) => { alRestaurar = funcion; },
  };
})();
