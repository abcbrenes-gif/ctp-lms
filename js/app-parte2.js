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
  if (isSelf) {
    const todosLosIndicadorIds = Object.values(indicadoresPorMateria).flatMap(info => info.indicadores.map(i => i.id));
    if (todosLosIndicadorIds.length) {
      const { data: trabajosDeIndicadores } = await sb.from("trabajos_cotidianos")
        .select("id, indicador_id, tipo_actividad, habilitado, fecha_hora_inicio, titulo, contenido_actividad")
        .in("indicador_id", todosLosIndicadorIds);
      (trabajosDeIndicadores || []).forEach(t => { trabajoPorIndNota[t.indicador_id] = t; });

      const trabajoArchivoIds = (trabajosDeIndicadores || []).filter(t => t.tipo_actividad === "infografia").map(t => t.id);
      if (trabajoArchivoIds.length) {
        const { data: entregasArchivo } = await sb.from("actividades_estudiante").select("trabajo_id, archivo_ruta, archivo_nombre").eq("estudiante_id", s.id).in("trabajo_id", trabajoArchivoIds);
        (entregasArchivo || []).forEach(e => { entregaPorTrabajoArchivo[e.trabajo_id] = e; });
      }
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
              return `
              <tr>
                <td>
                  <strong>${i.descripcion}</strong>
                  ${i.fecha_evaluacion ? `<div style="font-size:0.75rem; color:var(--text-muted);">Fecha: ${i.fecha_evaluacion}${i.lecciones ? " · " + i.lecciones + " lecciones" : ""}</div>` : ""}
                  ${esPruebaPendiente ? (aunNoEsHora
                    ? `<div style="margin-top:0.3rem;"><span class="badge" style="background:#fdf1dc; color:#a5690a;">⏳ Disponible a partir de ${formatearFechaHora(trabajoPrueba.fecha_hora_inicio)}</span></div>`
                    : `<div style="margin-top:0.3rem;"><button class="btn small" data-iniciar-prueba-nota="${trabajoPrueba.id}">▶ Iniciar prueba</button></div>`) : ""}
                  ${esArchivoPendiente ? `<div style="margin-top:0.3rem;">
                    ${instruccionesArchivo ? `<div style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.3rem;">${instruccionesArchivo}</div>` : ""}
                    ${entregaArchivo && entregaArchivo.archivo_ruta ? `
                      <span class="badge" style="background:#e3f6ea; color:#1d7a43;">✓ Entregado: ${entregaArchivo.archivo_nombre || "archivo"}</span>
                      <label class="link-btn" style="cursor:pointer; margin-left:0.4rem;">Reemplazar archivo<input type="file" data-subir-archivo-nota="${trabajoPrueba.id}" accept="image/*,.pdf" style="display:none;" /></label>
                    ` : `
                      <label class="btn small" style="cursor:pointer;">📎 Subir archivo (imagen o PDF)<input type="file" data-subir-archivo-nota="${trabajoPrueba.id}" accept="image/*,.pdf" style="display:none;" /></label>
                    `}
                    <span data-subir-archivo-estado="${trabajoPrueba.id}" style="font-size:0.78rem; color:var(--text-muted);"></span>
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

  if (materiasAsignadas.length === 0) {
    el.innerHTML = `<p class="empty">Todavía no tienes materias asignadas.</p>`;
    return;
  }

  let html = "";
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
        <button type="button" id="presentacion-prev-${subtemaId}" aria-label="Diapositiva anterior" style="position:absolute; left:0.5rem; top:50%; transform:translateY(-50%); background:rgba(15,23,42,0.6); color:#fff; border:none; border-radius:999px; width:2.4rem; height:2.4rem; font-size:1.2rem; cursor:pointer;">&larr;</button>
        <button type="button" id="presentacion-next-${subtemaId}" aria-label="Siguiente diapositiva" style="position:absolute; right:0.5rem; top:50%; transform:translateY(-50%); background:rgba(15,23,42,0.6); color:#fff; border:none; border-radius:999px; width:2.4rem; height:2.4rem; font-size:1.2rem; cursor:pointer;">&rarr;</button>
        <button type="button" id="presentacion-full-${subtemaId}" aria-label="Pantalla completa" style="position:absolute; right:0.5rem; bottom:0.5rem; background:rgba(15,23,42,0.6); color:#fff; border:none; border-radius:8px; padding:0.3rem 0.6rem; font-size:0.78rem; cursor:pointer;">⛶ Pantalla completa</button>
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
      <div style="position:relative; width:100%; aspect-ratio:16/9; background:#fff;">
        <iframe src="${srcVisor}" title="Documento de la introducción" style="width:100%; height:100%; border:none; display:block;" allowfullscreen></iframe>
        <button type="button" id="presentacion-doc-full-${subtemaId}" aria-label="Pantalla completa" style="position:absolute; right:0.5rem; bottom:0.5rem; background:rgba(15,23,42,0.6); color:#fff; border:none; border-radius:8px; padding:0.3rem 0.6rem; font-size:0.78rem; cursor:pointer;">⛶ Pantalla completa</button>
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
        descripcion: document.querySelector(".js-subtema-trabajo-desc").innerHTML || null
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
        constructor.innerHTML = construirPanelActividadHTML(e.target.value);
        inicializarConstructorPorTipo(e.target.value, constructor);
        ajustarCampoCantidad(panel, e.target.value);
        const iaBloque = panel.querySelector("#actividad-ia-bloque");
        if (iaBloque) iaBloque.style.display = (e.target.value === "lluvia_ideas" || e.target.value === "proyecto") ? "none" : "";
      });
      panel.querySelector("#actividad-tipo").dispatchEvent(new Event("change"));
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
        const tipo = panel.querySelector("#actividad-tipo").value;
        const titulo = panel.querySelector("#actividad-titulo").value.trim();
        const fecha = panel.querySelector("#actividad-fecha").value || null;
        if (!titulo) { alert("Ponele un título a la actividad."); return; }
        const resultado = leerContenidoActividadDesdeFormulario(tipo, panel.querySelector("#actividad-constructor"));
        if (!resultado.valido) { alert(resultado.error); return; }
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
            ? `<span class="badge" style="background:#e3f6ea; color:#1d7a43;">✓ Entregado${miEntrega.nota != null ? " · Nota: " + miEntrega.nota : ""}</span>`
            : ""}
        </div>
        ${t.instrucciones ? `<div class="roa-cell-texto" style="font-size:0.85rem;">${t.instrucciones}</div>` : ""}
        ${linkPlantilla ? `<a class="btn secondary small" href="${linkPlantilla}" target="_blank" rel="noopener">⬇️ Descargar documento base: ${t.archivo_nombre || "archivo"}</a>` : ""}
        ${yaEntregado
          ? `<a class="btn secondary small" href="${linkMiEntrega}" target="_blank" rel="noopener">👁️ Consultar mi entrega: ${miEntrega.archivo_nombre || "archivo"}</a>`
          : `<label class="btn small" style="cursor:pointer;">📎 Subir mi trabajo completado<input type="file" data-clase-subir="${t.id}" style="display:none;" /></label>`}
        <span data-clase-subir-estado="${t.id}" style="font-size:0.78rem; color:var(--text-muted);"></span>
      </div>`;
    }).join("");

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
    }).join("");

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

    const trabajosActividad = trabajos.filter(t => t.tipo_actividad && t.tipo_actividad !== "simple");
    const { data: misResultados } = trabajosActividad.length
      ? await sb.from("actividades_estudiante").select("*").eq("estudiante_id", estudianteId).in("trabajo_id", trabajosActividad.map(t => t.id))
      : { data: [] };
    const resultadoPorTrabajo = {};
    (misResultados || []).forEach(r => { resultadoPorTrabajo[r.trabajo_id] = r; });

    const trabajosLluviaMios = trabajos.filter(t => t.tipo_actividad === "lluvia_ideas");
    const { data: misIdeas } = trabajosLluviaMios.length
      ? await sb.from("trabajo_ideas").select("*").eq("estudiante_id", estudianteId).in("trabajo_id", trabajosLluviaMios.map(t => t.id)).order("creado_en")
      : { data: [] };
    const ideasPorTrabajo = {};
    (misIdeas || []).forEach(i => { (ideasPorTrabajo[i.trabajo_id] = ideasPorTrabajo[i.trabajo_id] || []).push(i); });

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
          ${misEntregas.length ? `<span class="badge" style="background:#e3f6ea; color:#1d7a43;">✓ Ya entregaste ${misEntregas.length} ve${misEntregas.length === 1 ? "z" : "ces"} — podés volver a entregar si necesitás corregir algo</span>` : ""}
          <form class="inline-form" data-proyecto-form="${t.id}" style="margin-top:0.3rem; width:100%;">
            <input name="titulo" placeholder="Título de tu entrega" required style="flex:1; min-width:10rem" />
            <textarea name="descripcion" placeholder="Descripción de tu entrega" rows="2" required style="flex-basis:100%; font-family:inherit; resize:vertical;"></textarea>
            <label style="flex-basis:100%; font-size:0.82rem;">Archivo:
              <input type="file" name="archivo" required style="display:block; margin-top:0.3rem;" />
            </label>
            <button class="btn small" type="submit">Enviar entrega</button>
            <span data-proyecto-estado="${t.id}" style="font-size:0.78rem; color:var(--text-muted);"></span>
          </form>
          ${misEntregas.length ? `<div style="width:100%; display:grid; gap:0.4rem; margin-top:0.3rem;">
            ${misEntregas.map(e => {
              const { data: pub } = sb.storage.from("materiales").getPublicUrl(e.archivo_ruta);
              return `<div style="font-size:0.82rem; padding:0.4rem 0.5rem; background:#F5F6FA; border-radius:6px;">
                <strong>${e.titulo}</strong> <span style="color:var(--text-muted);">· ${formatearFechaHora(e.creado_en)}</span>
                ${e.descripcion ? `<div style="margin-top:0.2rem;">${e.descripcion}</div>` : ""}
                <a class="btn secondary small" style="margin-top:0.3rem;" href="${pub.publicUrl}" target="_blank" rel="noopener">📄 ${e.archivo_nombre || "Ver archivo"}</a>
              </div>`;
            }).join("")}
          </div>` : ""}
        </div>`;
      }
      if (esActividad && t.tipo_actividad === "lluvia_ideas") {
        const misIdeasTrabajo = ideasPorTrabajo[t.id] || [];
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
          </div>
          <span data-idea-estado="${t.id}" style="font-size:0.78rem; color:var(--text-muted);"></span>
          ${misIdeasTrabajo.length ? `<div style="width:100%; display:grid; gap:0.3rem;">
            ${misIdeasTrabajo.map(idea => `
              <div style="font-size:0.82rem; padding:0.35rem 0.5rem; border-left:3px solid ${idea.calificacion === "buena" ? "#1d7a43" : (idea.calificacion === "mala" ? "#c0392b" : "#bbb")}; background:#F5F6FA;">
                ${idea.texto}${idea.calificacion === "buena" ? " · 👍" : (idea.calificacion === "mala" ? " · 👎" : "")}
              </div>`).join("")}
          </div>` : ""}
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
                return `<span class="badge" style="background:#e3f6ea; color:#1d7a43;">✓ Entregado: ${res.archivo_nombre || "archivo"}${res.puntaje != null ? " — Nota: " + res.puntaje + "/3" : " (pendiente de calificación)"}</span>
               <a class="btn secondary small" href="${pub.publicUrl}" target="_blank" rel="noopener">👁️ Consultar mi entrega</a>`;
              })()
            : `<label class="btn small" style="cursor:pointer;">📎 Subir archivo (imagen o PDF)<input type="file" data-infografia-subir="${t.id}" accept="image/*,.pdf" style="display:none;" /></label>`}
          <span data-infografia-estado="${t.id}" style="font-size:0.78rem; color:var(--text-muted);"></span>
        </div>`;
      }
      if (esActividad) {
        const res = resultadoPorTrabajo[t.id];
        const completo = res && res.completado;
        const puedeVerRetro = completo && t.retro_visible && TIPOS_CON_RETRO.includes(t.tipo_actividad);
        const aunNoEsHora = t.tipo_actividad === "prueba" && t.fecha_hora_inicio && new Date(t.fecha_hora_inicio) > new Date();
        let accionInicio;
        if (completo) {
          accionInicio = `<span class="badge" style="background:#e3f6ea; color:#1d7a43;">✓ Completado — Nota: ${res.puntaje}/3</span>`;
        } else if (aunNoEsHora) {
          accionInicio = `<span class="badge" style="background:#fdf1dc; color:#a5690a;">⏳ Disponible a partir de ${formatearFechaHora(t.fecha_hora_inicio)}</span>`;
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
          ${puedeVerRetro ? `<button class="btn secondary small" data-ver-mi-retro="${t.id}">📝 Ver mis respuestas</button><div data-mi-retro-panel="${t.id}" style="width:100%;"></div>` : ""}
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
            ? `<span class="badge" style="background:#e3f6ea; color:#1d7a43;">✓ Entregado</span>`
            : `<label style="display:flex; align-items:center; gap:0.4rem; font-size:0.85rem;">
                 <input type="checkbox" data-mi-trabajo-subtema="${t.id}" /> Completado
               </label>`}
        </div>
        ${t.descripcion ? `<div class="roa-cell-texto" style="font-size:0.85rem;">${t.descripcion}</div>` : ""}
        ${yaEntregado
          ? (linkArchivo ? `<a class="btn secondary small" href="${linkArchivo}" target="_blank" rel="noopener">👁️ Consultar mi entrega: ${miEstado.archivo_nombre || "archivo"}</a>` : "")
          : `<label class="btn small" style="cursor:pointer;">📎 Adjuntar archivo para que lo califiquen<input type="file" data-trabajo-subtema-subir="${t.id}" style="display:none;" /></label>`}
        <span data-trabajo-subtema-subir-estado="${t.id}" style="font-size:0.78rem; color:var(--text-muted);"></span>
      </div>`;
    }).join("");

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

    holder.querySelectorAll("[data-proyecto-form]").forEach(form => {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const trabajoId = form.dataset.proyectoForm;
        const estado = holder.querySelector(`[data-proyecto-estado="${trabajoId}"]`);
        const f = new FormData(form);
        const archivo = f.get("archivo");
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
          <span class="name">${t.tipo_actividad === "prueba" ? "📝 " : (t.tipo_actividad && t.tipo_actividad !== "simple" ? "🧠 " : "")}${t.titulo}${t.fecha ? " · " + t.fecha : ""}</span>
          <span style="display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap;">
            ${t.tipo_actividad && t.tipo_actividad !== "simple" ? `<span class="badge" style="font-weight:400;">${NOMBRES_ACTIVIDAD[t.tipo_actividad] || t.tipo_actividad}</span>` : ""}
            ${t.tipo_actividad === "prueba" ? `<span class="badge" style="font-weight:400;">${t.fecha_hora_inicio ? "⏰ Inicia: " + formatearFechaHora(t.fecha_hora_inicio) : "⏰ Sin hora programada"}</span>
            <button class="btn secondary small" data-cambiar-hora-prueba="${t.id}">⏰ Cambiar hora</button>` : ""}
            <span class="badge">${conteos[t.id] || 0} ${t.tipo_actividad === "lluvia_ideas" ? "participaron" : (t.tipo_actividad === "proyecto" ? "entregaron" : "completaron")}</span>
            <button class="btn ${t.habilitado === false ? "" : "secondary"} small" data-toggle-trabajo-subtema-habilitado="${t.id}" data-estado-actual="${t.habilitado !== false}">
              ${t.habilitado === false ? "Habilitar" : "Habilitado"}
            </button>
            ${t.tipo_actividad === "infografia" ? `<button class="btn secondary small" data-ver-entregas="${t.id}">📂 Ver entregas</button>` : ""}
            ${t.tipo_actividad === "proyecto" ? `<button class="btn secondary small" data-ver-entregas-proyecto="${t.id}">📂 Ver entregas</button>` : ""}
            ${esEditable(t) ? `<button class="btn secondary small" data-ver-entregas-trabajo="${t.id}">📎 Ver archivos entregados</button>` : ""}
            ${ACTIVIDADES_BLOQUEADAS.includes(t.tipo_actividad) ? `<button class="btn secondary small" data-ver-preguntas="${t.id}">👁️ Ver preguntas</button>` : ""}
            ${TIPOS_CON_RETRO.includes(t.tipo_actividad) ? `<button class="btn secondary small" data-ver-retro="${t.id}">📝 Ver retroalimentación</button>` : ""}
            ${TIPOS_CON_RETRO.includes(t.tipo_actividad) ? `<button class="btn ${t.retro_visible ? "" : "secondary"} small" data-toggle-retro-visible="${t.id}" data-estado-actual="${t.retro_visible === true}">${t.retro_visible ? "🙈 Ocultar respuestas a estudiantes" : "👁️ Mostrar respuestas a estudiantes"}</button>` : ""}
            ${t.tipo_actividad === "lluvia_ideas" ? `<button class="btn secondary small" data-ver-ideas="${t.id}">💡 Ver intervenciones</button>` : ""}
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
        </div>
        <form class="inline-form" data-trabajo-subtema-editar-form="${t.id}" style="display:none; width:100%;">
          <input name="titulo" value="${String(t.titulo || "").replace(/"/g, "&quot;")}" required style="flex:1; min-width:10rem;" />
          <div class="roa-editable" contenteditable="true" data-trabajo-subtema-editar-desc="${t.id}" style="flex-basis:100%; min-height:4rem;">${t.descripcion || ""}</div>
          <button class="btn small" type="submit">Guardar</button>
          <button class="btn secondary small" type="button" data-cancelar-editar-trabajo-subtema="${t.id}">Cancelar</button>
        </form>
        <div data-entregas-trabajo-panel="${t.id}" style="width:100%;"></div>` : (t.tipo_actividad === "lluvia_ideas" && t.contenido_actividad && t.contenido_actividad.pregunta ? `<div class="roa-cell-texto" style="font-size:0.85rem;">${t.contenido_actividad.pregunta}</div>` : (t.tipo_actividad === "proyecto" && t.contenido_actividad && t.contenido_actividad.instrucciones ? `<div class="roa-cell-texto" style="font-size:0.85rem;">${t.contenido_actividad.instrucciones}</div>` : (t.descripcion ? `<div class="roa-cell-texto" style="font-size:0.85rem;">${t.descripcion}</div>` : "")))}
        ${t.tipo_actividad === "infografia" ? `<div data-entregas-panel="${t.id}"></div>` : ""}
        ${t.tipo_actividad === "proyecto" ? `<div data-entregas-proyecto-panel="${t.id}" style="width:100%;"></div>` : ""}
        ${ACTIVIDADES_BLOQUEADAS.includes(t.tipo_actividad) ? `<div data-preguntas-panel="${t.id}"></div>` : ""}
        ${TIPOS_CON_RETRO.includes(t.tipo_actividad) ? `<div data-retro-panel="${t.id}"></div>` : ""}
        ${t.tipo_actividad === "lluvia_ideas" ? `<div data-ideas-panel="${t.id}" style="width:100%;"></div>` : ""}
        ${t.tipo_actividad === "prueba" ? `<div data-hora-prueba-panel="${t.id}" style="width:100%;"></div>` : ""}
      </div>`).join("");

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
          descripcion: descDiv ? descDiv.innerHTML : null
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
          <div style="background:#F5F6FA; border-radius:8px; padding:0.7rem; margin-top:0.4rem;">
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
          <div style="background:#F5F6FA; border-radius:8px; padding:0.7rem; margin-top:0.4rem;">
            <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.5rem;">El estudiante ya no puede volver a entregar este trabajo una vez marcado. Si alguien se equivocó, usá "↺ Permitir reintento". La nota se pone en la sección "Rúbrica y Evaluaciones" (0 a 3), si este trabajo quedó marcado como indicador.</p>
            ${entregas.map(e => {
              const link = e.archivo_ruta ? sb.storage.from("materiales").getPublicUrl(e.archivo_ruta).data.publicUrl : "";
              return `<div class="roster-row" style="padding:0.3rem 0; display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
                <span class="name">${nombrePorId[e.estudiante_id] || e.estudiante_id}</span>
                ${link ? `<a class="btn small" href="${link}" target="_blank" rel="noopener">📄 ${e.archivo_nombre || "Ver archivo"}</a>` : `<span class="badge">Completado (sin archivo)</span>`}
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

function construirSelectorTipoActividad() {
  return `
    <div style="background:#fff; border:1px solid var(--paper-line); border-radius:10px; padding:1rem;">
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
    <div class="au-prueba-bloque" data-bloque="${i}" style="background:#F5F6FA; border-radius:8px; padding:0.8rem; margin-bottom:0.6rem;">
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
    <div class="au-fv-bloque" data-bloque="${i}" style="background:#F5F6FA; border-radius:8px; padding:0.8rem; margin-bottom:0.6rem;">
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

// Conecta la lista dinámica (agregar/quitar) que le corresponda a cada tipo
// de actividad, después de insertar el HTML de construirPanelActividadHTML.
function inicializarConstructorPorTipo(tipo, contenedor) {
  if (tipo === "prueba" || tipo === "seleccion_unica") inicializarConstructorPrueba(contenedor);
  if (tipo === "falso_verdadero") inicializarConstructorFalsoVerdadero(contenedor);
  if (tipo === "crucigrama") inicializarConstructorCrucigrama(contenedor);
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

function construirPanelActividadHTML(tipo) {
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
      <div style="background:#FFF7E8; border:1px solid #E8C777; border-radius:8px; padding:0.8rem; margin-bottom:0.8rem;">
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
        <div id="au-prueba-caso-enunciado" contenteditable="true" style="min-height:6rem; border:1px solid var(--paper-line); border-radius:6px; padding:0.6rem; margin-bottom:0.6rem; font-size:0.85rem; background:#fff;"></div>
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
      <textarea id="au-lluvia-pregunta" rows="2" placeholder="Ej. ¿Qué gastos debería incluir el presupuesto de una pulpería?" style="width:100%; font-family:inherit; resize:vertical;"></textarea>`;
  }
  if (tipo === "proyecto") {
    return `
      <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.6rem;">El estudiante entrega poniendo un título, una descripción y un archivo. Puede volver a entregar las veces que necesite (por ejemplo si se equivocó de archivo) — cada entrega queda guardada y vos las ves todas en orden, no se borra la anterior. Útil para dividir un proyecto grande en partes: creá una actividad de este tipo por cada parte (ej. "Proyecto — Parte 1", "Proyecto — Parte 2"...) y cada una queda como su propio indicador calificable.</p>
      <label for="au-proyecto-instrucciones" style="display:block; font-size:0.85rem; font-weight:600; margin-bottom:0.4rem;">Instrucciones para el estudiante (qué debe entregar en esta parte)</label>
      <textarea id="au-proyecto-instrucciones" rows="4" placeholder="Ej. Parte 1: Subí el documento con la investigación inicial del proyecto, con al menos 3 fuentes citadas." style="width:100%; font-family:inherit; resize:vertical;"></textarea>`;
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

// Muestra (solo lectura) el contenido ya creado de una actividad, para que el
// profesor pueda revisar las preguntas/palabras/pistas sin tener que iniciarla
// como estudiante.
function construirRevisionContenidoActividad(tipo, contenido) {
  if (!contenido) return `<p class="empty" style="font-size:0.82rem;">Esta actividad no tiene contenido guardado.</p>`;
  const envoltura = (html) => `<div style="background:#F5F6FA; border-radius:8px; padding:0.8rem; margin-top:0.5rem; font-size:0.85rem;">${html}</div>`;

  if ((tipo === "seleccion_unica" || tipo === "prueba") && Array.isArray(contenido.preguntas)) {
    return envoltura(contenido.preguntas.map((p, i) => `
      <div style="margin-bottom:0.7rem;">
        <p style="font-weight:600;">${i + 1}. ${p.pregunta}</p>
        <ul style="margin:0.2rem 0 0 1.2rem; padding:0;">
          ${(p.opciones || []).map((op, j) => `<li style="${j === Number(p.correcta) ? "color:#1d7a43; font-weight:600;" : ""}">${op}${j === Number(p.correcta) ? " ✓" : ""}</li>`).join("")}
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
          <div style="font-size:0.82rem; background:#fff; border:1px solid var(--paper-line); border-radius:6px; padding:0.5rem 0.6rem; white-space:pre-wrap;">${dp.caso_respuesta ? dp.caso_respuesta.replace(/[<>]/g, "") : "<em>Sin respuesta</em>"}</div>
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
    return `<div style="margin-top:0.5rem; background:#F5F6FA; border-radius:8px; padding:0.6rem 0.8rem;">
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
      <details style="margin-bottom:0.5rem; background:#F5F6FA; border-radius:8px; padding:0.6rem 0.8rem;">
        <summary style="cursor:pointer; font-size:0.85rem; display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">
          <span>${nombrePorId[e.estudiante_id] || e.estudiante_id}</span>
          <strong>Nota: ${correctas}/${items.length} (${items.length ? Math.round((correctas / items.length) * 100) : 0}%)</strong>
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
    <div style="margin-top:0.5rem; background:#F5F6FA; border-radius:8px; padding:0.7rem;">
      <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.6rem;">${estudiantesOrdenados.length} estudiante${estudiantesOrdenados.length === 1 ? "" : "s"} participaron · ${ideas.length} idea${ideas.length === 1 ? "" : "s"} en total. Marcá cada idea como buena o mala — un segundo clic en la misma la deja sin marcar.</p>
      ${estudiantesOrdenados.map(estId => {
        const propias = porEstudiante[estId];
        const buenas = propias.filter(i => i.calificacion === "buena").length;
        const malas = propias.filter(i => i.calificacion === "mala").length;
        return `
        <details open style="margin-bottom:0.5rem; background:#fff; border-radius:8px; padding:0.6rem 0.8rem; border:1px solid var(--paper-line);">
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

// Panel del profesor para un "Proyecto": todas las entregas (puede haber
// varias por estudiante, porque se permite volver a entregar), agrupadas
// por estudiante y ordenadas de la más reciente a la más vieja.
async function pintarPanelEntregasProyecto(panel, trabajoId) {
  const { data: entregas } = await sb.from("proyecto_entregas").select("*").eq("trabajo_id", trabajoId).order("creado_en", { ascending: false });
  if (!entregas || entregas.length === 0) {
    panel.innerHTML = `<p class="empty" style="font-size:0.82rem;">Todavía nadie ha entregado.</p>`;
    return;
  }

  const estudianteIds = [...new Set(entregas.map(e => e.estudiante_id))];
  const { data: estudiantes } = await sb.from("estudiantes").select("id, nombre, apellido1, apellido2").in("id", estudianteIds);
  const nombrePorId = {};
  (estudiantes || []).forEach(e => { nombrePorId[e.id] = [e.apellido1, e.apellido2, e.nombre].filter(Boolean).join(" "); });

  const porEstudiante = {};
  entregas.forEach(e => { (porEstudiante[e.estudiante_id] = porEstudiante[e.estudiante_id] || []).push(e); });
  const estudiantesOrdenados = Object.keys(porEstudiante).sort((a, b) => (nombrePorId[a] || a).localeCompare(nombrePorId[b] || b));

  panel.innerHTML = `
    <div style="margin-top:0.5rem; background:#F5F6FA; border-radius:8px; padding:0.7rem;">
      <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.6rem;">${estudiantesOrdenados.length} estudiante${estudiantesOrdenados.length === 1 ? "" : "s"} entregaron. Si alguien entregó más de una vez, se ve la más reciente primero.</p>
      ${estudiantesOrdenados.map(estId => {
        const propias = porEstudiante[estId];
        return `
        <details style="margin-bottom:0.5rem; background:#fff; border-radius:8px; padding:0.6rem 0.8rem; border:1px solid var(--paper-line);">
          <summary style="cursor:pointer; font-size:0.85rem; display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">
            <span>${nombrePorId[estId] || estId}</span>
            <span style="font-size:0.78rem; color:var(--text-muted);">${propias.length} entrega${propias.length === 1 ? "" : "s"}</span>
          </summary>
          <div style="margin-top:0.5rem; display:grid; gap:0.4rem;">
            ${propias.map(e => {
              const { data: pub } = sb.storage.from("materiales").getPublicUrl(e.archivo_ruta);
              return `<div style="font-size:0.85rem; padding:0.4rem 0.5rem; border-left:3px solid var(--paper-line);">
                <strong>${e.titulo}</strong> <span style="color:var(--text-muted);">· ${formatearFechaHora(e.creado_en)}</span>
                ${e.descripcion ? `<div style="margin-top:0.2rem;">${e.descripcion}</div>` : ""}
                <a class="btn secondary small" style="margin-top:0.3rem;" href="${pub.publicUrl}" target="_blank" rel="noopener">📄 ${e.archivo_nombre || "Ver archivo"}</a>
              </div>`;
            }).join("")}
          </div>
        </details>`;
      }).join("")}
    </div>`;
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
      <div style="padding:0.5rem 0.6rem; border-left:4px solid ${color}; background:#F5F6FA; border-radius:4px; margin-bottom:0.4rem;">
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
    <div style="margin-top:0.6rem; background:#F5F6FA; border-radius:8px; padding:0.8rem;">
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
    return { valido: true, contenido: { instrucciones } };
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
                return `<span class="badge" style="background:#e3f6ea; color:#1d7a43;">✓ Entregado: ${res.archivo_nombre || "archivo"}${res.puntaje != null ? " — Nota: " + res.puntaje + "/3" : " (pendiente de calificación)"}</span>
               <a class="btn secondary small" href="${pub.publicUrl}" target="_blank" rel="noopener">👁️ Consultar mi entrega</a>`;
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
          accionInicio = `<span class="badge" style="background:#e3f6ea; color:#1d7a43;">✓ Completado — Nota: ${res.puntaje}/3</span>`;
        } else if (aunNoEsHora) {
          accionInicio = `<span class="badge" style="background:#fdf1dc; color:#a5690a;">⏳ Disponible a partir de ${formatearFechaHora(t.fecha_hora_inicio)}</span>`;
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
          ${puedeVerRetro ? `<button class="btn secondary small" data-ver-mi-retro-tema="${t.id}">📝 Ver mis respuestas</button><div data-mi-retro-tema-panel="${t.id}" style="width:100%;"></div>` : ""}
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
            ? `<span class="badge" style="background:#e3f6ea; color:#1d7a43;">✓ Entregado</span>`
            : `<label style="display:flex; align-items:center; gap:0.4rem; font-size:0.85rem;">
                 <input type="checkbox" data-mi-trabajo="${t.id}" /> Completado
               </label>`}
        </div>
        ${t.descripcion ? `<div class="roa-cell-texto" style="font-size:0.85rem;">${t.descripcion}</div>` : ""}
        ${yaEntregado
          ? (linkArchivo ? `<a class="btn secondary small" href="${linkArchivo}" target="_blank" rel="noopener">👁️ Consultar mi entrega: ${miEstado.archivo_nombre || "archivo"}</a>` : "")
          : `<label class="btn small" style="cursor:pointer;">📎 Adjuntar archivo para que lo califiquen<input type="file" data-trabajo-subir="${t.id}" style="display:none;" /></label>`}
        <span data-trabajo-subir-estado="${t.id}" style="font-size:0.78rem; color:var(--text-muted);"></span>
      </div>`;
    }).join("");

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
            ${TIPOS_CON_RETRO.includes(t.tipo_actividad) ? `<button class="btn ${t.retro_visible ? "" : "secondary"} small" data-toggle-retro-visible-tema="${t.id}" data-estado-actual="${t.retro_visible === true}">${t.retro_visible ? "🙈 Ocultar respuestas a estudiantes" : "👁️ Mostrar respuestas a estudiantes"}</button>` : ""}
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
      </div>`).join("");

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
          <div style="background:#F5F6FA; border-radius:8px; padding:0.7rem; margin-top:0.4rem;">
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
      ? `<button class="btn small" data-toggle-retro-visible-ind="${t.id}" data-estado-actual="true">🙈 Ocultar respuestas a estudiantes</button>`
      : `<button class="btn secondary small" data-toggle-retro-visible-ind="${t.id}" data-estado-actual="false">👁️ Mostrar respuestas a estudiantes</button>`;
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
  // Una vez que el indicador ya tiene el trabajo de "subir archivo"
  // vinculado, permite revisar/descargar lo que fueron entregando.
  function botonVerEntregasIndicador(ind) {
    const t = trabajoPorIndicador[ind.id];
    if (!t || t.tipo_actividad !== "infografia") return "";
    return `<button class="btn secondary small" data-ver-entregas-ind="${t.id}">📂 Ver entregas</button>`;
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
    <div class="roster" id="lista-indicadores-holder" style="margin-top:0.8rem;">
      ${(indicadores || []).map(ind => {
        const tieneCriterios = (ind.criterios_indicador || []).length > 0;
        const resultadoVinculado = ind.resultado_id ? resultadoPorId[ind.resultado_id] : null;
        // Una prueba se califica sola (selección única/falso-verdadero, nota
        // automática por porcentaje de aciertos): no tiene sentido pedirle al
        // profesor que le escriba criterios de evaluación con niveles de
        // desempeño, así que ese bloque no aplica a este tipo de indicador.
        const esPruebaAuto = trabajoPorIndicador[ind.id] && trabajoPorIndicador[ind.id].tipo_actividad === "prueba";
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
              ${botonPedirArchivoTrabajo(ind)}
              ${botonVerEntregasIndicador(ind)}
              ${linkTrabajo(ind)}
              <button class="btn danger small" data-del-indicador="${ind.id}">Eliminar</button>
            </span>
          </div>
          ${trabajoPorIndicador[ind.id] && trabajoPorIndicador[ind.id].tipo_actividad === "prueba" ? `<div data-hora-ind-panel="${trabajoPorIndicador[ind.id].id}"></div>` : ""}
          ${trabajoPorIndicador[ind.id] && TIPOS_CON_RETRO.includes(trabajoPorIndicador[ind.id].tipo_actividad) ? `<div data-retro-ind-panel="${trabajoPorIndicador[ind.id].id}"></div>` : ""}
          ${trabajoPorIndicador[ind.id] && TIPOS_CON_RETRO.includes(trabajoPorIndicador[ind.id].tipo_actividad) ? `<div data-diagnostico-ind-panel="${trabajoPorIndicador[ind.id].id}"></div>` : ""}
          ${trabajoPorIndicador[ind.id] && trabajoPorIndicador[ind.id].tipo_actividad === "prueba" ? `<div data-puntos-ind-panel="${trabajoPorIndicador[ind.id].id}" data-indicador-para-puntos="${ind.id}"></div>` : ""}
          ${!trabajoPorIndicador[ind.id] ? `<div data-pedir-archivo-panel="${ind.id}"></div>` : ""}
          ${trabajoPorIndicador[ind.id] && trabajoPorIndicador[ind.id].tipo_actividad === "infografia" ? `<div data-entregas-ind-panel="${trabajoPorIndicador[ind.id].id}"></div>` : ""}
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
        <div style="background:#F5F6FA; border-radius:8px; padding:0.7rem; margin-top:0.4rem;">
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
        <div style="background:#F5F6FA; border-radius:8px; padding:0.7rem; margin-top:0.4rem;">
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
      <div style="background:#fff; border:1px solid var(--paper-line); border-radius:10px; padding:1rem;">
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
