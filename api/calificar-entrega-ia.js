// Función serverless de Vercel: la IA califica UNA entrega individual de una
// actividad tipo "Proyecto" (ej. una ley subida por el estudiante), usando
// los criterios del indicador como guía, en una escala de 0 a 100.
//
// El profesor dispara esto con el botón "🤖 Calificar con IA" desde el
// panel de entregas — nunca pasa automáticamente al entregar el estudiante.
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

  const instrucciones = limpiarHtml(body.instrucciones).slice(0, 1500);
  const criterios = limpiarHtml(body.criterios).slice(0, 3000);
  const campoTitulo = limpiarHtml(body.campoTitulo).slice(0, 100) || "Título";
  const campoDescripcion = limpiarHtml(body.campoDescripcion).slice(0, 100) || "Descripción";
  const titulo = limpiarHtml(body.titulo).slice(0, 300);
  const descripcion = limpiarHtml(body.descripcion).slice(0, 5000);
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
      textoExtraidoDocx = String(resultado.value || "").trim().slice(0, 30000);
    } catch (err) {
      res.status(400).json({ error: "No se pudo leer el archivo Word: " + (err && err.message ? err.message : String(err)) });
      return;
    }
  } else {
    const tipoBloque = TIPOS_ARCHIVO_PERMITIDOS[mimeType];
    if (!tipoBloque) {
      res.status(400).json({ error: "Solo se pueden calificar archivos PDF, Word (.docx) o imágenes (PNG, JPG, GIF, WEBP)." });
      return;
    }
    if (datosBase64.length > 4_000_000) {
      res.status(400).json({ error: "El archivo pesa demasiado para calificarlo con IA." });
      return;
    }
    bloqueArchivo = { type: tipoBloque, source: { type: "base64", media_type: mimeType, data: datosBase64 } };
  }

  const prompt = `Sos un asistente que ayuda a un profesor de Contabilidad de un colegio técnico (CTP) en Costa Rica a calificar la entrega de un estudiante.

Instrucciones que el profesor le dio a los estudiantes para esta entrega: ${instrucciones || "(no se especificaron)"}

Criterios de evaluación del profesor para este trabajo (niveles de desempeño):
${criterios || "(el profesor no definió criterios detallados — usá tu criterio profesional sobre qué hace que una entrega de este tipo sea buena)"}

El estudiante entregó:
- ${campoTitulo}: ${titulo || "(sin título)"}
- ${campoDescripcion}: ${descripcion || "(sin descripción)"}
- Archivo adjunto${nombreArchivo ? ` (${nombreArchivo})` : ""}: ${bloqueArchivo ? "ver adjunto" : (textoExtraidoDocx ? "ver texto extraído abajo" : "no se pudo leer")}

Tu tarea: revisá el archivo adjunto (y el título/descripción) contra los criterios del profesor, y poné una nota de 0 a 100 que refleje qué tan bien cumple la entrega, más una justificación breve (2-4 oraciones, en español de Costa Rica, dirigida al profesor) explicando por qué le pusiste esa nota, mencionando aciertos y lo que falta o está mal si corresponde.

Reglas:
- Devolvé ÚNICAMENTE un JSON válido, sin texto antes ni después, con esta forma exacta:
  {"nota": 85, "justificacion": "..."}
- "nota": un número entero de 0 a 100.
- Sé justo pero exigente — una entrega vacía, en blanco, que no corresponde al tema, o que es copia literal de otra fuente sin trabajo propio, merece una nota baja (0-30). Una entrega completa, correcta y bien explicada merece una nota alta (85-100).
- Si el archivo no se puede leer o no tiene relación con lo pedido, poné nota baja y decilo en la justificación.`;

  async function llamarIA() {
    const promptFinal = textoExtraidoDocx
      ? `${prompt}\n\n--- TEXTO EXTRAÍDO DEL ARCHIVO WORD ADJUNTO ---\n${textoExtraidoDocx}\n--- FIN DEL TEXTO EXTRAÍDO ---`
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
        max_tokens: 700,
        messages: [{ role: "user", content: contenidoMensaje }]
      })
    });
    const datos = await respuesta.json();
    if (!respuesta.ok) {
      const mensaje = (datos && datos.error && datos.error.message) || "Error al calificar con la IA.";
      throw new Error(mensaje);
    }
    return (datos.content || []).map((bloque) => bloque.text || "").join("").trim();
  }

  try {
    let texto;
    try {
      texto = await llamarIA();
    } catch (err) {
      res.status(502).json({ error: err.message || "Error al calificar con la IA." });
      return;
    }
    let contenido;
    try {
      contenido = extraerJson(texto);
    } catch (err) {
      res.status(502).json({ error: "La IA no devolvió una nota válida. Intentá de nuevo." });
      return;
    }
    const nota = Number(contenido.nota);
    if (!Number.isFinite(nota)) {
      res.status(502).json({ error: "La IA no devolvió una nota numérica válida." });
      return;
    }
    res.status(200).json({ contenido: { nota: Math.max(0, Math.min(100, Math.round(nota))), justificacion: String(contenido.justificacion || "").trim() } });
  } catch (err) {
    res.status(500).json({ error: "No se pudo conectar con la IA: " + (err && err.message ? err.message : String(err)) });
  }
};
