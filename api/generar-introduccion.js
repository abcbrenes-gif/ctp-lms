// Función serverless de Vercel: genera (con IA) un borrador de "Introducción al tema"
// a partir de los datos del Programa de estudio (resultado, saberes, estrategias, evidencias).
// Solo se usa desde la vista del profesor en /js/app-parte2.js (renderApartado).
//
// La llave de la API (ANTHROPIC_API_KEY) se lee de las variables de entorno de Vercel.
// Nunca se envía al navegador: esta función corre en el servidor.

function limpiarHtml(valor) {
  return String(valor || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
  const estrategias = limpiarHtml(body.estrategias);
  const evidencias = limpiarHtml(body.evidencias);
  const instrucciones = limpiarHtml(body.instrucciones);

  if (!resultado) {
    res.status(400).json({ error: "Falta el resultado de aprendizaje de este tema." });
    return;
  }

  const contexto = [
    `Resultado de aprendizaje: ${resultado}`,
    saberes ? `Saberes esenciales: ${saberes}` : "",
    estrategias ? `Estrategias de mediación que usa el profesor: ${estrategias}` : "",
    evidencias ? `Evidencias de aprendizaje que se piden: ${evidencias}` : ""
  ].filter(Boolean).join("\n");

  const prompt = `Sos un asistente para un profesor de Contabilidad de un colegio técnico (CTP) en Costa Rica.
Te doy el contenido oficial de un tema del programa de estudio. Escribí una introducción breve y amigable a ese tema, dirigida a estudiantes de secundaria, en español de Costa Rica.

Reglas:
- 2 a 4 párrafos cortos.
- Explicá para qué sirve este tema en la vida real o en el trabajo contable, no repitas el resultado de aprendizaje literalmente como si fuera el título.
- Tono cercano y motivador, sin ser infantil.
- Devolvé el texto en HTML simple, solo con las etiquetas <p>, <ul>, <li>, <strong> — sin markdown, sin explicaciones adicionales, sin encabezados <h1>/<h2>.

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
        max_tokens: 900,
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
    res.status(200).json({ texto });
  } catch (err) {
    res.status(500).json({ error: "No se pudo conectar con la IA: " + (err && err.message ? err.message : String(err)) });
  }
};
