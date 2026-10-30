// La GRILLA DE HORARIOS dictada (Formulario N° 5): las indicaciones médicas (C.S.V.,
// Tomografía, Electrocardiograma, Laboratorio y Medicación), renglón por renglón.
//
// El modelo SOLO COPIA lo dicho: por cada renglón, su texto, el "cada N horas", el
// "desde" y las horas dichas una por una, copiadas tal cual de la transcripción.
// Nunca marca cruces ni calcula horarios: las cruces las calcula la app con reglas
// fijas (js/grilla-calculo.js). Acá, el código (sin IA) revisa lo que propuso:
//   - el texto del renglón tiene que haberse dicho (palabras y cifras, como los
//     demás textos de la planilla); si no, el renglón se descarta;
//   - el número del "cada" tiene que haberse dicho justo después de "cada";
//   - cada hora ("desde" y las sueltas) tiene que estar, tal cual, en lo
//     transcripto; el código la lee con reglas fijas y decide si es AMBIGUA (de 1 a
//     12 sin "de la mañana", "de la tarde", "de la noche" o "de la madrugada"; o las
//     5 y las 6 "de la noche"), mirando lo dictado y no lo que diga el modelo;
//   - si algo del horario no se pudo comprobar o leer, el renglón llega con
//     "ilegible": la app no marca nada y avisa "marcá las cruces a mano".
// Devuelve, por renglón: { texto, cada, desde, horas, ambigua, ilegible }, con las
// horas en hora de 24 ("8", "7:30", "20", "24").
import { type CifrasDichas, numerosDichos, seDijoElNumero } from './cifras.ts';

// Lo que manda la app: la columna de la grilla y sus indicaciones (las de
// js/planillas/<planilla>.js), con su tope de renglones
export type Grilla = { columna: string; indicaciones: { clave: string; etiqueta: string; maximo: number }[] };
export type RenglonDictado = { texto: string; cada: number | null; desde: string | null; horas: string[] | null; ambigua: boolean; ilegible: boolean };

const NOMBRE = /^[a-z][a-z0-9_]{0,39}$/;
const RENGLONES_COMO_MUCHO = 20;   // por indicación, en una grabación (la app aplica el tope de cada una)
const LARGO_MAXIMO_RENGLON = 500;

export function grillaValida(grilla: unknown): grilla is Grilla {
  const g = grilla as Grilla;
  return !!g && typeof g === 'object' && typeof g.columna === 'string' && NOMBRE.test(g.columna)
    && Array.isArray(g.indicaciones) && g.indicaciones.length > 0 && g.indicaciones.length <= 10
    && g.indicaciones.every((i) => i && typeof i.clave === 'string' && NOMBRE.test(i.clave)
      && typeof i.etiqueta === 'string' && i.etiqueta.length <= 80 && Number.isInteger(i.maximo) && i.maximo >= 1 && i.maximo <= 20)
    && new Set(g.indicaciones.map((i) => i.clave)).size === g.indicaciones.length;
}

// --- Formato estricto que tiene que devolver el modelo ------------------------------------

export function esquemaDeGrilla(grilla: Grilla) {
  const renglon = {
    type: 'object',
    additionalProperties: false,
    required: ['texto', 'cada', 'desde', 'horas'],
    properties: {
      texto: { type: ['string', 'null'], description: 'La indicación tal cual se dicta' },
      cada: { type: ['number', 'null'], description: '"Cada N horas": el número N; si no se dice, null' },
      desde: { type: ['string', 'null'], description: 'Desde qué hora, copiado tal cual de la transcripción; si no se dice, null' },
      horas: { type: 'array', items: { type: 'string' }, description: 'Las horas dichas una por una, cada una copiada tal cual de la transcripción; si no, vacío' },
    },
  };
  const propiedades: Record<string, unknown> = {};
  grilla.indicaciones.forEach((i) => { propiedades[i.clave] = { type: 'array', description: i.etiqueta, items: renglon }; });
  return { type: 'object', additionalProperties: false, required: Object.keys(propiedades), properties: propiedades };
}

// --- Leer lo dictado igual en el texto y en lo que copió el modelo -------------------------

function sinAcentos(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Para comparar: sin acentos, en minúscula, "7.30" y "7,30" como "7:30", y todo lo
// que no es letra, número o ":" como un espacio; con un espacio a cada lado (así
// "8" no se encuentra adentro de "18")
function normalizado(texto: string): string {
  const t = sinAcentos(texto).replace(/(\d)[.,:](\d\d)(?!\d)/g, '$1:$2').replace(/[^a-zñ0-9:]+/g, ' ').trim();
  return ` ${t} `;
}

// Las palabras de lo dictado, leídas igual que en numerosDichos (cifras.ts)
function palabrasDe(texto: string): string[] {
  return (sinAcentos(texto).match(/\d+|[a-zñ]+|[,.;:]/g) ?? []).filter((p) => !/^[,.;:]$/.test(p));
}

// --- Leer una hora dictada, con reglas fijas ------------------------------------------------

// Palabras de relleno: adelante ("desde las", "a la") y atrás ("hs", "horas"). Solo
// ahí: "8 y las 20" son dos horas, no las 8:20
const RELLENO_ADELANTE = /^(?:(?:desde|a|las|la|el)\s+)+/;
const RELLENO_ATRAS = /\s+(?:hs|h|hrs|horas|hora)$/;

// Un pedacito de la transcripción con UNA hora ("las 8 de la mañana", "20", "siete y
// media de la tarde", "22:30", "medianoche") -> { minutos (desde las 0), ambigua }.
// null si no es una hora clara (dos horas, palabras de más, minutos imposibles).
//   - "de la tarde": de 1 a 11 suma 12; "de la noche": de 7 a 11 suma 12, las 12 son
//     las 24, de 1 a 4 quedan igual y las 5 y las 6 son ambiguas; "de la mañana" y
//     "de la madrugada" no cambian la hora (las 12 "de la madrugada" son las 24).
//   - Sin aclaración: de 1 a 12 es ambigua; de 13 a 24, no.
//   - "mediodía" son las 12; "medianoche", las 24.
export function leerHora(fragmento: string): { minutos: number; ambigua: boolean } | null {
  let t = normalizado(fragmento).trim();
  let aclaracion: string | null = null;
  const conAclaracion = /\bde la (manana|tarde|noche|madrugada)\b|\bdel (mediodia)\b/.exec(t);
  if (conAclaracion) {
    aclaracion = conAclaracion[1] ?? conAclaracion[2];
    t = t.replace(conAclaracion[0], ' ');
  }
  t = t.replace(/\s+/g, ' ').trim().replace(RELLENO_ADELANTE, '').replace(RELLENO_ATRAS, '').trim();
  if (aclaracion === null && t === 'mediodia') return { minutos: 12 * 60, ambigua: false };
  if (aclaracion === null && t === 'medianoche') return { minutos: 24 * 60, ambigua: false };

  // Los minutos dichos con palabras ("y media", "y cuarto"); los demás, con números
  let minutos: number | null = null;
  const conPalabras = / y (media|cuarto)$/.exec(t);
  if (conPalabras) {
    minutos = conPalabras[1] === 'media' ? 30 : 15;
    t = t.slice(0, -conPalabras[0].length).trim();
  }
  let hora: number;
  const dosPuntos = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (dosPuntos) {
    if (minutos !== null) return null;
    hora = Number(dosPuntos[1]);
    minutos = Number(dosPuntos[2]);
  } else {
    // Solo números (y una "y" entre la hora y los minutos): "ocho", "7 y 30"
    const palabras = t.split(' ').filter(Boolean);
    const numeros = numerosDichos(t);
    const cubiertas = new Set(numeros.flatMap((n) => Array.from({ length: n.hasta - n.desde + 1 }, (_, k) => n.desde + k)));
    if (numeros.length === 1 && cubiertas.size === palabras.length) {
      hora = Number(numeros[0].cifras);
    } else if (numeros.length === 2 && minutos === null && cubiertas.size === palabras.length - 1
        && palabras[numeros[0].hasta + 1] === 'y' && numeros[1].desde === numeros[0].hasta + 2) {
      hora = Number(numeros[0].cifras);
      minutos = Number(numeros[1].cifras);
    } else {
      return null;
    }
  }
  minutos ??= 0;
  if (!Number.isInteger(hora) || hora > 24 || minutos > 59 || (hora === 24 && minutos > 0)) return null;

  const en = (h: number) => ({ minutos: h * 60 + minutos!, ambigua: false });
  if (aclaracion === 'mediodia') return hora === 12 ? en(12) : null;
  if (aclaracion === 'tarde') return hora >= 1 && hora <= 11 ? en(hora + 12) : hora >= 12 ? en(hora) : null;
  if (aclaracion === 'noche') {
    if (hora === 5 || hora === 6) return { minutos: hora * 60 + minutos, ambigua: true };
    if (hora >= 7 && hora <= 11) return en(hora + 12);
    if (hora === 12) return minutos === 0 ? en(24) : en(0);
    return en(hora);
  }
  if (aclaracion === 'manana' || aclaracion === 'madrugada') {
    if (hora === 12) return aclaracion === 'madrugada' ? (minutos === 0 ? en(24) : en(0)) : en(12);
    return hora <= 11 ? en(hora) : null;   // "16 de la mañana" no es una hora
  }
  if (hora >= 1 && hora <= 12) return { minutos: hora * 60 + minutos, ambigua: true };
  return en(hora);
}

// Minutos -> la hora como la entiende la grilla: 480 -> "8"; 450 -> "7:30"; 1440 -> "24"
function escribirHora(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m === 0 ? String(h) : `${h}:${String(m).padStart(2, '0')}`;
}

// --- Revisar lo que propuso el modelo ------------------------------------------------------

export type DictadoDeLaGrilla = { texto: string; cifras: CifrasDichas; textoDicho: (texto: string) => boolean };

// "cada N": el número N se dijo justo después de la palabra "cada" ("cada 8",
// "cada ocho horas")
function seDijoCada(cada: number, texto: string): boolean {
  const palabras = palabrasDe(texto);
  return numerosDichos(texto).some((n) => palabras[n.desde - 1] === 'cada' && Number(n.cifras) === cada);
}

function revisarRenglon(propuesto: any, dictado: DictadoDeLaGrilla, dictadoNormalizado: string): RenglonDictado | null {
  const texto = typeof propuesto?.texto === 'string' ? propuesto.texto.trim() : '';
  if (!texto || texto.length > LARGO_MAXIMO_RENGLON || !dictado.textoDicho(texto)) return null;
  let ilegible = false;
  let ambigua = false;

  let cada: number | null = null;
  if (propuesto.cada !== null && propuesto.cada !== undefined) {
    const valor = propuesto.cada;
    const dicho = typeof valor === 'number' && Number.isFinite(valor)
      && (Number.isInteger(valor) ? seDijoCada(valor, dictado.texto) : seDijoElNumero(valor, dictado.cifras, true));
    if (dicho) cada = valor; else ilegible = true;
  }

  // Una hora: copiada tal cual de lo dictado y leída con las reglas de arriba
  const leer = (fragmento: unknown): string | null => {
    if (typeof fragmento !== 'string' || fragmento.trim() === '' || !dictadoNormalizado.includes(normalizado(fragmento))) {
      ilegible = true;
      return null;
    }
    const hora = leerHora(fragmento);
    if (!hora) { ilegible = true; return null; }
    if (hora.ambigua) ambigua = true;
    return escribirHora(hora.minutos);
  };

  const desde = propuesto.desde === null || propuesto.desde === undefined || String(propuesto.desde).trim() === '' ? null : leer(propuesto.desde);
  const sueltas = Array.isArray(propuesto.horas) ? propuesto.horas.slice(0, 24).map(leer) : [];
  const horas = sueltas.filter((h: string | null): h is string => h !== null);
  return { texto, cada, desde, horas: horas.length ? horas : null, ambigua, ilegible };
}

// Lo que el modelo propuso para la grilla, revisado. Un renglón cuyo texto no se dijo
// se descarta (y se anota en "descartados").
export function revisarGrilla(
  devuelto: unknown, grilla: Grilla, dictado: DictadoDeLaGrilla, descartados: { campo: string; valor: unknown }[],
): Record<string, RenglonDictado[]> {
  const origen = (devuelto && typeof devuelto === 'object' ? devuelto : {}) as Record<string, unknown>;
  const dictadoNormalizado = normalizado(dictado.texto);
  const resultado: Record<string, RenglonDictado[]> = {};
  grilla.indicaciones.forEach(({ clave }) => {
    const propuestos = Object.hasOwn(origen, clave) && Array.isArray(origen[clave]) ? (origen[clave] as unknown[]).slice(0, RENGLONES_COMO_MUCHO) : [];
    resultado[clave] = [];
    propuestos.forEach((propuesto, i) => {
      const renglon = revisarRenglon(propuesto, dictado, dictadoNormalizado);
      if (renglon) resultado[clave].push(renglon);
      else descartados.push({ campo: `grilla.${clave}.${i}`, valor: propuesto });
    });
  });
  return resultado;
}

// --- La hora del reloj ----------------------------------------------------------------------

// La hora de ahora en la Argentina ("16:15"), con el reloj del servidor (el mismo
// criterio que la fecha de la hoja). La usa la app para un "cada N horas" dictado sin
// hora de inicio.
export function horaArgentina(ahora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(ahora);
  const parte = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? '00';
  return `${parte('hour')}:${parte('minute')}`;
}
