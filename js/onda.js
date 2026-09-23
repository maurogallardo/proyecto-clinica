// Onda de audio de la barra de voz (T015): barras verticales finas, estilo
// WhatsApp. Copia de las funciones de onda de LoMar (lomar-smart-pwa/js/app.js).
// Los colores se leen de css/tokens.css (--onda-...): acá no se escriben colores.

const ONDA_PASO = 3;            // distancia entre barras: 1 px de barra + 2 px de aire
const ONDA_GROSOR = 1;
const ONDA_ALTO_MINIMO = 2;     // las barras nunca desaparecen: en silencio queda una línea
const ONDA_INTERVALO_MS = 33;   // unas 30 muestras por segundo
const ONDA_SUAVIDAD = 0.25;     // para que las barras no salten de golpe

let muestrasOnda = [];          // todo lo grabado (sirve para dibujar la vista previa)
let ondaVisible = [];           // lo que se ve mientras se graba
let nivelesVistaPrevia = [];
let cuadroOnda = null;          // dibujo en curso (requestAnimationFrame)
let ondaEnPausa = false;

function lienzoOnda() {
  return document.getElementById('onda');
}

function colorDeToken(nombre) {
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
}

// El lienzo se mide en píxeles físicos (pantallas de alta densidad) pero se
// dibuja en píxeles de CSS: así las barras de 1 px salen nítidas.
function ajustarLienzo(lienzo) {
  const densidad = window.devicePixelRatio || 1;
  const ancho = Math.max(20, Math.round(lienzo.clientWidth || lienzo.anchoCss || 140));
  const alto = Math.max(12, Math.round(lienzo.clientHeight || lienzo.altoCss || 28));
  const anchoFisico = Math.round(ancho * densidad);
  const altoFisico = Math.round(alto * densidad);
  // Cambiar el tamaño borra el lienzo: solo se hace si cambió de verdad
  if (lienzo.width !== anchoFisico || lienzo.height !== altoFisico) {
    lienzo.width = anchoFisico;
    lienzo.height = altoFisico;
  }
  lienzo.anchoCss = ancho;
  lienzo.altoCss = alto;
}

function medidasLienzo(lienzo) {
  return {
    ancho: lienzo.anchoCss || Math.max(20, lienzo.clientWidth || 140),
    alto: lienzo.altoCss || Math.max(12, lienzo.clientHeight || 28),
  };
}

function cantidadBarras(lienzo) {
  return Math.max(1, Math.floor(medidasLienzo(lienzo).ancho / ONDA_PASO));
}

function dibujarBarras(lienzo, niveles, opciones = {}) {
  const pincel = lienzo.getContext('2d');
  const densidad = window.devicePixelRatio || 1;
  const { ancho, alto } = medidasLienzo(lienzo);

  pincel.setTransform(densidad, 0, 0, densidad, 0, 0);
  pincel.clearRect(0, 0, ancho, alto);

  const maximo = Math.max(1, Math.floor(ancho / ONDA_PASO));
  const visibles = niveles.length > maximo ? niveles.slice(-maximo) : niveles;
  const faltantes = Math.max(0, maximo - visibles.length);
  const altoUtil = Math.max(1, alto - ONDA_ALTO_MINIMO - 2);
  const centro = maximo / 2;
  // Grosor ajustado a los píxeles físicos, para que no quede borroso
  const grosor = Math.max(1, Math.round(ONDA_GROSOR * densidad)) / densidad;

  for (let i = 0; i < maximo; i++) {
    let nivel = i >= faltantes ? (visibles[i - faltantes] || 0) : 0;

    // "Respiración": las barras del medio reaccionan más que las de los bordes
    if (opciones.respiracion) {
      nivel *= 0.4 + 0.6 * (1 - Math.abs((i - centro) / centro));
    }

    let color = opciones.color;
    if (opciones.escuchadas !== undefined) {
      color = i < opciones.escuchadas ? opciones.colorEscuchada : opciones.colorSinEscuchar;
    }

    const altoBarra = ONDA_ALTO_MINIMO + nivel * altoUtil;
    const x = Math.round(i * ONDA_PASO * densidad) / densidad;
    pincel.fillStyle = color;
    pincel.fillRect(x, (alto - altoBarra) / 2, grosor, altoBarra);
  }
}

// Reparte todas las muestras grabadas en la cantidad de barras que entran
function remuestrear(muestras, cantidad) {
  if (cantidad <= 0) return [];
  if (muestras.length === 0) return new Array(cantidad).fill(0);
  const resultado = [];
  const tramo = muestras.length / cantidad;
  for (let i = 0; i < cantidad; i++) {
    const desde = Math.floor(i * tramo);
    const hasta = Math.max(desde + 1, Math.round((i + 1) * tramo));
    let suma = 0;
    let cuenta = 0;
    for (let j = desde; j < hasta && j < muestras.length; j++) {
      suma += muestras[j];
      cuenta++;
    }
    resultado.push(cuenta > 0 ? suma / cuenta : (muestras[Math.min(desde, muestras.length - 1)] || 0));
  }
  return resultado;
}

// Volumen de un pedacito de audio (0 = silencio)
function nivelDeVolumen(datos) {
  let sumaCuadrados = 0;
  for (let i = 0; i < datos.length; i++) {
    const valor = (datos[i] - 128) / 128;
    sumaCuadrados += valor * valor;
  }
  return Math.sqrt(sumaCuadrados / datos.length);
}

function reiniciarOnda() {
  muestrasOnda = [];
  ondaVisible = [];
  nivelesVistaPrevia = [];
}

// En reposo: una línea de base tenue
function dibujarOndaReposo() {
  const lienzo = lienzoOnda();
  ajustarLienzo(lienzo);
  dibujarBarras(lienzo, new Array(cantidadBarras(lienzo)).fill(0), { color: colorDeToken('--onda-reposo') });
}

// Mientras se graba: la onda se mueve con la voz
function iniciarBucleOnda(analizador) {
  const lienzo = lienzoOnda();
  const color = colorDeToken('--onda-grabando');
  ondaEnPausa = false;
  ondaVisible = [];

  if (!analizador) {
    dibujarBarras(lienzo, [], { color });
    return;
  }

  const datos = new Uint8Array(analizador.fftSize);
  let ultimaMuestra = 0;

  const dibujarCuadro = (momento) => {
    cuadroOnda = requestAnimationFrame(dibujarCuadro);
    if (ondaEnPausa) return;

    // Se vuelve a medir cada cuadro: el lienzo se ensancha mientras el clip y
    // la cámara se esconden
    ajustarLienzo(lienzo);
    const maximo = cantidadBarras(lienzo);

    if (momento - ultimaMuestra >= ONDA_INTERVALO_MS) {
      ultimaMuestra = momento;
      analizador.getByteTimeDomainData(datos);
      muestrasOnda.push(Math.min(1, nivelDeVolumen(datos) * 3.5));
      ondaVisible.push(0);
      if (ondaVisible.length > maximo) ondaVisible = ondaVisible.slice(-maximo);
    }

    const objetivos = muestrasOnda.slice(-maximo);
    for (let i = 0; i < ondaVisible.length; i++) {
      if (objetivos[i] !== undefined) ondaVisible[i] += (objetivos[i] - ondaVisible[i]) * ONDA_SUAVIDAD;
    }
    dibujarBarras(lienzo, ondaVisible, { color, respiracion: true });
  };
  cuadroOnda = requestAnimationFrame(dibujarCuadro);
}

function pausarBucleOnda() { ondaEnPausa = true; }
function reanudarBucleOnda() { ondaEnPausa = false; }

function detenerBucleOnda() {
  if (cuadroOnda) {
    cancelAnimationFrame(cuadroOnda);
    cuadroOnda = null;
  }
  dibujarOndaReposo();
}

// Vista previa: toda la grabación en el ancho disponible; lo ya escuchado, más fuerte
function prepararOndaVistaPrevia() {
  const lienzo = lienzoOnda();
  ajustarLienzo(lienzo);
  nivelesVistaPrevia = remuestrear(muestrasOnda, cantidadBarras(lienzo));
  dibujarOndaVistaPrevia(0);
}

function dibujarOndaVistaPrevia(proporcionEscuchada) {
  const lienzo = lienzoOnda();
  ajustarLienzo(lienzo);
  const maximo = cantidadBarras(lienzo);
  // Si cambió el ancho (por ejemplo, al girar el teléfono), se reparte de nuevo
  if (nivelesVistaPrevia.length !== maximo) nivelesVistaPrevia = remuestrear(muestrasOnda, maximo);
  dibujarBarras(lienzo, nivelesVistaPrevia, {
    escuchadas: Math.round(maximo * proporcionEscuchada),
    colorEscuchada: colorDeToken('--onda-escuchada'),
    colorSinEscuchar: colorDeToken('--onda-sin-escuchar'),
  });
}
