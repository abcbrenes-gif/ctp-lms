// Función serverless de Vercel: Memoria Contable. Recibe el texto que venía
// debajo de cada imagen de un PDF del docente y devuelve, para cada carta, el
// CONCEPTO técnico que el estudiante debe escribir, una pista corta que no
// revela la respuesta y otras respuestas válidas (siglas o sinónimos).
// La llave (ANTHROPIC_API_KEY) se lee de las variables de entorno de Vercel.

function extraerJson(texto) {
  let limpio = String(texto || "").trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  const a = limpio.indexOf("{"), b = limpio.lastIndexOf("}");
  if (a !== -1 && b > a) limpio = limpio.slice(a, b + 1);
  return JSON.parse(limpio);
}
const corto = (v, n) => String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, n);

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "Método no permitido." }); return; }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: "Falta configurar ANTHROPIC_API_KEY en las variables de entorno de Vercel." }); return; }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};
  const textos = (Array.isArray(body.textos) ? body.textos : []).slice(0, 120).map(t => String(t || "").slice(0, 1500));
  if (!textos.length) { res.status(400).json({ error: "No hay textos." }); return; }
  const tema = corto(body.tema, 200);

  const prompt = `Sos docente de la especialidad de Contabilidad (Educación Técnica, Costa Rica). Preparás el juego «Memoria Contable»: cada carta muestra una imagen y el estudiante debe DIGITAR el concepto técnico que representa.
${tema ? `Tema: «${tema}».\n` : ""}El docente subió un PDF; debajo de cada imagen venía este texto (título y/o explicación):

${textos.map((t, i) => `CARTA ${i} (índice ${i}):\n${t || "(sin texto)"}`).join("\n\n")}

Para cada carta devolvé:
- "concepto": el término técnico exacto que el estudiante debe escribir, tal como aparece en el texto (normalmente el título o el término que se explica). Corto: de 1 a 5 palabras. Sin artículo inicial ni punto final. Si no hay texto, dejalo vacío.
- "pista": una pista breve (máximo 14 palabras) basada en la explicación, que NO contenga el concepto ni palabras de él.
- "otras": otras respuestas que también deben aceptarse (siglas, sinónimos o la forma singular/plural), separadas por ";". Vacío si no hay.

Respondé ÚNICAMENTE con JSON válido, sin texto extra: {"cartas":[{"i":0,"concepto":"...","pista":"...","otras":"..."}]}
No uses comillas dobles dentro de los textos.`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-5-5", max_tokens: 6000, messages: [{ role: "user", content: prompt }] })
    });
    const d = await r.json();
    if (!r.ok) {
      const msg = (d && d.error && d.error.message) || "Error de la IA.";
      res.status(r.status === 429 || r.status >= 500 ? 503 : 502).json({ error: msg }); return;
    }
    const j = extraerJson((d.content || []).map(b => b.text || "").join(""));
    const cartas = (Array.isArray(j.cartas) ? j.cartas : []).map(c => ({ i: Number(c.i), concepto: corto(c.concepto, 80).replace(/[.:]+$/, ""), pista: corto(c.pista, 160), otras: corto(c.otras, 200) }))
      .filter(c => Number.isInteger(c.i) && c.i >= 0 && c.i < textos.length);
    res.status(200).json({ cartas });
  } catch (e) {
    res.status(500).json({ error: "No se pudo consultar la IA: " + (e && e.message ? e.message : "error") });
  }
};
