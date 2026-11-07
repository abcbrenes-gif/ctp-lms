// Función serverless de Vercel: la IA redacta las instrucciones de un examen
// (las generales o las de una parte) a partir de lo que el docente le pide,
// siguiendo el formato de las pruebas escritas del MEP. Solo PROPONE: el
// docente la revisa, la puede editar y decide si la usa.
//
// La llave (ANTHROPIC_API_KEY) se lee de las variables de entorno de Vercel.

const corto = (v, n) => String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, n);
const TIPOS = {
  sel: "selección única (marcar la opción correcta)",
  fv: "falso o verdadero",
  pareo: "pareo (asociar columna A con columna B)",
  corta: "respuesta corta",
  num: "respuesta numérica (cálculo)",
  des: "desarrollo (se califica a mano)"
};

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "Método no permitido." }); return; }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: "Falta configurar ANTHROPIC_API_KEY en las variables de entorno de Vercel." }); return; }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  const pedido = corto(body.pedido, 1200);
  const actual = corto(body.actual, 1500);
  const ex = body.examen || {};
  const parte = body.parte || null;
  const esParte = !!parte;
  if (!pedido && !actual) { res.status(400).json({ error: "Escriba qué quiere que diga la instrucción." }); return; }

  const resumenPartes = (Array.isArray(ex.partes) ? ex.partes : []).slice(0, 12)
    .map((p, i) => `  Parte ${i + 1}: ${corto(p.titulo, 120)} · ${TIPOS[p.tipo] || p.tipo} · ${Number(p.items) || 0} ítems · ${Number(p.pts) || 0} pts${p.app ? " · usa la app " + corto(p.app, 60) : ""}`).join("\n");
  const muestras = esParte ? (Array.isArray(parte.muestras) ? parte.muestras : []).slice(0, 4).map(m => "  - " + corto(m, 220)).join("\n") : "";

  const contexto = `EXAMEN
- Título: ${corto(ex.titulo, 200) || "(sin título)"}
- Sección: ${corto(ex.seccion, 80) || "(no indicada)"} · Especialidad de Contabilidad, CTP Mercedes Norte (Educación Técnica Profesional)
- Total: ${Number(ex.puntos) || 0} puntos · Porcentaje: ${Number(ex.peso) || 0} % · Duración: ${Number(ex.duracion) ? ex.duracion + " minutos" : "sin límite"}
- Se resuelve EN LA PLATAFORMA (en computadora o celular): las respuestas se guardan solas, se entrega una sola vez con el botón «Entregar examen», al acabarse el tiempo se entrega solo y las salidas de la pantalla quedan registradas. Algunos retos piden abrir una aplicación de la plataforma con el botón «↗ Abrir».
- Partes:
${resumenPartes || "  (todavía sin partes)"}`;

  const objetivo = esParte
    ? `Redactá las INSTRUCCIONES DE LA PARTE «${corto(parte.titulo, 150)}» (${TIPOS[parte.tipo] || parte.tipo}): ${Number(parte.items) || 0} ítems, ${Number(parte.pts) || 0} puntos en total${parte.ptsItem ? `, ${parte.ptsItem} punto(s) cada uno` : ""}${parte.app ? `; los ítems piden usar la aplicación «${corto(parte.app, 60)}»` : ""}.
${muestras ? "Ejemplos de ítems de esta parte:\n" + muestras + "\n" : ""}
Formato MEP de la instrucción de una parte: una o dos oraciones en imperativo que digan QUÉ hacer y CÓMO responder en la plataforma (por ejemplo, «Lea cada enunciado y seleccione la opción correcta»), seguidas del valor: «Cada respuesta correcta vale X punto(s). Total: Y puntos.» Para desarrollo o cálculo, indicar que debe mostrar el procedimiento o el asiento completo y el valor. Máximo 450 caracteres.`
    : `Redactá las INSTRUCCIONES GENERALES del examen, que la persona estudiante lee ANTES de comenzar.
Formato MEP: lista breve de 4 a 7 puntos (cada uno en una línea que empieza con «• »): trabajo individual, lectura cuidadosa, tiempo disponible, puntaje total y porcentaje, cómo se responde y se entrega en la plataforma, uso de las aplicaciones indicadas y conducta (no salir de la pantalla, no copiar). Puede cerrar con una frase corta de ánimo. Máximo 900 caracteres.`;

  const prompt = `Sos especialista en evaluación de los aprendizajes del Ministerio de Educación Pública (MEP) de Costa Rica (Reglamento de Evaluación de los Aprendizajes, Decreto 45509-MEP) y docente de la especialidad de Contabilidad. Estudiantes de 15 a 18 años.

${contexto}

${objetivo}

LO QUE PIDE EL DOCENTE (seguilo al pie de la letra; si contradice el formato, manda el docente):
${pedido || "(sin indicaciones adicionales)"}
${actual ? `\nTEXTO ACTUAL (mejoralo, no lo ignores):\n${actual}\n` : ""}
REGLAS
- Español de Costa Rica, trato de «usted», claro, respetuoso y directo; lenguaje inclusivo («la persona estudiante»).
- Usá los datos reales del examen (puntos, minutos, porcentaje); no inventes datos que no estén arriba.
- No uses comillas dobles; si necesitás citar, usá «».
- Respondé ÚNICAMENTE con el texto de la instrucción, sin títulos, sin explicaciones y sin la palabra «Instrucciones:» al inicio.`;

  const llamar = async () => {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-5-5", max_tokens: 1200, messages: [{ role: "user", content: prompt }] })
    });
    return { r, d: await r.json() };
  };

  try {
    const { r, d } = await llamar();
    if (!r.ok) {
      const msg = (d && d.error && d.error.message) || "Error de la IA.";
      if (r.status === 429 || r.status === 529 || r.status >= 500) { res.status(503).json({ error: "La IA está ocupada; intente de nuevo en unos segundos. (" + msg + ")", reintentar: true }); return; }
      res.status(502).json({ error: msg }); return;
    }
    let texto = (d.content || []).map(b => b.text || "").join("").trim()
      .replace(/^```[a-z]*\s*/i, "").replace(/```$/, "").replace(/^instrucciones( generales)?\s*:\s*/i, "").trim();
    if (!texto) { res.status(502).json({ error: "La IA no devolvió una propuesta. Intente de nuevo." }); return; }
    res.status(200).json({ texto: texto.slice(0, esParte ? 700 : 1400) });
  } catch (e) {
    res.status(500).json({ error: "No se pudo consultar la IA: " + (e && e.message ? e.message : "error desconocido") });
  }
};
