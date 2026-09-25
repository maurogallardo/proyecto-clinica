// Modelos de OpenAI que usa la app. Están en UN solo lugar:
// cambiar de modelo es cambiar una línea acá (por ejemplo, a 'gpt-4o-transcribe').

// Voz a texto (función "transcribir")
export const MODELO_TRANSCRIPCION = 'gpt-4o-mini-transcribe';

// Ordena el texto dictado en la planilla (función "estructurar").
// Es el mismo modelo para todas las planillas: lo que cambia por planilla es su
// instructivo y su lista de campos.
// gpt-6-luna "piensa" antes de responder: va con razonamiento bajo y sin ajuste
// de temperatura (no lo acepta). En la comparación de modelos fue el único que no
// perdió el postesfuerzo. Para volver al anterior: 'gpt-4o-mini' con
// AJUSTES_ESTRUCTURACION = { temperature: 0 }.
export const MODELO_ESTRUCTURACION = 'gpt-6-luna';
export const AJUSTES_ESTRUCTURACION: Record<string, unknown> = { reasoning_effort: 'low' };
