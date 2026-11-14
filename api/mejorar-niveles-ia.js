// Función serverless de Vercel: la IA mejora la redacción de los indicadores
// de La Tiradera y la evidencia de sus niveles de desempeño (Avanzado 3,
// Intermedio 2, Inicial 1), en el formato que pide el MEP para el trabajo
// cotidiano (indicador = verbo + contenido + condición; niveles graduales,
// observables y medibles). Solo PROPONE: el docente revisa y decide si la usa.
//
// En los indicadores automáticos (los calcula el juego), los umbrales numéricos
// son fijos y la IA tiene prohibido cambiarlos; solo mejora la redacción.
//
// La llave (ANTHROPIC_API_KEY) se lee de las variables de entorno de Vercel.

const UMBRALES = {
  dominio_pct: "85 % o más (Avanzado), 60–84 % (Intermedio), 35–59 % (Inicial) de logro en los retos",
  participacion_pct: "85 % o más (Avanzado), 60–84 % (Intermedio), 35–59 % (Inicial) de los retos respondidos a tiempo",
  precision_pct: "85 % o más (Avanzado), 60–84 % (Intermedio), 35–59 % (Inicial) de sus puntos son ganados (frente a los perdidos por errores)",
  rapidez_pct: "en sus aciertos le sobra en promedio 43 % o más (Avanzado), 30–42 % (Intermedio), 18–29 % (Inicial) del tiempo",
  aportes_pct: "3 o más (Avanzado), 2 (Intermedio), 1 (Inicial) preguntas propuestas que el docente aprueba",
  liq_salario_pct: "85 % o más (Avanzado), 60–84 % (Intermedio), 35–59 % (Inicial) de los resultados del salario correctos (devengado, promedios y salario diario)",
  liq_preaviso_pct: "85 % o más (Avanzado), 60–84 % (Intermedio), 35–59 % (Inicial) de los pasos del preaviso correctos",
  liq_cesantia_pct: "85 % o más (Avanzado), 60–84 % (Intermedio), 35–59 % (Inicial) de los pasos de la cesantía correctos",
  liq_vacaciones_pct: "85 % o más (Avanzado), 60–84 % (Intermedio), 35–59 % (Inicial) de los pasos de las vacaciones correctos",
  liq_asiento_pct: "85 % o más (Avanzado), 60–84 % (Intermedio), 35–59 % (Inicial) de las líneas del asiento correctas",
  liq_aguinaldo_pct: "85 % o más (Avanzado), 60–84 % (Intermedio), 35–59 % (Inicial) de los pasos del aguinaldo correctos",
  memoria_dominio_pct: "85 % o más (Avanzado), 60–84 % (Intermedio), 35–59 % (Inicial) de los conceptos escritos bien al primer intento",
  memoria_precision_pct: "85 % o más (Avanzado), 60–84 % (Intermedio), 35–59 % (Inicial) de respuestas correctas",
  memoria_autonomia_pct: "85 % o más (Avanzado), 60–84 % (Intermedio), 35–59 % (Inicial) de las cartas resueltas sin pistas",
  memoria_rapidez_pct: "12 s o menos por carta en promedio (Avanzado), 13–20 s (Intermedio), 21–30 s (Inicial)",
  cb_elementos_pct: "85 % o más (Avanzado), 60–84 % (Intermedio), 35–59 % (Inicial) de los casos de clasificación como activo, pasivo o patrimonio correctos",
  cb_catalogo_pct: "85 % o más (Avanzado), 60–84 % (Intermedio), 35–59 % (Inicial) de las preguntas sobre el catálogo de cuentas correctos",
  cb_ecuacion_pct: "85 % o más (Avanzado), 60–84 % (Intermedio), 35–59 % (Inicial) de las situaciones de la ecuación contable correctos",
  cb_resultados_pct: "85 % o más (Avanzado), 60–84 % (Intermedio), 35–59 % (Inicial) de los casos de ingresos, costos y gastos correctos",
  cb_naturaleza_pct: "85 % o más (Avanzado), 60–84 % (Intermedio), 35–59 % (Inicial) de las preguntas sobre la naturaleza de las cuentas correctos",
  cb_asientos_pct: "85 % o más (Avanzado), 60–84 % (Intermedio), 35–59 % (Inicial) de las cuentas y montos de los asientos de diario correctos",
  cb_integral_pct: "85 % o más (Avanzado), 60–84 % (Intermedio), 35–59 % (Inicial) de las preguntas del desafío integral correctos",
  iva_diario_pct: "85 % o más (Avanzado), 60–84 % (Intermedio), 35–59 % (Inicial) de las cuentas y montos de los asientos de las facturas correctos",
  iva_balanza_pct: "85 % o más (Avanzado), 60–84 % (Intermedio), 35–59 % (Inicial) de las casillas de la balanza de comprobación correctas",
  iva_facturas_pct: "85 % o más (Avanzado), 60–84 % (Intermedio), 35–59 % (Inicial) de las casillas de clasificación de las facturas correctas",
  iva_credito_pct: "85 % o más (Avanzado), 60–84 % (Intermedio), 35–59 % (Inicial) de las casillas del crédito fiscal y la proporcionalidad correctas",
  iva_formulario_pct: "85 % o más (Avanzado), 60–84 % (Intermedio), 35–59 % (Inicial) de las casillas del formulario 150 correctas",
  iva_asientos_pct: "85 % o más (Avanzado), 60–84 % (Intermedio), 35–59 % (Inicial) de las cuentas y montos de los asientos del IVA correctos",
  taller_asientos_pct: "85 % o más (Avanzado), 60–84 % (Intermedio), 35–59 % (Inicial) de los asientos de las facturas correctos",
  taller_mayor_pct: "85 % o más (Avanzado), 60–84 % (Intermedio), 35–59 % (Inicial) de las cuentas del libro mayor y de las T correctas",
  taller_balanza_pct: "85 % o más (Avanzado), 60–84 % (Intermedio), 35–59 % (Inicial) de las casillas de la balanza correctas",
  taller_estados_pct: "85 % o más (Avanzado), 60–84 % (Intermedio), 35–59 % (Inicial) de las partes de los estados financieros correctas",
  ciudad_documentos_pct: "85 % o más (Avanzado), 60–84 % (Intermedio), 35–59 % (Inicial) de los comprobantes electrónicos solicitados que emite",
  ciudad_asientos_pct: "85 % o más (Avanzado), 60–84 % (Intermedio), 35–59 % (Inicial) de los asientos de sus documentos correctos al primer intento",
  ciudad_balanza_pct: "85 % o más (Avanzado), 60–84 % (Intermedio), 35–59 % (Inicial) de los documentos registrados en el diario con la balanza cuadrada (si no cuadra, como máximo Inicial)"
};

function extraerJson(texto) {
  let limpio = String(texto || "").trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  const a = limpio.indexOf("{"), b = limpio.lastIndexOf("}");
  if (a !== -1 && b > a) limpio = limpio.slice(a, b + 1);
  return JSON.parse(limpio);
}
const corto = (v, n) => String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, n);

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "Método no permitido." }); return; }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: "Falta configurar ANTHROPIC_API_KEY en las variables de entorno de Vercel." }); return; }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  const ins = body.instrumento || {};
  const criterios = (Array.isArray(body.criterios) ? body.criterios : []).slice(0, 12).map((c, i) => ({
    i, nombre: corto(c.nombre, 300), puntos_max: Number(c.puntos_max) || 3, auto: UMBRALES[c.auto] ? c.auto : "",
    niveles: { avanzado: corto(c.niveles && c.niveles.avanzado, 400), intermedio: corto(c.niveles && c.niveles.intermedio, 400), inicial: corto(c.niveles && c.niveles.inicial, 400) },
    evidencias: corto(c.evidencias, 400), elementos: corto(c.elementos, 500)
  }));
  // Modo robusto (Taller del Ciclo Contable, Declaración del IVA): instrumento completo, más explícito,
  // con evidencias observables por indicador y un indicador de logro alineado al resultado de aprendizaje.
  const robusto = body.modo === "robusto";
  const soloIndices = Array.isArray(body.indices) ? body.indices.map(Number).filter(n => Number.isInteger(n)) : null;
  const objetivo = soloIndices && soloIndices.length ? criterios.filter(c => soloIndices.includes(c.i)) : criterios;
  if (!objetivo.length) { res.status(400).json({ error: "No hay indicadores para mejorar." }); return; }
  const instrucciones = corto(body.instrucciones, 600);
  // Si viene "actividad", es un trabajo cotidiano, tarea o proyecto de la
  // plataforma (no el juego): se ajusta la descripción del contexto.
  const actividad = corto(body.actividad, 300);
  const componente = corto(body.componente || ins.componente, 60) || "Trabajo cotidiano";
  const contexto = actividad
    ? `un instrumento de evaluación del componente «${componente}» para la actividad «${actividad}». Lo aplica el docente revisando el trabajo, la tarea o el proyecto de cada persona estudiante`
    : `un instrumento de evaluación de trabajo cotidiano para "La Tiradera", un juego en vivo en el que el estudiantado resuelve retos (selección única, falso y verdadero, sopa de letras y crucigrama) y compite por puntos`;
  const observar = actividad ? "durante la actividad o en el producto que entrega" : "durante la dinámica";

  const listado = objetivo.map(c => `INDICADOR ${c.i + 1} (índice ${c.i}) — ${c.puntos_max} puntos — ${c.auto ? (actividad ? "AUTOMÁTICO (lo calcula la plataforma con el trabajo del estudiante)" : "AUTOMÁTICO (lo calcula el juego con la partida)") + ". Umbrales FIJOS que NO se pueden cambiar: " + UMBRALES[c.auto] : "A MANO (lo califica el docente)"}
  Redacción actual: «${c.nombre || "(sin redactar)"}»
  Avanzado (3): «${c.niveles.avanzado}»
  Intermedio (2): «${c.niveles.intermedio}»
  Inicial (1): «${c.niveles.inicial}»${robusto ? `
  Lo que revisa la plataforma en este indicador: ${c.elementos || "(no indicado)"}
  Evidencias actuales: «${c.evidencias}»` : ""}`).join("\n\n");

  const prompt = `Sos especialista en evaluación de los aprendizajes del Ministerio de Educación Pública (MEP) de Costa Rica, en Educación Técnica Profesional (especialidad de Contabilidad). Mejorá ${contexto}.

DATOS DEL INSTRUMENTO
- Componente: ${componente} · Tipo: ${corto(ins.tipo, 60) || "Escala de desempeño"}
- Subárea: ${corto(ins.subarea, 200) || "(no indicada)"}
- Unidad de estudio / tema: ${corto(ins.unidad, 200) || "(no indicado)"}
- Resultado de aprendizaje del programa: ${corto(ins.resultado, 500) || "(no indicado)"}
- Indicador de logro del programa: ${corto(ins.indicador, 500) || "(no indicado)"}
${instrucciones ? `- Indicaciones del docente: ${instrucciones}\n` : ""}
INDICADORES A MEJORAR
${listado}

REGLAS (lineamientos técnicos del MEP y programa de estudio ETP)
1. Cada indicador EMPIEZA SIEMPRE con el verbo (acción observable, tercera persona singular, presente: Registra, Calcula, Elabora, Completa, Resuelve, Identifica…) y sigue la estructura ACCIÓN (verbo) + CONTENIDO + CONDICIÓN (ej.: «Identifica los rebajos de ley de la planilla al resolver los retos planteados»). Nunca empieces con el nombre de la práctica, del módulo o con un sustantivo: lo específico de la práctica va en el CONTENIDO (el saber técnico) y en la CONDICIÓN (contexto, herramienta o forma en que se demuestra, p. ej. «a partir de las facturas electrónicas del caso»). Un solo aspecto a evaluar por indicador, observable, medible y con una sola interpretación; los detalles de calidad van en los niveles y en las evidencias, no en el indicador. Si hay tema o resultado de aprendizaje, ligá el indicador a ese contenido. Máximo 200 caracteres.
2. Los niveles describen la EVIDENCIA observable del desempeño, de forma gradual y excluyente: Avanzado (3) = logro pleno; Intermedio (2) = logro parcial; Inicial (1) = logro mínimo o con apoyo. Sin juicios negativos sobre la persona, lenguaje inclusivo («la persona estudiante» o en tercera persona sin sujeto). Máximo 220 caracteres por nivel.
3. En los indicadores AUTOMÁTICOS conservá EXACTAMENTE los umbrales numéricos indicados (los porcentajes o cantidades) en cada nivel; solo mejorá la redacción y el contexto. No inventes otros números.
4. En los indicadores A MANO, describí conductas o evidencias que el docente pueda observar ${observar}.
5. Español de Costa Rica, claro y breve. No uses comillas dobles dentro de los textos; si necesitás citar, usá «».

${robusto ? `
MODO ROBUSTO (instrumento más completo y explícito)
6. Alineación MEP: Reglamento de Evaluación de los Aprendizajes (Decreto 45509-MEP) y lineamientos de la DDC/DEVA para la Educación Técnica Profesional. El trabajo cotidiano y las tareas se califican con escala de desempeño: Avanzado 3, Intermedio 2, Inicial 1 y 0 sin evidencia; calificación = puntos obtenidos × 100 ÷ puntos totales.
7. Cada indicador se DERIVA del resultado de aprendizaje: usá un verbo de desempeño coherente con el verbo del resultado (p. ej., Resolver → Registra, Calcula, Determina, Completa, Elabora), el contenido técnico preciso que revisa la plataforma y una condición (a partir de las facturas electrónicas del caso, según la normativa vigente, en el formato establecido…). Máximo 220 caracteres.
8. Cada nivel empieza con el umbral fijo y luego dice EXPLÍCITAMENTE qué se observa: Avanzado = todos los elementos correctos o casi todos; Intermedio = qué parte domina y qué errores típicos aparecen; Inicial = qué logra solo de forma parcial. Usá los elementos de «Lo que revisa la plataforma». Niveles graduales y excluyentes. Máximo 330 caracteres por nivel.
9. "evidencias": de 3 a 5 evidencias observables y verificables del producto del estudiante, separadas por « · ». Máximo 330 caracteres.
10. "indicador_logro": proponé UN indicador de logro para todo el instrumento, alineado al resultado de aprendizaje del programa (verbo + contenido + condición), máximo 260 caracteres.
` : ""}
Respondé ÚNICAMENTE con JSON válido, sin texto adicional, con esta forma exacta:
{${robusto ? `"indicador_logro":"...",` : ""}"criterios":[{"i":0,"nombre":"...","niveles":{"avanzado":"...","intermedio":"...","inicial":"..."},${robusto ? `"evidencias":"...",` : ""}"nota":"qué mejoraste y cómo se alinea al MEP, en una frase"}]}
Incluí un objeto por cada indicador a mejorar, usando su índice "i".`;

  const llamar = async (contenido) => {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-5-5", max_tokens: robusto ? 7000 : 4000, messages: [{ role: "user", content: contenido }] })
    });
    const d = await r.json();
    return { r, d };
  };

  try {
    const { r, d } = await llamar(prompt);
    if (!r.ok) {
      const msg = (d && d.error && d.error.message) || "Error de la IA.";
      if (r.status === 429 || r.status === 529 || r.status >= 500) { res.status(503).json({ error: "La IA está ocupada; probá de nuevo en unos segundos. (" + msg + ")", reintentar: true }); return; }
      res.status(502).json({ error: msg }); return;
    }
    const texto = (d.content || []).map(b => b.text || "").join("").trim();
    let json;
    try { json = extraerJson(texto); }
    catch {
      const { d: d2 } = await llamar("Devolvé ÚNICAMENTE este contenido como JSON válido, sin cambiar la redacción; reemplazá comillas dobles internas por «». Texto:\n\n" + texto);
      json = extraerJson((d2.content || []).map(b => b.text || "").join("").trim());
    }
    const validos = new Set(objetivo.map(c => c.i));
    const salida = (Array.isArray(json.criterios) ? json.criterios : [])
      .filter(x => x && validos.has(Number(x.i)))
      .map(x => ({
        i: Number(x.i),
        nombre: corto(x.nombre, 240),
        niveles: { avanzado: corto(x.niveles && x.niveles.avanzado, robusto ? 380 : 260), intermedio: corto(x.niveles && x.niveles.intermedio, robusto ? 380 : 260), inicial: corto(x.niveles && x.niveles.inicial, robusto ? 380 : 260) },
        evidencias: robusto ? corto(x.evidencias, 380) : undefined,
        nota: corto(x.nota, 200)
      }))
      .filter(x => x.nombre && x.niveles.avanzado && x.niveles.intermedio && x.niveles.inicial);
    if (!salida.length) { res.status(502).json({ error: "La IA no devolvió una propuesta válida. Probá de nuevo." }); return; }
    res.status(200).json(robusto && json.indicador_logro ? { criterios: salida, indicador_logro: corto(json.indicador_logro, 280) } : { criterios: salida });
  } catch (e) {
    res.status(500).json({ error: "No se pudo consultar la IA: " + (e && e.message ? e.message : "error desconocido") });
  }
};
