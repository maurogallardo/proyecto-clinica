# Tareas de Implementación — Demo: Estudio Ergométrico por voz

> Documento de tareas (Spec-Driven Development / Spec Kit).
> Ubicación sugerida en el repo: `specs/001-estudio-ergometrico/tasks.md`
>
> **Fecha:** 2026-09-21
> **Estado:** Borrador para revisión.
> **Basado en:** Constitución (v1.2.0), Especificación y Plan Técnico.

---

## Cómo leer esto

Cada tarea tiene un número (T001, T002...). Se hacen en orden de fase. Dentro de
una fase, las marcadas con **[P]** se pueden hacer en paralelo (no dependen entre
sí). Las fases están ordenadas por prioridad: primero los cimientos, después el
corazón de la demo (P1), y al final lo que se apoya en eso (P2 y P3).

Meta de la demo: llegar con la Fase 2 sólida. Si sobra tiempo, Fase 3 y 4.

---

## Fase 0 — Preparación (cimientos)

- **T001** Crear el repositorio en GitHub para el proyecto ("Proyecto Clínica",
  repo sugerido: `proyecto-clinica`).
- **T002** Crear el proyecto en Vercel y conectarlo al repo de GitHub (para que
  cada cambio subido se publique solo).
- **T003** Crear el proyecto en Supabase (base, auth y storage).
- **T004** [P] Armar la estructura de carpetas del proyecto (index.html, css/,
  js/, assets/, supabase/).
- **T005** [P] Configurar la PWA: `manifest.webmanifest`, `sw.js`, íconos, para
  que se pueda instalar en el celular.

## Fase 1 — Base de datos, login y seguridad

- **T006** Crear la tabla `estudios` con todos sus campos y tipos (según el
  plan), incluidos `documento` y `fecha_estudio` (fecha de la prueba, editable),
  además de `creado_en` (fecha de carga automática).
- **T007** [P] Crear la tabla `etapas` vinculada a `estudios` por `estudio_id`.
- **T008** [P] Crear la tabla `imagenes` vinculada a `estudios` por `estudio_id`.
- **T009** Crear el bucket privado para imágenes en Supabase Storage.
- **T010** Configurar el login con usuario y contraseña.
- **T011** Dar de alta el usuario administrador (Mauro).
- **T012** Configurar Row Level Security básica (cada usuario ve lo que le
  corresponde; en la demo, un solo usuario).
  - *No olvidar (trazabilidad):* la política de `estudios` tiene que exigir que
    `cargado_por` sea el usuario logueado. Hoy tiene ese valor por defecto, pero
    la app podría mandar otro. También evitar que al editar se cambien
    `cargado_por` y `creado_en`. (`modificado_por`/`modificado_en` ya los
    protege un trigger en `schema.sql`.)

## Fase 2 — Historia 1 (P1): cargar por voz y confirmar  ★ corazón de la demo

- **T013** Pantalla de carga: formulario del Estudio Ergométrico con todos los
  campos y la tabla de etapas (arranca con reposo, 3', 6', 9').
- **T014** Permitir agregar y quitar etapas de la tabla.
- **T015** Grabación de voz en el celular (reaprovechar la UI tipo WhatsApp de
  LoMar).
- **T016** Edge Function de transcripción (voz → texto), con la clave a salvo en
  el servidor.
- **T017** Edge Function de estructuración (texto → planilla) con el instructivo
  del ergométrico y el esquema JSON.
- **T018** Escribir y afinar el instructivo (prompt) del ergométrico: no
  inventar, completar solo etapas existentes por tiempo dictado, correcciones sin
  duplicar, documento sin puntos.
- **T019** Acumular varias grabaciones sobre el mismo estudio sin pisar lo ya
  cargado.
- **T020** Ubicar cada dato de etapa en la fila correcta según el tiempo dictado
  (el "buscá el renglón y completalo").
- **T021** Manejar el dato no ubicable con certeza: no cargarlo; señalar que va a
  mano.
- **T022** Pantalla de revisión: mostrar la planilla completa y permitir editar
  cualquier campo a mano.
- **T023** Exigir datos mínimos (paciente) para poder guardar; permitir guardar
  incompleto el resto.
- **T024** Confirmar y guardar el estudio en Supabase (con `cargado_por` y
  `creado_en` automáticos).
- **T042** Diseño adaptativo: que la app se vea bien y muestre la vista correcta
  según el dispositivo (carga en celular, dashboard en computadora). *(cubre
  RF-018)*
- **T043** Manejo del permiso de micrófono, con atención especial a iPhone:
  pedirlo y mostrar un mensaje claro si está denegado. *(cubre RF-020)*
- **T044** Manejo de error de transcripción: si el dictado no se entiende o falla,
  avisar y permitir volver a grabar.

## Fase 3 — Historia 2 (P2): imágenes

- **T025** Sacar foto en el momento y elegir archivos ya guardados en el celular.
- **T026** Convertir las imágenes a formato WebP.
- **T027** Subir las imágenes al bucket privado.
- **T028** Guardar la ruta de cada imagen en la tabla `imagenes`.
- **T029** Mostrar las imágenes con enlaces firmados que caducan (en celular y
  computadora).

## Fase 4 — Historia 3 (P3): dashboard (consultar, editar, imprimir)

- **T030** Vista de dashboard (computadora): listado de estudios con paciente y
  fecha.
- **T031** Abrir un estudio completo con todos sus datos e imágenes.
- **T032** Editar un estudio ya guardado.
  - *No olvidar (trazabilidad):* al guardar una edición, guardar también la fila
    de `estudios` aunque solo hayan cambiado etapas o imágenes. Así el trigger
    registra `modificado_por`/`modificado_en` (el trigger solo mira la tabla
    `estudios`).
- **T033** Imprimir / exportar a PDF con el mismo aspecto que la planilla original
  en papel.

## Fase 5 — Pruebas y cierre de la demo

- **T034** Probar el flujo completo por voz de principio a fin.
- **T035** Verificar cero datos inventados (criterio CE-002).
- **T036** [P] Verificar que los datos de etapa caen en la fila correcta
  (CE-003).
- **T037** [P] Verificar que las correcciones no duplican (CE-004).
- **T038** [P] Probar en un celular Android y en un iPhone (CE-006).
- **T039** [P] Verificar acceso restringido (CE-007).
- **T040** Preparar datos de ejemplo (sin pacientes reales) para mostrar la demo.

---

## Referencia visual (antes de la Fase 2/4 de pantallas)

- **T041** Juntar referencias de Dribbble y pasárselas a Claude Code al construir
  las pantallas (no bloquea las fases de base y datos).

---

## Fuera de estas tareas (posterior a la demo)

- Funcionamiento sin conexión y reenvío automático.
- Tabla de pacientes y macheo por documento.
- Múltiples roles, planillas y clínicas.
- Empaquetado como app nativa.
