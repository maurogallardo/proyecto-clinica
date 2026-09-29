// Enlaces firmados que se renuevan solos (T051).
// Las fotos están en depósitos privados: se ven con enlaces firmados que caducan
// (fotos del electro: 10 minutos; foto de perfil: 1 hora). Si la ficha queda
// abierta más que eso, el enlace que se pidió al abrirla ya no sirve.
//
// Cómo funciona: la app anota cada enlace con la hora en que vence. Cuando lo
// necesita, pregunta "¿sigue sirviendo, con un minuto de margen?". Si sirve, lo
// usa; si no, le pide uno nuevo a Supabase en ese momento. Los enlaces siguen
// durando lo mismo: no se relaja nada de la seguridad.
// La usan la ficha (miniaturas y vista ampliada), la foto de perfil y el PDF (Tanda 2).

const Enlaces = (() => {
  const MARGEN_MS = 60 * 1000;
  const guardados = new Map();   // "deposito/ruta" -> { url, venceEn }

  const clave = (deposito, ruta) => `${deposito}/${ruta}`;
  const sirve = (e) => e && e.venceEn - Date.now() > MARGEN_MS;

  function anotar(deposito, ruta, url, segundos) {
    guardados.set(clave(deposito, ruta), { url, venceEn: Date.now() + segundos * 1000 });
    return url;
  }

  // Un enlace que sirve ahora (el que ya estaba o uno recién pedido). null si no se pudo.
  async function vigente(deposito, ruta, segundos, { renovar = false } = {}) {
    const actual = guardados.get(clave(deposito, ruta));
    if (!renovar && sirve(actual)) return actual.url;
    try {
      const { data, error } = await clienteSupabase.storage.from(deposito).createSignedUrl(ruta, segundos);
      if (error) return null;
      return anotar(deposito, ruta, data.signedUrl, segundos);
    } catch {
      return null;
    }
  }

  // Varios de una vez (una sola consulta a Supabase): un enlace por ruta, o null
  async function vigentes(deposito, rutas, segundos) {
    const faltan = rutas.filter((ruta) => !sirve(guardados.get(clave(deposito, ruta))));
    if (faltan.length) {
      try {
        const { data, error } = await clienteSupabase.storage.from(deposito).createSignedUrls(faltan, segundos);
        if (!error) {
          faltan.forEach((ruta, i) => {
            if (data[i] && !data[i].error && data[i].signedUrl) anotar(deposito, ruta, data[i].signedUrl, segundos);
          });
        }
      } catch { /* sin conexión: quedan en null */ }
    }
    return rutas.map((ruta) => {
      const e = guardados.get(clave(deposito, ruta));
      return sirve(e) ? e.url : null;
    });
  }

  // ¿El enlace que se tiene de esta ruta sigue sirviendo? (sin pedir nada)
  const sigueSirviendo = (deposito, ruta) => sirve(guardados.get(clave(deposito, ruta)));

  // Al cerrar sesión: afuera todos los enlaces
  const olvidar = () => guardados.clear();

  return { vigente, vigentes, sigueSirviendo, olvidar };
})();
