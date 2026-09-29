# Especificación — Demo: Carga de Estudio Ergométrico por voz

> Documento de especificación (Spec-Driven Development / Spec Kit).
> Ubicación sugerida en el repo: `specs/001-estudio-ergometrico/spec.md`
>
> **Funcionalidad:** Carga, revisión y consulta de Estudios Ergométricos.
> **Alcance:** Demo (un profesional, una planilla, un flujo).
> **Fecha:** 2026-09-21
> **Estado:** Aclarada (clarify resuelto) — pendiente de aprobación.

---

## Qué es esto y qué NO es

Esta especificación describe **qué** tiene que hacer el sistema desde el punto
de vista de quien lo usa. **No** describe cómo se programa (eso va en el plan).
Por eso no vas a encontrar acá nombres de tecnologías: se habla de "el sistema".

Todo lo de acá tiene que respetar la Constitución del proyecto. En especial:
la planilla es el contrato, el profesional siempre confirma antes de guardar, y
el sistema nunca inventa datos.

---

## Escenarios de usuario y pruebas

Las funcionalidades están ordenadas por prioridad. Cada una se puede probar por
separado. La P1 es el corazón de la demo: si solo llegáramos a hacer esa, ya
habría algo para mostrar.

### Historia 1 — Cargar un estudio por voz y confirmarlo (Prioridad: P1)

El profesional (médico o enfermero) inicia un nuevo Estudio Ergométrico y lo
completa **dictando por voz**. El sistema transcribe lo que dice, ubica cada
dato en el campo correcto de la planilla, y se lo muestra completo en pantalla.
El profesional revisa, corrige lo que haga falta, y recién entonces confirma
para guardar.

**Por qué es P1:** es la razón de ser del proyecto. Sin esto no hay demo.

**Cómo se prueba solo:** se dicta un estudio de ejemplo de principio a fin y se
verifica que los datos quedaron en los campos correctos, que nada quedó
inventado, y que el estudio se guarda solo después de confirmar.

**Escenarios de aceptación:**

1. **Dado** que el profesional está en un estudio nuevo y vacío,
   **cuando** dicta "paciente Juan Pérez, sexo masculino, edad 55",
   **entonces** el sistema completa nombre, sexo y edad con esos valores y deja
   el resto vacío.

2. **Dado** un estudio con datos ya cargados,
   **cuando** el profesional dicta "a los 6 minutos, presión 160 sobre 90,
   frecuencia 145",
   **entonces** el sistema completa la fila de la etapa de 6 minutos con
   presión "160/90" y frecuencia "145", sin tocar las demás filas.

3. **Dado** un dato ya cargado,
   **cuando** el profesional dicta una corrección ("la presión de los 6 era
   150, no 160"),
   **entonces** el sistema modifica ese dato puntual y no crea uno nuevo ni
   duplica la fila.

4. **Dado** un estudio completo en pantalla,
   **cuando** el profesional revisa y confirma,
   **entonces** el estudio queda guardado y disponible para consultarlo después.

5. **Dado** un estudio en revisión,
   **cuando** el profesional no confirma (cierra, cancela o se va),
   **entonces** nada queda guardado de forma definitiva.

6. **Dado** que el profesional dicta un dato sin decir a qué etapa pertenece,
   **cuando** el sistema no puede ubicarlo con certeza,
   **entonces** no lo carga en ningún campo: lo deja para que el profesional lo
   cargue a mano.

### Historia 2 — Adjuntar imágenes y archivos al estudio (Prioridad: P2)

El profesional agrega al estudio imágenes del electrocardiograma, fotos, o
archivos que ya tiene guardados en el celular. Quedan asociados a ese estudio.

**Por qué es P2:** suma mucho valor y es parte del pedido, pero un estudio se
puede cargar y mostrar aunque esto no esté todavía.

**Cómo se prueba solo:** se agrega una o varias imágenes a un estudio y se
verifica que quedan guardadas con él y que se pueden ver al consultarlo.

**Escenarios de aceptación:**

1. **Dado** un estudio en carga,
   **cuando** el profesional toma una foto del electrocardiograma,
   **entonces** la imagen queda adjunta a ese estudio (guardada en formato WebP).

2. **Dado** un estudio en carga,
   **cuando** el profesional elige una o varias imágenes ya guardadas en su
   celular,
   **entonces** todas quedan adjuntas a ese estudio.

3. **Dado** un estudio guardado con imágenes,
   **cuando** alguien autorizado lo consulta,
   **entonces** puede ver esas imágenes (en celular y en computadora), y nadie
   sin autorización puede accederlas.

### Historia 3 — Consultar, imprimir y editar los estudios (dashboard) (Prioridad: P3)

Desde una computadora, una persona autorizada entra con el mismo usuario y
contraseña de la app, ve los números de su trabajo (total, hoy, esta semana, este
mes), busca y filtra el listado de estudios cargados, abre uno para ver todos sus
datos e imágenes, lo puede corregir (quedando registrado quién lo cambió, cuándo y
cómo estaba antes), y lo puede imprimir o descargar en PDF con el mismo aspecto
que la planilla original en papel. También configura su modo de color y su foto
de perfil. El celular es solo para cargar: el dashboard se ve en la computadora
(el aparato con mouse o trackpad), con cualquier tamaño de ventana y de zoom.

**Por qué es P3:** cierra el círculo y es lo que se muestra "en la pantalla
grande", pero depende de que primero existan estudios cargados (P1).

**Cómo se prueba solo:** con estudios ya guardados, se abre el dashboard y se
verifica que aparecen en el listado, se pueden abrir completos, editar, e
imprimir/exportar con el formato de la planilla original.

**Escenarios de aceptación:**

1. **Dado** que hay estudios guardados,
   **cuando** la persona autorizada abre el dashboard en la computadora,
   **entonces** ve los números (total, hoy, esta semana, este mes) y el listado
   de estudios (N°, fecha y hora, paciente, DNI, médico solicitante, conclusión
   resumida y cantidad de fotos).

2. **Dado** el listado,
   **cuando** busca por nombre o DNI, o elige un rango de fechas en un solo
   calendario (toca el día de inicio y el de fin; los días del medio se pintan;
   con un solo día toca, filtra solo ese día),
   **entonces** la tabla muestra solo los estudios que cumplen, y "Limpiar"
   vuelve a mostrar todos (también limpia el rango).

3. **Dado** el listado,
   **cuando** abre un estudio,
   **entonces** ve todos los campos de la planilla (los vacíos con "—", ninguno
   oculto) y las fotos del electro en miniatura, que se agrandan al tocarlas.
   El encabezado de la ficha ("← Volver", el título con el N° y el logo) queda
   fijo arriba mientras baja, para volver a la lista desde cualquier punto. Las
   fotos se ven aunque la ficha haya quedado abierta mucho tiempo (los enlaces
   se renuevan solos).

4. **Dado** un estudio abierto,
   **cuando** el profesional corrige datos y guarda,
   **entonces** el estudio queda actualizado y queda registrado quién lo cambió,
   cuándo y cómo estaba antes. Las fotos no se agregan ni se borran desde el
   dashboard.

5. **Dado** un estudio abierto,
   **cuando** elige "Imprimir" o "Descargar PDF",
   **entonces** se arma un único PDF: la hoja 1 es la planilla completa con el
   mismo aspecto que la original en papel, y las hojas siguientes, las fotos del
   electro (si tiene). "Imprimir" abre ese PDF en la ventana de impresión y
   "Descargar PDF" lo guarda, así papel y archivo salen idénticos.

6. **Dado** el dashboard,
   **cuando** entra en Configuración,
   **entonces** puede elegir el modo de color (Claro / Oscuro / Automático), ve
   con qué correo ingresó y puede subir o cambiar su foto de perfil: antes de
   subirla la acomoda en un círculo (zoom y arrastrar; la foto siempre cubre el
   círculo) y elige "Guardar" o "Cancelar". La foto después se ve en la barra
   lateral del dashboard y en el menú del celular.

7. **Dado** que se abre la app,
   **cuando** el aparato solo tiene pantalla táctil (celular o tablet, aunque
   esté acostado),
   **entonces** muestra la pantalla de carga; **cuando** tiene mouse o trackpad
   (computadora), muestra el dashboard, con cualquier tamaño de ventana y
   cualquier zoom del navegador. Es la misma app y el mismo link.

### Casos límite a tener en cuenta

- El profesional dicta algo que no se entiende o la transcripción sale mal.
- El profesional dicta datos de un campo que la planilla no tiene.
- Se corta la conexión a internet en medio de la carga.
- El micrófono no tiene permiso (frecuente en iPhone).
- El profesional dicta varias veces sobre el mismo estudio (la carga se arma en
  varias tandas de voz, no en una sola).
- Se intenta guardar un estudio casi vacío (permitido, salvo los datos mínimos).
- La prueba tiene más o menos etapas que las cuatro habituales.
- Dos personas abren el dashboard al mismo tiempo (o el mismo profesional en dos
  pestañas) y corrigen el mismo estudio.
- En la computadora, el médico usa zoom en el navegador (hasta 200%) o una ventana
  angosta: sigue viendo el dashboard, sin nada tapado ni oculto.
- La ficha queda abierta más tiempo que lo que dura el enlace de las fotos: al
  tocar una foto, se ve igual.
- Un celular o una tablet con mouse, teclado, lápiz o "Vincular con Windows":
  sigue mostrando la carga. Si se conecta o desconecta un mouse con la app
  abierta, la vista no cambia sola (una carga a medias no se oculta ni se
  pierde); se vuelve a decidir al abrir la app o al iniciar sesión (T060).
- Un estudio con una conclusión muy larga o con más de cuatro etapas: la hoja 1
  del PDF igual tiene que entrar en una sola A4.
- Un estudio sin fotos: el PDF tiene solo la hoja 1.

---

## Requisitos

### Requisitos funcionales

- **RF-001:** El sistema debe permitir el ingreso con **usuario y contraseña**;
  solo personas autorizadas acceden. El alta de usuarios la realiza un
  administrador (por ahora, Mauro). No se usa login con Google/OAuth.
- **RF-002:** El sistema debe permitir iniciar un nuevo Estudio Ergométrico.
- **RF-003:** El sistema debe permitir cargar los datos del estudio dictando por
  voz. (El dictado requiere conexión a internet — ver RF-024.)
- **RF-004:** El sistema debe convertir la voz en texto.
- **RF-005:** El sistema debe ubicar cada dato dictado en el campo correcto de
  la planilla, respetando la estructura del Estudio Ergométrico (datos del
  paciente, datos del estudio, ECG basal, tabla de etapas, interrupción,
  postesfuerzo, conclusión).
- **RF-006:** El sistema no debe inventar, suponer ni completar por contexto
  ningún dato no dictado. Lo no mencionado queda vacío.
- **RF-007:** En la tabla de etapas, el sistema debe completar únicamente las
  filas existentes según el momento que menciona el profesional. La tabla arranca
  con las etapas habituales (reposo, 3', 6', 9'), pero el profesional puede
  agregar o quitar etapas según cómo haya sido la prueba (ver RF-023b). Si el
  profesional dicta un tiempo que no corresponde a ninguna fila existente, el
  sistema no adivina: lo deja para carga/creación manual.
- **RF-008:** El sistema debe permitir que la carga se realice en varias tandas
  de voz sobre el mismo estudio, acumulando los datos sin pisar lo ya cargado.
- **RF-009:** El sistema debe aplicar correcciones dictadas sobre datos previos,
  modificando el dato puntual sin duplicar.
- **RF-010:** Cuando un dato dictado no pueda ubicarse con certeza, el sistema no
  debe cargarlo en ningún campo; queda a cargo del profesional cargarlo a mano.
- **RF-011:** El sistema debe mostrar el estudio completo para revisión antes de
  guardar.
- **RF-012:** El sistema debe permitir al profesional editar/corregir cualquier
  campo manualmente durante la revisión.
- **RF-013:** El sistema no debe guardar nada de forma definitiva sin una
  confirmación explícita del profesional.
- **RF-014:** El sistema debe permitir adjuntar imágenes tomadas en el momento
  (foto) y archivos ya existentes en el dispositivo. En la demo solo se adjuntan
  **imágenes** (se guardan en WebP, ver RF-026); adjuntar otros archivos, como
  PDF, queda para después de la demo.
- **RF-015:** El sistema debe guardar el estudio confirmado de forma persistente
  y asociarle sus imágenes.
- **RF-016:** El sistema debe registrar quién cargó cada estudio y la fecha/hora
  de **carga** (automática, para trazabilidad). Además, la **fecha de la prueba**
  (campo FECHA de la planilla) la puede dictar o corregir el profesional, porque
  un estudio puede cargarse después de realizado.
- **RF-017:** El sistema debe ofrecer una vista de dashboard (pensada para
  computadora) con barra lateral (logo, perfil, "Estudios", "Configuración",
  "Cerrar sesión"), números (total, hoy, esta semana, este mes), filtros (buscar
  por nombre o DNI, un solo calendario de rango de fechas, limpiar), botón
  "Actualizar" con contador, y una tabla de estudios (N°, fecha y hora, paciente,
  DNI, médico solicitante, conclusión resumida, cantidad de fotos) que abre la
  ficha completa de cada uno. La ficha muestra todos los campos de la planilla
  (los vacíos con "—") y las fotos del electro en miniatura, que se agrandan al
  tocarlas; su encabezado ("← Volver", título con el N° y logo) queda fijo
  arriba al bajar. Los enlaces de las fotos se renuevan solos cuando vencen.
  - *Calendario de rango:* un solo calendario en castellano (semana desde el
    lunes), usable con teclado: se toca el día de inicio y el de fin, y los del
    medio se pintan; con un solo día tocado, filtra solo ese día. Usa la fecha de
    carga.
- **RF-018:** El sistema debe mostrar la vista según el **tipo de aparato**, con
  una sola app y un solo link (decisión 29, T060):
  1. **Celular o tablet = vista de carga, siempre** (el celular es solo para
     cargar; una tablet cuenta como celular), aunque tenga conectado un mouse, un
     teclado, un lápiz o "Vincular con Windows". Es celular o tablet si el propio
     navegador dice que es móvil (o su identificación dice Android, iPhone, iPad
     o iPod, o es un iPad que se presenta como Mac), o si el puntero principal es
     el dedo, sin "hover" (así se cubren el modo "sitio de escritorio" y las
     tablets solo táctiles).
  2. Si no, con **mouse o trackpad** (computadora, también una notebook con
     pantalla táctil) = **dashboard, siempre**, sin importar el tamaño de la
     ventana ni el zoom del navegador.
  3. Si el navegador no informa nada del puntero, decide por el ancho (1024 px).

  La vista se decide **una sola vez**, al abrir la app o al iniciar sesión, y no
  cambia sola después (si aparece o desaparece un puntero en medio de una carga,
  la planilla no se oculta ni se pierde). No hay botón manual para cambiarla. Los
  celulares con S Pen quedan cubiertos por esta regla, pero no se probaron en un
  aparato real. El dashboard tiene que poder usarse con zoom de hasta 200% en una
  pantalla de 1280 px (unos 640 px de ancho), sin ocultar información. No hay
  versión del dashboard para celular.
- **RF-019:** El sistema debe restringir el acceso a los datos e imágenes según
  la autorización de cada usuario. (Si distintos usuarios de un mismo servicio
  comparten estudios se define al escalar; en la demo hay un solo usuario.)
- **RF-020:** El sistema debe funcionar en Android y en iPhone (iOS).
- **RF-021:** El sistema debe permitir **editar** y **consultar** un estudio ya
  guardado, desde el dashboard. Se corrigen los datos del estudio; las fotos no se
  agregan ni se borran desde el dashboard. Cada edición queda **registrada**:
  quién lo cambió, cuándo y cómo estaba antes.
- **RF-022:** El sistema debe permitir **imprimir** y **descargar en PDF** un
  estudio, desde la ficha del dashboard. Se arma **un único PDF** y los dos
  botones usan ese mismo archivo ("Imprimir" lo abre en la ventana de impresión;
  "Descargar PDF" lo guarda), así el papel y el archivo salen idénticos. La
  **hoja 1** es la planilla completa, en **A4 vertical** y en **una sola página**,
  igual que la planilla original en papel del Servicio de Cardiología; las
  **hojas siguientes** son las fotos del electro, solo si el estudio tiene. En la
  hoja 1 el **DNI** va a la derecha de "Paciente" (la planilla en papel no lo
  tiene). El archivo se llama
  `Ergometrico-<número>-<nombre del paciente>-<AAAA-MM-DD>.pdf`, con el nombre
  tal cual está cargado, sin acentos y con guiones entre palabras (ej.:
  `Ergometrico-12-Carlos-Mendez-2026-09-26.pdf`), y no se guarda en el servidor.
- **RF-023:** Los **datos mínimos** para poder guardar un estudio son el **DNI** y
  el **nombre del paciente**. La planilla no necesita estar completa para
  guardarse.
- **RF-023b:** Las etapas de la tabla **pueden variar en cantidad**; el sistema
  debe permitir agregar o quitar etapas.
- **RF-024:** *(POSTERIOR A LA DEMO — escrito, no se implementa todavía)* El
  sistema debe seguir funcionando cuando se cae la conexión, en lo que no dependa
  de servicios en la nube: ver y editar a mano una planilla, y dejar una planilla
  lista para enviarse. El **dictado por voz** (transcripción y estructuración)
  **requiere conexión** y no funciona sin internet.
- **RF-025:** *(POSTERIOR A LA DEMO — escrito, no se implementa todavía)* Cuando
  se recupera la conexión, el sistema debe enviar automáticamente las planillas
  que quedaron pendientes, y mostrar una confirmación de guardado con éxito (por
  ejemplo, "Guardado con éxito — planilla N°X").
- **RF-026:** Las imágenes se almacenan y se muestran en formato **WebP**, tanto
  en celular como en computadora.
- **RF-027:** El dashboard debe tener una sección **Configuración** con: modo de
  color (Claro / Oscuro / Automático, igual que en el celular), "Ingresaste como
  <correo>" (solo para ver) y la **foto de perfil**. La foto se achica y comprime
  como las fotos de los estudios, hay una sola por profesional y cada uno solo
  puede subir o cambiar la suya. Se ve en la barra lateral del dashboard y en el
  menú del celular (en el celular solo se ve, no se sube). Sin foto, se muestra un
  círculo con la inicial.
  - *Recortar antes de subir (solo la foto de perfil, no las del electro):* al
    elegirla se abre un recuadro con un círculo; se puede hacer zoom (ruedita del
    mouse y una barrita) y arrastrar la foto en todas las direcciones; la foto
    siempre cubre todo el círculo. "Guardar" recorta lo que se ve en el círculo y
    lo sube; "Cancelar" (o Esc) no sube nada. Alcanza con que ande con mouse.
  - Si el enlace de la foto venció, se pide uno nuevo una vez antes de volver a
    la inicial.
- **RF-028:** Al dashboard se entra con el **mismo login** de la app (RF-001) y
  los datos se leen respetando las mismas reglas de acceso (RF-019).
- **RF-029 (Papelera):** "Borrar" un estudio lo manda a la **Papelera**: nunca se
  borra de verdad desde la app (se conservan el estudio, sus etapas y sus fotos).
  Un estudio en la Papelera no aparece en el listado, ni en los números, ni en la
  búsqueda; su número no se reutiliza; no se edita estando ahí (para verlo, se
  restaura entero). Cada borrado y cada restauración quedan registrados (quién,
  con su correo, y a qué hora, puesta por el servidor), y ese registro no se
  puede editar ni borrar desde la app. Solo se hace con dos funciones del
  servidor (anular y restaurar), que exigen usuario logueado.
- **RF-030:** En la carga (celular), los números con decimales (peso, talla, MET,
  porcentaje) se muestran y se aceptan con **coma**; si se escribe un punto, se
  convierte en coma. Se guardan igual que antes (como número).
- **RF-031:** Al confirmar, los textos libres **Motivo, Antecedentes, Conclusión e
  Interrupción de la prueba** pasan su **primera letra a mayúscula** (solo esa;
  el resto del texto no cambia), y se ve en pantalla antes del cartel de
  confirmación. No se aplica a nombres ni al médico solicitante, ni cambia los
  estudios ya guardados.
- **RF-032 (Editar, con historial):** desde la ficha del dashboard, el botón
  **"Editar"** pasa a la **misma planilla del celular** con los datos del estudio,
  con **"Guardar cambios"** y **"Cancelar"**. Detalla el RF-021:
  - Solo con teclado: sin micrófono, sin grabación y sin fotos (las fotos no se
    tocan).
  - Se corrigen los datos y las etapas (cambiar, agregar y quitar). El número del
    estudio no cambia.
  - Mismos criterios que la carga: decimales con coma, mayúscula inicial (RF-031),
    DNI y nombre obligatorios (RF-023) y números bien escritos.
  - "Guardar cambios" pregunta antes. Si no hubo cambios, avisa "No hay cambios
    para guardar" y no registra nada.
  - Salir con cambios sin guardar ("Cancelar", volver, otra sección o cerrar
    sesión) pregunta "¿Seguro? Se pierden los cambios".
  - Cada edición guarda en un **historial** cómo estaba el estudio antes (con sus
    etapas), quién (con su correo) y cuándo (hora del servidor). El historial no se
    ve ni se puede cambiar desde la app. En la ficha se ve solo "Última edición:
    día y hora". La pantalla **no menciona el historial** en ningún lado:
    carteles, avisos y textos de ayuda no hablan de él. El cartel de guardar dice
    solo "Se van a guardar los cambios del estudio N° X."
  - **Edición cruzada:** si otra persona u otra pestaña lo cambió mientras tanto,
    no se guarda y avisa en criollo. Se puede elegir cargar la versión nueva o
    seguir editando, para no perder lo escrito sin aviso.
  - No se editan estudios que están en la Papelera (RF-029).
  - Toda corrección pasa por una sola función del servidor, todo o nada. La app no
    puede modificar ni borrar estudios ni etapas de forma directa.
  - Al cerrar sesión, la planilla de edición se borra de la pantalla, y en la
    consola no aparecen datos del paciente.

### Entidades de datos principales

- **Estudio Ergométrico:** una ficha completa de un paciente en una fecha.
  Contiene los datos del paciente, los datos del estudio, el ECG basal, la tabla
  de etapas (habitualmente reposo, 3', 6', 9', pero puede variar en cantidad), la
  interrupción de la prueba, el postesfuerzo a los 5 minutos, la conclusión, y
  las imágenes adjuntas. Guarda también quién lo cargó y cuándo (fecha/hora
  automáticas).
- **Etapa (fila de la tabla):** un momento de la prueba, con su tiempo y carga y
  los valores medidos (MET, tensión arterial, frecuencia cardíaca, ECG, clínica).
  La cantidad de etapas puede variar según la prueba.
- **Imagen adjunta:** una foto o archivo asociado a un estudio (electro, foto del
  paciente, u otro), almacenada en formato WebP.
- **Usuario:** la persona que ingresa al sistema (médico o enfermero); tiene un
  tipo de acceso. Para la demo, un único tipo. El administrador (Mauro) da de
  alta a los usuarios. Multi-rol es posterior. Puede tener una **foto de perfil**.
- **Cambio de un estudio (historial):** cada edición hecha desde el dashboard:
  quién la hizo, cuándo, y cómo estaba el estudio (con sus etapas) antes del
  cambio.
- **Registro de la Papelera:** cada vez que un estudio va a la Papelera o se
  restaura: qué se hizo, quién (su id y una copia de su correo) y a qué hora.

---

## Criterios de éxito

Medibles y sin hablar de tecnología. Con esto sabemos si la demo salió bien.

- **CE-001:** El profesional puede cargar un Estudio Ergométrico completo,
  íntegramente por voz, y guardarlo tras revisarlo.
- **CE-002:** En las pruebas, el sistema no guarda **ningún** dato que el
  profesional no haya dictado o confirmado (cero datos inventados).
- **CE-003:** Los datos dictados con su referencia de etapa terminan en la fila
  correcta en el 100% de los casos de prueba.
- **CE-004:** Una corrección dictada modifica el dato correcto sin duplicar, en
  el 100% de los casos de prueba.
- **CE-005:** Un estudio guardado puede consultarse, editarse e imprimirse
  después, completo y con sus imágenes, desde el dashboard.
- **CE-006:** El flujo completo funciona tanto en un celular Android como en un
  iPhone.
- **CE-007:** Ningún usuario puede ver estudios o imágenes que no le
  corresponden.
- **CE-008:** La hoja 1 de la impresión y del PDF se ve igual que la planilla
  original en papel, y lo impreso y el archivo descargado salen idénticos.
- **CE-010:** Toda edición de un estudio guardado queda registrada (quién, cuándo
  y cómo estaba antes).
- **CE-009:** *(POSTERIOR A LA DEMO)* Si se cae la conexión al guardar, la
  planilla no se pierde y se envía sola al volver internet, con confirmación.

---

## Fuera de alcance de la demo

- Múltiples tipos de planilla (solo Estudio Ergométrico).
- Múltiples roles con permisos distintos (solo el profesional que carga; roles a
  fondo, más adelante).
- Múltiples clínicas.
- Cálculos o interpretaciones médicas automáticas.
- Empaquetado como app nativa (Play Store / App Store).
- Funcionamiento sin conexión y reenvío automático (RF-024, RF-025): queda
  especificado, pero se implementa después de la demo.

---

## Decisiones tomadas en clarify

1. **Login:** usuario y contraseña; alta por administrador (Mauro). No OAuth.
2. **Etapas de la tabla:** pueden variar en cantidad; se pueden agregar/quitar.
3. **Editar lo guardado:** sí, se puede editar y consultar.
4. **Exportar/imprimir:** sí, a PDF e impresión, con el aspecto de la planilla
   original en papel (al menos en computadora).
5. **Datos mínimos:** los del paciente; la planilla puede guardarse incompleta.
6. **Fecha:** la fecha/hora de **carga** es automática (trazabilidad). La
   **fecha de la prueba** la dicta o corrige el profesional, porque puede cargar
   el estudio más tarde.
7. **Dato no ubicable con certeza:** no se carga; carga manual del profesional.
8. **Quién carga:** médico o enfermero (mismo tipo de acceso en la demo).
9. **Offline:** queda especificado pero **fuera de la demo** (se implementa
   después). Nota: el dictado por voz siempre requiere internet; lo offline
   aplica a ver/editar y guardar-para-enviar, con reenvío automático y
   confirmación al volver la conexión.
10. **Imágenes:** formato WebP, visibles en celular y computadora.
11. **Visibilidad entre usuarios del mismo servicio:** a definir al escalar (en
    la demo hay un solo usuario).
12. **Audio:** no se guarda en el servidor (pasa a la transcripción y se
    descarta).
13. **Datos no ubicados:** por ahora no se avisan; no se cargan en ningún lado
    (T021, después de la demo).
14. **Corrección de un estudio guardado:** una vez guardado, no se edita desde el
    celular; se corrige desde la computadora (dashboard, T032).
15. **Datos mínimos para guardar:** DNI y nombre del paciente.
16. **Dashboard, base:** copia la forma y el comportamiento del panel de LoMar
    (barra lateral, números, filtros, "Actualizar" con contador, estados
    cargando / error / vacío, tabla clickeable, ficha, vista ampliada de fotos),
    con la marca de la Cañada y modo claro y oscuro. **No** copia la seguridad de
    LoMar: se entra con el login de Supabase y los datos se leen directo de
    Supabase con las reglas de acceso actuales.
17. **Una sola app, un solo link:** aparato solo táctil = carga; aparato con
    mouse o trackpad = dashboard (ver decisión 22). Sin versión del dashboard para
    celular.
18. **Menú lateral:** logo, perfil (foto o inicial), "Estudios", "Configuración"
    y "Cerrar sesión". Nada más.
19. **Configuración:** modo de color (igual que el celular; se guarda en cada
    aparato), correo con que ingresó (solo ver) y foto de perfil (una por
    profesional; solo la propia; 1024 px, ver decisión 26). Sin foto: círculo con la inicial del
    correo, con el correo debajo (la base no guarda el nombre).
20. **Imprimir y PDF:** un único PDF armado en la computadora (no se guarda en el
    servidor): hoja 1 la planilla (con el DNI a la derecha de "Paciente"), hojas
    siguientes las fotos del electro. Nombre:
    `Ergometrico-<número>-<nombre del paciente tal cual, sin acentos, con
    guiones>-<AAAA-MM-DD>.pdf`.
21. **Editar:** desde la ficha se corrigen los datos y las etapas (valores,
    agregar y quitar), con la misma planilla del celular; no las fotos. Queda
    registrado quién, cuándo y cómo estaba antes. En la ficha se ve solo "Última
    edición: día y hora"; la lista completa, después de la demo. Si dos pantallas
    corrigen el mismo estudio, la segunda en guardar recibe un aviso y no pisa el
    cambio.
22. **Qué vista mostrar (reemplaza el "corte de 1024 px"):** se decide por el
    **tipo de aparato**, no por el tamaño de la ventana (con zoom del navegador el
    ancho cambia y el dashboard desaparecía). Con mouse o trackpad = dashboard,
    siempre; solo táctil = carga, siempre, aunque esté acostado. El teclado no
    cuenta. Si el navegador no informa, decide por el ancho (1024 px). El
    dashboard aguanta zoom de hasta 200% en una pantalla de 1280 px. *(Ajustada
    por la decisión 29: primero se mira si es celular o tablet, y la vista ya no
    cambia sola.)*
23. **Fechas del dashboard:** la tabla, los números y los filtros usan la fecha y
    hora de **carga**; la fecha del estudio se ve en la ficha. "Esta semana" = de
    lunes a hoy; "Este mes" = desde el día 1.
24. **Sin permiso directo de modificar:** toda corrección de estudios y etapas
    pasa por la función que deja registro.
25. **Ajustes de la Tanda 1 (Tanda 1b):** encabezado fijo en la ficha (listo para
    sumar "Imprimir", "Descargar PDF" y "Editar"); enlaces de fotos que se renuevan
    solos; un solo calendario de rango en los filtros; recortador de la foto de
    perfil (solo en la compu); y la vista según el tipo de aparato (decisión 22).
26. **Foto de perfil nítida (Tanda 1c):** el cuadro del recortador es siempre
    cuadrado (con ventana baja o zoom se aplastaba y la foto se veía chata y
    borrosa); la foto sale de 1024 px, achicada por pasos, en WebP calidad 0,92
    (hasta 900 KB).
27. **Decimales con coma en el celular** (RF-030) y **mayúscula inicial** en los
    textos libres al confirmar (RF-031).
28. **Papelera (RF-029):** borrado lógico, con registro de quién y cuándo en
    cada borrado y restauración. Puede borrar y restaurar cualquier usuario
    logueado, sobre los estudios que puede ver según la regla de acceso actual
    (hoy, los que cargó él). La pantalla se hace cuando el SQL ya esté corrido.
29. **Vista según el aparato, a prueba de accesorios (T060, reemplaza en parte la
    decisión 22):** el celular de Mauro (Samsung, sin S Pen) empezó a mostrar el
    dashboard: algún accesorio o función del celular (un mouse o teclado
    Bluetooth, "Vincular con Windows", un lápiz) hacía que informara un puntero
    preciso, y la regla era solo "puntero preciso = compu". Ahora primero se mira
    si es celular o tablet (lo dice el navegador, o el puntero principal es el
    dedo): si lo es, carga siempre. Recién si no, puntero preciso = dashboard; y
    sin información, por el ancho. La vista se decide al abrir la app o al
    iniciar sesión y no cambia sola. Sin botón manual ni opción en el menú. Los
    celulares con S Pen quedan cubiertos, pero no se probaron en un aparato real.
30. **Editar con historial (RF-032, T061 y T062):**
    - "Editar" va a la izquierda de "Borrar", con estilo neutro.
    - Edición solo con teclado.
    - "Cerrar sesión" con cambios sin guardar también pregunta "¿Seguro?".
    - **Sin tope** de cantidad de etapas por ahora, igual que en la carga; queda
      anotado para producción.
    - El historial **no se mira con la clave de servicio**: para revisarlo hay una
      consulta de solo lectura (`supabase/ver_historial.sql`) que muestra solo
      cantidades, horas y el correo de quien editó, nunca datos del paciente.

---

## Lista de control (antes de aprobar la especificación)

- [x] Las historias de usuario cubren lo que necesita la demo.
- [x] No hay detalles de programación mezclados (eso va en el plan).
- [x] Los requisitos son claros y verificables.
- [x] Los criterios de éxito se pueden medir.
- [x] Los puntos pendientes fueron resueltos en clarify.
- [x] La especificación respeta la Constitución.
