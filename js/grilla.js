// Grilla de horarios (Formulario N° 5): las indicaciones médicas, renglón por
// renglón, como en el papel. Cada renglón tiene su texto, sus 10 casillas (06 a 24)
// y la nota "Sigue al día siguiente". La dibuja y la lee js/formulario.js cuando una
// sección de la planilla es de tipo "grilla" (como hace con las etapas).
//
//   - Cada casilla tiene una cruz ("X") o la HORA REAL escrita ("7:30"). Un toque
//     pone la X y otro la saca (también saca una hora).
//   - La hora real se escribe en "Hora suelta" y se pone en su columna con la misma
//     regla que el control de la base (supabase/formulario5-grilla.sql): va en la
//     columna de la hora par siguiente, más de dos horas antes y sin incluirla (7:30
//     va en la "08"); las horas justas son una X; de 0:00 a 4:00 no hay columna.
//   - Renglones que se suman y se sacan (con tacho), hasta el máximo de cada
//     indicación; si un renglón tiene algo cargado, pregunta antes de sacarlo. Cada
//     indicación arranca con las tarjetas que dice la planilla (puede ser ninguna).
//
// Lo que se guarda (en la columna de la sección, "indicaciones"):
//   { csv: [ { texto, casillas: { "6": "X", "8": "7:30" }, sigue: "08:00" } ], ... }
// Sin renglones vacíos; null si no hay nada.

const GRILLA = {
  columnas: [6, 8, 10, 12, 14, 16, 18, 20, 22, 24],
  sinColumnaHasta: 4 * 60,   // de 0:00 a 4:00 (en minutos) no hay columna
};

let contadorRenglones = 0;   // para que cada renglón tenga ids únicos (puede haber dos grillas: carga y edición)

const dosCifras = (n) => String(n).padStart(2, '0');

// --- Las reglas fijas de las horas (las mismas que el control de la base) ----------

// Una hora escrita ("7", "7:30", "08:00", "24") en minutos desde las 0; null si no
// es una hora. Acepta "7.30" y "7,30" (el teclado del celular) como "7:30".
function minutosDeHora(texto) {
  const partes = /^(\d{1,2})(?:[:.,](\d{2}))?$/.exec(String(texto).trim());
  if (!partes) return null;
  const horas = Number(partes[1]);
  const minutos = partes[2] === undefined ? 0 : Number(partes[2]);
  if (minutos > 59 || horas > 24 || (horas === 24 && minutos > 0)) return null;
  return horas * 60 + minutos;
}

// La hora como se guarda: "7.30" y "7,30" quedan "7:30"; "7" queda "7"
const horaEscrita = (texto) => String(texto).trim().replace(/[.,]/, ':');

// En qué columna va una hora y qué se escribe: { columna, valor } ("X" si cae justo
// en la columna). null si no tiene columna (de 0:00 a 4:00)
function lugarDeLaHora(minutos, texto) {
  if (minutos <= GRILLA.sinColumnaHasta) return null;
  const columna = GRILLA.columnas.find((c) => c * 60 >= minutos);
  return { columna, valor: columna * 60 === minutos ? 'X' : horaEscrita(texto) };
}

// --- Dibujar ------------------------------------------------------------------------

// seccion: la de la planilla ({ columna, indicaciones: [{ clave, etiqueta, maximo, ... }] })
// valor:   lo guardado (para la edición del dashboard), o nada
function dibujarGrilla(seccion, prefijo = '', valor) {
  const grilla = crear('div', 'grilla-horarios');
  grilla.dataset.grilla = seccion.columna;
  seccion.indicaciones.forEach((indicacion) => {
    const bloque = crear('div', 'grilla__indicacion');
    bloque.dataset.indicacion = indicacion.clave;
    const renglones = crear('div', 'renglones');
    const guardados = valor && Array.isArray(valor[indicacion.clave]) ? valor[indicacion.clave] : [];
    // Con los renglones que ya tenía la hoja; si no tenía ninguno, con las tarjetas
    // vacías que dice la planilla ("inicial"; si no lo dice, 1). Puede ser ninguna:
    // entonces se ve solo "+ Agregar renglón"
    const vacios = Array.from({ length: indicacion.inicial ?? 1 }, () => ({}));
    (guardados.length ? guardados : vacios).forEach((r) => renglones.append(dibujarRenglon(indicacion, r, prefijo)));
    const agregar = crear('button', 'agregar-renglon', indicacion.agregar || '+ Agregar renglón');
    agregar.type = 'button';
    agregar.addEventListener('click', () => {
      const nuevo = dibujarRenglon(indicacion, {}, prefijo);
      nuevo.classList.add('renglon--nuevo');
      renglones.append(nuevo);
      ordenarRenglones(bloque, indicacion);
      ajustarTodasLasAlturas(nuevo);
      nuevo.querySelector('.renglon__texto').focus();
    });
    bloque.append(crear('p', 'grilla__titulo', indicacion.etiqueta), renglones, agregar);
    ordenarRenglones(bloque, indicacion);
    grilla.append(bloque);
  });
  return grilla;
}

// Los rótulos en orden ("Renglón 1", "Remedio 2"...) y el botón de agregar, que
// desaparece al llegar al tope
function ordenarRenglones(bloque, indicacion) {
  const tarjetas = [...bloque.querySelectorAll('.renglon')];
  tarjetas.forEach((tarjeta, i) => {
    const rotulo = `${indicacion.rotulo || 'Renglón'} ${i + 1}`;
    tarjeta.querySelector('.renglon__rotulo').textContent = rotulo;
    tarjeta.dataset.nombre = `${indicacion.etiqueta}, ${rotulo.toLowerCase()}`;
    tarjeta.querySelector('.renglon__texto').setAttribute('aria-label', tarjeta.dataset.nombre);
    tarjeta.querySelectorAll('.renglon__casilla').forEach(nombrarCasilla);
  });
  bloque.querySelector('.agregar-renglon').hidden = tarjetas.length >= indicacion.maximo;
}

function dibujarRenglon(indicacion, valores, prefijo) {
  const numero = contadorRenglones++;
  const tarjeta = crear('div', 'renglon');

  const encabezado = crear('div', 'renglon__encabezado');
  const quitar = crear('button', 'renglon__quitar');
  quitar.type = 'button';
  quitar.setAttribute('aria-label', indicacion.rotulo ? 'Quitar este remedio' : 'Quitar este renglón');
  quitar.innerHTML = ICONO_TACHO;
  quitar.addEventListener('click', () => quitarRenglon(tarjeta, indicacion));
  encabezado.append(crear('span', 'renglon__rotulo'), quitar);

  // El texto del renglón: una línea que crece, sin "Enter" (como los campos cortos)
  const texto = document.createElement('textarea');
  texto.className = 'campo renglon__texto';
  texto.id = `${prefijo}renglon-${numero}-texto`;
  texto.rows = 1;
  texto.autocomplete = 'off';
  texto.value = valores.texto ?? '';
  texto.addEventListener('input', () => ajustarAltura(texto));
  texto.addEventListener('keydown', (evento) => { if (evento.key === 'Enter') evento.preventDefault(); });

  // Las 10 columnas: arriba la hora, abajo la casilla que se toca
  const horas = crear('div', 'renglon__horas');
  GRILLA.columnas.forEach((c) => horas.append(crear('span', 'renglon__hora', dosCifras(c))));
  GRILLA.columnas.forEach((c) => {
    const casilla = crear('button', 'renglon__casilla');
    casilla.type = 'button';
    casilla.dataset.hora = String(c);
    ponerEnCasilla(casilla, valores.casillas ? valores.casillas[String(c)] ?? '' : '');
    casilla.addEventListener('click', () => ponerEnCasilla(casilla, casilla.dataset.valor ? '' : 'X'));
    horas.append(casilla);
  });

  // Hora suelta: se escribe y se pone en su columna
  const suelta = crear('div', 'renglon__suelta');
  const etiquetaSuelta = crear('label', 'renglon__etiqueta', 'Hora suelta');
  const campoSuelta = document.createElement('input');
  campoSuelta.type = 'text';
  campoSuelta.inputMode = 'decimal';
  campoSuelta.className = 'campo renglon__hora-suelta';
  campoSuelta.id = `${prefijo}renglon-${numero}-suelta`;
  campoSuelta.autocomplete = 'off';
  etiquetaSuelta.htmlFor = campoSuelta.id;
  const poner = crear('button', 'panel-boton panel-boton--fantasma renglon__poner', 'Poner');
  poner.type = 'button';
  poner.addEventListener('click', () => ponerHoraSuelta(tarjeta));
  campoSuelta.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter') { evento.preventDefault(); ponerHoraSuelta(tarjeta); }
  });
  suelta.append(etiquetaSuelta, campoSuelta, poner);

  // "Sigue al día siguiente": una hora, chica y tenue (solo informativa)
  const sigue = crear('div', 'renglon__sigue');
  const etiquetaSigue = crear('label', 'renglon__etiqueta', 'Sigue al día siguiente');
  const campoSigue = document.createElement('input');
  campoSigue.type = 'text';
  campoSigue.inputMode = 'decimal';
  campoSigue.className = 'campo renglon__sigue-hora';
  campoSigue.id = `${prefijo}renglon-${numero}-sigue`;
  campoSigue.autocomplete = 'off';
  campoSigue.value = valores.sigue ?? '';
  etiquetaSigue.htmlFor = campoSigue.id;
  sigue.append(etiquetaSigue, campoSigue);

  tarjeta.append(encabezado, texto, horas, suelta, sigue);
  return tarjeta;
}

// Lo que muestra una casilla: nada, una X o la hora real
function ponerEnCasilla(casilla, valor) {
  casilla.dataset.valor = valor;
  casilla.textContent = valor;
  casilla.classList.toggle('renglon__casilla--cruz', valor === 'X');
  casilla.classList.toggle('renglon__casilla--hora', valor !== '' && valor !== 'X');
  nombrarCasilla(casilla);
}

// Lo que lee un lector de pantalla: "C.S.V., renglón 1, 06: con cruz"
function nombrarCasilla(casilla) {
  const tarjeta = casilla.closest('.renglon');
  const valor = casilla.dataset.valor;
  const estado = valor === '' ? 'vacía' : valor === 'X' ? 'con cruz' : `hora ${valor}`;
  casilla.setAttribute('aria-label', `${tarjeta && tarjeta.dataset.nombre ? `${tarjeta.dataset.nombre}, ` : ''}${dosCifras(casilla.dataset.hora)}: ${estado}`);
}

function ponerHoraSuelta(tarjeta) {
  const campo = tarjeta.querySelector('.renglon__hora-suelta');
  const escrita = campo.value.trim();
  if (escrita === '') return;
  const minutos = minutosDeHora(escrita);
  if (minutos === null) {
    mostrarAviso('Escribí la hora así: 7 o 7:30.', 'error', 5000);
    campo.focus();
    return;
  }
  const lugar = lugarDeLaHora(minutos, escrita);
  if (!lugar) {
    mostrarAviso('Las horas de 0 a 4 no tienen columna en la grilla: no se pone.', 'error', 5000);
    campo.focus();
    return;
  }
  const casilla = tarjeta.querySelector(`.renglon__casilla[data-hora="${lugar.columna}"]`);
  const habia = casilla.dataset.valor;
  ponerEnCasilla(casilla, lugar.valor);
  campo.value = '';
  mostrarAviso(habia && habia !== lugar.valor
    ? `Se reemplazó lo que había en la columna ${dosCifras(lugar.columna)}.`
    : `Quedó en la columna ${dosCifras(lugar.columna)}.`, 'info', 3000);
}

// ¿El renglón tiene algo cargado (texto, casillas, hora suelta o "sigue")?
function renglonTieneDatos(tarjeta) {
  return [...tarjeta.querySelectorAll('textarea, input')].some((c) => c.value.trim() !== '')
    || [...tarjeta.querySelectorAll('.renglon__casilla')].some((c) => c.dataset.valor);
}

// Quitar un renglón: si tiene algo cargado, antes se pregunta (como las etapas)
async function quitarRenglon(tarjeta, indicacion) {
  if (renglonTieneDatos(tarjeta)) {
    const quitar = await preguntar(indicacion.rotulo ? {
      titulo: '¿Quitar este remedio?',
      texto: 'Se van a borrar el remedio y sus horas.',
      textoConfirmar: 'Quitar',
      peligro: true,
    } : {
      titulo: '¿Quitar este renglón?',
      texto: 'Se van a borrar el texto y las horas de este renglón.',
      textoConfirmar: 'Quitar',
      peligro: true,
    });
    if (!quitar) return;
  }
  const bloque = tarjeta.closest('.grilla__indicacion');
  tarjeta.remove();
  ordenarRenglones(bloque, indicacion);
  bloque.querySelector('.agregar-renglon').focus();   // el foco no se pierde en la pantalla
}

// --- La ficha del dashboard (solo para leer) ----------------------------------------------

// La grilla como en el papel: una tablita con las 10 columnas (06 a 24), un título
// por indicación y, en cada renglón, su texto y su X o su hora en cada columna. La
// nota "Sigue al día siguiente" va abajo del renglón, chica y tenue. Las
// indicaciones sin renglones no aparecen; si no hay ninguna, devuelve null (y la
// ficha no muestra la tablita). Lo que viene de la base va siempre como texto.
function dibujarGrillaFicha(seccion, valor) {
  const conRenglones = seccion.indicaciones.filter((i) => valor && Array.isArray(valor[i.clave]) && valor[i.clave].length > 0);
  if (conRenglones.length === 0) return null;

  const tabla = crear('table', 'grilla-ficha');
  const encabezado = crear('tr');
  const primera = crear('th', 'grilla-ficha__indicacion-titulo');
  primera.scope = 'col';
  primera.append(crear('span', 'solo-lectores', 'Indicación'));
  encabezado.append(primera, ...GRILLA.columnas.map((c) => {
    const th = crear('th', 'grilla-ficha__hora', dosCifras(c));
    th.scope = 'col';
    return th;
  }));
  const thead = crear('thead');
  thead.append(encabezado);
  tabla.append(thead);

  conRenglones.forEach((indicacion) => {
    // Un grupo por indicación: su título y sus renglones
    const grupo = crear('tbody', 'grilla-ficha__grupo');
    const filaTitulo = crear('tr');
    const titulo = crear('th', 'grilla-ficha__titulo', indicacion.etiqueta);
    titulo.scope = 'rowgroup';
    titulo.colSpan = GRILLA.columnas.length + 1;
    filaTitulo.append(titulo);
    grupo.append(filaTitulo);

    valor[indicacion.clave].forEach((renglon) => {
      const fila = crear('tr', 'grilla-ficha__renglon');
      const texto = crear('td', 'grilla-ficha__texto');
      if (renglon.texto) texto.textContent = renglon.texto;
      else { texto.textContent = '—'; texto.classList.add('vacio'); }
      fila.append(texto, ...GRILLA.columnas.map((c) => {
        const marca = renglon.casillas ? renglon.casillas[String(c)] : undefined;
        const td = crear('td', 'grilla-ficha__casilla');
        if (marca) {
          td.textContent = marca;
          td.classList.add(marca === 'X' ? 'grilla-ficha__casilla--cruz' : 'grilla-ficha__casilla--hora');
        }
        return td;
      }));
      grupo.append(fila);
      if (renglon.sigue) {
        const filaSigue = crear('tr', 'grilla-ficha__sigue');
        const nota = crear('td', '', `Sigue al día siguiente: ${renglon.sigue}`);
        nota.colSpan = GRILLA.columnas.length + 1;
        filaSigue.append(nota);
        grupo.append(filaSigue);
      }
    });
    tabla.append(grupo);
  });

  // En pantalla angosta, la tablita se desplaza de costado (como las etapas)
  const envoltorio = crear('div', 'tabla-desplazable grilla-ficha__envoltorio');
  envoltorio.append(tabla);
  return envoltorio;
}

// --- Leer lo cargado ---------------------------------------------------------------------

// { csv: [ { texto, casillas, sigue } ], ... } sin renglones vacíos; null si no hay nada
function leerGrilla(grilla) {
  const valor = {};
  grilla.querySelectorAll('.grilla__indicacion').forEach((bloque) => {
    const renglones = [...bloque.querySelectorAll('.renglon')].map((tarjeta) => {
      const renglon = {};
      const texto = tarjeta.querySelector('.renglon__texto').value.trim();
      if (texto) renglon.texto = texto;
      const casillas = {};
      tarjeta.querySelectorAll('.renglon__casilla').forEach((c) => { if (c.dataset.valor) casillas[c.dataset.hora] = c.dataset.valor; });
      if (Object.keys(casillas).length) renglon.casillas = casillas;
      const sigue = tarjeta.querySelector('.renglon__sigue-hora').value.trim();
      if (sigue) renglon.sigue = horaEscrita(sigue);
      return renglon;
    }).filter((renglon) => Object.keys(renglon).length > 0);
    if (renglones.length) valor[bloque.dataset.indicacion] = renglones;
  });
  return Object.keys(valor).length ? valor : null;
}

// Antes de guardar (la carga y la edición): una "Hora suelta" escrita sin tocar
// "Poner" se perdería, y un "Sigue al día siguiente" que no es una hora la base lo
// rechazaría. Se avisa cuál y se va a ese campo. Sin grilla (el ergométrico), nada.
function hayGrillaMalEscrita(contenedor) {
  for (const tarjeta of contenedor.querySelectorAll('.grilla-horarios .renglon')) {
    const suelta = tarjeta.querySelector('.renglon__hora-suelta');
    if (suelta.value.trim() !== '') {
      mostrarAviso(`En ${tarjeta.dataset.nombre} quedó una hora suelta sin poner: tocá "Poner" o borrala.`, 'error', 6000);
      suelta.focus();
      return true;
    }
    const sigue = tarjeta.querySelector('.renglon__sigue-hora');
    if (sigue.value.trim() !== '' && minutosDeHora(sigue.value) === null) {
      mostrarAviso(`"Sigue al día siguiente" en ${tarjeta.dataset.nombre} tiene que ser una hora (por ejemplo 08:00).`, 'error', 6000);
      sigue.focus();
      return true;
    }
  }
  return false;
}

// Primera letra en mayúscula en el texto de cada renglón (como en los textos libres)
function ponerMayusculaInicialGrilla(grilla) {
  grilla.querySelectorAll('.renglon__texto').forEach((control) => {
    const texto = control.value;
    const primera = texto.search(/\S/);
    if (primera < 0) return;
    const nuevo = texto.slice(0, primera) + texto.charAt(primera).toLocaleUpperCase('es') + texto.slice(primera + 1);
    if (nuevo !== texto) escribirValor(control, nuevo);
  });
}
