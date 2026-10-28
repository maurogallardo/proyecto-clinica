// Dashboard de computadora (T030, T049): copia del panel de LoMar en forma y
// comportamiento (números, filtros, "Actualizar" con contador, estados cargando /
// error / vacío, tabla que abre la ficha). NO copia su seguridad: los datos se
// leen directo de Supabase con la sesión del usuario, y valen las reglas de
// acceso de la base (cada profesional ve los estudios que cargó él).
//
// Fechas: la tabla, los números y los filtros usan la fecha y hora de CARGA
// (creado_en). "Esta semana" = de lunes a hoy; "Este mes" = desde el día 1.
//
// Los estudios que están en la Papelera (T059, js/papelera.js) no se piden: no
// aparecen en la tabla, ni en los números, ni en la búsqueda.
//
// Las columnas de la tabla, en qué se busca, la tabla de la base y los textos
// salen de la planilla activa (PLANILLA y textoDePlanilla, js/planillas/activa.js).

const PANEL = { tiempoMaximoMs: 20000, largoConclusion: 90 };

const Dashboard = (() => {
  const $ = (id) => document.getElementById(id);
  const el = {
    vistas: {
      estudios: $('vista-estudios'), ficha: $('vista-ficha'),
      configuracion: $('vista-configuracion'), papelera: $('vista-papelera'),
    },
    tituloEstudios: document.querySelector('#vista-estudios .encabezado-seccion__titulo'),
    navegacion: [...document.querySelectorAll('.navegacion__item')],
    contador: $('panel-contador'),
    actualizar: $('panel-actualizar'),
    numeros: $('panel-numeros'),
    filtros: $('panel-filtros'),
    texto: $('filtro-texto'),
    cargando: $('panel-cargando'),
    error: $('panel-error'),
    errorTexto: $('panel-error-texto'),
    vacio: $('panel-vacio'),
    vacioTexto: $('panel-vacio-texto'),
    tabla: $('panel-tabla'),
    encabezado: $('panel-encabezado'),
    filas: $('panel-filas'),
  };
  // Lo que se le pide a la base: el id, el número y la fecha de carga (los usan los
  // números, los filtros y la ficha), las columnas de la lista y cuántas fotos tiene
  const columnasDeLaLista = PLANILLA.lista.columnas;
  const pedidoDeLaLista = [
    ...new Set(['id', 'numero', 'creado_en', ...columnasDeLaLista.filter((c) => c.columna).map((c) => c.columna)]),
    ...(columnasDeLaLista.some((c) => c.forma === 'fotos') ? [`${PLANILLA.fotos.tabla}(count)`] : []),
  ].join(', ');
  let estudios = [];
  let yaCargo = false;
  let pedido = 0;   // cada carga tiene su número: una respuesta vieja no pisa a una nueva

  // Un solo calendario de rango (T052): al elegir días, se filtra enseguida
  const calendario = Calendario.crear({
    boton: $('filtro-fechas'),
    texto: $('filtro-fechas-texto'),
    panel: $('filtro-fechas-panel'),
    alCambiar: () => aplicarFiltros(),
  });

  // --- Utilidades ---------------------------------------------------------------------

  const normalizar = (t) => String(t ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const tieneValor = (v) => v !== null && v !== undefined && String(v).trim() !== '';
  const formatearEntero = (n) => Number(n).toLocaleString('es-AR');

  function inicioDelDia(fecha, dias = 0) {
    return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + dias);
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

  // --- Números ------------------------------------------------------------------------
  // Sobre todos los estudios cargados: filtrar no los cambia (lo que sigue al filtro
  // es el contador).

  function calcularNumeros(lista) {
    const ahora = new Date();
    const hoy = inicioDelDia(ahora);
    const manana = inicioDelDia(ahora, 1);
    const diasDesdeLunes = (ahora.getDay() + 6) % 7;   // lunes = 0 ... domingo = 6
    const lunes = inicioDelDia(ahora, -diasDesdeLunes);
    const primeroDelMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const numeros = { total: lista.length, hoy: 0, semana: 0, mes: 0 };
    lista.forEach((estudio) => {
      const fecha = new Date(estudio.creado_en);
      if (Number.isNaN(fecha.getTime()) || fecha >= manana) return;
      if (fecha >= hoy) numeros.hoy++;
      if (fecha >= lunes) numeros.semana++;
      if (fecha >= primeroDelMes) numeros.mes++;
    });
    return numeros;
  }

  function mostrarNumeros() {
    const n = calcularNumeros(estudios);
    $('numero-total').textContent = formatearEntero(n.total);
    $('numero-hoy').textContent = formatearEntero(n.hoy);
    $('numero-semana').textContent = formatearEntero(n.semana);
    $('numero-mes').textContent = formatearEntero(n.mes);
  }

  // --- Filtros ------------------------------------------------------------------------

  function leerFiltros() {
    return {
      texto: normalizar(el.texto.value.trim()),
      ...(calendario.rango() || { desde: null, hasta: null }),
    };
  }

  const hayFiltros = (f) => Boolean(f.texto || f.desde || f.hasta);

  // Busca en los campos que dice la planilla (en el ergométrico, nombre y DNI). Los
  // de "soloCifras" (el DNI) se buscan solo si se escribieron números (con o sin puntos)
  function cumple(estudio, f) {
    if (f.texto) {
      const cifrasBuscadas = f.texto.replace(/\D/g, '');
      const sonCifras = cifrasBuscadas !== '' && cifrasBuscadas.length === f.texto.replace(/[\s.]/g, '').length;
      const coincide = PLANILLA.lista.buscar.some(({ columna, soloCifras }) => (soloCifras
        ? sonCifras && String(estudio[columna] ?? '').includes(cifrasBuscadas)
        : normalizar(estudio[columna]).includes(f.texto)));
      if (!coincide) return false;
    }
    if (f.desde || f.hasta) {
      const fecha = new Date(estudio.creado_en);
      if (Number.isNaN(fecha.getTime())) return false;
      if (f.desde && fecha < f.desde) return false;
      if (f.hasta && fecha > f.hasta) return false;
    }
    return true;
  }

  function aplicarFiltros() {
    const f = leerFiltros();
    dibujarTabla(estudios.filter((e) => cumple(e, f)), hayFiltros(f));
  }

  function limpiarFiltros() {
    el.texto.value = '';
    calendario.limpiar();
    aplicarFiltros();
  }

  // --- Tabla --------------------------------------------------------------------------

  function mostrarSolo(parte) {
    el.cargando.hidden = parte !== 'cargando';
    el.error.hidden = parte !== 'error';
    el.vacio.hidden = parte !== 'vacio';
    el.tabla.hidden = parte !== 'tabla';
  }

  function resumir(texto) {
    if (!tieneValor(texto)) return null;
    const limpio = String(texto).trim().replace(/\s+/g, ' ');
    return limpio.length > PANEL.largoConclusion ? `${limpio.slice(0, PANEL.largoConclusion - 1).trimEnd()}…` : limpio;
  }

  // Encabezados de la tabla, con las columnas de la planilla
  function dibujarEncabezado() {
    el.encabezado.replaceChildren(...columnasDeLaLista.map((c) => {
      const th = document.createElement('th');
      th.scope = 'col';
      if (c.ancho) th.className = `tabla-panel__col-${c.ancho}`;
      th.textContent = c.titulo;
      return th;
    }));
  }

  // Una celda, según la forma de la columna
  function celdaDe(estudio, c) {
    const clase = c.estilo ? `celda-${c.estilo}` : undefined;
    if (c.forma === 'fotos') {
      const cuenta = estudio[PLANILLA.fotos.tabla];
      const cantidad = cuenta && cuenta[0] ? cuenta[0].count : 0;
      const fotos = celda(String(cantidad), clase);
      if (!cantidad) fotos.classList.add('vacio');
      return fotos;
    }
    if (c.forma === 'resumen') {
      const td = celda(resumir(estudio[c.columna]), clase);
      if (tieneValor(estudio[c.columna])) td.title = String(estudio[c.columna]).trim();
      return td;
    }
    if (c.forma === 'fechaHora') return celda(Ficha.fechaHora(estudio[c.columna]), clase);
    return celda(estudio[c.columna], clase);
  }

  function filaDe(estudio) {
    const tr = document.createElement('tr');
    tr.dataset.estudioId = estudio.id;
    tr.tabIndex = 0;   // también se abre con el teclado
    columnasDeLaLista.forEach((c) => tr.appendChild(celdaDe(estudio, c)));
    return tr;
  }

  // El número de estudios con su palabra ("1 estudio", "12 estudios")
  const contarEstudios = (cantidad) => (cantidad === 1
    ? textoDePlanilla('contadorUno')
    : textoDePlanilla('contadorVarios', { cantidad: formatearEntero(cantidad) }));

  function dibujarTabla(lista, conFiltros) {
    el.filas.replaceChildren();
    el.contador.textContent = contarEstudios(lista.length);
    el.contador.hidden = false;
    el.actualizar.hidden = false;
    if (lista.length === 0) {
      // No es lo mismo no tener estudios que no encontrar con los filtros
      el.vacioTexto.textContent = textoDePlanilla(conFiltros ? 'listaSinCoincidencias' : 'listaVacia');
      mostrarSolo('vacio');
      return;
    }
    const fragmento = document.createDocumentFragment();
    lista.forEach((e) => fragmento.appendChild(filaDe(e)));
    el.filas.appendChild(fragmento);
    mostrarSolo('tabla');
  }

  function mostrarError(texto) {
    el.errorTexto.textContent = texto;
    el.contador.hidden = true;
    el.actualizar.hidden = true;
    el.filtros.hidden = true;
    el.numeros.hidden = true;
    mostrarSolo('error');
  }

  // --- Cargar los estudios --------------------------------------------------------------

  async function cargar() {
    const este = ++pedido;
    yaCargo = true;
    mostrarSolo('cargando');
    el.contador.hidden = true;
    el.actualizar.hidden = true;
    el.filtros.hidden = true;
    el.numeros.hidden = true;
    try {
      if (!navigator.onLine) throw new Error('sin conexión');
      const cortar = new AbortController();
      const reloj = setTimeout(() => cortar.abort(), PANEL.tiempoMaximoMs);
      const { data, error } = await clienteSupabase.from(PLANILLA.base.tabla)
        .select(pedidoDeLaLista)
        .eq('en_papelera', false)
        .order('creado_en', { ascending: false })
        .abortSignal(cortar.signal);
      clearTimeout(reloj);
      if (este !== pedido) return;
      if (error) throw error;
      estudios = data;
      // Los filtros y los números aparecen si hay algo que mostrar, y los filtros
      // quedan aunque dejen la lista en cero (si no, "Limpiar" no se alcanzaría)
      el.filtros.hidden = estudios.length === 0;
      el.numeros.hidden = estudios.length === 0;
      mostrarNumeros();
      aplicarFiltros();   // "Actualizar" respeta los filtros que ya estaban puestos
    } catch (error) {
      if (este !== pedido) return;
      const sinConexion = !navigator.onLine || /fetch|network|abort|sin conexión/i.test(String(error && error.message));
      mostrarError(sinConexion
        ? 'Sin conexión o el servidor tardó demasiado. Revisá internet y probá de nuevo.'
        : textoDePlanilla('errorLista'));
      console.error('No se pudieron cargar los estudios');
    }
  }

  // --- Secciones: Estudios (lista o ficha), Configuración y Papelera --------------------------

  function mostrarVista(nombre) {
    Object.entries(el.vistas).forEach(([clave, vista]) => { vista.hidden = clave !== nombre; });
    const seccion = nombre === 'ficha' ? 'estudios' : nombre;
    el.navegacion.forEach((b) => {
      const activa = b.dataset.seccion === seccion;
      b.classList.toggle('esta-activa', activa);
      if (activa) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    window.scrollTo(0, 0);
  }

  function irALaLista() {
    Ficha.cerrar();
    mostrarVista('estudios');
  }

  function abrirEstudio(id) {
    mostrarVista('ficha');
    Ficha.abrir(id);
  }

  // Al volver a entrar al dashboard (o la primera vez), se cargan los estudios
  document.addEventListener('pantallamostrada', (evento) => {
    if (evento.detail.id === 'dashboard' && !yaCargo) cargar();
  });

  el.navegacion.forEach((boton) => boton.addEventListener('click', async () => {
    // Si se está editando un estudio con cambios sin guardar, se pregunta antes
    if (!(await Ficha.puedeSalir())) return;
    const seccion = boton.dataset.seccion;
    if (seccion === 'configuracion' || seccion === 'papelera') {
      Ficha.cerrar();
      mostrarVista(seccion);
      if (seccion === 'papelera') Papelera.cargar();   // cada vez, así está al día
    } else {
      irALaLista();
    }
  }));

  // Borrar desde la ficha: vuelve a la lista (ya sin ese estudio) y avisa
  el.tituloEstudios.tabIndex = -1;   // para poder dejarle el foco
  Ficha.alMandarALaPapelera((numero, sigueEnLaFicha) => {
    if (!yaCargo) return;   // mientras tanto se cerró la sesión
    if (sigueEnLaFicha) {
      irALaLista();
      el.tituloEstudios.focus();
    }
    cargar();
    mostrarAviso(textoDePlanilla('enviadoAPapelera', { numero }), 'exito', 4000);
  });
  // Editar (T061): después de guardar, la lista muestra los datos nuevos
  Ficha.alGuardarCambios(() => { if (yaCargo) cargar(); });
  // Restaurar desde la Papelera: la lista de estudios lo vuelve a tener
  Papelera.alRestaurarUno(() => { if (yaCargo) cargar(); });
  el.filas.addEventListener('click', (evento) => {
    const fila = evento.target.closest('tr[data-estudio-id]');
    if (fila) abrirEstudio(fila.dataset.estudioId);
  });
  el.filas.addEventListener('keydown', (evento) => {
    const fila = evento.target.closest('tr[data-estudio-id]');
    if (fila && (evento.key === 'Enter' || evento.key === ' ')) {
      evento.preventDefault();
      abrirEstudio(fila.dataset.estudioId);
    }
  });
  el.texto.addEventListener('input', aplicarFiltros);
  $('filtro-limpiar').addEventListener('click', limpiarFiltros);
  el.actualizar.addEventListener('click', cargar);
  $('panel-reintentar').addEventListener('click', cargar);
  Ficha.alVolverALaLista(irALaLista);

  // Cerrar sesión: el mismo aviso de siempre (Sesion.alCerrarse) lleva al login
  $('panel-cerrar-sesion').addEventListener('click', async (evento) => {
    const boton = evento.currentTarget;
    if (!(await Ficha.puedeSalir())) return;   // editando con cambios: pregunta antes
    boton.disabled = true;
    await Sesion.salir();
    $('panel-cerrar-sesion').disabled = false;
  });

  // --- Configuración: foto de perfil ---------------------------------------------------------

  const archivoPerfil = $('perfil-archivo');
  $('perfil-elegir').addEventListener('click', () => archivoPerfil.click());
  archivoPerfil.addEventListener('change', async () => {
    const archivo = archivoPerfil.files[0];
    archivoPerfil.value = '';
    if (!archivo) return;
    const boton = $('perfil-elegir');
    const estado = $('perfil-estado');
    if (!archivo.type.startsWith('image/')) {
      estado.textContent = 'Elegí una foto (imagen).';
      mostrarAviso('Elegí una foto (imagen).', 'error', 4000);
      return;
    }
    // Primero se acomoda en el círculo (T053); "Cancelar" no sube nada
    let recorte;
    try {
      recorte = await Recortador.abrir(archivo);
    } catch {
      estado.textContent = 'No se pudo abrir la foto. Probá con otra.';
      mostrarAviso('No se pudo abrir la foto. Probá con otra.', 'error', 4000);
      return;
    }
    if (!recorte) return;
    boton.disabled = true;
    estado.textContent = 'Subiendo foto…';
    const problema = await Perfil.subir(recorte);
    boton.disabled = false;
    estado.textContent = problema || 'Listo: la foto se ve en la barra lateral y en el menú del celular.';
    mostrarAviso(problema || 'Foto de perfil actualizada.', problema ? 'error' : 'exito', 4000);
  });

  // Al cerrar sesión: nada de los estudios queda en la pantalla
  function reiniciar() {
    pedido++;
    estudios = [];
    yaCargo = false;
    el.filas.replaceChildren();
    el.texto.value = '';
    calendario.limpiar();
    calendario.cerrar();
    Recortador.cancelar();
    Ficha.cerrar();
    Papelera.reiniciar();
    Pdf.cerrarTodo();   // las pestañas de imprimir que abrió la app, afuera
    mostrarVista('estudios');
    mostrarSolo('cargando');
    $('perfil-estado').textContent = 'Se ve en la barra lateral y en el menú del celular.';
  }

  // Los textos fijos del dashboard, los de la planilla activa
  document.querySelectorAll('#dashboard .encabezado-seccion__antetitulo').forEach((a) => { a.textContent = textoDePlanilla('antetitulo'); });
  document.querySelector('.navegacion__item[data-seccion="estudios"] span').textContent = textoDePlanilla('seccionLista');
  el.tituloEstudios.textContent = textoDePlanilla('tituloLista');
  el.texto.placeholder = textoDePlanilla('buscarAyuda');
  el.cargando.querySelector('.estado-panel__texto').textContent = textoDePlanilla('cargandoLista');
  dibujarEncabezado();

  return { cargar, reiniciar, calcularNumeros };
})();

function reiniciarDashboard() {
  Dashboard.reiniciar();
}
