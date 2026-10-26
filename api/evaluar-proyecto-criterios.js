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

  // El archivo llega de una de dos formas:
  //  - archivo.url: enlace público del documento en el almacenamiento de la
  //    plataforma (Supabase). Es lo normal: así no hay límite de tamaño en el
  //    envío (Vercel corta los cuerpos de más de ~4,5 MB) — la IA lee el PDF o
  //    la imagen directo desde el enlace, y un Word se descarga acá.
  //  - archivo.datosBase64: el archivo completo (respaldo, solo archivos chicos).
  const archivo = body.archivo || {};
  const PREFIJO_ALMACENAMIENTO = "https://dyulfowcvvmdmwbjhubq.supabase.co/storage/v1/object/public/";
  const url = String(archivo.url || "");
  if (url && !url.startsWith(PREFIJO_ALMACENAMIENTO)) {
    res.status(400).json({ error: "El enlace del archivo no es del almacenamiento de la plataforma." });
    return;
  }
  if (!url && !archivo.datosBase64) {
    res.status(400).json({ error: "Falta el archivo de la entrega." });
    return;
  }
  const mimeType = String(archivo.mimeType || "");
  let datosBase64 = String(archivo.datosBase64 || "");
  const nombreArchivo = String(archivo.nombre || "").trim();

  let bloqueArchivo = null;
  let textoExtraidoDocx = "";
  if (TIPOS_ARCHIVO_DOCX[mimeType]) {
    try {
      let buffer;
      if (url) {
        const r = await fetch(url);
        if (!r.ok) throw new Error("no se pudo descargar el documento (" + r.status + ")");
        buffer = Buffer.from(await r.arrayBuffer());
      } else {
        buffer = Buffer.from(datosBase64, "base64");
      }
      const mammoth = require("mammoth");
      const resultado = await mammoth.extractRawText({ buffer });
      textoExtraidoDocx = String(resultado.value || "").trim().slice(0, 40000);
    } catch (err) {
      res.status(400).json({ error: "No se pudo leer el archivo Word: " + (err && err.message ? err.message : String(err)) });
      return;
    }
  } else {
    const tipoBloque = TIPOS_ARCHIVO_PERMITIDOS[mimeType];
    if (!tipoBloque) {
      const ext = (nombreArchivo.split(".").pop() || "").toLowerCase();
      res.status(400).json({ error: `La IA no puede leer este tipo de archivo${ext && ext !== nombreArchivo.toLowerCase() ? ` (.${ext})` : ""}. Solo PDF, Word (.docx) o imágenes: pedile al estudiante que lo vuelva a subir en PDF o Word.` });
      return;
    }
    if (url) {
      bloqueArchivo = { type: tipoBloque, source: { type: "url", url } };
    } else {
      if (datosBase64.length > 4_000_000) {
        res.status(400).json({ error: "El archivo pesa demasiado para evaluarlo con IA." });
        return;
      }
      bloqueArchivo = { type: tipoBloque, source: { type: "base64", media_type: mimeType, data: datosBase64 } };
    }
  }

  const listaIndicadores = indicadores.map(i => {
    const crit = i.criterios
      .sort((a, b) => a.puntaje - b.puntaje)
      .map(c => `   - ${c.puntaje} punto${c.puntaje === 1 ? "" : "s"}${c.nivel ? ` (${c.nivel})` : ""}: ${c.descripcion}`)
      .join("\n");
    return `${i.letra}) ${i.descripcion} — puntaje máximo ${i.maximo}\n${crit || "   (sin criterios detallados)"}`;
  }).join("\n\n");

  // Prompt con el formato del profesor: evaluador académico riguroso que
  // califica EXCLUSIVAMENTE con la rúbrica y solo con evidencias escritas en
  // el trabajo, cita fragmentos, da oportunidad de mejora por criterio y un
  // dictamen final con la suma de puntos.
  const prompt = `[ROL Y OBJETIVO]
Actuá como un evaluador académico experto y riguroso de la especialidad de Contabilidad de un colegio técnico (CTP) en Costa Rica. Tu tarea es analizar el documento adjunto del estudiante y calificarlo de forma objetiva utilizando EXCLUSIVAMENTE los criterios establecidos en la RÚBRICA DE EVALUACIÓN. El proyecto se entrega en un solo documento y se evalúa de forma integral: el mismo documento se califica con cada criterio de la rúbrica.

[INSTRUCCIONES QUE RECIBIÓ EL ESTUDIANTE]
${instrucciones || "(no se especificaron)"}

[RÚBRICA DE EVALUACIÓN]
"""
${listaIndicadores}
"""

[REGLAS DE EVALUACIÓN]
1. Basate estricta y únicamente en las evidencias visibles dentro del trabajo entregado. No asumas ni infieras información que no esté escrita.
2. Compará el contenido de cada sección del trabajo contra cada criterio de la rúbrica.
3. Asigná el puntaje exacto de la escala cuyo nivel describa mejor el desempeño en cada criterio. Usá 0 solo si el trabajo no trata ese criterio en absoluto.
4. Justificá cada calificación citando fragmentos textuales breves o aspectos concretos del trabajo analizado (entre comillas cuando sea una cita).
5. Indicá qué le faltó para alcanzar el puntaje máximo en cada criterio (si ya tiene el máximo, dejalo vacío).
6. Si el documento no se puede leer, está en blanco o no corresponde al proyecto, asigná puntajes bajos y decilo en las justificaciones.

[TRABAJO A EVALUAR]
- Título: ${titulo || "(sin título)"}
- Descripción: ${descripcion || "(sin descripción)"}
- Documento${nombreArchivo ? ` (${nombreArchivo})` : ""}: ${bloqueArchivo ? "ver adjunto" : (textoExtraidoDocx ? "ver texto extraído abajo" : "no se pudo leer")}

[FORMATO DE SALIDA]
Devolvé ÚNICAMENTE un JSON válido, sin texto antes ni después, con esta forma exacta (un objeto por cada criterio de la rúbrica, con la misma letra):
{"indicadores": [{"letra": "A", "puntaje": 2, "nivel": "En proceso", "justificacion": "...", "evidencia": "cita o aspecto concreto del trabajo", "mejora": "qué le faltó para el máximo"}, ...], "comentario": "..."}
- "puntaje": entero entre 0 y el puntaje máximo del criterio.
- "nivel": el nombre del nivel de desempeño de la rúbrica que corresponde a ese puntaje.
- "justificacion": 1 a 3 oraciones explicando por qué se asignó ese puntaje.
- "evidencia": fragmento textual breve o aspecto concreto del trabajo que respalda el puntaje.
- "mejora": qué le faltó para el puntaje máximo; cadena vacía si obtuvo el máximo.
- "comentario": retroalimentación general para el estudiante (2 a 4 oraciones, en segunda persona y en español de Costa Rica).`;

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
        max_tokens: 4000,
        messages: [{ role: "user", content: contenidoMensaje }]
      })
    });
    const datos = await respuesta.json();
    if (!respuesta.ok) {
      const mensaje = (datos && datos.error && datos.error.message) || "Error al evaluar con la IA.";
      // 429 (límite de velocidad) y 529 (IA saturada) son temporales: el
      // navegador reintenta solo cuando recibe 503.
      if (respuesta.status === 429 || respuesta.status === 529 || respuesta.status >= 500) {
        res.status(503).json({ error: "La IA está ocupada en este momento; se reintenta en unos segundos. (" + mensaje + ")", reintentar: true });
        return;
      }
      let detalle = mensaje;
      if (/page|páginas|pages/i.test(mensaje) && /100/.test(mensaje)) detalle = "El PDF tiene más de 100 páginas; la IA no puede leerlo completo.";
      else if (/too large|size|exceed/i.test(mensaje)) detalle = "El documento es demasiado grande para la IA (" + mensaje + "). Pedile al estudiante una versión más liviana.";
      res.status(502).json({ error: detalle });
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
          nivel: String(x.nivel || "").trim().slice(0, 40),
          justificacion: String(x.justificacion || "").trim(),
          evidencia: String(x.evidencia || "").trim(),
          mejora: String(x.mejora || "").trim()
        };
      });
    res.status(200).json({ contenido: { indicadores: resultado, comentario: String(contenido.comentario || "").trim() } });
  } catch (err) {
    res.status(500).json({ error: "No se pudo conectar con la IA: " + (err && err.message ? err.message : String(err)) });
  }
};
