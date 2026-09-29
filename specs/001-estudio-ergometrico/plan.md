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
  MET, T.A., FCIA, QRS, protocolo de Bruce, etc.) y términos generales de
  cardiología (disnea, angor, isquemia, extrasístoles, segmento ST, etc.), llamado
  desde una función de servidor (nunca desde el celular directo). El nombre del
  modelo está en un solo lugar, fácil de cambiar (por ejemplo, a gpt-4o-transcribe).
- **Asistente que llena la planilla (LLM):** un único modelo de OpenAI,
  **gpt-6-luna con razonamiento bajo** (antes gpt-4o-mini, el mismo enfoque de
  LoMar), llamado desde una función de servidor. Se eligió en una comparación de
  modelos con las mismas pruebas con voz: fue el único que no perdió los datos del
  postesfuerzo, con un costo de alrededor de 1 centavo de dólar por dictado largo
  y unos segundos más de demora. El nombre del modelo y sus ajustes están en un
  solo lugar, fácil de cambiar. Lo que cambia por cada planilla es su instructivo
  (prompt) y su esquema (JSON), no el modelo.
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

El celular y la pantalla son **la misma aplicación** publicada en Vercel, con un
solo link, que decide qué mostrar según el **tipo de aparato** (no por el tamaño
de la ventana, que cambia con el zoom del navegador). Lo decide `js/vista.js`
(T060), en este orden:

1. **Celular o tablet = carga, siempre.** Lo es si el navegador dice que es móvil
   (`navigator.userAgentData.mobile`, o la identificación dice Android, iPhone,
   iPad, iPod o Mobile, o es un iPad que se presenta como Mac: `MacIntel` con
   pantalla táctil), o si el puntero principal es el dedo y sin "hover"
   (`(pointer: coarse) and (hover: none)`).
2. Si no, **con algún puntero preciso** (`any-pointer: fine`: mouse o trackpad,
   también en una notebook táctil) = dashboard, siempre.
3. Si el navegador no informa nada del puntero, por el ancho (1024 px), como red
   de seguridad.

El paso 1 va primero porque un accesorio del celular (mouse o teclado Bluetooth,
"Vincular con Windows", un lápiz) puede hacer que informe un puntero preciso: con
la regla vieja ("puntero preciso = compu"), el celular de Mauro mostraba el
dashboard. Los celulares con S Pen quedan cubiertos por el paso 1, pero no se
probaron en un aparato real. La vista se decide **una sola vez**, al abrir la app
o al iniciar sesión: ya no escucha cambios, así una carga a medias nunca se oculta
ni se pierde. Sin botón manual para cambiarla. Como una compu puede tener
la ventana angosta o mucho zoom, el dashboard se acomoda (hasta 200% de zoom en
una pantalla de 1280 px): la barra lateral pasa arriba y la tabla se desplaza de
costado, sin ocultar información. Las dos le hablan a Supabase por internet, de
forma cifrada.

### El paso delicado: la clave secreta

Transcribir la voz y usar el LLM necesita una clave (API key) que **no puede
vivir en el celular** (cualquiera la vería). Por eso esas llamadas pasan por una
**Edge Function** de Supabase: una pieza de servidor que guarda la clave a salvo.
El celular le habla a la Edge Function, y la Edge Function le habla al servicio
de IA. La clave nunca sale del servidor.

---

## El dashboard (computadora)

Copia la forma y el comportamiento del **panel de LoMar**
(`lomar-smart-panel`, solo como referencia): barra lateral, tarjetas de números,
filtros, botón "Actualizar" con contador, estados cargando / error / vacío,
tabla clickeable, ficha y vista ampliada de fotos. Con la marca de la Cañada y
los mismos tokens de color de la app (claro y oscuro).

**Lo que NO se copia de LoMar:** su seguridad (contraseña fija, token propio,
sesión guardada a mano, webhooks de n8n). Acá se entra con el **mismo login de
Supabase** de la app y los datos se leen **directo de Supabase** con
supabase-js, respetando las reglas de Row Level Security actuales: cada
profesional ve los estudios que cargó él.

- **Barra lateral:** logo, perfil (foto, o círculo con la inicial del correo, con
  el correo debajo: la base no guarda el nombre), "Estudios", "Configuración" y
  "Cerrar sesión".
- **Estudios:** números (Total, Hoy, Esta semana = de lunes a hoy, Este mes =
  desde el día 1), filtros (buscar por nombre o DNI, un solo calendario de
  rango de fechas en castellano, limpiar), tabla (N°, fecha y hora, paciente,
  DNI, médico solicitante, conclusión resumida, cantidad de fotos) y la ficha con
  todos los campos (vacíos con "—") y las fotos del electro (enlaces firmados que
  caducan, T029), que se agrandan al tocarlas. La fecha y hora de la tabla, los
  números y los filtros usan la fecha de **carga** (`creado_en`); la fecha del
  estudio se ve en la ficha.
- **Ficha, encabezado fijo:** "← Volver", el título con el N° y el logo quedan
  fijos arriba al bajar, sin tapar el contenido. Ahí mismo van a ir "Imprimir",
  "Descargar PDF" (Tanda 2) y "Editar" (Tanda 3).
- **Enlaces que se renuevan solos:** la app recuerda cuándo vence cada enlace
  firmado; si ya está viejo cuando se toca una foto (o "Abrir original en una
  pestaña"), pide uno nuevo antes de usarlo. Es una sola función que también va
  a usar el PDF (Tanda 2). La foto de perfil, si falla porque venció, pide un
  enlace nuevo una vez antes de volver a la inicial.
- **Configuración:** modo de color (el mismo selector que el celular; la
  preferencia se guarda en cada aparato), "Ingresaste como <correo>" y la foto
  de perfil (1024 px, calidad 0,92). Antes de subirla se acomoda en un **recortador** con un
  círculo (zoom con la ruedita o una barrita, arrastrar; la foto siempre cubre el
  círculo; "Guardar" / "Cancelar" / Esc). Se sube lo que se ve en el círculo.
- **Editar (T032, T061):** botón "Editar" (neutro, a la izquierda de "Borrar")
  en el encabezado de la ficha. Se corrigen los datos y las etapas (valores,
  agregar y quitar) con la misma planilla del celular, solo con teclado; no las
  fotos. Con registro de cambios (ver "Historial de cambios"). La ficha muestra
  "Última edición: día y hora".
- **Imprimir y PDF (T033):** ver la sección "Impresión y PDF".

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
- **Controles en el código, después del LLM** (lo que no los cumple se descarta y
  el campo queda como estaba; no dependen de un dictado en particular):
  - *Palabras:* un texto solo se acepta si alguna de sus palabras se dijo en esa
    grabación.
  - *Números:* un número (o las cifras de un DNI, T.A. o valor del ECG) solo se
    acepta si sus cifras se dijeron, en palabras o en cifras, sin importar puntos,
    espacios, guiones o coma.
  - *Palabras clave:* F.C. teórica, F.C. alcanzada y porcentaje solo si se dice
    su palabra (una que empiece con "teor", como teórica o teoría, o "teo";
    "alcanzada" o "máxima"; "porcentaje" o "%").
  - *Máximos:* una talla mayor de 3 (metros) se descarta; no se convierte.

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

Cada foto recibe un código al agregarla en el celular: ese código es el nombre del
archivo (`<estudio_id>/<código>.webp`) y el `id` de su fila en `imagenes`. Así,
reintentar la subida nunca duplica ni archivos ni filas.

### Historial de cambios (T032)

Cada edición desde el dashboard guarda **cómo estaba el estudio antes** (sus
datos y sus etapas), **quién** lo cambió y **cuándo**, en una tabla aparte de
historial (una fila por edición). La escribe la base, no la app: la edición se
hace con una función de la base "todo o nada" (como `guardar_estudio`), que
primero guarda la foto de "antes" y después aplica el cambio. Así no se puede
editar sin dejar registro. `modificado_por`/`modificado_en` siguen diciendo cuál
fue la última edición. El SQL va en un archivo nuevo de `supabase/`, que Mauro
pega en el SQL Editor.

- **Sin permiso directo de modificar:** a la app se le quita el permiso de
  modificar estudios y etapas directamente; toda corrección pasa por la función
  que deja registro. El guardado desde el celular no se afecta (usa
  `guardar_estudio`).
- **Dos pestañas a la vez:** la función recibe la fecha de la última edición que
  vio la pantalla; si el estudio cambió mientras tanto, no guarda y avisa, así el
  segundo en guardar no pisa el cambio del primero.
- **Qué se muestra:** en la ficha, solo "Última edición: día y hora". La lista
  completa de cambios queda guardada y se muestra después de la demo.

**Cómo quedó hecho (T061 y T062):**

- **`supabase/edicion.sql`** (ya corrido en Supabase):
  - tabla `estudios_historial`: el estudio completo y todas sus etapas como
    estaban, quién (id y copia del correo) y cuándo (hora del servidor). RLS
    encendido, sin reglas y sin ningún permiso para la app: ni leerla. Tiene
    datos de pacientes;
  - función `editar_estudio(id, datos, etapas, modificado_en)`: todo o nada,
    `security definer`. Exige sesión, que el estudio sea del usuario y que no esté
    en la Papelera. Usa la misma lista blanca de campos que `guardar_estudio`: no
    cambia número, `cargado_por`, `creado_en`, la Papelera ni las fotos. Si no hay
    cambios, no guarda nada y avisa "sin cambios". Si los hay, primero va al
    historial, después el estudio y las etapas (se reemplazan todas);
  - edición cruzada: compara `modificado_en` con `is not distinct from` (un
    estudio nunca editado tiene null). Si no coincide, error con código propio
    `CL409` y no cambia nada. La app devuelve el valor **como texto, tal cual
    vino**: pasado por `Date` de JavaScript perdería los microsegundos y nunca
    coincidiría;
  - "Última edición": `editar_estudio` prende una marca de la transacción
    (`clinica.edicion`) y pone ella misma quién y cuándo; el trigger
    `registrar_modificacion`, al ver la marca, respeta esos valores. Así queda
    marcada aunque solo cambien las etapas, y la Papelera sigue sin contar como
    edición;
  - permisos: la app (`authenticated`) pierde UPDATE, DELETE y TRUNCATE sobre
    `estudios` y `etapas`, y se sacan las reglas de UPDATE y DELETE que quedaron
    sin uso. Se conservan SELECT e INSERT (`guardar_estudio` los usa);
  - sin tope de cantidad de etapas por ahora, igual que `guardar_estudio`. Queda
    anotado para producción.
- **`js/edicion.js`** + `js/ficha.js`:
  - la ficha pasa a la misma planilla del celular (`dibujarPlanilla` con un
    prefijo en los ids, para no chocar con la de carga, y con los valores del
    estudio). Solo con teclado: sin micrófono, grabación ni fotos;
  - mismos criterios que la carga (funciones compartidas en `js/formulario.js`):
    decimales con coma, mayúscula inicial, DNI y nombre obligatorios, números bien
    escritos;
  - "Cancelar", "← Volver", el menú y "Cerrar sesión" preguntan "¿Seguro?" si hay
    cambios sin guardar. Al cerrar sesión, la planilla se borra de la pantalla;
  - la edición cruzada ofrece "Cargar la versión nueva" o "Seguir editando" (para
    no perder lo escrito sin avisar).
- **`supabase/ver_historial.sql`:** consulta de **solo lectura** para el SQL Editor,
  que muestra el historial de los estudios de prueba **sin datos del paciente**
  (cantidades, horas y correo de quien editó). El historial no se mira con la
  clave de servicio.

### Foto de perfil (Configuración)

Una foto por profesional, en un **depósito privado nuevo** de Supabase (aparte
del de los estudios), en WebP, achicada y comprimida en la computadora con el
mismo proceso que las fotos de los estudios, a 1024 px (achicada por pasos,
calidad 0,92, hasta 900 KB). Cada uno solo puede subir, cambiar y ver la suya.
Se muestra con un enlace firmado que caduca, en la barra lateral del dashboard y
en el menú del celular.

### Papelera (borrado lógico) — `supabase/papelera.sql`

"Borrar" un estudio **no lo borra**: lo marca como "en la Papelera". Así se
conserva todo (el estudio, sus etapas y sus fotos; Storage no se toca) y el
número no se reutiliza.

- **En la tabla `estudios`**, cuatro columnas nuevas: `en_papelera` (sí/no),
  `en_papelera_desde` (cuándo), `en_papelera_por` (id de quién) y
  `en_papelera_por_correo` (copia de su correo, para mostrarlo). Son la "foto"
  del último borrado y se vacían al restaurar.
- **Tabla nueva `estudios_papelera_registro`:** una fila por cada borrado y cada
  restauración (acción, id y correo de quién, hora del servidor). La app solo la
  puede leer (y solo la de los estudios que puede ver).
- **Dos funciones del servidor:** `anular_estudio(id)` y `restaurar_estudio(id)`.
  Exigen usuario logueado y que el estudio sea uno que puede ver (hoy, los que
  cargó él). Un doble clic no duplica nada.
- **La app no puede hacerlo de otra forma:** no tiene permiso de DELETE sobre
  `estudios`, y un control de la base (trigger) rechaza cualquier UPDATE o INSERT
  que toque las columnas de la Papelera si no viene de esas funciones.
- **No cuenta como edición:** mandar a la Papelera o restaurar no cambia la
  "Última edición" (`modificado_por` / `modificado_en`).
- **Pantalla (T059, `js/papelera.js`; el SQL ya está corrido):** ítem "Papelera"
  en la barra lateral, debajo de Configuración, con la lista de estudios borrados
  (N°, paciente, DNI, quién lo borró —su correo— y cuándo) y un botón "Restaurar"
  por fila; las filas no se abren. Se vuelve a pedir cada vez que se entra. Vacía:
  "La papelera está vacía." En la ficha, un botón "Borrar" discreto, en rojo, en
  `#ficha-acciones`, con el cartel "¿Mandar a la Papelera?" ("Volver" / "Mandar a
  la Papelera", en rojo); después vuelve a la lista, recargada, con el aviso
  "Estudio N° X enviado a la Papelera". "Restaurar" avisa "Estudio N° X
  restaurado". Mientras trabajan, los botones quedan deshabilitados (un doble clic
  no hace nada dos veces). El listado, los números y la búsqueda piden solo
  `en_papelera = false`; la ficha de uno que está en la Papelera no se abre (dice
  que hay que restaurarlo). Errores en criollo y nada de datos de pacientes en la
  consola. El cartel de toda la app ahora mantiene el foco adentro (Tab da vueltas
  entre sus botones).
- **Para la Tanda 3 (Editar):** la función de edición tiene que rechazar un
  estudio que esté en la Papelera. *(Hecho: `editar_estudio` lo rechaza.)*

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
- **Login:** usuario y contraseña; alta por administrador (Mauro). El dashboard
  usa el mismo login de Supabase: no tiene contraseña propia ni token aparte.
- **Dashboard:** lee y edita directo en Supabase con la sesión del usuario; valen
  las mismas reglas de Row Level Security. El PDF se arma en la computadora y no
  se guarda en el servidor.

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

**Cómo se arma (T033):**
- Un **único PDF**, armado en la computadora con una librería de PDF cargada
  desde jsdelivr con versión fija e `integrity` (como supabase-js). No se guarda
  en Supabase.
- **Hoja 1:** la planilla completa en A4 vertical, igual a
  `planilla-delacanada.jpg`. **Hojas siguientes:** las fotos del electro, solo si
  el estudio tiene.
- **Dos botones en la ficha:** "Imprimir" abre ese mismo PDF en la ventana de
  impresión del navegador; "Descargar PDF" lo guarda en Descargas. El papel y el
  archivo salen idénticos.
- **Nombre del archivo:** `Ergometrico-<número>-<nombre del paciente>-<AAAA-MM-DD>.pdf`,
  con el nombre **tal cual está cargado** (sin reordenar ni adivinar el
  apellido), sin acentos y con guiones entre palabras (ej.: "Carlos Méndez" →
  `Ergometrico-12-Carlos-Mendez-2026-09-26.pdf`).
- **DNI:** la planilla en papel no lo tiene; en el PDF va **en la línea de FECHA,
  del lado derecho** que queda libre (la de PACIENTE ya tiene SEXO). Pregunta
  pendiente para el médico: si lo quiere en la planilla impresa.

**Cómo quedó hecho (T033):**

- **Piezas** (para sumar otro estudio, se escribe solo su hoja 1):
  - `js/planillas/ergometrico-hoja.js`: la hoja 1 del ergométrico (diseño, campos
    y ajuste);
  - `js/pdf/hojas-fotos.js`: las hojas de fotos, iguales para cualquier estudio;
  - `js/pdf/herramientas.js`: carga de la librería, las fuentes y los logos, y
    ayudas de texto;
  - `js/pdf/armado.js`: el armado general, el nombre del archivo, descargar e
    imprimir. Los botones están en `js/ficha.js`.
- **Librería:** jsPDF 4.2.1 desde jsdelivr, con versión fija, `integrity` (SRI) y
  `crossorigin`. Se carga **recién al tocar el primer botón**: no en el celular ni
  al abrir la app.
- **Fuentes incrustadas:** Arimo (misma medida que Arial) y Tinos (misma medida
  que Times), libres (Apache 2.0), desde jsdelivr (`@expo-google-fonts`) con
  versión fija e `integrity`. Las fuentes estándar de PDF no tienen, por ejemplo,
  ≥ ≤ →. Antes de armar se controla que cada carácter esté en la fuente; si falta
  uno (por ejemplo, un emoji), no se arma y se avisa cuál (nada se reemplaza en
  silencio). Detalle: µ (micro) y μ (mu) son el mismo dibujo en la fuente; se ven
  igual, pero al copiar el texto del PDF sale μ.
- **Logos:** `assets/logos/logo-completo-impresion.png` (encabezado) y
  `isologo-impresion.png` (marca de agua), pasados de SVG a PNG en alta resolución.
- **Hoja 1:**
  - A4 vertical, todo a **10 mm o más** del borde (márgenes de 11 mm a los
    costados);
  - letra de 10,5 pt;
  - la marca de agua es el isologo grande al **10 % de opacidad**, en el mismo
    lugar que en el papel (más tenue que el verde del papel, para no molestar la
    lectura);
  - el PDF pide imprimirse al 100 % (`PrintScaling: None`).
- **Si un texto no entra**, en este orden:
  1. las filas de la tabla se hacen más bajas (hasta 7 mm);
  2. los renglones se juntan un poco;
  3. se achica la letra de **ese** campo, de a medio punto, hasta **8 pt**
     (mínimo legible impreso);
  4. lo que igual no entra sigue, completo, en una hoja "Continuación de <campo>"
     (con "Estudio N° X · paciente" arriba y "(sigue en la hoja N)" en la hoja 1).

  Con muchas etapas, primero se decide cuántas entran sin tocar ningún texto (por
  lo menos 4); las demás siguen en "Continuación de Reposo y esfuerzo".
- **Hojas de fotos:** la regla por hileras (spec, RF-022). Los números están en
  un solo objeto, `FOTOS_PDF`, en `js/pdf/hojas-fotos.js`: `alturaMinimaMm: 80`,
  `alturaMaximaMm: 120`, `separacionMm: 4`, `margenMm: 12`. Cada foto se gira como
  se sacó (`imageOrientation: 'from-image'`), se achica a 2000 px de lado largo y
  pasa a JPEG 0,9. Si una foto no se puede bajar, no sale ningún PDF.
- **Imprimir:** la pestaña se abre en el mismo clic (así el navegador no la
  bloquea) y, cuando el PDF está listo, se carga ahí. El PDF de imprimir es el
  mismo, con la orden estándar "imprimir al abrir" adentro. Probado: Chrome abre
  solo la ventana de impresión. En Firefox (pdf.js también reconoce esa orden) y
  en Edge no se pudo confirmar en una prueba automática. Por eso el aviso dice
  "Si no aparece la ventana de impresión, tocá el botón de imprimir de esa
  pestaña". Al cerrar sesión, esa pestaña se cierra.
- **Privacidad:** el PDF vive en memoria mientras se usa. No se guarda en Supabase
  ni en el navegador (ni localStorage, sessionStorage o caché), y no aparece nada
  del paciente en la consola.
- **Peso:** sin fotos, unos 270 KB (por las fuentes y los logos). Con 4 fotos
  reales, cerca de 1 MB.

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
  Dribbble (paleta en claro, barra inferior):
  `specs/001-estudio-ergometrico/assets/referencias-diseno/`.
- Dashboard: el **panel de LoMar** (`lomar-smart-panel`, solo lectura) con la
  marca de la Cañada.

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
  `modificado_por` y `modificado_en` (quién editó por última vez y cuándo); el
  historial de cambios (cómo estaba antes de cada edición); y el registro de la
  Papelera (quién y cuándo, en cada borrado y restauración). Nada se borra de
  verdad desde la app. ✔

---

## Fuera de este plan (posterior a la demo)

- Funcionamiento sin conexión y reenvío automático (RF-024, RF-025).
- Tabla de pacientes y macheo por documento.
- Múltiples roles, planillas y clínicas.
- Empaquetado como app nativa (Capacitor).
