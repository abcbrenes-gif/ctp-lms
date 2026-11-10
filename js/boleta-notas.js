// ═══════════ Boleta de notas (II Período y nota anual) ═══════════
// Usa los mismos datos y cálculos de «Notas por período» (js/notas-periodo.js):
// I Período del acta, II Período fijado por el profe (o el de la plataforma)
// y nota anual = 50 % + 50 % redondeada; aprueba con 70 (Decreto 45509-MEP).
// El profe la revisa aquí y la EMITE con un botón; hasta entonces el
// estudiante no ve nada. Se guarda en el mismo registro: C.boleta = {emitida, fecha}.

// Nota de cada componente de la Rúbrica (para el detalle del II Período).
async function bnComponentes(estudianteId, materiaId, categorias) {
  const out = [];
  for (const c of categorias || []) {
    const n = c.nombre.trim().toLowerCase(), pc = Number(c.porcentaje) || 0;
    if (n === "pruebas") {
      const a = await calcularAportePruebas(estudianteId, materiaId, c.nombre, c.porcentaje);
      out.push({ nombre: c.nombre, pc, aporte: a ? a.aporte : null, nota: a && pc ? a.aporte * 100 / pc : null });
      continue;
    }
    const r = n === "asistencia" ? await calcularNotaAsistencia(estudianteId, materiaId) : await calcularNotaIndicadores(estudianteId, materiaId, c.nombre);
    const nota = r && r.nota != null ? r.nota : null;
    out.push({ nombre: c.nombre, pc, nota, aporte: nota != null ? nota * pc / 100 : null });
  }
  return out;
}

function bnBoletaHTML({ est, materia, f, comps, fijada }) {
  const nom = `${est.nombre} ${est.apellido1 || ""} ${est.apellido2 || ""}`.replace(/\s+/g, " ").trim();
  const crudo = f.p1 != null && f.p2 != null ? Math.round((f.p1 * NP_PESOS.p1 + f.p2 * NP_PESOS.p2) * 100) / 100 : null;
  const ok = f.anual != null && f.anual >= NP_APRUEBA;
  const falta = f.anual != null && !ok ? NP_APRUEBA - f.anual : 0;
  const pendiente = f.anual == null;
  return `<article class="bn-boleta">
    <div class="bn-head"><div><b>${npEsc(nom)}</b><div class="bn-meta">${npEsc(String(materia.nombre).trim())} · Sección ${npEsc(materia.seccion || "")}</div></div>
      <div class="bn-meta" style="text-align:right">CTP Mercedes Norte<br>Curso lectivo ${new Date().getFullYear()}</div></div>
    <div class="bn-body">
      <div class="bn-cajas">
        <div class="bn-caja"><small>I Período</small><div class="bn-v" data-c="${f.p1 ?? ""}">${f.p1 == null ? "—" : "0"}</div><small>50 % de la anual</small></div>
        <div class="bn-caja"><small>II Período</small><div class="bn-v" data-c="${f.p2 ?? ""}">${f.p2 == null ? "—" : "0"}</div><small>50 % de la anual</small></div>
        <div class="bn-caja anual"><small>Nota anual</small><div class="bn-v" data-c="${f.anual ?? ""}">${f.anual == null ? "—" : "0"}</div><small>${crudo != null ? `${npFmt(f.p1)} × 50 % + ${npFmt(f.p2)} × 50 % = ${npFmt(crudo)}` : "Falta una de las notas"}</small></div>
      </div>
      ${comps && comps.length ? `<div><div class="bn-lbl">Detalle del II Período</div><div class="bn-comp">
        ${comps.map(c => `<div class="bn-row"><span>${npEsc(c.nombre)} <small>(${npFmt(c.pc)} %)</small></span><span class="n">${c.nota == null ? "—" : npFmt(Math.round(c.nota * 100) / 100)}</span><span class="n">${c.aporte == null ? "—" : npFmt(Math.round(c.aporte * 100) / 100) + " pts"}</span>
          <div class="bn-bar"><i data-w="${c.nota == null ? 0 : Math.max(0, Math.min(100, c.nota))}"></i></div></div>`).join("")}
        ${fijada ? `<p class="bn-pie" style="margin:4px 0 0">La nota del II Período la fijó su docente al cerrar el período.</p>` : ""}
      </div></div>` : ""}
      ${pendiente ? `<div class="bn-ver pend"><div><b>Condición pendiente</b><p>Falta la nota de uno de los períodos.</p></div></div>` : `
      <div class="bn-ver ${ok ? "ok" : "no"}">
        <div class="bn-sello ${ok ? "ok" : "no"}" style="visibility:hidden"><div><span>CTP MERCEDES NORTE</span><b>${ok ? "APROBADO" : "APLAZADO"}</b><span>${new Date().getFullYear()}</span></div></div>
        <div><b class="bn-vt">${ok ? `¡Felicidades! Aprobó ${npEsc(String(materia.nombre).trim())}.` : `Esta vez no alcanzó la nota mínima de ${NP_APRUEBA}.`}</b>
          <p>Su nota anual es ${f.anual}; la nota mínima es ${NP_APRUEBA}.${ok ? "" : ` Le ${falta === 1 ? "faltó 1 punto" : `faltaron ${falta} puntos`}. Su docente le indicará el proceso que sigue.`}</p></div>
      </div>`}
      <p class="bn-pie">Nota anual según el Reglamento de Evaluación de los Aprendizajes (Decreto 45509-MEP): 50 % de cada período, redondeada al entero (0,50 o más sube).</p>
    </div></article>`;
}

// Anima los números, las barras y el sello de una boleta ya pintada.
function bnAnimar(root) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.querySelectorAll("[data-c]").forEach(el => {
    if (el.dataset.c === "") return;
    const fin = Number(el.dataset.c);
    if (reduce) { el.textContent = npFmt(fin); return; }
    let t0 = null;
    const paso = t => { t0 = t0 || t; const k = Math.min(1, (t - t0) / 900); el.textContent = npFmt(Math.round(fin * (1 - Math.pow(1 - k, 3)) * 100) / 100); if (k < 1) requestAnimationFrame(paso); else el.textContent = npFmt(fin); };
    requestAnimationFrame(paso);
  });
  requestAnimationFrame(() => root.querySelectorAll("[data-w]").forEach(i => { i.style.width = i.dataset.w + "%"; }));
  setTimeout(() => { const s = root.querySelector(".bn-sello"); if (s) { s.style.visibility = "visible"; s.classList.add("cae"); } }, reduce ? 0 : 1000);
}

// ── Vista del profe: #/boleta-notas ──
async function renderBoletaNotas() {
  if (session.role !== "docente") { location.hash = "#/"; return; }
  app.innerHTML = `${topbar()}<div class="wrap" id="bn-wrap"><h1>🎓 Boleta de notas</h1><p>Cargando…</p></div>`;
  bindTopbar();
  const wrap = document.getElementById("bn-wrap");
  const { data: materias } = await sb.from("materias").select("*").order("id");
  const sel = Number(renderBoletaNotas.mat || (materias || [])[0]?.id);
  const materia = (materias || []).find(m => m.id === sel);
  if (!materia) { wrap.innerHTML = "<h1>🎓 Boleta de notas</h1><p>No hay materias.</p>"; return; }
  const [{ data: em }, { data: categorias }, reg0] = await Promise.all([
    sb.from("estudiante_materias").select("estudiante_id").eq("materia_id", sel),
    sb.from("rubrica_categorias").select("*").order("orden"),
    npCargar(sel)]);
  const ids = (em || []).map(x => x.estudiante_id);
  const { data: es } = ids.length ? await sb.from("estudiantes").select("id, nombre, apellido1, apellido2").in("id", ids) : { data: [] };
  const lista = (es || []).sort((a, b) => `${a.apellido1} ${a.apellido2} ${a.nombre}`.localeCompare(`${b.apellido1} ${b.apellido2} ${b.nombre}`, "es"));
  wrap.innerHTML = `<h1>🎓 Boleta de notas</h1><p style="color:var(--text-muted)">Calculando el II Período con la Rúbrica…</p>`;
  const comps = {};
  await Promise.all(lista.map(async e => { comps[e.id] = await bnComponentes(e.id, sel, categorias); }));
  const plat = {};
  lista.forEach(e => { const v = comps[e.id].filter(c => c.aporte != null); plat[e.id] = v.length ? v.reduce((s, c) => s + c.aporte, 0) : null; });
  let reg = reg0, C = (reg0 && reg0.C) || { p1: { notas: {} }, p2: { notas: {} } };
  let abierto = null, confirmando = false;
  const nombre = e => `${e.apellido1} ${e.apellido2 || ""}, ${e.nombre}`.replace(/\s+,/, ",");

  function pintar() {
    const filas = lista.map(e => ({ e, f: npFila(C, e.id, plat[e.id]) }));
    const emitida = !!(C.boleta && C.boleta.emitida);
    const sinP1 = filas.filter(x => x.f.p1 == null).length, prov = filas.filter(x => x.f.provisional).length;
    const listas = filas.filter(x => x.f.aprueba != null), aprob = listas.filter(x => x.f.aprueba).length;
    const puede = lista.length && !sinP1 && !prov;
    wrap.innerHTML = `<h1>🎓 Boleta de notas</h1>
      <p style="color:var(--text-muted);margin-top:-0.6em">Revise la boleta de cada estudiante y, cuando esté lista, emítala. <b>Hasta que la emita, los estudiantes no ven nada.</b> Las notas salen de <a href="#/notas-periodo">📄 Notas por período</a>.</p>
      <div class="np-barra"><label><b>Sección:</b> <select id="bn-mat">${(materias || []).map(m => `<option value="${m.id}" ${m.id === sel ? "selected" : ""}>${npEsc(m.seccion || "")} · ${npEsc(String(m.nombre).trim())}</option>`).join("")}</select></label></div>
      <div class="bn-estado ${emitida ? "ok" : ""}">
        <div><b>${emitida ? "✅ Boleta emitida" : "🔒 Boleta sin emitir: solo usted la ve"}</b>
          <small>${emitida ? `Emitida el ${new Date(C.boleta.fecha).toLocaleString("es-CR", { dateStyle: "long", timeStyle: "short" }).replace(/\.$/, "")}. Cada estudiante la abre en su perfil.` :
            puede ? `Lista para emitir a ${lista.length} estudiantes: ${aprob} aprobados y ${listas.length - aprob} aplazados.` :
            `Para emitir falta: ${[sinP1 ? `nota del I Período de ${sinP1} estudiante(s)` : "", prov ? `fijar el II Período de ${prov} estudiante(s) (en Notas por período, «📌 Fijar el II Período»)` : ""].filter(Boolean).join(" y ")}.`}</small></div>
        <div class="bn-acc">${confirmando ? `<span>¿Emitir la boleta a ${lista.length} estudiantes de la ${npEsc(materia.seccion || "")}?</span><button class="btn small" id="bn-si">Sí, emitir</button><button class="btn secondary small" id="bn-no">Cancelar</button>` :
          emitida ? `<button class="btn secondary small" id="bn-retirar">↩ Retirar boleta</button>` :
          `<button class="btn small" id="bn-emitir" ${puede ? "" : "disabled"}>🎓 Emitir notas del II Período y anual</button>`}</div>
      </div>
      <div style="overflow-x:auto"><table class="grades">
        <thead><tr><th>Estudiante</th><th>I Período</th><th>II Período</th><th>Nota anual</th><th>Condición</th><th></th></tr></thead>
        <tbody>${filas.map(({ e, f }) => `<tr>
          <td>${npEsc(nombre(e))}</td><td class="num">${npFmt(f.p1)}</td><td class="num">${npFmt(f.p2)}${f.provisional ? ' <small class="np-prov">en curso</small>' : ""}</td>
          <td class="num"><b>${f.anual ?? "—"}</b></td>
          <td>${f.aprueba == null ? `<span class="np-pend">${f.provisional ? "Pendiente" : "—"}</span>` : f.aprueba ? '<span class="np-ok">Aprobado</span>' : '<span class="np-no">Aplazado</span>'}</td>
          <td><button class="btn secondary small" data-bn-ver="${npEsc(e.id)}">${abierto === e.id ? "Cerrar" : "👁 Ver boleta"}</button></td></tr>
          ${abierto === e.id ? `<tr><td colspan="6"><div class="bn-prev"><div class="bn-lbl">Así la verá ${npEsc(e.nombre)}${emitida ? "" : " cuando la emita"}</div>
            ${bnBoletaHTML({ est: e, materia, f, comps: comps[e.id], fijada: f.p2def != null })}</div></td></tr>` : ""}`).join("") || `<tr><td colspan="6" class="empty">No hay estudiantes en esta sección.</td></tr>`}</tbody>
      </table></div>
      <p id="bn-msg" style="color:var(--text-muted)"></p>`;
    const msg = t => { const m = document.getElementById("bn-msg"); if (m) m.textContent = t; };
    const guardar = async () => { reg = await npGuardar(sel, reg, C); C = reg.C; };
    document.getElementById("bn-mat").onchange = ev => { renderBoletaNotas.mat = ev.target.value; renderBoletaNotas(); };
    wrap.querySelectorAll("[data-bn-ver]").forEach(b => b.onclick = () => { abierto = abierto === b.dataset.bnVer ? null : b.dataset.bnVer; pintar(); const p = wrap.querySelector(".bn-prev"); if (p) bnAnimar(p); });
    const em = document.getElementById("bn-emitir"); if (em) em.onclick = () => { confirmando = true; pintar(); };
    const no = document.getElementById("bn-no"); if (no) no.onclick = () => { confirmando = false; pintar(); };
    const si = document.getElementById("bn-si"); if (si) si.onclick = async () => {
      try { C = { ...C, boleta: { emitida: true, fecha: new Date().toISOString() } }; await guardar(); confirmando = false; pintar(); msg("✅ Boleta emitida."); }
      catch (er) { msg("❌ No se pudo emitir: " + er.message); }
    };
    const re = document.getElementById("bn-retirar"); if (re) re.onclick = async () => {
      try { C = { ...C, boleta: { emitida: false } }; await guardar(); pintar(); msg("Boleta retirada: los estudiantes ya no la ven."); }
      catch (er) { msg("❌ No se pudo retirar: " + er.message); }
    };
  }
  pintar();
}

// ── Vista del estudiante: en su perfil, solo si la boleta está emitida ──
async function pintarBoletaPerfil(estudiante, esEstudiante) {
  const holder = document.getElementById("boleta-panel");
  if (!holder || !esEstudiante) return;
  const { data: em } = await sb.from("estudiante_materias").select("materia_id, materias(nombre, seccion)").eq("estudiante_id", estudiante.id);
  const bloques = [];
  let categorias = null;
  for (const m of em || []) {
    const reg = await npCargar(m.materia_id);
    if (!reg || !reg.C.boleta || !reg.C.boleta.emitida) continue;
    categorias = categorias || (await sb.from("rubrica_categorias").select("*").order("orden")).data;
    const comps = await bnComponentes(estudiante.id, m.materia_id, categorias);
    const v = comps.filter(c => c.aporte != null);
    const f = npFila(reg.C, estudiante.id, v.length ? v.reduce((s, c) => s + c.aporte, 0) : null);
    bloques.push({ m, html: bnBoletaHTML({ est: estudiante, materia: { nombre: m.materias ? m.materias.nombre : "Materia", seccion: m.materias ? m.materias.seccion : "" }, f, comps, fijada: f.p2def != null }) });
  }
  if (!bloques.length) { holder.innerHTML = ""; return; }
  holder.innerHTML = bloques.map((b, i) => `<div class="bn-sobre" data-bn-i="${i}"><div class="bn-sello-c">CTP<br>MN</div>
    <div><b>Su boleta de ${npEsc(String(b.m.materias ? b.m.materias.nombre : "").trim())} está lista</b><small>II Período y nota anual ${new Date().getFullYear()}</small></div>
    <button class="btn small" data-bn-abrir="${i}">Abrir mi boleta</button></div>`).join("");
  holder.querySelectorAll("[data-bn-abrir]").forEach(btn => btn.onclick = () => {
    const box = holder.querySelector(`[data-bn-i="${btn.dataset.bnAbrir}"]`);
    box.outerHTML = `<div class="bn-prev" data-bn-i="${btn.dataset.bnAbrir}">${bloques[+btn.dataset.bnAbrir].html}</div>`;
    bnAnimar(holder.querySelector(`[data-bn-i="${btn.dataset.bnAbrir}"]`));
  });
}
