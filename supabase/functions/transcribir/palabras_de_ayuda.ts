// Palabras de ayuda para la transcripción (como en LoMar): una lista por planilla,
// para que el transcriptor escriba bien los términos de esa hoja. (T002 del
// Formulario N° 5.)
//
// La app avisa qué planilla es con el dato "planilla" (por ejemplo 'ergometrico').
// Decidido por Mauro:
//   - si la app NO avisa ninguna planilla (una versión vieja de la app): se usan
//     las del ergométrico, como siempre;
//   - si avisa una planilla que tiene lista: se usa la suya;
//   - si avisa una planilla que NO tiene lista: no se usa ninguna (así no se
//     mezclan vocabularios de planillas distintas).
//
// Sumar una planilla = sumar su lista acá (con el OK de Mauro).

const PALABRAS: Record<string, string> = {
  // Estudio Ergométrico: términos generales de cardiología
  ergometrico:
    'Estudio ergométrico del Servicio de Cardiología del Sanatorio de la Cañada, Río Tercero. ' +
    'Términos: ergometría, ergométrico, MET, T.A., tensión arterial, F.C., frecuencia cardíaca, ' +
    'FCIA, QRS, PQ, QT, ritmo sinusal, eje, postesfuerzo, cicloergómetro, cinta, protocolo de Bruce, ' +
    'electrocardiograma, disnea, angor, precordial, isquemia, asintomático, taquicardia, bradicardia, ' +
    'extrasístoles, supradesnivel, infradesnivel, segmento ST, bloqueo de rama, hipertensión, ' +
    'dislipemia, tabaquismo.',

  // Formulario N° 5 (aprobada por Mauro, texto exacto)
  formulario5:
    'Formulario N° 5: hoja de indicaciones médicas y controles de enfermería de pacientes ' +
    'internados del Sanatorio de la Cañada, Río Tercero. Términos: habitación, mutual, paciente, ' +
    'trámite administrativo, diagnóstico, indicaciones médicas, C.S.V., tomografía, ' +
    'electrocardiograma, laboratorio, medicación, dieta, horarios, hidratación, diuresis, drenajes, ' +
    'SNG, vómitos, deposiciones, controles de enfermería, turno mañana, turno tarde, turno noche, ' +
    'F.R., Te., P., T.A., O2.',
};

// La de siempre, para cuando la app no avisa qué planilla es
const PLANILLA_SIN_AVISO = 'ergometrico';

// Las palabras de ayuda que corresponden, o null si no hay que mandar ninguna.
//   planilla: lo que mandó la app (null si no mandó nada)
export function palabrasDeAyuda(planilla: unknown): string | null {
  // No avisó ninguna planilla (no vino el dato, o vino vacío)
  if (planilla === null || planilla === undefined) return PALABRAS[PLANILLA_SIN_AVISO];
  if (typeof planilla === 'string' && planilla.trim() === '') return PALABRAS[PLANILLA_SIN_AVISO];
  // Avisó una planilla: la suya si tiene lista; si no, ninguna.
  // (Object.hasOwn: que un nombre raro como "constructor" no devuelva otra cosa)
  if (typeof planilla !== 'string') return null;
  const id = planilla.trim();
  return Object.hasOwn(PALABRAS, id) ? PALABRAS[id] : null;
}
