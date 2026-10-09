// Función serverless de Vercel: a partir del Resultado de aprendizaje y los
// Saberes esenciales de un Tema, sugiere una lista de "Subtemas" en los que
// se puede dividir ese tema (para luego subir material de apoyo específico
// a cada uno). Solo se usa desde la vista del profesor en /js/app-parte2.js
// (renderApartado). El profesor revisa la lista y decide cuáles crear —
// no se crean solos.
//
// La llave de la API (ANTHROPIC_API_KEY) se lee de las variables de entorno
// de Vercel. Nunca se envía al navegador: esta función corre en el servidor.

function limpiarHtml(valor) {
  return String(valor || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extraerJson(texto) {
  const limpio = String(texto || "").trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  return JSON.parse(limpio);
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

  const resultado = limpiarHtml(body.resultado);
  const saberes = limpiarHtml(body.saberes);
  const instrucciones = limpiarHtml(body.instrucciones);

  if (!saberes) {
    res.status(400).json({ error: "Falta el texto de Saberes esenciales de este tema." });
    return;
  }

  const contexto = [
    resultado ? `Resultado de aprendizaje: ${resultado}` : "",
    `Saberes esenciales: ${saberes}`
  ].filter(Boolean).join("\n");

  const prompt = `Sos un asistente para un profesor de Contabilidad de un colegio técnico (CTP) en Costa Rica.
Te doy el contenido oficial de un Tema del programa de estudio (su resultado de aprendizaje y sus saberes esenciales).
Dividí ese tema en subtemas (entre 3 y 6), agrupando los saberes esenciales por bloques de contenido relacionado,
para que el profesor pueda subir material de apoyo distinto a cada subtema.

Reglas:
- Devolvé ÚNICAMENTE un JSON válido, sin texto antes ni después, con esta forma exacta:
  [{"titulo": "...", "descripcion": "..."}, ...]
- "titulo": corto (máximo 7 palabras), en español de Costa Rica, que nombre el bloque de contenido.
- "descripcion": 1 oración breve que resuma qué entra en ese subtema, basada en los saberes esenciales dados.
- Cubrí entre 3 y 6 subtemas que en conjunto abarquen todos los saberes esenciales, sin repetir contenido entre subtemas.
- No inventes contenido que no esté en los saberes esenciales dados.

${contexto}
${instrucciones ? `\nInstrucciones adicionales del profesor (seguilas con prioridad): ${instrucciones}` : ""}`;

  try {
    const respuesta = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-5-5",
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      const mensaje = (datos && datos.error && datos.error.message) || "Error al generar con la IA.";
      res.status(502).json({ error: mensaje });
      return;
    }

    const texto = (datos.content || []).map((bloque) => bloque.text || "").join("").trim();

    let subtemas;
    try {
      subtemas = extraerJson(texto);
    } catch (err) {
      res.status(502).json({ error: "La IA no devolvió una lista válida. Intentá de nuevo." });
      return;
    }

    if (!Array.isArray(subtemas)) {
      res.status(502).json({ error: "La IA no devolvió una lista válida. Intentá de nuevo." });
      return;
    }

    const limpiosValidos = subtemas
      .filter((s) => s && typeof s.titulo === "string" && s.titulo.trim())
      .map((s) => ({ titulo: s.titulo.trim(), descripcion: typeof s.descripcion === "string" ? s.descripcion.trim() : "" }))
      .slice(0, 8);

    res.status(200).json({ subtemas: limpiosValidos });
  } catch (err) {
    res.status(500).json({ error: "No se pudo conectar con la IA: " + (err && err.message ? err.message : String(err)) });
  }
};
