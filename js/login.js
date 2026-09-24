// Pantalla de login (T048): lógica copiada de LoMar (bindLogin y bindTogglePassword),
// conectada a Supabase Auth en lugar de n8n. Sin "crear cuenta": el alta la hace
// el administrador (RF-001).

function prepararLogin() {
  const formulario = document.getElementById('login-formulario');
  const campoCorreo = document.getElementById('login-correo');
  const campoContrasena = document.getElementById('login-contrasena');
  const boton = document.getElementById('login-entrar');
  const error = document.getElementById('login-error');

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();   // el formulario no recarga la página
    error.hidden = true;

    const correo = campoCorreo.value.trim();
    const contrasena = campoContrasena.value;
    if (!correo || !contrasena) {
      mostrarError('Completá correo y contraseña');
      return;
    }

    boton.disabled = true;
    boton.textContent = 'Entrando...';
    const mensajeDeError = await Sesion.entrar(correo, contrasena);
    boton.disabled = false;
    boton.textContent = 'Entrar';

    if (mensajeDeError) {
      mostrarError(mensajeDeError);
      return;
    }

    campoContrasena.value = '';
    // Toque corto al entrar (como LoMar): el navegador lo permite porque hubo un toque
    if ('vibrate' in navigator) {
      try { navigator.vibrate(40); } catch { /* sin vibración, no pasa nada */ }
    }
    await entrarALaApp();
  });

  function mostrarError(texto) {
    error.textContent = texto;
    error.hidden = false;
  }
}

// Ojito: muestra u oculta la contraseña (igual que LoMar)
function prepararOjitoContrasena() {
  const boton = document.getElementById('login-ver-contrasena');
  const campo = document.getElementById('login-contrasena');
  boton.addEventListener('click', () => {
    const estabaOculta = campo.type === 'password';
    campo.type = estabaOculta ? 'text' : 'password';
    boton.classList.toggle('esta-visible', estabaOculta);
    boton.setAttribute('aria-label', estabaOculta ? 'Ocultar contraseña' : 'Mostrar contraseña');
  });
}

// Después del login: la pantalla de carga del estudio (T013)
async function entrarALaApp() {
  const sesion = await Sesion.actual();
  const correo = document.getElementById('menu-correo');
  if (correo && sesion) correo.textContent = sesion.user.email;
  mostrarPantalla(PANTALLA_PRINCIPAL);
}

// Botón "Cerrar sesión" del menú del encabezado
function prepararCerrarSesion() {
  const boton = document.getElementById('boton-cerrar-sesion');
  if (!boton) return;
  boton.addEventListener('click', async () => {
    boton.disabled = true;
    await Sesion.salir();
    boton.disabled = false;
    // El aviso de "sesión cerrada" (Sesion.alCerrarse) lleva al login
  });
}

prepararLogin();
prepararOjitoContrasena();
prepararCerrarSesion();

// Si la sesión se cierra (con el botón o porque venció), volver al login limpio.
// El formulario, cualquier audio grabado y las fotos también se borran: si entra
// otra persona en el mismo dispositivo, no ve ni escucha lo que había quedado.
Sesion.alCerrarse(() => {
  abrirMenu(false);
  reiniciarGrabacion();
  reiniciarCarga();
  reiniciarFotos();
  olvidarEstudioEnCurso();
  document.getElementById('login-formulario').reset();
  document.getElementById('login-contrasena').type = 'password';
  document.getElementById('login-ver-contrasena').classList.remove('esta-visible');
  document.getElementById('login-error').hidden = true;
  mostrarPantalla('login');
});
