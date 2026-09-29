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

- ✅ **T001** Crear el repositorio en GitHub para el proyecto ("Proyecto Clínica",
  repo sugerido: `proyecto-clinica`).
- ✅ **T002** Crear el proyecto en Vercel y conectarlo al repo de GitHub (para que
  cada cambio subido se publique solo).
- ✅ **T003** Crear el proyecto en Supabase (base, auth y storage).
- ✅ **T004** [P] Armar la estructura de carpetas del proyecto (index.html, css/,
  js/, assets/, supabase/).
- ✅ **T005** [P] Configurar la PWA: `manifest.webmanifest`, `sw.js`, íconos, para
  que se pueda instalar en el celular.

## Fase 1 — Base de datos, login y seguridad

- ✅ **T006** Crear la tabla `estudios` con todos sus campos y tipos (según el
  plan), incluidos `documento` y `fecha_estudio` (fecha de la prueba, editable),
  además de `creado_en` (fecha de carga automática).
- ✅ **T007** [P] Crear la tabla `etapas` vinculada a `estudios` por `estudio_id`.
- ✅ **T008** [P] Crear la tabla `imagenes` vinculada a `estudios` por `estudio_id`.
- ✅ **T009** Crear el bucket privado para imágenes en Supabase Storage.
- ✅ **T010** Configurar el login con usuario y contraseña.
- ✅ **T011** Dar de alta el usuario administrador (Mauro).
- ✅ **T012** Configurar Row Level Security básica (cada usuario ve lo que le
  corresponde; en la demo, un solo usuario).
  - *No olvidar (trazabilidad):* la política de `estudios` tiene que exigir que
    `cargado_por` sea el usuario logueado. Hoy tiene ese valor por defecto, pero
    la app podría mandar otro. También evitar que al editar se cambien
    `cargado_por` y `creado_en`. (`modificado_por`/`modificado_en` ya los
    protege un trigger en `schema.sql`.)

## Fase 2 — Historia 1 (P1): cargar por voz y confirmar  ★ corazón de la demo

*Orden acordado para arrancar:* T045 → T046 → T047 → T048 → T013. El diseño
de todas las pantallas sigue `guia-visual.md`.

- ✅ **T045** Base visual (guía visual, secciones 3 a 6 y 8): colores como
  variables CSS en modo claro y oscuro, tipografía Albert Sans, radios, sombras
  y curva de movimiento; desactivar las animaciones si el dispositivo pide
  "reducir movimiento"; botón claro / oscuro / automático que se recuerda en el
  dispositivo.
- ✅ **T046** Logos e íconos definitivos: recortar el lienzo de los isologos SVG;
  generar los íconos (192, 512 y 180) desde `isologo.png`, con margen (~70% del
  ancho) y fondo blanco, reemplazando los provisorios de la T005; favicon y
  colores de marca en el manifest.
- ✅ **T047** Splash: copia fiel del de LoMar (mismo diseño y animación: el logo
  sube y crece con un halo difuminado detrás, ~1,5 s), con el logo de la Cañada
  (versión clara en modo oscuro) y los colores de la guía.
- ✅ **T048** Login: copia fiel del de LoMar (tarjeta de vidrio, campos blancos,
  botón con resplandor), con los logos de la Cañada y el verde de la guía en
  lugar del naranja. Ingreso con correo electrónico y contraseña (Supabase
  Auth), ver/ocultar contraseña, mensajes claros de error ("correo o contraseña
  incorrectos", "sin conexión"), sesión que se mantiene al reabrir la app y
  "Cerrar sesión". Sin "crear cuenta": el alta la hace el administrador
  (RF-001).
- ✅ **T013** Pantalla de carga: formulario del Estudio Ergométrico con todos los
  campos y la tabla de etapas (arranca con reposo, 3', 6', 9').
- ✅ **T014** Permitir agregar y quitar etapas de la tabla.
- ✅ **T015** Grabación de voz en el celular (reaprovechar la UI tipo WhatsApp de
  LoMar).
  - Nota (la grabación nunca queda colgada): si el sistema cancela o se queda con
    el toque, pasa a candado (sigue grabando, con Pausar, Enviar y Descartar); un
    toque nuevo en el micrófono mientras graba la frena; si la app pasa a segundo
    plano o Android corta o silencia el micrófono, se detiene y pasa a la vista
    previa con lo grabado. El audio se guarda en memoria de a 1 segundo, y la
    onda de la vista previa se calcula con el audio grabado.
- ✅ **T016** Edge Function de transcripción (voz → texto), con la clave a salvo en
  el servidor.
- ✅ **T017** Edge Function de estructuración (texto → planilla) con el instructivo
  del ergométrico y el esquema JSON.
- ✅ **T018** Escribir y afinar el instructivo (prompt) del ergométrico: no
  inventar, completar solo etapas existentes por tiempo dictado, correcciones sin
  duplicar, documento sin puntos.
  - Un número solo se acepta si sus cifras se dijeron en el dictado (en palabras o
    en cifras, sin importar puntos, espacios, guiones o coma); si no, se descarta
    y el campo queda como estaba.
  - F.C. teórica, F.C. alcanzada y porcentaje solo se aceptan si en el dictado se
    dice su palabra (una que empiece con "teor", como teórica o teoría, o "teo";
    "alcanzada" o "máxima"; "porcentaje" o "%"). Una talla mayor de 3 se
    descarta y queda vacía (no se convierte a metros).
  - ~~**PENDIENTE**: la presión del postesfuerzo dicha sin la palabra "presión",
    o escrita en palabras, a veces no se carga.~~ **Resuelto** con el cambio del
    ordenador a gpt-6-luna (razonamiento bajo), elegido en la comparación de
    modelos: 0 de 7 postesfuerzos perdidos en las pruebas con voz.
- ✅ **T019** Acumular varias grabaciones sobre el mismo estudio sin pisar lo ya
  cargado.
- ✅ **T020** Ubicar cada dato de etapa en la fila correcta según el tiempo dictado
  (el "buscá el renglón y completalo").
- **T021** Manejar el dato no ubicable con certeza: no cargarlo; señalar que va a
  mano.
  - *Pasa a después de la demo.* Por ahora, el dato no ubicable simplemente no se
    carga en ningún lado (sin aviso).
- ✅ **T022** Pantalla de revisión: mostrar la planilla completa y permitir editar
  cualquier campo a mano.
  - La misma planilla de carga es la pantalla de revisión: se puede editar a mano
    cualquier campo.
- ✅ **T023** Exigir datos mínimos (paciente) para poder guardar; permitir guardar
  incompleto el resto.
- ✅ **T024** Confirmar y guardar el estudio en Supabase (con `cargado_por` y
  `creado_en` automáticos).
  - *Antes de esta tarea:* sumar el número correlativo del estudio (para mostrar
    "Estudio guardado — N° X"): actualizar el modelo de datos del plan y agregar
    la columna con un SQL nuevo.
  - *Orden de guardado:* nada se sube antes de confirmar (RF-013). Al confirmar:
    1) guardar la fila de `estudios` (así existe su `id`); 2) guardar sus
    `etapas`; 3) subir las imágenes al bucket, en la carpeta del estudio
    (T027); 4) guardar las filas de `imagenes` con su ruta (T028).
  - Una vez guardado, el estudio no se edita desde el celular: se corrige desde el
    dashboard (T032).
  - Sesión vencida durante la carga: por ahora vuelve al login (y la planilla se
    borra, por privacidad). Se revisa después de la demo.
- **T042** Diseño adaptativo: que la app se vea bien y muestre la vista correcta
  según el dispositivo (carga en celular, dashboard en computadora). *(cubre
  RF-018)*
  - *Decisión (Fase 4):* una sola app y un solo link. Sin versión del dashboard
    para celular.
  - *Cambio (Tanda 1b):* ya no decide por el tamaño de la ventana (con zoom del
    navegador el dashboard desaparecía), sino por el **tipo de aparato**: con
    mouse o trackpad = dashboard, siempre; solo táctil = carga, siempre, aunque
    esté acostado. El teclado no cuenta. Si el navegador no informa, decide por
    el ancho (1024 px). Sigue escuchando si se conecta o desconecta un mouse. El
    dashboard aguanta ventana angosta y zoom de hasta 200% en 1280 px.
- **T043** Manejo del permiso de micrófono, con atención especial a iPhone:
  pedirlo y mostrar un mensaje claro si está denegado. *(cubre RF-020)*
- ✅ **T044** Manejo de error de transcripción: si el dictado no se entiende o falla,
  avisar y permitir volver a grabar.

## Fase 3 — Historia 2 (P2): imágenes

- ✅ **T025** Sacar foto en el momento y elegir archivos ya guardados en el celular.
  - Si llegamos a la demo sin la Fase 3, esconder el clip y la cámara de la barra.
    *(Ya no hace falta: las fotos funcionan en el celular.)*
- ✅ **T026** Convertir las imágenes a formato WebP.
- ✅ **T027** Subir las imágenes al bucket privado.
  - *Orden de guardado:* se suben recién después de guardar la fila de
    `estudios` (ver T024), en la carpeta de ese estudio:
    `imagenes-estudios/<estudio_id>/<archivo>.webp`. Las reglas del bucket
    (`seguridad.sql`) rechazan cualquier archivo fuera de esa carpeta.
- ✅ **T028** Guardar la ruta de cada imagen en la tabla `imagenes`.
- ✅ **T029** Mostrar las imágenes con enlaces firmados que caducan (en celular y
  computadora).
  - Ver las fotos de un estudio guardado es en el dashboard (Fase 4). En el
    celular, antes de guardar, solo se ven las miniaturas. La función del enlace
    firmado queda lista para el dashboard.

## Fase 4 — Historia 3 (P3): dashboard (consultar, editar, imprimir)

*Base:* el panel de LoMar (`lomar-smart-panel`, solo lectura) en forma y
comportamiento, con la marca de la Cañada. **No** se copia su seguridad: se entra
con el login de Supabase y se lee directo de Supabase con las reglas de acceso
actuales. Se hace en tres tandas; al final de cada una, Mauro prueba.

**Tanda 1 — ver los estudios**
- **T030** Vista de dashboard (computadora): login en la compu, barra lateral
  (logo, perfil con foto o inicial del correo con el correo debajo, "Estudios",
  "Configuración", "Cerrar sesión"), números (Total, Hoy, Esta semana = de lunes
  a hoy, Este mes = desde el día 1), filtros (buscar por nombre o DNI, desde,
  hasta, limpiar), "Actualizar" con contador, estados cargando / error / vacío,
  y tabla (N°, fecha y hora, paciente, DNI, médico solicitante, conclusión
  resumida, cantidad de fotos). La tabla, los números y los filtros usan la fecha
  y hora de carga. (Qué vista mostrar: ver T042 y la Tanda 1b.)
- **T031** Abrir un estudio completo: todos los campos de la planilla (los vacíos
  con "—", ninguno oculto) y las fotos del electro en miniatura, que se agrandan
  al tocarlas (vista ampliada como la de LoMar). La fecha del estudio se ve acá.
- **T049** Configuración: modo de color (Claro / Oscuro / Automático, el mismo del
  celular), "Ingresaste como <correo>" y foto de perfil (depósito privado nuevo,
  una por profesional, cada uno solo la suya; se achica y comprime como las fotos
  de los estudios, a 512 px). La foto se ve en la barra lateral y en el menú del
  celular (en el celular solo se ve). El modo de color se guarda en cada aparato.

**Tanda 1b — ajustes** (después de que Mauro probó la Tanda 1; antes de la 2)
- **T050** Encabezado fijo en la ficha: "← Volver", el título (ESTUDIO
  ERGOMÉTRICO · N° X) y el logo quedan fijos arriba al bajar, sin tapar el
  contenido, en claro y oscuro. Con lugar preparado para "Imprimir", "Descargar
  PDF" (Tanda 2) y "Editar" (Tanda 3).
- **T051** Enlaces de fotos que se renuevan solos: al tocar una miniatura y en
  "Abrir original en una pestaña", si el enlace ya está viejo se pide uno nuevo.
  Función reutilizable (la va a usar el PDF de la Tanda 2). Foto de perfil: si
  falla por enlace vencido, pedir uno nuevo una vez antes de volver a la inicial.
- **T052** Un solo calendario de rango en los filtros (reemplaza "Desde" y
  "Hasta"): se toca el día de inicio y el de fin y los del medio se pintan; con
  un solo día, filtra ese día. "Limpiar filtros" también lo limpia. Usa la fecha
  de carga. En castellano (semana desde el lunes), claro y oscuro con nuestros
  colores, y usable con teclado.
- **T053** Recortador de la foto de perfil (solo la de perfil, no las del
  electro): recuadro con un círculo, zoom (ruedita y barrita) y arrastrar; la
  foto siempre cubre el círculo. "Guardar" recorta, achica a 512 px, pasa a WebP
  (mismo proceso de `js/fotos.js`) y sube a `fotos-perfil` (reemplaza la
  anterior); "Cancelar" o Esc no sube nada. Solo en la compu (mouse).
- **T054** Vista según el tipo de aparato (ver T042): con mouse o trackpad =
  dashboard; solo táctil = carga. El dashboard se acomoda a ventanas angostas y
  zoom de hasta 200% en 1280 px (barra lateral arriba, tabla que se desplaza de
  costado), sin ocultar información.

**Tanda 2 — imprimir y PDF**
- **T033** "Imprimir" y "Descargar PDF" desde la ficha, con un único PDF armado
  en la computadora (no se guarda en Supabase): hoja 1 la planilla completa en A4
  igual a `planilla-delacanada.jpg`; hojas siguientes, las fotos del electro (si
  tiene). El DNI va a la derecha de "Paciente". Nombre:
  `Ergometrico-<número>-<nombre del paciente>-<AAAA-MM-DD>.pdf`, con el nombre
  tal cual está cargado, sin acentos y con guiones entre palabras (ej.:
  `Ergometrico-12-Carlos-Mendez-2026-09-26.pdf`). Librería desde jsdelivr con
  versión fija e `integrity`.
  - *Conclusión:* es un campo de texto largo que va en la hoja 1 (no hay segunda
    hoja de conclusiones). Hay que resolver cómo se ve si es muy larga, o si hay
    más de cuatro etapas, para que la planilla entre en una sola A4 (RF-022).

**Tanda 3 — editar**
- **T032** Editar un estudio ya guardado, desde la ficha: se corrigen los datos y
  las etapas (valores, agregar y quitar), con la misma planilla del celular; no
  las fotos (no se agregan ni se borran desde el dashboard). Queda registrado
  quién lo cambió, cuándo y cómo estaba antes (historial de cambios, lo escribe
  la base). En la ficha se ve solo "Última edición: día y hora" (la lista
  completa, después de la demo).
  - Se quita el permiso directo de modificar estudios y etapas: toda corrección
    pasa por la función que deja registro. Después, verificar que el guardado
    desde el celular siga funcionando.
  - Dos pantallas corrigiendo el mismo estudio: la segunda en guardar recibe un
    aviso y no pisa el cambio.
  - *No olvidar (trazabilidad):* al guardar una edición, guardar también la fila
    de `estudios` aunque solo hayan cambiado etapas. Así el trigger registra
    `modificado_por`/`modificado_en` (el trigger solo mira la tabla `estudios`).

## Preguntas para el médico

- ¿Quiere el **DNI** en la planilla impresa? (La planilla en papel no lo tiene;
  por ahora el PDF lo muestra a la derecha de "Paciente".)

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
  - Para el dashboard la referencia pasa a ser el panel de LoMar con la marca de
    la Cañada (no Dribbble).

---

## Fuera de estas tareas (posterior a la demo)

- Funcionamiento sin conexión y reenvío automático.
- Tabla de pacientes y macheo por documento.
- Múltiples roles, planillas y clínicas.
- Empaquetado como app nativa.
- Menú del encabezado tipo hamburguesa (con X para cerrar), con foto de perfil y
  nombre del usuario, modo de color y cerrar sesión. (Requiere guardar el nombre
  de cada usuario, que hoy la base no tiene; la foto llega con la T049.)
- Fotos en iPhone: sumar un conversor a WebP para los celulares que no lo crean
  solos.
- Probar el acceso restringido con una segunda cuenta real (que un usuario no vea
  ni toque estudios ni fotos de otro).
- Adjuntar videos (WebM o MP4, según lo que grabe cada celular). Tener en cuenta
  que hoy el depósito solo acepta WebP de hasta 5 MB y el espacio del plan gratis
  de Supabase.
