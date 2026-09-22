# Constitución del Proyecto — App de Planillas de Clínica

> Documento fundacional (Spec-Driven Development / Spec Kit).
> Ubicación sugerida en el repo: `.specify/memory/constitution.md`
>
> **Versión:** 1.2.0
> **Ratificada:** 2026-09-21
> **Última modificación:** 2026-09-21

---

## Propósito

Digitalizar las planillas de una clínica para que un profesional pueda
completarlas dictando por voz, revisarlas, corregirlas y confirmarlas antes
de guardarlas. El primer caso es la planilla de **Estudio Ergométrico** del
Servicio de Cardiología. El sistema está pensado para crecer, más adelante,
a otras planillas y otros roles.

Esta constitución define las reglas que **no se negocian**. Todo lo que
armemos después (especificación, plan, tareas y código) tiene que respetarla.
Si algo choca con este documento, manda este documento.

---

## Principios Centrales

Estos son los principios que gobiernan todas las demás decisiones. Están
ordenados: si dos principios entran en conflicto, gana el que está más arriba.

### 1. La planilla es el contrato

La planilla en papel que usa el profesional es la fuente de verdad. El sistema
la copia con fidelidad: los mismos campos, con los mismos nombres, en el mismo
orden. **No inventamos, no mejoramos ni reinterpretamos el contenido médico.**
Ninguna persona del equipo necesita entender la medicina detrás de la planilla;
solo necesita reproducirla con exactitud. Cualquier cambio en el significado de
un campo se consulta con el profesional, no se decide por cuenta propia.

### 2. El profesional siempre tiene la última palabra

El sistema **propone**, el profesional **dispone**. Ningún dato se guarda de
forma definitiva sin que una persona lo haya revisado y confirmado en pantalla.
La voz y el LLM son ayudas para llenar más rápido, nunca un reemplazo del
criterio humano. La pantalla de revisión previa a guardar es obligatoria y no
se puede saltear.

### 3. Nunca inventar datos

En salud, un dato inventado es peor que un casillero vacío. Si un dato no fue
dictado, queda vacío. El LLM tiene prohibido rellenar, suponer o completar por
contexto. Si el sistema no sabe con certeza dónde va un dato, lo deja aparte
para que la persona lo ubique a mano, en lugar de arriesgar una ubicación
equivocada.

### 4. Simplicidad entendible

El código y la arquitectura tienen que poder ser entendidos y mantenidos por
una persona en formación, apoyada por IA. Se prefiere siempre la solución más
simple que funcione sobre la más elegante o la más avanzada. Nada de
tecnología agregada "por las dudas" o "por si algún día". Si una pieza no se
puede explicar en criollo, es demasiado compleja para este proyecto.

### 5. Privacidad del paciente por diseño

Se manejan datos de salud, que son sensibles. La seguridad no es un agregado
del final: está desde la primera línea. Los datos viajan cifrados, el acceso
se controla por reglas en la base, y las imágenes se guardan en un espacio
privado. Nadie ve datos que no le corresponden.

### 6. Bajo costo y sin ataduras caras

El sistema tiene que poder sostenerse económicamente. Se eligen herramientas
con un plan gratuito o barato que alcance para la demo y las primeras clínicas.
Se evita depender de infraestructura de pago mensual alto que no se pueda
sostener (lección aprendida). Antes de sumar un servicio pago, se evalúa el
costo real y quién lo paga.

### 7. Trazabilidad

Cada planilla guardada deja registro de quién la cargó y cuándo. En salud, y
para la confianza del cliente, tiene que poder saberse el origen de cada
estudio.

---

## Estándares Tecnológicos

- **Frontend:** HTML, CSS y JavaScript sin frameworks (vanilla), servido como
  PWA (aplicación web instalable). Se puede usar una librería de estilos
  liviana (por ejemplo Tailwind) si simplifica, no si complica.
- **Publicación:** la PWA se publica en Vercel (plan gratuito). No se usa
  Railway.
- **Entorno de desarrollo:** la programación se hace en VSCode con Claude Code.
- **Control de versiones y respaldo:** todo el código se guarda y versiona en
  GitHub. Sirve de respaldo (si se pierde la computadora, el proyecto está a
  salvo) y de historial (permite volver a una versión anterior que funcionaba).
  GitHub se conecta con Vercel para que cada cambio subido se publique
  automáticamente.
- **Una sola app, dos vistas:** es una única aplicación web, con la misma
  dirección, que se adapta según el dispositivo. En el celular muestra la vista
  de **carga** del estudio (dictado por voz, fotos, revisión). En la
  computadora muestra la vista de **dashboard/consulta** de los estudios
  cargados. No son dos programas: es la misma app que se ve distinta según quién
  entra y desde dónde.
- **Compatibilidad:** la PWA debe funcionar correctamente tanto en Android como
  en iPhone (iOS). Se contempla desde el inicio que iOS es más restrictivo con
  las PWA (permisos de micrófono, instalación, notificaciones) y se prueba en
  ambos.
- **Backend y datos:** Supabase como plataforma única —base de datos
  (PostgreSQL), autenticación, almacenamiento de imágenes (Storage) y funciones
  de servidor (Edge Functions).
- **Claves secretas (API keys):** nunca viven en el celular ni en el código del
  navegador. Toda llamada a servicios de IA pasa por una Edge Function que
  guarda la clave del lado del servidor.
- **Voz a texto:** servicio de transcripción (Whisper o equivalente), llamado
  siempre desde el servidor, nunca directo desde el cliente.
- **Estructuración de datos:** un único modelo de LLM para todo el sistema. Lo
  que cambia por cada planilla es su *instructivo (prompt)* y su *esquema de
  datos (JSON)*, no el modelo. Sumar una planilla nueva es escribir una
  configuración, no desplegar un modelo nuevo.
- **Migración futura:** si el panel de visualización crece mucho, se podrá
  evaluar mover esa parte a un framework (por ejemplo Next.js). Si la clínica
  pide llevar la app a las tiendas (Play Store / App Store), se podrá empaquetar
  la misma app web con Capacitor (de Ionic). Ninguna de las dos es necesaria
  para la demo, y no se adoptan antes de necesitarlas.

## Requisitos de Seguridad

- **En tránsito:** toda la comunicación viaja sobre HTTPS/TLS (lo provee
  Supabase). No se transmite ningún dato de paciente sin cifrar.
- **Control de acceso:** se usa Row Level Security (reglas a nivel de base de
  datos) para que cada usuario vea únicamente lo que le corresponde según su
  rol.
- **Imágenes:** electrocardiogramas, fotos y archivos van a un espacio privado.
  Se acceden mediante enlaces firmados que caducan, nunca por URL pública.
- **Autenticación:** ingreso con login obligatorio. El método concreto
  (usuario/contraseña dado de alta por un administrador, u OAuth) se define en
  la especificación; para un entorno cerrado como una clínica se prioriza el
  alta controlada por administrador.
- **Secretos:** ninguna clave de API, token o credencial queda expuesta en el
  frontend ni en el repositorio.
- **Mínimo dato:** se guarda solo la información que la planilla requiere, nada
  de más.

## Rendimiento y Escalabilidad

- La app tiene que funcionar con fluidez en un celular común, incluso con
  conexión intermitente (es una PWA).
- La carga de una planilla y su guardado deben sentirse rápidos; las
  operaciones lentas (transcripción, LLM) muestran indicación de progreso.
- La arquitectura debe permitir sumar **nuevas planillas** y **nuevos roles**
  sin rehacer lo existente: planillas como configuración, roles como reglas de
  acceso.
- La demo se enfoca en **un** flujo (un profesional cargando el estudio
  ergométrico). La escala a multi-rol y multi-clínica es un objetivo posterior,
  pero ninguna decisión de hoy debe cerrarle la puerta.

## Estándares de Código

- Código claro por encima de código ingenioso. Nombres de variables y funciones
  en un lenguaje entendible.
- Comentarios en español que expliquen el *para qué*, pensados para que una
  persona en formación pueda releerlos y entenderlos.
- Archivos y funciones cortos, con una sola responsabilidad.
- La lógica de cada planilla (su instructivo y su esquema) vive separada y
  ordenada, para poder sumar planillas sin tocar el resto.
- Nada de dependencias innecesarias. Cada librería que se agrega tiene que
  justificarse.

## Cumplimiento y Gobernanza de Datos

- Los datos son de la clínica y del paciente, no del desarrollador. Se tratan
  con ese respeto.
- Se lleva registro de quién carga y modifica cada planilla (trazabilidad).
- Antes de una puesta en producción real (más allá de la demo), se revisa el
  cumplimiento de la normativa de datos de salud vigente que aplique a la
  clínica.
- Los datos de prueba de la demo no usan información real de pacientes salvo
  autorización expresa.

## Políticas de Testing

- **Prioridad número uno:** probar que el sistema **nunca inventa datos** y que
  ubica cada dato dictado en el campo correcto. Este es el comportamiento que,
  si falla, arruina la confianza del cliente.
- Se prueba el ciclo completo con dictados de ejemplo: dictar → transcribir →
  estructurar → revisar → corregir → confirmar → guardar.
- Se prueba que las correcciones por voz modifican el dato correcto y no
  duplican.
- Se prueba el control de acceso: que un usuario no pueda ver datos de otro.
- No se exige cobertura exhaustiva de test automáticos para la demo, pero sí
  una lista de casos revisados a mano antes de mostrarla al cliente.

## Fuera de Alcance (lo que NO queremos)

- **No** hacemos cálculos ni interpretaciones médicas por cuenta propia (por
  ejemplo, calcular la frecuencia cardíaca teórica). Si el profesional lo pide y
  confirma la fórmula, se evalúa más adelante.
- **No** usamos infraestructura de pago mensual alto.
- **No** empaquetamos la app como aplicación nativa (Capacitor / Play Store /
  App Store) en la demo: la PWA alcanza. Queda como opción para después.
- **No** construimos multi-rol, multi-clínica ni múltiples planillas en la demo:
  se diseña para permitirlo, no se implementa todavía.
- **No** agregamos funciones "porque estaría bueno". Cada función responde a una
  necesidad real de la planilla o del flujo del profesional.
- **No** guardamos nada sin confirmación humana.
- **No** exponemos claves ni datos sensibles en el cliente.

---

## Gobernanza

- Esta constitución está por encima de la especificación, el plan, las tareas y
  el código. Ante una contradicción, manda la constitución.
- Se puede modificar, pero cada cambio se registra subiendo el número de versión
  y anotando la fecha de modificación arriba.
- Versionado: **MAYOR** para cambios de fondo en los principios; **MENOR** para
  agregar principios o secciones; **PARCHE** para aclaraciones y correcciones de
  redacción.
- Cuando este documento cambie, se revisa que la especificación y el plan sigan
  siendo coherentes con él.

**Versión:** 1.2.0 | **Ratificada:** 2026-09-21 | **Última modificación:** 2026-09-21
