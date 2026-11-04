// ═══════════ Notas por período y nota anual (Decreto 45509-MEP) ═══════════
// La nota del I Período viene del acta oficial (no estaba en la plataforma).
// La del II Período es la nota final que la plataforma calcula con la Rúbrica
// (o una nota definitiva que el profe escriba). Nota anual = 50 % I + 50 % II
// (art. 48), redondeada: decimales ≥ 0,50 suben al entero (art. 26). Aprueba
// con 70 o más en Educación Diversificada técnica (art. 47).
// Se guarda en un registro de trabajos_cotidianos (habilitado:false, sin
// indicador) con estrategia "notas_periodo": los estudiantes no lo ven como
// trabajo; solo ven sus notas en el perfil cuando el profe lo habilita.
const NP_ESTR = "notas_periodo";
const NP_PESOS = { p1: 0.5, p2: 0.5 };
const NP_APRUEBA = 70;
const npEsc = v => String(v == null ? "" : v).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const npNum = v => (v === "" || v == null || isNaN(Number(v))) ? null : Number(v);
const npRedondear = x => Math.floor(x + 0.5 + 1e-9);
const npFmt = v => v == null ? "—" : (Math.round(v * 100) / 100).toLocaleString("es-CR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

async function npCargar(materiaId) {
  const { data } = await sb.from("trabajos_cotidianos").select("id, contenido_actividad")
    .eq("contenido_actividad->>estrategia", NP_ESTR).eq("contenido_actividad->>materia_id", String(materiaId)).order("id").limit(1);
  const r = (data || [])[0];
  return r ? { id: r.id, C: r.contenido_actividad } : null;
}
async function npGuardar(materiaId, reg, C) {
  C = { ...C, estrategia: NP_ESTR, materia_id: String(materiaId), actualizado: new Date().toISOString() };
  if (reg && reg.id) {
    const { error } = await sb.from("trabajos_cotidianos").update({ contenido_actividad: C }).eq("id", reg.id);
    if (error) throw new Error(error.message);
    return { id: reg.id, C };
  }
  const { data, error } = await sb.from("trabajos_cotidianos").insert({
    titulo: "Notas por período (registro del profe, no borrar)", tipo_actividad: "rubrica_directa",
    habilitado: false, contenido_actividad: C
  }).select("id").maybeSingle();
  if (error || !data) throw new Error(error ? error.message : "no se pudo guardar");
  return { id: data.id, C };
}

// Nota final que la plataforma calcula hoy para el estudiante en esa materia
// (misma lógica que la tabla de evaluaciones de la sección).
async function npNotaPlataforma(estudianteId, materiaId, categorias) {
  let suma = 0, peso = 0;
  for (const c of categorias || []) {
    const n = c.nombre.trim().toLowerCase();
    if (n === "pruebas") {
      const a = await calcularAportePruebas(estudianteId, materiaId, c.nombre, c.porcentaje);
      if (a !== null) { suma += a.aporte; peso += Number(c.porcentaje); }
      continue;
    }
    const r = n === "asistencia" ? await calcularNotaAsistencia(estudianteId, materiaId) : await calcularNotaIndicadores(estudianteId, materiaId, c.nombre);
    if (r && r.nota != null) { suma += r.nota * (c.porcentaje / 100); peso += Number(c.porcentaje); }
  }
  return peso > 0 ? suma : null;
}

// Cálculo de una fila.
function npFila(C, estId, plataforma) {
  const p1 = npNum(((C.p1 || {}).notas || {})[estId]);
  const p2def = npNum(((C.p2 || {}).notas || {})[estId]);
  const p2 = p2def != null ? p2def : (plataforma != null ? Math.round(plataforma * 100) / 100 : null);
  const anual = p1 != null && p2 != null ? npRedondear(p1 * NP_PESOS.p1 + p2 * NP_PESOS.p2) : null;
  return { p1, p2, p2def, provisional: p2def == null && p2 != null, anual, aprueba: anual != null ? anual >= NP_APRUEBA : null };
}

// Lee un acta pegada como texto: cada línea con la cédula (9 dígitos o con
// guiones) y la nota al final.
function npLeerActa(texto, estudiantes) {
  const norm = v => String(v || "").replace(/\D/g, "");
  const porCed = {}; estudiantes.forEach(e => { porCed[norm(e.id)] = e.id; });
  const notas = {}, sinMatch = [];
  String(texto || "").split(/\n+/).forEach(l => {
    const m = l.match(/(\d[\d-]{7,12}\d)\s+(.+?)\s+(\d{1,3}(?:[.,]\d{1,2})?)\s*$/);
    if (!m) return;
    const id = porCed[norm(m[1])];
    const n = Number(m[3].replace(",", "."));
    if (id && n <= 100) notas[id] = n; else sinMatch.push(m[2].trim());
  });
  return { notas, sinMatch };
}

async function renderNotasPeriodo() {
  app.innerHTML = `${topbar()}<div class="wrap" id="np-wrap"><h1>📄 Notas por período y nota anual</h1><p>Cargando…</p></div>`;
  bindTopbar();
  const { data: materias } = await sb.from("materias").select("*").order("id");
  const sel = Number(renderNotasPeriodo.mat || (materias || [])[0]?.id);
  const materia = (materias || []).find(m => m.id === sel);
  const wrap = document.getElementById("np-wrap");
  if (!materia) { wrap.innerHTML = "<h1>📄 Notas por período</h1><p>No hay materias.</p>"; return; }
  const [{ data: em }, { data: categorias }, reg0] = await Promise.all([
    sb.from("estudiante_materias").select("estudiante_id").eq("materia_id", sel),
    sb.from("rubrica_categorias").select("*").order("orden"),
    npCargar(sel)]);
  const ids = (em || []).map(x => x.estudiante_id);
  const { data: es } = ids.length ? await sb.from("estudiantes").select("id, nombre, apellido1, apellido2").in("id", ids) : { data: [] };
  const lista = (es || []).sort((a, b) => `${a.apellido1} ${a.apellido2} ${a.nombre}`.localeCompare(`${b.apellido1} ${b.apellido2} ${b.nombre}`, "es"));
  let reg = reg0, C = (reg0 && reg0.C) || { p1: { notas: {} }, p2: { notas: {} }, visible_p1: false, visible_anual: false };
  const nombre = e => `${e.apellido1} ${e.apellido2 || ""}, ${e.nombre}`.replace(/\s+,/, ",");
  wrap.innerHTML = `<h1>📄 Notas por período y nota anual</h1>
    <p style="color:var(--text-muted);margin-top:-0.6em">Calculando la nota del II Período con la Rúbrica de la plataforma…</p>`;
  const plat = {};
  await Promise.all(lista.map(async e => { plat[e.id] = await npNotaPlataforma(e.id, sel, categorias); }));

  function pintar() {
    const filas = lista.map(e => ({ e, f: npFila(C, e.id, plat[e.id]) }));
    const conAnual = filas.filter(x => x.f.anual != null);
    const aprob = conAnual.filter(x => x.f.aprueba).length;
    const prom = k => { const v = filas.map(x => x.f[k]).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
    const algunaProv = filas.some(x => x.f.provisional);
    wrap.innerHTML = `
      <h1>📄 Notas por período y nota anual</h1>
      <p style="color:var(--text-muted);margin-top:-0.6em">Según el <b>Reglamento de Evaluación de los Aprendizajes (Decreto 45509-MEP)</b>: el curso tiene dos períodos y la nota anual es <b>50 % del I Período + 50 % del II Período</b> (art. 48). Las notas de período llevan dos decimales y la anual se redondea: 0,50 o más sube al entero siguiente (art. 26). Se aprueba con <b>${NP_APRUEBA}</b> o más (art. 47).</p>
      <div class="np-barra">
        <label><b>Sección:</b> <select id="np-mat">${(materias || []).map(m => `<option value="${m.id}" ${m.id === sel ? "selected" : ""}>${npEsc(m.seccion || "")} · ${npEsc(String(m.nombre).trim())}</option>`).join("")}</select></label>
        <button class="btn secondary small" id="np-importar">📥 Importar acta del I Período</button>
        <button class="btn secondary small" id="np-usar-plat">📌 Fijar el II Período con la nota de la plataforma</button>
        <button class="btn secondary small" id="np-pdf">🖨️ PDF</button>
      </div>
      <div class="np-vis">
        <span class="np-vis-tit">👁️ Lo que ven los estudiantes en su perfil:</span>
        <button class="np-sw ${C.visible_p1 ? "on" : ""}" id="np-vis1">${C.visible_p1 ? "✅ I Período: visible" : "🔒 I Período: solo el profe"}</button>
        <button class="np-sw ${C.visible_anual ? "on" : ""}" id="np-vis2">${C.visible_anual ? "✅ Nota anual: visible" : "🔒 Nota anual: solo el profe"}</button>
      </div>
      <div id="np-imp" style="display:none" class="np-imp">
        <p style="margin:0 0 6px"><b>Pegue aquí el acta</b> (copie la tabla del PDF del MEP): cada línea con la cédula, el nombre y la nota.</p>
        <textarea id="np-txt" rows="8" style="width:100%;font-family:monospace" placeholder="402870846   ALVARADO ARAYA VICTORIA   66"></textarea>
        <div style="display:flex;gap:.5rem;margin-top:.5rem;flex-wrap:wrap"><button class="btn small" id="np-leer">Cargar notas</button><span id="np-imp-msg" style="color:var(--text-muted)"></span></div>
      </div>
      <div class="np-res">
        <div><b>${filas.filter(x => x.f.p1 != null).length}/${lista.length}</b><small>con nota del I Período</small></div>
        <div><b>${npFmt(prom("p1"))}</b><small>promedio I Período</small></div>
        <div><b>${npFmt(prom("p2"))}</b><small>promedio II Período${algunaProv ? " (en curso)" : ""}</small></div>
        <div><b>${npFmt(prom("anual"))}</b><small>promedio nota anual</small></div>
        <div><b style="color:#15803d">${aprob}</b><small>aprueban (≥ ${NP_APRUEBA})</small></div>
        <div><b style="color:#b91c1c">${conAnual.length - aprob}</b><small>no aprueban</small></div>
      </div>
      <div style="overflow-x:auto"><table class="grades np-tabla">
        <thead><tr><th>Estudiante</th><th>Cédula</th><th>I Período<br><small>(acta · 50 %)</small></th><th>II Período<br><small>(50 %)</small></th><th>Nota anual</th><th>Condición</th></tr></thead>
        <tbody>${filas.map(({ e, f }) => `<tr>
          <td>${npEsc(nombre(e))}</td><td class="cedula">${npEsc(e.id)}</td>
          <td><input class="np-in" type="number" min="0" max="100" step="0.01" data-p="p1" data-est="${npEsc(e.id)}" value="${f.p1 ?? ""}"></td>
          <td><input class="np-in" type="number" min="0" max="100" step="0.01" data-p="p2" data-est="${npEsc(e.id)}" value="${f.p2def ?? ""}" placeholder="${plat[e.id] != null ? npFmt(plat[e.id]) : "—"}">
            ${f.provisional ? `<div class="np-prov">en curso: ${npFmt(f.p2)} (plataforma)</div>` : ""}</td>
          <td class="num"><b style="font-size:1.05rem">${f.anual ?? "—"}</b>${f.provisional && f.anual != null ? `<div class="np-prov">proyectada</div>` : ""}</td>
          <td>${f.aprueba == null ? "—" : f.aprueba ? '<span class="np-ok">Aprobado</span>' : '<span class="np-no">Aplazado</span>'}</td></tr>`).join("") || `<tr><td colspan="6" class="empty">No hay estudiantes en esta sección.</td></tr>`}</tbody>
      </table></div>
      <p style="color:var(--text-muted);font-size:.85rem">Si el II Período está vacío, se usa la nota que la plataforma calcula hoy con la Rúbrica (sale como <i>en curso</i> y la anual como <i>proyectada</i>). Al cerrar el período, use <b>📌 Fijar el II Período</b> o escriba la nota definitiva. Los cambios se guardan solos.</p>
      <p id="np-msg" style="color:var(--text-muted)"></p>`;
    const msg = t => { const m = document.getElementById("np-msg"); if (m) m.textContent = t; };
    const guardar = async () => { try { reg = await npGuardar(sel, reg, C); C = reg.C; msg("✅ Guardado " + new Date().toLocaleTimeString("es-CR")); } catch (er) { msg("❌ No se pudo guardar: " + er.message); } };
    document.getElementById("np-mat").onchange = ev => { renderNotasPeriodo.mat = ev.target.value; renderNotasPeriodo(); };
    wrap.querySelectorAll(".np-in").forEach(inp => inp.addEventListener("change", async () => {
      const p = inp.dataset.p, v = npNum(inp.value);
      if (v != null && (v < 0 || v > 100)) { alert("La nota debe estar entre 0 y 100."); inp.value = ""; return; }
      C[p] = C[p] || { notas: {} }; C[p].notas = { ...(C[p].notas || {}) };
      if (v == null) delete C[p].notas[inp.dataset.est]; else C[p].notas[inp.dataset.est] = Math.round(v * 100) / 100;
      await guardar(); pintar();
    }));
    document.getElementById("np-vis1").onclick = async () => { C.visible_p1 = !C.visible_p1; await guardar(); pintar(); };
    document.getElementById("np-vis2").onclick = async () => {
      if (!C.visible_anual && filas.some(x => x.f.provisional) && !confirm("El II Período todavía no está fijado: los estudiantes verían una nota anual PROYECTADA con su nota actual de la plataforma. ¿Habilitarla igual?")) return;
      C.visible_anual = !C.visible_anual; await guardar(); pintar();
    };
    document.getElementById("np-importar").onclick = () => { const d = document.getElementById("np-imp"); d.style.display = d.style.display === "none" ? "block" : "none"; };
    document.getElementById("np-leer").onclick = async () => {
      const r = npLeerActa(document.getElementById("np-txt").value, lista);
      const n = Object.keys(r.notas).length;
      if (!n) { document.getElementById("np-imp-msg").textContent = "No encontré notas: revise que cada línea tenga cédula, nombre y nota."; return; }
      if (!confirm(`Se van a cargar ${n} notas del I Período${r.sinMatch.length ? `\n\nNo encontré en esta sección: ${r.sinMatch.join(", ")}` : ""}. ¿Seguir?`)) return;
      C.p1 = { ...(C.p1 || {}), notas: { ...((C.p1 || {}).notas || {}), ...r.notas }, fuente: "Acta MEP", cargado: new Date().toISOString() };
      await guardar(); pintar();
    };
    document.getElementById("np-usar-plat").onclick = async () => {
      const faltan = lista.filter(e => npNum(((C.p2 || {}).notas || {})[e.id]) == null && plat[e.id] != null);
      if (!faltan.length) { msg("Todos ya tienen nota fija del II Período."); return; }
      if (!confirm(`Se fija como nota del II Período la nota que hoy calcula la plataforma para ${faltan.length} estudiante(s). Hágalo cuando ya cerró el período. ¿Seguir?`)) return;
      C.p2 = { ...(C.p2 || {}), notas: { ...((C.p2 || {}).notas || {}) } };
      faltan.forEach(e => { C.p2.notas[e.id] = Math.round(plat[e.id] * 100) / 100; });
      await guardar(); pintar();
    };
    document.getElementById("np-pdf").onclick = () => {
      const w = window.open("", "_blank"); if (!w) { alert("Permita las ventanas emergentes para imprimir."); return; }
      w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Notas por período · ${npEsc(materia.seccion)}</title>
        <style>body{font-family:Arial,sans-serif;margin:24px;color:#111}h2{margin:0}p{margin:4px 0 12px;color:#444;font-size:12px}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #999;padding:5px 7px}th{background:#eef2ff}td.n{text-align:center}.f{margin-top:40px;font-size:12px}</style></head><body>
        <h2>CTP Mercedes Norte · Notas por período y nota anual</h2>
        <p>${npEsc(String(materia.nombre).trim())} · Sección ${npEsc(materia.seccion)} · Curso lectivo ${new Date().getFullYear()} · Nota anual = 50 % I Período + 50 % II Período (Decreto 45509-MEP, art. 48). Aprobado con ${NP_APRUEBA} o más.${algunaProv ? " El II Período marcado con * es la nota en curso de la plataforma (nota anual proyectada)." : ""}</p>
        <table><thead><tr><th>#</th><th>Cédula</th><th>Estudiante</th><th>I Período</th><th>II Período</th><th>Nota anual</th><th>Condición</th></tr></thead><tbody>
        ${filas.map(({ e, f }, i) => `<tr><td class="n">${i + 1}</td><td>${npEsc(e.id)}</td><td>${npEsc(nombre(e))}</td><td class="n">${npFmt(f.p1)}</td><td class="n">${npFmt(f.p2)}${f.provisional ? "*" : ""}</td><td class="n"><b>${f.anual ?? "—"}</b></td><td class="n">${f.aprueba == null ? "—" : f.aprueba ? "Aprobado" : "Aplazado"}</td></tr>`).join("")}
        </tbody></table><div class="f">______________________________<br>Firma del docente</div><script>setTimeout(()=>print(),300)<\/script></body></html>`);
      w.document.close();
    };
  }
  pintar();
}

// Panel en el perfil del estudiante (y del profe, siempre).
async function pintarNotasPeriodoPerfil(estudiante, esEstudiante) {
  const holder = document.getElementById("notas-periodo-panel");
  if (!holder) return;
  const { data: em } = await sb.from("estudiante_materias").select("materia_id, materias(nombre, seccion)").eq("estudiante_id", estudiante.id);
  const bloques = [];
  for (const m of em || []) {
    const reg = await npCargar(m.materia_id);
    if (!reg) continue;
    const C = reg.C;
    const p1 = npNum(((C.p1 || {}).notas || {})[estudiante.id]);
    if (p1 == null && !esEstudiante) continue;
    const verP1 = !esEstudiante || C.visible_p1, verAnual = !esEstudiante || C.visible_anual;
    if (!verP1 && !verAnual) continue;
    let plataforma = null;
    if (verAnual && npNum(((C.p2 || {}).notas || {})[estudiante.id]) == null) {
      const { data: categorias } = await sb.from("rubrica_categorias").select("*").order("orden");
      plataforma = await npNotaPlataforma(estudiante.id, m.materia_id, categorias);
    }
    const f = npFila(C, estudiante.id, plataforma);
    const nm = m.materias ? `${String(m.materias.nombre).trim()}${m.materias.seccion ? " · " + m.materias.seccion : ""}` : "Materia";
    bloques.push(`<div class="np-perfil-mat"><b>${npEsc(nm)}</b>
      <div class="np-perfil-grid">
        ${verP1 ? `<div><span>I Período</span><b>${npFmt(f.p1)}</b></div>` : ""}
        ${verAnual ? `<div><span>II Período${f.provisional ? " (en curso)" : ""}</span><b>${npFmt(f.p2)}</b></div>
        <div><span>Nota anual${f.provisional ? " (proyectada)" : ""}</span><b>${f.anual ?? "—"}</b></div>
        <div><span>Condición</span><b class="${f.aprueba ? "np-ok" : f.aprueba === false ? "np-no" : ""}">${f.aprueba == null ? "—" : f.aprueba ? "Aprobado" : "Aplazado"}</b></div>` : ""}
      </div></div>`);
  }
  if (!bloques.length) { holder.innerHTML = ""; return; }
  holder.innerHTML = `<div class="np-perfil"><h3 style="margin:0 0 .4rem">📄 Notas por período</h3>
    ${!esEstudiante ? `<p class="np-solo-profe">🔒 Vista del profe. ${""}El estudiante solo ve lo que usted habilite en <a href="#/notas-periodo">Notas por período</a>.</p>` : `<p style="margin:0 0 .5rem;color:var(--text-muted);font-size:.85rem">Nota anual = 50 % del I Período + 50 % del II Período. Se aprueba con ${NP_APRUEBA} o más.</p>`}
    ${bloques.join("")}</div>`;
}
