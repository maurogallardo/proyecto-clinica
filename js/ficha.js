// Ficha de un estudio en el dashboard (T031): copia de la ficha del panel de LoMar.
// Se arma desde la planilla activa (PLANILLA, js/planillas/activa.js), así ningún
// campo queda afuera: en un contexto médico ver qué falta importa tanto como ver lo
// cargado. Los vacíos se muestran con "—". Las fotos (en el ergométrico, las del
// electro) se ven en miniatura, con enlaces firmados que caducan (T029), y se
// agrandan al tocarlas. Lo que se le pide a la base y los textos también salen de
// la planilla (textoDePlanilla).

const FICHA = { tiempoMaximoMs: 20000 };

const Ficha = (() => {
  const el = {
    vista: document.getElementById('vista-ficha'),
    titulo: document.getElementById('ficha-titulo'),
    cargando: document.getElementById('ficha-cargando'),
    error: document.getElementById('ficha-error'),
    errorTexto: document.getElementById('ficha-error-texto'),
    cuerpo: document.getElementById('ficha-cuerpo'),
    acciones: document.getElementById('ficha-acciones'),
    reintentar: document.getElementById('ficha-reintentar'),
    lightbox: document.getElementById('lightbox'),
    lightboxTitulo: document.getElementById('lightbox-titulo'),
    lightboxImagen: document.getElementById('lightbox-imagen'),
    lightboxAviso: document.getElementById('lightbox-aviso'),
    lightboxOriginal: document.getElementById('lightbox-original'),
  };
  let idActual = null;
  let estudioActual = null;   // como vino del servidor (lo usa la edición)
  let fotosActuales = [];     // las fotos, en el orden de la ficha (las usa el PDF)
  let editando = false;
  let alVolver = () => {};
  let alMandarALaPapelera = () => {};
  let alGuardarCambios = () => {};

  // --- Cómo se muestra cada valor ---------------------------------------------------

  const tieneValor = (v) => v !== null && v !== undefined && String(v).trim() !== '';

  function textoDeValor(valor, campo) {
    if (!tieneValor(valor)) return null;
    if (campo && campo.tipo === 'fecha') {
      const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(valor));
      return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : String(valor);
    }
    if (campo && campo.tipo === 'decimal' && typeof valor === 'number') return String(valor).replace('.', ',');
    return String(valor).trim();
  }

  function valorNodo(valor, campo) {
    const span = document.createElement('span');
    span.className = 'ficha__valor';
    const texto = textoDeValor(valor, campo);
    if (texto === null) {
      span.textContent = '—';
      span.classList.add('vacio');
    } else {
      span.textContent = texto;
    }
    return span;
  }

  function nodoCampo(campo, valor) {
    const div = document.createElement('div');
    div.className = campo.ancho === 'completo' || campo.tipo === 'texto-largo' ? 'ficha__campo ficha__campo--ancho' : 'ficha__campo';
    const etiqueta = document.createElement('span');
    etiqueta.className = 'ficha__etiqueta';
    etiqueta.textContent = campo.etiqueta;
    // Como en la planilla: la conclusión ya tiene su título de sección
    if (campo.etiquetaOculta) etiqueta.hidden = true;
    div.append(etiqueta, valorNodo(valor, campo));
    return div;
  }

  function nodoSeccion(titulo, ...contenido) {
    const seccion = document.createElement('section');
    seccion.className = 'tarjeta-panel ficha__seccion';
    const h3 = document.createElement('h3');
    h3.className = 'titulo-bloque';
    h3.textContent = titulo;
    seccion.append(h3, ...contenido);
    return seccion;
  }

  function nodoNota(texto) {
    const p = document.createElement('p');
    p.className = 'ficha__nota';
    p.textContent = texto;
    return p;
  }

  // Campos de una sección de la planilla (con sus subtítulos, como "Postesfuerzo a los 5'")
  function nodoCampos(campos, estudio) {
    const bloques = [];
    let grilla = null;
    campos.forEach((campo) => {
      if (campo.subtitulo) {
        const sub = document.createElement('p');
        sub.className = 'ficha__subtitulo';
        sub.textContent = campo.subtitulo;
        bloques.push(sub);
        grilla = null;
        return;
      }
      if (!grilla) {
        grilla = document.createElement('div');
        grilla.className = 'ficha__grilla';
        bloques.push(grilla);
      }
      grilla.appendChild(nodoCampo(campo, estudio[campo.columna]));
    });
    return bloques;
  }

  // Campos por turno (los Controles de enfermería del N° 5) como un cuadro chico: un
  // renglón por turno (cada subtítulo de la planilla: "Mañana", "Tarde", "Noche") y
  // una columna por dato (F.R., Te., P., T.A., O2). Lo de la base va como texto.
  function nodoTurnos(campos, estudio) {
    const turnos = [];
    campos.forEach((campo) => {
      if (campo.subtitulo) turnos.push({ nombre: campo.subtitulo, campos: [] });
      else if (turnos.length) turnos[turnos.length - 1].campos.push(campo);
    });
    const tabla = document.createElement('table');
    tabla.className = 'turnos-ficha';
    const encabezado = document.createElement('tr');
    const esquina = document.createElement('th');
    esquina.scope = 'col';
    esquina.className = 'turnos-ficha__esquina';
    const textoEsquina = document.createElement('span');
    textoEsquina.className = 'solo-lectores';
    textoEsquina.textContent = 'Turno';
    esquina.append(textoEsquina);
    encabezado.append(esquina);
    (turnos[0]?.campos || []).forEach((campo) => {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = campo.etiqueta;
      encabezado.append(th);
    });
    const thead = document.createElement('thead');
    thead.append(encabezado);
    const cuerpo = document.createElement('tbody');
    turnos.forEach((turno) => {
      const tr = document.createElement('tr');
      const nombre = document.createElement('th');
      nombre.scope = 'row';
      nombre.className = 'turnos-ficha__turno';
      nombre.textContent = turno.nombre;
      tr.append(nombre);
      turno.campos.forEach((campo) => {
        const td = document.createElement('td');
        const texto = textoDeValor(estudio[campo.columna], campo);
        td.textContent = texto === null ? '—' : texto;
        if (texto === null) td.classList.add('vacio');
        tr.append(td);
      });
      cuerpo.append(tr);
    });
    tabla.append(thead, cuerpo);
    // En una ficha angosta, el cuadro se desplaza de costado (como las etapas)
    const envoltorio = document.createElement('div');
    envoltorio.className = 'tabla-desplazable';
    envoltorio.append(tabla);
    return envoltorio;
  }

  // Tabla de etapas ("Reposo y esfuerzo" en el ergométrico), con las columnas de la planilla
  function nodoEtapas(etapas) {
    if (etapas.length === 0) return nodoNota(textoDePlanilla('sinEtapas'));
    const columnas = PLANILLA.etapas.campos;
    const envoltorio = document.createElement('div');
    envoltorio.className = 'tabla-desplazable';
    const tabla = document.createElement('table');
    tabla.className = 'tabla-panel tabla-panel--ficha';
    const encabezado = document.createElement('tr');
    columnas.forEach((c) => {
      const th = document.createElement('th');
      th.scope = 'col';
      th.textContent = c.etiqueta;
      encabezado.appendChild(th);
    });
    const cuerpo = document.createElement('tbody');
    etapas.forEach((etapa) => {
      const tr = document.createElement('tr');
      columnas.forEach((c) => {
        const td = document.createElement('td');
        const texto = textoDeValor(etapa[c.columna], c);
        td.textContent = texto === null ? '—' : texto;
        if (texto === null) td.classList.add('vacio');
        tr.appendChild(td);
      });
      cuerpo.appendChild(tr);
    });
    const thead = document.createElement('thead');
    thead.appendChild(encabezado);
    tabla.append(thead, cuerpo);
    envoltorio.appendChild(tabla);
    return envoltorio;
  }

  // Fotos: miniaturas que abren la vista ampliada
  function nodoFotos(fotos) {
    if (fotos.length === 0) return nodoNota('Sin fotos adjuntas.');
    const grilla = document.createElement('div');
    grilla.className = 'adjuntos';
    fotos.forEach((foto, indice) => {
      const nombre = `Foto ${indice + 1}`;
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = 'adjunto';
      boton.title = nombre;
      const caja = document.createElement('div');
      caja.className = 'adjunto__caja';
      if (foto.enlace) {
        const imagen = document.createElement('img');
        imagen.className = 'adjunto__miniatura';
        imagen.src = foto.enlace;
        imagen.alt = nombre;
        imagen.setAttribute('loading', 'lazy');
        // Si no carga (por ejemplo, el enlace venció antes de que se viera), se
        // pide uno nuevo UNA vez; si igual no carga, "No disponible"
        let reintento = false;
        imagen.addEventListener('error', async () => {
          if (reintento) { caja.replaceChildren(textoSinImagen()); return; }
          reintento = true;
          const nuevo = await Enlaces.vigente(FOTOS.deposito, foto.ruta_archivo, FOTOS.enlaceSegundos, { renovar: true });
          if (nuevo) imagen.src = nuevo; else caja.replaceChildren(textoSinImagen());
        });
        caja.appendChild(imagen);
        // Al tocarla: un enlace que sirva AHORA (si el de la ficha ya es viejo, uno nuevo)
        boton.addEventListener('click', async () => {
          const url = await Enlaces.vigente(FOTOS.deposito, foto.ruta_archivo, FOTOS.enlaceSegundos);
          abrirLightbox(url, nombre, boton, foto.ruta_archivo);
        });
      } else {
        caja.appendChild(textoSinImagen());
        boton.disabled = true;
      }
      const pie = document.createElement('span');
      pie.className = 'adjunto__nombre';
      pie.textContent = nombre;
      boton.append(caja, pie);
      grilla.appendChild(boton);
    });
    return grilla;
  }

  function textoSinImagen() {
    const span = document.createElement('span');
    span.className = 'adjunto__icono';
    span.textContent = 'No disponible';
    return span;
  }

  // Fecha y hora local: "26/09/2026 14:05"
  function fechaHora(valor) {
    const fecha = valor ? new Date(valor) : null;
    if (!fecha || Number.isNaN(fecha.getTime())) return null;
    const dos = (n) => String(n).padStart(2, '0');
    return `${dos(fecha.getDate())}/${dos(fecha.getMonth() + 1)}/${fecha.getFullYear()} ${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`;
  }

  // Títulos de la ficha: "Estudio ergométrico · N° 21" (y "Editando · …" al editar)
  const tituloConNumero = (clave, estudio) => textoDePlanilla(clave, { numero: estudio.numero ?? '—' });

  function render(estudio, fotos) {
    el.titulo.textContent = tituloConNumero('tituloFicha', estudio);
    const secciones = PLANILLA.secciones.map((seccion) => {
      if (seccion.tipo === 'etapas') return nodoSeccion(seccion.titulo, nodoEtapas(estudio[PLANILLA.etapas.tabla]));
      // Grilla de horarios (N° 5): la tablita, solo si tiene algo (js/grilla.js), y
      // después los campos de la sección (la Dieta)
      const grilla = seccion.tipo === 'grilla' ? dibujarGrillaFicha(seccion, estudio[seccion.columna]) : null;
      // Cómo se acomoda en la ficha, si la planilla lo dice ("ficha"; el N° 5):
      // 'turnos' = un cuadro chico por turno; 'encabezado' = los datos cortos en una
      // línea y el texto largo abajo (css/dashboard.css). Sin "ficha", como siempre
      const campos = seccion.ficha === 'turnos' ? [nodoTurnos(seccion.campos, estudio)] : nodoCampos(seccion.campos, estudio);
      const nodo = nodoSeccion(seccion.titulo, ...(grilla ? [grilla] : []), ...campos);
      if (seccion.ficha) nodo.classList.add(`ficha__seccion--${seccion.ficha}`);
      return nodo;
    });
    secciones.push(nodoSeccion(PLANILLA.fotos.seccion, nodoFotos(fotos)));
    const pie = document.createElement('div');
    pie.className = 'ficha__grilla';
    pie.append(
      nodoCampo({ etiqueta: textoDePlanilla('pieNumero') }, estudio.numero),
      nodoCampo({ etiqueta: 'Cargado' }, fechaHora(estudio.creado_en)),
      nodoCampo({ etiqueta: 'Última edición' }, fechaHora(estudio.modificado_en)),
    );
    const seccionPie = nodoSeccion('Datos de carga', pie);
    seccionPie.classList.add('ficha__seccion--pie');
    secciones.push(seccionPie);
    el.cuerpo.replaceChildren(...secciones);
    estudioActual = estudio;
    fotosActuales = fotos.map(({ ruta_archivo }) => ({ ruta_archivo }));
    ponerBotonesDeLaFicha();
    mostrarSolo('ficha');
  }

  // Encabezado de la ficha: "Imprimir", "Descargar PDF", "Editar" (neutros) y
  // "Borrar" (en rojo). En modo edición van otros ("Cancelar" y "Guardar cambios").
  // "Imprimir" y "Descargar PDF" solo si la planilla tiene PDF (PLANILLA.pdf).
  function ponerBotonesDeLaFicha() {
    el.acciones.replaceChildren(
      ...(PLANILLA.pdf ? [
        boton('Imprimir', 'panel-boton panel-boton--fantasma', 'ficha-imprimir', () => hacerPdf('imprimir')),
        boton('Descargar PDF', 'panel-boton panel-boton--fantasma', 'ficha-descargar', () => hacerPdf('descargar')),
      ] : []),
      botonEditar(),
      botonBorrar(estudioActual),
    );
  }

  // --- Imprimir y Descargar PDF (T033, js/pdf/) -------------------------------------------
  // Un único PDF armado en la computadora (no se guarda en ningún lado). Mientras se
  // arma, los botones quedan deshabilitados: un doble clic no hace nada dos veces.

  let armandoPdf = false;
  async function hacerPdf(accion) {
    if (armandoPdf || !estudioActual || editando) return;
    armandoPdf = true;
    const id = idActual;
    const estudio = estudioActual;
    const fotos = fotosActuales;
    const tocado = document.getElementById(accion === 'imprimir' ? 'ficha-imprimir' : 'ficha-descargar');
    // La pestaña de imprimir se abre YA (en el clic), para que el navegador no la bloquee
    const ventana = accion === 'imprimir' ? Pdf.abrirPestanaDeEspera() : null;
    const botones = [...el.acciones.querySelectorAll('button')];
    const textoOriginal = tocado.textContent;
    botones.forEach((b) => { b.disabled = true; });
    tocado.textContent = 'Armando el PDF…';
    try {
      if (accion === 'imprimir' && !ventana) throw new ErrorPdf('ventana');
      const { blob, nombre } = await Pdf.armar(estudio, fotos, { paraImprimir: accion === 'imprimir' });
      if (idActual !== id || editando) {   // mientras tanto se salió de la ficha o se cerró sesión
        Pdf.cerrarPestana(ventana);
        return;
      }
      if (accion === 'imprimir') {
        Pdf.mostrarEnPestana(ventana, blob);
        mostrarAviso('El PDF se abrió en otra pestaña. Si no aparece la ventana de impresión, tocá el botón de imprimir de esa pestaña.', 'info', 7000);
      } else {
        Pdf.descargar(blob, nombre);
        mostrarAviso('PDF descargado.', 'exito', 4000);
      }
    } catch (error) {
      Pdf.cerrarPestana(ventana);
      console.error('No se pudo armar el PDF');   // sin datos del paciente en la consola
      if (idActual === id) mostrarAviso(Pdf.mensajeDeError(error), 'error', 7000);
    } finally {
      armandoPdf = false;
      if (tocado.isConnected) {
        botones.forEach((b) => { b.disabled = false; });
        tocado.textContent = textoOriginal;
        if (document.activeElement === document.body || !document.activeElement) tocado.focus();
      }
    }
  }

  // --- Editar (T061, js/edicion.js) ---------------------------------------------------------
  // "Editar" (neutro, como "Volver") a la izquierda de "Borrar". En modo edición el
  // encabezado muestra "Cancelar" y "Guardar cambios".

  function boton(texto, clase, id, alTocar) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = clase;
    b.id = id;
    b.textContent = texto;
    b.addEventListener('click', alTocar);
    return b;
  }

  const botonEditar = () => boton('Editar', 'panel-boton panel-boton--fantasma', 'ficha-editar', entrarAEdicion);

  function entrarAEdicion() {
    if (!estudioActual || editando) return;
    editando = true;
    cerrarLightbox();
    el.cuerpo.hidden = true;
    Edicion.abrir(estudioActual);
    el.titulo.textContent = tituloConNumero('tituloEditando', estudioActual);
    el.acciones.replaceChildren(
      boton('Cancelar', 'panel-boton panel-boton--fantasma', 'ficha-cancelar', cancelar),
      boton('Guardar cambios', 'panel-boton', 'ficha-guardar', guardar),
    );
    window.scrollTo(0, 0);
    Edicion.primerCampo().focus({ preventScroll: true });
  }

  // Vuelve a la ficha tal como estaba (sin pedirla de nuevo)
  function salirDeEdicion() {
    Edicion.cerrar();
    editando = false;
    if (!estudioActual) return;
    el.titulo.textContent = tituloConNumero('tituloFicha', estudioActual);
    ponerBotonesDeLaFicha();
    el.cuerpo.hidden = false;
    document.getElementById('ficha-editar').focus();
  }

  // Con cambios sin guardar, se pregunta antes de perderlos
  async function puedeSalir() {
    if (!editando || !Edicion.hayCambios()) return true;
    return preguntar({
      titulo: '¿Seguro?',
      texto: 'Se pierden los cambios que no guardaste.',
      textoConfirmar: 'Descartar cambios',
      textoVolver: 'Seguir editando',
      peligro: true,
    });
  }

  async function cancelar() {
    if (await puedeSalir()) salirDeEdicion();
  }

  let guardando = false;
  async function guardar() {
    if (guardando) return;   // un doble clic no guarda dos veces
    guardando = true;
    const id = idActual;
    const botones = [...el.acciones.querySelectorAll('button')];
    const botonGuardar = document.getElementById('ficha-guardar');
    let resultado = null;
    let seMando = false;
    try {
      // Los botones se deshabilitan recién al mandar (así el cartel devuelve el foco a
      // "Guardar cambios", y un aviso de "falta el DNI" deja el cursor en el campo)
      resultado = await Edicion.guardar({
        alEmpezar: () => {
          seMando = true;
          botones.forEach((b) => { b.disabled = true; });
          botonGuardar.textContent = 'Guardando…';
        },
      });
    } finally {
      guardando = false;
      if (seMando && botonGuardar.isConnected) {
        botones.forEach((b) => { b.disabled = false; });
        botonGuardar.textContent = 'Guardar cambios';
      }
    }
    if (idActual !== id || !editando) return;   // mientras tanto se salió o se cerró sesión
    if (resultado === 'guardado') {
      alGuardarCambios();
      Edicion.cerrar();
      editando = false;
      await abrir(id);   // la ficha con los datos nuevos y su "Última edición"
      const editar = document.getElementById('ficha-editar');
      if (editar && idActual === id) editar.focus();
    } else if (resultado === 'recargar') {
      Edicion.cerrar();
      editando = false;
      await abrir(id);
      const editar = document.getElementById('ficha-editar');
      if (editar && idActual === id) editar.focus();
    } else if (resultado === 'sin-cambios') {
      salirDeEdicion();
    } else if (botonGuardar.isConnected && (document.activeElement === document.body || !document.activeElement)) {
      botonGuardar.focus();   // el foco se había perdido mientras el botón estaba deshabilitado
    }
  }

  // --- Borrar = mandar a la Papelera (T059) ----------------------------------------------
  // Discreto y en rojo. Pregunta antes; mientras trabaja queda deshabilitado (un
  // doble clic no hace nada dos veces). No se borra nada de verdad.

  function botonBorrar(estudio) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'panel-boton panel-boton--borrar';
    boton.id = 'ficha-borrar';
    boton.innerHTML = '<svg class="panel-boton__icono" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3" /></svg>';
    boton.append('Borrar');
    boton.addEventListener('click', () => borrar(estudio, boton));
    return boton;
  }

  async function borrar(estudio, boton) {
    if (boton.dataset.ocupado) return;
    boton.dataset.ocupado = '1';   // (no se deshabilita todavía: al cerrar el cartel el foco vuelve acá)
    const nombre = estudio[PLANILLA.columnaPaciente];
    const paciente = tieneValor(nombre) ? ` (${String(nombre).trim()})` : '';
    const si = await preguntar({
      titulo: '¿Mandar a la Papelera?',
      texto: textoDePlanilla('borrarTexto', { numero: estudio.numero, paciente }),
      textoConfirmar: 'Mandar a la Papelera',
      peligro: true,
    });
    if (!si || idActual !== estudio.id) {
      delete boton.dataset.ocupado;
      return;
    }
    boton.disabled = true;
    boton.lastChild.textContent = 'Borrando…';
    const { numero, problema } = await Papelera.anular(estudio.id);
    const sigueEnLaFicha = idActual === estudio.id;   // (mientras tanto se pudo volver a la lista)
    if (problema) {
      if (!sigueEnLaFicha) return;
      boton.disabled = false;
      boton.lastChild.textContent = 'Borrar';
      delete boton.dataset.ocupado;
      boton.focus();
      mostrarAviso(problema, 'error', 5000);
      return;
    }
    alMandarALaPapelera(numero, sigueEnLaFicha);
  }

  function mostrarSolo(parte) {
    el.cargando.hidden = parte !== 'cargando';
    el.error.hidden = parte !== 'error';
    el.cuerpo.hidden = parte !== 'ficha';
  }

  // --- Cargar un estudio ---------------------------------------------------------------

  async function abrir(id) {
    idActual = id;
    estudioActual = null;
    fotosActuales = [];
    editando = false;
    ocultarVersionNueva();
    Edicion.cerrar();
    el.titulo.textContent = PLANILLA.titulo;
    el.cuerpo.replaceChildren();
    el.acciones.replaceChildren();
    mostrarSolo('cargando');
    window.scrollTo(0, 0);
    try {
      if (!navigator.onLine) throw new Error('sin conexión');
      const cortar = new AbortController();
      const reloj = setTimeout(() => cortar.abort(), FICHA.tiempoMaximoMs);
      // Las etapas, solo si la planilla tiene esa tabla (el N° 5 no tiene)
      const tablaEtapas = PLANILLA.etapas.tabla;
      const { data, error } = await clienteSupabase.from(PLANILLA.base.tabla)
        .select(`*, ${tablaEtapas ? `${tablaEtapas}(*), ` : ''}${PLANILLA.fotos.tabla}(id, ruta_archivo, creado_en)`)
        .eq('id', id)
        .abortSignal(cortar.signal)
        .maybeSingle();
      clearTimeout(reloj);
      if (idActual !== id) return;   // mientras tanto se volvió o se abrió otro
      if (error) throw error;
      if (!data) {
        mostrarError(textoDePlanilla('noEncontrado'), false);
        return;
      }
      // Uno que está en la Papelera no se abre: primero hay que restaurarlo
      if (data.en_papelera) {
        el.titulo.textContent = tituloConNumero('tituloFicha', data);
        mostrarError(textoDePlanilla('fichaEnPapelera'), false);
        return;
      }
      // Etapas en el orden de la planilla (en el ergométrico, de tiempo; las que no
      // lo tienen, al final)
      const orden = PLANILLA.etapas.ordenarPor;
      if (tablaEtapas) data[tablaEtapas].sort((a, b) => (a[orden] ?? Infinity) - (b[orden] ?? Infinity));
      const imagenes = [...data[PLANILLA.fotos.tabla]].sort((a, b) => String(a.creado_en).localeCompare(String(b.creado_en)));
      const enlaces = imagenes.length
        ? await Enlaces.vigentes(FOTOS.deposito, imagenes.map((i) => i.ruta_archivo), FOTOS.enlaceSegundos)
        : [];
      if (idActual !== id) return;
      render(data, imagenes.map((imagen, i) => ({ ...imagen, enlace: enlaces[i] })));
    } catch (error) {
      if (idActual !== id) return;
      const sinConexion = !navigator.onLine || /fetch|network|abort|sin conexión/i.test(String(error && error.message));
      mostrarError(sinConexion ? 'Sin conexión. Revisá internet y probá de nuevo.' : textoDePlanilla('errorFicha'));
      console.error('No se pudo cargar la ficha');
    }
  }

  // --- Tiempo real (T023 del N° 5): "Hay una versión nueva" ------------------------------
  // Cuando llega un aviso de cambios (js/tiempo-real.js), se vuelve a preguntar a la
  // base por la hoja que se está mirando (la consulta normal; lo que trae el aviso no
  // se usa). Si cambió, NO se reemplaza sola: aparece un aviso con un botón para
  // cargarla. Mientras se edita, no se avisa: al guardar vale la edición cruzada
  // (CL409, js/edicion.js). El aviso se arma recién la primera vez que hace falta.

  let avisoVersion = null;

  function ocultarVersionNueva() {
    if (avisoVersion) avisoVersion.hidden = true;
  }

  function mostrarVersionNueva() {
    if (!avisoVersion) {
      avisoVersion = document.createElement('div');
      avisoVersion.className = 'ficha__version-nueva';
      avisoVersion.setAttribute('role', 'status');
      const texto = document.createElement('p');
      texto.className = 'ficha__version-nueva-texto';
      const cargarla = document.createElement('button');
      cargarla.type = 'button';
      cargarla.className = 'panel-boton';
      cargarla.id = 'ficha-version-nueva';
      cargarla.addEventListener('click', async () => {
        if (idActual && (await puedeSalir())) abrir(idActual);   // editando con cambios: pregunta antes
      });
      avisoVersion.append(texto, cargarla);
      el.vista.querySelector('.ficha__cabecera').after(avisoVersion);
    }
    avisoVersion.querySelector('.ficha__version-nueva-texto').textContent = textoDePlanilla('versionNueva');
    avisoVersion.querySelector('button').textContent = textoDePlanilla('versionNuevaBoton');
    avisoVersion.hidden = false;
  }

  async function revisarSiCambio() {
    const id = idActual;
    const vista = estudioActual;
    if (!id || !vista || editando || (avisoVersion && !avisoVersion.hidden)) return;
    try {
      const { data, error } = await clienteSupabase.from(PLANILLA.base.tabla)
        .select('id, modificado_en, en_papelera')
        .eq('id', id)
        .maybeSingle();
      if (error || idActual !== id || estudioActual !== vista || editando) return;
      const cambio = !data || data.en_papelera || String(data.modificado_en ?? '') !== String(vista.modificado_en ?? '');
      if (cambio) mostrarVersionNueva();
    } catch {
      // sin conexión: se vuelve a revisar con el próximo aviso
    }
  }

  // "Reintentar" solo cuando tiene sentido (no si el estudio no está o está en la Papelera)
  function mostrarError(texto, conReintentar = true) {
    el.errorTexto.textContent = texto;
    el.reintentar.hidden = !conReintentar;
    mostrarSolo('error');
  }

  // --- Vista ampliada de una foto --------------------------------------------------------

  let origenLightbox = null;
  let rutaLightbox = null;   // de qué foto es, para renovar su enlace si hace falta

  function abrirLightbox(url, nombre, origen, ruta) {
    origenLightbox = origen || null;
    rutaLightbox = ruta || null;
    delete el.lightboxImagen.dataset.renovado;
    el.lightboxTitulo.textContent = nombre;
    el.lightboxAviso.hidden = !!url;
    el.lightboxImagen.hidden = !url;
    el.lightboxImagen.alt = nombre;
    if (url) el.lightboxImagen.src = url; else el.lightboxImagen.removeAttribute('src');
    el.lightboxOriginal.href = url || '#';
    el.lightbox.hidden = false;
    document.getElementById('lightbox-cerrar').focus();
  }

  // "Abrir original en una pestaña": si el enlace ya es viejo, se pide uno nuevo
  // y recién ahí se abre la pestaña (si sirve, el navegador lo abre directo)
  el.lightboxOriginal.addEventListener('click', async (evento) => {
    if (!rutaLightbox || Enlaces.sigueSirviendo(FOTOS.deposito, rutaLightbox)) return;
    evento.preventDefault();
    const url = await Enlaces.vigente(FOTOS.deposito, rutaLightbox, FOTOS.enlaceSegundos);
    if (!url) { mostrarAviso('No se pudo abrir la foto. Probá de nuevo.', 'error'); return; }
    el.lightboxOriginal.href = url;
    window.open(url, '_blank', 'noopener,noreferrer');
  });

  function cerrarLightbox() {
    if (el.lightbox.hidden) return;
    el.lightbox.hidden = true;
    el.lightboxImagen.removeAttribute('src');   // que no quede en memoria
    if (origenLightbox) origenLightbox.focus();
    origenLightbox = null;
    rutaLightbox = null;
  }

  el.lightboxImagen.addEventListener('error', async () => {
    if (el.lightbox.hidden || !el.lightboxImagen.getAttribute('src')) return;
    // Primero se prueba UNA vez con un enlace nuevo
    const ruta = rutaLightbox;
    if (ruta && !el.lightboxImagen.dataset.renovado) {
      el.lightboxImagen.dataset.renovado = '1';
      const nuevo = await Enlaces.vigente(FOTOS.deposito, ruta, FOTOS.enlaceSegundos, { renovar: true });
      if (nuevo && rutaLightbox === ruta) {
        el.lightboxImagen.src = nuevo;
        el.lightboxOriginal.href = nuevo;
        return;
      }
    }
    el.lightboxImagen.hidden = true;
    el.lightboxAviso.hidden = false;
  });
  el.lightboxImagen.addEventListener('load', () => { delete el.lightboxImagen.dataset.renovado; });
  document.getElementById('lightbox-cerrar').addEventListener('click', cerrarLightbox);
  document.getElementById('lightbox-fondo').addEventListener('click', cerrarLightbox);
  document.addEventListener('keydown', (evento) => { if (evento.key === 'Escape') cerrarLightbox(); });

  // --- Volver a la lista ------------------------------------------------------------------

  function cerrar() {
    cerrarLightbox();
    idActual = null;
    estudioActual = null;
    fotosActuales = [];
    editando = false;
    ocultarVersionNueva();
    Edicion.cerrar();              // tampoco la planilla de edición
    el.cuerpo.replaceChildren();   // los datos del paciente no quedan en la pantalla
    el.acciones.replaceChildren();
  }

  // "← Volver": si se está editando con cambios, pregunta antes
  document.getElementById('ficha-volver').addEventListener('click', async () => {
    if (await puedeSalir()) alVolver();
  });
  document.getElementById('ficha-volver-lista').addEventListener('click', () => alVolver());
  document.getElementById('ficha-reintentar').addEventListener('click', () => { if (idActual) abrir(idActual); });
  el.cargando.querySelector('.estado-panel__texto').textContent = textoDePlanilla('cargandoFicha');

  return {
    abrir,
    cerrar,
    alVolverALaLista: (funcion) => { alVolver = funcion; },
    alMandarALaPapelera: (funcion) => { alMandarALaPapelera = funcion; },
    alGuardarCambios: (funcion) => { alGuardarCambios = funcion; },
    puedeSalir,
    fechaHora,
    revisarSiCambio,
  };
})();
