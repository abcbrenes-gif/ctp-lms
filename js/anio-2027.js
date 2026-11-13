// ═══════════ 📅 2027 (#/2027) — solo docente ═══════════
// Espacio para preparar el curso lectivo 2027. Aquí se van colocando las
// herramientas y planes nuevos; los estudiantes no ven nada de esto.
// Lista de pendientes guardada en trabajos_cotidianos (habilitado:false, estrategia "plan_2027").
async function renderAnio2027() {
  if (session.role !== "docente") { location.hash = "#/"; return; }
  app.innerHTML = `${topbar()}<div class="wrap" id="a27"><h1>📅 Curso lectivo 2027</h1><p>Cargando…</p></div>`;
  bindTopbar();
  const wrap = document.getElementById("a27"), esc = escAC;
  const { data } = await sb.from("trabajos_cotidianos").select("id, contenido_actividad").eq("contenido_actividad->>estrategia", "plan_2027").order("id").limit(1);
  let reg = (data || [])[0] || null;
  let items = ((reg && reg.contenido_actividad.items) || []).slice();
  const guardar = async () => {
    const C = { estrategia: "plan_2027", items };
    if (reg) { const { error } = await sb.from("trabajos_cotidianos").update({ contenido_actividad: C }).eq("id", reg.id); if (error) throw error; }
    else { const { data: d, error } = await sb.from("trabajos_cotidianos").insert({ titulo: "Plan 2027 (registro del profe, no borrar)", tipo_actividad: "rubrica_directa", habilitado: false, contenido_actividad: C }).select("id, contenido_actividad").maybeSingle(); if (error) throw error; reg = d; }
  };
  const pintar = () => {
    wrap.innerHTML = `<h1>📅 Curso lectivo 2027</h1>
      <p style="color:var(--text-muted);margin-top:-0.6em">Aquí vamos armando lo del próximo año. Solo lo ve usted: nada de esta sección aparece a los estudiantes.</p>
      <div class="card" style="padding:1rem;margin:1rem 0"><h2 style="margin-top:0">🧰 Herramientas 2027</h2>
        <div style="display:flex;gap:.6rem;flex-wrap:wrap"><a class="btn" href="ciudad-contable.html">🏙️ Ciudad Contable (prototipo)</a><a class="btn" href="taller-contable.html">🧮 Taller del Ciclo Contable (prototipo)</a><button class="btn" id="a27-fam">👪 Registro de familias</button><button class="btn" id="a27-jus">📝 Justificaciones de ausencias y tardías</button><a class="btn secondary" href="/padres" target="_blank" rel="noopener">👀 Ver el Portal de familias</a></div></div>
      <div class="card" style="padding:1rem"><h2 style="margin-top:0">📝 Pendientes e ideas para 2027</h2>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap"><input id="a27-txt" placeholder="Escriba una idea o pendiente para 2027" style="flex:1;min-width:16rem"><button class="btn" id="a27-add">＋ Agregar</button></div>
        <ul style="list-style:none;padding:0;margin:1rem 0 0">${items.map((x, i) => `<li style="display:flex;gap:.6rem;align-items:center;padding:.5rem 0;border-bottom:1px solid var(--paper-line)">
          <input type="checkbox" data-a27h="${i}" ${x.hecho ? "checked" : ""} aria-label="Marcar como hecho">
          <span style="flex:1;${x.hecho ? "text-decoration:line-through;color:var(--text-muted)" : ""}">${esc(x.t)}</span><small style="color:var(--text-muted)">${esc(x.f || "")}</small>
          <button class="btn secondary small" data-a27d="${i}" title="Quitar">✕</button></li>`).join("") || '<li style="color:var(--text-muted)">Sin pendientes todavía.</li>'}</ul>
        <p id="a27-msg" style="color:var(--text-muted)"></p></div>`;
    const msg = t => { document.getElementById("a27-msg").textContent = t; };
    const hacer = async f => { try { f(); await guardar(); pintar(); } catch (e) { msg("❌ No se pudo guardar: " + e.message); } };
    document.getElementById("a27-jus").onclick = () => { location.hash = "#/justificaciones"; };
    document.getElementById("a27-fam").onclick = () => { location.hash = "#/2027/familias"; };
    document.getElementById("a27-add").onclick = () => { const t = document.getElementById("a27-txt").value.trim(); if (t) hacer(() => items.push({ t, hecho: false, f: new Date().toLocaleDateString("es-CR") })); };
    document.getElementById("a27-txt").onkeydown = e => { if (e.key === "Enter") document.getElementById("a27-add").click(); };
    wrap.querySelectorAll("[data-a27h]").forEach(c => c.onchange = () => hacer(() => { items[+c.dataset.a27h].hecho = c.checked; }));
    wrap.querySelectorAll("[data-a27d]").forEach(b => b.onclick = () => { if (confirm("¿Quitar este pendiente?")) hacer(() => items.splice(+b.dataset.a27d, 1)); });
  };
  pintar();
}

// ═══════════ 👪 Registro de familias 2027 ═══════════
// Enlace y código QR públicos (registro-familias.html). Cada registro llega
// «pendiente» (estrategia "registro_encargado"); al aprobarlo pasa al registro
// de encargados que usa #/justificaciones. El servidor firma cada registro
// para saber que salió de verdad del formulario.
const REG_URL = location.origin + "/registro-familias";
function cargarQR() {
  if (window.qrcode) return Promise.resolve();
  return new Promise((ok, mal) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"; s.onload = ok; s.onerror = () => mal(new Error("No se pudo cargar el generador de QR")); document.head.appendChild(s); });
}
function qrSVG(txt, cel) { const q = qrcode(0, "M"); q.addData(txt); q.make(); return q.createSvgTag({ cellSize: cel || 6, margin: 2, scalable: true }); }
async function renderRegistroFamilias() {
  if (session.role !== "docente") { location.hash = "#/"; return; }
  app.innerHTML = `${topbar()}<div class="wrap" id="rf"><p>Cargando…</p></div>`;
  bindTopbar();
  const wrap = document.getElementById("rf"), esc = escAC;
  const [{ data: regs0 }, { data: encs }] = await Promise.all([
    sb.from("trabajos_cotidianos").select("id, contenido_actividad").eq("contenido_actividad->>estrategia", "registro_encargado").order("id", { ascending: false }).limit(500),
    sb.from("trabajos_cotidianos").select("id, contenido_actividad").eq("contenido_actividad->>estrategia", "encargados").order("id").limit(1)]);
  const regs = (regs0 || []).map(x => ({ id: x.id, ...x.contenido_actividad }));
  let regEnc = (encs || [])[0] || null; const ENC = { ...((regEnc && regEnc.contenido_actividad.datos) || {}) };
  let validas = [];
  try { const r = await fetch("/api/padres", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accion: "validar_registros", registros: regs }) }); validas = (await r.json()).validas || []; } catch (e) { }
  let qr = ""; try { await cargarQR(); qr = qrSVG(REG_URL, 6); } catch (e) { qr = `<p style="color:var(--text-muted)">${esc(e.message)}</p>`; }
  const pend = regs.filter(r => r.estado === "pendiente"), resto = regs.filter(r => r.estado !== "pendiente");
  const fila = (r, conBotones) => { const i = regs.indexOf(r), ok = validas[i];
    return `<tr><td><b>${esc(r.estNombre)}</b><br><small>${esc(r.est)} · ${esc(r.nivel)}</small></td>
      <td>${esc(r.nombre)}<br><small>${esc(r.parentesco)} · céd. ${esc(r.cedula)}</small></td>
      <td>${esc(r.telefono)}<br><small>${esc(r.correo)}</small></td>
      <td>${r.nombre2 ? `${esc(r.nombre2)}<br><small>${esc(r.parentesco2)} · ${esc(r.telefono2)}</small>` : "—"}</td>
      <td><small>${new Date(r.enviado).toLocaleString("es-CR")}<br>${esc(r.dispositivo || "")}</small><br>${ok ? '<span style="color:#1f8f55">✔ del formulario</span>' : '<span style="color:#c2410c">⚠ sin firma válida</span>'}</td>
      <td>${conBotones ? `<button class="btn small" data-rfa="${r.id}">✅ Aprobar</button> <button class="btn secondary small" data-rfr="${r.id}">✕ Rechazar</button>` : (r.estado === "aprobado" ? "✅ Aprobado" : "✕ Rechazado")}</td></tr>`; };
  const tabla = (L, b) => L.length ? `<div style="overflow-x:auto"><table class="grades"><thead><tr><th>Estudiante</th><th>Encargado</th><th>Contacto</th><th>2.º contacto</th><th>Enviado</th><th></th></tr></thead><tbody>${L.map(r => fila(r, b)).join("")}</tbody></table></div>` : '<p style="color:var(--text-muted)">Ninguno.</p>';
  wrap.innerHTML = `<p><button class="btn secondary small" id="rf-volver">← 2027</button></p>
    <h1>👪 Registro de familias 2027</h1>
    <p style="color:var(--text-muted);margin-top:-0.6em">Comparta el código QR o el enlace con los encargados. Cada registro llega aquí como pendiente y solo se activa cuando usted lo aprueba.</p>
    <div class="card" style="padding:1rem;display:flex;gap:1.2rem;flex-wrap:wrap;align-items:center">
      <div style="width:170px;height:170px;background:#fff;border-radius:12px;padding:6px">${qr}</div>
      <div style="flex:1;min-width:16rem"><p style="margin:0 0 .4rem"><b>Enlace:</b> <a href="${esc(REG_URL)}" target="_blank" rel="noopener">${esc(REG_URL)}</a></p>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap"><button class="btn small" id="rf-copiar">📋 Copiar enlace</button><button class="btn small" id="rf-imp">🖨️ Imprimir hoja con QR</button></div>
        <p id="rf-msg" style="color:var(--text-muted);margin:.4rem 0 0"></p></div></div>
    <div class="card" style="padding:1rem"><h2 style="margin-top:0">⏳ Pendientes (${pend.length})</h2>${tabla(pend, true)}</div>
    <div class="card" style="padding:1rem"><h2 style="margin-top:0">📁 Revisados (${resto.length})</h2>${tabla(resto, false)}</div>`;
  const msg = t => { document.getElementById("rf-msg").textContent = t; };
  document.getElementById("rf-volver").onclick = () => { location.hash = "#/2027"; };
  document.getElementById("rf-copiar").onclick = async () => { try { await navigator.clipboard.writeText(REG_URL); msg("✅ Enlace copiado."); } catch (e) { msg(REG_URL); } };
  document.getElementById("rf-imp").onclick = () => {
    const w = window.open("", "_blank"); if (!w) { msg("Permita ventanas emergentes para imprimir."); return; }
    w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Registro de familias 2027</title><style>body{font-family:Arial,sans-serif;text-align:center;color:#14213d;padding:30px}h1{margin:0 0 4px;font-size:28px}.q{width:320px;height:320px;margin:24px auto}.q svg{width:100%;height:100%}p{font-size:17px;max-width:560px;margin:8px auto}.u{font-family:monospace;font-size:16px;background:#eef3fb;padding:8px 12px;border-radius:8px;display:inline-block}</style></head><body>
      <h1>Registro de familias · Contabilidad 2027</h1><p>CTP Mercedes Norte</p><div class="q">${qrSVG(REG_URL, 10)}</div>
      <p><b>Madre, padre o encargado:</b> escanee este código con la cámara del celular y complete sus datos. Toma unos 3 minutos.</p>
      <p>Si no puede escanearlo, escriba esta dirección:</p><p class="u">${esc(REG_URL)}</p>
      <p style="font-size:14px;color:#5b6b80;margin-top:24px">El registro lo llena el encargado, no el estudiante. El docente confirma cada registro.</p>
      <script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);
    w.document.close();
  };
  const marcar = async (id, estado) => { const r = regs.find(x => x.id === id); const C = { ...r }; delete C.id; C.estado = estado; C.revisado = new Date().toISOString();
    const { error } = await sb.from("trabajos_cotidianos").update({ contenido_actividad: C }).eq("id", id); if (error) throw error; };
  wrap.querySelectorAll("[data-rfa]").forEach(b => b.onclick = async () => {
    const r = regs.find(x => x.id === +b.dataset.rfa), i = regs.indexOf(r);
    if (!validas[i] && !confirm("Este registro no tiene una firma válida del formulario (pudo haberse creado por otro medio). ¿Aprobarlo de todos modos?")) return;
    const ant = ENC[r.est];
    if (ant && (ant.nombre || ant.telefono || ant.correo) && !confirm(`${r.estNombre} ya tiene encargado registrado:\n${ant.nombre || "—"} · ${ant.telefono || "—"} · ${ant.correo || "—"}\n\n¿Reemplazarlo por ${r.nombre}? (Si es un segundo encargado, cancele y rechace este registro o agréguelo a mano.)`)) return;
    try {
      ENC[r.est] = { ...(ant || {}), nombre: r.nombre, telefono: r.telefono, correo: r.correo, cedula: r.cedula, parentesco: r.parentesco, estNombre: r.estNombre, nivel: r.nivel,
        contacto2: r.nombre2 ? { nombre: r.nombre2, parentesco: r.parentesco2, telefono: r.telefono2 } : (ant && ant.contacto2) || null, registro: r.id };
      const C = { estrategia: "encargados", datos: ENC };
      const q = regEnc ? await sb.from("trabajos_cotidianos").update({ contenido_actividad: C }).eq("id", regEnc.id)
        : await sb.from("trabajos_cotidianos").insert({ titulo: "Encargados de los estudiantes (registro del profe, no borrar)", tipo_actividad: "rubrica_directa", habilitado: false, contenido_actividad: C });
      if (q.error) throw q.error;
      await marcar(r.id, "aprobado"); renderRegistroFamilias();
    } catch (e) { msg("❌ " + e.message); }
  });
  wrap.querySelectorAll("[data-rfr]").forEach(b => b.onclick = async () => {
    if (!confirm("¿Rechazar este registro? No se agrega a los encargados.")) return;
    try { await marcar(+b.dataset.rfr, "rechazado"); renderRegistroFamilias(); } catch (e) { msg("❌ " + e.message); }
  });
}
