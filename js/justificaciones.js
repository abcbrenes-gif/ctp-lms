// ═══════════ Justificaciones de asistencia (#/justificaciones) ═══════════
// Lado del docente del Portal de familias (padres.html + lib/padres.js):
//  · 📥 Solicitudes: las justificaciones que mandan los encargados; el docente
//    las aprueba (la ausencia pasa a AJ y la tardía a TJ) o las rechaza.
//  · 👪 Encargados: nombre, teléfono y correo del encargado de cada estudiante.
//  · 📲 Enviar por WhatsApp: enlace personal (vence en 5 días) para el encargado.
const JUS_ESTR = "justificacion_asistencia", ENC_ESTR = "encargados";
const JUS_MAP = { ausente_injustificada: "ausente_justificada", tardia_leve: "tardia_justificada", tardia_grave: "tardia_justificada" };
const JUS_TIPO = { ausente_injustificada: ["A", "Ausencia injustificada"], tardia_leve: ["TI", "Tardía < 10 min"], tardia_grave: ["TI", "Tardía ≥ 10 min"], ausente_justificada: ["AJ", "Ausencia justificada"], tardia_justificada: ["TJ", "Tardía justificada"], presente: ["P", "Presente"] };

async function jusCargarEncargados() {
  const { data } = await sb.from("trabajos_cotidianos").select("id, contenido_actividad").eq("contenido_actividad->>estrategia", ENC_ESTR).order("id").limit(1);
  return (data || [])[0] || null;
}
async function renderJustificaciones() {
  if (session.role !== "docente") { location.hash = "#/"; return; }
  const tab = renderJustificaciones.tab || "solicitudes";
  app.innerHTML = `${topbar()}<div class="wrap" id="jus-wrap"><h1>👪 Justificaciones de asistencia</h1><p>Cargando…</p></div>`;
  bindTopbar();
  const wrap = document.getElementById("jus-wrap");
  const esc = escAC;
  const portal = location.origin + "/padres.html";
  const [{ data: mats }, regEnc] = await Promise.all([sb.from("materias").select("*").order("id"), jusCargarEncargados()]);
  const secciones = [...new Set((mats || []).map(m => m.seccion).filter(Boolean))].sort();
  const sec = renderJustificaciones.sec || secciones[0] || "";
  const ENC = { ...(((regEnc || {}).contenido_actividad || {}).datos || {}) };
  const { data: estAll } = await sb.from("estudiantes").select("id, nombre, apellido1, apellido2, seccion").order("apellido1");
  const nom = id => { const e = (estAll || []).find(x => x.id === id); return e ? `${e.apellido1} ${e.apellido2 || ""}, ${e.nombre}`.replace(/\s+,/, ",") : id; };
  const tabs = [["solicitudes", "📥 Solicitudes"], ["encargados", "👪 Encargados"], ["whatsapp", "📲 Enviar por WhatsApp"]];
  const cab = `<h1>👪 Justificaciones de asistencia</h1>
    <p style="color:var(--text-muted);margin-top:-0.6em">Los encargados justifican desde el <b>Portal de familias</b> (${esc(portal)}): con el enlace que usted les manda por WhatsApp o con un código a su correo. Nada cambia en la asistencia hasta que usted aprueba.</p>
    <div class="tabs" style="margin-bottom:1rem">${tabs.map(([k, t]) => `<button class="tab-btn ${k === tab ? "active" : ""}" data-jtab="${k}"><span class="tab-label">${t}</span></button>`).join("")}</div>`;
  const ligarTabs = () => wrap.querySelectorAll("[data-jtab]").forEach(b => b.onclick = () => { renderJustificaciones.tab = b.dataset.jtab; renderJustificaciones(); });
  const msgEl = () => document.getElementById("jus-msg");
  const msg = t => { const m = msgEl(); if (m) m.textContent = t; };

  if (tab === "solicitudes") {
    const { data: sols0 } = await sb.from("trabajos_cotidianos").select("id, contenido_actividad").eq("contenido_actividad->>estrategia", JUS_ESTR).order("id", { ascending: false }).limit(300);
    const sols = (sols0 || []).map(x => ({ id: x.id, ...x.contenido_actividad }));
    let validas = [];
    try { const r = await fetch("/api/padres", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accion: "validar", solicitudes: sols }) }); validas = (await r.json()).validas || []; } catch (e) { }
    const regIds = [...new Set(sols.flatMap(s => s.registros || []))];
    const { data: regs } = regIds.length ? await sb.from("asistencia_lecciones").select("id, fecha, estado").in("id", regIds) : { data: [] };
    const R = id => (regs || []).find(r => String(r.id) === String(id));
    const ver = renderJustificaciones.ver || "pendiente";
    const lista = sols.map((s, i) => ({ ...s, valida: validas[i] })).filter(s => ver === "todas" || s.estado === ver);
    const nPend = sols.filter(s => s.estado === "pendiente").length;
    wrap.innerHTML = cab + `<div class="np-barra" style="display:flex;gap:.6rem;flex-wrap:wrap">${[["pendiente", `⏳ Pendientes (${nPend})`], ["aprobada", "✅ Aprobadas"], ["rechazada", "❌ Rechazadas"], ["todas", "Todas"]].map(([k, t]) => `<button class="btn ${k === ver ? "" : "secondary"} small" data-jver="${k}">${t}</button>`).join("")}</div>
      ${lista.length ? lista.map(s => `<div class="card" style="margin:.8rem 0;padding:1rem">
        <div style="display:flex;justify-content:space-between;gap:.6rem;flex-wrap:wrap"><b>${esc(nom(s.est))}</b>
          <span style="font-size:.85rem">${s.valida ? '<span class="np-ok">✓ Enviada desde el portal</span>' : '<span class="np-no" title="No tiene la firma del portal: no la envió el encargado por el enlace o el código">⚠ Sin firma del portal</span>'}</span></div>
        <div style="margin:.4rem 0">${(s.registros || []).map(id => { const r = R(id); return r ? `<span class="badge" style="margin:2px">${esc((JUS_TIPO[r.estado] || [r.estado])[0])} · ${esc(r.fecha)}</span>` : ""; }).join("")}</div>
        <div><b>Motivo:</b> ${esc(s.motivo)}</div>
        <div style="font-size:.88rem;color:var(--text-muted)">Encargado: ${esc(s.encargado)}${s.cedula ? " · céd. " + esc(s.cedula) : ""}${s.parentesco ? " · " + esc(s.parentesco) : ""} · por ${esc(s.via)} · ${esc(s.dispositivo || "")} · ${esc(new Date(s.enviado).toLocaleString("es-CR"))}</div>
        ${s.adjunto ? `<div style="margin-top:.4rem"><button class="btn secondary small" data-jadj="${esc(s.adjunto)}">📎 Ver comprobante</button></div>` : ""}
        ${s.estado === "pendiente" ? `<div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.6rem;align-items:center"><input data-jresp="${s.id}" placeholder="Comentario para el encargado (opcional)" style="flex:1;min-width:14rem">
            <button class="btn small" data-japr="${s.id}">✅ Aprobar</button><button class="btn secondary small" data-jrec="${s.id}">❌ Rechazar</button></div>`
          : `<div style="margin-top:.5rem;font-size:.88rem"><b>${s.estado === "aprobada" ? "✅ Aprobada" : "❌ Rechazada"}</b>${s.revisado ? " el " + esc(new Date(s.revisado).toLocaleDateString("es-CR")) : ""}${s.respuesta ? " · " + esc(s.respuesta) : ""}</div>`}
      </div>`).join("") : '<p class="empty">No hay solicitudes aquí.</p>'}<p id="jus-msg" style="color:var(--text-muted)"></p>`;
    ligarTabs();
    wrap.querySelectorAll("[data-jver]").forEach(b => b.onclick = () => { renderJustificaciones.ver = b.dataset.jver; renderJustificaciones(); });
    wrap.querySelectorAll("[data-jadj]").forEach(b => b.onclick = async () => {
      const { data, error } = await sb.storage.from("materiales").createSignedUrl(b.dataset.jadj, 600);
      if (error) { const u = sb.storage.from("materiales").getPublicUrl(b.dataset.jadj).data.publicUrl; window.open(u, "_blank"); } else window.open(data.signedUrl, "_blank");
    });
    const resolver = async (id, aprobar) => {
      const s = sols.find(x => x.id === id), resp = (wrap.querySelector(`[data-jresp="${id}"]`) || {}).value || "";
      if (aprobar) {
        const cambios = (s.registros || []).map(R).filter(r => r && JUS_MAP[r.estado]);
        if (!confirm(`Se cambian ${cambios.length} registro(s) de asistencia de ${nom(s.est)} a justificados (A → AJ, TI → TJ). ¿Aprobar?`)) return;
        for (const r of cambios) { const { error } = await sb.from("asistencia_lecciones").update({ estado: JUS_MAP[r.estado] }).eq("id", r.id); if (error) { msg("❌ " + error.message); return; } }
      } else if (!confirm(`¿Rechazar la justificación de ${nom(s.est)}? La asistencia no cambia.`)) return;
      const C = { ...s }; delete C.id; delete C.valida;
      C.estado = aprobar ? "aprobada" : "rechazada"; C.respuesta = resp.trim().slice(0, 300); C.revisado = new Date().toISOString();
      const { error } = await sb.from("trabajos_cotidianos").update({ contenido_actividad: C }).eq("id", id);
      if (error) { msg("❌ " + error.message); return; }
      renderJustificaciones();
    };
    wrap.querySelectorAll("[data-japr]").forEach(b => b.onclick = () => resolver(+b.dataset.japr, true));
    wrap.querySelectorAll("[data-jrec]").forEach(b => b.onclick = () => resolver(+b.dataset.jrec, false));
    return;
  }

  const lista = (estAll || []).filter(e => e.seccion === sec).sort((a, b) => nom(a.id).localeCompare(nom(b.id), "es"));
  const selSec = `<label><b>Sección:</b> <select id="jus-sec">${secciones.map(x => `<option ${x === sec ? "selected" : ""}>${esc(x)}</option>`).join("")}</select></label>`;

  if (tab === "encargados") {
    wrap.innerHTML = cab + `<div class="np-barra">${selSec}</div>
      <p style="color:var(--text-muted)">El <b>correo</b> sirve para que el encargado entre al portal con un código; el <b>teléfono</b>, para mandarle el enlace por WhatsApp. Solo usted ve estos datos.</p>
      <div style="overflow-x:auto"><table class="grades"><thead><tr><th>Estudiante</th><th>Nombre del encargado</th><th>Teléfono</th><th>Correo</th></tr></thead><tbody>
      ${lista.map(e => { const x = ENC[e.id] || {}; return `<tr><td>${esc(nom(e.id))}</td><td><input data-enc="${esc(e.id)}|nombre" value="${esc(x.nombre || "")}"></td><td><input data-enc="${esc(e.id)}|telefono" inputmode="tel" value="${esc(x.telefono || "")}" placeholder="8888-8888" style="width:9rem"></td><td><input data-enc="${esc(e.id)}|correo" type="email" value="${esc(x.correo || "")}"></td></tr>`; }).join("")}
      </tbody></table></div><p><button class="btn" id="jus-guardar">💾 Guardar encargados</button> <span id="jus-msg" style="color:var(--text-muted)"></span></p>`;
    ligarTabs();
    document.getElementById("jus-sec").onchange = ev => { renderJustificaciones.sec = ev.target.value; renderJustificaciones(); };
    document.getElementById("jus-guardar").onclick = async () => {
      const datos = { ...ENC };
      wrap.querySelectorAll("[data-enc]").forEach(i => { const [id, k] = i.dataset.enc.split("|"); datos[id] = { ...(datos[id] || {}), [k]: i.value.trim() }; });
      const bad = Object.entries(datos).filter(([, v]) => v.correo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.correo));
      if (bad.length) { msg("Revise el correo de: " + bad.map(([id]) => nom(id)).join("; ")); return; }
      const C = { estrategia: ENC_ESTR, datos };
      const r = regEnc ? await sb.from("trabajos_cotidianos").update({ contenido_actividad: C }).eq("id", regEnc.id)
        : await sb.from("trabajos_cotidianos").insert({ titulo: "Encargados de los estudiantes (registro del profe, no borrar)", tipo_actividad: "rubrica_directa", habilitado: false, contenido_actividad: C });
      msg(r.error ? "❌ " + r.error.message : "✅ Guardado.");
    };
    return;
  }

  // 📲 WhatsApp
  const ids = lista.map(e => e.id);
  const { data: regs } = ids.length ? await sb.from("asistencia_lecciones").select("id, estudiante_id, fecha, estado").in("estudiante_id", ids).in("estado", Object.keys(JUS_MAP)).order("fecha", { ascending: false }) : { data: [] };
  const { data: sols0 } = await sb.from("trabajos_cotidianos").select("contenido_actividad").eq("contenido_actividad->>estrategia", JUS_ESTR).eq("contenido_actividad->>estado", "pendiente");
  const enTramite = new Set((sols0 || []).flatMap(x => (x.contenido_actividad.registros || []).map(String)));
  wrap.innerHTML = cab + `<div class="np-barra">${selSec}</div>
    <p style="color:var(--text-muted)">Cada enlace es personal, sirve solo para las ausencias y tardías de ese estudiante que aparecen aquí y vence en 5 días. Se abre WhatsApp con el mensaje listo; usted lo envía desde su teléfono.</p>
    <div style="overflow-x:auto"><table class="grades"><thead><tr><th>Estudiante</th><th>Por justificar</th><th>Encargado</th><th></th></tr></thead><tbody>
    ${lista.map(e => { const rs = (regs || []).filter(r => r.estudiante_id === e.id && !enTramite.has(String(r.id))), x = ENC[e.id] || {}, tel = String(x.telefono || "").replace(/\D/g, "");
      return `<tr><td>${esc(nom(e.id))}</td><td>${rs.length ? rs.map(r => `<span class="badge" style="margin:1px">${esc(JUS_TIPO[r.estado][0])} · ${esc(r.fecha)}</span>`).join("") : '<span style="color:var(--text-muted)">—</span>'}</td>
        <td>${esc(x.nombre || "")}${tel ? `<br><small>${esc(x.telefono)}</small>` : '<br><small style="color:var(--brick)">Sin teléfono</small>'}</td>
        <td>${rs.length && tel ? `<button class="btn small" data-jwa="${esc(e.id)}">📲 Enviar al encargado</button>` : ""}</td></tr>`; }).join("")}
    </tbody></table></div><p id="jus-msg" style="color:var(--text-muted)"></p>`;
  ligarTabs();
  document.getElementById("jus-sec").onchange = ev => { renderJustificaciones.sec = ev.target.value; renderJustificaciones(); };
  wrap.querySelectorAll("[data-jwa]").forEach(b => b.onclick = async () => {
    const id = b.dataset.jwa, x = ENC[id] || {}, rs = (regs || []).filter(r => r.estudiante_id === id && !enTramite.has(String(r.id)));
    let pin = ""; try { pin = sessionStorage.getItem("jus_pin") || ""; } catch (e) { }
    if (!pin) { pin = prompt("Para firmar el enlace, escriba su PIN de docente (se pide una vez por sesión):") || ""; if (!pin) return; }
    b.disabled = true;
    try {
      const r = await fetch("/api/padres", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accion: "firmar_enlace", pin, est: id, registros: rs.map(r => String(r.id)), dias: 5 }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error || "Error");
      try { sessionStorage.setItem("jus_pin", pin); } catch (e) { }
      const tel = String(x.telefono).replace(/\D/g, ""), num = tel.length === 8 ? "506" + tel : tel;
      const e = (estAll || []).find(z => z.id === id) || {};
      const texto = `Buenas, ${x.nombre || "encargado(a)"}. Le escribe el profesor de Contabilidad del CTP Mercedes Norte. ${e.nombre || "Su hijo(a)"} tiene ${rs.length} ausencia(s) o tardía(s) sin justificar. Si corresponde, puede justificarlas en este enlace personal (vence en 5 días): ${portal}#t=${j.token}`;
      window.open(`https://wa.me/${num}?text=${encodeURIComponent(texto)}`, "_blank");
      msg(`Enlace listo para ${nom(id)}.`);
    } catch (er) { if (/PIN/.test(er.message)) { try { sessionStorage.removeItem("jus_pin"); } catch (e) { } } msg("❌ " + er.message); }
    finally { b.disabled = false; }
  });
}
