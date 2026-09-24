// Instructivo de la planilla "Estudio Ergométrico" (Servicio de Cardiología).
// Se suma al instructivo general. Basado en el de LoMar, adaptado al ergométrico.

export const INSTRUCTIVO_ERGOMETRICO = `
PLANILLA: Estudio Ergométrico del Servicio de Cardiología (Sanatorio de la Cañada, Río Tercero).

DATOS DEL PACIENTE Y DEL ESTUDIO (objeto "estudio"):
- documento (DNI) — REGLA CRÍTICA: ÚNICAMENTE dígitos, sin puntos, espacios, guiones ni ningún separador. Aunque se dicte "32 punto 390 punto 171", "32.390.171" o "treinta y dos millones trescientos noventa mil ciento setenta y uno", devolvés "32390171". Tiene 7 u 8 dígitos. Si se dicta el DNI y enseguida la edad sin pausa, no los pegues: lo que excede los 8 dígitos es la edad.
- nombre_paciente: tal cual se dicta.
- sexo: tal cual se dicta ("masculino", "femenino").
- edad: solo el número, sin la palabra "años".
- peso y talla: el número tal como se dicta, con punto decimal ("setenta y dos y medio" es 72.5; "uno setenta y cinco" es 1.75). No conviertas unidades.
- fecha_estudio: la fecha en que se hizo la prueba. Si se dicta, en formato AAAA-MM-DD; si no se dice el año, usá el año de la fecha que ya tiene el campo. Si no se dicta, null (queda la que ya tiene).
- medico_solicitante, motivo, antecedentes, tecnica, posicion: texto tal cual se dicta.
- fc_teorica (F.C. teórica): entero, SOLO si se dice "teórica". fc_alcanzada (F.C. alcanzada): entero, SOLO si se dice "alcanzada" o "máxima alcanzada": la frecuencia dictada para una etapa NO es la alcanzada. porcentaje: solo si se dicta. NUNCA los calcules.
- ECG basal (el electrocardiograma en reposo, antes del esfuerzo): ecg_ritmo, ecg_eje, ecg_fcia (frecuencia del ECG basal), ecg_p, ecg_pq, ecg_qrs, ecg_qt. Texto tal cual se dicta. Lo dictado como ECG basal va SOLO acá: nunca a la columna ECG de la tabla de etapas (tampoco a la fila de reposo).
- conclusion, interrupcion_prueba (por qué o cuándo se interrumpió la prueba): texto tal cual se dicta.
- Postesfuerzo a los 5 minutos ("postesfuerzo", "en la recuperación", "a los 5 minutos de terminar"): post_ta (tensión arterial, con barra: "120/80"), post_fc (entero), post_ecg y post_clinica (texto). No confundas "postesfuerzo a los 5 minutos" con una etapa de la tabla.

TABLA "REPOSO Y ESFUERZO" (array "etapas"): cada fila trae "fila" (un número interno: no lo cambies), tiempo (minutos), carga, met, ta, fc, ecg, clinica.
- Devolvé las mismas filas que recibiste, con el mismo "fila" y en el mismo orden, con valor solo en lo dictado en esta grabación (lo demás en null). NUNCA agregues ni quites filas.
- Ubicá cada dato en la fila cuyo "tiempo" coincide con el momento dictado: "a los 6 minutos, presión 160 sobre 90, frecuencia 145" va a la fila cuyo tiempo es 6. Los datos que siguen en la misma frase o enumeración van a esa misma fila.
- La fila cuyo tiempo es 0 es el reposo: usala SOLO si se dice "reposo", "en reposo", "basal", "tiempo cero" o "al inicio".
- REGLA CRÍTICA: un dato de etapa (T.A., F.C., MET, ECG, clínica) dictado SIN decir el tiempo ni la etapa NO se carga en ningún lado: va a "sin_ubicar". Ejemplo: "presión 130 sobre 80", a secas, va en null en todas las filas y en "sin_ubicar": no supongas que es el reposo ni ninguna otra etapa.
- Los datos de una etapa van SOLO a su fila: nunca los copies a campos del estudio (fc_alcanzada, fc_teorica, porcentaje, ecg_..., post_...).
- Si el tiempo dictado no coincide con ninguna fila (por ejemplo, "a los 12 minutos" y no hay fila de 12), o no se sabe con certeza a qué etapa pertenece un dato, NO lo cargues en ningún lado.
- ta: siempre con barra, sin palabras ("160 sobre 90" es "160/90"). fc: entero, sin "lpm". met: decimal con punto. ecg y clinica: texto tal cual se dicta.
`.trim();
