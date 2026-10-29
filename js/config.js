// Datos de conexión a Supabase.
//
// Estos dos datos son PÚBLICOS a propósito: cualquier app web de Supabase los
// lleva en el navegador. Lo que protege los datos es el login, las reglas de
// Row Level Security (supabase/seguridad.sql) y que el registro esté cerrado.
//
// NUNCA poner acá (ni en ningún archivo del repo) la clave secreta (secret /
// service_role) ni la contraseña de la base de datos.

const SUPABASE_URL = 'https://lbqcjzvemqgzgwibueay.supabase.co';
const SUPABASE_CLAVE_PUBLICA = 'sb_publishable_tKsWvPdzKKeP8JpeAmAeWg_joURqZb5';

// Interruptor de la planilla que muestra la app (T002 del Formulario N° 5).
// 'ergometrico' = Estudio Ergométrico. Es una línea de configuración: el usuario no
// la ve ni la puede cambiar. La planilla elegida la arma js/planillas/activa.js.
const PLANILLA_ACTIVA = 'formulario5';
