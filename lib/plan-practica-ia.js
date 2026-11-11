// Función de IA: propone, para UN resultado de aprendizaje, la columna de
// «Estrategias para la mediación pedagógica» (D/ docente y E/ estudiante),
// las evidencias (conocimiento, desempeño, producto), indicadores de logro
// y el tiempo estimado del plan de práctica pedagógica (ETP, MEP 2026).
// El resultado de aprendizaje y los saberes esenciales NO se tocan: vienen
// del programa de estudio y el docente revisa todo antes de guardar.
const corto = (v, n) => String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, n);
function extraerJson(t) {
  let s = String(t || "").trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a !== -1 && b > a) s = s.slice(a, b + 1);
  return JSON.parse(s);
}

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "Método no permitido." }); return; }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: "Falta configurar ANTHROPIC_API_KEY en Vercel." }); return; }
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b || {};
  const lista = (x, n, m) => (Array.isArray(x) ? x : []).slice(0, n).map(s => "- " + corto(s, m)).join("\n");

  const prompt = `Sos asesor de planificación pedagógica de la Educación Técnica Profesional (ETP) del MEP de Costa Rica. Redactá la parte técnica del PLAN DE PRÁCTICA PEDAGÓGICA para UN resultado de aprendizaje, siguiendo las «Orientaciones para la planificación pedagógica 2026» de la Dirección de Educación Técnica y Capacidades Emprendedoras y el programa de estudio (CSE 2020).

DATOS
Especialidad: ${corto(b.especialidad || "Contabilidad", 80)} · Nivel: ${corto(b.nivel, 30)} · Subárea: ${corto(b.subarea, 120)} · Unidad de estudio: ${corto(b.unidad, 160)}
Competencia para el desarrollo humano: ${corto(b.competencia, 120)} · Eje de la política educativa: ${corto(b.eje, 160)}
RESULTADO DE APRENDIZAJE (no se cambia): ${corto(b.ra, 600)}
SABERES ESENCIALES (no se cambian):
${lista(b.saberes, 60, 300)}
INDICADORES DE LOGRO DEL PROGRAMA (macroevaluación):
${lista(b.indicadores, 30, 300)}
Horas disponibles para este resultado: ${Number(b.horas) || "las que correspondan"}
${b.apps && b.apps.length ? `Herramientas de la plataforma del colegio que pueden usarse como técnica o recurso (solo si calzan con los saberes):\n${lista(b.apps, 12, 220)}` : ""}
${b.indicaciones ? "Indicaciones del docente: " + corto(b.indicaciones, 800) : ""}

REGLAS (obligatorias)
1. Estrategias para la mediación pedagógica: cada una tiene tres elementos: VERBO EN TERCERA PERSONA del singular + CONTENIDO (tomado de los saberes esenciales) + TÉCNICA DIDÁCTICA (p. ej. charla educativa, demostración, práctica dirigida, estudio de caso, trabajo colaborativo, ejercicios prácticos, mapa mental, mapa cognitivo, cuadro comparativo, QQQ, video foro, simulación, juego de roles, aprendizaje basado en problemas). Las del docente empiezan con «D/» (cómo enseña) y las del estudiante con «E/» (cómo aprende). Van en orden lógico (de lo conceptual a la aplicación), con verbos según Bloom (conocimiento, comprensión, aplicación, análisis). Que cubran TODOS los saberes esenciales. Entre 2 y 4 D/ y entre 3 y 6 E/.
2. Aplicá el Diseño Universal para el Aprendizaje (varias formas de representación, de acción y expresión, y de implicación) y que se note de forma natural la competencia para el desarrollo humano indicada.
3. Evidencias de aprendizaje: «nombre de la evidencia + tema o contenido», por tipo: conocimiento (comprensión de conceptos), desempeño (ejecución de una habilidad) y producto (algo elaborado). Cada evidencia sale de una estrategia E/. Al menos una de cada tipo cuando el resultado lo permita.
4. Indicadores de logro del docente: alineados a los del programa y a las evidencias, redactados con VERBO (tercera persona) + CONTENIDO + CONDICIÓN; observables y medibles, para usarse en instrumentos con niveles Inicial, Intermedio y Avanzado. Entre 2 y 5.
5. Tiempo estimado en horas coherente con la complejidad de las técnicas${Number(b.horas) ? ` y que no pase de ${Number(b.horas)}` : ""}.
6. Español de Costa Rica, frases completas, sin numeración dentro de los textos. No uses comillas dobles dentro de los textos; usá «».

Respondé ÚNICAMENTE con JSON válido:
{"estrategias":[{"quien":"D","texto":"D/ ..."},{"quien":"E","texto":"E/ ..."}],"evidencias":{"conocimiento":["..."],"desempeno":["..."],"producto":["..."]},"indicadores":["..."],"horas":0}`;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-5-5", max_tokens: 4000, messages: [{ role: "user", content: prompt }] })
    });
    const d = await r.json();
    if (!r.ok) {
      const msg = (d && d.error && d.error.message) || "Error de la IA.";
      res.status(r.status === 429 || r.status >= 500 ? 503 : 502).json({ error: msg, reintentar: r.status === 429 || r.status >= 500 }); return;
    }
    const j = extraerJson((d.content || []).map(x => x.text || "").join(""));
    const est = (Array.isArray(j.estrategias) ? j.estrategias : []).map(e => {
      const quien = String(e.quien || "").toUpperCase().startsWith("D") ? "D" : "E";
      let t = corto(e.texto, 600).replace(/^[DE]\s*\/\s*/i, "");
      return { quien, texto: t };
    }).filter(e => e.texto);
    const ev = j.evidencias || {};
    const arr = x => (Array.isArray(x) ? x : []).map(s => corto(s, 400)).filter(Boolean).slice(0, 6);
    if (!est.length) { res.status(502).json({ error: "La IA no devolvió estrategias. Intente de nuevo.", reintentar: true }); return; }
    res.status(200).json({
      estrategias: est,
      evidencias: { conocimiento: arr(ev.conocimiento), desempeno: arr(ev.desempeno || ev.desempeño), producto: arr(ev.producto) },
      indicadores: arr(j.indicadores),
      horas: Math.max(0, Math.round(Number(j.horas) || 0))
    });
  } catch (e) {
    res.status(500).json({ error: "No se pudo consultar la IA: " + (e && e.message ? e.message : "error"), reintentar: true });
  }
};
