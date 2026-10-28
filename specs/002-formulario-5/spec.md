# Especificación — Demo: Formulario N° 5 por voz

> Documento de especificación (Spec-Driven Development / Spec Kit).
> Ubicación en el repo: `specs/002-formulario-5/spec.md`
>
> **Funcionalidad:** Carga, revisión, consulta, edición e impresión del
> Formulario N° 5 (hoja de indicaciones médicas y controles de enfermería de
> pacientes internados).
> **Alcance:** Demo (la app muestra solo esta planilla; el Estudio Ergométrico
> queda guardado detrás de un interruptor).
> **Fecha:** 2026-10-28
> **Estado:** Borrador — con puntos [A DEFINIR] que Mauro resuelve con un
> enfermero. Pendiente de aprobación.
> **Basado en:** Constitución v1.3.0.

---

## Qué es esto y qué NO es

Esta especificación describe **qué** tiene que hacer el sistema con el
Formulario N° 5, desde el punto de vista de quien lo usa. **No** describe cómo
se programa (eso va en el plan): acá se habla de "el sistema".

Todo lo de acá respeta la Constitución. En especial: la planilla es el
contrato, el profesional siempre confirma antes de guardar, y el sistema nunca
inventa datos.

**Por qué ahora:** la demo pasa a girar alrededor de esta hoja, que se usa todos
los días con cada paciente internado. El Estudio Ergométrico, que ya está
construido, **no se borra ni se rompe**: queda guardado y escondido, y se puede
volver a mostrar cambiando una configuración.

**Lo que se reutiliza (sin pedirle nada nuevo al usuario):** la misma app, el
mismo login, la misma forma de dictar y completar por voz, el mismo dashboard en
la computadora, la misma Papelera, la misma forma de editar con historial y de
imprimir. Lo nuevo es la planilla en sí.

---

## La hoja en papel (el contrato)

Referencia: la imagen del "FORMULARIO N° 5" que pasó Mauro (hoja **horizontal**).
Estas son sus partes, en el orden del papel:

1. **Encabezado:** Fecha, Hab. (habitación), Mutual, Dr., Pte. (paciente),
   Trámite adm. (SÍ / NO, con casilleros en el papel; en la app va como texto
   controlado, ver RF-018) y Diagnóstico.
2. **Indicaciones médicas** (columna izquierda), cada una con sus renglones de
   puntos:
   - C.S.V. (2 renglones en el papel)
   - Tomografía (2 renglones)
   - Electrocardiograma (2 renglones)
   - Laboratorio (2 renglones)
   - Medicación (5 renglones)
   - Dieta (1 renglón, a lo ancho de la hoja)
3. **Grilla de HORARIOS** (a la derecha de las indicaciones): columnas de 06:00 a
   24:00 cada 2 horas (06, 08, 10, 12, 14, 16, 18, 20, 22 y 24) y varios
   renglones. En el papel la grilla tiene **13 renglones**, a la misma altura que
   los 13 renglones de las indicaciones (C.S.V. a Medicación). Qué significa cada
   casillero y cómo se llena: **[A DEFINIR] (i)**.
4. **Hidratación** (recuadro grande, texto libre).
5. **Diuresis** por turno: "05 a 13 =", "13 a 21 =", "21 a 5 =".
6. **Drenajes**.
7. **SNG / Vómitos**.
8. **Deposiciones**.
9. **Controles de Enfermería** por turno (**Mañana**, **Tarde**, **Noche**), cada
   uno con **F.R.**, **Te.**, **P.**, **T.A.** y **O2**.

**Supuesto (escrito para no olvidarlo):** cada hoja es de **UN paciente** por
**UN día**. Cuántas hojas puede haber por paciente y por día: **[A DEFINIR] (iv)**.

**La hoja no tiene DNI.** No se agrega (la planilla es el contrato y se guarda
solo lo que pide). Por eso el dashboard busca por paciente, habitación y fecha.

**Lo que el papel no aclara** (no se inventa; se marca para resolver):
- Si Drenajes, SNG / Vómitos y Deposiciones se anotan por turno (como la
  Diuresis) o con un solo valor por día: **[A DEFINIR] (vi)**.
- Si los turnos de Diuresis (05 a 13, 13 a 21, 21 a 5) son los mismos que
  Mañana, Tarde y Noche de los Controles de Enfermería: **[A DEFINIR] (vi)**.
- Si en cada turno de Controles se anota un solo valor de F.R., Te., P., T.A. y
  O2, o varios (los recuadros del papel son altos): **[A DEFINIR] (vi)**.
- Qué datos son los mínimos para poder guardar una hoja (en el ergométrico eran
  DNI y nombre; acá no hay DNI): **[A DEFINIR] (vii)**.

---

## Los puntos [A DEFINIR] (los resuelve Mauro con un enfermero)

Ninguno se completa por cuenta propia. Mientras no estén definidos, lo que
dependa de ellos queda **bloqueado** en las tareas.

- **(i) La grilla de horarios:** qué significa exactamente cada marca (por
  ejemplo, una cruz, una hora, una firma, una sigla) y cómo se llena; si cada
  renglón de la grilla corresponde al renglón de la indicación que tiene al lado.
- **(ii) La repetición de horarios:** si algo se hizo a las 8 y se indica "cada 2
  horas" o "cada 4 horas", si se marcan los horarios siguientes; y si eso lo
  propone el sistema, un botón, o se carga a mano. **Reglas que ya valen** (por
  la Constitución): la IA solo carga lo que se dijo explícitamente; cualquier
  cálculo automático de horarios lo hace el sistema con reglas fijas (no la IA),
  se muestra como propuesta y **el profesional lo confirma antes de guardar**.
- **(iii) Quién llena cada parte:** qué parte llena el médico y qué parte
  enfermería. En la demo, la regla de visibilidad es la actual (cada usuario ve
  lo que cargó): por eso una misma persona carga la hoja completa.
- **(iv) Cuántas hojas por día:** si es una sola hoja por paciente y por día, o
  puede haber más (por ejemplo, si no entra la medicación).
- **(vi) Turnos y cantidades** (ver "Lo que el papel no aclara").
- **(vii) Datos mínimos para guardar.**

(El punto **(v)**, completar la hoja a lo largo del día desde el celular, ya está
decidido: ver "Decisiones tomadas", 7, y la Historia 8.)

---

## Escenarios de usuario y pruebas

Ordenados por prioridad. Cada uno se puede probar por separado. La P1 es el
corazón de la demo.

### Historia 1 — Cargar la hoja por voz, todo junto o por partes (Prioridad: P1)

El profesional abre una hoja nueva y la completa **dictando**. Puede dictar todo
de una vez, o de a partes (por ejemplo, primero el encabezado y las
indicaciones, después los controles): cada grabación **suma** a lo que ya está y
**no pisa** lo que se cargó antes, salvo que se dicte una corrección explícita.

**Por qué es P1:** es la razón de ser de la demo.

**Cómo se prueba solo:** se dicta una hoja de ejemplo en dos o tres grabaciones
y se verifica que cada dato quedó en su lugar, que nada se borró entre una
grabación y otra, y que nada quedó inventado.

**Escenarios de aceptación:**

1. **Dado** una hoja nueva y vacía,
   **cuando** el profesional dicta "habitación 12, mutual tal, doctor tal,
   diagnóstico tal",
   **entonces** el sistema completa esos campos con lo dicho y deja el resto
   vacío.
2. **Dado** una hoja con el encabezado ya cargado,
   **cuando** el profesional dicta en otra grabación "turno mañana: frecuencia
   respiratoria 18, temperatura 36,5",
   **entonces** el sistema completa F.R. y Te. del turno Mañana y **no toca** el
   encabezado.
3. **Dado** un dato ya cargado,
   **cuando** el profesional dicta una corrección explícita,
   **entonces** cambia solo ese dato.
4. **Dado** que el profesional dicta algo que el sistema no puede ubicar con
   certeza,
   **entonces** no lo pone en ningún campo y lo muestra aparte para que la
   persona decida.
5. **Dado** que se dicta una indicación con una frecuencia ("cada 4 horas"),
   **entonces** el sistema **no marca horarios por su cuenta**: qué pasa con la
   grilla depende de **[A DEFINIR] (i) y (ii)**.

### Historia 2 — Revisar y corregir antes de guardar (Prioridad: P1)

La hoja completa se ve en pantalla, igual que el papel, y se puede corregir a
mano (con teclado o con el dedo). Recién cuando el profesional confirma, se
guarda.

**Cómo se prueba solo:** se corrige un dato a mano y se confirma; lo guardado es
exactamente lo que se vio y se confirmó.

**Escenarios de aceptación:**

1. **Dado** una hoja cargada por voz,
   **cuando** el profesional cambia un dato a mano,
   **entonces** queda el dato corregido.
2. **Dado** una hoja sin confirmar,
   **entonces** no se guarda nada (la confirmación no se puede saltear).
3. **Dado** que faltan los datos mínimos (**[A DEFINIR] (vii)**),
   **entonces** el sistema avisa qué falta y no guarda.
4. **Dado** una propuesta automática de horarios (si se decide en (ii)),
   **entonces** se ve marcada como propuesta y no se guarda hasta que el
   profesional la confirme.

### Historia 3 — Ver las hojas en el dashboard (Prioridad: P2)

En la computadora, el profesional ve la lista de hojas que cargó (fecha,
habitación, paciente, doctor, diagnóstico resumido), busca por paciente o
habitación, filtra por fecha y abre una hoja completa para leerla.

**Escenarios de aceptación:**

1. **Dado** varias hojas guardadas,
   **entonces** el dashboard las lista, de la más nueva a la más vieja, con sus
   números (Total, Hoy, Esta semana, Este mes) como en el ergométrico.
2. **Dado** una búsqueda por paciente o habitación,
   **entonces** la lista muestra solo las que coinciden.
3. **Dado** que se abre una hoja,
   **entonces** se ven todas sus partes, en el orden del papel, con lo vacío
   como "—".

### Historia 4 — Lo guardado aparece en el dashboard en tiempo real (Prioridad: P2)

Si el dashboard está abierto en la computadora y se guarda una hoja desde el
celular (o se edita, o va a la Papelera), la lista se actualiza sola, sin tocar
"Actualizar".

**Escenarios de aceptación:**

1. **Dado** el dashboard abierto,
   **cuando** se guarda una hoja nueva desde el celular con el mismo usuario,
   **entonces** aparece en la lista en unos pocos segundos, sola.
2. **Dado** una ficha abierta que alguien edita desde otro lado,
   **entonces** el sistema avisa que hay una versión nueva (no cambia lo que la
   persona está mirando sin avisar).
3. **Dado** que se corta la conexión,
   **entonces** el sistema avisa y, al volver, se pone al día.

### Historia 5 — Editar una hoja guardada, con historial (Prioridad: P2)

Desde la ficha, "Editar" abre la misma hoja para corregirla. Cada edición
guarda, aparte, cómo estaba antes, quién la editó y cuándo. La pantalla muestra
solo "Última edición: día y hora" (el historial no se ve en la app).

**Escenarios de aceptación:**

1. **Dado** una hoja guardada,
   **cuando** se corrige y se guarda,
   **entonces** queda la versión nueva y el historial guarda la anterior.
2. **Dado** que otra persona o pestaña la cambió mientras tanto,
   **entonces** no se guarda y se avisa (edición cruzada), sin perder lo
   escrito.
3. **Dado** que se guarda sin cambios,
   **entonces** avisa "No hay cambios para guardar" y no registra nada.

### Historia 6 — Papelera (Prioridad: P3)

"Borrar" manda la hoja a la Papelera: no desaparece de verdad, no se ve en la
lista ni en los números, y se puede restaurar. Queda registrado quién y cuándo.

### Historia 7 — Imprimir y PDF (Prioridad: P3)

"Imprimir" y "Descargar PDF" arman la hoja en **A4 horizontal**, parecida al
papel (encabezado, indicaciones, grilla de horarios, hidratación, diuresis,
drenajes, SNG / vómitos, deposiciones y controles de enfermería). Un único PDF
para las dos cosas. No se guarda en ningún lado.

**Escenarios de aceptación:**

1. **Dado** una hoja guardada,
   **entonces** el PDF muestra todos sus datos, sin cortar ni resumir nada, y lo
   vacío en blanco.
2. **Dado** un texto que no entra en su lugar,
   **entonces** se aplica la misma regla que en el ergométrico (letra más chica
   hasta un mínimo y, si igual no entra, hoja de continuación).
3. La grilla de horarios en el PDF depende de **[A DEFINIR] (i)**.

### Historia 8 — Seguir completando desde el celular una hoja ya guardada (Prioridad: posterior al núcleo)

En el papel, la hoja se va llenando durante el día. Por eso enfermería tiene que
poder **abrir desde el celular una hoja ya guardada** y seguir dictándole (por
ejemplo, los controles de la tarde o de la noche), sin pisar lo que ya tenía. Es
**posterior al núcleo**: primero se construye lo básico (cargar, ver en el
dashboard, editar en la computadora, Papelera y PDF) y recién después esto.

**Escenarios de aceptación:**

1. **Dado** una hoja guardada a la mañana,
   **cuando** enfermería la abre desde el celular y dicta los controles de la
   tarde,
   **entonces** se suman esos datos y no se toca nada de lo anterior.
2. **Dado** que se suma algo a una hoja guardada,
   **entonces** se revisa y se confirma antes de guardar, como siempre, y queda
   en el historial cómo estaba antes, quién la cambió y cuándo.
3. **Dado** que la hoja cambió en otro lado mientras tanto,
   **entonces** no se pisa: se avisa (edición cruzada).

### Casos límite a tener en cuenta

- Se dicta algo para un turno que todavía no corresponde (por ejemplo, "turno
  noche" a la mañana): se carga lo que se dijo, sin juzgar la hora.
- Se dicta la misma indicación dos veces en grabaciones distintas: no se
  duplica sin avisar.
- Medicación con más renglones de los que trae el papel (5): **[A DEFINIR] (iv)**.
- La sesión se cierra a mitad de una carga: como hoy, se pierde lo no guardado
  (privacidad), y se avisa.
- Dos dispositivos con el mismo usuario editando la misma hoja: edición cruzada
  (Historia 5).

---

## Requisitos

### Requisitos funcionales

- **RF-001:** La app muestra **solo** el Formulario N° 5. El Estudio Ergométrico
  queda guardado y escondido detrás de un **interruptor de configuración** (no
  es un botón que vea el usuario). Sus datos y su código no se borran.
- **RF-002:** La hoja se ve y se llena con **los mismos campos, nombres y orden
  que el papel** (ver "La hoja en papel").
- **RF-003:** Se puede **dictar todo junto o por partes**. Cada grabación suma a
  lo cargado y no pisa nada, salvo una corrección explícita.
- **RF-004:** El sistema **nunca inventa**: la IA solo carga lo que se dijo
  explícitamente. Lo dudoso queda aparte para que la persona decida.
- **RF-005:** Cualquier cálculo automático (por ejemplo, horarios a partir de una
  frecuencia) lo hace el sistema con reglas fijas, nunca la IA, se muestra como
  propuesta y **se confirma antes de guardar**. Si se hace o no:
  **[A DEFINIR] (ii)**.
- **RF-006:** Revisión y corrección a mano antes de guardar, obligatoria. Se
  guarda exactamente lo que se confirmó.
- **RF-007:** Datos mínimos para guardar: **[A DEFINIR] (vii)**.
- **RF-008:** Mismos criterios de carga que el ergométrico donde apliquen
  (números con coma, sin completar nada por cuenta propia).
- **RF-009:** Dashboard: lista, números, búsqueda por paciente o habitación,
  filtro por fecha, ficha completa. Regla de visibilidad actual: cada usuario ve
  lo que cargó.
- **RF-010:** Tiempo real: la lista del dashboard se actualiza sola cuando se
  guarda, edita o manda a la Papelera una hoja del mismo usuario.
- **RF-011:** Editar con historial, como el ergométrico (quién, cuándo y cómo
  estaba antes; edición cruzada; "sin cambios"). La pantalla no menciona el
  historial.
- **RF-012:** Papelera, como el ergométrico (borrado lógico, registro de quién y
  cuándo, restaurar).
- **RF-013:** Imprimir y Descargar PDF en **A4 horizontal**, parecido al papel,
  con las mismas reglas de no cortar ni inventar, nombre de archivo propio
  (**[A DEFINIR]**: por ejemplo con fecha, habitación y paciente).
- **RF-014:** Trazabilidad: cada hoja guarda quién la cargó y cuándo, y quién la
  editó por última vez.
- **RF-015:** Grilla de horarios: **BLOQUEADA** hasta definir (i) y (ii).
- **RF-016 (opcional):** un menú con dos tarjetas (Formulario N° 5 y Estudio
  Ergométrico) para elegir la planilla. Solo si suma y casi no cuesta tiempo.
- **RF-017 (posterior al núcleo):** abrir desde el celular una hoja ya guardada y
  seguir dictándole (Historia 8). Suma sin pisar, se confirma antes de guardar y
  deja historial, como cualquier edición.
- **RF-018:** Trámite adm. (SÍ / NO) se carga como **texto controlado**: solo
  acepta "SÍ" o "NO". En pantalla no lleva casilleros (en el papel sí).

### Entidades de datos principales

- **Hoja de indicaciones (Formulario N° 5):** una por paciente y por día
  (supuesto; ver (iv)). Tiene el encabezado, las indicaciones médicas, la dieta,
  la hidratación, la diuresis por turno, drenajes, SNG / vómitos, deposiciones y
  los controles de enfermería por turno. Guarda quién la cargó y cuándo.
- **Marcas de la grilla de horarios:** qué se marca, en qué renglón y en qué
  horario. **[A DEFINIR] (i)**.
- **Cambio de una hoja (historial):** cómo estaba antes de cada edición, quién y
  cuándo.
- **Registro de la Papelera de hojas:** cada borrado y restauración, quién y
  cuándo.

---

## Criterios de éxito

- **CE-001:** Una hoja de ejemplo se carga por voz en dos o tres grabaciones y
  cada dato queda en su lugar, sin perder nada entre grabaciones.
- **CE-002:** Cero datos inventados en los dictados de prueba.
- **CE-003:** Lo guardado desde el celular aparece en el dashboard abierto sin
  tocar nada, en pocos segundos.
- **CE-004:** El PDF horizontal se parece al papel y muestra todos los datos.
- **CE-005:** El Estudio Ergométrico sigue funcionando igual si se vuelve a
  prender el interruptor (sus pruebas pasan).
- **CE-006:** Un usuario no ve las hojas de otro.

---

## Fuera de alcance de esta etapa

- Multi-rol (médico y enfermería viendo y completando la misma hoja). En la demo,
  una misma persona carga la hoja completa (ver (iii)).
- Fotos o archivos adjuntos en el Formulario N° 5 (la hoja no los tiene; si
  hicieran falta, se decide aparte).
- Cálculos o interpretaciones médicas (dosis, balances, alertas). Solo se copia
  lo que se dice.
- Uso sin conexión (como en el ergométrico, es posterior a la demo).
- Pantalla del historial de ediciones.

---

## Decisiones tomadas (por Mauro)

1. La app muestra solo el Formulario N° 5; el ergométrico queda detrás de un
   interruptor de configuración, sin borrarse ni romperse.
2. Misma app, misma base, mismo login, misma transcripción y estructuración por
   IA, mismo dashboard.
3. Visibilidad: la regla actual (cada usuario ve lo que cargó). Es una demo.
4. Dictado todo junto o por partes, sin pisar lo ya cargado.
5. Editar con historial, dashboard, Papelera, imprimir / PDF horizontal y tiempo
   real en el dashboard.
6. El menú de dos tarjetas es opcional y va al final.
7. **Completar la hoja durante el día (antes punto (v)):** SÍ. Enfermería tiene
   que poder abrir desde el celular una hoja ya guardada y seguir dictándole,
   porque en el papel la hoja se va llenando durante el día. Es **posterior al
   núcleo**: se hace después de cargar, ver en el dashboard, editar en la
   computadora, Papelera y PDF (Historia 8, RF-017).
8. **Trámite adm. (SÍ / NO):** va como **texto controlado** (solo "SÍ" o "NO"),
   no como casillero (RF-018).

---

## Lista de control (antes de aprobar la especificación)

- [x] Las historias de usuario cubren lo que necesita la demo.
- [x] No hay detalles de programación mezclados (eso va en el plan).
- [ ] Los requisitos son claros y verificables (faltan los [A DEFINIR]).
- [x] Los criterios de éxito se pueden medir.
- [ ] Los puntos pendientes fueron resueltos con el enfermero.
- [x] La especificación respeta la Constitución (v1.3.0).
