// Ayudante de las fotos: pasa cada foto a WebP "detrás de escena" (en un Web
// Worker), así la pantalla nunca se traba mientras se preparan y el clip, la
// cámara y la planilla siguen respondiendo. Lo usa js/fotos.js.
// Recibe: { id, foto (Blob), opciones }. Responde: { id, webp } o { id, error }.
//   error: 'sin-webp'  -> este celular no crea WebP acá (js/fotos.js lo intenta de la otra forma)
//          'formato'   -> no se pudo abrir la imagen
//          'tamano'    -> no entra en el límite ni achicándola

self.addEventListener('message', async (evento) => {
  const { id, foto, opciones } = evento.data;
  let imagen = null;
  try {
    try {
      imagen = await createImageBitmap(foto, { imageOrientation: 'from-image' });
    } catch {
      self.postMessage({ id, error: 'formato' });
      return;
    }
    const { width: ancho, height: alto } = imagen;
    let escala = Math.min(1, opciones.ladoMaximoPx / Math.max(ancho, alto));
    let calidad = opciones.calidad;
    for (let intento = 0; intento < 12; intento++) {
      const lienzo = new OffscreenCanvas(Math.max(1, Math.round(ancho * escala)), Math.max(1, Math.round(alto * escala)));
      const pincel = lienzo.getContext('2d');
      pincel.imageSmoothingQuality = 'high';
      pincel.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
      const webp = await lienzo.convertToBlob({ type: 'image/webp', quality: calidad });
      if (webp.type !== 'image/webp') {
        self.postMessage({ id, error: 'sin-webp' });
        return;
      }
      if (webp.size <= opciones.pesoMaximo) {
        self.postMessage({ id, webp });
        return;
      }
      if (calidad > opciones.calidadMinima + 0.01) calidad -= 0.1;
      else escala *= 0.85;
    }
    self.postMessage({ id, error: 'tamano' });
  } catch {
    self.postMessage({ id, error: 'sin-webp' });
  } finally {
    if (imagen) imagen.close();
  }
});
