// Cálculo de las cruces de la grilla de horarios (Formulario N° 5), con REGLAS FIJAS:
// la IA nunca marca cruces (RF-005). Recibe lo que se dictó de UN renglón y devuelve
// qué casillas marcar, la nota "Mañana sigue a las", qué columnas se calcularon
// (para mostrarlas de otro color, como propuesta que la persona revisa) y los avisos.
//
// Usa las reglas de las horas de js/grilla.js (GRILLA, minutosDeHora,
// lugarDeLaHora): se carga después de ese archivo. No toca la pantalla.
//
// Entrada (todo en hora de 24 horas):
//   cada:      cada cuántas horas (un número), o nada
//   desde:     la hora de inicio ("8", "7:30"), o nada
//   horas:     las horas dichas una por una (["8", "14", "20"]), o nada
//   ambigua:   true si alguna hora de 1 a 12 se dijo sin "de la mañana / de la tarde /
//              de la noche"
//   ilegible:  true si el horario dictado no se pudo leer con seguridad (lo decide
//              "estructurar" con reglas fijas)
//   ahora:     la hora del reloj ("16:15", hora argentina, la del servidor): de ahí
//              se arranca un "cada N horas" dictado sin hora de inicio
// Salida:
//   casillas:   { "6": "X", "8": "7:30", ... } (lo que va en cada columna)
//   sigue:      "02:00" (la próxima toma del día siguiente) o null
//   calculadas: las columnas que salieron de "cada N horas"
//   avisos:     lo que la persona tiene que saber, en castellano
//   aMano:      null, o el caso en que no se marca nada y se marca a mano (abajo)
//
// Reglas (decididas por Mauro):
//   - Hora justa en la columna (6, 8, ..., 24): "X". Hora real (7 o 7:30): esa hora
//     escrita en la columna de la hora par siguiente (más de dos horas antes y sin
//     incluirla).
//   - "Cada N horas desde H": H, H+N, H+2N... mientras no pase de las 24. Lo que pasa
//     de las 24 no se marca: la nota "Mañana sigue a las" lleva la próxima toma del
//     día siguiente. Con horas sueltas no hay nota.
//   - "Cada N horas" SIN hora de inicio: se arranca de la hora del reloj, redondeada
//     hacia adelante a la próxima media hora (4:15 es 4:30; 16:15 es 16:30; 16:00 y
//     16:30 quedan igual), y se avisa. Sin la hora del reloj, no se marca nada.
//   - Dos tomas en la misma casilla: no se marca nada del renglón.
//   - Horas de 0:00 a 4:00: no tienen columna; se avisa y no se ponen.
//   - Hora de 1 a 12 sin aclarar: no se marca nada; hay que preguntar.
//   - Casos en que no se marca nada y se avisa "marcá las cruces a mano" (aMano):
//       · 'frecuencia-y-horas-sueltas': se dijeron "cada N horas" y horas sueltas;
//       · 'desde-sin-frecuencia': "desde las 8", sin decir cada cuánto;
//       · 'hora-que-no-se-entiende': una hora que no es una hora, o un horario que
//         "estructurar" no pudo leer con seguridad;
//       · 'frecuencia-rara': cada 0, negativo, con decimales ("cada 1,5") o más de 24;
//       · 'arranca-sin-columna': arranca de 0:00 a 4:00 ("cada 4 horas desde las 2").

const GrillaCalculo = (() => {
  const UN_DIA = 24 * 60;
  const MEDIA_HORA = 30;

  // Minutos -> como se escribe en la casilla: 540 -> "9"; 450 -> "7:30"
  const horaEnCasilla = (minutos) => (minutos % 60 === 0
    ? String(minutos / 60)
    : `${Math.floor(minutos / 60)}:${String(minutos % 60).padStart(2, '0')}`);

  // Minutos -> la nota "Mañana sigue a las": 120 -> "02:00"
  const horaDeSigue = (minutos) => `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;

  // "2:00", para los avisos
  const horaDelAviso = (minutos) => `${Math.floor(minutos / 60)}:${String(minutos % 60).padStart(2, '0')}`;

  const nada = (avisos, aMano = null) => ({ casillas: {}, sigue: null, calculadas: [], avisos, aMano });
  const marcarAMano = 'marcá las cruces a mano.';

  // Pone cada toma en su casilla. Si dos caen en la misma, no se marca nada del renglón
  function ponerTomas(tomas) {
    const casillas = {};
    for (const { minutos, texto } of tomas) {
      const lugar = lugarDeLaHora(minutos, texto);
      const columna = String(lugar.columna);
      if (Object.hasOwn(casillas, columna)) return null;
      casillas[columna] = lugar.valor;
    }
    return casillas;
  }

  function calcularRenglon({ cada = null, desde = null, horas = null, ambigua = false, ilegible = false, ahora = null } = {}) {
    const hayCada = cada !== null && cada !== undefined;
    const hayDesde = desde !== null && desde !== undefined && String(desde).trim() !== '';
    const hayHoras = Array.isArray(horas) && horas.length > 0;

    // El horario dictado no se pudo leer con seguridad
    if (ilegible) return nada(['No se pudo leer bien el horario dictado: ' + marcarAMano], 'hora-que-no-se-entiende');

    if (!hayCada && !hayDesde && !hayHoras) return nada([]);   // no se dictó ningún horario

    // Hora de 1 a 12 sin aclarar: no se sabe si es de mañana o de noche
    if (ambigua) {
      return nada(['Se dijo una hora de 1 a 12 sin "de la mañana", "de la tarde" o "de la noche": preguntá cuál es y ' + marcarAMano]);
    }

    // Frecuencia y horas sueltas a la vez, o "desde" sin frecuencia
    if (hayHoras && (hayCada || hayDesde)) {
      return nada(['Se dijeron una frecuencia y horas sueltas a la vez: ' + marcarAMano], 'frecuencia-y-horas-sueltas');
    }
    if (hayDesde && !hayCada) {
      return nada(['Se dijo desde qué hora, pero no cada cuántas horas: ' + marcarAMano], 'desde-sin-frecuencia');
    }

    // --- Horas sueltas: "a las 8, 14 y 20" ---
    if (hayHoras) {
      const avisos = [];
      const tomas = [];
      for (const texto of horas) {
        const minutos = minutosDeHora(texto);
        if (minutos === null) {
          return nada([`La hora "${texto}" no se entiende: ` + marcarAMano], 'hora-que-no-se-entiende');
        }
        if (minutos <= GRILLA.sinColumnaHasta) {
          avisos.push(`Las ${horaDelAviso(minutos)} no tienen columna en la grilla: no se pone.`);
          continue;
        }
        tomas.push({ minutos, texto: horaEscrita(texto) });
      }
      const casillas = ponerTomas(tomas);
      if (casillas === null) return nada(['Dos horas caen en la misma casilla: no entra en la grilla, marcala a mano.']);
      return { casillas, sigue: null, calculadas: [], avisos, aMano: null };
    }

    // --- "Cada N horas" (desde una hora dicha, o desde la hora del reloj) ---
    if (!Number.isInteger(cada) || cada < 1 || cada > 24) {
      return nada([`"Cada ${cada} horas" no se puede calcular: ` + marcarAMano], 'frecuencia-rara');
    }
    const avisos = [];
    let inicio;
    if (hayDesde) {
      inicio = minutosDeHora(desde);
      if (inicio === null) {
        return nada([`La hora "${desde}" no se entiende: ` + marcarAMano], 'hora-que-no-se-entiende');
      }
    } else {
      // Sin hora de inicio: la del reloj, redondeada hacia adelante a la próxima media hora
      const reloj = ahora === null || ahora === undefined ? null : minutosDeHora(ahora);
      if (reloj === null) return nada(['Falta desde qué hora: ' + marcarAMano]);
      inicio = Math.ceil(reloj / MEDIA_HORA) * MEDIA_HORA;
      avisos.push(`No se dijo desde qué hora: se arrancó de la hora actual, ${horaDelAviso(inicio)}.`);
    }
    // Arranca de 0:00 a 4:00: esa toma no tiene columna (por ejemplo, "cada 4 horas
    // desde las 2")
    if (inicio <= GRILLA.sinColumnaHasta) {
      return nada([`Arranca a las ${horaDelAviso(inicio)}, que no tiene columna en la grilla: ` + marcarAMano], 'arranca-sin-columna');
    }
    const tomas = [];
    let minutos = inicio;
    for (; minutos <= UN_DIA; minutos += cada * 60) tomas.push({ minutos, texto: horaEnCasilla(minutos) });
    const casillas = ponerTomas(tomas);
    if (casillas === null) return nada(['Dos tomas caen en la misma casilla: no entra en la grilla, marcala a mano.']);
    // La próxima toma, que ya es del día siguiente
    return { casillas, sigue: horaDeSigue(minutos - UN_DIA), calculadas: Object.keys(casillas).map(Number), avisos, aMano: null };
  }

  return { calcularRenglon };
})();
