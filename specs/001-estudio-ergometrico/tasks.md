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
    dice su palabra ("teórica"; "alcanzada" o "máxima"; "porcentaje" o "%"). Una
    talla mayor de 3 se descarta y queda vacía (no se convierte a metros).
  - **PENDIENTE** (se decide con la comparación de modelos): la presión del
    postesfuerzo dicha sin la palabra "presión", o escrita en palabras, a veces
    no se carga.
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
- **T043** Manejo del permiso de micrófono, con atención especial a iPhone:
  pedirlo y mostrar un mensaje claro si está denegado. *(cubre RF-020)*
- ✅ **T044** Manejo de error de transcripción: si el dictado no se entiende o falla,
  avisar y permitir volver a grabar.

## Fase 3 — Historia 2 (P2): imágenes

- **T025** Sacar foto en el momento y elegir archivos ya guardados en el celular.
  - Si llegamos a la demo sin la Fase 3, esconder el clip y la cámara de la barra.
    *(Ya no hace falta si las fotos funcionan en el celular.)*
- **T026** Convertir las imágenes a formato WebP.
- **T027** Subir las imágenes al bucket privado.
  - *Orden de guardado:* se suben recién después de guardar la fila de
    `estudios` (ver T024), en la carpeta de ese estudio:
    `imagenes-estudios/<estudio_id>/<archivo>.webp`. Las reglas del bucket
    (`seguridad.sql`) rechazan cualquier archivo fuera de esa carpeta.
- **T028** Guardar la ruta de cada imagen en la tabla `imagenes`.
- **T029** Mostrar las imágenes con enlaces firmados que caducan (en celular y
  computadora).
  - Ver las fotos de un estudio guardado es en el dashboard (Fase 4). En el
    celular, antes de guardar, solo se ven las miniaturas. La función del enlace
    firmado queda lista para el dashboard.

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
  - *Conclusión:* es un campo de texto largo que va en la misma hoja (no hay
    segunda hoja de conclusiones). Hay que resolver cómo se ve si es muy larga,
    para que todo entre en una sola A4 vertical (RF-022).

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
- Menú del encabezado tipo hamburguesa (con X para cerrar), con foto de perfil y
  nombre del usuario, modo de color y cerrar sesión. (Requiere guardar el nombre
  y la foto de cada usuario, que hoy la base no tiene.)
- Fotos en iPhone: sumar un conversor a WebP para los celulares que no lo crean
  solos.
- Probar el acceso restringido con una segunda cuenta real (que un usuario no vea
  ni toque estudios ni fotos de otro).
- Adjuntar videos (WebM o MP4, según lo que grabe cada celular). Tener en cuenta
  que hoy el depósito solo acepta WebP de hasta 5 MB y el espacio del plan gratis
  de Supabase.
