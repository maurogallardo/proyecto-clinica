// Función "estructurar" (T017): recibe el texto dictado MÁS la planilla tal como
// está en pantalla, y devuelve lo dictado en ESTA grabación, ubicado en la
// planilla (lo no dictado va en null = "no se toca"). La app lo suma a lo que ya
// estaba y así queda la planilla actualizada. Copia del paso "ordenador"
// de LoMar (gpt-4o-mini con respuesta JSON), ahora con formato ESTRICTO: el modelo
// tiene que devolver exactamente los campos de la planilla, con su tipo.
//
// Un solo modelo para todas las planillas: lo que cambia por planilla es su
// instructivo (carpeta instructivos/) y su lista de campos (la manda la app, sale
// de js/planillas/<planilla>.js).
//
// - Solo para usuarios logueados.
// - El texto dictado no se registra en los logs (son datos de salud).
import { AJUSTES_ESTRUCTURACION, MODELO_ESTRUCTURACION } from '../_compartido/modelos.ts';
import { esUsuarioLogueado, responder, respuestaPrevia } from '../_compartido/http.ts';
import { pedirAOpenAI } from '../_compartido/openai.ts';
import { CORRECCIONES_SEGURAS, INSTRUCTIVO_GENERAL } from './instructivos/general.ts';
import { INSTRUCTIVO_ERGOMETRICO, RESGUARDOS_ERGOMETRICO } from './instructivos/ergometrico.ts';
import { INSTRUCTIVO_FORMULARIO5, RESGUARDOS_FORMULARIO5 } from './instructivos/formulario5.ts';
import { type CifrasDichas, cifrasDichas, seDijeronLasCifras, seDijoElNumero } from './cifras.ts';
import { type Grilla, esquemaDeGrilla, grillaValida, horaArgentina, revisarGrilla } from './grilla.ts';

// Instructivo de cada planilla. Sumar una planilla = sumar una línea acá.
const INSTRUCTIVOS: Record<string, string> = {
  ergometrico: INSTRUCTIVO_ERGOMETRICO,
  formulario5: INSTRUCTIVO_FORMULARIO5,
};

// Resguardos propios de cada planilla (palabras clave y valores máximos). Una
// planilla puede sumar una verificación propia con reglas fijas (el N° 5: el
// horario de los casilleros de abajo, horarios.ts) y una forma fija para algunos
// valores, que se aplica después de los resguardos (el N° 5: las Deposiciones en
// X o XX, deposiciones.ts); el ergométrico no tiene ninguna de las dos.
type Resguardos = {
  palabrasClave: Record<string, RegExp[]>;
  maximos: Record<string, number>;
  verificar?: (columna: string, dictadoSinAcentos: string) => boolean;
  ponerEnSuForma?: (columna: string, valor: unknown) => unknown;
};
const RESGUARDOS: Record<string, Resguardos> = {
  ergometrico: RESGUARDOS_ERGOMETRICO,
  formulario5: RESGUARDOS_FORMULARIO5,
};

// Planillas SIN tabla de etapas: la app manda su lista de campos de etapas vacía
// (y ninguna fila). Las demás tienen que mandar al menos un campo de etapa, como
// siempre.
const SIN_ETAPAS = new Set(['formulario5']);

// Planillas CON grilla de horarios (el N° 5: las indicaciones médicas, grilla.ts).
// La app manda la descripción de su grilla ("grilla"); si no la manda (una versión
// vieja de la app), todo sigue como antes, sin grilla. Las demás no pueden mandarla.
const CON_GRILLA = new Set(['formulario5']);

type Campo = { columna: string; etiqueta: string; tipo: string };
type Valores = Record<string, unknown>;

const TIPOS = ['texto', 'texto-largo', 'entero', 'decimal', 'fecha'];
const LARGO_MAXIMO_TEXTO = 20000;

// --- Validar lo que manda la app ---------------------------------------------------

// El nombre de una columna: minúsculas, números y guion bajo, empezando con una
// letra ("diuresis_05_13", "control_manana_o2"), hasta 40 caracteres
function camposValidos(lista: unknown, maximo: number): lista is Campo[] {
  return Array.isArray(lista) && lista.length > 0 && lista.length <= maximo && lista.every((c) =>
    c && typeof c.columna === 'string' && /^[a-z][a-z0-9_]{0,39}$/.test(c.columna)
    && typeof c.etiqueta === 'string' && c.etiqueta.length <= 80 && TIPOS.includes(c.tipo));
}

// --- Formato estricto que tiene que devolver el modelo ----------------------------------

function esquemaDeCampo(campo: Campo) {
  const tipo = campo.tipo === 'entero' ? 'integer' : campo.tipo === 'decimal' ? 'number' : 'string';
  const aclaracion = campo.tipo === 'fecha' ? ' (AAAA-MM-DD)' : '';
  return { type: [tipo, 'null'], description: `${campo.etiqueta}${aclaracion}` };
}

function esquemaDeObjeto(campos: Campo[], extra: Record<string, unknown> = {}) {
  const propiedades: Record<string, unknown> = { ...extra };
  campos.forEach((campo) => { propiedades[campo.columna] = esquemaDeCampo(campo); });
  return { type: 'object', additionalProperties: false, required: Object.keys(propiedades), properties: propiedades };
}

// "sin_ubicar": un lugar para los datos que el modelo no sabe dónde van. Si no lo
// tiene, tiende a forzarlos en algún campo. Por ahora se DESCARTA (no se muestra
// ni se guarda); queda preparado para la T021 (avisar datos no ubicados).
// Con grilla de horarios (el N° 5), suma "grilla" (grilla.ts); sin grilla, igual que siempre.
function esquemaDePlanilla(camposEstudio: Campo[], camposEtapa: Campo[], grilla: Grilla | null) {
  const esquema = {
    type: 'object',
    additionalProperties: false,
    required: ['estudio', 'etapas', 'sin_ubicar'],
    properties: {
      sin_ubicar: { type: 'array', items: { type: 'string' }, description: 'Datos dictados que no se sabe con certeza dónde van' },
      estudio: esquemaDeObjeto(camposEstudio),
      etapas: {
        type: 'array',
        items: esquemaDeObjeto(camposEtapa, { fila: { type: 'integer', description: 'Número interno de la fila: no se cambia' } }),
      },
    } as Record<string, unknown>,
  };
  if (grilla) {
    esquema.required.push('grilla');
    esquema.properties.grilla = esquemaDeGrilla(grilla);
  }
  return esquema;
}

// --- Limpiar lo que devuelve el modelo (por si se equivoca) --------------------------------

function limpiarValor(valor: unknown, campo: Campo): unknown {
  if (valor === null || valor === undefined) return null;
  if (campo.tipo === 'entero') return Number.isInteger(valor) ? valor : null;
  if (campo.tipo === 'decimal') return typeof valor === 'number' && Number.isFinite(valor) ? valor : null;
  const texto = String(valor).trim();
  if (texto === '') return null;
  if (campo.tipo === 'fecha') return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null;
  if (campo.columna === 'documento') return texto.replace(/\D/g, '') || null;   // DNI: solo números
  // ECG basal (ergométrico) y controles de enfermería (N° 5): un valor que es solo
  // un número decimal va con coma, como en la planilla en papel ("0.16" queda
  // "0,16"; "36.5" queda "36,5")
  if (/^(ecg_|control_)/.test(campo.columna) && /^\d+\.\d+$/.test(texto)) return texto.replace('.', ',');
  return texto;
}

function limpiarObjeto(objeto: unknown, campos: Campo[]): Valores {
  const limpio: Valores = {};
  const origen = (objeto && typeof objeto === 'object' ? objeto : {}) as Valores;
  campos.forEach((campo) => { limpio[campo.columna] = limpiarValor(origen[campo.columna], campo); });
  return limpio;
}

// --- "Prueba de que se dijo" (resguardo contra datos no dictados) ------------------------
// Un valor de TEXTO con palabras solo se acepta si alguna de sus palabras (de 4
// letras o más) aparece en lo dictado en esta grabación, admitiendo pequeñas
// diferencias de ortografía ("sinusal" y "sinusual"). Así el modelo no puede
// "mejorar" un dato viejo que no se dictó. Los números tienen su propio resguardo
// (cifras.ts); las fechas no se revisan.

function sinAcentos(texto: string): string {
  return texto.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function palabrasDe(texto: string): string[] {
  return sinAcentos(texto).match(/[a-zñ]{4,}/g) ?? [];
}

// Cuántas letras hay que cambiar para pasar de una palabra a otra
function distancia(a: string, b: string): number {
  const fila = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let anterior = fila[0];
    fila[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const guardado = fila[j];
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, anterior + (a[i - 1] === b[j - 1] ? 0 : 1));
      anterior = guardado;
    }
  }
  return fila[b.length];
}

function seDijo(valor: unknown, palabrasDictadas: string[]): boolean {
  const palabras = palabrasDe(String(valor));
  if (palabras.length === 0) return true;   // sin palabras (números, "160/90"): no aplica
  return palabras.some((p) => palabrasDictadas.some((d) => distancia(p, d) <= (p.length >= 7 ? 2 : 1)));
}

// Lo que el modelo propuso y los resguardos descartaron: vuelve a la app (que no
// lo usa) para poder revisar las pruebas. No se registra en ningún lado.
type Descartado = { campo: string; valor: unknown };

// Resguardos de la planilla: la palabra clave del campo se dijo y el valor no
// pasa el máximo
// (Object.hasOwn: una columna con un nombre como "constructor" no encuentra nada)
function cumpleResguardos(columna: string, valor: unknown, resguardos: Resguardos, dictadoSinAcentos: string): boolean {
  const claves = Object.hasOwn(resguardos.palabrasClave, columna) ? resguardos.palabrasClave[columna] : undefined;
  if (claves && !claves.some((clave) => clave.test(dictadoSinAcentos))) return false;
  const maximo = Object.hasOwn(resguardos.maximos, columna) ? resguardos.maximos[columna] : undefined;
  if (maximo !== undefined && typeof valor === 'number' && valor > maximo) return false;
  return !resguardos.verificar || resguardos.verificar(columna, dictadoSinAcentos);
}

// Palabras (ver arriba) y números (cifras.ts): un número entero o decimal, o las
// cifras de un texto (DNI, T.A., valores del ECG), solo se aceptan si se dijeron
// en esta grabación; además, los resguardos de la planilla. Lo que no se cumple
// va en null: el campo queda como estaba.
type Dictado = { palabras: string[]; cifras: CifrasDichas; sinAcentos: string; resguardos: Resguardos };

function exigirQueSeHayaDicho(
  objeto: Valores, campos: Campo[], dictado: Dictado, anterior: Valores, lugar: string, descartados: Descartado[],
): Valores {
  campos.forEach((campo) => {
    const valor = objeto[campo.columna];
    if (valor === null) return;
    const esTexto = campo.tipo === 'texto' || campo.tipo === 'texto-largo';
    const esNumero = campo.tipo === 'entero' || campo.tipo === 'decimal';
    const seDijoAsi = esNumero
      ? seDijoElNumero(valor as number, dictado.cifras, campo.tipo === 'decimal')
      : !esTexto || (seDijo(valor, dictado.palabras) && seDijeronLasCifras(String(valor), dictado.cifras, anterior[campo.columna]));
    const sePuedeAceptar = seDijoAsi && cumpleResguardos(campo.columna, valor, dictado.resguardos, dictado.sinAcentos);
    if (!sePuedeAceptar) {
      objeto[campo.columna] = null;   // no se dijo en esta grabación: no se toca
      descartados.push({ campo: `${lugar}.${campo.columna}`, valor });
    }
  });
  return objeto;
}

// La forma fija de la planilla (si tiene), sobre lo que ya pasó los resguardos
function ponerEnSuForma(objeto: Valores, campos: Campo[], resguardos: Resguardos): Valores {
  if (!resguardos.ponerEnSuForma) return objeto;
  campos.forEach((campo) => { objeto[campo.columna] = resguardos.ponerEnSuForma!(campo.columna, objeto[campo.columna]); });
  return objeto;
}

// --- La función ------------------------------------------------------------------------

Deno.serve(async (pedido) => {
  if (pedido.method === 'OPTIONS') return respuestaPrevia(pedido);
  if (pedido.method !== 'POST') return responder(pedido, { error: 'metodo-no-permitido' }, 405);
  if (!(await esUsuarioLogueado(pedido))) return responder(pedido, { error: 'sin-sesion' }, 401);

  let datos: any;
  try {
    datos = await pedido.json();
  } catch {
    return responder(pedido, { error: 'pedido-invalido' }, 400);
  }

  // La planilla tiene que ser una de las de arriba (Object.hasOwn: un nombre como
  // "constructor" no es una planilla)
  const planilla = typeof datos?.planilla === 'string' && Object.hasOwn(INSTRUCTIVOS, datos.planilla) ? datos.planilla : null;
  const instructivo = planilla ? INSTRUCTIVOS[planilla] : undefined;
  const sinEtapas = planilla !== null && SIN_ETAPAS.has(planilla);
  const texto = typeof datos?.texto === 'string' ? datos.texto.trim() : '';
  const camposEstudio = datos?.campos?.estudio;
  const camposEtapa = datos?.campos?.etapas;
  const etapasActuales = Array.isArray(datos?.actual?.etapas) ? datos.actual.etapas : null;
  // La grilla de horarios, si la manda la app: solo en una planilla con grilla y bien formada
  const grilla: Grilla | null = datos?.grilla === undefined || datos?.grilla === null ? null : datos.grilla;
  const grillaBien = grilla === null || (planilla !== null && CON_GRILLA.has(planilla) && grillaValida(grilla));
  // Sin etapas: la lista de campos de etapas y las filas tienen que venir vacías
  const etapasBien = sinEtapas
    ? Array.isArray(camposEtapa) && camposEtapa.length === 0 && etapasActuales !== null && etapasActuales.length === 0
    : camposValidos(camposEtapa, 20);
  if (!instructivo || !texto || texto.length > LARGO_MAXIMO_TEXTO
      || !camposValidos(camposEstudio, 80) || !etapasBien || !grillaBien
      || !etapasActuales || etapasActuales.length > 40) {
    return responder(pedido, { error: 'pedido-invalido' }, 400);
  }

  // La planilla como está en pantalla, solo con sus campos
  const actual = {
    estudio: limpiarObjeto(datos.actual.estudio, camposEstudio),
    etapas: etapasActuales.map((etapa: unknown, fila: number) => ({ fila, ...limpiarObjeto(etapa, camposEtapa) })),
  };

  // (una planilla sin etapas no lleva la parte de "etapas")
  const listaDeCampos = [
    'Campos de "estudio" (columna: nombre en la planilla):',
    ...camposEstudio.map((c) => `- ${c.columna}: ${c.etiqueta}`),
    ...(sinEtapas ? [] : ['Campos de cada fila de "etapas":', ...camposEtapa.map((c) => `- ${c.columna}: ${c.etiqueta}`)]),
    ...(grilla ? ['Indicaciones de "grilla" (clave: nombre en la planilla):', ...grilla.indicaciones.map((i) => `- ${i.clave}: ${i.etiqueta}`)] : []),
  ].join('\n');

  // Correcciones seguras (siempre iguales), antes de que lo lea el modelo
  const dictado = CORRECCIONES_SEGURAS.reduce((t, [patron, correcto]) => t.replace(patron, correcto), texto);
  const lodicho: Dictado = {
    palabras: palabrasDe(dictado),
    cifras: cifrasDichas(dictado),
    sinAcentos: sinAcentos(dictado),
    resguardos: Object.hasOwn(RESGUARDOS, planilla as string) ? RESGUARDOS[planilla as string] : { palabrasClave: {}, maximos: {} },
  };

  const mensaje = `${listaDeCampos}\n\nTranscripción de esta grabación:\n"""\n${dictado}\n"""\n\n`
    + 'Planilla como está ahora en pantalla (JSON; solo para ubicar los datos y completar '
    + `correcciones: no la copies):\n${JSON.stringify(actual)}`;

  try {
    const respuesta = await pedirAOpenAI('/chat/completions', {
      model: MODELO_ESTRUCTURACION,
      ...AJUSTES_ESTRUCTURACION,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'planilla', strict: true, schema: esquemaDePlanilla(camposEstudio, camposEtapa, grilla) },
      },
      messages: [
        { role: 'system', content: `${INSTRUCTIVO_GENERAL}\n\n${instructivo}` },
        { role: 'user', content: mensaje },
      ],
    });
    const devuelto = JSON.parse(respuesta?.choices?.[0]?.message?.content ?? '{}');

    // Solo las filas que existen (nunca se crean filas), identificadas por "fila"
    const descartados: Descartado[] = [];
    const etapas: Valores[] = [];
    (Array.isArray(devuelto.etapas) ? devuelto.etapas : []).forEach((etapa: any) => {
      const fila = etapa?.fila;
      if (Number.isInteger(fila) && fila >= 0 && fila < actual.etapas.length && !etapas.some((e) => e.fila === fila)) {
        etapas.push({ fila, ...ponerEnSuForma(exigirQueSeHayaDicho(limpiarObjeto(etapa, camposEtapa), camposEtapa, lodicho,
          actual.etapas[fila], `etapas.${fila}`, descartados), camposEtapa, lodicho.resguardos) });
      }
    });
    const estudio = ponerEnSuForma(exigirQueSeHayaDicho(limpiarObjeto(devuelto.estudio, camposEstudio), camposEstudio, lodicho,
      actual.estudio, 'estudio', descartados), camposEstudio, lodicho.resguardos);

    // La grilla de horarios (si la planilla la tiene): los renglones revisados con
    // reglas fijas (grilla.ts) y la hora del reloj, para que la app calcule las cruces
    const conGrilla = grilla
      ? {
        grilla: revisarGrilla(devuelto.grilla, grilla, {
          texto: dictado,
          cifras: lodicho.cifras,
          textoDicho: (t) => seDijo(t, lodicho.palabras) && seDijeronLasCifras(t, lodicho.cifras, null),
        }, descartados),
        hora: horaArgentina(),
      }
      : {};

    // "sin_ubicar" se descarta a propósito (ver esquemaDePlanilla). "uso": solo la
    // cantidad de tokens (para saber el costo); la app no lo usa.
    const uso = respuesta?.usage
      ? { entrada: respuesta.usage.prompt_tokens, enCache: respuesta.usage.prompt_tokens_details?.cached_tokens ?? 0, salida: respuesta.usage.completion_tokens }
      : null;
    return responder(pedido, { estudio, etapas, descartados, uso, ...conGrilla });
  } catch {
    console.error('estructurar: no se pudo completar la planilla');
    return responder(pedido, { error: 'no-se-pudo-estructurar' }, 502);
  }
});
