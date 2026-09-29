// Hojas de fotos del PDF (T033), iguales para cualquier estudio: van a partir de
// la hoja 2, solo si el estudio tiene fotos. Son las mismas fotos que muestra la
// ficha en "Fotos del electro", en el mismo orden (por fecha de carga).
//
// Regla por hileras (en el orden de carga):
//   1) Una hilera pone fotos una al lado de la otra: todas con la MISMA altura, y
//      entre todas llenan el ancho útil de la hoja.
//   2) Se agregan fotos a la hilera mientras la altura que queda sea de al menos
//      "alturaMinimaMm". Si con una foto más quedaría más baja, la hilera se
//      cierra y esa foto arranca otra.
//   3) Una foto que queda sola en su hilera se agranda hasta "alturaMaximaMm" (y
//      se centra si no llena el ancho).
//   4) Las hileras se apilan; si la que sigue no entra en la hoja, va a otra.
// Las fotos nunca se recortan ni se deforman: se respeta su proporción real (ya
// giradas como se sacaron).
//
// Los números están juntos acá para ajustarlos después de imprimir en la Epson.

const FOTOS_PDF = {
  alturaMinimaMm: 80,    // una hilera no baja de esta altura
  alturaMaximaMm: 120,   // una foto sola no pasa de esta altura
  separacionMm: 4,       // entre fotos y entre hileras
  margenMm: 12,          // alrededor de la hoja (la impresora no llega al borde)
  ladoMaximoPx: 2000,    // las fotos se achican a este lado largo (el PDF no pesa de más)
  calidadJpeg: 0.9,
  tiempoMaximoMs: 30000, // por foto
};

const FotosPdf = (() => {
  const HOJA = { ancho: 210, alto: 297 };
  const ALTO_ENCABEZADO = 6;   // la línea chica de arriba y un poco de aire

  // --- Traer las fotos --------------------------------------------------------------

  // Una foto: la baja con un enlace que sirva ahora (si el viejo venció, pide otro
  // una vez), la gira como se sacó, la achica y la pasa a JPEG
  async function prepararUna(ruta) {
    let blob = null;
    for (const renovar of [false, true]) {
      const url = await Enlaces.vigente(FOTOS.deposito, ruta, FOTOS.enlaceSegundos, { renovar });
      if (!url) continue;
      const cortar = new AbortController();
      const reloj = setTimeout(() => cortar.abort(), FOTOS_PDF.tiempoMaximoMs);
      try {
        const respuesta = await fetch(url, { signal: cortar.signal });
        if (respuesta.ok) { blob = await respuesta.blob(); break; }
      } catch {
        // se prueba una vez más con un enlace nuevo
      } finally {
        clearTimeout(reloj);
      }
    }
    if (!blob) throw new ErrorPdf('foto');

    let imagen;
    try {
      imagen = await createImageBitmap(blob, { imageOrientation: 'from-image' });
    } catch {
      throw new ErrorPdf('foto');
    }
    const escala = Math.min(1, FOTOS_PDF.ladoMaximoPx / Math.max(imagen.width, imagen.height));
    const ancho = Math.max(1, Math.round(imagen.width * escala));
    const alto = Math.max(1, Math.round(imagen.height * escala));
    const lienzo = document.createElement('canvas');
    lienzo.width = ancho;
    lienzo.height = alto;
    const contexto = lienzo.getContext('2d');
    contexto.fillStyle = '#FFFFFF';   // el JPEG no tiene transparencia
    contexto.fillRect(0, 0, ancho, alto);
    contexto.drawImage(imagen, 0, 0, ancho, alto);
    imagen.close();
    const jpeg = await new Promise((resolver) => lienzo.toBlob(resolver, 'image/jpeg', FOTOS_PDF.calidadJpeg));
    lienzo.width = 0;   // libera la memoria del lienzo
    if (!jpeg) throw new ErrorPdf('foto');
    return { datos: new Uint8Array(await jpeg.arrayBuffer()), ancho, alto };
  }

  // Todas, en el orden en que vienen. Si una no se puede bajar, no se arma nada
  // (un PDF sin una foto parecería completo y no lo sería).
  async function preparar(fotos) {
    const listas = [];
    for (const foto of fotos) listas.push(await prepararUna(foto.ruta_archivo));
    return listas;
  }

  // --- La regla de las hileras (sin dibujar: solo calcula dónde va cada foto) ----------

  // proporciones: ancho / alto de cada foto. Devuelve las hojas, cada una con sus
  // fotos: { indice, x, y, ancho, alto } en milímetros.
  function ubicar(proporciones, config = FOTOS_PDF) {
    const anchoUtil = HOJA.ancho - 2 * config.margenMm;
    const arriba = config.margenMm + ALTO_ENCABEZADO;
    const abajo = HOJA.alto - config.margenMm;
    const altoUtil = abajo - arriba;
    const alturaDe = (grupo) => (anchoUtil - config.separacionMm * (grupo.length - 1))
      / grupo.reduce((suma, i) => suma + proporciones[i], 0);

    // 1) y 2) Las hileras
    const hileras = [];
    let actual = [];
    proporciones.forEach((_, i) => {
      if (actual.length > 0 && alturaDe([...actual, i]) < config.alturaMinimaMm) {
        hileras.push(actual);
        actual = [];
      }
      actual.push(i);
    });
    if (actual.length > 0) hileras.push(actual);

    // 3) La altura de cada hilera (y que nunca sea más alta que la hoja)
    const medidas = hileras.map((grupo) => {
      let alto = alturaDe(grupo);
      if (grupo.length === 1) alto = Math.min(alto, config.alturaMaximaMm);
      alto = Math.min(alto, altoUtil);
      const anchos = grupo.map((i) => proporciones[i] * alto);
      const anchoTotal = anchos.reduce((a, b) => a + b, 0) + config.separacionMm * (grupo.length - 1);
      return { grupo, alto, anchos, anchoTotal };
    });

    // 4) Apilar, pasando a otra hoja cuando no entra
    const hojas = [];
    let hoja = [];
    let y = arriba;
    medidas.forEach(({ grupo, alto, anchos, anchoTotal }) => {
      if (hoja.length > 0 && y + alto > abajo + 0.01) {
        hojas.push(hoja);
        hoja = [];
        y = arriba;
      }
      let x = config.margenMm + (anchoUtil - anchoTotal) / 2;   // centrada si no llena el ancho
      grupo.forEach((indice, k) => {
        hoja.push({ indice, x, y, ancho: anchos[k], alto });
        x += anchos[k] + config.separacionMm;
      });
      y += alto + config.separacionMm;
    });
    if (hoja.length > 0) hojas.push(hoja);
    return hojas;
  }

  // --- Dibujar ------------------------------------------------------------------------

  // encabezado: "Estudio N° X · Paciente" (va arriba de cada hoja de fotos)
  function dibujar(doc, fotos, encabezado) {
    const hojas = ubicar(fotos.map((f) => f.ancho / f.alto));
    hojas.forEach((hoja) => {
      doc.addPage('a4', 'portrait');
      HerramientasPdf.encabezadoChico(doc, `${encabezado} · Fotos del electro`, FOTOS_PDF.margenMm);
      hoja.forEach(({ indice, x, y, ancho, alto }) => {
        doc.addImage(fotos[indice].datos, 'JPEG', x, y, ancho, alto, `foto-${indice}`, 'NONE');
      });
    });
    return hojas.length;
  }

  return { preparar, ubicar, dibujar };
})();
