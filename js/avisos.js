// Avisos cortos (toast): un mensaje breve arriba de la pantalla, que se va solo.
// Tipos: 'info' (celeste), 'error' (rojo), 'exito' (verde de marca).
// Uso:  mostrarAviso('No se pudo acceder al micrófono', 'error');
// (Como mostrarToast de LoMar.)

let temporizadorAviso = null;

function mostrarAviso(mensaje, tipo = 'info', duracionMs = 3500) {
  const aviso = document.getElementById('aviso');
  document.getElementById('aviso-texto').textContent = mensaje;
  aviso.className = `aviso aviso--${tipo}`;
  // Si ya había un aviso, se reinicia la animación de entrada para el nuevo
  aviso.hidden = true;
  void aviso.offsetWidth;
  aviso.hidden = false;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => { aviso.hidden = true; }, duracionMs);
}
