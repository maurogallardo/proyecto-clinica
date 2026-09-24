// Llamadas a OpenAI. La clave se lee del secreto OPENAI_API_KEY de las Edge
// Functions de Supabase: nunca está en el código ni en el repositorio.
//
// PRIVACIDAD: acá NUNCA se registra (console.log) el audio ni el texto dictado:
// son datos de salud. Si algo falla, solo se registra el tipo de error.

const API = 'https://api.openai.com/v1';

function claveOpenAI(): string {
  const clave = Deno.env.get('OPENAI_API_KEY');
  if (!clave) throw new Error('Falta el secreto OPENAI_API_KEY');
  return clave;
}

export async function pedirAOpenAI(ruta: string, cuerpo: FormData | object): Promise<any> {
  const esFormulario = cuerpo instanceof FormData;
  const respuesta = await fetch(`${API}${ruta}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${claveOpenAI()}`,
      ...(esFormulario ? {} : { 'Content-Type': 'application/json' }),
    },
    body: esFormulario ? cuerpo : JSON.stringify(cuerpo),
  });
  if (!respuesta.ok) {
    // Solo el número de error: el cuerpo de la respuesta podría repetir datos dictados
    console.error(`OpenAI respondió con error ${respuesta.status} en ${ruta}`);
    throw new Error(`OpenAI ${respuesta.status}`);
  }
  return respuesta.json();
}
