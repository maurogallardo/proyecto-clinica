// Modelos de OpenAI que usa la app. Están en UN solo lugar:
// cambiar de modelo es cambiar una línea acá (por ejemplo, a 'gpt-4o-transcribe').

// Voz a texto (función "transcribir")
export const MODELO_TRANSCRIPCION = 'gpt-4o-mini-transcribe';

// Ordena el texto dictado en la planilla (función "estructurar").
// Es el mismo modelo para todas las planillas: lo que cambia por planilla es su
// instructivo y su lista de campos.
export const MODELO_ESTRUCTURACION = 'gpt-4o-mini';
