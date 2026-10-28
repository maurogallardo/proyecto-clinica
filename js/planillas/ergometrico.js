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

  // Funciones de la base. Parámetros: p_id, p_estudio, p_etapas (las del N° 5 se van
  // a llamar igual, para que la app no necesite ramas)
  base: {
    guardar: 'guardar_estudio',
  },

  // Fotos: cada planilla tiene su tabla de fotos y su espacio de almacenamiento
  //   tabla / columna: la tabla con una fila por foto, y la columna que la une a la planilla
  //   deposito: el espacio de almacenamiento (privado) de los archivos
  //   ruta: dónde va cada archivo ({id}: el de la planilla guardada; {foto}: el de la foto)
  //   tipo: lo que se anota en cada fila (en la demo no se pregunta)
  fotos: {
    tabla: 'imagenes',
    columna: 'estudio_id',
    deposito: 'imagenes-estudios',
    ruta: '{id}/{foto}.webp',
    tipo: 'electro',
  },

  // Datos mínimos para guardar (RF-023). soloCifras: cuenta como vacío si no tiene
  // ningún número (un DNI escrito solo con puntos o espacios)
  datosMinimos: [
    { columna: 'documento', falta: 'el DNI', soloCifras: true },
    { columna: 'nombre_paciente', falta: 'el nombre' },
  ],

  // Textos de pantalla (los huecos entre llaves los completa textoDePlanilla)
  textos: {
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
