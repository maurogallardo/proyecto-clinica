// Armado del PDF de un estudio (T033): UN único PDF, que usan "Imprimir" y
// "Descargar PDF". Se arma en la computadora con los mismos datos que muestra la
// ficha (estudio, etapas y fotos, en el mismo orden) y NO se guarda en ningún
// lado: ni en Supabase, ni en el navegador. Vive en memoria mientras se usa.
//
//   hoja 1            -> la planilla del estudio (js/planillas/ergometrico-hoja.js)
//   continuación      -> solo si un texto largo no entró en la hoja 1
//   hojas de fotos    -> solo si tiene fotos (js/pdf/hojas-fotos.js)
//
// "Descargar PDF" lo guarda en Descargas. "Imprimir" lo abre en otra pestaña (la
// pestaña se abre en el mismo momento del clic, para que el navegador no la
// bloquee) con la orden de imprimir adentro: Chrome, Edge y Firefox muestran solos
// la ventana de impresión; si alguno no lo hace, en esa pestaña está el botón de
// imprimir. Se imprime al 100 % (el PDF lo pide así).

const PDF_ARMADO = { tiempoMaximoMs: 120000, duracionEnlaceMs: 120000 };

// La hoja 1 de cada tipo de estudio (para sumar otro estudio, se agrega acá)
const HOJAS_PDF = {
  ergometrico: () => HOJA_ERGOMETRICO,
};

const Pdf = (() => {
  const ventanasAbiertas = new Set();   // las pestañas de imprimir (se cierran al cerrar sesión)

  // "Carlos Méndez" -> "Carlos-Mendez": tal cual está cargado, sin acentos, con
  // guiones entre palabras y sin caracteres que no sirven en un nombre de archivo
  function limpiarParaArchivo(texto) {
    return String(texto ?? '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^A-Za-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Ergometrico-<número>-<nombre del paciente>-<AAAA-MM-DD>.pdf (la fecha del estudio)
  function nombreDeArchivo(estudio) {
    const partes = ['Ergometrico', String(estudio.numero ?? 'sin-numero'), limpiarParaArchivo(estudio.nombre_paciente) || 'sin-nombre'];
    const fecha = /^(\d{4}-\d{2}-\d{2})/.exec(String(estudio.fecha_estudio ?? ''));
    partes.push(fecha ? fecha[1] : 'sin-fecha');
    return `${partes.join('-')}.pdf`;
  }

  const encabezadoDe = (estudio) => `Estudio N° ${estudio.numero ?? '—'} · ${String(estudio.nombre_paciente ?? '').trim()}`;

  function conTiempoMaximo(promesa, ms) {
    let reloj;
    const vence = new Promise((_, rechazar) => { reloj = setTimeout(() => rechazar(new ErrorPdf('tiempo')), ms); });
    return Promise.race([promesa, vence]).finally(() => clearTimeout(reloj));
  }

  // El PDF, como archivo en memoria (Blob)
  //   estudio: la fila del estudio con sus etapas (como en la ficha)
  //   fotos:   las fotos del electro en el orden de la ficha ({ ruta_archivo })
  async function armar(estudio, fotos, { paraImprimir = false, tipo = 'ergometrico' } = {}) {
    return conTiempoMaximo((async () => {
      const recursos = await HerramientasPdf.preparar();
      // Primero TODAS las fotos: si alguna no se puede bajar, no se arma nada
      const listas = fotos.length ? await FotosPdf.preparar(fotos) : [];
      const doc = HerramientasPdf.nuevoDocumento(recursos);
      const encabezado = encabezadoDe(estudio);
      doc.setDocumentProperties({ title: nombreDeArchivo(estudio).replace(/\.pdf$/, ''), creator: 'Sanatorio de la Cañada' });
      doc.viewerPreferences({ PrintScaling: 'None' });   // al 100 %, sin "ajustar a la página"
      const hoja = HOJAS_PDF[tipo]().dibujar(doc, estudio, recursos, encabezado);
      const hojasDeFotos = listas.length ? FotosPdf.dibujar(doc, listas, encabezado) : 0;
      if (paraImprimir) doc.autoPrint();
      const blob = doc.output('blob');
      return { blob, nombre: nombreDeArchivo(estudio), hoja, hojasDeFotos, paginas: doc.getNumberOfPages() };
    })(), PDF_ARMADO.tiempoMaximoMs);
  }

  // "Descargar PDF": lo guarda en Descargas con su nombre
  function descargar(blob, nombre) {
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    enlace.hidden = true;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), PDF_ARMADO.duracionEnlaceMs);
  }

  // "Imprimir", paso 1 (en el mismo clic): la pestaña, con un "Armando el PDF…"
  // (sin datos del paciente). Devuelve null si el navegador la bloqueó.
  function abrirPestanaDeEspera() {
    const ventana = window.open('', '_blank');
    if (!ventana) return null;
    try {
      ventana.document.title = 'Armando el PDF…';
      ventana.document.body.style.cssText = 'font-family: system-ui, sans-serif; color: #333; padding: 32px;';
      ventana.document.body.textContent = 'Armando el PDF…';
    } catch { /* si no se puede escribir, igual sirve */ }
    ventanasAbiertas.add(ventana);
    return ventana;
  }

  // "Imprimir", paso 2: el PDF en esa pestaña
  function mostrarEnPestana(ventana, blob) {
    const url = URL.createObjectURL(blob);
    ventana.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), PDF_ARMADO.duracionEnlaceMs);
  }

  function cerrarPestana(ventana) {
    if (!ventana) return;
    ventanasAbiertas.delete(ventana);
    try { if (!ventana.closed) ventana.close(); } catch { /* ya no está */ }
  }

  // Al cerrar sesión: afuera las pestañas de imprimir que abrió la app
  function cerrarTodo() {
    [...ventanasAbiertas].forEach(cerrarPestana);
  }

  // El aviso en criollo de cada problema (sin detalles técnicos ni datos del paciente)
  function mensajeDeError(error) {
    const tipo = error && error.tipo;
    if (tipo === 'foto') return 'No se pudo cargar una de las fotos. Probá de nuevo.';
    if (tipo === 'caracter') return `El estudio tiene un símbolo que no se puede poner en el PDF ("${error.detalle}"). Cambialo con "Editar" y probá de nuevo.`;
    if (tipo === 'tiempo') return 'Armar el PDF tardó demasiado. Revisá la conexión y probá de nuevo.';
    if (tipo === 'ventana') return 'El navegador no dejó abrir la pestaña para imprimir. Permití las ventanas emergentes de esta página y probá de nuevo.';
    if (tipo === 'recursos' || !navigator.onLine) return 'No se pudo preparar el PDF. Revisá la conexión y probá de nuevo.';
    return 'No se pudo armar el PDF. Probá de nuevo.';
  }

  return { armar, descargar, abrirPestanaDeEspera, mostrarEnPestana, cerrarPestana, cerrarTodo, nombreDeArchivo, mensajeDeError };
})();
