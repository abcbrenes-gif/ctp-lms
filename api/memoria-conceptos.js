// Función serverless de Vercel: Memoria Contable.
// · modo "dividir": recibe la imagen de cada cuadro de una lámina y devuelve
//   título (concepto), explicación, pista y dónde empieza/termina el dibujo.
// · por defecto: recibe el texto que venía
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

const frac = v => { const n = Number(v); return isFinite(n) ? Math.max(0, Math.min(1, n)) : null; };

// modo "dividir": lee los cuadros de una lámina (imágenes) — ver memoria-dividir.js del cliente.
async function dividir(body, res, apiKey) {
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
- "dibujo_desde": fracción de la ALTURA del cuadro (0 = borde de arriba, 1 = borde de abajo) justo debajo de la ÚLTIMA línea del título (el título puede ocupar 2 líneas). No cortes el dibujo: si dentro del dibujo hay letreros o rótulos, esos sí se dejan visibles. Que NO se vea ninguna letra del título.
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
}

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "Método no permitido." }); return; }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: "Falta configurar ANTHROPIC_API_KEY en las variables de entorno de Vercel." }); return; }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};
  if (body.modo === "dividir") return dividir(body, res, apiKey);
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
