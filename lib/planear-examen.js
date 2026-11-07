// Función serverless de Vercel: con los temas que se han visto en la plataforma
// (publicaciones, subtemas, trabajos, indicadores y su logro), la IA sugiere
// qué temas incluir en un examen y cuántas preguntas darle a cada uno.
// Solo PROPONE: el docente marca qué temas sí y qué temas no.
// La llave (ANTHROPIC_API_KEY) se lee de las variables de entorno de Vercel.

const corto = (v, n) => String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, n);
function extraerJson(t) {
  let s = String(t || "").trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a !== -1 && b > a) s = s.slice(a, b + 1);
  return JSON.parse(s);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "Método no permitido." }); return; }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: "Falta configurar ANTHROPIC_API_KEY en las variables de entorno de Vercel." }); return; }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};
  const temas = (Array.isArray(body.temas) ? body.temas : []).slice(0, 60);
  if (!temas.length) { res.status(400).json({ error: "No hay temas para analizar." }); return; }
  const n = Math.max(1, Math.min(80, Number(body.preguntas) || 15));

  const listado = temas.map(t => `- id=${corto(t.id, 40)} · «${corto(t.titulo, 160)}» · origen: ${corto(t.origen, 40)} · publicado a estudiantes: ${t.visto ? "sí" : "no"} · trabajos evaluados: ${Number(t.trabajos) || 0} · logro promedio: ${t.logro == null ? "sin notas" : Math.round(t.logro) + " %"}${t.fecha ? " · visto: " + corto(t.fecha, 12) : ""}${t.subtemas && t.subtemas.length ? "\n    subtemas: " + t.subtemas.slice(0, 10).map(s => corto(s, 80)).join(" | ") : ""}${t.resumen ? "\n    contenido: " + corto(t.resumen, 260) : ""}`).join("\n");

  const prompt = `Sos especialista en evaluación de los aprendizajes del MEP de Costa Rica (Decreto 45509-MEP), docente de Contabilidad en un colegio técnico. Vas a planear un examen (prueba escrita) para la sección ${corto(body.seccion, 80)}${body.periodo ? ", " + corto(body.periodo, 40) : ""}, con ${n} preguntas en total.
${body.indicaciones ? "Indicaciones del docente: " + corto(body.indicaciones, 800) + "\n" : ""}
TEMAS QUE APARECEN EN LA PLATAFORMA (investigación previa)
${listado}

CRITERIOS
- Solo se evalúa lo que ya se desarrolló con el estudiantado: un tema NO publicado a estudiantes, sin trabajos ni contenido, o fuera del periodo, normalmente NO se incluye (decí por qué).
- Priorizá los temas con trabajos evaluados y contenido desarrollado; los de logro bajo (menos de 60 %) conviene incluirlos para verificar el aprendizaje, sin que dominen el examen.
- Evitá duplicar temas muy parecidos; si dos se solapan, sugerí uno y explicá.
- Repartí exactamente ${n} preguntas entre los temas que sugerís incluir (0 en los que no), en proporción a su importancia.
- Español de Costa Rica, motivos breves (máximo 140 caracteres). Sin comillas dobles dentro de los textos.

Respondé ÚNICAMENTE con JSON válido:
{"temas":[{"id":"...","incluir":true,"preguntas":3,"motivo":"..."}],"comentario":"una o dos frases con la recomendación general"}
Incluí todos los temas del listado, con su mismo id.`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-5-5", max_tokens: 5000, messages: [{ role: "user", content: prompt }] })
    });
    const d = await r.json();
    if (!r.ok) {
      const msg = (d && d.error && d.error.message) || "Error de la IA.";
      res.status(r.status === 429 || r.status >= 500 ? 503 : 502).json({ error: (r.status === 429 || r.status >= 500 ? "La IA está ocupada; intente de nuevo en unos segundos. " : "") + msg }); return;
    }
    const j = extraerJson((d.content || []).map(b => b.text || "").join(""));
    const ids = new Set(temas.map(t => String(t.id)));
    const salida = (Array.isArray(j.temas) ? j.temas : []).filter(x => x && ids.has(String(x.id)))
      .map(x => ({ id: String(x.id), incluir: !!x.incluir, preguntas: Math.max(0, Math.round(Number(x.preguntas) || 0)), motivo: corto(x.motivo, 200) }));
    res.status(200).json({ temas: salida, comentario: corto(j.comentario, 400) });
  } catch (e) {
    res.status(500).json({ error: "No se pudo consultar la IA: " + (e && e.message ? e.message : "error desconocido") });
  }
};
