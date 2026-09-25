// "Prueba de que se dijo" para los NÚMEROS (resguardo contra números inventados).
// Un número que devuelve el modelo solo se acepta si sus CIFRAS aparecen en lo
// dictado en esta grabación, sin importar cómo se dijeron:
//   - en cifras, con puntos, espacios, guiones, barra o coma: "28.456.789", "1,78", "16-9";
//   - en palabras: "ciento cincuenta" = 150; "y medio" cuenta como la cifra 5;
//   - en partes seguidas: "treinta y dos, trescientos noventa, ciento setenta y uno"
//     o "tres, dos, tres, nueve, ..." (dígito por dígito) valen como las cifras juntas.
// Se comparan partes enteras (un 150 no pasa porque se haya dicho 1500).

// --- Números en palabras -----------------------------------------------------------------

const UNIDADES: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
};
const DE_DIEZ_A_VEINTINUEVE: Record<string, number> = {
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17,
  dieciocho: 18, diecinueve: 19, veinte: 20, veintiun: 21, veintiuno: 21, veintiuna: 21, veintidos: 22,
  veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28,
  veintinueve: 29,
};
const DECENAS: Record<string, number> = {
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
};
const CENTENAS: Record<string, number> = {
  cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300,
  cuatrocientos: 400, cuatrocientas: 400, quinientos: 500, quinientas: 500, seiscientos: 600,
  seiscientas: 600, setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800,
  novecientos: 900, novecientas: 900,
};

type Clase = 'centena' | 'decena' | 'cerrado' | 'mil' | 'millon' | 'cero';

interface NumeroDicho {
  cifras: string;   // "150", "08", "5" (de "y medio")
  desde: number;    // posición de su primera palabra
  hasta: number;    // posición de su última palabra
}

function sinAcentos(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Todos los números de lo dictado, en orden, con su posición
export function numerosDichos(texto: string): NumeroDicho[] {
  // Las comas y los puntos se guardan como marca de corte: "quinientos, veintidós"
  // son dos números (500 y 22), pero "quinientos veintidós" es uno (522)
  const partes = sinAcentos(texto).match(/\d+|[a-zñ]+|[,.;:]/g) ?? [];
  const palabras: string[] = [];
  const cortes = new Set<number>();   // posición de la palabra que viene después de una coma o punto
  partes.forEach((parte) => {
    if (/^[,.;:]$/.test(parte)) cortes.add(palabras.length);
    else palabras.push(parte);
  });
  const numeros: NumeroDicho[] = [];

  // El número en palabras que se está armando
  let armando: { total: number; grupo: number; clase: Clase; desde: number; hasta: number } | null = null;
  let yPendiente = -1;   // posición de un "y" que puede unir decena y unidad ("treinta y dos")

  const cerrar = () => {
    if (armando) numeros.push({ cifras: String(armando.total + armando.grupo), desde: armando.desde, hasta: armando.hasta });
    armando = null;
  };

  palabras.forEach((palabra, i) => {
    // Después de una coma, el número en palabras termina (salvo tras "mil" o "millones")
    if (cortes.has(i) && armando && armando.clase !== 'mil' && armando.clase !== 'millon') cerrar();
    const conY = yPendiente === i - 1 && !cortes.has(i);
    if (palabra !== 'y') yPendiente = -1;

    if (/^\d+$/.test(palabra)) {   // ya viene en cifras (se respetan los ceros de adelante: "0,08")
      cerrar();
      numeros.push({ cifras: palabra, desde: i, hasta: i });
      return;
    }
    if (palabra === 'y') {
      if (armando && armando.clase === 'decena') { yPendiente = i; return; }
      yPendiente = i;   // también puede venir "y medio"
      cerrar();
      return;
    }
    if ((palabra === 'medio' || palabra === 'media') && conY) {   // "82 y medio" = 82,5
      cerrar();
      numeros.push({ cifras: '5', desde: i, hasta: i });
      return;
    }

    const unidad = UNIDADES[palabra];
    const especial = DE_DIEZ_A_VEINTINUEVE[palabra];
    const decena = DECENAS[palabra];
    const centena = CENTENAS[palabra];

    if (palabra === 'mil') {
      if (armando && armando.clase !== 'mil' && armando.clase !== 'cero') {
        armando.total += (armando.grupo || 1) * 1000;
        armando.grupo = 0;
        armando.clase = 'mil';
        armando.hasta = i;
      } else {
        cerrar();
        armando = { total: 1000, grupo: 0, clase: 'mil', desde: i, hasta: i };
      }
      return;
    }
    if (palabra === 'millon' || palabra === 'millones') {
      if (armando && armando.clase !== 'cero' && armando.clase !== 'millon') {
        armando.total = (armando.total + (armando.grupo || 1)) * 1000000;
        armando.grupo = 0;
        armando.clase = 'millon';
        armando.hasta = i;
      } else {
        cerrar();
        armando = { total: 1000000, grupo: 0, clase: 'millon', desde: i, hasta: i };
      }
      return;
    }
    if (unidad === undefined && especial === undefined && decena === undefined && centena === undefined) {
      cerrar();   // una palabra cualquiera
      return;
    }

    // ¿Esta palabra sigue el número que se está armando o empieza otro?
    const valor = unidad ?? especial ?? decena ?? centena;
    const clase: Clase = unidad === 0 ? 'cero' : centena !== undefined ? 'centena' : decena !== undefined ? 'decena' : 'cerrado';
    const antes = armando ? armando.clase : null;
    const sigue = armando !== null && clase !== 'cero' && (
      ((antes === 'mil' || antes === 'millon') && !conY)
      || (antes === 'centena' && clase !== 'centena' && !conY)
      || (antes === 'decena' && conY && unidad !== undefined)
    );
    if (sigue && armando) {
      armando.grupo += valor;
      armando.clase = clase;
      armando.hasta = i;
    } else {
      cerrar();
      armando = { total: 0, grupo: valor, clase, desde: i, hasta: i };
    }
  });
  cerrar();
  return numeros;
}

// --- Qué cifras se dijeron ------------------------------------------------------------------

const MAXIMO_PALABRAS_ENTRE = 3;   // "un METRO setenta y ocho", "82 KILOS y medio"
const MAXIMO_PARTES = 12;          // el DNI dígito por dígito tiene 8

const sinCerosAdelante = (cifras: string) => cifras.replace(/^0+(?=\d)/, '');
const sinCerosAtras = (cifras: string) => cifras.replace(/(?<=\d)0+$/, '');

export interface CifrasDichas {
  exactas: Set<string>;
  sinCerosAtras: Set<string>;   // para decimales: "uno ochenta" es 1,8
}

// Todas las cifras que se pueden armar con números dichos seguidos
export function cifrasDichas(texto: string): CifrasDichas {
  const numeros = numerosDichos(texto);
  const exactas = new Set<string>();
  const recortadas = new Set<string>();
  for (let i = 0; i < numeros.length; i++) {
    let cifras = '';
    for (let j = i; j < numeros.length && j < i + MAXIMO_PARTES; j++) {
      if (j > i && numeros[j].desde - numeros[j - 1].hasta - 1 > MAXIMO_PALABRAS_ENTRE) break;
      cifras += numeros[j].cifras;
      exactas.add(sinCerosAdelante(cifras));
      recortadas.add(sinCerosAtras(sinCerosAdelante(cifras)));
    }
  }
  return { exactas, sinCerosAtras: recortadas };
}

// Las cifras de un número: 82.5 -> "825"; 0.16 -> "16"
function cifrasDeNumero(valor: number): string {
  return sinCerosAdelante(String(valor).replace(/\D/g, ''));
}

export function seDijoElNumero(valor: number, dichas: CifrasDichas, decimal: boolean): boolean {
  const cifras = cifrasDeNumero(valor);
  if (dichas.exactas.has(cifras)) return true;
  return decimal && dichas.sinCerosAtras.has(sinCerosAtras(cifras));
}

// Un texto con cifras (DNI, T.A., valores del ECG): pasa si sus cifras juntas se
// dijeron, o si cada grupo de cifras se dijo o ya estaba en ese campo (así una
// corrección parcial, "era 150, no 160", deja "150/90"). Al menos un grupo tiene
// que haberse dicho. Un texto sin cifras no se revisa acá.
export function seDijeronLasCifras(texto: string, dichas: CifrasDichas, anterior: unknown): boolean {
  const grupos = texto.match(/\d+/g);
  if (!grupos) return true;
  if (dichas.exactas.has(sinCerosAdelante(grupos.join('')))) return true;
  const yaEstaban = new Set((String(anterior ?? '').match(/\d+/g) ?? []).map(sinCerosAdelante));
  const dichos = grupos.map((g) => dichas.exactas.has(sinCerosAdelante(g)));
  return dichos.some(Boolean) && grupos.every((g, k) => dichos[k] || yaEstaban.has(sinCerosAdelante(g)));
}
