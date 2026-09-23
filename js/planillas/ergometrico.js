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
//
// Sumar otra planilla = escribir otro archivo como este (js/formulario.js no cambia).

const PLANILLA_ERGOMETRICO = {
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
      ],
    },
    {
      titulo: 'Estudio',
      campos: [
        { columna: 'fecha_estudio', etiqueta: 'Fecha', tipo: 'fecha', ancho: 'completo' },
        { columna: 'medico_solicitante', etiqueta: 'Médico solicitante', tipo: 'texto', ancho: 'completo' },
        { columna: 'motivo', etiqueta: 'Motivo', tipo: 'texto', ancho: 'completo' },
        { columna: 'antecedentes', etiqueta: 'Antecedentes', tipo: 'texto-largo', ancho: 'completo' },
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
        { columna: 'conclusion', etiqueta: 'Conclusión', tipo: 'texto-largo', ancho: 'completo', etiquetaOculta: true },
      ],
    },
    {
      titulo: 'Reposo y esfuerzo',
      tipo: 'etapas',
    },
    {
      titulo: 'Interrupción y postesfuerzo',
      campos: [
        { columna: 'interrupcion_prueba', etiqueta: 'Interrupción de la prueba', tipo: 'texto-largo', ancho: 'completo' },
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
};
