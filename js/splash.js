// Arranque de la app, como en LoMar:
//   - Si ya había una sesión abierta en este dispositivo, se saltea el splash
//     y el login, y va directo a la app.
//   - Si no, el splash (ya visible en index.html) queda 2,5 segundos y pasa al login.
// La animación del logo y el halo es solo CSS (css/splash.css) y termina a los ~1,7 s.

const DURACION_SPLASH_MS = 2500;

async function arrancar() {
  let sesion = null;
  try {
    sesion = await Sesion.actual();
  } catch {
    // Si no se puede leer la sesión, se sigue por el login
  }

  if (sesion) {
    await entrarALaApp();
    return;
  }
  // Solo pasa al login si el splash sigue en pantalla: si mientras tanto la app
  // ya fue a otra pantalla, el reloj no la pisa (LoMar cancelaba el reloj al entrar).
  setTimeout(() => {
    if (!document.getElementById('splash').hidden) mostrarPantalla('login');
  }, DURACION_SPLASH_MS);
}

arrancar();
