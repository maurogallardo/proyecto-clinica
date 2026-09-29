// Papelera (T059): los estudios "borrados" desde la ficha. Nunca se borran de
// verdad: quedan en la base (con sus etapas y sus fotos), con quién los mandó a
// la Papelera y cuándo, y se pueden restaurar. Se usa SOLO con las funciones de la
// base anular_estudio y restaurar_estudio (supabase/papelera.sql): la app no
// puede hacerlo de otra forma. Desde acá no se abren ni se editan.

const PAPELERA = { tiempoMaximoMs: 20000 };

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
    filas: $('papelera-filas'),
  };
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
    if (/No se encontró el estudio/i.test(mensaje)) return 'No se encontró el estudio (puede que no sea tuyo o que ya no exista).';
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
  const anular = (id) => llamar('anular_estudio', id, 'mandar el estudio a la Papelera');
  const restaurar = (id) => llamar('restaurar_estudio', id, 'restaurar el estudio');

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

  function filaDe(estudio) {
    const tr = document.createElement('tr');
    tr.dataset.estudioId = estudio.id;
    tr.appendChild(celda(estudio.numero, 'celda-numero'));
    tr.appendChild(celda(estudio.nombre_paciente, 'celda-paciente'));
    tr.appendChild(celda(estudio.documento, 'celda-dni'));
    tr.appendChild(celda(estudio.en_papelera_por_correo, 'celda-correo'));
    tr.appendChild(celda(Ficha.fechaHora(estudio.en_papelera_desde), 'celda-fecha'));
    const accion = document.createElement('td');
    accion.className = 'celda-accion';
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'panel-boton panel-boton--fantasma papelera__restaurar';
    boton.textContent = 'Restaurar';
    boton.setAttribute('aria-label', `Restaurar el estudio N° ${estudio.numero}`);
    accion.appendChild(boton);
    tr.appendChild(accion);
    return tr;
  }

  function dibujar() {
    el.filas.replaceChildren();
    el.contador.textContent = lista.length === 1 ? '1 estudio' : `${Number(lista.length).toLocaleString('es-AR')} estudios`;
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
      const { data, error } = await clienteSupabase.from('estudios')
        .select('id, numero, nombre_paciente, documento, en_papelera_desde, en_papelera_por_correo')
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
    mostrarAviso(`Estudio N° ${numero} restaurado`, 'exito');
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
