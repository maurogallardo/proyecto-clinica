// Sesión del usuario con Supabase Auth: entrar, salir y saber si hay sesión.
// La librería guarda la sesión en el dispositivo y la renueva sola, así que
// al reabrir la app no hace falta volver a ingresar.

const clienteSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_CLAVE_PUBLICA);

const Sesion = {
  // Devuelve la sesión abierta en este dispositivo, o null si no hay
  async actual() {
    const { data } = await clienteSupabase.auth.getSession();
    return data.session;
  },

  // Ingreso con correo y contraseña. Devuelve null si salió bien, o un
  // mensaje de error en criollo para mostrar en pantalla.
  async entrar(correo, contrasena) {
    if (!navigator.onLine) return 'Sin conexión. Revisá internet e intentá de nuevo.';
    try {
      const { error } = await clienteSupabase.auth.signInWithPassword({
        email: correo,
        password: contrasena,
      });
      return error ? traducirError(error) : null;
    } catch {
      return 'Sin conexión. Revisá internet e intentá de nuevo.';
    }
  },

  // Cierra la sesión SOLO en este dispositivo (la misma cuenta puede estar
  // abierta en el celular y en la compu, y no queremos cerrar la otra).
  async salir() {
    await clienteSupabase.auth.signOut({ scope: 'local' });
  },

  // Avisa cuando la sesión se cierra sola (por ejemplo, si venció y no se pudo renovar)
  alCerrarse(funcion) {
    clienteSupabase.auth.onAuthStateChange((evento) => {
      if (evento === 'SIGNED_OUT') funcion();
    });
  },
};

// Pasa los errores de Supabase a mensajes que se entienden
function traducirError(error) {
  if (error.code === 'invalid_credentials') return 'Correo o contraseña incorrectos';
  if (error.code === 'email_not_confirmed') return 'El usuario no está confirmado. Avisale al administrador.';
  if (error.status === 429) return 'Demasiados intentos. Esperá un momento y probá de nuevo.';
  if (!error.status) return 'Sin conexión. Revisá internet e intentá de nuevo.';
  return 'No se pudo ingresar. Intentá de nuevo.';
}
