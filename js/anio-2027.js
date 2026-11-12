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
        <p style="color:var(--text-muted)">Todavía no hay herramientas nuevas. Cada cosa que preparemos para 2027 va a aparecer aquí.</p></div>
      <div class="card" style="padding:1rem"><h2 style="margin-top:0">📝 Pendientes e ideas para 2027</h2>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap"><input id="a27-txt" placeholder="Escriba una idea o pendiente para 2027" style="flex:1;min-width:16rem"><button class="btn" id="a27-add">＋ Agregar</button></div>
        <ul style="list-style:none;padding:0;margin:1rem 0 0">${items.map((x, i) => `<li style="display:flex;gap:.6rem;align-items:center;padding:.5rem 0;border-bottom:1px solid var(--paper-line)">
          <input type="checkbox" data-a27h="${i}" ${x.hecho ? "checked" : ""} aria-label="Marcar como hecho">
          <span style="flex:1;${x.hecho ? "text-decoration:line-through;color:var(--text-muted)" : ""}">${esc(x.t)}</span><small style="color:var(--text-muted)">${esc(x.f || "")}</small>
          <button class="btn secondary small" data-a27d="${i}" title="Quitar">✕</button></li>`).join("") || '<li style="color:var(--text-muted)">Sin pendientes todavía.</li>'}</ul>
        <p id="a27-msg" style="color:var(--text-muted)"></p></div>`;
    const msg = t => { document.getElementById("a27-msg").textContent = t; };
    const hacer = async f => { try { f(); await guardar(); pintar(); } catch (e) { msg("❌ No se pudo guardar: " + e.message); } };
    document.getElementById("a27-add").onclick = () => { const t = document.getElementById("a27-txt").value.trim(); if (t) hacer(() => items.push({ t, hecho: false, f: new Date().toLocaleDateString("es-CR") })); };
    document.getElementById("a27-txt").onkeydown = e => { if (e.key === "Enter") document.getElementById("a27-add").click(); };
    wrap.querySelectorAll("[data-a27h]").forEach(c => c.onchange = () => hacer(() => { items[+c.dataset.a27h].hecho = c.checked; }));
    wrap.querySelectorAll("[data-a27d]").forEach(b => b.onclick = () => { if (confirm("¿Quitar este pendiente?")) hacer(() => items.splice(+b.dataset.a27d, 1)); });
  };
  pintar();
}
