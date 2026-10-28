// La planilla activa (T002 del Formulario N° 5): la que muestra la app, según el
// interruptor PLANILLA_ACTIVA de js/config.js. El resto de la app usa PLANILLA, así
// no queda atada a una planilla en particular.
//
// Va después de los archivos de cada planilla (js/planillas/<planilla>.js) y antes
// de los que la usan (js/formulario.js, js/carga.js…): js/carga.js dibuja la
// planilla apenas se carga.

// Las planillas que tiene la app (sumar una = sumar una línea acá)
const PLANILLAS = {
  ergometrico: PLANILLA_ERGOMETRICO,
};

// Si el interruptor dice una planilla que no existe, se avisa claro (no se elige
// otra en silencio)
if (!Object.hasOwn(PLANILLAS, PLANILLA_ACTIVA)) {
  throw new Error(`PLANILLA_ACTIVA = '${PLANILLA_ACTIVA}' no es una planilla de la app (revisá js/config.js)`);
}

const PLANILLA = PLANILLAS[PLANILLA_ACTIVA];

// Un texto de pantalla de la planilla activa, con sus datos puestos. Los textos
// están en la planilla (PLANILLA.textos) con huecos entre llaves:
//   'Estudio guardado — N° {numero}'  +  { numero: 3 }  ->  'Estudio guardado — N° 3'
function textoDePlanilla(clave, datos = {}) {
  if (!Object.hasOwn(PLANILLA.textos, clave)) {
    throw new Error(`La planilla '${PLANILLA.id}' no tiene el texto '${clave}'`);
  }
  return PLANILLA.textos[clave].replace(/\{(\w+)\}/g, (_, nombre) => String(datos[nombre] ?? ''));
}
