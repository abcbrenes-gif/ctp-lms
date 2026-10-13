// Función serverless de Vercel: a partir de un archivo que el profesor adjunta
// (PDF o imagen) más una instrucción propia, genera un material de apoyo con IA
// (resumen, guía de estudio, explicación, etc.) listo para agregarse al subtema.
//
// El archivo se envía como base64 y se manda directo a Claude como bloque
// multimodal (document/image) — no se procesa ni se guarda en el servidor.
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

const TIPOS_PERMITIDOS = {
  "application/pdf": "document",
  "image/png": "image",
  "image/jpeg": "image",
  "image/jpg": "image",
  "image/gif": "image",
  "image/webp": "image"
};

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

  const tema = limpiarHtml(body.tema).slice(0, 300);
  const contexto = limpiarHtml(body.contexto).slice(0, 1500);
  const instrucciones = limpiarHtml(body.instrucciones).slice(0, 800);
  const archivo = body.archivo || {};
  const mimeType = String(archivo.mimeType || "");
  const datosBase64 = String(archivo.datosBase64 || "");

  if (!datosBase64) {
    res.status(400).json({ error: "Falta el archivo (PDF o imagen) a partir del cual generar el material." });
    return;
  }
  const tipoBloque = TIPOS_PERMITIDOS[mimeType];
  if (!tipoBloque) {
    res.status(400).json({ error: "Solo se aceptan archivos PDF o imágenes (PNG, JPG, GIF, WEBP) para generar material con IA." });
    return;
  }
  // Vercel limita el tamaño del cuerpo de la petición a las funciones serverless
  // a unos 4.5MB; dejamos margen para el resto del JSON y la codificación base64
  // (que agranda el archivo original en ~33%).
  if (datosBase64.length > 3_500_000) {
    res.status(400).json({ error: "El archivo es demasiado grande para generar material con IA. Probá con uno más liviano (máximo ~2.5MB)." });
    return;
  }

  const instruccionesTexto = instrucciones
    ? `Instrucciones del profesor sobre qué generar (seguilas con prioridad sobre lo demás): ${instrucciones}`
    : `El profesor no dio instrucciones específicas: generá un resumen claro con los puntos más importantes del archivo.`;

  const prompt = `Sos un asistente para un profesor de Contabilidad de un colegio técnico (CTP) en Costa Rica.
Te adjunto un archivo (documento o imagen) que el profesor subió como material de clase.

${tema ? `Tema / subtema: ${tema}` : ""}
${contexto ? `Contexto adicional: ${contexto}` : ""}
${instruccionesTexto}

A partir del CONTENIDO REAL del archivo adjunto, generá el material de apoyo que el profesor pidió, dirigido a estudiantes de secundaria, en español de Costa Rica.

Reglas:
- Devolvé ÚNICAMENTE un JSON válido, sin texto antes ni después, con esta forma exacta:
  {"titulo": "...", "contenido_html": "..."}
- "titulo": un título corto (máximo 8 palabras) para este material.
- "contenido_html": el material en HTML simple, usando solo <p>, <h4>, <ul>, <li>, <strong>, <em> — sin markdown, sin <html>/<body>, sin explicaciones fuera del HTML.
- Basate en el contenido real del archivo adjunto, no inventes datos que no estén ahí ni en el contexto dado.
- Texto claro, bien formado, en oraciones completas — nunca lo cortes a la mitad ni termines en "...".`;

  async function llamarIA(promptTexto) {
    const respuesta = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-5-5",
        max_tokens: 3000,
        messages: [{
          role: "user",
          content: [
            {
              type: tipoBloque,
              source: { type: "base64", media_type: mimeType, data: datosBase64 }
            },
            { type: "text", text: promptTexto }
          ]
        }]
      })
    });
    const datos = await respuesta.json();
    if (!respuesta.ok) {
      const mensaje = (datos && datos.error && datos.error.message) || "Error al generar con la IA.";
      throw new Error(mensaje);
    }
    return (datos.content || []).map((bloque) => bloque.text || "").join("").trim();
  }

  try {
    let texto;
    try {
      texto = await llamarIA(prompt);
    } catch (err) {
      res.status(502).json({ error: err.message || "Error al generar con la IA." });
      return;
    }

    let contenido;
    try {
      contenido = extraerJson(texto);
    } catch (err) {
      try {
        const textoReintento = await llamarIA(prompt + "\n\nRecordatorio: respondé SOLO con el objeto JSON, sin explicaciones antes ni después.");
        contenido = extraerJson(textoReintento);
      } catch (err2) {
        res.status(502).json({ error: "La IA no devolvió una respuesta válida. Intentá de nuevo." });
        return;
      }
    }

    res.status(200).json({ contenido });
  } catch (err) {
    res.status(500).json({ error: "No se pudo conectar con la IA: " + (err && err.message ? err.message : String(err)) });
  }
};
