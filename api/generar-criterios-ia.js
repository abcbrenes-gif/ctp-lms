// Función serverless de Vercel: genera (con IA) los criterios de evaluación
// de un indicador — uno por cada puntaje posible (1, 2, 3, ... hasta el
// puntaje máximo) — a partir del título/instrucciones del trabajo al que
// pertenece. El profesor revisa y puede editar todo antes de guardar.
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

// Se usa un formato de líneas "1) texto" en vez de JSON: es más tolerante a
// comillas, tildes y saltos de línea que la IA no siempre escapa bien.
function extraerCriterios(texto, puntajeMaximo) {
  const limpio = String(texto || "").replace(/^```[a-z]*\n?/i, "").replace(/```\s*$/, "").trim();
  const criterios = {};
  const regex = /(?:^|\n)\s*(\d+)\)\s*(.+?)(?=\n\s*\d+\)|$)/gs;
  let match;
  while ((match = regex.exec(limpio)) !== null) {
    const puntaje = Number(match[1]);
    const descripcion = match[2].replace(/\s+/g, " ").trim();
    if (puntaje >= 1 && puntaje <= puntajeMaximo && descripcion) {
      criterios[puntaje] = descripcion;
    }
  }
  const resultado = [];
  for (let p = 1; p <= puntajeMaximo; p++) {
    if (!criterios[p]) return null; // faltó algún nivel — no es válido, mejor reintentar.
    resultado.push({ puntaje: p, descripcion: criterios[p] });
  }
  return resultado;
}

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

  const titulo = limpiarHtml(body.titulo).slice(0, 300);
  const contexto = limpiarHtml(body.contexto).slice(0, 1500);
  const instrucciones = limpiarHtml(body.instrucciones).slice(0, 800);
  const puntajeMaximo = Math.max(1, Math.min(20, Number(body.puntajeMaximo) || 3));

  if (!titulo) {
    res.status(400).json({ error: "Falta el título o descripción del indicador/trabajo." });
    return;
  }

  const prompt = `Sos un asistente para un profesor de Contabilidad de un colegio técnico (CTP) en Costa Rica.
Necesito los criterios de evaluación de un indicador de rúbrica para calificar un trabajo cotidiano de un estudiante de secundaria, en español de Costa Rica.

Trabajo / indicador: ${titulo}
${contexto ? `Instrucciones del trabajo que el estudiante recibió: ${contexto}` : ""}
${instrucciones ? `Instrucciones del profesor sobre los criterios (seguilas con prioridad): ${instrucciones}` : ""}

El puntaje va de 1 a ${puntajeMaximo} puntos. Necesito un criterio claro y concreto para CADA nivel de puntaje,
de forma que un criterio más alto represente un trabajo más completo/correcto que uno más bajo (progresivos, no solo "más o menos bien").

Reglas:
- Respondé ÚNICAMENTE con ${puntajeMaximo} líneas, una por nivel, en este formato exacto y nada más:
  1) texto del criterio para 1 punto
  2) texto del criterio para 2 puntos
  ${puntajeMaximo >= 3 ? "3) texto del criterio para 3 puntos" : ""}
  (así hasta ${puntajeMaximo})
- Cada criterio: una oración corta y concreta (máximo 20 palabras), sin HTML ni markdown.
- No numerés con "Criterio N:", solo "N) texto".
- Basate en lo que realmente se le pide al estudiante en las instrucciones del trabajo, si las di.`;

  async function llamarIA(promptTexto) {
    const respuesta = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-5-5",
        max_tokens: 900,
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

    let criterios = extraerCriterios(texto, puntajeMaximo);
    if (!criterios) {
      try {
        const textoReintento = await llamarIA(prompt + "\n\nRecordatorio: respondé SOLO con las líneas \"N) texto\", una por cada nivel de 1 a " + puntajeMaximo + ", sin explicaciones antes ni después.");
        criterios = extraerCriterios(textoReintento, puntajeMaximo);
      } catch (err2) {
        criterios = null;
      }
    }
    if (!criterios) {
      res.status(502).json({ error: "La IA no devolvió una respuesta válida. Intentá de nuevo." });
      return;
    }

    res.status(200).json({ criterios });
  } catch (err) {
    res.status(500).json({ error: "No se pudo conectar con la IA: " + (err && err.message ? err.message : String(err)) });
  }
};
