# Guía Visual — Proyecto Clínica

> Ubicación en el repo: `specs/001-estudio-ergometrico/guia-visual.md`
> Fecha: 2026-09-23 · Versión 1.0
>
> Esta guía dice **cómo se ve** la app. Todas las pantallas la siguen.
> No cambia nada de la constitución, la spec ni el plan: los complementa.

---

## 1. La idea en una frase

La estructura y los componentes de **LoMar Smart** (ya probados en celular y por
usuarios reales), vestidos con la marca del **Sanatorio de la Cañada**, con
modo claro y oscuro.

- De **LoMar** se toma: componentes, movimiento, sombras, legibilidad, y la
  técnica del vidrio liviano.
- De la **marca delacañada** se toma: logo, colores.
- De **Dribbble** se toma: la paleta en claro, la barra inferior tipo píldora y
  el estilo de tarjetas para el dashboard de computadora.
- **No** se toma de LoMar: el naranja y el azul (son la marca de LoMar).

---

## 2. Marca y logos

**Nombre que se muestra:** "delacañada" · "Sanatorio Privado - Río Tercero".
(La Clínica Privada Modelo fue comprada por el Sanatorio de la Cañada.)

**Archivos** (en `assets/logos/`, exportados desde Corel en RGB, PNG con fondo
transparente de 1000 px de ancho o más, o SVG):

| Archivo | Qué es | Dónde se usa |
|---|---|---|
| `logo-completo.png` / `.svg` | C+ + "delacañada" + "Sanatorio Privado - Río Tercero" | Splash, login, encabezado del dashboard, PDF |
| `logo-completo-claro.png` / `.svg` | Igual, con el gris pasado a blanco (cruz en verde) | Los mismos lugares, en modo oscuro |
| `isologo.png` / `.svg` | Solo la C con la cruz | Ícono de la app (reemplaza los provisorios), favicon, encabezado compacto del celular |
| `isologo-claro.png` / `.svg` | Isologo con el gris en blanco | Encabezado compacto en modo oscuro |

El logo usa la tipografía **AvantGarde Bk BT**. En los SVG los textos van
convertidos a curvas y el lienzo recortado al logo (sin hoja A4 alrededor).
Para los íconos de la app hay además un `isologo.png` de 1024×1024 px con fondo
blanco. Al generar los íconos se le agrega margen (el isologo llega casi al
borde y Android recorta las puntas).

**Recorte de lienzo (resuelto en la T046):** los 4 SVG traían un rectángulo-marco
que se coló al exportar (sin relleno y con borde blanco: en modo oscuro se veía
como un recuadro) y espacio vacío arriba y abajo. Se aplicó a los 4 logos: se
borró el marco y se ajustó el lienzo al dibujo real, sin tocar formas ni
colores. Cada par (normal y claro) tiene el mismo lienzo, así el logo no se
corre al cambiar de modo.

**Reglas:**
- El logo va siempre como imagen: nunca se reescribe con texto.
- No se deforma, no se recolorea (salvo la versión clara), no se le agregan
  sombras ni efectos.
- Dejar aire alrededor: como mínimo, el alto de la cruz de cada lado.
- En modo oscuro, siempre la versión clara (el gris sobre fondo oscuro no se lee).
- Íconos de la app: se generan desde `isologo.png`, en PNG (no WebP), centrado,
  con margen (el isologo ocupando ~70% del ancho), sobre fondo blanco
  (Android 192/512, iPhone 180).

---

## 3. Colores

Colores tomados del archivo vectorial del logo, de la web de la clínica y de la
paleta de referencia de Dribbble.

### Base de la marca

| Nombre | Hex | Origen | Uso |
|---|---|---|---|
| Verde marca | `#00AB96` | Cruz del logo (archivo vectorial oficial) | Color principal: botón principal, micrófono, elementos activos, barritas de sección |
| Verde profundo | `#1A8D6B` | Web de la clínica | Hover/presionado, fondos de destaque |
| Gris logo | `#727271` | Logo | Detalles, bordes, íconos inactivos |
| Marino | `#181E42` | Web (botón "Portal de pacientes") | Secundario, con moderación |
| Celeste | `#5BA7DB` | Web (botón "Turnos hoy") | Avisos informativos, chips secundarios |
| Menta claro | `#E7F2F1` | Dribbble | Fondo del modo claro |
| Gris texto | `#5B5B5B` | Dribbble | Texto secundario |
| Casi negro | `#040707` | Dribbble | Texto principal en claro, base del fondo oscuro |
| Rojo error | `#D93F3F` | — | Errores, micrófono grabando |

El éxito se muestra con el verde de marca (no con otro verde).

### Modo claro

| Token | Valor |
|---|---|
| Fondo | `#E7F2F1` |
| Tarjeta | `#FFFFFF`, sombra suave `0 8px 24px rgba(4,7,7,0.08)` |
| Campo | `#FFFFFF` con borde `#D5E3E1`; al enfocar, anillo verde marca |
| Texto principal | `#040707` |
| Texto secundario | `#5B5B5B` |
| Acento | `#00AB96` |

### Modo oscuro (la receta de LoMar con otra noche)

| Token | Valor |
|---|---|
| Fondo | Degradado 160°: `#0B2E2A` → `#071A18` (55%) → `#040707` |
| Tarjeta (vidrio) | `rgba(255,255,255,0.12)`, borde `rgba(255,255,255,0.18)`, sombra `0 12px 30px rgba(0,0,0,0.30)` |
| Campo | `rgba(255,255,255,0.96)` con texto `#040707` (igual que LoMar: donde se lee y escribe, claro) |
| Texto sobre fondo | `rgba(255,255,255,0.94)`; secundario `rgba(255,255,255,0.72)` |
| Acento | `#12B8A0` (el verde un poco más luminoso para que resalte) |

**Regla técnica:** todos los colores se definen como variables CSS (tokens) en
un solo lugar. Ningún color se escribe "a mano" en un componente. Así el modo
claro/oscuro es cambiar la paleta, no repasar pantallas.

---

## 4. Claro / oscuro

- Por defecto, la app sigue la configuración del dispositivo.
- Un botón permite elegir a mano (claro / oscuro / automático); la elección se
  recuerda en ese dispositivo.
- El logo cambia a su versión clara en modo oscuro.
- **El PDF y la impresión van siempre en claro** (van al papel).

---

## 5. Tipografía

- **Albert Sans** (Google Fonts, gratis), pesos 400, 500, 600 y 700. Reemplaza a
  Inter y Space Grotesk de LoMar. Es geométrica, de la misma familia que el logo.
- Títulos de sección: mayúsculas, peso 600, espaciado de letras amplio (como LoMar).
- **Texto de los campos: peso 500** — corrección de la nota de LoMar ("a las
  letras les falta cuerpo, no se leen como en WhatsApp").
- Tamaño mínimo de los campos: **16 px** (si es menor, el iPhone hace zoom al
  tocarlos).
- Números de la tabla de etapas con cifras de ancho parejo (`tabular-nums`),
  para que las columnas queden alineadas.

---

## 6. Forma y profundidad

| Elemento | Radio | Sombra |
|---|---|---|
| Tarjetas | 16 px | Según el modo (ver colores) |
| Campos | 12 px | `0 2px 8px rgba(0,0,0,0.08)` |
| Botón principal | 12 px | Resplandor del color: `0 8px 22px` del verde al 35% |
| Carteles (modales) | 20 px | `0 20px 60px rgba(0,0,0,0.30)` |
| Barra inferior | Píldora completa | `0 10px 28px rgba(0,0,0,0.25)` |

**Vidrio liviano (lección de LoMar):** las tarjetas **no** llevan
`backdrop-filter` (el desenfoque hace tironear el scroll en Android de gama
media). El efecto vidrio sale de la transparencia. El encabezado fijo va casi
opaco (92%) y sin desenfoque, como en LoMar. El desenfoque queda solo detrás de
los carteles.

---

## 7. Componentes (heredados de LoMar, con la nueva paleta)

- **Tarjeta de sección** con barrita vertical de color a la izquierda del título.
  Secciones = las de la planilla: Paciente, Estudio, ECG basal, Conclusión,
  Reposo y esfuerzo, Interrupción y postesfuerzo, Imágenes (el orden es el de
  la planilla en papel, porque la constitución manda; Imágenes no está en el
  papel: es un agregado de la app).
- **Campos** en grilla de dos columnas en el celular cuando entran (como la
  ficha de LoMar); texto largo (antecedentes, conclusión) a lo ancho.
- **Tarjeta de etapa**: igual que la tarjeta "Control" de signos vitales de
  LoMar. Una por etapa, con Tiempo y Carga destacados arriba y MET, T.A., F.C.,
  ECG y Clínica en grilla.
- **"+ Agregar etapa"**: botón con borde punteado (como "+ Agregar control").
  Quitar etapa: ícono de tacho en la tarjeta.
- **Toggles** y **chips** como en LoMar, si algún campo los necesita.
- **Barra inferior de voz** (referencia: menú de Dribbble): píldora flotante
  con clip (adjuntar imágenes), cámara, onda de audio y **micrófono
  protagonista** (más grande, verde marca; rojo mientras graba). Las miniaturas
  de las fotos adjuntas flotan arriba de la barra, con su ✕, como en LoMar.
- **Carteles** (como LoMar): "¿Confirmar estudio?", "Estudio guardado — N° X",
  y error con "Reintentar". Tarjeta blanca, fondo desenfocado, ícono circular
  (check en verde marca, error en rojo).
- **Avisos cortos (toast)** para mensajes breves.
- **Dato no ubicable** (RF-010): aviso visible cerca del campo que hay que
  completar a mano, en celeste, sin alarmar.

---

## 8. Movimiento

- Una sola curva para toda la interfaz: `cubic-bezier(0.4, 0, 0.2, 1)`
  ("arranca decidida, frena suave").
- **Splash** (igual que LoMar): el logo sube y crece desde abajo con un halo
  claro difuminado detrás (~1,5 s), sobre el fondo del modo activo.
- Login entra con un fundido suave; los carteles aparecen con un pequeño "pop".
- Si el dispositivo pide "reducir movimiento", se desactivan las animaciones.

---

## 9. Celular y computadora

- **Celular = vista de carga:** una columna, secciones apiladas, barra de voz
  fija abajo, encabezado compacto con isologo.
- **Computadora = dashboard:** encabezado con logo completo; listado de estudios
  en tarjetas o filas (paciente, fecha); al abrir un estudio, sus datos
  ordenados como la planilla, con las imágenes y los botones Editar / Imprimir.
  Estilo de tarjetas de referencia: capturas de Dribbble (tarjetas blancas,
  bordes redondeados, el activo en verde).

---

## 10. Impresión y PDF

- Hoja **A4 vertical, una sola página** (RF-022).
- Copia la planilla: `specs/001-estudio-ergometrico/assets/planilla-delacanada.jpg`
  (encabezado, marca de agua, campos, tabla, pie).
- Siempre en claro, sin los estilos de la app (sin vidrio, sin sombras).

---

## 11. Referencias

En `specs/001-estudio-ergometrico/assets/referencias-diseno/`:

- `lomar/` — capturas de LoMar: splash, login, ficha, tarjetas de control,
  barra de voz, carteles. **Referencia principal** de componentes y comportamiento.
- `dribbble/` — app médica verde y su paleta: tomar la barra inferior, el modo
  claro y las tarjetas del dashboard.

---

## 12. Lo que NO

- No usar el naranja ni el azul de LoMar.
- No poner desenfoque en las tarjetas.
- No sumar otras tipografías.
- No escribir colores sueltos fuera de los tokens.
- No usar el logo en versión gris sobre fondo oscuro.
