// Lo que comparten las funciones: responder al navegador (CORS) y exigir que el
// pedido venga de un usuario logueado.
import { createSupabaseContext } from 'npm:@supabase/server@1.8.0';

// Desde dónde se puede llamar a las funciones (la app publicada y las pruebas locales).
// OJO: esto NO es la seguridad: la seguridad es exigir la sesión (más abajo).
const ORIGENES_PERMITIDOS = [
  'https://proyecto-clinica-drab.vercel.app',
  'http://localhost:8000',
  'http://localhost:8765',
];

function encabezadosCors(pedido: Request): Record<string, string> {
  const origen = pedido.headers.get('origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ORIGENES_PERMITIDOS.includes(origen) ? origen : ORIGENES_PERMITIDOS[0],
    'Access-Control-Allow-Headers':
      pedido.headers.get('access-control-request-headers') ?? 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

// Respuesta al "pedido previo" que hace el navegador antes del pedido de verdad
export function respuestaPrevia(pedido: Request): Response {
  return new Response('ok', { headers: encabezadosCors(pedido) });
}

export function responder(pedido: Request, cuerpo: unknown, estado = 200): Response {
  return Response.json(cuerpo, { status: estado, headers: encabezadosCors(pedido) });
}

// Devuelve true solo si el pedido trae la sesión válida de un usuario logueado.
// (Además, la plataforma de Supabase ya rechaza los pedidos sin sesión antes de
// llegar acá: son dos capas.) Así nadie de afuera gasta el crédito de OpenAI.
export async function esUsuarioLogueado(pedido: Request): Promise<boolean> {
  try {
    const { data, error } = await createSupabaseContext(pedido, { auth: 'user' });
    return !error && Boolean(data?.userClaims);
  } catch {
    return false;
  }
}
