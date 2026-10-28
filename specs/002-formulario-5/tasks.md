# Tareas de Implementación — Demo: Formulario N° 5 por voz

> Documento de tareas (Spec-Driven Development / Spec Kit).
> Ubicación en el repo: `specs/002-formulario-5/tasks.md`
>
> **Fecha:** 2026-10-28
> **Estado:** Borrador para revisión.
> **Basado en:** Constitución (v1.3.0), Especificación y Plan Técnico de
> `specs/002-formulario-5/`.

---

## Cómo leer esto

Cada tarea tiene un número (T001, T002…). **Estos números son de este documento**:
no son los del Estudio Ergométrico (`specs/001-estudio-ergometrico/tasks.md`). Se
hacen en orden de fase; las marcadas **[P]** se pueden hacer en paralelo. Ninguna
lleva ✅ hasta que Mauro la pruebe.

- **🔒 BLOQUEADA:** no se empieza hasta que Mauro la defina con el enfermero
  (spec, puntos [A DEFINIR]).
- **Regla de siempre:** el SQL se escribe en un archivo, lo revisan Mauro y
  Claude, y lo corre Mauro en el SQL Editor. Nunca se ejecuta desde acá.

Meta de la demo: llegar con las Fases 0 a 3 sólidas. La Fase 4 (PDF) si alcanza.

---

## Fase 0 — Constitución e interruptor

- **T001** Constitución v1.3.0 (`.specify/memory/constitution.md`): la demo gira
  alrededor del Formulario N° 5; el Estudio Ergométrico queda detrás de un
  interruptor; el N° 5 lo llenan varios roles pero en la demo vale la regla
  actual de visibilidad.
- **T002** El interruptor: `PLANILLA_ACTIVA` en `js/config.js` (`'formulario5'` o
  `'ergometrico'`). Sin botón para el usuario.
- **T003** Generalizar los archivos que hoy usan directo `PLANILLA_ERGOMETRICO`
  para que usen la planilla activa, **sin tocar `js/formulario.js`**:
  - `js/carga.js`, `js/dictado.js` y `js/guardado.js`;
  - `js/edicion.js` y `js/ficha.js`;
  - `js/dashboard.js` y `js/papelera.js`;
  - `js/pdf/armado.js`.

  Cada planilla declara en su configuración su tabla, sus funciones de guardar,
  editar y Papelera, las columnas de la lista y su hoja del PDF.
- **T004** Con el interruptor en `'ergometrico'`, correr **todas** las pruebas del
  ergométrico: tiene que andar igual que hoy (criterio CE-005).

## Fase 1 — Base de datos (`supabase/formulario5.sql`, lo corre Mauro)

- **T005** Escribir `supabase/formulario5.sql` (sin ejecutarlo):
  - tabla `hojas_indicaciones` con los campos del papel, número correlativo,
    trazabilidad y columnas de Papelera;
  - RLS: ver e insertar lo propio; sin UPDATE ni DELETE directo;
  - triggers con las funciones que ya existen (confirmar que sirven con los
    mismos nombres de columna).
- **T006** [P] En el mismo archivo: función de **guardar** (todo o nada, reintento
  seguro), como `guardar_estudio`.
- **T007** [P] En el mismo archivo: **historial** (`hojas_historial`, sin acceso
  desde la app) y función de **editar** (edición cruzada `CL409`, "sin cambios",
  rechaza la Papelera), como `editar_estudio`.
- **T008** [P] En el mismo archivo: **Papelera** (`hojas_papelera_registro`) y
  funciones de anular y restaurar, como las del ergométrico.
- **T009** En el mismo archivo: sumar la tabla a la publicación de **Realtime**.
- **T010** Probar el SQL en la base de prueba de la compu (como `edicion.sql`),
  con dos usuarios y un anónimo. Mostrarlo completo en el chat. Mauro lo corre y
  confirma con una consulta de permisos.
- **T011** 🔒 **BLOQUEADA** — Tabla de la **grilla de horarios** (por ejemplo,
  `hojas_horarios`). Espera (i), (ii) y (iv).

## Fase 2 — Pantalla de carga y dictado (celular)

- **T012** `js/planillas/formulario5.js`: la planilla como configuración, con los
  mismos campos, nombres y orden que el papel (spec, "La hoja en papel"). Tipos
  de los controles **a confirmar** con el enfermero.
- **T013** Comprobar que `js/formulario.js` la dibuja y la lee **sin cambios**
  (incluido declarar `etapas` vacías). Si algo no alcanza, frenar y consultar
  antes de tocarlo.
- **T014** Instructivo del N° 5
  (`supabase/functions/estructurar/instructivos/formulario5.ts`) y sus
  resguardos, más una línea en el registro de `estructurar`. Turnos (Mañana,
  Tarde, Noche) y nombres de las indicaciones como se dicen.
- **T015** Dictar por partes: varias grabaciones sobre la misma hoja sin pisar
  lo cargado (el mecanismo ya lo hace; probarlo con el N° 5).
- **T016** Revisión y guardado:
  - datos mínimos (**[A DEFINIR] (vii)**);
  - Trámite adm. como **texto controlado**, solo "SÍ" o "NO", sin casilleros
    (decidido por Mauro);
  - números con coma y cartel de confirmar;
  - que se guarde exactamente lo confirmado.
- **T017** Pruebas de "nunca inventar" con dictados de ejemplo del N° 5 (sin datos
  reales de pacientes).
- **T018** 🔒 **BLOQUEADA** — **Grilla de horarios** en la pantalla de carga: qué
  se marca, cómo se llena, y la repetición ("cada 2 / cada 4 horas"): si la
  propone el código o se carga a mano. Siempre confirmada por el profesional antes
  de guardar. Espera (i) y (ii).
- *(La T019, completar desde el celular una hoja ya guardada, pasó a la Fase 6:
  es posterior al núcleo.)*

## Fase 3 — Dashboard (lista, ficha, editar, tiempo real, Papelera)

- **T020** Lista del N° 5: fecha, habitación, paciente, Dr. y diagnóstico
  resumido. Números, calendario de rango y búsqueda por paciente o habitación.
- **T021** Ficha del N° 5: todas las secciones en el orden del papel, sin la
  sección de fotos. Botones Imprimir, Descargar PDF, Editar y Borrar.
- **T022** Editar con historial: el mismo mecanismo de `js/edicion.js` con la
  función del N° 5. La pantalla no menciona el historial.
- **T023** **Tiempo real:**
  - la lista se actualiza sola al guardar, editar o mandar a la Papelera una hoja
    del mismo usuario;
  - en la ficha abierta, aviso "Hay una versión nueva";
  - aviso si se corta la conexión;
  - la suscripción se cierra al cerrar sesión.
- **T024** Papelera del N° 5: el mismo mecanismo de `js/papelera.js` con sus
  funciones.
- **T025** Pruebas: con Supabase simulado y contra el real, solo con hojas de
  prueba. Comprobar que un usuario no ve las hojas de otro.

## Fase 4 — PDF horizontal

- **T026** `js/pdf/herramientas.js`: aceptar hoja A4 **horizontal** (sin romper la
  vertical del ergométrico).
- **T027** `js/planillas/formulario5-hoja.js`: la hoja del N° 5 parecida al papel,
  registrada en `HOJAS_PDF`. Mismas reglas: nada inventado, nada cortado, letra
  mínima y hoja de continuación.
- **T028** Nombre del archivo del N° 5 (a definir: por ejemplo fecha, habitación y
  paciente) y si el PDF lleva logo (el papel no tiene).
- **T029** 🔒 **BLOQUEADA** — La grilla de horarios en el PDF. Espera (i).
- **T030** PDF de ejemplo para imprimir en la Epson (fuera del repo).

## Fase 5 — Pruebas y demo

- **T031** Ciclo completo con dictados de ejemplo: dictar por partes →
  transcribir → estructurar → revisar → corregir → confirmar → guardar → ver en
  el dashboard en tiempo real → editar → PDF.
- **T032** [P] Verificar cero datos inventados (CE-002).
- **T033** [P] Verificar el acceso restringido (CE-006).
- **T034** [P] Probar en Android y en iPhone.
- **T035** Con el interruptor en `'ergometrico'`, el Estudio Ergométrico sigue
  andando (CE-005).
- **T036** Lista de casos revisados a mano antes de la demo.

## Fase 6 — Completar desde el celular una hoja ya guardada (posterior al núcleo)

Decidido por Mauro: en el papel la hoja se va llenando durante el día, así que
enfermería tiene que poder seguir dictándole desde el celular. Se hace **después**
del núcleo (Fases 0 a 5).

- **T019** Abrir desde el celular una hoja ya guardada y seguir dictándole
  (spec, Historia 8, RF-017):
  - en el celular, una lista corta de las hojas propias (por ejemplo, las de hoy)
    para elegir cuál seguir;
  - se abre en la pantalla de carga con sus datos ya puestos;
  - cada grabación suma sin pisar lo anterior;
  - se revisa y se confirma antes de guardar;
  - se guarda con la función de editar del N° 5, con historial, edición cruzada
    y "sin cambios" (no hace falta SQL nuevo);
  - en el dashboard abierto se ve en tiempo real.

## Opcional (solo si suma y casi no cuesta tiempo)

- **T037** Menú con dos tarjetas (Formulario N° 5 y Estudio Ergométrico) para
  elegir la planilla.

---

## Preguntas para Mauro y el enfermero

Las de la spec, puntos (i) a (vii). El (v) ya se decidió: es la Fase 6.

- **(i)** Qué significa cada marca de la grilla de horarios y cómo se llena.
- **(ii)** La repetición de horarios ("cada 2 / cada 4 horas"): si se marca y
  quién la marca.
- **(iii)** Quién llena cada parte.
- **(iv)** Cuántas hojas por paciente y por día.
- **(vi)** Turnos: si Drenajes, SNG / Vómitos y Deposiciones van por turno; si los
  turnos de Diuresis son los mismos que Mañana, Tarde y Noche; si cada turno
  lleva uno o varios controles.
- **(vii)** Datos mínimos para guardar una hoja.

Y otras más chicas:

- Tipos de los controles (F.R., Te., P., T.A., O2) y cómo se anota el O2.
- Si la hoja lleva un N° visible y si el PDF lleva logo.
- Nombre del archivo del PDF.

---

## Fuera de estas tareas (posterior a la demo)

- Multi-rol y visibilidad por rol (médico y enfermería en la misma hoja).
- Pantalla del historial.
- Fotos en el N° 5.
- Uso sin conexión.
