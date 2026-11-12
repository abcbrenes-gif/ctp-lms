// ═══════════ Mi calificación (vista del estudiante) ═══════════
// Por materia: calificación del período arriba y una tarjeta por componente de la
// Rúbrica (Trabajo cotidiano, Tareas, Proyectos, Pruebas, Asistencia) con su aporte.
// Al abrir una tarjeta se ve cada evaluación:
//  · Trabajo cotidiano, Tareas, Proyectos: un renglón por TRABAJO. Si el trabajo tiene
//    1, 2 o 3 indicadores, se muestra cuánto sacó en cada uno y la nota del trabajo
//    (puntos obtenidos / puntos posibles × 100), su máximo dentro del componente y su aporte.
//  · Pruebas: puntos reales de cada prueba y su aporte según su propio porcentaje.
// Usa los mismos cálculos de la nota (justificados «J» fuera, puntos extra incluidos).
const MC_COLORES = { "trabajo cotidiano": "#e5484d", "tareas": "#f59e0b", "proyectos": "#8b5cf6", "pruebas": "#f97316", "asistencia": "#22a06b" };
const MC_ICO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m4 7 1.5 1.5L8 6"/><path d="m4 13 1.5 1.5L8 12"/><path d="M11 7h9M11 13h9M11 19h9"/><path d="M4.5 19h2"/></svg>';
const mcF = n => n == null || isNaN(n) ? "—" : (Math.round(n * 100) / 100).toLocaleString("es-CR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function mcTrabajosPorIndicador(ids) {
  if (!ids.length) return {};
  const { data } = await sb.from("trabajos_cotidianos").select("id, titulo, fecha, indicador_id, contenido_actividad->indicadores_criterio, contenido_actividad->estrategia")
    .or(`indicador_id.in.(${ids.join(",")}),contenido_actividad->indicadores_criterio.not.is.null`);
  const map = {};
  (data || []).forEach(t => {
    const ligados = [t.indicador_id, ...((t.indicadores_criterio || []).map(Number))].filter(x => ids.includes(Number(x)));
    ligados.forEach(i => { if (!map[i] || (t.indicadores_criterio || []).length) map[i] = t; });
  });
  return map;
}

async function mcMateria(s, m, categorias, docente) {
  const comps = [];
  let total = 0, evals = [];
  for (const c of categorias) {
    const k = c.nombre.trim().toLowerCase(), pc = Number(c.porcentaje) || 0, color = MC_COLORES[k] || "#3b82f6";
    if (k === "pruebas") {
      const { data: inds } = await sb.from("indicadores").select("*").eq("materia_id", m.id).eq("categoria", c.nombre).order("orden");
      const L = (inds || []).filter(i => i.peso_prueba != null && Number(i.puntaje_maximo) > 0);
      const { data: cal } = L.length ? await sb.from("calificaciones_indicador").select("indicador_id, puntaje_obtenido").eq("estudiante_id", s.id).in("indicador_id", L.map(i => i.id)) : { data: [] };
      const items = L.map(i => { const o = (cal || []).find(x => x.indicador_id === i.id); const obt = o ? Number(o.puntaje_obtenido) : null, max = Number(i.puntaje_maximo);
        return { titulo: i.descripcion || "Prueba", sub: `${obt == null ? "—" : mcF(obt)} de ${mcF(max)} puntos`, nota: obt == null ? null : obt / max * 100, maxPct: Number(i.peso_prueba), aporte: obt == null ? 0 : obt / max * Number(i.peso_prueba), sinNota: obt == null }; });
      const aporte = items.reduce((a, x) => a + x.aporte, 0);
      total += aporte; evals.push(...items.filter(x => !x.sinNota).map(x => x.nota));
      comps.push({ nombre: c.nombre, pc, color, items, aporte, n: items.length });
      continue;
    }
    if (k === "asistencia") {
      const r = await calcularNotaAsistencia(s.id, m.id);
      const aporte = r && r.nota != null ? r.nota * pc / 100 : 0; total += aporte;
      comps.push({ nombre: c.nombre, pc, color, items: r ? [{ titulo: "Asistencia del curso", sub: `${r.impartidas} lecciones impartidas`, nota: r.nota, maxPct: pc, aporte }] : [], aporte, n: r ? 1 : 0 });
      continue;
    }
    const info = await calcularNotaIndicadores(s.id, m.id, c.nombre, true);
    if (!info) { comps.push({ nombre: c.nombre, pc, color, items: [], aporte: 0, n: 0 }); continue; }
    const J = info.justificados || new Set();
    const cuentan = info.indicadores.filter(i => !J.has(i.id));
    const totMax = cuentan.reduce((a, i) => a + Number(i.puntaje_maximo || 0), 0);
    const porT = await mcTrabajosPorIndicador(info.indicadores.map(i => i.id));
    // Agrupa los indicadores por trabajo (los que no tienen trabajo van solos).
    const grupos = [];
    info.indicadores.forEach(i => { const t = porT[i.id], key = t ? "t" + t.id : "i" + i.id;
      let g = grupos.find(x => x.key === key); if (!g) grupos.push(g = { key, orden: grupos.length, titulo: t ? t.titulo : `Indicador ${i.letra}`, desc: t ? "" : (i.descripcion || ""), fecha: (t && t.fecha) || i.fecha_evaluacion || "", inds: [] });
      g.inds.push(i); });
    const items = grupos.map(g => {
      const cu = g.inds.filter(i => !J.has(i.id)), max = cu.reduce((a, i) => a + Number(i.puntaje_maximo || 0), 0);
      const obt = cu.reduce((a, i) => a + Number(info.porIndicador[i.id] || 0), 0), calif = cu.some(i => info.porIndicador[i.id] !== undefined);
      return { titulo: g.titulo, desc: g.desc, orden: g.orden, fecha: g.fecha,
        inds: g.inds.map(i => ({ letra: i.letra, desc: i.descripcion, v: J.has(i.id) ? "J" : info.porIndicador[i.id], max: Number(i.puntaje_maximo || 0) })),
        sub: `${g.inds.length} indicador${g.inds.length === 1 ? "" : "es"}`, obt, max, nota: max ? obt / max * 100 : null,
        maxPct: totMax ? max / totMax * pc : 0, aporte: totMax ? obt / totMax * pc : 0, sinNota: !calif, justificado: !cu.length };
    }); // en el orden de los indicadores de la Rúbrica
    const base = items.reduce((a, x) => a + x.aporte, 0), aporte = info.nota != null ? info.nota * pc / 100 : base;
    const extra = Math.round((aporte - base) * 100) / 100;
    if (extra > 0) items.push({ titulo: "Puntos adicionales", sub: [info.bono ? `${info.bono.puntos} % a la sección` : "", ...((info.extras || []).map(x => `${x.puntos} % ${x.motivo || "extra"}`))].filter(Boolean).join(" · "), extra: true, aporte: extra, maxPct: null });
    total += aporte; evals.push(...items.filter(x => !x.sinNota && !x.extra && !x.justificado && x.nota != null).map(x => x.nota));
    comps.push({ nombre: c.nombre, pc, color, items, aporte, n: items.filter(x => !x.extra).length });
  }
  return { m, comps, total, evals, docente };
}

function mcHTML(d, idx) {
  const fin = d.total, col = fin >= 70 ? "var(--mc-ok)" : "var(--mc-bad)";
  const itemHTML = (c, it) => it.extra ? `<div class="mc-ev"><div class="mc-ev-top"><b>➕ ${escAC(it.titulo)}</b><span class="mc-ev-n" style="color:${c.color}">+${mcF(it.aporte)} pts</span></div><div class="mc-ev-meta">${escAC(it.sub)}</div></div>`
    : `<div class="mc-ev"><div class="mc-ev-top"><b>${escAC(it.titulo)}</b><span class="mc-ev-n" style="color:${c.color}">${it.justificado ? "Justificado" : it.sinNota ? "Sin calificar" : it.max != null ? `${mcF(it.obt)}/${mcF(it.max)}` : mcF(it.nota) + "/100"}</span></div>
      ${it.desc ? `<div class="mc-ev-meta">${escAC(it.desc)}</div>` : ""}
      ${it.inds && it.inds.length ? `<div class="mc-inds">${it.inds.map(i => `<span class="mc-ind" title="${escAC(i.desc || "")}">${escAC(i.letra)} <b>${i.v === "J" ? "J" : i.v === undefined ? "—" : mcF(i.v).replace(/,00$/, "")}</b>/${i.max}</span>`).join("")}</div>` : `<div class="mc-ev-meta">${escAC(it.sub || "")}</div>`}
      <div class="mc-ev-row"><span>Nota: <span class="mc-chip" style="--c:${c.color}">${it.nota == null || it.sinNota || it.justificado ? "—" : mcF(it.nota)}</span></span><span>Máximo: <b>${it.maxPct == null ? "—" : mcF(it.maxPct) + " %"}</b></span><span>Aporte: <b>${mcF(it.aporte)} pts</b></span></div>
      <div class="mc-bar"><i style="width:${Math.max(0, Math.min(100, it.nota || 0))}%;background:${c.color}"></i></div></div>`;
  const alta = d.evals.length ? Math.max(...d.evals) : null, baja = d.evals.length ? Math.min(...d.evals) : null;
  return `<section class="mc">
    <div class="mc-head"><div><h2 class="mc-t">${escAC(String(d.m.nombre).trim())}</h2><div class="mc-sub">${escAC(d.docente || "")}${d.m.seccion ? " · Sección " + escAC(d.m.seccion) : ""}</div></div>
      <div class="mc-fin"><span>Calificación del período</span><b style="color:${col}">${mcF(fin)}</b></div></div>
    <div class="mc-body">
    ${d.comps.map((c, j) => `<details class="mc-comp" style="--c:${c.color}" ${c.n ? "" : "data-vacio"}>
      <summary><span class="mc-ic">${MC_ICO}</span><span class="mc-cn"><b>${escAC(c.nombre)}</b><small>${c.n} evaluaci${c.n === 1 ? "ón" : "ones"} · ${mcF(c.pc).replace(/,00$/, "")} % del total</small></span>
        <span class="mc-ap"><small>Aporte</small><b>${mcF(c.aporte)} de ${mcF(c.pc).replace(/,00$/, "")} %</b></span><span class="mc-fl" aria-hidden="true">›</span></summary>
      <div class="mc-evs">${c.items.length ? c.items.map(it => itemHTML(c, it)).join("") : '<p class="mc-vacio">Todavía no hay evaluaciones en este componente.</p>'}</div></details>`).join("")}
    <div class="mc-res"><h3>Resumen de calificaciones</h3><div class="mc-res-g">
      <div><small>Total de evaluaciones</small><b>${d.evals.length}</b></div><div><small>Calificación del período</small><b style="color:${col}">${mcF(fin)}</b></div>
      <div><small>Nota más alta</small><b>${alta == null ? "—" : mcF(alta)}</b></div><div><small>Nota más baja</small><b>${baja == null ? "—" : mcF(baja)}</b></div></div>
      <p class="mc-pie">La calificación es la suma de los aportes de cada componente según la Rúbrica (Decreto 45509-MEP). «J» = ausencia justificada: no cuenta. En cada trabajo, la nota sale de los puntos de sus indicadores.</p></div>
    </div></section>`;
}

async function renderMisCalificaciones(el, s) {
  el.innerHTML = "Cargando…";
  const [{ data: asig }, { data: categorias }, { data: docs }] = await Promise.all([
    sb.from("estudiante_materias").select("materia_id, materias(id, nombre, seccion)").eq("estudiante_id", s.id),
    sb.from("rubrica_categorias").select("*").order("orden"),
    sb.from("docentes").select("nombre").limit(1)]);
  const materias = (asig || []).map(a => a.materias).filter(Boolean);
  if (!materias.length) { el.innerHTML = '<p class="empty">Todavía no tienes materias asignadas.</p>'; return; }
  const docente = (docs && docs[0] && docs[0].nombre) || "";
  const datos = [];
  for (const m of materias) datos.push(await mcMateria(s, m, categorias || [], docente));
  el.innerHTML = datos.map(mcHTML).join("");
}
