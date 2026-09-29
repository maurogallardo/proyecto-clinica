// Foto de perfil (T049): una por profesional, en el depósito privado
// "fotos-perfil" (supabase/perfil.sql), con el nombre <id del usuario>.webp.
// Cada uno solo ve, sube y cambia la suya (lo controlan las reglas del depósito).
//   - Se ve en la barra lateral del dashboard, en Configuración y en el menú del
//     celular. Sin foto: un círculo con la inicial del correo.
//   - Se sube desde Configuración (en la compu): se achica a 512 px y se pasa a
//     WebP con el mismo proceso que las fotos de los estudios (js/fotos.js).

const PERFIL = {
  deposito: 'fotos-perfil',
  enlaceSegundos: 60 * 60,
  foto: { ladoMaximoPx: 512, calidad: 0.85, calidadMinima: 0.6, pesoMaximo: 900 * 1024 },
};

const Perfil = (() => {
  let usuario = null;
  let enlace = null;   // enlace firmado de la foto (null: sin foto o todavía no se sabe)

  const archivoDe = (u) => `${u.id}.webp`;
  const inicialDe = (correo) => (Array.from(String(correo || '').trim())[0] || '?').toUpperCase();

  let renovando = false;        // ya se está pidiendo un enlace nuevo: no se pide otro
  let yaSeRenovo = false;       // ya se probó una vez con un enlace nuevo

  // Si la foto de perfil falla (por ejemplo, el enlace de 1 hora venció), se pide
  // un enlace nuevo UNA vez; si igual falla, vuelve a la inicial
  async function alFallar(evento) {
    // Una imagen que ya no es la actual (quedó de antes de renovar) no cuenta
    if (evento && evento.target && evento.target.getAttribute('src') !== enlace) return;
    if (!usuario || renovando) return;
    if (yaSeRenovo) {
      enlace = null;
      pintar();
      return;
    }
    yaSeRenovo = true;
    renovando = true;
    const u = usuario;
    const nuevo = await Enlaces.vigente(PERFIL.deposito, archivoDe(u), PERFIL.enlaceSegundos, { renovar: true });
    renovando = false;
    if (usuario !== u) return;
    enlace = nuevo;
    pintar();
  }

  // Dibuja todos los círculos de perfil de la app (celular y dashboard)
  function pintar() {
    document.querySelectorAll('.avatar').forEach((circulo) => {
      if (enlace) {
        const imagen = document.createElement('img');
        imagen.src = enlace;
        imagen.alt = '';
        imagen.addEventListener('load', () => { yaSeRenovo = false; });   // cuando vuelva a vencer, se renueva otra vez
        imagen.addEventListener('error', alFallar);
        circulo.replaceChildren(imagen);
      } else {
        circulo.replaceChildren(usuario ? inicialDe(usuario.email) : '');
      }
    });
    const boton = document.getElementById('perfil-elegir');
    if (boton) boton.textContent = enlace ? 'Cambiar foto' : 'Subir foto';
  }

  // Busca si el profesional tiene foto (y pide su enlace firmado)
  async function mostrar(u, { renovar = false } = {}) {
    usuario = u;
    enlace = null;
    yaSeRenovo = false;
    pintar();
    const url = await Enlaces.vigente(PERFIL.deposito, archivoDe(u), PERFIL.enlaceSegundos, { renovar });
    if (usuario !== u) return;   // mientras tanto se cerró la sesión
    enlace = url;                 // null: sin foto o sin conexión (queda la inicial)
    pintar();
  }

  // Sube (o cambia) la foto: se achica y se pasa a WebP antes de subirla
  async function subir(archivo) {
    if (!usuario) return 'No hay una sesión abierta.';
    if (!archivo.type.startsWith('image/')) return 'Elegí una foto (imagen).';
    if (!(await puedeCrearWebP())) return 'Este navegador no puede preparar la foto (WebP).';
    let webp;
    try {
      webp = await convertirAWebP(archivo, PERFIL.foto);
    } catch {
      return 'No se pudo preparar la foto. Probá con otra.';
    }
    if (!navigator.onLine) return 'Sin conexión. Probá de nuevo cuando tengas internet.';
    const { error } = await clienteSupabase.storage.from(PERFIL.deposito)
      .upload(archivoDe(usuario), webp, { contentType: 'image/webp', upsert: true, cacheControl: '60' });
    if (error) {
      console.error('No se pudo subir la foto de perfil');
      return 'No se pudo subir la foto. Probá de nuevo.';
    }
    await mostrar(usuario, { renovar: true });   // enlace nuevo: que se vea la foto nueva, no la anterior
    return null;
  }

  // Al cerrar sesión: afuera la foto de la pantalla
  function olvidar() {
    usuario = null;
    enlace = null;
    pintar();
  }

  return { mostrar, subir, olvidar };
})();
