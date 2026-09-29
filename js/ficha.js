// Ficha de un estudio en el dashboard (T031): copia de la ficha del panel de LoMar.
// Se arma desde la planilla (js/planillas/ergometrico.js), así ningún campo queda
// afuera: en un contexto médico ver qué falta importa tanto como ver lo cargado.
// Los vacíos se muestran con "—". Las fotos del electro se ven en miniatura, con
// enlaces firmados que caducan (T029), y se agrandan al tocarlas.

const FICHA = { tiempoMaximoMs: 20000 };

const Ficha = (() => {
  const el = {
    vista: document.getElementById('vista-ficha'),
    titulo: document.getElementById('ficha-titulo'),
    cargando: document.getElementById('ficha-cargando'),
    error: document.getElementById('ficha-error'),
    errorTexto: document.getElementById('ficha-error-texto'),
    cuerpo: document.getElementById('ficha-cuerpo'),
    lightbox: document.getElementById('lightbox'),
    lightboxTitulo: document.getElementById('lightbox-titulo'),
    lightboxImagen: document.getElementById('lightbox-imagen'),
    lightboxAviso: document.getElementById('lightbox-aviso'),
    lightboxOriginal: document.getElementById('lightbox-original'),
  };
  let idActual = null;
  let alVolver = () => {};

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

  // Tabla "Reposo y esfuerzo", con las columnas de la planilla
  function nodoEtapas(etapas) {
    if (etapas.length === 0) return nodoNota('Sin etapas cargadas.');
    const columnas = PLANILLA_ERGOMETRICO.etapas.campos;
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

  // Fotos del electro: miniaturas que abren la vista ampliada
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

  function render(estudio, fotos) {
    el.titulo.textContent = `Estudio ergométrico · N° ${estudio.numero ?? '—'}`;
    const secciones = PLANILLA_ERGOMETRICO.secciones.map((seccion) => (seccion.tipo === 'etapas'
      ? nodoSeccion(seccion.titulo, nodoEtapas(estudio.etapas))
      : nodoSeccion(seccion.titulo, ...nodoCampos(seccion.campos, estudio))));
    secciones.push(nodoSeccion('Fotos del electro', nodoFotos(fotos)));
    const pie = document.createElement('div');
    pie.className = 'ficha__grilla';
    pie.append(
      nodoCampo({ etiqueta: 'N° de estudio' }, estudio.numero),
      nodoCampo({ etiqueta: 'Cargado' }, fechaHora(estudio.creado_en)),
      nodoCampo({ etiqueta: 'Última edición' }, fechaHora(estudio.modificado_en)),
    );
    const seccionPie = nodoSeccion('Datos de carga', pie);
    seccionPie.classList.add('ficha__seccion--pie');
    secciones.push(seccionPie);
    el.cuerpo.replaceChildren(...secciones);
    mostrarSolo('ficha');
  }

  function mostrarSolo(parte) {
    el.cargando.hidden = parte !== 'cargando';
    el.error.hidden = parte !== 'error';
    el.cuerpo.hidden = parte !== 'ficha';
  }

  // --- Cargar un estudio ---------------------------------------------------------------

  async function abrir(id) {
    idActual = id;
    el.titulo.textContent = 'Estudio ergométrico';
    el.cuerpo.replaceChildren();
    mostrarSolo('cargando');
    window.scrollTo(0, 0);
    try {
      if (!navigator.onLine) throw new Error('sin conexión');
      const cortar = new AbortController();
      const reloj = setTimeout(() => cortar.abort(), FICHA.tiempoMaximoMs);
      const { data, error } = await clienteSupabase.from('estudios')
        .select('*, etapas(*), imagenes(id, ruta_archivo, creado_en)')
        .eq('id', id)
        .abortSignal(cortar.signal)
        .maybeSingle();
      clearTimeout(reloj);
      if (idActual !== id) return;   // mientras tanto se volvió o se abrió otro
      if (error) throw error;
      if (!data) {
        mostrarError('No se encontró el estudio (puede que no sea tuyo o que ya no exista).');
        return;
      }
      // Etapas en orden de tiempo (las que no tienen tiempo, al final)
      data.etapas.sort((a, b) => (a.tiempo ?? Infinity) - (b.tiempo ?? Infinity));
      const imagenes = [...data.imagenes].sort((a, b) => String(a.creado_en).localeCompare(String(b.creado_en)));
      const enlaces = imagenes.length
        ? await Enlaces.vigentes(FOTOS.deposito, imagenes.map((i) => i.ruta_archivo), FOTOS.enlaceSegundos)
        : [];
      if (idActual !== id) return;
      render(data, imagenes.map((imagen, i) => ({ ...imagen, enlace: enlaces[i] })));
    } catch (error) {
      if (idActual !== id) return;
      const sinConexion = !navigator.onLine || /fetch|network|abort|sin conexión/i.test(String(error && error.message));
      mostrarError(sinConexion ? 'Sin conexión. Revisá internet y probá de nuevo.' : 'No se pudo cargar el estudio. Probá de nuevo.');
      console.error('No se pudo cargar la ficha');
    }
  }

  function mostrarError(texto) {
    el.errorTexto.textContent = texto;
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
    el.cuerpo.replaceChildren();   // los datos del paciente no quedan en la pantalla
  }

  document.getElementById('ficha-volver').addEventListener('click', () => alVolver());
  document.getElementById('ficha-volver-lista').addEventListener('click', () => alVolver());
  document.getElementById('ficha-reintentar').addEventListener('click', () => { if (idActual) abrir(idActual); });

  return {
    abrir,
    cerrar,
    alVolverALaLista: (funcion) => { alVolver = funcion; },
    fechaHora,
  };
})();
