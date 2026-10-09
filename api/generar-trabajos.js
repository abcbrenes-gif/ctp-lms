// Función serverless de Vercel: sugiere una lista de "Trabajos cotidianos"
// (título + instrucciones) a partir de los datos del Programa de estudio
// (resultado, saberes, estrategias del estudiante, evidencias).
// Solo se usa desde la vista del profesor en /js/app-parte2.js (renderApartado).
// El profesor revisa la lista y decide cuáles agregar — no se crean solos.
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

function extraerJson(texto) {
  // El modelo a veces envuelve el JSON en ```json ... ``` — se lo quitamos si aparece.
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
  const estrategiasEstudiante = limpiarHtml(body.estrategiasEstudiante);
  const evidencias = limpiarHtml(body.evidencias);
  const instrucciones = limpiarHtml(body.instrucciones);

  if (!resultado) {
    res.status(400).json({ error: "Falta el resultado de aprendizaje de este tema." });
    return;
  }

  const contexto = [
    `Resultado de aprendizaje: ${resultado}`,
    saberes ? `Saberes esenciales: ${saberes}` : "",
    estrategiasEstudiante ? `Estrategias de mediación del estudiante (según el programa de estudio): ${estrategiasEstudiante}` : "",
    evidencias ? `Evidencias de aprendizaje que se piden: ${evidencias}` : ""
  ].filter(Boolean).join("\n");

  const prompt = `Sos un asistente para un profesor de Contabilidad de un colegio técnico (CTP) en Costa Rica.
Te doy el contenido oficial de un tema del programa de estudio. Proponé una lista de 4 a 6 "trabajos cotidianos"
(tareas cortas que los estudiantes hacen y entregan, de las que ya existen en la plataforma del profesor) para ese tema.

Cada trabajo cotidiano se basa en las estrategias de mediación del estudiante que ya están en el programa —
convertí cada estrategia (o grupo de estrategias relacionadas) en una tarea concreta y evaluable.

Reglas:
- Devolvé ÚNICAMENTE un JSON válido, sin texto antes ni después, con esta forma exacta:
  [{"titulo": "...", "descripcion": "..."}, ...]
- "titulo": corto (máximo 8 palabras), en español de Costa Rica.
- "descripcion": instrucciones breves para el estudiante (1 a 3 oraciones), en HTML simple
  (solo <p>, <ul>, <li>, <strong> si hace falta — sin markdown).
- No repitas el resultado de aprendizaje como si fuera un trabajo.
- No inventes fechas ni rúbricas.

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

    let trabajos;
    try {
      trabajos = extraerJson(texto);
    } catch (err) {
      res.status(502).json({ error: "La IA no devolvió una lista válida. Intentá de nuevo." });
      return;
    }

    if (!Array.isArray(trabajos)) {
      res.status(502).json({ error: "La IA no devolvió una lista válida. Intentá de nuevo." });
      return;
    }

    const limpiosValidos = trabajos
      .filter((t) => t && typeof t.titulo === "string" && t.titulo.trim())
      .map((t) => ({ titulo: t.titulo.trim(), descripcion: typeof t.descripcion === "string" ? t.descripcion.trim() : "" }))
      .slice(0, 8);

    res.status(200).json({ trabajos: limpiosValidos });
  } catch (err) {
    res.status(500).json({ error: "No se pudo conectar con la IA: " + (err && err.message ? err.message : String(err)) });
  }
};
