# Plan Técnico — Demo: Carga de Estudio Ergométrico por voz

> Documento de plan (Spec-Driven Development / Spec Kit).
> Ubicación sugerida en el repo: `specs/001-estudio-ergometrico/plan.md`
>
> **Fecha:** 2026-09-21
> **Estado:** Borrador para revisión.
> **Basado en:** la Constitución (v1.2.0) y la Especificación (clarify resuelto).

---

## Qué es esto

La especificación decía *qué* tiene que hacer el sistema. Este plan dice *cómo*
lo vamos a hacer: qué tecnología cumple cada cosa, cómo se guarda la información,
cómo se conectan las partes, y cómo se protege. Es el puente entre la spec y las
tareas de programación.

Todo lo de acá respeta la Constitución: simple, entendible, de bajo costo, con la
planilla como contrato, el profesional confirmando siempre, y sin inventar datos.

---

## Enfoque general

Reaprovechamos el corazón ya probado del proyecto anterior (LoMar) para la parte
de voz y del asistente que llena la planilla, y lo adaptamos a la nueva base
(Supabase). Lo nuevo que LoMar no tenía —Supabase, las imágenes y el PDF con
formato de planilla— se diseña a medida para este proyecto.

---

## Stack tecnológico (qué herramienta cumple qué)

- **La app (lo que ve el usuario):** HTML, CSS y JavaScript sin frameworks,
  hecha como PWA (se instala en el celular con ícono y se actualiza sola).
- **Publicación:** Vercel (gratis). Cada cambio subido a GitHub se publica solo.
- **Respaldo e historial:** GitHub.
- **Base de datos, login, archivos y funciones de servidor:** Supabase, todo en
  un solo lugar.
- **Voz a texto (transcripción):** gpt-4o-mini-transcribe de OpenAI (no Whisper),
  en español y con una lista de palabras de ayuda del ergométrico (ergometría,
  MET, T.A., FCIA, QRS, protocolo de Bruce, etc.), llamado desde una función de
  servidor (nunca desde el celular directo). El nombre del modelo está en un solo
  lugar, fácil de cambiar (por ejemplo, a gpt-4o-transcribe).
- **Asistente que llena la planilla (LLM):** un único modelo de OpenAI
  (referencia: gpt-4o-mini, el mismo enfoque de LoMar), llamado desde una función
  de servidor. Lo que cambia por cada planilla es su instructivo (prompt) y su
  esquema (JSON), no el modelo.
- **Clave de OpenAI:** la provee Mauro (cuenta propia) en la etapa de armado; se
  guarda en la Edge Function, nunca en el celular ni en el repositorio. Nota: el
  uso de la transcripción y del LLM tiene costo por uso (bajo para la demo).
- **Entorno de trabajo:** VSCode con Claude Code.

---

## Arquitectura: las tres partes y cómo se hablan

Son tres piezas, como veníamos diciendo: el celular, la base, y la pantalla.

1. **El celular (vista de carga):** el profesional dicta, saca fotos, revisa y
   confirma. Es la PWA abierta en el teléfono.
2. **La base (Supabase):** vive en la nube, siempre prendida. Guarda los datos,
   las imágenes, los usuarios, y contiene las funciones de servidor.
3. **La pantalla (vista de dashboard):** la misma app abierta en una computadora,
   que muestra el listado, la consulta, la edición y la impresión.

El celular y la pantalla son **la misma aplicación** publicada en Vercel, que se
ve distinta según el dispositivo. Las dos le hablan a Supabase por internet, de
forma cifrada.

### El paso delicado: la clave secreta

Transcribir la voz y usar el LLM necesita una clave (API key) que **no puede
vivir en el celular** (cualquiera la vería). Por eso esas llamadas pasan por una
**Edge Function** de Supabase: una pieza de servidor que guarda la clave a salvo.
El celular le habla a la Edge Function, y la Edge Function le habla al servicio
de IA. La clave nunca sale del servidor.

---

## El flujo de la voz (reaprovechado de LoMar)

1. El profesional graba lo que dicta (grabación tipo mensaje de voz).
2. El audio va a una Edge Function, que lo manda a transcribir → vuelve el texto.
3. El texto va a otra Edge Function con el instructivo del ergométrico y la
   planilla como está hasta ahora → el LLM devuelve la planilla actualizada.
4. La app muestra la planilla completa en pantalla para revisar.
5. El profesional corrige a mano lo que haga falta y confirma.
6. Al confirmar, se guarda en Supabase.

Reglas del asistente (del instructivo, ya trabajadas): nunca inventar; completar
solo las filas de etapa existentes según el tiempo dictado; si no puede ubicar un
dato con certeza, no lo carga (lo pone el profesional a mano); aplicar
correcciones sin duplicar; acumular varias grabaciones sin pisar lo cargado;
limpiar el documento (sin puntos ni espacios), como en LoMar. El instructivo está
basado en el de LoMar, adaptado al ergométrico.

Resguardos del flujo de voz:
- **Las funciones solo atienden a usuarios logueados**: cualquier otro pedido se
  rechaza antes de llamar a OpenAI (nadie de afuera gasta el crédito).
- **El audio no se guarda en el servidor**: pasa a la transcripción y se descarta.
  Ni el audio ni el texto dictado se registran en los logs (son datos de salud).

---

## Modelo de datos (cómo se guarda en Supabase)

Regla de oro: lo que aparece una vez va en una tabla; lo que se repite va en otra
tabla aparte, unida por el número de estudio (`estudio_id`).

### Tabla `estudios` (una fila por estudio)

| Campo | Tipo | Nota |
|---|---|---|
| id | identificador único | el `estudio_id` que une todo |
| numero | entero | número de estudio correlativo (1, 2, 3...) para "Estudio guardado — N° X". Lo pone la base sola y nadie lo puede cambiar; si un guardado falla a mitad de camino, puede quedar un número salteado |
| documento | texto | documento del paciente (limpio, sin puntos). Para futuro macheo de pacientes |
| nombre_paciente | texto | |
| sexo | texto | |
| edad | entero | |
| peso | decimal | admite 72.5 |
| talla | decimal | admite 1.75 |
| fecha_estudio | fecha | fecha en que se hizo la prueba; la dicta o corrige el profesional (el estudio puede cargarse después) |
| medico_solicitante | texto | |
| motivo | texto | |
| antecedentes | texto | |
| tecnica | texto | |
| posicion | texto | |
| fc_teorica | entero | |
| fc_alcanzada | entero | |
| porcentaje | decimal | |
| ecg_ritmo, ecg_eje, ecg_fcia, ecg_p, ecg_pq, ecg_qrs, ecg_qt | texto | valores cortos |
| conclusion | texto | |
| interrupcion_prueba | texto | |
| post_ta | texto | postesfuerzo 5': "120/80" |
| post_fc | entero | postesfuerzo 5' |
| post_ecg | texto | postesfuerzo 5' |
| post_clinica | texto | postesfuerzo 5' |
| cargado_por | identificador de usuario | trazabilidad |
| creado_en | fecha y hora | fecha/hora de **carga** al sistema, automática (distinta de fecha_estudio) |
| modificado_por | identificador de usuario | trazabilidad: quién hizo la **última edición**. Automático; vacío si nunca se editó |
| modificado_en | fecha y hora | trazabilidad: cuándo fue la **última edición**. Automático; vacío si nunca se editó |

**Trazabilidad de ediciones:** la Constitución pide registrar quién **carga y
modifica** cada planilla. `cargado_por`/`creado_en` dicen quién la cargó y cuándo;
`modificado_por`/`modificado_en` dicen quién la editó por última vez y cuándo. Los
cuatro son automáticos. `modificado_por`/`modificado_en` los fuerza la base de
datos (un trigger), así la app no puede falsearlos; `cargado_por` se protege con
la política de Row Level Security (T012).

**Guardado "todo o nada" (T024):** el estudio y sus etapas se guardan de una sola
vez con la función de la base `guardar_estudio` (`supabase/guardado.sql`). Si
cualquier paso falla, la base deshace todo: no quedan estudios a medias. La
función corre con los permisos del usuario (valen las mismas reglas de Row Level
Security), solo toma los campos de la planilla (`cargado_por`, `creado_en` y
`numero` los pone la base) y no duplica: la app arma el `id` del estudio antes de
guardar y lo repite en cada reintento; si ese estudio ya estaba guardado, la
función devuelve su número. Orden de guardado: estudio → etapas (y, cuando llegue
la Fase 3, imágenes → filas de `imagenes`).

### Tabla `etapas` (varias filas por estudio)

| Campo | Tipo | Nota |
|---|---|---|
| id | identificador único | |
| estudio_id | vínculo | a qué estudio pertenece |
| tiempo | entero | 0, 3, 6, 9... |
| carga | entero | 0, 50, 100, 150... |
| met | decimal | admite 8.5 |
| ta | texto | "160/90" |
| fc | entero | |
| ecg | texto | |
| clinica | texto | |

La cantidad de etapas puede variar (se agregan/quitan según la prueba). Por eso
van en su propia tabla y no como columnas fijas.

### Tabla `imagenes` (varias filas por estudio)

| Campo | Tipo | Nota |
|---|---|---|
| id | identificador único | |
| estudio_id | vínculo | a qué estudio pertenece |
| ruta_archivo | texto | dónde está guardada la imagen en el bucket (no la imagen en sí) |
| tipo | texto | electro, paciente, otro |
| creado_en | fecha y hora | |

Las imágenes **no** se guardan dentro de la tabla: van al **bucket** (depósito de
archivos privado de Supabase), en formato **WebP**. En la tabla se guarda solo la
ruta (el "ticket" para ir a buscarlas).

### Para el futuro (no en la demo)

Tabla `pacientes` para agrupar todos los estudios de una misma persona por
documento. El campo `documento` ya se guarda desde ahora, así que el día que se
arme, los datos ya van a estar.

---

## Seguridad (cómo protegemos los datos de salud)

- **En tránsito:** todo viaja cifrado (HTTPS/TLS), que Supabase da de fábrica.
- **Control de acceso:** Row Level Security (reglas en la base) para que cada
  usuario vea solo lo que le corresponde.
- **Imágenes:** bucket privado; se muestran con enlaces firmados que caducan,
  nunca por dirección pública.
- **Clave de IA:** guardada en la Edge Function, nunca en el celular ni en el
  código del navegador.
- **Login:** usuario y contraseña; alta por administrador (Mauro).

---

## Impresión y PDF con formato de planilla

La vista de consulta en computadora debe poder imprimirse y exportarse a PDF
viéndose **igual que la planilla original en papel** (Servicio de Cardiología —
Sanatorio de la Cañada — Sanatorio Privado Río Tercero). Se arma una versión
visual que reproduce el diseño de la planilla (mismos campos, mismo orden, tabla
de reposo y esfuerzo, encabezado y pie de la clínica).

**Planilla de referencia:** `specs/001-estudio-ergometrico/assets/planilla-delacanada.jpg`
(también en PDF: `planilla-delacanada.pdf`). Es la referencia a copiar para el
diseño del PDF y la impresión. La planilla anterior
(`planilla-original.jpg`) tiene los mismos campos con la marca anterior; queda
solo como referencia.

---

## Referencia visual (para la etapa de pantallas)

**Cómo se ve la app lo define la guía visual:**
`specs/001-estudio-ergometrico/guia-visual.md`. Manda sobre el diseño de todas
las pantallas: marca y logos, colores (modo claro y oscuro), tipografía, forma,
componentes, movimiento, y cómo se ven el celular, la computadora y el PDF. No
cambia la constitución, la spec ni este plan: los complementa.

Referencias que usa la guía:
- Logos del Sanatorio de la Cañada: ver la guía, sección 2.
- Capturas de LoMar (referencia principal de componentes y comportamiento) y de
  Dribbble (paleta en claro, barra inferior, tarjetas del dashboard):
  `specs/001-estudio-ergometrico/assets/referencias-diseno/`.

---

## Estructura de carpetas del proyecto (borrador)

```
proyecto/
  index.html            (la app)
  css/                  (estilos)
  js/                   (lógica del frontend)
  assets/               (íconos, logo)
  manifest.webmanifest  (que sea PWA)
  sw.js                 (service worker)
  supabase/
    functions/          (Edge Functions: transcribir, estructurar)
    schema.sql          (las tablas)
```

---

## Chequeo contra la Constitución

- **La planilla es el contrato:** el modelo de datos copia la planilla campo por
  campo. ✔
- **El profesional confirma:** nada se guarda sin confirmación (paso 5 del flujo).
  ✔
- **Nunca inventar:** reglas del instructivo del LLM. ✔
- **Simplicidad entendible:** vanilla, tres tablas claras, sin piezas de más. ✔
- **Privacidad por diseño:** TLS + RLS + bucket privado + clave en servidor. ✔
- **Bajo costo:** Vercel y Supabase en plan gratuito; sin Railway ni n8n. ✔
- **Trazabilidad:** `cargado_por` y `creado_en` (quién cargó y cuándo);
  `modificado_por` y `modificado_en` (quién editó por última vez y cuándo). ✔

---

## Fuera de este plan (posterior a la demo)

- Funcionamiento sin conexión y reenvío automático (RF-024, RF-025).
- Tabla de pacientes y macheo por documento.
- Múltiples roles, planillas y clínicas.
- Empaquetado como app nativa (Capacitor).
