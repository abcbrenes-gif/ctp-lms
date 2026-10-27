// --- Informe de Aula de Conta (notas y trabajos) ---
// Aula de Conta guarda en cada empresa un "resumenInforme" cada vez que el estudiante
// trabaja; el profesor puede forzar la actualización desde Aula de Conta.
function escAC(t) { return String(t == null ? "" : t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
async function cargarTrabajosAulaConta(ids) {
  const { data, error } = await sb.from("aula_conta_trabajos_estudiante").select("estudiante_id, companies, actualizado_en").in("estudiante_id", ids);
  if (error) throw error;
  return data || [];
}
function filasInformeAulaConta(companies) {
  return (companies || []).map(c => {
    const r = c.resumenInforme || null;
    return { nombre: c.name || "(sin nombre)", tipo: c.categoria === "tarea" ? "Tarea" : "Práctica", r };
  });
}
const pctAC = v => v == null ? "—" : v + " %";
function notaColorAC(n) { return n == null ? "var(--text-muted)" : n >= 70 ? "var(--ledger-green)" : "#b3261e"; }
function tablaInformeAulaConta(filas) {
  if (!filas.length) return `<p class="empty">Todavía no hay trabajos en Aula de Conta.</p>`;
  const notas = filas.map(f => f.r && f.r.nota).filter(n => n != null);
  const prom = notas.length ? Math.round(notas.reduce((t, n) => t + n, 0) / notas.length) : null;
  return `<div style="overflow-x:auto;"><table class="tabla" style="width:100%; border-collapse:collapse; font-size:0.88rem;">
    <thead><tr style="text-align:left;"><th>Trabajo</th><th>Tipo</th><th>Machote</th><th>Asiento planilla</th><th>Evaluación</th><th>Eval. machote</th><th>Eval. asiento</th><th>Nota</th><th>Actualizado</th></tr></thead>
    <tbody>${filas.map(f => { const r = f.r; return `<tr style="border-top:1px solid var(--border,#ddd);"><td><b>${escAC(f.nombre)}</b></td><td>${f.tipo}</td>
      ${r ? `<td>${pctAC(r.machote)}</td><td>${r.asiento == null ? "—" : r.asiento === 100 ? "✓ Resuelto" : "Pendiente"}</td><td>${pctAC(r.evaluacion)}</td><td>${pctAC(r.evalMachote)}</td><td>${pctAC(r.evalAsiento)}</td><td><b style="color:${notaColorAC(r.nota)}">${pctAC(r.nota)}</b></td><td>${r.fecha ? new Date(r.fecha).toLocaleString("es-CR", { dateStyle: "medium", timeStyle: "short" }) : "—"}</td>`
        : `<td colspan="7" style="color:var(--text-muted);">Sin informe todavía (se genera cuando el estudiante trabaja o el profesor pulsa "Actualizar informe" en Aula de Conta)</td>`}</tr>`; }).join("")}</tbody>
    <tfoot><tr style="border-top:2px solid var(--border,#999);"><td colspan="7"><b>Promedio de notas de Aula de Conta</b></td><td colspan="2"><b style="color:${notaColorAC(prom)}">${pctAC(prom)}</b></td></tr></tfoot></table></div>
    <p style="font-size:0.78rem; color:var(--text-muted); margin-top:0.5rem;">La nota es el promedio de lo que el estudiante tiene: machote, asiento de planilla, evaluación y las evaluaciones habilitadas por el profesor. Se actualiza sola cada vez que trabaja.</p>`;
}
async function renderInformeAulaConta(el, s, isSelf, extraHtml) {
  el.innerHTML = `<h3 style="font-family:var(--serif);">🧮 Informe de Aula de Conta${isSelf ? "" : " — " + escAC(s.nombre)}</h3><div id="informe-ac">Cargando…</div>${extraHtml || ""}`;
  const box = document.getElementById("informe-ac");
  try {
    const rows = await cargarTrabajosAulaConta([s.id]);
    box.innerHTML = tablaInformeAulaConta(filasInformeAulaConta(rows[0] && rows[0].companies));
  } catch (e) { box.innerHTML = `<p class="empty">No se pudo cargar el informe: ${escAC(e && e.message || e)}</p>`; }
}
async function abrirInformeSeccionAulaConta(sec, students, destino) {
  destino.innerHTML = "Cargando informe…";
  try {
    const ids = (students || []).map(x => x.id);
    const rows = await cargarTrabajosAulaConta(ids);
    const por = {}; rows.forEach(r => { por[r.estudiante_id] = r; });
    const lista = (students || []).map(st => {
      const filas = filasInformeAulaConta((por[st.id] || {}).companies);
      const notas = filas.map(f => f.r && f.r.nota).filter(n => n != null);
      const prom = notas.length ? Math.round(notas.reduce((t, n) => t + n, 0) / notas.length) : null;
      return { st, filas, prom, n: filas.length };
    }).sort((a, b) => (a.st.apellido1 || "").localeCompare(b.st.apellido1 || ""));
    const nom = x => [x.apellido1, x.apellido2, x.nombre].filter(Boolean).join(" ");
    window.__informeAC = { sec, lista, nom };
    destino.innerHTML = `<div class="row" style="gap:0.5rem; margin:0.5rem 0; flex-wrap:wrap;"><button class="btn small" id="ac-csv" type="button">⬇ Descargar Excel (CSV)</button><button class="btn secondary small" id="ac-pdf" type="button">🖨 PDF / Imprimir</button></div>
      <p style="font-size:0.85rem; color:var(--text-muted); margin:0.4rem 0;">Toca a un estudiante para ver el detalle de cada trabajo.</p>
      ${lista.map(x => `<details style="border:1px solid var(--border,#ddd); border-radius:8px; padding:0.5rem 0.7rem; margin-bottom:0.4rem;"><summary style="cursor:pointer; display:flex; gap:0.8rem; flex-wrap:wrap; align-items:center;"><b style="flex:1 1 220px;">${escAC(nom(x.st))}</b><span>${x.n} trabajo(s)</span><span>${x.filas.filter(f => f.r && f.r.nota != null).length} con nota</span><b style="color:${notaColorAC(x.prom)}">Promedio: ${pctAC(x.prom)}</b></summary><div style="margin-top:0.6rem;">${tablaInformeAulaConta(x.filas)}</div></details>`).join("")}
      <p style="font-size:0.78rem; color:var(--text-muted);">Si ves "—", pulsa "📈 Actualizar informe de notas" en Aula de Conta → Entregas recibidas → Por empresa.</p>`;
    document.getElementById("ac-csv").onclick = () => {
      const q = v => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
      const out = [["Sección", "Estudiante", "Cédula", "Trabajo", "Tipo", "Machote %", "Asiento planilla", "Evaluación %", "Eval. machote %", "Eval. asiento %", "Nota"].map(q).join(",")];
      for (const x of lista) {
        if (!x.filas.length) out.push([sec, nom(x.st), x.st.id, "(sin trabajos)", "", "", "", "", "", "", ""].map(q).join(","));
        for (const f of x.filas) { const r = f.r || {}; out.push([sec, nom(x.st), x.st.id, f.nombre, f.tipo, r.machote ?? "", r.asiento == null ? "" : (r.asiento === 100 ? "Resuelto" : "Pendiente"), r.evaluacion ?? "", r.evalMachote ?? "", r.evalAsiento ?? "", r.nota ?? ""].map(q).join(",")); }
      }
      const blob = new Blob(["\ufeff" + out.join("\r\n")], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `informe-aula-conta-${sec}.csv`; a.click();
    };
    document.getElementById("ac-pdf").onclick = () => {
      const w = window.open("", "_blank"); if (!w) return;
      w.document.write(`<html><head><title>Informe Aula de Conta ${escAC(sec)}</title><style>body{font-family:Arial;padding:20px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:5px;font-size:12px;text-align:left}</style></head><body><h2>Informe de Aula de Conta — Sección ${escAC(sec)}</h2><p>CTP Mercedes Norte · ${new Date().toLocaleString("es-CR")}</p>
      <table><thead><tr><th>Estudiante</th><th>Trabajo</th><th>Machote</th><th>Asiento</th><th>Evaluación</th><th>Nota</th></tr></thead><tbody>${lista.map(x => (x.filas.length ? x.filas : [{ nombre: "(sin trabajos)", r: null }]).map(f => { const r = f.r || {}; return `<tr><td>${escAC(nom(x.st))}</td><td>${escAC(f.nombre)}</td><td>${pctAC(r.machote)}</td><td>${r.asiento == null ? "—" : r.asiento === 100 ? "Resuelto" : "Pendiente"}</td><td>${pctAC(r.evaluacion)}</td><td>${pctAC(r.nota)}</td></tr>`; }).join("")).join("")}</tbody></table><script>window.print()<\/script></body></html>`);
      w.document.close();
    };
  } catch (e) { destino.innerHTML = `<p class="empty">No se pudo cargar el informe: ${escAC(e && e.message || e)}</p>`; }
}

async function renderTabContent(s, tab, isSelf) {
  const el = document.getElementById("tab-content");
  if (tab === "programa") return renderProgramaEstudiante(el, s);
  if (tab === "rubrica") return renderRubricaEstudiante(el, s, isSelf);
  if (tab === "asistencia") return renderAsistenciaEstudiante(el, s);
  if (tab === "avisos") return renderAvisosEstudiante(el, s);
  if (tab === "materias-est") return renderMateriasEstudiante(el, s);
  if (tab === "whatsapp" && !isSelf) return renderWhatsapp(el, s);
  if (tab === "acceso" && !isSelf) return renderAcceso(el, s);
  if (tab === "pin" && !isSelf) return renderPin(el, s);
  if (tab === "clave-prueba" && !isSelf) return renderClavePrueba(el, s);
  if (tab === "aula-informe" && isSelf) return renderInformeAulaConta(el, s, true);
  if (tab === "aula-conta" && !isSelf) { renderAulaContaCredenciales(el, s); const d = document.createElement("div"); d.id = "informe-ac-docente"; el.prepend(d); return renderInformeAulaConta(d, s, false); }
  if (tab === "infografias" && esSeccion113(s.seccion)) return renderInfografiasEstudiante(el, s, isSelf);
  return renderNotas(el, s, isSelf);
}

// --- Infografías (sección 11-3): apartado exclusivo para subir infografías ---
// Solo acepta imágenes (JPG/PNG/WEBP) o PDF. El estudiante puede cambiar el
// archivo, renombrar o eliminar su infografía mientras el profesor no le
// haya puesto nota; con nota queda bloqueada.
const INFOGRAFIA_MAX_MB = 15;
const INFOGRAFIA_TIPOS_OK = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const INFOGRAFIA_EXT_OK = /\.(jpe?g|png|webp|pdf)$/i;
function escInfografia(t) {
  return String(t == null ? "" : t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function validarArchivoInfografia(archivo) {
  if (!archivo) return "Elegí un archivo.";
  const tipoOk = INFOGRAFIA_TIPOS_OK.includes(archivo.type) || INFOGRAFIA_EXT_OK.test(archivo.name);
  if (!tipoOk || (archivo.type && !INFOGRAFIA_TIPOS_OK.includes(archivo.type))) return "Este apartado es solo para infografías: subí una imagen (JPG, PNG o WEBP) o un PDF.";
  if (archivo.size > INFOGRAFIA_MAX_MB * 1024 * 1024) return `El archivo pesa demasiado (máximo ${INFOGRAFIA_MAX_MB} MB).`;
  return "";
}
function rutaInfografia(estudianteId, archivo) {
  return `infografias-estudiante/${estudianteId}/${Date.now()}-${archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
}
function tarjetaInfografia(inf, { puedeEditar, esProfesor }) {
  const url = sb.storage.from("materiales").getPublicUrl(inf.archivo_ruta).data.publicUrl;
  const esPdf = /\.pdf$/i.test(inf.archivo_nombre || inf.archivo_ruta || "");
  const calificada = inf.nota != null;
  return `
  <div class="roster-row" style="align-items:flex-start; flex-direction:column; gap:0.45rem;">
    <div style="display:flex; justify-content:space-between; width:100%; align-items:center; flex-wrap:wrap; gap:0.4rem;">
      <span class="name">🖼️ ${escInfografia(inf.titulo)}</span>
      ${calificada
        ? `<span class="badge" style="background:var(--success-bg); color:var(--success-text);">Nota: ${inf.nota}/3</span>`
        : `<span class="badge" style="font-weight:400;">Pendiente de calificación</span>`}
    </div>
    ${esPdf ? "" : `<a href="${url}" target="_blank" rel="noopener"><img src="${url}" alt="${escInfografia(inf.titulo)}" loading="lazy" style="max-width:100%; max-height:180px; border-radius:6px; border:1px solid var(--paper-line);" /></a>`}
    <div style="font-size:0.78rem; color:var(--text-muted);">${escInfografia(inf.archivo_nombre || "archivo")} · ${inf.actualizado_en ? formatearFechaHora(inf.actualizado_en) : ""}</div>
    <div style="display:flex; gap:0.4rem; flex-wrap:wrap; align-items:center;">
      <a class="btn secondary small" href="${url}" target="_blank" rel="noopener">👁️ ${esPdf ? "Abrir PDF" : "Ver completa"}</a>
      ${puedeEditar && !calificada ? `
        <label class="btn small" style="cursor:pointer;">✏️ Cambiar archivo<input type="file" data-infografia-cambiar="${inf.id}" accept="image/png,image/jpeg,image/webp,.pdf" style="display:none;" /></label>
        <button class="btn secondary small" type="button" data-infografia-renombrar="${inf.id}">Cambiar título</button>
        <button class="btn secondary small" type="button" data-infografia-eliminar="${inf.id}">🗑️ Eliminar</button>` : ""}
      ${puedeEditar && calificada ? `<span style="font-size:0.78rem; color:var(--text-muted);">🔒 Ya fue calificada — no se puede cambiar.</span>` : ""}
      ${esProfesor ? `
        <select data-infografia-nota="${inf.id}">
          <option value="">Sin calificar</option>
          ${[0, 1, 2, 3].map(n => `<option value="${n}" ${inf.nota === n ? "selected" : ""}>${n} / 3</option>`).join("")}
        </select>
        <button class="btn secondary small" type="button" data-infografia-eliminar="${inf.id}">🗑️ Eliminar</button>` : ""}
    </div>
    <span data-infografia-item-estado="${inf.id}" style="font-size:0.78rem; color:var(--text-muted);"></span>
  </div>`;
}
// Engancha cambiar archivo / renombrar / eliminar / calificar sobre un contenedor.
function enlazarAccionesInfografia(holder, recargar) {
  holder.querySelectorAll("[data-infografia-cambiar]").forEach(input => {
    input.addEventListener("change", async () => {
      const id = input.dataset.infografiaCambiar;
      const archivo = input.files[0];
      const estado = holder.querySelector(`[data-infografia-item-estado="${id}"]`);
      const err = validarArchivoInfografia(archivo);
      if (err) { if (estado) estado.textContent = err; input.value = ""; return; }
      const { data: actual } = await sb.from("infografias_estudiante").select("estudiante_id, nota").eq("id", id).maybeSingle();
      if (!actual) { if (estado) estado.textContent = "No se encontró la infografía."; return; }
      if (actual.nota != null) { if (estado) estado.textContent = "Ya fue calificada, no se puede cambiar."; return; }
      if (estado) estado.textContent = "Subiendo…";
      const ruta = rutaInfografia(actual.estudiante_id, archivo);
      const { error: errSubida } = await sb.storage.from("materiales").upload(ruta, archivo);
      if (errSubida) { if (estado) estado.textContent = "No se pudo subir: " + errSubida.message; return; }
      const { error } = await sb.from("infografias_estudiante").update({ archivo_ruta: ruta, archivo_nombre: archivo.name, actualizado_en: new Date().toISOString() }).eq("id", id);
      if (error) { if (estado) estado.textContent = "No se pudo guardar: " + error.message; return; }
      recargar();
    });
  });
  holder.querySelectorAll("[data-infografia-renombrar]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.infografiaRenombrar;
      const nuevo = (prompt("Nuevo título de la infografía:") || "").trim();
      if (!nuevo) return;
      await sb.from("infografias_estudiante").update({ titulo: nuevo, actualizado_en: new Date().toISOString() }).eq("id", id).is("nota", null);
      recargar();
    });
  });
  holder.querySelectorAll("[data-infografia-eliminar]").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("¿Eliminar esta infografía? No se puede deshacer.")) return;
      await sb.from("infografias_estudiante").delete().eq("id", btn.dataset.infografiaEliminar);
      recargar();
    });
  });
  holder.querySelectorAll("[data-infografia-nota]").forEach(sel => {
    sel.addEventListener("change", async () => {
      await sb.from("infografias_estudiante").update({ nota: sel.value === "" ? null : Number(sel.value) }).eq("id", sel.dataset.infografiaNota);
      recargar();
    });
  });
}

// --- Fecha límite de un Proyecto ---
// Se guarda en contenido_actividad.fecha_limite (ISO). Pasada esa hora el
// estudiante ya no puede enviar ni corregir entregas del proyecto.
function estadoLimiteProyecto(contenido) {
  const iso = contenido && contenido.fecha_limite;
  if (!iso) return { hay: false, vencido: false, texto: "" };
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { hay: false, vencido: false, texto: "" };
  const texto = d.toLocaleString("es-CR", { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", hour12: true });
  return { hay: true, vencido: Date.now() > d.getTime(), texto };
}
function avisoLimiteProyectoHTML(contenido) {
  const l = estadoLimiteProyecto(contenido);
  if (!l.hay) return "";
  return l.vencido
    ? `<div style="font-size:0.82rem; padding:0.4rem 0.6rem; border-radius:6px; background:var(--danger-bg); color:var(--danger-text);">⛔ El plazo de entrega venció el ${l.texto}. Ya no se pueden enviar ni corregir entregas.</div>`
    : `<div style="font-size:0.82rem; padding:0.4rem 0.6rem; border-radius:6px; background:var(--warn-bg); color:var(--warn-text);">⏰ Fecha límite de entrega: <strong>${l.texto}</strong></div>`;
}
// Revisa en la base de datos (no en lo que quedó pintado en pantalla) si el plazo ya venció.
async function proyectoVencido(trabajoId) {
  const { data } = await sb.from("trabajos_cotidianos").select("contenido_actividad").eq("id", trabajoId).maybeSingle();
  return estadoLimiteProyecto(data && data.contenido_actividad);
}

// --- Proyecto en 11-3: nombre, descripción, archivos de referencia e infografía ---
// En 11-3 la entrega de un "Proyecto" lleva 4 partes: 1) nombre (título),
// 2) descripción, 3) archivos de referencia y 4) archivos de la infografía
// (solo imagen/PDF). Los archivos se guardan en las columnas
// archivos_referencia / archivos_infografia (json) de proyecto_entregas;
// archivo_ruta guarda la primera infografía para que el panel del profesor
// y la calificación con IA sigan funcionando igual.
function camposArchivosProyecto113() {
  return `
    <label style="flex-basis:100%; font-size:0.82rem; display:block;">3. Archivos de referencia (leyes, artículos o documentos que usaste):
      <input type="file" name="referencias" multiple required style="display:block; margin-top:0.3rem;" />
    </label>
    <label style="flex-basis:100%; font-size:0.82rem; display:block;">4. Archivos de la infografía (imagen JPG/PNG/WEBP o PDF):
      <input type="file" name="infografias" multiple accept="image/png,image/jpeg,image/webp,.pdf" required style="display:block; margin-top:0.3rem;" />
    </label>`;
}
async function enviarEntregaProyecto113({ form, f, trabajoId, estudianteId, descripcion, estado }) {
  const msg = t => { if (estado) estado.textContent = t; };
  const referencias = f.getAll("referencias").filter(a => a && a.size);
  const infografias = f.getAll("infografias").filter(a => a && a.size);
  if (!referencias.length) { msg("Subí al menos un archivo de referencia."); return false; }
  if (!infografias.length) { msg("Subí al menos un archivo de la infografía."); return false; }
  for (const a of infografias) {
    const err = validarArchivoInfografia(a);
    if (err) { msg(`${a.name}: ${err}`); return false; }
  }
  for (const a of referencias) {
    if (a.size > 25 * 1024 * 1024) { msg(`${a.name} pesa demasiado (máximo 25 MB por archivo).`); return false; }
  }
  const boton = form.querySelector("button[type=submit]");
  boton.disabled = true;
  boton.textContent = "Enviando…";
  msg("Subiendo archivos…");
  const subir = async (archivo, carpeta) => {
    const ruta = `proyectos/trabajo-${trabajoId}/${carpeta}/${estudianteId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error } = await sb.storage.from("materiales").upload(ruta, archivo);
    if (error) throw error;
    return { ruta, nombre: archivo.name };
  };
  try {
    const refs = [];
    for (const a of referencias) refs.push(await subir(a, "referencias"));
    const infos = [];
    for (const a of infografias) infos.push(await subir(a, "infografias"));
    const { error } = await sb.from("proyecto_entregas").insert({
      trabajo_id: trabajoId,
      estudiante_id: estudianteId,
      titulo: f.get("titulo"),
      descripcion,
      archivo_ruta: infos[0].ruta,
      archivo_nombre: infos[0].nombre,
      archivos_referencia: refs,
      archivos_infografia: infos
    });
    if (error) throw error;
    return true;
  } catch (err) {
    const m = String(err.message || err);
    msg("No se pudo enviar la entrega: " + (/archivos_(referencia|infografia)/.test(m) ? "falta crear las columnas en la base de datos (avisale a tu profesor)." : m));
    boton.disabled = false;
    boton.textContent = "Enviar entrega";
    return false;
  }
}
// Enlaces a los archivos de una entrega de proyecto (con el formato nuevo
// de referencias + infografía, o el archivo único de las entregas viejas).
function enlacesArchivosProyecto(e) {
  const url = r => sb.storage.from("materiales").getPublicUrl(r).data.publicUrl;
  const refs = Array.isArray(e.archivos_referencia) ? e.archivos_referencia : [];
  const infs = Array.isArray(e.archivos_infografia) ? e.archivos_infografia : [];
  if (!refs.length && !infs.length) {
    return e.archivo_ruta ? `<a class="btn secondary small" style="margin-top:0.3rem;" href="${url(e.archivo_ruta)}" target="_blank" rel="noopener">📄 ${escInfografia(e.archivo_nombre || "Ver archivo")}</a>` : "";
  }
  const grupo = (titulo, arr) => arr.length
    ? `<div style="margin-top:0.3rem; font-size:0.8rem;"><strong>${titulo}:</strong> ${arr.map(a => `<a href="${url(a.ruta)}" target="_blank" rel="noopener">📄 ${escInfografia(a.nombre)}</a>`).join(" · ")}</div>`
    : "";
  return grupo("🖼️ Infografía", infs) + grupo("📚 Referencias", refs);
}

// --- Modificar una entrega de Proyecto (11-3) ---
// Botón "✏️ Modificar" en cada entrega: cambiar nombre y descripción,
// quitar archivos y subir archivos nuevos (referencias e infografía).
// Se bloquea solo si pasó la fecha límite; si ya tenía nota de la IA, se limpia y se vuelve a calificar.
function botonModificarProyectoHTML(e, contenido, seccion) {
  if (!puedeEditarEntregas(seccion)) return "";
  if (estadoLimiteProyecto(contenido).vencido) return `<div style="margin-top:0.3rem; font-size:0.78rem; color:var(--text-muted);">🔒 El plazo de entrega venció — ya no se puede modificar.</div>`;
  return `<div style="margin-top:0.3rem;"><button class="btn small" type="button" data-proyecto-modificar="${e.id}">✏️ Modificar</button></div>
    <div data-proyecto-modificar-panel="${e.id}"></div>`;
}
function archivosActualesProyecto(e) {
  const refs = Array.isArray(e.archivos_referencia) ? e.archivos_referencia.slice() : [];
  let infos = Array.isArray(e.archivos_infografia) ? e.archivos_infografia.slice() : [];
  if (!refs.length && !infos.length && e.archivo_ruta) infos = [{ ruta: e.archivo_ruta, nombre: e.archivo_nombre || "archivo" }];
  return { refs, infos };
}
function enlazarModificarProyecto(root, recargar) {
  root.querySelectorAll("[data-proyecto-modificar]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.proyectoModificar;
      const panel = root.querySelector(`[data-proyecto-modificar-panel="${id}"]`);
      if (!panel) return;
      if (panel.innerHTML) { panel.innerHTML = ""; return; }
      const { data: e } = await sb.from("proyecto_entregas").select("*").eq("id", id).maybeSingle();
      if (!e) return;
      const { data: tr } = await sb.from("trabajos_cotidianos").select("contenido_actividad").eq("id", e.trabajo_id).maybeSingle();
      const contenido = (tr && tr.contenido_actividad) || {};
      const minimo = Number(contenido.min_caracteres_descripcion) || 1;
      const { refs, infos } = archivosActualesProyecto(e);
      const url = r => sb.storage.from("materiales").getPublicUrl(r).data.publicUrl;
      const listaQuitar = (arr, grupo) => arr.length
        ? arr.map((a, i) => `<div style="display:flex; gap:0.5rem; align-items:center; font-size:0.8rem;">
            <label style="display:flex; gap:0.3rem; align-items:center;"><input type="checkbox" data-quitar="${grupo}" value="${i}" /> 🗑️ Quitar</label>
            <a href="${url(a.ruta)}" target="_blank" rel="noopener">📄 ${escInfografia(a.nombre)}</a></div>`).join("")
        : `<div style="font-size:0.78rem; color:var(--text-muted);">No hay archivos.</div>`;
      panel.innerHTML = `
        <form style="display:grid; gap:0.5rem; margin-top:0.5rem; padding:0.7rem; background:var(--surface); border:1px solid var(--paper-line); border-radius:8px;">
          <input name="titulo" value="${escInfografia(e.titulo)}" required maxlength="200" style="width:100%;" />
          <textarea name="descripcion" rows="4" required minlength="${minimo}" style="width:100%; font-family:inherit; resize:vertical;">${escInfografia(e.descripcion)}</textarea>
          <div><strong style="font-size:0.82rem;">📚 Archivos de referencia</strong>
            ${listaQuitar(refs, "refs")}
            <label style="font-size:0.8rem; display:block; margin-top:0.3rem;">Subir archivos nuevos: <input type="file" name="refs_nuevos" multiple /></label></div>
          <div><strong style="font-size:0.82rem;">🖼️ Archivos de la infografía</strong>
            ${listaQuitar(infos, "infos")}
            <label style="font-size:0.8rem; display:block; margin-top:0.3rem;">Subir archivos nuevos (imagen o PDF): <input type="file" name="infos_nuevos" multiple accept="image/png,image/jpeg,image/webp,.pdf" /></label></div>
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
            <button class="btn small" type="submit">Guardar cambios</button>
            <button class="btn secondary small" type="button" data-cancelar-modificar>Cancelar</button>
          </div>
          <span data-modificar-estado style="font-size:0.78rem; color:var(--text-muted);"></span>
        </form>`;
      const form = panel.querySelector("form");
      const estado = panel.querySelector("[data-modificar-estado]");
      const msg = t => { estado.textContent = t; };
      panel.querySelector("[data-cancelar-modificar]").addEventListener("click", () => { panel.innerHTML = ""; });
      form.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const f = new FormData(form);
        const titulo = String(f.get("titulo") || "").trim();
        const descripcion = String(f.get("descripcion") || "");
        if (!titulo) { msg("El nombre no puede quedar vacío."); return; }
        if (descripcion.length < minimo) { msg(`La descripción necesita al menos ${minimo} caracteres (lleva ${descripcion.length}).`); return; }
        // Revisar de nuevo en la base: plazo y que no se haya calificado mientras tanto.
        const { data: tr2 } = await sb.from("trabajos_cotidianos").select("contenido_actividad").eq("id", e.trabajo_id).maybeSingle();
        if (estadoLimiteProyecto(tr2 && tr2.contenido_actividad).vencido) { msg("⛔ El plazo de entrega ya venció."); return; }
        const quitar = grupo => new Set([...form.querySelectorAll(`[data-quitar="${grupo}"]:checked`)].map(c => Number(c.value)));
        const qR = quitar("refs"), qI = quitar("infos");
        const nuevasRefs = f.getAll("refs_nuevos").filter(a => a && a.size);
        const nuevasInfos = f.getAll("infos_nuevos").filter(a => a && a.size);
        for (const a of nuevasInfos) { const err = validarArchivoInfografia(a); if (err) { msg(`${a.name}: ${err}`); return; } }
        for (const a of nuevasRefs) if (a.size > 25 * 1024 * 1024) { msg(`${a.name} pesa demasiado (máximo 25 MB por archivo).`); return; }
        const quedanRefs = refs.filter((_, i) => !qR.has(i)), quedanInfos = infos.filter((_, i) => !qI.has(i));
        if (quedanRefs.length + nuevasRefs.length === 0) { msg("Tiene que quedar al menos un archivo de referencia."); return; }
        if (quedanInfos.length + nuevasInfos.length === 0) { msg("Tiene que quedar al menos un archivo de la infografía."); return; }
        const guardar = form.querySelector("button[type=submit]");
        guardar.disabled = true; msg("Guardando…");
        const subir = async (archivo, carpeta) => {
          const ruta = `proyectos/trabajo-${e.trabajo_id}/${carpeta}/${e.estudiante_id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}-${archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
          const { error } = await sb.storage.from("materiales").upload(ruta, archivo);
          if (error) throw error;
          return { ruta, nombre: archivo.name };
        };
        try {
          const refsFinal = quedanRefs.slice(), infosFinal = quedanInfos.slice();
          for (const a of nuevasRefs) refsFinal.push(await subir(a, "referencias"));
          for (const a of nuevasInfos) infosFinal.push(await subir(a, "infografias"));
          const { error } = await sb.from("proyecto_entregas").update({
            titulo, descripcion,
            archivo_ruta: infosFinal[0].ruta, archivo_nombre: infosFinal[0].nombre,
            archivos_referencia: refsFinal, archivos_infografia: infosFinal,
            // Si ya tenía nota de la IA, se limpia para que se vuelva a calificar con lo nuevo.
            nota_ia: null, justificacion_ia: null
          }).eq("id", id);
          if (error) throw error;
          const aBorrar = [...refs.filter((_, i) => qR.has(i)), ...infos.filter((_, i) => qI.has(i))].map(a => a.ruta);
          if (aBorrar.length) { try { await sb.storage.from("materiales").remove(aBorrar); } catch (x) { /* no pasa nada si no se pudo borrar el archivo viejo */ } }
          recargar();
        } catch (err) {
          const m = String(err.message || err);
          msg("No se pudo guardar: " + (/archivos_(referencia|infografia)/.test(m) ? "falta crear las columnas en la base de datos (avisale a tu profesor)." : m));
          guardar.disabled = false;
        }
      });
    });
  });
}

async function renderInfografiasEstudiante(el, s, isSelf) {
  const esProfesor = !isSelf && session.role === "docente";
  const vistaPrevia = isSelf && session.role === "docente";
  const puedeEditar = isSelf && !vistaPrevia;
  el.innerHTML = "Cargando…";
  const { data: lista, error } = await sb.from("infografias_estudiante").select("*").eq("estudiante_id", s.id).order("creado_en", { ascending: false });
  if (error) {
    el.innerHTML = `<p class="no-phone-note">No se pudo cargar este apartado: ${escInfografia(error.message)}. Si es la primera vez, falta crear la tabla "infografias_estudiante" en Supabase (archivo SQL aparte).</p>`;
    return;
  }
  el.innerHTML = `
    <div class="whatsapp-panel" style="margin-bottom:1rem;">
      <strong style="font-family:var(--serif);">🖼️ ${isSelf ? "Mis infografías" : "Infografías de " + escInfografia(s.nombre)}</strong>
      <p style="font-size:0.85rem; color:var(--text-muted); margin:0.3rem 0 0.6rem;">Este apartado es solo para infografías: imagen (JPG, PNG o WEBP) o PDF, de hasta ${INFOGRAFIA_MAX_MB} MB.${puedeEditar ? " Podés cambiar el archivo, el título o eliminarla mientras tu profesor no la haya calificado." : ""}</p>
      ${puedeEditar ? `
      <form id="infografia-form" style="display:grid; gap:0.5rem; max-width:460px;">
        <input name="titulo" placeholder="Título de la infografía" required maxlength="120" style="width:100%;" />
        <input name="archivo" type="file" accept="image/png,image/jpeg,image/webp,.pdf" required />
        <button class="btn small" type="submit" style="justify-self:start;">Subir infografía</button>
        <span id="infografia-estado" style="font-size:0.78rem; color:var(--text-muted);"></span>
      </form>` : (vistaPrevia ? `<p style="font-size:0.82rem; color:var(--text-muted);">Vista previa: acá el estudiante ve el formulario para subir su infografía.</p>` : "")}
    </div>
    <div id="infografias-lista" class="roster">
      ${(lista || []).length ? lista.map(i => tarjetaInfografia(i, { puedeEditar, esProfesor })).join("") : `<p class="empty">${isSelf ? "Todavía no has subido ninguna infografía." : "Este estudiante todavía no ha subido infografías."}</p>`}
    </div>`;
  const recargar = () => renderInfografiasEstudiante(el, s, isSelf);
  enlazarAccionesInfografia(el, recargar);
  const form = el.querySelector("#infografia-form");
  if (form) form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const estado = el.querySelector("#infografia-estado");
    const f = new FormData(form);
    const titulo = String(f.get("titulo") || "").trim();
    const archivo = f.get("archivo");
    const err = validarArchivoInfografia(archivo && archivo.size ? archivo : null);
    if (!titulo) { estado.textContent = "Ponele un título a la infografía."; return; }
    if (err) { estado.textContent = err; return; }
    form.querySelector("button[type=submit]").disabled = true;
    estado.textContent = "Subiendo…";
    const ruta = rutaInfografia(s.id, archivo);
    const { error: errSubida } = await sb.storage.from("materiales").upload(ruta, archivo);
    if (errSubida) { estado.textContent = "No se pudo subir: " + errSubida.message; form.querySelector("button[type=submit]").disabled = false; return; }
    const { error: errGuardar } = await sb.from("infografias_estudiante").insert({ estudiante_id: s.id, titulo, archivo_ruta: ruta, archivo_nombre: archivo.name });
    if (errGuardar) { estado.textContent = "No se pudo guardar: " + errGuardar.message; form.querySelector("button[type=submit]").disabled = false; return; }
    recargar();
  });
}

// Vista del profesor en la página de la sección 11-3: todas las
// infografías juntas, agrupadas por estudiante.
async function pintarInfografiasSeccion(holder, estudiantes) {
  holder.innerHTML = "Cargando…";
  const ids = (estudiantes || []).map(e => e.id);
  const { data: todas, error } = ids.length
    ? await sb.from("infografias_estudiante").select("*").in("estudiante_id", ids).order("creado_en", { ascending: false })
    : { data: [] };
  if (error) { holder.innerHTML = `<p class="no-phone-note">No se pudo cargar: ${escInfografia(error.message)}</p>`; return; }
  const porEst = {};
  (todas || []).forEach(i => { (porEst[i.estudiante_id] = porEst[i.estudiante_id] || []).push(i); });
  const conEntrega = (estudiantes || []).filter(e => porEst[e.id]);
  const sin = (estudiantes || []).filter(e => !porEst[e.id]);
  holder.innerHTML = `
    <p style="font-size:0.82rem; color:var(--text-muted);">${conEntrega.length} de ${(estudiantes || []).length} estudiantes han subido al menos una infografía (${(todas || []).length} en total).</p>
    ${conEntrega.map(e => `
      <h4 style="margin:0.9rem 0 0.3rem;">${escInfografia(e.apellido1)} ${escInfografia(e.apellido2)}, ${escInfografia(e.nombre)}</h4>
      <div class="roster">${porEst[e.id].map(i => tarjetaInfografia(i, { puedeEditar: false, esProfesor: true })).join("")}</div>`).join("")}
    ${sin.length ? `<p style="font-size:0.8rem; color:var(--text-muted); margin-top:1rem;"><strong>Sin infografías:</strong> ${sin.map(e => escInfografia(e.nombre + " " + e.apellido1)).join(", ")}</p>` : ""}`;
  enlazarAccionesInfografia(holder, () => pintarInfografiasSeccion(holder, estudiantes));
}

// --- Notas (filtradas por materias asignadas si es estudiante) ---

// En el perfil del estudiante (sus notas): dos apartados del proyecto, solo
// cuando el profesor los habilita desde Proyectos → Proyecto integral:
//   1. Retroalimentación del proyecto: su nota por criterio + el dictamen
//      (justificación y qué mejorar) — contenido_actividad.retro_proyecto_visible
//      del trabajo de entrega, y solo después de que el profesor guardó notas.
//   2. Comprobación: su resultado y, si el profesor desbloqueó las respuestas
//      (retro_visible de la prueba), sus respuestas junto a las correctas.
async function pintarRetroProyectoEstudiante(holder, s, materias) {
  const esc = (v) => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const quitarHtml = (v) => String(v || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const nombreEst = `${s.nombre || ""} ${s.apellido1 || ""} ${s.apellido2 || ""}`.replace(/\s+/g, " ").trim();
  const tarjetas = [];
  const datosPorMateria = {};
  for (const m of (materias || [])) {
    const { data: indicadores } = await sb.from("indicadores").select("*, criterios_indicador(*)").eq("materia_id", m.id).eq("categoria", "Proyectos").order("orden");
    if (!(indicadores || []).length) continue;
    const { data: trabajos } = await sb.from("trabajos_cotidianos").select("*").in("indicador_id", indicadores.map(i => i.id));
    const entrega = (trabajos || []).find(t => t.tipo_actividad === "proyecto");
    const comprobacion = (trabajos || []).find(t => t.tipo_actividad === "prueba");
    const { data: misNotas } = await sb.from("calificaciones_indicador").select("indicador_id, puntaje_obtenido").eq("estudiante_id", s.id).in("indicador_id", indicadores.map(i => i.id));
    const notaPorInd = {};
    (misNotas || []).forEach(n => { notaPorInd[n.indicador_id] = n.puntaje_obtenido; });

    const ca = (entrega && entrega.contenido_actividad) || {};
    const dictamen = (ca.evaluaciones_ia && ca.evaluaciones_ia[s.id]) || null;
    const indEvaluados = indicadores.filter(i => (!comprobacion || i.id !== comprobacion.indicador_id) && !/comprobaci[oó]n/i.test(quitarHtml(i.descripcion)));
    const tieneNotas = indEvaluados.some(i => notaPorInd[i.id] !== undefined && notaPorInd[i.id] !== null);
    const retroDisponible = !!(entrega && ca.retro_proyecto_visible && tieneNotas);

    let miActividad = null;
    if (comprobacion && comprobacion.habilitado !== false) {
      const { data } = await sb.from("actividades_estudiante").select("*").eq("trabajo_id", comprobacion.id).eq("estudiante_id", s.id).eq("completado", true).maybeSingle();
      miActividad = data || null;
    }
    const compDisponible = !!(comprobacion && miActividad && comprobacion.retro_visible);
    if (!entrega && !comprobacion) continue;

    datosPorMateria[m.id] = { m, indEvaluados, notaPorInd, dictamen, comprobacion, miActividad };
    const obtenido = indEvaluados.reduce((a, i) => a + (Number(notaPorInd[i.id]) || 0), 0);
    const maximo = indEvaluados.reduce((a, i) => a + (Number(i.puntaje_maximo) || 3), 0);
    const estiloBoton = "flex:1; min-width:15rem; font-size:1rem; padding:0.9rem 1rem; border-radius:10px;";
    tarjetas.push(`
      <div style="border:2px solid var(--paper-line); border-radius:12px; padding:1rem; margin-bottom:1rem; background:var(--paper);">
        <h3 style="margin:0 0 0.8rem;">📘 Mi proyecto · ${esc(m.nombre)}</h3>
        <div style="display:flex; gap:0.8rem; flex-wrap:wrap;">
          <div style="flex:1; min-width:15rem;">
            ${retroDisponible
              ? `<button class="btn" style="${estiloBoton} width:100%;" data-desc-retro="${m.id}" type="button">⬇️ Descargar retroalimentación</button>
                 <p style="margin:0.4rem 0 0; font-size:0.85rem; text-align:center;">Tu documento: <strong>${obtenido} de ${maximo} puntos</strong></p>`
              : `<button class="btn secondary" style="${estiloBoton} width:100%; opacity:0.55;" disabled type="button">⬇️ Descargar retroalimentación</button>
                 <p style="margin:0.4rem 0 0; font-size:0.82rem; text-align:center; color:var(--text-muted);">Disponible cuando tu profesor publique las notas del proyecto.</p>`}
          </div>
          <div style="flex:1; min-width:15rem;">
            ${compDisponible
              ? `<button class="btn" style="${estiloBoton} width:100%;" data-desc-comp="${m.id}" type="button">⬇️ Descargar comprobación (prueba)</button>
                 <p style="margin:0.4rem 0 0; font-size:0.85rem; text-align:center;">Tu resultado: <strong>${esc(miActividad.puntaje)} / 3</strong>${miActividad.porcentaje != null ? ` · ${Math.round(Number(miActividad.porcentaje))} % de aciertos` : ""}</p>`
              : `<button class="btn secondary" style="${estiloBoton} width:100%; opacity:0.55;" disabled type="button">⬇️ Descargar comprobación (prueba)</button>
                 <p style="margin:0.4rem 0 0; font-size:0.82rem; text-align:center; color:var(--text-muted);">${!comprobacion || comprobacion.habilitado === false ? "La comprobación todavía no está disponible." : (!miActividad ? "Primero hacé la comprobación (botón «▶ Iniciar prueba» en Proyectos)." : "Disponible cuando tu profesor publique las respuestas.")}</p>`}
          </div>
        </div>
      </div>`);
  }
  holder.innerHTML = tarjetas.join("");

  holder.querySelectorAll("[data-desc-retro]").forEach(btn => btn.addEventListener("click", async () => {
    const d = datosPorMateria[btn.dataset.descRetro];
    const texto = btn.textContent;
    btn.disabled = true; btn.textContent = "Preparando PDF…";
    try { await descargarPdfRetroProyecto(d, nombreEst, quitarHtml); }
    catch (err) { alert("No se pudo generar el PDF: " + (err.message || err)); }
    finally { btn.disabled = false; btn.textContent = texto; }
  }));
  holder.querySelectorAll("[data-desc-comp]").forEach(btn => btn.addEventListener("click", async () => {
    const d = datosPorMateria[btn.dataset.descComp];
    const texto = btn.textContent;
    btn.disabled = true; btn.textContent = "Preparando PDF…";
    try { await descargarPdfComprobacion(d, nombreEst, quitarHtml); }
    catch (err) { alert("No se pudo generar el PDF: " + (err.message || err)); }
    finally { btn.disabled = false; btn.textContent = texto; }
  }));
}

// Carga jsPDF + AutoTable (solo la primera vez que se descarga un PDF).
function cargarLibreriasPdf() {
  if (window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.API && window.jspdf.jsPDF.API.autoTable) return Promise.resolve();
  if (window.__cargandoPdf) return window.__cargandoPdf;
  const cargar = (src) => new Promise((resolve, reject) => {
    const sc = document.createElement("script");
    sc.src = src; sc.onload = resolve; sc.onerror = () => reject(new Error("No se pudo cargar el generador de PDF. Revisá tu conexión."));
    document.head.appendChild(sc);
  });
  window.__cargandoPdf = cargar("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js")
    .then(() => cargar("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"))
    .catch(err => { window.__cargandoPdf = null; throw err; });
  return window.__cargandoPdf;
}

// Encabezado común de los PDF del proyecto. Devuelve la posición Y siguiente.
function encabezadoPdfProyecto(doc, titulo, materia, nombreEst) {
  const ancho = doc.internal.pageSize.getWidth();
  doc.setFillColor(31, 78, 61); doc.rect(0, 0, ancho, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  doc.text("CTP Mercedes Norte · Especialidad de Contabilidad", 14, 11);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text(`${materia} · II Período 2026`, 14, 19);
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold"); doc.setFontSize(16);
  doc.text(titulo, 14, 38);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10.5);
  doc.text(`Estudiante: ${nombreEst}`, 14, 46);
  doc.text(`Fecha: ${new Date().toLocaleDateString("es-CR", { year: "numeric", month: "long", day: "numeric" })}`, 14, 52);
  return 60;
}

function nombreArchivoPdf(prefijo, nombreEst) {
  const limpio = String(nombreEst || "estudiante").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return `${prefijo}_${limpio}.pdf`;
}

async function descargarPdfRetroProyecto(d, nombreEst, quitarHtml) {
  await cargarLibreriasPdf();
  const doc = new window.jspdf.jsPDF({ unit: "mm", format: "letter" });
  let y = encabezadoPdfProyecto(doc, "Retroalimentación del proyecto", d.m.nombre, nombreEst);
  const porLetra = {};
  ((d.dictamen && d.dictamen.indicadores) || []).forEach(x => { porLetra[x.letra] = x; });
  const obtenido = d.indEvaluados.reduce((a, i) => a + (Number(d.notaPorInd[i.id]) || 0), 0);
  const maximo = d.indEvaluados.reduce((a, i) => a + (Number(i.puntaje_maximo) || 3), 0);
  doc.setFontSize(11.5); doc.setFont("helvetica", "bold");
  doc.text(`Resultado del documento: ${obtenido} de ${maximo} puntos (${maximo ? Math.round((obtenido / maximo) * 1000) / 10 : 0} %)`, 14, y);
  y += 4;
  const filas = d.indEvaluados.map(i => {
    const n = d.notaPorInd[i.id];
    const crit = (i.criterios_indicador || []).find(c => n !== undefined && n !== null && Number(c.puntaje) === Number(n));
    const x = porLetra[i.letra] || {};
    const porque = [x.justificacion || "", x.evidencia ? `Evidencia: ${x.evidencia}` : ""].filter(Boolean).join("\n");
    const mejora = x.mejora || (n !== undefined && n !== null && Number(n) === Number(i.puntaje_maximo) ? "Lograste el máximo." : "");
    return [`${i.letra}. ${quitarHtml(i.descripcion)}`, n === undefined || n === null ? "—" : `${n} / ${i.puntaje_maximo}`, (crit && crit.nivel) || "", porque, mejora];
  });
  doc.autoTable({
    startY: y,
    head: [["Criterio", "Nota", "Nivel", "Por qué", "Qué podés mejorar"]],
    body: filas,
    styles: { font: "helvetica", fontSize: 8.6, cellPadding: 2, valign: "top" },
    headStyles: { fillColor: [31, 78, 61], textColor: 255 },
    columnStyles: { 0: { cellWidth: 44 }, 1: { cellWidth: 14, halign: "center" }, 2: { cellWidth: 20 }, 3: { cellWidth: 62 }, 4: { cellWidth: 46 } },
    margin: { left: 14, right: 14 }
  });
  y = doc.lastAutoTable.finalY + 8;
  if (d.dictamen && d.dictamen.comentario) {
    const ancho = doc.internal.pageSize.getWidth() - 28;
    const lineas = doc.splitTextToSize(d.dictamen.comentario, ancho);
    if (y + 10 + lineas.length * 5 > doc.internal.pageSize.getHeight() - 15) { doc.addPage(); y = 20; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text("Comentario general", 14, y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.text(lineas, 14, y + 6);
  }
  doc.save(nombreArchivoPdf("Retroalimentacion_proyecto", nombreEst));
}

async function descargarPdfComprobacion(d, nombreEst) {
  await cargarLibreriasPdf();
  const trabajo = d.comprobacion;
  const act = d.miActividad || {};
  const preguntas = ((trabajo.contenido_actividad || {}).preguntas || []);
  const respuestas = Array.isArray(act.respuestas) ? act.respuestas : [];
  const doc = new window.jspdf.jsPDF({ unit: "mm", format: "letter" });
  let y = encabezadoPdfProyecto(doc, "Comprobación del proyecto", d.m.nombre, nombreEst);
  const correctas = preguntas.reduce((a, p, i) => a + (Number(respuestas[i]) === Number(p.correcta) && respuestas[i] !== null && respuestas[i] !== undefined ? 1 : 0), 0);
  doc.setFontSize(11.5); doc.setFont("helvetica", "bold");
  doc.text(`Resultado: ${act.puntaje != null ? act.puntaje : "—"} / 3 · ${correctas} de ${preguntas.length} respuestas correctas${act.porcentaje != null ? ` (${Math.round(Number(act.porcentaje))} %)` : ""}`, 14, y);
  y += 4;
  const filas = preguntas.map((p, i) => {
    const r = respuestas[i];
    const respondio = r === null || r === undefined ? "Sin responder" : ((p.opciones || [])[Number(r)] ?? "Sin responder");
    const ok = r !== null && r !== undefined && Number(r) === Number(p.correcta);
    return [String(i + 1), p.pregunta || "", respondio, (p.opciones || [])[Number(p.correcta)] ?? "", ok ? "Correcta" : "Incorrecta"];
  });
  doc.autoTable({
    startY: y,
    head: [["#", "Pregunta", "Tu respuesta", "Respuesta correcta", "Resultado"]],
    body: filas,
    styles: { font: "helvetica", fontSize: 8.6, cellPadding: 2, valign: "top" },
    headStyles: { fillColor: [31, 78, 61], textColor: 255 },
    columnStyles: { 0: { cellWidth: 8, halign: "center" }, 1: { cellWidth: 70 }, 2: { cellWidth: 40 }, 3: { cellWidth: 46 }, 4: { cellWidth: 22 } },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 4) {
        data.cell.styles.textColor = data.cell.raw === "Correcta" ? [29, 122, 67] : [192, 57, 43];
        data.cell.styles.fontStyle = "bold";
      }
    },
    margin: { left: 14, right: 14 }
  });
  doc.save(nombreArchivoPdf("Comprobacion_proyecto", nombreEst));
}

async function renderNotas(el, s, isSelf) {
  el.innerHTML = "Cargando…";
  try {
    await renderNotasInterno(el, s, isSelf);
  } catch (err) {
    console.error(err);
    el.innerHTML = `<p class="no-phone-note">Ocurrió un error cargando las notas: ${err.message || err}</p>`;
  }
}

async function renderNotasInterno(el, s, isSelf, categoriaActiva) {
  const { data: asignadas } = await sb.from("estudiante_materias").select("materia_id, materias(id, nombre)").eq("estudiante_id", s.id);
  const materiasAsignadas = (asignadas || []).map(a => a.materias).filter(Boolean);

  const { data: notas } = await sb.from("notas").select("*, materias(nombre)").eq("estudiante_id", s.id).order("creado_en", { ascending: false });
  const { data: categorias } = await sb.from("rubrica_categorias").select("*").order("orden");
  const { data: tareas } = await sb.from("tareas").select("*, materias(nombre), resultados_aprendizaje(resultado)").eq("estudiante_id", s.id).order("fecha", { ascending: true });

  // Nota final ponderada por materia, según los % de la rúbrica.
  // Si hay varias notas en la misma categoría, se promedian antes de ponderar.
  // Las categorías sin ninguna nota todavía no suman (se excluyen del cálculo,
  // para no penalizar antes de tiempo lo que aún no se ha evaluado).
  const finalesPorMateria = await Promise.all(materiasAsignadas.map(async m => {
    const notasMateria = (notas || []).filter(n => n.materia_id === m.id);
    let pesoUsado = 0, suma = 0;
    const detalle = [];
    for (const c of (categorias || [])) {
      if (c.nombre.trim().toLowerCase() === "asistencia") {
        const resultado = await calcularNotaAsistencia(s.id, m.id);
        if (!resultado) { detalle.push({ nombre: c.nombre, porcentaje: c.porcentaje, promedio: null }); continue; }
        suma += resultado.nota * (c.porcentaje / 100);
        pesoUsado += Number(c.porcentaje);
        detalle.push({ nombre: c.nombre, porcentaje: c.porcentaje, promedio: resultado.nota });
        continue;
      }
      const porIndicadores = await calcularNotaIndicadores(s.id, m.id, c.nombre, isSelf);
      if (porIndicadores) {
        suma += porIndicadores.nota * (c.porcentaje / 100);
        pesoUsado += Number(c.porcentaje);
        detalle.push({ nombre: c.nombre, porcentaje: c.porcentaje, promedio: porIndicadores.nota });
        continue;
      }
      const notasCat = notasMateria.filter(n => n.rubro === c.nombre);
      if (notasCat.length === 0) { detalle.push({ nombre: c.nombre, porcentaje: c.porcentaje, promedio: null }); continue; }
      const promedio = notasCat.reduce((a, n) => a + Number(n.nota), 0) / notasCat.length;
      suma += promedio * (c.porcentaje / 100);
      pesoUsado += Number(c.porcentaje);
      detalle.push({ nombre: c.nombre, porcentaje: c.porcentaje, promedio });
    }
    return { materia: m.nombre, final: pesoUsado > 0 ? suma : null, pesoUsado, detalle };
  }));

  const materiaOptions = materiasAsignadas.map(m => `<option value="${m.id}">${m.nombre}</option>`).join("");
  const categoriasNoAsistencia = (categorias || []).filter(c => c.nombre.trim().toLowerCase() !== "asistencia");

  // Agrupa las notas por categoría, con una barra de navegación igual a la de Tareas.
  const activa = categoriaActiva || categoriasNoAsistencia[0]?.nombre || null;
  function notasDe(nombreCat) { return (notas || []).filter(n => n.rubro === nombreCat); }

  const botones = categoriasNoAsistencia.map(c => {
    const pendientesTareaCat = (tareas || []).filter(t => t.categoria === c.nombre && !t.hecha).length;
    return `
      <button class="cat-navlink ${c.nombre === activa ? "active" : ""}" data-cat-nota="${c.nombre}">
        ${c.nombre}${pendientesTareaCat > 0 ? `<span class="cat-navlink-badge">${pendientesTareaCat}</span>` : ""}
      </button>`;
  }).join("");

  const notasActivas = activa ? notasDe(activa) : [];

  // Para la categoría activa, revisa si alguna materia tiene Indicadores de evaluación
  // configurados; si es así, se muestra la tabla de indicadores en vez de la nota manual.
  const indicadoresPorMateria = {};
  if (activa) {
    for (const m of materiasAsignadas) {
      const info = await calcularNotaIndicadores(s.id, m.id, activa, isSelf);
      if (info) indicadoresPorMateria[m.id] = info;
    }
  }

  // Para el estudiante viendo su propia nota: si un indicador viene de una
  // prueba (ya habilitada — eso ya lo filtró calcularNotaIndicadores) y
  // todavía no la hace, se le pone el botón "Iniciar prueba" ahí mismo, en
  // vez de obligarlo a ir hasta Materias a buscarla.
  const trabajoPorIndNota = {};
  // Si un indicador viene de una tarea de "subir archivo" (tipo_actividad
  // "infografia"), acá se guarda lo que ya entregó este estudiante (si
  // entregó), para poder mostrar "Subir archivo" o "Ya entregado" en vez
  // del selector 0-3 (eso lo sigue calificando el profesor aparte).
  const entregaPorTrabajoArchivo = {};
  // Igual, pero para un indicador vinculado a una actividad tipo "proyecto"
  // (título + descripción + archivo, con entregas múltiples): acá se junta
  // el historial de entregas de este estudiante, por trabajo.
  const entregaProyectoPorTrabajo = {};
  if (isSelf) {
    const todosLosIndicadorIds = Object.values(indicadoresPorMateria).flatMap(info => info.indicadores.map(i => i.id));
    if (todosLosIndicadorIds.length) {
      const { data: trabajosDeIndicadores } = await sb.from("trabajos_cotidianos")
        .select("id, indicador_id, tipo_actividad, habilitado, fecha_hora_inicio, titulo, contenido_actividad, subtema_id, publicacion_id")
        .in("indicador_id", todosLosIndicadorIds);
      (trabajosDeIndicadores || []).forEach(t => { trabajoPorIndNota[t.indicador_id] = t; });

      const trabajoArchivoIds = (trabajosDeIndicadores || []).filter(t => t.tipo_actividad === "infografia").map(t => t.id);
      if (trabajoArchivoIds.length) {
        const { data: entregasArchivo } = await sb.from("actividades_estudiante").select("trabajo_id, archivo_ruta, archivo_nombre").eq("estudiante_id", s.id).in("trabajo_id", trabajoArchivoIds);
        (entregasArchivo || []).forEach(e => { entregaPorTrabajoArchivo[e.trabajo_id] = e; });
      }

      const trabajoProyectoIds = (trabajosDeIndicadores || []).filter(t => t.tipo_actividad === "proyecto").map(t => t.id);
      if (trabajoProyectoIds.length) {
        const { data: entregasProyecto } = await sb.from("proyecto_entregas").select("*").eq("estudiante_id", s.id).in("trabajo_id", trabajoProyectoIds).order("creado_en", { ascending: false });
        (entregasProyecto || []).forEach(e => { (entregaProyectoPorTrabajo[e.trabajo_id] = entregaProyectoPorTrabajo[e.trabajo_id] || []).push(e); });
      }
    }
  }

  // Veces que el estudiante salió de la pantalla en cada actividad ligada a un indicador (para estudiante y docente).
  const salidasPorIndicador = {};
  try {
    const idsInd = Object.values(indicadoresPorMateria).flatMap(info => info.indicadores.map(i => i.id));
    if (idsInd.length) {
      const { data: tcs } = await sb.from("trabajos_cotidianos").select("id, indicador_id").in("indicador_id", idsInd);
      const idsTrab = (tcs || []).map(t => t.id);
      if (idsTrab.length) {
        const { data: acts } = await sb.from("actividades_estudiante").select("trabajo_id, intentos_salida, completado").eq("estudiante_id", s.id).in("trabajo_id", idsTrab);
        const indPorTrab = {}; (tcs || []).forEach(t => { indPorTrab[t.id] = t.indicador_id; });
        (acts || []).forEach(a => { if (a.completado && indPorTrab[a.trabajo_id] != null) salidasPorIndicador[indPorTrab[a.trabajo_id]] = Number(a.intentos_salida) || 0; });
      }
    }
  } catch (e) { console.warn("salidas", e); }

  function tablaIndicadores(m, info) {
    const categoriaObj = categorias.find(c => c.nombre === activa);
    const resultadoPct = categoriaObj ? (info.nota * categoriaObj.porcentaje / 100).toFixed(1) : info.nota.toFixed(1);
    const calificados = info.indicadores.filter(i => info.porIndicador[i.id] !== undefined).length;
    return `
      <h4 style="margin-top:1rem; display:flex; align-items:center; gap:0.6rem;">${m.nombre} <span class="badge" style="font-weight:400;">Progreso: ${calificados}/${info.indicadores.length} indicadores calificados</span></h4>
      <div style="overflow-x:auto;">
        <table class="grades">
          <thead><tr>
            <th>${activa}</th>
            <th style="text-align:center;">Nota obtenida</th>
            ${!isSelf ? `<th style="text-align:center;">Calificar</th>` : ""}
          </tr></thead>
          <tbody>
            ${info.indicadores.map(i => {
              const obtenido = Number(info.porIndicador[i.id] || 0);
              const sinCalificar = info.porIndicador[i.id] === undefined;
              const trabajoPrueba = isSelf ? trabajoPorIndNota[i.id] : null;
              const esPruebaPendiente = trabajoPrueba && trabajoPrueba.tipo_actividad === "prueba" && sinCalificar;
              const aunNoEsHora = esPruebaPendiente && trabajoPrueba.fecha_hora_inicio && new Date(trabajoPrueba.fecha_hora_inicio) > new Date();
              const esArchivoPendiente = trabajoPrueba && trabajoPrueba.tipo_actividad === "infografia";
              const entregaArchivo = esArchivoPendiente ? entregaPorTrabajoArchivo[trabajoPrueba.id] : null;
              const instruccionesArchivo = esArchivoPendiente ? (trabajoPrueba.contenido_actividad?.instrucciones || "") : "";
              const esProyectoPendiente = trabajoPrueba && trabajoPrueba.tipo_actividad === "proyecto";
              const entregasProyectoNota = esProyectoPendiente ? (entregaProyectoPorTrabajo[trabajoPrueba.id] || []) : [];
              const cp = esProyectoPendiente ? (trabajoPrueba.contenido_actividad || {}) : {};
              const minCaracteresProyecto = Number(cp.min_caracteres_descripcion) || 0;
              return `
              <tr>
                <td>
                  <strong>${i.descripcion}</strong>
                  ${i.fecha_evaluacion ? `<div style="font-size:0.75rem; color:var(--text-muted);">Fecha: ${i.fecha_evaluacion}${i.lecciones ? " · " + i.lecciones + " lecciones" : ""}</div>` : ""}
                  ${salidasPorIndicador[i.id] !== undefined ? `<div style="margin-top:0.25rem;">${badgeSalidas(salidasPorIndicador[i.id])}</div>` : ""}
                  ${trabajoPrueba && (trabajoPrueba.subtema_id || trabajoPrueba.publicacion_id) ? `<div style="margin-top:0.3rem;"><a class="btn secondary small" href="${trabajoPrueba.subtema_id ? "#/subtema/" + trabajoPrueba.subtema_id : "#/apartado/" + trabajoPrueba.publicacion_id}" onclick="try{sessionStorage.setItem('ctp_abrir_tab_trabajos','1')}catch(e){}">➡️ Ir al trabajo en el subtema</a></div>` : ""}
                  ${esPruebaPendiente ? (aunNoEsHora
                    ? `<div style="margin-top:0.3rem;"><span class="badge" style="background:var(--warn-bg); color:var(--warn-text);">⏳ Disponible a partir de ${formatearFechaHora(trabajoPrueba.fecha_hora_inicio)}</span></div>`
                    : `<div style="margin-top:0.3rem;"><button class="btn small" data-iniciar-prueba-nota="${trabajoPrueba.id}">▶ Iniciar prueba</button></div>`) : ""}
                  ${esArchivoPendiente ? `<div style="margin-top:0.3rem;">
                    ${instruccionesArchivo ? `<div style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.3rem;">${instruccionesArchivo}</div>` : ""}
                    ${entregaArchivo && entregaArchivo.archivo_ruta ? `
                      <span class="badge" style="background:var(--success-bg); color:var(--success-text);">✓ Entregado: ${entregaArchivo.archivo_nombre || "archivo"}</span>
                      <label class="link-btn" style="cursor:pointer; margin-left:0.4rem;">Reemplazar archivo<input type="file" data-subir-archivo-nota="${trabajoPrueba.id}" accept="image/*,.pdf" style="display:none;" /></label>
                    ` : `
                      <label class="btn small" style="cursor:pointer;">📎 Subir archivo (imagen o PDF)<input type="file" data-subir-archivo-nota="${trabajoPrueba.id}" accept="image/*,.pdf" style="display:none;" /></label>
                    `}
                    <span data-subir-archivo-estado="${trabajoPrueba.id}" style="font-size:0.78rem; color:var(--text-muted);"></span>
                  </div>` : ""}
                  ${esProyectoPendiente ? `<div style="margin-top:0.4rem; background:var(--surface-soft); border-radius:8px; padding:0.6rem;">
                    ${cp.instrucciones ? `<div style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.4rem;">${cp.instrucciones}</div>` : ""}
                    ${entregasProyectoNota.length ? `<p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.4rem;">✓ Ya entregaste ${entregasProyectoNota.length} ve${entregasProyectoNota.length === 1 ? "z" : "ces"} — podés volver a entregar si necesitás corregir algo.</p>` : ""}
                    ${avisoLimiteProyectoHTML(cp)}
                    ${estadoLimiteProyecto(cp).vencido ? "" : `                    <form data-proyecto-nota-form="${trabajoPrueba.id}" style="display:grid; gap:0.4rem;">
                      <input name="titulo" placeholder="${cp.placeholder_titulo || "Título"}" required style="width:100%;" />
                      <textarea name="descripcion" data-proyecto-nota-descripcion="${trabajoPrueba.id}" placeholder="${cp.placeholder_descripcion || "Descripción"}" rows="3" required minlength="${minCaracteresProyecto || 1}" style="width:100%; font-family:inherit; resize:vertical;"></textarea>
                      ${minCaracteresProyecto ? `<span data-proyecto-nota-contador="${trabajoPrueba.id}" style="font-size:0.75rem; color:var(--text-muted);">0 / ${minCaracteresProyecto} caracteres mínimo</span>` : ""}
                      ${esSeccion113(s.seccion) ? camposArchivosProyecto113() : `                      <label style="font-size:0.82rem;">Archivo:
                        <input type="file" name="archivo" required style="display:block; margin-top:0.3rem;" />
                      </label>`}
                      <button class="btn small" type="submit" style="justify-self:start;">Enviar entrega</button>
                      <span data-proyecto-nota-estado="${trabajoPrueba.id}" style="font-size:0.78rem; color:var(--text-muted);"></span>
                    </form>`}
                    ${entregasProyectoNota.length ? `<div style="margin-top:0.5rem; display:grid; gap:0.3rem;">
                      ${entregasProyectoNota.map(e => {
                        const { data: pub } = sb.storage.from("materiales").getPublicUrl(e.archivo_ruta);
                        return `<div style="font-size:0.8rem; border-left:3px solid var(--paper-line); padding:0.3rem 0.5rem; background:var(--surface);">
                          <strong>${e.titulo}</strong> <span style="color:var(--text-muted);">· ${formatearFechaHora(e.creado_en)}</span>
                          ${e.descripcion ? `<div style="margin-top:0.15rem;">${e.descripcion}</div>` : ""}
                          ${enlacesArchivosProyecto(e)}
                          ${botonModificarProyectoHTML(e, cp, s.seccion)}
                        </div>`;
                      }).join("")}
                    </div>` : ""}
                  </div>` : ""}
                </td>
                <td class="num" style="text-align:center; font-weight:600;">
                  ${sinCalificar ? `<span class="no-phone-note" style="margin:0;">Sin calificar aún</span>` : `${obtenido} / ${i.puntaje_maximo}`}
                </td>
                ${!isSelf ? `
                <td style="text-align:center;">
                  <select data-calif-indicador="${i.id}" data-materia="${m.id}" style="width:4rem; text-align:center; border:1px solid var(--paper-line); border-radius:3px;">
                    ${Array.from({ length: i.puntaje_maximo + 1 }, (_, p) => `<option value="${p}" ${obtenido === p ? "selected" : ""}>${p}</option>`).join("")}
                  </select>
                </td>` : ""}
              </tr>`;
            }).join("")}
          </tbody>
        </table>
      </div>
      <p class="num" style="font-weight:600; margin-top:0.4rem;">Resultado de ${activa} (valor: ${categoriaObj?.porcentaje || "?"}% de la nota final): ${resultadoPct}%</p>
      <details style="margin-top:0.5rem;">
        <summary style="font-size:0.82rem; color:var(--text-muted); cursor:pointer;">Ver criterios de cada trabajo</summary>
        <table class="grades" style="margin-top:0.5rem;">
          <thead><tr><th>Indicador</th><th>Puntaje máximo</th><th>Criterios</th></tr></thead>
          <tbody>
            ${info.indicadores.map(i => `<tr>
              <td><strong>${i.letra}:</strong> ${i.descripcion}${i.fecha_evaluacion ? `<div style="font-size:0.75rem; color:var(--text-muted);">Fecha: ${i.fecha_evaluacion}${i.lecciones ? " · " + i.lecciones + " lecciones" : ""}</div>` : ""}</td>
              <td class="num">${i.puntaje_maximo}</td>
              <td style="font-size:0.85rem;" data-criterios-de="${i.id}">Cargando…</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </details>`;
  }

  function filaNota(n) {
    const tieneEval = n.evaluacion_texto || n.evaluacion_archivo;
    return `
      <div class="roster-row" style="flex-direction:column; align-items:stretch; gap:0.4rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:0.6rem;">
          <span class="name">${n.materias?.nombre || "—"} <span class="num ${n.nota < 70 ? "low" : ""}" style="font-weight:600;">${n.nota}</span></span>
          <span style="display:flex; gap:0.5rem; align-items:center;">
            ${tieneEval ? `<button class="link-btn" data-ver-eval="${n.id}">Ver evaluación ▾</button>` : `<span class="no-phone-note" style="margin:0;">Sin evaluación adjunta</span>`}
            ${!isSelf ? `<button class="btn danger small" data-del="${n.id}">Eliminar</button>` : ""}
          </span>
        </div>
        ${tieneEval ? `
        <div id="eval-${n.id}" style="display:none; background:var(--paper); border-left:2px solid var(--paper-line); padding:0.6rem 0.8rem;">
          ${n.evaluacion_texto ? `<div class="roa-cell-texto" style="font-size:0.85rem; margin-bottom:${n.evaluacion_archivo ? "0.5rem" : "0"};">${n.evaluacion_texto}</div>` : ""}
          ${n.evaluacion_archivo ? `<a href="${n.evaluacion_archivo}" download="${n.evaluacion_archivo_nombre || "evaluacion"}" class="btn small secondary">⬇ ${n.evaluacion_archivo_nombre || "Descargar archivo"}</a>` : ""}
        </div>` : ""}
      </div>`;
  }

  function filaTarea(t) {
    return `
      <div class="task-row ${t.hecha ? "done" : ""}">
        <input type="checkbox" data-toggle-tarea="${t.id}" ${t.hecha ? "checked" : ""} />
        <div style="flex:1;">
          <span class="task-title">${t.materias?.nombre ? `[${t.materias.nombre}] ` : ""}${t.titulo}</span>
          ${t.resultados_aprendizaje?.resultado ? `<div style="font-size:0.78rem; color:var(--text-muted); font-style:italic; margin-top:0.15rem;">Resultado de aprendizaje: ${t.resultados_aprendizaje.resultado}</div>` : ""}
        </div>
        <span class="task-due">${t.fecha || ""}</span>
        ${!isSelf ? `<button class="btn danger small" data-del-tarea="${t.id}">Eliminar</button>` : ""}
      </div>`;
  }
  const tareasActivas = activa ? (tareas || []).filter(t => t.categoria === activa) : [];
  const tareasPendientes = tareasActivas.filter(t => !t.hecha).length;

  let materiaOptionsTarea = "", resultadoOptionsTarea = "";
  if (!isSelf) {
    materiaOptionsTarea = `<option value="">(general)</option>` + materiasAsignadas.map(m => `<option value="${m.id}">${m.nombre}</option>`).join("");
    const materiaIds = materiasAsignadas.map(m => m.id);
    if (materiaIds.length > 0) {
      const { data: unidades } = await sb.from("programa").select("id, unidad, materias(nombre)").in("materia_id", materiaIds);
      const programaIds = (unidades || []).map(u => u.id);
      if (programaIds.length > 0) {
        const { data: resultados } = await sb.from("resultados_aprendizaje").select("id, resultado, programa_id").in("programa_id", programaIds);
        resultadoOptionsTarea = `<option value="">— Sin vincular a un resultado —</option>` + (unidades || []).map(u => {
          const items = (resultados || []).filter(r => r.programa_id === u.id);
          if (items.length === 0) return "";
          return `<optgroup label="${u.materias?.nombre || ""} — ${u.unidad}">
            ${items.map(r => `<option value="${r.id}">${r.resultado.slice(0, 90)}${r.resultado.length > 90 ? "…" : ""}</option>`).join("")}
          </optgroup>`;
        }).join("");
      }
    }
  }

  el.innerHTML = `
    ${!isSelf && materiasAsignadas.length === 0 ? `<p class="no-phone-note">Este estudiante no tiene materias asignadas todavía. Ve a la pestaña "Materias" para asignarle al menos una antes de poder registrar notas.</p>` : ""}
    ${finalesPorMateria.length > 0 ? `
    <div class="roster" style="margin-bottom:1.2rem;">
      ${finalesPorMateria.map(f => `
        <div class="roster-row">
          <span class="name">${f.materia}</span>
          <span class="badge" style="${f.final === null ? "opacity:0.5;" : ""}">${f.final === null ? "Sin notas aún" : "Nota final: " + f.final.toFixed(1) + (f.pesoUsado < 100 ? ` (${f.pesoUsado}% evaluado)` : "")}</span>
        </div>`).join("")}
    </div>` : ""}
    ${isSelf ? `<div id="proyecto-retro-holder"></div>` : ""}

    <nav class="cat-navbar">${botones || '<span style="color:#cdd6da; font-size:0.85rem;">No hay categorías de rúbrica definidas.</span>'}</nav>
    ${activa ? `
      <h3>${activa}</h3>
      ${materiasAsignadas.filter(m => indicadoresPorMateria[m.id]).map(m => tablaIndicadores(m, indicadoresPorMateria[m.id])).join("")}
      ${(() => {
        const materiasSinIndicadores = materiasAsignadas.filter(m => !indicadoresPorMateria[m.id]);
        if (materiasSinIndicadores.length === 0 && materiasAsignadas.length > 0) return "";
        const notasSinIndicadores = notasActivas.filter(n => !indicadoresPorMateria[n.materia_id]);
        return `<div class="roster" style="margin-top:0.6rem;">${notasSinIndicadores.map(filaNota).join("") || '<p class="empty">Todavía no hay notas en esta categoría.</p>'}</div>`;
      })()}

      <h4 style="margin-top:1.2rem; display:flex; align-items:center; gap:0.5rem;">Trabajos y tareas ${tareasPendientes > 0 ? `<span class="badge" style="font-weight:400;">${tareasPendientes} pendiente${tareasPendientes === 1 ? "" : "s"}</span>` : ""}</h4>
      <div>${tareasActivas.map(filaTarea).join("") || '<p class="empty">Sin asignaciones todavía en esta categoría.</p>'}</div>
      ${!isSelf ? `
      <form class="inline-form" id="task-form" style="margin-top:0.8rem;">
        <select name="materia_id">${materiaOptionsTarea}</select>
        <input name="titulo" placeholder="Tarea (ej. Asiento de diario)" required style="flex:1; min-width:10rem" />
        <input name="fecha" type="date" />
        <select name="resultado_id" style="flex-basis:100%;">${resultadoOptionsTarea || '<option value="">Sin resultados de aprendizaje disponibles (vincula la materia en "Programa")</option>'}</select>
        <button class="btn small" type="submit">Agregar tarea</button>
      </form>` : ""}` : ""}

    ${!isSelf && materiasAsignadas.filter(m => !indicadoresPorMateria[m.id]).length > 0 ? `
    <form class="inline-form" id="grade-form" style="margin-top:1.4rem;">
      <select name="materia_id" required>${materiasAsignadas.filter(m => !indicadoresPorMateria[m.id]).map(m => `<option value="${m.id}">${m.nombre}</option>`).join("")}</select>
      <select name="rubro" required>
        ${categoriasNoAsistencia.map(c => `<option value="${c.nombre}" ${c.nombre === activa ? "selected" : ""}>${c.nombre} (${c.porcentaje}%)</option>`).join("")}
      </select>
      <input name="nota" type="number" min="0" max="100" step="0.1" placeholder="Nota" required style="width:6rem" />
      <div class="roa-editable js-nota-eval-texto" contenteditable="true" style="flex-basis:100%; min-height:2.5rem;" data-placeholder="Criterios de evaluación (opcional, texto)"></div>
      <label style="font-size:0.82rem; color:var(--text-muted); flex-basis:100%;">Adjuntar evaluación (PDF, imagen o Word, opcional):
        <input type="file" name="evaluacion_archivo" accept=".pdf,.doc,.docx,image/*" style="display:block; margin-top:0.3rem;" />
      </label>
      <button class="btn small" type="submit">Agregar nota</button>
    </form>
    ${(categorias || []).length === 0 ? `<p class="no-phone-note">No hay categorías de rúbrica creadas. Ve a "Rúbrica y Evaluaciones" en el menú para crearlas.</p>` : ""}` : ""}`;

  if (isSelf) {
    const holderRetro = el.querySelector("#proyecto-retro-holder");
    if (holderRetro) pintarRetroProyectoEstudiante(holderRetro, s, materiasAsignadas).catch(err => console.error("Retroalimentación del proyecto:", err));
  }
  el.querySelectorAll("[data-cat-nota]").forEach(btn => {
    btn.addEventListener("click", () => renderNotasInterno(el, s, isSelf, btn.dataset.catNota));
  });
  el.querySelectorAll("[data-toggle-tarea]").forEach(cb => {
    cb.addEventListener("change", async () => {
      await sb.from("tareas").update({ hecha: cb.checked }).eq("id", cb.dataset.toggleTarea);
      renderNotasInterno(el, s, isSelf, activa);
    });
  });
  if (!isSelf) {
    el.querySelectorAll("[data-del-tarea]").forEach(btn => {
      btn.addEventListener("click", async () => {
        await sb.from("tareas").delete().eq("id", btn.dataset.delTarea);
        renderNotasInterno(el, s, isSelf, activa);
      });
    });
    const taskForm = el.querySelector("#task-form");
    if (taskForm) taskForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      await sb.from("tareas").insert({
        estudiante_id: s.id,
        materia_id: f.get("materia_id") ? Number(f.get("materia_id")) : null,
        categoria: activa,
        resultado_id: f.get("resultado_id") ? Number(f.get("resultado_id")) : null,
        titulo: f.get("titulo"),
        fecha: f.get("fecha") || null,
        hecha: false
      });
      renderNotasInterno(el, s, isSelf, activa);
    });
  }
  el.querySelectorAll("[data-ver-eval]").forEach(btn => {
    btn.addEventListener("click", () => {
      const panel = document.getElementById(`eval-${btn.dataset.verEval}`);
      if (panel) panel.style.display = panel.style.display === "none" ? "block" : "none";
    });
  });
  el.querySelectorAll("[data-criterios-de]").forEach(async (td) => {
    const { data: criterios } = await sb.from("criterios_indicador").select("*").eq("indicador_id", td.dataset.criteriosDe).order("puntaje");
    td.innerHTML = (criterios || []).map(c => `<div><strong>${c.nivel ? c.nivel + " — " : ""}${c.puntaje} punto${c.puntaje === 1 ? "" : "s"}:</strong> ${c.descripcion}</div>`).join("") || '<span class="empty">Sin criterios</span>';
  });
  if (!isSelf) {
    el.querySelectorAll("[data-calif-indicador]").forEach(sel => {
      sel.addEventListener("change", async () => {
        await sb.from("calificaciones_indicador").upsert(
          { indicador_id: sel.dataset.califIndicador, estudiante_id: s.id, puntaje_obtenido: Number(sel.value) },
          { onConflict: "indicador_id,estudiante_id" }
        );
        renderNotasInterno(el, s, isSelf, activa);
      });
    });
  }

  if (!isSelf) {
    el.querySelectorAll("[data-del]").forEach(btn => {
      btn.addEventListener("click", async () => {
        await sb.from("notas").delete().eq("id", btn.dataset.del);
        renderNotasInterno(el, s, isSelf, activa);
      });
    });
    const form = el.querySelector("#grade-form");
    if (form) form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const archivo = f.get("evaluacion_archivo");
      let archivoDataUrl = null, archivoNombre = null;
      if (archivo && archivo.size > 3 * 1024 * 1024) {
        alert("El archivo pesa más de 3 MB. Usa uno más liviano (puedes comprimir el PDF o la imagen).");
        return;
      }
      if (archivo && archivo.size > 0) {
        archivoDataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = (ev) => resolve(ev.target.result);
          reader.readAsDataURL(archivo);
        });
        archivoNombre = archivo.name;
      }
      await sb.from("notas").insert({
        estudiante_id: s.id,
        materia_id: Number(f.get("materia_id")),
        rubro: f.get("rubro"),
        nota: Number(f.get("nota")),
        evaluacion_texto: el.querySelector(".js-nota-eval-texto").innerHTML || null,
        evaluacion_archivo: archivoDataUrl,
        evaluacion_archivo_nombre: archivoNombre
      });
      renderNotasInterno(el, s, isSelf, f.get("rubro"));
    });
  }

  if (isSelf) {
    el.querySelectorAll("[data-iniciar-prueba-nota]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const trabajoId = btn.dataset.iniciarPruebaNota;
        btn.disabled = true;
        btn.textContent = "Cargando…";
        const { data: trabajo } = await sb.from("trabajos_cotidianos").select("*").eq("id", trabajoId).maybeSingle();
        if (!trabajo) { alert("No se pudo cargar la prueba."); return; }
        const estudianteId = s.id;
        const { data: yaHecha } = await sb.from("actividades_estudiante").select("completado").eq("trabajo_id", trabajo.id).eq("estudiante_id", estudianteId).maybeSingle();
        if (yaHecha && yaHecha.completado) {
          alert("Esta prueba ya está completada. No se puede volver a hacer.");
          renderNotasInterno(el, s, isSelf, activa);
          return;
        }
        if (trabajo.fecha_hora_inicio && new Date(trabajo.fecha_hora_inicio) > new Date()) {
          alert("Esta prueba todavía no está disponible. Podés entrar a partir de " + formatearFechaHora(trabajo.fecha_hora_inicio) + ".");
          renderNotasInterno(el, s, isSelf, activa);
          return;
        }
        iniciarActividadInteractiva(trabajo, estudianteId, () => {
          renderNotasInterno(el, s, isSelf, activa);
        });
      });
    });

    el.querySelectorAll("[data-subir-archivo-nota]").forEach(input => {
      input.addEventListener("change", async () => {
        const trabajoId = input.dataset.subirArchivoNota;
        const archivo = input.files[0];
        if (!archivo) return;
        const estado = el.querySelector(`[data-subir-archivo-estado="${trabajoId}"]`);
        if (estado) estado.textContent = "Subiendo…";
        const estudianteId = s.id;
        const rutaSegura = `infografias/trabajo-${trabajoId}/${estudianteId}-${Date.now()}-${archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: errorSubida } = await sb.storage.from("materiales").upload(rutaSegura, archivo);
        if (errorSubida) {
          if (estado) estado.textContent = "No se pudo subir: " + errorSubida.message;
          return;
        }
        await upsertSinConflicto(
          "actividades_estudiante",
          { estudiante_id: estudianteId, trabajo_id: trabajoId },
          { completado: true, archivo_ruta: rutaSegura, archivo_nombre: archivo.name, actualizado_en: new Date().toISOString() }
        );
        renderNotasInterno(el, s, isSelf, activa);
      });
    });

    el.querySelectorAll("[data-proyecto-nota-descripcion]").forEach(textarea => {
      const trabajoId = textarea.dataset.proyectoNotaDescripcion;
      const contador = el.querySelector(`[data-proyecto-nota-contador="${trabajoId}"]`);
      if (!contador) return;
      const minimo = Number(textarea.getAttribute("minlength")) || 1;
      const actualizar = () => {
        const n = textarea.value.length;
        contador.textContent = `${n} / ${minimo} caracteres mínimo`;
        contador.style.color = n >= minimo ? "#1d7a43" : "var(--text-muted)";
      };
      textarea.addEventListener("input", actualizar);
      actualizar();
    });

    enlazarModificarProyecto(el, () => renderNotasInterno(el, s, isSelf, activa));
    el.querySelectorAll("[data-proyecto-nota-form]").forEach(form => {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const trabajoId = form.dataset.proyectoNotaForm;
        const estado = el.querySelector(`[data-proyecto-nota-estado="${trabajoId}"]`);
        const f = new FormData(form);
        const archivo = f.get("archivo");
        const descripcion = (f.get("descripcion") || "").toString();
        const minimo = Number(form.querySelector("[data-proyecto-nota-descripcion]")?.getAttribute("minlength")) || 1;
        if (descripcion.length < minimo) { if (estado) estado.textContent = `La descripción necesita al menos ${minimo} caracteres (lleva ${descripcion.length}).`; return; }
        if ((await proyectoVencido(trabajoId)).vencido) { if (estado) estado.textContent = "⛔ El plazo de entrega ya venció."; renderNotasInterno(el, s, isSelf, activa); return; }
        if (esSeccion113(s.seccion)) {
          const ok = await enviarEntregaProyecto113({ form, f, trabajoId, estudianteId: s.id, descripcion, estado });
          if (ok) renderNotasInterno(el, s, isSelf, activa);
          return;
        }
        if (!archivo || !archivo.size) { if (estado) estado.textContent = "Adjuntá un archivo."; return; }
        const boton = form.querySelector("button[type=submit]");
        boton.disabled = true;
        boton.textContent = "Enviando…";
        if (estado) estado.textContent = "Subiendo…";
        const estudianteId = s.id;
        const rutaSegura = `proyectos/trabajo-${trabajoId}/${estudianteId}-${Date.now()}-${archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: errorSubida } = await sb.storage.from("materiales").upload(rutaSegura, archivo);
        if (errorSubida) {
          if (estado) estado.textContent = "No se pudo subir: " + errorSubida.message;
          boton.disabled = false;
          boton.textContent = "Enviar entrega";
          return;
        }
        const { error: errorInsert } = await sb.from("proyecto_entregas").insert({
          trabajo_id: trabajoId,
          estudiante_id: estudianteId,
          titulo: f.get("titulo"),
          descripcion,
          archivo_ruta: rutaSegura,
          archivo_nombre: archivo.name
        });
        if (errorInsert) {
          if (estado) estado.textContent = "No se pudo guardar la entrega: " + errorInsert.message;
          boton.disabled = false;
          boton.textContent = "Enviar entrega";
          return;
        }
        renderNotasInterno(el, s, isSelf, activa);
      });
    });
  }
}

// --- Tareas ---

function renderTareasConCategoria(el, s, isSelf, cat) {
  return renderTareas(el, s, isSelf, cat);
}

async function renderTareas(el, s, isSelf, categoriaActiva) {
  el.innerHTML = "Cargando…";
  const { data: tareas } = await sb.from("tareas").select("*, materias(nombre), resultados_aprendizaje(resultado)").eq("estudiante_id", s.id).order("fecha", { ascending: true });
  const { data: categorias } = await sb.from("rubrica_categorias").select("*").order("orden");

  function filaTarea(t) {
    return `
      <div class="task-row ${t.hecha ? "done" : ""}">
        <input type="checkbox" data-toggle="${t.id}" ${t.hecha ? "checked" : ""} />
        <div style="flex:1;">
          <span class="task-title">${t.materias?.nombre ? `[${t.materias.nombre}] ` : ""}${t.titulo}</span>
          ${t.resultados_aprendizaje?.resultado ? `<div style="font-size:0.78rem; color:var(--text-muted); font-style:italic; margin-top:0.15rem;">Resultado de aprendizaje: ${t.resultados_aprendizaje.resultado}</div>` : ""}
        </div>
        <span class="task-due">${t.fecha || ""}</span>
        ${!isSelf ? `<button class="btn danger small" data-del="${t.id}">Eliminar</button>` : ""}
      </div>`;
  }

  // Agrupa las asignaciones por categoría de la rúbrica (Trabajo cotidiano, Pruebas, Proyectos…).
  const nombresCategoria = (categorias || []).map(c => c.nombre);
  const sinCategoria = (tareas || []).filter(t => !nombresCategoria.includes(t.categoria));
  const nombresConSin = sinCategoria.length > 0 ? [...nombresCategoria, "Sin categoría"] : nombresCategoria;

  function itemsDe(nombre) {
    return nombre === "Sin categoría" ? sinCategoria : (tareas || []).filter(t => t.categoria === nombre);
  }

  const activa = categoriaActiva || nombresConSin[0] || null;

  const botones = nombresConSin.map(nombre => {
    const items = itemsDe(nombre);
    const pendientes = items.filter(t => !t.hecha).length;
    return `
      <button class="cat-navlink ${nombre === activa ? "active" : ""}" data-cat="${nombre}">
        ${nombre}${pendientes > 0 ? `<span class="cat-navlink-badge">${pendientes}</span>` : ""}
      </button>`;
  }).join("");

  const itemsActivos = activa ? itemsDe(activa) : [];

  let materiaOptions = "", categoriaOptions = "", resultadoOptions = "";
  if (!isSelf) {
    const { data: asignadas } = await sb.from("estudiante_materias").select("materias(id, nombre)").eq("estudiante_id", s.id);
    materiaOptions = `<option value="">(general)</option>` + (asignadas || []).map(a => a.materias ? `<option value="${a.materias.id}">${a.materias.nombre}</option>` : "").join("");
    categoriaOptions = `<option value="">Sin categoría</option>` + nombresCategoria.map(n => `<option value="${n}" ${n === activa ? "selected" : ""}>${n}</option>`).join("");

    const materiaIds = (asignadas || []).map(a => a.materias?.id).filter(Boolean);
    if (materiaIds.length > 0) {
      const { data: unidades } = await sb.from("programa").select("id, unidad, materias(nombre)").in("materia_id", materiaIds);
      const programaIds = (unidades || []).map(u => u.id);
      if (programaIds.length > 0) {
        const { data: resultados } = await sb.from("resultados_aprendizaje").select("id, resultado, programa_id").in("programa_id", programaIds);
        resultadoOptions = `<option value="">— Sin vincular a un resultado —</option>` + (unidades || []).map(u => {
          const items = (resultados || []).filter(r => r.programa_id === u.id);
          if (items.length === 0) return "";
          return `<optgroup label="${u.materias?.nombre || ""} — ${u.unidad}">
            ${items.map(r => `<option value="${r.id}">${r.resultado.slice(0, 90)}${r.resultado.length > 90 ? "…" : ""}</option>`).join("")}
          </optgroup>`;
        }).join("");
      }
    }
  }

  el.innerHTML = `
    <nav class="cat-navbar">${botones || '<span style="color:#cdd6da; font-size:0.85rem;">No hay categorías de rúbrica definidas.</span>'}</nav>
    ${activa ? `
      <h3>${activa}</h3>
      <div>${itemsActivos.map(filaTarea).join("") || '<p class="empty">Sin asignaciones todavía en esta categoría.</p>'}</div>` : ""}
    ${!isSelf ? `
    <form class="inline-form" id="task-form" style="margin-top:1.4rem;">
      <select name="materia_id">${materiaOptions}</select>
      <select name="categoria">${categoriaOptions}</select>
      <input name="titulo" placeholder="Tarea (ej. Asiento de diario)" required style="flex:1; min-width:10rem" />
      <input name="fecha" type="date" />
      <select name="resultado_id" style="flex-basis:100%;">${resultadoOptions || '<option value="">Sin resultados de aprendizaje disponibles (vincula la materia en "Programa")</option>'}</select>
      <button class="btn small" type="submit">Agregar tarea</button>
    </form>` : ""}`;

  el.querySelectorAll(".cat-navlink").forEach(btn => {
    btn.addEventListener("click", () => {
      renderTareasConCategoria(el, s, isSelf, btn.dataset.cat);
    });
  });

  el.querySelectorAll("[data-toggle]").forEach(cb => {
    cb.addEventListener("change", async () => {
      await sb.from("tareas").update({ hecha: cb.checked }).eq("id", cb.dataset.toggle);
      renderTareasConCategoria(el, s, isSelf, activa);
    });
  });
  if (!isSelf) {
    el.querySelectorAll("[data-del]").forEach(btn => {
      btn.addEventListener("click", async () => {
        await sb.from("tareas").delete().eq("id", btn.dataset.del);
        renderTareasConCategoria(el, s, isSelf, activa);
      });
    });
    const form = el.querySelector("#task-form");
    if (form) form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      await sb.from("tareas").insert({
        estudiante_id: s.id,
        materia_id: f.get("materia_id") ? Number(f.get("materia_id")) : null,
        categoria: f.get("categoria") || null,
        resultado_id: f.get("resultado_id") ? Number(f.get("resultado_id")) : null,
        titulo: f.get("titulo"),
        fecha: f.get("fecha") || null,
        hecha: false
      });
      renderTareasConCategoria(el, s, isSelf, f.get("categoria") || activa);
    });
  }
}

// --- Programa del estudiante: contenido de las materias que tiene asignadas ---

async function renderProgramaEstudiante(el, s) {
  el.innerHTML = "Cargando…";
  const { data: asignadas } = await sb.from("estudiante_materias").select("materia_id").eq("estudiante_id", s.id);
  const materiaIds = (asignadas || []).map(a => a.materia_id);

  if (materiaIds.length === 0) {
    el.innerHTML = `<p class="empty">Este estudiante todavía no tiene materias asignadas.</p>`;
    return;
  }

  const { data: unidades } = await sb.from("programa").select("*").in("materia_id", materiaIds);

  if (!unidades || unidades.length === 0) {
    el.innerHTML = `<p class="empty">Las materias asignadas todavía no están vinculadas a ninguna unidad del programa. Ve a "Programa" (menú del profesor) y vincula la unidad correspondiente desde cada materia.</p>`;
    return;
  }

  const { data: misTareas } = await sb.from("tareas").select("id, titulo, hecha, resultado_id").eq("estudiante_id", s.id).not("resultado_id", "is", null);

  let html = "";
  for (const u of unidades) {
    const { data: items } = await sb.from("resultados_aprendizaje").select("*").eq("programa_id", u.id).order("id");

    // El profesor decide, por unidad, cuáles columnas extra ve el estudiante.
    const cols = [{ key: "resultado", label: "Resultado de Aprendizaje", w: "1.1fr" }, { key: "saberes", label: "Saberes Esenciales", w: "1.1fr" }];
    if (u.mostrar_estrategias) cols.push({ key: "estrategias", label: "Estrategias de mediación", w: "1.1fr" });
    if (u.mostrar_evidencias) cols.push({ key: "evidencias", label: "Evidencias de aprendizaje", w: "1.1fr" });
    if (u.mostrar_tiempo) cols.push({ key: "tiempo", label: "Tiempo", w: "90px" });
    cols.push({ key: "estado", label: "Estado", w: "90px" });
    const gridStyle = `grid-template-columns:${cols.map(c => c.w).join(" ")};`;

    html += `
      <h3 style="margin-top:1.4rem;">${u.unidad}</h3>
      <p style="color:var(--text-muted); font-size:0.85rem; margin-top:-0.6em;">${u.nivel} · ${u.subarea}</p>
      <div class="roa-table">
        <div class="roa-row roa-head" style="${gridStyle}">
          ${cols.map(c => `<div>${c.label}</div>`).join("")}
        </div>
        ${(items || []).map(it => {
          const tareasVinculadas = (misTareas || []).filter(t => t.resultado_id === it.id);
          return `
          <div class="roa-row" style="${gridStyle}">
            ${cols.map(c => {
              if (c.key === "resultado") return `<div class="roa-cell-texto">${it.resultado}${tareasVinculadas.length > 0 ? `<div style="margin-top:0.5rem; font-size:0.8rem;">${tareasVinculadas.map(t => `<div>${t.hecha ? "✓" : "○"} ${t.titulo}</div>`).join("")}</div>` : ""}</div>`;
              if (c.key === "estado") return `<div style="text-align:center;"><span class="badge" style="${it.impartido ? "" : "opacity:0.5;"}">${it.impartido ? "Impartido" : "No impartido"}</span></div>`;
              return `<div class="roa-cell-texto">${it[c.key] || ""}</div>`;
            }).join("")}
          </div>`;
        }).join("")}
      </div>`;
  }
  el.innerHTML = html;
}

// --- Rúbrica del estudiante: solo lectura, siempre igual a la del profesor ---

async function renderRubricaEstudiante(el, s, isSelf) {
  el.innerHTML = "Cargando…";
  const { data: categorias } = await sb.from("rubrica_categorias").select("*").order("orden");
  const { data: asignadas } = await sb.from("estudiante_materias").select("materia_id, materias(id, nombre)").eq("estudiante_id", s.id);
  const materiasAsignadas = (asignadas || []).map(a => a.materias).filter(Boolean);
  const { data: notas } = await sb.from("notas").select("*").eq("estudiante_id", s.id);

  if (!categorias || categorias.length === 0) {
    el.innerHTML = `<p class="empty">El profesor todavía no ha definido la rúbrica.</p>`;
    return;
  }

  const sumaTotal = categorias.reduce((a, c) => a + Number(c.porcentaje || 0), 0);

  let html = `
    <p style="font-size:0.85rem; color:var(--text-muted);">Esta es la rúbrica de evaluación definida por el profesor. Es solo informativa — no se puede modificar desde aquí.</p>
    <table class="grades">
      <thead><tr><th>Componente</th><th>Peso en la nota final</th></tr></thead>
      <tbody>
        ${categorias.map(c => `<tr><td>${c.nombre}</td><td class="num">${c.porcentaje}%</td></tr>`).join("")}
      </tbody>
    </table>
    <p style="font-size:0.8rem; color:var(--text-muted);">Suma total: ${sumaTotal}%</p>`;

  if (materiasAsignadas.length === 0) {
    html += `<p class="empty">Todavía no tienes materias asignadas.</p>`;
  } else {
    for (const m of materiasAsignadas) {
      const notasMateria = (notas || []).filter(n => n.materia_id === m.id);
      html += `<h3 style="margin-top:1.4rem;">${m.nombre}</h3>`;
      const filas = [];
      for (const c of categorias) {
        let promedio = null;
        if (c.nombre.trim().toLowerCase() === "asistencia") {
          const resultado = await calcularNotaAsistencia(s.id, m.id);
          promedio = resultado ? resultado.nota : null;
        } else {
          const porIndicadores = await calcularNotaIndicadores(s.id, m.id, c.nombre, isSelf);
          if (porIndicadores) {
            promedio = porIndicadores.nota;
          } else {
            const notasCat = notasMateria.filter(n => n.rubro === c.nombre);
            promedio = notasCat.length ? notasCat.reduce((a, n) => a + Number(n.nota), 0) / notasCat.length : null;
          }
        }
        const aporte = promedio !== null ? (promedio * c.porcentaje / 100).toFixed(1) : "—";
        filas.push(`<tr>
          <td>${c.nombre}</td>
          <td class="num">${c.porcentaje}%</td>
          <td class="num ${promedio !== null && promedio < 70 ? "low" : ""}">${promedio !== null ? promedio.toFixed(1) : "Sin datos"}</td>
          <td class="num">${aporte}</td>
        </tr>`);
      }
      html += `
        <table class="grades">
          <thead><tr><th>Componente</th><th>Peso</th><th>Tu promedio</th><th>Aporte</th></tr></thead>
          <tbody>${filas.join("")}</tbody>
        </table>`;
    }
  }

  el.innerHTML = html;
}

// --- Avisos del estudiante: publicaciones de su sección, solo lectura ---

// --- Materias del estudiante: temas (apartados) y trabajos cotidianos pendientes ---

async function renderMateriasEstudiante(el, s) {
  el.innerHTML = "Cargando…";
  const { data: asignadas } = await sb.from("estudiante_materias").select("materia_id, materias(id, nombre)").eq("estudiante_id", s.id);
  const materiasAsignadas = (asignadas || []).map(a => a.materias).filter(Boolean);

  const accesoAulaConta = `
    <div class="section-grid" style="margin-bottom:1.4rem; max-width:860px;">
      <a class="section-tile flip-card" href="${AULA_CONTABLE_URL}?como_estudiante=${encodeURIComponent(s.id)}" style="height:180px;">
        <div class="flip-card-inner">
          <div class="flip-card-front">
            <div class="num" style="font-size:1.7rem;">🧮 Aula de Conta</div>
            <div class="count" style="font-size:0.95rem;">Simulador del ciclo contable (NIC/NIIF)</div>
          </div>
          <div class="flip-card-back">
            <div class="flip-cta" style="font-size:1.3rem;">Abrir aula →</div>
            <div class="flip-sub" style="font-size:0.9rem;">Aula de Conta</div>
          </div>
        </div>
      </a>
      <a class="section-tile flip-card" href="${SIMULADOR_B2B_URL}" style="height:180px;">
        <div class="flip-card-inner">
          <div class="flip-card-front">
            <div class="num" style="font-size:1.7rem;">🏆 ContaRed</div>
            <div class="count" style="font-size:0.95rem;">Simulador B2B: fundá tu firma y competí</div>
          </div>
          <div class="flip-card-back">
            <div class="flip-cta" style="font-size:1.3rem;">Abrir ContaRed →</div>
            <div class="flip-sub" style="font-size:0.9rem;">ContaRed</div>
          </div>
        </div>
      </a>
      <a class="section-tile flip-card" href="tiradera.html?nombre=${encodeURIComponent(`${s.nombre || ""} ${s.apellido1 || ""} ${s.apellido2 || ""}`.replace(/\s+/g, " ").trim())}&est=${encodeURIComponent(s.id)}" style="height:180px;">
        <div class="flip-card-inner">
          <div class="flip-card-front">
            <div class="num" style="font-size:1.7rem;">⚡ La Tiradera</div>
            <div class="count" style="font-size:0.95rem;">Entrá con el PIN que da el profe y competí por el podio</div>
          </div>
          <div class="flip-card-back">
            <div class="flip-cta" style="font-size:1.3rem;">Jugar →</div>
            <div class="flip-sub" style="font-size:0.9rem;">La Tiradera</div>
          </div>
        </div>
      </a>
    </div>`;

  if (materiasAsignadas.length === 0) {
    el.innerHTML = `${accesoAulaConta}<p class="empty">Todavía no tienes materias asignadas.</p>`;
    return;
  }

  let html = accesoAulaConta;
  const panelDataPorMateria = {};
  for (const m of materiasAsignadas) {
    html += `<h3 style="margin-top:1.4rem;">${m.nombre}</h3>`;

    const { data: unidades } = await sb.from("programa").select("id").eq("materia_id", m.id);
    const programaIds = (unidades || []).map(u => u.id);
    let apartados = [];
    if (programaIds.length > 0) {
      const { data: resultados } = await sb.from("resultados_aprendizaje").select("id").in("programa_id", programaIds);
      const resultadoIds = (resultados || []).map(r => r.id);
      if (resultadoIds.length > 0) {
        const { data: pubs } = await sb.from("publicaciones").select("*").in("resultado_id", resultadoIds).eq("tipo", "apartado").eq("habilitado", true);
        apartados = pubs || [];
      }
    }

    const { data: cuadrosMateria } = await sb.from("materia_cuadros").select("*").eq("materia_id", m.id).order("orden").order("creado_en");
    const listaCuadrosMateria = cuadrosMateria || [];
    const temasPorCuadroEst = {};
    apartados.forEach(a => {
      const clave = a.cuadro_id || "sin";
      if (!temasPorCuadroEst[clave]) temasPorCuadroEst[clave] = [];
      temasPorCuadroEst[clave].push(a);
    });
    const filaTemaEst = (a) => `<a class="roster-row" href="#/apartado/${a.id}"><span class="name clamp2" title="${a.titulo.replace(/"/g, "&quot;")}">${a.titulo}</span><span class="badge">Ver</span></a>`;

    html += `<p style="font-size:0.8rem; color:var(--text-muted); margin-top:-0.4em;">Temas</p>`;
    if (listaCuadrosMateria.length === 0) {
      html += `
      <div class="roster" style="margin-bottom:1rem;">
        ${apartados.map(filaTemaEst).join("") || '<p class="empty">Sin temas habilitados todavía.</p>'}
      </div>`;
    } else {
      const sinCuadro = temasPorCuadroEst.sin || [];
      panelDataPorMateria[m.id] = { cuadros: listaCuadrosMateria, temas: temasPorCuadroEst };
      const tarjetaCuadro = (clave, titulo, cantidad) => `
        <button type="button" class="section-tile flip-card" data-cuadro-toggle="${m.id}|${clave}" style="border:none; background:none; padding:0; width:100%; text-align:left; cursor:pointer; font:inherit;">
          <div class="flip-card-inner">
            <div class="flip-card-front">
              <div class="num" style="font-size:1.15rem;">📦 ${titulo}</div>
              <div class="count">${cantidad} tema${cantidad === 1 ? "" : "s"}</div>
            </div>
            <div class="flip-card-back">
              <div class="flip-cta">Ver temas →</div>
              <div class="flip-sub">${titulo}</div>
            </div>
          </div>
        </button>`;
      html += `
      <div class="section-grid" style="margin-top:0; margin-bottom:0.8rem;">
        ${listaCuadrosMateria.map(c => tarjetaCuadro(c.id, c.titulo, (temasPorCuadroEst[c.id] || []).length)).join("")}
        ${sinCuadro.length ? tarjetaCuadro("sin", "Otros temas", sinCuadro.length) : ""}
      </div>
      <div class="roster" id="cuadro-panel-${m.id}" style="margin-bottom:1rem;"></div>`;
    }

    const { data: cursos } = programaIds.length
      ? await sb.from("cursos_interactivos").select("*").in("programa_id", programaIds).eq("habilitado", true)
      : { data: [] };
    html += `
      <p style="font-size:0.8rem; color:var(--text-muted);">Cursos interactivos</p>
      <div class="roster" style="margin-bottom:1rem;">
        ${(cursos || []).map(c => `<a class="roster-row" href="#/curso/${c.id}"><span class="name">${c.titulo}</span><span class="badge">Jugar</span></a>`).join("") || '<p class="empty">Sin cursos interactivos habilitados todavía.</p>'}
      </div>`;

    // Trabajos cotidianos pendientes, de todos los temas de esta materia.
    const apartadoIds = apartados.map(a => a.id);
    let trabajos = [];
    if (apartadoIds.length > 0) {
      const { data: tc } = await sb.from("trabajos_cotidianos").select("*, publicaciones(titulo)").in("publicacion_id", apartadoIds).order("fecha");
      trabajos = tc || [];
    }
    const trabajoIds = trabajos.map(t => t.id);
    const { data: misEstados } = trabajoIds.length
      ? await sb.from("trabajos_cotidianos_estudiante").select("*").eq("estudiante_id", s.id).in("trabajo_id", trabajoIds)
      : { data: [] };
    const porTrabajo = {};
    (misEstados || []).forEach(e => { porTrabajo[e.trabajo_id] = e.completado; });

    html += `
      <p style="font-size:0.8rem; color:var(--text-muted);">Trabajos por realizar</p>
      <div class="roster" id="trabajos-materia-${m.id}">
        ${trabajos.map(t => `
          <div class="roster-row">
            <span class="name">${t.titulo}${t.fecha ? " · " + t.fecha : ""}<span style="color:var(--text-muted); font-size:0.78rem;"> (${t.publicaciones?.titulo || ""})</span></span>
            <label style="display:flex; align-items:center; gap:0.4rem; font-size:0.85rem;">
              <input type="checkbox" data-mi-trabajo-materia="${t.id}" ${porTrabajo[t.id] ? "checked" : ""} /> Completado
            </label>
          </div>`).join("") || '<p class="empty">No hay trabajos pendientes en esta materia.</p>'}
      </div>`;
  }

  el.innerHTML = html;
  el.querySelectorAll("[data-cuadro-toggle]").forEach(btn => {
    btn.addEventListener("click", () => {
      const [materiaId, cuadroKey] = btn.dataset.cuadroToggle.split("|");
      const panel = document.getElementById(`cuadro-panel-${materiaId}`);
      const datos = panelDataPorMateria[materiaId];
      if (!panel || !datos) return;
      if (panel.dataset.abierto === cuadroKey) {
        panel.innerHTML = "";
        panel.dataset.abierto = "";
        return;
      }
      const temas = datos.temas[cuadroKey] || [];
      panel.dataset.abierto = cuadroKey;
      panel.innerHTML = temas.map(a => `<a class="roster-row" href="#/apartado/${a.id}"><span class="name clamp2" title="${a.titulo.replace(/"/g, "&quot;")}">${a.titulo}</span><span class="badge">Ver</span></a>`).join("") || '<p class="empty">Sin temas en este cuadro todavía.</p>';
    });
  });
  el.querySelectorAll("[data-mi-trabajo-materia]").forEach(cb => {
    cb.addEventListener("change", async () => {
      await sb.from("trabajos_cotidianos_estudiante").upsert(
        { trabajo_id: cb.dataset.miTrabajoMateria, estudiante_id: s.id, completado: cb.checked, entregado_en: cb.checked ? new Date().toISOString() : null },
        { onConflict: "trabajo_id,estudiante_id" }
      );
    });
  });
}

async function renderAvisosEstudiante(el, s) {
  el.innerHTML = "Cargando…";
  const { data: todasPubs } = await sb.from("publicaciones").select("*, materias(nombre)").eq("seccion", s.seccion).order("creado_en", { ascending: false });
  const apartados = (todasPubs || []).filter(p => p.tipo === "apartado" && p.habilitado);
  const pubs = (todasPubs || []).filter(p => p.tipo !== "apartado");

  el.innerHTML = `
    ${apartados.length > 0 ? `
    <h3 style="margin-top:0;">Apartados por tema</h3>
    <div class="roster" style="margin-bottom:1.4rem;">
      ${apartados.map(a => `
        <a class="roster-row" href="#/apartado/${a.id}">
          <span class="name clamp2" title="${a.titulo.replace(/"/g, "&quot;")}">${a.titulo}</span>
          <span class="badge">Ver</span>
        </a>`).join("")}
    </div>` : ""}
    <div class="roster">
      ${(pubs || []).map(p => `
        <div class="roster-row" style="align-items:flex-start; flex-direction:column; gap:0.3rem;">
          <span class="name">
            <span class="badge" style="margin-right:0.5rem;">${p.tipo === "material" ? "Material" : "Aviso"}</span>
            ${p.titulo}${p.materias?.nombre ? ` · ${p.materias.nombre}` : ""}
          </span>
          ${p.contenido ? `<div class="roa-cell-texto" style="font-size:0.85rem;">${p.contenido}</div>` : ""}
          ${p.url ? `<a href="${p.url}" target="_blank" rel="noopener" style="font-size:0.82rem;">${p.url}</a>` : ""}
          <span style="font-size:0.75rem; color:var(--text-muted);">${new Date(p.creado_en).toLocaleDateString("es-CR")}</span>
        </div>`).join("") || '<p class="empty">Todavía no hay publicaciones.</p>'}
    </div>`;
}

// --- Récord de asistencia del estudiante (visible para profesor y el propio estudiante) ---

async function renderAsistenciaEstudiante(el, s) {
  el.innerHTML = "Cargando…";
  const { data: asignadas } = await sb.from("estudiante_materias").select("materia_id, materias(id, nombre)").eq("estudiante_id", s.id);
  const materiasAsignadas = (asignadas || []).map(a => a.materias).filter(Boolean);

  if (materiasAsignadas.length === 0) {
    el.innerHTML = `<p class="empty">Todavía no tienes materias asignadas.</p>`;
    return;
  }

  let html = `<p style="font-size:0.85rem; color:var(--text-muted);">Récord de asistencia por materia, según el artículo 31° del REA (ausencias y tardías injustificadas).</p>`;

  for (const m of materiasAsignadas) {
    const { data: lecciones } = await sb.from("lecciones").select("id").eq("materia_id", m.id);
    const leccionIds = (lecciones || []).map(l => l.id);
    const { data: registros } = leccionIds.length
      ? await sb.from("asistencia_lecciones").select("*").in("leccion_id", leccionIds).eq("estudiante_id", s.id).order("fecha", { ascending: false })
      : { data: [] };

    const conteos = {};
    ESTADOS_ASISTENCIA.forEach(e => { conteos[e.v] = 0; });
    (registros || []).forEach(r => { conteos[r.estado] = (conteos[r.estado] || 0) + 1; });

    const resultado = await calcularNotaAsistencia(s.id, m.id);

    html += `
      <h3 style="margin-top:1.4rem;">${m.nombre}</h3>
      <div class="roster" style="margin-bottom:0.8rem;">
        <div class="roster-row"><span class="name">% de asistencia (nota)</span><span class="badge" style="${resultado && resultado.nota < 70 ? "color:var(--brick); border-color:var(--brick);" : ""}">${resultado ? resultado.nota.toFixed(1) + "%" : "Sin datos todavía"}</span></div>
        ${resultado ? `<div class="roster-row"><span class="name">Lecciones impartidas</span><span class="badge">${resultado.impartidas}</span></div>` : ""}
        ${ESTADOS_ASISTENCIA.map(e => `<div class="roster-row"><span class="name">${e.l}</span><span class="badge" style="opacity:${conteos[e.v] > 0 ? 1 : 0.4};">${conteos[e.v]}</span></div>`).join("")}
      </div>
      <details>
        <summary style="font-size:0.82rem; color:var(--text-muted); cursor:pointer;">Ver el detalle día por día</summary>
        <table class="grades" style="margin-top:0.6rem;">
          <thead><tr><th>Fecha</th><th>Estado</th></tr></thead>
          <tbody>
            ${(registros || []).map(r => `<tr><td>${r.fecha}</td><td>${ESTADOS_ASISTENCIA.find(e => e.v === r.estado)?.l || r.estado}</td></tr>`).join("") || '<tr><td colspan="2" class="empty">Sin registros todavía.</td></tr>'}
          </tbody>
        </table>
      </details>`;
  }

  el.innerHTML = html;
}

// --- Apartado de un resultado de aprendizaje: introducción + trabajos cotidianos ---

// ---------- Curso interactivo (Antología → Selección única → Asocie → Certificado) ----------

async function renderCurso(id, soloLectura) {
  const { data: curso } = await sb.from("cursos_interactivos").select("*").eq("id", id).maybeSingle();
  if (!curso) { location.hash = "#/"; return; }
  if (soloLectura && !curso.habilitado) { location.hash = "#/"; return; }

  let progreso = null;
  if (soloLectura) {
    const { data: p } = await sb.from("progreso_curso").select("*").eq("curso_id", id).eq("estudiante_id", session.id).maybeSingle();
    progreso = p || { antologia_vista: false, asocie_completado: false, completado: false };
  }

  const pasoInicial = !soloLectura ? "antologia" : (progreso.completado ? "cert" : progreso.asocie_completado ? "cert" : progreso.antologia_vista ? "mc" : "antologia");
  pintarPasoCurso(curso, soloLectura, progreso, pasoInicial);
}

async function pintarPasoCurso(curso, soloLectura, progreso, paso) {
  app.innerHTML = `
    ${topbar()}
    <div class="wrap">
      <a href="${soloLectura ? "#/" : "#/materias"}" class="btn secondary small" style="margin-bottom:1rem; display:inline-block;">&larr; ${soloLectura ? "Volver a mi perfil" : "Materias"}</a>
      <h1>${curso.titulo}</h1>
      <p style="color:var(--text-muted); margin-top:-0.6em;">${curso.subtitulo || ""}</p>
      ${!soloLectura ? `
      <div class="whatsapp-panel" style="max-width:420px; margin:1rem 0;">
        <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.85rem;">
          <input type="checkbox" id="toggle-curso-habilitado" ${curso.habilitado ? "checked" : ""} /> Curso habilitado para estudiantes
        </label>
      </div>` : ""}
      <nav class="cat-navbar">
        <button class="cat-navlink ${paso === "antologia" ? "active" : ""}" data-paso="antologia">Antología</button>
        <button class="cat-navlink ${paso === "mc" ? "active" : ""}" data-paso="mc">Selección única</button>
        <button class="cat-navlink ${paso === "asocie" ? "active" : ""}" data-paso="asocie">Asocie</button>
        <button class="cat-navlink ${paso === "cert" ? "active" : ""}" data-paso="cert">Certificado</button>
      </nav>
      <div id="curso-paso-contenido" style="margin-top:1rem;">Cargando…</div>
    </div>`;
  bindTopbar();

  if (!soloLectura) {
    document.getElementById("toggle-curso-habilitado").addEventListener("change", async (e) => {
      await sb.from("cursos_interactivos").update({ habilitado: e.target.checked }).eq("id", curso.id);
    });
  }

  document.querySelectorAll("[data-paso]").forEach(btn => {
    btn.addEventListener("click", () => pintarPasoCurso(curso, soloLectura, progreso, btn.dataset.paso));
  });

  const contenido = document.getElementById("curso-paso-contenido");
  if (paso === "antologia") return pintarAntologia(curso, soloLectura, progreso, contenido);
  if (paso === "mc") return pintarMC(curso, soloLectura, progreso, contenido);
  if (paso === "asocie") return pintarAsocie(curso, soloLectura, progreso, contenido);
  if (paso === "cert") return pintarCertificado(curso, soloLectura, progreso, contenido);
}

function pintarAntologia(curso, soloLectura, progreso, contenido) {
  contenido.innerHTML = `
    <div class="roa-cell-texto" style="background:var(--white); border:1px solid var(--paper-line); padding:1.5rem;">
      ${curso.antologia_html || '<p class="empty">Todavía no hay contenido de antología.</p>'}
    </div>
    ${soloLectura ? `<div class="row" style="margin-top:1rem;"><button class="btn" id="continuar-antologia">Continuar a Selección única</button></div>` : ""}`;

  const btn = document.getElementById("continuar-antologia");
  if (btn) btn.addEventListener("click", async () => {
    await sb.from("progreso_curso").upsert(
      { curso_id: curso.id, estudiante_id: session.id, antologia_vista: true },
      { onConflict: "curso_id,estudiante_id" }
    );
    progreso.antologia_vista = true;
    pintarPasoCurso(curso, soloLectura, progreso, "mc");
  });
}

async function pintarMC(curso, soloLectura, progreso, contenido) {
  contenido.innerHTML = "Cargando…";
  const { data: preguntas } = await sb.from("curso_mc").select("*").eq("curso_id", curso.id).order("orden");

  contenido.innerHTML = `
    <form id="mc-form">
      ${(preguntas || []).map((p, i) => `
        <div class="whatsapp-panel" style="max-width:100%; margin-bottom:0.8rem;">
          <p style="font-weight:600; margin:0 0 0.6rem;">${i + 1}. ${p.pregunta}</p>
          ${p.opciones.map((op, oi) => `
            <label style="display:flex; align-items:center; gap:0.5rem; padding:0.3rem 0; font-size:0.9rem;">
              <input type="radio" name="p${p.id}" value="${oi}" ${!soloLectura ? "disabled" : ""} required />
              ${op}
            </label>`).join("")}
        </div>`).join("") || '<p class="empty">Todavía no hay preguntas en este curso.</p>'}
      ${soloLectura && (preguntas || []).length > 0 ? `<button class="btn" type="submit">Enviar respuestas</button>` : ""}
    </form>
    <div id="mc-resultado"></div>`;

  if (!soloLectura) return; // el profesor solo revisa el contenido, no lo responde

  const form = document.getElementById("mc-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    let correctas = 0;
    (preguntas || []).forEach(p => {
      const seleccionado = form.querySelector(`input[name="p${p.id}"]:checked`);
      if (seleccionado && Number(seleccionado.value) === p.correcta) correctas++;
    });
    const total = (preguntas || []).length;
    await sb.from("progreso_curso").upsert(
      { curso_id: curso.id, estudiante_id: session.id, antologia_vista: true, mc_correctas: correctas, mc_total: total },
      { onConflict: "curso_id,estudiante_id" }
    );
    document.getElementById("mc-resultado").innerHTML = `
      <div class="whatsapp-panel" style="max-width:420px; margin-top:1rem;">
        <strong>Resultado: ${correctas} de ${total} correctas (${((correctas / total) * 100).toFixed(0)}%)</strong>
        <div class="row" style="margin-top:0.8rem;"><button class="btn" id="continuar-mc">Continuar a Asocie</button></div>
      </div>`;
    document.getElementById("continuar-mc").addEventListener("click", () => {
      progreso.mc_correctas = correctas; progreso.mc_total = total;
      pintarPasoCurso(curso, soloLectura, progreso, "asocie");
    });
  });
}

async function pintarAsocie(curso, soloLectura, progreso, contenido) {
  contenido.innerHTML = "Cargando…";
  const { data: pares } = await sb.from("curso_asocie").select("*").eq("curso_id", curso.id).order("orden");
  const definicionesMezcladas = [...(pares || [])].sort(() => Math.random() - 0.5);

  contenido.innerHTML = `
    <form id="asocie-form">
      <table class="grades">
        <thead><tr><th>Concepto</th><th>Elige la definición correcta</th></tr></thead>
        <tbody>
          ${(pares || []).map(p => `
            <tr>
              <td style="font-weight:600;">${p.concepto}</td>
              <td>
                <select name="c${p.id}" ${!soloLectura ? "disabled" : ""} required style="width:100%; padding:0.4rem; border:1px solid var(--paper-line); border-radius:3px; font-family:var(--sans); font-size:0.85rem;">
                  <option value="">Selecciona…</option>
                  ${definicionesMezcladas.map(d => `<option value="${d.id}">${d.definicion}</option>`).join("")}
                </select>
              </td>
            </tr>`).join("") || `<tr><td colspan="2" class="empty">Todavía no hay pares en este curso.</td></tr>`}
        </tbody>
      </table>
      ${soloLectura && (pares || []).length > 0 ? `<button class="btn" type="submit" style="margin-top:1rem;">Verificar</button>` : ""}
    </form>
    <div id="asocie-resultado"></div>`;

  if (!soloLectura) return;

  const form = document.getElementById("asocie-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    let correctas = 0;
    (pares || []).forEach(p => {
      const sel = form.querySelector(`select[name="c${p.id}"]`);
      if (sel && Number(sel.value) === p.id) correctas++;
    });
    const total = (pares || []).length;
    await sb.from("progreso_curso").upsert(
      { curso_id: curso.id, estudiante_id: session.id, asocie_completado: true },
      { onConflict: "curso_id,estudiante_id" }
    );
    document.getElementById("asocie-resultado").innerHTML = `
      <div class="whatsapp-panel" style="max-width:420px; margin-top:1rem;">
        <strong>Resultado: ${correctas} de ${total} correctas</strong>
        <div class="row" style="margin-top:0.8rem;"><button class="btn" id="continuar-asocie">Ver certificado</button></div>
      </div>`;
    document.getElementById("continuar-asocie").addEventListener("click", async () => {
      await sb.from("progreso_curso").upsert(
        { curso_id: curso.id, estudiante_id: session.id, completado: true, completado_en: new Date().toISOString() },
        { onConflict: "curso_id,estudiante_id" }
      );
      progreso.asocie_completado = true; progreso.completado = true;
      pintarPasoCurso(curso, soloLectura, progreso, "cert");
    });
  });
}

function pintarCertificado(curso, soloLectura, progreso, contenido) {
  const completado = soloLectura && progreso.completado;
  contenido.innerHTML = `
    <div style="background:var(--white); border:3px double var(--ledger-green); padding:2.5rem; text-align:center; max-width:560px; margin:1rem auto;">
      <h2 style="font-family:var(--serif);">Certificado de finalización</h2>
      ${completado ? `
        <p style="margin:1.2rem 0;">Se certifica que</p>
        <p style="font-family:var(--serif); font-size:1.3rem; font-weight:700;">${session.nombre}</p>
        <p style="margin:1.2rem 0;">completó satisfactoriamente el curso</p>
        <p style="font-family:var(--serif); font-size:1.1rem; font-weight:600;">${curso.titulo}</p>
        <p style="color:var(--text-muted); font-size:0.85rem; margin-top:1.5rem;">${INSTITUCION.nombre} · ${new Date().toLocaleDateString("es-CR")}</p>
      ` : `<p class="empty" style="margin-top:1rem;">Todavía te falta completar la Antología, Selección única y Asocie para obtener tu certificado.</p>`}
    </div>`;
}

async function renderApartado(id, soloLectura) {
  const { data: pub } = await sb.from("publicaciones").select("*").eq("id", id).maybeSingle();
  if (!pub) { location.hash = soloLectura ? "#/" : "#/publicaciones"; return; }
  if (soloLectura && !pub.habilitado) { location.hash = "#/"; return; }
  const { data: resultado } = pub.resultado_id ? await sb.from("resultados_aprendizaje").select("*").eq("id", pub.resultado_id).maybeSingle() : { data: null };
  const { data: materiales } = await sb.from("materiales").select("*").eq("publicacion_id", id).is("subtema_id", null).order("creado_en");
  const { data: subtemas } = await sb.from("subtemas").select("*").eq("publicacion_id", id).order("orden").order("creado_en");

  let totalEstudiantes = 0;
  if (!soloLectura) {
    const { data: est } = await sb.from("estudiantes").select("id").eq("seccion", pub.seccion);
    totalEstudiantes = (est || []).length;
  }

  // El título del tema lo pone el profesor (editable desde la ficha de la
  // materia); si todavía no le puso uno propio, se usa el resultado de
  // aprendizaje del programa como respaldo.
  const tituloMostrar = (pub.titulo || (resultado && resultado.resultado) || "").replace(/<[^>]*>/g, "");

  app.innerHTML = `
    ${topbar()}
    <div class="wrap">
      <a href="${soloLectura ? "#/" : "#/publicaciones"}" class="btn secondary small" style="margin-bottom:1rem; display:inline-block;">&larr; ${soloLectura ? "Volver a mi perfil" : "Publicaciones"}</a>

      <nav class="cat-navbar" style="margin-bottom:1rem;">
        <button class="cat-navlink active" data-tema-tab="resultado" type="button">🎯 Resultado de Aprendizaje</button>
        <button class="cat-navlink" data-tema-tab="introduccion" type="button">📖 Introducción</button>
        <button class="cat-navlink" data-tema-tab="subtemas" type="button">📚 Subtemas</button>
        <button class="cat-navlink" data-tema-tab="resumen" type="button">📝 Resumen de los trabajos a realizar</button>
        <button class="cat-navlink" data-tema-tab="material" type="button">📎 Material de apoyo</button>
      </nav>

      <div data-tema-panel="resultado">
      <div class="tema-header">
        <span class="tema-eyebrow">Resultado de aprendizaje</span>
        <h1 class="tema-title">${tituloMostrar}</h1>
        ${resultado && resultado.saberes ? `
        <div class="tema-saberes">
          <strong>Saberes esenciales</strong>
          <div class="roa-cell-texto">${resultado.saberes}</div>
        </div>` : ""}
      </div>
      </div>

      <div data-tema-panel="introduccion" style="display:none;">
      <section class="tema-section">
        <h3>Introducción al tema</h3>
        ${soloLectura
          ? `<div class="roa-cell-texto roa-html">${pub.contenido || '<span class="empty">El profesor todavía no ha escrito la introducción.</span>'}</div>`
          : `<div class="roa-editable roa-html" contenteditable="true" id="apartado-intro" style="min-height:6rem;">${pub.contenido || ""}</div>
             <div class="row" style="margin-top:0.5rem; flex-wrap:wrap; gap:0.5rem;">
               <button class="btn small" id="guardar-intro">Guardar introducción</button>
               <button class="btn secondary small" id="generar-ia-btn" type="button">✨ Generar introducción con IA</button>
             </div>
             <div style="margin-top:0.7rem;">
               <label for="ia-instrucciones" style="display:block; font-size:0.78rem; color:var(--text-muted); margin-bottom:0.3rem;">Instrucciones para la IA (opcional): tono, longitud, un ejemplo que querés que incluya…</label>
               <input type="text" id="ia-instrucciones" placeholder="Ej: tono motivador, máximo 3 párrafos, incluir un ejemplo de la vida real" style="width:100%; padding:0.5rem 0.6rem; border:1px solid var(--paper-line); border-radius:var(--radius); font-family:var(--sans); font-size:0.85rem; background:var(--paper);" />
               <span id="ia-estado" style="font-size:0.78rem; color:var(--text-muted); display:block; margin-top:0.4rem; min-height:1.2em;"></span>
             </div>`}
      </section>
      </div>

      <div data-tema-panel="subtemas" style="display:none;">
      <section class="tema-section">
        <h3>Subtemas</h3>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-top:-0.6em;">Cada subtema tiene su propia página: ahí se escribe su introducción, se sube material de apoyo y se crean sus trabajos cotidianos.</p>
        <div id="subtemas-lista">Cargando…</div>
        ${!soloLectura ? `
        <div class="row" style="margin-top:0.8rem; flex-wrap:wrap; gap:0.5rem;">
          <button class="btn secondary small" id="generar-subtemas-btn" type="button">✨ Generar subtemas con IA</button>
        </div>
        <span id="generar-subtemas-estado" style="font-size:0.78rem; color:var(--text-muted); display:block; margin-top:0.4rem; min-height:1.2em;"></span>
        <div id="sugerir-subtemas-lista" style="margin-top:0.6rem;"></div>` : ""}
      </section>
      </div>

      <div data-tema-panel="resumen" style="display:none;">
      <section class="tema-section">
        <h3>Resumen de trabajos cotidianos por subtema</h3>
        <div class="roster" id="resumen-trabajos-lista">Cargando…</div>
      </section>
      </div>

      <div data-tema-panel="material" style="display:none;">
      <section class="tema-section">
        <h3>Material de apoyo general</h3>
        <div class="roster" id="materiales-lista">Cargando…</div>
        ${!soloLectura ? `
        <form id="material-form" style="margin-top:0.8rem; display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center;">
          <input type="file" id="material-archivo" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp" required />
          <button class="btn small" type="submit">Subir archivo</button>
          <span id="material-estado" style="font-size:0.78rem; color:var(--text-muted);"></span>
        </form>
        <form id="enlace-form" style="margin-top:0.6rem; display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center;">
          <input name="titulo" id="enlace-titulo" placeholder="Nombre del recurso (ej. Presentación, Resumen)" required style="flex:1; min-width:12rem" />
          <input name="url" id="enlace-url" type="url" placeholder="https://..." required style="flex:1; min-width:14rem" />
          <button class="btn small" type="submit">🔗 Agregar enlace</button>
          <span id="enlace-estado" style="font-size:0.78rem; color:var(--text-muted);"></span>
        </form>` : ""}
      </section>
      </div>
    </div>`;
  bindTopbar();

  document.querySelectorAll("[data-tema-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-tema-tab]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll("[data-tema-panel]").forEach(p => { p.style.display = "none"; });
      const panel = document.querySelector(`[data-tema-panel="${btn.dataset.temaTab}"]`);
      if (panel) panel.style.display = "";
    });
  });

  if (!soloLectura) {
    document.getElementById("guardar-intro").addEventListener("click", async (e) => {
      const btn = e.target;
      btn.textContent = "Guardando…";
      await sb.from("publicaciones").update({ contenido: document.getElementById("apartado-intro").innerHTML }).eq("id", id);
      btn.textContent = "Guardado ✓";
      setTimeout(() => { btn.textContent = "Guardar introducción"; }, 1500);
    });
    const iaBtn = document.getElementById("generar-ia-btn");
    if (iaBtn) iaBtn.addEventListener("click", async () => {
      const estado = document.getElementById("ia-estado");
      const intro = document.getElementById("apartado-intro");
      const textoOriginal = iaBtn.textContent;
      iaBtn.disabled = true;
      iaBtn.textContent = "Generando…";
      if (estado) estado.textContent = "";
      try {
        const r = await fetch("/api/generar-introduccion", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            resultado: resultado ? resultado.resultado : pub.titulo,
            saberes: resultado ? resultado.saberes : "",
            estrategias: resultado ? resultado.estrategias : "",
            evidencias: resultado ? resultado.evidencias : "",
            instrucciones: document.getElementById("ia-instrucciones").value
          })
        });
        const datos = await r.json();
        if (!r.ok) {
          if (estado) estado.textContent = "No se pudo generar: " + (datos.error || "error desconocido.");
          return;
        }
        intro.innerHTML = datos.texto || "";
        if (estado) estado.textContent = "Listo. Revisá el texto y dale \"Guardar introducción\" si te gusta.";
      } catch (err) {
        if (estado) estado.textContent = "No se pudo conectar con la IA: " + (err.message || err);
      } finally {
        iaBtn.disabled = false;
        iaBtn.textContent = textoOriginal;
      }
    });
    document.getElementById("material-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const estado = document.getElementById("material-estado");
      const input = document.getElementById("material-archivo");
      const archivo = input.files[0];
      if (!archivo) return;
      estado.textContent = "Subiendo…";
      const rutaSegura = `${id}/${Date.now()}-${archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: errorSubida } = await sb.storage.from("materiales").upload(rutaSegura, archivo);
      if (errorSubida) {
        estado.textContent = "No se pudo subir: " + errorSubida.message;
        return;
      }
      await sb.from("materiales").insert({
        publicacion_id: id,
        nombre: archivo.name,
        ruta: rutaSegura,
        tipo: archivo.type || null,
        tamano_bytes: archivo.size || null
      });
      input.value = "";
      estado.textContent = "";
      await pintarMateriales((await sb.from("materiales").select("*").eq("publicacion_id", id).is("subtema_id", null).order("creado_en")).data || [], soloLectura);
    });

    document.getElementById("enlace-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const estado = document.getElementById("enlace-estado");
      let url = (f.get("url") || "").trim();
      if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;
      await sb.from("materiales").insert({
        publicacion_id: id,
        nombre: f.get("titulo"),
        ruta: url,
        tipo: "link",
        tamano_bytes: null
      });
      e.target.reset();
      estado.textContent = "";
      await pintarMateriales((await sb.from("materiales").select("*").eq("publicacion_id", id).is("subtema_id", null).order("creado_en")).data || [], soloLectura);
    });

    const generarSubtemasBtn = document.getElementById("generar-subtemas-btn");
    if (generarSubtemasBtn) generarSubtemasBtn.addEventListener("click", async () => {
      const estado = document.getElementById("generar-subtemas-estado");
      const lista = document.getElementById("sugerir-subtemas-lista");
      const textoOriginal = generarSubtemasBtn.textContent;
      generarSubtemasBtn.disabled = true;
      generarSubtemasBtn.textContent = "Pensando…";
      if (estado) estado.textContent = "";
      lista.innerHTML = "";
      try {
        const r = await fetch("/api/generar-subtemas", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            resultado: resultado ? resultado.resultado : pub.titulo,
            saberes: resultado ? resultado.saberes : ""
          })
        });
        const datos = await r.json();
        if (!r.ok) {
          if (estado) estado.textContent = "No se pudo generar: " + (datos.error || "error desconocido.");
          return;
        }
        const subtemasSugeridos = datos.subtemas || [];
        if (subtemasSugeridos.length === 0) {
          if (estado) estado.textContent = "La IA no propuso subtemas para este tema.";
          return;
        }
        if (estado) estado.textContent = "Revisá las sugerencias y agregue las que le sirvan.";
        lista.innerHTML = subtemasSugeridos.map((s, i) => `
          <div class="roster-row" data-sugerencia-subtema="${i}" style="align-items:flex-start; flex-direction:column; gap:0.4rem;">
            <div style="display:flex; justify-content:space-between; width:100%; gap:0.5rem;">
              <strong style="font-size:0.9rem;">${s.titulo}</strong>
              <button class="btn small" type="button" data-agregar-subtema="${i}">+ Agregar</button>
            </div>
            ${s.descripcion ? `<div class="roa-cell-texto" style="font-size:0.85rem;">${s.descripcion}</div>` : ""}
          </div>`).join("");
        lista.querySelectorAll("[data-agregar-subtema]").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const i = Number(btn.dataset.agregarSubtema);
            const s = subtemasSugeridos[i];
            btn.disabled = true;
            btn.textContent = "Agregando…";
            await sb.from("subtemas").insert({
              publicacion_id: id,
              titulo: s.titulo,
              descripcion: s.descripcion || null
            });
            renderApartado(id, soloLectura);
          });
        });
      } catch (err) {
        if (estado) estado.textContent = "No se pudo conectar con la IA: " + (err.message || err);
      } finally {
        generarSubtemasBtn.disabled = false;
        generarSubtemasBtn.textContent = textoOriginal;
      }
    });
  }

  await pintarMateriales(materiales || [], soloLectura);
  await pintarSubtemas(subtemas || [], soloLectura, id);
  await pintarResumenTrabajos(subtemas || [], soloLectura);
}

function formatoTamano(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function pintarMateriales(materiales, soloLectura) {
  const holder = document.getElementById("materiales-lista");
  if (!holder) return;

  if (materiales.length === 0) {
    holder.innerHTML = `<p class="empty">Todavía no hay material de apoyo en este tema.</p>`;
    return;
  }

  holder.innerHTML = materiales.map((m) => {
    const esEnlace = m.tipo === "link";
    let url = "#";
    if (esEnlace) {
      url = m.ruta;
    } else {
      const { data: pub } = sb.storage.from("materiales").getPublicUrl(m.ruta);
      url = pub ? pub.publicUrl : "#";
    }
    return `
    <div class="roster-row">
      <a class="name" href="${url}" target="_blank" rel="noopener">${esEnlace ? "🔗 " : ""}${m.nombre}</a>
      <span class="badge" style="font-weight:400;">${esEnlace ? "Enlace" : formatoTamano(m.tamano_bytes)}</span>
      ${!soloLectura ? `<button class="btn danger small" data-del-material="${m.id}" data-ruta-material="${m.ruta}" data-tipo-material="${m.tipo || ""}">Eliminar</button>` : ""}
    </div>`;
  }).join("");

  if (!soloLectura) {
    holder.querySelectorAll("[data-del-material]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const esEnlace = btn.dataset.tipoMaterial === "link";
        if (!confirm(esEnlace ? "¿Eliminar este enlace?" : "¿Eliminar este archivo?")) return;
        if (!esEnlace) await sb.storage.from("materiales").remove([btn.dataset.rutaMaterial]);
        await sb.from("materiales").delete().eq("id", btn.dataset.delMaterial);
        btn.closest(".roster-row").remove();
        if (!holder.children.length) holder.innerHTML = `<p class="empty">Todavía no hay material de apoyo en este tema.</p>`;
      });
    });
  }
}

// --- Subtemas (cada uno abre su propia página: #/subtema/:id) ---

async function pintarSubtemas(subtemas, soloLectura, publicacionId) {
  const holder = document.getElementById("subtemas-lista");
  if (!holder) return;

  if (subtemas.length === 0) {
    holder.innerHTML = `<p class="empty">Todavía no hay subtemas en este tema.</p>`;
    return;
  }

  const subtemaIds = subtemas.map(s => s.id);
  const [{ data: materialesSubtemas }, { data: trabajosSubtemas }] = subtemaIds.length
    ? await Promise.all([
        sb.from("materiales").select("id, subtema_id").in("subtema_id", subtemaIds),
        sb.from("trabajos_cotidianos").select("id, subtema_id").in("subtema_id", subtemaIds)
      ])
    : [{ data: [] }, { data: [] }];
  const materialesPorSubtema = {};
  (materialesSubtemas || []).forEach(m => { materialesPorSubtema[m.subtema_id] = (materialesPorSubtema[m.subtema_id] || 0) + 1; });
  const trabajosPorSubtema = {};
  (trabajosSubtemas || []).forEach(t => { trabajosPorSubtema[t.subtema_id] = (trabajosPorSubtema[t.subtema_id] || 0) + 1; });

  holder.innerHTML = subtemas.map((s) => `
    <a class="leccion-card" href="#/subtema/${s.id}" style="margin-bottom:0.9rem; display:block; text-decoration:none; color:inherit;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.6rem;">
        <div>
          <div class="num" style="font-size:1.05rem;">${s.titulo}</div>
          ${s.descripcion ? `<div class="count" style="margin-top:0.2rem;">${s.descripcion}</div>` : ""}
          <div class="count" style="margin-top:0.4rem; font-size:0.78rem;">${materialesPorSubtema[s.id] || 0} archivo(s) · ${trabajosPorSubtema[s.id] || 0} trabajo(s) cotidiano(s)</div>
        </div>
        <span class="btn secondary small" style="pointer-events:none; white-space:nowrap;">Abrir →</span>
      </div>
    </a>`).join("");
}

async function pintarResumenTrabajos(subtemas, soloLectura) {
  const holder = document.getElementById("resumen-trabajos-lista");
  if (!holder) return;

  if (subtemas.length === 0) {
    holder.innerHTML = `<p class="empty">Todavía no hay subtemas, así que no hay trabajos cotidianos por subtema.</p>`;
    return;
  }

  const subtemaIds = subtemas.map(s => s.id);
  const { data: trabajos } = await sb.from("trabajos_cotidianos").select("id, subtema_id").in("subtema_id", subtemaIds);
  const trabajosPorSubtema = {};
  (trabajos || []).forEach(t => { (trabajosPorSubtema[t.subtema_id] = trabajosPorSubtema[t.subtema_id] || []).push(t); });

  const todosIds = (trabajos || []).map(t => t.id);
  let estadosPorTrabajo = {};
  if (todosIds.length) {
    if (soloLectura) {
      const { data: misEstados } = await sb.from("trabajos_cotidianos_estudiante").select("trabajo_id, completado").eq("estudiante_id", session.id).in("trabajo_id", todosIds);
      (misEstados || []).forEach(e => { estadosPorTrabajo[e.trabajo_id] = e.completado; });
    } else {
      const { data: todosEstados } = await sb.from("trabajos_cotidianos_estudiante").select("trabajo_id, completado").in("trabajo_id", todosIds);
      (todosEstados || []).forEach(e => { if (e.completado) estadosPorTrabajo[e.trabajo_id] = (estadosPorTrabajo[e.trabajo_id] || 0) + 1; });
    }
  }

  holder.innerHTML = subtemas.map(s => {
    const lista = trabajosPorSubtema[s.id] || [];
    const detalle = lista.length === 0
      ? "Sin trabajos todavía"
      : (soloLectura
          ? `${lista.filter(t => estadosPorTrabajo[t.id]).length} de ${lista.length} completados`
          : `${lista.length} trabajo(s)`);
    return `
      <a class="roster-row" href="#/subtema/${s.id}" style="text-decoration:none; color:inherit;">
        <span class="name">${s.titulo}</span>
        <span class="badge" style="font-weight:400;">${detalle}</span>
      </a>`;
  }).join("");
}

async function pintarMaterialesSubtema(subtemaId, materiales, soloLectura, publicacionId) {
  const holder = document.getElementById(`subtema-materiales-${subtemaId}`);
  if (!holder) return;

  if (materiales.length === 0) {
    holder.innerHTML = `<p class="empty" style="padding:0.4rem 0;">Todavía no hay material en este subtema.</p>`;
    return;
  }

  holder.innerHTML = materiales.map((m) => {
    const esEnlace = m.tipo === "link";
    let url = "#";
    if (esEnlace) {
      url = m.ruta;
    } else {
      const { data: pub } = sb.storage.from("materiales").getPublicUrl(m.ruta);
      url = pub ? pub.publicUrl : "#";
    }
    return `
    <div class="roster-row">
      <a class="name" href="${url}" target="_blank" rel="noopener">${esEnlace ? "🔗 " : ""}${m.nombre}</a>
      <span class="badge" style="font-weight:400;">${esEnlace ? "Enlace" : formatoTamano(m.tamano_bytes)}</span>
      ${!soloLectura ? `<button class="btn danger small" data-del-material-subtema="${m.id}" data-ruta-material="${m.ruta}" data-tipo-material="${m.tipo || ""}">Eliminar</button>` : ""}
    </div>`;
  }).join("");

  if (!soloLectura) {
    holder.querySelectorAll("[data-del-material-subtema]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const esEnlace = btn.dataset.tipoMaterial === "link";
        if (!confirm(esEnlace ? "¿Eliminar este enlace?" : "¿Eliminar este archivo?")) return;
        if (!esEnlace) await sb.storage.from("materiales").remove([btn.dataset.rutaMaterial]);
        await sb.from("materiales").delete().eq("id", btn.dataset.delMaterialSubtema);
        btn.closest(".roster-row").remove();
        if (!holder.children.length) holder.innerHTML = `<p class="empty" style="padding:0.4rem 0;">Todavía no hay material en este subtema.</p>`;
      });
    });
  }
}

// --- Visor de presentación (imágenes de diapositivas) embebido en la Introducción del subtema ---

function pintarPresentacionSubtema(subtemaId, diapositivas, soloLectura) {
  const holder = document.getElementById(`subtema-presentacion-${subtemaId}`);
  if (!holder) return;

  if (!diapositivas || diapositivas.length === 0) {
    holder.innerHTML = "";
    return;
  }

  // Un archivo único que no es imagen (PDF, PowerPoint, Word, Excel): visor de documento
  const doc = diapositivas.find(d => d.tipo === "slide-doc");
  if (doc) {
    pintarVisorDocumentoSubtema(subtemaId, doc, holder);
    return;
  }

  const urls = diapositivas.map(d => {
    const { data: pub } = sb.storage.from("materiales").getPublicUrl(d.ruta);
    return pub ? pub.publicUrl : "";
  });

  let actual = 0;

  holder.innerHTML = `
    <div class="presentacion-visor" style="margin-bottom:1.2rem; background:#0f172a; border-radius:14px; overflow:hidden;">
      <div style="position:relative; width:100%; aspect-ratio:16/9; background:#0f172a; display:flex; align-items:center; justify-content:center;">
        <img id="presentacion-img-${subtemaId}" src="${urls[0]}" alt="Diapositiva 1" style="width:100%; height:100%; object-fit:contain; display:block;" />
        <button type="button" id="presentacion-prev-${subtemaId}" aria-label="Diapositiva anterior" style="position:absolute; left:0.5rem; top:50%; transform:translateY(-50%); background:rgba(15,23,42,0.6); color:var(--white); border:none; border-radius:999px; width:2.4rem; height:2.4rem; font-size:1.2rem; cursor:pointer;">&larr;</button>
        <button type="button" id="presentacion-next-${subtemaId}" aria-label="Siguiente diapositiva" style="position:absolute; right:0.5rem; top:50%; transform:translateY(-50%); background:rgba(15,23,42,0.6); color:var(--white); border:none; border-radius:999px; width:2.4rem; height:2.4rem; font-size:1.2rem; cursor:pointer;">&rarr;</button>
        <button type="button" id="presentacion-full-${subtemaId}" aria-label="Pantalla completa" style="position:absolute; right:0.5rem; bottom:0.5rem; background:rgba(15,23,42,0.6); color:var(--white); border:none; border-radius:8px; padding:0.3rem 0.6rem; font-size:0.78rem; cursor:pointer;">⛶ Pantalla completa</button>
      </div>
      <div style="display:flex; align-items:center; justify-content:center; gap:0.6rem; padding:0.5rem; background:#1b2340;">
        <span id="presentacion-contador-${subtemaId}" style="color:#C7D0E8; font-size:0.82rem;">1 / ${urls.length}</span>
      </div>
    </div>`;

  const img = document.getElementById(`presentacion-img-${subtemaId}`);
  const contador = document.getElementById(`presentacion-contador-${subtemaId}`);
  const visor = holder.querySelector(".presentacion-visor");

  function mostrar(i) {
    actual = (i + urls.length) % urls.length;
    img.src = urls[actual];
    img.alt = `Diapositiva ${actual + 1}`;
    contador.textContent = `${actual + 1} / ${urls.length}`;
  }

  document.getElementById(`presentacion-prev-${subtemaId}`).addEventListener("click", () => mostrar(actual - 1));
  document.getElementById(`presentacion-next-${subtemaId}`).addEventListener("click", () => mostrar(actual + 1));
  document.getElementById(`presentacion-full-${subtemaId}`).addEventListener("click", () => {
    if (visor.requestFullscreen) visor.requestFullscreen();
    else if (visor.webkitRequestFullscreen) visor.webkitRequestFullscreen();
  });
  visor.tabIndex = 0;
  visor.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") mostrar(actual - 1);
    if (e.key === "ArrowRight") mostrar(actual + 1);
  });
}

function pintarVisorDocumentoSubtema(subtemaId, doc, holder) {
  const { data: pub } = sb.storage.from("materiales").getPublicUrl(doc.ruta);
  const url = pub ? pub.publicUrl : "";
  const nombre = (doc.nombre || doc.ruta || "").toLowerCase();
  const esPdf = nombre.endsWith(".pdf");
  // Para PDF usamos el visor nativo del navegador; para PPT/DOC/XLS usamos el visor de Google Docs.
  const srcVisor = esPdf ? url : `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

  holder.innerHTML = `
    <div class="presentacion-visor" id="presentacion-doc-visor-${subtemaId}" style="margin-bottom:1.2rem; background:#0f172a; border-radius:14px; overflow:hidden;">
      <div style="position:relative; width:100%; aspect-ratio:16/9; background:var(--surface);">
        <iframe src="${srcVisor}" title="Documento de la introducción" style="width:100%; height:100%; border:none; display:block;" allowfullscreen></iframe>
        <button type="button" id="presentacion-doc-full-${subtemaId}" aria-label="Pantalla completa" style="position:absolute; right:0.5rem; bottom:0.5rem; background:rgba(15,23,42,0.6); color:var(--white); border:none; border-radius:8px; padding:0.3rem 0.6rem; font-size:0.78rem; cursor:pointer;">⛶ Pantalla completa</button>
      </div>
      <div style="display:flex; align-items:center; justify-content:space-between; gap:0.6rem; padding:0.5rem 0.8rem; background:#1b2340;">
        <span style="color:#C7D0E8; font-size:0.82rem;">📄 ${doc.nombre || "Documento"}</span>
        <a href="${url}" target="_blank" rel="noopener" style="color:#9fb4ff; font-size:0.82rem;">Abrir en otra pestaña ↗</a>
      </div>
    </div>`;

  const visorDoc = document.getElementById(`presentacion-doc-visor-${subtemaId}`);
  document.getElementById(`presentacion-doc-full-${subtemaId}`).addEventListener("click", () => {
    if (visorDoc.requestFullscreen) visorDoc.requestFullscreen();
    else if (visorDoc.webkitRequestFullscreen) visorDoc.webkitRequestFullscreen();
  });
}

// --- Página propia de un Subtema (#/subtema/:id) ---

async function renderSubtema(id, soloLectura) {
  const { data: sub } = await sb.from("subtemas").select("*").eq("id", id).maybeSingle();
  if (!sub) { location.hash = soloLectura ? "#/" : "#/publicaciones"; return; }
  const { data: pub } = await sb.from("publicaciones").select("*").eq("id", sub.publicacion_id).maybeSingle();
  if (!pub) { location.hash = soloLectura ? "#/" : "#/publicaciones"; return; }
  if (soloLectura && !pub.habilitado) { location.hash = "#/"; return; }
  const { data: resultado } = pub.resultado_id ? await sb.from("resultados_aprendizaje").select("*").eq("id", pub.resultado_id).maybeSingle() : { data: null };
  const { data: trabajos } = await sb.from("trabajos_cotidianos").select("*").eq("subtema_id", id).order("creado_en");
  const { data: trabajosClase } = await sb.from("trabajos_clase").select("*").eq("subtema_id", id).order("creado_en");
  const { data: materialesTodos } = await sb.from("materiales").select("*").eq("subtema_id", id).order("creado_en");
  const TIPOS_PRESENTACION = ["slide-image", "slide-doc"];
  const materiales = (materialesTodos || []).filter(m => !TIPOS_PRESENTACION.includes(m.tipo));
  const diapositivas = (materialesTodos || []).filter(m => TIPOS_PRESENTACION.includes(m.tipo));

  const tituloTema = (pub.titulo || (resultado && resultado.resultado) || "").replace(/<[^>]*>/g, "");

  app.innerHTML = `
    ${topbar()}
    <div class="wrap">
      <a href="#/apartado/${encodeURIComponent(sub.publicacion_id)}" class="btn secondary small" style="margin-bottom:1rem; display:inline-block;">&larr; Volver al tema</a>

      <div class="tema-header">
        <span class="tema-eyebrow">Subtema de "${tituloTema}"</span>
        <h1 class="tema-title">${sub.titulo}</h1>
        ${sub.descripcion ? `<div class="tema-saberes"><div class="roa-cell-texto">${sub.descripcion}</div></div>` : ""}
      </div>

      ${!soloLectura ? `
      <div class="row" style="margin-bottom:1rem;">
        <button class="btn danger small" id="eliminar-subtema-btn" type="button">Eliminar este subtema</button>
      </div>` : ""}

      <nav class="cat-navbar" style="margin-bottom:1rem;">
        <button class="cat-navlink active" data-subtema-tab="intro" type="button">📘 Introducción del tema</button>
        <button class="cat-navlink" data-subtema-tab="trabajos" type="button">📝 Trabajos asignados</button>
        <button class="cat-navlink" data-subtema-tab="material" type="button">📎 Material extra</button>
      </nav>

      <div data-subtema-panel="intro">
      <section class="tema-section">
        <h3>Introducción del subtema</h3>
        <div id="subtema-presentacion-${sub.id}"></div>
        ${!soloLectura ? `
        <form class="subtema-presentacion-form" data-subtema-id="${sub.id}" style="margin:${diapositivas.length ? "0 0 1.2rem" : "0 0 1.2rem"}; display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center;">
          <input type="file" class="subtema-presentacion-archivos" accept="image/*,.pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx" multiple />
          <button class="btn small" type="submit">📽️ ${diapositivas.length ? "Reemplazar presentación" : "Subir presentación"}</button>
          ${diapositivas.length ? `<button class="btn danger small" type="button" id="borrar-presentacion-${sub.id}">Quitar presentación</button>` : ""}
          <span style="font-size:0.78rem; color:var(--text-muted); flex-basis:100%;">Varias imágenes en orden (se pasan como diapositivas), o un solo archivo de cualquier tipo (PDF, PowerPoint, Word, Excel) que se pueda ver en pantalla completa.</span>
          <span class="subtema-presentacion-estado" style="font-size:0.78rem; color:var(--text-muted); flex-basis:100%;"></span>
        </form>` : ""}
        ${soloLectura
          ? `<div class="roa-cell-texto roa-html">${sub.contenido || '<span class="empty">El profesor todavía no ha escrito contenido para este subtema.</span>'}</div>`
          : `<div style="margin-bottom:0.6rem; padding:0.6rem 0.8rem; background:var(--paper); border-left:2px solid var(--paper-line);">
               <p style="font-size:0.85rem; font-weight:600; margin:0 0 0.3rem;">✨ Generar introducción con IA a partir de un archivo</p>
               <p style="font-size:0.78rem; color:var(--text-muted); margin:0 0 0.5rem;">Subí un PDF o una imagen y decile a la IA qué querés que escriba. El texto se pone en el cuadro de abajo para que lo revisés y lo guardés vos.</p>
               <form class="subtema-intro-ia-form" data-subtema-id="${sub.id}" style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center;">
                 <input type="file" class="subtema-intro-ia-archivo" accept=".pdf,image/png,image/jpeg,image/gif,image/webp" required />
                 <textarea class="subtema-intro-ia-instrucciones" rows="2" placeholder='Instrucciones para la IA — ej. "escribí la introducción basada en este documento", "explicá esto de forma sencilla"' style="width:100%; font-family:inherit; resize:vertical;"></textarea>
                 <button class="btn small" type="submit">✨ Generar introducción</button>
                 <span class="subtema-intro-ia-estado" style="font-size:0.78rem; color:var(--text-muted); flex-basis:100%;"></span>
               </form>
             </div>
             <div id="subtema-intro-lectura">
               <div class="roa-cell-texto roa-html">${sub.contenido || '<span class="empty">El profesor todavía no ha escrito contenido para este subtema.</span>'}</div>
               <div class="row" style="margin-top:0.5rem;">
                 <button class="btn secondary small" id="editar-subtema-intro">✏️ Editar introducción</button>
               </div>
             </div>
             <div id="subtema-intro-edicion" style="display:none;">
               <div class="roa-editable roa-html" contenteditable="true" id="subtema-intro" style="min-height:6rem;">${sub.contenido || ""}</div>
               <div class="row" style="margin-top:0.5rem;">
                 <button class="btn small" id="guardar-subtema-intro">Guardar introducción</button>
                 <button class="btn secondary small" id="cancelar-subtema-intro" type="button">Cancelar</button>
               </div>
             </div>`}
      </section>
      </div>

      <div data-subtema-panel="trabajos" style="display:none;">
      <section class="tema-section">
        <h3>Trabajos cotidianos de este subtema</h3>
        <div class="roster" id="subtema-trabajos-lista">Cargando…</div>
        ${!soloLectura ? `
        <form class="inline-form" id="subtema-trabajo-form" style="margin-top:0.8rem;">
          <input name="titulo" placeholder="Título del trabajo" required style="flex:1; min-width:10rem" />
          <input name="fecha" type="date" />
          <div class="roa-editable js-subtema-trabajo-desc" contenteditable="true" style="flex-basis:100%; min-height:3rem;" data-placeholder="Instrucciones (opcional)"></div>
          <label style="display:flex; align-items:center; gap:0.4rem; font-size:0.82rem; flex-basis:100%;">
            <input type="checkbox" name="calificable" checked /> Contar como indicador calificable en Rúbrica y Evaluaciones (categoría "Trabajo cotidiano")
          </label>
          <input name="puntaje_maximo" type="number" min="1" value="10" placeholder="Puntaje máximo" style="width:10rem" />
          <input name="aula_contable_empresa" placeholder="🧮 Empresa en Aula de Conta (opcional — solo si este trabajo se hace ahí)" style="flex-basis:100%;" />
          <button class="btn small" type="submit">Agregar trabajo</button>
        </form>
        <div style="margin-top:0.6rem;">
          <label for="sugerir-subtema-trabajos-instrucciones" style="font-size:0.78rem; color:var(--text-muted); display:block; margin-bottom:0.3rem;">Instrucciones para la IA (opcional) — ej. "que sean trabajos individuales, cortos, de 15 minutos", "enfocate en la parte práctica con ejemplos numéricos"</label>
          <textarea id="sugerir-subtema-trabajos-instrucciones" rows="2" placeholder="Dejalo en blanco para que la IA proponga trabajos solo con el resultado de aprendizaje y los saberes del programa" style="width:100%; font-family:inherit; resize:vertical; margin-bottom:0.5rem;"></textarea>
        </div>
        <div class="row" style="margin-top:0.2rem;">
          <button class="btn secondary small" id="sugerir-subtema-trabajos-btn" type="button">✨ Sugerir trabajos cotidianos con IA</button>
          <button class="btn secondary small" id="abrir-actividad-interactiva" type="button">🧠 Crear actividad interactiva</button>
        </div>
        <span id="sugerir-subtema-trabajos-estado" style="font-size:0.78rem; color:var(--text-muted); display:block; margin-top:0.4rem; min-height:1.2em;"></span>
        <div id="sugerir-subtema-trabajos-lista" style="margin-top:0.6rem;"></div>
        <div id="actividad-interactiva-panel" style="margin-top:0.8rem;"></div>
        <div style="margin-top:1rem; padding-top:0.8rem; border-top:1px dashed var(--paper-line);">
          <p style="font-size:0.85rem; font-weight:600; margin-bottom:0.4rem;">✨ Generar un trabajo cotidiano con IA a partir de un archivo</p>
          <p style="font-size:0.78rem; color:var(--text-muted); margin:0 0 0.5rem;">Subí uno o varios PDF/imágenes (una guía, un ejercicio, un enunciado) y decile a la IA qué tipo de trabajo querés que arme con toda esa información junta.</p>
          <form class="subtema-trabajo-ia-form" data-subtema-id="${sub.id}" style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center;">
            <label style="display:flex; align-items:center; gap:0.5rem;">Tipo de trabajo a generar:
              <select class="subtema-trabajo-ia-tipo">
                <option value="normal">📝 Trabajo normal (título + instrucciones)</option>
                <option value="seleccion_unica">🧠 Selección única</option>
                <option value="falso_verdadero">✅ Falso y verdadero</option>
                <option value="crucigrama">🔤 Crucigrama</option>
                <option value="sopa_letras">🔎 Sopa de letras</option>
              </select>
            </label>
            <label class="subtema-trabajo-ia-cantidad-label" style="display:none; align-items:center; gap:0.5rem;">Cantidad:
              <input type="number" class="subtema-trabajo-ia-cantidad" min="3" max="40" value="15" style="width:5rem; padding:0.3rem;" />
            </label>
            <input type="file" class="subtema-trabajo-ia-archivo" accept=".pdf,image/png,image/jpeg,image/gif,image/webp" multiple required />
            <textarea class="subtema-trabajo-ia-instrucciones" rows="2" placeholder='Instrucciones para la IA (opcional) — ej. "que sea un ejercicio de asientos contables con estos datos"' style="width:100%; font-family:inherit; resize:vertical;"></textarea>
            <button class="btn small" type="submit">✨ Generar</button>
            <span class="subtema-trabajo-ia-estado" style="font-size:0.78rem; color:var(--text-muted); flex-basis:100%;"></span>
          </form>
        </div>` : ""}
      </section>

      <section class="tema-section">
        <h3>Trabajos en clase de este subtema</h3>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-top:-0.6em;">Le dan al estudiante un documento para completar; el estudiante lo descarga, lo llena y sube su propia versión. No llevan indicador — se califican con una nota manual.</p>
        <div class="roster" id="subtema-trabajos-clase-lista">Cargando…</div>
        ${!soloLectura ? `
        <form class="inline-form" id="subtema-trabajo-clase-form" style="margin-top:0.8rem;">
          <input name="titulo" placeholder="Título del trabajo en clase" required style="flex:1; min-width:10rem" />
          <input name="fecha" type="date" />
          <div class="roa-editable js-subtema-trabajo-clase-desc" contenteditable="true" style="flex-basis:100%; min-height:3rem;" data-placeholder="Instrucciones (opcional)"></div>
          <label style="flex-basis:100%; font-size:0.82rem;">Documento base (plantilla) que descargarán los estudiantes:
            <input type="file" name="plantilla" style="display:block; margin-top:0.3rem;" />
          </label>
          <button class="btn small" type="submit">Agregar trabajo en clase</button>
        </form>` : ""}
      </section>
      </div>

      <div data-subtema-panel="material" style="display:none;">
      <section class="tema-section">
        <h3>Material de apoyo de este subtema</h3>
        <div class="roster" id="subtema-materiales-${sub.id}">Cargando…</div>
        ${!soloLectura ? `
        <form class="subtema-material-form" data-subtema-id="${sub.id}" style="margin-top:0.8rem; display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center;">
          <input type="file" class="subtema-material-archivo" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp" required />
          <button class="btn small" type="submit">Subir archivo</button>
          <span class="subtema-material-estado" style="font-size:0.78rem; color:var(--text-muted);"></span>
        </form>
        <form class="subtema-enlace-form" data-subtema-id="${sub.id}" style="margin-top:0.6rem; display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center;">
          <input name="titulo" class="subtema-enlace-titulo" placeholder="Nombre del recurso (ej. Presentación, Resumen)" required style="flex:1; min-width:12rem" />
          <input name="url" class="subtema-enlace-url" type="url" placeholder="https://..." required style="flex:1; min-width:14rem" />
          <button class="btn small" type="submit">🔗 Agregar enlace</button>
          <span class="subtema-enlace-estado" style="font-size:0.78rem; color:var(--text-muted);"></span>
        </form>
        <div style="margin-top:1rem; padding-top:0.8rem; border-top:1px dashed var(--paper-line);">
          <p style="font-size:0.85rem; font-weight:600; margin-bottom:0.4rem;">✨ Generar material con IA a partir de un archivo</p>
          <p style="font-size:0.78rem; color:var(--text-muted); margin:0 0 0.5rem;">Subí un PDF o una imagen (ej. una guía, un ejercicio, una foto de la pizarra) y decile a la IA qué querés que genere con eso. El resultado se agrega automáticamente como material de apoyo de este subtema.</p>
          <form class="subtema-material-ia-form" data-subtema-id="${sub.id}" style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center;">
            <input type="file" class="subtema-material-ia-archivo" accept=".pdf,image/png,image/jpeg,image/gif,image/webp" required />
            <textarea class="subtema-material-ia-instrucciones" rows="2" placeholder='Instrucciones para la IA — ej. "hacé un resumen en viñetas", "generá una guía de estudio con los puntos clave", "explicá esto con ejemplos de Costa Rica"' style="width:100%; font-family:inherit; resize:vertical;"></textarea>
            <button class="btn small" type="submit">✨ Generar y agregar</button>
            <span class="subtema-material-ia-estado" style="font-size:0.78rem; color:var(--text-muted); flex-basis:100%;"></span>
          </form>
        </div>` : ""}
      </section>
      </div>
    </div>`;
  bindTopbar();

  document.querySelectorAll("[data-subtema-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-subtema-tab]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll("[data-subtema-panel]").forEach(p => { p.style.display = "none"; });
      const panel = document.querySelector(`[data-subtema-panel="${btn.dataset.subtemaTab}"]`);
      if (panel) panel.style.display = "";
    });
  });
  try {
    if (sessionStorage.getItem("ctp_abrir_tab_trabajos")) {
      sessionStorage.removeItem("ctp_abrir_tab_trabajos");
      const tb = document.querySelector('[data-subtema-tab="trabajos"]');
      if (tb) { tb.click(); tb.scrollIntoView({ block: "start" }); }
    }
  } catch (e) {}

  if (!soloLectura) {
    document.getElementById("eliminar-subtema-btn").addEventListener("click", async () => {
      if (!confirm("¿Eliminar este subtema, su material y sus trabajos cotidianos?")) return;
      if ((materiales || []).length) {
        await sb.storage.from("materiales").remove((materiales || []).map(m => m.ruta));
      }
      await sb.from("subtemas").delete().eq("id", sub.id);
      location.hash = `#/apartado/${encodeURIComponent(sub.publicacion_id)}`;
    });

    const introIaForm = document.querySelector(".subtema-intro-ia-form");
    if (introIaForm) introIaForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const estado = form.querySelector(".subtema-intro-ia-estado");
      const input = form.querySelector(".subtema-intro-ia-archivo");
      const instrucciones = form.querySelector(".subtema-intro-ia-instrucciones").value.trim().slice(0, 800);
      const archivo = input.files[0];
      if (!archivo) return;
      const boton = form.querySelector("button[type=submit]");

      const leerComoBase64 = (f) => new Promise((resolve, reject) => {
        const lector = new FileReader();
        lector.onload = () => resolve(String(lector.result).split(",")[1] || "");
        lector.onerror = () => reject(new Error("No se pudo leer el archivo."));
        lector.readAsDataURL(f);
      });

      boton.disabled = true;
      boton.textContent = "Generando…";
      estado.textContent = "Leyendo el archivo y generando con la IA (puede tardar unos segundos)…";
      try {
        const datosBase64 = await leerComoBase64(archivo);
        const quitarHtml = (v) => String(v || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        const contexto = [sub.titulo, quitarHtml(sub.descripcion), quitarHtml(resultado ? resultado.resultado : "")].filter(Boolean).join(" — ").slice(0, 1500);
        const r = await fetch("/api/generar-material-ia", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            tema: sub.titulo || pub.titulo || "",
            contexto,
            instrucciones: instrucciones || "Escribí la introducción de este subtema basada en el archivo adjunto, dirigida a estudiantes de secundaria.",
            archivo: { mimeType: archivo.type, datosBase64 }
          })
        });
        const datos = await r.json();
        if (!r.ok) {
          estado.textContent = "No se pudo generar: " + (datos.error || "error desconocido.");
          return;
        }
        const contenidoHtml = (datos.contenido && datos.contenido.contenido_html) || "";
        document.getElementById("subtema-intro").innerHTML = contenidoHtml;
        document.getElementById("subtema-intro-lectura").style.display = "none";
        document.getElementById("subtema-intro-edicion").style.display = "block";
        form.reset();
        estado.textContent = "Listo — revisá el texto abajo y dale \"Guardar introducción\" cuando esté bien.";
      } catch (err) {
        estado.textContent = "No se pudo conectar con la IA: " + (err.message || err);
      } finally {
        boton.disabled = false;
        boton.textContent = "✨ Generar introducción";
      }
    });

    const editarIntroBtn = document.getElementById("editar-subtema-intro");
    if (editarIntroBtn) editarIntroBtn.addEventListener("click", () => {
      document.getElementById("subtema-intro-lectura").style.display = "none";
      document.getElementById("subtema-intro-edicion").style.display = "block";
      document.getElementById("subtema-intro").focus();
    });

    const cancelarIntroBtn = document.getElementById("cancelar-subtema-intro");
    if (cancelarIntroBtn) cancelarIntroBtn.addEventListener("click", () => {
      document.getElementById("subtema-intro").innerHTML = sub.contenido || "";
      document.getElementById("subtema-intro-edicion").style.display = "none";
      document.getElementById("subtema-intro-lectura").style.display = "block";
    });

    document.getElementById("guardar-subtema-intro").addEventListener("click", async (e) => {
      const btn = e.target;
      btn.textContent = "Guardando…";
      const nuevoContenido = document.getElementById("subtema-intro").innerHTML;
      await sb.from("subtemas").update({ contenido: nuevoContenido }).eq("id", sub.id);
      sub.contenido = nuevoContenido;
      btn.textContent = "Guardar introducción";
      document.getElementById("subtema-intro-edicion").style.display = "none";
      const vistaLectura = document.getElementById("subtema-intro-lectura");
      vistaLectura.querySelector(".roa-cell-texto").innerHTML = nuevoContenido || '<span class="empty">El profesor todavía no ha escrito contenido para este subtema.</span>';
      vistaLectura.style.display = "block";
    });

    document.getElementById("subtema-trabajo-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const { data: nuevo } = await sb.from("trabajos_cotidianos").insert({
        publicacion_id: sub.publicacion_id,
        subtema_id: sub.id,
        titulo: f.get("titulo"),
        fecha: f.get("fecha") || null,
        descripcion: document.querySelector(".js-subtema-trabajo-desc").innerHTML || null,
        aula_contable_empresa: (f.get("aula_contable_empresa") || "").trim() || null
      }).select().maybeSingle();
      if (nuevo && f.get("calificable") && pub.materia_id) {
        const puntajeMaximo = Number(f.get("puntaje_maximo")) || 10;
        const indicadorId = await crearIndicadorParaTrabajo(pub.materia_id, f.get("titulo"), f.get("fecha"), puntajeMaximo);
        if (indicadorId) await sb.from("trabajos_cotidianos").update({ indicador_id: indicadorId }).eq("id", nuevo.id);
      }
      renderSubtema(id, soloLectura);
    });

    document.getElementById("subtema-trabajo-clase-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const f = new FormData(form);
      const btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      btn.textContent = "Agregando…";
      let archivoRuta = null, archivoNombre = null;
      const archivo = f.get("plantilla");
      if (archivo && archivo.size) {
        const rutaSegura = `plantillas-trabajo-clase/${sub.id}-${Date.now()}-${archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: errorSubida } = await sb.storage.from("materiales").upload(rutaSegura, archivo);
        if (errorSubida) {
          alert("No se pudo subir el documento base: " + errorSubida.message);
          btn.disabled = false;
          btn.textContent = "Agregar trabajo en clase";
          return;
        }
        archivoRuta = rutaSegura;
        archivoNombre = archivo.name;
      }
      await sb.from("trabajos_clase").insert({
        publicacion_id: sub.publicacion_id,
        subtema_id: sub.id,
        titulo: f.get("titulo"),
        fecha: f.get("fecha") || null,
        instrucciones: document.querySelector(".js-subtema-trabajo-clase-desc").innerHTML || null,
        archivo_ruta: archivoRuta,
        archivo_nombre: archivoNombre
      });
      renderSubtema(id, soloLectura);
    });

    const abrirActividadBtn = document.getElementById("abrir-actividad-interactiva");
    if (abrirActividadBtn) abrirActividadBtn.addEventListener("click", () => {
      const panel = document.getElementById("actividad-interactiva-panel");
      panel.innerHTML = construirSelectorTipoActividad();
      panel.querySelector("#actividad-tipo").addEventListener("change", (e) => {
        const constructor = panel.querySelector("#actividad-constructor");
        const tipoReal = tipoRealDeActividad(e.target.value);
        constructor.innerHTML = construirPanelActividadHTML(tipoReal, e.target.value);
        inicializarConstructorPorTipo(tipoReal, constructor);
        ajustarCampoCantidad(panel, tipoReal);
        const iaBloque = panel.querySelector("#actividad-ia-bloque");
        if (iaBloque) iaBloque.style.display = ["lluvia_ideas", "proyecto", "rubrica_directa", "respuesta_abierta", "autoevaluacion"].includes(tipoReal) ? "none" : "";
      });
      panel.querySelector("#actividad-tipo").dispatchEvent(new Event("change"));
      // Si se vino desde "▶ Iniciar" en la página de una estrategia de
      // evaluación (Estrategias de evaluación → demo), se preselecciona
      // esa estrategia acá y se avisa con un mensaje, para no tener que
      // buscarla de nuevo en el selector.
      const estrategiaPendiente = sessionStorage.getItem("ctp_lms_estrategia_pendiente");
      if (estrategiaPendiente) {
        sessionStorage.removeItem("ctp_lms_estrategia_pendiente");
        const selectTipo = panel.querySelector("#actividad-tipo");
        const opcionExiste = Array.from(selectTipo.options).some(o => o.value === estrategiaPendiente);
        if (opcionExiste) {
          selectTipo.value = estrategiaPendiente;
          selectTipo.dispatchEvent(new Event("change"));
          const preset = ESTRATEGIAS_EVALUACION[estrategiaPendiente];
          const aviso = document.createElement("p");
          aviso.style.cssText = "font-size:0.82rem; background:var(--warn-bg); border:1px solid #E8C777; border-radius:8px; padding:0.6rem 0.8rem; margin:0 0 0.8rem;";
          aviso.textContent = `✓ Vas a crear esta actividad con la estrategia "${preset ? preset.etiqueta : estrategiaPendiente}" — ya está elegida abajo. Ponele título y, si querés, ajustá la consigna.`;
          panel.insertBefore(aviso, panel.firstChild);
        }
      }
      panel.scrollIntoView({ behavior: "smooth", block: "start" });
      panel.querySelector("#generar-actividad-ia-btn").addEventListener("click", async (iaEv) => {
        const tipo = panel.querySelector("#actividad-tipo").value;
        const estado = panel.querySelector("#generar-actividad-ia-estado");
        const tema = (panel.querySelector("#actividad-titulo").value.trim() || sub.titulo || pub.titulo || "");
        if (!tema) { alert("Ponele un título a la actividad primero (o el subtema debe tener nombre), para que la IA sepa el tema."); return; }
        const quitarHtml = (v) => String(v || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        const contexto = [sub.titulo, quitarHtml(sub.descripcion), quitarHtml(resultado ? resultado.resultado : "")].filter(Boolean).join(" — ").slice(0, 1500);
        const instrucciones = (panel.querySelector("#actividad-ia-instrucciones")?.value || "").trim().slice(0, 800);
        const archivoInput = panel.querySelector("#actividad-ia-archivo");
        const archivos = archivoInput ? Array.from(archivoInput.files || []) : [];
        const cantidadInput = panel.querySelector("#actividad-ia-cantidad");
        const cantidad = cantidadInput ? Number(cantidadInput.value) || null : null;
        if (archivosExcedenLimiteIA(archivos)) {
          if (estado) estado.textContent = "Los archivos pesan demasiado en conjunto (máximo ~3MB entre todos). Probá con menos archivos o más livianos.";
          return;
        }
        iaEv.target.disabled = true;
        iaEv.target.textContent = "Generando…";
        if (estado) estado.textContent = "";
        try {
          const leerComoBase64 = (f) => new Promise((resolve, reject) => {
            const lector = new FileReader();
            lector.onload = () => resolve(String(lector.result).split(",")[1] || "");
            lector.onerror = () => reject(new Error("No se pudo leer el archivo."));
            lector.readAsDataURL(f);
          });
          let archivosPayload = [];
          if (archivos.length) {
            if (estado) estado.textContent = archivos.length > 1 ? `Leyendo ${archivos.length} archivos…` : "Leyendo el archivo…";
            archivosPayload = await Promise.all(archivos.map(async (a) => ({ mimeType: a.type, nombre: a.name, datosBase64: await leerComoBase64(a) })));
          }
          const r = await fetch("/api/generar-actividad-ia", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ tipo, tema, contexto, instrucciones, archivos: archivosPayload, cantidad })
          });
          const { datos, error } = await leerRespuestaIA(r);
          if (!datos) { if (estado) estado.textContent = "No se pudo generar: " + error; return; }
          if (!r.ok) { if (estado) estado.textContent = "No se pudo generar: " + (datos.error || "error desconocido."); return; }
          llenarPanelActividadConIA(tipo, panel.querySelector("#actividad-constructor"), datos.contenido);
          if (estado) estado.textContent = "Listo — revisá y editá antes de crear la actividad.";
        } catch (err) {
          if (estado) estado.textContent = "No se pudo conectar con la IA: " + (err.message || err);
        } finally {
          iaEv.target.disabled = false;
          iaEv.target.textContent = "✨ Generar con IA";
        }
      });
      panel.querySelector("#cancelar-actividad-interactiva").addEventListener("click", () => { panel.innerHTML = ""; });
      panel.querySelector("#guardar-actividad-interactiva").addEventListener("click", async (btnEv) => {
        const valorSelect = panel.querySelector("#actividad-tipo").value;
        const tipo = tipoRealDeActividad(valorSelect);
        const titulo = panel.querySelector("#actividad-titulo").value.trim();
        const fecha = panel.querySelector("#actividad-fecha").value || null;
        if (!titulo) { alert("Ponele un título a la actividad."); return; }
        const resultado = leerContenidoActividadDesdeFormulario(tipo, panel.querySelector("#actividad-constructor"));
        if (!resultado.valido) { alert(resultado.error); return; }
        const presetElegido = ESTRATEGIAS_EVALUACION[valorSelect];
        if (presetElegido && presetElegido.tiradera) {
          // Se marca la estrategia y qué dato del juego alimenta cada criterio.
          resultado.contenido.estrategia = valorSelect;
          resultado.contenido.criterios = (resultado.contenido.criterios || []).map((c, i) => {
            const base = presetElegido.criterios[i] || {};
            const x = { ...c };
            if (base.auto) x.auto = base.auto;
            // Niveles de desempeño (formato MEP) del indicador sugerido, si no se le cambió el nombre.
            x.niveles = base.nombre === c.nombre && base.niveles ? base.niveles : tiraderaNivelesDe(x);
            return x;
          });
          resultado.contenido.tiradera_instrumento = { ...TIRADERA_INSTRUMENTO_BASE, unidad: titulo };
        }
        if (!pub.materia_id) { alert("Este subtema no tiene una materia asociada, no se puede crear el indicador de calificación."); return; }
        const horaInicioInput = panel.querySelector("#au-prueba-hora-inicio");
        const fechaHoraInicio = (tipo === "prueba" && horaInicioInput && horaInicioInput.value) ? new Date(horaInicioInput.value).toISOString() : null;
        btnEv.target.disabled = true;
        btnEv.target.textContent = "Creando…";
        const indicadorId = await crearIndicadorParaTrabajo(pub.materia_id, titulo, fecha, 3, tipo === "prueba" ? "Pruebas" : (tipo === "proyecto" ? "Proyectos" : null));
        const { data: nuevo } = await sb.from("trabajos_cotidianos").insert({
          publicacion_id: sub.publicacion_id,
          subtema_id: sub.id,
          titulo,
          fecha,
          tipo_actividad: tipo,
          contenido_actividad: resultado.contenido,
          indicador_id: indicadorId,
          fecha_hora_inicio: fechaHoraInicio
        }).select().maybeSingle();
        if (!nuevo) { alert("No se pudo crear la actividad."); btnEv.target.disabled = false; btnEv.target.textContent = "Crear actividad"; return; }
        renderSubtema(id, soloLectura);
      });
    });

    const trabajoIaForm = document.querySelector(".subtema-trabajo-ia-form");
    const RANGOS_CANTIDAD_TRABAJO_IA = {
      seleccion_unica: { min: 3, max: 40, val: 15 },
      falso_verdadero: { min: 3, max: 40, val: 10 },
      crucigrama: { min: 4, max: 20, val: 7 },
      sopa_letras: { min: 4, max: 30, val: 10 }
    };
    if (trabajoIaForm) {
      const tipoSelectTrabajoIa = trabajoIaForm.querySelector(".subtema-trabajo-ia-tipo");
      const cantidadLabelTrabajoIa = trabajoIaForm.querySelector(".subtema-trabajo-ia-cantidad-label");
      const cantidadInputTrabajoIa = trabajoIaForm.querySelector(".subtema-trabajo-ia-cantidad");
      const actualizarCantidadTrabajoIa = () => {
        const r = RANGOS_CANTIDAD_TRABAJO_IA[tipoSelectTrabajoIa.value];
        if (!r) { cantidadLabelTrabajoIa.style.display = "none"; return; }
        cantidadLabelTrabajoIa.style.display = "flex";
        cantidadInputTrabajoIa.min = r.min;
        cantidadInputTrabajoIa.max = r.max;
        cantidadInputTrabajoIa.value = r.val;
      };
      tipoSelectTrabajoIa.addEventListener("change", actualizarCantidadTrabajoIa);
      actualizarCantidadTrabajoIa();
    }
    if (trabajoIaForm) trabajoIaForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const estado = form.querySelector(".subtema-trabajo-ia-estado");
      const tipo = form.querySelector(".subtema-trabajo-ia-tipo").value;
      const instrucciones = form.querySelector(".subtema-trabajo-ia-instrucciones").value.trim().slice(0, 800);
      const cantidad = Number(form.querySelector(".subtema-trabajo-ia-cantidad")?.value) || null;
      const archivoInput = form.querySelector(".subtema-trabajo-ia-archivo");
      const archivos = Array.from(archivoInput.files || []);
      if (!archivos.length) return;
      const boton = form.querySelector("button[type=submit]");

      if (tipo !== "normal") {
        // Reusa el panel y la lógica de "Crear actividad interactiva" ya
        // existente: abre el panel, le pasa los mismos archivos (vía
        // DataTransfer), las instrucciones y la cantidad, y dispara su
        // propio botón "Generar con IA".
        boton.disabled = true;
        boton.textContent = "Abriendo…";
        document.getElementById("abrir-actividad-interactiva").click();
        const panel = document.getElementById("actividad-interactiva-panel");
        const selectTipo = panel.querySelector("#actividad-tipo");
        selectTipo.value = tipo;
        selectTipo.dispatchEvent(new Event("change"));
        const dt = new DataTransfer();
        archivos.forEach(a => dt.items.add(a));
        panel.querySelector("#actividad-ia-archivo").files = dt.files;
        panel.querySelector("#actividad-ia-instrucciones").value = instrucciones;
        const cantidadPanelInput = panel.querySelector("#actividad-ia-cantidad");
        if (cantidadPanelInput && cantidad) cantidadPanelInput.value = cantidad;
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
        panel.querySelector("#generar-actividad-ia-btn").click();
        form.reset();
        estado.textContent = "Abrí el panel de actividad interactiva arriba — ahí mismo se está generando.";
        boton.disabled = false;
        boton.textContent = "✨ Generar";
        return;
      }

      if (archivosExcedenLimiteIA(archivos)) {
        estado.textContent = "Los archivos pesan demasiado en conjunto (máximo ~3MB entre todos). Probá con menos archivos o más livianos.";
        return;
      }

      const leerComoBase64 = (f) => new Promise((resolve, reject) => {
        const lector = new FileReader();
        lector.onload = () => resolve(String(lector.result).split(",")[1] || "");
        lector.onerror = () => reject(new Error("No se pudo leer el archivo."));
        lector.readAsDataURL(f);
      });

      boton.disabled = true;
      boton.textContent = "Generando…";
      estado.textContent = archivos.length > 1 ? `Leyendo ${archivos.length} archivos y generando con la IA (puede tardar unos segundos)…` : "Leyendo el archivo y generando con la IA (puede tardar unos segundos)…";
      try {
        const archivosPayload = await Promise.all(archivos.map(async (a) => ({ mimeType: a.type, nombre: a.name, datosBase64: await leerComoBase64(a) })));
        const quitarHtml = (v) => String(v || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        const contexto = [sub.titulo, quitarHtml(sub.descripcion), quitarHtml(resultado ? resultado.resultado : "")].filter(Boolean).join(" — ").slice(0, 1500);
        const r = await fetch("/api/generar-trabajo-ia", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            tema: sub.titulo || pub.titulo || "",
            contexto,
            instrucciones,
            archivos: archivosPayload
          })
        });
        const { datos, error } = await leerRespuestaIA(r);
        if (!datos) { estado.textContent = "No se pudo generar: " + error; return; }
        if (!r.ok) {
          estado.textContent = "No se pudo generar: " + (datos.error || "error desconocido.");
          return;
        }
        const trabajoForm = document.getElementById("subtema-trabajo-form");
        trabajoForm.querySelector("[name=titulo]").value = (datos.contenido && datos.contenido.titulo) || "";
        trabajoForm.querySelector(".js-subtema-trabajo-desc").innerHTML = (datos.contenido && datos.contenido.instrucciones_html) || "";
        trabajoForm.scrollIntoView({ behavior: "smooth", block: "start" });
        form.reset();
        estado.textContent = "Listo — revisá el título y las instrucciones arriba y dale \"Agregar trabajo\" cuando esté bien.";
      } catch (err) {
        estado.textContent = "No se pudo conectar con la IA: " + (err.message || err);
      } finally {
        boton.disabled = false;
        boton.textContent = "✨ Generar";
      }
    });

    const sugerirBtn = document.getElementById("sugerir-subtema-trabajos-btn");
    if (sugerirBtn) sugerirBtn.addEventListener("click", async () => {
      const estado = document.getElementById("sugerir-subtema-trabajos-estado");
      const lista = document.getElementById("sugerir-subtema-trabajos-lista");
      const textoOriginal = sugerirBtn.textContent;
      sugerirBtn.disabled = true;
      sugerirBtn.textContent = "Pensando…";
      if (estado) estado.textContent = "";
      lista.innerHTML = "";
      try {
        const instruccionesSugerir = (document.getElementById("sugerir-subtema-trabajos-instrucciones")?.value || "").trim().slice(0, 800);
        const r = await fetch("/api/generar-trabajos", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            resultado: (resultado ? resultado.resultado : pub.titulo) + " — Subtema: " + sub.titulo,
            saberes: sub.descripcion || (resultado ? resultado.saberes : ""),
            estrategiasEstudiante: resultado ? resultado.estrategias : "",
            evidencias: resultado ? resultado.evidencias : "",
            instrucciones: instruccionesSugerir
          })
        });
        const datos = await r.json();
        if (!r.ok) {
          if (estado) estado.textContent = "No se pudo generar: " + (datos.error || "error desconocido.");
          return;
        }
        const trabajosSugeridos = datos.trabajos || [];
        if (trabajosSugeridos.length === 0) {
          if (estado) estado.textContent = "La IA no propuso trabajos para este subtema.";
          return;
        }
        if (estado) estado.textContent = "Revisá las sugerencias y agregá las que le sirvan.";
        lista.innerHTML = trabajosSugeridos.map((t, i) => `
          <div class="roster-row" data-sugerencia="${i}" style="align-items:flex-start; flex-direction:column; gap:0.4rem;">
            <div style="display:flex; justify-content:space-between; width:100%; gap:0.5rem;">
              <strong style="font-size:0.9rem;">${t.titulo}</strong>
              <button class="btn small" type="button" data-agregar-sugerencia="${i}">+ Agregar</button>
            </div>
            ${t.descripcion ? `<div class="roa-cell-texto" style="font-size:0.85rem;">${t.descripcion}</div>` : ""}
          </div>`).join("");
        lista.querySelectorAll("[data-agregar-sugerencia]").forEach((btn) => {
          btn.addEventListener("click", async () => {
            const i = Number(btn.dataset.agregarSugerencia);
            const t = trabajosSugeridos[i];
            btn.disabled = true;
            btn.textContent = "Agregando…";
            await sb.from("trabajos_cotidianos").insert({
              publicacion_id: sub.publicacion_id,
              subtema_id: sub.id,
              titulo: t.titulo,
              descripcion: t.descripcion || null
            });
            const fila = btn.closest("[data-sugerencia]");
            if (fila) fila.remove();
            await pintarTrabajosCotidianosSubtema((await sb.from("trabajos_cotidianos").select("*").eq("subtema_id", sub.id).order("creado_en")).data || [], soloLectura, sub.id, pub.materia_id);
          });
        });
      } catch (err) {
        if (estado) estado.textContent = "No se pudo conectar con la IA: " + (err.message || err);
      } finally {
        sugerirBtn.disabled = false;
        sugerirBtn.textContent = textoOriginal;
      }
    });

    document.querySelector(".subtema-material-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const subtemaId = form.dataset.subtemaId;
      const estado = form.querySelector(".subtema-material-estado");
      const input = form.querySelector(".subtema-material-archivo");
      const archivo = input.files[0];
      if (!archivo) return;
      estado.textContent = "Subiendo…";
      const rutaSegura = `${sub.publicacion_id}/subtema-${subtemaId}/${Date.now()}-${archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error: errorSubida } = await sb.storage.from("materiales").upload(rutaSegura, archivo);
      if (errorSubida) {
        estado.textContent = "No se pudo subir: " + errorSubida.message;
        return;
      }
      await sb.from("materiales").insert({
        publicacion_id: sub.publicacion_id,
        subtema_id: subtemaId,
        nombre: archivo.name,
        ruta: rutaSegura,
        tipo: archivo.type || null,
        tamano_bytes: archivo.size || null
      });
      input.value = "";
      estado.textContent = "";
      const { data: actualizados } = await sb.from("materiales").select("*").eq("subtema_id", subtemaId).not("tipo", "in", "(slide-image,slide-doc)").order("creado_en");
      await pintarMaterialesSubtema(subtemaId, actualizados || [], soloLectura, sub.publicacion_id);
    });

    document.querySelector(".subtema-enlace-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const subtemaId = form.dataset.subtemaId;
      const estado = form.querySelector(".subtema-enlace-estado");
      const f = new FormData(form);
      let url = (f.get("url") || "").trim();
      if (url && !/^https?:\/\//i.test(url)) url = "https://" + url;
      await sb.from("materiales").insert({
        publicacion_id: sub.publicacion_id,
        subtema_id: subtemaId,
        nombre: f.get("titulo"),
        ruta: url,
        tipo: "link",
        tamano_bytes: null
      });
      form.reset();
      estado.textContent = "";
      const { data: actualizados } = await sb.from("materiales").select("*").eq("subtema_id", subtemaId).not("tipo", "in", "(slide-image,slide-doc)").order("creado_en");
      await pintarMaterialesSubtema(subtemaId, actualizados || [], soloLectura, sub.publicacion_id);
    });

    const materialIaForm = document.querySelector(".subtema-material-ia-form");
    if (materialIaForm) materialIaForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const subtemaId = form.dataset.subtemaId;
      const estado = form.querySelector(".subtema-material-ia-estado");
      const input = form.querySelector(".subtema-material-ia-archivo");
      const instrucciones = form.querySelector(".subtema-material-ia-instrucciones").value.trim().slice(0, 800);
      const archivo = input.files[0];
      if (!archivo) return;
      const boton = form.querySelector("button[type=submit]");

      const leerComoBase64 = (f) => new Promise((resolve, reject) => {
        const lector = new FileReader();
        lector.onload = () => resolve(String(lector.result).split(",")[1] || "");
        lector.onerror = () => reject(new Error("No se pudo leer el archivo."));
        lector.readAsDataURL(f);
      });

      boton.disabled = true;
      boton.textContent = "Generando…";
      estado.textContent = "Leyendo el archivo y generando con la IA (puede tardar unos segundos)…";
      try {
        const datosBase64 = await leerComoBase64(archivo);
        const quitarHtml = (v) => String(v || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        const contexto = [sub.titulo, quitarHtml(sub.descripcion), quitarHtml(resultado ? resultado.resultado : "")].filter(Boolean).join(" — ").slice(0, 1500);
        const r = await fetch("/api/generar-material-ia", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            tema: sub.titulo || pub.titulo || "",
            contexto,
            instrucciones,
            archivo: { mimeType: archivo.type, datosBase64 }
          })
        });
        const datos = await r.json();
        if (!r.ok) {
          estado.textContent = "No se pudo generar: " + (datos.error || "error desconocido.");
          return;
        }
        const titulo = (datos.contenido && datos.contenido.titulo) || "Material generado con IA";
        const contenidoHtml = (datos.contenido && datos.contenido.contenido_html) || "";

        estado.textContent = "Agregando el material generado…";
        const paginaHtml = `<!doctype html><html lang="es"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${titulo}</title>
<style>body{font-family:system-ui,sans-serif; max-width:40rem; margin:2rem auto; padding:0 1rem; line-height:1.5; color:#222;} h4{margin-top:1.4rem;}</style>
</head><body><h3>${titulo}</h3>${contenidoHtml}</body></html>`;
        const blob = new Blob([paginaHtml], { type: "text/html" });
        const rutaSegura = `${sub.publicacion_id}/subtema-${subtemaId}/ia-${Date.now()}.html`;
        const { error: errorSubida } = await sb.storage.from("materiales").upload(rutaSegura, blob, { contentType: "text/html" });
        if (errorSubida) {
          estado.textContent = "La IA generó el contenido, pero no se pudo guardar: " + errorSubida.message;
          return;
        }
        await sb.from("materiales").insert({
          publicacion_id: sub.publicacion_id,
          subtema_id: subtemaId,
          nombre: `✨ ${titulo}`,
          ruta: rutaSegura,
          tipo: "text/html",
          tamano_bytes: blob.size
        });
        form.reset();
        estado.textContent = "¡Listo! Se agregó como material de apoyo.";
        setTimeout(() => { if (estado.textContent === "¡Listo! Se agregó como material de apoyo.") estado.textContent = ""; }, 4000);
        const { data: actualizados } = await sb.from("materiales").select("*").eq("subtema_id", subtemaId).not("tipo", "in", "(slide-image,slide-doc)").order("creado_en");
        await pintarMaterialesSubtema(subtemaId, actualizados || [], soloLectura, sub.publicacion_id);
      } catch (err) {
        estado.textContent = "No se pudo conectar con la IA: " + (err.message || err);
      } finally {
        boton.disabled = false;
        boton.textContent = "✨ Generar y agregar";
      }
    });

    const presentacionForm = document.querySelector(".subtema-presentacion-form");
    if (presentacionForm) presentacionForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.target;
      const subtemaId = form.dataset.subtemaId;
      const estado = form.querySelector(".subtema-presentacion-estado");
      const input = form.querySelector(".subtema-presentacion-archivos");
      const archivos = Array.from(input.files || []);
      if (!archivos.length) return;

      const existentes = (await sb.from("materiales").select("id, ruta").eq("subtema_id", subtemaId).in("tipo", TIPOS_PRESENTACION)).data || [];
      if (existentes.length) {
        estado.textContent = "Quitando presentación anterior…";
        await sb.storage.from("materiales").remove(existentes.map(m => m.ruta));
        await sb.from("materiales").delete().in("id", existentes.map(m => m.id));
      }

      // Si se eligió un solo archivo que NO es imagen (PDF, PowerPoint, Word, Excel),
      // se guarda como un único "slide-doc" para verse en el visor de documentos.
      // Si se eligieron una o varias imágenes, se guardan como "slide-image" (diapositivas).
      const todosSonImagenes = archivos.every(a => a.type.startsWith("image/"));

      if (!todosSonImagenes) {
        if (archivos.length > 1) {
          estado.textContent = "Para un documento (PDF, PowerPoint, Word, Excel) subí un solo archivo. Para varias diapositivas, usá solo imágenes.";
          return;
        }
        const archivo = archivos[0];
        estado.textContent = "Subiendo documento…";
        const rutaSegura = `${sub.publicacion_id}/subtema-${subtemaId}/presentacion/${Date.now()}-${archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: errorSubida } = await sb.storage.from("materiales").upload(rutaSegura, archivo);
        if (errorSubida) {
          estado.textContent = "No se pudo subir: " + errorSubida.message;
          return;
        }
        await sb.from("materiales").insert({
          publicacion_id: sub.publicacion_id,
          subtema_id: subtemaId,
          nombre: archivo.name,
          ruta: rutaSegura,
          tipo: "slide-doc",
          tamano_bytes: archivo.size || null
        });
        renderSubtema(id, soloLectura);
        return;
      }

      for (let i = 0; i < archivos.length; i++) {
        const archivo = archivos[i];
        estado.textContent = `Subiendo diapositiva ${i + 1} de ${archivos.length}…`;
        const rutaSegura = `${sub.publicacion_id}/subtema-${subtemaId}/presentacion/${String(i + 1).padStart(3, "0")}-${Date.now()}-${archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: errorSubida } = await sb.storage.from("materiales").upload(rutaSegura, archivo);
        if (errorSubida) {
          estado.textContent = "No se pudo subir: " + errorSubida.message;
          return;
        }
        await sb.from("materiales").insert({
          publicacion_id: sub.publicacion_id,
          subtema_id: subtemaId,
          nombre: archivo.name,
          ruta: rutaSegura,
          tipo: "slide-image",
          tamano_bytes: archivo.size || null
        });
      }
      renderSubtema(id, soloLectura);
    });

    const borrarPresentacionBtn = document.getElementById(`borrar-presentacion-${sub.id}`);
    if (borrarPresentacionBtn) borrarPresentacionBtn.addEventListener("click", async () => {
      if (!confirm("¿Quitar la presentación de este subtema?")) return;
      const existentes = (await sb.from("materiales").select("id, ruta").eq("subtema_id", sub.id).in("tipo", TIPOS_PRESENTACION)).data || [];
      if (existentes.length) {
        await sb.storage.from("materiales").remove(existentes.map(m => m.ruta));
        await sb.from("materiales").delete().in("id", existentes.map(m => m.id));
      }
      renderSubtema(id, soloLectura);
    });
  }

  await pintarTrabajosCotidianosSubtema(trabajos || [], soloLectura, sub.id, pub.materia_id);
  async function cargarTrabajosClaseSubtema() {
    const { data } = await sb.from("trabajos_clase").select("*").eq("subtema_id", id).order("creado_en");
    await pintarTrabajosClase(data || [], soloLectura, "subtema-trabajos-clase-lista", { recargar: cargarTrabajosClaseSubtema });
  }
  await pintarTrabajosClase(trabajosClase || [], soloLectura, "subtema-trabajos-clase-lista", { recargar: cargarTrabajosClaseSubtema });
  await pintarMaterialesSubtema(sub.id, materiales || [], soloLectura, sub.publicacion_id);
  await pintarPresentacionSubtema(sub.id, diapositivas, soloLectura);
}

// "Trabajos en clase": a diferencia de los trabajos cotidianos, no llevan
// indicador/rúbrica — el profesor sube un documento base (plantilla), cada
// estudiante lo descarga, lo completa en su computadora y sube su propia
// versión terminada, y el profesor le pone una nota manual (0-100).
// Se usa tanto a nivel de tema (sin subtema) como a nivel de subtema, por
// eso recibe el id del elemento donde pintar y un callback para recargar.
async function pintarTrabajosClase(trabajos, soloLectura, holderId, opts) {
  const holder = document.getElementById(holderId);
  if (!holder) return;
  const recargar = opts && opts.recargar;

  if (trabajos.length === 0) {
    holder.innerHTML = `<p class="empty">Todavía no hay trabajos en clase.</p>`;
    return;
  }

  if (soloLectura) {
    trabajos = trabajos.filter(t => t.habilitado !== false);
    if (trabajos.length === 0) {
      holder.innerHTML = `<p class="empty">Todavía no hay trabajos en clase habilitados.</p>`;
      return;
    }
    const estudianteId = session.id;
    const trabajoIds = trabajos.map(t => t.id);
    const { data: misEntregas } = await sb.from("trabajos_clase_estudiante").select("*").eq("estudiante_id", estudianteId).in("trabajo_id", trabajoIds);
    const entregaPorTrabajo = {};
    (misEntregas || []).forEach(e => { entregaPorTrabajo[e.trabajo_id] = e; });

    holder.innerHTML = trabajos.map(t => {
      const miEntrega = entregaPorTrabajo[t.id];
      const yaEntregado = !!(miEntrega && miEntrega.archivo_ruta);
      let linkPlantilla = "";
      if (t.archivo_ruta) linkPlantilla = sb.storage.from("materiales").getPublicUrl(t.archivo_ruta).data.publicUrl;
      let linkMiEntrega = "";
      if (miEntrega && miEntrega.archivo_ruta) linkMiEntrega = sb.storage.from("materiales").getPublicUrl(miEntrega.archivo_ruta).data.publicUrl;
      return `
      <div class="roster-row" style="align-items:flex-start; flex-direction:column; gap:0.3rem;">
        <div style="display:flex; justify-content:space-between; width:100%; align-items:center; flex-wrap:wrap; gap:0.4rem;">
          <span class="name">${t.titulo}${t.fecha ? " · " + t.fecha : ""}</span>
          ${yaEntregado
            ? `<span class="badge" style="background:var(--success-bg); color:var(--success-text);">✓ Entregado${miEntrega.nota != null ? " · Nota: " + miEntrega.nota : ""}</span>`
            : ""}
        </div>
        ${t.instrucciones ? `<div class="roa-cell-texto" style="font-size:0.85rem;">${t.instrucciones}</div>` : ""}
        ${linkPlantilla ? `<a class="btn secondary small" href="${linkPlantilla}" target="_blank" rel="noopener">⬇️ Descargar documento base: ${t.archivo_nombre || "archivo"}</a>` : ""}
        ${yaEntregado
          ? `<a class="btn secondary small" href="${linkMiEntrega}" target="_blank" rel="noopener">👁️ Consultar mi entrega: ${miEntrega.archivo_nombre || "archivo"}</a>`
            + (puedeEditarEntregas() && miEntrega.nota == null ? `<label class="btn small" style="cursor:pointer;">✏️ Cambiar mi archivo<input type="file" data-clase-subir="${t.id}" style="display:none;" /></label>` : "")
            + (puedeEditarEntregas() && miEntrega.nota != null ? `<span style="font-size:0.78rem; color:var(--text-muted);">🔒 Ya fue calificada — no se puede cambiar.</span>` : "")
          : `<label class="btn small" style="cursor:pointer;">📎 Subir mi trabajo completado<input type="file" data-clase-subir="${t.id}" style="display:none;" /></label>`}
        <span data-clase-subir-estado="${t.id}" style="font-size:0.78rem; color:var(--text-muted);"></span>
      </div>`;
    }).map((h, i) => `<div data-fila-trabajo="${trabajos[i].id}" style="display:contents">${h}</div>`).join("");
    await agregarDocumentoDefinitivo(holder, trabajos, estudianteId, "clase:");

    holder.querySelectorAll("[data-clase-subir]").forEach(input => {
      input.addEventListener("change", async () => {
        const trabajoId = input.dataset.claseSubir;
        const archivo = input.files[0];
        if (!archivo) return;
        const estado = holder.querySelector(`[data-clase-subir-estado="${trabajoId}"]`);
        if (estado) estado.textContent = "Subiendo…";
        const rutaSegura = `entregas-trabajo-clase/trabajo-${trabajoId}/${estudianteId}-${Date.now()}-${archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: errorSubida } = await sb.storage.from("materiales").upload(rutaSegura, archivo);
        if (errorSubida) {
          if (estado) estado.textContent = "No se pudo subir: " + errorSubida.message;
          return;
        }
        const { error: errorGuardado } = await upsertSinConflicto(
          "trabajos_clase_estudiante",
          { trabajo_id: trabajoId, estudiante_id: estudianteId },
          { entregado_en: new Date().toISOString(), archivo_ruta: rutaSegura, archivo_nombre: archivo.name }
        );
        if (errorGuardado) {
          if (estado) estado.textContent = "⚠️ El archivo se subió pero no se pudo registrar la entrega (" + errorGuardado.message + "). Avisale a tu profesor.";
          return;
        }
        if (estado) estado.textContent = "✅ ¡Archivo subido correctamente!";
        setTimeout(() => { if (recargar) recargar(); else holder.innerHTML = "Cargando…"; }, 1100);
      });
    });
  } else {
    const trabajoIds = trabajos.map(t => t.id);
    const { data: todasEntregas } = await sb.from("trabajos_clase_estudiante").select("*").in("trabajo_id", trabajoIds);
    const entregasPorTrabajo = {};
    (todasEntregas || []).forEach(e => {
      if (!entregasPorTrabajo[e.trabajo_id]) entregasPorTrabajo[e.trabajo_id] = [];
      entregasPorTrabajo[e.trabajo_id].push(e);
    });
    const estudiantesPorId = {};
    const estudianteIds = (todasEntregas || []).map(e => e.estudiante_id);
    if (estudianteIds.length) {
      const { data: estudiantesData } = await sb.from("estudiantes").select("id, nombre, apellido1, apellido2").in("id", estudianteIds);
      (estudiantesData || []).forEach(e => { estudiantesPorId[e.id] = [e.nombre, e.apellido1, e.apellido2].filter(Boolean).join(" "); });
    }

    holder.innerHTML = trabajos.map(t => {
      let linkPlantilla = "";
      if (t.archivo_ruta) linkPlantilla = sb.storage.from("materiales").getPublicUrl(t.archivo_ruta).data.publicUrl;
      const entregas = entregasPorTrabajo[t.id] || [];
      return `
      <div class="roster-row" style="align-items:flex-start; flex-direction:column; gap:0.3rem; ${t.habilitado === false ? "opacity:0.55;" : ""}">
        <div style="display:flex; justify-content:space-between; width:100%; align-items:center; flex-wrap:wrap; gap:0.4rem;">
          <span class="name">${t.titulo}${t.fecha ? " · " + t.fecha : ""}</span>
          <span style="display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap;">
            <span class="badge">${entregas.filter(e => e.archivo_ruta).length} entregaron</span>
            <button class="btn ${t.habilitado === false ? "" : "secondary"} small" data-toggle-clase-habilitado="${t.id}" data-estado-actual="${t.habilitado !== false}">
              ${t.habilitado === false ? "Habilitar" : "Habilitado"}
            </button>
            <button class="btn secondary small" data-ver-entregas-clase="${t.id}">📂 Ver entregas y calificar</button>
            <button class="btn danger small" data-del-clase="${t.id}">Eliminar</button>
          </span>
        </div>
        ${t.instrucciones ? `<div class="roa-cell-texto" style="font-size:0.85rem;">${t.instrucciones}</div>` : ""}
        ${linkPlantilla ? `<a class="btn secondary small" href="${linkPlantilla}" target="_blank" rel="noopener">📎 Ver documento base: ${t.archivo_nombre || "archivo"}</a>` : ""}
        <div data-entregas-clase-panel="${t.id}" style="width:100%;"></div>
      </div>`;
    }).map((h, i) => `<div data-fila-trabajo="${trabajos[i].id}" style="display:contents">${h}</div>`).join("");
    agregarPanelDocumentosDocente(holder, trabajos, "clase:");

    holder.querySelectorAll("[data-toggle-clase-habilitado]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const trabajoId = btn.dataset.toggleClaseHabilitado;
        const habilitadoActual = btn.dataset.estadoActual === "true";
        await sb.from("trabajos_clase").update({ habilitado: !habilitadoActual }).eq("id", trabajoId);
        if (recargar) recargar();
      });
    });

    holder.querySelectorAll("[data-del-clase]").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!confirm("¿Eliminar este trabajo en clase y sus entregas?")) return;
        const trabajoId = btn.dataset.delClase;
        await sb.from("trabajos_clase_estudiante").delete().eq("trabajo_id", trabajoId);
        await sb.from("trabajos_clase").delete().eq("id", trabajoId);
        if (recargar) recargar();
      });
    });

    holder.querySelectorAll("[data-ver-entregas-clase]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const trabajoId = btn.dataset.verEntregasClase;
        const panel = holder.querySelector(`[data-entregas-clase-panel="${trabajoId}"]`);
        if (!panel) return;
        if (panel.innerHTML.trim()) { panel.innerHTML = ""; return; }
        const entregas = (entregasPorTrabajo[trabajoId] || entregasPorTrabajo[Number(trabajoId)] || []).filter(e => e.archivo_ruta);
        if (entregas.length === 0) {
          panel.innerHTML = `<p class="empty" style="font-size:0.82rem;">Todavía nadie ha entregado este trabajo.</p>`;
        } else {
          panel.innerHTML = `<div style="margin-top:0.5rem; padding:0.6rem; background:var(--paper); border-left:2px solid var(--paper-line);">` +
            entregas.map(e => {
              const link = sb.storage.from("materiales").getPublicUrl(e.archivo_ruta).data.publicUrl;
              const nombreEst = estudiantesPorId[e.estudiante_id] || ("Estudiante #" + e.estudiante_id);
              return `<div class="roster-row" style="flex-wrap:wrap; gap:0.5rem; align-items:center;">
                <span class="name" style="flex:1; min-width:9rem;">${nombreEst}</span>
                <a class="btn secondary small" href="${link}" target="_blank" rel="noopener">⬇️ ${e.archivo_nombre || "archivo"}</a>
                <input type="number" min="0" max="100" step="0.1" placeholder="Nota" value="${e.nota != null ? e.nota : ""}" data-nota-clase="${e.trabajo_id}" data-nota-estudiante="${e.estudiante_id}" style="width:5.5rem;" />
                <button class="btn small" data-guardar-nota-clase="${e.trabajo_id}" data-guardar-nota-estudiante="${e.estudiante_id}">Guardar nota</button>
                <button class="btn secondary small" data-permitir-reintento-clase="${e.trabajo_id}" data-permitir-reintento-clase-estudiante="${e.estudiante_id}">↺ Permitir reintento</button>
              </div>`;
            }).join("") + `</div>`;
          panel.querySelectorAll("[data-guardar-nota-clase]").forEach(gbtn => {
            gbtn.addEventListener("click", async () => {
              const tId = gbtn.dataset.guardarNotaClase;
              const eId = gbtn.dataset.guardarNotaEstudiante;
              const input = panel.querySelector(`[data-nota-clase="${tId}"][data-nota-estudiante="${eId}"]`);
              const nota = input && input.value !== "" ? Number(input.value) : null;
              gbtn.textContent = "Guardando…";
              await sb.from("trabajos_clase_estudiante").update({ nota }).eq("trabajo_id", tId).eq("estudiante_id", eId);
              gbtn.textContent = "Guardado ✓";
              setTimeout(() => { gbtn.textContent = "Guardar nota"; }, 1200);
            });
          });
          panel.querySelectorAll("[data-permitir-reintento-clase]").forEach(rbtn => {
            rbtn.addEventListener("click", async () => {
              if (!confirm("¿Permitir que este estudiante vuelva a subir su entrega? Se borrará el archivo entregado.")) return;
              const tId = rbtn.dataset.permitirReintentoClase;
              const eId = rbtn.dataset.permitirReintentoClaseEstudiante;
              await sb.from("trabajos_clase_estudiante").update({ archivo_ruta: null, archivo_nombre: null, entregado_en: null }).eq("trabajo_id", tId).eq("estudiante_id", eId);
              if (recargar) recargar();
            });
          });
        }
      });
    });
  }
}

// Sección 11-3: el estudiante puede reemplazar el archivo de una entrega
// mientras el profesor todavía no la haya calificado. (Otras secciones
// siguen como antes: una vez entregado, solo el profesor puede reabrirlo.)
function puedeEditarEntregas(seccion) {
  if (!session) return false;
  if (session.role === "estudiante") return esSeccion113(session.seccion);
  // El profesor en "Ver como estudiante" (solo donde se conoce la sección del estudiante).
  return !!previewEstudianteId && esSeccion113(seccion);
}
// Ids de los trabajos cotidianos del estudiante que ya tienen calificación
// en la rúbrica (el trabajo está vinculado a un indicador con nota puesta).
async function trabajosCalificadosIds(trabajos, estudianteId) {
  const conIndicador = (trabajos || []).filter(t => t.indicador_id);
  if (!conIndicador.length) return new Set();
  const { data } = await sb.from("calificaciones_indicador").select("indicador_id").eq("estudiante_id", estudianteId).in("indicador_id", conIndicador.map(t => t.indicador_id));
  const indicadores = new Set((data || []).map(r => r.indicador_id));
  return new Set(conIndicador.filter(t => indicadores.has(t.indicador_id)).map(t => t.id));
}

async function pintarTrabajosCotidianosSubtema(trabajos, soloLectura, subtemaId, materiaId) {
  const holder = document.getElementById("subtema-trabajos-lista");
  if (!holder) return;

  if (trabajos.length === 0) {
    holder.innerHTML = `<p class="empty">Todavía no hay trabajos cotidianos en este subtema.</p>`;
    return;
  }

  if (soloLectura) {
    trabajos = trabajos.filter(t => t.habilitado !== false);
    if (trabajos.length === 0) {
      holder.innerHTML = `<p class="empty">Todavía no hay trabajos cotidianos habilitados en este subtema.</p>`;
      return;
    }
    const estudianteId = session.id;
    const trabajoIds = trabajos.map(t => t.id);
    const { data: misEstados } = await sb.from("trabajos_cotidianos_estudiante").select("*").eq("estudiante_id", estudianteId).in("trabajo_id", trabajoIds);
    const porTrabajo = {};
    const estadoPorTrabajo = {};
    (misEstados || []).forEach(e => { porTrabajo[e.trabajo_id] = e.completado; estadoPorTrabajo[e.trabajo_id] = e; });

    const editable = puedeEditarEntregas();
    const calificados = editable ? await trabajosCalificadosIds(trabajos, estudianteId) : new Set();

    const trabajosActividad = trabajos.filter(t => t.tipo_actividad && t.tipo_actividad !== "simple");
    const { data: misResultados } = trabajosActividad.length
      ? await sb.from("actividades_estudiante").select("*").eq("estudiante_id", estudianteId).in("trabajo_id", trabajosActividad.map(t => t.id))
      : { data: [] };
    const resultadoPorTrabajo = {};
    (misResultados || []).forEach(r => { resultadoPorTrabajo[r.trabajo_id] = r; });

    const trabajosLluviaMios = trabajos.filter(t => t.tipo_actividad === "lluvia_ideas");
    // Se trae la pizarra completa (las ideas de TODOS los estudiantes, no
    // solo las propias) para que la "Lluvia de ideas" se vea como una
    // pizarra compartida en vivo, donde se nota quién va participando.
    const { data: todasIdeasLluvia } = trabajosLluviaMios.length
      ? await sb.from("trabajo_ideas").select("*").in("trabajo_id", trabajosLluviaMios.map(t => t.id)).order("creado_en")
      : { data: [] };
    const autoresIds = [...new Set((todasIdeasLluvia || []).map(i => i.estudiante_id))];
    const { data: autoresInfo } = autoresIds.length
      ? await sb.from("estudiantes").select("id, nombre, apellido1").in("id", autoresIds)
      : { data: [] };
    const nombreAutorPorId = {};
    (autoresInfo || []).forEach(e => { nombreAutorPorId[e.id] = `${e.nombre} ${e.apellido1}`; });
    const ideasPorTrabajo = {};
    (todasIdeasLluvia || []).forEach(i => { (ideasPorTrabajo[i.trabajo_id] = ideasPorTrabajo[i.trabajo_id] || []).push(i); });

    const trabajosProyectoMios = trabajos.filter(t => t.tipo_actividad === "proyecto");
    const { data: misEntregasProyecto } = trabajosProyectoMios.length
      ? await sb.from("proyecto_entregas").select("*").eq("estudiante_id", estudianteId).in("trabajo_id", trabajosProyectoMios.map(t => t.id)).order("creado_en", { ascending: false })
      : { data: [] };
    const entregasProyectoPorTrabajo = {};
    (misEntregasProyecto || []).forEach(e => { (entregasProyectoPorTrabajo[e.trabajo_id] = entregasProyectoPorTrabajo[e.trabajo_id] || []).push(e); });

    holder.innerHTML = trabajos.map(t => {
      const esActividad = t.tipo_actividad && t.tipo_actividad !== "simple";
      if (esActividad && t.tipo_actividad === "proyecto") {
        const misEntregas = entregasProyectoPorTrabajo[t.id] || [];
        const instrucciones = (t.contenido_actividad && t.contenido_actividad.instrucciones) || "";
        return `
        <div class="roster-row" style="align-items:flex-start; flex-direction:column; gap:0.4rem;">
          <div style="display:flex; justify-content:space-between; width:100%; align-items:center; flex-wrap:wrap; gap:0.4rem;">
            <span class="name">📁 ${t.titulo}${t.fecha ? " · " + t.fecha : ""}</span>
            <span class="badge" style="font-weight:400;">${NOMBRES_ACTIVIDAD[t.tipo_actividad] || t.tipo_actividad}</span>
          </div>
          ${instrucciones ? `<div class="roa-cell-texto" style="font-size:0.85rem;">${instrucciones}</div>` : ""}
          ${misEntregas.length ? `<span class="badge" style="background:var(--success-bg); color:var(--success-text);">✓ Ya entregaste ${misEntregas.length} ve${misEntregas.length === 1 ? "z" : "ces"} — podés volver a entregar si necesitás corregir algo</span>` : ""}
          ${avisoLimiteProyectoHTML(t.contenido_actividad)}
          ${estadoLimiteProyecto(t.contenido_actividad).vencido ? "" : `          <form class="inline-form" data-proyecto-form="${t.id}" style="margin-top:0.3rem; width:100%;">
            <input name="titulo" placeholder="${t.contenido_actividad?.placeholder_titulo || "Título de tu entrega"}" required style="flex:1; min-width:10rem" />
            <textarea name="descripcion" data-proyecto-descripcion="${t.id}" placeholder="${t.contenido_actividad?.placeholder_descripcion || "Descripción de tu entrega"}" rows="3" required minlength="${t.contenido_actividad?.min_caracteres_descripcion || 1}" style="flex-basis:100%; font-family:inherit; resize:vertical;"></textarea>
            ${t.contenido_actividad?.min_caracteres_descripcion ? `<span data-proyecto-contador="${t.id}" style="flex-basis:100%; font-size:0.75rem; color:var(--text-muted);">0 / ${t.contenido_actividad.min_caracteres_descripcion} caracteres mínimo</span>` : ""}
            ${esSeccion113(session.seccion) ? camposArchivosProyecto113() : `            <label style="flex-basis:100%; font-size:0.82rem;">Archivo:
              <input type="file" name="archivo" required style="display:block; margin-top:0.3rem;" />
            </label>`}
            <button class="btn small" type="submit">Enviar entrega</button>
            <span data-proyecto-estado="${t.id}" style="font-size:0.78rem; color:var(--text-muted);"></span>
          </form>`}
          ${misEntregas.length ? `<div style="width:100%; display:grid; gap:0.4rem; margin-top:0.3rem;">
            ${misEntregas.map(e => {
              const { data: pub } = sb.storage.from("materiales").getPublicUrl(e.archivo_ruta);
              return `<div style="font-size:0.82rem; padding:0.4rem 0.5rem; background:var(--surface-soft); border-radius:6px;">
                <strong>${e.titulo}</strong> <span style="color:var(--text-muted);">· ${formatearFechaHora(e.creado_en)}</span>
                ${e.descripcion ? `<div style="margin-top:0.2rem;">${e.descripcion}</div>` : ""}
                ${enlacesArchivosProyecto(e)}
                ${botonModificarProyectoHTML(e, t.contenido_actividad)}
              </div>`;
            }).join("")}
          </div>` : ""}
        </div>`;
      }
      if (esActividad && t.tipo_actividad === "lluvia_ideas") {
        const ideasTrabajo = ideasPorTrabajo[t.id] || [];
        const participantes = new Set(ideasTrabajo.map(i => i.estudiante_id)).size;
        const pregunta = (t.contenido_actividad && t.contenido_actividad.pregunta) || "";
        return `
        <div class="roster-row" style="align-items:flex-start; flex-direction:column; gap:0.4rem;">
          <div style="display:flex; justify-content:space-between; width:100%; align-items:center; flex-wrap:wrap; gap:0.4rem;">
            <span class="name">💡 ${t.titulo}${t.fecha ? " · " + t.fecha : ""}</span>
            <span class="badge" style="font-weight:400;">${NOMBRES_ACTIVIDAD[t.tipo_actividad] || t.tipo_actividad}</span>
          </div>
          ${pregunta ? `<div class="roa-cell-texto" style="font-size:0.85rem;">${pregunta}</div>` : ""}
          <div style="display:flex; gap:0.5rem; width:100%; flex-wrap:wrap;">
            <input type="text" data-idea-input="${t.id}" placeholder="Escribí tu idea…" maxlength="300" style="flex:1; min-width:12rem; padding:0.5rem 0.6rem; border:1px solid var(--paper-line); border-radius:var(--radius); font-family:var(--sans); font-size:0.85rem;" />
            <button class="btn small" data-idea-enviar="${t.id}">Enviar idea</button>
            <button class="btn secondary small" data-idea-refrescar="${t.id}" title="Actualizar la pizarra para ver las ideas nuevas de tus compañeros">🔄 Actualizar pizarra</button>
          </div>
          <span data-idea-estado="${t.id}" style="font-size:0.78rem; color:var(--text-muted);"></span>
          <div style="width:100%; margin-top:0.3rem;">
            <p style="font-size:0.76rem; color:var(--text-muted); margin:0 0 0.4rem;">🗒️ Pizarra compartida — ${participantes} compañero${participantes === 1 ? "" : "s"} participando · ${ideasTrabajo.length} idea${ideasTrabajo.length === 1 ? "" : "s"} en total</p>
            ${ideasTrabajo.length ? `<div style="width:100%; display:grid; gap:0.3rem;">
              ${ideasTrabajo.map(idea => {
                const esMia = String(idea.estudiante_id) === String(estudianteId);
                return `
              <div style="font-size:0.82rem; padding:0.35rem 0.5rem; border-left:3px solid ${idea.calificacion === "buena" ? "#1d7a43" : (idea.calificacion === "mala" ? "#c0392b" : "#bbb")}; background:${esMia ? "var(--warn-bg)" : "var(--surface-soft)"};">
                <strong>${nombreAutorPorId[idea.estudiante_id] || "Compañero"}${esMia ? " (vos)" : ""}:</strong> ${idea.texto}${idea.calificacion === "buena" ? " · 👍" : (idea.calificacion === "mala" ? " · 👎" : "")}
              </div>`;
              }).join("")}
            </div>` : `<p class="empty" style="font-size:0.8rem;">Todavía nadie ha escrito una idea — ¡sé el primero!</p>`}
          </div>
        </div>`;
      }
      if (esActividad && t.tipo_actividad === "infografia") {
        const res = resultadoPorTrabajo[t.id];
        const instrucciones = (t.contenido_actividad && t.contenido_actividad.instrucciones) || "";
        return `
        <div class="roster-row" style="align-items:flex-start; flex-direction:column; gap:0.4rem;">
          <div style="display:flex; justify-content:space-between; width:100%; align-items:center; flex-wrap:wrap; gap:0.4rem;">
            <span class="name">🖼️ ${t.titulo}${t.fecha ? " · " + t.fecha : ""}</span>
            <span class="badge" style="font-weight:400;">${NOMBRES_ACTIVIDAD[t.tipo_actividad] || t.tipo_actividad}</span>
          </div>
          ${instrucciones ? `<div class="roa-cell-texto" style="font-size:0.85rem;">${instrucciones}</div>` : ""}
          ${res && res.archivo_ruta
            ? (() => {
                const { data: pub } = sb.storage.from("materiales").getPublicUrl(res.archivo_ruta);
                return `<span class="badge" style="background:var(--success-bg); color:var(--success-text);">✓ Entregado: ${res.archivo_nombre || "archivo"}${res.puntaje != null ? " — Nota: " + res.puntaje + "/3" : " (pendiente de calificación)"}</span>
               <a class="btn secondary small" href="${pub.publicUrl}" target="_blank" rel="noopener">👁️ Consultar mi entrega</a>`
                 + (puedeEditarEntregas() && res.puntaje == null ? `<label class="btn small" style="cursor:pointer;">✏️ Cambiar mi archivo<input type="file" data-infografia-subir="${t.id}" accept="image/*,.pdf" style="display:none;" /></label>` : "")
                 + (puedeEditarEntregas() && res.puntaje != null ? `<span style="font-size:0.78rem; color:var(--text-muted);">🔒 Ya fue calificada — no se puede cambiar.</span>` : "");
              })()
            : `<label class="btn small" style="cursor:pointer;">📎 Subir archivo (imagen o PDF)<input type="file" data-infografia-subir="${t.id}" accept="image/*,.pdf" style="display:none;" /></label>`}
          <span data-infografia-estado="${t.id}" style="font-size:0.78rem; color:var(--text-muted);"></span>
        </div>`;
      }
      if (esActividad && t.tipo_actividad === "respuesta_abierta") {
        const res = resultadoPorTrabajo[t.id];
        const instrucciones = (t.contenido_actividad && t.contenido_actividad.instrucciones) || "";
        const minCaracteres = (t.contenido_actividad && t.contenido_actividad.min_caracteres) || 0;
        const yaEntrego = !!(res && res.completado);
        return `
        <div class="roster-row" style="align-items:flex-start; flex-direction:column; gap:0.4rem;">
          <div style="display:flex; justify-content:space-between; width:100%; align-items:center; flex-wrap:wrap; gap:0.4rem;">
            <span class="name">✍️ ${t.titulo}${t.fecha ? " · " + t.fecha : ""}</span>
            <span class="badge" style="font-weight:400;">${NOMBRES_ACTIVIDAD[t.tipo_actividad] || t.tipo_actividad}</span>
          </div>
          ${instrucciones ? `<div class="roa-cell-texto" style="font-size:0.85rem;">${instrucciones}</div>` : ""}
          ${yaEntrego
            ? `<span class="badge" style="background:var(--success-bg); color:var(--success-text);">✓ Entregado${res.puntaje != null ? " — Nota: " + res.puntaje + "/3" : " (pendiente de calificación)"}</span>
               <div class="roa-cell-texto" style="font-size:0.85rem; white-space:pre-wrap;">${(res.respuestas && res.respuestas.texto) || ""}</div>`
            : `<form class="inline-form" data-abierta-form="${t.id}" style="width:100%;">
                 <textarea name="texto" data-abierta-texto="${t.id}" rows="5" required minlength="${minCaracteres || 1}" placeholder="Escribí tu respuesta…" style="width:100%; font-family:inherit; resize:vertical;"></textarea>
                 ${minCaracteres ? `<span data-abierta-contador="${t.id}" style="font-size:0.75rem; color:var(--text-muted);">0 / ${minCaracteres} caracteres mínimo</span>` : ""}
                 <button class="btn small" type="submit">Entregar respuesta</button>
                 <span data-abierta-estado="${t.id}" style="font-size:0.78rem; color:var(--text-muted);"></span>
               </form>`}
        </div>`;
      }
      if (esActividad && t.tipo_actividad === "rubrica_directa") {
        const res = resultadoPorTrabajo[t.id];
        const instrucciones = (t.contenido_actividad && t.contenido_actividad.instrucciones) || "";
        return `
        <div class="roster-row" style="align-items:flex-start; flex-direction:column; gap:0.4rem;">
          <div style="display:flex; justify-content:space-between; width:100%; align-items:center; flex-wrap:wrap; gap:0.4rem;">
            <span class="name">🧮 ${t.titulo}${t.fecha ? " · " + t.fecha : ""}</span>
            <span class="badge" style="font-weight:400;">${NOMBRES_ACTIVIDAD[t.tipo_actividad] || t.tipo_actividad}</span>
          </div>
          ${instrucciones ? `<div class="roa-cell-texto" style="font-size:0.85rem;">${instrucciones}</div>` : ""}
          ${res && res.completado
            ? `<span class="badge" style="background:var(--success-bg); color:var(--success-text);">✓ Calificado por tu profesor${res.puntaje != null ? " — Nota: " + res.puntaje + "/3" : ""}</span>`
            : `<span class="badge" style="background:var(--warn-bg); color:var(--warn-text);">⏳ Tu profesor te va a calificar directamente, no tenés que entregar nada acá</span>`}
        </div>`;
      }
      if (esActividad) {
        const res = resultadoPorTrabajo[t.id];
        const completo = res && res.completado;
        const puedeVerRetro = completo && t.retro_visible && TIPOS_CON_RETRO.includes(t.tipo_actividad);
        const aunNoEsHora = t.tipo_actividad === "prueba" && t.fecha_hora_inicio && new Date(t.fecha_hora_inicio) > new Date();
        let accionInicio;
        if (completo) {
          accionInicio = `<span class="badge" style="background:var(--success-bg); color:var(--success-text);">✓ Completado — Nota: ${res.puntaje}/3</span> ${badgeSalidas(res.intentos_salida)}`;
        } else if (aunNoEsHora) {
          accionInicio = `<span class="badge" style="background:var(--warn-bg); color:var(--warn-text);">⏳ Disponible a partir de ${formatearFechaHora(t.fecha_hora_inicio)}</span>`;
        } else {
          accionInicio = `<button class="btn small" data-iniciar-actividad="${t.id}">▶ Iniciar actividad</button>`;
        }
        return `
        <div class="roster-row" style="align-items:flex-start; flex-direction:column; gap:0.4rem;">
          <div style="display:flex; justify-content:space-between; width:100%; align-items:center; flex-wrap:wrap; gap:0.4rem;">
            <span class="name">${t.tipo_actividad === "prueba" ? "📝" : "🧠"} ${t.titulo}${t.fecha ? " · " + t.fecha : ""}</span>
            <span class="badge" style="font-weight:400;">${NOMBRES_ACTIVIDAD[t.tipo_actividad] || t.tipo_actividad}</span>
          </div>
          ${accionInicio}
          ${puedeVerRetro ? `<button class="btn secondary small" data-ver-mi-retro="${t.id}">📝 Ver mis respuestas</button><div data-mi-retro-panel="${t.id}" style="width:100%;"></div>` : (completo && TIPOS_CON_RETRO.includes(t.tipo_actividad) ? `<span style="font-size:0.78rem; color:var(--text-muted);">🔒 Las preguntas y tus respuestas están bloqueadas hasta que tu profesor las desbloquee.</span>` : "")}
        </div>`;
      }
      const miEstado = estadoPorTrabajo[t.id];
      const yaEntregado = porTrabajo[t.id] === true;
      let linkArchivo = "";
      if (miEstado && miEstado.archivo_ruta) {
        const { data: pub } = sb.storage.from("materiales").getPublicUrl(miEstado.archivo_ruta);
        linkArchivo = pub.publicUrl;
      }
      return `
      <div class="roster-row" style="align-items:flex-start; flex-direction:column; gap:0.3rem;">
        <div style="display:flex; justify-content:space-between; width:100%; align-items:center; flex-wrap:wrap; gap:0.4rem;">
          <span class="name">${t.titulo}${t.fecha ? " · " + t.fecha : ""}</span>
          ${yaEntregado
            ? `<span class="badge" style="background:var(--success-bg); color:var(--success-text);">✓ Entregado</span>`
            : `<label style="display:flex; align-items:center; gap:0.4rem; font-size:0.85rem;">
                 <input type="checkbox" data-mi-trabajo-subtema="${t.id}" /> Completado
               </label>`}
        </div>
        ${t.descripcion ? `<div class="roa-cell-texto" style="font-size:0.85rem;">${t.descripcion}</div>` : ""}
        ${t.aula_contable_empresa ? `<a class="btn secondary small" href="${AULA_CONTABLE_URL}" target="_blank" rel="noopener">🧮 Abrir en Aula de Conta — Empresa: ${t.aula_contable_empresa}</a>` : ""}
        ${yaEntregado
          ? ((linkArchivo ? `<a class="btn secondary small" href="${linkArchivo}" target="_blank" rel="noopener">👁️ Consultar mi entrega: ${miEstado.archivo_nombre || "archivo"}</a>` : "")
             + (editable && !calificados.has(t.id) ? `<label class="btn small" style="cursor:pointer;">✏️ ${linkArchivo ? "Cambiar mi archivo" : "Adjuntar archivo"}<input type="file" data-trabajo-subtema-subir="${t.id}" style="display:none;" /></label>` : "")
             + (editable && calificados.has(t.id) ? `<span style="font-size:0.78rem; color:var(--text-muted);">🔒 Ya fue calificada — no se puede cambiar.</span>` : ""))
          : `<label class="btn small" style="cursor:pointer;">📎 Adjuntar archivo para que lo califiquen<input type="file" data-trabajo-subtema-subir="${t.id}" style="display:none;" /></label>`}
        <span data-trabajo-subtema-subir-estado="${t.id}" style="font-size:0.78rem; color:var(--text-muted);"></span>
      </div>`;
    }).map((h, i) => `<div data-fila-trabajo="${trabajos[i].id}" style="display:contents">${h}</div>`).join("");
    await agregarDocumentoDefinitivo(holder, trabajos, estudianteId);

    holder.querySelectorAll("[data-mi-trabajo-subtema]").forEach(cb => {
      cb.addEventListener("change", async () => {
        await upsertSinConflicto(
          "trabajos_cotidianos_estudiante",
          { trabajo_id: cb.dataset.miTrabajoSubtema, estudiante_id: estudianteId },
          { completado: cb.checked, entregado_en: cb.checked ? new Date().toISOString() : null }
        );
        pintarTrabajosCotidianosSubtema(trabajos, soloLectura, subtemaId, materiaId);
      });
    });

    holder.querySelectorAll("[data-trabajo-subtema-subir]").forEach(input => {
      input.addEventListener("change", async () => {
        const trabajoId = input.dataset.trabajoSubtemaSubir;
        const archivo = input.files[0];
        if (!archivo) return;
        const estado = holder.querySelector(`[data-trabajo-subtema-subir-estado="${trabajoId}"]`);
        if (estado) estado.textContent = "Subiendo…";
        const rutaSegura = `entregas-trabajo/trabajo-${trabajoId}/${estudianteId}-${Date.now()}-${archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: errorSubida } = await sb.storage.from("materiales").upload(rutaSegura, archivo);
        if (errorSubida) {
          if (estado) estado.textContent = "No se pudo subir: " + errorSubida.message;
          return;
        }
        await upsertSinConflicto(
          "trabajos_cotidianos_estudiante",
          { trabajo_id: trabajoId, estudiante_id: estudianteId },
          { completado: true, entregado_en: new Date().toISOString(), archivo_ruta: rutaSegura, archivo_nombre: archivo.name }
        );
        pintarTrabajosCotidianosSubtema(trabajos, soloLectura, subtemaId, materiaId);
      });
    });

    holder.querySelectorAll("[data-iniciar-actividad]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const trabajo = trabajos.find(t => String(t.id) === String(btn.dataset.iniciarActividad));
        if (!trabajo) return;
        // Re-chequea en la base de datos, justo antes de arrancar, que no
        // esté ya completada (evita que quede sin bloquear si la pantalla
        // quedó abierta desde antes o si el guardado anterior tardó).
        const { data: yaHecha } = await sb.from("actividades_estudiante").select("completado").eq("trabajo_id", trabajo.id).eq("estudiante_id", estudianteId).maybeSingle();
        if (yaHecha && yaHecha.completado) {
          alert("Esta actividad ya está completada. No se puede volver a hacer.");
          pintarTrabajosCotidianosSubtema(trabajos, soloLectura, subtemaId, materiaId);
          return;
        }
        if (trabajo.tipo_actividad === "prueba" && trabajo.fecha_hora_inicio && new Date(trabajo.fecha_hora_inicio) > new Date()) {
          alert("Esta prueba todavía no está disponible. Podés entrar a partir de " + formatearFechaHora(trabajo.fecha_hora_inicio) + ".");
          pintarTrabajosCotidianosSubtema(trabajos, soloLectura, subtemaId, materiaId);
          return;
        }
        // Para "prueba" las reglas y la confirmación salen en la ventana de
        // reglas propia (mostrarReglasPrueba), que aparece primero.
        if (trabajo.tipo_actividad !== "prueba" && !confirm(`Vas a iniciar "${trabajo.titulo}". Se abre en pantalla completa y la nota se calcula automáticamente al terminar. ¿Listo para empezar?`)) return;
        iniciarActividadInteractiva(trabajo, estudianteId, (puntaje) => {
          pintarTrabajosCotidianosSubtema(trabajos, soloLectura, subtemaId, materiaId);
        });
      });
    });

    holder.querySelectorAll("[data-infografia-subir]").forEach(input => {
      input.addEventListener("change", async () => {
        const trabajoId = input.dataset.infografiaSubir;
        const archivo = input.files[0];
        if (!archivo) return;
        const estado = holder.querySelector(`[data-infografia-estado="${trabajoId}"]`);
        if (estado) estado.textContent = "Subiendo…";
        const rutaSegura = `infografias/trabajo-${trabajoId}/${estudianteId}-${Date.now()}-${archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: errorSubida } = await sb.storage.from("materiales").upload(rutaSegura, archivo);
        if (errorSubida) {
          if (estado) estado.textContent = "No se pudo subir: " + errorSubida.message;
          return;
        }
        await upsertSinConflicto(
          "actividades_estudiante",
          { trabajo_id: trabajoId, estudiante_id: estudianteId },
          { completado: true, archivo_ruta: rutaSegura, archivo_nombre: archivo.name, actualizado_en: new Date().toISOString() }
        );
        pintarTrabajosCotidianosSubtema(trabajos, soloLectura, subtemaId, materiaId);
      });
    });

    holder.querySelectorAll("[data-proyecto-descripcion]").forEach(textarea => {
      const trabajoId = textarea.dataset.proyectoDescripcion;
      const contador = holder.querySelector(`[data-proyecto-contador="${trabajoId}"]`);
      if (!contador) return;
      const minimo = Number(textarea.getAttribute("minlength")) || 1;
      const actualizarContador = () => {
        const n = textarea.value.length;
        contador.textContent = `${n} / ${minimo} caracteres mínimo`;
        contador.style.color = n >= minimo ? "#1d7a43" : "var(--text-muted)";
      };
      textarea.addEventListener("input", actualizarContador);
      actualizarContador();
    });

    holder.querySelectorAll("[data-abierta-texto]").forEach(textarea => {
      const trabajoId = textarea.dataset.abiertaTexto;
      const contador = holder.querySelector(`[data-abierta-contador="${trabajoId}"]`);
      if (!contador) return;
      const minimo = Number(textarea.getAttribute("minlength")) || 1;
      const actualizarContador = () => {
        const n = textarea.value.length;
        contador.textContent = `${n} / ${minimo} caracteres mínimo`;
        contador.style.color = n >= minimo ? "#1d7a43" : "var(--text-muted)";
      };
      textarea.addEventListener("input", actualizarContador);
      actualizarContador();
    });

    holder.querySelectorAll("[data-abierta-form]").forEach(form => {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const trabajoId = form.dataset.abiertaForm;
        const trabajo = trabajos.find(t => String(t.id) === String(trabajoId));
        if (!trabajo) return;
        const estado = holder.querySelector(`[data-abierta-estado="${trabajoId}"]`);
        const texto = (new FormData(form).get("texto") || "").toString().trim();
        const minimo = Number(form.querySelector("[data-abierta-texto]")?.getAttribute("minlength")) || 1;
        if (texto.length < minimo) { if (estado) estado.textContent = `Tu respuesta necesita al menos ${minimo} caracteres (lleva ${texto.length}).`; return; }
        const boton = form.querySelector("button[type=submit]");
        boton.disabled = true;
        boton.textContent = "Entregando…";
        const ok = await guardarEntregaRespuestaAbierta(trabajo, estudianteId, texto);
        if (!ok) { boton.disabled = false; boton.textContent = "Entregar respuesta"; return; }
        pintarTrabajosCotidianosSubtema(trabajos, soloLectura, subtemaId, materiaId);
      });
    });

    enlazarModificarProyecto(holder, () => pintarTrabajosCotidianosSubtema(trabajos, soloLectura, subtemaId, materiaId));
    holder.querySelectorAll("[data-proyecto-form]").forEach(form => {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const trabajoId = form.dataset.proyectoForm;
        const estado = holder.querySelector(`[data-proyecto-estado="${trabajoId}"]`);
        const f = new FormData(form);
        const archivo = f.get("archivo");
        const descripcion = (f.get("descripcion") || "").toString();
        const minimo = Number(form.querySelector("[data-proyecto-descripcion]")?.getAttribute("minlength")) || 1;
        if (descripcion.length < minimo) { if (estado) estado.textContent = `La descripción necesita al menos ${minimo} caracteres (lleva ${descripcion.length}).`; return; }
        if ((await proyectoVencido(trabajoId)).vencido) { if (estado) estado.textContent = "⛔ El plazo de entrega ya venció."; pintarTrabajosCotidianosSubtema(trabajos, soloLectura, subtemaId, materiaId); return; }
        if (esSeccion113(session.seccion)) {
          const ok = await enviarEntregaProyecto113({ form, f, trabajoId, estudianteId, descripcion, estado });
          if (ok) pintarTrabajosCotidianosSubtema(trabajos, soloLectura, subtemaId, materiaId);
          return;
        }
        if (!archivo || !archivo.size) { if (estado) estado.textContent = "Adjuntá un archivo."; return; }
        const boton = form.querySelector("button[type=submit]");
        boton.disabled = true;
        boton.textContent = "Enviando…";
        if (estado) estado.textContent = "Subiendo…";
        const rutaSegura = `proyectos/trabajo-${trabajoId}/${estudianteId}-${Date.now()}-${archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: errorSubida } = await sb.storage.from("materiales").upload(rutaSegura, archivo);
        if (errorSubida) {
          if (estado) estado.textContent = "No se pudo subir: " + errorSubida.message;
          boton.disabled = false;
          boton.textContent = "Enviar entrega";
          return;
        }
        const { error: errorInsert } = await sb.from("proyecto_entregas").insert({
          trabajo_id: trabajoId,
          estudiante_id: estudianteId,
          titulo: f.get("titulo"),
          descripcion: f.get("descripcion"),
          archivo_ruta: rutaSegura,
          archivo_nombre: archivo.name
        });
        if (errorInsert) {
          if (estado) estado.textContent = "No se pudo guardar la entrega: " + errorInsert.message;
          boton.disabled = false;
          boton.textContent = "Enviar entrega";
          return;
        }
        pintarTrabajosCotidianosSubtema(trabajos, soloLectura, subtemaId, materiaId);
      });
    });

    holder.querySelectorAll("[data-idea-input]").forEach(input => {
      input.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        holder.querySelector(`[data-idea-enviar="${input.dataset.ideaInput}"]`)?.click();
      });
    });

    holder.querySelectorAll("[data-idea-enviar]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const trabajoId = btn.dataset.ideaEnviar;
        const input = holder.querySelector(`[data-idea-input="${trabajoId}"]`);
        const estado = holder.querySelector(`[data-idea-estado="${trabajoId}"]`);
        const texto = (input.value || "").trim();
        if (!texto) return;
        btn.disabled = true;
        const textoOriginal = btn.textContent;
        btn.textContent = "Enviando…";
        const { error } = await sb.from("trabajo_ideas").insert({ trabajo_id: trabajoId, estudiante_id: estudianteId, texto });
        btn.disabled = false;
        btn.textContent = textoOriginal;
        if (error) {
          if (estado) estado.textContent = "No se pudo enviar: " + error.message;
          return;
        }
        pintarTrabajosCotidianosSubtema(trabajos, soloLectura, subtemaId, materiaId);
      });
    });

    holder.querySelectorAll("[data-idea-refrescar]").forEach(btn => {
      btn.addEventListener("click", () => {
        pintarTrabajosCotidianosSubtema(trabajos, soloLectura, subtemaId, materiaId);
      });
    });

    holder.querySelectorAll("[data-ver-mi-retro]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const trabajoId = btn.dataset.verMiRetro;
        const panel = holder.querySelector(`[data-mi-retro-panel="${trabajoId}"]`);
        if (!panel) return;
        if (panel.innerHTML) { panel.innerHTML = ""; return; }
        const trabajo = trabajos.find(x => String(x.id) === String(trabajoId));
        if (!trabajo) return;
        panel.innerHTML = `<p style="font-size:0.82rem; color:var(--text-muted);">Cargando…</p>`;
        panel.innerHTML = await construirRetroalimentacionActividad(trabajo, estudianteId);
      });
    });
  } else {
    const trabajoIds = trabajos.map(t => t.id);
    const { data: todosEstados } = await sb.from("trabajos_cotidianos_estudiante").select("trabajo_id, completado").in("trabajo_id", trabajoIds);
    const conteos = {};
    (todosEstados || []).forEach(e => {
      if (!e.completado) return;
      conteos[e.trabajo_id] = (conteos[e.trabajo_id] || 0) + 1;
    });

    // La "Lluvia de ideas" no usa trabajos_cotidianos_estudiante (no hay un
    // único "completado": cada estudiante puede mandar varias ideas) — el
    // conteo sale de cuántos estudiantes distintos tienen al menos una idea.
    const trabajosLluvia = trabajos.filter(t => t.tipo_actividad === "lluvia_ideas");
    if (trabajosLluvia.length) {
      const { data: todasIdeas } = await sb.from("trabajo_ideas").select("trabajo_id, estudiante_id").in("trabajo_id", trabajosLluvia.map(t => t.id));
      const participantesPorTrabajo = {};
      (todasIdeas || []).forEach(i => {
        const set = participantesPorTrabajo[i.trabajo_id] || (participantesPorTrabajo[i.trabajo_id] = new Set());
        set.add(i.estudiante_id);
      });
      Object.keys(participantesPorTrabajo).forEach(tid => { conteos[tid] = participantesPorTrabajo[tid].size; });
    }

    // El "Proyecto" tampoco usa trabajos_cotidianos_estudiante (un estudiante
    // puede entregar varias veces) — el conteo es cuántos estudiantes
    // distintos tienen al menos una entrega.
    const trabajosProyecto = trabajos.filter(t => t.tipo_actividad === "proyecto");
    if (trabajosProyecto.length) {
      const { data: todasEntregasProyecto } = await sb.from("proyecto_entregas").select("trabajo_id, estudiante_id").in("trabajo_id", trabajosProyecto.map(t => t.id));
      const participantesProyecto = {};
      (todasEntregasProyecto || []).forEach(e => {
        const set = participantesProyecto[e.trabajo_id] || (participantesProyecto[e.trabajo_id] = new Set());
        set.add(e.estudiante_id);
      });
      Object.keys(participantesProyecto).forEach(tid => { conteos[tid] = participantesProyecto[tid].size; });
    }

    const esEditable = (t) => !t.tipo_actividad || t.tipo_actividad === "simple";
    holder.innerHTML = trabajos.map(t => `
      <div class="roster-row" style="align-items:flex-start; flex-direction:column; gap:0.3rem; ${t.habilitado === false ? "opacity:0.55;" : ""}">
        <div style="display:flex; justify-content:space-between; width:100%; align-items:center; flex-wrap:wrap; gap:0.4rem;">
          <span class="name">${t.tipo_actividad === "prueba" ? "📝 " : (t.tipo_actividad === "rubrica_directa" ? "🧮 " : (t.tipo_actividad === "respuesta_abierta" ? "✍️ " : (t.tipo_actividad === "autoevaluacion" ? "🪞 " : (t.tipo_actividad && t.tipo_actividad !== "simple" ? "🧠 " : ""))))}${t.titulo}${t.fecha ? " · " + t.fecha : ""}</span>
          <span style="display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap;">
            ${t.tipo_actividad && t.tipo_actividad !== "simple" ? `<span class="badge" style="font-weight:400;">${NOMBRES_ACTIVIDAD[t.tipo_actividad] || t.tipo_actividad}</span>` : ""}
            ${t.tipo_actividad === "prueba" ? `<span class="badge" style="font-weight:400;">${t.fecha_hora_inicio ? "⏰ Inicia: " + formatearFechaHora(t.fecha_hora_inicio) : "⏰ Sin hora programada"}</span>
            <button class="btn secondary small" data-cambiar-hora-prueba="${t.id}">⏰ Cambiar hora</button>` : ""}
            ${t.tipo_actividad !== "rubrica_directa" ? `<span class="badge">${conteos[t.id] || 0} ${t.tipo_actividad === "lluvia_ideas" ? "participaron" : (t.tipo_actividad === "proyecto" || t.tipo_actividad === "respuesta_abierta" ? "entregaron" : "completaron")}</span>` : ""}
            <button class="btn ${t.habilitado === false ? "" : "secondary"} small" data-toggle-trabajo-subtema-habilitado="${t.id}" data-estado-actual="${t.habilitado !== false}">
              ${t.habilitado === false ? "Habilitar" : "Habilitado"}
            </button>
            ${t.tipo_actividad === "infografia" ? `<button class="btn secondary small" data-ver-entregas="${t.id}">📂 Ver entregas</button>` : ""}
            ${t.tipo_actividad === "proyecto" ? `<button class="btn secondary small" data-ver-entregas-proyecto="${t.id}">📂 Ver entregas</button>` : ""}
            ${esEditable(t) ? `<button class="btn secondary small" data-ver-entregas-trabajo="${t.id}">📎 Ver archivos entregados</button>` : ""}
            ${ACTIVIDADES_BLOQUEADAS.includes(t.tipo_actividad) ? `<button class="btn secondary small" data-ver-preguntas="${t.id}">👁️ Ver preguntas</button>` : ""}
            ${ACTIVIDADES_BLOQUEADAS.includes(t.tipo_actividad) ? `<button class="btn secondary small" data-editar-preguntas="${t.id}">✏️ Editar preguntas</button>` : ""}
            ${TIPOS_CON_RETRO.includes(t.tipo_actividad) ? `<button class="btn secondary small" data-ver-retro="${t.id}">📝 Ver retroalimentación</button>` : ""}
            ${TIPOS_CON_RETRO.includes(t.tipo_actividad) ? `<button class="btn ${t.retro_visible ? "" : "secondary"} small" data-toggle-retro-visible="${t.id}" data-estado-actual="${t.retro_visible === true}">${t.retro_visible ? "🔒 Bloquear respuestas a estudiantes" : "🔓 Desbloquear respuestas a estudiantes"}</button>` : ""}
            ${t.tipo_actividad === "lluvia_ideas" ? `<button class="btn secondary small" data-ver-ideas="${t.id}">💡 Ver intervenciones</button>` : ""}
            ${t.tipo_actividad === "respuesta_abierta" ? `<button class="btn secondary small" data-ver-entregas-abiertas="${t.id}">📨 Ver entregas</button>` : ""}
            ${t.tipo_actividad === "autoevaluacion" ? `<button class="btn secondary small" data-ver-autoeval="${t.id}">🪞 Ver respuestas</button>` : ""}
            ${t.contenido_actividad && t.contenido_actividad.estrategia === "juego_tiradera" ? `<a class="btn small" href="tiradera.html?trabajo=${t.id}" target="_blank" rel="noopener">⚡ Lanzar La Tiradera</a>` : ""}
            ${t.tipo_actividad === "rubrica_directa" ? `<button class="btn secondary small" data-calificar-rubrica="${t.id}">🧮 Calificar</button>` : ""}
            ${esEditable(t) ? `<button class="btn secondary small" data-editar-trabajo-subtema="${t.id}">✏️ Editar</button>` : ""}
            ${t.indicador_id
              ? `<span class="badge" style="font-weight:400;">📊 Indicador calificable</span>`
              : `<button class="btn secondary small" data-convertir-indicador-subtema="${t.id}">Contar como indicador</button>`}
            <button class="btn danger small" data-del-trabajo-subtema="${t.id}">Eliminar</button>
          </span>
        </div>
        ${esEditable(t) ? `
        <div data-trabajo-subtema-lectura="${t.id}" style="width:100%;">
          ${t.descripcion ? `<div class="roa-cell-texto" style="font-size:0.85rem;">${t.descripcion}</div>` : `<p class="empty" style="font-size:0.8rem; color:var(--brick);">⚠️ Sin instrucciones todavía — dale "✏️ Editar" para agregarlas.</p>`}
          ${t.aula_contable_empresa ? `<a class="btn secondary small" href="${AULA_CONTABLE_URL}" target="_blank" rel="noopener" style="margin-top:0.3rem;">🧮 Este trabajo se hace en Aula de Conta — Empresa: ${t.aula_contable_empresa}</a>` : ""}
        </div>
        <form class="inline-form" data-trabajo-subtema-editar-form="${t.id}" style="display:none; width:100%;">
          <input name="titulo" value="${String(t.titulo || "").replace(/"/g, "&quot;")}" required style="flex:1; min-width:10rem;" />
          <div class="roa-editable" contenteditable="true" data-trabajo-subtema-editar-desc="${t.id}" style="flex-basis:100%; min-height:4rem;">${t.descripcion || ""}</div>
          <input name="aula_contable_empresa" value="${String(t.aula_contable_empresa || "").replace(/"/g, "&quot;")}" placeholder="🧮 Empresa en Aula de Conta (opcional)" style="flex-basis:100%;" />
          <button class="btn small" type="submit">Guardar</button>
          <button class="btn secondary small" type="button" data-cancelar-editar-trabajo-subtema="${t.id}">Cancelar</button>
        </form>
        <div data-entregas-trabajo-panel="${t.id}" style="width:100%;"></div>` : (t.tipo_actividad === "lluvia_ideas" && t.contenido_actividad && t.contenido_actividad.pregunta ? `<div class="roa-cell-texto" style="font-size:0.85rem;">${t.contenido_actividad.pregunta}</div>` : (t.contenido_actividad && t.contenido_actividad.instrucciones && ["proyecto", "respuesta_abierta", "rubrica_directa", "autoevaluacion"].includes(t.tipo_actividad) ? `<div class="roa-cell-texto" style="font-size:0.85rem;">${t.contenido_actividad.instrucciones}</div>` : (t.descripcion ? `<div class="roa-cell-texto" style="font-size:0.85rem;">${t.descripcion}</div>` : "")))}
        ${t.tipo_actividad === "infografia" ? `<div data-entregas-panel="${t.id}"></div>` : ""}
        ${t.tipo_actividad === "proyecto" ? `<div data-entregas-proyecto-panel="${t.id}" style="width:100%;"></div>` : ""}
        ${ACTIVIDADES_BLOQUEADAS.includes(t.tipo_actividad) ? `<div data-preguntas-panel="${t.id}"></div>` : ""}
        ${ACTIVIDADES_BLOQUEADAS.includes(t.tipo_actividad) ? `<div data-editar-preguntas-panel="${t.id}" style="width:100%;"></div>` : ""}
        ${TIPOS_CON_RETRO.includes(t.tipo_actividad) ? `<div data-retro-panel="${t.id}"></div>` : ""}
        ${t.tipo_actividad === "lluvia_ideas" ? `<div data-ideas-panel="${t.id}" style="width:100%;"></div>` : ""}
        ${t.tipo_actividad === "respuesta_abierta" ? `<div data-entregas-abiertas-panel="${t.id}" style="width:100%;"></div>` : ""}
        ${t.tipo_actividad === "autoevaluacion" ? `<div data-autoeval-panel="${t.id}" style="width:100%;"></div>` : ""}
        ${t.tipo_actividad === "rubrica_directa" ? `<div data-rubrica-panel="${t.id}" style="width:100%;"></div>` : ""}
        ${t.tipo_actividad === "prueba" ? `<div data-hora-prueba-panel="${t.id}" style="width:100%;"></div>` : ""}
      </div>`).map((h, i) => `<div data-fila-trabajo="${trabajos[i].id}" style="display:contents">${h}</div>`).join("");
    agregarPanelDocumentosDocente(holder, trabajos);

    holder.querySelectorAll("[data-ver-retro]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const trabajoId = btn.dataset.verRetro;
        const panel = holder.querySelector(`[data-retro-panel="${trabajoId}"]`);
        if (!panel) return;
        if (panel.innerHTML) { panel.innerHTML = ""; return; }
        const trabajo = trabajos.find(x => String(x.id) === String(trabajoId));
        if (!trabajo) return;
        panel.innerHTML = `<p style="font-size:0.82rem; color:var(--text-muted);">Cargando…</p>`;
        panel.innerHTML = await construirRetroalimentacionActividad(trabajo);
      });
    });

    holder.querySelectorAll("[data-ver-entregas-proyecto]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const trabajoId = btn.dataset.verEntregasProyecto;
        const panel = holder.querySelector(`[data-entregas-proyecto-panel="${trabajoId}"]`);
        if (!panel) return;
        if (panel.innerHTML) { panel.innerHTML = ""; return; }
        panel.innerHTML = `<p style="font-size:0.82rem; color:var(--text-muted);">Cargando…</p>`;
        await pintarPanelEntregasProyecto(panel, trabajoId);
      });
    });

    holder.querySelectorAll("[data-ver-ideas]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const trabajoId = btn.dataset.verIdeas;
        const panel = holder.querySelector(`[data-ideas-panel="${trabajoId}"]`);
        if (!panel) return;
        if (panel.innerHTML) { panel.innerHTML = ""; return; }
        panel.innerHTML = `<p style="font-size:0.82rem; color:var(--text-muted);">Cargando…</p>`;
        await pintarPanelIdeas(panel, trabajoId);
      });
    });

    holder.querySelectorAll("[data-ver-entregas-abiertas]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const trabajoId = btn.dataset.verEntregasAbiertas;
        const panel = holder.querySelector(`[data-entregas-abiertas-panel="${trabajoId}"]`);
        if (!panel) return;
        if (panel.innerHTML) { panel.innerHTML = ""; return; }
        const trabajo = trabajos.find(x => String(x.id) === String(trabajoId));
        if (!trabajo) return;
        panel.innerHTML = `<p style="font-size:0.82rem; color:var(--text-muted);">Cargando…</p>`;
        await pintarPanelEntregasAbiertas(panel, trabajo, () => pintarTrabajosCotidianosSubtema(trabajos, soloLectura, subtemaId, materiaId));
      });
    });

    holder.querySelectorAll("[data-ver-autoeval]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const trabajoId = btn.dataset.verAutoeval;
        const panel = holder.querySelector(`[data-autoeval-panel="${trabajoId}"]`);
        if (!panel) return;
        if (panel.innerHTML) { panel.innerHTML = ""; return; }
        const trabajo = trabajos.find(x => String(x.id) === String(trabajoId));
        if (!trabajo) return;
        panel.innerHTML = `<p style="font-size:0.82rem; color:var(--text-muted);">Cargando…</p>`;
        await pintarPanelAutoevaluaciones(panel, trabajo);
      });
    });

    holder.querySelectorAll("[data-calificar-rubrica]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const trabajoId = btn.dataset.calificarRubrica;
        const panel = holder.querySelector(`[data-rubrica-panel="${trabajoId}"]`);
        if (!panel) return;
        if (panel.innerHTML) { panel.innerHTML = ""; return; }
        const trabajo = trabajos.find(x => String(x.id) === String(trabajoId));
        if (!trabajo) return;
        panel.innerHTML = `<p style="font-size:0.82rem; color:var(--text-muted);">Cargando…</p>`;
        await pintarPanelCalificarRubrica(panel, trabajo, materiaId);
      });
    });

    holder.querySelectorAll("[data-toggle-retro-visible]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const trabajoId = btn.dataset.toggleRetroVisible;
        const actual = btn.dataset.estadoActual === "true";
        await sb.from("trabajos_cotidianos").update({ retro_visible: !actual }).eq("id", trabajoId);
        const trabajo = trabajos.find(x => String(x.id) === String(trabajoId));
        if (trabajo) trabajo.retro_visible = !actual;
        pintarTrabajosCotidianosSubtema(trabajos, soloLectura, subtemaId, materiaId);
      });
    });

    holder.querySelectorAll("[data-cambiar-hora-prueba]").forEach(btn => {
      btn.addEventListener("click", () => {
        const trabajoId = btn.dataset.cambiarHoraPrueba;
        const panel = holder.querySelector(`[data-hora-prueba-panel="${trabajoId}"]`);
        if (!panel) return;
        if (panel.innerHTML.trim()) { panel.innerHTML = ""; return; }
        const trabajo = trabajos.find(x => String(x.id) === String(trabajoId));
        if (!trabajo) return;
        const valorActual = trabajo.fecha_hora_inicio
          ? new Date(new Date(trabajo.fecha_hora_inicio).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
          : "";
        panel.innerHTML = `
          <div class="row" style="align-items:center; margin-top:0.3rem;">
            <input type="datetime-local" data-hora-prueba-input="${trabajoId}" value="${valorActual}" style="padding:0.4rem;" />
            <button class="btn small" data-guardar-hora-prueba="${trabajoId}">Guardar hora</button>
            <button class="btn secondary small" data-quitar-hora-prueba="${trabajoId}">Quitar hora (disponible de inmediato)</button>
          </div>`;
        panel.querySelector(`[data-guardar-hora-prueba="${trabajoId}"]`).addEventListener("click", async () => {
          const input = panel.querySelector(`[data-hora-prueba-input="${trabajoId}"]`);
          const nuevaHora = input && input.value ? new Date(input.value).toISOString() : null;
          await sb.from("trabajos_cotidianos").update({ fecha_hora_inicio: nuevaHora }).eq("id", trabajoId);
          trabajo.fecha_hora_inicio = nuevaHora;
          pintarTrabajosCotidianosSubtema(trabajos, soloLectura, subtemaId, materiaId);
        });
        panel.querySelector(`[data-quitar-hora-prueba="${trabajoId}"]`).addEventListener("click", async () => {
          await sb.from("trabajos_cotidianos").update({ fecha_hora_inicio: null }).eq("id", trabajoId);
          trabajo.fecha_hora_inicio = null;
          pintarTrabajosCotidianosSubtema(trabajos, soloLectura, subtemaId, materiaId);
        });
      });
    });

    holder.querySelectorAll("[data-editar-trabajo-subtema]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.editarTrabajoSubtema;
        const lectura = holder.querySelector(`[data-trabajo-subtema-lectura="${id}"]`);
        const form = holder.querySelector(`[data-trabajo-subtema-editar-form="${id}"]`);
        if (lectura) lectura.style.display = "none";
        if (form) form.style.display = "flex";
      });
    });
    holder.querySelectorAll("[data-cancelar-editar-trabajo-subtema]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.cancelarEditarTrabajoSubtema;
        const lectura = holder.querySelector(`[data-trabajo-subtema-lectura="${id}"]`);
        const form = holder.querySelector(`[data-trabajo-subtema-editar-form="${id}"]`);
        if (form) form.style.display = "none";
        if (lectura) lectura.style.display = "";
      });
    });
    holder.querySelectorAll("[data-trabajo-subtema-editar-form]").forEach(form => {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = form.dataset.trabajoSubtemaEditarForm;
        const f = new FormData(form);
        const descDiv = form.querySelector(`[data-trabajo-subtema-editar-desc="${id}"]`);
        await sb.from("trabajos_cotidianos").update({
          titulo: f.get("titulo"),
          descripcion: descDiv ? descDiv.innerHTML : null,
          aula_contable_empresa: (f.get("aula_contable_empresa") || "").trim() || null
        }).eq("id", id);
        renderSubtema(subtemaId, soloLectura);
      });
    });

    holder.querySelectorAll("[data-toggle-trabajo-subtema-habilitado]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const nuevoEstado = btn.dataset.estadoActual !== "true";
        await sb.from("trabajos_cotidianos").update({ habilitado: nuevoEstado }).eq("id", btn.dataset.toggleTrabajoSubtemaHabilitado);
        renderSubtema(subtemaId, soloLectura);
      });
    });

    holder.querySelectorAll("[data-ver-preguntas]").forEach(btn => {
      btn.addEventListener("click", () => {
        const trabajoId = btn.dataset.verPreguntas;
        const panel = holder.querySelector(`[data-preguntas-panel="${trabajoId}"]`);
        if (!panel) return;
        if (panel.innerHTML) { panel.innerHTML = ""; return; }
        const trabajo = trabajos.find(x => String(x.id) === String(trabajoId));
        if (!trabajo) return;
        panel.innerHTML = construirRevisionContenidoActividad(trabajo.tipo_actividad, trabajo.contenido_actividad);
      });
    });

    holder.querySelectorAll("[data-editar-preguntas]").forEach(btn => {
      btn.addEventListener("click", () => {
        const trabajoId = btn.dataset.editarPreguntas;
        const panel = holder.querySelector(`[data-editar-preguntas-panel="${trabajoId}"]`);
        if (!panel) return;
        if (panel.innerHTML) { panel.innerHTML = ""; return; }
        const trabajo = trabajos.find(x => String(x.id) === String(trabajoId));
        if (!trabajo) return;
        const tipo = trabajo.tipo_actividad;
        panel.innerHTML = `
          <div style="background:var(--surface-soft); border-radius:8px; padding:0.8rem; margin-top:0.5rem;">
            <p style="font-size:0.8rem; color:var(--brick); margin-bottom:0.6rem;">⚠️ ${TIPOS_CON_RETRO.includes(tipo) ? "Si algún estudiante ya resolvió esta actividad, al guardar se le recalcula la nota automáticamente con las preguntas que queden (las que borres no cuentan ni a favor ni en contra, sin que tenga que repetirla)." : "Si algún estudiante ya resolvió esta actividad, su nota ya guardada no cambia — esto solo afecta a quienes la hagan (o la repitan) después de guardar."} Si sobran bloques vacíos que no vas a usar, quitalos con "Quitar" antes de guardar.</p>
            <div data-editar-preguntas-constructor="${trabajoId}">${construirPanelActividadHTML(tipo)}</div>
            <div class="row" style="margin-top:0.8rem; gap:0.5rem; align-items:center;">
              <button class="btn small" data-guardar-preguntas="${trabajoId}">Guardar cambios</button>
              <button class="btn secondary small" data-cancelar-editar-preguntas="${trabajoId}">Cancelar</button>
              <span data-guardar-preguntas-estado="${trabajoId}" style="font-size:0.8rem; color:var(--text-muted);"></span>
            </div>
          </div>`;
        const constructor = panel.querySelector(`[data-editar-preguntas-constructor="${trabajoId}"]`);
        inicializarConstructorPorTipo(tipo, constructor);
        const contenidoAdaptado = contenidoGuardadoParaEditar(tipo, trabajo.contenido_actividad);
        if (tipo === "sopa_letras") {
          const textarea = constructor.querySelector("#au-palabras-sopa");
          if (textarea && contenidoAdaptado) textarea.value = (contenidoAdaptado.palabras || []).join("\n");
        } else if (contenidoAdaptado) {
          llenarPanelActividadConIA(tipo, constructor, contenidoAdaptado);
        }
        panel.querySelector(`[data-cancelar-editar-preguntas="${trabajoId}"]`).addEventListener("click", () => { panel.innerHTML = ""; });
        panel.querySelector(`[data-guardar-preguntas="${trabajoId}"]`).addEventListener("click", async () => {
          const resultado = leerContenidoActividadDesdeFormulario(tipo, constructor);
          const estadoEl = panel.querySelector(`[data-guardar-preguntas-estado="${trabajoId}"]`);
          if (!resultado.valido) { if (estadoEl) estadoEl.textContent = resultado.error; return; }
          const contenidoViejo = trabajo.contenido_actividad;
          const btnGuardar = panel.querySelector(`[data-guardar-preguntas="${trabajoId}"]`);
          btnGuardar.disabled = true;
          if (estadoEl) estadoEl.textContent = "Guardando…";
          // Se conservan la fecha límite y la cantidad esperada (las pone el profesor aparte, no el editor).
          const contenidoNuevo = { ...resultado.contenido };
          if (contenidoViejo && contenidoViejo.fecha_limite) contenidoNuevo.fecha_limite = contenidoViejo.fecha_limite;
          if (contenidoViejo && contenidoViejo.cantidad_esperada) contenidoNuevo.cantidad_esperada = contenidoViejo.cantidad_esperada;
          const { error } = await sb.from("trabajos_cotidianos").update({ contenido_actividad: contenidoNuevo }).eq("id", trabajoId);
          if (error) {
            btnGuardar.disabled = false;
            if (estadoEl) estadoEl.textContent = "No se pudo guardar: " + error.message;
            return;
          }
          trabajo.contenido_actividad = resultado.contenido;

          // Recalcula automáticamente la nota de quienes ya habían resuelto
          // esta actividad, contra las preguntas/afirmaciones que quedaron
          // después de editar — sin obligarlos a repetirla.
          let mensajeRecalculo = "";
          if (TIPOS_CON_RETRO.includes(tipo)) {
            if (estadoEl) estadoEl.textContent = "Guardado — recalculando notas ya registradas…";
            const { data: entregas } = await sb.from("actividades_estudiante").select("*").eq("trabajo_id", trabajoId).eq("completado", true);
            const tieneCasoPractico = !!(resultado.contenido && resultado.contenido.casoPractico
              && ((resultado.contenido.casoPractico.enunciado || "").trim() || (resultado.contenido.casoPractico.instruccion || "").trim()));
            let recalculadas = 0;
            for (const entrega of (entregas || [])) {
              const r = recalcularResultadoActividad(tipo, contenidoViejo, resultado.contenido, entrega);
              if (!r) continue;
              const nuevoPuntaje = puntajeDesdePorcentaje(r.porcentaje);
              const datosUpdate = { respuestas: r.respuestas, porcentaje: r.porcentaje, puntaje: nuevoPuntaje };
              if (tipo === "prueba" && r.apareamientoRespuestas) {
                datosUpdate.datos_prueba = { ...(entrega.datos_prueba || {}), apareamiento_respuestas: r.apareamientoRespuestas };
              }
              await sb.from("actividades_estudiante").update(datosUpdate).eq("id", entrega.id);
              if (trabajo.indicador_id && !tieneCasoPractico) {
                await upsertSinConflicto("calificaciones_indicador", { indicador_id: trabajo.indicador_id, estudiante_id: entrega.estudiante_id }, { puntaje_obtenido: nuevoPuntaje });
              }
              recalculadas++;
            }
            mensajeRecalculo = recalculadas > 0 ? ` Se recalculó la nota de ${recalculadas} estudiante${recalculadas === 1 ? "" : "s"} que ya la habían resuelto.` : "";
          }

          panel.innerHTML = `<p style="font-size:0.82rem; color:var(--success-text); margin-top:0.4rem;">✓ Cambios guardados.${mensajeRecalculo}</p>`;
          const panelVer = holder.querySelector(`[data-preguntas-panel="${trabajoId}"]`);
          if (panelVer) panelVer.innerHTML = "";
        });
      });
    });

    holder.querySelectorAll("[data-ver-entregas]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const trabajoId = btn.dataset.verEntregas;
        const panel = holder.querySelector(`[data-entregas-panel="${trabajoId}"]`);
        if (!panel) return;
        if (panel.innerHTML) { panel.innerHTML = ""; return; }
        panel.innerHTML = `<p style="font-size:0.82rem; color:var(--text-muted);">Cargando entregas…</p>`;
        const { data: entregas } = await sb.from("actividades_estudiante").select("*").eq("trabajo_id", trabajoId).not("archivo_ruta", "is", null);
        if (!entregas || entregas.length === 0) {
          panel.innerHTML = `<p class="empty" style="font-size:0.82rem;">Todavía nadie ha entregado esta infografía.</p>`;
          return;
        }
        const estudianteIds = entregas.map(e => e.estudiante_id);
        const { data: estudiantes } = await sb.from("estudiantes").select("id, nombre, apellido1, apellido2").in("id", estudianteIds);
        const nombrePorId = {};
        (estudiantes || []).forEach(e => { nombrePorId[e.id] = [e.nombre, e.apellido1, e.apellido2].filter(Boolean).join(" "); });
        panel.innerHTML = `
          <div style="background:var(--surface-soft); border-radius:8px; padding:0.7rem; margin-top:0.4rem;">
            <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.5rem;">La nota se pone en la sección "Rúbrica y Evaluaciones" (0 a 3), ya que el indicador quedó creado.</p>
            ${entregas.map(e => {
              const { data: pub } = sb.storage.from("materiales").getPublicUrl(e.archivo_ruta);
              return `<div class="roster-row" style="padding:0.3rem 0;">
                <span class="name">${nombrePorId[e.estudiante_id] || e.estudiante_id}</span>
                <a class="btn small" href="${pub.publicUrl}" target="_blank" rel="noopener">📄 ${e.archivo_nombre || "Ver archivo"}</a>
              </div>`;
            }).join("")}
          </div>`;
      });
    });

    holder.querySelectorAll("[data-ver-entregas-trabajo]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const trabajoId = btn.dataset.verEntregasTrabajo;
        const panel = holder.querySelector(`[data-entregas-trabajo-panel="${trabajoId}"]`);
        if (!panel) return;
        if (panel.innerHTML) { panel.innerHTML = ""; return; }
        panel.innerHTML = `<p style="font-size:0.82rem; color:var(--text-muted);">Cargando entregas…</p>`;
        const trabajoActual = trabajos.find(x => String(x.id) === String(trabajoId));
        const avisoAulaConta = trabajoActual && trabajoActual.aula_contable_empresa
          ? `<p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.5rem;">🧮 Este trabajo se hace en Aula de Conta (empresa "${trabajoActual.aula_contable_empresa}") — el detalle real de cada entrega (planilla, asientos, si quedó correcta) está en "Entregas recibidas" dentro de Aula de Conta. Con "Ver en Aula de Conta" entrás directo a la cuenta de cada estudiante.</p>`
          : "";
        const { data: entregas } = await sb.from("trabajos_cotidianos_estudiante").select("*").eq("trabajo_id", trabajoId).or("completado.eq.true,archivo_ruta.not.is.null");
        if (!entregas || entregas.length === 0) {
          panel.innerHTML = avisoAulaConta
            ? `<div style="background:var(--surface-soft); border-radius:8px; padding:0.7rem; margin-top:0.4rem;">${avisoAulaConta}<p class="empty" style="font-size:0.82rem; margin:0;">Todavía nadie marcó este trabajo como completado acá — revisá Aula de Conta directamente.</p></div>`
            : `<p class="empty" style="font-size:0.82rem;">Todavía nadie ha entregado este trabajo.</p>`;
          return;
        }
        const estudianteIds = entregas.map(e => e.estudiante_id);
        const { data: estudiantes } = await sb.from("estudiantes").select("id, nombre, apellido1, apellido2").in("id", estudianteIds);
        const nombrePorId = {};
        (estudiantes || []).forEach(e => { nombrePorId[e.id] = [e.nombre, e.apellido1, e.apellido2].filter(Boolean).join(" "); });
        panel.innerHTML = `
          <div style="background:var(--surface-soft); border-radius:8px; padding:0.7rem; margin-top:0.4rem;">
            ${avisoAulaConta}
            <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.5rem;">El estudiante ya no puede volver a entregar este trabajo una vez marcado. Si alguien se equivocó, usá "↺ Permitir reintento". La nota se pone en la sección "Rúbrica y Evaluaciones" (0 a 3), si este trabajo quedó marcado como indicador.</p>
            ${entregas.map(e => {
              const link = e.archivo_ruta ? sb.storage.from("materiales").getPublicUrl(e.archivo_ruta).data.publicUrl : "";
              return `<div class="roster-row" style="padding:0.3rem 0; display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                <span class="name">${nombrePorId[e.estudiante_id] || e.estudiante_id}</span>
                ${link ? `<a class="btn small" href="${link}" target="_blank" rel="noopener">📄 ${e.archivo_nombre || "Ver archivo"}</a>` : `<span class="badge">Completado (sin archivo)</span>`}
                ${trabajoActual && trabajoActual.aula_contable_empresa ? `<a class="btn secondary small" href="${AULA_CONTABLE_URL}?como_estudiante=${encodeURIComponent(e.estudiante_id)}">🧮 Ver en Aula de Conta</a>` : ""}
                <button class="btn secondary small" data-permitir-reintento-trabajo="${trabajoId}" data-permitir-reintento-estudiante="${e.estudiante_id}">↺ Permitir reintento</button>
              </div>`;
            }).join("")}
          </div>`;
        panel.querySelectorAll("[data-permitir-reintento-trabajo]").forEach(rbtn => {
          rbtn.addEventListener("click", async () => {
            if (!confirm("¿Permitir que este estudiante vuelva a entregar el trabajo? Se borra lo que tenía entregado.")) return;
            await sb.from("trabajos_cotidianos_estudiante").update({ completado: false, archivo_ruta: null, archivo_nombre: null, entregado_en: null })
              .eq("trabajo_id", rbtn.dataset.permitirReintentoTrabajo).eq("estudiante_id", rbtn.dataset.permitirReintentoEstudiante);
            btn.click();
            btn.click();
          });
        });
      });
    });

    holder.querySelectorAll("[data-del-trabajo-subtema]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const trabajo = trabajos.find(t => String(t.id) === String(btn.dataset.delTrabajoSubtema));
        await sb.from("trabajos_cotidianos").delete().eq("id", btn.dataset.delTrabajoSubtema);
        if (trabajo && trabajo.indicador_id) await sb.from("indicadores").delete().eq("id", trabajo.indicador_id);
        renderSubtema(subtemaId, soloLectura);
      });
    });

    holder.querySelectorAll("[data-convertir-indicador-subtema]").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!materiaId) { alert("Este subtema no tiene una materia asociada."); return; }
        const trabajo = trabajos.find(t => String(t.id) === String(btn.dataset.convertirIndicadorSubtema));
        if (!trabajo) return;
        const puntaje = Number(prompt(`¿Puntaje máximo para "${trabajo.titulo}"?`, "10"));
        if (!puntaje || puntaje <= 0) return;
        btn.disabled = true;
        btn.textContent = "Creando…";
        const indicadorId = await crearIndicadorParaTrabajo(materiaId, trabajo.titulo, trabajo.fecha, puntaje);
        if (indicadorId) await sb.from("trabajos_cotidianos").update({ indicador_id: indicadorId }).eq("id", trabajo.id);
        renderSubtema(subtemaId, soloLectura);
      });
    });
  }
}

// --- Constructor de actividades interactivas (selección única, falso y verdadero) ---

// El <select> de tipo de actividad incluye, además de los tipos "motor"
// de siempre, 20 "estrategias de evaluación" con nombre pedagógico
// (ESTRATEGIAS_EVALUACION, en actividades.js) que por debajo usan uno de
// 3 motores genéricos. Esta función traduce el valor elegido en el
// select al tipo_actividad real que se guarda en la base de datos.
function tipoRealDeActividad(valorSelect) {
  const preset = ESTRATEGIAS_EVALUACION[valorSelect];
  return preset ? preset.tipo : valorSelect;
}

function construirSelectorTipoActividad() {
  return `
    <div style="background:var(--surface); border:1px solid var(--paper-line); border-radius:10px; padding:1rem;">
      <div class="row" style="margin-bottom:0.6rem;">
        <input id="actividad-titulo" placeholder="Título de la actividad" style="flex:1; min-width:12rem" />
        <input id="actividad-fecha" type="date" />
      </div>
      <div class="row" style="margin-bottom:0.8rem; align-items:center;">
        <label style="display:flex; align-items:center; gap:0.5rem;">Tipo de actividad:
          <select id="actividad-tipo">
            <option value="seleccion_unica">🧠 Selección única</option>
            <option value="falso_verdadero">✅ Falso y verdadero</option>
            <option value="crucigrama">🔤 Crucigrama</option>
            <option value="sopa_letras">🔎 Sopa de letras</option>
            <option value="infografia">🖼️ Infografía (el estudiante sube un archivo, se califica a mano)</option>
            <option value="prueba">📝 Prueba (con hora de inicio y datos del estudiante)</option>
            <option value="lluvia_ideas">💡 Lluvia de ideas</option>
            <option value="proyecto">📁 Proyecto (título + descripción + archivo, se puede volver a entregar)</option>
            <optgroup label="Estrategias de evaluación">
              ${Object.entries(ESTRATEGIAS_EVALUACION).map(([clave, e]) => `<option value="${clave}">${e.icono} ${e.etiqueta}</option>`).join("")}
            </optgroup>
          </select>
        </label>
        <label id="actividad-cantidad-label" style="display:flex; align-items:center; gap:0.5rem;">Cantidad:
          <input type="number" id="actividad-ia-cantidad" min="3" max="40" value="15" style="width:5rem; padding:0.3rem;" />
        </label>
      </div>
      <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.8rem;">Se califica automáticamente de 0 a 3 según el % de aciertos, y se hace en pantalla completa: si el estudiante sale de la actividad, queda registrado.</p>
      <div id="actividad-ia-bloque">
      <div style="margin-bottom:0.6rem;">
        <label for="actividad-ia-archivo" style="font-size:0.82rem; color:var(--text-muted); display:block; margin-bottom:0.3rem;">Archivo(s) de apoyo (opcional) — podés subir varios PDF, Word (.docx) o imágenes con el contenido real sobre el que querés las preguntas; la IA usa toda la información junta. Para "Prueba": subí el Word del examen y la IA lo digitaliza (vos marcás/revisás las respuestas correctas después, el Word no las trae).</label>
        <input type="file" id="actividad-ia-archivo" accept=".pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/gif,image/webp" multiple style="display:block; margin-bottom:0.5rem;" />
        <label for="actividad-ia-instrucciones" style="font-size:0.82rem; color:var(--text-muted); display:block; margin-bottom:0.3rem;">Instrucciones para la IA (opcional) — ej. "enfocate en salarios y cargas sociales, con ejemplos en colones", "nivel básico", "incluí IVA y renta"</label>
        <textarea id="actividad-ia-instrucciones" rows="2" placeholder="Dejalo en blanco para que la IA use solo el título y el tema del subtema (o el archivo, si subiste uno)" style="width:100%; font-family:inherit; resize:vertical;"></textarea>
      </div>
      <div class="row" style="margin-bottom:0.8rem; align-items:center;">
        <button class="btn secondary small" id="generar-actividad-ia-btn" type="button">✨ Generar con IA</button>
        <span id="generar-actividad-ia-estado" style="font-size:0.78rem; color:var(--text-muted);"></span>
      </div>
      </div>
      <div id="actividad-constructor"></div>
      <div class="row" style="margin-top:1rem;">
        <button class="btn small" id="guardar-actividad-interactiva" type="button">Crear actividad</button>
        <button class="btn secondary small" id="cancelar-actividad-interactiva" type="button">Cancelar</button>
      </div>
    </div>`;
}

// Un bloque de pregunta (texto + 4 opciones) para la actividad "Prueba",
// con cantidad libre de preguntas (sin tope fijo). "i" es un índice interno
// único por bloque — no se reutiliza aunque se quiten preguntas — y se usa
// para que los inputs/radios de ese bloque no choquen con los de otros.
function bloquePreguntaPruebaHTML(i) {
  return `
    <div class="au-prueba-bloque" data-bloque="${i}" style="background:var(--surface-soft); border-radius:8px; padding:0.8rem; margin-bottom:0.6rem;">
      <div class="row" style="justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
        <p class="au-prueba-numero" style="font-weight:600; font-size:0.85rem; margin:0;">Pregunta</p>
        <button type="button" class="btn danger small au-prueba-quitar" data-bloque="${i}">Quitar</button>
      </div>
      <textarea class="au-pregunta" data-i="${i}" placeholder="Texto de la pregunta" rows="2" style="width:100%; margin-bottom:0.5rem; font-family:inherit; resize:vertical;"></textarea>
      ${[0, 1, 2, 3].map(j => `
        <div style="display:flex; align-items:flex-start; gap:0.5rem; margin-bottom:0.3rem;">
          <input type="radio" name="au-correcta-${i}" value="${j}" ${j === 0 ? "checked" : ""} style="margin-top:0.6rem;" />
          <textarea class="au-opcion" data-i="${i}" data-j="${j}" placeholder="Opción ${String.fromCharCode(65 + j)}" rows="1" style="flex:1; font-family:inherit; resize:vertical;"></textarea>
        </div>`).join("")}
    </div>`;
}

// Vuelve a numerar visualmente "Pregunta 1", "Pregunta 2"... según el orden
// actual de los bloques (el índice interno data-bloque no cambia).
function renumerarPreguntasPrueba(lista) {
  lista.querySelectorAll(".au-prueba-bloque").forEach((bloque, idx) => {
    const numero = bloque.querySelector(".au-prueba-numero");
    if (numero) numero.textContent = `Pregunta ${idx + 1}`;
  });
}

// Agrega un bloque de pregunta nuevo al final de la lista de preguntas de
// una Prueba (dentro de "contenedor", que es el div que tiene adentro
// ".au-prueba-lista" y el botón ".au-prueba-agregar"). Devuelve el bloque
// creado.
function agregarPreguntaPruebaBloque(contenedor) {
  const lista = contenedor.querySelector(".au-prueba-lista");
  if (!lista) return null;
  const siguiente = Number(lista.dataset.auPruebaSiguiente || "0");
  lista.dataset.auPruebaSiguiente = String(siguiente + 1);
  const envoltura = document.createElement("div");
  envoltura.innerHTML = bloquePreguntaPruebaHTML(siguiente);
  const bloque = envoltura.firstElementChild;
  lista.appendChild(bloque);
  renumerarPreguntasPrueba(lista);
  return bloque;
}

// Conecta el botón "+ Agregar pregunta" y los botones "Quitar" de cada
// bloque, dentro de "contenedor" (el div donde se insertó el HTML de
// construirPanelActividadHTML("prueba")). Hay que llamarla una vez, justo
// después de insertar ese HTML en el DOM.
// Un bloque de "situación / respuesta correcta" para el apareamiento
// (opcional) de una Prueba. "i" es un índice interno único por bloque.
function bloqueParApareamientoHTML(i) {
  return `
    <div class="au-apareamiento-par" data-par="${i}" style="display:flex; gap:0.5rem; margin-bottom:0.5rem; align-items:flex-start;">
      <textarea class="au-apar-situacion" data-i="${i}" placeholder="Situación (columna A)" rows="2" style="flex:1; font-family:inherit; resize:vertical;"></textarea>
      <textarea class="au-apar-respuesta" data-i="${i}" placeholder="Respuesta correcta (columna B)" rows="2" style="flex:1; font-family:inherit; resize:vertical;"></textarea>
      <button type="button" class="btn danger small au-apareamiento-quitar" data-par="${i}">Quitar</button>
    </div>`;
}

function agregarParApareamientoBloque(contenedor) {
  const lista = contenedor.querySelector(".au-apareamiento-lista");
  if (!lista) return null;
  const siguiente = Number(lista.dataset.auApareamientoSiguiente || "0");
  lista.dataset.auApareamientoSiguiente = String(siguiente + 1);
  const envoltura = document.createElement("div");
  envoltura.innerHTML = bloqueParApareamientoHTML(siguiente);
  const bloque = envoltura.firstElementChild;
  lista.appendChild(bloque);
  return bloque;
}

// --- Listas dinámicas (agregar/quitar) para Falso/Verdadero y Crucigrama,
// igual que la de preguntas de Prueba/Selección única, para no limitar la
// cantidad de afirmaciones o palabras que el profesor puede poner. ---

function bloqueAfirmacionHTML(i) {
  return `
    <div class="au-fv-bloque" data-bloque="${i}" style="background:var(--surface-soft); border-radius:8px; padding:0.8rem; margin-bottom:0.6rem;">
      <div class="row" style="justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
        <p class="au-fv-numero" style="font-weight:600; font-size:0.85rem; margin:0;">Afirmación</p>
        <button type="button" class="btn danger small au-fv-quitar" data-bloque="${i}">Quitar</button>
      </div>
      <textarea class="au-afirmacion" data-i="${i}" placeholder="Texto de la afirmación" rows="2" style="width:100%; margin-bottom:0.5rem; font-family:inherit; resize:vertical;"></textarea>
      <div style="display:flex; gap:1.2rem;">
        <label style="display:flex; align-items:center; gap:0.4rem;"><input type="radio" name="au-fv-${i}" value="true" checked /> Verdadero</label>
        <label style="display:flex; align-items:center; gap:0.4rem;"><input type="radio" name="au-fv-${i}" value="false" /> Falso</label>
      </div>
    </div>`;
}

function renumerarAfirmaciones(lista) {
  lista.querySelectorAll(".au-fv-bloque").forEach((bloque, idx) => {
    const numero = bloque.querySelector(".au-fv-numero");
    if (numero) numero.textContent = `Afirmación ${idx + 1}`;
  });
}

function agregarAfirmacionBloque(contenedor) {
  const lista = contenedor.querySelector(".au-fv-lista");
  if (!lista) return null;
  const siguiente = Number(lista.dataset.auFvSiguiente || "0");
  lista.dataset.auFvSiguiente = String(siguiente + 1);
  const envoltura = document.createElement("div");
  envoltura.innerHTML = bloqueAfirmacionHTML(siguiente);
  const bloque = envoltura.firstElementChild;
  lista.appendChild(bloque);
  renumerarAfirmaciones(lista);
  return bloque;
}

function inicializarConstructorFalsoVerdadero(contenedor) {
  const lista = contenedor.querySelector(".au-fv-lista");
  const btnAgregar = contenedor.querySelector(".au-fv-agregar");
  if (!lista || !btnAgregar) return;
  btnAgregar.addEventListener("click", () => agregarAfirmacionBloque(contenedor));
  lista.addEventListener("click", (e) => {
    const quitar = e.target.closest(".au-fv-quitar");
    if (!quitar) return;
    if (lista.querySelectorAll(".au-fv-bloque").length <= 1) {
      alert("La actividad debe tener al menos una afirmación.");
      return;
    }
    quitar.closest(".au-fv-bloque")?.remove();
    renumerarAfirmaciones(lista);
  });
}

function bloqueCruciHTML(i) {
  return `
    <div class="au-cruci-bloque" data-bloque="${i}" style="display:flex; gap:0.5rem; margin-bottom:0.5rem; align-items:flex-start;">
      <input class="au-cruci-palabra" data-i="${i}" placeholder="Palabra" style="width:9rem;" />
      <textarea class="au-cruci-pista" data-i="${i}" placeholder="Pista" rows="1" style="flex:1; font-family:inherit; resize:vertical;"></textarea>
      <button type="button" class="btn danger small au-cruci-quitar" data-bloque="${i}">Quitar</button>
    </div>`;
}

function agregarCruciBloque(contenedor) {
  const lista = contenedor.querySelector(".au-cruci-lista");
  if (!lista) return null;
  const siguiente = Number(lista.dataset.auCruciSiguiente || "0");
  lista.dataset.auCruciSiguiente = String(siguiente + 1);
  const envoltura = document.createElement("div");
  envoltura.innerHTML = bloqueCruciHTML(siguiente);
  const bloque = envoltura.firstElementChild;
  lista.appendChild(bloque);
  return bloque;
}

function inicializarConstructorCrucigrama(contenedor) {
  const lista = contenedor.querySelector(".au-cruci-lista");
  const btnAgregar = contenedor.querySelector(".au-cruci-agregar");
  if (!lista || !btnAgregar) return;
  btnAgregar.addEventListener("click", () => agregarCruciBloque(contenedor));
  lista.addEventListener("click", (e) => {
    const quitar = e.target.closest(".au-cruci-quitar");
    if (!quitar) return;
    if (lista.querySelectorAll(".au-cruci-bloque").length <= 1) {
      alert("El crucigrama debe tener al menos una palabra.");
      return;
    }
    quitar.closest(".au-cruci-bloque")?.remove();
  });
}

// --- Afirmaciones tipo Likert (Autoevaluación / Coevaluación) — igual
// patrón que falso/verdadero, pero sin marcar "correcta" (es autopercepción).
function bloqueAfirmacionLikertHTML(i, texto) {
  return `
    <div class="au-lik-bloque" data-bloque="${i}" style="background:var(--surface-soft); border-radius:8px; padding:0.8rem; margin-bottom:0.6rem;">
      <div class="row" style="justify-content:space-between; align-items:center; margin-bottom:0.4rem;">
        <p class="au-lik-numero" style="font-weight:600; font-size:0.85rem; margin:0;">Afirmación</p>
        <button type="button" class="btn danger small au-lik-quitar" data-bloque="${i}">Quitar</button>
      </div>
      <textarea class="au-lik-texto" data-i="${i}" placeholder="Ej. Entendí los conceptos principales del tema" rows="2" style="width:100%; font-family:inherit; resize:vertical;">${texto ? texto.replace(/</g, "&lt;") : ""}</textarea>
    </div>`;
}

function renumerarLikert(lista) {
  lista.querySelectorAll(".au-lik-bloque").forEach((bloque, idx) => {
    const numero = bloque.querySelector(".au-lik-numero");
    if (numero) numero.textContent = `Afirmación ${idx + 1}`;
  });
}

function agregarLikertBloque(contenedor, texto) {
  const lista = contenedor.querySelector(".au-lik-lista");
  if (!lista) return null;
  const siguiente = Number(lista.dataset.auLikSiguiente || "0");
  lista.dataset.auLikSiguiente = String(siguiente + 1);
  const envoltura = document.createElement("div");
  envoltura.innerHTML = bloqueAfirmacionLikertHTML(siguiente, texto);
  const bloque = envoltura.firstElementChild;
  lista.appendChild(bloque);
  renumerarLikert(lista);
  return bloque;
}

function inicializarConstructorAutoevaluacion(contenedor) {
  const lista = contenedor.querySelector(".au-lik-lista");
  const btnAgregar = contenedor.querySelector(".au-lik-agregar");
  if (!lista || !btnAgregar) return;
  btnAgregar.addEventListener("click", () => agregarLikertBloque(contenedor));
  lista.addEventListener("click", (e) => {
    const quitar = e.target.closest(".au-lik-quitar");
    if (!quitar) return;
    if (lista.querySelectorAll(".au-lik-bloque").length <= 1) {
      alert("Debe haber al menos una afirmación.");
      return;
    }
    quitar.closest(".au-lik-bloque")?.remove();
    renumerarLikert(lista);
  });
}

// --- Criterios de una Rúbrica / Lista de cotejo (la llena el profesor) ---
function bloqueCriterioHTML(i, nombre, puntosMax) {
  return `
    <div class="au-crit-bloque" data-bloque="${i}" style="display:flex; gap:0.5rem; margin-bottom:0.5rem; align-items:flex-start;">
      <textarea class="au-crit-nombre" data-i="${i}" placeholder="Nombre del criterio (ej. Dominio del tema)" rows="1" style="flex:1; font-family:inherit; resize:vertical;">${nombre ? nombre.replace(/</g, "&lt;") : ""}</textarea>
      <label style="font-size:0.78rem; color:var(--text-muted); display:flex; flex-direction:column; align-items:center;">Puntos máx.
        <input type="number" class="au-crit-max" data-i="${i}" min="1" max="10" value="${puntosMax || 3}" style="width:4rem; padding:0.3rem; margin-top:0.2rem;" />
      </label>
      <button type="button" class="btn danger small au-crit-quitar" data-bloque="${i}" style="margin-top:0.1rem;">Quitar</button>
    </div>`;
}

function agregarCriterioBloque(contenedor, nombre, puntosMax) {
  const lista = contenedor.querySelector(".au-crit-lista");
  if (!lista) return null;
  const siguiente = Number(lista.dataset.auCritSiguiente || "0");
  lista.dataset.auCritSiguiente = String(siguiente + 1);
  const envoltura = document.createElement("div");
  envoltura.innerHTML = bloqueCriterioHTML(siguiente, nombre, puntosMax);
  const bloque = envoltura.firstElementChild;
  lista.appendChild(bloque);
  return bloque;
}

function inicializarConstructorRubricaDirecta(contenedor) {
  const lista = contenedor.querySelector(".au-crit-lista");
  const btnAgregar = contenedor.querySelector(".au-crit-agregar");
  if (!lista || !btnAgregar) return;
  btnAgregar.addEventListener("click", () => agregarCriterioBloque(contenedor));
  lista.addEventListener("click", (e) => {
    const quitar = e.target.closest(".au-crit-quitar");
    if (!quitar) return;
    if (lista.querySelectorAll(".au-crit-bloque").length <= 1) {
      alert("Debe haber al menos un criterio.");
      return;
    }
    quitar.closest(".au-crit-bloque")?.remove();
  });
}

// Conecta la lista dinámica (agregar/quitar) que le corresponda a cada tipo
// de actividad, después de insertar el HTML de construirPanelActividadHTML.
function inicializarConstructorPorTipo(tipo, contenedor) {
  if (tipo === "prueba" || tipo === "seleccion_unica") inicializarConstructorPrueba(contenedor);
  if (tipo === "falso_verdadero") inicializarConstructorFalsoVerdadero(contenedor);
  if (tipo === "crucigrama") inicializarConstructorCrucigrama(contenedor);
  if (tipo === "autoevaluacion") inicializarConstructorAutoevaluacion(contenedor);
  if (tipo === "rubrica_directa") inicializarConstructorRubricaDirecta(contenedor);
}

// Muestra/oculta y ajusta el input "Cantidad" (lo que se le pide a la IA)
// según el tipo de actividad elegido — no aplica a infografía ni prueba
// (la prueba digitaliza un examen ya hecho, no se le pide una cantidad).
function ajustarCampoCantidad(panel, tipo) {
  const label = panel.querySelector("#actividad-cantidad-label");
  const input = panel.querySelector("#actividad-ia-cantidad");
  if (!label || !input) return;
  const RANGOS = {
    seleccion_unica: { min: 3, max: 40, val: 15 },
    falso_verdadero: { min: 3, max: 40, val: 10 },
    crucigrama: { min: 4, max: 20, val: 7 },
    sopa_letras: { min: 4, max: 30, val: 10 }
  };
  const r = RANGOS[tipo];
  if (!r) { label.style.display = "none"; return; }
  label.style.display = "flex";
  input.min = r.min;
  input.max = r.max;
  input.value = r.val;
}

function inicializarConstructorPrueba(contenedor) {
  const lista = contenedor.querySelector(".au-prueba-lista");
  const btnAgregar = contenedor.querySelector(".au-prueba-agregar");
  if (lista && btnAgregar) {
    btnAgregar.addEventListener("click", () => agregarPreguntaPruebaBloque(contenedor));
    lista.addEventListener("click", (e) => {
      const quitar = e.target.closest(".au-prueba-quitar");
      if (!quitar) return;
      if (lista.querySelectorAll(".au-prueba-bloque").length <= 1) {
        alert("La prueba debe tener al menos una pregunta.");
        return;
      }
      quitar.closest(".au-prueba-bloque")?.remove();
      renumerarPreguntasPrueba(lista);
    });
  }

  const listaApar = contenedor.querySelector(".au-apareamiento-lista");
  const btnAgregarApar = contenedor.querySelector(".au-apareamiento-agregar");
  if (listaApar && btnAgregarApar) {
    btnAgregarApar.addEventListener("click", () => agregarParApareamientoBloque(contenedor));
    listaApar.addEventListener("click", (e) => {
      const quitar = e.target.closest(".au-apareamiento-quitar");
      if (!quitar) return;
      quitar.closest(".au-apareamiento-par")?.remove();
    });
  }
}

function construirPanelActividadHTML(tipo, presetKey) {
  const preset = presetKey ? ESTRATEGIAS_EVALUACION[presetKey] : null;
  if (tipo === "seleccion_unica") {
    const preguntasIniciales = Array.from({ length: 15 }, (_, i) => i);
    return `
      <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.6rem;">Escribí las preguntas (agregá o quitá las que necesites) y marcá con el círculo cuál opción es la correcta.</p>
      <div class="au-prueba-lista" data-au-prueba-siguiente="${preguntasIniciales.length}">
        ${preguntasIniciales.map(i => bloquePreguntaPruebaHTML(i)).join("")}
      </div>
      <button type="button" class="btn secondary small au-prueba-agregar">+ Agregar pregunta</button>`;
  }
  if (tipo === "prueba") {
    const preguntasIniciales = Array.from({ length: 5 }, (_, i) => i);
    return `
      <div style="background:var(--warn-bg); border:1px solid #E8C777; border-radius:8px; padding:0.8rem; margin-bottom:0.8rem;">
        <label style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:0.4rem;">Hora de inicio (opcional)</label>
        <input type="datetime-local" id="au-prueba-hora-inicio" style="padding:0.4rem;" />
        <p style="font-size:0.78rem; color:var(--text-muted); margin-top:0.4rem;">Si la dejás vacía, la prueba queda disponible apenas la habilités con el botón "Habilitado" de la lista. Si ponés una hora, nadie va a poder entrar antes de esa hora aunque ya esté habilitada — y vos podés además deshabilitarla manualmente en cualquier momento para cerrarla. Solo vos podés cambiar esto.</p>
      </div>
      <div style="margin-bottom:0.8rem;">
        <label for="au-prueba-puntos-totales" style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:0.4rem;">Puntos totales de la prueba (para el encabezado)</label>
        <input type="number" id="au-prueba-puntos-totales" min="1" placeholder="Ej. 47" style="width:8rem; padding:0.4rem;" />
        <p style="font-size:0.78rem; color:var(--text-muted); margin-top:0.3rem;">Es solo el número que se muestra en el encabezado tipo MEP ("Puntos totales: __"). La nota se sigue calculando automáticamente por % de aciertos, no por estos puntos. Si lo dejás vacío, se muestra la cantidad de preguntas.</p>
      </div>
      <div style="margin-bottom:0.8rem;">
        <label for="au-prueba-instrucciones" style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:0.4rem;">Reglas/instrucciones para el estudiante (opcional)</label>
        <textarea id="au-prueba-instrucciones" rows="3" placeholder="Ej. Tenés 40 minutos. No se permite usar el celular ni el libro. Una vez que empiece no podés pausar." style="width:100%; font-family:inherit; resize:vertical;"></textarea>
        <p style="font-size:0.78rem; color:var(--text-muted); margin-top:0.3rem;">Esto se le muestra al estudiante en una ventana con las reglas, antes de pedirle sus datos y de empezar la prueba.</p>
      </div>
      <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.6rem;">Antes de empezar, cada estudiante debe escribir su nombre completo, cédula, correo del MEP y correo del padre/encargado. Agregá las preguntas que necesite la prueba (podés quitar o agregar las que quieras) y marcá con el círculo cuál opción es la correcta.</p>
      <div class="au-prueba-lista" data-au-prueba-siguiente="${preguntasIniciales.length}">
        ${preguntasIniciales.map(i => bloquePreguntaPruebaHTML(i)).join("")}
      </div>
      <button type="button" class="btn secondary small au-prueba-agregar">+ Agregar pregunta</button>

      <div style="margin:1.4rem 0 0.8rem; padding-top:1rem; border-top:1px solid var(--paper-line);">
        <p style="font-weight:600; font-size:0.9rem; margin-bottom:0.3rem;">Apareamiento (opcional)</p>
        <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.6rem;">Si agregás pares, se suman como una sección extra de la prueba y se corrigen solos (1 punto por par). Dejalo vacío si esta prueba no lleva apareamiento.</p>
        <textarea id="au-prueba-apareamiento-instrucciones" rows="2" placeholder="Instrucciones del apareamiento (opcional — si lo dejás vacío se usa un texto genérico)" style="width:100%; font-family:inherit; resize:vertical; margin-bottom:0.6rem;"></textarea>
        <div class="au-apareamiento-lista" data-au-apareamiento-siguiente="0"></div>
        <button type="button" class="btn secondary small au-apareamiento-agregar">+ Agregar par</button>
      </div>

      <div style="margin:1.4rem 0 0.4rem; padding-top:1rem; border-top:1px solid var(--paper-line);">
        <p style="font-weight:600; font-size:0.9rem; margin-bottom:0.3rem;">Caso práctico / desarrollo (opcional)</p>
        <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.6rem;">Se agrega como última parte de la prueba. El estudiante escribe su respuesta en un cuadro de texto y vos la calificás a mano en Rúbrica y Evaluaciones, igual que con una Infografía. Dejalo vacío si esta prueba no lleva caso práctico.</p>
        <label style="font-size:0.82rem; display:block; margin-bottom:0.3rem;">Enunciado del caso (podés pegar texto y tablas)</label>
        <div id="au-prueba-caso-enunciado" contenteditable="true" style="min-height:6rem; border:1px solid var(--paper-line); border-radius:6px; padding:0.6rem; margin-bottom:0.6rem; font-size:0.85rem; background:var(--surface);"></div>
        <label style="font-size:0.82rem; display:block; margin-bottom:0.3rem;">Qué debe entregar el estudiante</label>
        <textarea id="au-prueba-caso-instruccion" rows="2" placeholder="Ej. Elaborar el libro de compras del trimestre con los datos del caso." style="width:100%; font-family:inherit; resize:vertical;"></textarea>
      </div>`;
  }
  if (tipo === "falso_verdadero") {
    const itemsIniciales = Array.from({ length: 10 }, (_, i) => i);
    return `
      <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.6rem;">Escribí las afirmaciones (agregá o quitá las que necesites) y marcá si cada una es verdadera o falsa.</p>
      <div class="au-fv-lista" data-au-fv-siguiente="${itemsIniciales.length}">
        ${itemsIniciales.map(i => bloqueAfirmacionHTML(i)).join("")}
      </div>
      <button type="button" class="btn secondary small au-fv-agregar">+ Agregar afirmación</button>`;
  }
  if (tipo === "sopa_letras") {
    return `
      <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.6rem;">Escribí entre 4 y 30 palabras (sin tildes es mejor), una por línea. Se genera la sopa de letras automáticamente.</p>
      <textarea id="au-palabras-sopa" rows="12" placeholder="CCSS&#10;RENTA&#10;SALARIO&#10;JORNADA&#10;FERIADO&#10;PLANILLA" style="width:100%; font-family:inherit;"></textarea>`;
  }
  if (tipo === "crucigrama") {
    const filasIniciales = Array.from({ length: 8 }, (_, i) => i);
    return `
      <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.6rem;">Escribí las palabras con su pista (agregá o quitá las que necesites, mínimo 4). Se genera el crucigrama automáticamente, cruzando las palabras donde comparten letras.</p>
      <div class="au-cruci-lista" data-au-cruci-siguiente="${filasIniciales.length}">
        ${filasIniciales.map(i => bloqueCruciHTML(i)).join("")}
      </div>
      <button type="button" class="btn secondary small au-cruci-agregar">+ Agregar palabra</button>`;
  }
  if (tipo === "infografia") {
    return `
      <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.6rem;">Esta es la única actividad en la que el estudiante SÍ puede salir de la plataforma (por ejemplo, para usar Canva). Entrega un archivo (imagen o PDF) que vos calificás a mano en Rúbrica y Evaluaciones.</p>
      <textarea id="au-infografia-instrucciones" rows="4" placeholder="Instrucciones para el estudiante (ej. haz una infografía que resuma los descuentos obligatorios de ley...)" style="width:100%; font-family:inherit;"></textarea>`;
  }
  if (tipo === "lluvia_ideas") {
    return `
      <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.6rem;">Cada estudiante va a poder escribir una o varias ideas (cada una queda registrada como una intervención suya). Después vos las revisás todas, agrupadas por estudiante, y marcás cuáles son buenas o malas — así medís la participación real de cada quien.</p>
      <label for="au-lluvia-pregunta" style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:0.4rem;">Pregunta o consigna para la lluvia de ideas (opcional)</label>
      <textarea id="au-lluvia-pregunta" rows="2" placeholder="Ej. ¿Qué gastos debería incluir el presupuesto de una pulpería?" style="width:100%; font-family:inherit; resize:vertical;">${preset ? preset.instrucciones.replace(/</g, "&lt;") : ""}</textarea>`;
  }
  if (tipo === "proyecto") {
    return `
      <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.6rem;">El estudiante entrega poniendo un título, una descripción y un archivo. Puede volver a entregar las veces que necesite (por ejemplo si se equivocó de archivo) — cada entrega queda guardada y vos las ves todas en orden, no se borra la anterior. Útil para dividir un proyecto grande en partes: creá una actividad de este tipo por cada parte (ej. "Proyecto — Parte 1", "Proyecto — Parte 2"...) y cada una queda como su propio indicador calificable.</p>
      <label for="au-proyecto-instrucciones" style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:0.4rem;">Instrucciones para el estudiante (qué debe entregar en esta parte)</label>
      <textarea id="au-proyecto-instrucciones" rows="4" placeholder="Ej. Parte 1: Subí el documento con la investigación inicial del proyecto, con al menos 3 fuentes citadas." style="width:100%; font-family:inherit; resize:vertical; margin-bottom:0.6rem;">${preset ? preset.instrucciones.replace(/</g, "&lt;") : ""}</textarea>
      <div class="row" style="gap:0.6rem; margin-bottom:0.6rem;">
        <label style="flex:1; min-width:10rem; font-size:0.82rem;">Etiqueta del campo "Título" (opcional)
          <input id="au-proyecto-placeholder-titulo" placeholder="Ej. Nombre de la ley" value="${preset && preset.placeholder_titulo ? preset.placeholder_titulo.replace(/"/g, "&quot;") : ""}" style="width:100%; margin-top:0.2rem;" />
        </label>
        <label style="flex:1; min-width:10rem; font-size:0.82rem;">Etiqueta del campo "Descripción" (opcional)
          <input id="au-proyecto-placeholder-descripcion" placeholder="Ej. Descripción general de la ley" value="${preset && preset.placeholder_descripcion ? preset.placeholder_descripcion.replace(/"/g, "&quot;") : ""}" style="width:100%; margin-top:0.2rem;" />
        </label>
      </div>
      <label style="display:block; font-size:0.82rem;">Mínimo de caracteres exigidos en la descripción (opcional, dejalo en 0 si no querés exigir un mínimo)
        <input id="au-proyecto-min-caracteres" type="number" min="0" step="10" value="${preset && preset.min_caracteres_descripcion ? preset.min_caracteres_descripcion : 0}" style="width:8rem; margin-top:0.2rem; display:block;" />
      </label>`;
  }
  if (tipo === "respuesta_abierta") {
    return `
      <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.6rem;">El estudiante escribe su respuesta en un cuadro de texto y la entrega. Vos la leés y le ponés la nota a mano desde "📨 Ver entregas" — no se califica sola.</p>
      <label for="au-abierta-instrucciones" style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:0.4rem;">Consigna para el estudiante</label>
      <textarea id="au-abierta-instrucciones" rows="4" placeholder="Ej. Escribí una reflexión sobre lo que aprendiste hoy en clase…" style="width:100%; font-family:inherit; resize:vertical; margin-bottom:0.6rem;">${preset ? preset.instrucciones.replace(/</g, "&lt;") : ""}</textarea>
      <label style="display:block; font-size:0.82rem;">Mínimo de caracteres exigidos (opcional, dejalo en 0 si no querés exigir un mínimo)
        <input id="au-abierta-min-caracteres" type="number" min="0" step="10" value="0" style="width:8rem; margin-top:0.2rem; display:block;" />
      </label>`;
  }
  if (tipo === "autoevaluacion") {
    const afirmacionesIniciales = preset ? preset.afirmaciones : ["", "", ""];
    return `
      <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.6rem;">El estudiante responde cada afirmación en una escala de "Nunca" a "Siempre" — se califica solo según qué tan positivamente se evaluó (sirve como nota formativa, revisala en "🪞 Ver respuestas").</p>
      <label for="au-lik-instrucciones" style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:0.4rem;">Instrucciones para el estudiante (opcional)</label>
      <textarea id="au-lik-instrucciones" rows="2" placeholder="Ej. Respondé con sinceridad qué tan de acuerdo estás con cada afirmación." style="width:100%; font-family:inherit; resize:vertical; margin-bottom:0.8rem;">${preset ? preset.instrucciones.replace(/</g, "&lt;") : ""}</textarea>
      <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.6rem;">Escribí las afirmaciones (agregá o quitá las que necesites).</p>
      <div class="au-lik-lista" data-au-lik-siguiente="${afirmacionesIniciales.length}">
        ${afirmacionesIniciales.map((t, i) => bloqueAfirmacionLikertHTML(i, t)).join("")}
      </div>
      <button type="button" class="btn secondary small au-lik-agregar">+ Agregar afirmación</button>`;
  }
  if (tipo === "rubrica_directa") {
    const criteriosIniciales = preset ? preset.criterios : [{ nombre: "", puntos_max: 3 }, { nombre: "", puntos_max: 3 }, { nombre: "", puntos_max: 3 }];
    return `
      <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.6rem;">El estudiante NO entrega nada en la plataforma — vos calificás directamente a cada estudiante con estos criterios desde "🧮 Calificar" (por ejemplo mientras expone, o revisando un trabajo físico). La nota se calcula sola según los puntos que le pongas en cada criterio.</p>
      <label for="au-crit-instrucciones" style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:0.4rem;">Descripción de la actividad (opcional, es solo para recordar de qué se trata)</label>
      <textarea id="au-crit-instrucciones" rows="2" placeholder="Ej. Exposición oral sobre descuentos de ley." style="width:100%; font-family:inherit; resize:vertical; margin-bottom:0.8rem;">${preset ? preset.instrucciones.replace(/</g, "&lt;") : ""}</textarea>
      <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.6rem;">Criterios a calificar (agregá o quitá los que necesites, y ajustá los puntos máximos de cada uno).</p>
      <div class="au-crit-lista" data-au-crit-siguiente="${criteriosIniciales.length}">
        ${criteriosIniciales.map((c, i) => bloqueCriterioHTML(i, c.nombre, c.puntos_max)).join("")}
      </div>
      <button type="button" class="btn secondary small au-crit-agregar">+ Agregar criterio</button>`;
  }
  return `<p class="empty">Este tipo todavía no está disponible — contame y lo agrego.</p>`;
}

// Llena el formulario de autoría de una actividad con lo que devolvió la IA,
// para que el profesor lo revise y edite antes de crear la actividad.
function llenarPanelActividadConIA(tipo, el, contenido) {
  if (!contenido) return;
  if (tipo === "seleccion_unica" && Array.isArray(contenido.preguntas)) {
    const lista = el.querySelector(".au-prueba-lista");
    if (lista) {
      let bloques = Array.from(lista.querySelectorAll(".au-prueba-bloque"));
      while (bloques.length < contenido.preguntas.length) {
        agregarPreguntaPruebaBloque(el);
        bloques = Array.from(lista.querySelectorAll(".au-prueba-bloque"));
      }
      contenido.preguntas.forEach((p, idx) => {
        const bloque = bloques[idx];
        if (!bloque) return;
        const i = bloque.dataset.bloque;
        const inputPregunta = bloque.querySelector(`.au-pregunta[data-i="${i}"]`);
        if (inputPregunta) inputPregunta.value = p.pregunta || "";
        (p.opciones || []).slice(0, 4).forEach((op, j) => {
          const inputOpcion = bloque.querySelector(`.au-opcion[data-i="${i}"][data-j="${j}"]`);
          if (inputOpcion) inputOpcion.value = op || "";
        });
        const radio = bloque.querySelector(`input[name="au-correcta-${i}"][value="${Number(p.correcta) || 0}"]`);
        if (radio) radio.checked = true;
      });
    }
  }
  if (tipo === "prueba" && Array.isArray(contenido.preguntas)) {
    const lista = el.querySelector(".au-prueba-lista");
    if (lista) {
      let bloques = Array.from(lista.querySelectorAll(".au-prueba-bloque"));
      while (bloques.length < contenido.preguntas.length) {
        agregarPreguntaPruebaBloque(el);
        bloques = Array.from(lista.querySelectorAll(".au-prueba-bloque"));
      }
      contenido.preguntas.forEach((p, idx) => {
        const bloque = bloques[idx];
        if (!bloque) return;
        const i = bloque.dataset.bloque;
        const inputPregunta = bloque.querySelector(`.au-pregunta[data-i="${i}"]`);
        if (inputPregunta) inputPregunta.value = p.pregunta || "";
        (p.opciones || []).slice(0, 4).forEach((op, j) => {
          const inputOpcion = bloque.querySelector(`.au-opcion[data-i="${i}"][data-j="${j}"]`);
          if (inputOpcion) inputOpcion.value = op || "";
        });
        const radio = bloque.querySelector(`input[name="au-correcta-${i}"][value="${Number(p.correcta) || 0}"]`);
        if (radio) radio.checked = true;
      });
    }
    const instruccionesInput = el.querySelector("#au-prueba-instrucciones");
    if (instruccionesInput && typeof contenido.instrucciones === "string") instruccionesInput.value = contenido.instrucciones;
    const puntosInput = el.querySelector("#au-prueba-puntos-totales");
    if (puntosInput && contenido.puntosTotales) puntosInput.value = contenido.puntosTotales;

    if (contenido.apareamiento && Array.isArray(contenido.apareamiento.pares) && contenido.apareamiento.pares.length) {
      const instApar = el.querySelector("#au-prueba-apareamiento-instrucciones");
      if (instApar && contenido.apareamiento.instrucciones) instApar.value = contenido.apareamiento.instrucciones;
      const listaApar = el.querySelector(".au-apareamiento-lista");
      if (listaApar) {
        let bloquesApar = Array.from(listaApar.querySelectorAll(".au-apareamiento-par"));
        while (bloquesApar.length < contenido.apareamiento.pares.length) {
          agregarParApareamientoBloque(el);
          bloquesApar = Array.from(listaApar.querySelectorAll(".au-apareamiento-par"));
        }
        contenido.apareamiento.pares.forEach((par, idx) => {
          const bloque = bloquesApar[idx];
          if (!bloque) return;
          const i = bloque.dataset.par;
          const inputSituacion = bloque.querySelector(`.au-apar-situacion[data-i="${i}"]`);
          const inputRespuesta = bloque.querySelector(`.au-apar-respuesta[data-i="${i}"]`);
          if (inputSituacion) inputSituacion.value = par.situacion || "";
          if (inputRespuesta) inputRespuesta.value = par.respuesta || "";
        });
      }
    }

    if (contenido.casoPractico && (contenido.casoPractico.enunciado || contenido.casoPractico.instruccion)) {
      const enunciadoDiv = el.querySelector("#au-prueba-caso-enunciado");
      const instruccionInput = el.querySelector("#au-prueba-caso-instruccion");
      if (enunciadoDiv) enunciadoDiv.innerHTML = contenido.casoPractico.enunciado || "";
      if (instruccionInput) instruccionInput.value = contenido.casoPractico.instruccion || "";
    }
  }
  if (tipo === "falso_verdadero" && Array.isArray(contenido.afirmaciones)) {
    const lista = el.querySelector(".au-fv-lista");
    if (lista) {
      let bloques = Array.from(lista.querySelectorAll(".au-fv-bloque"));
      while (bloques.length < contenido.afirmaciones.length) {
        agregarAfirmacionBloque(el);
        bloques = Array.from(lista.querySelectorAll(".au-fv-bloque"));
      }
      contenido.afirmaciones.forEach((a, idx) => {
        const bloque = bloques[idx];
        if (!bloque) return;
        const i = bloque.dataset.bloque;
        const inputAfirmacion = bloque.querySelector(`.au-afirmacion[data-i="${i}"]`);
        if (inputAfirmacion) inputAfirmacion.value = a.texto || "";
        const radio = bloque.querySelector(`input[name="au-fv-${i}"][value="${a.correcta ? "true" : "false"}"]`);
        if (radio) radio.checked = true;
      });
    }
  }
  if (tipo === "sopa_letras" && Array.isArray(contenido.palabras)) {
    const textarea = el.querySelector("#au-palabras-sopa");
    if (textarea) textarea.value = contenido.palabras.join("\n");
  }
  if (tipo === "crucigrama" && Array.isArray(contenido.items)) {
    const listaCruci = el.querySelector(".au-cruci-lista");
    if (listaCruci) {
      let bloquesCruci = Array.from(listaCruci.querySelectorAll(".au-cruci-bloque"));
      while (bloquesCruci.length < contenido.items.length) {
        agregarCruciBloque(el);
        bloquesCruci = Array.from(listaCruci.querySelectorAll(".au-cruci-bloque"));
      }
    }
    contenido.items.forEach((it, i) => {
      const inputPalabra = el.querySelector(`.au-cruci-palabra[data-i="${i}"]`);
      const inputPista = el.querySelector(`.au-cruci-pista[data-i="${i}"]`);
      if (inputPalabra) inputPalabra.value = it.palabra || "";
      if (inputPista) inputPista.value = it.pista || "";
    });
  }
  if (tipo === "infografia" && typeof contenido.instrucciones === "string") {
    const textarea = el.querySelector("#au-infografia-instrucciones");
    if (textarea) textarea.value = contenido.instrucciones;
  }
}

// El contenido YA GUARDADO de una actividad (lo que quedó en
// trabajos_cotidianos.contenido_actividad al crearla) no siempre tiene la
// misma forma que espera llenarPanelActividadConIA (pensada para lo que
// devuelve la IA): sopa de letras y crucigrama guardan el resultado ya
// generado ("colocadas"), no la lista de palabras/pistas que el profesor
// escribió. Esto lo adapta para poder reutilizar el mismo formulario al
// editar una actividad que ya existe.
function contenidoGuardadoParaEditar(tipo, contenido) {
  if (!contenido) return null;
  if (tipo === "sopa_letras") {
    return { palabras: (contenido.colocadas || []).map(c => c.palabra) };
  }
  if (tipo === "crucigrama") {
    return { items: (contenido.colocadas || []).map(c => ({ palabra: c.palabra, pista: c.pista })) };
  }
  return contenido;
}

// Muestra (solo lectura) el contenido ya creado de una actividad, para que el
// profesor pueda revisar las preguntas/palabras/pistas sin tener que iniciarla
// como estudiante.
function construirRevisionContenidoActividad(tipo, contenido) {
  if (!contenido) return `<p class="empty" style="font-size:0.82rem;">Esta actividad no tiene contenido guardado.</p>`;
  const envoltura = (html) => `<div style="background:var(--surface-soft); border-radius:8px; padding:0.8rem; margin-top:0.5rem; font-size:0.85rem;">${html}</div>`;

  if ((tipo === "seleccion_unica" || tipo === "prueba") && Array.isArray(contenido.preguntas)) {
    return envoltura(contenido.preguntas.map((p, i) => `
      <div style="margin-bottom:0.7rem;">
        <p style="font-weight:600;">${i + 1}. ${p.pregunta}</p>
        <ul style="margin:0.2rem 0 0 1.2rem; padding:0;">
          ${(p.opciones || []).map((op, j) => `<li style="${j === Number(p.correcta) ? "color:var(--success-text); font-weight:600;" : ""}">${op}${j === Number(p.correcta) ? " ✓" : ""}</li>`).join("")}
        </ul>
      </div>`).join(""));
  }
  if (tipo === "falso_verdadero" && Array.isArray(contenido.afirmaciones)) {
    return envoltura(contenido.afirmaciones.map((a, i) => `
      <div style="margin-bottom:0.4rem;">${i + 1}. ${a.texto}
        <strong style="color:${a.correcta ? "#1d7a43" : "#c0392b"};"> — ${a.correcta ? "Verdadero" : "Falso"}</strong>
      </div>`).join(""));
  }
  if (tipo === "sopa_letras" && Array.isArray(contenido.colocadas)) {
    return envoltura(`
      <p style="font-weight:600; margin-bottom:0.4rem;">Palabras de la sopa de letras:</p>
      <p>${contenido.colocadas.map(c => c.palabra).join(" · ") || "(ninguna se logró colocar)"}</p>`);
  }
  if (tipo === "crucigrama" && Array.isArray(contenido.colocadas)) {
    return envoltura(`
      <p style="font-weight:600; margin-bottom:0.4rem;">Palabras y pistas del crucigrama:</p>
      <ol style="margin:0 0 0 1.2rem; padding:0;">
        ${contenido.colocadas.slice().sort((a, b) => a.numero - b.numero).map(c => `<li><strong>${c.palabra}</strong> — ${c.pista} <span style="color:var(--text-muted);">(${c.horizontal ? "horizontal" : "vertical"})</span></li>`).join("")}
      </ol>`);
  }
  return `<p class="empty" style="font-size:0.82rem;">No se pudo mostrar el contenido de este tipo de actividad.</p>`;
}

// Retroalimentación de una actividad de selección única o falso/verdadero:
// qué respondió cada quien frente a la respuesta correcta, pregunta por
// pregunta, y la nota como puntos conseguidos / puntos asignados (una
// pregunta = un punto). Sin `soloEstudianteId` muestra a todos los
// estudiantes (vista del profesor); con `soloEstudianteId` muestra solo el
// resultado de ese estudiante, sin nombres ni acordeón (vista del propio
// estudiante, cuando el profesor habilitó "Mostrar respuestas a estudiantes").
async function construirRetroalimentacionActividad(trabajo, soloEstudianteId) {
  const contenido = trabajo.contenido_actividad;
  if (!contenido) return `<p class="empty" style="font-size:0.82rem;">Esta actividad no tiene contenido guardado.</p>`;

  const items = (trabajo.tipo_actividad === "seleccion_unica" || trabajo.tipo_actividad === "prueba")
    ? (contenido.preguntas || []).map(p => ({ texto: p.pregunta, opciones: p.opciones || [], correcta: Number(p.correcta) }))
    : (contenido.afirmaciones || []).map(a => ({ texto: a.texto, opciones: ["Falso", "Verdadero"], correcta: a.correcta ? 1 : 0 }));
  if (items.length === 0) return `<p class="empty" style="font-size:0.82rem;">Esta actividad no tiene preguntas guardadas.</p>`;

  let consulta = sb.from("actividades_estudiante").select("*").eq("trabajo_id", trabajo.id).eq("completado", true);
  if (soloEstudianteId) consulta = consulta.eq("estudiante_id", soloEstudianteId);
  const { data: entregas } = await consulta;
  if (!entregas || entregas.length === 0) {
    return soloEstudianteId
      ? `<p class="empty" style="font-size:0.82rem;">Todavía no tenés un resultado guardado para esta actividad.</p>`
      : `<p class="empty" style="font-size:0.82rem;">Todavía nadie ha completado esta actividad.</p>`;
  }

  const respuestaTexto = (item, valor) => {
    if (trabajo.tipo_actividad === "falso_verdadero") return valor === true ? "Verdadero" : (valor === false ? "Falso" : "Sin responder");
    if (valor === null || valor === undefined) return "Sin responder";
    return item.opciones[Number(valor)] ?? "Sin responder";
  };
  const esCorrecta = (item, valor) => {
    if (trabajo.tipo_actividad === "falso_verdadero") return valor === item.correcta;
    return Number(valor) === item.correcta;
  };

  const apareamiento = trabajo.tipo_actividad === "prueba" ? contenido.apareamiento : null;
  const casoPractico = trabajo.tipo_actividad === "prueba" ? contenido.casoPractico : null;

  // HTML extra para una Prueba con apareamiento y/o caso práctico, a partir
  // de lo que se guardó en datos_prueba (apareamiento_respuestas, caso_respuesta).
  const extraPruebaHTML = (e) => {
    const dp = e.datos_prueba || {};
    let html = "";
    if (apareamiento && Array.isArray(apareamiento.pares) && apareamiento.pares.length) {
      const respuestas = Array.isArray(dp.apareamiento_respuestas) ? dp.apareamiento_respuestas : [];
      const correctasApar = apareamiento.pares.reduce((acc, _, i) => acc + (respuestas[i] === i ? 1 : 0), 0);
      html += `
        <div style="margin-top:0.6rem;">
          <p style="font-weight:600; font-size:0.82rem; margin-bottom:0.3rem;">Apareamiento: ${correctasApar}/${apareamiento.pares.length}</p>
          <div style="display:grid; gap:0.3rem;">
            ${apareamiento.pares.map((p, i) => {
              const val = respuestas[i];
              const correcta = val === i;
              const elegido = (val === null || val === undefined) ? "Sin responder" : (apareamiento.pares[val]?.respuesta ?? "Sin responder");
              return `<div style="font-size:0.8rem; padding:0.3rem 0.5rem; border-left:3px solid ${correcta ? "#1d7a43" : "#c0392b"};">
                <div>${i + 1}. ${p.situacion}</div>
                <div style="color:${correcta ? "#1d7a43" : "#c0392b"};">${correcta ? "✓" : "✗"} Relacionó: ${elegido}</div>
                ${!correcta ? `<div style="color:var(--text-muted);">Correcta: ${p.respuesta}</div>` : ""}
              </div>`;
            }).join("")}
          </div>
        </div>`;
    }
    if (casoPractico && (casoPractico.enunciado || casoPractico.instruccion)) {
      html += `
        <div style="margin-top:0.6rem;">
          <p style="font-weight:600; font-size:0.82rem; margin-bottom:0.3rem;">Caso práctico (calificar a mano en Rúbrica y Evaluaciones):</p>
          <div style="font-size:0.82rem; background:var(--surface); border:1px solid var(--paper-line); border-radius:6px; padding:0.5rem 0.6rem; white-space:pre-wrap;">${dp.caso_respuesta ? dp.caso_respuesta.replace(/[<>]/g, "") : "<em>Sin respuesta</em>"}</div>
        </div>`;
    }
    return html;
  };

  const detalleDe = (e) => {
    const respuestas = Array.isArray(e.respuestas) ? e.respuestas : [];
    const correctas = items.reduce((acc, item, i) => acc + (esCorrecta(item, respuestas[i]) ? 1 : 0), 0);
    const preguntas = items.map((item, i) => {
      const correcta = esCorrecta(item, respuestas[i]);
      return `
      <div style="font-size:0.82rem; padding:0.4rem 0.5rem; border-left:3px solid ${correcta ? "#1d7a43" : "#c0392b"};">
        <div style="font-weight:600;">${i + 1}. ${item.texto}</div>
        <div style="color:${correcta ? "#1d7a43" : "#c0392b"};">${correcta ? "✓" : "✗"} Respondió: ${respuestaTexto(item, respuestas[i])}</div>
        ${!correcta ? `<div style="color:var(--text-muted);">Respuesta correcta: ${respuestaTexto(item, item.correcta)}</div>` : ""}
      </div>`;
    }).join("") + extraPruebaHTML(e);
    return { correctas, preguntas };
  };

  if (soloEstudianteId) {
    const { correctas, preguntas } = detalleDe(entregas[0]);
    return `<div style="margin-top:0.5rem; background:var(--surface-soft); border-radius:8px; padding:0.6rem 0.8rem;">
      <p style="font-weight:600; margin-bottom:0.5rem;">Tu nota: ${correctas}/${items.length} (${items.length ? Math.round((correctas / items.length) * 100) : 0}%)</p>
      <div style="display:grid; gap:0.4rem;">${preguntas}</div>
    </div>`;
  }

  const estudianteIds = entregas.map(e => e.estudiante_id);
  const { data: estudiantes } = await sb.from("estudiantes").select("id, nombre, apellido1, apellido2").in("id", estudianteIds);
  const nombrePorId = {};
  (estudiantes || []).forEach(e => { nombrePorId[e.id] = [e.apellido1, e.apellido2, e.nombre].filter(Boolean).join(" "); });

  const filas = entregas
    .sort((a, b) => (nombrePorId[a.estudiante_id] || "").localeCompare(nombrePorId[b.estudiante_id] || ""))
    .map(e => {
      const { correctas, preguntas } = detalleDe(e);
      return `
      <details style="margin-bottom:0.5rem; background:var(--surface-soft); border-radius:8px; padding:0.6rem 0.8rem;">
        <summary style="cursor:pointer; font-size:0.85rem; display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">
          <span>${nombrePorId[e.estudiante_id] || e.estudiante_id}</span>
          <span style="display:flex; align-items:center; gap:0.5rem;">${badgeSalidas(e.intentos_salida)}<strong>Nota: ${correctas}/${items.length} (${items.length ? Math.round((correctas / items.length) * 100) : 0}%)</strong></span>
        </summary>
        <div style="margin-top:0.6rem; display:grid; gap:0.4rem;">${preguntas}</div>
      </details>`;
    }).join("");

  return `<div style="margin-top:0.5rem;">
    <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.5rem;">La nota es la cantidad de preguntas correctas sobre el total (cada pregunta vale 1 punto). Hacé clic en un estudiante para ver el detalle.</p>
    ${filas}
  </div>`;
}

// Panel del profesor para la "Lluvia de ideas": todas las ideas enviadas,
// agrupadas por estudiante, con botones para marcar cada una como buena o
// mala (clic de nuevo en la misma la deja sin marcar). Mide la
// participación (cuántas intervenciones hizo cada quien) además de la
// calidad de cada idea.
async function pintarPanelIdeas(panel, trabajoId) {
  const { data: ideas } = await sb.from("trabajo_ideas").select("*").eq("trabajo_id", trabajoId).order("creado_en");
  if (!ideas || ideas.length === 0) {
    panel.innerHTML = `<p class="empty" style="font-size:0.82rem;">Todavía nadie ha enviado ideas.</p>`;
    return;
  }

  const estudianteIds = [...new Set(ideas.map(i => i.estudiante_id))];
  const { data: estudiantes } = await sb.from("estudiantes").select("id, nombre, apellido1, apellido2").in("id", estudianteIds);
  const nombrePorId = {};
  (estudiantes || []).forEach(e => { nombrePorId[e.id] = [e.apellido1, e.apellido2, e.nombre].filter(Boolean).join(" "); });

  const porEstudiante = {};
  ideas.forEach(i => { (porEstudiante[i.estudiante_id] = porEstudiante[i.estudiante_id] || []).push(i); });
  const estudiantesOrdenados = Object.keys(porEstudiante).sort((a, b) => (nombrePorId[a] || a).localeCompare(nombrePorId[b] || b));

  panel.innerHTML = `
    <div style="margin-top:0.5rem; background:var(--surface-soft); border-radius:8px; padding:0.7rem;">
      <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.6rem;">${estudiantesOrdenados.length} estudiante${estudiantesOrdenados.length === 1 ? "" : "s"} participaron · ${ideas.length} idea${ideas.length === 1 ? "" : "s"} en total. Marcá cada idea como buena o mala — un segundo clic en la misma la deja sin marcar.</p>
      ${estudiantesOrdenados.map(estId => {
        const propias = porEstudiante[estId];
        const buenas = propias.filter(i => i.calificacion === "buena").length;
        const malas = propias.filter(i => i.calificacion === "mala").length;
        return `
        <details open style="margin-bottom:0.5rem; background:var(--surface); border-radius:8px; padding:0.6rem 0.8rem; border:1px solid var(--paper-line);">
          <summary style="cursor:pointer; font-size:0.85rem; display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">
            <span>${nombrePorId[estId] || estId}</span>
            <span style="font-size:0.78rem; color:var(--text-muted);">${propias.length} intervención${propias.length === 1 ? "" : "es"} · 👍 ${buenas} · 👎 ${malas}</span>
          </summary>
          <div style="margin-top:0.5rem; display:grid; gap:0.4rem;">
            ${propias.map(idea => `
              <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; padding:0.4rem 0.5rem; border-left:3px solid ${idea.calificacion === "buena" ? "#1d7a43" : (idea.calificacion === "mala" ? "#c0392b" : "#ccc")}; font-size:0.85rem;">
                <span>${idea.texto}</span>
                <span style="display:flex; gap:0.3rem; flex-shrink:0;">
                  <button class="btn ${idea.calificacion === "buena" ? "" : "secondary"} small" data-calificar-idea="${idea.id}" data-calificacion="buena">👍 Buena</button>
                  <button class="btn ${idea.calificacion === "mala" ? "danger" : "secondary"} small" data-calificar-idea="${idea.id}" data-calificacion="mala">👎 Mala</button>
                </span>
              </div>`).join("")}
          </div>
        </details>`;
      }).join("")}
    </div>`;

  panel.querySelectorAll("[data-calificar-idea]").forEach(b => {
    b.addEventListener("click", async () => {
      const ideaId = b.dataset.calificarIdea;
      const nueva = b.dataset.calificacion;
      const idea = ideas.find(i => String(i.id) === String(ideaId));
      const valorFinal = (idea && idea.calificacion === nueva) ? null : nueva;
      await sb.from("trabajo_ideas").update({ calificacion: valorFinal }).eq("id", ideaId);
      await pintarPanelIdeas(panel, trabajoId);
    });
  });
}

// Panel del profesor para "Respuesta abierta": cada entrega de texto, con
// un selector 0-3 para ponerle la nota a mano ahí mismo. Al guardar, la
// nota queda en actividades_estudiante y (si el trabajo tiene indicador)
// en calificaciones_indicador — aparece de una vez en Rúbrica y Evaluaciones.
async function pintarPanelEntregasAbiertas(panel, trabajo, onCalificado) {
  const { data: entregas } = await sb.from("actividades_estudiante").select("*").eq("trabajo_id", trabajo.id).eq("completado", true);
  if (!entregas || entregas.length === 0) {
    panel.innerHTML = `<p class="empty" style="font-size:0.82rem;">Todavía nadie ha entregado.</p>`;
    return;
  }
  const estudianteIds = entregas.map(e => e.estudiante_id);
  const { data: estudiantes } = await sb.from("estudiantes").select("id, nombre, apellido1, apellido2").in("id", estudianteIds);
  const nombrePorId = {};
  (estudiantes || []).forEach(e => { nombrePorId[e.id] = [e.apellido1, e.apellido2, e.nombre].filter(Boolean).join(" "); });

  const filas = entregas
    .sort((a, b) => (nombrePorId[a.estudiante_id] || "").localeCompare(nombrePorId[b.estudiante_id] || ""))
    .map(e => `
      <details style="margin-bottom:0.5rem; background:var(--surface-soft); border-radius:8px; padding:0.6rem 0.8rem;">
        <summary style="cursor:pointer; font-size:0.85rem; display:flex; justify-content:space-between; align-items:center; gap:0.5rem; flex-wrap:wrap;">
          <span>${nombrePorId[e.estudiante_id] || e.estudiante_id}</span>
          <span class="badge" style="font-weight:400;">${e.puntaje != null ? "Nota: " + e.puntaje + "/3" : "Pendiente de calificar"}</span>
        </summary>
        <div style="margin-top:0.6rem; font-size:0.85rem; white-space:pre-wrap; background:var(--surface); border-radius:6px; padding:0.6rem;">${(e.respuestas && e.respuestas.texto) || ""}</div>
        <div class="row" style="margin-top:0.6rem; align-items:center; gap:0.5rem;">
          <label style="font-size:0.82rem;">Nota:
            <select data-nota-abierta="${e.estudiante_id}" style="margin-left:0.3rem;">
              ${[0, 1, 2, 3].map(n => `<option value="${n}" ${e.puntaje === n ? "selected" : ""}>${n}</option>`).join("")}
            </select>
          </label>
          <button class="btn small" data-guardar-nota-abierta="${e.estudiante_id}">Guardar nota</button>
          <span data-nota-abierta-estado="${e.estudiante_id}" style="font-size:0.78rem; color:var(--text-muted);"></span>
        </div>
      </details>`).join("");

  panel.innerHTML = `<div style="margin-top:0.5rem;">${filas}</div>`;

  panel.querySelectorAll("[data-guardar-nota-abierta]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const estudianteId = btn.dataset.guardarNotaAbierta;
      const select = panel.querySelector(`[data-nota-abierta="${estudianteId}"]`);
      const estado = panel.querySelector(`[data-nota-abierta-estado="${estudianteId}"]`);
      const puntaje = Number(select.value);
      btn.disabled = true;
      if (estado) estado.textContent = "Guardando…";
      const { error } = await guardarNotaManualActividad(trabajo, estudianteId, puntaje);
      btn.disabled = false;
      if (error) { if (estado) estado.textContent = "No se pudo guardar: " + error; return; }
      if (estado) estado.textContent = "✓ Guardado.";
      if (onCalificado) onCalificado();
    });
  });
}

// Panel del profesor para "Autoevaluación / Coevaluación": solo lectura —
// ya se califica sola al terminar, esto es para que el profesor vea qué
// contestó cada estudiante en cada afirmación.
async function pintarPanelAutoevaluaciones(panel, trabajo) {
  const afirmaciones = (trabajo.contenido_actividad && trabajo.contenido_actividad.afirmaciones) || [];
  const { data: entregas } = await sb.from("actividades_estudiante").select("*").eq("trabajo_id", trabajo.id).eq("completado", true);
  if (!entregas || entregas.length === 0) {
    panel.innerHTML = `<p class="empty" style="font-size:0.82rem;">Todavía nadie la ha respondido.</p>`;
    return;
  }
  const estudianteIds = entregas.map(e => e.estudiante_id);
  const { data: estudiantes } = await sb.from("estudiantes").select("id, nombre, apellido1, apellido2").in("id", estudianteIds);
  const nombrePorId = {};
  (estudiantes || []).forEach(e => { nombrePorId[e.id] = [e.apellido1, e.apellido2, e.nombre].filter(Boolean).join(" "); });

  const filas = entregas
    .sort((a, b) => (nombrePorId[a.estudiante_id] || "").localeCompare(nombrePorId[b.estudiante_id] || ""))
    .map(e => {
      const respuestas = Array.isArray(e.respuestas) ? e.respuestas : [];
      return `
      <details style="margin-bottom:0.5rem; background:var(--surface-soft); border-radius:8px; padding:0.6rem 0.8rem;">
        <summary style="cursor:pointer; font-size:0.85rem; display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">
          <span>${nombrePorId[e.estudiante_id] || e.estudiante_id}</span>
          <strong>${Math.round(e.porcentaje || 0)}%</strong>
        </summary>
        <div style="margin-top:0.6rem; display:grid; gap:0.3rem;">
          ${afirmaciones.map((texto, i) => `<div style="font-size:0.82rem; padding:0.3rem 0.4rem; border-left:3px solid var(--ledger-green);">${texto} — <strong>${NIVELES_LIKERT[respuestas[i]] || "Sin responder"}</strong></div>`).join("")}
        </div>
      </details>`;
    }).join("");

  panel.innerHTML = `<div style="margin-top:0.5rem;">${filas}</div>`;
}

// Panel del profesor para "Rúbrica / Lista de cotejo": NO hay entrega del
// estudiante — el profesor califica directamente a cada integrante de la
// sección con los criterios definidos, y se calcula la nota 0-3 sola.
async function pintarPanelCalificarRubrica(panel, trabajo, materiaId) {
  const criterios = (trabajo.contenido_actividad && trabajo.contenido_actividad.criterios) || [];
  const { data: inscritos } = await sb.from("estudiante_materias").select("estudiante_id").eq("materia_id", materiaId);
  const estudianteIds = (inscritos || []).map(i => i.estudiante_id);
  if (estudianteIds.length === 0) {
    panel.innerHTML = `<p class="empty" style="font-size:0.82rem;">No hay estudiantes inscritos en esta materia todavía.</p>`;
    return;
  }
  const { data: estudiantes } = await sb.from("estudiantes").select("id, nombre, apellido1, apellido2").in("id", estudianteIds);
  const nombrePorId = {};
  (estudiantes || []).forEach(e => { nombrePorId[e.id] = [e.apellido1, e.apellido2, e.nombre].filter(Boolean).join(" "); });
  const ordenados = estudianteIds.slice().sort((a, b) => (nombrePorId[a] || "").localeCompare(nombrePorId[b] || ""));

  const { data: entregas } = await sb.from("actividades_estudiante").select("*").eq("trabajo_id", trabajo.id).in("estudiante_id", estudianteIds);
  const entregaPorEstudiante = {};
  (entregas || []).forEach(e => { entregaPorEstudiante[e.estudiante_id] = e; });

  const esTiraderaTrabajo = trabajo.contenido_actividad && trabajo.contenido_actividad.estrategia === "juego_tiradera";
  // En La Tiradera, los indicadores "a mano" se califican por nivel de desempeño (formato MEP).
  const campoCriterio = (estId, c, i, valor) => {
    if (esTiraderaTrabajo && !c.auto) {
      const max = Number(c.puntos_max) || 3, nv = tiraderaNivelesDe(c);
      const opts = [["", "— Sin calificar —"], [0, "Sin evidencia (0)"]].concat(TIRADERA_NIVELES.slice().reverse().map(([k, et, v]) => [Math.round(v / 3 * max), `${et} (${Math.round(v / 3 * max)}) — ${nv[k]}`]));
      return `<select data-rubrica-criterio="${estId}" data-i="${i}" style="max-width:22rem; padding:0.3rem;">${opts.map(([v, t]) => `<option value="${v}" ${valor != null && String(valor) === String(v) ? "selected" : ""}>${escAC(t)}</option>`).join("")}</select>`;
    }
    return `<input type="number" data-rubrica-criterio="${estId}" data-i="${i}" min="0" max="${c.puntos_max}" value="${valor != null ? valor : ""}" placeholder="0-${c.puntos_max}" style="width:4.5rem; padding:0.3rem;" ${esTiraderaTrabajo && c.auto ? 'title="Se sugiere solo con el registro del juego (✅ Aplicar notas sugeridas)"' : ""} />`;
  };
  const filaEstudiante = (estId) => {
    const entrega = entregaPorEstudiante[estId];
    const puntosGuardados = (entrega && Array.isArray(entrega.respuestas) && entrega.respuestas) || [];
    return `
    <details style="margin-bottom:0.5rem; background:var(--surface-soft); border-radius:8px; padding:0.6rem 0.8rem;" data-rubrica-fila="${estId}">
      <summary style="cursor:pointer; font-size:0.85rem; display:flex; justify-content:space-between; align-items:center; gap:0.5rem; flex-wrap:wrap;">
        <span>${nombrePorId[estId] || estId}</span>
        <span class="badge" style="font-weight:400;">${entrega && entrega.puntaje != null ? "Nota: " + entrega.puntaje + "/3" : "Sin calificar"}</span>
      </summary>
      <div style="margin-top:0.6rem; display:grid; gap:0.5rem;">
        ${criterios.map((c, i) => `
          <label style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; font-size:0.82rem;">
            <span style="flex:1;">${c.nombre}${esTiraderaTrabajo ? ` <span style="color:var(--text-muted); font-size:0.75rem;">${c.auto ? "(automático)" : "(a mano, por nivel)"}</span>` : ""}</span>
            ${campoCriterio(estId, c, i, puntosGuardados[i])}
          </label>`).join("")}
      </div>
      <div class="row" style="margin-top:0.6rem; align-items:center; gap:0.5rem;">
        <button class="btn small" data-guardar-rubrica="${estId}">Guardar nota</button>
        <span data-rubrica-estado="${estId}" style="font-size:0.78rem; color:var(--text-muted);"></span>
      </div>
    </details>`;
  };

  const esTiradera = trabajo.contenido_actividad && trabajo.contenido_actividad.estrategia === "juego_tiradera";
  panel.innerHTML = `
    ${esTiradera ? `<div data-tiradera-bloque style="margin-bottom:0.8rem;"></div>` : ""}
    <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.5rem;">Ponele puntos a cada criterio por estudiante (podés dejar algunos sin calificar y volver después). La nota 0-3 se calcula sola según el % del total de puntos.</p>
    <div>${ordenados.map(filaEstudiante).join("")}</div>`;
  if (esTiradera) {
    pintarBloqueTiradera(panel.querySelector("[data-tiradera-bloque]"), panel, trabajo, ordenados, nombrePorId, estudiantes || [],
      () => pintarPanelCalificarRubrica(panel, trabajo, materiaId));
  }

  panel.querySelectorAll("[data-guardar-rubrica]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const estId = btn.dataset.guardarRubrica;
      const estado = panel.querySelector(`[data-rubrica-estado="${estId}"]`);
      const inputs = Array.from(panel.querySelectorAll(`[data-rubrica-criterio="${estId}"]`)).sort((a, b) => Number(a.dataset.i) - Number(b.dataset.i));
      const puntos = inputs.map(inp => inp.value === "" ? 0 : Number(inp.value));
      const porcentaje = porcentajeDesdeCriterios(criterios, puntos);
      const puntaje = puntajeDesdePorcentaje(porcentaje);
      btn.disabled = true;
      if (estado) estado.textContent = "Guardando…";
      const { error } = await guardarNotaManualActividad(trabajo, estId, puntaje, { respuestas: puntos, porcentaje });
      btn.disabled = false;
      if (error) { if (estado) estado.textContent = "No se pudo guardar: " + error; return; }
      if (estado) estado.textContent = `✓ Guardado — ${Math.round(porcentaje)}% → nota ${puntaje}/3.`;
    });
  });
}

// --- La Tiradera (estrategia de evaluación con juego en vivo) ---
// Muestra el registro que guardó el juego (puntos ganados / perdidos por
// estudiante), sugiere los puntos de cada criterio "auto" y permite
// aplicarlos a todos de una vez. Los criterios sin "auto" (si el profesor
// agregó alguno) conservan lo que ya tengan puesto.
const normNombreTiradera = v => String(v || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zñ\s]/g, " ").split(/\s+/).filter(x => x.length >= 2);
function emparejarEstudianteTiradera(fila, estudiantes) {
  if (fila.estudiante_id && estudiantes.some(e => String(e.id) === String(fila.estudiante_id))) return String(fila.estudiante_id);
  const t = normNombreTiradera(fila.nombre);
  if (t.length < 2) return "";
  const candidatos = estudiantes.filter(e => {
    const n = new Set(normNombreTiradera([e.nombre, e.apellido1, e.apellido2].join(" ")));
    return t.filter(x => n.has(x)).length >= Math.min(t.length, 2) && t.every(x => n.has(x) || x.length <= 2);
  });
  return candidatos.length === 1 ? String(candidatos[0].id) : "";
}
async function pintarBloqueTiradera(cont, panel, trabajo, ordenados, nombrePorId, estudiantes, alAplicar) {
  if (!cont) return;
  cont.innerHTML = `<p style="font-size:0.82rem; color:var(--text-muted);">Cargando registro de La Tiradera…</p>`;
  const { data: fresco } = await sb.from("trabajos_cotidianos").select("contenido_actividad").eq("id", trabajo.id).maybeSingle();
  const contenido = (fresco && fresco.contenido_actividad) || trabajo.contenido_actividad || {};
  const criterios = contenido.criterios || [];
  const preset = ESTRATEGIAS_EVALUACION.juego_tiradera;
  const autoDe = (c, i) => c.auto || (preset.criterios[i] && preset.criterios[i].auto) || null;
  const partidas = (contenido.tiradera_partidas || []).slice().reverse();
  const caja = (html) => `<div style="background:var(--surface-soft); border:1px solid var(--paper-line); border-radius:10px; padding:0.8rem;">${vivoHTML}${html}</div>`;
  // Resultados en vivo (solo el profesor): monitor embebido de la partida abierta.
  const vivo = contenido.tiradera_en_vivo;
  const vivoActivo = vivo && vivo.pin && vivo.estado !== "terminada" && (Date.now() - new Date(vivo.fecha).getTime()) < 6 * 3600 * 1000;
  const vivoHTML = `<div style="margin-bottom:0.8rem; padding-bottom:0.8rem; border-bottom:1px solid var(--paper-line);">
      <div class="row" style="align-items:center; justify-content:space-between; gap:0.5rem;">
        <strong>📡 Resultados en vivo <span style="font-weight:400; color:var(--text-muted); font-size:0.8rem;">(solo usted los ve, con nombres reales)</span></strong>
        <button class="btn secondary small" data-tir-refrescar type="button">🔄 Actualizar</button>
      </div>
      ${vivoActivo
        ? `<iframe src="tiradera.html?monitor=${encodeURIComponent(vivo.pin)}&embed=1" title="Resultados en vivo" style="width:100%; height:440px; border:1px solid var(--paper-line); border-radius:8px; margin-top:0.5rem; background:#fff;"></iframe>`
        : `<p style="font-size:0.8rem; color:var(--text-muted); margin:0.4rem 0 0;">No hay una partida abierta en este momento. Cuando la lance con "⚡ Lanzar La Tiradera", tocá 🔄 Actualizar y acá vas a ver en vivo cómo le va a cada estudiante.</p>`}
    </div>`;
  const encabezado = `<div class="row" style="align-items:center; justify-content:space-between; gap:0.5rem; margin-bottom:0.5rem;">
      <strong>⚡ Registro de La Tiradera</strong>
      <span style="display:flex; gap:0.4rem; flex-wrap:wrap;">
        <button class="btn secondary small" data-tir-editar-crit type="button">📋 Evaluación (formato MEP)</button>
        <button class="btn secondary small" data-tir-ver-ins type="button">📄 Ver / imprimir instrumento</button>
        <a class="btn small" href="tiradera.html?trabajo=${trabajo.id}" target="_blank" rel="noopener">⚡ Lanzar La Tiradera</a></span></div>
      <div data-tir-crit-editor style="display:none; margin-bottom:0.8rem;"></div>`;
  if (!partidas.length) {
    cont.innerHTML = caja(`${encabezado}<p style="font-size:0.82rem; color:var(--text-muted); margin:0;">Todavía no hay partidas terminadas. Tocá "⚡ Lanzar La Tiradera", armá los retos y jugá con la clase: al terminar, el registro de puntos llega solo acá y se sugieren las notas de cada criterio.</p>`);
    ligarRefrescar();
    return;
  }
  let sel = 0;
  function ligarRefrescar() {
    const b = cont.querySelector("[data-tir-refrescar]"); if (b) b.addEventListener("click", () => alAplicar());
    const e = cont.querySelector("[data-tir-editar-crit]"); if (e) e.addEventListener("click", () => abrirEditorCriterios());
    const v = cont.querySelector("[data-tir-ver-ins]"); if (v) v.addEventListener("click", () => verInstrumento());
  }
  // Editor de los criterios de evaluación de este trabajo (lo que ven los
  // estudiantes con el botón "📋 Evaluación" del juego).
  function verInstrumento() {
    const w = window.open("", "_blank");
    if (!w) { alert("El navegador bloqueó la ventana. Permití ventanas emergentes para este sitio."); return; }
    w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Instrumento · ${escAC(trabajo.titulo)}</title>
      <style>body{font-family:Arial,sans-serif;margin:24px;color:#111}table.tir-ins{width:100%;border-collapse:collapse;font-size:12px}table.tir-ins th,table.tir-ins td{border:1px solid #888;padding:6px;vertical-align:top}table.tir-ins th{background:#eee}button{margin-bottom:12px;padding:8px 14px}@media print{button{display:none}}</style></head>
      <body><button onclick="window.print()">🖨️ Imprimir / guardar PDF</button>${tiraderaInstrumentoHTML(trabajo.titulo, criterios, contenido.tiradera_instrumento)}</body></html>`);
    w.document.close();
  }
  function abrirEditorCriterios() {
    const MEDIDAS = [
      ["dominio_pct", "Automático: % de logro en los retos"],
      ["participacion_pct", "Automático: % de retos respondidos a tiempo"],
      ["precision_pct", "Automático: puntos ganados vs. perdidos"],
      ["rapidez_pct", "Automático: tiempo sobrante en los aciertos"],
      ["aportes_pct", "Automático: preguntas propuestas y aprobadas"],
      ["", "Lo califico yo (a mano, por nivel)"]
    ];
    const ed = cont.querySelector("[data-tir-crit-editor]");
    if (!ed) return;
    if (ed.style.display !== "none") { ed.style.display = "none"; return; }
    let ins = { ...TIRADERA_INSTRUMENTO_BASE, unidad: trabajo.titulo || "", ...(contenido.tiradera_instrumento || {}) };
    let lista = criterios.map((c, i) => { const auto = autoDe(c, i) || ""; return { nombre: c.nombre, puntos_max: Number(c.puntos_max) || 3, auto, niveles: tiraderaNivelesDe({ ...c, auto }) }; });
    const campo = (k, et, ph) => `<label style="display:flex; flex-direction:column; gap:0.2rem; font-size:0.78rem; flex:1 1 14rem;">${et}<input data-ins="${k}" value="${escAC(ins[k] || "")}" placeholder="${ph}" style="padding:0.35rem;" /></label>`;
    const fila = (c, i) => `<div style="border:1px solid var(--paper-line); border-radius:8px; padding:0.5rem; margin-bottom:0.5rem;">
        <div style="display:flex; gap:0.4rem; flex-wrap:wrap; align-items:center;">
          <strong style="width:1.6rem;">${i + 1}.</strong>
          <input data-ce-nombre="${i}" value="${escAC(c.nombre)}" placeholder="Indicador: verbo + contenido + condición" style="flex:3 1 16rem; padding:0.35rem;" />
          <label style="font-size:0.78rem;">Puntos <input data-ce-max="${i}" type="number" min="1" max="20" value="${c.puntos_max}" style="width:4rem; padding:0.3rem;" /></label>
          <select data-ce-auto="${i}" style="flex:2 1 13rem; padding:0.3rem;">${MEDIDAS.map(([v, t]) => `<option value="${v}" ${v === c.auto ? "selected" : ""}>${t}</option>`).join("")}</select>
          <button class="btn danger small" data-ce-quitar="${i}" type="button">✕</button></div>
        <details style="margin:0.4rem 0 0 2rem;" ${c.auto ? "" : "open"}><summary style="cursor:pointer; font-size:0.78rem; font-weight:600;">Niveles de desempeño (evidencia de cada nivel)</summary>
          ${TIRADERA_NIVELES.map(([k, et, v]) => `<label style="display:flex; gap:0.4rem; align-items:flex-start; margin-top:0.3rem; font-size:0.78rem;"><span style="flex:0 0 7rem; font-weight:600;">${et} (${v})</span><textarea data-ce-nivel="${i}" data-k="${k}" rows="2" style="flex:1; padding:0.3rem; font-family:inherit; font-size:0.8rem;">${escAC(c.niveles[k] || "")}</textarea></label>`).join("")}
          <button class="btn secondary small" data-ce-ia="${i}" type="button" style="margin-top:0.3rem;">✨ Mejorar este indicador con IA</button>
          ${c.iaNota ? `<div style="font-size:0.75rem; color:#1d7a43; margin-top:0.2rem;">✨ ${escAC(c.iaNota)}</div>` : ""}
        </details></div>`;
    const leer = () => {
      ed.querySelectorAll("[data-ins]").forEach(x => { ins[x.dataset.ins] = x.value.trim(); });
      lista = lista.map((c, i) => {
        const niveles = {}; ed.querySelectorAll(`[data-ce-nivel="${i}"]`).forEach(t => { niveles[t.dataset.k] = t.value.trim(); });
        return { nombre: (ed.querySelector(`[data-ce-nombre="${i}"]`)?.value || "").trim(), puntos_max: Number(ed.querySelector(`[data-ce-max="${i}"]`)?.value) || 0, auto: ed.querySelector(`[data-ce-auto="${i}"]`)?.value || "", niveles, iaNota: c.iaNota };
      });
    };
    const pintarEd = () => {
      ed.style.display = "";
      ed.innerHTML = `<div style="background:var(--surface); border:1px solid var(--paper-line); border-radius:8px; padding:0.7rem;">
        <p style="font-size:0.8rem; color:var(--text-muted); margin:0 0 0.5rem;">Instrumento en formato MEP (programa de estudio y lineamientos técnicos): indicadores de logro con la evidencia de cada nivel — Avanzado (3), Intermedio (2), Inicial (1); 0 si no presenta evidencia. Es lo mismo que ven los estudiantes en el botón <strong>📋 Evaluación</strong> del juego. Calificación = puntos obtenidos × 100 ÷ total.</p>
        <p style="font-size:0.85rem; font-weight:600; margin:0.3rem 0;">Datos del instrumento</p>
        <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:0.6rem;">
          <label style="display:flex; flex-direction:column; gap:0.2rem; font-size:0.78rem; flex:1 1 10rem;">Componente<select data-ins="componente" style="padding:0.35rem;">${["Trabajo cotidiano", "Tareas", "Proyecto", "Pruebas"].map(o => `<option ${ins.componente === o ? "selected" : ""}>${o}</option>`).join("")}</select></label>
          <label style="display:flex; flex-direction:column; gap:0.2rem; font-size:0.78rem; flex:1 1 10rem;">Tipo de instrumento<select data-ins="tipo" style="padding:0.35rem;">${["Escala de desempeño", "Rúbrica", "Lista de cotejo"].map(o => `<option ${ins.tipo === o ? "selected" : ""}>${o}</option>`).join("")}</select></label>
          ${campo("subarea", "Subárea", "Ej.: Gestión contable")}${campo("unidad", "Unidad de estudio / tema", "Ej.: Planillas")}
        </div>
        <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-bottom:0.6rem;">${campo("resultado", "Resultado de aprendizaje (copiar del programa)", "Resultado de aprendizaje")}${campo("indicador", "Indicador de logro (copiar del programa)", "Indicador de logro")}</div>
        <div style="background:var(--surface-soft); border:1px dashed var(--paper-line); border-radius:8px; padding:0.5rem 0.6rem; margin-bottom:0.6rem;">
          <strong style="font-size:0.85rem;">✨ Mejorar con IA</strong> <span style="font-size:0.78rem; color:var(--text-muted);">— redacta los indicadores (verbo + contenido + condición) y la evidencia de cada nivel según el tema y el resultado de aprendizaje. Queda en el editor para que lo revise; no se guarda hasta que toque 💾.</span>
          <div class="row" style="gap:0.4rem; margin-top:0.4rem; align-items:center;">
            <input data-ce-ia-indic maxlength="400" placeholder="Indicaciones para la IA (opcional)" style="flex:3 1 16rem; padding:0.35rem;" />
            <button class="btn small" data-ce-ia="todos" type="button">✨ Mejorar todos los niveles</button>
          </div>
          <span data-ce-ia-estado style="font-size:0.78rem; color:var(--text-muted);"></span>
        </div>
        <p style="font-size:0.85rem; font-weight:600; margin:0.3rem 0;">Indicadores y criterios de desempeño</p>
        ${lista.map(fila).join("")}
        <div class="row" style="gap:0.4rem; margin-top:0.4rem; align-items:center;">
          <button class="btn secondary small" data-ce-agregar type="button">+ Agregar indicador</button>
          <button class="btn small" data-ce-guardar type="button">💾 Guardar evaluación</button>
          <button class="btn secondary small" data-ce-base type="button">↺ Indicadores sugeridos (MEP)</button>
          <span style="font-size:0.78rem; color:var(--text-muted);">Total: ${lista.reduce((a, c) => a + (Number(c.puntos_max) || 0), 0)} puntos</span>
          <span data-ce-estado style="font-size:0.78rem; color:var(--text-muted);"></span>
        </div></div>`;
      ed.querySelectorAll("[data-ce-quitar]").forEach(b => b.addEventListener("click", () => { leer(); lista.splice(Number(b.dataset.ceQuitar), 1); pintarEd(); }));
      ed.querySelectorAll("[data-ce-ia]").forEach(b => b.addEventListener("click", async () => {
        leer();
        const estado = ed.querySelector("[data-ce-ia-estado]");
        const indices = b.dataset.ceIa === "todos" ? null : [Number(b.dataset.ceIa)];
        const indic = ed.querySelector("[data-ce-ia-indic]")?.value || "";
        ed.querySelectorAll("[data-ce-ia]").forEach(x => { x.disabled = true; });
        if (estado) estado.textContent = "✨ La IA está trabajando…";
        let datos = null, error = "";
        for (let intento = 0; intento < 3 && !datos; intento++) {
          try {
            const r = await fetch("/api/mejorar-niveles-ia", { method: "POST", headers: { "content-type": "application/json" },
              body: JSON.stringify({ instrumento: ins, criterios: lista, indices, instrucciones: indic }) });
            const j = await r.json().catch(() => ({}));
            if (r.ok && Array.isArray(j.criterios)) datos = j; else { error = j.error || ("Error " + r.status); if (r.status !== 503) break; await new Promise(res => setTimeout(res, 3000)); }
          } catch (e) { error = "No hay conexión."; break; }
        }
        if (!datos) { ed.querySelectorAll("[data-ce-ia]").forEach(x => { x.disabled = false; }); if (estado) estado.textContent = "No se pudo mejorar con IA: " + error; return; }
        const antes = lista.map(c => ({ ...c, niveles: { ...c.niveles } }));
        datos.criterios.forEach(p => { if (lista[p.i]) { lista[p.i].nombre = p.nombre; lista[p.i].niveles = { ...p.niveles }; lista[p.i].iaNota = p.nota || "Redacción mejorada por la IA."; } });
        const iaIndic = indic;
        pintarEd();
        const est2 = ed.querySelector("[data-ce-ia-estado]"); const inp2 = ed.querySelector("[data-ce-ia-indic]"); if (inp2) inp2.value = iaIndic;
        if (est2) { est2.innerHTML = `✨ Listo: ${datos.criterios.length} indicador(es) mejorado(s) en el editor. Revíselos y toque <strong>💾 Guardar evaluación</strong>. <button class="btn secondary small" type="button" data-ce-deshacer>↩ Deshacer</button>`;
          est2.querySelector("[data-ce-deshacer]").addEventListener("click", () => { lista = antes; pintarEd(); }); }
        ed.querySelectorAll("details").forEach(dt => { dt.open = true; });
      }));
      ed.querySelectorAll("[data-ce-auto]").forEach(sel => sel.addEventListener("change", () => { leer(); const i = Number(sel.dataset.ceAuto); lista[i].niveles = sel.value ? { ...TIRADERA_NIVELES_AUTO[sel.value] } : { ...TIRADERA_NIVELES_MANUAL }; pintarEd(); }));
      ed.querySelectorAll("[data-ce-max]").forEach(inp => inp.addEventListener("change", () => { leer(); pintarEd(); }));
      ed.querySelector("[data-ce-agregar]").addEventListener("click", () => { leer(); lista.push({ nombre: "", puntos_max: 3, auto: "", niveles: { ...TIRADERA_NIVELES_MANUAL } }); pintarEd(); });
      ed.querySelector("[data-ce-base]").addEventListener("click", () => { if (!confirm("¿Reemplazar por los 5 indicadores sugeridos (formato MEP)?")) return; lista = preset.criterios.map(c => ({ nombre: c.nombre, puntos_max: c.puntos_max, auto: c.auto || "", niveles: tiraderaNivelesDe(c) })); pintarEd(); });
      ed.querySelector("[data-ce-guardar]").addEventListener("click", async (ev) => {
        leer();
        const estado = ed.querySelector("[data-ce-estado]");
        if (!lista.length) { estado.textContent = "Dejá al menos un indicador."; return; }
        const malo = lista.findIndex(c => !c.nombre || c.puntos_max <= 0);
        if (malo >= 0) { estado.textContent = `Completá el nombre y los puntos del indicador ${malo + 1}.`; return; }
        ev.target.disabled = true; estado.textContent = "Guardando…";
        const nuevos = lista.map(c => { const x = { nombre: c.nombre, puntos_max: c.puntos_max, niveles: c.niveles }; if (c.auto) x.auto = c.auto; return x; }); // (iaNota no se guarda)
        const { data: actual } = await sb.from("trabajos_cotidianos").select("contenido_actividad").eq("id", trabajo.id).maybeSingle();
        const nuevoContenido = { ...((actual && actual.contenido_actividad) || contenido), criterios: nuevos, tiradera_instrumento: ins };
        const { error } = await sb.from("trabajos_cotidianos").update({ contenido_actividad: nuevoContenido }).eq("id", trabajo.id);
        ev.target.disabled = false;
        if (error) { estado.textContent = "No se pudo guardar: " + error.message; return; }
        trabajo.contenido_actividad = nuevoContenido;
        estado.textContent = "✓ Guardado.";
        alAplicar();
      });
    };
    pintarEd();
  }
  const opciones = [{ id: "", label: "— Sin asignar —" }].concat(ordenados.map(id => ({ id: String(id), label: nombrePorId[id] || id })));
  const nivel = pct => puntajeDesdePorcentaje(Number(pct) || 0);
  const sugeridos = fila => criterios.map((c, i) => {
    const k = autoDe(c, i);
    if (!k) return null;
    return Math.round(nivel(fila[k]) / 3 * (Number(c.puntos_max) || 0));
  });
  const pintar = () => {
    const p = partidas[sel];
    const filas = p.registro.map((f, idx) => ({ ...f, idx, estId: emparejarEstudianteTiradera(f, estudiantes) }));
    const sinAsignar = filas.filter(f => !f.estId).length;
    const grupal = p.modalidad === "grupal";
    cont.innerHTML = caja(`${encabezado}
      <div class="row" style="align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
        <label style="font-size:0.82rem;">Partida:
          <select data-tir-partida style="padding:0.3rem;">${partidas.map((x, i) => `<option value="${i}" ${i === sel ? "selected" : ""}>${new Date(x.fecha).toLocaleString("es-CR")} · ${x.registro.length} estudiantes · ${x.retos} retos${x.modalidad === "grupal" ? " · grupal" : ""}</option>`).join("")}</select></label>
      </div>
      ${p.grupos ? `<p style="font-size:0.8rem; margin:0 0 0.4rem;"><strong>Grupos:</strong> ${p.grupos.map(g => `${g.puesto}° ${g.nombre} (${g.puntos} pts, ${g.integrantes})`).join(" · ")}</p>` : ""}
      <div style="overflow-x:auto;">
      <table style="width:100%; border-collapse:collapse; font-size:0.78rem;">
        <thead><tr style="text-align:left; border-bottom:1px solid var(--paper-line);">
          <th style="padding:0.3rem;">Estudiante en la plataforma</th><th>Nombre que escribió / apodo</th>${grupal ? "<th>Grupo</th>" : ""}<th>Pts</th><th>Ganados</th><th>Perdidos</th><th>Aciertos</th><th>Errores</th><th>Sin resp.</th><th>✍️ Aportes</th>
          ${criterios.map((c, i) => `<th title="${String(c.nombre).replace(/"/g, "&quot;")}">C${i + 1}</th>`).join("")}<th>Nota</th></tr></thead>
        <tbody>${filas.map(f => {
          const sug = sugeridos(f);
          const puntosParaNota = sug.map(v => v == null ? 0 : v);
          const nota = puntajeDesdePorcentaje(porcentajeDesdeCriterios(criterios, puntosParaNota));
          return `<tr style="border-bottom:1px solid var(--paper-line);">
            <td style="padding:0.3rem;"><select data-tir-est="${f.idx}" style="max-width:15rem; padding:0.2rem; ${f.estId ? "" : "border:2px solid var(--brick);"}">${opciones.map(o => `<option value="${o.id}" ${o.id === f.estId ? "selected" : ""}>${o.label}</option>`).join("")}</select></td>
            <td>${escAC(f.nombre || "—")}<br><span style="color:var(--text-muted);">«${escAC(f.apodo)}»</span></td>
            ${grupal ? `<td>${escAC(f.grupo || "")}</td>` : ""}
            <td><strong>${f.puntos}</strong></td><td style="color:#1d7a43;">+${f.ganados}</td><td style="color:#c0392b;">−${f.perdidos}</td>
            <td>${f.aciertos}/${f.rondas}</td><td>${f.errores}</td><td>${f.sin_responder}</td><td>${f.preguntas_aportadas || 0}</td>
            ${sug.map((v, i) => `<td title="${autoDe(criterios[i], i) ? f[autoDe(criterios[i], i)] + " %" : "Se califica a mano"}">${v == null ? "—" : v + "/" + criterios[i].puntos_max}</td>`).join("")}
            <td><strong>${nota}/3</strong></td></tr>`;
        }).join("")}</tbody>
      </table></div>
      <details style="margin-top:0.5rem; font-size:0.78rem;"><summary style="cursor:pointer;">Ver detalle por reto y qué mide cada criterio</summary>
        <ul style="margin:0.4rem 0; padding-left:1.2rem;">${criterios.map((c, i) => `<li><strong>C${i + 1}</strong> ${escAC(c.nombre)}${autoDe(c, i) ? "" : " — <em>se califica a mano</em>"}</li>`).join("")}</ul>
        <p style="margin:0.3rem 0;">Escala de cada criterio automático: 85 % o más = 3 · 60–84 % = 2 · 35–59 % = 1 · menos de 35 % = 0 (proporcional si el criterio vale otra cantidad de puntos). Rapidez: el % es el doble del tiempo que le sobraba en promedio en sus aciertos (con 43 % de tiempo sobrante o más llega a 3).</p>
        ${filas.map(f => `<div style="margin-top:0.4rem;"><strong>${escAC(f.nombre || f.apodo)}</strong>: ${(f.detalle || []).map(d => `R${d.reto} ${escAC(d.resultado)} (+${d.ganados}/−${d.perdidos})`).join(" · ")}</div>`).join("")}
      </details>
      <div class="row" style="margin-top:0.6rem; align-items:center; gap:0.5rem;">
        <button class="btn small" data-tir-aplicar>✅ Aplicar notas sugeridas</button>
        <span data-tir-estado style="font-size:0.78rem; color:var(--text-muted);">${sinAsignar ? `⚠️ ${sinAsignar} fila(s) sin estudiante asignado: elegilo en la lista (o quedan sin aplicar).` : "Todos los participantes están emparejados con su estudiante."}</span>
      </div>`);
    ligarRefrescar();
    cont.querySelector("[data-tir-partida]").addEventListener("change", e => { sel = Number(e.target.value) || 0; pintar(); });
    cont.querySelectorAll("[data-tir-est]").forEach(s => s.addEventListener("change", () => { filas[Number(s.dataset.tirEst)].estId = s.value; s.style.border = s.value ? "" : "2px solid var(--brick)"; }));
    cont.querySelector("[data-tir-aplicar]").addEventListener("click", async (ev) => {
      const estado = cont.querySelector("[data-tir-estado]");
      const aAplicar = filas.filter(f => f.estId);
      const repetidos = aAplicar.map(f => f.estId).filter((id, i, a) => a.indexOf(id) !== i);
      if (repetidos.length) { estado.textContent = "⚠️ Hay un mismo estudiante asignado a dos filas. Corregilo antes de aplicar."; return; }
      if (!aAplicar.length) { estado.textContent = "Asigná al menos un estudiante."; return; }
      if (!confirm(`¿Aplicar las notas sugeridas a ${aAplicar.length} estudiante(s)? Se reemplazan los puntos de los criterios automáticos.`)) return;
      ev.target.disabled = true;
      let ok = 0, fallos = 0;
      for (const f of aAplicar) {
        estado.textContent = `Guardando ${ok + fallos + 1} de ${aAplicar.length}…`;
        const sug = sugeridos(f);
        const puntos = sug.map((v, i) => {
          if (v != null) return v;
          const inp = panel.querySelector(`[data-rubrica-criterio="${f.estId}"][data-i="${i}"]`);
          return inp && inp.value !== "" ? Number(inp.value) : 0;
        });
        const porcentaje = porcentajeDesdeCriterios(criterios, puntos);
        const puntaje = puntajeDesdePorcentaje(porcentaje);
        let r = await guardarNotaManualActividad(trabajo, f.estId, puntaje, { respuestas: puntos, porcentaje });
        if (r && r.error) { await new Promise(res => setTimeout(res, 1500)); r = await guardarNotaManualActividad(trabajo, f.estId, puntaje, { respuestas: puntos, porcentaje }); }
        if (r && r.error) fallos++; else ok++;
      }
      ev.target.disabled = false;
      alert(`✓ Notas aplicadas a ${ok} estudiante(s)${fallos ? `; ${fallos} no se pudieron guardar (probá de nuevo)` : ""}.`);
      alAplicar();
    });
  };
  pintar();
}

// Panel del profesor para un "Proyecto": todas las entregas (puede haber
// varias por estudiante, porque se permite volver a entregar), agrupadas
// por estudiante y ordenadas de la más reciente a la más vieja.
async function pintarPanelEntregasProyecto(panel, trabajoId) {
  const { data: entregas } = await sb.from("proyecto_entregas").select("*").eq("trabajo_id", trabajoId).order("creado_en", { ascending: false });
  const { data: trabajo } = await sb.from("trabajos_cotidianos").select("id, indicador_id, contenido_actividad").eq("id", trabajoId).maybeSingle();
  const cantidadEsperada = Number(trabajo?.contenido_actividad?.cantidad_esperada) || 0;

  if (!entregas || entregas.length === 0) {
    panel.innerHTML = `
      <p class="empty" style="font-size:0.82rem;">Todavía nadie ha entregado.</p>
      ${trabajo ? botonConfigurarCantidadHTML(trabajoId, cantidadEsperada, trabajo) : ""}`;
    if (trabajo) ligarBotonConfigurarCantidad(panel, trabajoId, trabajo, () => pintarPanelEntregasProyecto(panel, trabajoId));
    return;
  }

  const estudianteIds = [...new Set(entregas.map(e => e.estudiante_id))];
  const { data: estudiantes } = await sb.from("estudiantes").select("id, nombre, apellido1, apellido2").in("id", estudianteIds);
  const nombrePorId = {};
  (estudiantes || []).forEach(e => { nombrePorId[e.id] = [e.apellido1, e.apellido2, e.nombre].filter(Boolean).join(" "); });

  const porEstudiante = {};
  entregas.forEach(e => { (porEstudiante[e.estudiante_id] = porEstudiante[e.estudiante_id] || []).push(e); });
  const estudiantesOrdenados = Object.keys(porEstudiante).sort((a, b) => (nombrePorId[a] || a).localeCompare(nombrePorId[b] || b));

  // El promedio de cada estudiante se saca sobre la cantidad esperada de
  // entregas (si está configurada) — lo que falte cuenta como 0. Si no hay
  // cantidad configurada, se promedia solo sobre lo que sí entregó.
  function promedioDe(propias) {
    const notas = propias.map(e => Number(e.nota_ia)).filter(n => Number.isFinite(n));
    if (!notas.length) return null;
    const denominador = cantidadEsperada > 0 ? cantidadEsperada : propias.length;
    const suma = notas.reduce((a, n) => a + n, 0);
    return suma / denominador;
  }

  panel.innerHTML = `
    <div style="margin-top:0.5rem; background:var(--surface-soft); border-radius:8px; padding:0.7rem;">
      <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.4rem;">${estudiantesOrdenados.length} estudiante${estudiantesOrdenados.length === 1 ? "" : "s"} entregaron. Si alguien entregó más de una vez, se ve la más reciente primero.</p>
      ${botonConfigurarCantidadHTML(trabajoId, cantidadEsperada, trabajo)}
      ${cantidadEsperada > 0 ? `<button class="btn small" data-calificar-proyecto-ia="${trabajoId}" style="margin-top:0.5rem;">🤖 Calificar con IA y aplicar notas</button>
      <span data-calificar-ia-estado="${trabajoId}" style="font-size:0.78rem; color:var(--text-muted); margin-left:0.5rem;"></span>` : `<p style="font-size:0.78rem; color:var(--brick); margin-top:0.5rem;">Configurá primero la cantidad esperada de entregas para poder calificar con IA.</p>`}
      ${estudiantesOrdenados.map(estId => {
        const propias = porEstudiante[estId];
        const promedio = promedioDe(propias);
        return `
        <details style="margin-top:0.6rem; margin-bottom:0.5rem; background:var(--surface); border-radius:8px; padding:0.6rem 0.8rem; border:1px solid var(--paper-line);">
          <summary style="cursor:pointer; font-size:0.85rem; display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">
            <span>${nombrePorId[estId] || estId}</span>
            <span style="font-size:0.78rem; color:var(--text-muted);">${propias.length}${cantidadEsperada ? "/" + cantidadEsperada : ""} entrega${propias.length === 1 ? "" : "s"}${promedio != null ? ` · promedio IA: ${promedio.toFixed(1)}/100 → ${(promedio / 100 * 3).toFixed(1)}/3` : ""}</span>
          </summary>
          <div style="margin-top:0.5rem; display:grid; gap:0.4rem;">
            ${propias.map(e => {
              const { data: pub } = sb.storage.from("materiales").getPublicUrl(e.archivo_ruta);
              return `<div style="font-size:0.85rem; padding:0.4rem 0.5rem; border-left:3px solid ${e.nota_ia != null ? (e.nota_ia >= 70 ? "#1d7a43" : (e.nota_ia >= 40 ? "#a5690a" : "#c0392b")) : "var(--paper-line)"};">
                <strong>${e.titulo}</strong> <span style="color:var(--text-muted);">· ${formatearFechaHora(e.creado_en)}</span>
                ${e.descripcion ? `<div style="margin-top:0.2rem;">${e.descripcion}</div>` : ""}
                ${enlacesArchivosProyecto(e)}
                ${e.nota_ia != null ? `<div style="margin-top:0.3rem; font-size:0.8rem;"><strong>Nota IA: ${e.nota_ia}/100</strong>${e.justificacion_ia ? ` — ${e.justificacion_ia}` : ""}</div>` : `<div style="margin-top:0.3rem; font-size:0.78rem; color:var(--text-muted);">Sin calificar con IA todavía.</div>`}
              </div>`;
            }).join("")}
          </div>
        </details>`;
      }).join("")}
      ${cantidadEsperada > 0 && estudiantesOrdenados.some(id => !porEstudiante[id].length) ? "" : ""}
    </div>`;

  if (trabajo) ligarBotonConfigurarCantidad(panel, trabajoId, trabajo, () => pintarPanelEntregasProyecto(panel, trabajoId));

  const botonIA = panel.querySelector(`[data-calificar-proyecto-ia="${trabajoId}"]`);
  if (botonIA) {
    botonIA.addEventListener("click", async () => {
      await calificarEntregasProyectoConIA(panel, trabajoId, trabajo, entregas, estudiantesOrdenados, porEstudiante, cantidadEsperada);
      pintarPanelEntregasProyecto(panel, trabajoId);
    });
  }
}

// Botón pequeño para fijar (o cambiar) la cantidad esperada de entregas de
// este trabajo — es lo que define sobre qué número se promedia cada
// estudiante (lo que le falte a alguien cuenta como 0 en el promedio).
function botonConfigurarCantidadHTML(trabajoId, cantidadActual, trabajo) {
  const l = estadoLimiteProyecto(trabajo && trabajo.contenido_actividad);
  return `<button class="btn secondary small" data-configurar-cantidad="${trabajoId}">⚙️ ${cantidadActual > 0 ? `Cantidad esperada: ${cantidadActual}` : "Configurar cantidad esperada"}</button>
  <button class="btn secondary small" data-configurar-limite="${trabajoId}">⏰ ${l.hay ? `Fecha límite: ${l.texto}${l.vencido ? " (vencida)" : ""}` : "Poner fecha límite"}</button>`;
}
function ligarBotonConfigurarCantidad(panel, trabajoId, trabajo, alGuardar) {
  const btnLimite = panel.querySelector(`[data-configurar-limite="${trabajoId}"]`);
  if (btnLimite) btnLimite.addEventListener("click", async () => {
    const actual = trabajo?.contenido_actividad?.fecha_limite;
    let prefill = "";
    if (actual) {
      const d = new Date(actual);
      const dos = n => String(n).padStart(2, "0");
      prefill = `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())} ${dos(d.getHours())}:${dos(d.getMinutes())}`;
    }
    const resp = prompt("Fecha y hora límite de entrega, en formato AAAA-MM-DD HH:MM (24 horas). Ej: 2026-10-22 16:30\nDejalo vacío para quitar la fecha límite.", prefill);
    if (resp === null) return;
    const nuevoContenido = { ...(trabajo.contenido_actividad || {}) };
    if (!resp.trim()) {
      delete nuevoContenido.fecha_limite;
    } else {
      const m = resp.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})$/);
      const d = m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : null;
      if (!d || isNaN(d.getTime())) { alert("Formato inválido. Usá AAAA-MM-DD HH:MM, por ejemplo 2026-10-22 16:30."); return; }
      nuevoContenido.fecha_limite = d.toISOString();
    }
    await sb.from("trabajos_cotidianos").update({ contenido_actividad: nuevoContenido }).eq("id", trabajoId);
    trabajo.contenido_actividad = nuevoContenido;
    alGuardar();
  });
  const btn = panel.querySelector(`[data-configurar-cantidad="${trabajoId}"]`);
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const actual = Number(trabajo?.contenido_actividad?.cantidad_esperada) || "";
    const respuesta = prompt("¿Cuántas entregas se esperan por estudiante (ej. cantidad de leyes)?", actual || "");
    if (respuesta === null) return;
    const cantidad = Number(respuesta);
    if (!Number.isFinite(cantidad) || cantidad <= 0) { alert("Poné un número mayor que 0."); return; }
    const nuevoContenido = { ...(trabajo.contenido_actividad || {}), cantidad_esperada: cantidad };
    await sb.from("trabajos_cotidianos").update({ contenido_actividad: nuevoContenido }).eq("id", trabajoId);
    alGuardar();
  });
}

// Manda a calificar con IA cada entrega que todavía no tenga nota_ia, y al
// terminar aplica la nota final (promedio sobre la cantidad esperada, 0 a
// las que falten) como la calificación del indicador para cada estudiante.
async function calificarEntregasProyectoConIA(panel, trabajoId, trabajo, entregas, estudiantesOrdenados, porEstudiante, cantidadEsperada) {
  const estado = panel.querySelector(`[data-calificar-ia-estado="${trabajoId}"]`);
  const boton = panel.querySelector(`[data-calificar-proyecto-ia="${trabajoId}"]`);
  if (boton) boton.disabled = true;

  const indicadorId = trabajo?.indicador_id;
  const { data: indicador } = indicadorId ? await sb.from("indicadores").select("*").eq("id", indicadorId).maybeSingle() : { data: null };
  const { data: criteriosRows } = indicadorId ? await sb.from("criterios_indicador").select("*").eq("indicador_id", indicadorId).order("puntaje") : { data: [] };
  const criteriosTexto = (criteriosRows || []).map(c => `${c.puntaje} punto${c.puntaje === 1 ? "" : "s"}${c.nivel ? ` (${c.nivel})` : ""}: ${c.descripcion}`).join("\n");
  const cp = trabajo?.contenido_actividad || {};
  const campoTitulo = cp.placeholder_titulo || "Título";
  const campoDescripcion = cp.placeholder_descripcion || "Descripción";

  const pendientes = entregas.filter(e => e.nota_ia == null);
  let i = 0;
  for (const entrega of pendientes) {
    i++;
    if (estado) estado.textContent = `Calificando ${i}/${pendientes.length}…`;
    try {
      const { data: pub } = sb.storage.from("materiales").getPublicUrl(entrega.archivo_ruta);
      const respuestaArchivo = await fetch(pub.publicUrl);
      if (!respuestaArchivo.ok) throw new Error("No se pudo descargar el archivo de esta entrega.");
      const blob = await respuestaArchivo.blob();
      const datosBase64 = await new Promise((resolve, reject) => {
        const lector = new FileReader();
        lector.onload = () => resolve(String(lector.result).split(",")[1] || "");
        lector.onerror = () => reject(new Error("No se pudo leer el archivo."));
        lector.readAsDataURL(blob);
      });
      const mimeType = blob.type || "application/octet-stream";
      const r = await fetch("/api/calificar-entrega-ia", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          instrucciones: cp.instrucciones || "",
          criterios: criteriosTexto,
          campoTitulo, campoDescripcion,
          titulo: entrega.titulo, descripcion: entrega.descripcion,
          archivo: { mimeType, datosBase64, nombre: entrega.archivo_nombre }
        })
      });
      const { datos, error } = await leerRespuestaIA(r);
      if (!datos || !r.ok) throw new Error(error || (datos && datos.error) || "error desconocido");
      await sb.from("proyecto_entregas").update({ nota_ia: datos.contenido.nota, justificacion_ia: datos.contenido.justificacion }).eq("id", entrega.id);
      entrega.nota_ia = datos.contenido.nota;
    } catch (err) {
      if (estado) estado.textContent = `No se pudo calificar una entrega: ${err.message || err}`;
    }
  }

  if (estado) estado.textContent = "Aplicando notas finales…";
  const puntajeMaximo = indicador ? indicador.puntaje_maximo : 3;
  for (const estId of estudiantesOrdenados) {
    const propias = porEstudiante[estId];
    const notas = propias.map(e => Number(e.nota_ia)).filter(n => Number.isFinite(n));
    if (!notas.length) continue;
    const denominador = cantidadEsperada > 0 ? cantidadEsperada : propias.length;
    const promedio100 = notas.reduce((a, n) => a + n, 0) / denominador;
    const notaFinal = Math.round((promedio100 / 100) * puntajeMaximo);
    if (indicadorId) {
      await sb.from("calificaciones_indicador").upsert(
        { indicador_id: indicadorId, estudiante_id: estId, puntaje_obtenido: Math.max(0, Math.min(puntajeMaximo, notaFinal)) },
        { onConflict: "indicador_id,estudiante_id" }
      );
    }
  }
  if (estado) estado.textContent = "✓ Notas aplicadas en Rúbrica y Evaluaciones.";
  if (boton) boton.disabled = false;
}

// Diagnóstico agregado: de todos los que ya completaron la prueba,
// cuántos acertaron y cuántos fallaron CADA pregunta, para detectar de
// un vistazo las preguntas más difíciles (o mal planteadas) y qué tan
// consistente salió la calificación automática.
async function construirDiagnosticoPorPregunta(trabajo) {
  const contenido = trabajo.contenido_actividad;
  if (!contenido) return `<p class="empty" style="font-size:0.82rem;">Esta prueba no tiene contenido guardado.</p>`;

  const items = (trabajo.tipo_actividad === "seleccion_unica" || trabajo.tipo_actividad === "prueba")
    ? (contenido.preguntas || []).map(p => ({ texto: p.pregunta, correcta: Number(p.correcta) }))
    : (contenido.afirmaciones || []).map(a => ({ texto: a.texto, correcta: a.correcta ? 1 : 0 }));
  if (items.length === 0) return `<p class="empty" style="font-size:0.82rem;">Esta prueba no tiene preguntas guardadas.</p>`;

  const { data: entregas } = await sb.from("actividades_estudiante").select("respuestas, porcentaje, puntaje").eq("trabajo_id", trabajo.id).eq("completado", true);
  if (!entregas || entregas.length === 0) {
    return `<p class="empty" style="font-size:0.82rem;">Todavía nadie ha completado esta prueba.</p>`;
  }

  const esCorrecta = (item, valor) => {
    if (trabajo.tipo_actividad === "falso_verdadero") return (valor === true ? 1 : (valor === false ? 0 : -1)) === item.correcta;
    return Number(valor) === item.correcta;
  };

  const filasPreguntas = items.map((item, i) => {
    const respuestas = entregas.map(e => (Array.isArray(e.respuestas) ? e.respuestas[i] : undefined));
    const correctas = respuestas.filter(v => esCorrecta(item, v)).length;
    const total = entregas.length;
    const pct = total ? Math.round((correctas / total) * 100) : 0;
    const color = pct >= 70 ? "#1d7a43" : (pct >= 40 ? "#a5690a" : "#c0392b");
    return { pct, html: `
      <div style="padding:0.5rem 0.6rem; border-left:4px solid ${color}; background:var(--surface-soft); border-radius:4px; margin-bottom:0.4rem;">
        <div style="font-weight:600; font-size:0.85rem;">${i + 1}. ${item.texto}</div>
        <div style="font-size:0.8rem; color:${color};">${correctas}/${total} acertaron (${pct}%)</div>
      </div>` };
  }).sort((a, b) => a.pct - b.pct);

  const promedioPct = Math.round(entregas.reduce((acc, e) => acc + (Number(e.porcentaje) || 0), 0) / entregas.length);

  return `<div style="margin-top:0.5rem;">
    <p style="font-size:0.85rem; margin-bottom:0.6rem;"><strong>${entregas.length}</strong> estudiante${entregas.length === 1 ? "" : "s"} completaron la prueba · promedio general: <strong>${promedioPct}%</strong></p>
    <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.5rem;">Ordenado de la pregunta más difícil (menos acierto) a la más fácil:</p>
    ${filasPreguntas.map(f => f.html).join("")}
  </div>`;
}

// Califica la prueba sumando puntos reales (no la escala 0-3): Parte 1
// (selección única, automática, 1 punto por pregunta) + Parte 2
// (apareamiento, automática, 1 punto por par) + Parte 3 (caso práctico,
// a mano). La nota final es simplemente puntos obtenidos / total de
// puntos de la prueba, sin convertir a ninguna otra escala — y ese
// mismo total queda guardado como el "máximo" del indicador, para que
// el % calzado sea exacto.
async function pintarPanelPuntosPorParte(panel, trabajo, indicadorId, totalPuntos, pesoPrueba) {
  const contenido = trabajo.contenido_actividad;
  if (!contenido) { panel.innerHTML = `<p class="empty" style="font-size:0.82rem;">Esta prueba no tiene contenido guardado.</p>`; return; }

  const preguntas = Array.isArray(contenido.preguntas) ? contenido.preguntas : [];
  const apareamiento = contenido.apareamiento;
  const pares = (apareamiento && Array.isArray(apareamiento.pares)) ? apareamiento.pares : [];
  const parte1Max = preguntas.length;
  const parte2Max = pares.length;
  const total = totalPuntos || 47;
  const peso = pesoPrueba || 20;
  const parte3Max = Math.max(total - parte1Max - parte2Max, 0);

  const { data: entregas } = await sb.from("actividades_estudiante").select("*").eq("trabajo_id", trabajo.id).eq("completado", true);
  if (!entregas || entregas.length === 0) {
    panel.innerHTML = `<p class="empty" style="font-size:0.82rem;">Todavía nadie ha completado esta prueba.</p>`;
    return;
  }
  const estudianteIds = entregas.map(e => e.estudiante_id);
  const { data: estudiantes } = await sb.from("estudiantes").select("id, nombre, apellido1, apellido2").in("id", estudianteIds);
  const nombrePorId = {};
  (estudiantes || []).forEach(e => { nombrePorId[e.id] = [e.apellido1, e.apellido2, e.nombre].filter(Boolean).join(" "); });

  const calcularParte1 = (e) => preguntas.filter((p, i) => Number(e.respuestas?.[i]) === Number(p.correcta)).length;
  const calcularParte2 = (e) => pares.filter((p, i) => Number(e.datos_prueba?.apareamiento_respuestas?.[i]) === i).length;

  // Arma el mailto: con el resultado, dirigido al correo del estudiante y
  // al del encargado que escribieron ellos mismos antes de entrar a la
  // prueba (en el formulario de "Antes de empezar"). Si no dejaron ningún
  // correo, no hay a quién mandarlo.
  const armarMailtoResultado = (e, nombreMostrado, p1, p2, p3, sumaActual, pct, aporte) => {
    const dp = e.datos_prueba || {};
    const destinatarios = [dp.correo_mep, dp.correo_padre].filter(Boolean);
    if (destinatarios.length === 0) return null;
    const asunto = `Resultado de la prueba: ${trabajo.titulo || ""}`;
    const nombreParaSaludo = dp.nombre_completo || nombreMostrado;
    const lineas = [
      `Estimado/a ${nombreParaSaludo}${dp.cedula ? " (cédula " + dp.cedula + ")" : ""}:`,
      "",
      `Le compartimos el resultado de la prueba "${trabajo.titulo || ""}":`,
      "",
      `Parte 1 (selección única): ${p1}/${parte1Max}`,
      parte2Max ? `Parte 2 (apareamiento): ${p2}/${parte2Max}` : null,
      `Parte 3 (caso práctico): ${p3}/${parte3Max}`,
      "",
      `Total: ${sumaActual}/${total} (${pct}%)`,
      `Aporte a la nota final: ${aporte}% de ${peso}%`,
      "",
      `${INSTITUCION.nombre} — Especialidad: ${INSTITUCION.especialidad}`,
      `Docente: ${INSTITUCION.docente || ""}`
    ].filter(l => l !== null).join("\n");
    const [to, ...resto] = destinatarios;
    const cc = resto.length ? `&cc=${encodeURIComponent(resto.join(","))}` : "";
    return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(asunto)}${cc}&body=${encodeURIComponent(lineas)}`;
  };

  const filas = entregas
    .sort((a, b) => (nombrePorId[a.estudiante_id] || "").localeCompare(nombrePorId[b.estudiante_id] || ""))
    .map(e => {
      const p1 = calcularParte1(e);
      const p2 = calcularParte2(e);
      const p3Guardado = e.datos_prueba?.puntos_parte3;
      const p3 = Number.isFinite(p3Guardado) ? p3Guardado : 0;
      const sumaActual = p1 + p2 + p3;
      const pct = total ? Math.round((sumaActual / total) * 100) : 0;
      const aporte = total ? Math.round((sumaActual / total) * peso * 10) / 10 : 0;
      const nombreMostrado = nombrePorId[e.estudiante_id] || e.estudiante_id;
      const href = armarMailtoResultado(e, nombreMostrado, p1, p2, p3, sumaActual, pct, aporte);
      return `
      <div class="roster-row" style="flex-wrap:wrap; gap:0.5rem; align-items:center;" data-fila-puntos="${e.estudiante_id}">
        <span class="name" style="flex-basis:12rem;">${nombreMostrado}</span>
        <span style="font-size:0.82rem;">Parte 1: <strong>${p1}</strong>/${parte1Max}</span>
        ${parte2Max ? `<span style="font-size:0.82rem;">Parte 2: <strong>${p2}</strong>/${parte2Max}</span>` : ""}
        <label style="font-size:0.82rem; display:flex; align-items:center; gap:0.3rem;">Parte 3 (manual):
          <input type="number" min="0" max="${parte3Max}" step="1" value="${Number.isFinite(p3Guardado) ? p3Guardado : ""}" data-parte3-input="${e.estudiante_id}" style="width:4.5rem;" />/${parte3Max}
        </label>
        <span style="font-size:0.85rem;">Total: <strong data-total-texto="${e.estudiante_id}">${sumaActual}</strong>/${total} (<span data-pct-texto="${e.estudiante_id}">${pct}</span>%)</span>
        <span style="font-size:0.85rem; color:var(--brick); font-weight:600;">Aporte a la nota final: <span data-aporte-texto="${e.estudiante_id}">${aporte}</span>% de ${peso}%</span>
        <button class="btn small" data-guardar-puntos="${e.estudiante_id}">Guardar</button>
        ${href
          ? `<a class="btn secondary small" data-mailto-resultado="${e.estudiante_id}" href="${href}" target="_blank">✉ Enviar resultado</a>`
          : `<span data-mailto-resultado="${e.estudiante_id}" style="font-size:0.75rem; color:var(--text-muted);">Sin correo guardado</span>`}
      </div>`;
    }).join("");

  panel.innerHTML = `
    <div style="margin-top:0.6rem; background:var(--surface-soft); border-radius:8px; padding:0.8rem;">
      <div class="row" style="align-items:center; margin-bottom:0.6rem; flex-wrap:wrap; gap:0.5rem;">
        <label style="font-size:0.82rem; display:flex; align-items:center; gap:0.4rem;">Total de puntos de la prueba:
          <input type="number" min="1" value="${total}" data-total-puntos-input style="width:5rem;" />
        </label>
        <label style="font-size:0.82rem; display:flex; align-items:center; gap:0.4rem;">Valor de esta prueba en la nota final:
          <input type="number" min="0" max="100" step="0.1" value="${peso}" data-peso-prueba-input style="width:4.5rem;" />%
        </label>
        <button class="btn secondary small" data-aplicar-total-puntos type="button">Aplicar</button>
        <button class="btn small" data-guardar-todos-puntos type="button">Guardar todas</button>
      </div>
      <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.6rem;">Parte 1 y Parte 2 se calculan solas con lo que contestó cada quien. Parte 3 (caso práctico) la ponés vos a mano, según lo que entregó en papel. La nota final es los puntos sumados sobre ${total}, sin convertir a ninguna otra escala — y el "Aporte a la nota final" es ese % aplicado sobre el ${peso}% que vale esta prueba.</p>
      <div class="roster">${filas}</div>
    </div>`;

  panel.querySelector("[data-aplicar-total-puntos]").addEventListener("click", () => {
    const inputTotal = panel.querySelector("[data-total-puntos-input]");
    const inputPeso = panel.querySelector("[data-peso-prueba-input]");
    const nuevoTotal = Number(inputTotal.value) || 47;
    const nuevoPeso = Number(inputPeso.value) || 0;
    pintarPanelPuntosPorParte(panel, trabajo, indicadorId, nuevoTotal, nuevoPeso);
  });

  const guardarUno = async (estudianteId) => {
    const input = panel.querySelector(`[data-parte3-input="${estudianteId}"]`);
    const valorCrudo = input.value === "" ? 0 : Number(input.value);
    const p3 = Math.max(0, Math.min(parte3Max, isNaN(valorCrudo) ? 0 : valorCrudo));
    const entrega = entregas.find(e => String(e.estudiante_id) === String(estudianteId));
    if (!entrega) return;
    const p1 = calcularParte1(entrega);
    const p2 = calcularParte2(entrega);
    const sumaFinal = p1 + p2 + p3;
    const nuevosDatos = { ...(entrega.datos_prueba || {}), puntos_parte3: p3 };
    await sb.from("actividades_estudiante").update({ datos_prueba: nuevosDatos }).eq("trabajo_id", trabajo.id).eq("estudiante_id", estudianteId);
    await sb.from("indicadores").update({ puntaje_maximo: total, peso_prueba: peso }).eq("id", indicadorId);
    await upsertSinConflicto("calificaciones_indicador", { estudiante_id: estudianteId, indicador_id: indicadorId }, { puntaje_obtenido: sumaFinal });
    entrega.datos_prueba = nuevosDatos;
    const pctFinal = total ? Math.round((sumaFinal / total) * 100) : 0;
    const aporteFinal = total ? Math.round((sumaFinal / total) * peso * 10) / 10 : 0;
    const totalTexto = panel.querySelector(`[data-total-texto="${estudianteId}"]`);
    const pctTexto = panel.querySelector(`[data-pct-texto="${estudianteId}"]`);
    const aporteTexto = panel.querySelector(`[data-aporte-texto="${estudianteId}"]`);
    if (totalTexto) totalTexto.textContent = sumaFinal;
    if (pctTexto) pctTexto.textContent = pctFinal;
    if (aporteTexto) aporteTexto.textContent = aporteFinal;
    const linkMailto = panel.querySelector(`[data-mailto-resultado="${estudianteId}"]`);
    if (linkMailto && linkMailto.tagName === "A") {
      const nombreMostrado = nombrePorId[estudianteId] || estudianteId;
      const nuevoHref = armarMailtoResultado(entrega, nombreMostrado, p1, p2, p3, sumaFinal, pctFinal, aporteFinal);
      if (nuevoHref) linkMailto.setAttribute("href", nuevoHref);
    }
  };

  panel.querySelectorAll("[data-guardar-puntos]").forEach(btn => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      btn.textContent = "Guardando…";
      await guardarUno(btn.dataset.guardarPuntos);
      btn.disabled = false;
      btn.textContent = "Guardar";
    });
  });

  const btnGuardarTodos = panel.querySelector("[data-guardar-todos-puntos]");
  if (btnGuardarTodos) btnGuardarTodos.addEventListener("click", async () => {
    btnGuardarTodos.disabled = true;
    btnGuardarTodos.textContent = "Guardando…";
    for (const e of entregas) await guardarUno(e.estudiante_id);
    btnGuardarTodos.disabled = false;
    btnGuardarTodos.textContent = "Guardar todas";
  });
}

function leerContenidoActividadDesdeFormulario(tipo, el) {
  if (tipo === "seleccion_unica") {
    const bloques = Array.from(el.querySelectorAll(".au-prueba-bloque"));
    if (bloques.length === 0) return { valido: false, error: "Agregá al menos una pregunta." };
    const preguntas = [];
    for (let idx = 0; idx < bloques.length; idx++) {
      const bloque = bloques[idx];
      const i = bloque.dataset.bloque;
      const pregunta = (bloque.querySelector(`.au-pregunta[data-i="${i}"]`)?.value || "").trim();
      const opciones = [0, 1, 2, 3].map(j => (bloque.querySelector(`.au-opcion[data-i="${i}"][data-j="${j}"]`)?.value || "").trim());
      if (!pregunta || opciones.some(o => !o)) return { valido: false, error: `Completá la pregunta ${idx + 1} y sus 4 opciones.` };
      const marcada = bloque.querySelector(`input[name="au-correcta-${i}"]:checked`);
      preguntas.push({ pregunta, opciones, correcta: marcada ? Number(marcada.value) : 0 });
    }
    return { valido: true, contenido: { preguntas } };
  }
  if (tipo === "prueba") {
    const bloques = Array.from(el.querySelectorAll(".au-prueba-bloque"));
    if (bloques.length === 0) return { valido: false, error: "Agregá al menos una pregunta." };
    const preguntas = [];
    for (let idx = 0; idx < bloques.length; idx++) {
      const bloque = bloques[idx];
      const i = bloque.dataset.bloque;
      const pregunta = (bloque.querySelector(`.au-pregunta[data-i="${i}"]`)?.value || "").trim();
      const opciones = [0, 1, 2, 3].map(j => (bloque.querySelector(`.au-opcion[data-i="${i}"][data-j="${j}"]`)?.value || "").trim());
      if (!pregunta || opciones.some(o => !o)) return { valido: false, error: `Completá la pregunta ${idx + 1} y sus 4 opciones.` };
      const marcada = bloque.querySelector(`input[name="au-correcta-${i}"]:checked`);
      preguntas.push({ pregunta, opciones, correcta: marcada ? Number(marcada.value) : 0 });
    }
    const instrucciones = (el.querySelector("#au-prueba-instrucciones")?.value || "").trim();

    const paresEl = Array.from(el.querySelectorAll(".au-apareamiento-par"));
    const pares = [];
    for (let idx = 0; idx < paresEl.length; idx++) {
      const bloque = paresEl[idx];
      const i = bloque.dataset.par;
      const situacion = (bloque.querySelector(`.au-apar-situacion[data-i="${i}"]`)?.value || "").trim();
      const respuesta = (bloque.querySelector(`.au-apar-respuesta[data-i="${i}"]`)?.value || "").trim();
      if (!situacion && !respuesta) continue; // par vacío, se ignora
      if (!situacion || !respuesta) return { valido: false, error: `Completá la situación y la respuesta del par de apareamiento ${idx + 1} (o quitalo si no lo vas a usar).` };
      pares.push({ situacion, respuesta });
    }
    const instruccionesApareamiento = (el.querySelector("#au-prueba-apareamiento-instrucciones")?.value || "").trim();
    const apareamiento = pares.length ? { pares, instrucciones: instruccionesApareamiento || undefined } : null;

    const enunciadoCaso = (el.querySelector("#au-prueba-caso-enunciado")?.innerHTML || "").trim();
    const enunciadoCasoTexto = (el.querySelector("#au-prueba-caso-enunciado")?.textContent || "").trim();
    const instruccionCaso = (el.querySelector("#au-prueba-caso-instruccion")?.value || "").trim();
    const casoPractico = (enunciadoCasoTexto || instruccionCaso) ? { enunciado: enunciadoCaso, instruccion: instruccionCaso || undefined } : null;

    const puntosTotalesInput = (el.querySelector("#au-prueba-puntos-totales")?.value || "").trim();
    const puntosTotales = puntosTotalesInput ? Number(puntosTotalesInput) : null;

    const contenido = { preguntas };
    if (instrucciones) contenido.instrucciones = instrucciones;
    if (apareamiento) contenido.apareamiento = apareamiento;
    if (casoPractico) contenido.casoPractico = casoPractico;
    if (puntosTotales) contenido.puntosTotales = puntosTotales;
    return { valido: true, contenido };
  }
  if (tipo === "falso_verdadero") {
    const bloques = Array.from(el.querySelectorAll(".au-fv-bloque"));
    if (bloques.length === 0) return { valido: false, error: "Agregá al menos una afirmación." };
    const afirmaciones = [];
    for (let idx = 0; idx < bloques.length; idx++) {
      const bloque = bloques[idx];
      const i = bloque.dataset.bloque;
      const texto = (bloque.querySelector(`.au-afirmacion[data-i="${i}"]`)?.value || "").trim();
      if (!texto) return { valido: false, error: `Completá la afirmación ${idx + 1}.` };
      const marcada = bloque.querySelector(`input[name="au-fv-${i}"]:checked`);
      afirmaciones.push({ texto, correcta: marcada ? marcada.value === "true" : true });
    }
    return { valido: true, contenido: { afirmaciones } };
  }
  if (tipo === "sopa_letras") {
    const palabras = (el.querySelector("#au-palabras-sopa")?.value || "")
      .split("\n").map(p => p.trim()).filter(Boolean);
    if (palabras.length < 4) return { valido: false, error: "Escribí al menos 4 palabras para la sopa de letras." };
    if (palabras.length > 30) return { valido: false, error: "Como máximo 30 palabras para la sopa de letras." };
    return { valido: true, contenido: generarSopaDeLetras(palabras) };
  }
  if (tipo === "crucigrama") {
    const bloques = Array.from(el.querySelectorAll(".au-cruci-bloque"));
    const items = [];
    for (let idx = 0; idx < bloques.length; idx++) {
      const bloque = bloques[idx];
      const i = bloque.dataset.bloque;
      const palabra = (bloque.querySelector(`.au-cruci-palabra[data-i="${i}"]`)?.value || "").trim();
      const pista = (bloque.querySelector(`.au-cruci-pista[data-i="${i}"]`)?.value || "").trim();
      if (palabra && pista) items.push({ palabra, pista });
    }
    if (items.length < 4) return { valido: false, error: "Completá al menos 4 pares de palabra + pista para el crucigrama." };
    return { valido: true, contenido: generarCrucigrama(items) };
  }
  if (tipo === "infografia") {
    const instrucciones = (el.querySelector("#au-infografia-instrucciones")?.value || "").trim();
    return { valido: true, contenido: { instrucciones } };
  }
  if (tipo === "lluvia_ideas") {
    const pregunta = (el.querySelector("#au-lluvia-pregunta")?.value || "").trim();
    return { valido: true, contenido: { pregunta } };
  }
  if (tipo === "proyecto") {
    const instrucciones = (el.querySelector("#au-proyecto-instrucciones")?.value || "").trim();
    const placeholder_titulo = (el.querySelector("#au-proyecto-placeholder-titulo")?.value || "").trim();
    const placeholder_descripcion = (el.querySelector("#au-proyecto-placeholder-descripcion")?.value || "").trim();
    const min_caracteres_descripcion = Number(el.querySelector("#au-proyecto-min-caracteres")?.value) || 0;
    return { valido: true, contenido: { instrucciones, placeholder_titulo, placeholder_descripcion, min_caracteres_descripcion } };
  }
  if (tipo === "respuesta_abierta") {
    const instrucciones = (el.querySelector("#au-abierta-instrucciones")?.value || "").trim();
    const min_caracteres = Number(el.querySelector("#au-abierta-min-caracteres")?.value) || 0;
    if (!instrucciones) return { valido: false, error: "Escribí la consigna para el estudiante." };
    return { valido: true, contenido: { instrucciones, min_caracteres } };
  }
  if (tipo === "autoevaluacion") {
    const instrucciones = (el.querySelector("#au-lik-instrucciones")?.value || "").trim();
    const bloques = Array.from(el.querySelectorAll(".au-lik-bloque"));
    if (bloques.length === 0) return { valido: false, error: "Agregá al menos una afirmación." };
    const afirmaciones = [];
    for (let idx = 0; idx < bloques.length; idx++) {
      const bloque = bloques[idx];
      const i = bloque.dataset.bloque;
      const texto = (bloque.querySelector(`.au-lik-texto[data-i="${i}"]`)?.value || "").trim();
      if (!texto) return { valido: false, error: `Completá la afirmación ${idx + 1}.` };
      afirmaciones.push(texto);
    }
    const contenido = { afirmaciones };
    if (instrucciones) contenido.instrucciones = instrucciones;
    return { valido: true, contenido };
  }
  if (tipo === "rubrica_directa") {
    const instrucciones = (el.querySelector("#au-crit-instrucciones")?.value || "").trim();
    const bloques = Array.from(el.querySelectorAll(".au-crit-bloque"));
    if (bloques.length === 0) return { valido: false, error: "Agregá al menos un criterio." };
    const criterios = [];
    for (let idx = 0; idx < bloques.length; idx++) {
      const bloque = bloques[idx];
      const i = bloque.dataset.bloque;
      const nombre = (bloque.querySelector(`.au-crit-nombre[data-i="${i}"]`)?.value || "").trim();
      const puntos_max = Number(bloque.querySelector(`.au-crit-max[data-i="${i}"]`)?.value) || 0;
      if (!nombre || puntos_max <= 0) return { valido: false, error: `Completá el nombre y los puntos máximos del criterio ${idx + 1}.` };
      criterios.push({ nombre, puntos_max });
    }
    const contenido = { criterios };
    if (instrucciones) contenido.instrucciones = instrucciones;
    return { valido: true, contenido };
  }
  return { valido: false, error: "Tipo de actividad no soportado todavía." };
}

// Calcula la siguiente letra disponible (A, B, C… luego AA, AB…) que no
// esté ya usada por otro indicador de la misma categoría. Evita que dos
// indicadores queden con la misma letra cuando uno se borró a mitad de
// camino (el conteo simple "A + cantidad" se desincroniza en ese caso).
function siguienteLetraDisponible(usadas) {
  const set = new Set((usadas || []).filter(Boolean).map(l => String(l).trim().toUpperCase()));
  let i = 0;
  while (true) {
    let letra = "";
    let n = i;
    do {
      letra = String.fromCharCode(65 + (n % 26)) + letra;
      n = Math.floor(n / 26) - 1;
    } while (n >= 0);
    if (!set.has(letra)) return letra;
    i++;
  }
}

// Crea un indicador calificable (categoría "Trabajo cotidiano") en Rúbrica y
// Evaluaciones a partir de un trabajo cotidiano, para poder calificarlo por
// estudiante igual que cualquier otro indicador. Devuelve el id del indicador
// creado, o null si no se pudo (y avisa al profesor por qué).
async function crearIndicadorParaTrabajo(materiaId, titulo, fecha, puntajeMaximo, categoriaNombre) {
  const nombreCategoria = categoriaNombre || "Trabajo cotidiano";
  const { data: categoria } = await sb.from("rubrica_categorias").select("*").eq("nombre", nombreCategoria).maybeSingle();
  if (!categoria) {
    alert(`No se encontró la categoría "${nombreCategoria}" en Rúbrica y Evaluaciones. Cree esa categoría primero si quiere que esto cuente como indicador calificable.`);
    return null;
  }
  const { data: existentes } = await sb.from("indicadores").select("id, letra").eq("materia_id", materiaId).eq("categoria", nombreCategoria);
  const letra = siguienteLetraDisponible((existentes || []).map(e => e.letra));
  const { data: nuevo, error } = await sb.from("indicadores").insert({
    materia_id: materiaId,
    categoria: nombreCategoria,
    letra,
    descripcion: titulo,
    puntaje_maximo: puntajeMaximo,
    fecha_evaluacion: fecha || null,
    orden: (existentes || []).length + 1
  }).select().maybeSingle();
  if (error || !nuevo) {
    alert("No se pudo crear el indicador: " + (error ? error.message : "error desconocido."));
    return null;
  }
  return nuevo.id;
}

async function pintarTrabajosCotidianos(trabajos, soloLectura, publicacionId, materiaId) {
  const holder = document.getElementById("trabajos-lista");
  if (!holder) return;

  if (trabajos.length === 0) {
    holder.innerHTML = `<p class="empty">Todavía no hay trabajos cotidianos en este apartado.</p>`;
    return;
  }

  if (soloLectura) {
    trabajos = trabajos.filter(t => t.habilitado !== false);
    if (trabajos.length === 0) {
      holder.innerHTML = `<p class="empty">Todavía no hay trabajos cotidianos habilitados en este apartado.</p>`;
      return;
    }
    const estudianteId = session.id;
    const trabajoIds = trabajos.map(t => t.id);
    const { data: misEstados } = await sb.from("trabajos_cotidianos_estudiante").select("*").eq("estudiante_id", estudianteId).in("trabajo_id", trabajoIds);
    const porTrabajo = {};
    const estadoPorTrabajo = {};
    (misEstados || []).forEach(e => { porTrabajo[e.trabajo_id] = e.completado; estadoPorTrabajo[e.trabajo_id] = e; });
    const editable = puedeEditarEntregas();
    const calificados = editable ? await trabajosCalificadosIds(trabajos, estudianteId) : new Set();

    // Trabajos de tipo prueba/actividad interactiva (no el trabajo simple de
    // casilla "Completado") — mismo trato que en un subtema, para que
    // "Iniciar actividad"/"Iniciar prueba" aparezca también cuando el
    // trabajo vive directo bajo el tema (sin subtema).
    const trabajosActividad = trabajos.filter(t => t.tipo_actividad && t.tipo_actividad !== "simple");
    const { data: misResultados } = trabajosActividad.length
      ? await sb.from("actividades_estudiante").select("*").eq("estudiante_id", estudianteId).in("trabajo_id", trabajosActividad.map(t => t.id))
      : { data: [] };
    const resultadoPorTrabajo = {};
    (misResultados || []).forEach(r => { resultadoPorTrabajo[r.trabajo_id] = r; });

    holder.innerHTML = trabajos.map(t => {
      const esActividad = t.tipo_actividad && t.tipo_actividad !== "simple";
      if (esActividad && t.tipo_actividad === "infografia") {
        const res = resultadoPorTrabajo[t.id];
        const instrucciones = (t.contenido_actividad && t.contenido_actividad.instrucciones) || "";
        return `
        <div class="roster-row" style="align-items:flex-start; flex-direction:column; gap:0.4rem;">
          <div style="display:flex; justify-content:space-between; width:100%; align-items:center; flex-wrap:wrap; gap:0.4rem;">
            <span class="name">🖼️ ${t.titulo}${t.fecha ? " · " + t.fecha : ""}</span>
            <span class="badge" style="font-weight:400;">${NOMBRES_ACTIVIDAD[t.tipo_actividad] || t.tipo_actividad}</span>
          </div>
          ${instrucciones ? `<div class="roa-cell-texto" style="font-size:0.85rem;">${instrucciones}</div>` : ""}
          ${res && res.archivo_ruta
            ? (() => {
                const { data: pub } = sb.storage.from("materiales").getPublicUrl(res.archivo_ruta);
                return `<span class="badge" style="background:var(--success-bg); color:var(--success-text);">✓ Entregado: ${res.archivo_nombre || "archivo"}${res.puntaje != null ? " — Nota: " + res.puntaje + "/3" : " (pendiente de calificación)"}</span>
               <a class="btn secondary small" href="${pub.publicUrl}" target="_blank" rel="noopener">👁️ Consultar mi entrega</a>`
                 + (puedeEditarEntregas() && res.puntaje == null ? `<label class="btn small" style="cursor:pointer;">✏️ Cambiar mi archivo<input type="file" data-infografia-subir-tema="${t.id}" accept="image/*,.pdf" style="display:none;" /></label>` : "")
                 + (puedeEditarEntregas() && res.puntaje != null ? `<span style="font-size:0.78rem; color:var(--text-muted);">🔒 Ya fue calificada — no se puede cambiar.</span>` : "");
              })()
            : `<label class="btn small" style="cursor:pointer;">📎 Subir archivo (imagen o PDF)<input type="file" data-infografia-subir-tema="${t.id}" accept="image/*,.pdf" style="display:none;" /></label>`}
          <span data-infografia-tema-estado="${t.id}" style="font-size:0.78rem; color:var(--text-muted);"></span>
        </div>`;
      }
      if (esActividad) {
        const res = resultadoPorTrabajo[t.id];
        const completo = res && res.completado;
        const puedeVerRetro = completo && t.retro_visible && TIPOS_CON_RETRO.includes(t.tipo_actividad);
        const aunNoEsHora = t.tipo_actividad === "prueba" && t.fecha_hora_inicio && new Date(t.fecha_hora_inicio) > new Date();
        let accionInicio;
        if (completo) {
          accionInicio = `<span class="badge" style="background:var(--success-bg); color:var(--success-text);">✓ Completado — Nota: ${res.puntaje}/3</span> ${badgeSalidas(res.intentos_salida)}`;
        } else if (aunNoEsHora) {
          accionInicio = `<span class="badge" style="background:var(--warn-bg); color:var(--warn-text);">⏳ Disponible a partir de ${formatearFechaHora(t.fecha_hora_inicio)}</span>`;
        } else {
          accionInicio = `<button class="btn small" data-iniciar-actividad-tema="${t.id}">▶ ${t.tipo_actividad === "prueba" ? "Iniciar prueba" : "Iniciar actividad"}</button>`;
        }
        return `
        <div class="roster-row" style="align-items:flex-start; flex-direction:column; gap:0.4rem;">
          <div style="display:flex; justify-content:space-between; width:100%; align-items:center; flex-wrap:wrap; gap:0.4rem;">
            <span class="name">${t.tipo_actividad === "prueba" ? "📝" : "🧠"} ${t.titulo}${t.fecha ? " · " + t.fecha : ""}</span>
            <span class="badge" style="font-weight:400;">${NOMBRES_ACTIVIDAD[t.tipo_actividad] || t.tipo_actividad}</span>
          </div>
          ${accionInicio}
          ${puedeVerRetro ? `<button class="btn secondary small" data-ver-mi-retro-tema="${t.id}">📝 Ver mis respuestas</button><div data-mi-retro-tema-panel="${t.id}" style="width:100%;"></div>` : (completo && TIPOS_CON_RETRO.includes(t.tipo_actividad) ? `<span style="font-size:0.78rem; color:var(--text-muted);">🔒 Las preguntas y tus respuestas están bloqueadas hasta que tu profesor las desbloquee.</span>` : "")}
        </div>`;
      }
      const miEstado = estadoPorTrabajo[t.id];
      const yaEntregado = porTrabajo[t.id] === true;
      let linkArchivo = "";
      if (miEstado && miEstado.archivo_ruta) {
        const { data: pub } = sb.storage.from("materiales").getPublicUrl(miEstado.archivo_ruta);
        linkArchivo = pub.publicUrl;
      }
      return `
      <div class="roster-row" style="align-items:flex-start; flex-direction:column; gap:0.3rem;">
        <div style="display:flex; justify-content:space-between; width:100%; align-items:center; flex-wrap:wrap; gap:0.4rem;">
          <span class="name">${t.titulo}${t.fecha ? " · " + t.fecha : ""}</span>
          ${yaEntregado
            ? `<span class="badge" style="background:var(--success-bg); color:var(--success-text);">✓ Entregado</span>`
            : `<label style="display:flex; align-items:center; gap:0.4rem; font-size:0.85rem;">
                 <input type="checkbox" data-mi-trabajo="${t.id}" /> Completado
               </label>`}
        </div>
        ${t.descripcion ? `<div class="roa-cell-texto" style="font-size:0.85rem;">${t.descripcion}</div>` : ""}
        ${yaEntregado
          ? ((linkArchivo ? `<a class="btn secondary small" href="${linkArchivo}" target="_blank" rel="noopener">👁️ Consultar mi entrega: ${miEstado.archivo_nombre || "archivo"}</a>` : "")
             + (editable && !calificados.has(t.id) ? `<label class="btn small" style="cursor:pointer;">✏️ ${linkArchivo ? "Cambiar mi archivo" : "Adjuntar archivo"}<input type="file" data-trabajo-subir="${t.id}" style="display:none;" /></label>` : "")
             + (editable && calificados.has(t.id) ? `<span style="font-size:0.78rem; color:var(--text-muted);">🔒 Ya fue calificada — no se puede cambiar.</span>` : ""))
          : `<label class="btn small" style="cursor:pointer;">📎 Adjuntar archivo para que lo califiquen<input type="file" data-trabajo-subir="${t.id}" style="display:none;" /></label>`}
        <span data-trabajo-subir-estado="${t.id}" style="font-size:0.78rem; color:var(--text-muted);"></span>
      </div>`;
    }).map((h, i) => `<div data-fila-trabajo="${trabajos[i].id}" style="display:contents">${h}</div>`).join("");
    await agregarDocumentoDefinitivo(holder, trabajos, estudianteId);

    holder.querySelectorAll("[data-mi-trabajo]").forEach(cb => {
      cb.addEventListener("change", async () => {
        await sb.from("trabajos_cotidianos_estudiante").upsert(
          { trabajo_id: cb.dataset.miTrabajo, estudiante_id: estudianteId, completado: cb.checked, entregado_en: cb.checked ? new Date().toISOString() : null },
          { onConflict: "trabajo_id,estudiante_id" }
        );
        pintarTrabajosCotidianos(trabajos, soloLectura, publicacionId, materiaId);
      });
    });

    holder.querySelectorAll("[data-trabajo-subir]").forEach(input => {
      input.addEventListener("change", async () => {
        const trabajoId = input.dataset.trabajoSubir;
        const archivo = input.files[0];
        if (!archivo) return;
        const estado = holder.querySelector(`[data-trabajo-subir-estado="${trabajoId}"]`);
        if (estado) estado.textContent = "Subiendo…";
        const rutaSegura = `entregas-trabajo/trabajo-${trabajoId}/${estudianteId}-${Date.now()}-${archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: errorSubida } = await sb.storage.from("materiales").upload(rutaSegura, archivo);
        if (errorSubida) {
          if (estado) estado.textContent = "No se pudo subir: " + errorSubida.message;
          return;
        }
        await sb.from("trabajos_cotidianos_estudiante").upsert(
          { trabajo_id: trabajoId, estudiante_id: estudianteId, completado: true, entregado_en: new Date().toISOString(), archivo_ruta: rutaSegura, archivo_nombre: archivo.name },
          { onConflict: "trabajo_id,estudiante_id" }
        );
        pintarTrabajosCotidianos(trabajos, soloLectura, publicacionId, materiaId);
      });
    });

    holder.querySelectorAll("[data-iniciar-actividad-tema]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const trabajo = trabajos.find(t => String(t.id) === String(btn.dataset.iniciarActividadTema));
        if (!trabajo) return;
        // Re-chequea en la base de datos, justo antes de arrancar, que no
        // esté ya completada (evita que quede sin bloquear si la pantalla
        // quedó abierta desde antes o si el guardado anterior tardó).
        const { data: yaHecha } = await sb.from("actividades_estudiante").select("completado").eq("trabajo_id", trabajo.id).eq("estudiante_id", estudianteId).maybeSingle();
        if (yaHecha && yaHecha.completado) {
          alert("Esta actividad ya está completada. No se puede volver a hacer.");
          pintarTrabajosCotidianos(trabajos, soloLectura, publicacionId, materiaId);
          return;
        }
        if (trabajo.tipo_actividad === "prueba" && trabajo.fecha_hora_inicio && new Date(trabajo.fecha_hora_inicio) > new Date()) {
          alert("Esta prueba todavía no está disponible. Podés entrar a partir de " + formatearFechaHora(trabajo.fecha_hora_inicio) + ".");
          pintarTrabajosCotidianos(trabajos, soloLectura, publicacionId, materiaId);
          return;
        }
        // Para "prueba" las reglas y la confirmación salen en la ventana de
        // reglas propia (mostrarReglasPrueba), que aparece primero.
        if (trabajo.tipo_actividad !== "prueba" && !confirm(`Vas a iniciar "${trabajo.titulo}". Se abre en pantalla completa y la nota se calcula automáticamente al terminar. ¿Listo para empezar?`)) return;
        iniciarActividadInteractiva(trabajo, estudianteId, (puntaje) => {
          pintarTrabajosCotidianos(trabajos, soloLectura, publicacionId, materiaId);
        });
      });
    });

    holder.querySelectorAll("[data-infografia-subir-tema]").forEach(input => {
      input.addEventListener("change", async () => {
        const trabajoId = input.dataset.infografiaSubirTema;
        const archivo = input.files[0];
        if (!archivo) return;
        const estado = holder.querySelector(`[data-infografia-tema-estado="${trabajoId}"]`);
        if (estado) estado.textContent = "Subiendo…";
        const rutaSegura = `infografias/trabajo-${trabajoId}/${estudianteId}-${Date.now()}-${archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
        const { error: errorSubida } = await sb.storage.from("materiales").upload(rutaSegura, archivo);
        if (errorSubida) {
          if (estado) estado.textContent = "No se pudo subir: " + errorSubida.message;
          return;
        }
        await upsertSinConflicto(
          "actividades_estudiante",
          { trabajo_id: trabajoId, estudiante_id: estudianteId },
          { completado: true, archivo_ruta: rutaSegura, archivo_nombre: archivo.name, actualizado_en: new Date().toISOString() }
        );
        pintarTrabajosCotidianos(trabajos, soloLectura, publicacionId, materiaId);
      });
    });

    holder.querySelectorAll("[data-ver-mi-retro-tema]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const trabajoId = btn.dataset.verMiRetroTema;
        const panel = holder.querySelector(`[data-mi-retro-tema-panel="${trabajoId}"]`);
        if (!panel) return;
        if (panel.innerHTML) { panel.innerHTML = ""; return; }
        const trabajo = trabajos.find(x => String(x.id) === String(trabajoId));
        if (!trabajo) return;
        panel.innerHTML = `<p style="font-size:0.82rem; color:var(--text-muted);">Cargando…</p>`;
        panel.innerHTML = await construirRetroalimentacionActividad(trabajo, estudianteId);
      });
    });
  } else {
    const trabajoIds = trabajos.map(t => t.id);
    const { data: todosEstados } = await sb.from("trabajos_cotidianos_estudiante").select("trabajo_id, completado").in("trabajo_id", trabajoIds);
    const conteos = {};
    (todosEstados || []).forEach(e => {
      if (!e.completado) return;
      conteos[e.trabajo_id] = (conteos[e.trabajo_id] || 0) + 1;
    });

    holder.innerHTML = trabajos.map(t => `
      <div class="roster-row" style="align-items:flex-start; flex-direction:column; gap:0.3rem; ${t.habilitado === false ? "opacity:0.55;" : ""}">
        <div style="display:flex; justify-content:space-between; width:100%; align-items:center; flex-wrap:wrap; gap:0.4rem;">
          <span class="name">${t.tipo_actividad === "prueba" ? "📝 " : (t.tipo_actividad && t.tipo_actividad !== "simple" ? "🧠 " : "")}${t.titulo}${t.fecha ? " · " + t.fecha : ""}</span>
          <span style="display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap;">
            ${t.tipo_actividad && t.tipo_actividad !== "simple" ? `<span class="badge" style="font-weight:400;">${NOMBRES_ACTIVIDAD[t.tipo_actividad] || t.tipo_actividad}</span>` : ""}
            ${t.tipo_actividad === "prueba" ? `<span class="badge" style="font-weight:400;">${t.fecha_hora_inicio ? "⏰ Inicia: " + formatearFechaHora(t.fecha_hora_inicio) : "⏰ Sin hora programada"}</span>
            <button class="btn secondary small" data-cambiar-hora-prueba-tema="${t.id}">⏰ Cambiar hora</button>` : ""}
            <span class="badge">${conteos[t.id] || 0} completaron</span>
            <button class="btn ${t.habilitado === false ? "" : "secondary"} small" data-toggle-trabajo-habilitado="${t.id}" data-estado-actual="${t.habilitado !== false}">
              ${t.habilitado === false ? "Habilitar" : "Habilitado"}
            </button>
            ${TIPOS_CON_RETRO.includes(t.tipo_actividad) ? `<button class="btn secondary small" data-ver-retro-tema="${t.id}">📝 Ver retroalimentación</button>` : ""}
            ${TIPOS_CON_RETRO.includes(t.tipo_actividad) ? `<button class="btn ${t.retro_visible ? "" : "secondary"} small" data-toggle-retro-visible-tema="${t.id}" data-estado-actual="${t.retro_visible === true}">${t.retro_visible ? "🔒 Bloquear respuestas a estudiantes" : "🔓 Desbloquear respuestas a estudiantes"}</button>` : ""}
            ${(!t.tipo_actividad || t.tipo_actividad === "simple") ? `<button class="btn secondary small" data-editar-trabajo="${t.id}">✏️ Editar</button>` : ""}
            <button class="btn secondary small" data-ver-entregas-trabajo-tema="${t.id}">📎 Ver archivos entregados</button>
            ${t.indicador_id
              ? `<span class="badge" style="font-weight:400;">📊 Indicador calificable</span>`
              : `<button class="btn secondary small" data-convertir-indicador="${t.id}">Contar como indicador</button>`}
            <button class="btn danger small" data-del-trabajo="${t.id}">Eliminar</button>
          </span>
        </div>
        <div data-trabajo-lectura="${t.id}" style="width:100%;">
          ${t.descripcion ? `<div class="roa-cell-texto" style="font-size:0.85rem;">${t.descripcion}</div>` : `<p class="empty" style="font-size:0.8rem; color:var(--brick);">⚠️ Sin instrucciones todavía — dale "✏️ Editar" para agregarlas.</p>`}
        </div>
        <form class="inline-form" data-trabajo-editar-form="${t.id}" style="display:none; width:100%;">
          <input name="titulo" value="${String(t.titulo || "").replace(/"/g, "&quot;")}" required style="flex:1; min-width:10rem;" />
          <div class="roa-editable" contenteditable="true" data-trabajo-editar-desc="${t.id}" style="flex-basis:100%; min-height:4rem;">${t.descripcion || ""}</div>
          <button class="btn small" type="submit">Guardar</button>
          <button class="btn secondary small" type="button" data-cancelar-editar-trabajo="${t.id}">Cancelar</button>
        </form>
        <div data-entregas-trabajo-tema-panel="${t.id}" style="width:100%;"></div>
        ${TIPOS_CON_RETRO.includes(t.tipo_actividad) ? `<div data-retro-panel-tema="${t.id}"></div>` : ""}
        ${t.tipo_actividad === "prueba" ? `<div data-hora-prueba-panel-tema="${t.id}" style="width:100%;"></div>` : ""}
      </div>`).map((h, i) => `<div data-fila-trabajo="${trabajos[i].id}" style="display:contents">${h}</div>`).join("");
    agregarPanelDocumentosDocente(holder, trabajos);

    holder.querySelectorAll("[data-ver-retro-tema]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const trabajoId = btn.dataset.verRetroTema;
        const panel = holder.querySelector(`[data-retro-panel-tema="${trabajoId}"]`);
        if (!panel) return;
        if (panel.innerHTML) { panel.innerHTML = ""; return; }
        const trabajo = trabajos.find(x => String(x.id) === String(trabajoId));
        if (!trabajo) return;
        panel.innerHTML = `<p style="font-size:0.82rem; color:var(--text-muted);">Cargando…</p>`;
        panel.innerHTML = await construirRetroalimentacionActividad(trabajo);
      });
    });

    holder.querySelectorAll("[data-toggle-retro-visible-tema]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const trabajoId = btn.dataset.toggleRetroVisibleTema;
        const actual = btn.dataset.estadoActual === "true";
        await sb.from("trabajos_cotidianos").update({ retro_visible: !actual }).eq("id", trabajoId);
        renderApartado(publicacionId, soloLectura);
      });
    });

    holder.querySelectorAll("[data-cambiar-hora-prueba-tema]").forEach(btn => {
      btn.addEventListener("click", () => {
        const trabajoId = btn.dataset.cambiarHoraPruebaTema;
        const panel = holder.querySelector(`[data-hora-prueba-panel-tema="${trabajoId}"]`);
        if (!panel) return;
        if (panel.innerHTML.trim()) { panel.innerHTML = ""; return; }
        const trabajo = trabajos.find(x => String(x.id) === String(trabajoId));
        if (!trabajo) return;
        const valorActual = trabajo.fecha_hora_inicio
          ? new Date(new Date(trabajo.fecha_hora_inicio).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
          : "";
        panel.innerHTML = `
          <div class="row" style="align-items:center; margin-top:0.3rem;">
            <input type="datetime-local" data-hora-prueba-tema-input="${trabajoId}" value="${valorActual}" style="padding:0.4rem;" />
            <button class="btn small" data-guardar-hora-prueba-tema="${trabajoId}">Guardar hora</button>
            <button class="btn secondary small" data-quitar-hora-prueba-tema="${trabajoId}">Quitar hora (disponible de inmediato)</button>
          </div>`;
        panel.querySelector(`[data-guardar-hora-prueba-tema="${trabajoId}"]`).addEventListener("click", async () => {
          const input = panel.querySelector(`[data-hora-prueba-tema-input="${trabajoId}"]`);
          const nuevaHora = input && input.value ? new Date(input.value).toISOString() : null;
          await sb.from("trabajos_cotidianos").update({ fecha_hora_inicio: nuevaHora }).eq("id", trabajoId);
          renderApartado(publicacionId, soloLectura);
        });
        panel.querySelector(`[data-quitar-hora-prueba-tema="${trabajoId}"]`).addEventListener("click", async () => {
          await sb.from("trabajos_cotidianos").update({ fecha_hora_inicio: null }).eq("id", trabajoId);
          renderApartado(publicacionId, soloLectura);
        });
      });
    });

    holder.querySelectorAll("[data-editar-trabajo]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.editarTrabajo;
        const lectura = holder.querySelector(`[data-trabajo-lectura="${id}"]`);
        const form = holder.querySelector(`[data-trabajo-editar-form="${id}"]`);
        if (lectura) lectura.style.display = "none";
        if (form) form.style.display = "flex";
      });
    });
    holder.querySelectorAll("[data-cancelar-editar-trabajo]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.cancelarEditarTrabajo;
        const lectura = holder.querySelector(`[data-trabajo-lectura="${id}"]`);
        const form = holder.querySelector(`[data-trabajo-editar-form="${id}"]`);
        if (form) form.style.display = "none";
        if (lectura) lectura.style.display = "";
      });
    });
    holder.querySelectorAll("[data-trabajo-editar-form]").forEach(form => {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = form.dataset.trabajoEditarForm;
        const f = new FormData(form);
        const descDiv = form.querySelector(`[data-trabajo-editar-desc="${id}"]`);
        await sb.from("trabajos_cotidianos").update({
          titulo: f.get("titulo"),
          descripcion: descDiv ? descDiv.innerHTML : null
        }).eq("id", id);
        renderApartado(publicacionId, soloLectura);
      });
    });

    holder.querySelectorAll("[data-toggle-trabajo-habilitado]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const nuevoEstado = btn.dataset.estadoActual !== "true";
        await sb.from("trabajos_cotidianos").update({ habilitado: nuevoEstado }).eq("id", btn.dataset.toggleTrabajoHabilitado);
        renderApartado(publicacionId, soloLectura);
      });
    });

    holder.querySelectorAll("[data-ver-entregas-trabajo-tema]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const trabajoId = btn.dataset.verEntregasTrabajoTema;
        const panel = holder.querySelector(`[data-entregas-trabajo-tema-panel="${trabajoId}"]`);
        if (!panel) return;
        if (panel.innerHTML) { panel.innerHTML = ""; return; }
        panel.innerHTML = `<p style="font-size:0.82rem; color:var(--text-muted);">Cargando entregas…</p>`;
        const { data: entregas } = await sb.from("trabajos_cotidianos_estudiante").select("*").eq("trabajo_id", trabajoId).or("completado.eq.true,archivo_ruta.not.is.null");
        if (!entregas || entregas.length === 0) {
          panel.innerHTML = `<p class="empty" style="font-size:0.82rem;">Todavía nadie ha entregado este trabajo.</p>`;
          return;
        }
        const estudianteIds = entregas.map(e => e.estudiante_id);
        const { data: estudiantes } = await sb.from("estudiantes").select("id, nombre, apellido1, apellido2").in("id", estudianteIds);
        const nombrePorId = {};
        (estudiantes || []).forEach(e => { nombrePorId[e.id] = [e.nombre, e.apellido1, e.apellido2].filter(Boolean).join(" "); });
        panel.innerHTML = `
          <div style="background:var(--surface-soft); border-radius:8px; padding:0.7rem; margin-top:0.4rem;">
            <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.5rem;">El estudiante ya no puede volver a entregar este trabajo una vez marcado. Si alguien se equivocó, usá "↺ Permitir reintento". La nota se pone en la sección "Rúbrica y Evaluaciones" (0 a 3), si este trabajo quedó marcado como indicador.</p>
            ${entregas.map(e => {
              const link = e.archivo_ruta ? sb.storage.from("materiales").getPublicUrl(e.archivo_ruta).data.publicUrl : "";
              return `<div class="roster-row" style="padding:0.3rem 0; display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                <span class="name">${nombrePorId[e.estudiante_id] || e.estudiante_id}</span>
                ${link ? `<a class="btn small" href="${link}" target="_blank" rel="noopener">📄 ${e.archivo_nombre || "Ver archivo"}</a>` : `<span class="badge">Completado (sin archivo)</span>`}
                <button class="btn secondary small" data-permitir-reintento-trabajo-tema="${trabajoId}" data-permitir-reintento-estudiante-tema="${e.estudiante_id}">↺ Permitir reintento</button>
              </div>`;
            }).join("")}
          </div>`;
        panel.querySelectorAll("[data-permitir-reintento-trabajo-tema]").forEach(rbtn => {
          rbtn.addEventListener("click", async () => {
            if (!confirm("¿Permitir que este estudiante vuelva a entregar el trabajo? Se borra lo que tenía entregado.")) return;
            await sb.from("trabajos_cotidianos_estudiante").update({ completado: false, archivo_ruta: null, archivo_nombre: null, entregado_en: null })
              .eq("trabajo_id", rbtn.dataset.permitirReintentoTrabajoTema).eq("estudiante_id", rbtn.dataset.permitirReintentoEstudianteTema);
            btn.click();
            btn.click();
          });
        });
      });
    });

    holder.querySelectorAll("[data-del-trabajo]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const trabajo = trabajos.find(t => String(t.id) === String(btn.dataset.delTrabajo));
        await sb.from("trabajos_cotidianos").delete().eq("id", btn.dataset.delTrabajo);
        if (trabajo && trabajo.indicador_id) await sb.from("indicadores").delete().eq("id", trabajo.indicador_id);
        renderApartado(publicacionId, soloLectura);
      });
    });

    holder.querySelectorAll("[data-convertir-indicador]").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!materiaId) { alert("Este tema no tiene una materia asociada."); return; }
        const trabajo = trabajos.find(t => String(t.id) === String(btn.dataset.convertirIndicador));
        if (!trabajo) return;
        const puntaje = Number(prompt(`¿Puntaje máximo para "${trabajo.titulo}"?`, "10"));
        if (!puntaje || puntaje <= 0) return;
        btn.disabled = true;
        btn.textContent = "Creando…";
        const indicadorId = await crearIndicadorParaTrabajo(materiaId, trabajo.titulo, trabajo.fecha, puntaje);
        if (indicadorId) await sb.from("trabajos_cotidianos").update({ indicador_id: indicadorId }).eq("id", trabajo.id);
        renderApartado(publicacionId, soloLectura);
      });
    });
  }
}

// --- WhatsApp (solo docente) ---

function renderWhatsapp(el, s) {
  const phone = s.telefono || "";
  const correo = s.correo_padre || "";
  el.innerHTML = `
    <div class="whatsapp-panel">
      <label for="phone-input">Teléfono de contacto (con código de país, ej. 506 8888 8888)</label>
      <input id="phone-input" value="${phone}" placeholder="506 8888 8888" />
      <label for="correo-input">Correo del encargado (para notificaciones de tardía o ausencia)</label>
      <input id="correo-input" type="email" value="${correo}" placeholder="encargado@correo.com" />
      <div class="row"><button class="btn small" id="save-contacto">Guardar contacto</button></div>
      <label for="wa-message">Mensaje</label>
      <textarea id="wa-message" rows="4">Estimado(a) encargado(a) de ${s.nombre} ${s.apellido1}, le saludamos desde el CTP Mercedes Norte, especialidad de Contabilidad.</textarea>
      <div class="row" style="flex-wrap:wrap;">
        <button class="btn wa-btn" id="send-wa">Enviar por WhatsApp</button>
        <button class="btn secondary" id="send-correo">Enviar por correo</button>
      </div>
      ${!phone ? '<p class="no-phone-note">Guarda un teléfono para poder enviar por WhatsApp.</p>' : ""}
      ${!correo ? '<p class="no-phone-note">Guarda un correo para poder enviarlo por correo.</p>' : ""}
    </div>`;

  document.getElementById("save-contacto").addEventListener("click", async () => {
    const valTel = document.getElementById("phone-input").value.trim();
    const valCorreo = document.getElementById("correo-input").value.trim();
    await sb.from("estudiantes").update({ telefono: valTel, correo_padre: valCorreo }).eq("id", s.id);
    s.telefono = valTel;
    s.correo_padre = valCorreo;
    renderWhatsapp(el, s);
  });
  document.getElementById("send-wa").addEventListener("click", () => {
    const currentPhone = onlyDigits(document.getElementById("phone-input").value);
    if (!currentPhone) { alert("Escribe y guarda un teléfono primero."); return; }
    const msg = document.getElementById("wa-message").value;
    window.open(`https://wa.me/${currentPhone}?text=${encodeURIComponent(msg)}`, "_blank");
  });
  document.getElementById("send-correo").addEventListener("click", () => {
    const currentCorreo = document.getElementById("correo-input").value.trim();
    if (!currentCorreo) { alert("Escribe y guarda un correo primero."); return; }
    const msg = document.getElementById("wa-message").value;
    window.open(`mailto:${currentCorreo}?subject=${encodeURIComponent("CTP Mercedes Norte")}&body=${encodeURIComponent(msg)}`, "_blank");
  });
}

// --- Materias asignadas a ESTE estudiante (dentro de su perfil, solo docente) ---

async function renderAcceso(el, s) {
  el.innerHTML = "Cargando…";
  const { data: todas } = await sb.from("materias").select("*").eq("seccion", s.seccion).order("nombre");
  const { data: asignadas } = await sb.from("estudiante_materias").select("materia_id").eq("estudiante_id", s.id);
  const asignadasIds = new Set((asignadas || []).map(a => a.materia_id));

  if (!todas || todas.length === 0) {
    el.innerHTML = `<p class="empty">Todavía no has creado materias para la sección ${s.seccion}. Ve a "Materias" en el menú superior para crearlas primero.</p>`;
    return;
  }

  el.innerHTML = `
    <p style="font-size:0.85rem; color:var(--text-muted);">Marca las materias que este estudiante puede ver en su plataforma:</p>
    <div class="roster">
      ${todas.map(m => `
        <label class="roster-row" style="cursor:pointer;">
          <span class="name">${m.nombre}</span>
          <input type="checkbox" data-materia="${m.id}" ${asignadasIds.has(m.id) ? "checked" : ""} style="width:1.1rem; height:1.1rem;" />
        </label>`).join("")}
    </div>`;

  el.querySelectorAll("[data-materia]").forEach(cb => {
    cb.addEventListener("change", async () => {
      const materiaId = Number(cb.dataset.materia);
      if (cb.checked) {
        await sb.from("estudiante_materias").insert({ estudiante_id: s.id, materia_id: materiaId });
      } else {
        await sb.from("estudiante_materias").delete().eq("estudiante_id", s.id).eq("materia_id", materiaId);
      }
    });
  });
}

// --- PIN de acceso del estudiante (para que el profesor lo vea/cambie sin entrar a Supabase) ---

function generarPinAleatorio() {
  return String(Math.floor(1000 + Math.random() * 9000)); // 4 dígitos
}

function renderPin(el, s) {
  el.innerHTML = `
    <div class="whatsapp-panel">
      <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.6rem;">
        ${s.nombre} entra a la plataforma con su cédula (<strong>${s.id}</strong>) y este PIN. Puede verlo, cambiarlo o generar uno nuevo aquí mismo.
      </p>
      <label for="pin-input">PIN actual</label>
      <div class="row" style="align-items:center;">
        <input id="pin-input" value="${s.pin || ""}" placeholder="Sin PIN asignado" inputmode="numeric" style="max-width:10rem; font-size:1.1rem; letter-spacing:0.15em;" />
        <button class="btn secondary small" id="generar-pin-btn" type="button">🎲 Generar aleatorio</button>
        <button class="btn small" id="guardar-pin-btn" type="button">Guardar</button>
      </div>
      <span id="pin-estado" style="font-size:0.78rem; color:var(--text-muted); display:block; margin-top:0.5rem;"></span>
    </div>`;

  document.getElementById("generar-pin-btn").addEventListener("click", () => {
    document.getElementById("pin-input").value = generarPinAleatorio();
  });

  document.getElementById("guardar-pin-btn").addEventListener("click", async () => {
    const nuevoPin = document.getElementById("pin-input").value.trim();
    const estado = document.getElementById("pin-estado");
    if (!nuevoPin) { estado.textContent = "Escribe o genera un PIN antes de guardar."; return; }
    await sb.from("estudiantes").update({ pin: nuevoPin }).eq("id", s.id);
    s.pin = nuevoPin;
    estado.textContent = "Guardado ✓ — ya puede entrar con este PIN.";
  });
}

// --- Ayudas para enviar archivos a los endpoints de generación con IA
// (generar-actividad-ia, generar-trabajo-ia): la solicitud serverless de
// Vercel rechaza (fuera de nuestro código, con un error en texto plano,
// no JSON) cualquier solicitud que en total pese más de ~4.5MB una vez
// armado el JSON. Como el archivo va codificado en base64 (~33% más
// pesado que el original), avisamos ANTES de subir si ya se nota que no
// va a entrar, y si aun así el servidor lo rechaza, damos un mensaje
// claro en vez del error crudo "Unexpected token... is not valid JSON". ---

const LIMITE_BYTES_ARCHIVOS_IA = 3_000_000; // ~3MB de archivos originales en total

function archivosExcedenLimiteIA(archivos) {
  const total = (archivos || []).reduce((acc, a) => acc + (a.size || 0), 0);
  return total > LIMITE_BYTES_ARCHIVOS_IA;
}

async function leerRespuestaIA(r) {
  const texto = await r.text();
  let datos = null;
  try { datos = JSON.parse(texto); } catch { datos = null; }
  if (datos) return { datos };
  if (r.status === 413 || /entity too large/i.test(texto)) {
    return { error: "Los archivos pesan demasiado en conjunto para enviarlos a la IA. Probá con menos archivos o más livianos (máximo ~3MB entre todos)." };
  }
  return { error: `El servidor no respondió correctamente (código ${r.status}).` };
}

// --- Clave de prueba (código aparte del PIN de acceso: lo pide la prueba
// al empezar, para confirmar que quien la está haciendo es ese estudiante
// y no otra persona con su sesión abierta. Solo vos la ves y la manejás —
// el estudiante no la ve en su perfil) ---

function generarClavePruebaAleatoria() {
  // Letras y números, sin caracteres que se confunden entre sí (0/O, 1/I/L).
  const alfabeto = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let clave = "";
  for (let i = 0; i < 6; i++) clave += alfabeto[Math.floor(Math.random() * alfabeto.length)];
  return clave;
}

function renderClavePrueba(el, s) {
  el.innerHTML = `
    <div class="whatsapp-panel">
      <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.6rem;">
        Antes de entrar a CUALQUIER prueba, la plataforma le pide a ${s.nombre} esta clave (además de sus datos). Es distinta del PIN de acceso: sirve para confirmar que es él/ella quien la está haciendo, no otra persona con su sesión abierta. Se la comunicás vos — el estudiante no la ve en su propio perfil.
      </p>
      <label for="clave-prueba-input">Clave actual</label>
      <div class="row" style="align-items:center;">
        <input id="clave-prueba-input" value="${s.clave_prueba || ""}" placeholder="Sin clave asignada" style="max-width:10rem; font-size:1.1rem; letter-spacing:0.15em; text-transform:uppercase;" />
        <button class="btn secondary small" id="generar-clave-prueba-btn" type="button">🎲 Generar aleatoria</button>
        <button class="btn small" id="guardar-clave-prueba-btn" type="button">Guardar</button>
      </div>
      <span id="clave-prueba-estado" style="font-size:0.78rem; color:var(--text-muted); display:block; margin-top:0.5rem;"></span>
    </div>`;

  document.getElementById("generar-clave-prueba-btn").addEventListener("click", () => {
    document.getElementById("clave-prueba-input").value = generarClavePruebaAleatoria();
  });

  document.getElementById("guardar-clave-prueba-btn").addEventListener("click", async () => {
    const nuevaClave = document.getElementById("clave-prueba-input").value.trim().toUpperCase();
    const estado = document.getElementById("clave-prueba-estado");
    if (!nuevaClave) { estado.textContent = "Escribe o genera una clave antes de guardar."; return; }
    await sb.from("estudiantes").update({ clave_prueba: nuevaClave }).eq("id", s.id);
    s.clave_prueba = nuevaClave;
    estado.textContent = "Guardado ✓ — ya se la puede pedir en cualquier prueba.";
  });
}

// --- Usuario y clave de Aula de Conta (Aula Contable NIIF): esa app es un
// artifact aparte, con su propio sistema de cuentas (el estudiante se crea
// la cuenta ahí mismo, con "Crear mi cuenta", guardada cifrada en SU equipo
// — no en esta base de datos). Lo que hacemos aquí es GENERAR un usuario y
// una clave estándar por estudiante para que todos usen el mismo formato y
// el profesor tenga un registro de qué le entregó a cada uno; el estudiante
// los escribe tal cual la primera vez que se registra en esa app. ---

function normalizarParaUsuarioAulaContable(texto) {
  return (texto || "")
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function generarUsuarioAulaContable(s) {
  const nombre = normalizarParaUsuarioAulaContable(s.nombre).slice(0, 10) || "est";
  const apellido = normalizarParaUsuarioAulaContable(s.apellido1).slice(0, 10) || "cr";
  const sufijo = onlyDigits(s.id).slice(-3) || String(Math.floor(100 + Math.random() * 900));
  return `${nombre}.${apellido}${sufijo}`.slice(0, 30);
}

function generarClaveAulaContableAleatoria() {
  // Aula Contable exige mínimo 6 caracteres combinando letras y números;
  // generamos 4 letras + 4 números y los mezclamos para cumplirlo siempre.
  const letras = "ABCDEFGHJKMNPQRSTUVWXYZ";
  const digitos = "23456789";
  const piezas = [];
  for (let i = 0; i < 4; i++) piezas.push(letras[Math.floor(Math.random() * letras.length)]);
  for (let i = 0; i < 4; i++) piezas.push(digitos[Math.floor(Math.random() * digitos.length)]);
  for (let i = piezas.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [piezas[i], piezas[j]] = [piezas[j], piezas[i]];
  }
  return piezas.join("");
}

function renderAulaContaCredenciales(el, s) {
  el.innerHTML = `
    <div class="whatsapp-panel" style="border-left:4px solid var(--ledger-green); margin-bottom:1rem;">
      <strong style="font-family:var(--serif);">🧮 Entrar al Aula de Conta de ${s.nombre}</strong>
      <p style="font-size:0.82rem; color:var(--text-muted); margin:0.3rem 0 0.8rem;">Ves y editás directamente las empresas y asientos reales de ${s.nombre} — lo que hagas ahí queda guardado en su cuenta, igual que si lo hiciera la persona misma.</p>
      <a class="btn small" href="${AULA_CONTABLE_URL}?como_estudiante=${encodeURIComponent(s.id)}">🧮 Abrir Aula de Conta como ${s.nombre} →</a>
    </div>
    <div class="whatsapp-panel">
      <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.6rem;">
        "Aula de Conta" (Aula Contable NIIF) es una aplicación aparte, con su propio sistema de cuentas. ${s.nombre} debe entrar ahí y, la PRIMERA vez, usar "Crear mi cuenta" escribiendo exactamente este usuario y esta clave — así quedan parejos para toda la sección y vos llevás el registro de a quién se los diste. Esa app los guarda cifrados en el propio equipo del estudiante; esta plataforma no se conecta con ella.
      </p>
      <label for="aula-conta-usuario-input">Usuario</label>
      <div class="row" style="align-items:center;">
        <input id="aula-conta-usuario-input" value="${s.usuario_aula_contable || ""}" placeholder="Sin usuario asignado" style="max-width:14rem; font-size:1.05rem;" />
      </div>
      <label for="aula-conta-clave-input" style="margin-top:0.6rem; display:block;">Clave</label>
      <div class="row" style="align-items:center;">
        <input id="aula-conta-clave-input" value="${s.clave_aula_contable || ""}" placeholder="Sin clave asignada" style="max-width:10rem; font-size:1.1rem; letter-spacing:0.1em;" />
        <button class="btn secondary small" id="generar-aula-conta-par-btn" type="button">🎲 Generar usuario y clave nuevos</button>
        <button class="btn small" id="guardar-aula-conta-btn" type="button">Guardar</button>
      </div>
      <span id="aula-conta-estado" style="font-size:0.78rem; color:var(--text-muted); display:block; margin-top:0.5rem;"></span>
    </div>`;

  document.getElementById("generar-aula-conta-par-btn").addEventListener("click", () => {
    document.getElementById("aula-conta-usuario-input").value = generarUsuarioAulaContable(s);
    document.getElementById("aula-conta-clave-input").value = generarClaveAulaContableAleatoria();
  });

  document.getElementById("guardar-aula-conta-btn").addEventListener("click", async () => {
    const nuevoUsuario = document.getElementById("aula-conta-usuario-input").value.trim().toLowerCase();
    const nuevaClave = document.getElementById("aula-conta-clave-input").value.trim();
    const estado = document.getElementById("aula-conta-estado");
    if (!nuevoUsuario || !nuevaClave) { estado.textContent = "Escribe o genera un usuario y una clave antes de guardar."; return; }
    if (!/^[a-z0-9._-]{3,30}$/.test(nuevoUsuario)) { estado.textContent = "El usuario debe tener de 3 a 30 caracteres: minúsculas, números, punto, guion o guion bajo (es lo que exige Aula de Conta)."; return; }
    if (nuevaClave.length < 6 || !/[a-zA-Z]/.test(nuevaClave) || !/[0-9]/.test(nuevaClave)) { estado.textContent = "La clave debe tener al menos 6 caracteres combinando letras y números (es lo que exige Aula de Conta)."; return; }
    await sb.from("estudiantes").update({ usuario_aula_contable: nuevoUsuario, clave_aula_contable: nuevaClave }).eq("id", s.id);
    s.usuario_aula_contable = nuevoUsuario;
    s.clave_aula_contable = nuevaClave;
    estado.textContent = "Guardado ✓ — comunicáselos para que los use en \"Crear mi cuenta\" dentro de Aula de Conta.";
  });
}

// ---------- RÚBRICA (categorías y pesos, sumativa, suma ≤ 100%) ----------

// ---------- MATERIAS (panel de administración, solo docente) ----------

async function renderMaterias() {
  const { data: estudiantes } = await sb.from("estudiantes").select("seccion");
  const secciones = [...new Set((estudiantes || []).map(e => e.seccion))].sort();

  app.innerHTML = `
    ${topbar()}
    <div class="wrap">
      <a href="#/" class="btn secondary small" style="margin-bottom:1rem; display:inline-block;">&larr; Secciones</a>
      <h1>Materias</h1>
      <p style="color:var(--text-muted); margin-top:-0.6em;">Crea las materias por sección. Después, desde el perfil de cada estudiante (pestaña "Materias") decides cuáles puede ver.</p>
      <div id="materias-by-section"></div>
    </div>`;
  bindTopbar();

  const container = document.getElementById("materias-by-section");
  for (const sec of secciones) {
    const block = document.createElement("div");
    block.className = "group-promo";
    block.style.marginTop = "1.2rem";
    block.innerHTML = `<summary style="font-family:var(--serif); font-weight:600; font-size:1.02rem;">Sección ${sec}</summary>
      <div class="row" style="margin-top:0.6rem;">
        <button class="btn secondary small" data-asignar-todas-materias="${sec}" type="button">👥 Asignar TODAS las materias de esta sección a TODOS sus estudiantes</button>
        <span data-asignar-todas-materias-estado="${sec}" style="font-size:0.78rem; color:var(--text-muted);"></span>
      </div>
      <div class="materia-list" data-sec="${sec}" style="margin-top:0.8rem;">Cargando…</div>`;
    container.appendChild(block);
    await loadMateriasSeccion(sec);
  }

  container.querySelectorAll("[data-asignar-todas-materias]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const sec = btn.dataset.asignarTodasMaterias;
      const estado = container.querySelector(`[data-asignar-todas-materias-estado="${CSS.escape(sec)}"]`);
      btn.disabled = true;
      estado.textContent = "Asignando…";
      const { data: materiasSec } = await sb.from("materias").select("id").eq("seccion", sec);
      const { data: estudiantesSec } = await sb.from("estudiantes").select("id").eq("seccion", sec);
      if (!materiasSec || materiasSec.length === 0) {
        estado.textContent = "Esta sección todavía no tiene materias creadas.";
        btn.disabled = false;
        return;
      }
      const { data: yaAsignados } = await sb.from("estudiante_materias").select("estudiante_id, materia_id").in("materia_id", materiasSec.map(m => m.id));
      const yaAsignadosSet = new Set((yaAsignados || []).map(a => `${a.estudiante_id}-${a.materia_id}`));
      const faltantes = [];
      (estudiantesSec || []).forEach(s => {
        materiasSec.forEach(m => {
          if (!yaAsignadosSet.has(`${s.id}-${m.id}`)) faltantes.push({ estudiante_id: s.id, materia_id: m.id });
        });
      });
      if (faltantes.length === 0) {
        estado.textContent = "Ya estaban todas asignadas.";
      } else {
        await sb.from("estudiante_materias").insert(faltantes);
        estado.textContent = `Listo — se hicieron ${faltantes.length} asignación(es) que faltaban.`;
      }
      btn.disabled = false;
    });
  });
}

async function loadMateriasSeccion(sec) {
  const holder = document.querySelector(`.materia-list[data-sec="${CSS.escape(sec)}"]`);
  const { data: materias } = await sb.from("materias").select("*").eq("seccion", sec).order("nombre");

  holder.innerHTML = `
    <div class="roster">
      ${(materias || []).map(m => `
        <div class="roster-row">
          <a class="name" href="#/materia/${m.id}">${m.nombre}</a>
          <span style="display:flex; gap:0.5rem;">
            <a class="btn secondary small" href="#/materia/${m.id}">Ver contenido</a>
            <button class="btn danger small" data-del-materia="${m.id}">Eliminar</button>
          </span>
        </div>`).join("") || '<p class="empty">Sin materias todavía.</p>'}
    </div>
    <form class="inline-form" data-add-materia="${sec}">
      <input name="nombre" placeholder="Nombre de la materia (ej. Contabilidad General)" required style="flex:1; min-width:12rem" />
      <button class="btn small" type="submit">Agregar materia</button>
    </form>`;

  holder.querySelectorAll("[data-del-materia]").forEach(btn => {
    btn.addEventListener("click", async () => {
      await sb.from("materias").delete().eq("id", btn.dataset.delMateria);
      loadMateriasSeccion(sec);
    });
  });
  const form = holder.querySelector("[data-add-materia]");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    await sb.from("materias").insert({ nombre: f.get("nombre"), seccion: sec });
    loadMateriasSeccion(sec);
  });
}

// ---------- Contenido de una materia (estilo "curso" de Moodle: temas + recursos) ----------

async function renderMateriaDetalle(materiaId) {
  const { data: materia } = await sb.from("materias").select("*").eq("id", materiaId).maybeSingle();
  if (!materia) { location.hash = "#/materias"; return; }

  app.innerHTML = `
    ${topbar()}
    <div class="wrap">
      <a href="#/materias" class="btn secondary small" style="margin-bottom:1rem; display:inline-block;">&larr; Materias</a>
      <h1>${materia.nombre}</h1>
      <p style="color:var(--text-muted); margin-top:-0.6em;">Sección ${materia.seccion}</p>
      <div class="row" style="margin:0.6rem 0 1rem;">
        <button class="btn secondary small" id="asignar-todos-seccion-btn" type="button">👥 Asignar esta materia a toda la sección</button>
        <span id="asignar-todos-seccion-estado" style="font-size:0.78rem; color:var(--text-muted);"></span>
      </div>
      <p style="font-size:0.78rem; color:var(--text-muted); margin-top:-0.6rem; margin-bottom:1rem;">Si un estudiante no tiene esta materia marcada en su "Acceso", sus notas de esta materia no aparecen en Rúbrica y Evaluaciones. Este botón la marca para todos los de la sección ${materia.seccion} de una sola vez.</p>

      <nav class="cat-navbar" style="margin-bottom:1rem;">
        <button class="cat-navlink active" data-materia-tab="temas" type="button">📘 Temas</button>
        <button class="cat-navlink" data-materia-tab="indicadores" type="button">📊 Indicadores de evaluación</button>
        <button class="cat-navlink" data-materia-tab="avisos" type="button">📎 Avisos y materiales</button>
      </nav>

      <div data-materia-panel="temas">
        <div id="materia-apartados">Cargando…</div>
      </div>
      <div data-materia-panel="indicadores" style="display:none;">
        <div id="materia-indicadores">Cargando…</div>
      </div>
      <div data-materia-panel="avisos" style="display:none;">
        <div id="materia-publicaciones">Cargando…</div>
      </div>
    </div>`;
  bindTopbar();

  document.querySelectorAll("[data-materia-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-materia-tab]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll("[data-materia-panel]").forEach(p => { p.style.display = "none"; });
      const panel = document.querySelector(`[data-materia-panel="${btn.dataset.materiaTab}"]`);
      if (panel) panel.style.display = "";
    });
  });

  document.getElementById("asignar-todos-seccion-btn").addEventListener("click", async (e) => {
    const estado = document.getElementById("asignar-todos-seccion-estado");
    e.target.disabled = true;
    estado.textContent = "Asignando…";
    const { data: estudiantes } = await sb.from("estudiantes").select("id").eq("seccion", materia.seccion);
    const { data: yaAsignados } = await sb.from("estudiante_materias").select("estudiante_id").eq("materia_id", materiaId);
    const yaAsignadosSet = new Set((yaAsignados || []).map(a => a.estudiante_id));
    const faltantes = (estudiantes || []).filter(s => !yaAsignadosSet.has(s.id));
    if (faltantes.length === 0) {
      estado.textContent = "Ya estaba asignada a todos los estudiantes de la sección.";
    } else {
      await sb.from("estudiante_materias").insert(faltantes.map(s => ({ estudiante_id: s.id, materia_id: materiaId })));
      estado.textContent = `Listo — se asignó a ${faltantes.length} estudiante(s) que faltaban.`;
    }
    e.target.disabled = false;
  });

  await cargarApartadosDeMateria(materiaId);
  await cargarIndicadoresDeMateria(materiaId);
  await cargarPublicacionesDeMateria(materiaId, materia.seccion);
}

// Nombres de nivel de desempeño por defecto, siguiendo la convención del MEP
// (rúbrica analítica con niveles de ejecución). Si el puntaje máximo es 3 se
// usa la escala estándar; para otros puntajes se aproxima con una escala más
// larga. Siempre editable por el profesor antes de guardar.
function nombreNivelPorDefecto(puntaje, max) {
  if (max === 3) return ["Inicial", "En proceso", "Logrado"][puntaje - 1] || "";
  if (max === 1) return "Logrado";
  if (max === 2) return puntaje === 1 ? "En proceso" : "Logrado";
  const escala = ["Inicial", "En proceso", "Logrado", "Avanzado", "Excelente"];
  return escala[Math.min(puntaje - 1, escala.length - 1)];
}

// Escala fija de los indicadores nuevos: 0 a 3 puntos. El nivel 0 siempre
// significa que el estudiante no presentó el trabajo o tiene una ausencia
// injustificada — es fijo, no lo redacta el profesor ni la IA.
const NIVEL_CERO_NOMBRE = "No presentado";
const NIVEL_CERO_DESCRIPCION = "El estudiante no presentó el trabajo, o tiene una ausencia injustificada en la fecha de evaluación.";

// Abre una ventana con la prueba lista para imprimir o "Guardar como PDF"
// desde el navegador: el membrete del MEP, las preguntas con sus opciones
// (sin marcar cuál es la correcta), el apareamiento y el caso práctico si
// los tiene. Sirve para tener la prueba en papel o guardarla en PDF.
function generarPdfPrueba(trabajo) {
  const contenido = trabajo.contenido_actividad;
  if (!contenido) { alert("Esta prueba todavía no tiene contenido guardado."); return; }
  const hoy = new Date().toLocaleDateString("es-CR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const preguntas = Array.isArray(contenido.preguntas) ? contenido.preguntas : [];
  const apareamiento = contenido.apareamiento;
  const casoPractico = contenido.casoPractico;
  const letras = ["a", "b", "c", "d", "e", "f", "g", "h"];

  const preguntasHtml = preguntas.map((p, i) => `
    <div style="margin-bottom:0.9rem; break-inside:avoid;">
      <p style="font-weight:700; margin:0 0 0.3rem;">${i + 1}. ${p.pregunta || ""}</p>
      <div style="padding-left:1.2rem; display:grid; gap:0.25rem;">
        ${(p.opciones || []).map((op, j) => `<div>${letras[j] || j}) ${op}</div>`).join("")}
      </div>
    </div>`).join("");

  const apareamientoHtml = (apareamiento && Array.isArray(apareamiento.pares) && apareamiento.pares.length) ? `
    <div style="margin-top:1.2rem; break-inside:avoid;">
      <p style="font-weight:700;">Apareamiento</p>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:1.5rem;">
        <div>
          ${apareamiento.pares.map((p, i) => `<div style="margin-bottom:0.4rem;">${i + 1}. ${p.situacion}</div>`).join("")}
        </div>
        <div>
          ${apareamiento.pares.map((p, i) => `<div style="margin-bottom:0.4rem;">${letras[i] || i}) ${p.respuesta}</div>`).join("")}
        </div>
      </div>
    </div>` : "";

  const casoPracticoHtml = (casoPractico && (casoPractico.enunciado || casoPractico.instruccion)) ? `
    <div style="margin-top:1.2rem; break-inside:avoid;">
      <p style="font-weight:700;">Caso práctico</p>
      ${casoPractico.enunciado ? `<p style="white-space:pre-wrap;">${casoPractico.enunciado}</p>` : ""}
      ${casoPractico.instruccion ? `<p style="white-space:pre-wrap; font-style:italic;">${casoPractico.instruccion}</p>` : ""}
      <div style="border:1px solid #999; min-height:6cm; margin-top:0.5rem;"></div>
    </div>` : "";

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>${(trabajo.titulo || "Prueba").replace(/[<>]/g, "")}</title>
<style>
  @page { size: letter; margin: 1.6cm; }
  body { font-family: 'IBM Plex Sans', Arial, sans-serif; color: #232323; margin: 0; padding: 1.5rem; font-size: 0.92rem; }
  .no-print { margin-bottom: 1.2rem; display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; }
  .no-print button { padding: 0.5rem 1rem; font-size: 0.9rem; cursor: pointer; }
  header.membrete { text-align: center; border: 1px solid #16232e; padding: 0.6rem; margin-bottom: 1rem; }
  header.membrete .mep { font-weight: 700; }
  .datos { display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem 1.5rem; margin-bottom: 1.3rem; font-size: 0.85rem; }
  .datos .campo { border-bottom: 1px solid #999; padding: 0.3rem 0.1rem; }
  @media print { .no-print { display: none; } body { padding: 0; } }
</style>
</head>
<body>
  <div class="no-print">
    <button id="btn-print">Imprimir / Guardar PDF</button>
  </div>

  <header class="membrete">
    <div class="mep">MINISTERIO DE EDUCACIÓN PÚBLICA</div>
    <div>${INSTITUCION.nombre} — Especialidad: ${INSTITUCION.especialidad}</div>
    <div>Docente: ${INSTITUCION.docente || ""}</div>
  </header>

  <div class="datos">
    <div class="campo"><b>Prueba:</b> ${(trabajo.titulo || "").replace(/[<>]/g, "")}</div>
    <div class="campo"><b>Fecha:</b> ${hoy}</div>
    <div class="campo"><b>Nombre del estudiante:</b> ______________________________</div>
    <div class="campo"><b>Cédula:</b> ______________________________</div>
  </div>

  ${preguntasHtml}
  ${apareamientoHtml}
  ${casoPracticoHtml}

  <script>
    document.getElementById("btn-print").addEventListener("click", () => window.print());
  </script>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) { alert("El navegador bloqueó la ventana nueva. Permite ventanas emergentes para generar el PDF."); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

async function cargarIndicadoresDeMateria(materiaId, categoriaActiva) {
  const holder = document.getElementById("materia-indicadores");
  if (!holder) return;
  const { data: categorias } = await sb.from("rubrica_categorias").select("*").order("orden");
  const catNombre = categoriaActiva || categorias?.[0]?.nombre || null;

  const { data: indicadores } = catNombre
    ? await sb.from("indicadores").select("*, criterios_indicador(*)").eq("materia_id", materiaId).eq("categoria", catNombre).order("orden")
    : { data: [] };

  // Resultados de aprendizaje del programa de estudio de esta materia, para
  // poder vincular cada indicador al resultado oficial que evalúa (normativa
  // del MEP: todo indicador debe derivarse de un resultado de aprendizaje).
  const { data: unidadesProg } = await sb.from("programa").select("id").eq("materia_id", materiaId);
  const programaIds = (unidadesProg || []).map(u => u.id);
  const { data: resultadosMateria } = programaIds.length
    ? await sb.from("resultados_aprendizaje").select("id, resultado").in("programa_id", programaIds).order("id")
    : { data: [] };
  const resultadoPorId = {};
  (resultadosMateria || []).forEach(r => { resultadoPorId[r.id] = r.resultado; });
  const quitarHtmlResultado = (v) => String(v || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  // Subtemas de la materia, para poder llenar el título del indicador
  // automáticamente con el nombre del subtema (en vez de escribirlo a mano).
  const { data: temasMateria } = await sb.from("publicaciones").select("id, titulo").eq("materia_id", materiaId).eq("tipo", "apartado");
  const temaIds = (temasMateria || []).map(t => t.id);
  const { data: subtemasMateria } = temaIds.length
    ? await sb.from("subtemas").select("id, titulo, publicacion_id").in("publicacion_id", temaIds).order("orden")
    : { data: [] };

  // Para cada indicador creado a partir de un trabajo cotidiano, busca ese
  // trabajo para poder ofrecer un botón "Ver trabajo" que lleve directo a
  // la página del tema/subtema donde vive (los trabajos en clase no llevan
  // indicador, así que no aplica para esos).
  const indicadorIdsActuales = (indicadores || []).map(i => i.id);
  const trabajoPorIndicador = {};
  if (indicadorIdsActuales.length) {
    const { data: tcVinculados } = await sb.from("trabajos_cotidianos").select("id, indicador_id, publicacion_id, subtema_id, titulo, habilitado, tipo_actividad, fecha_hora_inicio, contenido_actividad, retro_visible").in("indicador_id", indicadorIdsActuales);
    (tcVinculados || []).forEach(t => { trabajoPorIndicador[t.indicador_id] = t; });
  }
  function linkTrabajo(ind) {
    const t = trabajoPorIndicador[ind.id];
    if (!t) return "";
    const href = t.subtema_id ? `#/subtema/${t.subtema_id}` : `#/apartado/${t.publicacion_id}`;
    return `<a class="btn secondary small" href="${href}" title="Ver el trabajo cotidiano: ${String(t.titulo || "").replace(/"/g, "&quot;")}">📎 Ver trabajo</a>`;
  }
  // Para una prueba, permite habilitarla/deshabilitarla para los
  // estudiantes directamente desde esta tarjeta del indicador, sin tener
  // que ir hasta la página del tema a buscarla.
  function botonHabilitarTrabajo(ind) {
    const t = trabajoPorIndicador[ind.id];
    if (!t || t.tipo_actividad !== "prueba") return "";
    const habilitado = t.habilitado !== false;
    return habilitado
      ? `<button class="btn secondary small" data-toggle-habilitar-prueba="${t.id}" data-estado="habilitado">✅ Habilitada</button>`
      : `<button class="btn small" data-toggle-habilitar-prueba="${t.id}" data-estado="deshabilitado">Habilitar</button>`;
  }
  // Botón + panel para ponerle (o quitarle) la hora de inicio a la prueba,
  // sin tener que salir de esta tarjeta tampoco.
  function botonHoraTrabajo(ind) {
    const t = trabajoPorIndicador[ind.id];
    if (!t || t.tipo_actividad !== "prueba") return "";
    const texto = t.fecha_hora_inicio ? "⏰ " + formatearFechaHora(t.fecha_hora_inicio) : "⏰ Sin hora programada";
    return `<button class="btn secondary small" data-cambiar-hora-ind="${t.id}">${texto}</button>`;
  }
  // Botón para ver, sin salir de esta tarjeta, qué respondió cada
  // estudiante en la prueba (pregunta por pregunta) y su nota.
  function botonVerRespuestasTrabajo(ind) {
    const t = trabajoPorIndicador[ind.id];
    if (!t || !TIPOS_CON_RETRO.includes(t.tipo_actividad)) return "";
    return `<button class="btn secondary small" data-ver-retro-ind="${t.id}">📝 Ver respuestas</button>`;
  }
  // Botón para que el profesor controle, desde aquí mismo, si los
  // estudiantes pueden ver el detalle de sus propias respuestas (qué
  // contestaron vs. la correcta) en su propio perfil. Mientras esté
  // apagado, el estudiante solo ve la nota, nunca el detalle.
  function botonMostrarRespuestasTrabajo(ind) {
    const t = trabajoPorIndicador[ind.id];
    if (!t || !TIPOS_CON_RETRO.includes(t.tipo_actividad)) return "";
    return t.retro_visible
      ? `<button class="btn small" data-toggle-retro-visible-ind="${t.id}" data-estado-actual="true">🔒 Bloquear respuestas a estudiantes</button>`
      : `<button class="btn secondary small" data-toggle-retro-visible-ind="${t.id}" data-estado-actual="false">🔓 Desbloquear respuestas a estudiantes</button>`;
  }
  // Botón para descargar/imprimir la prueba en PDF (sin marcar las
  // respuestas correctas), para tenerla en papel o guardada.
  function botonPdfTrabajo(ind) {
    const t = trabajoPorIndicador[ind.id];
    if (!t || t.tipo_actividad !== "prueba") return "";
    return `<button class="btn secondary small" data-pdf-prueba-ind="${t.id}">📄 Descargar PDF</button>`;
  }
  // Botón para ver, sin salir de esta tarjeta, el diagnóstico por
  // pregunta: cuántos acertaron y cuántos fallaron cada una.
  function botonDiagnosticoTrabajo(ind) {
    const t = trabajoPorIndicador[ind.id];
    if (!t || !TIPOS_CON_RETRO.includes(t.tipo_actividad)) return "";
    return `<button class="btn secondary small" data-diagnostico-ind="${t.id}">📊 Diagnóstico</button>`;
  }
  // Botón para calificar la prueba por puntos reales (no por la escala
  // 0-3): suma Parte 1 (selección única, automática) + Parte 2
  // (apareamiento, automática) + Parte 3 (caso práctico, a mano), sobre
  // un total fijo de puntos, y guarda el % resultante como nota.
  function botonPuntosTrabajo(ind) {
    const t = trabajoPorIndicador[ind.id];
    if (!t || t.tipo_actividad !== "prueba") return "";
    // En Proyectos la comprobación es un indicador más de 0 a 3 (se califica
    // sola por % de aciertos): calificar por puntos cambiaría su puntaje
    // máximo a los puntos de la prueba y descuadraría la nota del proyecto.
    if (catNombre === "Proyectos") return "";
    return `<button class="btn secondary small" data-puntos-ind="${t.id}">🧮 Calificar por puntos</button>`;
  }
  // Para un indicador que todavía no tiene ningún trabajo vinculado (se
  // creó a mano desde este mismo formulario), permite pedirle al
  // estudiante que suba un archivo (PDF/imagen) para esa tarea — se
  // califica a mano, igual que una infografía.
  function botonPedirArchivoTrabajo(ind) {
    if (trabajoPorIndicador[ind.id]) return "";
    return `<button class="btn secondary small" data-pedir-archivo-ind="${ind.id}">📎 Pedir entrega de archivo</button>`;
  }
  // Igual que arriba, pero para una entrega de "proyecto" (título +
  // descripción + archivo, con mínimo de caracteres opcional y entregas
  // múltiples) — para indicadores que no pertenecen a ningún tema, como un
  // proyecto que se divide en partes calificadas por separado.
  function botonPedirProyectoTrabajo(ind) {
    if (trabajoPorIndicador[ind.id]) return "";
    return `<button class="btn secondary small" data-pedir-proyecto-ind="${ind.id}">📎 Pedir entrega</button>`;
  }
  // Solo en Proyectos: genera con IA una cantidad X de preguntas de
  // selección única sobre todos los temas que evalúan los demás
  // indicadores del proyecto (descripción + criterio "Logrado"), igual que
  // en trabajo cotidiano. Pensado para la comprobación del proyecto: se
  // guarda como "prueba" vinculada a este indicador (botón ▶ Iniciar prueba
  // del estudiante, habilitar/hora desde esta tarjeta) y se califica sola
  // (% de aciertos → 0-3).
  function botonGenerarSeleccionProyecto(ind) {
    if (catNombre !== "Proyectos" || trabajoPorIndicador[ind.id]) return "";
    return `<button class="btn secondary small" data-generar-su-ind="${ind.id}">✨ Generar preguntas de selección única con IA</button>`;
  }
  // Una vez que el indicador ya tiene el trabajo de "subir archivo"
  // vinculado, permite revisar/descargar lo que fueron entregando.
  function botonVerEntregasIndicador(ind) {
    const t = trabajoPorIndicador[ind.id];
    if (!t || t.tipo_actividad !== "infografia") return "";
    return `<button class="btn secondary small" data-ver-entregas-ind="${t.id}">📂 Ver entregas</button>`;
  }
  // Igual que arriba, pero para un trabajo tipo "proyecto".
  function botonVerEntregasProyectoIndicador(ind) {
    const t = trabajoPorIndicador[ind.id];
    if (!t || t.tipo_actividad !== "proyecto") return "";
    return `<button class="btn secondary small" data-ver-entregas-proyecto-ind="${t.id}">📂 Ver entregas</button>`;
  }

  const siguienteLetra = siguienteLetraDisponible((indicadores || []).map(i => i.letra));
  const esCategoriaPruebas = catNombre === "Pruebas";

  // Mientras se está viendo la categoría "Pruebas", se oculta "Avisos y
  // materiales" (más abajo en la misma página) para que la pantalla quede
  // enfocada en las pruebas.
  const publicacionesHolder = document.getElementById("materia-publicaciones");
  if (publicacionesHolder) publicacionesHolder.style.display = esCategoriaPruebas ? "none" : "";

  holder.innerHTML = `
    <h3 style="margin-top:0;">Indicadores de evaluación</h3>
    <nav class="cat-navbar">
      ${(categorias || []).map(c => `<button class="cat-navlink ${c.nombre === catNombre ? "active" : ""}" data-cat-ind="${c.nombre}">${c.nombre}</button>`).join("")}
    </nav>
    ${(indicadores || []).length > 0 ? `
    <div class="row" style="margin:0.8rem 0; flex-wrap:wrap; gap:0.5rem;">
      <button class="btn" id="calificar-todos-btn">Calificar a todos los estudiantes (${catNombre})</button>
      <button class="btn secondary" id="corregir-letras-btn" type="button" title="Vuelve a poner las letras en orden (A, B, C…) sin repetidas, dentro de esta categoría">🔤 Corregir letras repetidas</button>
    </div>` : ""}
    <div id="calificar-todos-holder"></div>
    ${catNombre === "Proyectos" && (indicadores || []).length > 0 ? `<div id="proyecto-integral-holder" style="margin-top:0.8rem;"></div>` : ""}
    <div class="roster" id="lista-indicadores-holder" style="margin-top:0.8rem;">
      ${(indicadores || []).map(ind => {
        const tieneCriterios = (ind.criterios_indicador || []).length > 0;
        const resultadoVinculado = ind.resultado_id ? resultadoPorId[ind.resultado_id] : null;
        // Una prueba se califica sola (selección única/falso-verdadero, nota
        // automática por porcentaje de aciertos): no tiene sentido pedirle al
        // profesor que le escriba criterios de evaluación con niveles de
        // desempeño, así que ese bloque no aplica a este tipo de indicador.
        const esPruebaAuto = trabajoPorIndicador[ind.id] && trabajoPorIndicador[ind.id].tipo_actividad === "prueba" && catNombre !== "Proyectos";
        return `
        <div class="roster-row" style="flex-direction:column; align-items:stretch; gap:0.4rem;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.6rem;">
            <span class="name">
              <strong>${ind.letra}:</strong> <span class="ind-descripcion-text">${ind.descripcion}</span>
              <span style="color:var(--text-muted); font-size:0.8rem;"> (máx. ${ind.puntaje_maximo} pts)</span>
              ${ind.fecha_evaluacion ? `<div style="font-size:0.75rem; color:var(--text-muted);">Fecha: ${ind.fecha_evaluacion}${ind.lecciones ? " · " + ind.lecciones + " lecciones" : ""}</div>` : ""}
              ${esCategoriaPruebas ? "" : (resultadoVinculado
                ? `<div style="font-size:0.75rem; color:var(--text-muted); font-style:italic;">📘 Resultado de aprendizaje: ${quitarHtmlResultado(resultadoVinculado)}</div>`
                : `<div style="font-size:0.75rem; color:var(--brick); display:flex; align-items:center; gap:0.4rem; flex-wrap:wrap; margin-top:0.2rem;">
                     ⚠️ Sin vincular a un resultado de aprendizaje del programa
                     <select data-vincular-resultado="${ind.id}" style="font-size:0.78rem;">
                       <option value="">Elegir resultado…</option>
                       ${(resultadosMateria || []).map(r => `<option value="${r.id}">${quitarHtmlResultado(r.resultado).slice(0, 80)}</option>`).join("")}
                     </select>
                   </div>`)}
            </span>
            <span style="display:flex; gap:0.4rem; align-items:center; flex-wrap:wrap;">
              ${botonHabilitarTrabajo(ind)}
              ${botonHoraTrabajo(ind)}
              ${botonVerRespuestasTrabajo(ind)}
              ${botonMostrarRespuestasTrabajo(ind)}
              ${botonDiagnosticoTrabajo(ind)}
              ${botonPuntosTrabajo(ind)}
              ${botonPdfTrabajo(ind)}
              ${botonVerEntregasIndicador(ind)}
              ${botonPedirProyectoTrabajo(ind)}
              ${botonGenerarSeleccionProyecto(ind)}
              ${botonVerEntregasProyectoIndicador(ind)}
              ${linkTrabajo(ind)}
              <button class="btn secondary small" data-editar-ind="${ind.id}" type="button">✏️ Editar</button>
              <button class="btn danger small" data-del-indicador="${ind.id}">Eliminar</button>
            </span>
          </div>
          ${trabajoPorIndicador[ind.id] && trabajoPorIndicador[ind.id].tipo_actividad === "prueba" ? `<div data-hora-ind-panel="${trabajoPorIndicador[ind.id].id}"></div>` : ""}
          ${trabajoPorIndicador[ind.id] && TIPOS_CON_RETRO.includes(trabajoPorIndicador[ind.id].tipo_actividad) ? `<div data-retro-ind-panel="${trabajoPorIndicador[ind.id].id}"></div>` : ""}
          ${trabajoPorIndicador[ind.id] && TIPOS_CON_RETRO.includes(trabajoPorIndicador[ind.id].tipo_actividad) ? `<div data-diagnostico-ind-panel="${trabajoPorIndicador[ind.id].id}"></div>` : ""}
          ${trabajoPorIndicador[ind.id] && trabajoPorIndicador[ind.id].tipo_actividad === "prueba" ? `<div data-puntos-ind-panel="${trabajoPorIndicador[ind.id].id}" data-indicador-para-puntos="${ind.id}"></div>` : ""}
          <div data-editar-ind-panel="${ind.id}"></div>
          ${!trabajoPorIndicador[ind.id] ? `<div data-pedir-archivo-panel="${ind.id}"></div>` : ""}
          ${!trabajoPorIndicador[ind.id] ? `<div data-pedir-proyecto-panel="${ind.id}"></div>` : ""}
          ${!trabajoPorIndicador[ind.id] && catNombre === "Proyectos" ? `<div data-generar-su-panel="${ind.id}"></div>` : ""}
          ${trabajoPorIndicador[ind.id] && trabajoPorIndicador[ind.id].tipo_actividad === "infografia" ? `<div data-entregas-ind-panel="${trabajoPorIndicador[ind.id].id}"></div>` : ""}
          ${trabajoPorIndicador[ind.id] && trabajoPorIndicador[ind.id].tipo_actividad === "proyecto" ? `<div data-entregas-proyecto-ind-panel="${trabajoPorIndicador[ind.id].id}"></div>` : ""}
          ${esPruebaAuto ? "" : `<div style="font-size:0.85rem;">
            ${(ind.criterios_indicador || []).sort((a, b) => a.puntaje - b.puntaje).map(c => `<div><strong>${c.nivel ? c.nivel + " — " : ""}${c.puntaje} punto${c.puntaje === 1 ? "" : "s"}:</strong> ${c.descripcion}</div>`).join("")}
          </div>`}
          ${(!tieneCriterios && !esPruebaAuto) ? `
          <form class="inline-form js-criterios-form" data-indicador-criterios="${ind.id}" data-max="${ind.puntaje_maximo}" style="background:var(--paper); margin-top:0.3rem;">
            <p style="width:100%; font-size:0.8rem; color:var(--brick); margin:0 0 0.4rem;">Faltan los criterios de este indicador (con sus niveles de desempeño, según la normativa del MEP):</p>
            <div class="row" style="width:100%; margin-bottom:0.4rem;">
              <button class="btn secondary small js-generar-criterios-ia" type="button" data-indicador="${ind.id}" data-titulo="${ind.descripcion.replace(/"/g, "&quot;")}" data-max="${ind.puntaje_maximo}" data-resultado="${resultadoVinculado ? quitarHtmlResultado(resultadoVinculado).replace(/"/g, "&quot;") : ""}">✨ Generar con IA</button>
              <span class="js-generar-criterios-estado" style="font-size:0.78rem; color:var(--text-muted);"></span>
            </div>
            ${ind.puntaje_maximo === 3 ? `
              <div style="display:flex; gap:0.4rem; flex-basis:100%; align-items:center; opacity:0.7;">
                <input value="${NIVEL_CERO_NOMBRE}" disabled style="width:11rem;" />
                <input value="${NIVEL_CERO_DESCRIPCION}" disabled style="flex:1;" />
                <span style="font-size:0.72rem; color:var(--text-muted); white-space:nowrap;">0 pts — fijo</span>
              </div>` : ""}
            ${Array.from({ length: ind.puntaje_maximo }, (_, i) => i + 1).map(p => `
              <div style="display:flex; gap:0.4rem; flex-basis:100%; align-items:center;">
                <input name="nivel_${p}" value="${nombreNivelPorDefecto(p, ind.puntaje_maximo)}" placeholder="Nivel de desempeño" required style="width:11rem;" />
                <input name="criterio_${p}" placeholder="Criterio para ${p} punto${p === 1 ? "" : "s"}" required style="flex:1;" />
              </div>`).join("")}
            <button class="btn small" type="submit">Guardar criterios</button>
          </form>` : ""}
        </div>`;
      }).join("") || `<p class="empty">Sin indicadores todavía en "${catNombre}".</p>`}
    </div>

    ${esCategoriaPruebas ? `
    <div style="margin-top:1rem;">
      <button class="btn small" id="abrir-crear-prueba-materia" type="button">📝 Crear prueba</button>
      <div id="crear-prueba-materia-panel" style="margin-top:0.8rem;"></div>
    </div>` : `
    <form class="inline-form" id="indicador-form" style="margin-top:1rem;">
      <input name="letra" value="${siguienteLetra}" placeholder="Letra" required style="width:4rem;" />
      <label style="display:flex; align-items:center; gap:0.4rem; font-size:0.82rem; flex-basis:100%;">Subtema (llena el título solo):
        <select id="indicador-subtema-select" style="flex:1; min-width:14rem;">
          <option value="">— Elegir subtema (opcional) —</option>
          ${(subtemasMateria || []).map(s => `<option value="${s.id}" data-titulo="${String(s.titulo || "").replace(/"/g, "&quot;")}">${s.titulo}</option>`).join("")}
        </select>
      </label>
      <input name="descripcion" placeholder="Título del indicador (se llena solo al elegir un subtema, o escribilo a mano)" required style="flex:1; min-width:14rem" />
      <label style="display:flex; align-items:center; gap:0.4rem; font-size:0.82rem; flex-basis:100%;">Vincular a Resultado de Aprendizaje del programa (normativa MEP):
        <select name="resultado_id" style="flex:1; min-width:14rem;">
          <option value="">— Sin vincular —</option>
          ${(resultadosMateria || []).map(r => `<option value="${r.id}">${quitarHtmlResultado(r.resultado).slice(0, 90)}</option>`).join("")}
        </select>
      </label>
      <span style="font-size:0.78rem; color:var(--text-muted);">Escala fija: 0 a 3 puntos (0 = no presentado / ausencia injustificada).</span>
      <input name="fecha_evaluacion" type="date" />
      <input name="lecciones" type="number" min="1" placeholder="Lecciones (opcional)" style="width:10rem" />
      <button class="btn small" type="submit">Crear indicador</button>
    </form>`}`;

  if (catNombre === "Proyectos" && (indicadores || []).length > 0) {
    pintarProyectoIntegral(holder, materiaId, catNombre, indicadores || [], trabajoPorIndicador, temasMateria || []);
  }
  holder.querySelectorAll("[data-cat-ind]").forEach(btn => {
    btn.addEventListener("click", () => cargarIndicadoresDeMateria(materiaId, btn.dataset.catInd));
  });
  const calificarBtn = document.getElementById("calificar-todos-btn");
  if (calificarBtn) calificarBtn.addEventListener("click", () => cargarCalificarTodos(materiaId, catNombre, indicadores || []));

  const corregirLetrasBtn = document.getElementById("corregir-letras-btn");
  if (corregirLetrasBtn) corregirLetrasBtn.addEventListener("click", async () => {
    if (!confirm(`¿Reordenar las letras de los indicadores de "${catNombre}" (A, B, C… sin repetidas)? El orden se respeta tal como aparecen en la lista.`)) return;
    corregirLetrasBtn.disabled = true;
    corregirLetrasBtn.textContent = "Corrigiendo…";
    const ordenados = [...(indicadores || [])].sort((a, b) => (a.orden || 0) - (b.orden || 0));
    // Asigna A, B, C... en orden, sin huecos: se renumera todo desde cero.
    for (let i = 0; i < ordenados.length; i++) {
      let letra = "";
      let n = i;
      do {
        letra = String.fromCharCode(65 + (n % 26)) + letra;
        n = Math.floor(n / 26) - 1;
      } while (n >= 0);
      await sb.from("indicadores").update({ letra, orden: i + 1 }).eq("id", ordenados[i].id);
    }
    cargarIndicadoresDeMateria(materiaId, catNombre);
  });
  // ✏️ Editar un indicador ya creado: descripción, fecha y criterios de cada
  // nivel. No toca las notas ya puestas ni el trabajo vinculado (entrega o
  // prueba); el puntaje máximo no se cambia aquí para no descuadrar notas.
  holder.querySelectorAll("[data-editar-ind]").forEach(btn => {
    btn.addEventListener("click", () => {
      const indicadorId = btn.dataset.editarInd;
      const panel = holder.querySelector(`[data-editar-ind-panel="${indicadorId}"]`);
      if (!panel) return;
      if (panel.innerHTML.trim()) { panel.innerHTML = ""; return; }
      const ind = (indicadores || []).find(i => String(i.id) === String(indicadorId));
      if (!ind) return;
      const escA = (v) => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      const max = Number(ind.puntaje_maximo) || 3;
      const crit = {};
      (ind.criterios_indicador || []).forEach(c => { crit[c.puntaje] = c; });
      const nivelDefecto = (p) => p === 0 ? NIVEL_CERO_NOMBRE : (max === 3 ? ["", "No logrado", "En proceso", "Logrado"][p] : "");
      const descDefecto = (p) => p === 0 ? NIVEL_CERO_DESCRIPCION : "";
      panel.innerHTML = `
        <div style="background:var(--surface-soft); border-radius:8px; padding:0.8rem; margin-top:0.4rem;">
          <label style="display:block; font-size:0.82rem; margin-bottom:0.5rem;">Descripción del indicador
            <textarea data-ed-desc rows="2" style="width:100%; font-family:inherit; margin-top:0.2rem;">${escA(String(ind.descripcion || "").replace(/<[^>]*>/g, ""))}</textarea>
          </label>
          <label style="display:inline-block; font-size:0.82rem; margin-bottom:0.6rem;">Fecha de evaluación
            <input data-ed-fecha type="date" value="${escA(ind.fecha_evaluacion || "")}" style="display:block; margin-top:0.2rem;" />
          </label>
          <p style="font-size:0.82rem; font-weight:600; margin:0.2rem 0 0.4rem;">Criterios por nivel (puntaje máximo: ${max})</p>
          ${Array.from({ length: max + 1 }, (_, p) => `
            <div style="display:flex; gap:0.4rem; align-items:flex-start; margin-bottom:0.4rem; flex-wrap:wrap;">
              <span style="width:4.5rem; font-size:0.82rem; padding-top:0.4rem;">${p} punto${p === 1 ? "" : "s"}</span>
              <input data-ed-nivel="${p}" value="${escA(crit[p] ? (crit[p].nivel || "") : nivelDefecto(p))}" placeholder="Nivel" style="width:9rem;" />
              <textarea data-ed-crit="${p}" rows="2" placeholder="Criterio para ${p} punto${p === 1 ? "" : "s"}" style="flex:1; min-width:14rem; font-family:inherit;">${escA(crit[p] ? crit[p].descripcion : descDefecto(p))}</textarea>
            </div>`).join("")}
          <div class="row" style="gap:0.5rem; margin-top:0.4rem;">
            <button class="btn small" data-ed-guardar type="button">💾 Guardar cambios</button>
            <button class="btn secondary small" data-ed-cancelar type="button">Cancelar</button>
            <span data-ed-estado style="font-size:0.78rem; color:var(--text-muted);"></span>
          </div>
          <p style="font-size:0.75rem; color:var(--text-muted); margin:0.4rem 0 0;">Las notas que ya pusiste en este indicador no cambian.</p>
        </div>`;
      panel.querySelector("[data-ed-cancelar]").addEventListener("click", () => { panel.innerHTML = ""; });
      panel.querySelector("[data-ed-guardar]").addEventListener("click", async (ev) => {
        const estado = panel.querySelector("[data-ed-estado]");
        const descripcion = panel.querySelector("[data-ed-desc]").value.trim();
        if (!descripcion) { alert("La descripción no puede quedar vacía."); return; }
        const fecha = panel.querySelector("[data-ed-fecha]").value || null;
        const nuevos = [];
        for (let p = 0; p <= max; p++) {
          const d = panel.querySelector(`[data-ed-crit="${p}"]`).value.trim();
          const n = panel.querySelector(`[data-ed-nivel="${p}"]`).value.trim();
          if (d) nuevos.push({ indicador_id: Number(indicadorId), puntaje: p, nivel: n || null, descripcion: d, orden: p });
        }
        ev.target.disabled = true;
        estado.textContent = "Guardando…";
        const { error: e1 } = await sb.from("indicadores").update({ descripcion, fecha_evaluacion: fecha }).eq("id", indicadorId);
        if (e1) { estado.textContent = "No se pudo guardar: " + e1.message; ev.target.disabled = false; return; }
        const { error: e2 } = await sb.from("criterios_indicador").delete().eq("indicador_id", indicadorId);
        if (e2) { estado.textContent = "No se pudieron actualizar los criterios: " + e2.message; ev.target.disabled = false; return; }
        if (nuevos.length) {
          const { error: e3 } = await sb.from("criterios_indicador").insert(nuevos);
          if (e3) { estado.textContent = "No se pudieron guardar los criterios: " + e3.message; ev.target.disabled = false; return; }
        }
        cargarIndicadoresDeMateria(materiaId, catNombre);
      });
    });
  });
  holder.querySelectorAll("[data-del-indicador]").forEach(btn => {
    btn.addEventListener("click", async () => {
      await sb.from("indicadores").delete().eq("id", btn.dataset.delIndicador);
      cargarIndicadoresDeMateria(materiaId, catNombre);
    });
  });
  holder.querySelectorAll("[data-toggle-habilitar-prueba]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const yaHabilitada = btn.dataset.estado === "habilitado";
      if (!yaHabilitada && !confirm("¿Habilitar esta prueba para que los estudiantes puedan verla y entrar a hacerla?")) return;
      if (yaHabilitada && !confirm("¿Deshabilitar esta prueba? Los estudiantes dejarán de verla.")) return;
      await sb.from("trabajos_cotidianos").update({ habilitado: !yaHabilitada }).eq("id", btn.dataset.toggleHabilitarPrueba);
      cargarIndicadoresDeMateria(materiaId, catNombre);
    });
  });
  holder.querySelectorAll("[data-ver-retro-ind]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const trabajoId = btn.dataset.verRetroInd;
      const panel = holder.querySelector(`[data-retro-ind-panel="${trabajoId}"]`);
      if (!panel) return;
      if (panel.innerHTML) { panel.innerHTML = ""; return; }
      const t = Object.values(trabajoPorIndicador).find(x => String(x.id) === String(trabajoId));
      if (!t) return;
      panel.innerHTML = `<p style="font-size:0.82rem; color:var(--text-muted);">Cargando…</p>`;
      panel.innerHTML = await construirRetroalimentacionActividad(t);
    });
  });
  holder.querySelectorAll("[data-diagnostico-ind]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const trabajoId = btn.dataset.diagnosticoInd;
      const panel = holder.querySelector(`[data-diagnostico-ind-panel="${trabajoId}"]`);
      if (!panel) return;
      if (panel.innerHTML) { panel.innerHTML = ""; return; }
      const t = Object.values(trabajoPorIndicador).find(x => String(x.id) === String(trabajoId));
      if (!t) return;
      panel.innerHTML = `<p style="font-size:0.82rem; color:var(--text-muted);">Cargando…</p>`;
      panel.innerHTML = await construirDiagnosticoPorPregunta(t);
    });
  });
  holder.querySelectorAll("[data-puntos-ind]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const trabajoId = btn.dataset.puntosInd;
      const panel = holder.querySelector(`[data-puntos-ind-panel="${trabajoId}"]`);
      if (!panel) return;
      if (panel.innerHTML) { panel.innerHTML = ""; return; }
      const t = Object.values(trabajoPorIndicador).find(x => String(x.id) === String(trabajoId));
      const indicadorId = panel.dataset.indicadorParaPuntos;
      if (!t || !indicadorId) return;
      panel.innerHTML = `<p style="font-size:0.82rem; color:var(--text-muted);">Cargando…</p>`;
      // Solo confiamos en el total guardado si ya se usó este panel antes
      // (lo marcamos guardando peso_prueba) — si no, un indicador nuevo
      // trae puntaje_maximo=3 (escala MEP) y no debe usarse como total.
      const { data: indicadorActual } = await sb.from("indicadores").select("puntaje_maximo, peso_prueba").eq("id", indicadorId).maybeSingle();
      const yaConfigurado = indicadorActual && indicadorActual.peso_prueba !== null && indicadorActual.peso_prueba !== undefined;
      const totalGuardado = yaConfigurado ? indicadorActual.puntaje_maximo : null;
      const pesoGuardado = yaConfigurado ? indicadorActual.peso_prueba : null;
      await pintarPanelPuntosPorParte(panel, t, indicadorId, totalGuardado, pesoGuardado);
    });
  });
  holder.querySelectorAll("[data-toggle-retro-visible-ind]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const trabajoId = btn.dataset.toggleRetroVisibleInd;
      const actual = btn.dataset.estadoActual === "true";
      await sb.from("trabajos_cotidianos").update({ retro_visible: !actual }).eq("id", trabajoId);
      cargarIndicadoresDeMateria(materiaId, catNombre);
    });
  });
  holder.querySelectorAll("[data-pdf-prueba-ind]").forEach(btn => {
    btn.addEventListener("click", () => {
      const trabajoId = btn.dataset.pdfPruebaInd;
      const t = Object.values(trabajoPorIndicador).find(x => String(x.id) === String(trabajoId));
      if (!t) return;
      generarPdfPrueba(t);
    });
  });
  holder.querySelectorAll("[data-cambiar-hora-ind]").forEach(btn => {
    btn.addEventListener("click", () => {
      const trabajoId = btn.dataset.cambiarHoraInd;
      const panel = holder.querySelector(`[data-hora-ind-panel="${trabajoId}"]`);
      if (!panel) return;
      if (panel.innerHTML.trim()) { panel.innerHTML = ""; return; }
      const t = Object.values(trabajoPorIndicador).find(x => String(x.id) === String(trabajoId));
      if (!t) return;
      const valorActual = t.fecha_hora_inicio
        ? new Date(new Date(t.fecha_hora_inicio).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
        : "";
      panel.innerHTML = `
        <div class="row" style="align-items:center; margin-top:0.3rem;">
          <input type="datetime-local" data-hora-ind-input="${trabajoId}" value="${valorActual}" style="padding:0.4rem;" />
          <button class="btn small" data-guardar-hora-ind="${trabajoId}">Guardar hora</button>
          <button class="btn secondary small" data-quitar-hora-ind="${trabajoId}">Quitar hora (disponible de inmediato)</button>
        </div>`;
      panel.querySelector(`[data-guardar-hora-ind="${trabajoId}"]`).addEventListener("click", async () => {
        const input = panel.querySelector(`[data-hora-ind-input="${trabajoId}"]`);
        const nuevaHora = input && input.value ? new Date(input.value).toISOString() : null;
        await sb.from("trabajos_cotidianos").update({ fecha_hora_inicio: nuevaHora }).eq("id", trabajoId);
        cargarIndicadoresDeMateria(materiaId, catNombre);
      });
      panel.querySelector(`[data-quitar-hora-ind="${trabajoId}"]`).addEventListener("click", async () => {
        await sb.from("trabajos_cotidianos").update({ fecha_hora_inicio: null }).eq("id", trabajoId);
        cargarIndicadoresDeMateria(materiaId, catNombre);
      });
    });
  });
  // Pedirle a los estudiantes que suban un archivo (PDF/imagen) para esta
  // tarea — crea el trabajo tipo "infografia" vinculado al indicador que
  // ya existe (sin crear uno nuevo), en el subtema o tema que se elija.
  holder.querySelectorAll("[data-pedir-archivo-ind]").forEach(btn => {
    btn.addEventListener("click", () => {
      const indicadorId = btn.dataset.pedirArchivoInd;
      const panel = holder.querySelector(`[data-pedir-archivo-panel="${indicadorId}"]`);
      if (!panel) return;
      if (panel.innerHTML.trim()) { panel.innerHTML = ""; return; }
      const ind = (indicadores || []).find(i => String(i.id) === String(indicadorId));
      panel.innerHTML = `
        <div style="background:var(--surface-soft); border-radius:8px; padding:0.7rem; margin-top:0.4rem;">
          <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.5rem;">Esta entrega queda disponible directamente acá, en este indicador — no necesita estar dentro de un tema o subtema.</p>
          <textarea data-archivo-instrucciones="${indicadorId}" rows="3" placeholder="Instrucciones para el estudiante (opcional)" style="width:100%; font-family:inherit; margin-bottom:0.6rem;"></textarea>
          <button class="btn small" data-crear-archivo-ind="${indicadorId}" type="button">Pedir entrega</button>
          <button class="btn secondary small" data-cancelar-archivo-ind="${indicadorId}" type="button">Cancelar</button>
        </div>`;
      panel.querySelector(`[data-cancelar-archivo-ind="${indicadorId}"]`).addEventListener("click", () => { panel.innerHTML = ""; });
      panel.querySelector(`[data-crear-archivo-ind="${indicadorId}"]`).addEventListener("click", async (btnEv) => {
        // Criterio abierto: esta entrega no se amarra a ningún tema/subtema
        // específico — simplemente se cuelga del primer tema de la materia
        // (si existe) solo para cumplir el campo técnico; de ahí en adelante
        // el estudiante y el profesor la ven y la usan únicamente desde este
        // indicador en Notas/Rúbrica, nunca navegando por Temas.
        const publicacionId = (temasMateria || [])[0]?.id || null;
        const instrucciones = (panel.querySelector(`[data-archivo-instrucciones="${indicadorId}"]`)?.value || "").trim();
        btnEv.target.disabled = true;
        btnEv.target.textContent = "Creando…";
        const { data: nuevo, error } = await sb.from("trabajos_cotidianos").insert({
          publicacion_id: publicacionId,
          subtema_id: null,
          titulo: ind ? ind.descripcion : "Entrega de archivo",
          tipo_actividad: "infografia",
          contenido_actividad: { instrucciones }
        , indicador_id: indicadorId
        }).select().maybeSingle();
        if (!nuevo) {
          alert("No se pudo crear la entrega" + (error ? ": " + error.message : "."));
          btnEv.target.disabled = false;
          btnEv.target.textContent = "Pedir entrega";
          return;
        }
        cargarIndicadoresDeMateria(materiaId, catNombre);
      });
    });
  });
  holder.querySelectorAll("[data-ver-entregas-ind]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const trabajoId = btn.dataset.verEntregasInd;
      const panel = holder.querySelector(`[data-entregas-ind-panel="${trabajoId}"]`);
      if (!panel) return;
      if (panel.innerHTML.trim()) { panel.innerHTML = ""; return; }
      panel.innerHTML = `<p style="font-size:0.82rem; color:var(--text-muted);">Cargando entregas…</p>`;
      const t = Object.values(trabajoPorIndicador).find(x => String(x.id) === String(trabajoId));
      const ind = t ? (indicadores || []).find(i => String(i.id) === String(t.indicador_id)) : null;
      const { data: entregas } = await sb.from("actividades_estudiante").select("*").eq("trabajo_id", trabajoId).not("archivo_ruta", "is", null);
      if (!entregas || entregas.length === 0) {
        panel.innerHTML = `<p class="empty" style="font-size:0.82rem;">Todavía nadie ha entregado un archivo.</p>`;
        return;
      }
      const estudianteIds = entregas.map(e => e.estudiante_id);
      const { data: estudiantes } = await sb.from("estudiantes").select("id, nombre, apellido1, apellido2").in("id", estudianteIds);
      const nombrePorId = {};
      (estudiantes || []).forEach(e => { nombrePorId[e.id] = [e.apellido1, e.apellido2, e.nombre].filter(Boolean).join(" "); });
      panel.innerHTML = `
        <div style="background:var(--surface-soft); border-radius:8px; padding:0.7rem; margin-top:0.4rem;">
          <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.5rem;">La nota se pone arriba, en el selector de este mismo indicador (0 a ${ind ? ind.puntaje_maximo : 3}).</p>
          ${entregas
            .sort((a, b) => (nombrePorId[a.estudiante_id] || "").localeCompare(nombrePorId[b.estudiante_id] || ""))
            .map(e => {
              const { data: pub } = sb.storage.from("materiales").getPublicUrl(e.archivo_ruta);
              return `<div class="roster-row" style="padding:0.3rem 0;">
                <span class="name">${nombrePorId[e.estudiante_id] || e.estudiante_id}</span>
                <a class="btn small" href="${pub.publicUrl}" target="_blank" rel="noopener">📄 ${e.archivo_nombre || "Ver archivo"}</a>
              </div>`;
            }).join("")}
        </div>`;
    });
  });
  // Proyectos → "✨ Generar preguntas de selección única con IA": la IA
  // recibe como tema todos los demás indicadores del proyecto (descripción
  // + criterio Logrado), el profesor revisa/edita las preguntas y al crear
  // queda un trabajo tipo "prueba" (solo selección única) vinculado a este
  // indicador, deshabilitado hasta que lo habilite el día de la comprobación.
  holder.querySelectorAll("[data-generar-su-ind]").forEach(btn => {
    btn.addEventListener("click", () => {
      const indicadorId = btn.dataset.generarSuInd;
      const panel = holder.querySelector(`[data-generar-su-panel="${indicadorId}"]`);
      if (!panel) return;
      if (panel.innerHTML.trim()) { panel.innerHTML = ""; return; }
      const ind = (indicadores || []).find(i => String(i.id) === String(indicadorId));
      const otros = (indicadores || []).filter(i => String(i.id) !== String(indicadorId));
      const quitarHtml = (v) => String(v || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      const temasTexto = otros.map(i => {
        const logrado = (i.criterios_indicador || []).find(c => Number(c.puntaje) === Number(i.puntaje_maximo));
        return `${i.letra}) ${quitarHtml(i.descripcion)}${logrado ? ` (se espera: ${quitarHtml(logrado.descripcion)})` : ""}`;
      }).join("\n");
      panel.innerHTML = `
        <div style="background:var(--surface-soft); border-radius:8px; padding:0.8rem; margin-top:0.4rem;">
          <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.5rem;">La IA va a hacer preguntas de selección única sobre todos los temas de los demás indicadores del proyecto (${otros.map(i => i.letra).join(", ") || "ninguno"}). Revisá y editá las preguntas antes de crearla. Se crea <strong>deshabilitada</strong>: la habilitás desde acá el día de la comprobación, y se califica sola (85 % o más = 3, 60 % = 2, 35 % = 1).</p>
          <label style="display:block; font-size:0.82rem; margin-bottom:0.5rem;">Temas que se van a evaluar (podés editarlos)
            <textarea data-su-temas="${indicadorId}" rows="6" style="width:100%; font-family:inherit; margin-top:0.2rem;"></textarea>
          </label>
          <div class="row" style="gap:0.6rem; align-items:flex-end; flex-wrap:wrap; margin-bottom:0.5rem;">
            <label style="font-size:0.82rem;">Cantidad de preguntas
              <input data-su-cantidad="${indicadorId}" type="number" min="3" max="40" value="15" style="width:6rem; display:block; margin-top:0.2rem;" />
            </label>
            <label style="flex:1; min-width:14rem; font-size:0.82rem;">Instrucciones para la IA (opcional)
              <input data-su-instrucciones="${indicadorId}" placeholder="Ej. que la mitad sean de planillas y cesantía" style="width:100%; margin-top:0.2rem;" />
            </label>
            <button class="btn secondary small" data-su-generar="${indicadorId}" type="button">✨ Generar con IA</button>
          </div>
          <span data-su-estado="${indicadorId}" style="font-size:0.78rem; color:var(--text-muted);"></span>
          <div data-su-constructor="${indicadorId}" style="display:none; margin-top:0.6rem;"></div>
          <div class="row" style="margin-top:0.6rem; gap:0.5rem;">
            <button class="btn small" data-su-crear="${indicadorId}" type="button" disabled>Crear comprobación</button>
            <button class="btn secondary small" data-su-cancelar="${indicadorId}" type="button">Cancelar</button>
          </div>
        </div>`;
      panel.querySelector(`[data-su-temas="${indicadorId}"]`).value = temasTexto;
      const constructor = panel.querySelector(`[data-su-constructor="${indicadorId}"]`);
      const estado = panel.querySelector(`[data-su-estado="${indicadorId}"]`);
      const botonCrear = panel.querySelector(`[data-su-crear="${indicadorId}"]`);
      panel.querySelector(`[data-su-cancelar="${indicadorId}"]`).addEventListener("click", () => { panel.innerHTML = ""; });
      panel.querySelector(`[data-su-generar="${indicadorId}"]`).addEventListener("click", async (iaEv) => {
        const temas = panel.querySelector(`[data-su-temas="${indicadorId}"]`).value.trim();
        if (!temas) { alert("Escribí los temas que va a evaluar la comprobación."); return; }
        const cantidad = Math.max(3, Math.min(40, Number(panel.querySelector(`[data-su-cantidad="${indicadorId}"]`).value) || 15));
        const instrucciones = panel.querySelector(`[data-su-instrucciones="${indicadorId}"]`).value.trim().slice(0, 800);
        iaEv.target.disabled = true;
        iaEv.target.textContent = "Generando…";
        estado.textContent = `La IA está escribiendo ${cantidad} preguntas…`;
        try {
          const r = await fetch("/api/generar-actividad-ia", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              tipo: "seleccion_unica",
              tema: `Comprobación del proyecto "${ind ? quitarHtml(ind.descripcion) : "Proyecto"}". Temas: ${temas}`,
              contexto: "Repartí las preguntas de forma equilibrada entre todos los temas indicados. Son preguntas teóricas (conceptos, fundamento legal y características), sin ejercicios de cálculo. Basate en la normativa vigente de Costa Rica (Código de Trabajo, Ley de Aguinaldo, CCSS).",
              instrucciones,
              archivos: [],
              cantidad
            })
          });
          const { datos, error } = await leerRespuestaIA(r);
          if (!datos) { estado.textContent = "No se pudo generar: " + error; return; }
          if (!r.ok) { estado.textContent = "No se pudo generar: " + (datos.error || "error desconocido."); return; }
          constructor.innerHTML = construirPanelActividadHTML("prueba");
          inicializarConstructorPrueba(constructor);
          llenarPanelActividadConIA("prueba", constructor, { preguntas: (datos.contenido && datos.contenido.preguntas) || [] });
          // El constructor arranca con bloques vacíos: se quitan los que
          // sobran si la IA devolvió menos preguntas.
          const total = Array.isArray(datos.contenido && datos.contenido.preguntas) ? datos.contenido.preguntas.length : 0;
          Array.from(constructor.querySelectorAll(".au-prueba-bloque")).slice(total).forEach(b => b.remove());
          constructor.style.display = "";
          botonCrear.disabled = false;
          estado.textContent = `Listo: ${total} preguntas. Revisalas y marcá bien la respuesta correcta antes de crear la comprobación.`;
        } catch (err) {
          estado.textContent = "No se pudo conectar con la IA: " + (err.message || err);
        } finally {
          iaEv.target.disabled = false;
          iaEv.target.textContent = "✨ Generar con IA";
        }
      });
      botonCrear.addEventListener("click", async (btnEv) => {
        const resultado = leerContenidoActividadDesdeFormulario("prueba", constructor);
        if (!resultado.valido) { alert(resultado.error); return; }
        const publicacionId = (temasMateria || [])[0]?.id || null;
        if (!publicacionId) { alert("Esta materia no tiene ningún tema creado; creá uno primero para que la comprobación tenga dónde aparecer."); return; }
        const horaInicioInput = constructor.querySelector("#au-prueba-hora-inicio");
        const fechaHoraInicio = horaInicioInput && horaInicioInput.value ? new Date(horaInicioInput.value).toISOString() : null;
        btnEv.target.disabled = true;
        btnEv.target.textContent = "Creando…";
        const { data: nuevo, error } = await sb.from("trabajos_cotidianos").insert({
          publicacion_id: publicacionId,
          subtema_id: null,
          titulo: ind ? quitarHtml(ind.descripcion) : "Comprobación del proyecto",
          tipo_actividad: "prueba",
          contenido_actividad: resultado.contenido,
          indicador_id: indicadorId,
          habilitado: false,
          fecha_hora_inicio: fechaHoraInicio
        }).select().maybeSingle();
        if (!nuevo) {
          alert("No se pudo crear la comprobación" + (error ? ": " + error.message : "."));
          btnEv.target.disabled = false;
          btnEv.target.textContent = "Crear comprobación";
          return;
        }
        cargarIndicadoresDeMateria(materiaId, catNombre);
      });
    });
  });
  // Igual que "Pedir entrega de archivo", pero para una actividad tipo
  // "proyecto": título + descripción (con mínimo de caracteres opcional) +
  // archivo, con entregas ilimitadas. Útil para dividir un proyecto grande
  // en partes, cada una como su propio indicador — sin que tenga que
  // pertenecer a ningún tema o subtema del programa.
  holder.querySelectorAll("[data-pedir-proyecto-ind]").forEach(btn => {
    btn.addEventListener("click", () => {
      const indicadorId = btn.dataset.pedirProyectoInd;
      const panel = holder.querySelector(`[data-pedir-proyecto-panel="${indicadorId}"]`);
      if (!panel) return;
      if (panel.innerHTML.trim()) { panel.innerHTML = ""; return; }
      const ind = (indicadores || []).find(i => String(i.id) === String(indicadorId));
      panel.innerHTML = `
        <div style="background:var(--surface-soft); border-radius:8px; padding:0.7rem; margin-top:0.4rem;">
          <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.5rem;">El estudiante va a poder entregar un título, una descripción y un archivo, las veces que necesite. Queda disponible directo acá, en este indicador.</p>
          <textarea data-proyecto-instrucciones="${indicadorId}" rows="3" placeholder="Instrucciones para el estudiante (opcional)" style="width:100%; font-family:inherit; margin-bottom:0.6rem;"></textarea>
          <details style="margin-bottom:0.6rem;">
            <summary style="font-size:0.8rem; color:var(--text-muted); cursor:pointer;">Opciones avanzadas (opcional)</summary>
            <div style="margin-top:0.5rem;">
              <div class="row" style="gap:0.6rem; margin-bottom:0.6rem;">
                <label style="flex:1; min-width:10rem; font-size:0.82rem;">Nombre del campo "Título"
                  <input data-proyecto-placeholder-titulo="${indicadorId}" placeholder="Ej. Nombre de la ley" style="width:100%; margin-top:0.2rem;" />
                </label>
                <label style="flex:1; min-width:10rem; font-size:0.82rem;">Nombre del campo "Descripción"
                  <input data-proyecto-placeholder-descripcion="${indicadorId}" placeholder="Ej. Descripción general de la ley" style="width:100%; margin-top:0.2rem;" />
                </label>
              </div>
              <label style="display:block; font-size:0.82rem;">Mínimo de caracteres exigidos en la descripción (0 = sin mínimo)
                <input data-proyecto-min-caracteres="${indicadorId}" type="number" min="0" step="10" value="0" style="width:8rem; margin-top:0.2rem; display:block;" />
              </label>
            </div>
          </details>
          <button class="btn small" data-crear-proyecto-ind="${indicadorId}" type="button">Pedir entrega</button>
          <button class="btn secondary small" data-cancelar-proyecto-ind="${indicadorId}" type="button">Cancelar</button>
        </div>`;
      panel.querySelector(`[data-cancelar-proyecto-ind="${indicadorId}"]`).addEventListener("click", () => { panel.innerHTML = ""; });
      panel.querySelector(`[data-crear-proyecto-ind="${indicadorId}"]`).addEventListener("click", async (btnEv) => {
        const publicacionId = (temasMateria || [])[0]?.id || null;
        const instrucciones = (panel.querySelector(`[data-proyecto-instrucciones="${indicadorId}"]`)?.value || "").trim();
        const placeholder_titulo = (panel.querySelector(`[data-proyecto-placeholder-titulo="${indicadorId}"]`)?.value || "").trim();
        const placeholder_descripcion = (panel.querySelector(`[data-proyecto-placeholder-descripcion="${indicadorId}"]`)?.value || "").trim();
        const min_caracteres_descripcion = Number(panel.querySelector(`[data-proyecto-min-caracteres="${indicadorId}"]`)?.value) || 0;
        btnEv.target.disabled = true;
        btnEv.target.textContent = "Creando…";
        const { data: nuevo, error } = await sb.from("trabajos_cotidianos").insert({
          publicacion_id: publicacionId,
          subtema_id: null,
          titulo: ind ? ind.descripcion : "Entrega de proyecto",
          tipo_actividad: "proyecto",
          contenido_actividad: { instrucciones, placeholder_titulo, placeholder_descripcion, min_caracteres_descripcion }
        , indicador_id: indicadorId
        }).select().maybeSingle();
        if (!nuevo) {
          alert("No se pudo crear la entrega" + (error ? ": " + error.message : "."));
          btnEv.target.disabled = false;
          btnEv.target.textContent = "Pedir entrega";
          return;
        }
        cargarIndicadoresDeMateria(materiaId, catNombre);
      });
    });
  });
  holder.querySelectorAll("[data-ver-entregas-proyecto-ind]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const trabajoId = btn.dataset.verEntregasProyectoInd;
      const panel = holder.querySelector(`[data-entregas-proyecto-ind-panel="${trabajoId}"]`);
      if (!panel) return;
      if (panel.innerHTML.trim()) { panel.innerHTML = ""; return; }
      panel.innerHTML = `<p style="font-size:0.82rem; color:var(--text-muted);">Cargando entregas…</p>`;
      await pintarPanelEntregasProyecto(panel, trabajoId);
    });
  });
  holder.querySelectorAll("[data-vincular-resultado]").forEach(sel => {
    sel.addEventListener("change", async () => {
      if (!sel.value) return;
      await sb.from("indicadores").update({ resultado_id: Number(sel.value) }).eq("id", sel.dataset.vincularResultado);
      cargarIndicadoresDeMateria(materiaId, catNombre);
    });
  });
  holder.querySelectorAll(".js-criterios-form").forEach(form => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const max = Number(form.dataset.max);
      const criterios = [];
      if (max === 3) {
        criterios.push({ indicador_id: form.dataset.indicadorCriterios, puntaje: 0, nivel: NIVEL_CERO_NOMBRE, descripcion: NIVEL_CERO_DESCRIPCION, orden: 0 });
      }
      for (let p = 1; p <= max; p++) {
        criterios.push({ indicador_id: form.dataset.indicadorCriterios, puntaje: p, nivel: f.get(`nivel_${p}`) || null, descripcion: f.get(`criterio_${p}`), orden: p });
      }
      await sb.from("criterios_indicador").insert(criterios);
      cargarIndicadoresDeMateria(materiaId, catNombre);
    });
  });
  holder.querySelectorAll(".js-generar-criterios-ia").forEach(btn => {
    btn.addEventListener("click", async () => {
      const indicadorId = btn.dataset.indicador;
      const titulo = btn.dataset.titulo;
      const resultadoVinculado = btn.dataset.resultado || "";
      const puntajeMaximo = Number(btn.dataset.max);
      const estado = btn.parentElement.querySelector(".js-generar-criterios-estado");
      btn.disabled = true;
      btn.textContent = "Generando…";
      if (estado) estado.textContent = "";
      try {
        const { data: trabajo } = await sb.from("trabajos_cotidianos").select("descripcion").eq("indicador_id", indicadorId).maybeSingle();
        const quitarHtml = (v) => String(v || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        const contexto = [
          resultadoVinculado ? `Resultado de aprendizaje vinculado: ${resultadoVinculado}` : "",
          quitarHtml(trabajo ? trabajo.descripcion : "")
        ].filter(Boolean).join(" — ").slice(0, 1500);
        const r = await fetch("/api/generar-criterios-ia", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ titulo, contexto, puntajeMaximo })
        });
        const datos = await r.json();
        if (!r.ok) {
          if (estado) estado.textContent = "No se pudo generar: " + (datos.error || "error desconocido.");
          return;
        }
        const form = btn.closest(".js-criterios-form");
        (datos.criterios || []).forEach(c => {
          const inputCriterio = form.querySelector(`[name="criterio_${c.puntaje}"]`);
          if (inputCriterio) inputCriterio.value = c.descripcion;
          const inputNivel = form.querySelector(`[name="nivel_${c.puntaje}"]`);
          if (inputNivel && c.nivel) inputNivel.value = c.nivel;
        });
        if (datos.descripcion) {
          await sb.from("indicadores").update({ descripcion: datos.descripcion }).eq("id", indicadorId);
          const descSpan = btn.closest(".roster-row")?.querySelector(".ind-descripcion-text");
          if (descSpan) descSpan.textContent = datos.descripcion;
        }
        if (estado) estado.textContent = "Listo — revisá la descripción, los criterios y niveles, y dale \"Guardar criterios\".";
      } catch (err) {
        if (estado) estado.textContent = "No se pudo conectar con la IA: " + (err.message || err);
      } finally {
        btn.disabled = false;
        btn.textContent = "✨ Generar con IA";
      }
    });
  });
  const subtemaSelect = document.getElementById("indicador-subtema-select");
  if (subtemaSelect) subtemaSelect.addEventListener("change", () => {
    const opt = subtemaSelect.selectedOptions[0];
    const descInput = document.querySelector('#indicador-form [name="descripcion"]');
    if (opt && opt.dataset.titulo && descInput) descInput.value = opt.dataset.titulo;
  });
  const form = document.getElementById("indicador-form");
  if (form) form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    await sb.from("indicadores").insert({
      materia_id: materiaId,
      categoria: catNombre,
      letra: f.get("letra"),
      descripcion: f.get("descripcion"),
      resultado_id: f.get("resultado_id") || null,
      puntaje_maximo: 3, // escala fija del MEP: 0 (fijo) a 3 (niveles de desempeño)
      fecha_evaluacion: f.get("fecha_evaluacion") || null,
      lecciones: f.get("lecciones") ? Number(f.get("lecciones")) : null,
      orden: (indicadores || []).length + 1
    });
    cargarIndicadoresDeMateria(materiaId, catNombre);
  });

  const abrirPruebaBtn = document.getElementById("abrir-crear-prueba-materia");
  if (abrirPruebaBtn) abrirPruebaBtn.addEventListener("click", () => {
    const panel = document.getElementById("crear-prueba-materia-panel");
    if (!panel) return;
    panel.innerHTML = `
      <div style="background:var(--surface); border:1px solid var(--paper-line); border-radius:10px; padding:1rem;">
        <div class="row" style="margin-bottom:0.6rem;">
          <input id="prueba-materia-titulo" placeholder="Título de la prueba" style="flex:1; min-width:12rem" />
          <input id="prueba-materia-fecha" type="date" />
        </div>
        <label style="display:flex; align-items:center; gap:0.4rem; font-size:0.82rem; margin-bottom:0.4rem; flex-wrap:wrap;">Subtema donde va a aparecer (opcional):
          <select id="prueba-materia-subtema" style="flex:1; min-width:14rem;">
            <option value="">— Sin subtema —</option>
            ${(subtemasMateria || []).map(s => `<option value="${s.id}" data-pub="${s.publicacion_id}">${s.titulo}</option>`).join("")}
          </select>
        </label>
        <label style="display:flex; align-items:center; gap:0.4rem; font-size:0.82rem; margin-bottom:0.8rem; flex-wrap:wrap;">Si no eligió subtema, tema donde va a quedar como trabajo general:
          <select id="prueba-materia-tema" style="flex:1; min-width:14rem;">
            <option value="">— Elegir tema —</option>
            ${(temasMateria || []).map(t => `<option value="${t.id}">${t.titulo}</option>`).join("")}
          </select>
        </label>
        <div style="margin-bottom:0.6rem;">
          <label for="prueba-materia-ia-archivo" style="font-size:0.82rem; color:var(--text-muted); display:block; margin-bottom:0.3rem;">Subir uno o varios Word (.docx), PDF o imágenes con la prueba ya hecha, para que la IA la digitalice usando toda la información junta (revisá y marcá las respuestas correctas después — el documento no las trae)</label>
          <input type="file" id="prueba-materia-ia-archivo" accept=".pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/gif,image/webp" multiple style="display:block; margin-bottom:0.5rem;" />
          <button class="btn secondary small" id="prueba-materia-ia-btn" type="button">✨ Digitalizar con IA</button>
          <span id="prueba-materia-ia-estado" style="font-size:0.78rem; color:var(--text-muted);"></span>
        </div>
        <div id="prueba-materia-constructor">${construirPanelActividadHTML("prueba")}</div>
        <div class="row" style="margin-top:1rem;">
          <button class="btn small" id="guardar-prueba-materia" type="button">Crear prueba</button>
          <button class="btn secondary small" id="cancelar-prueba-materia" type="button">Cancelar</button>
        </div>
      </div>`;
    inicializarConstructorPrueba(panel.querySelector("#prueba-materia-constructor"));

    panel.querySelector("#cancelar-prueba-materia").addEventListener("click", () => { panel.innerHTML = ""; });

    panel.querySelector("#prueba-materia-ia-btn").addEventListener("click", async (iaEv) => {
      const estado = panel.querySelector("#prueba-materia-ia-estado");
      const tema = panel.querySelector("#prueba-materia-titulo").value.trim();
      if (!tema) { alert("Ponele un título a la prueba primero, para que la IA sepa qué estás subiendo."); return; }
      const archivoInput = panel.querySelector("#prueba-materia-ia-archivo");
      const archivos = archivoInput ? Array.from(archivoInput.files || []) : [];
      if (!archivos.length) { alert("Elegí primero el o los archivos (Word, PDF o imagen) de la prueba."); return; }
      if (archivosExcedenLimiteIA(archivos)) {
        if (estado) estado.textContent = "Los archivos pesan demasiado en conjunto (máximo ~3MB entre todos). Probá con menos archivos o más livianos.";
        return;
      }
      iaEv.target.disabled = true;
      iaEv.target.textContent = "Digitalizando…";
      if (estado) estado.textContent = "";
      try {
        const leerComoBase64 = (f) => new Promise((resolve, reject) => {
          const lector = new FileReader();
          lector.onload = () => resolve(String(lector.result).split(",")[1] || "");
          lector.onerror = () => reject(new Error("No se pudo leer el archivo."));
          lector.readAsDataURL(f);
        });
        if (estado) estado.textContent = archivos.length > 1 ? `Leyendo ${archivos.length} archivos…` : "Leyendo el archivo…";
        const archivosPayload = await Promise.all(archivos.map(async (a) => ({ mimeType: a.type, nombre: a.name, datosBase64: await leerComoBase64(a) })));
        if (estado) estado.textContent = "La IA está leyendo la prueba…";
        const r = await fetch("/api/generar-actividad-ia", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ tipo: "prueba", tema, contexto: "", instrucciones: "", archivos: archivosPayload })
        });
        const { datos, error } = await leerRespuestaIA(r);
        if (!datos) { if (estado) estado.textContent = "No se pudo digitalizar: " + error; return; }
        if (!r.ok) { if (estado) estado.textContent = "No se pudo digitalizar: " + (datos.error || "error desconocido."); return; }
        llenarPanelActividadConIA("prueba", panel.querySelector("#prueba-materia-constructor"), datos.contenido);
        if (estado) estado.textContent = "Listo — revisá el contenido y marcá bien las respuestas correctas antes de crear la prueba.";
      } catch (err) {
        if (estado) estado.textContent = "No se pudo conectar con la IA: " + (err.message || err);
      } finally {
        iaEv.target.disabled = false;
        iaEv.target.textContent = "✨ Digitalizar con IA";
      }
    });

    panel.querySelector("#guardar-prueba-materia").addEventListener("click", async (btnEv) => {
      const titulo = panel.querySelector("#prueba-materia-titulo").value.trim();
      const fecha = panel.querySelector("#prueba-materia-fecha").value || null;
      const subtemaSel = panel.querySelector("#prueba-materia-subtema");
      const subtemaId = subtemaSel.value || null;
      const temaSel = panel.querySelector("#prueba-materia-tema");
      const temaId = temaSel.value || null;
      if (!titulo) { alert("Ponele un título a la prueba."); return; }
      let publicacionId = subtemaId ? subtemaSel.selectedOptions[0]?.dataset.pub : temaId;
      if (!publicacionId) { alert("Elegí el subtema, o el tema (si no va a tener subtema), donde va a aparecer esta prueba."); return; }
      const resultado = leerContenidoActividadDesdeFormulario("prueba", panel.querySelector("#prueba-materia-constructor"));
      if (!resultado.valido) { alert(resultado.error); return; }
      const horaInicioInput = panel.querySelector("#au-prueba-hora-inicio");
      const fechaHoraInicio = horaInicioInput && horaInicioInput.value ? new Date(horaInicioInput.value).toISOString() : null;
      btnEv.target.disabled = true;
      btnEv.target.textContent = "Creando…";
      const indicadorId = await crearIndicadorParaTrabajo(materiaId, titulo, fecha, 3, "Pruebas");
      const { data: nuevo, error } = await sb.from("trabajos_cotidianos").insert({
        publicacion_id: publicacionId,
        subtema_id: subtemaId,
        titulo,
        fecha,
        tipo_actividad: "prueba",
        contenido_actividad: resultado.contenido,
        indicador_id: indicadorId,
        fecha_hora_inicio: fechaHoraInicio
      }).select().maybeSingle();
      if (!nuevo) {
        alert("No se pudo crear la prueba" + (error ? ": " + error.message : "."));
        btnEv.target.disabled = false;
        btnEv.target.textContent = "Crear prueba";
        return;
      }
      cargarIndicadoresDeMateria(materiaId, catNombre);
    });
  });
}

// --- Proyecto integral (solo en Rúbrica y Evaluaciones → Proyectos) ---
// Junta en un solo lugar los tres pasos de un proyecto que se entrega en UN
// documento y se evalúa de forma integral:
//   1. Entrega del documento (trabajo tipo "proyecto" vinculado a un indicador)
//   2. Preguntas de la comprobación (prueba de selección única generada con IA)
//   3. Evaluación según criterios: la IA lee el documento de cada estudiante y
//      propone el puntaje de cada indicador; el profesor revisa y guarda.
async function pintarProyectoIntegral(holder, materiaId, catNombre, indicadores, trabajoPorIndicador, temasMateria) {
  const cont = holder.querySelector("#proyecto-integral-holder");
  if (!cont) return;
  const esc = (v) => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const quitarHtml = (v) => String(v || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const tipoDe = (ind) => trabajoPorIndicador[ind.id] ? trabajoPorIndicador[ind.id].tipo_actividad : null;

  const indEntrega = indicadores.find(i => tipoDe(i) === "proyecto") || null;
  const trabajoEntrega = indEntrega ? trabajoPorIndicador[indEntrega.id] : null;
  const indComprobacion = indicadores.find(i => tipoDe(i) === "prueba") || null;
  const trabajoComprobacion = indComprobacion ? trabajoPorIndicador[indComprobacion.id] : null;
  const indLibres = indicadores.filter(i => !trabajoPorIndicador[i.id]);
  // El documento se evalúa con todos los indicadores menos la comprobación
  // (la prueba, o un indicador "Comprobación…" que todavía no tiene prueba).
  const esComprobacion = (i) => tipoDe(i) === "prueba" || /comprobaci[oó]n/i.test(quitarHtml(i.descripcion));
  const indEvaluables = indicadores.filter(i => !esComprobacion(i));

  const { data: materia } = await sb.from("materias").select("*").eq("id", materiaId).maybeSingle();
  const { data: estudiantes } = materia
    ? await sb.from("estudiantes").select("id, nombre, apellido1, apellido2").eq("seccion", materia.seccion).order("apellido1").order("apellido2")
    : { data: [] };
  const listaEst = estudiantes || [];
  const { data: entregas } = trabajoEntrega
    ? await sb.from("proyecto_entregas").select("*").eq("trabajo_id", trabajoEntrega.id).order("creado_en", { ascending: false })
    : { data: [] };
  const ultimaPorEst = {};
  (entregas || []).forEach(e => { if (!ultimaPorEst[e.estudiante_id]) ultimaPorEst[e.estudiante_id] = e; });
  const { data: calificaciones } = indEvaluables.length && listaEst.length
    ? await sb.from("calificaciones_indicador").select("*").in("indicador_id", indEvaluables.map(i => i.id)).in("estudiante_id", listaEst.map(s => s.id))
    : { data: [] };
  const nota = {};
  (calificaciones || []).forEach(c => { nota[`${c.estudiante_id}-${c.indicador_id}`] = c.puntaje_obtenido; });
  const entregaron = listaEst.filter(s => ultimaPorEst[s.id]).length;
  const nombre = (s) => `${s.apellido1 || ""} ${s.apellido2 || ""}, ${s.nombre || ""}`.trim();
  const cajaEstilo = "background:var(--paper); border:1px solid var(--paper-line); border-radius:10px; padding:0.9rem; margin-bottom:0.8rem;";

  // 1. Entrega
  const instruccionesActuales = trabajoEntrega ? ((trabajoEntrega.contenido_actividad || {}).instrucciones || "") : "";
  const tarjeta1 = trabajoEntrega ? `
    <p style="font-size:0.85rem; margin:0 0 0.5rem;">Los estudiantes suben su documento en el indicador <strong>${esc(indEntrega.letra)}</strong> («${esc(quitarHtml(trabajoEntrega.titulo || indEntrega.descripcion))}»). <span class="badge">${entregaron} de ${listaEst.length} entregaron</span></p>
    <label style="display:block; font-size:0.82rem;">Instrucciones que ven los estudiantes
      <textarea data-pi-instrucciones rows="4" style="width:100%; font-family:inherit; margin-top:0.2rem;">${esc(instruccionesActuales)}</textarea>
    </label>
    <div class="row" style="gap:0.5rem; margin-top:0.4rem; flex-wrap:wrap;">
      <button class="btn secondary small" data-pi-guardar-instrucciones type="button">💾 Guardar instrucciones</button>
      <button class="btn secondary small" data-pi-ver-entregas type="button">📂 Ver entregas</button>
      <span data-pi-estado1 style="font-size:0.78rem; color:var(--text-muted);"></span>
    </div>
    <div data-pi-entregas-panel style="margin-top:0.5rem;"></div>` : (indLibres.length ? `
    <p style="font-size:0.85rem; margin:0 0 0.5rem;">Todavía no hay un apartado de entrega. Escribí las instrucciones y elegí en qué indicador queda.</p>
    <textarea data-pi-nuevas-instrucciones rows="4" placeholder="Ej. Subí en un solo documento PDF la investigación completa…" style="width:100%; font-family:inherit;"></textarea>
    <div class="row" style="gap:0.5rem; margin-top:0.4rem; flex-wrap:wrap; align-items:center;">
      <select data-pi-ind-entrega>${indLibres.map(i => `<option value="${i.id}">${esc(i.letra)}: ${esc(quitarHtml(i.descripcion).slice(0, 60))}</option>`).join("")}</select>
      <button class="btn small" data-pi-crear-entrega type="button">📎 Habilitar entrega</button>
    </div>` : `<p class="empty">Todos los indicadores ya tienen un trabajo vinculado; agregá un indicador para la entrega.</p>`);

  // 2. Comprobación
  const nPreguntas = trabajoComprobacion && trabajoComprobacion.contenido_actividad && Array.isArray(trabajoComprobacion.contenido_actividad.preguntas) ? trabajoComprobacion.contenido_actividad.preguntas.length : 0;
  const compHabilitada = trabajoComprobacion && trabajoComprobacion.habilitado !== false;
  const tarjeta2 = trabajoComprobacion ? `
    <p style="font-size:0.85rem; margin:0 0 0.5rem;">La comprobación está en el indicador <strong>${esc(indComprobacion.letra)}</strong>: ${nPreguntas} preguntas · ${compHabilitada ? "✅ habilitada para los estudiantes" : "🔒 deshabilitada (los estudiantes no la ven)"}.</p>
    <button class="btn ${compHabilitada ? "secondary" : ""} small" data-pi-toggle-comp="${trabajoComprobacion.id}" data-estado="${compHabilitada ? "habilitado" : "deshabilitado"}" type="button">${compHabilitada ? "Deshabilitar" : "Habilitar"}</button>
    <button class="btn ${trabajoComprobacion.retro_visible ? "" : "secondary"} small" data-pi-toggle-resp="${trabajoComprobacion.id}" data-estado="${trabajoComprobacion.retro_visible ? "visible" : "oculto"}" type="button">${trabajoComprobacion.retro_visible ? "🔒 Ocultar respuestas correctas" : "🔓 Mostrar respuestas correctas a los estudiantes"}</button>
    <span style="font-size:0.78rem; color:var(--text-muted); margin-left:0.4rem;">Para cambiar las preguntas o la hora, usá la tarjeta del indicador ${esc(indComprobacion.letra)} más abajo.</span>` : (indLibres.length ? `
    <p style="font-size:0.85rem; margin:0 0 0.5rem;">Generá con IA las preguntas de selección única sobre todos los temas del proyecto. Elegí en qué indicador queda la comprobación.</p>
    <div class="row" style="gap:0.5rem; flex-wrap:wrap; align-items:center;">
      <select data-pi-ind-comp>${indLibres.map((i, k) => `<option value="${i.id}" ${k === indLibres.length - 1 ? "selected" : ""}>${esc(i.letra)}: ${esc(quitarHtml(i.descripcion).slice(0, 60))}</option>`).join("")}</select>
      <button class="btn small" data-pi-generar-preguntas type="button">✨ Generar preguntas</button>
    </div>` : `<p class="empty">Todos los indicadores ya tienen un trabajo vinculado; agregá un indicador para la comprobación.</p>`);

  // 3. Evaluación según criterios
  const retroVisible = !!(trabajoEntrega && trabajoEntrega.contenido_actividad && trabajoEntrega.contenido_actividad.retro_proyecto_visible);
  const opciones = (max, actual) => `<option value="">—</option>` + Array.from({ length: max + 1 }, (_, p) => `<option value="${p}" ${actual !== undefined && actual !== null && Number(actual) === p ? "selected" : ""}>${p}</option>`).join("");
  const tarjeta3 = indEvaluables.length ? `
    <p style="font-size:0.85rem; margin:0 0 0.5rem;">La IA actúa como evaluador riguroso: lee el documento de cada estudiante y lo califica solo con la rúbrica de los indicadores ${indEvaluables.map(i => esc(i.letra)).join(", ")} y con lo que está escrito en el trabajo. Para cada estudiante arma un dictamen con tabla resumen, justificación y oportunidad de mejora por criterio, y nota final. Revisá, cambiá lo que no te convenza y tocá <strong>Guardar notas</strong>: nada se guarda solo.</p>
    <div class="row" style="gap:0.5rem; flex-wrap:wrap; align-items:center; margin-bottom:0.5rem;">
      ${trabajoEntrega ? `<button class="btn small" data-pi-evaluar-todos type="button">🤖 Evaluar con IA a quienes entregaron y no tienen nota</button>` : ""}
      <button class="btn secondary small" data-pi-guardar-notas type="button">💾 Guardar notas</button>
      ${trabajoEntrega ? `<button class="btn ${retroVisible ? "" : "secondary"} small" data-pi-toggle-retro type="button">${retroVisible ? "🙈 Ocultar retroalimentación a los estudiantes" : "👁 Mostrar retroalimentación a los estudiantes"}</button>` : ""}
      <span data-pi-estado3 style="font-size:0.78rem; color:var(--text-muted);"></span>
    </div>
    <div style="overflow-x:auto;">
      <table class="grades" style="width:100%; font-size:0.82rem;">
        <thead><tr><th>Estudiante</th><th>Documento</th>${indEvaluables.map(i => `<th title="${esc(quitarHtml(i.descripcion))}">${esc(i.letra)}</th>`).join("")}<th></th></tr></thead>
        <tbody>
          ${listaEst.map(s => {
            const e = ultimaPorEst[s.id];
            return `<tr data-pi-fila="${s.id}">
              <td>${esc(nombre(s))}</td>
              <td>${e ? `✓ ${esc(e.archivo_nombre || "archivo")}` : `<span style="color:var(--text-muted);">Sin entrega</span>`}</td>
              ${indEvaluables.map(i => `<td><select data-pi-nota data-est="${s.id}" data-ind="${i.id}" data-letra="${esc(i.letra)}">${opciones(Number(i.puntaje_maximo) || 3, nota[`${s.id}-${i.id}`])}</select></td>`).join("")}
              <td>${e ? `<button class="btn secondary small" data-pi-evaluar="${s.id}" type="button">🤖 Evaluar</button>` : ""}</td>
            </tr>
            <tr data-pi-justif="${s.id}" style="display:none;"><td colspan="${indEvaluables.length + 3}" style="background:var(--surface-soft); font-size:0.8rem;"></td></tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>` : `<p class="empty">No hay indicadores para evaluar.</p>`;

  cont.innerHTML = `
    <div style="border:2px solid var(--paper-line); border-radius:12px; padding:0.9rem; background:var(--surface-soft);">
      <h4 style="margin:0 0 0.7rem;">📘 Proyecto integral</h4>
      <div style="${cajaEstilo}"><h5 style="margin:0 0 0.5rem;">1. Entrega del documento</h5>${tarjeta1}</div>
      <div style="${cajaEstilo}"><h5 style="margin:0 0 0.5rem;">2. Preguntas de la comprobación</h5>${tarjeta2}</div>
      <div style="${cajaEstilo} margin-bottom:0;"><h5 style="margin:0 0 0.5rem;">3. Evaluación según criterios</h5>${tarjeta3}</div>
    </div>`;

  // --- 1. Entrega ---
  const btnGuardarInstr = cont.querySelector("[data-pi-guardar-instrucciones]");
  if (btnGuardarInstr) btnGuardarInstr.addEventListener("click", async () => {
    const estado = cont.querySelector("[data-pi-estado1]");
    const instrucciones = cont.querySelector("[data-pi-instrucciones]").value.trim();
    const nuevo = { ...(trabajoEntrega.contenido_actividad || {}), instrucciones };
    const { error } = await sb.from("trabajos_cotidianos").update({ contenido_actividad: nuevo }).eq("id", trabajoEntrega.id);
    trabajoEntrega.contenido_actividad = nuevo;
    estado.textContent = error ? "No se pudo guardar: " + error.message : "✓ Instrucciones guardadas.";
  });
  const btnVerEntregas = cont.querySelector("[data-pi-ver-entregas]");
  if (btnVerEntregas) btnVerEntregas.addEventListener("click", async () => {
    const panel = cont.querySelector("[data-pi-entregas-panel]");
    if (panel.innerHTML.trim()) { panel.innerHTML = ""; return; }
    panel.innerHTML = `<p style="font-size:0.82rem; color:var(--text-muted);">Cargando entregas…</p>`;
    await pintarPanelEntregasProyecto(panel, trabajoEntrega.id);
  });
  const btnCrearEntrega = cont.querySelector("[data-pi-crear-entrega]");
  if (btnCrearEntrega) btnCrearEntrega.addEventListener("click", async () => {
    const indicadorId = cont.querySelector("[data-pi-ind-entrega]").value;
    const ind = indicadores.find(i => String(i.id) === String(indicadorId));
    const instrucciones = cont.querySelector("[data-pi-nuevas-instrucciones]").value.trim();
    const publicacionId = (temasMateria || [])[0]?.id || null;
    btnCrearEntrega.disabled = true;
    const { error } = await sb.from("trabajos_cotidianos").insert({
      publicacion_id: publicacionId,
      subtema_id: null,
      titulo: ind ? quitarHtml(ind.descripcion) : "Entrega del proyecto",
      tipo_actividad: "proyecto",
      contenido_actividad: { instrucciones, placeholder_titulo: "Título del proyecto", placeholder_descripcion: "Breve descripción de lo que entregás", min_caracteres_descripcion: 0 },
      indicador_id: indicadorId
    });
    if (error) { alert("No se pudo habilitar la entrega: " + error.message); btnCrearEntrega.disabled = false; return; }
    cargarIndicadoresDeMateria(materiaId, catNombre);
  });

  // --- 2. Comprobación ---
  const btnGenerar = cont.querySelector("[data-pi-generar-preguntas]");
  if (btnGenerar) btnGenerar.addEventListener("click", () => {
    const indicadorId = cont.querySelector("[data-pi-ind-comp]").value;
    const boton = holder.querySelector(`[data-generar-su-ind="${indicadorId}"]`);
    const panel = holder.querySelector(`[data-generar-su-panel="${indicadorId}"]`);
    if (!boton || !panel) { alert("No se encontró el indicador elegido."); return; }
    if (!panel.innerHTML.trim()) boton.click();
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  const btnToggleComp = cont.querySelector("[data-pi-toggle-comp]");
  if (btnToggleComp) btnToggleComp.addEventListener("click", async () => {
    const yaHabilitada = btnToggleComp.dataset.estado === "habilitado";
    if (!confirm(yaHabilitada ? "¿Deshabilitar la comprobación? Los estudiantes dejarán de verla." : "¿Habilitar la comprobación para que los estudiantes puedan hacerla?")) return;
    await sb.from("trabajos_cotidianos").update({ habilitado: !yaHabilitada }).eq("id", btnToggleComp.dataset.piToggleComp);
    cargarIndicadoresDeMateria(materiaId, catNombre);
  });

  const btnToggleResp = cont.querySelector("[data-pi-toggle-resp]");
  if (btnToggleResp) btnToggleResp.addEventListener("click", async () => {
    const visible = btnToggleResp.dataset.estado === "visible";
    if (!confirm(visible ? "¿Ocultar las respuestas correctas de la comprobación?" : "¿Mostrar a cada estudiante sus respuestas de la comprobación junto con las correctas? Solo lo ven quienes ya la hicieron.")) return;
    await sb.from("trabajos_cotidianos").update({ retro_visible: !visible }).eq("id", btnToggleResp.dataset.piToggleResp);
    cargarIndicadoresDeMateria(materiaId, catNombre);
  });

  // --- 3. Evaluación según criterios ---
  const btnToggleRetro = cont.querySelector("[data-pi-toggle-retro]");
  if (btnToggleRetro) btnToggleRetro.addEventListener("click", async () => {
    if (!confirm(retroVisible ? "¿Ocultar la retroalimentación del proyecto a los estudiantes?" : "¿Mostrar a cada estudiante, en su perfil, su nota por criterio y la retroalimentación del dictamen? Solo aparece a quienes ya tienen notas guardadas.")) return;
    const { data: fresco } = await sb.from("trabajos_cotidianos").select("contenido_actividad").eq("id", trabajoEntrega.id).maybeSingle();
    const ca = { ...((fresco && fresco.contenido_actividad) || trabajoEntrega.contenido_actividad || {}), retro_proyecto_visible: !retroVisible };
    const { error } = await sb.from("trabajos_cotidianos").update({ contenido_actividad: ca }).eq("id", trabajoEntrega.id);
    if (error) { alert("No se pudo cambiar: " + error.message); return; }
    cargarIndicadoresDeMateria(materiaId, catNombre);
  });
  cont.querySelectorAll("[data-pi-nota]").forEach(sel => sel.addEventListener("change", () => { sel.dataset.cambio = "1"; sel.style.outline = "2px solid var(--brick)"; }));

  const inferirMime = (nombreArchivo, tipo) => {
    if (tipo && tipo !== "application/octet-stream") return tipo;
    const ext = String(nombreArchivo || "").toLowerCase().split(".").pop();
    return ({ pdf: "application/pdf", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" })[ext] || tipo || "";
  };
  const indicadoresParaIA = indEvaluables.map(i => ({
    letra: i.letra,
    descripcion: quitarHtml(i.descripcion),
    maximo: Number(i.puntaje_maximo) || 3,
    criterios: (i.criterios_indicador || []).map(c => ({ puntaje: c.puntaje, nivel: c.nivel || "", descripcion: quitarHtml(c.descripcion) }))
  }));

  // Muestra (o borra) el motivo por el que no se pudo evaluar a un estudiante,
  // en su propia fila, para saber qué hacer con cada uno.
  function mostrarErrorFila(estId, mensaje) {
    const filaJ = cont.querySelector(`[data-pi-justif="${estId}"]`);
    if (!filaJ) return;
    filaJ.style.display = mensaje ? "" : "none";
    filaJ.firstElementChild.innerHTML = mensaje ? `<span style="color:var(--brick);">⚠️ No se pudo evaluar: ${esc(mensaje)}</span>` : "";
  }
  const esperar = (ms) => new Promise(r => setTimeout(r, ms));

  async function evaluarEstudiante(estId, alAvisar) {
    const e = ultimaPorEst[estId];
    if (!e || !e.archivo_ruta) throw new Error("No tiene un archivo entregado.");
    const { data: pub } = sb.storage.from("materiales").getPublicUrl(e.archivo_ruta);
    // Solo se pide el tipo del archivo (no se descarga): la IA lo lee directo
    // desde el enlace, así no importa cuánto pese.
    let tipo = "";
    try { const h = await fetch(pub.publicUrl, { method: "HEAD" }); tipo = h.headers.get("content-type") || ""; } catch { tipo = ""; }
    const mimeType = inferirMime(e.archivo_nombre, tipo.split(";")[0].trim());
    let r, datos, error;
    for (let intento = 1; intento <= 4; intento++) {
      r = await fetch("/api/evaluar-proyecto-criterios", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          instrucciones: (trabajoEntrega.contenido_actividad || {}).instrucciones || "",
          titulo: e.titulo, descripcion: e.descripcion,
          indicadores: indicadoresParaIA,
          archivo: { mimeType, url: pub.publicUrl, nombre: e.archivo_nombre }
        })
      });
      ({ datos, error } = await leerRespuestaIA(r));
      const temporal = r.status === 503 || r.status === 429 || r.status === 504;
      if (!temporal || intento === 4) break;
      if (alAvisar) alAvisar(`la IA está ocupada, reintento ${intento} de 3 en 20 segundos…`);
      await esperar(20000);
    }
    if (!datos || !r.ok) {
      const msg = error || (datos && datos.error) || (r.status === 504 ? "La IA tardó demasiado en leer el documento (es muy largo o pesado)." : "error desconocido");
      throw new Error(msg);
    }
    mostrarErrorFila(estId, "");
    const res = datos.contenido || {};
    await guardarPropuesta(estId, e, res);
    mostrarPropuesta(estId, res);
  }

  // Las propuestas de la IA se guardan (como PROPUESTA, no como nota) dentro
  // del trabajo de entrega, en contenido_actividad.evaluaciones_ia, para que
  // no se pierdan al recargar. Se vuelven a mostrar mientras ese estudiante no
  // tenga notas guardadas y no haya subido un documento nuevo.
  async function guardarPropuesta(estId, entrega, res) {
    try {
      const { data: fresco } = await sb.from("trabajos_cotidianos").select("contenido_actividad").eq("id", trabajoEntrega.id).maybeSingle();
      const ca = { ...((fresco && fresco.contenido_actividad) || trabajoEntrega.contenido_actividad || {}) };
      ca.evaluaciones_ia = { ...(ca.evaluaciones_ia || {}), [estId]: { ...res, entrega_id: entrega.id, fecha: new Date().toISOString() } };
      await sb.from("trabajos_cotidianos").update({ contenido_actividad: ca }).eq("id", trabajoEntrega.id);
      trabajoEntrega.contenido_actividad = ca;
    } catch (err) { console.error("No se pudo guardar la propuesta de la IA:", err); }
  }

  function mostrarPropuesta(estId, res) {
    (res.indicadores || []).forEach(x => {
      const sel = cont.querySelector(`[data-pi-nota][data-est="${estId}"][data-letra="${CSS.escape(String(x.letra))}"]`);
      if (sel) { sel.value = String(x.puntaje); sel.dataset.cambio = "1"; sel.style.outline = "2px solid var(--brick)"; }
    });
    const filaJ = cont.querySelector(`[data-pi-justif="${estId}"]`);
    if (filaJ) {
      filaJ.style.display = "";
      filaJ.firstElementChild.innerHTML = dictamenHTML(estId, res);
      const btnCopiar = filaJ.querySelector("[data-pi-copiar]");
      if (btnCopiar) btnCopiar.addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(dictamenTexto(estId, res)); btnCopiar.textContent = "✓ Copiado"; }
        catch { btnCopiar.textContent = "No se pudo copiar"; }
      });
    }
  }

  // Dictamen con el formato del profesor: tabla resumen, justificación
  // detallada por criterio (con evidencia y oportunidad de mejora) y nota final.
  const porLetra = {};
  indEvaluables.forEach(i => { porLetra[i.letra] = i; });
  const nivelDe = (x) => {
    if (x.nivel) return x.nivel;
    const i = porLetra[x.letra];
    const c = i && (i.criterios_indicador || []).find(cc => Number(cc.puntaje) === Number(x.puntaje));
    return c && c.nivel ? c.nivel : "";
  };
  const totales = (res) => {
    const lista = res.indicadores || [];
    const obtenido = lista.reduce((a, x) => a + (Number(x.puntaje) || 0), 0);
    const maximo = indEvaluables.reduce((a, i) => a + (Number(i.puntaje_maximo) || 3), 0);
    return { obtenido, maximo, pct: maximo ? Math.round((obtenido / maximo) * 1000) / 10 : 0 };
  };
  function dictamenHTML(estId, res) {
    const s = listaEst.find(x => x.id === estId);
    const lista = res.indicadores || [];
    const t = totales(res);
    return `
      <div style="padding:0.4rem 0.2rem;">
        <p style="margin:0 0 0.4rem;"><strong>Dictamen de evaluación${s ? ` · ${esc(nombre(s))}` : ""}</strong> <span style="color:var(--brick);">(propuesta de la IA: revisala y tocá «Guardar notas»)</span></p>
        <p style="margin:0 0 0.2rem; font-weight:600;">1. Tabla resumen</p>
        <table class="grades" style="width:100%; font-size:0.8rem; margin-bottom:0.6rem;">
          <thead><tr><th>Criterio</th><th>Puntaje máximo</th><th>Puntaje obtenido</th><th>Nivel alcanzado</th></tr></thead>
          <tbody>${lista.map(x => `<tr><td>${esc(x.letra)}: ${esc(quitarHtml(porLetra[x.letra] ? porLetra[x.letra].descripcion : ""))}</td><td>${esc(porLetra[x.letra] ? porLetra[x.letra].puntaje_maximo : 3)}</td><td>${esc(x.puntaje)}</td><td>${esc(nivelDe(x))}</td></tr>`).join("")}
            <tr><td><strong>Total</strong></td><td><strong>${t.maximo}</strong></td><td><strong>${t.obtenido}</strong></td><td><strong>${t.pct} %</strong></td></tr></tbody>
        </table>
        <p style="margin:0 0 0.2rem; font-weight:600;">2. Justificación detallada por criterio</p>
        ${lista.map(x => `
          <div style="margin:0 0 0.5rem 0.4rem;">
            <div><strong>Criterio ${esc(x.letra)}</strong> — ${esc(x.puntaje)} / ${esc(porLetra[x.letra] ? porLetra[x.letra].puntaje_maximo : 3)}${nivelDe(x) ? ` (${esc(nivelDe(x))})` : ""}</div>
            <div><em>Justificación:</em> ${esc(x.justificacion)}</div>
            ${x.evidencia ? `<div><em>Evidencia del trabajo:</em> ${esc(x.evidencia)}</div>` : ""}
            ${x.mejora ? `<div><em>Oportunidad de mejora:</em> ${esc(x.mejora)}</div>` : ""}
          </div>`).join("")}
        <p style="margin:0.3rem 0 0.2rem; font-weight:600;">3. Dictamen y nota final</p>
        <div>Puntos obtenidos: <strong>${t.obtenido} de ${t.maximo}</strong> (${t.pct} % de los criterios ${indEvaluables.map(i => esc(i.letra)).join(", ")}).</div>
        ${res.comentario ? `<div><em>Retroalimentación para el estudiante:</em> ${esc(res.comentario)}</div>` : ""}
        <button class="btn secondary small" data-pi-copiar type="button" style="margin-top:0.4rem;">📋 Copiar dictamen</button>
      </div>`;
  }
  function dictamenTexto(estId, res) {
    const s = listaEst.find(x => x.id === estId);
    const lista = res.indicadores || [];
    const t = totales(res);
    const max = (x) => porLetra[x.letra] ? porLetra[x.letra].puntaje_maximo : 3;
    return [
      `DICTAMEN DE EVALUACIÓN${s ? " – " + nombre(s) : ""}`,
      "",
      "1. TABLA RESUMEN",
      "Criterio | Puntaje máximo | Puntaje obtenido | Nivel alcanzado",
      ...lista.map(x => `${x.letra}: ${quitarHtml(porLetra[x.letra] ? porLetra[x.letra].descripcion : "")} | ${max(x)} | ${x.puntaje} | ${nivelDe(x)}`),
      `Total | ${t.maximo} | ${t.obtenido} | ${t.pct} %`,
      "",
      "2. JUSTIFICACIÓN DETALLADA POR CRITERIO",
      ...lista.flatMap(x => [
        `Criterio ${x.letra}: ${quitarHtml(porLetra[x.letra] ? porLetra[x.letra].descripcion : "")}`,
        `  Puntaje asignado: ${x.puntaje} / ${max(x)}`,
        `  Justificación: ${x.justificacion}`,
        ...(x.evidencia ? [`  Evidencia: ${x.evidencia}`] : []),
        ...(x.mejora ? [`  Oportunidad de mejora: ${x.mejora}`] : [])
      ]),
      "",
      "3. DICTAMEN Y NOTA FINAL",
      `Puntos obtenidos: ${t.obtenido} de ${t.maximo} (${t.pct} %).`,
      ...(res.comentario ? [`Retroalimentación: ${res.comentario}`] : [])
    ].join("\n");
  }

  cont.querySelectorAll("[data-pi-evaluar]").forEach(btn => btn.addEventListener("click", async () => {
    const estado = cont.querySelector("[data-pi-estado3]");
    btn.disabled = true; btn.textContent = "Evaluando…";
    try { await evaluarEstudiante(btn.dataset.piEvaluar, (m) => { estado.textContent = "Evaluando: " + m; }); estado.textContent = "✓ Propuesta lista. Revisala y guardá."; }
    catch (err) { estado.textContent = "No se pudo evaluar (el motivo está debajo de su fila)."; mostrarErrorFila(btn.dataset.piEvaluar, err.message || String(err)); }
    finally { btn.disabled = false; btn.textContent = "🤖 Evaluar"; }
  }));

  const btnEvaluarTodos = cont.querySelector("[data-pi-evaluar-todos]");
  if (btnEvaluarTodos) btnEvaluarTodos.addEventListener("click", async () => {
    const estado = cont.querySelector("[data-pi-estado3]");
    const pendientes = listaEst.filter(s => ultimaPorEst[s.id] && !tienePropuestaVigente(s.id) && indEvaluables.every(i => nota[`${s.id}-${i.id}`] === undefined || nota[`${s.id}-${i.id}`] === null));
    if (!pendientes.length) { estado.textContent = "No hay entregas pendientes de evaluar: todas ya tienen nota o una propuesta de la IA por revisar (en rojo). Usá 🤖 Evaluar en una fila si querés volver a evaluarla."; return; }
    btnEvaluarTodos.disabled = true;
    let ok = 0, fallos = 0;
    for (let k = 0; k < pendientes.length; k++) {
      estado.textContent = `Evaluando ${k + 1} de ${pendientes.length}: ${nombre(pendientes[k])}…`;
      const nom = nombre(pendientes[k]);
      try {
        await evaluarEstudiante(pendientes[k].id, (m) => { estado.textContent = `Evaluando ${k + 1} de ${pendientes.length}: ${nom} — ${m}`; });
        ok++;
      } catch (err) { fallos++; mostrarErrorFila(pendientes[k].id, err.message || String(err)); }
      if (k < pendientes.length - 1) await esperar(3000); // pausa corta para no saturar la IA
    }
    btnEvaluarTodos.disabled = false;
    estado.textContent = `✓ ${ok} propuesta${ok === 1 ? "" : "s"} lista${ok === 1 ? "" : "s"}${fallos ? ` · ${fallos} no se pudieron evaluar (el motivo está debajo de cada fila)` : ""}. Revisalas y tocá «Guardar notas».`;
  });

  // Al abrir: muestra las propuestas guardadas de quienes todavía no tienen
  // notas en estos indicadores (y no han vuelto a entregar desde entonces).
  function tienePropuestaVigente(estId) {
    const guardadas = (trabajoEntrega && trabajoEntrega.contenido_actividad && trabajoEntrega.contenido_actividad.evaluaciones_ia) || {};
    const p = guardadas[estId];
    return !!(p && ultimaPorEst[estId] && p.entrega_id === ultimaPorEst[estId].id);
  }
  let propuestasCargadas = 0;
  listaEst.forEach(s => {
    const sinNotas = indEvaluables.every(i => nota[`${s.id}-${i.id}`] === undefined || nota[`${s.id}-${i.id}`] === null);
    if (sinNotas && tienePropuestaVigente(s.id)) {
      mostrarPropuesta(s.id, trabajoEntrega.contenido_actividad.evaluaciones_ia[s.id]);
      propuestasCargadas++;
    }
  });
  if (propuestasCargadas) {
    const estado = cont.querySelector("[data-pi-estado3]");
    if (estado) estado.textContent = `${propuestasCargadas} propuesta${propuestasCargadas === 1 ? "" : "s"} de la IA pendiente${propuestasCargadas === 1 ? "" : "s"} de revisar (marcadas en rojo). Revisalas y tocá «Guardar notas».`;
  }

  const btnGuardarNotas = cont.querySelector("[data-pi-guardar-notas]");
  if (btnGuardarNotas) btnGuardarNotas.addEventListener("click", async () => {
    const estado = cont.querySelector("[data-pi-estado3]");
    const filas = Array.from(cont.querySelectorAll("[data-pi-nota][data-cambio='1']"))
      .filter(sel => sel.value !== "")
      .map(sel => ({ indicador_id: Number(sel.dataset.ind), estudiante_id: sel.dataset.est, puntaje_obtenido: Number(sel.value) }));
    if (!filas.length) { estado.textContent = "No hay cambios para guardar."; return; }
    btnGuardarNotas.disabled = true;
    // Si la conexión con la base de datos falla un momento ("Failed to
    // fetch"), se reintenta sola unas veces antes de dar error; las notas
    // siguen en pantalla (en rojo) para volver a tocar Guardar.
    let error = null;
    for (let intento = 1; intento <= 4; intento++) {
      try {
        ({ error } = await sb.from("calificaciones_indicador").upsert(filas, { onConflict: "indicador_id,estudiante_id" }));
      } catch (err) { error = err; }
      const esDeConexion = error && /fetch|network|timeout|conex/i.test(String(error.message || error));
      if (!esDeConexion) break;
      if (intento < 4) { estado.textContent = `Sin conexión con la base de datos, reintento ${intento} de 3…`; await new Promise(r => setTimeout(r, 4000)); }
    }
    btnGuardarNotas.disabled = false;
    if (error) {
      const msg = String(error.message || error);
      estado.textContent = /fetch|network/i.test(msg)
        ? "No se pudo conectar con la base de datos. Las notas siguen en pantalla: esperá un minuto y tocá «Guardar notas» de nuevo (no recargues la página)."
        : "No se pudieron guardar: " + msg;
      return;
    }
    cont.querySelectorAll("[data-pi-nota][data-cambio='1']").forEach(sel => { delete sel.dataset.cambio; sel.style.outline = ""; });
    filas.forEach(f => { nota[`${f.estudiante_id}-${f.indicador_id}`] = f.puntaje_obtenido; });
    estado.textContent = `✓ ${filas.length} nota${filas.length === 1 ? "" : "s"} guardada${filas.length === 1 ? "" : "s"} en Rúbrica y Evaluaciones.`;
  });
}

async function cargarCalificarTodos(materiaId, catNombre, indicadores) {
  const holder = document.getElementById("calificar-todos-holder");
  const listaHolder = document.getElementById("lista-indicadores-holder");
  if (!holder) return;
  if (indicadores.length === 0) return;

  const { data: materia } = await sb.from("materias").select("*").eq("id", materiaId).maybeSingle();
  const { data: estudiantes } = await sb.from("estudiantes").select("*").eq("seccion", materia.seccion).order("apellido1").order("apellido2");
  const indicadorIds = indicadores.map(i => i.id);
  const { data: calificaciones } = (estudiantes || []).length
    ? await sb.from("calificaciones_indicador").select("*").in("indicador_id", indicadorIds).in("estudiante_id", (estudiantes || []).map(s => s.id))
    : { data: [] };
  const mapa = {}; // "estudianteId-indicadorId" -> puntaje
  (calificaciones || []).forEach(c => { mapa[`${c.estudiante_id}-${c.indicador_id}`] = c.puntaje_obtenido; });

  const categoriaObj = (await sb.from("rubrica_categorias").select("*").eq("nombre", catNombre).maybeSingle()).data;

  // Agrupa los indicadores por el tema que evaluaron (según el resultado de
  // aprendizaje vinculado), para que la tabla y el detalle de criterios
  // muestren "qué tema se evaluó" en vez de solo la letra del indicador.
  const resultadoIdsCal = [...new Set(indicadores.map(i => i.resultado_id).filter(Boolean))];
  let temaPorResultadoCal = {};
  if (resultadoIdsCal.length) {
    const { data: temasVinculadosCal } = await sb.from("publicaciones").select("resultado_id, titulo").in("resultado_id", resultadoIdsCal).eq("tipo", "apartado");
    (temasVinculadosCal || []).forEach(t => { temaPorResultadoCal[t.resultado_id] = t.titulo; });
  }
  const temaDeIndicador = (i) => (i.resultado_id && temaPorResultadoCal[i.resultado_id]) || "Sin tema vinculado";
  const gruposPorTema = [];
  const indiceGrupoTema = {};
  indicadores.forEach(i => {
    const tema = temaDeIndicador(i);
    if (!(tema in indiceGrupoTema)) {
      indiceGrupoTema[tema] = gruposPorTema.length;
      gruposPorTema.push({ tema, items: [] });
    }
    gruposPorTema[indiceGrupoTema[tema]].items.push(i);
  });
  const indicadoresOrdenados = gruposPorTema.flatMap(g => g.items);

  // Para poder ofrecer un botón "Ver trabajo" junto a cada indicador que
  // provenga de un trabajo cotidiano.
  const trabajoPorIndicadorCal = {};
  if (indicadorIds.length) {
    const { data: tcVinculadosCal } = await sb.from("trabajos_cotidianos").select("id, indicador_id, publicacion_id, subtema_id, titulo").in("indicador_id", indicadorIds);
    (tcVinculadosCal || []).forEach(t => { trabajoPorIndicadorCal[t.indicador_id] = t; });
  }
  function linkTrabajoCal(ind) {
    const t = trabajoPorIndicadorCal[ind.id];
    if (!t) return "";
    const href = t.subtema_id ? `#/subtema/${t.subtema_id}` : `#/apartado/${t.publicacion_id}`;
    return ` <a class="btn secondary small" href="${href}" title="Ver el trabajo cotidiano: ${String(t.titulo || "").replace(/"/g, "&quot;")}">📎 Ver trabajo</a>`;
  }

  holder.innerHTML = `
    <div class="whatsapp-panel" style="max-width:100%; margin:0.8rem 0;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.6rem;">
        <strong style="font-family:var(--serif);">Calificar a toda la sección — ${catNombre}</strong>
        <button class="btn secondary small" id="cerrar-calificar-todos">Cerrar</button>
      </div>
      <details style="margin-bottom:0.6rem;">
        <summary style="font-size:0.82rem; color:var(--text-muted); cursor:pointer;">📋 Ver criterios de evaluación (para calificar con base en ellos)</summary>
        <div style="margin-top:0.5rem; display:grid; gap:0.9rem;">
          ${gruposPorTema.map(g => `
            <div>
              <p style="font-weight:600; margin:0 0 0.3rem; font-size:0.85rem;">📘 ${g.tema}</p>
              <div style="display:grid; gap:0.6rem; margin-left:0.6rem;">
                ${g.items.map(i => `
                  <div style="font-size:0.82rem;">
                    <strong>${i.letra}: ${i.descripcion}</strong>${i.fecha_evaluacion ? ` <span style="color:var(--text-muted); font-weight:400;">· Fecha: ${i.fecha_evaluacion}</span>` : ""}${linkTrabajoCal(i)}
                    ${(i.criterios_indicador || []).length
                      ? (i.criterios_indicador || []).sort((a, b) => a.puntaje - b.puntaje).map(c => `<div style="margin-left:0.8rem;"><strong>${c.nivel ? c.nivel + " — " : ""}${c.puntaje} punto${c.puntaje === 1 ? "" : "s"}:</strong> ${c.descripcion}</div>`).join("")
                      : `<div style="margin-left:0.8rem; color:var(--text-muted);">Sin criterios configurados — agregalos arriba en la lista de indicadores.</div>`}
                  </div>`).join("")}
              </div>
            </div>`).join("")}
        </div>
      </details>
      <div style="overflow-x:auto;">
        <table class="grades">
          <thead>
            <tr>
              <th rowspan="2" style="vertical-align:bottom;">Estudiante</th>
              ${gruposPorTema.map(g => `<th colspan="${g.items.length}" style="text-align:center; font-size:0.76rem; font-weight:600; border-bottom:1px solid var(--paper-line);" title="${g.tema.replace(/"/g, "&quot;")}">📘 ${g.tema}</th>`).join("")}
              <th rowspan="2" style="vertical-align:bottom;">Resultado (${categoriaObj?.porcentaje || "?"}%)</th>
            </tr>
            <tr>
              ${indicadoresOrdenados.map(i => `<th style="text-align:center;" title="${(i.criterios_indicador || []).sort((a, b) => a.puntaje - b.puntaje).map(c => `${c.nivel ? c.nivel + " (" + c.puntaje + "): " : c.puntaje + ": "}${c.descripcion}`).join(" · ").replace(/"/g, "&quot;")}">${i.letra}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${(estudiantes || []).map(st => {
              const sumaMax = indicadores.reduce((a, i) => a + Number(i.puntaje_maximo), 0);
              const sumaObt = indicadores.reduce((a, i) => a + Number(mapa[`${st.id}-${i.id}`] || 0), 0);
              const resultado = sumaMax > 0 ? ((sumaObt / sumaMax) * categoriaObj?.porcentaje).toFixed(1) : "—";
              return `
              <tr data-fila-estudiante-cal="${st.id}">
                <td>${st.apellido1} ${st.apellido2}, ${st.nombre}</td>
                ${indicadoresOrdenados.map(i => {
                  const criteriosPorPuntaje = {};
                  (i.criterios_indicador || []).forEach(c => { criteriosPorPuntaje[c.puntaje] = (c.nivel ? c.nivel + ": " : "") + c.descripcion; });
                  return `
                  <td style="text-align:center;">
                    <select data-cal-masiva="${i.id}" data-estudiante="${st.id}" style="width:4rem; text-align:center; border:1px solid var(--paper-line); border-radius:3px;">
                      ${Array.from({ length: i.puntaje_maximo + 1 }, (_, p) => `<option value="${p}" ${criteriosPorPuntaje[p] ? `title="${String(criteriosPorPuntaje[p]).replace(/"/g, "&quot;")}"` : ""} ${Number(mapa[`${st.id}-${i.id}`] || 0) === p ? "selected" : ""}>${p}</option>`).join("")}
                    </select>
                  </td>`;
                }).join("")}
                <td class="num" data-resultado-de="${st.id}" style="font-weight:600;">${resultado}%</td>
              </tr>`;
            }).join("") || `<tr><td colspan="${indicadores.length + 2}" class="empty">No hay estudiantes en esta sección.</td></tr>`}
          </tbody>
        </table>
      </div>
      <div class="row" style="margin-top:0.8rem;"><button class="btn" id="guardar-calificar-todos">Guardar todas las calificaciones</button></div>
    </div>`;

  if (listaHolder) listaHolder.style.display = "none";

  document.getElementById("cerrar-calificar-todos").addEventListener("click", () => {
    holder.innerHTML = "";
    if (listaHolder) listaHolder.style.display = "";
  });

  function recalcularFila(estId) {
    const sumaMax = indicadores.reduce((a, i) => a + Number(i.puntaje_maximo), 0);
    const sumaObt = indicadores.reduce((a, i) => {
      const sel = holder.querySelector(`[data-cal-masiva="${i.id}"][data-estudiante="${estId}"]`);
      return a + Number(sel ? sel.value : 0);
    }, 0);
    const resultado = sumaMax > 0 ? ((sumaObt / sumaMax) * categoriaObj?.porcentaje).toFixed(1) : "—";
    const celda = holder.querySelector(`[data-resultado-de="${estId}"]`);
    if (celda) celda.textContent = `${resultado}%`;
  }

  holder.querySelectorAll("[data-cal-masiva]").forEach(sel => {
    sel.addEventListener("change", () => recalcularFila(sel.dataset.estudiante));
  });

  document.getElementById("guardar-calificar-todos").addEventListener("click", async (e) => {
    const btn = e.target;
    btn.textContent = "Guardando…";
    const filas = [];
    holder.querySelectorAll("[data-cal-masiva]").forEach(sel => {
      filas.push({
        indicador_id: sel.dataset.calMasiva,
        estudiante_id: sel.dataset.estudiante,
        puntaje_obtenido: Number(sel.value)
      });
    });
    await sb.from("calificaciones_indicador").upsert(filas, { onConflict: "indicador_id,estudiante_id" });
    btn.textContent = "Guardado ✓";
    setTimeout(() => { btn.textContent = "Guardar todas las calificaciones"; }, 1500);
  });
}

async function cargarApartadosDeMateria(materiaId) {
  const holder = document.getElementById("materia-apartados");
  if (!holder) return;
  const { data: unidades } = await sb.from("programa").select("id").eq("materia_id", materiaId);
  const programaIds = (unidades || []).map(u => u.id);
  let apartados = [];
  if (programaIds.length > 0) {
    const { data: resultados } = await sb.from("resultados_aprendizaje").select("id").in("programa_id", programaIds);
    const resultadoIds = (resultados || []).map(r => r.id);
    if (resultadoIds.length > 0) {
      const { data: pubs } = await sb.from("publicaciones").select("*").in("resultado_id", resultadoIds).eq("tipo", "apartado");
      apartados = pubs || [];
    }
  }
  const { data: cuadros } = await sb.from("materia_cuadros").select("*").eq("materia_id", materiaId).order("orden").order("creado_en");
  const listaCuadros = cuadros || [];

  // Agrupa los temas por cuadro — "sin" es la clave para los que todavía no
  // tienen cuadro asignado.
  const temasPorCuadro = {};
  apartados.forEach(a => {
    const clave = a.cuadro_id || "sin";
    if (!temasPorCuadro[clave]) temasPorCuadro[clave] = [];
    temasPorCuadro[clave].push(a);
  });

  function filaTema(a) {
    return `
      <div class="roster-row" style="flex-direction:column; align-items:stretch; gap:0.3rem;">
        <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
          <a class="name clamp2" href="#/apartado/${a.id}" title="${a.titulo.replace(/"/g, "&quot;")}" data-apartado-titulo-lectura="${a.id}" style="flex:1;">${a.titulo}</a>
          <span style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
            <span class="badge" style="${a.contenido ? "" : "opacity:0.5;"}">${a.contenido ? "Con introducción" : "Sin introducción"}</span>
            <select data-apartado-cuadro="${a.id}" style="font-size:0.82rem;">
              <option value="">Sin cuadro</option>
              ${listaCuadros.map(c => `<option value="${c.id}" ${a.cuadro_id == c.id ? "selected" : ""}>${c.titulo}</option>`).join("")}
            </select>
            <button class="btn secondary small" data-editar-apartado-titulo="${a.id}" type="button">✏️ Editar título</button>
            <button class="btn ${a.habilitado ? "secondary" : ""} small" data-toggle-apartado-pub="${a.id}" data-estado-actual="${a.habilitado}">
              ${a.habilitado ? "Habilitado" : "No habilitado"}
            </button>
          </span>
        </div>
        <form class="inline-form" data-apartado-titulo-form="${a.id}" style="display:none;">
          <input name="titulo" value="${a.titulo.replace(/"/g, "&quot;")}" required style="flex:1; min-width:10rem;" />
          <button class="btn small" type="submit">Guardar</button>
          <button class="btn secondary small" type="button" data-cancelar-apartado-titulo="${a.id}">Cancelar</button>
        </form>
      </div>`;
  }

  holder.innerHTML = `
    <h3 style="margin-top:0;">Cuadros (unidades para agrupar los temas)</h3>
    <p style="font-size:0.85rem; color:var(--text-muted); margin-top:-0.6em;">Creá un cuadro por cada unidad/bloque y asignale los temas que quieras que lo integren. El estudiante los ve como cuadros grandes seleccionables.</p>
    <div class="roster" id="cuadros-lista">
      ${listaCuadros.map(c => `
        <div class="roster-row" style="flex-direction:column; align-items:stretch; gap:0.3rem;">
          <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
            <span class="name" data-cuadro-titulo-lectura="${c.id}" style="flex:1;">${c.titulo}</span>
            <span class="badge" style="font-weight:400;">${(temasPorCuadro[c.id] || []).length} tema(s)</span>
            <button class="btn secondary small" data-editar-cuadro-titulo="${c.id}" type="button">✏️ Editar</button>
            <button class="btn danger small" data-del-cuadro="${c.id}">Eliminar cuadro</button>
          </div>
          <form class="inline-form" data-cuadro-titulo-form="${c.id}" style="display:none;">
            <input name="titulo" value="${c.titulo.replace(/"/g, "&quot;")}" required style="flex:1; min-width:10rem;" />
            <button class="btn small" type="submit">Guardar</button>
            <button class="btn secondary small" type="button" data-cancelar-cuadro-titulo="${c.id}">Cancelar</button>
          </form>
        </div>`).join("") || '<p class="empty">Todavía no has creado ningún cuadro.</p>'}
    </div>
    <form class="inline-form" id="cuadro-form" style="margin-top:0.6rem;">
      <input name="titulo" placeholder="Título del cuadro (ej. Unidad 1)" required style="flex:1; min-width:10rem" />
      <button class="btn small" type="submit">+ Agregar cuadro</button>
    </form>

    <h3 style="margin-top:1.4rem;">Temas (apartados por resultado de aprendizaje)</h3>
    <p style="font-size:0.85rem; color:var(--text-muted); margin-top:-0.6em;">Los temas están minimizados dentro de cada cuadro — hacé clic para verlos.</p>
    ${apartados.length === 0 ? '<p class="empty">Esta materia todavía no tiene unidades del Programa vinculadas. Ve a "Programa" y vincula una unidad con esta materia.</p>' : `
    <div class="section-grid" style="margin-top:0; margin-bottom:0.6rem;">
      ${listaCuadros.map(c => tarjetaCuadroProfesor(c.id, c.titulo, (temasPorCuadro[c.id] || []).length)).join("")}
      ${(temasPorCuadro.sin || []).length ? tarjetaCuadroProfesor("sin", listaCuadros.length ? "Sin cuadro asignado" : "Todos los temas", (temasPorCuadro.sin || []).length) : ""}
    </div>
    <div id="temas-cuadro-panel-profesor"></div>`}`;

  function tarjetaCuadroProfesor(clave, titulo, cantidad) {
    return `
      <button type="button" class="section-tile flip-card" data-cuadro-toggle-profesor="${clave}" style="border:none; background:none; padding:0; width:100%; text-align:left; cursor:pointer; font:inherit;">
        <div class="flip-card-inner">
          <div class="flip-card-front">
            <div class="num" style="font-size:1.15rem;">📦 ${titulo}</div>
            <div class="count">${cantidad} tema${cantidad === 1 ? "" : "s"}</div>
          </div>
          <div class="flip-card-back">
            <div class="flip-cta">Ver temas →</div>
            <div class="flip-sub">${titulo}</div>
          </div>
        </div>
      </button>`;
  }

  function bindFilasTemaHandlers(scopeEl) {
    scopeEl.querySelectorAll("[data-apartado-cuadro]").forEach(sel => {
      sel.addEventListener("change", async () => {
        const aId = sel.dataset.apartadoCuadro;
        await sb.from("publicaciones").update({ cuadro_id: sel.value || null }).eq("id", aId);
        cargarApartadosDeMateria(materiaId);
      });
    });
    scopeEl.querySelectorAll("[data-toggle-apartado-pub]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const nuevoEstado = btn.dataset.estadoActual !== "true";
        await sb.from("publicaciones").update({ habilitado: nuevoEstado }).eq("id", btn.dataset.toggleApartadoPub);
        cargarApartadosDeMateria(materiaId);
      });
    });
    scopeEl.querySelectorAll("[data-editar-apartado-titulo]").forEach(btn => {
      btn.addEventListener("click", () => {
        const aId = btn.dataset.editarApartadoTitulo;
        const lectura = scopeEl.querySelector(`[data-apartado-titulo-lectura="${aId}"]`);
        const form = scopeEl.querySelector(`[data-apartado-titulo-form="${aId}"]`);
        if (lectura) lectura.style.display = "none";
        if (form) { form.style.display = "flex"; form.querySelector("input[name=titulo]").focus(); }
      });
    });
    scopeEl.querySelectorAll("[data-cancelar-apartado-titulo]").forEach(btn => {
      btn.addEventListener("click", () => {
        const aId = btn.dataset.cancelarApartadoTitulo;
        const lectura = scopeEl.querySelector(`[data-apartado-titulo-lectura="${aId}"]`);
        const form = scopeEl.querySelector(`[data-apartado-titulo-form="${aId}"]`);
        if (form) form.style.display = "none";
        if (lectura) lectura.style.display = "";
      });
    });
    scopeEl.querySelectorAll("[data-apartado-titulo-form]").forEach(form => {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const aId = form.dataset.apartadoTituloForm;
        const nuevoTitulo = new FormData(form).get("titulo").trim();
        if (!nuevoTitulo) return;
        await sb.from("publicaciones").update({ titulo: nuevoTitulo }).eq("id", aId);
        cargarApartadosDeMateria(materiaId);
      });
    });
  }

  const panelTemas = document.getElementById("temas-cuadro-panel-profesor");
  if (panelTemas) {
    holder.querySelectorAll("[data-cuadro-toggle-profesor]").forEach(btn => {
      btn.addEventListener("click", () => {
        const clave = btn.dataset.cuadroToggleProfesor;
        if (panelTemas.dataset.abierto === clave) {
          panelTemas.innerHTML = "";
          panelTemas.dataset.abierto = "";
          return;
        }
        const temas = temasPorCuadro[clave] || [];
        panelTemas.dataset.abierto = clave;
        panelTemas.innerHTML = `<div class="roster">${temas.map(filaTema).join("") || '<p class="empty">Sin temas asignados todavía.</p>'}</div>`;
        bindFilasTemaHandlers(panelTemas);
      });
    });
  }

  document.getElementById("cuadro-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    await sb.from("materia_cuadros").insert({ materia_id: materiaId, titulo: f.get("titulo"), orden: listaCuadros.length });
    cargarApartadosDeMateria(materiaId);
  });

  holder.querySelectorAll("[data-del-cuadro]").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("¿Eliminar este cuadro? Los temas que tenía quedarán sin cuadro asignado (no se eliminan).")) return;
      const cId = btn.dataset.delCuadro;
      await sb.from("publicaciones").update({ cuadro_id: null }).eq("cuadro_id", cId);
      await sb.from("materia_cuadros").delete().eq("id", cId);
      cargarApartadosDeMateria(materiaId);
    });
  });

  holder.querySelectorAll("[data-editar-cuadro-titulo]").forEach(btn => {
    btn.addEventListener("click", () => {
      const cId = btn.dataset.editarCuadroTitulo;
      const lectura = holder.querySelector(`[data-cuadro-titulo-lectura="${cId}"]`);
      const form = holder.querySelector(`[data-cuadro-titulo-form="${cId}"]`);
      if (lectura) lectura.style.display = "none";
      if (form) { form.style.display = "flex"; form.querySelector("input[name=titulo]").focus(); }
    });
  });
  holder.querySelectorAll("[data-cancelar-cuadro-titulo]").forEach(btn => {
    btn.addEventListener("click", () => {
      const cId = btn.dataset.cancelarCuadroTitulo;
      const lectura = holder.querySelector(`[data-cuadro-titulo-lectura="${cId}"]`);
      const form = holder.querySelector(`[data-cuadro-titulo-form="${cId}"]`);
      if (form) form.style.display = "none";
      if (lectura) lectura.style.display = "";
    });
  });
  holder.querySelectorAll("[data-cuadro-titulo-form]").forEach(form => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const cId = form.dataset.cuadroTituloForm;
      const nuevoTitulo = new FormData(form).get("titulo").trim();
      if (!nuevoTitulo) return;
      await sb.from("materia_cuadros").update({ titulo: nuevoTitulo }).eq("id", cId);
      cargarApartadosDeMateria(materiaId);
    });
  });

}

async function cargarPublicacionesDeMateria(materiaId, seccion) {
  const holder = document.getElementById("materia-publicaciones");
  if (!holder) return;
  const { data: pubs } = await sb.from("publicaciones").select("*").eq("materia_id", materiaId).neq("tipo", "apartado").order("creado_en", { ascending: false });

  holder.innerHTML = `
    <h3>Avisos y materiales</h3>
    <div class="roster">
      ${(pubs || []).map(p => `
        <div class="roster-row" style="align-items:flex-start; flex-direction:column; gap:0.3rem;">
          <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
            <span class="name">
              <span class="badge" style="margin-right:0.5rem;">${p.tipo === "material" ? "Material" : "Aviso"}</span>
              ${p.titulo}
            </span>
            <button class="btn danger small" data-del-pub-materia="${p.id}">Eliminar</button>
          </div>
          ${p.contenido ? `<div class="roa-cell-texto" style="font-size:0.85rem;">${p.contenido}</div>` : ""}
          ${p.url ? `<a href="${p.url}" target="_blank" rel="noopener" style="font-size:0.82rem;">${p.url}</a>` : ""}
          <span style="font-size:0.75rem; color:var(--text-muted);">${new Date(p.creado_en).toLocaleDateString("es-CR")}</span>
        </div>`).join("") || '<p class="empty">Todavía no hay avisos ni materiales en esta materia.</p>'}
    </div>
    <form class="inline-form js-pub-materia-form" style="margin-top:1rem;">
      <select name="tipo">
        <option value="aviso">Aviso</option>
        <option value="material">Material</option>
      </select>
      <input name="titulo" placeholder="Título" required style="flex:1; min-width:10rem" />
      <input name="url" placeholder="Enlace (opcional)" style="flex-basis:100%;" />
      <div class="roa-editable js-pub-materia-contenido" contenteditable="true" style="flex-basis:100%; min-height:3rem;" data-placeholder="Contenido (opcional)"></div>
      <button class="btn small" type="submit">Publicar</button>
    </form>`;

  holder.querySelectorAll("[data-del-pub-materia]").forEach(btn => {
    btn.addEventListener("click", async () => {
      await sb.from("publicaciones").delete().eq("id", btn.dataset.delPubMateria);
      cargarPublicacionesDeMateria(materiaId, seccion);
    });
  });
  const form = holder.querySelector(".js-pub-materia-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    await sb.from("publicaciones").insert({
      seccion,
      materia_id: materiaId,
      tipo: f.get("tipo"),
      titulo: f.get("titulo"),
      url: f.get("url") || null,
      contenido: holder.querySelector(".js-pub-materia-contenido").innerHTML || null
    });
    cargarPublicacionesDeMateria(materiaId, seccion);
  });
}

// ---------- PROGRAMA (resultados de aprendizaje / saberes esenciales) — solo docente ----------

async function renderProgramaNiveles() {
  app.innerHTML = `
    ${topbar()}
    <div class="wrap wrap-ancho">
      <h1>Programa de estudio</h1>
      <p style="color:var(--text-muted); margin-top:-0.6em;">Resultados de aprendizaje y saberes esenciales. Puedes usar el contenido oficial precargado o crear tus propias unidades.</p>
      <details class="group-promo" style="margin-top:1rem;">
        <summary style="font-family:var(--serif); font-weight:600; font-size:1.02rem;">+ Crear nueva unidad propia</summary>
        <form class="inline-form" id="nueva-unidad-form" style="margin-top:0.8rem;">
          <select name="nivel" required>
            <option value="">Nivel…</option>
            <option value="Décimo">Décimo</option>
            <option value="Undécimo">Undécimo</option>
            <option value="Duodécimo">Duodécimo</option>
          </select>
          <input name="subarea" placeholder="Subárea (ej. Contabilidad General)" required style="flex:1; min-width:12rem" />
          <input name="unidad" placeholder="Nombre de la unidad" required style="flex:1; min-width:12rem" />
          <input name="tiempo_estimado" type="number" min="1" placeholder="Horas (opcional)" style="width:9rem" />
          <button class="btn small" type="submit">Crear unidad</button>
        </form>
      </details>
      <div id="programa-niveles" style="margin-top:0.4rem;">Cargando…</div>
    </div>`;
  bindTopbar();

  document.getElementById("nueva-unidad-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const btnSubmit = e.target.querySelector("button[type=submit]");
    if (btnSubmit) btnSubmit.textContent = "Creando…";
    const f = new FormData(e.target);
    const payload = {
      nivel: f.get("nivel"),
      subarea: f.get("subarea"),
      unidad: f.get("unidad"),
      tiempo_estimado: f.get("tiempo_estimado") ? Number(f.get("tiempo_estimado")) : null
    };
    try {
      const { data: nueva, error } = await sb.from("programa").insert(payload).select().maybeSingle();
      if (error) {
        console.error("Error creando unidad:", error);
        alert("No se pudo crear la unidad: " + (error.message || JSON.stringify(error)));
        if (btnSubmit) btnSubmit.textContent = "Crear unidad";
        return;
      }
      if (nueva) { location.hash = `#/programa/${nueva.id}`; return; }
      alert("La unidad no se creó (no se recibió confirmación de la base de datos). Revisa que la tabla 'programa' permita insertar y leer filas.");
      if (btnSubmit) btnSubmit.textContent = "Crear unidad";
    } catch (err) {
      console.error("Excepción creando unidad:", err);
      alert("Ocurrió un error inesperado: " + (err.message || err));
      if (btnSubmit) btnSubmit.textContent = "Crear unidad";
    }
  });

  const { data: filas } = await sb.from("programa").select("id, nivel, subarea, unidad, tiempo_estimado").order("id");
  const porNivel = {};
  (filas || []).forEach(f => {
    porNivel[f.nivel] = porNivel[f.nivel] || {};
    porNivel[f.nivel][f.subarea] = porNivel[f.nivel][f.subarea] || [];
    porNivel[f.nivel][f.subarea].push(f);
  });

  const holder = document.getElementById("programa-niveles");
  const niveles = Object.keys(porNivel);
  if (niveles.length === 0) {
    holder.innerHTML = `<p class="empty">Todavía no se ha cargado el contenido del programa.</p>`;
    return;
  }

  holder.innerHTML = niveles.map(nivel => `
    <details class="group-promo" style="margin-top:1.2rem;" open>
      <summary style="font-family:var(--serif); font-weight:600; font-size:1.05rem;">${nivel}</summary>
      <div style="margin-top:0.8rem;">
        ${Object.keys(porNivel[nivel]).map(sub => `
          <p style="font-size:0.78rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em; margin:1rem 0 0.3rem;">${sub}</p>
          <div class="roster">
            ${porNivel[nivel][sub].map(u => `
              <a class="roster-row" href="#/programa/${u.id}">
                <span class="name">${u.unidad}</span>
                <span class="cedula">${u.tiempo_estimado ? u.tiempo_estimado + "h" : ""}</span>
              </a>`).join("")}
          </div>`).join("")}
      </div>
    </details>`).join("");
}

// El nivel del programa (Décimo/Undécimo/Duodécimo) se relaciona con la
// sección del estudiante por el número con el que empieza (10-1 → Décimo, etc).
const NIVEL_POR_PREFIJO = { "10": "Décimo", "11": "Undécimo", "12": "Duodécimo" };
function nivelDeSeccion(seccion) {
  const prefijo = (seccion || "").split("-")[0];
  return NIVEL_POR_PREFIJO[prefijo] || null;
}

async function renderProgramaUnidad(id, soloLectura) {
  const { data: u } = await sb.from("programa").select("*, materias(id, nombre, seccion)").eq("id", id).maybeSingle();
  if (!u) { location.hash = "#/programa"; return; }
  const { data: items } = await sb.from("resultados_aprendizaje").select("*").eq("programa_id", id).order("id");
  const itemIds = (items || []).map(it => it.id);
  const { data: apartadosVinculados } = itemIds.length
    ? await sb.from("publicaciones").select("id, resultado_id, habilitado").in("resultado_id", itemIds)
    : { data: [] };
  const apartadoPorResultado = {};
  (apartadosVinculados || []).forEach(a => { apartadoPorResultado[a.resultado_id] = a; });

  let materiaSelector = "";
  if (!soloLectura) {
    const seccionNivel = Object.keys(NIVEL_POR_PREFIJO).find(k => NIVEL_POR_PREFIJO[k] === u.nivel);
    const { data: materias } = await sb.from("materias").select("*").like("seccion", `${seccionNivel}-%`).order("nombre");
    const opciones = (materias || []).map(m => `<option value="${m.id}" ${u.materia_id === m.id ? "selected" : ""}>${m.nombre} (${m.seccion})</option>`).join("");
    materiaSelector = `
      <div class="whatsapp-panel" style="max-width:520px; margin-top:1rem;">
        <label for="materia-link">Vincular esta unidad con una materia (para que los estudiantes con esa materia asignada la vean)</label>
        <select id="materia-link">
          <option value="">— Sin vincular —</option>
          ${opciones}
        </select>
        <div class="row"><button class="btn small" id="save-materia-link">Guardar vínculo</button></div>
        ${(materias || []).length === 0 ? `<p class="no-phone-note">No hay materias creadas todavía para esta sección. Ve a "Materias" para crear una primero.</p>` : ""}
      </div>
      <div class="whatsapp-panel" style="max-width:520px; margin-top:1rem;">
        <label>¿Qué debe ver el estudiante además de Resultado y Saberes?</label>
        <div style="display:flex; flex-direction:column; gap:0.4rem; margin-top:0.4rem;">
          <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.85rem;"><input type="checkbox" id="vis-estrategias" ${u.mostrar_estrategias ? "checked" : ""} /> Estrategias de mediación</label>
          <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.85rem;"><input type="checkbox" id="vis-evidencias" ${u.mostrar_evidencias ? "checked" : ""} /> Evidencias de aprendizaje</label>
          <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.85rem;"><input type="checkbox" id="vis-tiempo" ${u.mostrar_tiempo ? "checked" : ""} /> Tiempo estimado</label>
        </div>
        <div class="row"><button class="btn small" id="save-visibilidad">Guardar</button></div>
      </div>`;
  }

  app.innerHTML = `
    ${topbar()}
    <div class="wrap wrap-ancho">
      <a href="#/programa" class="btn secondary small" style="margin-bottom:1rem; display:inline-block;">&larr; Programa</a>
      <h1>${u.unidad}</h1>
      <p style="color:var(--text-muted); margin-top:-0.6em;">${u.nivel} · ${u.subarea}${u.tiempo_estimado ? " · " + u.tiempo_estimado + " horas" : ""}${u.materias ? " · Materia: " + u.materias.nombre : ""}</p>
      ${!soloLectura ? `
      <div style="display:flex; gap:0.6rem; margin-top:0.4rem;">
        <button class="btn secondary small" id="generar-machote-programa-btn">Generar machote (imprimir)</button>
        <button class="btn danger small" id="eliminar-unidad-btn">Eliminar esta unidad</button>
      </div>` : ""}
      ${materiaSelector}

      <div class="machote-live" style="margin-top:1.2rem; border:1px solid var(--ink); background:var(--white);">
        <div style="text-align:center; font-family:var(--serif); font-weight:700; font-size:1.15rem; padding:0.9rem; border-bottom:1px solid var(--paper-line);"
             ${!soloLectura ? `contenteditable="true" id="machote-titulo"` : ""}>${u.unidad || ""}</div>
        <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
          <thead>
            <tr style="background:var(--ink); color:var(--white);">
              <th style="padding:0.5rem 0.4rem; text-align:left; min-width:12rem;">Resultado de Aprendizaje</th>
              <th style="padding:0.5rem 0.4rem; text-align:left; min-width:12rem;">Saberes Esenciales</th>
              <th style="padding:0.5rem 0.4rem; text-align:left; min-width:12rem;">Estrategias de mediación</th>
              <th style="padding:0.5rem 0.4rem; text-align:left; min-width:12rem;">Evidencias de aprendizaje</th>
              <th style="padding:0.5rem 0.4rem; text-align:left; min-width:6rem;">Tiempo</th>
              <th style="padding:0.5rem 0.4rem; text-align:center; min-width:6rem;">${soloLectura ? "Estado" : "Impartido"}</th>
              ${!soloLectura ? `<th style="padding:0.5rem 0.4rem; text-align:center; min-width:9rem;">Apartado</th><th style="padding:0.5rem 0.4rem; text-align:center; min-width:7rem;"></th>` : ""}
            </tr>
          </thead>
          <tbody id="machote-live-filas">
            ${(items || []).map(it => soloLectura ? `
            <tr style="border-bottom:1px solid var(--paper-line);">
              <td style="padding:0.5rem 0.4rem; vertical-align:top;" class="roa-cell-texto">${it.resultado || ""}</td>
              <td style="padding:0.5rem 0.4rem; vertical-align:top;" class="roa-cell-texto">${it.saberes || ""}</td>
              <td style="padding:0.5rem 0.4rem; vertical-align:top;" class="roa-cell-texto">${it.estrategias || ""}</td>
              <td style="padding:0.5rem 0.4rem; vertical-align:top;" class="roa-cell-texto">${it.evidencias || ""}</td>
              <td style="padding:0.5rem 0.4rem; vertical-align:top;" class="roa-cell-texto">${it.tiempo || ""}</td>
              <td style="padding:0.5rem 0.4rem; text-align:center;">
                <span class="badge" style="${it.impartido ? "" : "opacity:0.5;"}">${it.impartido ? "Impartido" : "No impartido"}</span>
              </td>
            </tr>` : `
            <tr style="border-bottom:1px solid var(--paper-line);" data-fila-tr="${it.id}">
              <td style="padding:0.4rem; vertical-align:top;" contenteditable="true" data-campo="resultado" data-fila="${it.id}" data-tipo="texto">${it.resultado || ""}</td>
              <td style="padding:0.4rem; vertical-align:top;" contenteditable="true" data-campo="saberes" data-fila="${it.id}" data-tipo="html">${it.saberes || ""}</td>
              <td style="padding:0.4rem; vertical-align:top;" contenteditable="true" data-campo="estrategias" data-fila="${it.id}" data-tipo="html">${it.estrategias || ""}</td>
              <td style="padding:0.4rem; vertical-align:top;" contenteditable="true" data-campo="evidencias" data-fila="${it.id}" data-tipo="html">${it.evidencias || ""}</td>
              <td style="padding:0.4rem; vertical-align:top;" contenteditable="true" data-campo="tiempo" data-fila="${it.id}" data-tipo="texto">${it.tiempo || ""}</td>
              <td style="padding:0.4rem; text-align:center;">
                <input type="checkbox" data-impartido="${it.id}" ${it.impartido ? "checked" : ""} style="width:1.2rem; height:1.2rem;" />
              </td>
              <td style="padding:0.4rem; text-align:center;">
                ${apartadoPorResultado[it.id] ? `
                <button class="btn ${apartadoPorResultado[it.id].habilitado ? "secondary" : ""} small" data-toggle-apartado="${apartadoPorResultado[it.id].id}" data-estado-actual="${apartadoPorResultado[it.id].habilitado}">
                  ${apartadoPorResultado[it.id].habilitado ? "Deshabilitar" : "Habilitar"}
                </button>` : u.materia_id ? `
                <button class="btn small" data-crear-apartado="${it.id}" title="Crea el tema en la materia vinculada, para que los estudiantes lo vean">+ Crear apartado</button>` : `<span style="font-size:0.68rem; color:var(--text-muted);">Vincula una materia arriba primero</span>`}
              </td>
              <td style="padding:0.4rem; text-align:center; white-space:nowrap;">
                <button class="btn small" data-guardar-fila="${it.id}" title="Guardar esta fila">Guardar</button>
                <button class="btn danger small" data-borrar-fila="${it.id}" title="Eliminar fila">✕</button>
              </td>
            </tr>`).join("") || `<tr><td colspan="${soloLectura ? 6 : 8}" class="empty">No se encontraron resultados de aprendizaje para esta unidad.</td></tr>`}
          </tbody>
        </table>
        </div>
      </div>
      <span id="machote-live-estado" style="font-size:0.78rem; color:var(--ledger-green-deep); display:block; margin-top:0.4rem; min-height:1.2em;"></span>
      ${!soloLectura ? `<button class="btn secondary small" id="agregar-resultado" style="margin-top:0.5rem;">+ Agregar resultado de aprendizaje</button>` : ""}
    </div>`;
  bindTopbar();

  function avisarGuardado() {
    const span = document.getElementById("machote-live-estado");
    if (!span) return;
    span.textContent = "Guardado ✓ " + new Date().toLocaleTimeString("es-CR");
    clearTimeout(avisarGuardado._t);
    avisarGuardado._t = setTimeout(() => { span.textContent = ""; }, 2500);
  }

  if (!soloLectura) {
    document.querySelectorAll("#machote-live-filas [data-campo]").forEach(celda => {
      celda.addEventListener("blur", async () => {
        const campo = celda.dataset.campo;
        const valor = celda.dataset.tipo === "html" ? celda.innerHTML : celda.textContent;
        await sb.from("resultados_aprendizaje").update({ [campo]: valor }).eq("id", celda.dataset.fila);
        avisarGuardado();
      });
    });
    document.querySelectorAll("[data-impartido]").forEach(cb => {
      cb.addEventListener("change", async () => {
        await sb.from("resultados_aprendizaje").update({ impartido: cb.checked }).eq("id", cb.dataset.impartido);
        avisarGuardado();
      });
    });
    document.querySelectorAll("[data-borrar-fila]").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!confirm("¿Eliminar esta fila (resultado de aprendizaje)? No se puede deshacer.")) return;
        await sb.from("resultados_aprendizaje").delete().eq("id", btn.dataset.borrarFila);
        renderProgramaUnidad(id, soloLectura);
      });
    });
    document.querySelectorAll("[data-guardar-fila]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const filaId = btn.dataset.guardarFila;
        const fila = document.querySelector(`tr[data-fila-tr="${filaId}"]`);
        if (!fila) return;
        const payload = {};
        fila.querySelectorAll("[data-campo]").forEach(celda => {
          payload[celda.dataset.campo] = celda.dataset.tipo === "html" ? celda.innerHTML : celda.textContent;
        });
        const checkbox = fila.querySelector("[data-impartido]");
        if (checkbox) payload.impartido = checkbox.checked;
        const textoOriginal = btn.textContent;
        btn.disabled = true;
        const { error } = await sb.from("resultados_aprendizaje").update(payload).eq("id", filaId);
        btn.disabled = false;
        if (error) {
          alert("No se pudo guardar la fila: " + (error.message || JSON.stringify(error)));
          return;
        }
        btn.textContent = "Guardado ✓";
        setTimeout(() => { btn.textContent = textoOriginal; }, 1500);
        avisarGuardado();
      });
    });
    const tituloEl = document.getElementById("machote-titulo");
    if (tituloEl) tituloEl.addEventListener("blur", async () => {
      await sb.from("programa").update({ unidad: tituloEl.textContent.trim() }).eq("id", id);
      avisarGuardado();
    });
    const agregarBtn = document.getElementById("agregar-resultado");
    if (agregarBtn) agregarBtn.addEventListener("click", async () => {
      await sb.from("resultados_aprendizaje").insert({ programa_id: id, resultado: "Nuevo resultado de aprendizaje", saberes: "" });
      renderProgramaUnidad(id, soloLectura);
    });
  }

  if (!soloLectura) {
    const saveBtn = document.getElementById("save-materia-link");
    if (saveBtn) saveBtn.addEventListener("click", async () => {
      const val = document.getElementById("materia-link").value;
      await sb.from("programa").update({ materia_id: val ? Number(val) : null }).eq("id", id);
      renderProgramaUnidad(id, soloLectura);
    });
    const saveVisBtn = document.getElementById("save-visibilidad");
    if (saveVisBtn) saveVisBtn.addEventListener("click", async () => {
      await sb.from("programa").update({
        mostrar_estrategias: document.getElementById("vis-estrategias").checked,
        mostrar_evidencias: document.getElementById("vis-evidencias").checked,
        mostrar_tiempo: document.getElementById("vis-tiempo").checked
      }).eq("id", id);
      renderProgramaUnidad(id, soloLectura);
    });
    document.querySelectorAll("[data-impartido]").forEach(cb => {
      cb.addEventListener("change", async () => {
        await sb.from("resultados_aprendizaje").update({ impartido: cb.checked }).eq("id", cb.dataset.impartido);
      });
    });
    document.querySelectorAll("[data-toggle-apartado]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const nuevoEstado = btn.dataset.estadoActual !== "true";
        await sb.from("publicaciones").update({ habilitado: nuevoEstado }).eq("id", btn.dataset.toggleApartado);
        renderProgramaUnidad(id, soloLectura);
      });
    });
    document.querySelectorAll("[data-crear-apartado]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const resultadoId = btn.dataset.crearApartado;
        const fila = (items || []).find(it => String(it.id) === String(resultadoId));
        const { error } = await sb.from("publicaciones").insert({
          tipo: "apartado",
          resultado_id: resultadoId,
          materia_id: u.materia_id,
          seccion: u.materias ? u.materias.seccion : null,
          titulo: (fila && fila.resultado ? fila.resultado.replace(/<[^>]*>/g, "").slice(0, 120) : u.unidad) || u.unidad,
          habilitado: true
        });
        if (error) {
          alert("No se pudo crear el apartado: " + (error.message || JSON.stringify(error)));
          return;
        }
        renderProgramaUnidad(id, soloLectura);
      });
    });
    const machoteBtn = document.getElementById("generar-machote-programa-btn");
    if (machoteBtn) machoteBtn.addEventListener("click", () => abrirMachotePrograma(u, items || []));

    const eliminarBtn = document.getElementById("eliminar-unidad-btn");
    if (eliminarBtn) eliminarBtn.addEventListener("click", async () => {
      if (!confirm(`¿Eliminar la unidad "${u.unidad}" por completo? Esto borra también sus resultados de aprendizaje y el vínculo con apartados/cursos. No se puede deshacer.`)) return;
      await sb.from("resultados_aprendizaje").delete().eq("programa_id", id);
      await sb.from("programa").delete().eq("id", id);
      location.hash = "#/programa";
    });
  }
}

async function abrirMachotePrograma(unidad, items) {
  const filasHtml = (items.length ? items : [{}]).map(it => `
      <tr>
        <td contenteditable="true">${it.resultado || ""}</td>
        <td contenteditable="true">${it.saberes || ""}</td>
        <td contenteditable="true">${it.estrategias || ""}</td>
        <td contenteditable="true">${it.evidencias || ""}</td>
        <td contenteditable="true">${it.tiempo || ""}</td>
      </tr>`).join("");

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Machote de programa — ${unidad.unidad}</title>
<style>
  @page { size: letter landscape; margin: 1.4cm; }
  body { font-family: 'IBM Plex Sans', Arial, sans-serif; color: #232323; margin: 0; padding: 1.5rem; }
  .no-print { margin-bottom: 1.2rem; display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; }
  .no-print button { padding: 0.5rem 1rem; font-size: 0.9rem; cursor: pointer; }
  header.machote { text-align: center; border-bottom: 2px solid #16232e; padding-bottom: 0.7rem; margin-bottom: 1.1rem; }
  header.machote h1 { font-size: 1.15rem; margin: 0 0 0.15rem; font-family: Georgia, serif; }
  header.machote .sub { font-size: 0.85rem; color: #555; }
  .campos { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.3rem 1.5rem; margin-bottom: 1.2rem; font-size: 0.92rem; }
  .campo { border-bottom: 1px solid #999; padding: 0.25rem 0.1rem; display: flex; gap: 0.4rem; }
  .campo b { white-space: nowrap; }
  .campo span.linea { flex: 1; }
  .titulo-principal { text-align: center; font-size: 1.3rem; font-weight: 700; font-family: Georgia, serif; border: 1px solid #16232e; padding: 0.6rem; margin: 1rem 0 1.3rem; }
  .titulo-principal[contenteditable="true"]:empty:before { content: "Título principal del machote — haz clic aquí para escribirlo"; color: #999; font-style: italic; font-weight: 400; font-size: 1rem; }
  table { width: 100%; border-collapse: collapse; margin-top: 0.4rem; }
  th, td { border: 1px solid #16232e; padding: 0.5rem 0.4rem; font-size: 0.82rem; text-align: left; vertical-align: top; }
  th { background: #16232e; color: #fff; font-weight: 600; }
  td:empty:before { content: "—"; color: #bbb; }
  @media print { .no-print { display: none; } body { padding: 0; } }
</style>
</head>
<body>
  <div class="no-print">
    <button id="btn-print">Imprimir / Guardar PDF</button>
    <span style="font-size:0.8rem; color:#666;">Puedes escribir directamente sobre el título y las celdas antes de imprimir.</span>
  </div>

  <header class="machote">
    <h1>${INSTITUCION.nombre}</h1>
    <div class="sub">Especialidad: ${INSTITUCION.especialidad} · Docente: ${INSTITUCION.docente}</div>
  </header>

  <div class="campos">
    <div class="campo"><b>Nivel:</b><span class="linea">${unidad.nivel || ""}</span></div>
    <div class="campo"><b>Subárea:</b><span class="linea">${unidad.subarea || ""}</span></div>
    <div class="campo"><b>Tiempo estimado:</b><span class="linea">${unidad.tiempo_estimado ? unidad.tiempo_estimado + " horas" : ""}</span></div>
  </div>

  <div class="titulo-principal" contenteditable="true" id="titulo-principal">${unidad.unidad || ""}</div>

  <table>
    <thead>
      <tr>
        <th style="width:22%;">Resultado de Aprendizaje</th>
        <th style="width:22%;">Saberes Esenciales</th>
        <th style="width:20%;">Estrategias de mediación</th>
        <th style="width:20%;">Evidencias de aprendizaje</th>
        <th style="width:8%;">Tiempo</th>
      </tr>
    </thead>
    <tbody contenteditable="true">
      ${filasHtml}
    </tbody>
  </table>

  <script>
    document.getElementById("btn-print").addEventListener("click", () => window.print());
  </script>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) { alert("El navegador bloqueó la ventana nueva. Permite ventanas emergentes para generar el machote."); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

// ---------- Páginas generales (organizadas por sección) ----------

async function seccionesConEstudiantes() {
  const { data: estudiantes } = await sb.from("estudiantes").select("*").order("apellido1").order("apellido2");
  const porSeccion = {};
  (estudiantes || []).forEach(e => {
    porSeccion[e.seccion] = porSeccion[e.seccion] || [];
    porSeccion[e.seccion].push(e);
  });
  return porSeccion;
}

async function renderEvaluacionesGeneral() {
  const porSeccion = await seccionesConEstudiantes();
  const secciones = Object.keys(porSeccion).sort();
  app.innerHTML = `
    ${topbar()}
    <div class="wrap">
      <h1>Rúbrica y Evaluaciones</h1>
      <p style="color:var(--text-muted); margin-top:-0.6em;">Define las categorías y sus pesos, y debajo revisa las notas de todos los estudiantes por sección.</p>

      <button class="btn secondary small" id="generar-machote-btn" style="margin-top:0.4rem;">Generar machote (imprimir)</button>

      <details class="group-promo" style="margin-top:1.2rem;" open>
        <summary style="font-family:var(--serif); font-weight:600; font-size:1.02rem;">Categorías de la rúbrica</summary>
        <div id="rubrica-form" style="margin-top:0.8rem;">Cargando…</div>
      </details>

      <div class="section-grid" style="margin-top:1.2rem;">
        ${secciones.map(sec => `
          <a class="section-tile flip-card" href="#" data-ir-a-seccion-rubrica="${sec}">
            <div class="flip-card-inner">
              <div class="flip-card-front">
                <div class="num">${sec}</div>
                <div class="count">${(porSeccion[sec] || []).length} estudiantes · ${INSTITUCION.especialidad}</div>
              </div>
              <div class="flip-card-back">
                <div class="flip-cta">Ver rúbrica ganada →</div>
                <div class="flip-sub">Sección ${sec}</div>
              </div>
            </div>
          </a>`).join("")}
      </div>

      ${secciones.map(sec => `
        <details class="group-promo" id="detalle-sec-${sec}" style="margin-top:1.2rem;">
          <summary style="font-family:var(--serif); font-weight:600; font-size:1.02rem;">Sección ${sec}</summary>
          <div id="evaluaciones-sec-${sec}" style="margin-top:0.8rem;">Cargando…</div>
        </details>`).join("")}
    </div>`;
  bindTopbar();

  document.getElementById("generar-machote-btn").addEventListener("click", () => abrirMachoteEvaluaciones(secciones));

  document.querySelectorAll("[data-ir-a-seccion-rubrica]").forEach(a => {
    a.addEventListener("click", (ev) => {
      ev.preventDefault();
      const sec = a.dataset.irASeccionRubrica;
      const detalle = document.getElementById(`detalle-sec-${sec}`);
      if (!detalle) return;
      detalle.open = true;
      detalle.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  await cargarRubricaForm();
  for (const sec of secciones) {
    await cargarEvaluacionesSeccion(sec, porSeccion[sec], `evaluaciones-sec-${sec}`);
  }
}

async function abrirMachoteEvaluaciones(secciones) {
  const { data: materias } = await sb.from("materias").select("*").order("seccion").order("nombre");

  const opcionesMaterias = (materias || []).map(m => `<option value="${m.id}">${m.nombre} (${m.seccion})</option>`).join("");

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Machote de evaluación</title>
<style>
  @page { size: letter portrait; margin: 1.6cm; }
  body { font-family: 'IBM Plex Sans', Arial, sans-serif; color: #232323; margin: 0; padding: 1.5rem; }
  .no-print { margin-bottom: 1.2rem; display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; }
  .no-print select, .no-print input { padding: 0.4rem 0.5rem; font-size: 0.9rem; }
  .no-print button { padding: 0.5rem 1rem; font-size: 0.9rem; cursor: pointer; }
  header.machote { text-align: center; border-bottom: 2px solid #16232e; padding-bottom: 0.7rem; margin-bottom: 1.1rem; }
  header.machote h1 { font-size: 1.15rem; margin: 0 0 0.15rem; font-family: Georgia, serif; }
  header.machote .sub { font-size: 0.85rem; color: #555; }
  .campos { display: grid; grid-template-columns: 1fr 1fr; gap: 0.3rem 1.5rem; margin-bottom: 1.2rem; font-size: 0.92rem; }
  .campo { border-bottom: 1px solid #999; padding: 0.25rem 0.1rem; display: flex; gap: 0.4rem; }
  .campo b { white-space: nowrap; }
  .campo span.linea { flex: 1; }
  .titulo-principal { text-align: center; font-size: 1.3rem; font-weight: 700; font-family: Georgia, serif; border: 1px solid #16232e; padding: 0.6rem; margin: 1rem 0 1.3rem; }
  .titulo-principal[contenteditable="true"]:empty:before { content: "Título principal del machote — haz clic aquí para escribirlo"; color: #999; font-style: italic; font-weight: 400; font-size: 1rem; }
  table { width: 100%; border-collapse: collapse; margin-top: 0.4rem; }
  th, td { border: 1px solid #16232e; padding: 0.5rem 0.4rem; font-size: 0.85rem; text-align: left; vertical-align: top; }
  th { background: #16232e; color: #fff; font-weight: 600; }
  td { min-height: 2.4rem; }
  td[contenteditable="true"]:empty:before { content: "—"; color: #bbb; }
  @media print { .no-print { display: none; } body { padding: 0; } }
</style>
</head>
<body>
  <div class="no-print">
    <label>Sección:
      <select id="sel-sec"><option value="">— todas —</option>${secciones.map(s => `<option value="${s}">${s}</option>`).join("")}</select>
    </label>
    <label>Materia:
      <select id="sel-mat"><option value="">— ninguna —</option>${opcionesMaterias}</select>
    </label>
    <button id="btn-print">Imprimir / Guardar PDF</button>
    <span style="font-size:0.8rem; color:#666;">Puedes escribir directamente sobre el título y las celdas antes de imprimir.</span>
  </div>

  <header class="machote">
    <h1>${INSTITUCION.nombre}</h1>
    <div class="sub">Especialidad: ${INSTITUCION.especialidad} · Docente: ${INSTITUCION.docente}</div>
  </header>

  <div class="campos">
    <div class="campo"><b>Nivel / Sección:</b><span class="linea" contenteditable="true" id="campo-seccion"></span></div>
    <div class="campo"><b>Materia:</b><span class="linea" contenteditable="true" id="campo-materia"></span></div>
    <div class="campo"><b>Fecha:</b><span class="linea" contenteditable="true"></span></div>
    <div class="campo"><b>Trimestre:</b><span class="linea" contenteditable="true"></span></div>
  </div>

  <div class="titulo-principal" contenteditable="true" id="titulo-principal"></div>

  <table>
    <thead>
      <tr>
        <th style="width:22%;">Resultado de Aprendizaje</th>
        <th style="width:22%;">Indicador</th>
        <th style="width:28%;">Criterios</th>
        <th style="width:10%;">Puntaje</th>
        <th style="width:18%;">Fecha</th>
      </tr>
    </thead>
    <tbody id="filas-machote">
      ${Array.from({ length: 6 }, () => `
      <tr>
        <td contenteditable="true"></td>
        <td contenteditable="true"></td>
        <td contenteditable="true"></td>
        <td contenteditable="true"></td>
        <td contenteditable="true"></td>
      </tr>`).join("")}
    </tbody>
  </table>

  <script>
    const MATERIAS = ${JSON.stringify(materias || [])};
    document.getElementById("btn-print").addEventListener("click", () => window.print());
    document.getElementById("sel-sec").addEventListener("change", (e) => {
      document.getElementById("campo-seccion").textContent = e.target.value;
    });
    document.getElementById("sel-mat").addEventListener("change", (e) => {
      const m = MATERIAS.find(x => String(x.id) === e.target.value);
      document.getElementById("campo-materia").textContent = m ? m.nombre : "";
      if (m && !document.getElementById("campo-seccion").textContent) {
        document.getElementById("campo-seccion").textContent = m.seccion;
      }
      document.getElementById("titulo-principal").textContent = m ? m.nombre.toUpperCase() : "";
    });
  </script>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) { alert("El navegador bloqueó la ventana nueva. Permite ventanas emergentes para generar el machote."); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

async function cargarRubricaForm() {
  const { data: cats } = await sb.from("rubrica_categorias").select("*").order("orden");
  const holder = document.getElementById("rubrica-form");
  if (!holder) return;

  function pintar(categorias) {
    const suma = categorias.reduce((acc, c) => acc + Number(c.porcentaje || 0), 0);
    holder.innerHTML = `
      <div class="roster" style="border-top:1px solid var(--ink);">
        ${categorias.map(c => `
          <div class="roster-row">
            <input type="text" data-nombre="${c.id}" value="${c.nombre}" style="border:1px solid var(--paper-line); border-radius:3px; padding:0.35rem 0.5rem; font-family:var(--sans); font-size:0.9rem; flex:1; margin-right:1rem;" />
            <span style="display:flex; align-items:center; gap:0.4rem;">
              <input type="number" min="0" max="100" step="1" data-porcentaje="${c.id}" value="${c.porcentaje}" style="width:4.5rem; border:1px solid var(--paper-line); border-radius:3px; padding:0.35rem 0.5rem; font-family:var(--sans); font-size:0.9rem; text-align:right;" />
              <span>%</span>
              <button class="btn danger small" data-del-cat="${c.id}">Eliminar</button>
            </span>
          </div>`).join("") || '<p class="empty">Sin categorías todavía.</p>'}
      </div>
      <p style="margin-top:0.8rem; font-weight:600; ${suma > 100 ? "color:var(--brick);" : "color:var(--ledger-green-deep);"}">
        Suma actual: ${suma}% ${suma > 100 ? "— supera el 100%, no se puede guardar así." : ""}
      </p>
      <div class="row" style="margin-top:0.6rem; display:flex; gap:0.6rem;">
        <button class="btn small" id="guardar-rubrica">Guardar cambios</button>
      </div>
      <form class="inline-form" id="add-cat-form" style="margin-top:1.2rem;">
        <input name="nombre" placeholder="Nueva categoría (ej. Coevaluación)" required style="flex:1; min-width:10rem" />
        <input name="porcentaje" type="number" min="0" max="100" step="1" placeholder="%" required style="width:5rem" />
        <button class="btn small" type="submit">Agregar categoría</button>
      </form>`;

    document.getElementById("guardar-rubrica").addEventListener("click", async () => {
      const nombres = {};
      const porcentajes = {};
      document.querySelectorAll("[data-nombre]").forEach(i => nombres[i.dataset.nombre] = i.value.trim());
      document.querySelectorAll("[data-porcentaje]").forEach(i => porcentajes[i.dataset.porcentaje] = Number(i.value));
      const nuevaSuma = Object.values(porcentajes).reduce((a, b) => a + b, 0);
      if (nuevaSuma > 100) {
        alert("La suma de los porcentajes no puede superar 100%. Ajusta los valores antes de guardar.");
        return;
      }
      for (const id of Object.keys(nombres)) {
        await sb.from("rubrica_categorias").update({ nombre: nombres[id], porcentaje: porcentajes[id] }).eq("id", id);
      }
      cargarRubricaForm();
    });

    document.querySelectorAll("[data-del-cat]").forEach(btn => {
      btn.addEventListener("click", async () => {
        await sb.from("rubrica_categorias").delete().eq("id", btn.dataset.delCat);
        cargarRubricaForm();
      });
    });

    document.getElementById("add-cat-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const nuevoPorcentaje = Number(f.get("porcentaje"));
      if (suma + nuevoPorcentaje > 100) {
        alert(`No puedes agregar esa categoría: la suma quedaría en ${suma + nuevoPorcentaje}%, más de 100%.`);
        return;
      }
      await sb.from("rubrica_categorias").insert({ nombre: f.get("nombre"), porcentaje: nuevoPorcentaje, orden: categorias.length + 1 });
      cargarRubricaForm();
    });
  }

  pintar(cats || []);
}

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", render);

/* ============ Documento definitivo en trabajos cotidianos ============
   El estudiante puede adjuntar UN documento por trabajo; una vez subido
   no puede cambiarlo ni borrarlo. Solo el docente puede permitir reintento. */
const DOC_DEF_MAX_MB = 20;
const DOC_DEF_EXT_OK = /\.(pdf|docx?|xlsx?|pptx?|txt|csv|odt|ods|odp|jpe?g|png|webp|zip|rar)$/i;

async function agregarDocumentoDefinitivo(holder, trabajos, estudianteId, prefijo) {
  prefijo = prefijo || "";
  if (!session) { const d = document.createElement("div"); d.textContent = "⚠️ Sin sesión para adjuntar documento."; holder && holder.appendChild(d); return; }
  try {
    if (!holder || !session) return;
    const filas = trabajos.map(t => { const w = holder.querySelector(`[data-fila-trabajo="${t.id}"]`); return w ? (w.querySelector(":scope > .roster-row") || w) : null; });
    if (filas.some(f => !f)) { console.warn("documento: filas no coinciden"); const d = document.createElement("div"); d.style.cssText = "font-size:0.78rem; color:#b00; padding:0.4rem;"; d.textContent = "⚠️ «Adjuntar documento»: no se pudo ubicar los trabajos en pantalla."; holder.appendChild(d); return; }
    const nota = (fila, html) => { const d = document.createElement("div"); d.style.cssText = "width:100%; font-size:0.78rem; color:var(--text-muted); border-top:1px dashed var(--border, #ccc); padding-top:0.4rem;"; d.innerHTML = html; fila.appendChild(d); };
    if (session.role !== "estudiante") { filas.forEach(f => nota(f, "📄 Vista previa: aquí el estudiante verá el botón «Adjuntar documento» (entrega definitiva).")); return; }
    const { data: docs, error } = await sb.from("documentos_entrega").select("*")
      .eq("estudiante_id", estudianteId).in("trabajo_id", trabajos.map(t => prefijo + String(t.id)));
    if (error) { filas.forEach(f => nota(f, "⚠️ No se pudo cargar «Adjuntar documento»: " + escInfografia(error.message))); return; }
    const porTrabajo = {};
    (docs || []).forEach(d => { porTrabajo[d.trabajo_id] = d; });
    filas.forEach((fila, i) => {
      const t = trabajos[i];
      const d = porTrabajo[prefijo + String(t.id)];
      const bloque = document.createElement("div");
      bloque.style.cssText = "width:100%; border-top:1px dashed var(--border, #ccc); padding-top:0.4rem; display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;";
      if (d) {
        const url = sb.storage.from("materiales").getPublicUrl(d.archivo_ruta).data.publicUrl;
        bloque.innerHTML = `<span class="badge" style="background:var(--success-bg); color:var(--success-text);">📄 Documento entregado: ${escInfografia(d.archivo_nombre || "archivo")}</span>
          <a class="btn secondary small" href="${url}" target="_blank" rel="noopener">👁️ Ver</a>
          <span style="font-size:0.78rem; color:var(--text-muted);">🔒 Entrega definitiva — no se puede cambiar ni eliminar.</span>`;
      } else {
        bloque.innerHTML = `<label class="btn secondary small" style="cursor:pointer;">📄 Adjuntar documento<input type="file" style="display:none;" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.odt,.ods,.odp,image/*,.zip,.rar" /></label>
          <span style="font-size:0.78rem; color:var(--text-muted);">Una sola vez: después no podrás cambiarlo.</span>
          <span data-doc-estado style="font-size:0.78rem;"></span>`;
        const input = bloque.querySelector("input");
        const estado = bloque.querySelector("[data-doc-estado]");
        input.addEventListener("change", async () => {
          const f = input.files && input.files[0];
          if (!f) return;
          if (!DOC_DEF_EXT_OK.test(f.name)) { estado.style.color = "var(--danger-text, #b00)"; estado.textContent = "Tipo de archivo no permitido."; input.value = ""; return; }
          if (f.size > DOC_DEF_MAX_MB * 1024 * 1024) { estado.style.color = "var(--danger-text, #b00)"; estado.textContent = `Máximo ${DOC_DEF_MAX_MB} MB.`; input.value = ""; return; }
          if (!confirm(`Vas a entregar "${f.name}".\n\nUna vez subido NO podrás cambiarlo ni eliminarlo. ¿Confirmás?`)) { input.value = ""; return; }
          estado.style.color = "var(--text-muted)"; estado.textContent = "Subiendo…"; input.disabled = true;
          const limpio = f.name.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
          const ruta = `documentos/${prefijo.replace(":", "-")}${t.id}/${estudianteId}_${Date.now()}_${limpio}`;
          const { error: eUp } = await sb.storage.from("materiales").upload(ruta, f, { upsert: false });
          if (eUp) { estado.style.color = "var(--danger-text, #b00)"; estado.textContent = "No se pudo subir: " + eUp.message; input.disabled = false; return; }
          const { error: eIns } = await sb.from("documentos_entrega").insert({ trabajo_id: prefijo + String(t.id), estudiante_id: estudianteId, archivo_ruta: ruta, archivo_nombre: f.name });
          if (eIns) {
            await sb.storage.from("materiales").remove([ruta]);
            estado.style.color = "var(--danger-text, #b00)";
            estado.textContent = /duplicate|unique/i.test(eIns.message) ? "Ya habías entregado un documento." : "No se pudo guardar: " + eIns.message;
            input.disabled = false; return;
          }
          const url2 = sb.storage.from("materiales").getPublicUrl(ruta).data.publicUrl;
          bloque.innerHTML = `<span class="badge" style="background:var(--success-bg); color:var(--success-text);">📄 Documento entregado: ${escInfografia(f.name)}</span>
            <a class="btn secondary small" href="${url2}" target="_blank" rel="noopener">👁️ Ver</a>
            <span style="font-size:0.78rem; color:var(--text-muted);">🔒 Entrega definitiva — no se puede cambiar ni eliminar.</span>`;
        });
      }
      fila.appendChild(bloque);
    });
  } catch (e) { console.warn("documento definitivo", e); try { const d = document.createElement("div"); d.style.cssText = "font-size:0.78rem; color:#b00; padding:0.4rem;"; d.textContent = "⚠️ Error en «Adjuntar documento»: " + (e && e.message); holder.appendChild(d); } catch (_) {} }
}

function badgeSalidas(n) {
  n = Number(n) || 0;
  return `<span class="badge" style="${n > 0 ? "background:var(--warn-bg); color:var(--warn-text);" : ""}" title="Veces que salió de la pantalla de la actividad (cambió de pestaña, minimizó o salió de pantalla completa)">${n > 0 ? "⚠️ Salió " + n + (n === 1 ? " vez" : " veces") : "✓ Sin salidas"}</span>`;
}

async function agregarPanelDocumentosDocente(holder, trabajos, prefijo) {
  prefijo = prefijo || "";
  try {
    if (!holder || !session || session.role !== "docente") return;
    const filas = trabajos.map(t => { const w = holder.querySelector(`[data-fila-trabajo="${t.id}"]`); return w ? (w.querySelector(":scope > .roster-row") || w) : null; });
    if (filas.some(f => !f)) { console.warn("documento: filas no coinciden"); const d = document.createElement("div"); d.style.cssText = "font-size:0.78rem; color:#b00; padding:0.4rem;"; d.textContent = "⚠️ «Adjuntar documento»: no se pudo ubicar los trabajos en pantalla."; holder.appendChild(d); return; }
    filas.forEach((fila, i) => {
      const t = trabajos[i];
      const det = document.createElement("details");
      det.style.cssText = "width:100%;";
      det.innerHTML = `<summary style="cursor:pointer; font-size:0.85rem;">📄 Documentos adjuntos por estudiantes</summary><div data-docs-lista style="margin-top:0.4rem;"></div>`;
      const lista = det.querySelector("[data-docs-lista]");
      const pintar = async () => {
        lista.innerHTML = `<p style="font-size:0.82rem; color:var(--text-muted);">Cargando…</p>`;
        const { data: docs, error } = await sb.from("documentos_entrega").select("*").eq("trabajo_id", prefijo + String(t.id)).order("creado_en");
        if (error) { lista.innerHTML = `<p style="font-size:0.82rem;">Aún no existe la tabla de documentos (falta correr el SQL).</p>`; return; }
        if (!docs || !docs.length) { lista.innerHTML = `<p style="font-size:0.82rem; color:var(--text-muted);">Nadie ha adjuntado documentos.</p>`; return; }
        const { data: ests } = await sb.from("estudiantes").select("id, nombre, apellido1, apellido2").in("id", docs.map(d => d.estudiante_id));
        const nom = {}; (ests || []).forEach(e => { nom[e.id] = [e.nombre, e.apellido1, e.apellido2].filter(Boolean).join(" "); });
        lista.innerHTML = docs.map(d => {
          const url = sb.storage.from("materiales").getPublicUrl(d.archivo_ruta).data.publicUrl;
          return `<div class="roster-row" style="gap:0.5rem; flex-wrap:wrap;"><span class="name">${escInfografia(nom[d.estudiante_id] || d.estudiante_id)}</span>
            <a class="btn secondary small" href="${url}" target="_blank" rel="noopener">📄 ${escInfografia(d.archivo_nombre || "archivo")}</a>
            <span style="font-size:0.75rem; color:var(--text-muted);">${formatearFechaHora(d.creado_en)}</span>
            <button class="btn danger small" data-doc-reintento="${d.id}">Permitir reintento</button></div>`;
        }).join("");
        lista.querySelectorAll("[data-doc-reintento]").forEach(b => b.addEventListener("click", async () => {
          if (!confirm("¿Eliminar este documento para que el estudiante pueda subir otro?")) return;
          const d = docs.find(x => String(x.id) === b.dataset.docReintento);
          await sb.from("documentos_entrega").delete().eq("id", b.dataset.docReintento);
          if (d) await sb.storage.from("materiales").remove([d.archivo_ruta]);
          pintar();
        }));
      };
      det.addEventListener("toggle", () => { if (det.open) pintar(); });
      fila.appendChild(det);
      if (!prefijo && ["seleccion_unica", "falso_verdadero", "crucigrama", "sopa_letras", "prueba", "autoevaluacion"].includes(t.tipo_actividad)) agregarPanelHabilitarDeNuevo(fila, t);
    });
  } catch (e) { console.warn("panel documentos", e); }
}


/* Docente: ver quién ya realizó (o empezó y abandonó) una actividad y volver a habilitarla por estudiante. */
function agregarPanelHabilitarDeNuevo(fila, t) {
  const det = document.createElement("details");
  det.style.cssText = "width:100%;";
  det.innerHTML = `<summary class="btn danger small" style="cursor:pointer; display:inline-block; list-style:none;">🔒 Bloquear / habilitar estudiantes</summary><div data-rehab-lista style="margin-top:0.4rem;"></div><div data-bloq-lista style="margin-top:0.6rem;"></div>`;
  const lista = det.querySelector("[data-rehab-lista]");
  const listaBloq = det.querySelector("[data-bloq-lista]");
  // Bloqueo manual: para estudiantes que ya habían empezado antes de que existiera el bloqueo automático.
  const pintarBloqueo = async (idsConRegistro) => {
    let pubId = t.publicacion_id;
    if (!pubId && t.subtema_id) { const { data: st } = await sb.from("subtemas").select("publicacion_id").eq("id", t.subtema_id).maybeSingle(); pubId = st && st.publicacion_id; }
    let materiaId = null;
    if (pubId) { const { data: pb } = await sb.from("publicaciones").select("materia_id").eq("id", pubId).maybeSingle(); materiaId = pb && pb.materia_id; }
    let ids = [];
    if (materiaId) { const { data: em } = await sb.from("estudiante_materias").select("estudiante_id").eq("materia_id", materiaId); ids = (em || []).map(x => x.estudiante_id); }
    ids = ids.filter(id => !idsConRegistro.includes(id));
    if (!ids.length) { listaBloq.innerHTML = `<p style="font-size:0.78rem; color:var(--text-muted);">No hay otros estudiantes sin registro en esta actividad.</p>`; return; }
    const { data: ests } = await sb.from("estudiantes").select("id, nombre, apellido1, apellido2").in("id", ids);
    const orden = (ests || []).map(e => ({ id: e.id, n: [e.nombre, e.apellido1, e.apellido2].filter(Boolean).join(" ") })).sort((x, y) => x.n.localeCompare(y.n));
    listaBloq.innerHTML = `<p style="font-size:0.82rem; font-weight:600; margin-bottom:0.3rem;">🔒 Bloquear a quienes ya la habían empezado (quedan con nota 0)</p>
      ${orden.map(e => `<label style="display:flex; gap:0.4rem; font-size:0.82rem; align-items:center;"><input type="checkbox" data-bloq-est="${escInfografia(e.id)}" /> ${escInfografia(e.n)}</label>`).join("")}
      <button class="btn danger small" data-bloq-guardar style="margin-top:0.4rem;">🔒 Bloquear seleccionados</button>`;
    listaBloq.querySelector("[data-bloq-guardar]").addEventListener("click", async () => {
      const marcados = [...listaBloq.querySelectorAll("[data-bloq-est]:checked")].map(c => c.dataset.bloqEst);
      if (!marcados.length) { alert("Marcá al menos un estudiante."); return; }
      if (!confirm(`¿Bloquear la actividad a ${marcados.length} estudiante(s)? Quedan con nota 0 hasta que la habilites de nuevo.`)) return;
      for (const id of marcados) {
        await upsertSinConflicto("actividades_estudiante", { trabajo_id: t.id, estudiante_id: id }, { respuestas: [], porcentaje: 0, puntaje: 0, completado: true, actualizado_en: new Date().toISOString() });
        await upsertSinConflicto("trabajos_cotidianos_estudiante", { trabajo_id: t.id, estudiante_id: id }, { completado: true, entregado_en: new Date().toISOString() });
      }
      pintar();
    });
  };
  const pintar = async () => {
    lista.innerHTML = `<p style="font-size:0.82rem; color:var(--text-muted);">Cargando…</p>`;
    const { data: regs } = await sb.from("actividades_estudiante").select("id, estudiante_id, puntaje, respuestas, intentos_salida, actualizado_en").eq("trabajo_id", t.id).eq("completado", true);
    pintarBloqueo((regs || []).map(r => r.estudiante_id));
    if (!regs || !regs.length) { lista.innerHTML = `<p style="font-size:0.82rem; color:var(--text-muted);">Nadie ha realizado esta actividad.</p>`; return; }
    const { data: ests } = await sb.from("estudiantes").select("id, nombre, apellido1, apellido2").in("id", regs.map(r => r.estudiante_id));
    const nom = {}; (ests || []).forEach(e => { nom[e.id] = [e.nombre, e.apellido1, e.apellido2].filter(Boolean).join(" "); });
    lista.innerHTML = regs.map(r => {
      const sinRespuestas = Array.isArray(r.respuestas) && r.respuestas.length === 0 && !r.puntaje;
      return `<div class="roster-row" style="gap:0.5rem; flex-wrap:wrap;"><span class="name">${escInfografia(nom[r.estudiante_id] || r.estudiante_id)}</span>
        <span class="badge" style="${sinRespuestas ? "background:var(--warn-bg); color:var(--warn-text);" : ""}">${sinRespuestas ? "Empezó y no terminó (nota 0)" : "Nota: " + (r.puntaje ?? "—") + "/3"}</span> ${badgeSalidas(r.intentos_salida)}
        <button class="btn secondary small" data-rehab="${r.id}" data-est="${escInfografia(r.estudiante_id)}">🔓 Habilitar de nuevo</button></div>`;
    }).join("");
    lista.querySelectorAll("[data-rehab]").forEach(b => b.addEventListener("click", async () => {
      if (!confirm("¿Habilitar de nuevo la actividad a este estudiante? Se borra su resultado actual y podrá hacerla otra vez.")) return;
      await sb.from("actividades_estudiante").delete().eq("id", b.dataset.rehab);
      await sb.from("trabajos_cotidianos_estudiante").update({ completado: false, entregado_en: null }).eq("trabajo_id", t.id).eq("estudiante_id", b.dataset.est);
      if (t.indicador_id) await sb.from("calificaciones_indicador").delete().eq("indicador_id", t.indicador_id).eq("estudiante_id", b.dataset.est);
      pintar();
    }));
  };
  det.addEventListener("toggle", () => { if (det.open) pintar(); });
  if (fila.firstElementChild && fila.firstElementChild.nextSibling) fila.insertBefore(det, fila.firstElementChild.nextSibling); else fila.appendChild(det);
}
