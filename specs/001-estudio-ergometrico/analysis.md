# Análisis de Coherencia (analyze) — Demo: Estudio Ergométrico

> Documento de análisis (Spec-Driven Development / Spec Kit).
> Ubicación sugerida en el repo: `specs/001-estudio-ergometrico/analysis.md`
>
> **Fecha:** 2026-09-21
> **Qué revisa:** que la Constitución, la Especificación, el Plan y las Tareas
> encajen entre sí, sin contradicciones ni huecos, antes de programar.

---

## Resultado general

El conjunto es coherente y está listo para programar una vez resueltos los
hallazgos de abajo. La mayoría de los requisitos tienen su tarea, el plan cubre
la especificación, y nada choca con la Constitución. Se detectaron 7 puntos a
afinar: 2 de prioridad alta, 3 media y 2 baja.

---

## Cobertura: cada requisito tiene su tarea

Se verificó que los requisitos funcionales (RF) de la spec tengan al menos una
tarea que los cumpla. Resultado: todos cubiertos, salvo los señalados en los
hallazgos H3 (RF-018) y H4 (RF-020, parte de implementación).

Los requisitos marcados como posteriores a la demo (RF-024, RF-025 offline)
correctamente no tienen tarea.

---

## Hallazgos

### Prioridad ALTA

**H1 — La "fecha" del estudio es ambigua.**
La planilla original tiene un campo FECHA. Se decidió que "la fecha y hora las
pone el sistema" (RF-016), y el modelo guarda `creado_en` (fecha de carga). Pero
falta distinguir dos cosas: la fecha en que se hizo la prueba y la fecha en que
se carga al sistema. Si el estudio siempre se carga en el momento, son la misma y
`creado_en` alcanza. Si a veces se carga después, hace falta un campo aparte para
la fecha real de la prueba.
*Recomendación:* confirmar con Mauro. Si siempre se carga en el acto, dejar solo
`creado_en`. Si no, agregar un campo `fecha_estudio` que el profesional pueda
dictar o corregir.

**H2 — El costo de la IA no está cuantificado (tensión con "bajo costo").**
La Constitución pide bajo costo, y Vercel y Supabase tienen plan gratuito. Pero
la transcripción (Whisper) y el asistente (LLM) se pagan por uso: no son gratis.
Para la demo el costo es mínimo (centavos), pero conviene tenerlo claro desde
ahora, sobre todo para cuando escale y haya que definir quién paga ese consumo.
*Recomendación:* aceptar el costo para la demo (es bajo) y anotarlo como tema a
conversar con la clínica al escalar. No bloquea nada.

### Prioridad MEDIA

**H3 — La vista que cambia según el dispositivo no tiene tarea propia.**
El RF-018 dice que la app se ve como carga en el celular y como dashboard en la
computadora. Hay tareas para la pantalla de carga (T013) y para el dashboard
(T030), pero ninguna que se encargue explícitamente de detectar el dispositivo y
mostrar la vista correcta, ni de que todo se vea bien en pantallas chicas y
grandes.
*Recomendación:* agregar una tarea de diseño adaptativo (responsive) en la Fase
2.

**H4 — La compatibilidad con iPhone solo está en pruebas, no en construcción.**
Se sabe que el iPhone es especial con el permiso de micrófono para grabar
(mencionado como caso límite). Hay una tarea para *probar* en iPhone (T038), pero
ninguna para *manejar* el pedido de permiso de micrófono y avisar bien al usuario
si está denegado.
*Recomendación:* agregar una tarea de manejo del permiso de micrófono (pedirlo,
y mensaje claro si falta), en la Fase 2.

**H5 — Qué pasa si la transcripción sale mal no tiene tarea.**
La spec lista como caso límite que el dictado no se entienda o la transcripción
falle, pero no hay tarea que defina qué hace el sistema entonces (avisar, permitir
regrabar).
*Recomendación:* agregar una tarea chica de manejo de error de transcripción
(mensaje + volver a grabar) en la Fase 2.

### Prioridad BAJA

**H6 — El proyecto todavía no tiene nombre.**
La primera tarea (T001) es crear el repositorio en GitHub, que necesita un
nombre. El proyecto sigue sin nombre definitivo.
*Recomendación:* elegir un nombre (aunque sea provisorio) antes de la Fase 0.

**H7 — Las correcciones dictadas no tienen una verificación dedicada.**
La lógica de corregir sin duplicar está en el instructivo (T018) y se prueba en
T037, pero conviene tenerla presente como comportamiento a cuidar, porque es de
los que más fácilmente fallan.
*Recomendación:* mantener T037 y prestarle atención especial al probar.

---

## Chequeo contra la Constitución

- La planilla es el contrato: respetado (modelo copia la planilla). ✔
- El profesional confirma: respetado. ✔
- Nunca inventar: respetado. ✔
- Simplicidad entendible: respetado. ✔
- Privacidad por diseño: respetado. ✔
- Bajo costo: respetado con la salvedad de H2 (la IA tiene costo por uso). ⚠
- Trazabilidad: respetado. ✔

---

## Conclusión

Ninguno de los hallazgos rompe el proyecto. H1 (fecha) es el único que toca el
modelo de datos y conviene resolver antes de la Fase 1. El resto se resuelve
agregando tareas chicas (H3, H4, H5), tomando una decisión (H6) o simplemente
teniéndolo presente (H2, H7).

---

## Estado de resolución (actualizado 2026-09-21)

- **H1 (fecha):** RESUELTO. El estudio puede cargarse más tarde, así que se
  agregó el campo `fecha_estudio` (dictable/editable) separado de `creado_en`
  (carga automática). Actualizados plan, spec y tareas.
- **H2 (costo IA):** ACEPTADO. Se usará la cuenta de OpenAI de Mauro (Whisper +
  gpt-4o-mini); la clave se provee en el armado y vive en la Edge Function. Costo
  por uso, bajo para la demo; a conversar con la clínica al escalar.
- **H3 (vista adaptativa):** RESUELTO. Agregada la tarea T042.
- **H4 (micrófono iOS):** RESUELTO. Agregada la tarea T043.
- **H5 (error de transcripción):** RESUELTO. Agregada la tarea T044.
- **H6 (nombre):** RESUELTO. El proyecto se llama "Proyecto Clínica" (repo
  `proyecto-clinica`).
- **H7 (correcciones):** PRESENTE. Se mantiene la atención especial en T037.

Con esto, los cuatro documentos quedan coherentes y listos para la etapa de
implementación.
