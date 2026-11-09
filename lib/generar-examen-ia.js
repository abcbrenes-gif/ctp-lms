// Función serverless de Vercel: la IA escribe los reactivos de UN tema de un
// examen (con el contenido que se vio en la plataforma), en el formato que
// importa el módulo de Exámenes. Se llama una vez por tema. Todo queda como
// BORRADOR: el docente revisa cada reactivo antes de publicar.
// La llave (ANTHROPIC_API_KEY) se lee de las variables de entorno de Vercel.

const corto = (v, n) => String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, n);
function extraerJson(t) {
  let s = String(t || "").trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a !== -1 && b > a) s = s.slice(a, b + 1);
  return JSON.parse(s);
}
// Tipos de ítem de los lineamientos técnicos del MEP para la prueba escrita (DDC/DEVA).
const TIPOS = {
  seleccion_unica: "selección única: enunciado y EXACTAMENTE 3 opciones homogéneas en longitud y temática, una sola correcta, clave en posición al azar; prohibido «todas las anteriores» y «ninguna de las anteriores»; si es oración incompleta, el espacio va al final; 1 punto",
  correspondencia: "correspondencia: CADA reactivo es una relación; enunciado = columna A; respuesta_correcta = su respuesta de la columna B; opciones_o_valor_esperado = la lista completa de la columna B (igual en todas las relaciones, con 1 o 2 respuestas extra que no se usan); todas sobre UN mismo aprendizaje; máximo 5 relaciones por tema; 1 punto cada una",
  respuesta_corta: "respuesta corta: pide información breve y definida, indica en el enunciado cuántas respuestas se esperan y la unidad si aplica; verbos: anote, escriba, cite, defina, indique, enumere; el enunciado no termina en artículo, «ser», «estar» ni preposición; 1 a 5 puntos (1 por respuesta); respuesta_correcta = la respuesta y opciones_o_valor_esperado = otras formas aceptadas",
  resolucion_ejercicios: "resolución de ejercicios: aplicación de un procedimiento con una sola solución; el enunciado trae TODOS los datos; no exige más de tres conocimientos previos; opciones_o_valor_esperado = {\"valor\": número, \"margen\": 1}; respuesta_correcta = el número sin separadores; puntos según los procedimientos (por ejemplo 3 a 6)",
  respuesta_restringida: "respuesta restringida: indica con precisión cuántas respuestas se esperan; verbos: explique, justifique, argumente, compare, contraste; NO combinar «cite y explique» ni «escriba y justifique»; puntos = número de respuestas solicitadas; respuesta_correcta = la respuesta esperada; escala_calificacion = qué vale cada respuesta",
  resolucion_problemas: "resolución de problemas: situación auténtica de una empresa costarricense con todos los datos, procedimiento no obvio (por ejemplo un asiento, una liquidación o una planilla); puntos según los procesos necesarios (por ejemplo 6); respuesta_correcta = la solución completa; escala_calificacion = escala de desempeño visible para el estudiante con indicadores y su puntaje (por ejemplo 0 a 2 por indicador)"
};
const PARAMETROS = `Parámetros vigentes en la plataforma (2026, Costa Rica): cargas obreras 10,83 % (SEM 5,50 % + IVM 4,33 % + Banco Popular 1 %); cargas patronales 26,83 % (SEM 9,25 % + IVM 5,58 % + FODESAF 5 % + IMAS 0,50 % + INA 1,50 % + Banco Popular 0,25 % + LPT 0,25 % + FCL 1,50 % + OPC 2 % + INS 1 %); impuesto al salario: hasta ₡918 000 exento, 10 % hasta ₡1 347 000, 15 % hasta ₡2 364 000, 20 % hasta ₡4 727 000, 25 % el exceso (créditos: ₡1 710 por hijo, ₡2 590 por cónyuge); salario diario = promedio mensual ÷ 30; preaviso (art. 28): 1 semana (3–6 meses), 15 días (6 meses–1 año), 1 mes (1 año o más); cesantía (art. 29, tope 8 años; la fracción de 6 meses o menos no cuenta); aguinaldo = total devengado desde el 1 de diciembre ÷ 12; vacaciones proporcionales: 1 día por mes laborado.`;

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "Método no permitido." }); return; }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: "Falta configurar ANTHROPIC_API_KEY en las variables de entorno de Vercel." }); return; }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};
  const tema = body.tema || {};
  const n = Math.max(1, Math.min(20, Number(body.preguntas) || 3));
  const tipos = (Array.isArray(body.tipos) ? body.tipos : Object.keys(TIPOS)).filter(t => TIPOS[t]);
  const puntos = body.puntos || {};
  const apps = (Array.isArray(body.apps) ? body.apps : []).slice(0, 8).map(a => `- ${corto(a.nombre, 60)}: ${corto(a.que, 220)}`).join("\n");

  const prompt = `Sos docente de Contabilidad de un colegio técnico de Costa Rica y especialista en evaluación del MEP (Decreto 45509-MEP). Escribí ${n} reactivos de examen para la sección ${corto(body.seccion, 80)} sobre el tema:

TEMA: ${corto(tema.titulo, 200)}
${tema.subtemas && tema.subtemas.length ? "Subtemas vistos: " + tema.subtemas.slice(0, 12).map(s => corto(s, 100)).join(" | ") + "\n" : ""}${tema.indicadores && tema.indicadores.length ? "Indicadores con que se evaluó: " + tema.indicadores.slice(0, 8).map(s => corto(s, 200)).join(" | ") + "\n" : ""}${tema.contenido ? "Contenido que se desarrolló en la plataforma (base de las preguntas; no evalúes nada fuera de esto):\n" + corto(tema.contenido, 6000) + "\n" : ""}
TIPOS PERMITIDOS (mezclalos de forma variada; usá solo estos): 
${tipos.map(t => `- ${t}: ${TIPOS[t]} · sugerido: ${Number(puntos[t]) || 1} punto(s) por ítem`).join("\n")}
${apps ? `\nAPLICACIONES DE LA PLATAFORMA que puede pedir usar un reactivo (solo si el tema calza):\n${apps}\nSi un reactivo usa una app, en herramienta_requerida va su nombre exacto y en accion_en_herramienta los pasos concretos (qué abrir, qué datos ingresar, qué mirar). Si no, «Ninguna».\n` : ""}
${PARAMETROS}
${body.indicaciones ? "\nIndicaciones del docente: " + corto(body.indicaciones, 800) + "\n" : ""}
LINEAMIENTOS TÉCNICOS DEL MEP PARA LA PRUEBA ESCRITA (obligatorios)
- Puntuación de cada ítem en números ENTEROS. En la escala_calificacion, los puntos de sus indicadores deben sumar EXACTAMENTE los «puntos» del ítem; escribila para el estudiante (indicador y puntos), sin notas para el docente.${body.puntos_objetivo ? `\n- Según la tabla de especificaciones este aprendizaje vale ${Number(body.puntos_objetivo)} puntos: la suma de «puntos» de los ${n} reactivos debe dar EXACTAMENTE ${Number(body.puntos_objetivo)} (ajustá la cantidad de respuestas o procedimientos que pide cada ítem).` : ""}
- Solo se evalúa lo desarrollado en la mediación; no elegir únicamente lo más difícil.
- Redacción sin ambigüedad, sin negativos (salvo que el aprendizaje lo exija), sin «según su opinión» ni «qué piensa usted».
- No pedir dibujar, colorear, recortar ni usar hojas de respuestas; trabajo individual.
- Si el ítem trae un cuadro, tabla o caso, va una oración que lo presenta antes del enunciado.

REGLAS
- Casos aplicados y cercanos a jóvenes de 15 a 18 años (empresas costarricenses, montos en colones con ₡); enunciados claros, sin ambigüedad, español de Costa Rica con trato de «usted».
- Verificá DOS VECES cada cálculo antes de escribirlo: la respuesta_correcta debe ser exacta. En selección única, respuesta_correcta debe ser IDÉNTICA a una de las opciones.
- justificacion_pedagogica: por qué es la respuesta (con la norma o el procedimiento). feedback_exito: corto y motivador. feedback_error: una pista sin dar la respuesta.
- No uses comillas dobles dentro de los textos; si necesitás citar, usá «».

Respondé ÚNICAMENTE con JSON válido:
{"reactivos":[{"tipo_pregunta":"...","tema":"${corto(tema.titulo, 80)}","puntos":1,"herramienta_requerida":"Ninguna","accion_en_herramienta":"","enunciado":"...","opciones_o_valor_esperado":[...],"respuesta_correcta":"...","escala_calificacion":"(solo en respuesta restringida y resolución de problemas)","justificacion_pedagogica":"...","feedback_exito":"...","feedback_error":"..."}]}`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-5-5", max_tokens: 8000, messages: [{ role: "user", content: prompt }] })
    });
    const d = await r.json();
    if (!r.ok) {
      const msg = (d && d.error && d.error.message) || "Error de la IA.";
      res.status(r.status === 429 || r.status >= 500 ? 503 : 502).json({ error: (r.status === 429 || r.status >= 500 ? "La IA está ocupada; intente de nuevo en unos segundos. " : "") + msg, reintentar: r.status === 429 || r.status >= 500 }); return;
    }
    const j = extraerJson((d.content || []).map(b => b.text || "").join(""));
    const reac = (Array.isArray(j.reactivos) ? j.reactivos : []).filter(x => x && x.enunciado && x.tipo_pregunta && TIPOS[x.tipo_pregunta] && tipos.includes(x.tipo_pregunta))
      .map(x => ({ ...x, tema: x.tema || tema.titulo, puntos: body.puntos_objetivo ? (Number(x.puntos) || Number(puntos[x.tipo_pregunta]) || 1) : (Number(puntos[x.tipo_pregunta]) || Number(x.puntos) || 1) }))
      .map(x => ({ ...x, puntos: Math.max(1, Math.round(Number(x.puntos) || 1)) }))
      .filter(x => x.tipo_pregunta !== "seleccion_unica" || (Array.isArray(x.opciones_o_valor_esperado) && x.opciones_o_valor_esperado.map(String).includes(String(x.respuesta_correcta))));
    if (!reac.length) { res.status(502).json({ error: "La IA no devolvió reactivos válidos. Intente de nuevo.", reintentar: true }); return; }
    res.status(200).json({ reactivos: reac });
  } catch (e) {
    res.status(500).json({ error: "No se pudo consultar la IA: " + (e && e.message ? e.message : "error desconocido"), reintentar: true });
  }
};
