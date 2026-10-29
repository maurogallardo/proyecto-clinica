// Planilla "Formulario N° 5": hoja de indicaciones médicas y controles de
// enfermería de un paciente internado, escrita como configuración (como
// js/planillas/ergometrico.js; los campos se describen ahí).
//
// LA HOJA ES EL CONTRATO: mismos campos, mismos nombres y mismo orden que el papel
// (specs/002-formulario-5/spec.md, "La hoja en papel"). Las abreviaturas van como
// en el papel. Sin DNI (el papel no lo tiene), sin campo de fecha (la pone la base
// con el reloj al guardar) y sin la grilla de horarios (bloqueada hasta definir
// (i) y (ii)). Los campos que dependen de [A DEFINIR] (vi) son texto libre.
//
// Columnas de la base: supabase/formulario5.sql y supabase/formulario5-turnos.sql
// (tabla hojas_indicaciones; 40 campos del papel).
//
// Por ahora tiene lo de la carga y el guardado (Fase 2). La lista del dashboard,
// la ficha, la Papelera y el PDF se suman en las Fases 3 y 4: hasta entonces el
// interruptor PLANILLA_ACTIVA (js/config.js) sigue en 'ergometrico'.

const PLANILLA_FORMULARIO5 = {
  id: 'formulario5',   // con este nombre "transcribir" y "estructurar" eligen lo suyo
  titulo: 'Hoja de indicaciones',

  secciones: [
    {
      // Encabezado del papel: Fecha (la pone la base), Hab., Mutual, Dr., Pte.,
      // Trámite adm. y Diagnóstico
      titulo: 'Encabezado',
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
      // Columna izquierda del papel (cuántos renglones tiene cada una en el papel)
      titulo: 'Indicaciones médicas',
      campos: [
        { columna: 'csv', etiqueta: 'C.S.V.', tipo: 'texto-largo', ancho: 'completo', mayusculaInicial: true },                         // 2
        { columna: 'tomografia', etiqueta: 'Tomografía', tipo: 'texto-largo', ancho: 'completo', mayusculaInicial: true },               // 2
        { columna: 'electrocardiograma', etiqueta: 'Electrocardiograma', tipo: 'texto-largo', ancho: 'completo', mayusculaInicial: true }, // 2
        { columna: 'laboratorio', etiqueta: 'Laboratorio', tipo: 'texto-largo', ancho: 'completo', mayusculaInicial: true },             // 2
        { columna: 'medicacion', etiqueta: 'Medicación', tipo: 'texto-largo', ancho: 'completo', mayusculaInicial: true },               // 5
        { columna: 'dieta', etiqueta: 'Dieta', tipo: 'texto', ancho: 'completo', mayusculaInicial: true },                               // 1
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
      // Por turno (Mañana, Tarde y Noche, como en el papel): F.R., Te., P., T.A. y O2
      titulo: 'Controles de enfermería',
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

  // Datos mínimos para guardar (decidido por Mauro): paciente y habitación. Los
  // controla la app; la base no
  datosMinimos: [
    { columna: 'paciente', falta: 'el paciente' },
    { columna: 'habitacion', falta: 'la habitación' },
  ],

  // Textos de pantalla de la carga y el guardado (los huecos entre llaves los
  // completa textoDePlanilla)
  textos: {
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
