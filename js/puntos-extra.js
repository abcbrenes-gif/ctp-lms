// ═══════════ Puntos extra por estudiante (#/puntos-extra) ═══════════
// El profe suma puntos a un componente (Trabajo cotidiano, Tareas, Proyectos)
// de UN estudiante o de varios marcados, con un motivo. Los puntos van al
// APORTE del componente en la nota del período (12 % → 13 %), sin pasar del
// valor del componente. Se guardan con guardarBonoEstudiante (js/app-parte1.js)
// y los usan calcularNotaIndicadores, el reporte oficial, Notas por período y la boleta.

async function renderPuntosExtra() {
  if (session.role !== "docente") { location.hash = "#/"; return; }
  app.innerHTML = `${topbar()}<div class="wrap" id="pe-wrap"><h1>➕ Puntos extra</h1><p>Cargando…</p></div>`;
  bindTopbar();
  const wrap = document.getElementById("pe-wrap");
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmt = n => n == null ? "—" : (Math.round(n * 100) / 100).toLocaleString("es-CR");
  const [{ data: materias }, { data: categorias0 }] = await Promise.all([
    sb.from("materias").select("*").order("id"),
    sb.from("rubrica_categorias").select("*").order("orden")]);
  const categorias = (categorias0 || []).filter(c => !["pruebas", "asistencia"].includes(c.nombre.trim().toLowerCase()));
  const sel = Number(renderPuntosExtra.mat || (materias || [])[0]?.id);
  const cat = renderPuntosExtra.cat && categorias.some(c => c.nombre === renderPuntosExtra.cat) ? renderPuntosExtra.cat : (categorias[0] || {}).nombre;
  const catObj = categorias.find(c => c.nombre === cat) || { porcentaje: 0 };
  const pc = Number(catObj.porcentaje) || 0;
  const materia = (materias || []).find(m => m.id === sel);
  if (!materia || !cat) { wrap.innerHTML = "<h1>➕ Puntos extra</h1><p>No hay materias o componentes.</p>"; return; }

  const { data: em } = await sb.from("estudiante_materias").select("estudiante_id").eq("materia_id", sel);
  const ids = (em || []).map(x => x.estudiante_id);
  const { data: es } = ids.length ? await sb.from("estudiantes").select("id, nombre, apellido1, apellido2").in("id", ids) : { data: [] };
  const lista = (es || []).sort((a, b) => `${a.apellido1} ${a.apellido2} ${a.nombre}`.localeCompare(`${b.apellido1} ${b.apellido2} ${b.nombre}`, "es"));
  wrap.innerHTML = `<h1>➕ Puntos extra</h1><p style="color:var(--text-muted)">Calculando…</p>`;
  await cargarAjustesNota(true);
  const info = {};
  await Promise.all(lista.map(async e => { info[e.id] = await calcularNotaIndicadores(e.id, sel, cat); }));
  const marcados = new Set(renderPuntosExtra.marcados || []);

  const nombre = e => `${e.apellido1} ${e.apellido2 || ""}, ${e.nombre}`.replace(/\s+,/, ",");
  const aporteBase = r => r && r.notaSinBono != null ? r.notaSinBono * pc / 100 : null;
  const aporteFinal = r => r && r.nota != null ? r.nota * pc / 100 : null;

  wrap.innerHTML = `<h1>➕ Puntos extra</h1>
    <p style="color:var(--text-muted);margin-top:-0.6em">Suba puntos a un estudiante en un componente: se suman al aporte de ese componente en la nota del período (por ejemplo, Trabajo cotidiano 12 % → 13 %), sin pasar de su valor (${pc} %). Puede dárselos a uno o marcar a varios.</p>
    <div class="np-barra" style="display:flex;gap:1rem;flex-wrap:wrap;align-items:center">
      <label><b>Sección:</b> <select id="pe-mat">${(materias || []).map(m => `<option value="${m.id}" ${m.id === sel ? "selected" : ""}>${esc(m.seccion || "")} · ${esc(String(m.nombre).trim())}</option>`).join("")}</select></label>
      <label><b>Componente:</b> <select id="pe-cat">${categorias.map(c => `<option ${c.nombre === cat ? "selected" : ""}>${esc(c.nombre)}</option>`).join("")}</select></label>
    </div>
    <div class="bn-estado" style="margin:.8rem 0">
      <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap"><b>A los marcados (<span id="pe-n">${marcados.size}</span>):</b>
        + <input id="pe-pts-m" type="number" min="0.5" max="${pc}" step="0.5" placeholder="pts" style="width:5rem"> %
        <input id="pe-mot-m" type="text" maxlength="160" placeholder="Motivo (p. ej. trabajo extra del 11-11)" style="min-width:16rem;flex:1">
        <button class="btn small" id="pe-aplicar">Agregar a los marcados</button></div>
    </div>
    <div style="overflow-x:auto"><table class="grades">
      <thead><tr><th><input type="checkbox" id="pe-todos" aria-label="Marcar a todos"></th><th>Estudiante</th><th>Aporte actual (de ${pc} %)</th><th>Puntos extra dados</th><th>Agregar</th><th>Aporte con extra</th></tr></thead>
      <tbody>${lista.map(e => {
        const r = info[e.id], ex = (r && r.extras) || [];
        return `<tr>
          <td><input type="checkbox" data-pe-m="${esc(e.id)}" ${marcados.has(e.id) ? "checked" : ""} aria-label="Marcar a ${esc(e.nombre)}"></td>
          <td>${esc(nombre(e))}</td>
          <td class="num">${r ? fmt(aporteBase(r)) + " %" : '<span style="color:var(--text-muted)">Sin indicadores</span>'}</td>
          <td>${ex.length ? ex.map((b, i) => `<div style="font-size:.85rem">+${fmt(b.puntos)} % <span style="color:var(--text-muted)">${esc(b.motivo || "")} · ${esc(b.fecha)}</span> <button class="btn secondary small" data-pe-q="${esc(e.id)}|${i}" title="Quitar">✕</button></div>`).join("") : '<span style="color:var(--text-muted)">—</span>'}</td>
          <td style="white-space:nowrap">+<input type="number" min="0.5" max="${pc}" step="0.5" data-pe-pts="${esc(e.id)}" style="width:4.5rem"> % <input type="text" maxlength="160" data-pe-mot="${esc(e.id)}" placeholder="Motivo" style="width:10rem"> <button class="btn small" data-pe-add="${esc(e.id)}">Agregar</button></td>
          <td class="num"><b>${r ? fmt(aporteFinal(r)) + " %" : "—"}</b></td></tr>`;
      }).join("") || `<tr><td colspan="6" class="empty">No hay estudiantes en esta sección.</td></tr>`}</tbody>
    </table></div>
    <p id="pe-msg" style="color:var(--text-muted)"></p>`;

  const msg = t => { const m = document.getElementById("pe-msg"); if (m) m.textContent = t; };
  const recargar = () => { renderPuntosExtra.marcados = [...marcados]; renderPuntosExtra(); };
  const valida = (v) => { const n = Number(String(v).replace(",", ".")); return n > 0 && n <= pc ? n : null; };
  document.getElementById("pe-mat").onchange = ev => { renderPuntosExtra.mat = ev.target.value; renderPuntosExtra.marcados = []; renderPuntosExtra(); };
  document.getElementById("pe-cat").onchange = ev => { renderPuntosExtra.cat = ev.target.value; recargar(); };
  wrap.querySelectorAll("[data-pe-m]").forEach(c => c.onchange = () => { if (c.checked) marcados.add(c.dataset.peM); else marcados.delete(c.dataset.peM); document.getElementById("pe-n").textContent = marcados.size; });
  document.getElementById("pe-todos").onchange = ev => { wrap.querySelectorAll("[data-pe-m]").forEach(c => { c.checked = ev.target.checked; if (c.checked) marcados.add(c.dataset.peM); else marcados.delete(c.dataset.peM); }); document.getElementById("pe-n").textContent = marcados.size; };
  wrap.querySelectorAll("[data-pe-add]").forEach(b => b.onclick = async () => {
    const id = b.dataset.peAdd, pts = valida(wrap.querySelector(`[data-pe-pts="${CSS.escape(id)}"]`).value), mot = wrap.querySelector(`[data-pe-mot="${CSS.escape(id)}"]`).value.trim();
    if (pts == null) { msg(`Escriba los puntos (entre 0,5 y ${pc}).`); return; }
    b.disabled = true;
    try { await guardarBonoEstudiante({ est: id, materia: sel, cat, agregar: { puntos: pts, motivo: mot } }); recargar(); }
    catch (er) { b.disabled = false; msg("❌ No se pudo guardar: " + er.message); }
  });
  wrap.querySelectorAll("[data-pe-q]").forEach(b => b.onclick = async () => {
    const [id, i] = b.dataset.peQ.split("|");
    if (!confirm("¿Quitar estos puntos extra?")) return;
    try { await guardarBonoEstudiante({ est: id, materia: sel, cat, quitar: Number(i) }); recargar(); }
    catch (er) { msg("❌ No se pudo quitar: " + er.message); }
  });
  document.getElementById("pe-aplicar").onclick = async () => {
    const pts = valida(document.getElementById("pe-pts-m").value), mot = document.getElementById("pe-mot-m").value.trim();
    if (!marcados.size) { msg("Marque primero a los estudiantes."); return; }
    if (pts == null) { msg(`Escriba los puntos (entre 0,5 y ${pc}).`); return; }
    if (!confirm(`Se suman ${pts} % al aporte de ${cat} de ${marcados.size} estudiante(s). ¿Seguir?`)) return;
    try { for (const id of marcados) await guardarBonoEstudiante({ est: id, materia: sel, cat, agregar: { puntos: pts, motivo: mot } }); marcados.clear(); recargar(); }
    catch (er) { msg("❌ No se pudo guardar: " + er.message); }
  };
}
