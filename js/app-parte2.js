async function renderTabContent(s, tab, isSelf) {
  const el = document.getElementById("tab-content");
  if (tab === "programa") return renderProgramaEstudiante(el, s);
  if (tab === "rubrica") return renderRubricaEstudiante(el, s);
  if (tab === "asistencia") return renderAsistenciaEstudiante(el, s);
  if (tab === "avisos") return renderAvisosEstudiante(el, s);
  if (tab === "materias-est") return renderMateriasEstudiante(el, s);
  if (tab === "whatsapp" && !isSelf) return renderWhatsapp(el, s);
  if (tab === "acceso" && !isSelf) return renderAcceso(el, s);
  return renderNotas(el, s, isSelf);
}

// --- Notas (filtradas por materias asignadas si es estudiante) ---

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
      const porIndicadores = await calcularNotaIndicadores(s.id, m.id, c.nombre);
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
      const info = await calcularNotaIndicadores(s.id, m.id, activa);
      if (info) indicadoresPorMateria[m.id] = info;
    }
  }

  function tablaIndicadores(m, info) {
    const categoriaObj = categorias.find(c => c.nombre === activa);
    const resultadoPct = categoriaObj ? (info.nota * categoriaObj.porcentaje / 100).toFixed(1) : info.nota.toFixed(1);
    const calificados = info.indicadores.filter(i => info.porIndicador[i.id] !== undefined).length;
    return `
      <h4 style="margin-top:1rem; display:flex; align-items:center; gap:0.6rem;">${m.nombre} <span class="badge" style="font-weight:400;">Progreso: ${calificados}/${info.indicadores.length} indicadores calificados</span></h4>
      <div style="overflow-x:auto;">
        <table class="grades">
          <thead><tr>
            ${info.indicadores.map(i => `<th style="text-align:center;">${i.letra}</th>`).join("")}
            <th>Resultado (valor: ${categoriaObj?.porcentaje || "?"}%)</th>
          </tr></thead>
          <tbody><tr>
            ${info.indicadores.map(i => !isSelf ? `
              <td style="text-align:center;">
                <select data-calif-indicador="${i.id}" data-materia="${m.id}" style="width:4rem; text-align:center; border:1px solid var(--paper-line); border-radius:3px;">
                  ${Array.from({ length: i.puntaje_maximo + 1 }, (_, p) => `<option value="${p}" ${Number(info.porIndicador[i.id] || 0) === p ? "selected" : ""}>${p}</option>`).join("")}
                </select>
              </td>` : `<td class="num">${info.porIndicador[i.id] || 0}</td>`).join("")}
            <td class="num" style="font-weight:600;">${resultadoPct}%</td>
          </tr></tbody>
        </table>
      </div>
      <details style="margin-top:0.5rem;">
        <summary style="font-size:0.82rem; color:var(--text-muted); cursor:pointer;">Ver indicadores y criterios</summary>
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
    td.innerHTML = (criterios || []).map(c => `<div>${c.puntaje} punto${c.puntaje === 1 ? "" : "s"}: ${c.descripcion}</div>`).join("") || '<span class="empty">Sin criterios</span>';
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

async function renderRubricaEstudiante(el, s) {
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
          const porIndicadores = await calcularNotaIndicadores(s.id, m.id, c.nombre);
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

  if (materiasAsignadas.length === 0) {
    el.innerHTML = `<p class="empty">Todavía no tienes materias asignadas.</p>`;
    return;
  }

  let html = "";
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

    html += `
      <p style="font-size:0.8rem; color:var(--text-muted); margin-top:-0.4em;">Temas</p>
      <div class="roster" style="margin-bottom:1rem;">
        ${apartados.map(a => `<a class="roster-row" href="#/apartado/${a.id}"><span class="name clamp2" title="${a.titulo.replace(/"/g, "&quot;")}">${a.titulo}</span><span class="badge">Ver</span></a>`).join("") || '<p class="empty">Sin temas habilitados todavía.</p>'}
      </div>`;

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
  const { data: trabajos } = await sb.from("trabajos_cotidianos").select("*").eq("publicacion_id", id).order("creado_en");

  let totalEstudiantes = 0;
  if (!soloLectura) {
    const { data: est } = await sb.from("estudiantes").select("id").eq("seccion", pub.seccion);
    totalEstudiantes = (est || []).length;
  }

  const tituloMostrar = (resultado && resultado.resultado ? resultado.resultado : pub.titulo || "").replace(/<[^>]*>/g, "");

  app.innerHTML = `
    ${topbar()}
    <div class="wrap">
      <a href="${soloLectura ? "#/" : "#/publicaciones"}" class="btn secondary small" style="margin-bottom:1rem; display:inline-block;">&larr; ${soloLectura ? "Volver a mi perfil" : "Publicaciones"}</a>

      <div class="tema-header">
        <span class="tema-eyebrow">Resultado de aprendizaje</span>
        <h1 class="tema-title">${tituloMostrar}</h1>
        ${resultado && resultado.saberes ? `
        <div class="tema-saberes">
          <strong>Saberes esenciales</strong>
          <div class="roa-cell-texto">${resultado.saberes}</div>
        </div>` : ""}
      </div>

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

      <section class="tema-section">
        <h3>Trabajos cotidianos</h3>
        <div class="roster" id="trabajos-lista">Cargando…</div>
        ${!soloLectura ? `
        <form class="inline-form" id="trabajo-form" style="margin-top:0.8rem;">
          <input name="titulo" placeholder="Título del trabajo" required style="flex:1; min-width:10rem" />
          <input name="fecha" type="date" />
          <div class="roa-editable js-trabajo-desc" contenteditable="true" style="flex-basis:100%; min-height:3rem;" data-placeholder="Instrucciones (opcional)"></div>
          <button class="btn small" type="submit">Agregar trabajo</button>
        </form>` : ""}
      </section>
    </div>`;
  bindTopbar();

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
    document.getElementById("trabajo-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      await sb.from("trabajos_cotidianos").insert({
        publicacion_id: id,
        titulo: f.get("titulo"),
        fecha: f.get("fecha") || null,
        descripcion: document.querySelector(".js-trabajo-desc").innerHTML || null
      });
      renderApartado(id, soloLectura);
    });
  }

  await pintarTrabajosCotidianos(trabajos || [], soloLectura, id);
}

async function pintarTrabajosCotidianos(trabajos, soloLectura, publicacionId) {
  const holder = document.getElementById("trabajos-lista");
  if (!holder) return;

  if (trabajos.length === 0) {
    holder.innerHTML = `<p class="empty">Todavía no hay trabajos cotidianos en este apartado.</p>`;
    return;
  }

  if (soloLectura) {
    const estudianteId = session.id;
    const trabajoIds = trabajos.map(t => t.id);
    const { data: misEstados } = await sb.from("trabajos_cotidianos_estudiante").select("*").eq("estudiante_id", estudianteId).in("trabajo_id", trabajoIds);
    const porTrabajo = {};
    (misEstados || []).forEach(e => { porTrabajo[e.trabajo_id] = e.completado; });

    holder.innerHTML = trabajos.map(t => `
      <div class="roster-row" style="align-items:flex-start; flex-direction:column; gap:0.3rem;">
        <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
          <span class="name">${t.titulo}${t.fecha ? " · " + t.fecha : ""}</span>
          <label style="display:flex; align-items:center; gap:0.4rem; font-size:0.85rem;">
            <input type="checkbox" data-mi-trabajo="${t.id}" ${porTrabajo[t.id] ? "checked" : ""} /> Completado
          </label>
        </div>
        ${t.descripcion ? `<div class="roa-cell-texto" style="font-size:0.85rem;">${t.descripcion}</div>` : ""}
      </div>`).join("");

    holder.querySelectorAll("[data-mi-trabajo]").forEach(cb => {
      cb.addEventListener("change", async () => {
        await sb.from("trabajos_cotidianos_estudiante").upsert(
          { trabajo_id: cb.dataset.miTrabajo, estudiante_id: estudianteId, completado: cb.checked, entregado_en: cb.checked ? new Date().toISOString() : null },
          { onConflict: "trabajo_id,estudiante_id" }
        );
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
      <div class="roster-row" style="align-items:flex-start; flex-direction:column; gap:0.3rem;">
        <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
          <span class="name">${t.titulo}${t.fecha ? " · " + t.fecha : ""}</span>
          <span style="display:flex; align-items:center; gap:0.6rem;">
            <span class="badge">${conteos[t.id] || 0} completaron</span>
            <button class="btn danger small" data-del-trabajo="${t.id}">Eliminar</button>
          </span>
        </div>
        ${t.descripcion ? `<div class="roa-cell-texto" style="font-size:0.85rem;">${t.descripcion}</div>` : ""}
      </div>`).join("");

    holder.querySelectorAll("[data-del-trabajo]").forEach(btn => {
      btn.addEventListener("click", async () => {
        await sb.from("trabajos_cotidianos").delete().eq("id", btn.dataset.delTrabajo);
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
    block.innerHTML = `<summary style="font-family:var(--serif); font-weight:600; font-size:1.02rem;">Sección ${sec}</summary><div class="materia-list" data-sec="${sec}" style="margin-top:0.8rem;">Cargando…</div>`;
    container.appendChild(block);
    await loadMateriasSeccion(sec);
  }
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
      <div id="materia-apartados">Cargando…</div>
      <div id="materia-cursos" style="margin-top:1.4rem;">Cargando…</div>
      <div id="materia-indicadores" style="margin-top:1.4rem;">Cargando…</div>
      <div id="materia-publicaciones" style="margin-top:1.4rem;">Cargando…</div>
    </div>`;
  bindTopbar();

  await cargarApartadosDeMateria(materiaId);
  await cargarCursosDeMateria(materiaId);
  await cargarIndicadoresDeMateria(materiaId);
  await cargarPublicacionesDeMateria(materiaId, materia.seccion);
}

async function cargarCursosDeMateria(materiaId) {
  const holder = document.getElementById("materia-cursos");
  if (!holder) return;
  const { data: unidades } = await sb.from("programa").select("id").eq("materia_id", materiaId);
  const programaIds = (unidades || []).map(u => u.id);
  const { data: cursos } = programaIds.length
    ? await sb.from("cursos_interactivos").select("*").in("programa_id", programaIds)
    : { data: [] };

  holder.innerHTML = `
    <h3 style="margin-top:0;">Cursos interactivos</h3>
    <div class="roster">
      ${(cursos || []).map(c => `
        <a class="roster-row" href="#/curso/${c.id}">
          <span class="name">${c.titulo}</span>
          <span class="badge" style="${c.habilitado ? "" : "opacity:0.5;"}">${c.habilitado ? "Habilitado" : "No habilitado"}</span>
        </a>`).join("") || '<p class="empty">Esta materia todavía no tiene cursos interactivos.</p>'}
    </div>`;
}

async function cargarIndicadoresDeMateria(materiaId, categoriaActiva) {
  const holder = document.getElementById("materia-indicadores");
  if (!holder) return;
  const { data: categorias } = await sb.from("rubrica_categorias").select("*").order("orden");
  const catNombre = categoriaActiva || categorias?.[0]?.nombre || null;

  const { data: indicadores } = catNombre
    ? await sb.from("indicadores").select("*, criterios_indicador(*)").eq("materia_id", materiaId).eq("categoria", catNombre).order("orden")
    : { data: [] };

  const siguienteLetra = String.fromCharCode(65 + (indicadores || []).length); // A, B, C...

  holder.innerHTML = `
    <h3 style="margin-top:0;">Indicadores de evaluación</h3>
    <nav class="cat-navbar">
      ${(categorias || []).map(c => `<button class="cat-navlink ${c.nombre === catNombre ? "active" : ""}" data-cat-ind="${c.nombre}">${c.nombre}</button>`).join("")}
    </nav>
    ${(indicadores || []).length > 0 ? `<button class="btn" id="calificar-todos-btn" style="margin:0.8rem 0;">Calificar a todos los estudiantes (${catNombre})</button>` : ""}
    <div id="calificar-todos-holder"></div>
    <div class="roster" id="lista-indicadores-holder" style="margin-top:0.8rem;">
      ${(indicadores || []).map(ind => {
        const tieneCriterios = (ind.criterios_indicador || []).length > 0;
        return `
        <div class="roster-row" style="flex-direction:column; align-items:stretch; gap:0.4rem;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.6rem;">
            <span class="name">
              <strong>${ind.letra}:</strong> ${ind.descripcion}
              <span style="color:var(--text-muted); font-size:0.8rem;"> (máx. ${ind.puntaje_maximo} pts)</span>
              ${ind.fecha_evaluacion ? `<div style="font-size:0.75rem; color:var(--text-muted);">Fecha: ${ind.fecha_evaluacion}${ind.lecciones ? " · " + ind.lecciones + " lecciones" : ""}</div>` : ""}
            </span>
            <button class="btn danger small" data-del-indicador="${ind.id}">Eliminar</button>
          </div>
          <div style="font-size:0.85rem;">
            ${(ind.criterios_indicador || []).sort((a, b) => a.puntaje - b.puntaje).map(c => `<div>${c.puntaje} punto${c.puntaje === 1 ? "" : "s"}: ${c.descripcion}</div>`).join("")}
          </div>
          ${!tieneCriterios ? `
          <form class="inline-form js-criterios-form" data-indicador-criterios="${ind.id}" data-max="${ind.puntaje_maximo}" style="background:var(--paper); margin-top:0.3rem;">
            <p style="width:100%; font-size:0.8rem; color:var(--brick); margin:0 0 0.4rem;">Faltan los criterios de este indicador:</p>
            ${Array.from({ length: ind.puntaje_maximo }, (_, i) => i + 1).map(p => `
              <input name="criterio_${p}" placeholder="Criterio para ${p} punto${p === 1 ? "" : "s"}" required style="flex-basis:100%;" />`).join("")}
            <button class="btn small" type="submit">Guardar criterios</button>
          </form>` : ""}
        </div>`;
      }).join("") || `<p class="empty">Sin indicadores todavía en "${catNombre}".</p>`}
    </div>

    <form class="inline-form" id="indicador-form" style="margin-top:1rem;">
      <input name="letra" value="${siguienteLetra}" placeholder="Letra" required style="width:4rem;" />
      <input name="descripcion" placeholder="Descripción del indicador" required style="flex:1; min-width:14rem" />
      <input name="puntaje_maximo" type="number" min="1" placeholder="Puntaje máximo" required style="width:9rem" />
      <input name="fecha_evaluacion" type="date" />
      <input name="lecciones" type="number" min="1" placeholder="Lecciones (opcional)" style="width:10rem" />
      <button class="btn small" type="submit">Crear indicador</button>
    </form>`;

  holder.querySelectorAll("[data-cat-ind]").forEach(btn => {
    btn.addEventListener("click", () => cargarIndicadoresDeMateria(materiaId, btn.dataset.catInd));
  });
  const calificarBtn = document.getElementById("calificar-todos-btn");
  if (calificarBtn) calificarBtn.addEventListener("click", () => cargarCalificarTodos(materiaId, catNombre, indicadores || []));
  holder.querySelectorAll("[data-del-indicador]").forEach(btn => {
    btn.addEventListener("click", async () => {
      await sb.from("indicadores").delete().eq("id", btn.dataset.delIndicador);
      cargarIndicadoresDeMateria(materiaId, catNombre);
    });
  });
  holder.querySelectorAll(".js-criterios-form").forEach(form => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const max = Number(form.dataset.max);
      const criterios = [];
      for (let p = 1; p <= max; p++) {
        criterios.push({ indicador_id: form.dataset.indicadorCriterios, puntaje: p, descripcion: f.get(`criterio_${p}`), orden: p });
      }
      await sb.from("criterios_indicador").insert(criterios);
      cargarIndicadoresDeMateria(materiaId, catNombre);
    });
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
      puntaje_maximo: Number(f.get("puntaje_maximo")),
      fecha_evaluacion: f.get("fecha_evaluacion") || null,
      lecciones: f.get("lecciones") ? Number(f.get("lecciones")) : null,
      orden: (indicadores || []).length + 1
    });
    cargarIndicadoresDeMateria(materiaId, catNombre);
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

  holder.innerHTML = `
    <div class="whatsapp-panel" style="max-width:100%; margin:0.8rem 0;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.6rem;">
        <strong style="font-family:var(--serif);">Calificar a toda la sección — ${catNombre}</strong>
        <button class="btn secondary small" id="cerrar-calificar-todos">Cerrar</button>
      </div>
      <div style="overflow-x:auto;">
        <table class="grades">
          <thead><tr>
            <th>Estudiante</th>
            ${indicadores.map(i => `<th style="text-align:center;">${i.letra}</th>`).join("")}
            <th>Resultado (${categoriaObj?.porcentaje || "?"}%)</th>
          </tr></thead>
          <tbody>
            ${(estudiantes || []).map(st => {
              const sumaMax = indicadores.reduce((a, i) => a + Number(i.puntaje_maximo), 0);
              const sumaObt = indicadores.reduce((a, i) => a + Number(mapa[`${st.id}-${i.id}`] || 0), 0);
              const resultado = sumaMax > 0 ? ((sumaObt / sumaMax) * categoriaObj?.porcentaje).toFixed(1) : "—";
              return `
              <tr data-fila-estudiante-cal="${st.id}">
                <td>${st.apellido1} ${st.apellido2}, ${st.nombre}</td>
                ${indicadores.map(i => `
                  <td style="text-align:center;">
                    <select data-cal-masiva="${i.id}" data-estudiante="${st.id}" style="width:4rem; text-align:center; border:1px solid var(--paper-line); border-radius:3px;">
                      ${Array.from({ length: i.puntaje_maximo + 1 }, (_, p) => `<option value="${p}" ${Number(mapa[`${st.id}-${i.id}`] || 0) === p ? "selected" : ""}>${p}</option>`).join("")}
                    </select>
                  </td>`).join("")}
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

  holder.innerHTML = `
    <h3 style="margin-top:0;">Temas (apartados por resultado de aprendizaje)</h3>
    <div class="roster">
      ${apartados.map(a => `
        <div class="roster-row">
          <a class="name clamp2" href="#/apartado/${a.id}" title="${a.titulo.replace(/"/g, "&quot;")}" style="flex:1;">${a.titulo}</a>
          <span style="display:flex; gap:0.5rem; align-items:center;">
            <span class="badge" style="${a.contenido ? "" : "opacity:0.5;"}">${a.contenido ? "Con introducción" : "Sin introducción"}</span>
            <button class="btn ${a.habilitado ? "secondary" : ""} small" data-toggle-apartado-pub="${a.id}" data-estado-actual="${a.habilitado}">
              ${a.habilitado ? "Habilitado" : "No habilitado"}
            </button>
          </span>
        </div>`).join("") || '<p class="empty">Esta materia todavía no tiene unidades del Programa vinculadas. Ve a "Programa" y vincula una unidad con esta materia.</p>'}
    </div>`;

  holder.querySelectorAll("[data-toggle-apartado-pub]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const nuevoEstado = btn.dataset.estadoActual !== "true";
      await sb.from("publicaciones").update({ habilitado: nuevoEstado }).eq("id", btn.dataset.toggleApartadoPub);
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

      ${secciones.map(sec => `
        <details class="group-promo" style="margin-top:1.2rem;" open>
          <summary style="font-family:var(--serif); font-weight:600; font-size:1.02rem;">Sección ${sec}</summary>
          <div id="evaluaciones-sec-${sec}" style="margin-top:0.8rem;">Cargando…</div>
        </details>`).join("")}
    </div>`;
  bindTopbar();

  document.getElementById("generar-machote-btn").addEventListener("click", () => abrirMachoteEvaluaciones(secciones));

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
