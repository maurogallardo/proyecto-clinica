// Planilla "Estudio Ergométrico" (Servicio de Cardiología), escrita como configuración.
//
// LA PLANILLA ES EL CONTRATO: mismos campos, mismos nombres y mismo orden que el
// papel (specs/001-estudio-ergometrico/assets/planilla-delacanada.jpg).
// Los nombres van escritos normal; las abreviaturas, como en la planilla.
//
// Cada campo:
//   columna  -> nombre de la columna en la base (supabase/schema.sql)
//   etiqueta -> lo que se ve en pantalla
//   tipo     -> 'texto' (crece al escribir), 'texto-largo', 'entero', 'decimal' o 'fecha'
//   ancho    -> 'completo' ocupa las dos columnas; si no se indica, media
//   valorInicial -> 'hoy' (solo fechas): arranca con la fecha del día
//   mayusculaInicial -> true: al confirmar, la primera letra pasa a mayúscula (solo
//                 esa: el resto del texto no se toca). Textos libres, no nombres.
//
// Sumar otra planilla = escribir otro archivo como este (js/formulario.js no cambia).

const PLANILLA_ERGOMETRICO = {
  id: 'ergometrico',   // con este nombre la función "estructurar" elige su instructivo
  titulo: 'Estudio ergométrico',

  secciones: [
    {
      titulo: 'Paciente',
      campos: [
        { columna: 'documento', etiqueta: 'DNI', tipo: 'texto', teclado: 'numeric', ancho: 'completo' },
        { columna: 'nombre_paciente', etiqueta: 'Paciente', tipo: 'texto', ancho: 'completo' },
        { columna: 'sexo', etiqueta: 'Sexo', tipo: 'texto' },
        { columna: 'edad', etiqueta: 'Edad', tipo: 'entero' },
        { columna: 'peso', etiqueta: 'Peso', tipo: 'decimal' },
        { columna: 'talla', etiqueta: 'Talla', tipo: 'decimal' },
        // En el papel, FECHA va después de TALLA. Arranca con la fecha de hoy y se
        // puede cambiar (el estudio puede cargarse después de hecho). Sin hora:
        // la planilla no la tiene, y creado_en ya guarda fecha y hora de carga.
        { columna: 'fecha_estudio', etiqueta: 'Fecha', tipo: 'fecha', ancho: 'completo', valorInicial: 'hoy' },
      ],
    },
    {
      titulo: 'Estudio',
      campos: [
        { columna: 'medico_solicitante', etiqueta: 'Médico solicitante', tipo: 'texto', ancho: 'completo' },
        { columna: 'motivo', etiqueta: 'Motivo', tipo: 'texto', ancho: 'completo', mayusculaInicial: true },
        { columna: 'antecedentes', etiqueta: 'Antecedentes', tipo: 'texto-largo', ancho: 'completo', mayusculaInicial: true },
        { columna: 'tecnica', etiqueta: 'Técnica', tipo: 'texto' },
        { columna: 'posicion', etiqueta: 'Posición', tipo: 'texto' },
        { columna: 'fc_teorica', etiqueta: 'F.C. teoría', tipo: 'entero' },
        { columna: 'fc_alcanzada', etiqueta: 'F.C. alcanzada', tipo: 'entero' },
        { columna: 'porcentaje', etiqueta: 'Porcentaje', tipo: 'decimal' },
      ],
    },
    {
      titulo: 'ECG basal',
      campos: [
        { columna: 'ecg_ritmo', etiqueta: 'Ritmo', tipo: 'texto' },
        { columna: 'ecg_eje', etiqueta: 'Eje', tipo: 'texto' },
        { columna: 'ecg_fcia', etiqueta: 'FCIA', tipo: 'texto' },
        { columna: 'ecg_p', etiqueta: 'P', tipo: 'texto' },
        { columna: 'ecg_pq', etiqueta: 'PQ', tipo: 'texto' },
        { columna: 'ecg_qrs', etiqueta: 'QRS', tipo: 'texto' },
        { columna: 'ecg_qt', etiqueta: 'QT', tipo: 'texto' },
      ],
    },
    {
      // En la planilla, la conclusión va después del ECG basal y antes de la tabla
      titulo: 'Conclusión',
      campos: [
        { columna: 'conclusion', etiqueta: 'Conclusión', tipo: 'texto-largo', ancho: 'completo', etiquetaOculta: true, mayusculaInicial: true },
      ],
    },
    {
      titulo: 'Reposo y esfuerzo',
      tipo: 'etapas',
    },
    {
      titulo: 'Interrupción y postesfuerzo',
      campos: [
        { columna: 'interrupcion_prueba', etiqueta: 'Interrupción de la prueba', tipo: 'texto-largo', ancho: 'completo', mayusculaInicial: true },
        { subtitulo: "Postesfuerzo a los 5'" },
        { columna: 'post_ta', etiqueta: 'TA', tipo: 'texto' },
        { columna: 'post_fc', etiqueta: 'FC', tipo: 'entero' },
        { columna: 'post_ecg', etiqueta: 'ECG', tipo: 'texto' },
        { columna: 'post_clinica', etiqueta: 'Clínica', tipo: 'texto' },
      ],
    },
  ],

  // Tabla "Reposo y esfuerzo": una tarjeta por etapa (tabla etapas de la base)
  etapas: {
    tabla: 'etapas',        // la tabla de la base
    ordenarPor: 'tiempo',   // en la ficha van en orden de tiempo (las sin tiempo, al final)
    campos: [
      { columna: 'tiempo', etiqueta: 'Tiempo', tipo: 'entero', destacado: true },
      { columna: 'carga', etiqueta: 'Carga', tipo: 'entero', destacado: true },
      { columna: 'met', etiqueta: 'MET', tipo: 'decimal' },
      { columna: 'ta', etiqueta: 'T.A.', tipo: 'texto' },
      { columna: 'fc', etiqueta: 'F.C.', tipo: 'entero' },
      { columna: 'ecg', etiqueta: 'ECG', tipo: 'texto' },
      { columna: 'clinica', etiqueta: 'Clínica', tipo: 'texto' },
    ],
    // Filas que el papel ya trae impresas (tiempo y carga), editables.
    // No es inventar datos: es lo que dice la planilla. El resto arranca vacío.
    iniciales: [
      { tiempo: 0, carga: 0 },
      { tiempo: 3, carga: 50 },
      { tiempo: 6, carga: 100 },
      { tiempo: 9, carga: 150 },
    ],
  },

  // --- Lo que el resto de la app lee de la planilla (Fase 0 del Formulario N° 5) ---

  // La tabla de la base y sus funciones. Parámetros: p_id, p_estudio, p_etapas y, al
  // editar, p_modificado_en (los del N° 5 se van a llamar igual, para que la app no
  // necesite ramas)
  base: {
    tabla: 'estudios',
    guardar: 'guardar_estudio',
    editar: 'editar_estudio',
    anular: 'anular_estudio',         // mandar a la Papelera (solo p_id)
    restaurar: 'restaurar_estudio',   // sacar de la Papelera (solo p_id)
  },

  // Fotos: cada planilla tiene su tabla de fotos y su espacio de almacenamiento
  //   tabla / columna: la tabla con una fila por foto, y la columna que la une a la planilla
  //   deposito: el espacio de almacenamiento (privado) de los archivos
  //   ruta: dónde va cada archivo ({id}: el de la planilla guardada; {foto}: el de la foto)
  //   tipo: lo que se anota en cada fila (en la demo no se pregunta)
  //   seccion: el nombre de la sección de fotos en la ficha
  fotos: {
    tabla: 'imagenes',
    columna: 'estudio_id',
    deposito: 'imagenes-estudios',
    ruta: '{id}/{foto}.webp',
    tipo: 'electro',
    seccion: 'Fotos del electro',
  },

  // La columna con el nombre del paciente (la usan el cartel de "Borrar" y el PDF)
  columnaPaciente: 'nombre_paciente',

  // PDF ("Imprimir" y "Descargar PDF"). La hoja la dibuja js/planillas/ergometrico-hoja.js
  // (anotada en HOJAS_PDF, js/pdf/armado.js)
  //   orientacion: 'vertical' u 'horizontal' (A4)
  //   archivo / columnaFecha: el nombre del archivo es
  //     <archivo>-<número>-<paciente>-<fecha>.pdf, con la fecha de esa columna
  pdf: {
    orientacion: 'vertical',
    archivo: 'Ergometrico',
    columnaFecha: 'fecha_estudio',
  },

  // Datos mínimos para guardar (RF-023). soloCifras: cuenta como vacío si no tiene
  // ningún número (un DNI escrito solo con puntos o espacios)
  datosMinimos: [
    { columna: 'documento', falta: 'el DNI', soloCifras: true },
    { columna: 'nombre_paciente', falta: 'el nombre' },
  ],

  // Lista del dashboard: las columnas, en orden, y en qué se busca
  //   columna: de dónde sale el valor (supabase/schema.sql)
  //   forma: 'fechaHora' (26/09/2026 14:05), 'resumen' (texto largo cortado; entero
  //          al pasar el mouse) o 'fotos' (cuántas fotos tiene); si no, el valor tal cual
  //   ancho / estilo: el ancho de la columna y el aspecto de la celda (css/dashboard.css)
  //   buscar -> soloCifras: se busca por números (el DNI, aunque se escriba con puntos)
  lista: {
    columnas: [
      { columna: 'numero', titulo: 'N°', ancho: 'numero', estilo: 'numero' },
      { columna: 'creado_en', titulo: 'Fecha y hora', forma: 'fechaHora', ancho: 'fecha', estilo: 'fecha' },
      { columna: 'nombre_paciente', titulo: 'Paciente', estilo: 'paciente' },
      { columna: 'documento', titulo: 'DNI', ancho: 'dni', estilo: 'dni' },
      { columna: 'medico_solicitante', titulo: 'Médico solicitante' },
      { columna: 'conclusion', titulo: 'Conclusión', forma: 'resumen', estilo: 'conclusion' },
      { titulo: 'Fotos', forma: 'fotos', ancho: 'fotos', estilo: 'fotos' },
    ],
    buscar: [
      { columna: 'nombre_paciente' },
      { columna: 'documento', soloCifras: true },
    ],
  },

  // Papelera del dashboard: las columnas de la planilla (como en la lista). Después
  // van las de la Papelera, que son iguales en todas: "Borrado por", "Fecha y hora"
  // y el botón "Restaurar" (js/papelera.js)
  papelera: {
    columnas: [
      { columna: 'numero', titulo: 'N°', ancho: 'numero', estilo: 'numero' },
      { columna: 'nombre_paciente', titulo: 'Paciente', estilo: 'paciente' },
      { columna: 'documento', titulo: 'DNI', ancho: 'dni', estilo: 'dni' },
    ],
  },

  // Textos de pantalla (los huecos entre llaves los completa textoDePlanilla)
  textos: {
    // Dashboard: la lista
    antetitulo: 'Servicio de Cardiología',   // arriba del título de cada sección del dashboard
    seccionLista: 'Estudios',                // el botón de la barra lateral
    tituloLista: 'Estudios ergométricos',
    buscarAyuda: 'Buscar por nombre o DNI',
    cargandoLista: 'Cargando estudios…',
    errorLista: 'No se pudieron cargar los estudios. Probá de nuevo.',
    listaVacia: 'Todavía no hay estudios cargados.',
    listaSinCoincidencias: 'Ningún estudio coincide con los filtros.',
    contadorUno: '1 estudio',
    contadorVarios: '{cantidad} estudios',
    enviadoAPapelera: 'Estudio N° {numero} enviado a la Papelera',
    // Dashboard: la ficha (el título sin número es el de la planilla, PLANILLA.titulo)
    tituloFicha: 'Estudio ergométrico · N° {numero}',
    tituloEditando: 'Editando · Estudio ergométrico · N° {numero}',
    cargandoFicha: 'Cargando estudio…',
    errorFicha: 'No se pudo cargar el estudio. Probá de nuevo.',
    noEncontrado: 'No se encontró el estudio (puede que no sea tuyo o que ya no exista).',
    fichaEnPapelera: 'Este estudio está en la Papelera. Para verlo, restauralo desde la Papelera.',
    sinEtapas: 'Sin etapas cargadas.',
    pieNumero: 'N° de estudio',
    borrarTexto: 'El estudio N° {numero}{paciente} deja de verse en la lista y en los números. No se borra: se puede restaurar desde la Papelera.',
    // Dashboard: editar
    guardarCambiosTexto: 'Se van a guardar los cambios del estudio N° {numero}.',
    cambiosGuardados: 'Cambios guardados en el estudio N° {numero}',
    edicionEnPapelera: 'Este estudio está en la Papelera: no se puede editar.',
    edicionCruzada: 'Este estudio lo modificó otra persona o se editó en otra pestaña mientras lo editabas. No se guardó tu cambio. Si cargás la versión nueva, se pierde lo que escribiste acá.',
    // Dashboard: la Papelera (los errores dicen "No se pudo {lo que se hacía}. Probá de nuevo.")
    papeleraAyuda: 'Los estudios borrados quedan acá, con quién los borró y cuándo. No se ven en la lista ni en los números. Para verlos, restauralos.',
    queSeHaciaAnular: 'mandar el estudio a la Papelera',
    queSeHaciaRestaurar: 'restaurar el estudio',
    restaurarEtiqueta: 'Restaurar el estudio N° {numero}',   // lo que lee un lector de pantalla en cada botón
    restaurado: 'Estudio N° {numero} restaurado',
    // PDF: la línea chica arriba de las hojas que no son la 1
    pdfEncabezado: 'Estudio N° {numero} · {paciente}',
    // Carga (celular)
    botonConfirmar: 'Confirmar estudio',
    confirmarTitulo: '¿Confirmar estudio?',
    confirmarTexto: 'Se va a guardar el estudio de {nombre_paciente}.',
    faltanDatos: 'Para guardar, falta {lista} del paciente.',
    guardado: 'Estudio guardado — N° {numero}',
    guardadoSinFotos: 'Estudio guardado — N° {numero}, pero {cuales}',
    seguirSinFotos: 'El estudio N° {numero} ya quedó guardado, pero sin {cuantas}. Si seguís, se borran del celular.',
    cargarOtro: 'Cargar nuevo estudio',
    errorAlGuardar: 'No se pudo guardar el estudio',
    fotosDeMas: 'Máximo {maximo} fotos por estudio: {cuantas}',
    fotosAlMaximo: 'Ya hay {maximo} fotos: es el máximo por estudio.',
    fotosNombre: 'Fotos del estudio',   // lo que lee un lector de pantalla en la tira de miniaturas
  },
};
