// Hoja 1 del PDF del Estudio Ergométrico (T033): igual a la planilla en papel
// (specs/001-estudio-ergometrico/assets/planilla-delacanada.jpg). Es la parte
// propia de este estudio; las hojas de fotos y el armado son comunes a todos
// (js/pdf/). Para otro estudio se escribe otra hoja como esta.
//
// - A4 vertical, en UNA sola hoja en los casos normales. Todo a 10 mm o más del
//   borde (la impresora no llega al borde).
// - Los mismos campos, en el mismo orden y en las mismas líneas que el papel, con
//   su renglón de puntos; el dato se escribe encima. Lo que no se cargó queda en
//   blanco (solo los puntos): nunca se completa nada. El DNI va en la línea de
//   FECHA, en el lado derecho (la de PACIENTE ya tiene SEXO).
// - Si un texto no entra, en este orden: (1) las filas de la tabla se hacen más
//   bajas, (2) los renglones se juntan un poco, (3) la letra de ESE campo se achica
//   hasta un mínimo legible (8 pt), y (4) lo que igual no entra sigue, completo, en
//   una hoja de continuación ("Continuación de Conclusión"). Nunca se corta, se
//   oculta ni se resume un texto.

const HOJA_ERGOMETRICO = (() => {
  const H = HerramientasPdf;

  // --- El diseño (en milímetros; la hoja A4 mide 210 x 297) ----------------------------
  const D = {
    margen: 11,
    ancho: 188,                // 210 - 2 x 11
    pt: 10.5,                  // letra de rótulos y datos
    ptMinimo: 8,               // la letra de un dato largo no baja de acá (se lee bien impresa)
    interlineado: 1.85,        // entre renglones de un mismo campo: pt x este factor
    paso: 9,                   // entre una línea de la planilla y la siguiente
    pasoMinimo: 7.5,
    primeraLinea: 56,          // PACIENTE
    limite: 268,               // la última línea escrita no pasa de acá (abajo va el pie)
    banda: { x: 11, y: 12, ancho: 86, alto: 10, pt: 16 },
    logo: { ancho: 80, arriba: 11.5 },
    titulo: { y: 41, pt: 16 },
    separador: { debajo: 4.1, despues: 7.8 },
    tabla: { tituloDespues: 6.3, arriba: 4, altoEncabezado: 8.5, altoFila: 14.5, altoFilaMinimo: 7, filasMinimas: 4 },
    despuesDeTabla: 8.9,
    marcaDeAgua: { x: 16, y: 103, ancho: 177, opacidad: 0.1 },
    pie: {
      linea1: 271.5, nombre: 'Sanatorio Privado - Río Tercero', nombreY: 277.3, nombrePt: 15,
      linea2: 279.2, direccionY: 284, direccionPt: 12,
      direccion: 'Fray Justo Santa María de Oro 54 - Tel./Fax (03571) 422672 - Líneas Rotativas - (5850) Río Tercero - Pcia. de Córdoba - R. A.',
    },
    continuacion: { limite: 285 },
  };

  // --- Los campos, línea por línea, como en el papel ---------------------------------
  // desde / hasta: dónde empieza y termina cada campo, como parte del ancho (0 a 1)
  const CUERPO = [
    { fila: [{ etiqueta: 'PACIENTE', columna: 'nombre_paciente', hasta: 0.67 }, { etiqueta: 'SEXO', columna: 'sexo' }] },
    { fila: [{ etiqueta: 'EDAD', columna: 'edad', hasta: 0.333 }, { etiqueta: 'PESO', columna: 'peso', hasta: 0.65 }, { etiqueta: 'TALLA', columna: 'talla' }] },
    { fila: [{ etiqueta: 'FECHA', columna: 'fecha_estudio', hasta: 0.5 }, { etiqueta: 'DNI', columna: 'documento' }] },
    { fila: [{ etiqueta: 'MÉDICO SOLICITANTE', columna: 'medico_solicitante' }] },
    { fila: [{ etiqueta: 'MOTIVO', columna: 'motivo' }] },
    { fila: [{ etiqueta: 'ANTECEDENTES', columna: 'antecedentes', renglonesMinimos: 2 }] },
    { fila: [{ etiqueta: 'TÉCNICA', columna: 'tecnica', hasta: 0.495 }, { etiqueta: 'POSICIÓN', columna: 'posicion' }] },
    { fila: [{ etiqueta: 'F.C. TEORÍA', columna: 'fc_teorica', hasta: 0.331 }, { etiqueta: 'F.C. ALCANZADA', columna: 'fc_alcanzada', hasta: 0.713 }, { etiqueta: 'PORCENTAJE', columna: 'porcentaje' }] },
    { separador: true },
    { rotulo: 'ECG BASAL:' },
    { fila: [{ etiqueta: 'RITMO', columna: 'ecg_ritmo', desde: 0.117, hasta: 0.474 }, { etiqueta: 'EJE', columna: 'ecg_eje', hasta: 0.736 }, { etiqueta: 'FCIA', columna: 'ecg_fcia' }] },
    { fila: [{ etiqueta: 'P', columna: 'ecg_p', desde: 0.114, hasta: 0.323 }, { etiqueta: 'PQ', columna: 'ecg_pq', hasta: 0.526 }, { etiqueta: 'QRS', columna: 'ecg_qrs', hasta: 0.759 }, { etiqueta: 'QT', columna: 'ecg_qt' }] },
    { fila: [{ etiqueta: 'CONCLUSIÓN', columna: 'conclusion' }] },
    { separador: true },
    { tabla: true },
    { fila: [{ etiqueta: 'INTERRUPCIÓN DE LA PRUEBA', columna: 'interrupcion_prueba' }] },
    { fila: [{ texto: 'POSTESFUERZO A LOS 5’:', hasta: 0.268 }, { etiqueta: 'TA', columna: 'post_ta', hasta: 0.445 }, { etiqueta: 'FC', columna: 'post_fc', hasta: 0.61 }, { etiqueta: 'ECG', columna: 'post_ecg', hasta: 0.78 }, { etiqueta: 'CLÍNICA', columna: 'post_clinica' }] },
  ];

  const COLUMNAS_TABLA = [
    { etiqueta: 'TIEMPO', columna: 'tiempo' }, { etiqueta: 'CARGA', columna: 'carga' }, { etiqueta: 'MET', columna: 'met' },
    { etiqueta: 'T.A.', columna: 'ta' }, { etiqueta: 'F.C.', columna: 'fc' }, { etiqueta: 'ECG', columna: 'ecg' }, { etiqueta: 'CLÍNICA', columna: 'clinica' },
  ];

  // Nombre de cada campo para la hoja de continuación ("Continuación de Conclusión")
  const NOMBRES = Object.fromEntries(PLANILLA_ERGOMETRICO.secciones.flatMap((s) => s.campos || []).filter((c) => c.columna).map((c) => [c.columna, c.etiqueta]));
  const TIPOS = Object.fromEntries([
    ...PLANILLA_ERGOMETRICO.secciones.flatMap((s) => s.campos || []).filter((c) => c.columna),
    ...PLANILLA_ERGOMETRICO.etapas.campos,
  ].map((c) => [c.columna, c.tipo]));

  const interDe = (pt) => H.ptAMm(pt) * D.interlineado;
  const altoMayuscula = (pt) => H.ptAMm(pt) * 0.72;

  // --- Los datos, ya escritos como van en la hoja --------------------------------------

  // El tiempo de la tabla con apóstrofe, como en el papel (0, 3’, 6’, 9’)
  function textoDeTiempo(valor) {
    if (typeof valor === 'number') return valor === 0 ? '0' : `${valor}’`;
    return H.textoDeValor(valor, 'texto');
  }

  function prepararDatos(estudio) {
    const campos = {};
    Object.keys(TIPOS).forEach((columna) => { campos[columna] = H.textoDeValor(estudio[columna], TIPOS[columna]); });
    const etapas = [...(estudio.etapas || [])]
      .sort((a, b) => (a.tiempo ?? Infinity) - (b.tiempo ?? Infinity))   // en orden, como en la ficha
      .map((etapa) => COLUMNAS_TABLA.map((c) => (c.columna === 'tiempo' ? textoDeTiempo(etapa.tiempo) : H.textoDeValor(etapa[c.columna], TIPOS[c.columna]))));
    return { campos, etapas };
  }

  // --- Planificar (dónde va cada cosa, sin dibujar) ---------------------------------------
  // estado: lo que el ajuste va cambiando (letra por campo, alto de filas, etc.)

  function planificar(doc, datos, estado) {
    const ops = [];                 // lo que se va a dibujar
    const campos = [];              // cómo quedó cada campo (para el ajuste)
    const continuaciones = [];      // lo que sigue en otra hoja
    let y = D.primeraLinea;         // renglón base de la línea que toca
    let ultimaBase = y;
    let ultimaLinea = y;
    let filas = 0;

    CUERPO.forEach((bloque) => {
      if (bloque.separador) {
        ultimaLinea = ultimaBase + D.separador.debajo;
        ops.push({ t: 'linea', x1: D.margen, y1: ultimaLinea, x2: D.margen + D.ancho, y2: ultimaLinea, grosor: 0.35 });
        y = ultimaLinea + D.separador.despues;
        return;
      }
      if (bloque.rotulo) {
        ops.push({ t: 'texto', x: D.margen, y, texto: bloque.rotulo, pt: D.pt });
        ultimaBase = y;
        y += estado.paso;
        filas++;
        return;
      }
      if (bloque.tabla) {
        const tabla = planificarTabla(doc, datos, estado, ultimaLinea);
        ops.push(...tabla.ops);
        campos.push(tabla.campo);
        if (tabla.continuacion) continuaciones.push(tabla.continuacion);
        ultimaBase = tabla.fondo;
        y = tabla.fondo + D.despuesDeTabla;
        return;
      }
      // Una línea de campos
      let baseMasBaja = y;
      bloque.fila.forEach((campo, i) => {
        const desde = campo.desde ?? (i === 0 ? 0 : bloque.fila[i - 1].hasta);
        const hasta = campo.hasta ?? 1;
        const xIni = D.margen + desde * D.ancho;
        const xFin = D.margen + hasta * D.ancho - (hasta < 1 ? 1.2 : 0);
        const rotulo = campo.texto || `${campo.etiqueta}:`;
        doc.setFont('Arimo', 'normal');
        doc.setFontSize(D.pt);
        ops.push({ t: 'texto', x: xIni, y, texto: rotulo, pt: D.pt });
        if (!campo.columna) return;   // solo el rótulo (POSTESFUERZO A LOS 5’:)
        const xValor = xIni + doc.getTextWidth(rotulo) + 1;
        const pt = estado.pt[campo.columna] ?? D.pt;
        doc.setFontSize(pt);
        const texto = datos.campos[campo.columna];
        const minimos = campo.renglonesMinimos || 1;
        const todos = texto ? H.partirEnRenglones(doc, texto, xFin - xValor - 0.5, xFin - xIni - 0.5) : [];
        const recorte = estado.recorte[campo.columna];
        const recortado = recorte !== undefined && recorte < todos.length;
        const mostrados = recortado ? todos.slice(0, recorte) : todos;
        const inter = interDe(pt);
        const cantidad = Math.max(minimos, mostrados.length + (recortado ? 1 : 0));
        for (let k = 0; k < cantidad; k++) {
          const yk = y + k * inter;
          if (recortado && k === mostrados.length) {
            ops.push({ t: 'marca', x: xIni, y: yk, pt: Math.min(pt, 9), clave: campo.columna });
            continue;
          }
          ops.push({ t: 'puntos', x1: k === 0 ? xValor - 0.3 : xIni, x2: xFin, y: yk });
          if (mostrados[k]) ops.push({ t: 'texto', x: k === 0 ? xValor : xIni, y: yk, texto: mostrados[k], pt });
        }
        baseMasBaja = Math.max(baseMasBaja, y + (cantidad - 1) * inter);
        campos.push({ clave: campo.columna, pt, inter, renglones: todos.length, mostrados: mostrados.length, extra: Math.max(0, todos.length - minimos), recortado });
        if (recortado) continuaciones.push({ clave: campo.columna, titulo: `Continuación de ${NOMBRES[campo.columna]}`, tipo: 'texto', renglones: todos.slice(recorte), pt });
      });
      ultimaBase = baseMasBaja;
      y = baseMasBaja + estado.paso;
      filas++;
    });
    return { ops, campos, continuaciones, fondo: ultimaBase, filas };
  }

  // Alto que necesita cada fila de la tabla y sus renglones por celda
  function medirFilas(doc, filas, pt, altoFila) {
    const ancho = D.ancho / COLUMNAS_TABLA.length;
    doc.setFont('Arimo', 'normal');
    doc.setFontSize(pt);
    return filas.map((celdas) => {
      const renglones = celdas.map((texto) => (texto ? H.partirEnRenglones(doc, texto, ancho - 2) : []));
      const mas = Math.max(1, ...renglones.map((r) => r.length));
      const necesita = (mas - 1) * interDe(pt) + altoMayuscula(pt) + 3;
      return { renglones, alto: Math.max(altoFila, necesita), mas };
    });
  }

  function planificarTabla(doc, datos, estado, lineaDeArriba) {
    const ops = [];
    const pt = estado.ptTabla;
    const tituloY = lineaDeArriba + D.tabla.tituloDespues;
    ops.push({ t: 'centrado', x: D.margen + D.ancho / 2, y: tituloY, texto: 'REPOSO Y ESFUERZO', pt: D.pt, subrayado: true });
    const arriba = tituloY + D.tabla.arriba;
    const filas = [...datos.etapas];
    while (filas.length < D.tabla.filasMinimas) filas.push(COLUMNAS_TABLA.map(() => ''));
    const medidas = medirFilas(doc, filas, pt, estado.altoFila);
    const enHoja1 = Math.min(filas.length, estado.filasTabla);
    const recortada = enHoja1 < filas.length;
    const alturas = medidas.slice(0, enHoja1).map((m) => m.alto);
    if (recortada) alturas.push(estado.altoFila);   // fila de aviso: "la tabla sigue en la hoja N"
    ops.push({ t: 'tabla', arriba, alturas, filas: medidas.slice(0, enHoja1), pt, avisoAl: recortada ? enHoja1 : null });
    const fondo = arriba + D.tabla.altoEncabezado + alturas.reduce((a, b) => a + b, 0);
    const extra = Math.max(0, ...medidas.map((m) => m.mas - 1));
    return {
      ops,
      fondo,
      campo: { clave: 'tabla', pt, inter: interDe(pt), renglones: filas.length, mostrados: enHoja1, extra, recortado: recortada, esTabla: true },
      continuacion: recortada ? { clave: 'tabla', titulo: 'Continuación de Reposo y esfuerzo', tipo: 'tabla', filas: medidas.slice(enHoja1), pt } : null,
    };
  }

  // --- Ajustar hasta que entre en la hoja 1 ------------------------------------------------

  function ajustar(doc, datos) {
    const estado = { pt: {}, ptTabla: D.pt, altoFila: D.tabla.altoFila, paso: D.paso, recorte: {}, filasTabla: Infinity };
    // 0) La tabla primero, y sin tocar ningún texto: con las filas lo más bajas posible
    //    y los textos completos y en letra normal, ¿entran todas las etapas? Las que no
    //    entran siguen en la continuación (quedan por lo menos 4 en la hoja 1). Así un
    //    estudio con muchas etapas nunca le achica la letra ni le quita lugar a un texto.
    const minimo = { ...estado, altoFila: D.tabla.altoFilaMinimo, paso: D.pasoMinimo };
    for (let vuelta = 0; vuelta < 200; vuelta++) {
      const prueba = planificar(doc, datos, minimo);
      const exceso = prueba.fondo - D.limite;
      const tabla = prueba.campos.find((c) => c.esTabla);
      if (exceso <= 0.001 || tabla.mostrados <= D.tabla.filasMinimas) break;
      const quitar = Math.max(1, Math.ceil(exceso / D.tabla.altoFilaMinimo));
      minimo.filasTabla = Math.max(D.tabla.filasMinimas, tabla.mostrados - quitar - (tabla.recortado ? 0 : 1));
    }
    estado.filasTabla = minimo.filasTabla;
    let plan = null;
    for (let vuelta = 0; vuelta < 500; vuelta++) {
      plan = planificar(doc, datos, estado);
      const exceso = plan.fondo - D.limite;
      if (exceso <= 0.001) break;
      const tabla = plan.campos.find((c) => c.esTabla);
      // 1) Filas de la tabla más bajas (no la letra)
      if (estado.altoFila > D.tabla.altoFilaMinimo + 0.001) {
        estado.altoFila = Math.max(D.tabla.altoFilaMinimo, estado.altoFila - exceso / Math.max(1, tabla.mostrados) - 0.01);
        continue;
      }
      // 2) Los renglones de la planilla un poco más juntos
      if (estado.paso > D.pasoMinimo + 0.001) {
        estado.paso = Math.max(D.pasoMinimo, estado.paso - exceso / Math.max(1, plan.filas) - 0.01);
        continue;
      }
      // 3) La letra de ESE campo (el que tiene más renglones de más) más chica
      const largos = plan.campos.filter((c) => c.extra > 0 && c.pt > D.ptMinimo + 0.001)
        .sort((a, b) => b.extra - a.extra || b.renglones - a.renglones);
      if (largos.length) {
        const c = largos[0];
        if (c.esTabla) estado.ptTabla = Math.max(D.ptMinimo, c.pt - 0.5);
        else estado.pt[c.clave] = Math.max(D.ptMinimo, c.pt - 0.5);
        continue;
      }
      // 4) Lo que igual no entra sigue en la hoja de continuación: primero el texto
      //    que más renglones ocupa (queda por lo menos 1 renglón en la hoja 1)
      const textos = plan.campos.filter((c) => !c.esTabla && c.mostrados > 1).sort((a, b) => b.mostrados - a.mostrados);
      if (textos.length) {
        const c = textos[0];
        const quitar = Math.max(1, Math.ceil(exceso / c.inter));
        estado.recorte[c.clave] = Math.max(1, c.mostrados - quitar - (c.recortado ? 0 : 1));
        continue;
      }
      // 5) Las filas de la tabla que no entran, también
      if (tabla.mostrados > 1) {
        const quitar = Math.max(1, Math.ceil(exceso / estado.altoFila));
        estado.filasTabla = Math.max(1, tabla.mostrados - quitar - (tabla.recortado ? 0 : 1));
        continue;
      }
      break;   // no queda nada por ajustar (no debería pasar)
    }
    plan.estado = estado;
    return plan;
  }

  // --- Dibujar ------------------------------------------------------------------------------

  function texto(doc, t, x, y, pt, familia = 'Arimo', estilo = 'normal') {
    doc.setFont(familia, estilo);
    doc.setFontSize(pt);
    doc.text(t, x, y);
  }

  function centrado(doc, t, x, y, pt, familia = 'Arimo', estilo = 'normal', subrayado = false) {
    doc.setFont(familia, estilo);
    doc.setFontSize(pt);
    const w = doc.getTextWidth(t);
    doc.text(t, x - w / 2, y);
    if (subrayado) {
      doc.setLineWidth(0.3);
      doc.line(x - w / 2, y + 1.1, x + w / 2, y + 1.1);
    }
  }

  // La tabla "Reposo y esfuerzo" (también la usa la hoja de continuación)
  function dibujarTabla(doc, arriba, alturas, filas, pt, avisoAl, textoAviso) {
    const ancho = D.ancho / COLUMNAS_TABLA.length;
    const altoTotal = D.tabla.altoEncabezado + alturas.reduce((a, b) => a + b, 0);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(D.margen, arriba, D.ancho, altoTotal);
    for (let c = 1; c < COLUMNAS_TABLA.length; c++) {
      const x = D.margen + c * ancho;
      doc.line(x, arriba, x, arriba + (avisoAl !== null ? altoTotal - alturas[alturas.length - 1] : altoTotal));
    }
    let y = arriba + D.tabla.altoEncabezado;
    doc.line(D.margen, y, D.margen + D.ancho, y);
    COLUMNAS_TABLA.forEach((c, i) => {
      centrado(doc, c.etiqueta, D.margen + (i + 0.5) * ancho, arriba + D.tabla.altoEncabezado / 2 + altoMayuscula(D.pt) / 2, D.pt);
    });
    filas.forEach((fila, f) => {
      const alto = alturas[f];
      fila.renglones.forEach((renglones, i) => {
        const bloque = (renglones.length - 1) * interDe(pt) + altoMayuscula(pt);
        const primera = y + (alto - bloque) / 2 + altoMayuscula(pt);
        renglones.forEach((r, k) => centrado(doc, r, D.margen + (i + 0.5) * ancho, primera + k * interDe(pt), pt));
      });
      y += alto;
      if (f < filas.length - 1 || avisoAl !== null) doc.line(D.margen, y, D.margen + D.ancho, y);
    });
    if (avisoAl !== null) {
      const alto = alturas[alturas.length - 1];
      centrado(doc, textoAviso, D.margen + D.ancho / 2, y + alto / 2 + altoMayuscula(9) / 2, 9, 'Arimo', 'italic');
    }
  }

  // Lo fijo de la hoja 1: marca de agua, banda, logo, título y pie
  function dibujarFondo(doc, recursos) {
    const iso = recursos.logos.isologo;
    const m = D.marcaDeAgua;
    doc.setGState(new doc.GState({ opacity: m.opacidad }));
    doc.addImage(iso.datos, 'PNG', m.x, m.y, m.ancho, m.ancho * iso.alto / iso.ancho, 'isologo', 'SLOW');
    doc.setGState(new doc.GState({ opacity: 1 }));

    const b = D.banda;
    doc.setFillColor(0, 0, 0);
    doc.rect(b.x, b.y, b.ancho, b.alto, 'F');
    doc.setFont('Tinos', 'bold');
    const ptBanda = H.tamanoParaAncho(doc, 'SERVICIO DE CARDIOLOGÍA', b.ancho - 5, b.pt);
    doc.setTextColor(255, 255, 255);
    centrado(doc, 'SERVICIO DE CARDIOLOGÍA', b.x + b.ancho / 2, b.y + b.alto / 2 + altoMayuscula(ptBanda) / 2, ptBanda, 'Tinos', 'bold');
    doc.setTextColor(0, 0, 0);

    const logo = recursos.logos.completo;
    const altoLogo = D.logo.ancho * logo.alto / logo.ancho;
    doc.addImage(logo.datos, 'PNG', D.margen + D.ancho - D.logo.ancho, D.logo.arriba, D.logo.ancho, altoLogo, 'logo', 'SLOW');

    centrado(doc, 'ESTUDIO ERGOMÉTRICO', 105, D.titulo.y, D.titulo.pt, 'Arimo', 'italic', true);

    const p = D.pie;
    doc.setLineWidth(0.5);
    doc.line(D.margen, p.linea1, D.margen + D.ancho, p.linea1);
    centrado(doc, p.nombre, 105, p.nombreY, p.nombrePt, 'Arimo', 'bold');
    doc.setLineWidth(0.3);
    doc.line(D.margen, p.linea2, D.margen + D.ancho, p.linea2);
    doc.setFont('Tinos', 'normal');
    const ptDireccion = H.tamanoParaAncho(doc, p.direccion, D.ancho, p.direccionPt);
    centrado(doc, p.direccion, 105, p.direccionY, ptDireccion, 'Tinos', 'normal', true);
  }

  function dibujarOps(doc, ops, marcas) {
    ops.forEach((op) => {
      if (op.t === 'texto') texto(doc, op.texto, op.x, op.y, op.pt);
      else if (op.t === 'centrado') centrado(doc, op.texto, op.x, op.y, op.pt, 'Arimo', 'normal', op.subrayado);
      else if (op.t === 'puntos') H.renglonDePuntos(doc, op.x1, op.x2, op.y);
      else if (op.t === 'linea') { doc.setLineWidth(op.grosor); doc.line(op.x1, op.y1, op.x2, op.y2); }
      else if (op.t === 'marca') texto(doc, `(sigue en la hoja ${marcas[op.clave]})`, op.x, op.y, op.pt, 'Arimo', 'italic');
      else if (op.t === 'tabla') dibujarTabla(doc, op.arriba, op.alturas, op.filas, op.pt, op.avisoAl, `(la tabla sigue en la hoja ${marcas.tabla})`);
    });
  }

  // Las hojas de continuación: lo que no entró en la hoja 1, completo
  function dibujarContinuaciones(doc, secciones, encabezado) {
    const marcas = {};
    let y = null;
    const hojaNueva = () => {
      doc.addPage('a4', 'portrait');
      y = H.encabezadoChico(doc, encabezado, D.margen) + 10;
    };
    secciones.forEach((s) => {
      if (y === null || y + 25 > D.continuacion.limite) hojaNueva();
      marcas[s.clave] = doc.getNumberOfPages();
      centrado(doc, s.titulo, 105, y, 13, 'Arimo', 'italic', true);
      y += 10;
      if (s.tipo === 'texto') {
        const inter = interDe(s.pt);
        s.renglones.forEach((r) => {
          if (y > D.continuacion.limite) { hojaNueva(); centrado(doc, `${s.titulo} (sigue)`, 105, y, 11, 'Arimo', 'italic'); y += 9; }
          if (r) texto(doc, r, D.margen, y, s.pt);
          y += inter;
        });
        y += 6;
      } else {
        // La tabla: su encabezado y las filas que faltaban (si no entran, sigue en otra hoja)
        let desde = 0;
        while (desde < s.filas.length) {
          let alto = D.tabla.altoEncabezado;
          let hasta = desde;
          while (hasta < s.filas.length && y + alto + s.filas[hasta].alto <= D.continuacion.limite) { alto += s.filas[hasta].alto; hasta++; }
          if (hasta === desde) { hojaNueva(); continue; }
          const filas = s.filas.slice(desde, hasta);
          dibujarTabla(doc, y, filas.map((f) => f.alto), filas, s.pt, null, '');
          y += alto + 8;
          desde = hasta;
        }
      }
    });
    return marcas;
  }

  // --- La hoja completa -----------------------------------------------------------------------

  // Todos los textos que van al PDF (para controlar que la fuente los tenga)
  function textosDe(datos) {
    return [...Object.values(datos.campos), ...datos.etapas.flat()].filter(Boolean);
  }

  // Dibuja la hoja 1 (y, si hace falta, las de continuación). Devuelve cómo quedó
  // (sirve para las pruebas: letra de cada campo, alto de las filas, continuaciones).
  function dibujar(doc, estudio, recursos, encabezado) {
    const datos = prepararDatos(estudio);
    H.controlarCaracteres(doc, [...textosDe(datos), encabezado]);
    const plan = ajustar(doc, datos);
    dibujarFondo(doc, recursos);
    const marcas = plan.continuaciones.length ? dibujarContinuaciones(doc, plan.continuaciones, encabezado) : {};
    doc.setPage(1);
    dibujarOps(doc, plan.ops, marcas);
    doc.setPage(doc.getNumberOfPages());
    return {
      hojas: 1 + (plan.continuaciones.length ? doc.getNumberOfPages() - 1 : 0),
      letra: plan.campos.reduce((a, c) => ({ ...a, [c.clave]: c.pt }), {}),
      altoFila: plan.estado.altoFila,
      paso: plan.estado.paso,
      continuaciones: plan.continuaciones.map((c) => c.titulo),
      fondo: plan.fondo,
    };
  }

  return { dibujar, D };
})();
