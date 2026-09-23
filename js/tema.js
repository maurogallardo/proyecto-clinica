// Modo de color: claro, oscuro o automático (sigue al dispositivo).
//
// Se carga en el <head>, ANTES de dibujar la página, para que no "parpadee" en
// el modo equivocado. La elección se recuerda en este dispositivo.
// Los colores de cada modo están en css/tokens.css; acá solo se elige cuál usar.

(function () {
  const CLAVE = 'tema';
  const MODOS = ['claro', 'oscuro', 'auto'];
  const oscuroDelDispositivo = window.matchMedia('(prefers-color-scheme: dark)');

  // Lo que eligió la persona. Si el navegador no deja guardar (modo privado),
  // la elección vale igual mientras la app esté abierta.
  let eleccion = leerEleccionGuardada();

  function leerEleccionGuardada() {
    try {
      const guardada = localStorage.getItem(CLAVE);
      return MODOS.includes(guardada) ? guardada : 'auto';
    } catch {
      return 'auto';
    }
  }

  function aplicar() {
    const tema = eleccion === 'auto'
      ? (oscuroDelDispositivo.matches ? 'oscuro' : 'claro')
      : eleccion;
    document.documentElement.dataset.tema = tema;

    // La barra superior del celular toma el color del fondo del modo activo
    const colorBarra = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-barra').trim();
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta && colorBarra) meta.setAttribute('content', colorBarra);

    // Avisar a quien le interese (por ejemplo, el selector de modo)
    document.dispatchEvent(new CustomEvent('temacambiado', { detail: { eleccion, tema } }));
  }

  function elegir(modo) {
    if (!MODOS.includes(modo)) return;
    eleccion = modo;
    try {
      localStorage.setItem(CLAVE, modo);
    } catch {
      // Sin permiso para guardar: vale solo para esta visita
    }
    aplicar();
  }

  // En automático, si el dispositivo cambia de modo, la app lo acompaña
  oscuroDelDispositivo.addEventListener('change', () => {
    if (eleccion === 'auto') aplicar();
  });

  aplicar();

  // Lo que el resto de la app puede usar
  window.Tema = {
    elegir,
    eleccion: () => eleccion,
  };
})();
