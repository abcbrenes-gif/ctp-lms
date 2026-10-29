// Función serverless de Vercel: Memoria Contable — lee los cuadros de una
// lámina. Recibe la imagen de cada cuadro y devuelve, para cada uno, el
// título (concepto que el estudiante debe escribir), la explicación, una
// pista que no revela la respuesta, otras respuestas válidas y dónde empieza
// y termina el DIBUJO (en fracción de la altura del cuadro), para recortar la
// carta sin el título ni la explicación.
// La llave (ANTHROPIC_API_KEY) se lee de las variables de entorno de Vercel.

function extraerJson(texto) {
  let limpio = String(texto || "").trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  const a = limpio.indexOf("{"), b = limpio.lastIndexOf("}");
  if (a !== -1 && b > a) limpio = limpio.slice(a, b + 1);
  return JSON.parse(limpio);
}
const corto = (v, n) => String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, n);
const frac = v => { const n = Number(v); return isFinite(n) ? Math.max(0, Math.min(1, n)) : null; };

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "Método no permitido." }); return; }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: "Falta configurar ANTHROPIC_API_KEY en las variables de entorno de Vercel." }); return; }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};
  const imagenes = (Array.isArray(body.imagenes) ? body.imagenes : []).slice(0, 16).filter(x => typeof x === "string" && x.length > 100);
  if (!imagenes.length) { res.status(400).json({ error: "No hay imágenes." }); return; }
  const tema = corto(body.tema, 200);

  const contenido = [];
  imagenes.forEach((b64, k) => {
    contenido.push({ type: "text", text: `CUADRO ${k} (k=${k}):` });
    contenido.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } });
  });
  contenido.push({ type: "text", text: `Sos docente de Contabilidad (Educación Técnica, Costa Rica)${tema ? ` y el tema es «${tema}»` : ""}. Preparás el juego «Memoria Contable»: cada carta muestra un DIBUJO y el estudiante debe escribir el concepto. Arriba van ${imagenes.length} cuadro(s) recortados de una lámina; normalmente cada uno tiene un TÍTULO arriba (el concepto), un DIBUJO al centro y una EXPLICACIÓN corta abajo.

Para cada cuadro devolvé:
- "concepto": el título del cuadro tal como está escrito (es lo que el estudiante debe digitar), con mayúscula inicial y el resto en minúscula salvo siglas. Si no tiene título, el concepto que representa.
- "explicacion": el texto de explicación del cuadro, tal cual.
- "pista": pista breve (máximo 14 palabras) basada en la explicación, que NO incluya el concepto ni sus palabras.
- "otras": otras respuestas válidas (siglas, singular/plural, sin la palabra «sociedades», etc.), separadas por ";". Vacío si no hay.
- "dibujo_desde": fracción de la ALTURA del cuadro (0 = borde de arriba, 1 = borde de abajo) donde termina el título y empieza el dibujo. Dejá un pequeño margen para que NO se vea ninguna letra del título.
- "dibujo_hasta": fracción de la altura donde termina el dibujo y empieza la explicación de abajo (si no hay explicación, cerca de 1).
- "es_carta": false si el cuadro no es un concepto (portada, encabezado, logo, adorno); si no, true.

Respondé ÚNICAMENTE con JSON válido: {"paneles":[{"k":0,"concepto":"...","explicacion":"...","pista":"...","otras":"...","dibujo_desde":0.2,"dibujo_hasta":0.82,"es_carta":true}]}
No uses comillas dobles dentro de los textos.` });

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-5-5", max_tokens: 4000, messages: [{ role: "user", content: contenido }] })
    });
    const d = await r.json();
    if (!r.ok) { const msg = (d && d.error && d.error.message) || "Error de la IA."; res.status(r.status === 429 || r.status >= 500 ? 503 : 502).json({ error: msg }); return; }
    const j = extraerJson((d.content || []).map(b => b.text || "").join(""));
    const paneles = (Array.isArray(j.paneles) ? j.paneles : []).map(p => ({
      k: Number(p.k), concepto: corto(p.concepto, 80).replace(/[.:]+$/, ""), explicacion: corto(p.explicacion, 400), pista: corto(p.pista, 160), otras: corto(p.otras, 200),
      dibujo_desde: frac(p.dibujo_desde), dibujo_hasta: frac(p.dibujo_hasta), es_carta: p.es_carta !== false
    })).filter(p => Number.isInteger(p.k) && p.k >= 0 && p.k < imagenes.length);
    res.status(200).json({ paneles });
  } catch (e) {
    res.status(500).json({ error: "No se pudo consultar la IA: " + (e && e.message ? e.message : "error") });
  }
};
