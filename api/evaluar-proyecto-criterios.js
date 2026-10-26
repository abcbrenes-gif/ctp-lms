// Función serverless de Vercel: la IA evalúa UNA entrega de proyecto (un solo
// documento, evaluación integral) contra VARIOS indicadores a la vez, cada uno
// con sus criterios por nivel de desempeño, y propone el puntaje de cada
// indicador con una justificación corta.
//
// El profesor lo dispara desde Proyectos → "3. Evaluación según criterios" y
// revisa/ajusta cada puntaje antes de guardarlo — nunca se guarda solo.
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

const TIPOS_ARCHIVO_PERMITIDOS = {
  "application/pdf": "document",
  "image/png": "image",
  "image/jpeg": "image",
  "image/jpg": "image",
  "image/gif": "image",
  "image/webp": "image"
};

const TIPOS_ARCHIVO_DOCX = {
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": true
};

function extraerJson(texto) {
  let limpio = String(texto || "").trim();
  limpio = limpio.replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  const inicioLlave = limpio.indexOf("{");
  const finLlave = limpio.lastIndexOf("}");
  if (inicioLlave !== -1 && finLlave !== -1 && finLlave > inicioLlave) {
    limpio = limpio.slice(inicioLlave, finLlave + 1);
  }
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

  const instrucciones = limpiarHtml(body.instrucciones).slice(0, 2000);
  const titulo = limpiarHtml(body.titulo).slice(0, 300);
  const descripcion = limpiarHtml(body.descripcion).slice(0, 3000);
  const indicadores = (Array.isArray(body.indicadores) ? body.indicadores : []).slice(0, 15).map(i => ({
    letra: limpiarHtml(i.letra).slice(0, 3),
    descripcion: limpiarHtml(i.descripcion).slice(0, 400),
    maximo: Math.max(1, Math.min(10, Number(i.maximo) || 3)),
    criterios: (Array.isArray(i.criterios) ? i.criterios : []).slice(0, 6).map(c => ({
      puntaje: Number(c.puntaje) || 0,
      nivel: limpiarHtml(c.nivel).slice(0, 40),
      descripcion: limpiarHtml(c.descripcion).slice(0, 400)
    }))
  })).filter(i => i.letra && i.descripcion);

  if (!indicadores.length) {
    res.status(400).json({ error: "Faltan los indicadores a evaluar." });
    return;
  }

  const archivo = body.archivo;
  if (!archivo || !archivo.datosBase64) {
    res.status(400).json({ error: "Falta el archivo de la entrega." });
    return;
  }
  const mimeType = String(archivo.mimeType || "");
  const datosBase64 = String(archivo.datosBase64 || "");
  const nombreArchivo = String(archivo.nombre || "").trim();

  let bloqueArchivo = null;
  let textoExtraidoDocx = "";
  if (TIPOS_ARCHIVO_DOCX[mimeType]) {
    try {
      const mammoth = require("mammoth");
      const resultado = await mammoth.extractRawText({ buffer: Buffer.from(datosBase64, "base64") });
      textoExtraidoDocx = String(resultado.value || "").trim().slice(0, 40000);
    } catch (err) {
      res.status(400).json({ error: "No se pudo leer el archivo Word: " + (err && err.message ? err.message : String(err)) });
      return;
    }
  } else {
    const tipoBloque = TIPOS_ARCHIVO_PERMITIDOS[mimeType];
    if (!tipoBloque) {
      res.status(400).json({ error: "Solo se pueden evaluar archivos PDF, Word (.docx) o imágenes (PNG, JPG, GIF, WEBP)." });
      return;
    }
    if (datosBase64.length > 4_000_000) {
      res.status(400).json({ error: "El archivo pesa demasiado para evaluarlo con IA." });
      return;
    }
    bloqueArchivo = { type: tipoBloque, source: { type: "base64", media_type: mimeType, data: datosBase64 } };
  }

  const listaIndicadores = indicadores.map(i => {
    const crit = i.criterios
      .sort((a, b) => a.puntaje - b.puntaje)
      .map(c => `   - ${c.puntaje} punto${c.puntaje === 1 ? "" : "s"}${c.nivel ? ` (${c.nivel})` : ""}: ${c.descripcion}`)
      .join("\n");
    return `${i.letra}) ${i.descripcion} — puntaje máximo ${i.maximo}\n${crit || "   (sin criterios detallados)"}`;
  }).join("\n\n");

  const prompt = `Sos un asistente que ayuda a un profesor de Contabilidad de un colegio técnico (CTP) en Costa Rica a evaluar el proyecto de un estudiante. El proyecto se entrega en UN solo documento y se evalúa de forma integral: el mismo documento se califica con cada uno de los indicadores de abajo.

Instrucciones que el profesor le dio a los estudiantes: ${instrucciones || "(no se especificaron)"}

Indicadores y criterios de evaluación (niveles de desempeño del MEP):
${listaIndicadores}

El estudiante entregó:
- Título: ${titulo || "(sin título)"}
- Descripción: ${descripcion || "(sin descripción)"}
- Archivo${nombreArchivo ? ` (${nombreArchivo})` : ""}: ${bloqueArchivo ? "ver adjunto" : (textoExtraidoDocx ? "ver texto extraído abajo" : "no se pudo leer")}

Tu tarea: leé el documento completo y, para CADA indicador, elegí el nivel cuyo criterio describe mejor lo que el documento realmente contiene, y justificalo en 1 o 2 oraciones citando qué encontraste o qué falta.

Reglas:
- Devolvé ÚNICAMENTE un JSON válido, sin texto antes ni después, con esta forma exacta:
  {"indicadores": [{"letra": "A", "puntaje": 2, "justificacion": "..."}, ...], "comentario": "..."}
- Un objeto por cada indicador de la lista, con la misma letra.
- "puntaje": un entero entre 0 y el puntaje máximo del indicador. Usá 0 solo si el documento no trata ese tema en absoluto.
- "comentario": 2 o 3 oraciones de retroalimentación general para el estudiante, en segunda persona y en español de Costa Rica.
- Sé justo pero exigente. Si el documento no se puede leer, está en blanco o no corresponde al proyecto, poné puntajes bajos y decilo.`;

  try {
    const promptFinal = textoExtraidoDocx
      ? `${prompt}\n\n--- TEXTO EXTRAÍDO DEL ARCHIVO WORD ---\n${textoExtraidoDocx}\n--- FIN DEL TEXTO ---`
      : prompt;
    const contenidoMensaje = bloqueArchivo ? [bloqueArchivo, { type: "text", text: promptFinal }] : promptFinal;
    const respuesta = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-5-5",
        max_tokens: 2500,
        messages: [{ role: "user", content: contenidoMensaje }]
      })
    });
    const datos = await respuesta.json();
    if (!respuesta.ok) {
      res.status(502).json({ error: (datos && datos.error && datos.error.message) || "Error al evaluar con la IA." });
      return;
    }
    const texto = (datos.content || []).map(b => b.text || "").join("").trim();
    let contenido;
    try {
      contenido = extraerJson(texto);
    } catch {
      res.status(502).json({ error: "La IA no devolvió una evaluación válida. Intentá de nuevo." });
      return;
    }
    const maximoPorLetra = {};
    indicadores.forEach(i => { maximoPorLetra[i.letra] = i.maximo; });
    const resultado = (Array.isArray(contenido.indicadores) ? contenido.indicadores : [])
      .filter(x => x && maximoPorLetra[String(x.letra || "").trim()] !== undefined)
      .map(x => {
        const letra = String(x.letra).trim();
        const p = Math.round(Number(x.puntaje));
        return {
          letra,
          puntaje: Number.isFinite(p) ? Math.max(0, Math.min(maximoPorLetra[letra], p)) : 0,
          justificacion: String(x.justificacion || "").trim()
        };
      });
    res.status(200).json({ contenido: { indicadores: resultado, comentario: String(contenido.comentario || "").trim() } });
  } catch (err) {
    res.status(500).json({ error: "No se pudo conectar con la IA: " + (err && err.message ? err.message : String(err)) });
  }
};
