// Función serverless de Vercel: la IA revisa UNA entrega del proyecto de leyes
// (Gestión Tributaria): el nombre de la ley que escribió la persona estudiante,
// su descripción y la(s) infografía(s) que subió. Identifica qué ley presenta
// realmente la infografía, si corresponde con el título, si la información es
// correcta y completa, y redacta una retroalimentación breve.
//
// Los archivos se mandan por URL pública de Supabase (no pasan por el cuerpo
// de la petición, para no chocar con el límite de 4,5 MB de Vercel).
// La llave (ANTHROPIC_API_KEY) se lee de las variables de entorno de Vercel.

const PREFIJO_PERMITIDO = "https://dyulfowcvvmdmwbjhubq.supabase.co/storage/v1/object/public/";

function extraerJson(texto) {
  let limpio = String(texto || "").trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  const a = limpio.indexOf("{"), b = limpio.lastIndexOf("}");
  if (a !== -1 && b > a) limpio = limpio.slice(a, b + 1);
  return JSON.parse(limpio);
}
const corto = (v, n) => String(v == null ? "" : v).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, n);

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "Método no permitido." }); return; }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: "Falta configurar ANTHROPIC_API_KEY en las variables de entorno de Vercel." }); return; }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  const titulo = corto(body.titulo, 300);
  const descripcion = corto(body.descripcion, 4000);
  const archivos = (Array.isArray(body.archivos) ? body.archivos : []).slice(0, 3)
    .filter(a => a && typeof a.url === "string" && a.url.startsWith(PREFIJO_PERMITIDO));
  if (!archivos.length) { res.status(400).json({ error: "La entrega no tiene infografía." }); return; }

  const bloques = [];
  const textosDocx = [];
  // El servidor descarga cada archivo y se lo pasa a la IA en base64 (más
  // confiable que dejar que la IA lo descargue por URL).
  for (const a of archivos) {
    let buf = null, tipo = String(a.tipo || "").toLowerCase();
    try {
      const r = await fetch(a.url);
      if (r.ok) { buf = Buffer.from(await r.arrayBuffer()); tipo = tipo || String(r.headers.get("content-type") || "").toLowerCase(); }
    } catch { buf = null; }
    if (!buf) continue;
    if (!tipo || tipo === "application/octet-stream") {
      const cab = buf.slice(0, 4).toString("hex");
      tipo = cab.startsWith("25504446") ? "application/pdf" : cab.startsWith("89504e47") ? "image/png" : cab.startsWith("ffd8") ? "image/jpeg" : cab.startsWith("504b0304") ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : tipo;
    }
    if (tipo.includes("pdf")) {
      if (buf.length < 30 * 1024 * 1024) bloques.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: buf.toString("base64") } });
    } else if (/^image\/(png|jpeg|jpg|gif|webp)/.test(tipo)) {
      if (buf.length <= 4.8 * 1024 * 1024) bloques.push({ type: "image", source: { type: "base64", media_type: tipo.replace("jpg", "jpeg").split(";")[0], data: buf.toString("base64") } });
      else bloques.push({ type: "image", source: { type: "url", url: a.url } });
    } else if (tipo.includes("wordprocessingml") || /\.docx$/i.test(a.url)) {
      try {
        const mammoth = require("mammoth");
        const out = await mammoth.extractRawText({ buffer: buf });
        textosDocx.push(String(out.value || "").slice(0, 15000));
      } catch { /* se ignora: se evalúa con lo demás */ }
    }
  }
  if (!bloques.length && !textosDocx.length) { res.status(400).json({ error: "No se pudo leer la infografía (formato no soportado)." }); return; }

  const prompt = `Sos docente evaluador de Gestión Tributaria (undécimo año, especialidad de Contabilidad, CTP en Costa Rica). Revisás UNA entrega de un proyecto donde cada persona estudiante debía presentar, con una infografía, cada una de las leyes y normativas tributarias y mercantiles vigentes en Costa Rica (según el listado de tributos del Ministerio de Hacienda).

La persona estudiante escribió:
- Nombre de la ley: «${titulo || "(vacío)"}»
- Descripción general: «${descripcion || "(vacía)"}»
- Infografía: ver archivo(s) adjunto(s)${textosDocx.length ? " y el texto extraído de un Word abajo" : ""}.

Revisá con cuidado y respondé:
1. ¿Qué ley presenta realmente la infografía? (nombre oficial y número de ley o decreto, si se puede identificar).
2. ¿La infografía corresponde con la ley que escribió en el título? (si es otra ley, o no tiene relación, decilo).
3. ¿La información de la infografía es correcta según la ley vigente en Costa Rica? Revisá qué grava o regula, quiénes son los contribuyentes u obligados, tarifas o montos, exenciones, administración/destino, sanciones, etc., en lo que aplique. Señalá errores concretos y lo importante que falta.
4. ¿Está bien presentada? (legible, organizada, con información propia y suficiente; no es una imagen vacía, borrosa, una captura sin contenido o una portada).

Escala "presentacion":
- "Bien": corresponde a la ley y la información es correcta y suficiente (nota 85–100).
- "Regular": corresponde pero tiene errores menores o le faltan aspectos importantes (nota 60–84).
- "Deficiente": tiene errores graves, es muy incompleta o casi ilegible (nota 30–59).
- "No corresponde": la infografía es de otra ley, no tiene relación o no se puede leer (nota 0–29).

Respondé ÚNICAMENTE con JSON válido (sin texto extra), con esta forma exacta:
{"ley_presentada":"nombre oficial de la ley que trata la infografía","numero":"7092 (solo el número de ley o decreto, vacío si no aplica)","corresponde_titulo":true,"presentacion":"Bien","nota":90,"aciertos":"1 frase","errores":"errores o faltantes concretos, vacío si no hay","retro":"2 o 3 oraciones dirigidas a la persona estudiante, en español de Costa Rica, tono respetuoso y formativo"}
Sé breve: cada campo de texto en máximo 2 oraciones (la retro en máximo 3).
No uses comillas dobles dentro de los textos; si necesitás citar, usá «».${textosDocx.length ? `\n\n--- TEXTO DEL WORD ---\n${textosDocx.join("\n---\n")}\n--- FIN ---` : ""}`;

  const llamar = async (contenido, maxTokens) => {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-5-5", max_tokens: maxTokens || 2500, messages: [{ role: "user", content: contenido }] })
    });
    const d = await r.json();
    return { r, d };
  };

  try {
    const { r, d } = await llamar([...bloques, { type: "text", text: prompt }]);
    if (!r.ok) {
      const msg = (d && d.error && d.error.message) || "Error de la IA.";
      if (r.status === 429 || r.status === 529 || r.status >= 500) { res.status(503).json({ error: "La IA está ocupada. (" + msg + ")", reintentar: true }); return; }
      res.status(502).json({ error: msg }); return;
    }
    const texto = (d.content || []).map(b => b.text || "").join("").trim();
    let j;
    try { j = extraerJson(texto); }
    catch {
      if (texto.indexOf("{") < 0) { res.status(422).json({ error: "La IA no pudo revisar la infografía: " + texto.slice(0, 200) }); return; }
      const { d: d2 } = await llamar("Devolvé ÚNICAMENTE este contenido como JSON válido, sin cambiar la redacción; reemplazá comillas dobles internas por «». Texto:\n\n" + texto, 2500);
      j = extraerJson((d2.content || []).map(b => b.text || "").join("").trim());
    }
    const PRES = ["Bien", "Regular", "Deficiente", "No corresponde"];
    const nota = Math.max(0, Math.min(100, Math.round(Number(j.nota) || 0)));
    res.status(200).json({
      ley_presentada: corto(j.ley_presentada, 200),
      numero: corto(j.numero, 40).replace(/[^\d\-A-Za-z]/g, " ").trim(),
      corresponde_titulo: j.corresponde_titulo !== false,
      presentacion: PRES.includes(j.presentacion) ? j.presentacion : (nota >= 85 ? "Bien" : nota >= 60 ? "Regular" : nota >= 30 ? "Deficiente" : "No corresponde"),
      nota,
      aciertos: corto(j.aciertos, 400),
      errores: corto(j.errores, 600),
      retro: corto(j.retro, 700)
    });
  } catch (e) {
    res.status(500).json({ error: "No se pudo consultar la IA: " + (e && e.message ? e.message : "error") });
  }
};
