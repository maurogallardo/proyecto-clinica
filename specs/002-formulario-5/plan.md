# Plan Técnico — Demo: Formulario N° 5 por voz

> Documento de plan (Spec-Driven Development / Spec Kit).
> Ubicación en el repo: `specs/002-formulario-5/plan.md`
>
> **Fecha:** 2026-10-28
> **Estado:** Borrador para revisión (la grilla de horarios queda pendiente).
> **Basado en:** la Constitución (v1.3.0) y la Especificación
> (`specs/002-formulario-5/spec.md`).

---

## Qué es esto

La especificación dice *qué* tiene que hacer el sistema con el Formulario N° 5.
Este plan dice *cómo*, usando **la misma arquitectura** que ya funciona para el
Estudio Ergométrico. Cada pieza explica qué se reutiliza tal cual, qué se
generaliza (deja de estar atado al ergométrico) y qué es nuevo.

Todo respeta la Constitución: simple, de bajo costo, con la planilla como
contrato, el profesional confirmando siempre y sin inventar datos.

---

## Enfoque general

1. **Una planilla activa, elegida por un interruptor.** Hoy varios archivos usan
   directamente la planilla del ergométrico (`PLANILLA_ERGOMETRICO`): la carga,
   el dictado, el guardado, la edición, la ficha, el dashboard, la Papelera y el
   PDF. Se cambia eso por una **planilla activa**, que sale de una sola línea de
   configuración. Cada planilla declara, en su archivo de configuración, todo lo
   que la diferencia: sus campos, su tabla en la base, sus funciones de guardar,
   editar y Papelera, las columnas de la lista y su hoja del PDF.
2. **El Formulario N° 5 es una planilla más, escrita como configuración**
   (`js/planillas/formulario5.js`), igual que `js/planillas/ergometrico.js`. **No
   se toca `js/formulario.js`.**
3. **En la base, tablas nuevas para el N° 5**, con las mismas reglas de
   seguridad, el mismo historial y la misma Papelera que el ergométrico.
4. **La grilla de horarios queda como un bloque pendiente**, que se diseña y se
   construye cuando Mauro la defina con el enfermero.

---

## Qué se reutiliza tal cual y qué es nuevo

| Pieza | Tal cual | Se generaliza (deja de estar atada al ergométrico) | Nuevo |
|---|---|---|---|
| Login, sesión, vista por aparato (`js/sesion.js`, `js/login.js`, `js/vista.js`) | ✔ | | |
| Dibujar y leer la planilla (`js/formulario.js`) | ✔ (no se toca) | | |
| Grabación, onda, vista previa (`js/grabacion.js`, `js/onda.js`) | ✔ | | |
| Transcribir (Edge Function `transcribir`) | ✔ | | |
| Estructurar (Edge Function `estructurar`) | ✔ el mecanismo | | Instructivo y resguardos del N° 5 |
| Dictado (`js/dictado.js`) | | Usa la planilla activa | |
| Carga y guardado (`js/carga.js`, `js/guardado.js`) | | Planilla activa y su función de guardar | |
| Carteles, avisos, tema, enlaces, calendario (`js/cartel.js`, `js/avisos.js`, …) | ✔ | | |
| Dashboard: lista, números, filtros (`js/dashboard.js`) | | Tabla y columnas de la planilla activa | Tiempo real |
| Ficha (`js/ficha.js`) | | Se arma con la planilla activa; sin fotos si la planilla no tiene | Aviso de "versión nueva" |
| Editar con historial (`js/edicion.js`) | ✔ el mecanismo | Su función de editar | |
| Papelera (`js/papelera.js`) | ✔ el mecanismo | Su tabla y sus funciones | |
| PDF: herramientas (`js/pdf/herramientas.js`) | ✔ casi todo | Hoja horizontal (A4 apaisada) | |
| PDF: armado (`js/pdf/armado.js`) | ✔ el mecanismo | Nombre del archivo por planilla | Registro de la hoja del N° 5 en `HOJAS_PDF` |
| PDF: hoja 1 | | | `js/planillas/formulario5-hoja.js` |
| Planilla del N° 5 | | | `js/planillas/formulario5.js` |
| Base de datos | Las funciones de los triggers (ver abajo) | | Tablas y funciones del N° 5 (`supabase/formulario5.sql`) |
| Grilla de horarios | | | **Pendiente** |

---

## El interruptor (esconder el ergométrico sin borrarlo)

- Una sola línea de configuración en `js/config.js`, por ejemplo:
  `PLANILLA_ACTIVA = 'formulario5'`. Con `'ergometrico'` vuelve a verse el
  Estudio Ergométrico tal como estaba. **No es un botón que vea el usuario.**
- Los archivos del ergométrico (su planilla, su hoja del PDF, su instructivo y
  sus tablas) **quedan en el repo y en la base**, sin cambios. Sus datos siguen
  ahí.
- Las pruebas del ergométrico se siguen corriendo con el interruptor en
  `'ergometrico'`, para comprobar que nada se rompió (criterio CE-005).
- **Opcional, al final:** un menú con dos tarjetas (N° 5 y ergométrico) que
  cambia la planilla activa. Solo si suma y casi no cuesta tiempo.

---

## La planilla como configuración (`js/planillas/formulario5.js`)

Mismo formato que `js/planillas/ergometrico.js` (secciones con sus campos:
columna, etiqueta, tipo, ancho). Con lo que hoy sabe dibujar `js/formulario.js`
(textos, textos largos, enteros, decimales, fechas y subtítulos) se arma todo
menos la grilla:

- **Encabezado:** Fecha (fecha), Hab., Mutual, Dr., Pte., Trámite adm. y
  Diagnóstico (texto largo).
  - *Trámite adm. (SÍ / NO):* **decidido por Mauro:** va como **texto
    controlado**, un texto corto que solo acepta "SÍ" o "NO" (se controla al
    guardar), no como casillero. Así `js/formulario.js` no se toca.
- **Indicaciones médicas:** C.S.V., Tomografía, Electrocardiograma y
  Laboratorio (textos largos, de 2 renglones como el papel), Medicación (texto
  largo de 5 renglones) y Dieta.
  - *Medicación:* por ahora es un texto largo. Si al definir la grilla resulta
    que cada renglón de medicación tiene sus horarios, pasa a ser una lista de
    renglones (como las etapas del ergométrico). Depende de (i).
- **Hidratación:** texto largo.
- **Diuresis:** tres campos, "05 a 13", "13 a 21" y "21 a 5".
- **Drenajes, SNG / Vómitos, Deposiciones:** textos (uno por día o por turno,
  según (vi)).
- **Controles de enfermería:** subtítulos Mañana, Tarde y Noche, cada uno con
  F.R., Te., P., T.A. y O2.
  - Tipos **a confirmar** con el enfermero: F.R. y P. parecen enteros, Te. un
    decimal con coma ("36,5"), T.A. un texto ("120/80"), y O2 queda como texto
    hasta saber cómo se anota.
- **Etapas:** el N° 5 no tiene la tabla de etapas del ergométrico. Como
  `js/formulario.js` y el dictado esperan que la planilla declare `etapas`, se
  declara vacía (sin campos), y la Fase 2 comprueba que todo funcione así sin
  tocar `js/formulario.js`.

---

## El dictado y la IA (instructivo y esquema del N° 5)

- **Lo que ya sirve tal cual:** la función `estructurar` recibe la planilla tal
  como está en pantalla y devuelve **solo** lo dictado; lo no dictado vuelve
  vacío y significa "no se toca". Por eso **dictar por partes ya funciona**: cada
  grabación suma a lo cargado sin pisarlo. El esquema de datos se arma solo a
  partir de los campos que manda la app.
- **Lo nuevo:**
  - `supabase/functions/estructurar/instructivos/formulario5.ts`: el instructivo
    del N° 5. Le enseña, por ejemplo, que "turno mañana" va a los Controles de
    Mañana, que "C.S.V." puede dictarse como "control de signos vitales"
    (**a confirmar con el enfermero**), y que nunca complete ni calcule nada.
  - Sus **resguardos** (palabras clave por campo y valores máximos razonables),
    que se definen con el enfermero.
  - Una línea en el registro de instructivos de `estructurar`.
- **Horarios (pendiente):** la IA **nunca** marca horarios que no se dijeron. Si
  se decide marcar horarios a partir de una frecuencia ("cada 4 horas"), lo hace
  el **código** con reglas fijas, se muestra como propuesta y el profesional la
  confirma antes de guardar (spec, RF-005).

---

## Modelo de datos (qué se guarda en Supabase)

El SQL va en un archivo nuevo, `supabase/formulario5.sql`. **Mauro y Claude lo
revisan antes de correrlo; acá no se escribe.**

### Tabla `hojas_indicaciones` (una fila por hoja)

- **Un número correlativo propio** (N° de hoja), puesto por la base y que no se
  reutiliza. Confirmar si se quiere mostrar en pantalla y en el PDF (el papel no
  lo tiene).
- **Los campos del papel:** fecha de la hoja, habitación, mutual, médico (Dr.),
  paciente, trámite administrativo, diagnóstico, C.S.V., tomografía,
  electrocardiograma, laboratorio, medicación, dieta, hidratación, diuresis por
  turno (3), drenajes, SNG / vómitos, deposiciones y los controles de enfermería
  (3 turnos × 5 datos).
- **Trazabilidad:** quién la cargó y cuándo; quién la editó por última vez y
  cuándo (como el ergométrico).
- **Papelera:** las mismas columnas de estado que `estudios`.

### Grilla de horarios — **pendiente**

Una tabla aparte (por ejemplo, `hojas_horarios`, varias filas por hoja), con qué
se marcó, en qué renglón y en qué horario. Se diseña cuando se defina (i).

### Historial y Papelera del N° 5

- `hojas_historial`: cómo estaba la hoja antes de cada edición (la fila completa
  y, cuando exista, sus horarios), quién y cuándo. Sin ningún acceso desde la
  app, ni para leer.
- `hojas_papelera_registro`: cada borrado y restauración, quién y cuándo.

### Funciones de la base (las mismas ideas que el ergométrico)

- **Guardar** (todo o nada, con reintento seguro con el mismo código), como
  `guardar_estudio`.
- **Editar con historial** (edición cruzada con el código `CL409`, "sin
  cambios", rechaza lo que está en la Papelera), como `editar_estudio`.
- **Mandar a la Papelera y restaurar**, como `anular_estudio` y
  `restaurar_estudio`.
- **Triggers:** las funciones que ya existen para `estudios` (no se puede
  falsear quién cargó ni cuándo; "Última edición"; la Papelera solo se toca con
  sus funciones) trabajan con columnas que se llaman igual. Si la tabla nueva usa
  esos mismos nombres, **se reutilizan las mismas funciones** y solo se crean los
  triggers nuevos. Se confirma al escribir el SQL.

### Seguridad (igual que el ergométrico)

- RLS encendido. Cada usuario ve y carga solo lo suyo.
- La app puede ver e insertar, pero no modificar ni borrar directo: toda
  corrección pasa por la función que deja historial.
- Historial sin acceso desde la app. Nada de claves en el repo.

---

## Dashboard (computadora)

- **Lista:** las columnas salen de la configuración de la planilla activa. Para
  el N° 5: fecha, habitación, paciente, Dr. y diagnóstico resumido. Mismos
  números (Total, Hoy, Esta semana, Este mes) y mismo calendario de rango.
  Búsqueda por paciente y habitación (no hay DNI).
- **Ficha:** se arma con las secciones de la planilla, en el orden del papel, con
  lo vacío como "—". El N° 5 no tiene fotos: esa sección no aparece. Botones:
  Imprimir, Descargar PDF, Editar y Borrar (los mismos de hoy).
- **Editar:** el mismo mecanismo de `js/edicion.js`, con la función de editar del
  N° 5.
- **Papelera:** el mismo mecanismo de `js/papelera.js`, con las funciones del
  N° 5.

### Tiempo real

- Se usa **Supabase Realtime** (incluido en el plan gratuito; no suma costo,
  principio 6). La tabla del N° 5 se suma a la publicación de Realtime en el SQL
  de la Fase 1.
- Realtime respeta las mismas reglas de RLS: cada usuario recibe solo los avisos
  de sus hojas.
- Cuando llega un aviso (hoja nueva, editada o mandada a la Papelera), la lista
  se vuelve a pedir sola (agrupando varios avisos seguidos en uno).
- Si la ficha que se está mirando cambió, **no se reemplaza sola**: aparece un
  aviso "Hay una versión nueva" para cargarla. Si se está editando, sigue
  valiendo la edición cruzada (`CL409`).
- Si se corta la conexión, se avisa, y al volver se pide la lista de nuevo.
- La suscripción se cierra al cerrar sesión (privacidad).

---

## Impresión y PDF (A4 horizontal)

- **Nuevo:** `js/planillas/formulario5-hoja.js`, la hoja del N° 5, registrada en
  `HOJAS_PDF` (como la del ergométrico). Copia el diseño del papel en A4
  **apaisada**: encabezado, indicaciones a la izquierda, grilla de horarios a la
  derecha, dieta a lo ancho, y abajo Hidratación, Diuresis, Drenajes, SNG /
  Vómitos, Deposiciones y Controles de enfermería.
- **Se reutiliza:** las fuentes incrustadas, los renglones de puntos, partir
  textos, el control de caracteres, la regla de "letra más chica hasta 8 pt y, si
  no entra, hoja de continuación", descargar e imprimir.
- **Se generaliza:** `js/pdf/herramientas.js` arma hoy siempre hojas verticales;
  pasa a aceptar hoja horizontal. El nombre del archivo pasa a depender de cada
  planilla (para el N° 5, a definir: por ejemplo fecha, habitación y paciente).
- **Grilla en el PDF:** pendiente de (i).
- **Logo y marca:** el papel del N° 5 no tiene logo ni pie de la clínica.
  Confirmar si el PDF lo lleva.

---

## Completar la hoja desde el celular (posterior al núcleo)

Decidido por Mauro (spec, Decisiones tomadas 7, Historia 8, RF-017): enfermería
abre desde el celular una hoja ya guardada y le sigue dictando, porque en el
papel la hoja se va llenando durante el día. Va **después** del núcleo: cargar,
dashboard, editar en la computadora, Papelera y PDF.

Cómo, sin piezas nuevas de fondo:

- **En el celular**, una lista corta de las hojas propias (por ejemplo, las de
  hoy) para elegir cuál seguir.
- **Se abre en la misma pantalla de carga**, con sus datos ya puestos. Se dicta
  como siempre: lo no dictado vuelve vacío y no se toca, así que lo anterior no
  se pisa.
- **Se revisa y se confirma** antes de guardar.
- **Se guarda con la misma función de editar**, con historial, edición cruzada
  (`CL409`) y "sin cambios". Por eso no hace falta SQL nuevo para esto: alcanza
  con lo de la Fase 1.
- **En el dashboard abierto se ve en tiempo real**, como cualquier edición.

---

## Chequeo contra la Constitución

- **La planilla es el contrato:** mismos campos, nombres y orden que el papel;
  lo que el papel no aclara queda marcado [A DEFINIR], sin inventar.
- **Última palabra del profesional:** revisión obligatoria; cualquier propuesta
  automática de horarios se confirma antes de guardar.
- **Nunca inventar:** la IA solo carga lo dicho. Los horarios, si se calculan, los
  calcula el código con reglas fijas, como propuesta.
- **Simplicidad:** misma arquitectura; planilla como configuración; sin
  librerías nuevas. Realtime viene con Supabase.
- **Privacidad:** mismas reglas de RLS e historial sin acceso. Nada en el
  navegador ni en la consola.
- **Bajo costo:** Realtime y todo lo demás entran en los planes que ya se usan.
- **Trazabilidad:** quién cargó, quién editó y cuándo; historial y registro de la
  Papelera.

---

## Riesgos y cómo se cuidan

- **Generalizar archivos compartidos puede romper el ergométrico:** se corre la
  batería de pruebas del ergométrico con el interruptor en `'ergometrico'`
  después de cada cambio.
- **Dictar por turnos puede confundir a la IA** ("tarde" como turno o como
  palabra común): resguardos y pruebas con dictados de ejemplo, y lo dudoso va
  aparte.
- **Varios roles en la misma hoja:** con la regla de visibilidad actual, una hoja
  la ve y la completa solo quien la cargó. Está bien para la demo; es lo primero
  a revisar para usarla de verdad.

---

## Fuera de este plan (posterior a la demo)

- Multi-rol (médico y enfermería en la misma hoja) y reglas de visibilidad por
  rol.
- Pantalla del historial de ediciones.
- Fotos en el N° 5 (si hicieran falta).
- Uso sin conexión.
