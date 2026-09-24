// Función "transcribir" (T016): recibe el audio grabado en el celular y devuelve
// el texto dictado. Copia del paso "manda audio a transcribir" de LoMar.
//
// - Solo para usuarios logueados.
// - El audio NO se guarda: pasa directo a OpenAI y se descarta.
// - Ni el audio ni el texto se registran en los logs (son datos de salud).
import { MODELO_TRANSCRIPCION } from '../_compartido/modelos.ts';
import { esUsuarioLogueado, responder, respuestaPrevia } from '../_compartido/http.ts';
import { pedirAOpenAI } from '../_compartido/openai.ts';

// Palabras de ayuda para la transcripción (como en LoMar), adaptadas al ergométrico
const PALABRAS_DE_AYUDA =
  'Estudio ergométrico del Servicio de Cardiología del Sanatorio de la Cañada, Río Tercero. ' +
  'Términos: ergometría, ergométrico, MET, T.A., tensión arterial, F.C., frecuencia cardíaca, ' +
  'FCIA, QRS, PQ, QT, ritmo sinusal, eje, postesfuerzo, cicloergómetro, cinta, protocolo de Bruce, ' +
  'electrocardiograma.';

// Formatos que graba la app (T015; el iPhone usa audio/mp4) y su extensión
const FORMATOS: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'mp4',
  'audio/x-m4a': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
};

// 5 minutos de audio pesan unos pocos MB: esto frena envíos exagerados
const TAMANO_MAXIMO_BYTES = 20 * 1024 * 1024;

Deno.serve(async (pedido) => {
  if (pedido.method === 'OPTIONS') return respuestaPrevia(pedido);
  if (pedido.method !== 'POST') return responder(pedido, { error: 'metodo-no-permitido' }, 405);
  if (!(await esUsuarioLogueado(pedido))) return responder(pedido, { error: 'sin-sesion' }, 401);

  let audio: FormDataEntryValue | null = null;
  try {
    audio = (await pedido.formData()).get('audio');
  } catch {
    return responder(pedido, { error: 'pedido-invalido' }, 400);
  }
  if (!(audio instanceof File) || audio.size === 0) return responder(pedido, { error: 'sin-audio' }, 400);
  if (audio.size > TAMANO_MAXIMO_BYTES) return responder(pedido, { error: 'audio-muy-grande' }, 413);

  const tipo = audio.type.split(';')[0].trim();
  const extension = FORMATOS[tipo];
  if (!extension) return responder(pedido, { error: 'formato-no-soportado' }, 415);

  const envio = new FormData();
  envio.append('file', new File([audio], `dictado.${extension}`, { type: tipo }));
  envio.append('model', MODELO_TRANSCRIPCION);
  envio.append('language', 'es');
  envio.append('prompt', PALABRAS_DE_AYUDA);
  envio.append('response_format', 'json');

  try {
    const resultado = await pedirAOpenAI('/audio/transcriptions', envio);
    return responder(pedido, { texto: String(resultado.text ?? '').trim() });
  } catch {
    return responder(pedido, { error: 'no-se-pudo-transcribir' }, 502);
  }
});
