// Función serverless de Vercel: genera (con IA) la descripción de un
// indicador de rúbrica y sus criterios de evaluación — uno por cada nivel de
// desempeño de 1 a 3 (el nivel 0, "No presentado", es fijo y no lo genera la
// IA) — a partir del título/instrucciones del trabajo al que pertenece. El
// profesor revisa y puede editar todo antes de guardar.
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

// Nombres de nivel de desempeño por defecto si la IA no da uno utilizable.
function nombreNivelPorDefecto(puntaje, puntajeMaximo) {
  if (puntajeMaximo === 3) return ["Inicial", "En proceso", "Logrado"][puntaje - 1] || "";
  if (puntajeMaximo === 1) return "Logrado";
  if (puntajeMaximo === 2) return puntaje === 1 ? "En proceso" : "Logrado";
  const escala = ["Inicial", "En proceso", "Logrado", "Avanzado", "Excelente"];
  return escala[Math.min(puntaje - 1, escala.length - 1)];
}

const SEPARADOR = "===CRITERIOS===";

// Se usa un formato de texto plano con un separador en vez de JSON: es mucho
// más tolerante a comillas, tildes, saltos de línea o pequeñas variaciones
// (números con "." en vez de ")", **negritas** de markdown, etc.) que la IA
// no siempre escapa o sigue al pie de la letra.
function extraerDescripcionYCriterios(texto, puntajeMaximo) {
  let limpio = String(texto || "")
    .replace(/^```[a-z]*\n?/i, "")
    .replace(/```\s*$/, "")
    .replace(/\*\*/g, "") // quitar negritas de markdown si la IA las agrega
    .trim();

  const idxSep = limpio.indexOf(SEPARADOR);
  let bloqueDescripcion = "";
  let bloqueCriterios = limpio;
  if (idxSep !== -1) {
    bloqueDescripcion = limpio.slice(0, idxSep).trim();
    bloqueCriterios = limpio.slice(idxSep + SEPARADOR.length).trim();
  }

  // Busca la línea "DESCRIPCION: ..." en cualquier parte del bloque (por si
  // la IA agregó un preámbulo como "Aquí tenés:" antes), no solo al inicio.
  let descripcion = "";
  const matchDescripcion = bloqueDescripcion.match(/(?:^|\n)\s*descripci[oó]n\s*:\s*(.+)/i);
  if (matchDescripcion) {
    descripcion = matchDescripcion[1].replace(/\s+/g, " ").trim();
  } else if (idxSep === -1 && bloqueDescripcion) {
    // No hay separador ni prefijo "DESCRIPCION:" — usamos el bloque tal cual
    // (puede pasar si la IA solo devolvió una línea de descripción).
    descripcion = bloqueDescripcion.replace(/\s+/g, " ").trim();
  }
  descripcion = descripcion.replace(/^```[a-z]*\n?/i, "").replace(/```\s*$/, "").trim();

  const criterios = {};
  // Acepta "1)", "1.", "1 -" o "1:" como marcador de línea, con o sin espacio.
  const regex = /(?:^|\n)\s*(\d+)\s*[\.\)\:]\s*(.+?)(?=\n\s*\d+\s*[\.\)\:]|$)/gs;
  let match;
  while ((match = regex.exec(bloqueCriterios)) !== null) {
    const puntaje = Number(match[1]);
    let resto = match[2].replace(/\s+/g, " ").trim();
    let nivel = "";
    // El formato esperado es "NombreDelNivel: descripción" (o con "—"/" - "
    // como separador) — se separa en el primer separador que aparezca, si
    // no queda demasiado lejos del inicio (para no cortar una descripción
    // que use ":" o "-" dentro del texto).
    const separadores = [
      { token: ":", idx: resto.indexOf(":") },
      { token: "—", idx: resto.indexOf("—") },
      { token: " - ", idx: resto.indexOf(" - ") },
      { token: " – ", idx: resto.indexOf(" – ") }
    ].filter((s) => s.idx !== -1 && s.idx <= 40);
    separadores.sort((a, b) => a.idx - b.idx);
    if (separadores.length) {
      const { token, idx } = separadores[0];
      nivel = resto.slice(0, idx).trim();
      resto = resto.slice(idx + token.length).trim();
    }
    if (puntaje >= 1 && puntaje <= puntajeMaximo && resto) {
      criterios[puntaje] = { descripcion: resto, nivel: nivel || nombreNivelPorDefecto(puntaje, puntajeMaximo) };
    }
  }
  const resultado = [];
  for (let p = 1; p <= puntajeMaximo; p++) {
    if (!criterios[p]) return null; // faltó algún nivel — no es válido, mejor reintentar.
    resultado.push({ puntaje: p, descripcion: criterios[p].descripcion, nivel: criterios[p].nivel });
  }
  return { descripcion, criterios: resultado };
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

  const titulo = limpiarHtml(body.titulo).slice(0, 300);
  const contexto = limpiarHtml(body.contexto).slice(0, 1500);
  const instrucciones = limpiarHtml(body.instrucciones).slice(0, 800);
  const resultadoVinculado = limpiarHtml(body.resultadoAprendizaje).slice(0, 500);
  // El puntaje de los niveles que SÍ redacta la IA siempre es 1 a 3 (el nivel
  // 0, "No presentado", es fijo y no se le pide a la IA). Si llega un
  // puntajeMaximo distinto de indicadores antiguos, se respeta por compatibilidad.
  const puntajeMaximo = Math.max(1, Math.min(20, Number(body.puntajeMaximo) || 3));

  if (!titulo) {
    res.status(400).json({ error: "Falta el título o descripción del indicador/trabajo." });
    return;
  }

  const prompt = `Sos un asistente para un profesor de Contabilidad de un colegio técnico (CTP) en Costa Rica.
Necesito la descripción y los criterios de evaluación de un indicador de rúbrica para calificar un trabajo cotidiano de un estudiante de secundaria, en español de Costa Rica, siguiendo la normativa de evaluación del MEP (Ministerio de Educación Pública) de Costa Rica.

Título o tema base del indicador: ${titulo}
${contexto ? `Instrucciones del trabajo que el estudiante recibió: ${contexto}` : ""}
${resultadoVinculado ? `Resultado de aprendizaje / criterio de evaluación oficial del programa de estudios al que pertenece este indicador: ${resultadoVinculado}` : ""}
${instrucciones ? `Instrucciones del profesor sobre los criterios (seguilas con prioridad): ${instrucciones}` : ""}

Primero necesito una DESCRIPCIÓN del indicador: una sola oración corta (máximo 20 palabras) con formato "verbo + contenido"
(ej. "Calcula las sanciones administrativas del RTS"), basada en el título/tema base de arriba, redactada de forma más
precisa y profesional si hace falta.

Después necesito, para CADA nivel de puntaje de 1 a ${puntajeMaximo}, un nombre de nivel de desempeño y un criterio claro y
concreto, de forma que un nivel más alto represente un trabajo más completo/correcto que uno más bajo (progresivos, no
solo "más o menos bien"). ${puntajeMaximo === 3 ? 'Usá los nombres de nivel "Inicial", "En proceso" y "Logrado" (en ese orden, del puntaje más bajo al más alto), como indica la normativa del MEP. No generés un nivel para el puntaje 0 — ese nivel ("No presentado") ya está definido por el sistema y no lo tenés que redactar vos.' : 'Usá nombres de nivel de desempeño según la normativa del MEP (por ejemplo: Inicial, En proceso, Logrado, Avanzado), progresivos del puntaje más bajo al más alto.'}

Reglas:
- Respondé ÚNICAMENTE con este formato exacto y nada más, sin explicaciones antes ni después:
  DESCRIPCION: la descripción del indicador en una sola línea
  ${SEPARADOR}
  1) NombreDelNivel: texto del criterio para 1 punto
  2) NombreDelNivel: texto del criterio para 2 puntos
  ${puntajeMaximo >= 3 ? "3) NombreDelNivel: texto del criterio para 3 puntos" : ""}
  (así hasta ${puntajeMaximo})
- "NombreDelNivel" es una o dos palabras (ej: "Inicial", "En proceso", "Logrado"), seguido de ":" y luego el criterio.
- Cada criterio: una oración corta y concreta (máximo 20 palabras), sin HTML ni markdown.
- No uses negritas, asteriscos, ni numerés con "Criterio N:", solo "N) NombreDelNivel: texto".
- Si te di un resultado de aprendizaje vinculado, el indicador y sus criterios deben estar alineados con ese resultado.
- Basate en lo que realmente se le pide al estudiante en las instrucciones del trabajo, si las di.`;

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
        max_tokens: 1000,
        messages: [{ role: "user", content: promptTexto }]
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

    let resultado = extraerDescripcionYCriterios(texto, puntajeMaximo);
    if (!resultado) {
      try {
        const textoReintento = await llamarIA(prompt + `\n\nRecordatorio: respondé SOLO con "DESCRIPCION: ..." seguido de "${SEPARADOR}" y luego las líneas "N) NombreDelNivel: texto", una por cada nivel de 1 a ${puntajeMaximo}, sin explicaciones antes ni después ni markdown.`);
        resultado = extraerDescripcionYCriterios(textoReintento, puntajeMaximo);
      } catch (err2) {
        resultado = null;
      }
    }
    if (!resultado) {
      res.status(502).json({ error: "La IA no devolvió una respuesta válida. Intentá de nuevo." });
      return;
    }

    res.status(200).json({ descripcion: resultado.descripcion, criterios: resultado.criterios });
  } catch (err) {
    res.status(500).json({ error: "No se pudo conectar con la IA: " + (err && err.message ? err.message : String(err)) });
  }
};
