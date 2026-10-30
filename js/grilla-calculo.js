// Cálculo de las cruces de la grilla de horarios (Formulario N° 5), con REGLAS FIJAS:
// la IA nunca marca cruces (RF-005). Recibe lo que se dictó de UN renglón y devuelve
// qué casillas marcar, la nota "sigue al día siguiente", qué columnas se calcularon
// (para mostrarlas de otro color, como propuesta que la persona revisa) y los avisos.
//
// Usa las reglas de las horas de js/grilla.js (GRILLA, minutosDeHora,
// lugarDeLaHora): se carga después de ese archivo. No toca la pantalla.
//
// Entrada (todo en hora de 24 horas):
//   cada:    cada cuántas horas (un número), o nada
//   desde:   la hora de inicio ("8", "7:30"), o nada
//   horas:   las horas dichas una por una (["8", "14", "20"]), o nada
//   ambigua: true si alguna hora de 1 a 12 se dijo sin "de la mañana / de la tarde /
//            de la noche"
// Salida:
//   casillas:   { "6": "X", "8": "7:30", ... } (lo que va en cada columna)
//   sigue:      "02:00" (la próxima toma del día siguiente) o null
//   calculadas: las columnas que salieron de "cada N horas desde H"
//   avisos:     lo que la persona tiene que saber, en castellano
//   aDefinir:   null, o el caso que todavía no decidió Mauro (entonces no se marca nada)
//
// Reglas (decididas por Mauro):
//   - Hora justa en la columna (6, 8, ..., 24): "X". Hora real (7 o 7:30): esa hora
//     escrita en la columna de la hora par siguiente (más de dos horas antes y sin
//     incluirla).
//   - "Cada N horas desde H": H, H+N, H+2N... mientras no pase de las 24. Lo que pasa
//     de las 24 no se marca: la nota "sigue" lleva la próxima toma del día siguiente.
//     Con horas sueltas no hay nota "sigue".
//   - Sin "desde": no se marca nada (nunca se asume las 6).
//   - Dos tomas en la misma casilla: no se marca nada del renglón.
//   - Horas de 0:00 a 4:00: no tienen columna; se avisa y no se ponen.
//   - Hora de 1 a 12 sin aclarar: no se marca nada; hay que preguntar.

const GrillaCalculo = (() => {
  const UN_DIA = 24 * 60;

  // Minutos -> como se escribe en la casilla: 540 -> "9"; 450 -> "7:30"
  const horaEnCasilla = (minutos) => (minutos % 60 === 0
    ? String(minutos / 60)
    : `${Math.floor(minutos / 60)}:${String(minutos % 60).padStart(2, '0')}`);

  // Minutos -> la nota "sigue": 120 -> "02:00"
  const horaDeSigue = (minutos) => `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;

  // "2:00", para los avisos
  const horaDelAviso = (minutos) => `${Math.floor(minutos / 60)}:${String(minutos % 60).padStart(2, '0')}`;

  const nada = (avisos, aDefinir = null) => ({ casillas: {}, sigue: null, calculadas: [], avisos, aDefinir });
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

  function calcularRenglon({ cada = null, desde = null, horas = null, ambigua = false } = {}) {
    const hayCada = cada !== null && cada !== undefined;
    const hayDesde = desde !== null && desde !== undefined && String(desde).trim() !== '';
    const hayHoras = Array.isArray(horas) && horas.length > 0;

    if (!hayCada && !hayDesde && !hayHoras) return nada([]);   // no se dictó ningún horario

    // Hora de 1 a 12 sin aclarar: no se sabe si es de mañana o de noche
    if (ambigua) {
      return nada(['Se dijo una hora de 1 a 12 sin "de la mañana", "de la tarde" o "de la noche": preguntá cuál es y ' + marcarAMano]);
    }

    // [A DEFINIR] Frecuencia y horas sueltas a la vez, o "desde" sin frecuencia
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
      return { casillas, sigue: null, calculadas: [], avisos, aDefinir: null };
    }

    // --- "Cada N horas desde H" ---
    if (!hayDesde) return nada(['Falta desde qué hora: ' + marcarAMano]);
    // [A DEFINIR] Cada 0 horas, negativos, con decimales ("cada 1,5") o más de 24
    if (!Number.isInteger(cada) || cada < 1 || cada > 24) {
      return nada([`"Cada ${cada} horas" no se puede calcular: ` + marcarAMano], 'frecuencia-rara');
    }
    const inicio = minutosDeHora(desde);
    if (inicio === null) {
      return nada([`La hora "${desde}" no se entiende: ` + marcarAMano], 'hora-que-no-se-entiende');
    }
    // [A DEFINIR] Arranca de 0:00 a 4:00: esa toma no tiene columna (por ejemplo,
    // "cada 4 horas desde las 2")
    if (inicio <= GRILLA.sinColumnaHasta) {
      return nada([`Arranca a las ${horaDelAviso(inicio)}, que no tiene columna en la grilla: ` + marcarAMano], 'arranca-sin-columna');
    }
    const tomas = [];
    let minutos = inicio;
    for (; minutos <= UN_DIA; minutos += cada * 60) tomas.push({ minutos, texto: horaEnCasilla(minutos) });
    const casillas = ponerTomas(tomas);
    if (casillas === null) return nada(['Dos tomas caen en la misma casilla: no entra en la grilla, marcala a mano.']);
    // La próxima toma, que ya es del día siguiente
    return { casillas, sigue: horaDeSigue(minutos - UN_DIA), calculadas: Object.keys(casillas).map(Number), avisos: [], aDefinir: null };
  }

  return { calcularRenglon };
})();
