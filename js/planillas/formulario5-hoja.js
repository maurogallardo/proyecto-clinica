// Hoja 1 del PDF del Formulario N° 5 (Fase 4): igual a la hoja en papel (A4
// apaisada). Es la parte propia de esta planilla; las hojas de fotos y el armado son
// comunes (js/pdf/). Sigue las reglas del PDF del ergométrico (ergometrico-hoja.js).
//
// - A4 horizontal (297 x 210), todo a 10 mm o más del borde (la impresora no llega
//   al borde). Siempre en blanco y negro sobre blanco, aunque la app esté en modo
//   oscuro.
// - Arriba, el logo de la clínica y los datos: Fecha, Hab., Mutual, Dr. y Pte. En el
//   marco, como en el papel: TRÁMITE ADM. (SÍ / NO) y DIAGNÓSTICO; las INDICACIONES
//   MÉDICAS a la izquierda y la grilla de HORARIOS (06:00 a 24:00) a la derecha, con
//   los renglones del papel (C.S.V. 2, Tomografía 2, Electrocardiograma 2,
//   Laboratorio 2, Medicación 5); la DIETA a lo ancho; y abajo Hidratación, Diuresis,
//   Drenajes, SNG / Vómitos y Deposiciones (por horario) y los Controles de
//   enfermería (un renglón por turno: F.R., Te., P., T.A. y O2).
// - Cada casilla de la grilla lleva su X o su hora real ("7:30"), como se guardó. Las
//   que puso el dictado salen como cruces normales: en el PDF ya están confirmadas
//   (no hay colores de revisión). Si el renglón tiene "sigue", se escribe "Mañana
//   sigue a las HH:MM" a continuación de su texto.
// - Lo que no se cargó queda en blanco: nunca se completa nada.
// - Cada dato tiene su lugar fijo, como en el papel. Si no entra: (1) la letra de ESE
//   dato se achica hasta un mínimo legible (8 pt) y (2) lo que igual no entra sigue,
//   completo, en una hoja de continuación ("Continuación de Medicación, remedio 3"),
//   con "(sigue en la hoja N)" en su lugar. Nunca se corta, se oculta ni se resume.
// - La marca de agua (el isologo, tenue y de fondo) va en TODAS las hojas: la 1, las
//   de continuación y las de fotos (fondoDeOtrasHojas).

const HOJA_FORMULARIO5 = (() => {
  const H = HerramientasPdf;

  // --- El diseño (en milímetros; la hoja A4 apaisada mide 297 x 210) --------------------
  const D = {
    izquierda: 15,             // el marco (a su izquierda va "FORMULARIO N° 5", vertical)
    derecha: 287,
    margen: 10,                // las hojas de continuación y de fotos
    pt: 9,                     // letra de los datos
    ptMinimo: 8,               // la letra de un dato largo no baja de acá (se lee bien impresa)
    ptRotulo: 8,               // rótulos ("C.S.V.:", "DIETA:")
    ptMarca: 7.5,              // "(sigue en la hoja N)"
    interlineado: 1.3,         // entre renglones de un mismo dato: pt x este factor
    aire: 1.5,                 // entre una línea del marco y el texto
    encabezado: { linea1: 16, linea2: 23.5, hasta: 226 },
    logo: { ancho: 56, arriba: 10.5 },
    marco: { arriba: 27, abajo: 200 },
    tramite: { alto: 9, separador: 82 },
    indicaciones: { anchoTexto: 125, altoBanda: 4.5, altoHoras: 4.5, altoRenglon: 7 },
    dieta: { alto: 9 },
    abajo: { altoTitulo: 7, hidratacion: 100, columna: 27 },   // los Controles, lo que queda (64)
    turno: { altoNombre: 3.6, altoRotulos: 3.6 },
    formulario: { texto: 'FORMULARIO N° 5', x: 12.8, pt: 6.5 },
    marcaDeAgua: { ancho: 200, opacidad: 0.07 },               // centrada; más tenue que en el ergométrico (0,10): no estorba la grilla
    continuacion: { limite: 198 },
  };

  // Las posiciones que salen del diseño
  const ANCHO = D.derecha - D.izquierda;
  const Y = (() => {
    const tramite = D.marco.arriba;
    const indicaciones = tramite + D.tramite.alto;
    const horas = indicaciones + D.indicaciones.altoBanda;
    const renglones = horas + D.indicaciones.altoHoras;
    const dieta = renglones + 13 * D.indicaciones.altoRenglon;
    const abajo = dieta + D.dieta.alto;
    const casilleros = abajo + D.abajo.altoTitulo;
    return { tramite, indicaciones, horas, renglones, dieta, abajo, casilleros, altoCasillero: (D.marco.abajo - casilleros) / 3 };
  })();
  const X_GRILLA = D.izquierda + D.indicaciones.anchoTexto;
  const ANCHO_HORA = (D.derecha - X_GRILLA) / 10;
  const X_COLUMNAS = Array.from({ length: 4 }, (_, i) => D.izquierda + D.abajo.hidratacion + i * D.abajo.columna);
  const X_CONTROLES = D.izquierda + D.abajo.hidratacion + 4 * D.abajo.columna;
  const ANCHO_CONTROL = (D.derecha - X_CONTROLES) / 5;

  // --- Lo que sale de la planilla (js/planillas/formulario5.js) ----------------------------
  const CAMPOS = PLANILLA_FORMULARIO5.secciones.flatMap((s) => s.campos || []).filter((c) => c.columna);
  const ETIQUETA = Object.fromEntries(CAMPOS.map((c) => [c.columna, c.etiqueta]));
  const TIPO = Object.fromEntries(CAMPOS.map((c) => [c.columna, c.tipo]));
  const GRILLA = PLANILLA_FORMULARIO5.secciones.find((s) => s.tipo === 'grilla');
  const COLUMNAS_GRILLA = [6, 8, 10, 12, 14, 16, 18, 20, 22, 24];
  const HORARIOS = [['05_13', '05 a 13'], ['13_21', '13 a 21'], ['21_05', '21 a 5']];
  const POR_HORARIO = [['diuresis', 'Diuresis'], ['drenajes', 'Drenajes'], ['sng_vomitos', 'SNG / Vómitos'], ['deposiciones', 'Deposiciones']];
  const TURNOS = [['manana', 'Mañana'], ['tarde', 'Tarde'], ['noche', 'Noche']];
  const DATOS_DE_CONTROL = [['fr', 'F.R.'], ['te', 'Te.'], ['p', 'P.'], ['ta', 'T.A.'], ['o2', 'O2']];

  const interDe = (pt) => H.ptAMm(pt) * D.interlineado;
  const altoMayuscula = (pt) => H.ptAMm(pt) * 0.72;
  // Cuántos renglones de esa letra entran en un alto
  const renglonesQueEntran = (pt, alto) => Math.max(1, Math.floor((alto - altoMayuscula(pt)) / interDe(pt) + 1e-6) + 1);

  // --- Los datos, ya escritos como van en la hoja --------------------------------------------

  function prepararDatos(estudio) {
    const campos = {};
    CAMPOS.forEach((c) => { campos[c.columna] = H.textoDeValor(estudio[c.columna], TIPO[c.columna]); });
    campos.fecha = H.textoDeValor(estudio.fecha, 'fecha');
    // La grilla: por indicación, sus renglones (texto + "Mañana sigue a las") y casillas
    const guardada = estudio.indicaciones && typeof estudio.indicaciones === 'object' ? estudio.indicaciones : {};
    const grilla = GRILLA.indicaciones.map((indicacion) => {
      const renglones = Array.isArray(guardada[indicacion.clave]) ? guardada[indicacion.clave] : [];
      return {
        indicacion,
        renglones: Array.from({ length: indicacion.maximo }, (_, k) => {
          const r = renglones[k] || {};
          const texto = H.textoDeValor(r.texto, 'texto');
          const sigue = H.textoDeValor(r.sigue, 'texto');
          const contenido = [texto, sigue ? `Mañana sigue a las ${sigue}` : ''].filter(Boolean).join(' · ');
          const casillas = r.casillas && typeof r.casillas === 'object' ? r.casillas : {};
          return { contenido, casillas: Object.fromEntries(COLUMNAS_GRILLA.map((c) => [c, H.textoDeValor(casillas[String(c)], 'texto')])) };
        }),
      };
    });
    return { campos, grilla };
  }

  // Todos los textos que van al PDF (para controlar que la fuente los tenga)
  function textosDe(datos) {
    return [
      ...Object.values(datos.campos),
      ...datos.grilla.flatMap((g) => g.renglones.flatMap((r) => [r.contenido, ...Object.values(r.casillas)])),
    ].filter(Boolean);
  }

  // --- Planificar (dónde va cada dato, sin dibujar) --------------------------------------------

  // "(sigue en la hoja N)": su ancho y cuántos renglones ocupa en un ancho (se mide con
  // el número más largo posible)
  const MARCA_MAS_LARGA = '(sigue en la hoja 99)';
  function medirMarca(doc, ancho) {
    doc.setFont('Arimo', 'italic');
    doc.setFontSize(D.ptMarca);
    const medida = { ancho: doc.getTextWidth(MARCA_MAS_LARGA), renglones: H.partirEnRenglones(doc, MARCA_MAS_LARGA, ancho).length };
    doc.setFont('Arimo', 'normal');
    return medida;
  }

  // Lo que queda de un texto después de los renglones que entraron en la hoja 1: con
  // eso, la continuación se vuelve a acomodar a lo ancho de su hoja (nada se pierde: es
  // el mismo texto, desde donde se cortó)
  function restoDespuesDe(texto, mostrados) {
    const t = String(texto).replace(/\r\n?/g, '\n').replace(/\t/g, ' ');
    let pos = 0;
    mostrados.forEach((renglon) => {
      let k = pos;
      while (k < t.length && !t.startsWith(renglon, k) && /\s/.test(t[k])) k++;
      pos = (t.startsWith(renglon, k) ? k : pos) + renglon.length;
    });
    return t.slice(pos).replace(/^\s+/, '');
  }

  // Un dato en su lugar ("caja"): de 9 pt a 8 pt; si a 8 pt igual no entra, los
  // primeros renglones quedan en su lugar, después va "(sigue en la hoja N)" y el
  // resto sigue completo en la continuación.
  //   caja: xPrimero / anchoPrimero (el primer renglón, después del rótulo), x / ancho
  //   (los demás), arriba y alto; "base": el renglón base fijo (una sola línea);
  //   "centrada": el texto centrado en el alto; "alMedio": cada renglón centrado en el ancho
  // Devuelve el renglón base del primer renglón (para poner el rótulo a la par).
  function acomodar(plan, doc, texto, caja, clave, titulo) {
    const baseVacia = caja.base ?? (caja.centrada ? caja.arriba + (caja.alto + altoMayuscula(D.pt)) / 2 : caja.arriba + altoMayuscula(D.pt));
    if (!texto) return baseVacia;
    doc.setFont('Arimo', 'normal');
    let pt = D.pt;
    let renglones;
    let entran;
    for (;;) {
      doc.setFontSize(pt);
      renglones = H.partirEnRenglones(doc, texto, caja.anchoPrimero, caja.ancho);
      entran = caja.base !== undefined ? 1 : renglonesQueEntran(pt, caja.alto);
      if (renglones.length <= entran || pt <= D.ptMinimo + 0.001) break;
      pt = Math.max(D.ptMinimo, pt - 0.5);
    }
    plan.letra[clave] = pt;
    let mostrados = renglones;
    let marca = null;
    if (renglones.length > entran) {
      const ultimoAncho = entran === 1 ? caja.anchoPrimero : caja.ancho;
      const { ancho: anchoMarca } = medirMarca(doc, ultimoAncho);
      doc.setFontSize(pt);
      if (!caja.alMedio && ultimoAncho - anchoMarca - 1.5 >= 15) {
        // Lo que entra del dato y, al final del último renglón, "(sigue en la hoja N)"
        const previos = renglones.slice(0, entran - 1);
        const ultimo = H.partirEnRenglones(doc, restoDespuesDe(texto, previos), ultimoAncho - anchoMarca - 1.5)[0] || '';
        mostrados = [...previos, ultimo];
        marca = { x: (entran === 1 ? caja.xPrimero : caja.x) + doc.getTextWidth(ultimo) + 1.5, ancho: anchoMarca + 1, renglones: 0 };
      } else {
        // Un lugar angosto (los Controles): "(sigue en la hoja N)" en sus propios
        // renglones; si no entra junto con el dato, el dato entero sigue en la continuación
        const marcaAbajo = medirMarca(doc, caja.ancho).renglones;
        const quedan = entran - marcaAbajo >= 1 ? entran - marcaAbajo : 0;
        mostrados = renglones.slice(0, quedan);
        marca = quedan > 0
          ? { x: caja.x, ancho: caja.ancho, renglones: marcaAbajo }
          : { x: caja.xPrimero, ancho: caja.anchoPrimero, renglones: medirMarca(doc, caja.anchoPrimero).renglones };
        doc.setFontSize(pt);
      }
      plan.continuaciones.push({ clave, titulo, texto: restoDespuesDe(texto, mostrados), pt });
    }
    const cantidad = mostrados.length + (marca ? marca.renglones : 0);
    const bloque = (cantidad - 1) * interDe(pt) + altoMayuscula(pt);
    const primera = caja.base ?? (caja.centrada ? caja.arriba + (caja.alto - bloque) / 2 + altoMayuscula(pt) : caja.arriba + altoMayuscula(pt));
    mostrados.forEach((r, k) => {
      const y = primera + k * interDe(pt);
      if (caja.alMedio) plan.ops.push({ t: 'centrado', texto: r, x: caja.x + caja.ancho / 2, y, pt });
      else plan.ops.push({ t: 'texto', texto: r, x: k === 0 ? caja.xPrimero : caja.x, y, pt });
    });
    // (al final del último renglón, o en los renglones de abajo)
    const yMarca = primera + (marca && marca.renglones === 0 ? mostrados.length - 1 : mostrados.length) * interDe(pt);
    if (marca) plan.ops.push({ t: 'marca', clave, ...marca, alMedio: caja.alMedio, y: yMarca, inter: interDe(pt) });
    return primera;
  }

  const anchoDe = (doc, texto, pt, estilo = 'bold') => {
    doc.setFont('Arimo', estilo);
    doc.setFontSize(pt);
    const ancho = doc.getTextWidth(texto);
    doc.setFont('Arimo', 'normal');
    return ancho;
  };
  const rotulo = (plan, texto, x, y, pt = D.ptRotulo, estilo = 'bold') => plan.ops.push({ t: 'texto', texto, x, y, pt, estilo });

  function planificar(doc, datos) {
    const plan = { ops: [], continuaciones: [], letra: {} };
    const c = datos.campos;

    // Arriba del marco: Fecha, Hab. y Mutual; Dr. y Pte.
    // (el paciente, con el lugar más grande: un nombre largo entra en una línea)
    const lineas = [
      [D.encabezado.linea1, [['fecha', 'Fecha', D.izquierda, 55], ['habitacion', 'Hab.', 55, 92], ['mutual', 'Mutual', 92, D.encabezado.hasta]]],
      [D.encabezado.linea2, [['doctor', 'Dr.', D.izquierda, 92], ['paciente', 'Pte.', 92, D.encabezado.hasta]]],
    ];
    lineas.forEach(([base, datosDeLaLinea]) => datosDeLaLinea.forEach(([columna, etiqueta, desde, hasta]) => {
      const texto = `${etiqueta}:`;
      rotulo(plan, texto, desde, base);
      const xValor = desde + anchoDe(doc, texto, D.ptRotulo) + 1.2;
      acomodar(plan, doc, c[columna], { xPrimero: xValor, x: xValor, anchoPrimero: hasta - xValor - 2, ancho: hasta - xValor - 2, base },
        columna, `Continuación de ${columna === 'fecha' ? 'Fecha' : ETIQUETA[columna]}`);
    }));

    // TRÁMITE ADM. (SÍ / NO) y DIAGNÓSTICO
    const baseTramite = Y.tramite + (D.tramite.alto + altoMayuscula(D.ptRotulo)) / 2;
    plan.ops.push({ t: 'tramite', base: baseTramite, valor: c.tramite_administrativo });
    const xDiag = D.tramite.separador + D.aire;
    const textoDiag = 'DIAGNÓSTICO:';
    const xDiagValor = xDiag + anchoDe(doc, textoDiag, D.ptRotulo) + 1.2;
    const baseDiag = acomodar(plan, doc, c.diagnostico, {
      xPrimero: xDiagValor, x: xDiag, anchoPrimero: D.derecha - D.aire - xDiagValor, ancho: D.derecha - D.aire - xDiag,
      arriba: Y.tramite + 0.4, alto: D.tramite.alto - 0.8, centrada: true,
    }, 'diagnostico', 'Continuación de Diagnóstico');
    rotulo(plan, textoDiag, xDiag, baseDiag);

    // Las indicaciones, renglón por renglón, y sus casillas
    let fila = 0;
    datos.grilla.forEach(({ indicacion, renglones }) => {
      const textoRotulo = `${indicacion.etiqueta.toLocaleUpperCase('es')}:`;
      const anchoRotulo = anchoDe(doc, textoRotulo, D.ptRotulo) + 1.2;
      renglones.forEach((renglon, k) => {
        const arriba = Y.renglones + fila * D.indicaciones.altoRenglon;
        const xTexto = D.izquierda + D.aire;
        const xPrimero = k === 0 ? xTexto + anchoRotulo : xTexto;
        const derecha = X_GRILLA - D.aire;
        const nombre = `${indicacion.etiqueta}, ${(indicacion.rotulo || 'Renglón').toLocaleLowerCase('es')} ${k + 1}`;
        const base = acomodar(plan, doc, renglon.contenido, {
          xPrimero, x: xTexto, anchoPrimero: derecha - xPrimero, ancho: derecha - xTexto,
          arriba: arriba + 0.3, alto: D.indicaciones.altoRenglon - 1.6, centrada: true,
        }, `grilla.${indicacion.clave}.${k}`, `Continuación de ${nombre}`);
        if (k === 0) rotulo(plan, textoRotulo, xTexto, base);
        COLUMNAS_GRILLA.forEach((columna, i) => {
          const valor = renglon.casillas[columna];
          if (valor) plan.ops.push({ t: 'casilla', valor, x: X_GRILLA + (i + 0.5) * ANCHO_HORA, arriba });
        });
        fila++;
      });
    });

    // DIETA, a lo ancho
    const xDieta = D.izquierda + D.aire;
    const textoDieta = 'DIETA:';
    const xDietaValor = xDieta + anchoDe(doc, textoDieta, D.ptRotulo) + 1.2;
    const baseDieta = acomodar(plan, doc, c.dieta, {
      xPrimero: xDietaValor, x: xDieta, anchoPrimero: D.derecha - D.aire - xDietaValor, ancho: D.derecha - D.aire - xDieta,
      arriba: Y.dieta + 0.4, alto: D.dieta.alto - 0.8, centrada: true,
    }, 'dieta', 'Continuación de Dieta');
    rotulo(plan, textoDieta, xDieta, baseDieta);

    // Hidratación: el recuadro grande
    const xHid = D.izquierda + D.aire;
    acomodar(plan, doc, c.hidratacion, {
      xPrimero: xHid, x: xHid, anchoPrimero: D.abajo.hidratacion - 2 * D.aire, ancho: D.abajo.hidratacion - 2 * D.aire,
      arriba: Y.abajo + 7.5, alto: D.marco.abajo - Y.abajo - 8.5,
    }, 'hidratacion', 'Continuación de Hidratación');

    // Diuresis, Drenajes, SNG / Vómitos y Deposiciones: por horario
    POR_HORARIO.forEach(([dato, nombre], i) => {
      HORARIOS.forEach(([horario, etiqueta], k) => {
        const arriba = Y.casilleros + k * Y.altoCasillero;
        const x = X_COLUMNAS[i] + D.aire;
        const ancho = D.abajo.columna - 2 * D.aire;
        acomodar(plan, doc, c[`${dato}_${horario}`], { xPrimero: x, x, anchoPrimero: ancho, ancho, arriba: arriba + 4.6, alto: Y.altoCasillero - 5.4 },
          `${dato}_${horario}`, `Continuación de ${nombre} ${etiqueta}`);
      });
    });

    // Controles de enfermería: un renglón por turno
    TURNOS.forEach(([turno, nombreTurno], k) => {
      const arriba = Y.casilleros + k * Y.altoCasillero + D.turno.altoNombre + D.turno.altoRotulos;
      const alto = Y.altoCasillero - D.turno.altoNombre - D.turno.altoRotulos;
      DATOS_DE_CONTROL.forEach(([dato, etiqueta], i) => {
        const x = X_CONTROLES + i * ANCHO_CONTROL + 0.8;
        const ancho = ANCHO_CONTROL - 1.6;
        acomodar(plan, doc, c[`control_${turno}_${dato}`], { xPrimero: x, x, anchoPrimero: ancho, ancho, arriba: arriba + 0.3, alto: alto - 0.6, centrada: true, alMedio: true },
          `control_${turno}_${dato}`, `Continuación de Controles de enfermería, ${nombreTurno}, ${etiqueta}`);
      });
    });
    return plan;
  }

  // --- Dibujar ------------------------------------------------------------------------------

  function texto(doc, t, x, y, pt, estilo = 'normal') {
    doc.setFont('Arimo', estilo);
    doc.setFontSize(pt);
    doc.text(t, x, y);
  }

  function centrado(doc, t, x, y, pt, estilo = 'normal', subrayado = false) {
    doc.setFont('Arimo', estilo);
    doc.setFontSize(pt);
    const w = doc.getTextWidth(t);
    doc.text(t, x - w / 2, y);
    if (subrayado) {
      doc.setLineWidth(0.3);
      doc.line(x - w / 2, y + 1.1, x + w / 2, y + 1.1);
    }
  }

  const linea = (doc, x1, y1, x2, y2, grosor = 0.25) => { doc.setLineWidth(grosor); doc.line(x1, y1, x2, y2); };

  // La marca de agua, centrada (la hoja 1, las de continuación y las de fotos)
  function fondoDeOtrasHojas(doc, recursos) {
    H.marcaDeAgua(doc, recursos.logos.isologo, D.marcaDeAgua);
  }

  // Lo fijo de la hoja 1: marca de agua, logo, el marco con sus líneas y sus títulos
  function dibujarFondo(doc, recursos) {
    fondoDeOtrasHojas(doc, recursos);
    doc.setDrawColor(0, 0, 0);
    doc.setTextColor(0, 0, 0);

    const logo = recursos.logos.completo;
    doc.addImage(logo.datos, 'PNG', D.derecha - D.logo.ancho, D.logo.arriba, D.logo.ancho, D.logo.ancho * logo.alto / logo.ancho, 'logo', 'SLOW');

    // "FORMULARIO N° 5", vertical, abajo a la izquierda del marco (como en el papel)
    doc.setFont('Arimo', 'normal');
    doc.setFontSize(D.formulario.pt);
    doc.text(D.formulario.texto, D.formulario.x, D.marco.abajo, { angle: 90 });

    // El marco y sus divisiones
    doc.setLineWidth(0.45);
    doc.rect(D.izquierda, D.marco.arriba, ANCHO, D.marco.abajo - D.marco.arriba);
    linea(doc, D.izquierda, Y.indicaciones, D.derecha, Y.indicaciones, 0.35);
    linea(doc, D.tramite.separador, Y.tramite, D.tramite.separador, Y.indicaciones, 0.35);

    // INDICACIONES MÉDICAS y HORARIOS (banda negra, como el papel)
    centrado(doc, 'INDICACIONES MÉDICAS', D.izquierda + D.indicaciones.anchoTexto / 2, Y.indicaciones + (Y.renglones - Y.indicaciones) / 2 + altoMayuscula(10) / 2, 10, 'bold');
    doc.setFillColor(0, 0, 0);
    doc.rect(X_GRILLA, Y.indicaciones, D.derecha - X_GRILLA, D.indicaciones.altoBanda, 'F');
    doc.setTextColor(255, 255, 255);
    centrado(doc, 'HORARIOS', X_GRILLA + (D.derecha - X_GRILLA) / 2, Y.indicaciones + D.indicaciones.altoBanda / 2 + altoMayuscula(8) / 2, 8, 'bold');
    doc.setTextColor(0, 0, 0);
    COLUMNAS_GRILLA.forEach((columna, i) => {
      centrado(doc, `${String(columna).padStart(2, '0')}:00`, X_GRILLA + (i + 0.5) * ANCHO_HORA, Y.horas + D.indicaciones.altoHoras / 2 + altoMayuscula(7.5) / 2, 7.5, 'bold');
    });
    linea(doc, X_GRILLA, Y.indicaciones, X_GRILLA, Y.dieta, 0.35);
    linea(doc, D.izquierda, Y.renglones, D.derecha, Y.renglones, 0.35);
    for (let i = 1; i < 10; i++) linea(doc, X_GRILLA + i * ANCHO_HORA, Y.horas, X_GRILLA + i * ANCHO_HORA, Y.dieta);
    // Los 13 renglones: puntos a la izquierda (como el papel) y líneas en la grilla
    for (let f = 1; f <= 13; f++) {
      const y = Y.renglones + f * D.indicaciones.altoRenglon;
      H.renglonDePuntos(doc, D.izquierda + D.aire, X_GRILLA - 0.5, y - 1.2);
      if (f < 13) linea(doc, X_GRILLA, y, D.derecha, y);
    }
    linea(doc, D.izquierda, Y.dieta, D.derecha, Y.dieta, 0.35);
    linea(doc, D.izquierda, Y.abajo, D.derecha, Y.abajo, 0.45);

    // Abajo: Hidratación, los cuatro por horario y los Controles de enfermería
    texto(doc, 'Hidratación:', D.izquierda + D.aire, Y.abajo + 4.8, 8.5, 'bold');
    doc.setLineWidth(0.25);
    doc.line(D.izquierda + D.aire, Y.abajo + 5.9, D.izquierda + D.aire + anchoDe(doc, 'Hidratación:', 8.5), Y.abajo + 5.9);
    [...X_COLUMNAS, X_CONTROLES].forEach((x) => linea(doc, x, Y.abajo, x, D.marco.abajo, 0.35));
    linea(doc, X_COLUMNAS[0], Y.casilleros, D.derecha, Y.casilleros, 0.35);
    POR_HORARIO.forEach(([, nombre], i) => {
      const medio = X_COLUMNAS[i] + D.abajo.columna / 2;
      if (nombre === 'SNG / Vómitos') {
        centrado(doc, 'S N G', medio, Y.abajo + 3.1, 8, 'bold');
        centrado(doc, 'Vómitos', medio, Y.abajo + 6.2, 8, 'bold');
      } else {
        centrado(doc, nombre, medio, Y.abajo + D.abajo.altoTitulo / 2 + altoMayuscula(8.5) / 2, 8.5, 'bold');
      }
      HORARIOS.forEach(([, etiqueta], k) => texto(doc, `${etiqueta} =`, X_COLUMNAS[i] + D.aire, Y.casilleros + k * Y.altoCasillero + 3.4, 7));
    });
    centrado(doc, 'Controles de Enfermería', X_CONTROLES + (D.derecha - X_CONTROLES) / 2, Y.abajo + D.abajo.altoTitulo / 2 + altoMayuscula(8.5) / 2, 8.5, 'bold');
    TURNOS.forEach(([, nombreTurno], k) => {
      const arriba = Y.casilleros + k * Y.altoCasillero;
      const rotulos = arriba + D.turno.altoNombre;
      const valores = rotulos + D.turno.altoRotulos;
      if (k > 0) linea(doc, X_CONTROLES, arriba, D.derecha, arriba, 0.35);
      centrado(doc, nombreTurno.toLocaleUpperCase('es'), X_CONTROLES + (D.derecha - X_CONTROLES) / 2, arriba + D.turno.altoNombre / 2 + altoMayuscula(7.5) / 2, 7.5, 'bold');
      linea(doc, X_CONTROLES, rotulos, D.derecha, rotulos);
      linea(doc, X_CONTROLES, valores, D.derecha, valores);
      DATOS_DE_CONTROL.forEach(([, etiqueta], i) => {
        const x = X_CONTROLES + i * ANCHO_CONTROL;
        if (i > 0) linea(doc, x, rotulos, x, arriba + Y.altoCasillero);
        centrado(doc, etiqueta, x + ANCHO_CONTROL / 2, rotulos + D.turno.altoRotulos / 2 + altoMayuscula(7) / 2, 7);
      });
    });
  }

  // TRÁMITE ADM.: SÍ [ ]  NO [ ], con una X en lo cargado
  function dibujarTramite(doc, base, valor) {
    const x = D.izquierda + D.aire;
    texto(doc, 'TRÁMITE ADM.:', x, base, D.ptRotulo, 'bold');
    let xs = x + anchoDe(doc, 'TRÁMITE ADM.:', D.ptRotulo) + 2.5;
    const lado = 3.4;
    [['SÍ', 'SÍ'], ['NO', 'NO']].forEach(([etiqueta, opcion]) => {
      texto(doc, etiqueta, xs, base, D.ptRotulo);
      xs += anchoDe(doc, etiqueta, D.ptRotulo, 'normal') + 1;
      doc.setLineWidth(0.25);
      doc.rect(xs, base - lado + 0.4, lado, lado);
      if (valor === opcion) centrado(doc, 'X', xs + lado / 2, base, 8.5, 'bold');
      xs += lado + 4;
    });
  }

  function dibujarOps(doc, ops, marcas) {
    ops.forEach((op) => {
      if (op.t === 'texto') texto(doc, op.texto, op.x, op.y, op.pt, op.estilo);
      else if (op.t === 'centrado') centrado(doc, op.texto, op.x, op.y, op.pt);
      else if (op.t === 'marca') {
        // "(sigue en la hoja N)", en los renglones que haga falta dentro de su lugar
        doc.setFont('Arimo', 'italic');
        doc.setFontSize(D.ptMarca);
        H.partirEnRenglones(doc, `(sigue en la hoja ${marcas[op.clave]})`, op.ancho).forEach((r, k) => {
          if (op.alMedio) centrado(doc, r, op.x + op.ancho / 2, op.y + k * op.inter, D.ptMarca, 'italic');
          else texto(doc, r, op.x, op.y + k * op.inter, D.ptMarca, 'italic');
        });
      }
      else if (op.t === 'tramite') dibujarTramite(doc, op.base, op.valor);
      else if (op.t === 'casilla') {
        const base = op.arriba + D.indicaciones.altoRenglon / 2;
        if (op.valor === 'X') centrado(doc, 'X', op.x, base + altoMayuscula(10) / 2, 10, 'bold');
        else {
          doc.setFont('Arimo', 'normal');
          const pt = H.tamanoParaAncho(doc, op.valor, ANCHO_HORA - 1.5, 8.5);
          centrado(doc, op.valor, op.x, base + altoMayuscula(pt) / 2, pt);
        }
      }
    });
  }

  // Las hojas de continuación (apaisadas, con la marca de agua): lo que no entró en la
  // hoja 1, completo y acomodado a lo ancho de la hoja
  function dibujarContinuaciones(doc, recursos, secciones, encabezado) {
    const marcas = {};
    const mitad = 297 / 2;
    const ancho = 297 - 2 * D.izquierda;
    let y = null;
    const hojaNueva = () => {
      doc.addPage('a4', 'landscape');
      fondoDeOtrasHojas(doc, recursos);
      y = H.encabezadoChico(doc, encabezado, D.izquierda) + 10;   // alineado con el marco de la hoja 1
    };
    secciones.forEach((s) => {
      if (y === null || y + 18 > D.continuacion.limite) hojaNueva();
      marcas[s.clave] = doc.getNumberOfPages();
      centrado(doc, s.titulo, mitad, y, 12, 'italic', true);
      y += 9;
      const inter = interDe(s.pt);
      doc.setFont('Arimo', 'normal');
      doc.setFontSize(s.pt);
      H.partirEnRenglones(doc, s.texto, ancho).forEach((r) => {
        if (y > D.continuacion.limite) { hojaNueva(); centrado(doc, `${s.titulo} (sigue)`, mitad, y, 10.5, 'italic'); y += 8; }
        if (r) texto(doc, r, D.izquierda, y, s.pt);
        y += inter;
      });
      y += 6;
    });
    return marcas;
  }

  // --- La hoja completa -----------------------------------------------------------------------

  // Dibuja la hoja 1 (y, si hace falta, las de continuación). Devuelve cómo quedó
  // (sirve para las pruebas: letra de cada dato y continuaciones).
  function dibujar(doc, estudio, recursos, encabezado) {
    const datos = prepararDatos(estudio);
    H.controlarCaracteres(doc, [...textosDe(datos), encabezado]);
    const plan = planificar(doc, datos);
    dibujarFondo(doc, recursos);
    const marcas = plan.continuaciones.length ? dibujarContinuaciones(doc, recursos, plan.continuaciones, encabezado) : {};
    doc.setPage(1);
    dibujarOps(doc, plan.ops, marcas);
    doc.setPage(doc.getNumberOfPages());
    return {
      hojas: 1 + (plan.continuaciones.length ? doc.getNumberOfPages() - 1 : 0),
      letra: plan.letra,
      continuaciones: plan.continuaciones.map((c) => c.titulo),
    };
  }

  return { dibujar, fondoDeOtrasHojas, D };
})();
