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
