// Función serverless de Vercel: a partir de uno o varios archivos que el
// profesor adjunta (PDF o imagen) más una instrucción propia, redacta un
// trabajo cotidiano "normal" (título + instrucciones para el estudiante)
// listo para revisar y agregar en el subtema.
//
// Los archivos se envían como base64 y se mandan directo a Claude como
// bloques multimodales (document/image) — no se procesan ni se guardan en
// el servidor.
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

// Igual que en generar-material-ia.js: se usa un separador de texto plano en
// vez de JSON porque las instrucciones generadas pueden traer comillas,
// saltos de línea, etc. que rompen un JSON mal escapado.
const SEPARADOR = "===INSTRUCCIONES===";

function extraerTituloYContenido(texto) {
  let limpio = String(texto || "").trim();
  limpio = limpio.replace(/^```[a-z]*\n?/i, "").replace(/```\s*$/, "").trim();

  const idx = limpio.indexOf(SEPARADOR);
  if (idx === -1) {
    throw new Error("La respuesta de la IA no tiene el formato esperado.");
  }
  let titulo = limpio.slice(0, idx).replace(/^t[ií]tulo:?/i, "").trim();
  let contenido = limpio.slice(idx + SEPARADOR.length).trim();
  contenido = contenido.replace(/^```[a-z]*\n?/i, "").replace(/```\s*$/, "").trim();
  if (!titulo) titulo = "Trabajo generado con IA";
  if (!contenido) throw new Error("La IA no generó contenido.");
  return { titulo, instrucciones_html: contenido };
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

  // Acepta varios archivos (body.archivos, un arreglo) o, por compatibilidad
  // con versiones anteriores, uno solo (body.archivo).
  const archivosRaw = Array.isArray(body.archivos) ? body.archivos : (body.archivo ? [body.archivo] : []);

  if (!archivosRaw.length) {
    res.status(400).json({ error: "Falta el archivo (PDF o imagen) a partir del cual generar el trabajo." });
    return;
  }

  const bloquesArchivo = [];
  let totalLen = 0;
  for (const a of archivosRaw) {
    const mimeType = String((a && a.mimeType) || "");
    const datosBase64 = String((a && a.datosBase64) || "");
    if (!datosBase64) continue;
    const tipoBloque = TIPOS_PERMITIDOS[mimeType];
    if (!tipoBloque) {
      res.status(400).json({ error: "Solo se aceptan archivos PDF o imágenes (PNG, JPG, GIF, WEBP) para generar el trabajo con IA." });
      return;
    }
    totalLen += datosBase64.length;
    bloquesArchivo.push({ type: tipoBloque, source: { type: "base64", media_type: mimeType, data: datosBase64 } });
  }
  if (!bloquesArchivo.length) {
    res.status(400).json({ error: "Falta el archivo (PDF o imagen) a partir del cual generar el trabajo." });
    return;
  }
  if (totalLen > 9_000_000) {
    res.status(400).json({ error: "Los archivos son demasiado grandes en conjunto para generar el trabajo con IA. Probá con menos archivos o más livianos." });
    return;
  }

  const instruccionesTexto = instrucciones
    ? `Instrucciones del profesor sobre qué pedirle al estudiante (seguilas con prioridad sobre lo demás): ${instrucciones}`
    : `El profesor no dio instrucciones específicas: generá un trabajo (ejercicio o pregunta de aplicación) basado en el contenido real del archivo.`;

  const prompt = `Sos un asistente para un profesor de Contabilidad de un colegio técnico (CTP) en Costa Rica.
Te adjunto ${bloquesArchivo.length > 1 ? `${bloquesArchivo.length} archivos (documentos y/o imágenes)` : "un archivo (documento o imagen)"} que el profesor subió como base para crear un "trabajo cotidiano": una tarea o ejercicio corto que el estudiante entrega y se califica con una rúbrica.
${bloquesArchivo.length > 1 ? "Usá la información de TODOS los archivos juntos, combinándola, para armar un solo trabajo coherente." : ""}

${tema ? `Tema / subtema: ${tema}` : ""}
${contexto ? `Contexto adicional: ${contexto}` : ""}
${instruccionesTexto}

A partir del CONTENIDO REAL de${bloquesArchivo.length > 1 ? " los archivos adjuntos" : "l archivo adjunto"}, redactá el título y las instrucciones de este trabajo cotidiano, dirigido a estudiantes de secundaria, en español de Costa Rica.

Reglas:
- Respondé ÚNICAMENTE con este formato exacto, sin nada antes ni después:
  TITULO: (un título corto, máximo 10 palabras, en una sola línea)
  ===INSTRUCCIONES===
  (las instrucciones del trabajo para el estudiante, en HTML simple, usando solo <p>, <ul>, <li>, <strong>, <em> — podés usar varios párrafos y saltos de línea con normalidad)
- No uses markdown (nada de \`\`\`, #, **), ni <html>/<body>, ni expliques nada fuera de esas dos partes.
- Las instrucciones deben decirle claramente al estudiante qué tiene que hacer y entregar.
- Basate en el contenido real d${bloquesArchivo.length > 1 ? "e los archivos adjuntos" : "el archivo adjunto"}, no inventes datos que no estén ahí ni en el contexto dado.
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
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: [...bloquesArchivo, { type: "text", text: promptTexto }]
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
      contenido = extraerTituloYContenido(texto);
    } catch (err) {
      try {
        const textoReintento = await llamarIA(prompt + "\n\nRecordatorio: respondé SOLO con \"TITULO: ...\" seguido de \"===INSTRUCCIONES===\" y el HTML, sin explicaciones antes ni después.");
        contenido = extraerTituloYContenido(textoReintento);
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
