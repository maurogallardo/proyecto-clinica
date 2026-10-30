// Instructivo de la planilla "Formulario N° 5": hoja de indicaciones médicas y
// controles de enfermería de un paciente internado. Se suma al instructivo
// general. Sigue el estilo del del ergométrico (instructivos/ergometrico.ts).
//
// Las siglas y cómo se dicen son una PROPUESTA aprobada por Mauro, para confirmar
// con un enfermero. Qué es exactamente O2 (saturación u oxígeno que se le da)
// está [A DEFINIR]: el instructivo no lo decide.

// Resguardos en el código para esta planilla (los aplica index.ts después del
// modelo; lo que no los cumple se descarta y el campo queda como estaba):
//   - palabrasClave: el campo solo se acepta si en el dictado (sin acentos, en
//     minúscula) aparece alguna de estas palabras. (\b = comienzo o fin de
//     palabra.)
//       · Trámite adm.: solo si se dijo "trámite".
//       · Cada control de enfermería: solo si se dijo el nombre de SU turno
//         ("mañana", "tarde" o "noche"). Un control dictado sin turno no se carga.
//       · Diuresis: solo si se dijo "diuresis", "orina" / "orinó", "sonda vesical"
//         o "papagayo".
//   - maximos: ninguno (todos los campos de la hoja son texto).
//   - verificar: el horario de los casilleros de abajo (Diuresis, Drenajes, SNG /
//     Vómitos y Deposiciones). El modelo propone el casillero y el código verifica
//     que lo dictado nombre ESE horario (un turno, un rango o una hora): ver
//     horarios.ts. Si no, el dato no se carga.
//   - ponerEnSuForma: después de los resguardos, las Deposiciones pasan a X o XX
//     ("una X" es "X"; "dos X" es "XX"), con reglas fijas: ver deposiciones.ts.
//   - La grilla de horarios (las indicaciones médicas) tiene sus propios
//     resguardos, también con reglas fijas: ver grilla.ts.
import { horarioVerificado } from '../horarios.ts';
import { formaDeDeposiciones } from '../deposiciones.ts';

const TURNOS: Record<string, RegExp[]> = {
  manana: [/\bmanana\b/],   // "mañana", sin la tilde de la ñ
  tarde: [/\btarde\b/],
  noche: [/\bnoche\b/],
};
const DATOS_DE_CONTROL = ['fr', 'te', 'p', 'ta', 'o2'];
const DIURESIS = [/diuresis/, /\borin/, /\bsonda vesical\b/, /\bpapagayo/];

export const RESGUARDOS_FORMULARIO5 = {
  palabrasClave: {
    tramite_administrativo: [/\btramite/],
    diuresis_05_13: DIURESIS,
    diuresis_13_21: DIURESIS,
    diuresis_21_05: DIURESIS,
    ...Object.fromEntries(Object.entries(TURNOS).flatMap(([turno, claves]) =>
      DATOS_DE_CONTROL.map((dato) => [`control_${turno}_${dato}`, claves]))),
  } as Record<string, RegExp[]>,
  maximos: {} as Record<string, number>,
  verificar: horarioVerificado,
  ponerEnSuForma: formaDeDeposiciones,
};

export const INSTRUCTIVO_FORMULARIO5 = `
PLANILLA: Formulario N° 5, hoja de indicaciones médicas y controles de enfermería de UN paciente internado (Sanatorio de la Cañada, Río Tercero).

ESTA HOJA NO TIENE TABLA DE ETAPAS: el array "etapas" va siempre vacío ([]). La fecha de la hoja la pone el sistema: no hay campo de fecha.

ENCABEZADO (objeto "estudio"):
- habitacion (Hab.): la habitación tal cual se dicta ("habitación 12" es "12"; "doce be" es "12 B").
- mutual: el nombre de la mutual u obra social, tal cual se dicta.
- doctor (Dr.): el nombre del médico, tal cual se dicta.
- paciente (Pte.): el nombre del paciente, tal cual se dicta.
- tramite_administrativo (Trámite adm.): SOLO "SÍ" o "NO" (en mayúscula y con tilde en la Í), y SOLO si en la grabación se dice la palabra "trámite" ("trámite administrativo sí", "trámite: no"). Si se habla del trámite pero no queda claro si es sí o no, va en null y a "sin_ubicar".
- diagnostico: tal cual se dicta.

INDICACIONES MÉDICAS (objeto "grilla"): en el papel, cada indicación tiene renglones y, a la derecha, una grilla de horarios. Por cada indicación va una lista de renglones, en el orden en que se dictan:
- csv (C.S.V., control de signos vitales; también se dice "signos vitales" o "ce ese ve"): la indicación del control de signos vitales.
- tomografia, electrocardiograma, laboratorio: lo que se indica de cada uno. Ojo: "electrocardiograma" acá es la INDICACIÓN de hacer uno.
- medicacion: UN renglón por medicamento, con su dosis, vía y frecuencia.
- Si en esta grabación no se dicta nada de una indicación, su lista va vacía ([]). No repitas renglones de la planilla actual.
- En cada renglón:
  - texto: la indicación tal cual se dicta, con sus dosis, frecuencias y horarios exactamente como se dijeron ("Ceftriaxona 1 g endovenoso cada 12 horas desde las 8 de la mañana").
  - cada: SOLO si se dice "cada N horas", el número N ("cada ocho horas" es 8; "cada 6 horas" es 6). Si no se dice "cada", null.
  - desde: SOLO si se dice desde qué hora arranca ("desde las 8 de la mañana", "a partir de las 22"), el pedacito de la transcripción con esa hora, COPIADO TAL CUAL, con su "de la mañana / de la tarde / de la noche" si se dijo ("8 de la mañana", "22"). Si no se dice, null: nunca lo completes con la hora actual ni con ninguna otra.
  - horas: SOLO si se dicen horas una por una ("a las 8, 14 y 20"), cada hora como un pedacito COPIADO TAL CUAL de la transcripción (["8", "14", "20"]; "a las 7 y media de la tarde" es ["7 y media de la tarde"]). Si no, [].
  - NUNCA conviertas ni completes una hora ("8 de la noche" queda "8 de la noche", no "20"; "las 8" queda "8", sin agregarle "de la mañana"). NUNCA calcules horarios ni pongas cruces: eso lo hace el sistema con reglas fijas.
  - Ejemplo: "medicación: ceftriaxona 1 gramo endovenoso cada 12 horas desde las 8 de la mañana; paracetamol 1 gramo a las 8, 14 y 20" es medicacion [{"texto": "Ceftriaxona 1 g endovenoso cada 12 horas desde las 8 de la mañana", "cada": 12, "desde": "8 de la mañana", "horas": []}, {"texto": "Paracetamol 1 g a las 8, 14 y 20", "cada": null, "desde": null, "horas": ["8", "14", "20"]}].
  - Ejemplo: "signos vitales cada 6 horas" es csv [{"texto": "Signos vitales cada 6 horas", "cada": 6, "desde": null, "horas": []}].
- dieta (campo de "estudio", sin grilla): la dieta indicada.
- REGLA CRÍTICA: "mañana" como día siguiente ("mañana pedir laboratorio", "mañana se repite la tomografía") es parte de la indicación: no es el turno mañana (ni de los controles ni de los casilleros de abajo).

PARTE DE ABAJO DE LA HOJA:
- hidratacion: la hidratación indicada (sueros, goteos, planes), tal cual se dicta.
- Diuresis por horario, como en el papel: diuresis_05_13, diuresis_13_21 y diuresis_21_05 (en qué casillero va cada dato: ver la REGLA CRÍTICA del horario, más abajo). Todo lo que se dicte para ese horario (la cantidad en ml, cómo orinó, el día de sonda vesical) va junto en el mismo casillero, tal cual se dicta ("800 ml, orinó bien, día 3 de sonda vesical").
- Drenajes, SNG / Vómitos y Deposiciones, también por horario, con los mismos tres horarios: drenajes_05_13, drenajes_13_21, drenajes_21_05; sng_vomitos_05_13, sng_vomitos_13_21, sng_vomitos_21_05; deposiciones_05_13, deposiciones_13_21, deposiciones_21_05. En cada casillero va lo que se dicte para ese horario, tal cual, SIN interpretar ni convertir:
  - drenajes: en el papel se anota SÍ o NO. Cargá lo que se dicte.
  - sng_vomitos (SNG es sonda nasogástrica; también se dice "sonda", "lo que drenó la sonda" o "vómitos"): en el papel se anota + o − y una descripción (por ejemplo, "sanguinolento"). Cargá lo que se dicte.
  - deposiciones: en el papel se anota X o XX. Cargá lo que se dicte.
  - No lo pases a SÍ / NO, a + / − ni a X / XX si no se dijo así ("positivo" queda "positivo"; "dos" queda "dos").
- REGLA CRÍTICA (horario de la diuresis, los drenajes, el SNG / vómitos y las deposiciones): cada dato va al casillero del horario que se dice, de una de estas formas:
  - Un rango: "de 5 a 13" o "de cinco a trece" es el casillero 05_13; "de 13 a 21", el 13_21; "de 21 a 5", el 21_05. Ejemplo: "diuresis de 13 a 21, 600 ml" es diuresis_13_21 "600 ml".
  - Un turno: "a la mañana", "por la mañana" o "turno mañana" es el casillero 05_13; "a la tarde", "por la tarde" o "turno tarde", el 13_21; "a la noche", "por la noche" o "turno noche", el 21_05. Ejemplo: "drenajes a la tarde: sí" es drenajes_13_21 "sí".
  - Una hora suelta: el casillero cuyo rango la contiene. De las 5:00 a las 12:59 es el 05_13; de las 13:00 a las 20:59, el 13_21; de las 21:00 a las 4:59, el 21_05. "De la mañana", "de la tarde", "de la noche" o "de la madrugada" después de una hora son parte de la hora. Ejemplos: "a las 9 de la mañana, SNG positivo" es sng_vomitos_05_13; "a las cuatro de la tarde, deposiciones X" (16 h) es deposiciones_13_21; "a las 13" va al 13_21; "a las 21" va al 21_05; "a las 2 de la madrugada" va al 21_05.
  - Una hora de 1 a 12 SIN "de la mañana", "de la tarde", "de la noche" ni "de la madrugada" es ambigua (no se sabe si es de día o de noche): no se carga y va a "sin_ubicar". Ejemplo: "a las 9 SNG positivo" va en null en los tres casilleros. De 13 a 24 no hace falta aclarar ("a las 16" es 13_21; "a las 24" es 21_05).
  - La hora, el rango o el turno solo sirven para elegir el casillero: no se escriben adentro. Ejemplo: "diuresis a las 16, 300 ml" es diuresis_13_21 "300 ml".
  - "mañana" vale como turno SOLO cuando se usa como turno: "a la mañana", "por la mañana", "turno mañana", o cuando se enumeran los turnos ("diuresis: mañana 500, tarde 200, noche 300" es diuresis_05_13 "500", diuresis_13_21 "200" y diuresis_21_05 "300"). Si no queda claro si es el turno o el día siguiente ("diuresis 500 mañana"), no se carga y va a "sin_ubicar".
  - Si no se dice ni un rango, ni un turno, ni una hora, no se carga en ningún lado: va a "sin_ubicar". Ejemplo: "vómitos sanguinolentos", a secas, va en null en los tres casilleros.
  - Esta regla es SOLO para estos casilleros de abajo: los controles de enfermería siguen su propia regla (más abajo), que no cambia.

CONTROLES DE ENFERMERÍA, por turno (Mañana, Tarde y Noche). Las columnas son control_<turno>_<dato>, con turno manana, tarde o noche, y dato:
- fr (F.R., frecuencia respiratoria; "respiratoria", "respiraciones"): el número tal cual se dijo.
- te (Te., temperatura; "temperatura", "grados"): el número tal cual se dijo, con coma decimal ("treinta y seis y medio" es "36,5"; "36.5" es "36,5").
- p (P., pulso; "pulso", "frecuencia cardíaca", "latidos"): el número tal cual se dijo.
- ta (T.A., tensión arterial; "tensión", "presión"): siempre con barra, sin palabras ("120 sobre 80" es "120/80"), con los números EXACTAMENTE como se dijeron: no los multipliques, completes ni "traduzcas" ("12-8" es "12/8", nunca "120/80").
- o2 (O2): NO decidas si es saturación u oxígeno que se le da. Cargá el número tal como se dijo y, si se dijo una unidad, con su unidad: "satura 95" es "95"; "2 litros" es "2 litros". Decimales con coma.
- REGLA CRÍTICA (turno): un control dictado SIN decir el turno no se carga en ningún lado: va a "sin_ubicar". Ejemplo: "presión 130 sobre 80", a secas, va en null en los tres turnos y a "sin_ubicar". No supongas el turno por la hora del día ni por el orden en que se dicta.
- Después de nombrar un turno ("turno tarde", "a la tarde", "control de la noche"), los datos que siguen en esa misma frase o enumeración van a ese turno: "turno tarde: presión 130 sobre 80, pulso 76" es control_tarde_ta "130/80" y control_tarde_p "76".
- Los controles van SOLO a sus columnas control_...: nunca a C.S.V. (que es la indicación de controlar), ni a la diuresis, ni a otro campo.
`.trim();
