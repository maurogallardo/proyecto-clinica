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
   **cuando** el profesional elige una o varias imágenes/archivos ya guardados
   en su celular,
   **entonces** todos quedan adjuntos a ese estudio.

3. **Dado** un estudio guardado con imágenes,
   **cuando** alguien autorizado lo consulta,
   **entonces** puede ver esas imágenes (en celular y en computadora), y nadie
   sin autorización puede accederlas.

### Historia 3 — Consultar, imprimir y editar los estudios (dashboard) (Prioridad: P3)

Desde una computadora, una persona autorizada ve el listado de estudios
cargados, abre uno para ver todos sus datos e imágenes, lo puede editar, y lo
puede imprimir o exportar a PDF con el mismo aspecto que la planilla original en
papel.

**Por qué es P3:** cierra el círculo y es lo que se muestra "en la pantalla
grande", pero depende de que primero existan estudios cargados (P1).

**Cómo se prueba solo:** con estudios ya guardados, se abre el dashboard y se
verifica que aparecen en el listado, se pueden abrir completos, editar, e
imprimir/exportar con el formato de la planilla original.

**Escenarios de aceptación:**

1. **Dado** que hay estudios guardados,
   **cuando** la persona autorizada abre el dashboard en la computadora,
   **entonces** ve el listado de estudios con datos básicos para identificarlos
   (paciente, fecha).

2. **Dado** el listado,
   **cuando** abre un estudio,
   **entonces** ve todos los campos cargados y las imágenes adjuntas.

3. **Dado** un estudio abierto,
   **cuando** el profesional lo edita y guarda los cambios,
   **entonces** el estudio queda actualizado.

4. **Dado** un estudio abierto,
   **cuando** elige imprimir o exportar a PDF,
   **entonces** se genera una salida con el mismo aspecto que la planilla
   original en papel (Servicio de Cardiología — Estudio Ergométrico).

### Casos límite a tener en cuenta

- El profesional dicta algo que no se entiende o la transcripción sale mal.
- El profesional dicta datos de un campo que la planilla no tiene.
- Se corta la conexión a internet en medio de la carga.
- El micrófono no tiene permiso (frecuente en iPhone).
- El profesional dicta varias veces sobre el mismo estudio (la carga se arma en
  varias tandas de voz, no en una sola).
- Se intenta guardar un estudio casi vacío (permitido, salvo los datos mínimos).
- La prueba tiene más o menos etapas que las cuatro habituales.
- Dos personas abren el dashboard al mismo tiempo.

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
  (foto) y archivos ya existentes en el dispositivo.
- **RF-015:** El sistema debe guardar el estudio confirmado de forma persistente
  y asociarle sus imágenes.
- **RF-016:** El sistema debe registrar quién cargó cada estudio y la fecha/hora
  de **carga** (automática, para trazabilidad). Además, la **fecha de la prueba**
  (campo FECHA de la planilla) la puede dictar o corregir el profesional, porque
  un estudio puede cargarse después de realizado.
- **RF-017:** El sistema debe ofrecer una vista de dashboard (pensada para
  computadora) que liste los estudios guardados y permita abrir cada uno
  completo.
- **RF-018:** El sistema debe adaptar su interfaz al dispositivo: vista de carga
  en el celular, vista de dashboard en la computadora.
- **RF-019:** El sistema debe restringir el acceso a los datos e imágenes según
  la autorización de cada usuario. (Si distintos usuarios de un mismo servicio
  comparten estudios se define al escalar; en la demo hay un solo usuario.)
- **RF-020:** El sistema debe funcionar en Android y en iPhone (iOS).
- **RF-021:** El sistema debe permitir **editar** y **consultar** un estudio ya
  guardado.
- **RF-022:** El sistema debe permitir **imprimir** y **exportar a PDF** un
  estudio. La salida (al menos en computadora) debe verse **igual que la planilla
  original en papel** del Servicio de Cardiología.
- **RF-023:** Los **datos mínimos** para poder guardar un estudio son los datos
  del paciente. La planilla no necesita estar completa para guardarse.
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
  alta a los usuarios. Multi-rol es posterior.

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
- **CE-008:** La impresión/exportación a PDF se ve igual que la planilla original
  en papel.
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

---

## Lista de control (antes de aprobar la especificación)

- [x] Las historias de usuario cubren lo que necesita la demo.
- [x] No hay detalles de programación mezclados (eso va en el plan).
- [x] Los requisitos son claros y verificables.
- [x] Los criterios de éxito se pueden medir.
- [x] Los puntos pendientes fueron resueltos en clarify.
- [x] La especificación respeta la Constitución.
