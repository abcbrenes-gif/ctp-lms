// ─────────────────────────────────────────────────────────────────────────
// Evaluación en formato MEP para Trabajo cotidiano, Tareas y Proyectos
// (el mismo formato del instrumento de La Tiradera).
//
// Normativa en que se basa:
//  · Reglamento de Evaluación de los Aprendizajes (REA, MEP): trabajo
//    cotidiano, tareas y proyecto se califican con instrumentos técnicamente
//    elaborados (escalas de desempeño, rúbricas, listas de cotejo), con
//    indicadores derivados del programa de estudio y criterios conocidos por
//    el estudiantado de antemano.
//  · Lineamientos técnicos de evaluación del MEP y de Educación Técnica
//    Profesional: cada indicador de logro con la evidencia de sus niveles de
//    desempeño (Avanzado 3 · Intermedio 2 · Inicial 1; 0 sin evidencia) y
//    calificación = puntos obtenidos × 100 ÷ total de puntos.
//
// Flujo: el profesor abre "📋 Formato MEP" en Rúbrica y Evaluaciones, edita
// (queda como BORRADOR: los estudiantes no lo ven) y cuando está listo toca
// "📢 Publicar a estudiantes": ahí se actualizan el indicador y sus criterios
// (lo que usa la plataforma para calificar y lo que ven los estudiantes).
//
// Dónde se guarda: los datos del instrumento y los borradores viven en una
// fila de configuración de trabajos_cotidianos por materia
// (contenido_actividad.config_mep = true, sin tema: no aparece en ninguna
// lista). Lo publicado del indicador vive donde siempre: indicadores +
// criterios_indicador.
// ─────────────────────────────────────────────────────────────────────────

const MEP_COMPONENTE = { "Trabajo cotidiano": "Trabajo cotidiano", "Tareas": "Tareas", "Proyectos": "Proyecto" };
const MEP_TIPO_DEFECTO = { "Trabajo cotidiano": "Escala de desempeño", "Tareas": "Escala de desempeño", "Proyectos": "Rúbrica" };
const MEP_TIPOS = ["Escala de desempeño", "Rúbrica", "Lista de cotejo", "Registro anecdótico"];
const MEP_NIVELES3 = { 3: "Avanzado", 2: "Intermedio", 1: "Inicial", 0: "Sin evidencia" };
const MEP_CERO_DESC = "No presenta evidencia del indicador (no realizó o no entregó el trabajo, o tiene ausencia injustificada).";
const MEP_COLOR = ["#fde2e2", "#fdecc8", "#fff6c2", "#dff5e3", "#d6f0ff", "#e8e1ff"];
const MEP_COLOR_TXT = ["#9b1c1c", "#92400e", "#854d0e", "#166534", "#075985", "#4c1d95"];

const mepEsc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const mepLimpio = v => String(v == null ? "" : v).replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/^\s*Nuevo\s*r(?=[A-ZÁÉÍÓÚ])/, "").replace(/\s*Nuevo resultado( de aprendizaje)?\s*$/i, "").replace(/\s+/g, " ").trim();
const mepClave = (categoria, indicadorId) => categoria === "Proyectos" ? "cat:Proyectos" : "ind:" + indicadorId;
const mepCategoriaConFormato = c => !!MEP_COMPONENTE[c];
const mepFecha = iso => { try { return new Date(iso).toLocaleString("es-CR", { dateStyle: "medium", timeStyle: "short" }); } catch { return iso || ""; } };

// ---------- Configuración (datos del instrumento + borradores) ----------
async function mepFilaConfig(materiaId) {
  const { data } = await sb.from("trabajos_cotidianos").select("id, contenido_actividad")
    .eq("contenido_actividad->>config_mep", "true").eq("contenido_actividad->>materia_id", String(materiaId)).order("id").limit(1);
  return data && data[0] ? data[0] : null;
}
async function mepLeerConfig(materiaId) {
  const fila = await mepFilaConfig(materiaId);
  return (fila && fila.contenido_actividad && fila.contenido_actividad.mep) || {};
}
async function mepGuardarEnConfig(materiaId, clave, fn) {
  let fila = await mepFilaConfig(materiaId);
  if (!fila) {
    const { data, error } = await sb.from("trabajos_cotidianos").insert({
      titulo: "Evaluaciones en formato MEP (configuración, no borrar)", tipo_actividad: "rubrica_directa", habilitado: false,
      contenido_actividad: { config_mep: true, sin_asignar: true, materia_id: String(materiaId), mep: {} }
    }).select("id, contenido_actividad").maybeSingle();
    if (error) throw error;
    fila = data;
  }
  const c = fila.contenido_actividad || {};
  const mep = { ...(c.mep || {}) };
  const nuevo = fn({ ...(mep[clave] || {}) });
  if (nuevo === null) delete mep[clave]; else mep[clave] = nuevo;
  const { error } = await sb.from("trabajos_cotidianos").update({ contenido_actividad: { ...c, mep } }).eq("id", fila.id);
  if (error) throw error;
  return mep[clave];
}

// ---------- Datos "vivos" (lo publicado hoy en la plataforma) ----------
function mepNivelesDeIndicador(ind, usarNombresMEP) {
  const max = Number(ind.puntaje_maximo) || 3;
  const porPuntaje = {};
  (ind.criterios_indicador || []).forEach(c => { porPuntaje[Number(c.puntaje)] = c; });
  let puntajes;
  if (max <= 6) puntajes = Array.from({ length: max + 1 }, (_, p) => max - p);
  else puntajes = Object.keys(porPuntaje).map(Number).sort((a, b) => b - a);
  if (!puntajes.length) puntajes = [max, 0];
  return puntajes.map(p => {
    const c = porPuntaje[p];
    const nombreMEP = max === 3 ? MEP_NIVELES3[p] : (p === 0 ? MEP_NIVELES3[0] : "");
    return {
      puntaje: p,
      nivel: (usarNombresMEP && nombreMEP) ? nombreMEP : ((c && c.nivel) || nombreMEP || ""),
      descripcion: mepLimpio(c && c.descripcion) || (p === 0 ? MEP_CERO_DESC : "")
    };
  });
}

async function mepInstrumentoBase(materiaId, categoria, indicadores) {
  const ins = { componente: MEP_COMPONENTE[categoria] || categoria, tipo: MEP_TIPO_DEFECTO[categoria] || "Escala de desempeño", subarea: "", unidad: "", resultado: "", indicador: "" };
  try {
    const { data: mat } = await sb.from("materias").select("nombre").eq("id", materiaId).maybeSingle();
    if (mat) ins.subarea = mepLimpio(mat.nombre);
    const resId = (indicadores.find(i => i.resultado_id) || {}).resultado_id;
    if (resId) {
      const { data: res } = await sb.from("resultados_aprendizaje").select("resultado").eq("id", resId).maybeSingle();
      if (res) ins.resultado = mepLimpio(res.resultado);
      const { data: tema } = await sb.from("publicaciones").select("titulo").eq("resultado_id", resId).eq("tipo", "apartado").limit(1);
      if (tema && tema[0]) ins.unidad = mepLimpio(tema[0].titulo).slice(0, 160);
    }
  } catch (e) { console.warn("MEP instrumento base", e); }
  return ins;
}

async function mepIndicadoresDeGrupo(materiaId, categoria, indicadorId, soloHabilitados) {
  let q = sb.from("indicadores").select("*, criterios_indicador(*)").eq("materia_id", materiaId).eq("categoria", categoria).order("orden");
  if (categoria !== "Proyectos") q = q.eq("id", indicadorId);
  const { data } = await q;
  let lista = data || [];
  if (soloHabilitados && lista.length) {
    const { data: tcs } = await sb.from("trabajos_cotidianos").select("indicador_id, habilitado").in("indicador_id", lista.map(i => i.id));
    const hab = {}; (tcs || []).forEach(t => { hab[t.indicador_id] = t.habilitado !== false; });
    lista = lista.filter(i => !(i.id in hab) || hab[i.id] || String(i.id) === String(indicadorId));
  }
  return lista;
}

function mepCriteriosDesdeIndicadores(indicadores, usarNombresMEP) {
  return indicadores.map(i => ({ indicador_id: i.id, letra: i.letra, nombre: mepLimpio(i.descripcion), puntos_max: Number(i.puntaje_maximo) || 3, niveles: mepNivelesDeIndicador(i, usarNombresMEP) }));
}

// ---------- Vista del instrumento (lo que ve el estudiante) ----------
function mepInstrumentoHTML(titulo, I, criterios, obtenidos) {
  const total = criterios.reduce((a, c) => a + (Number(c.puntos_max) || 0), 0);
  const conObt = obtenidos && criterios.some(c => obtenidos[c.indicador_id] !== undefined);
  const totObt = conObt ? criterios.reduce((a, c) => a + Number(obtenidos[c.indicador_id] || 0), 0) : 0;
  const dato = (et, v) => v ? `<div style="margin:0.15rem 0;"><b>${et}:</b> ${mepEsc(v)}</div>` : "";
  const firma = c => c.niveles.map(n => n.puntaje).join(",");
  const mismaEscala = criterios.length > 0 && criterios.every(c => firma(c) === firma(criterios[0]));
  const chip = (n, idx, cant) => { const k = Math.max(0, Math.min(5, cant - 1 - idx)); return `background:${MEP_COLOR[k]}; color:${MEP_COLOR_TXT[k]};`; };
  const th = "border:1px solid #cfd4dc; padding:0.45rem; text-align:left; vertical-align:bottom; font-size:0.8rem;";
  const td = "border:1px solid #cfd4dc; padding:0.45rem; vertical-align:top; font-size:0.82rem;";
  let tabla;
  if (mismaEscala) {
    const nv = criterios[0].niveles;
    tabla = `<table style="width:100%; border-collapse:collapse;"><thead><tr><th style="${th}">Indicador / criterio de desempeño</th>
      ${nv.map((n, idx) => `<th style="${th} ${chip(n, idx, nv.length)}">${mepEsc(n.nivel || "Nivel")} (${n.puntaje})</th>`).join("")}
      <th style="${th} text-align:center;">Puntos</th>${conObt ? `<th style="${th} text-align:center;">Obtenidos</th>` : ""}</tr></thead><tbody>
      ${criterios.map((c, i) => `<tr><td style="${td}"><b>${c.letra ? mepEsc(c.letra) + ". " : (i + 1) + ". "}${mepEsc(c.nombre)}</b></td>
        ${c.niveles.map(n => `<td style="${td}">${mepEsc(n.descripcion)}</td>`).join("")}
        <td style="${td} text-align:center;"><b>${c.puntos_max}</b></td>${conObt ? `<td style="${td} text-align:center;"><b>${obtenidos[c.indicador_id] === undefined ? "—" : obtenidos[c.indicador_id]}</b></td>` : ""}</tr>`).join("")}
      <tr><td colspan="${nv.length + 1}" style="${td} text-align:right;"><b>Total de puntos</b></td><td style="${td} text-align:center;"><b>${total}</b></td>${conObt ? `<td style="${td} text-align:center;"><b>${totObt}</b></td>` : ""}</tr>
      </tbody></table>`;
  } else {
    tabla = criterios.map((c, i) => `<div style="border:1px solid #cfd4dc; border-radius:10px; padding:0.6rem; margin-bottom:0.5rem;">
      <div style="display:flex; justify-content:space-between; gap:0.5rem; flex-wrap:wrap;"><b>${c.letra ? mepEsc(c.letra) + ". " : (i + 1) + ". "}${mepEsc(c.nombre)}</b>
      <span><b>${c.puntos_max}</b> pts${conObt ? ` · obtenidos: <b>${obtenidos[c.indicador_id] === undefined ? "—" : obtenidos[c.indicador_id]}</b>` : ""}</span></div>
      ${c.niveles.map((n, idx) => `<div style="display:flex; gap:0.5rem; margin-top:0.35rem; font-size:0.82rem;"><span style="flex:0 0 9.5rem; border-radius:6px; padding:0.15rem 0.4rem; font-weight:700; ${chip(n, idx, c.niveles.length)}">${mepEsc(n.nivel || "Nivel")} (${n.puntaje})</span><span>${mepEsc(n.descripcion)}</span></div>`).join("")}
    </div>`).join("") + `<p style="text-align:right; margin:0.3rem 0;"><b>Total de puntos: ${total}</b>${conObt ? ` · <b>obtenidos: ${totObt}</b>` : ""}</p>`;
  }
  return `
    <h2 style="margin:0 0 2px; font-size:1.25rem;">📋 Instrumento de evaluación · ${mepEsc(titulo)}</h2>
    <p style="margin:0 0 10px; color:#667085; font-size:0.85rem;">${mepEsc(I.tipo)} · Componente: ${mepEsc(I.componente)} · CTP Mercedes Norte</p>
    <div style="background:#f6f4ff; border:1px solid #e3ddff; border-radius:12px; padding:0.6rem 0.8rem; margin-bottom:0.8rem; font-size:0.85rem;">
      ${dato("Subárea", I.subarea)}${dato("Unidad de estudio / tema", I.unidad)}${dato("Resultado de aprendizaje", I.resultado)}${dato("Indicador de logro", I.indicador)}
    </div>
    <div style="overflow-x:auto;">${tabla}</div>
    <div style="display:flex; gap:0.6rem; flex-wrap:wrap; margin-top:0.8rem;">
      <div style="flex:1 1 16rem; background:#f8fafc; border:1px solid #e5e7eb; border-radius:10px; padding:0.6rem; font-size:0.82rem;"><b>Calificación</b><br>Puntos obtenidos × 100 ÷ ${total} = calificación del instrumento.${conObt && total ? `<br>Tu resultado hasta ahora: <b>${totObt} de ${total}</b> (${(totObt / total * 100).toFixed(1)} %).` : ""}</div>
      <div style="flex:1 1 16rem; background:#f8fafc; border:1px solid #e5e7eb; border-radius:10px; padding:0.6rem; font-size:0.82rem;"><b>Escala</b><br>Avanzado = 3 · Intermedio = 2 · Inicial = 1 · Sin evidencia = 0. Si no presentás evidencia de un indicador, obtenés 0 puntos en ese indicador.</div>
    </div>`;
}

function mepAbrirModal(html, tituloImpresion) {
  const viejo = document.getElementById("mep-modal"); if (viejo) viejo.remove();
  const d = document.createElement("div");
  d.id = "mep-modal";
  d.style.cssText = "position:fixed; inset:0; background:rgba(20,8,60,.6); z-index:9999; display:grid; place-items:center; padding:16px;";
  d.innerHTML = `<div style="background:#fff; color:#111; border-radius:20px; box-shadow:0 20px 60px rgba(0,0,0,.3); padding:22px; max-width:980px; width:100%; max-height:90vh; overflow:auto;">
    ${html}
    <div style="display:flex; gap:0.5rem; justify-content:flex-end; margin-top:1rem;">
      <button class="btn secondary small" type="button" data-mep-imprimir>🖨️ Imprimir / PDF</button>
      <button class="btn small" type="button" data-mep-cerrar>Cerrar</button></div></div>`;
  document.body.appendChild(d);
  const cerrar = () => d.remove();
  d.addEventListener("click", e => { if (e.target === d) cerrar(); });
  d.querySelector("[data-mep-cerrar]").addEventListener("click", cerrar);
  d.querySelector("[data-mep-imprimir]").addEventListener("click", () => {
    const w = window.open("", "_blank");
    if (!w) { alert("El navegador bloqueó la ventana. Permití ventanas emergentes para este sitio."); return; }
    w.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${mepEsc(tituloImpresion || "Instrumento de evaluación")}</title><style>body{font-family:Arial,sans-serif;margin:24px;color:#111}button{margin-bottom:12px;padding:8px 14px}@media print{button{display:none}}</style></head><body><button onclick="window.print()">🖨️ Imprimir / guardar PDF</button>${html}</body></html>`);
    w.document.close();
  });
}

// Lo que ve el estudiante: siempre lo PUBLICADO (nunca el borrador).
async function mepVerEvaluacion({ materiaId, categoria, indicadorId, titulo, obtenidos, soloHabilitados }) {
  try {
    const inds = await mepIndicadoresDeGrupo(materiaId, categoria, indicadorId, soloHabilitados);
    if (!inds.length) { alert("Esta evaluación todavía no tiene indicadores."); return; }
    const cfg = await mepLeerConfig(materiaId);
    const pub = (cfg[mepClave(categoria, indicadorId)] || {}).publicado;
    const I = { ...(await mepInstrumentoBase(materiaId, categoria, inds)), ...((pub && pub.instrumento) || {}) };
    const criterios = mepCriteriosDesdeIndicadores(inds, false);
    const t = titulo || (categoria === "Proyectos" ? "Proyecto" : (criterios[0] && criterios[0].nombre) || categoria);
    mepAbrirModal(mepInstrumentoHTML(t, I, criterios, obtenidos), "Instrumento · " + t);
  } catch (e) {
    alert("No se pudo abrir la evaluación: " + (e.message || e));
  }
}

// ---------- Editor del profesor ----------
async function mepAbrirEditor(panel, { materiaId, categoria, indicadorId, titulo, alPublicar }) {
  if (panel.dataset.mepAbierto === "1") { panel.innerHTML = ""; panel.dataset.mepAbierto = ""; return; }
  panel.dataset.mepAbierto = "1";
  panel.innerHTML = `<p style="font-size:0.82rem; color:var(--text-muted);">Cargando evaluación…</p>`;
  const clave = mepClave(categoria, indicadorId);
  const inds = await mepIndicadoresDeGrupo(materiaId, categoria, indicadorId, false);
  const cfg = await mepLeerConfig(materiaId);
  let reg = cfg[clave] || {};
  const base = await mepInstrumentoBase(materiaId, categoria, inds);
  const vivos = mepCriteriosDesdeIndicadores(inds, true);
  let ins, lista;
  const desdeBorrador = () => {
    const b = reg.borrador;
    ins = { ...base, ...((reg.publicado && reg.publicado.instrumento) || {}), ...((b && b.instrumento) || {}) };
    lista = vivos.map(v => { const d = b && (b.criterios || []).find(x => String(x.indicador_id) === String(v.indicador_id)); return d ? { ...v, nombre: d.nombre, niveles: d.niveles } : v; });
  };
  desdeBorrador();
  const tituloGrupo = titulo || (categoria === "Proyectos" ? "Proyecto" : (vivos[0] && vivos[0].nombre) || categoria);

  const leer = () => {
    panel.querySelectorAll("[data-mep-ins]").forEach(x => { ins[x.dataset.mepIns] = x.value.trim(); });
    lista = lista.map((c, i) => ({
      ...c,
      nombre: (panel.querySelector(`[data-mep-nombre="${i}"]`)?.value || "").trim(),
      niveles: c.niveles.map((n, j) => ({
        puntaje: n.puntaje,
        nivel: (panel.querySelector(`[data-mep-nivel="${i}-${j}"]`)?.value || "").trim(),
        descripcion: (panel.querySelector(`[data-mep-desc="${i}-${j}"]`)?.value || "").trim()
      }))
    }));
  };
  const estadoHTML = () => {
    if (reg.borrador) return `<span class="badge" style="background:#fff6c2; color:#854d0e;">🟡 Borrador guardado ${mepFecha(reg.borrador.guardado_en)} — los estudiantes todavía no lo ven</span>`;
    if (reg.publicado) return `<span class="badge" style="background:#dff5e3; color:#166534;">🟢 Publicado ${mepFecha(reg.publicado.fecha)} — es lo que ven los estudiantes</span>`;
    return `<span class="badge" style="background:#eef2ff; color:#3730a3;">⚪ Sin publicar en formato MEP — los estudiantes ven los criterios actuales</span>`;
  };
  const campo = (k, et, ph, span) => `<label style="display:flex; flex-direction:column; gap:0.25rem; font-size:0.8rem; font-weight:600; ${span ? "grid-column:span 2;" : ""}">${et}
      <input data-mep-ins="${k}" value="${mepEsc(ins[k] || "")}" placeholder="${mepEsc(ph)}" style="padding:0.5rem 0.6rem; border:1px solid var(--paper-line); border-radius:10px; font-weight:400;" /></label>`;
  const sel = (k, et, ops) => `<label style="display:flex; flex-direction:column; gap:0.25rem; font-size:0.8rem; font-weight:600;">${et}
      <select data-mep-ins="${k}" style="padding:0.5rem 0.6rem; border:1px solid var(--paper-line); border-radius:10px; font-weight:400;">${ops.map(o => `<option ${ins[k] === o ? "selected" : ""}>${o}</option>`).join("")}</select></label>`;
  const tarjeta = (c, i) => {
    const cant = c.niveles.length;
    const ia = [3, 2, 1].every(p => c.niveles.some(n => n.puntaje === p));
    return `<div style="border:1px solid var(--paper-line); border-radius:14px; padding:0.7rem; margin-bottom:0.6rem; background:var(--surface);">
      <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap;">
        <span style="display:grid; place-items:center; min-width:2.2rem; height:2.2rem; border-radius:10px; background:#7c3aed; color:#fff; font-weight:800;">${mepEsc(c.letra || i + 1)}</span>
        <input data-mep-nombre="${i}" value="${mepEsc(c.nombre)}" placeholder="Indicador: verbo + contenido + condición" style="flex:1 1 18rem; padding:0.5rem 0.6rem; border:1px solid var(--paper-line); border-radius:10px;" />
        <span style="font-size:0.8rem; font-weight:700;">Puntos <span style="display:inline-block; min-width:2.6rem; text-align:center; padding:0.4rem; border:1px solid var(--paper-line); border-radius:10px; background:var(--surface-soft);" title="El puntaje máximo no se cambia aquí para no descuadrar las notas ya puestas">${c.puntos_max}</span></span>
      </div>
      <details style="margin:0.5rem 0 0 2.7rem;" open><summary style="cursor:pointer; font-size:0.82rem; font-weight:700; color:#6d28d9;">Niveles de desempeño (evidencia de cada nivel)</summary>
        ${c.niveles.map((n, j) => { const k = Math.max(0, Math.min(5, cant - 1 - j)); return `<div style="display:flex; gap:0.5rem; align-items:flex-start; margin-top:0.4rem; flex-wrap:wrap;">
          <span style="flex:0 0 9.5rem; display:flex; flex-direction:column; gap:0.2rem;">
            <input data-mep-nivel="${i}-${j}" value="${mepEsc(n.nivel)}" placeholder="Nivel" style="padding:0.35rem 0.5rem; border:0; border-radius:8px; font-weight:700; background:${MEP_COLOR[k]}; color:${MEP_COLOR_TXT[k]};" />
            <small style="color:var(--text-muted);">${n.puntaje} punto${n.puntaje === 1 ? "" : "s"}</small></span>
          <textarea data-mep-desc="${i}-${j}" rows="2" placeholder="Evidencia observable de este nivel" style="flex:1 1 18rem; padding:0.45rem 0.55rem; border:1px solid var(--paper-line); border-radius:10px; font-family:inherit; font-size:0.85rem; resize:vertical;">${mepEsc(n.descripcion)}</textarea>
        </div>`; }).join("")}
        ${ia ? `<button class="btn secondary small" data-mep-ia="${i}" type="button" style="margin-top:0.45rem;">✨ Mejorar este indicador con IA</button>` : `<p style="font-size:0.75rem; color:var(--text-muted); margin:0.4rem 0 0;">La IA trabaja con la escala de 3 puntos; este indicador se redacta a mano.</p>`}
        ${c.iaNota ? `<div style="font-size:0.75rem; color:#166534; margin-top:0.25rem;">✨ ${mepEsc(c.iaNota)}</div>` : ""}
      </details></div>`;
  };
  const pintar = () => {
    const total = lista.reduce((a, c) => a + (Number(c.puntos_max) || 0), 0);
    panel.innerHTML = `<div style="border:1px solid var(--paper-line); border-radius:18px; padding:1rem; margin-top:0.5rem; background:var(--surface-soft);">
      <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; flex-wrap:wrap;">
        <strong style="font-family:var(--serif); font-size:1.1rem;">📋 Evaluación ${categoria === "Proyectos" ? "del proyecto" : "de este trabajo"} <small style="color:#7c3aed;">(formato MEP)</small></strong>
        <span style="display:flex; gap:0.4rem; flex-wrap:wrap;">
          <button class="btn secondary small" data-mep-vista type="button">👁️ Ver como la ven los estudiantes</button>
          <button class="btn secondary small" data-mep-reset type="button">↺ Volver a lo publicado</button></span>
      </div>
      <div style="margin:0.5rem 0;">${estadoHTML()}</div>
      <div style="border:2px dashed #e9a8f5; background:#fdf4ff; border-radius:14px; padding:0.7rem; margin:0.6rem 0;">
        <span style="font-size:0.85rem;"><strong>✨ Mejorar con IA</strong> <span style="color:var(--text-muted);">— redacta los indicadores (verbo + contenido + condición) y la evidencia de cada nivel según el tema y el resultado de aprendizaje. Usted revisa la propuesta antes de usarla.</span></span>
        <div style="display:flex; gap:0.5rem; margin-top:0.5rem; flex-wrap:wrap;">
          <input data-mep-ia-indic maxlength="400" placeholder="Indicaciones para la IA (opcional). Ej.: enfocar en el formulario D-125, lenguaje sencillo" style="flex:1 1 18rem; padding:0.5rem 0.6rem; border:1px solid var(--paper-line); border-radius:10px;" />
          <button class="btn small" data-mep-ia="todos" type="button" style="background:linear-gradient(90deg,#ec4899,#f97316); border:0;">✨ Mejorar todos los niveles</button></div>
        <span data-mep-ia-estado style="font-size:0.78rem; color:var(--text-muted);"></span>
      </div>
      <p style="font-size:0.8rem; color:var(--text-muted); margin:0.4rem 0 0.7rem;">Solo usted define la evaluación. Instrumento técnicamente elaborado según el programa de estudio, el Reglamento de Evaluación de los Aprendizajes y los lineamientos del MEP (ETP): cada indicador de logro con la evidencia de sus niveles de desempeño (Avanzado 3 · Intermedio 2 · Inicial 1; 0 si no presenta evidencia). Calificación = puntos obtenidos × 100 ÷ total de puntos.</p>
      <p style="font-weight:700; margin:0.3rem 0;">Datos del instrumento</p>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(12rem, 1fr)); gap:0.6rem; margin-bottom:0.8rem;">
        ${sel("componente", "Componente", ["Trabajo cotidiano", "Tareas", "Proyecto"])}
        ${sel("tipo", "Tipo de instrumento", MEP_TIPOS)}
        ${campo("subarea", "Subárea", "Ej.: Gestión tributaria")}
        ${campo("unidad", "Unidad de estudio / tema", "Ej.: Impuesto de salida")}
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(16rem, 1fr)); gap:0.6rem; margin-bottom:0.8rem;">
        ${campo("resultado", "Resultado de aprendizaje (del programa)", "Copie el resultado de aprendizaje del programa de estudio")}
        ${campo("indicador", "Indicador de logro (del programa)", "Copie el indicador de logro del programa")}
      </div>
      <p style="font-weight:700; margin:0.3rem 0;">Indicadores y criterios de desempeño</p>
      ${lista.map(tarjeta).join("")}
      <div style="position:sticky; bottom:0; display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap; padding:0.6rem 0 0.2rem; background:var(--surface-soft); border-top:1px solid var(--paper-line);">
        <span style="font-size:0.82rem;"><strong>${lista.length}</strong> indicador${lista.length === 1 ? "" : "es"} · <strong>${total}</strong> puntos</span>
        <span style="flex:1;"></span>
        <button class="btn secondary small" data-mep-guardar type="button">💾 Guardar borrador</button>
        <button class="btn small" data-mep-publicar type="button">📢 Publicar a estudiantes</button>
        <span data-mep-estado style="flex-basis:100%; font-size:0.78rem; color:var(--text-muted);"></span>
      </div></div>`;
    ligar();
  };
  const estado = t => { const e = panel.querySelector("[data-mep-estado]"); if (e) e.innerHTML = t; };
  const validar = () => {
    const malo = lista.findIndex(c => !c.nombre);
    if (malo >= 0) return `Falta la redacción del indicador ${lista[malo].letra || malo + 1}.`;
    const sinDesc = lista.findIndex(c => c.niveles.some(n => n.puntaje > 0 && !n.descripcion));
    if (sinDesc >= 0) return `Falta la evidencia de algún nivel del indicador ${lista[sinDesc].letra || sinDesc + 1}.`;
    return "";
  };
  const guardarBorrador = async () => {
    reg = await mepGuardarEnConfig(materiaId, clave, v => ({ ...v, borrador: { instrumento: ins, criterios: lista.map(c => ({ indicador_id: c.indicador_id, nombre: c.nombre, niveles: c.niveles })), guardado_en: new Date().toISOString() } }));
  };
  function ligar() {
    panel.querySelector("[data-mep-vista]").addEventListener("click", () => { leer(); mepAbrirModal(mepInstrumentoHTML(tituloGrupo, ins, lista), "Instrumento · " + tituloGrupo); });
    panel.querySelector("[data-mep-reset]").addEventListener("click", async () => {
      if (!reg.borrador) { estado("No hay borrador: ya está mostrando lo publicado."); return; }
      if (!confirm("¿Descartar el borrador y volver a lo que tienen publicado los estudiantes?")) return;
      try { reg = (await mepGuardarEnConfig(materiaId, clave, v => { const n = { ...v }; delete n.borrador; return Object.keys(n).length ? n : null; })) || {}; } catch (e) { estado("No se pudo descartar: " + e.message); return; }
      desdeBorrador(); pintar(); estado("↺ Se descartó el borrador.");
    });
    panel.querySelector("[data-mep-guardar]").addEventListener("click", async ev => {
      leer(); ev.target.disabled = true; estado("Guardando borrador…");
      try { await guardarBorrador(); pintar(); estado("✓ Borrador guardado. Los estudiantes todavía no lo ven: cuando esté listo, toque <strong>📢 Publicar a estudiantes</strong>."); }
      catch (e) { ev.target.disabled = false; estado("No se pudo guardar: " + e.message); }
    });
    panel.querySelector("[data-mep-publicar]").addEventListener("click", async ev => {
      leer();
      const err = validar(); if (err) { estado("⚠️ " + err); return; }
      if (!confirm("¿Publicar esta evaluación? Los estudiantes la verán en su perfil y en el trabajo, y la plataforma calificará con estos niveles. Las notas ya puestas no cambian.")) return;
      ev.target.disabled = true; estado("Publicando…");
      try {
        for (const c of lista) {
          const { error: e1 } = await sb.from("indicadores").update({ descripcion: c.nombre }).eq("id", c.indicador_id);
          if (e1) throw e1;
          const filas = c.niveles.filter(n => n.descripcion).map(n => ({ indicador_id: c.indicador_id, puntaje: n.puntaje, nivel: n.nivel || null, descripcion: n.descripcion, orden: n.puntaje }));
          const { error: e2 } = await sb.from("criterios_indicador").delete().eq("indicador_id", c.indicador_id);
          if (e2) throw e2;
          if (filas.length) { const { error: e3 } = await sb.from("criterios_indicador").insert(filas); if (e3) throw e3; }
        }
        reg = await mepGuardarEnConfig(materiaId, clave, v => { const n = { ...v, publicado: { instrumento: ins, fecha: new Date().toISOString() } }; delete n.borrador; return n; });
        pintar(); estado("✓ Publicado. Los estudiantes ya lo ven con el botón <strong>📋 Evaluación</strong>.");
        if (alPublicar) alPublicar();
      } catch (e) { ev.target.disabled = false; estado("No se pudo publicar: " + (e.message || e)); }
    });
    panel.querySelectorAll("[data-mep-ia]").forEach(b => b.addEventListener("click", async () => {
      leer();
      const est = panel.querySelector("[data-mep-ia-estado]");
      const indic = panel.querySelector("[data-mep-ia-indic]")?.value || "";
      const aptos = lista.map((c, i) => ({ c, i })).filter(({ c }) => [3, 2, 1].every(p => c.niveles.some(n => n.puntaje === p)));
      const elegidos = b.dataset.mepIa === "todos" ? aptos : aptos.filter(x => String(x.i) === b.dataset.mepIa);
      if (!elegidos.length) { est.textContent = "Ningún indicador usa la escala de 3 puntos."; return; }
      const d = p => (c => (c.niveles.find(n => n.puntaje === p) || {}).descripcion || "");
      const criteriosIA = elegidos.map(({ c }) => ({ nombre: c.nombre, puntos_max: c.puntos_max, auto: "", niveles: { avanzado: d(3)(c), intermedio: d(2)(c), inicial: d(1)(c) } }));
      panel.querySelectorAll("[data-mep-ia]").forEach(x => { x.disabled = true; });
      est.textContent = "✨ La IA está trabajando…";
      let datos = null, error = "";
      for (let intento = 0; intento < 3 && !datos; intento++) {
        try {
          const r = await fetch("/api/mejorar-niveles-ia", { method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify({ instrumento: ins, criterios: criteriosIA, instrucciones: indic, actividad: tituloGrupo, componente: ins.componente }) });
          const j = await r.json().catch(() => ({}));
          if (r.ok && Array.isArray(j.criterios)) datos = j; else { error = j.error || ("Error " + r.status); if (r.status !== 503) break; await new Promise(res => setTimeout(res, 3000)); }
        } catch (e) { error = "No hay conexión."; break; }
      }
      if (!datos) { panel.querySelectorAll("[data-mep-ia]").forEach(x => { x.disabled = false; }); est.textContent = "No se pudo mejorar con IA: " + error; return; }
      const antes = lista.map(c => ({ ...c, niveles: c.niveles.map(n => ({ ...n })) }));
      datos.criterios.forEach(p => {
        const el = elegidos[p.i]; if (!el) return;
        const c = lista[el.i];
        c.nombre = p.nombre || c.nombre;
        const map = { 3: p.niveles.avanzado, 2: p.niveles.intermedio, 1: p.niveles.inicial };
        c.niveles = c.niveles.map(n => map[n.puntaje] ? { ...n, descripcion: map[n.puntaje] } : n);
        c.iaNota = p.nota || "Redacción mejorada por la IA.";
      });
      pintar();
      const est2 = panel.querySelector("[data-mep-ia-estado]"); const inp2 = panel.querySelector("[data-mep-ia-indic]"); if (inp2) inp2.value = indic;
      if (est2) {
        est2.innerHTML = `✨ Listo: ${datos.criterios.length} indicador(es) mejorado(s). Revíselos y toque <strong>💾 Guardar borrador</strong> o <strong>📢 Publicar</strong>. <button class="btn secondary small" type="button" data-mep-deshacer>↩ Deshacer</button>`;
        est2.querySelector("[data-mep-deshacer]").addEventListener("click", () => { lista = antes; pintar(); });
      }
    }));
  }
  pintar();
}

// Botón "📋 Evaluación" dentro de cada trabajo que ve el estudiante.
async function mepInyectarBotonesTrabajos(holder, trabajos) {
  try {
    const conInd = (trabajos || []).filter(t => t.indicador_id);
    if (!holder || !conInd.length) return;
    const { data: inds } = await sb.from("indicadores").select("id, materia_id, categoria").in("id", conInd.map(t => t.indicador_id));
    const porId = {}; (inds || []).forEach(i => { porId[i.id] = i; });
    conInd.forEach(t => {
      const ind = porId[t.indicador_id];
      if (!ind || !mepCategoriaConFormato(ind.categoria)) return;
      const fila = holder.querySelector(`[data-fila-trabajo="${t.id}"]`);
      const destino = fila && (fila.firstElementChild || fila);
      if (!destino || destino.querySelector("[data-mep-ver-trabajo]")) return;
      const b = document.createElement("button");
      b.type = "button"; b.className = "btn secondary small"; b.dataset.mepVerTrabajo = t.id;
      b.style.cssText = "margin-top:0.3rem; align-self:flex-start;";
      b.textContent = "📋 Evaluación";
      b.addEventListener("click", () => mepVerEvaluacion({ materiaId: ind.materia_id, categoria: ind.categoria, indicadorId: ind.id, titulo: ind.categoria === "Proyectos" ? null : mepLimpio(t.titulo), soloHabilitados: true }));
      destino.appendChild(b);
    });
  } catch (e) { console.warn("MEP botones", e); }
}
