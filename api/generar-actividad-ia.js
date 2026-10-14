// Función serverless de Vercel: genera el CONTENIDO de una actividad interactiva
// (selección única, falso/verdadero, sopa de letras, crucigrama o infografía)
// a partir del tema del subtema, usando IA.
//
// El profesor revisa y puede editar todo antes de guardar — esto solo llena
// el formulario de autoría, no crea la actividad directamente.
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

// Los .docx no se pueden mandar como bloque multimodal a Claude (solo PDF e
// imágenes); en vez de eso se les extrae el texto en el servidor (con
// mammoth) y ese texto se agrega como contexto al prompt.
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

const PROMPTS = {
  seleccion_unica: (tema, contexto, instrucciones) => `Sos un asistente para un profesor de Contabilidad de un colegio técnico (CTP) en Costa Rica.
Generá 15 preguntas de selección única (opción múltiple) sobre este tema para una actividad de evaluación de estudiantes de secundaria.

Tema: ${tema}
${contexto ? `Contexto adicional: ${contexto}` : ""}
${instrucciones ? `\nInstrucciones del profesor (seguilas con prioridad sobre lo demás): ${instrucciones}\n` : ""}
Reglas:
- Devolvé ÚNICAMENTE un JSON válido, sin texto antes ni después, con esta forma exacta:
  {"preguntas": [{"pregunta": "...", "opciones": ["...", "...", "...", "..."], "correcta": 0}, ...]}
- Exactamente 15 preguntas, cada una con exactamente 4 opciones.
- "correcta" es el índice (0, 1, 2 o 3) de la opción correcta.
- Las 4 opciones deben ser plausibles (nada de respuestas absurdas obvias), en español de Costa Rica.
- Variá cuál índice es el correcto entre las preguntas (no pongas siempre 0).
- Preguntas claras, de nivel de colegio técnico, basadas en contenido real del tema.
- Cada pregunta y cada opción debe ser una oración u oración corta COMPLETA y bien formada en
  español de Costa Rica — nunca la cortes a la mitad, nunca termines en "..." ni dejes una idea
  sin terminar. Revisá cada una antes de responder.`,

  falso_verdadero: (tema, contexto, instrucciones) => `Sos un asistente para un profesor de Contabilidad de un colegio técnico (CTP) en Costa Rica.
Generá 10 afirmaciones de verdadero/falso sobre este tema para una actividad de evaluación de estudiantes de secundaria.

Tema: ${tema}
${contexto ? `Contexto adicional: ${contexto}` : ""}
${instrucciones ? `\nInstrucciones del profesor (seguilas con prioridad sobre lo demás): ${instrucciones}\n` : ""}
Reglas:
- Devolvé ÚNICAMENTE un JSON válido, sin texto antes ni después, con esta forma exacta:
  {"afirmaciones": [{"texto": "...", "correcta": true}, ...]}
- Exactamente 10 afirmaciones.
- "correcta" es true si la afirmación es verdadera, false si es falsa.
- Mezclá verdaderas y falsas (no pongas todas verdaderas ni todas falsas).
- Afirmaciones claras y concretas, en español de Costa Rica, basadas en contenido real del tema.
- Cada afirmación debe ser una oración COMPLETA y bien formada — nunca la cortes a la mitad ni
  termines en "...". Revisá cada una antes de responder.`,

  sopa_letras: (tema, contexto, instrucciones) => `Sos un asistente para un profesor de Contabilidad de un colegio técnico (CTP) en Costa Rica.
Generá una lista de 10 palabras clave (una sola palabra cada una, sin espacios ni tildes, en mayúsculas) relacionadas con este tema, para una sopa de letras.

Tema: ${tema}
${contexto ? `Contexto adicional: ${contexto}` : ""}
${instrucciones ? `\nInstrucciones del profesor (seguilas con prioridad sobre lo demás): ${instrucciones}\n` : ""}
Reglas:
- Devolvé ÚNICAMENTE un JSON válido, sin texto antes ni después, con esta forma exacta:
  {"palabras": ["PALABRA1", "PALABRA2", ...]}
- Exactamente 10 palabras.
- Cada palabra: una sola palabra (sin espacios), SIN TILDES, en MAYÚSCULAS, entre 4 y 12 letras.
- Términos técnicos reales y relevantes del tema.`,

  crucigrama: (tema, contexto, instrucciones) => `Sos un asistente para un profesor de Contabilidad de un colegio técnico (CTP) en Costa Rica.
Generá 7 pares de palabra+pista sobre este tema para un crucigrama.

Tema: ${tema}
${contexto ? `Contexto adicional: ${contexto}` : ""}
${instrucciones ? `\nInstrucciones del profesor (seguilas con prioridad sobre lo demás): ${instrucciones}\n` : ""}
Reglas:
- Devolvé ÚNICAMENTE un JSON válido, sin texto antes ni después, con esta forma exacta:
  {"items": [{"palabra": "PALABRA", "pista": "Definición o pista corta"}, ...]}
- Exactamente 7 pares.
- "palabra": una sola palabra (sin espacios), SIN TILDES, en MAYÚSCULAS, entre 4 y 12 letras.
- "pista": una definición corta (máximo 15 palabras) pero una oración COMPLETA y bien formada, en
  español de Costa Rica, sin mencionar la palabra. Nunca la cortes a la mitad ni termines en "...".
- Preferí palabras que compartan letras entre sí (para que el crucigrama pueda cruzarlas), pero priorizá que sean términos reales del tema.`,

  infografia: (tema, contexto, instrucciones) => `Sos un asistente para un profesor de Contabilidad de un colegio técnico (CTP) en Costa Rica.
Escribí instrucciones breves (3 a 5 oraciones) para que un estudiante de secundaria haga una infografía sobre este tema, que luego sube como imagen o PDF.

Tema: ${tema}
${contexto ? `Contexto adicional: ${contexto}` : ""}
${instrucciones ? `\nInstrucciones del profesor (seguilas con prioridad sobre lo demás): ${instrucciones}\n` : ""}
Reglas:
- Devolvé ÚNICAMENTE un JSON válido, sin texto antes ni después, con esta forma exacta:
  {"instrucciones": "..."}
- Instrucciones claras, en español de Costa Rica, en texto plano (sin HTML ni markdown).
- Mencioná qué debe incluir la infografía (al menos 3 elementos concretos del tema) y que puede usar herramientas como Canva.`,

  prueba: (tema, contexto, instrucciones) => `Sos un asistente para un profesor de Contabilidad de un colegio técnico (CTP) en Costa Rica, ayudando a pasar una prueba escrita a formato digital.

Tema: ${tema}
${contexto ? `Contexto adicional: ${contexto}` : ""}
${instrucciones ? `\nInstrucciones del profesor (seguilas con prioridad sobre lo demás): ${instrucciones}\n` : ""}
Si se adjuntó el texto de un examen real (PDF, imagen o Word ya extraído como texto), tu tarea es DIGITALIZARLO: tomá las preguntas, opciones, ítems de apareamiento y casos prácticos EXACTAMENTE como aparecen en el documento (mismo texto, mismo orden), sin inventar preguntas nuevas ni cambiar la redacción. Si no se adjuntó ningún documento, generá vos un examen razonable sobre el tema dado.

IMPORTANTE sobre las respuestas correctas: el examen que se le entrega al estudiante casi nunca trae marcada la respuesta correcta ni la pareja correcta de cada ítem de apareamiento (son espacios en blanco para que el estudiante conteste). Vos SÍ tenés que determinar cuál es la respuesta/pareja correcta de cada ítem, usando tu conocimiento real de contabilidad y legislación tributaria costarricense — no copiés el orden del documento como si fuera la respuesta. El profesor va a revisar y puede corregir cualquier respuesta antes de publicar la prueba.

Reglas:
- Devolvé ÚNICAMENTE un JSON válido, sin texto antes ni después, con esta forma exacta:
  {
    "instrucciones": "una oración breve de instrucciones generales para la parte de selección única (o vacío)",
    "preguntas": [{"pregunta": "...", "opciones": ["...", "...", "..."], "correcta": 0}, ...],
    "apareamiento": {"pares": [{"situacion": "...", "respuesta": "..."}, ...], "instrucciones": "..."} ó null si el examen no tiene esa sección,
    "casoPractico": {"enunciado": "...", "instruccion": "..."} ó null si el examen no tiene esa sección
  }
- "preguntas": cada una con 3 opciones (nunca 4, y nunca "todas/ninguna de las anteriores" — así lo exige el formato MEP de pruebas escritas). "correcta" es el índice (0, 1 o 2) de la opción correcta real.
- "apareamiento.pares": cada "situacion" (columna A) emparejada con su "respuesta" correcta real (columna B) — el índice dentro del arreglo es lo que define la pareja correcta, así que ordená los pares vos mismo según la pareja real, no según el orden visual del documento. Máximo 5 pares (si el documento trae más, elegí los 5 más representativos o generá un segundo bloque con el resto en las instrucciones).
- "casoPractico.enunciado" puede llevar HTML simple (<p>, <table>, <tr>, <td>, <strong>) si el caso incluye una tabla de datos; "instruccion" es un texto plano corto con lo que debe hacer el estudiante.
- Si el examen original no tiene apareamiento o caso práctico, esos campos van en null (no inventes secciones que no existen).
- Nunca cortes una pregunta, opción o enunciado a la mitad ni termines en "...". Español de Costa Rica.`
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

  const tipo = String(body.tipo || "");
  const tema = limpiarHtml(body.tema).slice(0, 300);
  const contexto = limpiarHtml(body.contexto).slice(0, 2000);
  let instrucciones = limpiarHtml(body.instrucciones).slice(0, 800);

  // Acepta varios archivos (body.archivos, un arreglo) o, por compatibilidad
  // con versiones anteriores, uno solo (body.archivo).
  const archivosRaw = Array.isArray(body.archivos) ? body.archivos : (body.archivo ? [body.archivo] : []);
  const bloquesArchivo = [];
  const textosExtraidosDocx = [];
  let totalLen = 0;
  for (const archivo of archivosRaw) {
    if (!archivo || !archivo.datosBase64) continue;
    const mimeType = String(archivo.mimeType || "");
    const datosBase64 = String(archivo.datosBase64 || "");
    const nombre = String(archivo.nombre || "").trim();
    totalLen += datosBase64.length;
    if (TIPOS_ARCHIVO_DOCX[mimeType]) {
      // Word: no se puede mandar como bloque multimodal a Claude — se le
      // extrae el texto en el servidor y se agrega como bloque de texto.
      try {
        const mammoth = require("mammoth");
        const resultado = await mammoth.extractRawText({ buffer: Buffer.from(datosBase64, "base64") });
        const texto = String(resultado.value || "").trim().slice(0, 30000);
        if (texto) textosExtraidosDocx.push(nombre ? `[${nombre}]\n${texto}` : texto);
      } catch (err) {
        res.status(400).json({ error: "No se pudo leer un archivo Word: " + (err && err.message ? err.message : String(err)) });
        return;
      }
    } else {
      const tipoBloque = TIPOS_ARCHIVO_PERMITIDOS[mimeType];
      if (!tipoBloque) {
        res.status(400).json({ error: "Solo se aceptan archivos PDF, Word (.docx) o imágenes (PNG, JPG, GIF, WEBP) como apoyo para generar la actividad." });
        return;
      }
      bloquesArchivo.push({ type: tipoBloque, source: { type: "base64", media_type: mimeType, data: datosBase64 } });
    }
  }
  if (totalLen > 9_000_000) {
    res.status(400).json({ error: "Los archivos son demasiado grandes en conjunto. Probá con menos archivos o más livianos." });
    return;
  }
  if (!bloquesArchivo.length && !textosExtraidosDocx.length && archivosRaw.length) {
    res.status(400).json({ error: "No se pudo leer ningún archivo adjunto." });
    return;
  }
  const textoExtraidoDocx = textosExtraidosDocx.join("\n\n---\n\n");
  if (bloquesArchivo.length || textosExtraidosDocx.length) {
    const varios = (bloquesArchivo.length + textosExtraidosDocx.length) > 1;
    instrucciones = `${instrucciones ? instrucciones + " " : ""}Basate en el CONTENIDO REAL d${varios ? "e los archivos adjuntos" : "el archivo adjunto"} (no inventes datos que no estén ahí ni en el tema/contexto dado)${varios ? ", combinando la información de todos" : ""}.`.trim();
  }

  if (!PROMPTS[tipo]) {
    res.status(400).json({ error: "Tipo de actividad no soportado." });
    return;
  }
  if (!tema) {
    res.status(400).json({ error: "Falta el tema de la actividad." });
    return;
  }

  const prompt = PROMPTS[tipo](tema, contexto, instrucciones);
  // La selección única (15 preguntas x 4 opciones) es la respuesta más larga —
  // le damos más margen para que no se corte a la mitad. "prueba" puede traer
  // muchas más preguntas (la cantidad la define el documento adjunto), así
  // que le damos el margen más grande de todos.
  const maxTokens = tipo === "prueba" ? 8000 : (tipo === "seleccion_unica" ? 6000 : (tipo === "falso_verdadero" || tipo === "crucigrama" ? 4000 : 2000));

  async function llamarIA(promptTexto) {
    const promptConDocx = textoExtraidoDocx
      ? `${promptTexto}\n\n--- TEXTO EXTRAÍDO DE${textosExtraidosDocx.length > 1 ? " LOS ARCHIVOS WORD ADJUNTOS" : "L ARCHIVO WORD ADJUNTO"} ---\n${textoExtraidoDocx}\n--- FIN DEL TEXTO EXTRAÍDO ---`
      : promptTexto;
    const contenidoMensaje = bloquesArchivo.length
      ? [...bloquesArchivo, { type: "text", text: promptConDocx }]
      : promptConDocx;
    const respuesta = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-5-5",
        max_tokens: maxTokens,
        messages: [{ role: "user", content: contenidoMensaje }]
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
        const textoReintento = await llamarIA(prompt + "\n\nRecordatorio: respondé SOLO con el objeto JSON, sin explicaciones antes ni después, y sin cortar el texto a la mitad.");
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
