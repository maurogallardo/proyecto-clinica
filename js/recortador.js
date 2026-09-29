// Recortador de la foto de perfil (T053). Solo para la foto de perfil (no para
// las fotos del electro) y solo en la compu (mouse). Hecho acá, sin librería.
//
// Se abre un recuadro con la foto y un círculo: se hace zoom con la ruedita del
// mouse, con la barrita o con "−" y "+", y se arrastra la foto en todas las
// direcciones. La foto SIEMPRE cubre todo el círculo (nunca quedan huecos).
// "Guardar" devuelve lo que se ve en el círculo, en un cuadrado de 1024 px (el
// círculo lo pone la pantalla al mostrarla); "Cancelar" o Esc no devuelven nada.
// Para que salga nítida, la foto grande se achica por pasos (a la mitad cada vez)
// hasta el tamaño final, en lugar de achicarla de golpe.
// Recortador.abrir(archivo) -> Promise<Blob | null>

const Recortador = (() => {
  const LADO_SALIDA = 1024;
  const ZOOM_MAXIMO = 4;
  const $ = (id) => document.getElementById(id);
  const el = {
    ventana: $('recortador'),
    area: $('recortador-area'),
    lienzo: $('recortador-lienzo'),
    barra: $('recortador-barra'),
    alejar: $('recortador-alejar'),
    acercar: $('recortador-acercar'),
    guardar: $('recortador-guardar'),
    cancelar: $('recortador-cancelar'),
  };

  let imagen = null;      // la foto, ya girada según cómo se sacó
  let zoom = 1;           // 1 = la foto justo cubre el círculo
  let dx = 0;             // corrimiento del centro de la foto respecto del centro del círculo
  let dy = 0;
  let responder = null;
  let focoAnterior = null;

  // Medidas en píxeles de pantalla (el lienzo se dibuja más fino según la pantalla).
  // El lado es el menor entre ancho y alto: el cuadro es cuadrado, pero por las dudas.
  const lado = () => Math.min(el.area.clientWidth, el.area.clientHeight) || el.area.clientWidth;
  const diametro = () => lado() * 0.82;
  const escalaBase = () => diametro() / Math.min(imagen.width, imagen.height);   // con zoom 1 cubre justo

  // La foto nunca puede dejar huecos en el círculo
  function acomodar() {
    const escala = escalaBase() * zoom;
    const sobraX = Math.max(0, (imagen.width * escala - diametro()) / 2);
    const sobraY = Math.max(0, (imagen.height * escala - diametro()) / 2);
    dx = Math.min(sobraX, Math.max(-sobraX, dx));
    dy = Math.min(sobraY, Math.max(-sobraY, dy));
  }

  function dibujar() {
    const densidad = window.devicePixelRatio || 1;
    const l = lado();
    const pixeles = Math.round(l * densidad);
    if (el.lienzo.width !== pixeles || el.lienzo.height !== pixeles) {   // siempre cuadrado
      el.lienzo.width = pixeles;
      el.lienzo.height = pixeles;
    }
    const pincel = el.lienzo.getContext('2d');
    pincel.setTransform(densidad, 0, 0, densidad, 0, 0);
    pincel.clearRect(0, 0, l, l);
    const escala = escalaBase() * zoom;
    const ancho = imagen.width * escala;
    const alto = imagen.height * escala;
    pincel.imageSmoothingQuality = 'high';
    pincel.drawImage(imagen, l / 2 + dx - ancho / 2, l / 2 + dy - alto / 2, ancho, alto);
    // Lo de afuera del círculo, oscurecido; el borde del círculo, marcado
    const estilo = getComputedStyle(document.documentElement);
    pincel.save();
    pincel.fillStyle = estilo.getPropertyValue('--recortador-afuera').trim() || 'rgba(4,7,7,0.6)';
    pincel.beginPath();
    pincel.rect(0, 0, l, l);
    pincel.arc(l / 2, l / 2, diametro() / 2, 0, Math.PI * 2, true);
    pincel.fill('evenodd');
    pincel.strokeStyle = estilo.getPropertyValue('--recortador-borde').trim() || '#fff';
    pincel.lineWidth = 2;
    pincel.beginPath();
    pincel.arc(l / 2, l / 2, diametro() / 2, 0, Math.PI * 2);
    pincel.stroke();
    pincel.restore();
  }

  function ponerZoom(nuevo) {
    zoom = Math.min(ZOOM_MAXIMO, Math.max(1, nuevo));
    el.barra.value = String(zoom);
    acomodar();
    dibujar();
  }

  // --- Arrastrar con el mouse ---
  let arrastrando = null;
  el.area.addEventListener('pointerdown', (evento) => {
    if (!imagen) return;
    arrastrando = { x: evento.clientX, y: evento.clientY, dx, dy };
    el.area.setPointerCapture(evento.pointerId);
    el.area.classList.add('esta-arrastrando');
  });
  el.area.addEventListener('pointermove', (evento) => {
    if (!arrastrando) return;
    dx = arrastrando.dx + (evento.clientX - arrastrando.x);
    dy = arrastrando.dy + (evento.clientY - arrastrando.y);
    acomodar();
    dibujar();
  });
  const soltar = () => { arrastrando = null; el.area.classList.remove('esta-arrastrando'); };
  el.area.addEventListener('pointerup', soltar);
  el.area.addEventListener('pointercancel', soltar);

  // --- Zoom: ruedita, barrita, "−" y "+" ---
  el.area.addEventListener('wheel', (evento) => {
    if (!imagen) return;
    evento.preventDefault();
    ponerZoom(zoom * (evento.deltaY < 0 ? 1.1 : 1 / 1.1));
  }, { passive: false });
  el.barra.addEventListener('input', () => ponerZoom(Number(el.barra.value)));
  el.alejar.addEventListener('click', () => ponerZoom(zoom / 1.2));
  el.acercar.addEventListener('click', () => ponerZoom(zoom * 1.2));

  // --- Teclado: flechas mueven, + y − hacen zoom, Esc cancela ---
  el.ventana.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') { evento.preventDefault(); terminar(null); return; }
    if (evento.target !== el.area) return;
    const paso = evento.shiftKey ? 40 : 10;
    const flechas = { ArrowLeft: [paso, 0], ArrowRight: [-paso, 0], ArrowUp: [0, paso], ArrowDown: [0, -paso] };
    if (flechas[evento.key]) {
      evento.preventDefault();
      dx += flechas[evento.key][0];
      dy += flechas[evento.key][1];
      acomodar();
      dibujar();
    } else if (evento.key === '+' || evento.key === '=') {
      evento.preventDefault();
      ponerZoom(zoom * 1.2);
    } else if (evento.key === '-') {
      evento.preventDefault();
      ponerZoom(zoom / 1.2);
    }
  });

  // --- Guardar: lo que se ve en el círculo, en un cuadrado de 1024 px ---
  function lienzoDe(lado) {
    const c = document.createElement('canvas');
    c.width = lado;
    c.height = lado;
    const pincel = c.getContext('2d');
    pincel.imageSmoothingQuality = 'high';
    return [c, pincel];
  }

  function recortar() {
    // El cuadrado de la foto original que queda dentro del círculo (en píxeles de la foto)
    const escala = escalaBase() * zoom;
    const ladoEnFoto = diametro() / escala;
    const x = imagen.width / 2 - dx / escala - ladoEnFoto / 2;
    const y = imagen.height / 2 - dy / escala - ladoEnFoto / 2;
    // 1) Se copia ese cuadrado tal cual (a lo sumo el doble del tamaño final)...
    let lado = Math.max(LADO_SALIDA, Math.min(Math.round(ladoEnFoto), LADO_SALIDA * 2));
    let [actual, pincel] = lienzoDe(lado);
    // Si el recorte es mucho más grande, primero se achica a la mitad las veces que haga falta
    if (ladoEnFoto > LADO_SALIDA * 2) {
      let ladoPaso = Math.min(Math.round(ladoEnFoto), LADO_SALIDA * 4);   // tope: que una foto enorme no ocupe tanta memoria
      let [paso, pincelPaso] = lienzoDe(ladoPaso);
      pincelPaso.drawImage(imagen, x, y, ladoEnFoto, ladoEnFoto, 0, 0, ladoPaso, ladoPaso);
      while (ladoPaso / 2 >= LADO_SALIDA * 2) {
        const [menor, pincelMenor] = lienzoDe(Math.round(ladoPaso / 2));
        pincelMenor.drawImage(paso, 0, 0, ladoPaso, ladoPaso, 0, 0, menor.width, menor.height);
        paso.width = 0;   // libera la memoria del paso anterior
        [paso, ladoPaso] = [menor, menor.width];
      }
      lado = ladoPaso;
      [actual, pincel] = [paso, paso.getContext('2d')];
    } else {
      pincel.drawImage(imagen, x, y, ladoEnFoto, ladoEnFoto, 0, 0, lado, lado);
    }
    // 2) ...y el último paso, al tamaño final
    const [salida, pincelSalida] = lienzoDe(LADO_SALIDA);
    pincelSalida.drawImage(actual, 0, 0, lado, lado, 0, 0, LADO_SALIDA, LADO_SALIDA);
    actual.width = 0;
    return new Promise((r) => salida.toBlob(r, 'image/png'));
  }

  el.guardar.addEventListener('click', async () => {
    if (!imagen) return;
    el.guardar.disabled = true;
    const recorte = await recortar();
    el.guardar.disabled = false;
    terminar(recorte);
  });
  el.cancelar.addEventListener('click', () => terminar(null));
  el.ventana.querySelector('.recortador__fondo').addEventListener('click', () => terminar(null));

  function terminar(resultado) {
    if (!responder) return;
    el.ventana.hidden = true;
    if (imagen && typeof imagen.close === 'function') imagen.close();
    imagen = null;
    const r = responder;
    responder = null;
    if (focoAnterior && focoAnterior.isConnected) focoAnterior.focus();
    r(resultado);
  }

  async function abrir(archivo) {
    if (responder) terminar(null);
    try {
      imagen = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
    } catch {
      return Promise.reject(new Error('No se pudo abrir la foto.'));
    }
    focoAnterior = document.activeElement;
    zoom = 1;
    dx = 0;
    dy = 0;
    el.barra.value = '1';
    el.ventana.hidden = false;
    dibujar();
    el.area.focus();
    return new Promise((r) => { responder = r; });
  }

  // Si cambia el modo de color o el tamaño de la ventana, se vuelve a dibujar
  document.addEventListener('temacambiado', () => { if (imagen) dibujar(); });
  window.addEventListener('resize', () => { if (imagen) { acomodar(); dibujar(); } });

  return { abrir, cancelar: () => terminar(null) };
})();
