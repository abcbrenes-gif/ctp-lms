async function renderTabContent(s, tab, isSelf) {
  const el = document.getElementById("tab-content");
  if (tab === "tareas") return renderTareas(el, s, isSelf);
  if (tab === "programa") return renderProgramaEstudiante(el, s);
  if (tab === "rubrica") return renderRubricaEstudiante(el, s);
  if (tab === "asistencia") return renderAsistenciaEstudiante(el, s);
  if (tab === "avisos") return renderAvisosEstudiante(el, s);
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

async function renderNotasInterno(el, s, isSelf) {
  const { data: asignadas } = await sb.from("estudiante_materias").select("materia_id, materias(id, nombre)").eq("estudiante_id", s.id);
  const materiasAsignadas = (asignadas || []).map(a => a.materias).filter(Boolean);

  const { data: notas } = await sb.from("notas").select("*, materias(nombre)").eq("estudiante_id", s.id).order("creado_en", { ascending: false });
  const { data: categorias } = await sb.from("rubrica_categorias").select("*").order("orden");

  const rows = (notas || []).map(n => `
    <tr>
      <td>${n.materias?.nombre || "—"}</td>
      <td>${n.rubro}</td>
      <td class="num ${n.nota < 70 ? "low" : ""}">${n.nota}</td>
      ${!isSelf ? `<td><button class="btn danger small" data-del="${n.id}">Eliminar</button></td>` : ""}
    </tr>`).join("");

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
  const categoriaOptions = (categorias || []).filter(c => c.nombre.trim().toLowerCase() !== "asistencia").map(c => `<option value="${c.nombre}">${c.nombre} (${c.porcentaje}%)</option>`).join("");

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
    <table class="grades">
      <thead><tr><th>Materia</th><th>Rubro</th><th>Nota</th>${!isSelf ? "<th></th>" : ""}</tr></thead>
      <tbody>${rows || `<tr><td colspan="${isSelf ? 3 : 4}" class="empty">Todavía no hay notas registradas.</td></tr>`}</tbody>
    </table>
    ${!isSelf && materiasAsignadas.length > 0 ? `
    <form class="inline-form" id="grade-form">
      <select name="materia_id" required>${materiaOptions}</select>
      <select name="rubro" required>
        <option value="">Categoría…</option>
        ${categoriaOptions}
      </select>
      <input name="nota" type="number" min="0" max="100" step="0.1" placeholder="Nota" required style="width:6rem" />
      <button class="btn small" type="submit">Agregar nota</button>
    </form>
    ${(categorias || []).length === 0 ? `<p class="no-phone-note">No hay categorías de rúbrica creadas. Ve a "Rúbrica" en el menú para crearlas.</p>` : ""}` : ""}`;

  if (!isSelf) {
    el.querySelectorAll("[data-del]").forEach(btn => {
      btn.addEventListener("click", async () => {
        await sb.from("notas").delete().eq("id", btn.dataset.del);
        renderNotas(el, s, isSelf);
      });
    });
    const form = el.querySelector("#grade-form");
    if (form) form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      await sb.from("notas").insert({
        estudiante_id: s.id,
        materia_id: Number(f.get("materia_id")),
        rubro: f.get("rubro"),
        nota: Number(f.get("nota"))
      });
      renderNotas(el, s, isSelf);
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
          const notasCat = notasMateria.filter(n => n.rubro === c.nombre);
          promedio = notasCat.length ? notasCat.reduce((a, n) => a + Number(n.nota), 0) / notasCat.length : null;
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
          <span class="name">${a.titulo}</span>
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

  app.innerHTML = `
    ${topbar()}
    <div class="wrap">
      <a href="${soloLectura ? "#/" : "#/publicaciones"}" class="btn secondary small" style="margin-bottom:1rem; display:inline-block;">&larr; ${soloLectura ? "Volver a mi perfil" : "Publicaciones"}</a>
      <h1>${pub.titulo}</h1>
      ${resultado ? `<p style="color:var(--text-muted); margin-top:-0.6em; font-size:0.85rem;"><strong>Saberes esenciales:</strong> <span class="roa-cell-texto">${resultado.saberes || ""}</span></p>` : ""}

      <h3 style="margin-top:1.4rem;">Introducción al tema</h3>
      ${soloLectura
        ? `<div class="roa-cell-texto" style="background:var(--white); border:1px solid var(--paper-line); padding:1rem;">${pub.contenido || '<span class="empty">El profesor todavía no ha escrito la introducción.</span>'}</div>`
        : `<div class="roa-editable roa-html" contenteditable="true" id="apartado-intro" style="min-height:6rem;">${pub.contenido || ""}</div>
           <div class="row" style="margin-top:0.5rem;"><button class="btn small" id="guardar-intro">Guardar introducción</button></div>`}

      <h3 style="margin-top:1.6rem;">Trabajos cotidianos</h3>
      <div class="roster" id="trabajos-lista">Cargando…</div>
      ${!soloLectura ? `
      <form class="inline-form" id="trabajo-form" style="margin-top:0.8rem;">
        <input name="titulo" placeholder="Título del trabajo" required style="flex:1; min-width:10rem" />
        <input name="fecha" type="date" />
        <div class="roa-editable js-trabajo-desc" contenteditable="true" style="flex-basis:100%; min-height:3rem;" data-placeholder="Instrucciones (opcional)"></div>
        <button class="btn small" type="submit">Agregar trabajo</button>
      </form>` : ""}
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

async function renderRubrica() {
  app.innerHTML = `
    ${topbar()}
    <div class="wrap">
      <h1>Rúbrica</h1>
      <p style="color:var(--text-muted); margin-top:-0.6em;">Define las categorías y el peso (%) de cada una en la nota final. La suma no puede superar 100%.</p>
      <div id="rubrica-form">Cargando…</div>
    </div>`;
  bindTopbar();

  const { data: cats } = await sb.from("rubrica_categorias").select("*").order("orden");
  const holder = document.getElementById("rubrica-form");

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
      renderRubrica();
    });

    document.querySelectorAll("[data-del-cat]").forEach(btn => {
      btn.addEventListener("click", async () => {
        await sb.from("rubrica_categorias").delete().eq("id", btn.dataset.delCat);
        renderRubrica();
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
      renderRubrica();
    });
  }

  pintar(cats || []);
}

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
      <div id="materia-publicaciones" style="margin-top:1.4rem;">Cargando…</div>
    </div>`;
  bindTopbar();

  await cargarApartadosDeMateria(materiaId);
  await cargarPublicacionesDeMateria(materiaId, materia.seccion);
}

async function cargarApartadosDeMateria(materiaId) {
  const holder = document.getElementById("materia-apartados");
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
          <a class="name" href="#/apartado/${a.id}" style="flex:1;">${a.titulo}</a>
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
    <div class="wrap">
      <h1>Programa de estudio</h1>
      <p style="color:var(--text-muted); margin-top:-0.6em;">Resultados de aprendizaje y saberes esenciales, extraídos de los programas oficiales de décimo, undécimo y duodécimo.</p>
      <div id="programa-niveles">Cargando…</div>
    </div>`;
  bindTopbar();

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
    <div class="wrap">
      <a href="#/programa" class="btn secondary small" style="margin-bottom:1rem; display:inline-block;">&larr; Programa</a>
      <h1>${u.unidad}</h1>
      <p style="color:var(--text-muted); margin-top:-0.6em;">${u.nivel} · ${u.subarea}${u.tiempo_estimado ? " · " + u.tiempo_estimado + " horas" : ""}${u.materias ? " · Materia: " + u.materias.nombre : ""}</p>
      ${materiaSelector}
      <div class="roa-table" style="margin-top:1.2rem;">
        <div class="roa-row roa-head">
          <div>Resultado de Aprendizaje</div>
          <div>Saberes Esenciales</div>
          <div>Estrategias de mediación</div>
          <div>Evidencias de aprendizaje</div>
          <div>Tiempo</div>
          <div>${soloLectura ? "Estado" : "Impartido"}</div>
        </div>
        ${(items || []).map(it => soloLectura ? `
          <div class="roa-row">
            <div class="roa-cell-texto">${it.resultado}</div>
            <div class="roa-cell-texto">${it.saberes || ""}</div>
            <div class="roa-cell-texto">${it.estrategias || ""}</div>
            <div class="roa-cell-texto">${it.evidencias || ""}</div>
            <div class="roa-cell-texto">${it.tiempo || ""}</div>
            <div style="text-align:center;">
              <span class="badge" style="${it.impartido ? "" : "opacity:0.5;"}">${it.impartido ? "Impartido" : "No impartido"}</span>
            </div>
          </div>` : `
          <div class="roa-row">
            <textarea data-campo="resultado" data-fila="${it.id}">${it.resultado || ""}</textarea>
            <div class="roa-editable roa-html" contenteditable="true" data-campo="saberes" data-fila="${it.id}" data-tipo="html">${it.saberes || ""}</div>
            <div class="roa-editable roa-html" contenteditable="true" data-campo="estrategias" data-fila="${it.id}" data-tipo="html">${it.estrategias || ""}</div>
            <div class="roa-editable roa-html" contenteditable="true" data-campo="evidencias" data-fila="${it.id}" data-tipo="html">${it.evidencias || ""}</div>
            <input class="roa-tiempo" data-campo="tiempo" data-fila="${it.id}" value="${it.tiempo || ""}" />
            <div style="text-align:center;">
              <input type="checkbox" data-impartido="${it.id}" ${it.impartido ? "checked" : ""} style="width:1.2rem; height:1.2rem;" />
              <div style="margin-top:0.4rem;"><button class="btn small" data-guardar-fila="${it.id}">Guardar</button></div>
              ${apartadoPorResultado[it.id] ? `
              <div style="margin-top:0.5rem;">
                <button class="btn ${apartadoPorResultado[it.id].habilitado ? "secondary" : ""} small" data-toggle-apartado="${apartadoPorResultado[it.id].id}" data-estado-actual="${apartadoPorResultado[it.id].habilitado}">
                  ${apartadoPorResultado[it.id].habilitado ? "Deshabilitar apartado" : "Habilitar apartado"}
                </button>
              </div>` : `<p style="font-size:0.7rem; color:var(--text-muted); margin-top:0.4rem;">Sin apartado creado</p>`}
            </div>
          </div>`).join("") || `<p class="empty">No se encontraron resultados de aprendizaje para esta unidad.</p>`}
      </div>
      ${!soloLectura ? `<button class="btn secondary small" id="agregar-resultado" style="margin-top:0.8rem;">+ Agregar resultado de aprendizaje</button>` : ""}
    </div>`;
  bindTopbar();

  if (!soloLectura) {
    document.querySelectorAll("[data-guardar-fila]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const filaId = btn.dataset.guardarFila;
        const campos = {};
        document.querySelectorAll(`[data-fila="${filaId}"]`).forEach(input => {
          campos[input.dataset.campo] = input.dataset.tipo === "html" ? input.innerHTML : input.value;
        });
        btn.textContent = "Guardando…";
        await sb.from("resultados_aprendizaje").update(campos).eq("id", filaId);
        btn.textContent = "Guardado ✓";
        setTimeout(() => { btn.textContent = "Guardar"; }, 1500);
      });
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
  }
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
      <h1>Evaluaciones</h1>
      <p style="color:var(--text-muted); margin-top:-0.6em;">Las notas de todos los estudiantes, de un vistazo, por sección.</p>
      ${secciones.map(sec => `
        <details class="group-promo" style="margin-top:1.2rem;" open>
          <summary style="font-family:var(--serif); font-weight:600; font-size:1.02rem;">Sección ${sec}</summary>
          <div id="evaluaciones-sec-${sec}" style="margin-top:0.8rem;">Cargando…</div>
        </details>`).join("")}
    </div>`;
  bindTopbar();
  for (const sec of secciones) {
    await cargarEvaluacionesSeccion(sec, porSeccion[sec], `evaluaciones-sec-${sec}`);
  }
}

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", render);
