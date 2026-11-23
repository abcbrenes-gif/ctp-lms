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
  let secs = ((reg && reg.contenido_actividad.secciones) || []).slice();
  let usos = { ...((reg && reg.contenido_actividad.usos) || {}) };
  const guardar = async () => {
    const C = { ...((reg && reg.contenido_actividad) || {}), estrategia: "plan_2027", items, secciones: secs, usos };
    if (reg) { const { error } = await sb.from("trabajos_cotidianos").update({ contenido_actividad: C }).eq("id", reg.id); if (error) throw error; }
    else { const { data: d, error } = await sb.from("trabajos_cotidianos").insert({ titulo: "Plan 2027 (registro del profe, no borrar)", tipo_actividad: "rubrica_directa", habilitado: false, contenido_actividad: C }).select("id, contenido_actividad").maybeSingle(); if (error) throw error; reg = d; }
  };
  const pintar = () => {
    wrap.innerHTML = `<h1>📅 Curso lectivo 2027</h1>
      <p style="color:var(--text-muted);margin-top:-0.6em">Aquí vamos armando lo del próximo año. Solo lo ve usted: nada de esta sección aparece a los estudiantes.</p>
      ${partes27(secs, usos)}
      <div class="card" style="padding:1rem"><h2 style="margin-top:0">📝 Pendientes e ideas para 2027</h2>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap"><input id="a27-txt" placeholder="Escriba una idea o pendiente para 2027" style="flex:1;min-width:16rem"><button class="btn" id="a27-add">＋ Agregar</button></div>
        <ul style="list-style:none;padding:0;margin:1rem 0 0">${items.map((x, i) => `<li style="display:flex;gap:.6rem;align-items:center;padding:.5rem 0;border-bottom:1px solid var(--paper-line)">
          <input type="checkbox" data-a27h="${i}" ${x.hecho ? "checked" : ""} aria-label="Marcar como hecho">
          <span style="flex:1;${x.hecho ? "text-decoration:line-through;color:var(--text-muted)" : ""}">${esc(x.t)}</span><small style="color:var(--text-muted)">${esc(x.f || "")}</small>
          <button class="btn secondary small" data-a27d="${i}" title="Quitar">✕</button></li>`).join("") || '<li style="color:var(--text-muted)">Sin pendientes todavía.</li>'}</ul>
        <p id="a27-msg" style="color:var(--text-muted)"></p></div>`;
    const msg = t => { document.getElementById("a27-msg").textContent = t; };
    const hacer = async f => { try { f(); await guardar(); pintar(); } catch (e) { msg("❌ No se pudo guardar: " + e.message); } };
    wrap.querySelectorAll("[data-p27]").forEach(b => b.onclick = () => { try { sessionStorage.setItem("a27_parte", b.dataset.p27); } catch (e) { } pintar(); });
    wrap.querySelectorAll("[data-a27f]").forEach(b => b.onclick = () => { try { sessionStorage.setItem("a27_filtro", b.dataset.a27f); } catch (e) { } pintar(); });
    wrap.querySelectorAll("[data-a27u]").forEach(b => b.onclick = () => hacer(() => { const h = b.dataset.a27u, g = b.dataset.g;
      const act = usos[h] || (HERRAMIENTAS_2027.find(x => x[0] === h) || [])[3] || []; usos[h] = act.includes(g) ? act.filter(x => x !== g) : [...act, g]; }));
    const sAdd = document.getElementById("a27-sadd");
    if (sAdd) sAdd.onclick = () => { const g = id => document.getElementById(id).value.trim(); const sec = g("a27-ssec"), mat = g("a27-smat");
      if (!sec || !mat) { msg("Escriba la sección y la materia."); return; } hacer(() => secs.push({ seccion: sec, nivel: g("a27-sniv"), materia: mat, nota: g("a27-snota") })); };
    wrap.querySelectorAll("[data-a27sd]").forEach(b => b.onclick = () => { if (confirm("¿Quitar esta sección de la lista 2027?")) hacer(() => secs.splice(+b.dataset.a27sd, 1)); });
    const jus = document.getElementById("a27-jus"); if (jus) jus.onclick = () => { location.hash = "#/justificaciones"; };
    const fam = document.getElementById("a27-fam"); if (fam) fam.onclick = () => { location.hash = "#/2027/familias"; };
    document.getElementById("a27-add").onclick = () => { const t = document.getElementById("a27-txt").value.trim(); if (t) hacer(() => items.push({ t, hecho: false, f: new Date().toLocaleDateString("es-CR") })); };
    document.getElementById("a27-txt").onkeydown = e => { if (e.key === "Enter") document.getElementById("a27-add").click(); };
    wrap.querySelectorAll("[data-a27h]").forEach(c => c.onchange = () => hacer(() => { items[+c.dataset.a27h].hecho = c.checked; }));
    wrap.querySelectorAll("[data-a27d]").forEach(b => b.onclick = () => { if (confirm("¿Quitar este pendiente?")) hacer(() => items.splice(+b.dataset.a27d, 1)); });
  };
  pintar();
}

// Las cinco partes del curso 2027 (pedido del docente, 23-11-2026):
// Secciones · Estrategias · Simuladores · Evaluación · Padres. Se ve una a la vez.
// Estrategias y simuladores: [enlace, nombre, tipo, niveles sugeridos]. Los niveles son una
// sugerencia según el tema; el docente los cambia y queda guardado en plan_2027.usos.
const HERRAMIENTAS_2027 = [
  ["aula-contable.html", "📒 Aula Contable NIIF", "Simulador", ["Décimo"]],
  ["liquidaciones.html", "💼 Liquidaciones laborales", "Simulador", ["Décimo"]],
  ["planilla-opoly.html", "🎲 Planilla Opoly", "Estrategia", ["Décimo"]],
  ["laboral.html", "⚖️ Ruta Laboral CR", "Estrategia", ["Décimo"]],
  ["contabilidad-basica.html", "🧭 Ruta Contable Básica", "Estrategia", ["Décimo"]],
  ["taller-contable.html", "🧮 Taller del Ciclo Contable", "Simulador", ["Décimo"]],
  ["ciudad-contable.html", "🏙️ Ciudad Contable", "Simulador", ["Décimo"]],
  ["iva-150.html", "🧾 Declaración del IVA · Formulario 150", "Simulador", ["Undécimo"]],
  ["tiradera.html", "🎤 La Tiradera", "Estrategia", ["Undécimo"]],
  ["seguros.html", "🛡️ Misión Seguros", "Estrategia", ["Undécimo"]],
  ["auditoria.html", "🔎 Auditoría (misión, clases, exposición, trabajos)", "Estrategia", ["Duodécimo"]],
  ["auditpro.html", "🔍 AuditPro CTP", "Simulador", ["Duodécimo"]],
  ["auditoria-integral.html", "🗂️ Auditoría integral · caso simulado", "Simulador", ["Duodécimo"]],
  ["memoria.html", "🧠 Memoria Contable", "Estrategia", []],
  ["simulador-b2b.html", "🤝 ContaRed · Simulador B2B", "Simulador", []],
  ["planeamiento.html", "📘 Planeamiento didáctico (del docente)", "Apoyo", []]
];
const NIVELES_2027 = ["Décimo", "Undécimo", "Duodécimo"];
function herramientas27(secs, usos) {
  const esc = escAC, grupos = [...NIVELES_2027, ...secs.map(x => x.seccion).filter(x => x && !NIVELES_2027.includes(x))];
  let f = "todos"; try { f = sessionStorage.getItem("a27_filtro") || f; } catch (e) { }
  const de = h => usos[h] || (HERRAMIENTAS_2027.find(x => x[0] === h) || [])[3] || [];
  const L = HERRAMIENTAS_2027.filter(x => f === "todos" || (f === "sin" ? !de(x[0]).length : de(x[0]).includes(f)));
  const cuenta = g => HERRAMIENTAS_2027.filter(x => de(x[0]).includes(g)).length;
  return `<div style="display:flex;gap:.35rem;flex-wrap:wrap;margin:.4rem 0 .8rem"><span style="color:var(--text-muted);align-self:center">Ver:</span>
    ${[["todos", "Todos (" + HERRAMIENTAS_2027.length + ")"], ...grupos.map(g => [g, g + " (" + cuenta(g) + ")"]), ["sin", "Sin asignar (" + HERRAMIENTAS_2027.filter(x => !de(x[0]).length).length + ")"]].map(([k, t]) => `<button class="btn small ${f === k ? "" : "secondary"}" data-a27f="${esc(k)}">${esc(t)}</button>`).join("")}</div>
    <div style="overflow-x:auto"><table class="grades"><thead><tr><th>Herramienta</th><th>Tipo</th><th>Quién la usa (toque para cambiar)</th></tr></thead><tbody>
    ${L.map(([h, t, tipo]) => `<tr><td><a href="${esc(h)}">${esc(t)}</a></td><td><small>${esc(tipo)}</small></td><td>${grupos.map(g => `<button class="btn small ${de(h).includes(g) ? "" : "secondary"}" data-a27u="${esc(h)}" data-g="${esc(g)}" title="${de(h).includes(g) ? "Quitar" : "Marcar"} ${esc(g)}">${de(h).includes(g) ? "✓ " : ""}${esc(g)}</button>`).join(" ")}</td></tr>`).join("") || '<tr><td colspan="3" style="color:var(--text-muted)">No hay herramientas en este filtro.</td></tr>'}</tbody></table></div>
    <p style="color:var(--text-muted);font-size:.85rem">Los niveles marcados al inicio son una sugerencia según el tema de cada herramienta. Las secciones que agregue en «Secciones» también aparecen aquí para marcarlas.</p>`;
}
const PARTES_2027 = [
  { id: "secciones", ico: "🏫", t: "Secciones", d: "Los grupos y materias de 2027, el registro de inicio de cada estudiante y la asistencia.",
    links: [["registro-docente.html", "📋 Registro de estudiantes y encargados"], ["asistencia-red-docente.html", "📶 Asistencia por Wi-Fi con PIN al correo"], ["#/periodos", "🗓️ Períodos del curso"]] },
  { id: "estrategias", ico: "🎯", t: "Estrategias y simuladores", d: "Juegos, retos y simuladores para mediar los temas del programa. Marque en qué nivel o sección usa cada uno y filtre para ver lo de cada grupo.", herramientas: true },
  { id: "evaluacion", ico: "📝", t: "Evaluación", d: "Entregas, pruebas y justificaciones, siguiendo el Reglamento de Evaluación (Decreto 45509-MEP).",
    links: [["entregas-docente.html", "📤 Entregas de tareas y proyectos (OneDrive)"], ["#/evaluaciones", "📊 Rúbrica y evaluaciones"], ["examen.html", "🧪 Exámenes"], ["#a27-jus", "📝 Justificaciones de ausencias y tardías"]] },
  { id: "padres", ico: "👪", t: "Padres", d: "El Portal de familias: usted decide qué ven los encargados (calificaciones, trabajos, agenda y avisos) y aprueba su registro.",
    links: [["padres-docente.html", "⚙️ Qué ven los encargados: notas, trabajos, agenda y avisos"], ["#a27-fam", "👪 Registro de familias (QR)"], ["/padres", "👀 Ver el Portal de familias"], ["registro-docente.html", "📋 Datos de los encargados (registro de inicio)"]] }
];
function partes27(secs, usos) {
  const esc = escAC; let act = "secciones"; try { act = sessionStorage.getItem("a27_parte") || act; } catch (e) { }
  if (act === "simuladores") act = "estrategias";
  const P = PARTES_2027.find(x => x.id === act) || PARTES_2027[0];
  const btn = ([h, t]) => h.startsWith("#a27-") ? `<button class="btn" id="${h.slice(1)}">${esc(t)}</button>` : `<a class="btn" href="${esc(h)}"${h === "/padres" ? ' target="_blank" rel="noopener"' : ""}>${esc(t)}</a>`;
  const tablaSec = P.id !== "secciones" ? "" : `<h3 style="margin:1.2rem 0 .4rem">Secciones y materias 2027</h3>
    ${secs.length ? `<div style="overflow-x:auto"><table class="grades"><thead><tr><th>Sección</th><th>Nivel</th><th>Materia</th><th>Nota</th><th></th></tr></thead><tbody>${secs.map((x, i) => `<tr><td><b>${esc(x.seccion)}</b></td><td>${esc(x.nivel || "")}</td><td>${esc(x.materia)}</td><td>${esc(x.nota || "")}</td><td><button class="btn secondary small" data-a27sd="${i}" title="Quitar">✕</button></td></tr>`).join("")}</tbody></table></div>` : '<p style="color:var(--text-muted)">Todavía no hay secciones para 2027. Agréguelas cuando tenga la asignación.</p>'}
    <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.6rem"><input id="a27-ssec" placeholder="Sección (ej. 10-1)" style="width:9rem"><input id="a27-sniv" placeholder="Nivel (ej. Décimo)" style="width:10rem"><input id="a27-smat" placeholder="Materia (ej. Gestión Contable)" style="flex:1;min-width:12rem"><input id="a27-snota" placeholder="Nota (opcional)" style="flex:1;min-width:10rem"><button class="btn" id="a27-sadd">＋ Agregar sección</button></div>`;
  return `<div style="display:flex;gap:.4rem;flex-wrap:wrap;margin:1rem 0 .6rem">${PARTES_2027.map(x => `<button class="btn ${x.id === P.id ? "" : "secondary"}" data-p27="${x.id}">${x.ico} ${esc(x.t)}</button>`).join("")}</div>
    <div class="card" style="padding:1rem;margin:0 0 1rem"><h2 style="margin-top:0">${P.ico} ${esc(P.t)}</h2><p style="color:var(--text-muted);margin-top:-.4rem">${esc(P.d)}</p>
      ${P.herramientas ? herramientas27(secs, usos) : `<div style="display:flex;gap:.6rem;flex-wrap:wrap">${P.links.map(btn).join("")}</div>`}${tablaSec}</div>`;
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
