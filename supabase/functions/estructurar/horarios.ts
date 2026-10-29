// Resguardo del HORARIO (Formulario N° 5). Los casilleros de abajo de la hoja
// (Diuresis, Drenajes, SNG / Vómitos y Deposiciones) tienen tres horarios: 05 a 13,
// 13 a 21 y 21 a 5. El modelo PROPONE en qué casillero va cada dato; acá el código
// VERIFICA, con reglas fijas y sin IA, que en lo dictado haya una referencia a ESE
// horario. Si no la hay, el dato no se carga y queda para que la persona lo ubique a
// mano: nunca se supone (Constitución, Principios 2 y 3).
//
// Referencias que valen para cada casillero:
//   - un turno: "mañana" usada como turno -> 05_13; "tarde" -> 13_21; "noche" -> 21_05;
//   - un rango: "5 a 13" -> 05_13; "13 a 21" -> 13_21; "21 a 5" -> 21_05 (con o sin
//     "de" adelante, en cifras o en palabras: "de cinco a trece");
//   - una hora: de 5:00 a 12:59 -> 05_13; de 13:00 a 20:59 -> 13_21; de 21:00 a 4:59
//     -> 21_05. Una hora de 1 a 12 sin aclaración ("de la mañana", "de la tarde",
//     "de la noche", "de la madrugada") es ambigua y NO vale; de 13 a 24 sí. Las 5
//     y las 6 "de la noche" también son ambiguas ("6 de la noche" suele ser las 18):
//     NO valen para ningún casillero.
// Los números, en cifras o en palabras, se leen con numerosDichos (cifras.ts).
import { numerosDichos } from './cifras.ts';

type Casillero = '05_13' | '13_21' | '21_05';

// Las 12 columnas por horario: <dato>_<casillero> ("diuresis_05_13", ...)
const COLUMNA_POR_HORARIO = /^(diuresis|drenajes|sng_vomitos|deposiciones)_(05_13|13_21|21_05)$/;

const TURNOS: Record<string, Casillero> = { manana: '05_13', tarde: '13_21', noche: '21_05' };
const RANGOS: Record<string, Casillero> = { '5-13': '05_13', '13-21': '13_21', '21-5': '21_05' };
const ACLARACIONES = ['manana', 'tarde', 'noche', 'madrugada'];   // "a las 4 de la tarde"
const MARCAS_DE_HORA_ADELANTE = ['h', 'hs', 'hrs'];             // "16 hs"

// Las palabras de lo dictado, leídas IGUAL que en numerosDichos (sin acentos, en
// minúscula, sin los signos de puntuación), así las posiciones coinciden
function palabrasDe(texto: string): string[] {
  const partes = texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/\d+|[a-zñ]+|[,.;:]/g) ?? [];
  return partes.filter((parte) => !/^[,.;:]$/.test(parte));
}

// El casillero de una hora del día (0 a 23)
function casilleroDeHora(hora: number): Casillero {
  if (hora >= 5 && hora <= 12) return '05_13';
  if (hora >= 13 && hora <= 20) return '13_21';
  return '21_05';
}

// Una hora con aclaración, pasada a la hora del día: "4 de la tarde" es 16; de 7 a
// 11 "de la noche" suma 12 ("11 de la noche" es 23); "12 de la noche" es 0; de 1 a
// 4 "de la noche" queda igual ("2 de la noche" es 2). Las 5 y las 6 "de la noche"
// son ambiguas (no se sabe si son las 5 / 6 o las 17 / 18): devuelve null y no
// valen para ningún casillero. "De la mañana" y "de la madrugada" no la cambian
// ("4 de la mañana" es 4).
function horaDelDia(hora: number, aclaracion: string): number | null {
  if (aclaracion === 'tarde') return hora >= 1 && hora <= 11 ? hora + 12 : hora;
  if (aclaracion === 'noche') {
    if (hora === 5 || hora === 6) return null;
    return hora >= 7 && hora <= 11 ? hora + 12 : hora === 12 ? 0 : hora;
  }
  return hora;
}

// Qué casilleros tienen una referencia en lo dictado
function casillerosNombrados(texto: string): Set<Casillero> {
  const palabras = palabrasDe(texto);
  const numeros = numerosDichos(texto).map((n) => ({ ...n, valor: Number(n.cifras) }));
  const casilleros = new Set<Casillero>();
  const aclaraciones = new Set<number>();   // "mañana" de "a las 4 de la mañana" es parte de la hora, no un turno
  const deUnRango = new Set<number>();      // los números de un rango no se leen además como horas sueltas

  // 1) Rangos: un número, "a", otro número ("5 a 13", "cinco a trece", "de las 5 a las 13")
  numeros.forEach((n, k) => {
    const siguiente = numeros[k + 1];
    if (!siguiente || palabras[n.hasta + 1] !== 'a') return;
    const pegado = siguiente.desde === n.hasta + 2 || (palabras[n.hasta + 2] === 'las' && siguiente.desde === n.hasta + 3);
    const rango = `${n.valor}-${siguiente.valor}`;
    if (!pegado || !Object.hasOwn(RANGOS, rango)) return;
    casilleros.add(RANGOS[rango]);
    deUnRango.add(k).add(k + 1);
  });

  // 2) Horas: "a las 16", "a la una", "16 hs"; con o sin aclaración
  numeros.forEach((n, k) => {
    if (deUnRango.has(k)) return;
    const atras = palabras[n.desde - 1];
    const esHora = atras === 'las' || (atras === 'la' && n.valor === 1) || MARCAS_DE_HORA_ADELANTE.includes(palabras[n.hasta + 1]);
    if (!esHora || n.valor > 24) return;
    // ¿Viene aclarada? "de la ..." en las palabras que siguen ("a las 4 y media de la tarde")
    for (let j = n.hasta + 1; j <= n.hasta + 3; j++) {
      if (palabras[j] === 'de' && palabras[j + 1] === 'la' && ACLARACIONES.includes(palabras[j + 2])) {
        aclaraciones.add(j + 2);   // ese "noche" (o "mañana"...) es de la hora: tampoco cuenta como turno
        const hora = horaDelDia(n.valor, palabras[j + 2]);
        if (hora !== null) casilleros.add(casilleroDeHora(hora % 24));
        return;
      }
    }
    // Sin aclaración: solo vale de 13 a 24 (de 1 a 12 no se sabe si es de día o de noche)
    if (n.valor >= 13) casilleros.add(casilleroDeHora(n.valor % 24));
  });

  // 3) Turnos: "tarde" y "noche"; "mañana" solo cuando se usa como turno ("a la
  //    mañana", "por la mañana", "turno mañana", o al enumerar: "mañana 500")
  palabras.forEach((palabra, i) => {
    if (aclaraciones.has(i) || !Object.hasOwn(TURNOS, palabra)) return;
    if (palabra === 'manana') {
      const comoTurno = palabras[i - 1] === 'la' || palabras[i - 1] === 'turno' || numeros.some((n) => n.desde === i + 1);
      if (!comoTurno) return;
    }
    casilleros.add(TURNOS[palabra]);
  });

  return casilleros;
}

// La última grabación revisada (se revisan varias columnas con el mismo dictado)
let ultima: { texto: string; casilleros: Set<Casillero> } | null = null;

// ¿Se puede aceptar un valor en esta columna? Las columnas que no son por horario
// no se revisan acá. Las por horario, solo si lo dictado nombra SU horario.
export function horarioVerificado(columna: string, dictado: string): boolean {
  const casillero = COLUMNA_POR_HORARIO.exec(columna)?.[2] as Casillero | undefined;
  if (!casillero) return true;
  if (!ultima || ultima.texto !== dictado) ultima = { texto: dictado, casilleros: casillerosNombrados(dictado) };
  return ultima.casilleros.has(casillero);
}
