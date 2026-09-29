// Herramientas del PDF (T033), las mismas para cualquier estudio.
//
// - Cargan jsPDF, las fuentes y los logos SOLO cuando se toca "Imprimir" o
//   "Descargar PDF" (no en el celular ni al abrir la app). jsPDF y las fuentes
//   vienen de jsdelivr con versión fija y "huella digital" (integrity), como
//   supabase-js: si el archivo que llega no es exactamente ese, no se usa.
// - Lo cargado queda en memoria mientras la pestaña está abierta. NO se guarda
//   nada en el navegador (ni localStorage, ni sessionStorage, ni caché propia).
// - Fuentes: Arimo (misma medida que Arial) y Tinos (misma medida que Times New
//   Roman), libres (licencia Apache 2.0). Se incrustan en el PDF porque las
//   fuentes estándar de los PDF no tienen, por ejemplo, ≥ ≤ →: así cada carácter
//   se ve tal cual. Si alguno no está en la fuente, el PDF no se arma y se avisa
//   (nunca se cambia un carácter en silencio).

const PDF_RECURSOS = {
  jspdf: {
    url: 'https://cdn.jsdelivr.net/npm/jspdf@4.2.1/dist/jspdf.umd.min.js',
    integrity: 'sha384-qovJwSBbRDPP5cEjCp8S0UP66wrvnjaa60XMOGzTNanrThcrGfXfnZkvgY8N1KT3',
  },
  fuentes: [
    { familia: 'Arimo', estilo: 'normal', archivo: 'Arimo-Regular.ttf',
      url: 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/arimo@0.4.3/400Regular/Arimo_400Regular.ttf',
      integrity: 'sha384-cHgouPgjXHKEOSNRjpHh2tXcVMH4UGugArbYamYqlxUvaiBJES9libLcLU0vUgZd' },
    { familia: 'Arimo', estilo: 'italic', archivo: 'Arimo-Italic.ttf',
      url: 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/arimo@0.4.3/400Regular_Italic/Arimo_400Regular_Italic.ttf',
      integrity: 'sha384-ZPVvFYxjAp9F3Pg2FJp6Ex6VfcWG71AyoyhxdzVfnVcwwFXL+AvGKkm9MEgn8PL1' },
    { familia: 'Arimo', estilo: 'bold', archivo: 'Arimo-Bold.ttf',
      url: 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/arimo@0.4.3/700Bold/Arimo_700Bold.ttf',
      integrity: 'sha384-9a/9rCESWKmmcbyjNR5cnpoBLSgs/ZvzKmsJlucmNCWOEA0gBCA9vNTDienWervG' },
    { familia: 'Tinos', estilo: 'normal', archivo: 'Tinos-Regular.ttf',
      url: 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/tinos@0.4.2/400Regular/Tinos_400Regular.ttf',
      integrity: 'sha384-M7MBSeVSiFWnf9hkKBt2EinuFIAi6h6Xm7D6fmSz4vH1cT0fd8HPi4xHHK4vfZmu' },
    { familia: 'Tinos', estilo: 'bold', archivo: 'Tinos-Bold.ttf',
      url: 'https://cdn.jsdelivr.net/npm/@expo-google-fonts/tinos@0.4.2/700Bold/Tinos_700Bold.ttf',
      integrity: 'sha384-GT5OOQCZ4cGqOEjlIy/BGexsb1bsRuxH9Y/WsDQBV/4PWZ+DKUN9rGWLcy/mGbH1' },
  ],
  // Los logos, ya pasados a PNG (jsPDF no dibuja SVG): el completo para el
  // encabezado y el isologo para la marca de agua
  logos: {
    completo: 'assets/logos/logo-completo-impresion.png',
    isologo: 'assets/logos/isologo-impresion.png',
  },
  tiempoMaximoMs: 30000,
};

// Un problema al armar el PDF, con su "tipo" para mostrar el aviso en criollo
class ErrorPdf extends Error {
  constructor(tipo, detalle = '') {
    super(tipo);
    this.tipo = tipo;         // 'recursos' | 'foto' | 'caracter' | 'tiempo' | 'ventana'
    this.detalle = detalle;   // p. ej. el carácter que no se puede poner (nunca datos del paciente)
  }
}

const HerramientasPdf = (() => {
  let cargando = null;   // la carga de todo, una sola vez (si falla, se puede reintentar)

  // jsPDF con su <script>, versión fija e integrity
  function cargarJsPdf() {
    if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve();
    return new Promise((resolver, rechazar) => {
      const script = document.createElement('script');
      script.src = PDF_RECURSOS.jspdf.url;
      script.integrity = PDF_RECURSOS.jspdf.integrity;
      script.crossOrigin = 'anonymous';
      script.onload = () => resolver();
      script.onerror = () => { script.remove(); rechazar(new ErrorPdf('recursos')); };
      document.head.appendChild(script);
    });
  }

  // Un archivo, con tiempo máximo (y con integrity si viene de afuera)
  async function traer(url, integrity) {
    const cortar = new AbortController();
    const reloj = setTimeout(() => cortar.abort(), PDF_RECURSOS.tiempoMaximoMs);
    try {
      const respuesta = await fetch(url, integrity ? { integrity, mode: 'cors', signal: cortar.signal } : { signal: cortar.signal });
      if (!respuesta.ok) throw new Error(`estado ${respuesta.status}`);
      return await respuesta.arrayBuffer();
    } catch {
      throw new ErrorPdf('recursos');
    } finally {
      clearTimeout(reloj);
    }
  }

  // jsPDF recibe las fuentes en base64
  function aBase64(buffer) {
    return new Promise((resolver, rechazar) => {
      const lector = new FileReader();
      lector.onload = () => resolver(String(lector.result).split(',')[1]);
      lector.onerror = () => rechazar(new ErrorPdf('recursos'));
      lector.readAsDataURL(new Blob([buffer]));
    });
  }

  // Ancho y alto de un PNG (vienen escritos en su encabezado)
  function medidasPng(bytes) {
    const vista = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { ancho: vista.getUint32(16), alto: vista.getUint32(20) };
  }

  async function cargarTodo() {
    const [, fuentes, completo, isologo] = await Promise.all([
      cargarJsPdf(),
      Promise.all(PDF_RECURSOS.fuentes.map(async (f) => ({ ...f, base64: await aBase64(await traer(f.url, f.integrity)) }))),
      traer(PDF_RECURSOS.logos.completo),
      traer(PDF_RECURSOS.logos.isologo),
    ]);
    const logo = (buffer) => { const datos = new Uint8Array(buffer); return { datos, ...medidasPng(datos) }; };
    return { fuentes, logos: { completo: logo(completo), isologo: logo(isologo) } };
  }

  // Todo lo necesario para armar un PDF (la primera vez lo baja; después, ya está)
  function preparar() {
    if (!cargando) cargando = cargarTodo().catch((error) => { cargando = null; throw error; });
    return cargando;
  }

  // Un documento A4 vertical, en milímetros, con las fuentes incrustadas
  function nuevoDocumento(recursos) {
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    recursos.fuentes.forEach((f) => {
      doc.addFileToVFS(f.archivo, f.base64);
      doc.addFont(f.archivo, f.familia, f.estilo);
    });
    doc.setFont('Arimo', 'normal');
    doc.setTextColor(0, 0, 0);
    return doc;
  }

  // ¿Algún carácter del texto no está en la fuente? Devuelve el primero que falta
  // (o null). Los saltos de línea y los espacios no se dibujan: no cuentan.
  function caracterQueFalta(doc, familia, estilo, texto) {
    const fuente = doc.internal.getFont(familia, estilo);
    const glifos = fuente && fuente.metadata;
    if (!glifos || typeof glifos.characterToGlyph !== 'function') return null;
    for (const caracter of String(texto)) {
      if (/\s/.test(caracter)) continue;
      if (!glifos.characterToGlyph(caracter.codePointAt(0))) return caracter;
    }
    return null;
  }

  // Controla todos los textos antes de dibujar: si falta un carácter, no se arma
  function controlarCaracteres(doc, textos) {
    const fuentes = PDF_RECURSOS.fuentes.map((f) => [f.familia, f.estilo]);
    textos.forEach((texto) => {
      fuentes.forEach(([familia, estilo]) => {
        const falta = caracterQueFalta(doc, familia, estilo, texto);
        if (falta) throw new ErrorPdf('caracter', falta);
      });
    });
  }

  // --- Texto ----------------------------------------------------------------------

  const ptAMm = (pt) => pt * 25.4 / 72;

  // Parte un texto en renglones para que entre en un ancho (en mm), con la fuente y
  // el tamaño que tenga el documento en ese momento. El primer renglón puede ser más
  // corto (el que empieza después del rótulo). Respeta los saltos de línea del texto
  // y nunca pierde nada: una palabra más larga que el renglón se corta en pedazos.
  function partirEnRenglones(doc, texto, anchoPrimero, anchoResto = anchoPrimero) {
    const renglones = [];
    const ancho = () => (renglones.length === 0 ? anchoPrimero : anchoResto);
    const mide = (t) => doc.getTextWidth(t);
    String(texto).replace(/\r\n?/g, '\n').replace(/\t/g, ' ').split('\n').forEach((parrafo) => {
      let actual = '';
      parrafo.split(' ').forEach((palabra, i) => {
        const conEspacio = i === 0 ? palabra : ` ${palabra}`;
        if (mide(actual + conEspacio) <= ancho()) { actual += conEspacio; return; }
        if (actual !== '') { renglones.push(actual); actual = ''; }
        // La palabra sola, en pedazos si hace falta
        let resto = palabra;
        while (mide(resto) > ancho()) {
          let corte = resto.length - 1;
          while (corte > 1 && mide(resto.slice(0, corte)) > ancho()) corte--;
          renglones.push(resto.slice(0, corte));
          resto = resto.slice(corte);
        }
        actual = resto;
      });
      renglones.push(actual);
    });
    // Sin renglones vacíos al final (un texto vacío da cero renglones)
    while (renglones.length && renglones[renglones.length - 1].trim() === '') renglones.pop();
    return renglones;
  }

  // Renglón de puntos, como en el papel (el dato se escribe encima)
  function renglonDePuntos(doc, x1, x2, yBase) {
    if (x2 - x1 < 1) return;
    doc.setDrawColor(90, 90, 90);
    doc.setLineWidth(0.28);
    doc.setLineCap('round');
    doc.setLineDashPattern([0.01, 0.95], 0);
    doc.line(x1, yBase + 0.35, x2, yBase + 0.35);
    doc.setLineDashPattern([], 0);
    doc.setLineCap('butt');
    doc.setDrawColor(0, 0, 0);
  }

  // Tamaño de letra para que un texto entre en un ancho (sin pasarse de "maximo")
  function tamanoParaAncho(doc, texto, ancho, maximo) {
    const actual = doc.getFontSize();
    doc.setFontSize(maximo);
    const w = doc.getTextWidth(texto);
    doc.setFontSize(actual);
    return w <= ancho ? maximo : maximo * ancho / w;
  }

  // --- Formatos (iguales a los de la ficha) ------------------------------------------

  function fecha(valor) {
    const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(valor));
    return partes ? `${partes[3]}/${partes[2]}/${partes[1]}` : String(valor);
  }

  // El texto de un valor según su tipo: fecha dd/mm/aaaa, decimales con coma; lo
  // vacío queda vacío (nunca se completa nada)
  function textoDeValor(valor, tipo) {
    if (valor === null || valor === undefined || String(valor).trim() === '') return '';
    if (tipo === 'fecha') return fecha(valor);
    if (tipo === 'decimal' && typeof valor === 'number') return String(valor).replace('.', ',');
    return String(valor).trim();
  }

  // Una línea chica arriba de las hojas que no son la 1: "Estudio N° X · Paciente"
  function encabezadoChico(doc, texto, margen) {
    doc.setFont('Arimo', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(70, 70, 70);
    const renglones = partirEnRenglones(doc, texto, 210 - 2 * margen);
    renglones.forEach((r, i) => doc.text(r, margen, margen + 3 + i * 4));
    doc.setTextColor(0, 0, 0);
    return margen + 3 + (renglones.length - 1) * 4;   // dónde quedó la última línea
  }

  return {
    preparar, nuevoDocumento, controlarCaracteres, partirEnRenglones, renglonDePuntos,
    tamanoParaAncho, textoDeValor, encabezadoChico, ptAMm,
  };
})();
