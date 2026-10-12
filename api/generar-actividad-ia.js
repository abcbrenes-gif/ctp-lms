// Función serverless de Vercel: genera el CONTENIDO de una actividad interactiva
// (selección única, falso/verdadero, sopa de letras, crucigrama o infografía)
// a partir del tema del subtema, usando IA.
//
// El profesor revisa y puede editar todo antes de guardar — esto solo llena
// el formulario de autoría, no crea la actividad directamente.
//
// La llave de la API (ANTHROPIC_API_KEY) se lee de las variables de entorno de
// Vercel. Nunca se envía al navegador: esta función corre en el servidor.

function limpiarHtml(valor) {
  return String(valor || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extraerJson(texto) {
  let limpio = String(texto || "").trim();
  limpio = limpio.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  const inicioLlave = limpio.indexOf("{");
  const finLlave = limpio.lastIndexOf("}");
  if (inicioLlave !== -1 && finLlave !== -1 && finLlave > inicioLlave) {
    limpio = limpio.slice(inicioLlave, finLlave + 1);
  }
  return JSON.parse(limpio);
}

const PROMPTS = {
  seleccion_unica: (tema, contexto) => `Sos un asistente para un profesor de Contabilidad de un colegio técnico (CTP) en Costa Rica.
Generá 15 preguntas de selección única (opción múltiple) sobre este tema para una actividad de evaluación de estudiantes de secundaria.

Tema: ${tema}
${contexto ? `Contexto adicional: ${contexto}` : ""}

Reglas:
- Devolvé ÚNICAMENTE un JSON válido, sin texto antes ni después, con esta forma exacta:
  {"preguntas": [{"pregunta": "...", "opciones": ["...", "...", "...", "..."], "correcta": 0}, ...]}
- Exactamente 15 preguntas, cada una con exactamente 4 opciones.
- "correcta" es el índice (0, 1, 2 o 3) de la opción correcta.
- Las 4 opciones deben ser plausibles (nada de respuestas absurdas obvias), en español de Costa Rica.
- Variá cuál índice es el correcto entre las preguntas (no pongas siempre 0).
- Preguntas claras, de nivel de colegio técnico, basadas en contenido real del tema.`,

  falso_verdadero: (tema, contexto) => `Sos un asistente para un profesor de Contabilidad de un colegio técnico (CTP) en Costa Rica.
Generá 10 afirmaciones de verdadero/falso sobre este tema para una actividad de evaluación de estudiantes de secundaria.

Tema: ${tema}
${contexto ? `Contexto adicional: ${contexto}` : ""}

Reglas:
- Devolvé ÚNICAMENTE un JSON válido, sin texto antes ni después, con esta forma exacta:
  {"afirmaciones": [{"texto": "...", "correcta": true}, ...]}
- Exactamente 10 afirmaciones.
- "correcta" es true si la afirmación es verdadera, false si es falsa.
- Mezclá verdaderas y falsas (no pongas todas verdaderas ni todas falsas).
- Afirmaciones claras y concretas, en español de Costa Rica, basadas en contenido real del tema.`,

  sopa_letras: (tema, contexto) => `Sos un asistente para un profesor de Contabilidad de un colegio técnico (CTP) en Costa Rica.
Generá una lista de 10 palabras clave (una sola palabra cada una, sin espacios ni tildes, en mayúsculas) relacionadas con este tema, para una sopa de letras.

Tema: ${tema}
${contexto ? `Contexto adicional: ${contexto}` : ""}

Reglas:
- Devolvé ÚNICAMENTE un JSON válido, sin texto antes ni después, con esta forma exacta:
  {"palabras": ["PALABRA1", "PALABRA2", ...]}
- Exactamente 10 palabras.
- Cada palabra: una sola palabra (sin espacios), SIN TILDES, en MAYÚSCULAS, entre 4 y 12 letras.
- Términos técnicos reales y relevantes del tema.`,

  crucigrama: (tema, contexto) => `Sos un asistente para un profesor de Contabilidad de un colegio técnico (CTP) en Costa Rica.
Generá 7 pares de palabra+pista sobre este tema para un crucigrama.

Tema: ${tema}
${contexto ? `Contexto adicional: ${contexto}` : ""}

Reglas:
- Devolvé ÚNICAMENTE un JSON válido, sin texto antes ni después, con esta forma exacta:
  {"items": [{"palabra": "PALABRA", "pista": "Definición o pista corta"}, ...]}
- Exactamente 7 pares.
- "palabra": una sola palabra (sin espacios), SIN TILDES, en MAYÚSCULAS, entre 4 y 12 letras.
- "pista": una definición corta (máximo 15 palabras), en español de Costa Rica, sin mencionar la palabra.
- Preferí palabras que compartan letras entre sí (para que el crucigrama pueda cruzarlas), pero priorizá que sean términos reales del tema.`,

  infografia: (tema, contexto) => `Sos un asistente para un profesor de Contabilidad de un colegio técnico (CTP) en Costa Rica.
Escribí instrucciones breves (3 a 5 oraciones) para que un estudiante de secundaria haga una infografía sobre este tema, que luego sube como imagen o PDF.

Tema: ${tema}
${contexto ? `Contexto adicional: ${contexto}` : ""}

Reglas:
- Devolvé ÚNICAMENTE un JSON válido, sin texto antes ni después, con esta forma exacta:
  {"instrucciones": "..."}
- Instrucciones claras, en español de Costa Rica, en texto plano (sin HTML ni markdown).
- Mencioná qué debe incluir la infografía (al menos 3 elementos concretos del tema) y que puede usar herramientas como Canva.`
};

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Método no permitido." });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Falta configurar ANTHROPIC_API_KEY en las variables de entorno de Vercel." });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const tipo = String(body.tipo || "");
  const tema = limpiarHtml(body.tema).slice(0, 300);
  const contexto = limpiarHtml(body.contexto).slice(0, 2000);

  if (!PROMPTS[tipo]) {
    res.status(400).json({ error: "Tipo de actividad no soportado." });
    return;
  }
  if (!tema) {
    res.status(400).json({ error: "Falta el tema de la actividad." });
    return;
  }

  const prompt = PROMPTS[tipo](tema, contexto);

  async function llamarIA(promptTexto) {
    const respuesta = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-5-5",
        max_tokens: 3000,
        messages: [{ role: "user", content: promptTexto }]
      })
    });
    const datos = await respuesta.json();
    if (!respuesta.ok) {
      const mensaje = (datos && datos.error && datos.error.message) || "Error al generar con la IA.";
      throw new Error(mensaje);
    }
    return (datos.content || []).map((bloque) => bloque.text || "").join("").trim();
  }

  try {
    let texto;
    try {
      texto = await llamarIA(prompt);
    } catch (err) {
      res.status(502).json({ error: err.message || "Error al generar con la IA." });
      return;
    }

    let contenido;
    try {
      contenido = extraerJson(texto);
    } catch (err) {
      try {
        const textoReintento = await llamarIA(prompt + "\n\nRecordatorio: respondé SOLO con el objeto JSON, sin explicaciones antes ni después, y sin cortar el texto a la mitad.");
        contenido = extraerJson(textoReintento);
      } catch (err2) {
        res.status(502).json({ error: "La IA no devolvió una respuesta válida. Intentá de nuevo." });
        return;
      }
    }

    res.status(200).json({ contenido });
  } catch (err) {
    res.status(500).json({ error: "No se pudo conectar con la IA: " + (err && err.message ? err.message : String(err)) });
  }
};
