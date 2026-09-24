// Cartel de confirmación reutilizable (copia del modal de LoMar).
// Uso:  const si = await preguntar({ titulo, texto, textoConfirmar, ... });
// Devuelve true si la persona toca el botón principal; false si toca el otro
// (o, si el cartel se puede cancelar, si toca afuera o aprieta Escape), y
// 'tercero' si toca el tercer botón (solo si se pidió).
//
// Opciones:
//   titulo, texto        lo que dice el cartel (texto puede quedar vacío)
//   textoConfirmar       botón principal (por defecto "Aceptar")
//   textoVolver          el otro botón (por defecto "Volver")
//   textoTercero         un tercer botón, debajo de los otros (va con columna: true)
//   peligro              true: botón principal en rojo (acciones que borran datos)
//   icono                'exito' (check en verde de marca) o 'error' (en rojo)
//   columna              true: botones uno arriba del otro, el principal arriba
//   cancelable           false: no se cierra tocando afuera ni con Escape
//   enfocar              'volver' (por defecto: lo que no borra) o 'confirmar'

const ICONOS_CARTEL = {
  exito: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>',
  error: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="6" x2="12" y2="13" /><line x1="12" y1="18" x2="12" y2="18" /></svg>',
};

function preguntar({
  titulo, texto = '', textoConfirmar = 'Aceptar', textoVolver = 'Volver', textoTercero = '',
  peligro = false, icono = null, columna = false, cancelable = true, enfocar = 'volver',
}) {
  const velo = document.getElementById('cartel');
  const botonVolver = document.getElementById('cartel-volver');
  const botonConfirmar = document.getElementById('cartel-confirmar');
  const botonTercero = document.getElementById('cartel-tercero');
  const lugarIcono = document.getElementById('cartel-icono');
  const parrafo = document.getElementById('cartel-texto');
  const focoAnterior = document.activeElement;

  document.getElementById('cartel-titulo').textContent = titulo;
  parrafo.textContent = texto;
  parrafo.hidden = !texto;
  botonVolver.textContent = textoVolver;
  botonConfirmar.textContent = textoConfirmar;
  botonConfirmar.className = `cartel__boton ${peligro ? 'cartel__boton--peligro' : 'cartel__boton--primario'}`;
  botonTercero.textContent = textoTercero;
  botonTercero.hidden = !textoTercero;
  lugarIcono.hidden = !icono;
  lugarIcono.className = icono ? `cartel__icono cartel__icono--${icono}` : 'cartel__icono';
  lugarIcono.innerHTML = icono ? ICONOS_CARTEL[icono] : '';
  document.querySelector('#cartel .cartel__acciones').classList.toggle('cartel__acciones--columna', columna);

  return new Promise((responder) => {
    function cerrar(respuesta) {
      velo.hidden = true;
      botonVolver.removeEventListener('click', alVolver);
      botonConfirmar.removeEventListener('click', alConfirmar);
      botonTercero.removeEventListener('click', alTercero);
      velo.removeEventListener('click', alTocarAfuera);
      document.removeEventListener('keydown', alTecla);
      if (focoAnterior && focoAnterior.isConnected) focoAnterior.focus();
      responder(respuesta);
    }
    const alVolver = () => cerrar(false);
    const alConfirmar = () => cerrar(true);
    const alTercero = () => cerrar('tercero');
    const alTocarAfuera = (evento) => { if (cancelable && evento.target === velo) cerrar(false); };
    const alTecla = (evento) => { if (cancelable && evento.key === 'Escape') cerrar(false); };

    botonVolver.addEventListener('click', alVolver);
    botonConfirmar.addEventListener('click', alConfirmar);
    botonTercero.addEventListener('click', alTercero);
    velo.addEventListener('click', alTocarAfuera);
    document.addEventListener('keydown', alTecla);
    velo.hidden = false;
    (enfocar === 'confirmar' ? botonConfirmar : botonVolver).focus();
  });
}
