// Planilla "Formulario N° 5": hoja de indicaciones médicas y controles de
// enfermería de un paciente internado, escrita como configuración (como
// js/planillas/ergometrico.js; los campos se describen ahí).
//
// LA HOJA ES EL CONTRATO: mismos campos, mismos nombres y mismo orden que el papel
// (specs/002-formulario-5/spec.md, "La hoja en papel"). Las abreviaturas van como
// en el papel. Sin DNI (el papel no lo tiene) y sin campo de fecha (la pone la base
// con el reloj al guardar). Las indicaciones médicas van en la grilla de horarios
// (js/grilla.js). Los campos que dependen de [A DEFINIR] (vi) son texto libre.
//
// Columnas de la base: supabase/formulario5.sql, formulario5-turnos.sql y
// formulario5-grilla.sql (tabla hojas_indicaciones; la grilla, en "indicaciones").
//
// Tiene la carga y el guardado (Fase 2), el dashboard: lista, ficha, edición y
// Papelera (Fase 3), y el PDF horizontal (Fase 4: js/planillas/formulario5-hoja.js).

const PLANILLA_FORMULARIO5 = {
  id: 'formulario5',   // con este nombre "transcribir" y "estructurar" eligen lo suyo
  titulo: 'Hoja de indicaciones',

  secciones: [
    {
      // Encabezado del papel: Fecha (la pone la base), Hab., Mutual, Dr., Pte.,
      // Trámite adm. y Diagnóstico. En la ficha de la compu ("ficha"), en dos
      // renglones: los cortos en una línea y el Diagnóstico abajo (js/ficha.js)
      titulo: 'Encabezado',
      ficha: 'encabezado',
      campos: [
        { columna: 'habitacion', etiqueta: 'Hab.', tipo: 'texto' },
        { columna: 'mutual', etiqueta: 'Mutual', tipo: 'texto' },
        { columna: 'doctor', etiqueta: 'Dr.', tipo: 'texto', ancho: 'completo' },
        { columna: 'paciente', etiqueta: 'Pte.', tipo: 'texto', ancho: 'completo' },
        // Texto controlado (RF-018): solo "SÍ" o "NO", sin casilleros. Al confirmar,
        // "si", "Sí" o "no" pasan a "SÍ" o "NO"; otra cosa no se guarda (js/guardado.js)
        { columna: 'tramite_administrativo', etiqueta: 'Trámite adm.', tipo: 'texto', opciones: ['SÍ', 'NO'] },
        { columna: 'diagnostico', etiqueta: 'Diagnóstico', tipo: 'texto-largo', ancho: 'completo', mayusculaInicial: true },
      ],
    },
    {
      // Columna izquierda del papel con la grilla de HORARIOS a la derecha: cada
      // renglón con su texto y sus casillas (06 a 24). La dibuja js/grilla.js y se
      // guarda toda junta en la columna "indicaciones" (supabase/formulario5-grilla.sql).
      // "maximo": los renglones del papel. "inicial": con cuántas tarjetas arranca
      // (si no se indica, 1): Tomografía, Electrocardiograma y Laboratorio arrancan
      // sin ninguna, solo con "+ Agregar renglón". Dieta, sin grilla.
      titulo: 'Indicaciones médicas',
      tipo: 'grilla',
      columna: 'indicaciones',
      indicaciones: [
        { clave: 'csv', etiqueta: 'C.S.V.', maximo: 2 },
        { clave: 'tomografia', etiqueta: 'Tomografía', maximo: 2, inicial: 0 },
        { clave: 'electrocardiograma', etiqueta: 'Electrocardiograma', maximo: 2, inicial: 0 },
        { clave: 'laboratorio', etiqueta: 'Laboratorio', maximo: 2, inicial: 0 },
        { clave: 'medicacion', etiqueta: 'Medicación', maximo: 5, rotulo: 'Remedio', agregar: '+ Agregar remedio' },
      ],
      campos: [
        // Caja de varias líneas, de unas 4 de alto, que crece hacia abajo
        { columna: 'dieta', etiqueta: 'Dieta', tipo: 'texto-largo', renglones: 4, ancho: 'completo', mayusculaInicial: true },
      ],
    },
    {
      // Recuadro grande del papel: el título de la sección ya lo nombra
      titulo: 'Hidratación',
      campos: [
        { columna: 'hidratacion', etiqueta: 'Hidratación', tipo: 'texto-largo', ancho: 'completo', etiquetaOculta: true, mayusculaInicial: true },
      ],
    },
    {
      // Por horario, como en el papel ("05 a 13 =", "13 a 21 =", "21 a 5 =")
      titulo: 'Diuresis',
      campos: [
        { columna: 'diuresis_05_13', etiqueta: '05 a 13', tipo: 'texto' },
        { columna: 'diuresis_13_21', etiqueta: '13 a 21', tipo: 'texto' },
        { columna: 'diuresis_21_05', etiqueta: '21 a 5', tipo: 'texto' },
      ],
    },
    {
      // Por horario, como la Diuresis (en el papel se anota SÍ o NO)
      titulo: 'Drenajes',
      campos: [
        { columna: 'drenajes_05_13', etiqueta: '05 a 13', tipo: 'texto' },
        { columna: 'drenajes_13_21', etiqueta: '13 a 21', tipo: 'texto' },
        { columna: 'drenajes_21_05', etiqueta: '21 a 5', tipo: 'texto' },
      ],
    },
    {
      // Por horario (en el papel, + o − y una descripción: "sanguinolento")
      titulo: 'SNG / Vómitos',
      campos: [
        { columna: 'sng_vomitos_05_13', etiqueta: '05 a 13', tipo: 'texto' },
        { columna: 'sng_vomitos_13_21', etiqueta: '13 a 21', tipo: 'texto' },
        { columna: 'sng_vomitos_21_05', etiqueta: '21 a 5', tipo: 'texto' },
      ],
    },
    {
      // Por horario (en el papel, X o XX)
      titulo: 'Deposiciones',
      campos: [
        { columna: 'deposiciones_05_13', etiqueta: '05 a 13', tipo: 'texto' },
        { columna: 'deposiciones_13_21', etiqueta: '13 a 21', tipo: 'texto' },
        { columna: 'deposiciones_21_05', etiqueta: '21 a 5', tipo: 'texto' },
      ],
    },
    {
      // Por turno (Mañana, Tarde y Noche, como en el papel): F.R., Te., P., T.A. y O2.
      // En la ficha de la compu ("ficha"), un cuadro chico: un renglón por turno
      titulo: 'Controles de enfermería',
      ficha: 'turnos',
      campos: [
        { subtitulo: 'Mañana' },
        { columna: 'control_manana_fr', etiqueta: 'F.R.', tipo: 'texto' },
        { columna: 'control_manana_te', etiqueta: 'Te.', tipo: 'texto' },
        { columna: 'control_manana_p', etiqueta: 'P.', tipo: 'texto' },
        { columna: 'control_manana_ta', etiqueta: 'T.A.', tipo: 'texto' },
        { columna: 'control_manana_o2', etiqueta: 'O2', tipo: 'texto' },
        { subtitulo: 'Tarde' },
        { columna: 'control_tarde_fr', etiqueta: 'F.R.', tipo: 'texto' },
        { columna: 'control_tarde_te', etiqueta: 'Te.', tipo: 'texto' },
        { columna: 'control_tarde_p', etiqueta: 'P.', tipo: 'texto' },
        { columna: 'control_tarde_ta', etiqueta: 'T.A.', tipo: 'texto' },
        { columna: 'control_tarde_o2', etiqueta: 'O2', tipo: 'texto' },
        { subtitulo: 'Noche' },
        { columna: 'control_noche_fr', etiqueta: 'F.R.', tipo: 'texto' },
        { columna: 'control_noche_te', etiqueta: 'Te.', tipo: 'texto' },
        { columna: 'control_noche_p', etiqueta: 'P.', tipo: 'texto' },
        { columna: 'control_noche_ta', etiqueta: 'T.A.', tipo: 'texto' },
        { columna: 'control_noche_o2', etiqueta: 'O2', tipo: 'texto' },
      ],
    },
  ],

  // Sin etapas: la hoja no tiene tabla "Reposo y esfuerzo" (ni tabla de etapas en
  // la base). Sin campos ni filas, js/formulario.js no dibuja nada, y sin "tabla"
  // la ficha no las pide (js/ficha.js)
  etapas: {
    campos: [],
    iniciales: [],
  },

  // --- Lo que el resto de la app lee de la planilla ---

  // La tabla de la base y sus funciones (supabase/formulario5.sql). Mismos
  // parámetros que las del ergométrico: p_id, p_estudio, p_etapas y, al editar,
  // p_modificado_en
  base: {
    tabla: 'hojas_indicaciones',
    guardar: 'guardar_hoja',
    editar: 'editar_hoja',
    anular: 'anular_hoja',
    restaurar: 'restaurar_hoja',
  },

  // Fotos (como en el ergométrico): su tabla, su depósito privado y su carpeta.
  // "adjunto": todavía no se sabe qué se va a fotografiar
  fotos: {
    tabla: 'hojas_imagenes',
    columna: 'hoja_id',
    deposito: 'imagenes-hojas',
    ruta: '{id}/{foto}.webp',
    tipo: 'adjunto',
    seccion: 'Fotos de la hoja',
  },

  // La columna con el nombre del paciente (la usan el cartel de "Borrar" y el PDF)
  columnaPaciente: 'paciente',

  // Tiempo real (T023): con el dashboard abierto, la lista se pone al día sola y la
  // ficha avisa si hay una versión nueva (js/tiempo-real.js). La tabla está en la
  // publicación de Realtime (supabase/formulario5.sql)
  tiempoReal: true,

  // PDF ("Imprimir" y "Descargar PDF"), como en el ergométrico. La hoja la dibuja
  // js/planillas/formulario5-hoja.js (anotada en HOJAS_PDF, js/pdf/armado.js). A4
  // horizontal, como el papel. Archivo: Formulario5-<número>-<paciente>-<fecha>.pdf,
  // con la fecha de la hoja ("fecha", la pone la base al guardar)
  pdf: {
    orientacion: 'horizontal',
    archivo: 'Formulario5',
    columnaFecha: 'fecha',
  },

  // Datos mínimos para guardar (decidido por Mauro): paciente y habitación. Los
  // controla la app; la base no
  datosMinimos: [
    { columna: 'paciente', falta: 'el paciente' },
    { columna: 'habitacion', falta: 'la habitación' },
  ],

  // Lista del dashboard (como en js/planillas/ergometrico.js): columnas en orden y
  // en qué se busca. Fecha y hora de CARGA (creado_en): la misma fecha que usan los
  // números, el calendario y el orden. Hab. usa el ancho y el estilo de la columna
  // DNI del ergométrico (un valor corto, sin cortar el renglón).
  lista: {
    columnas: [
      { columna: 'numero', titulo: 'N°', ancho: 'numero', estilo: 'numero' },
      { columna: 'creado_en', titulo: 'Fecha y hora', forma: 'fechaHora', ancho: 'fecha', estilo: 'fecha' },
      { columna: 'habitacion', titulo: 'Hab.', ancho: 'dni', estilo: 'dni' },
      { columna: 'paciente', titulo: 'Paciente', estilo: 'paciente' },
      { columna: 'doctor', titulo: 'Dr.' },
      { columna: 'diagnostico', titulo: 'Diagnóstico', forma: 'resumen', estilo: 'conclusion' },
      { titulo: 'Fotos', forma: 'fotos', ancho: 'fotos', estilo: 'fotos' },
    ],
    // Las dos como texto (la habitación puede ser "12 B")
    buscar: [
      { columna: 'paciente' },
      { columna: 'habitacion' },
    ],
  },

  // Papelera del dashboard: las columnas de la planilla (después van las de la
  // Papelera, iguales en todas: "Borrado por", "Fecha y hora" y "Restaurar")
  papelera: {
    columnas: [
      { columna: 'numero', titulo: 'N°', ancho: 'numero', estilo: 'numero' },
      { columna: 'paciente', titulo: 'Paciente', estilo: 'paciente' },
      { columna: 'habitacion', titulo: 'Hab.', ancho: 'dni', estilo: 'dni' },
    ],
  },

  // Textos de pantalla (los huecos entre llaves los completa textoDePlanilla). Sin
  // "sinEtapas" (no tiene etapas)
  textos: {
    // Dashboard: la lista
    antetitulo: 'Formulario N° 5',   // arriba del título de cada sección del dashboard
    seccionLista: 'Hojas',           // el botón de la barra lateral
    tituloLista: 'Hojas de indicaciones',
    buscarAyuda: 'Buscar por paciente o habitación',
    cargandoLista: 'Cargando hojas…',
    errorLista: 'No se pudieron cargar las hojas. Probá de nuevo.',
    listaVacia: 'Todavía no hay hojas cargadas.',
    listaSinCoincidencias: 'Ninguna hoja coincide con los filtros.',
    contadorUno: '1 hoja',
    contadorVarios: '{cantidad} hojas',
    enviadoAPapelera: 'Hoja N° {numero} enviada a la Papelera',
    // Dashboard: la ficha (el título sin número es el de la planilla, PLANILLA.titulo)
    tituloFicha: 'Hoja de indicaciones · N° {numero}',
    tituloEditando: 'Editando · Hoja de indicaciones · N° {numero}',
    cargandoFicha: 'Cargando hoja…',
    errorFicha: 'No se pudo cargar la hoja. Probá de nuevo.',
    noEncontrado: 'No se encontró la hoja (puede que no sea tuya o que ya no exista).',
    fichaEnPapelera: 'Esta hoja está en la Papelera. Para verla, restaurala desde la Papelera.',
    pieNumero: 'N° de hoja',
    borrarTexto: 'La hoja N° {numero}{paciente} deja de verse en la lista y en los números. No se borra: se puede restaurar desde la Papelera.',
    // Dashboard: editar
    guardarCambiosTexto: 'Se van a guardar los cambios de la hoja N° {numero}.',
    cambiosGuardados: 'Cambios guardados en la hoja N° {numero}',
    edicionEnPapelera: 'Esta hoja está en la Papelera: no se puede editar.',
    // Dashboard: tiempo real (js/tiempo-real.js)
    versionNueva: 'Hay una versión nueva de esta hoja: se cambió en otra pestaña o en otro dispositivo.',
    versionNuevaBoton: 'Cargar la versión nueva',
    enVivoCortado: 'Se cortó la conexión: la lista puede no estar al día. Se reconecta sola.',
    enVivoVolvio: 'Volvió la conexión: la lista está al día.',
    enVivoSinPonerAlDia: 'No se pudo poner al día la lista. Tocá "Actualizar".',
    edicionCruzada: 'Esta hoja la modificó otra persona o se editó en otra pestaña mientras la editabas. No se guardó tu cambio. Si cargás la versión nueva, se pierde lo que escribiste acá.',
    // Dashboard: la Papelera (los errores dicen "No se pudo {lo que se hacía}. Probá de nuevo.")
    papeleraAyuda: 'Las hojas borradas quedan acá, con quién las borró y cuándo. No se ven en la lista ni en los números. Para verlas, restauralas.',
    queSeHaciaAnular: 'mandar la hoja a la Papelera',
    queSeHaciaRestaurar: 'restaurar la hoja',
    restaurarEtiqueta: 'Restaurar la hoja N° {numero}',   // lo que lee un lector de pantalla en cada botón
    restaurado: 'Hoja N° {numero} restaurada',
    // PDF: la línea chica arriba de las hojas que no son la 1
    pdfEncabezado: 'Hoja N° {numero} · {paciente}',
    // PDF: un símbolo que la fuente no tiene (no se arma el PDF)
    pdfSimbolo: 'La hoja tiene un símbolo que no se puede poner en el PDF ("{simbolo}"). Cambialo con "Editar" y probá de nuevo.',
    // Carga (celular)
    antetituloCarga: 'Formulario N° 5',   // chico y tenue, arriba de "HOJA DE INDICACIONES"
    botonConfirmar: 'Confirmar hoja',
    confirmarTitulo: '¿Confirmar hoja?',
    confirmarTexto: 'Se va a guardar la hoja de {paciente}.',
    faltanDatos: 'Para guardar, falta {lista}.',
    guardado: 'Hoja guardada — N° {numero}',
    guardadoSinFotos: 'Hoja guardada — N° {numero}, pero {cuales}',
    seguirSinFotos: 'La hoja N° {numero} ya quedó guardada, pero sin {cuantas}. Si seguís, se borran del celular.',
    cargarOtro: 'Cargar nueva hoja',
    errorAlGuardar: 'No se pudo guardar la hoja',
    fotosDeMas: 'Máximo {maximo} fotos por hoja: {cuantas}',
    fotosAlMaximo: 'Ya hay {maximo} fotos: es el máximo por hoja.',
    fotosNombre: 'Fotos de la hoja',   // lo que lee un lector de pantalla en la tira de miniaturas
  },
};
