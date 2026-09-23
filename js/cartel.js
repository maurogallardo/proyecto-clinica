// Cartel de confirmación reutilizable (copia del modal de LoMar).
// Uso:  const si = await preguntar({ titulo, texto, textoConfirmar, peligro });
// Devuelve true si la persona confirma; false si toca "Volver", afuera o Escape.
// Lo van a usar también "¿Confirmar estudio?" (T022/T024).

function preguntar({ titulo, texto, textoConfirmar = 'Aceptar', peligro = false }) {
  const velo = document.getElementById('cartel');
  const botonVolver = document.getElementById('cartel-volver');
  const botonConfirmar = document.getElementById('cartel-confirmar');
  const focoAnterior = document.activeElement;

  document.getElementById('cartel-titulo').textContent = titulo;
  document.getElementById('cartel-texto').textContent = texto;
  botonConfirmar.textContent = textoConfirmar;
  botonConfirmar.className = `cartel__boton ${peligro ? 'cartel__boton--peligro' : 'cartel__boton--primario'}`;

  return new Promise((responder) => {
    function cerrar(respuesta) {
      velo.hidden = true;
      botonVolver.removeEventListener('click', alVolver);
      botonConfirmar.removeEventListener('click', alConfirmar);
      velo.removeEventListener('click', alTocarAfuera);
      document.removeEventListener('keydown', alTecla);
      if (focoAnterior && focoAnterior.isConnected) focoAnterior.focus();
      responder(respuesta);
    }
    const alVolver = () => cerrar(false);
    const alConfirmar = () => cerrar(true);
    const alTocarAfuera = (evento) => { if (evento.target === velo) cerrar(false); };
    const alTecla = (evento) => { if (evento.key === 'Escape') cerrar(false); };

    botonVolver.addEventListener('click', alVolver);
    botonConfirmar.addEventListener('click', alConfirmar);
    velo.addEventListener('click', alTocarAfuera);
    document.addEventListener('keydown', alTecla);
    velo.hidden = false;
    // El foco arranca en "Volver": la opción que no borra nada
    botonVolver.focus();
  });
}
