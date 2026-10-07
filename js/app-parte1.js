// Mini-LMS — CTP Mercedes Norte (versión con base de datos)
// Dos roles: "docente" (profesor/administrador, ve y edita todo) y
// "estudiante" (solo ve sus propias materias asignadas, notas y tareas).

const SESSION_KEY = "ctp_lms_session_v2";

function saveSession(s) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
function loadSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { return null; }
}
function clearSession() { sessionStorage.removeItem(SESSION_KEY); }

let session = loadSession();
const app = document.getElementById("app");

function onlyDigits(str) { return (str || "").replace(/\D/g, ""); }

async function render() {
  const hash = location.hash || "#/";
  if (!session) {
    if (hash !== "#/login") { location.hash = "#/login"; return; }
    return renderLogin();
  }
  if (hash === "#/login") { location.hash = "#/"; return; }

  const apartadoMatch = hash.match(/^#\/apartado\/(.+)$/);

  if (session.role === "estudiante") {
    // El estudiante solo ve su propio perfil, salvo la página de un apartado (solo lectura).
    if (apartadoMatch) return renderApartado(decodeURIComponent(apartadoMatch[1]), true);
    return renderPerfil(session.id, true);
  }

  // Rol docente/admin
  if (hash === "#/") return renderHome();
  const secMatch = hash.match(/^#\/seccion\/(.+)$/);
  if (secMatch) return renderSeccion(decodeURIComponent(secMatch[1]));
  const perfilMatch = hash.match(/^#\/perfil\/(.+)$/);
  if (perfilMatch) return renderPerfil(decodeURIComponent(perfilMatch[1]), false);
  if (hash === "#/materias") return renderMaterias();
  if (hash === "#/rubrica") { location.hash = "#/evaluaciones"; return; }
  if (hash === "#/programa") return renderProgramaNiveles();
  const materiaDetalleMatch = hash.match(/^#\/materia\/(.+)$/);
  if (materiaDetalleMatch) return renderMateriaDetalle(Number(materiaDetalleMatch[1]));
  if (hash === "#/evaluaciones") return renderEvaluacionesGeneral();
  if (hash === "#/asistencia") return renderAsistenciaGeneral();
  if (hash === "#/horario") return renderHorario();
  if (hash === "#/asistencia/resumen") return renderResumenAsistencia();
  if (hash === "#/asistencia/informe") return renderInformeAsistenciaSeccion();
  const progUnidadMatch = hash.match(/^#\/programa\/(.+)$/);
  if (progUnidadMatch) return renderProgramaUnidad(decodeURIComponent(progUnidadMatch[1]));
  if (apartadoMatch) return renderApartado(decodeURIComponent(apartadoMatch[1]), false);
  renderHome();
}

function topbar() {
  const role = session?.role;
  const nombre = session?.nombre || "";
  return `
  <div class="topbar">
    <div class="brand">${INSTITUCION.nombre}<small>Especialidad de ${INSTITUCION.especialidad} — Plataforma de aula</small></div>
    <div>
      <span class="docente">${role === "docente" ? "Prof. " + nombre : nombre}</span>
      <nav style="display:inline">
        ${role === "docente" ? `<a href="#/">Secciones</a><a href="#/materias">Materias</a><a href="#/programa">Programa</a><a href="#/evaluaciones">Rúbrica y Evaluaciones</a><a href="#/asistencia">Asistencia</a>` : ""}
        <a href="#" id="logout-link">Salir</a>
      </nav>
    </div>
  </div>`;
}

function bindTopbar() {
  const logout = document.getElementById("logout-link");
  if (logout) logout.addEventListener("click", (e) => {
    e.preventDefault();
    clearSession();
    session = null;
    location.hash = "#/login";
    render();
  });
}

// ---------- LOGIN ----------

function renderLogin() {
  app.innerHTML = `
    <div class="login-card">
      <h1>Ingresar</h1>
      <p class="sub">${INSTITUCION.nombre} · Especialidad de ${INSTITUCION.especialidad}</p>
      <div class="role-tabs">
        <button class="role-tab active" data-role="estudiante">Soy estudiante</button>
        <button class="role-tab" data-role="docente">Soy profesor</button>
      </div>
      <div id="login-form-wrap"></div>
      <p id="login-error" class="no-phone-note" style="display:none;"></p>
    </div>`;

  let activeRole = "estudiante";
  const wrap = document.getElementById("login-form-wrap");
  const errorEl = document.getElementById("login-error");

  function renderForm() {
    errorEl.style.display = "none";
    if (activeRole === "estudiante") {
      wrap.innerHTML = `
        <form id="login-form">
          <label for="cedula">Cédula</label>
          <input id="cedula" type="text" placeholder="4-0287-0846" required />
          <label for="pin-est">PIN</label>
          <input id="pin-est" type="password" inputmode="numeric" maxlength="4" placeholder="••••" required />
          <button class="btn" type="submit" style="width:100%">Entrar</button>
        </form>`;
    } else {
      wrap.innerHTML = `
        <form id="login-form">
          <label for="pin-doc">PIN de profesor</label>
          <input id="pin-doc" type="password" inputmode="numeric" placeholder="••••••" required />
          <button class="btn" type="submit" style="width:100%">Entrar</button>
        </form>`;
    }
    document.getElementById("login-form").addEventListener("submit", handleSubmit);
  }

  document.querySelectorAll(".role-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".role-tab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      activeRole = btn.dataset.role;
      renderForm();
    });
  });

  async function handleSubmit(e) {
    e.preventDefault();
    errorEl.style.display = "none";
    if (activeRole === "estudiante") {
      const cedula = document.getElementById("cedula").value.trim();
      const pin = document.getElementById("pin-est").value.trim();
      const { data, error } = await sb.from("estudiantes").select("*").eq("id", cedula).eq("pin", pin).maybeSingle();
      if (error || !data) {
        errorEl.textContent = "Cédula o PIN incorrectos.";
        errorEl.style.display = "block";
        return;
      }
      session = { role: "estudiante", id: data.id, nombre: `${data.nombre} ${data.apellido1}`, seccion: data.seccion };
      saveSession(session);
      location.hash = "#/";
      render();
    } else {
      const pin = document.getElementById("pin-doc").value.trim();
      const { data, error } = await sb.from("docentes").select("*").eq("pin", pin).maybeSingle();
      if (error || !data) {
        errorEl.textContent = "PIN incorrecto.";
        errorEl.style.display = "block";
        return;
      }
      session = { role: "docente", id: data.id, nombre: data.nombre };
      saveSession(session);
      location.hash = "#/";
      render();
    }
  }

  renderForm();
}

// ---------- HOME (secciones) — solo docente ----------

async function renderHome() {
  const { data: estudiantes } = await sb.from("estudiantes").select("seccion");
  const secciones = [...new Set((estudiantes || []).map(e => e.seccion))].sort();
  const counts = {};
  (estudiantes || []).forEach(e => { counts[e.seccion] = (counts[e.seccion] || 0) + 1; });

  const tiles = secciones.map(sec => `
    <a class="section-tile" href="#/seccion/${encodeURIComponent(sec)}">
      <div class="num">${sec}</div>
      <div class="count">${counts[sec]} estudiantes · ${INSTITUCION.especialidad}</div>
    </a>`).join("");

  app.innerHTML = `
    ${topbar()}
    <div class="wrap">
      <h1>Secciones</h1>
      <div class="section-grid">${tiles || '<p class="empty">No hay secciones todavía.</p>'}</div>
      <p class="footer-note">Datos guardados en la base de datos — visibles desde cualquier dispositivo.</p>
    </div>`;
  bindTopbar();
}

// ---------- SECCIÓN (lista de estudiantes) — solo docente ----------

async function renderSeccion(sec) {
  const { data: students } = await sb.from("estudiantes").select("*").eq("seccion", sec)
    .order("apellido1").order("apellido2");

  const rows = (students || []).map(s => `
    <a class="roster-row" href="#/perfil/${encodeURIComponent(s.id)}">
      <span class="name">${s.apellido1} ${s.apellido2}, ${s.nombre}</span>
      <span style="display:flex; align-items:center; gap:0.8rem;">
        <span class="cedula">${s.id}</span>
        <span class="badge">Ver perfil</span>
      </span>
    </a>`).join("");

  app.innerHTML = `
    ${topbar()}
    <div class="wrap">
      <a href="#/" class="btn secondary small" style="margin-bottom:1rem; display:inline-block;">&larr; Secciones</a>
      <h1>Sección ${sec}</h1>
      <p style="color:var(--text-muted); margin-top:-0.6em;">${(students || []).length} estudiantes · ${INSTITUCION.especialidad}</p>
      <div class="roster">${rows || '<p class="empty">No hay estudiantes registrados en esta sección.</p>'}</div>

      <details class="group-promo" open>
        <summary>Asignaciones de la sección (trabajo cotidiano, tareas, proyectos, pruebas…)</summary>
        <p style="font-size:0.82rem; color:var(--text-muted); margin-top:0.6rem;">
          Crea una asignación una sola vez y se registra automáticamente para los ${(students || []).length} estudiantes de la sección.
        </p>
        <div id="asignaciones-seccion">Cargando…</div>
      </details>

      <details class="group-promo">
        <summary>Enviar aviso o promoción por WhatsApp a toda la sección</summary>
        <p style="font-size:0.82rem; color:var(--text-muted); margin-top:0.6rem;">
          WhatsApp no permite enviar a varios contactos con un solo clic sin una cuenta de WhatsApp Business API (de pago).
          Escribe el mensaje una vez y toca "Enviar" junto a cada estudiante con teléfono guardado — se abre WhatsApp listo para enviar, uno a la vez.
        </p>
        <textarea id="group-message" rows="3" style="width:100%; max-width:480px; padding:0.55rem 0.65rem; border:1px solid var(--paper-line); border-radius:3px; font-family:var(--sans); font-size:0.88rem; background:var(--paper);">Estimados encargados, les recordamos/informamos: </textarea>
        <div id="group-list" style="margin-top:0.8rem; max-width:480px;"></div>
      </details>
    </div>`;
  bindTopbar();

  const groupList = document.getElementById("group-list");
  const groupMsgEl = document.getElementById("group-message");
  function renderGroupList() {
    groupList.innerHTML = (students || []).map(st => {
      const phone = onlyDigits(st.telefono || "");
      const label = `${st.apellido1} ${st.apellido2}, ${st.nombre}`;
      if (!phone) return `<div class="wa-list-row"><span class="wname">${label}</span><span class="no-phone">Sin teléfono</span></div>`;
      return `<div class="wa-list-row"><span class="wname">${label}</span><button class="btn wa-btn small" data-wa="${phone}">Enviar</button></div>`;
    }).join("");
    groupList.querySelectorAll("[data-wa]").forEach(btn => {
      btn.addEventListener("click", () => {
        window.open(`https://wa.me/${btn.dataset.wa}?text=${encodeURIComponent(groupMsgEl.value)}`, "_blank");
      });
    });
  }
  if (groupList) renderGroupList();

  await cargarAsignacionesSeccion(sec, students || []);
}

// ---------- 1) Publicaciones (avisos y materiales) ----------

async function cargarPublicacionesSeccion(sec, holderId = "publicaciones-seccion") {
  const holder = document.getElementById(holderId);
  if (!holder) return;
  const { data: materias } = await sb.from("materias").select("*").eq("seccion", sec).order("nombre");
  const { data: todasPubs } = await sb.from("publicaciones").select("*, materias(nombre)").eq("seccion", sec).order("creado_en", { ascending: false });
  const apartados = (todasPubs || []).filter(p => p.tipo === "apartado");
  const pubs = (todasPubs || []).filter(p => p.tipo !== "apartado");

  const materiaOptions = `<option value="">(general, sin materia)</option>` + (materias || []).map(m => `<option value="${m.id}">${m.nombre}</option>`).join("");

  const apartadosHtml = apartados.length > 0 ? `
    <h3 style="margin-top:0;">Apartados por resultado de aprendizaje</h3>
    <div class="roster" style="margin-bottom:1.4rem;">
      ${apartados.map(a => `
        <div class="roster-row">
          <a class="name" href="#/apartado/${a.id}" style="flex:1;">${a.titulo}</a>
          <span style="display:flex; gap:0.5rem; align-items:center;">
            <span class="badge" style="${a.contenido ? "" : "opacity:0.5;"}">${a.contenido ? "Con introducción" : "Sin introducción"}</span>
            <button class="btn ${a.habilitado ? "secondary" : ""} small" data-toggle-apartado-pub="${a.id}" data-estado-actual="${a.habilitado}">
              ${a.habilitado ? "Habilitado" : "No habilitado"}
            </button>
          </span>
        </div>`).join("")}
    </div>` : "";

  holder.innerHTML = `
    ${apartadosHtml}
    <div class="roster">
      ${(pubs || []).map(p => `
        <div class="roster-row" style="align-items:flex-start; flex-direction:column; gap:0.3rem;">
          <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
            <span class="name">
              <span class="badge" style="margin-right:0.5rem;">${p.tipo === "material" ? "Material" : "Aviso"}</span>
              ${p.titulo}${p.materias?.nombre ? ` · ${p.materias.nombre}` : ""}
            </span>
            <button class="btn danger small" data-del-pub="${p.id}">Eliminar</button>
          </div>
          ${p.contenido ? `<div class="roa-cell-texto" style="font-size:0.85rem;">${p.contenido}</div>` : ""}
          ${p.url ? `<a href="${p.url}" target="_blank" rel="noopener" style="font-size:0.82rem;">${p.url}</a>` : ""}
          <span style="font-size:0.75rem; color:var(--text-muted);">${new Date(p.creado_en).toLocaleDateString("es-CR")}</span>
        </div>`).join("") || '<p class="empty">Todavía no hay publicaciones.</p>'}
    </div>
    <form class="inline-form js-pub-form" style="margin-top:1rem;">
      <select name="tipo">
        <option value="aviso">Aviso</option>
        <option value="material">Material</option>
      </select>
      <select name="materia_id">${materiaOptions}</select>
      <input name="titulo" placeholder="Título" required style="flex:1; min-width:10rem" />
      <input name="url" placeholder="Enlace (opcional, ej. a un documento o video)" style="flex-basis:100%;" />
      <div class="roa-editable js-pub-contenido" contenteditable="true" style="flex-basis:100%; min-height:3rem;" data-placeholder="Contenido (opcional)"></div>
      <button class="btn small" type="submit">Publicar</button>
    </form>`;

  holder.querySelectorAll("[data-toggle-apartado-pub]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const nuevoEstado = btn.dataset.estadoActual !== "true";
      await sb.from("publicaciones").update({ habilitado: nuevoEstado }).eq("id", btn.dataset.toggleApartadoPub);
      cargarPublicacionesSeccion(sec, holderId);
    });
  });
  holder.querySelectorAll("[data-del-pub]").forEach(btn => {
    btn.addEventListener("click", async () => {
      await sb.from("publicaciones").delete().eq("id", btn.dataset.delPub);
      cargarPublicacionesSeccion(sec, holderId);
    });
  });
  const form = holder.querySelector(".js-pub-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    await sb.from("publicaciones").insert({
      seccion: sec,
      materia_id: f.get("materia_id") ? Number(f.get("materia_id")) : null,
      tipo: f.get("tipo"),
      titulo: f.get("titulo"),
      url: f.get("url") || null,
      contenido: holder.querySelector(".js-pub-contenido").innerHTML || null
    });
    cargarPublicacionesSeccion(sec, holderId);
  });
}

// ---------- 2) Evaluaciones generales de la sección ----------

async function cargarEvaluacionesSeccion(sec, students, holderId = "evaluaciones-seccion") {
  const holder = document.getElementById(holderId);
  if (!holder) return;
  const studentIds = students.map(s => s.id);
  const { data: categorias } = await sb.from("rubrica_categorias").select("*").order("orden");
  const { data: notas } = studentIds.length
    ? await sb.from("notas").select("*").in("estudiante_id", studentIds)
    : { data: [] };

  // Resumen: cuántos estudiantes tienen al menos una nota por categoría
  const resumen = (categorias || []).map(c => {
    const conNota = new Set(notas.filter(n => n.rubro === c.nombre).map(n => n.estudiante_id)).size;
    return `<div class="roster-row"><span class="name">${c.nombre} (${c.porcentaje}%)</span><span class="badge">${conNota}/${students.length} evaluados</span></div>`;
  }).join("");

  // Tabla completa: cada estudiante x cada categoría (promedio) + nota final
  const filasTabla = (await Promise.all(students.map(async st => {
    const notasSt = notas.filter(n => n.estudiante_id === st.id);
    const { data: asignadas } = await sb.from("estudiante_materias").select("materia_id").eq("estudiante_id", st.id);
    const materiaIds = (asignadas || []).map(a => a.materia_id);
    let suma = 0, pesoUsado = 0;
    const celdas = [];
    for (const c of (categorias || [])) {
      let prom = null;
      if (c.nombre.trim().toLowerCase() === "asistencia") {
        for (const mid of materiaIds) {
          const r = await calcularNotaAsistencia(st.id, mid);
          if (r) { prom = r.nota; break; }
        }
      } else {
        for (const mid of materiaIds) {
          const r = await calcularNotaIndicadores(st.id, mid, c.nombre);
          if (r) { prom = r.nota; break; }
        }
        if (prom === null) {
          const notasCat = notasSt.filter(n => n.rubro === c.nombre);
          prom = notasCat.length ? notasCat.reduce((a, n) => a + Number(n.nota), 0) / notasCat.length : null;
        }
      }
      if (prom === null) { celdas.push(`<td class="num">—</td>`); continue; }
      suma += prom * (c.porcentaje / 100);
      pesoUsado += Number(c.porcentaje);
      celdas.push(`<td class="num ${prom < 70 ? "low" : ""}">${prom.toFixed(1)}</td>`);
    }
    const final = pesoUsado > 0 ? suma.toFixed(1) : "—";
    return `<tr><td>${st.apellido1} ${st.apellido2}, ${st.nombre}</td>${celdas.join("")}<td class="num" style="font-weight:600;">${final}</td></tr>`;
  }))).join("");

  holder.innerHTML = `
    <div class="roster" style="margin-bottom:1rem;">${resumen || '<p class="empty">No hay categorías de rúbrica definidas.</p>'}</div>
    <div style="overflow-x:auto;">
      <table class="grades">
        <thead><tr><th>Estudiante</th>${(categorias || []).map(c => `<th>${c.nombre}</th>`).join("")}<th>Nota final</th></tr></thead>
        <tbody>${filasTabla || `<tr><td colspan="${(categorias || []).length + 2}" class="empty">No hay estudiantes.</td></tr>`}</tbody>
      </table>
    </div>`;
}

// ---------- Asistencia por lecciones ----------

async function renderAsistenciaGeneral() {
  const hoy = new Date().toISOString().slice(0, 10);
  app.innerHTML = `
    ${topbar()}
    <div class="wrap">
      <h1>Asistencia diaria</h1>
      <p style="color:var(--text-muted); margin-top:-0.6em;">Registra la asistencia por lección (como tu horario del día).</p>
      <div class="row" style="display:flex; gap:0.6rem; align-items:center; flex-wrap:wrap; margin:1rem 0;">
        <label style="font-size:0.85rem; color:var(--text-muted);">Fecha:</label>
        <input type="date" id="asis-fecha" value="${hoy}" />
        <a href="#/horario" class="btn secondary small">Configurar mi horario de lecciones</a>
        <a href="#/asistencia/resumen" class="btn secondary small">Resumen de lecciones impartidas/no impartidas</a>
        <a href="#/asistencia/informe" class="btn secondary small">Informe de asistencia por sección</a>
      </div>
      <div id="lecciones-grid">Cargando…</div>
      <div id="leccion-roster" style="margin-top:1.4rem;"></div>
    </div>`;
  bindTopbar();

  const fechaInput = document.getElementById("asis-fecha");
  fechaInput.addEventListener("change", () => pintarLecciones(fechaInput.value));
  await pintarLecciones(hoy);
}

async function pintarLecciones(fecha) {
  const grid = document.getElementById("lecciones-grid");
  const roster = document.getElementById("leccion-roster");
  roster.innerHTML = "";

  // new Date("YYYY-MM-DD") usa UTC; getUTCDay() evita desfases de zona horaria.
  const jsDay = new Date(fecha + "T00:00:00Z").getUTCDay(); // 0=domingo..6=sábado
  const diaSemana = jsDay; // 1=lunes..5=viernes coincide con getUTCDay()

  if (diaSemana === 0 || diaSemana === 6) {
    grid.innerHTML = `<p class="empty">Esa fecha es fin de semana — no hay lecciones programadas.</p>`;
    return;
  }

  const { data: todasLecciones } = await sb.from("lecciones").select("*, materias(nombre)").eq("dia_semana", diaSemana).order("hora_inicio");
  const lecciones = todasLecciones || [];

  if (lecciones.length === 0) {
    grid.innerHTML = `<p class="empty">No tienes lecciones configuradas para este día de la semana. <a href="#/horario">Configura tu horario aquí</a>.</p>`;
    return;
  }

  const leccionIds = lecciones.map(l => l.id);
  const { data: sinClase } = await sb.from("lecciones_sin_clase").select("leccion_id").eq("fecha", fecha).in("leccion_id", leccionIds);
  const sinClaseSet = new Set((sinClase || []).map(x => x.leccion_id));
  const { data: registros } = await sb.from("asistencia_lecciones").select("leccion_id").eq("fecha", fecha).in("leccion_id", leccionIds);
  const registradasSet = new Set((registros || []).map(x => x.leccion_id));

  // Agrupa lecciones consecutivas de la misma materia en un solo bloque de registro.
  const grupos = [];
  lecciones.forEach(l => {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo[ultimo.length - 1].materia_id === l.materia_id && ultimo[ultimo.length - 1].hora_fin === l.hora_inicio) {
      ultimo.push(l);
    } else {
      grupos.push([l]);
    }
  });

  grid.innerHTML = `
    <div class="section-grid">
      ${grupos.map(grupo => {
        const primero = grupo[0], ultimo = grupo[grupo.length - 1];
        const todasSinClase = grupo.every(l => sinClaseSet.has(l.id));
        const todasRegistradas = grupo.every(l => registradasSet.has(l.id));
        const estado = todasSinClase ? "Sin clase" : (todasRegistradas ? "Registrado" : "Pendiente de registrar");
        const idsGrupo = grupo.map(l => l.id).join(",");
        return `
        <div class="leccion-card" style="border-left-color:${estado === "Registrado" ? "var(--ledger-green)" : estado === "Sin clase" ? "var(--text-muted)" : "var(--ochre)"};">
          <div class="num" style="font-size:1.1rem;">${horaCorta(primero.hora_inicio)} – ${horaCorta(ultimo.hora_fin)}</div>
          <div class="count">Asignatura: ${primero.materias?.nombre || "—"}</div>
          <div class="count">Sección: ${primero.seccion}</div>
          <div class="count">${grupo.length > 1 ? `${grupo.length} lecciones seguidas` : "1 lección"} · Estado: ${estado}</div>
          <div style="display:flex; gap:0.5rem; margin-top:0.6rem; flex-wrap:wrap;">
            <button class="btn secondary small" data-sin-clase-grupo="${idsGrupo}">${todasSinClase ? "Quitar \"sin clase\"" : "Marcar sin clase"}</button>
            <button class="btn small" data-registrar-grupo="${idsGrupo}">Registrar asistencia</button>
          </div>
        </div>`;
      }).join("")}
    </div>`;

  grid.querySelectorAll("[data-sin-clase-grupo]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const ids = btn.dataset.sinClaseGrupo.split(",");
      const todasSinClase = ids.every(id => sinClaseSet.has(Number(id)));
      if (todasSinClase) {
        await sb.from("lecciones_sin_clase").delete().eq("fecha", fecha).in("leccion_id", ids);
      } else {
        await sb.from("lecciones_sin_clase").upsert(ids.map(id => ({ leccion_id: Number(id), fecha })), { onConflict: "leccion_id,fecha" });
      }
      pintarLecciones(fecha);
    });
  });
  grid.querySelectorAll("[data-registrar-grupo]").forEach(btn => {
    btn.addEventListener("click", () => {
      const ids = btn.dataset.registrarGrupo.split(",").map(Number);
      const grupo = lecciones.filter(l => ids.includes(l.id)).sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
      pintarRosterGrupo(grupo, fecha);
    });
  });
}

async function pintarRosterGrupo(grupo, fecha) {
  const roster = document.getElementById("leccion-roster");
  roster.innerHTML = "Cargando…";
  const primero = grupo[0], ultimo = grupo[grupo.length - 1];
  const leccionIds = grupo.map(l => l.id);

  const { data: materiaInfo } = await sb.from("materias").select("*").eq("id", primero.materia_id).maybeSingle();
  const seccionReal = materiaInfo?.seccion || primero.seccion;
  const { data: estudiantesData } = await sb.from("estudiantes").select("*").eq("seccion", seccionReal).order("apellido1").order("apellido2");
  const estudiantes = estudiantesData || [];

  const { data: existentes } = estudiantes.length
    ? await sb.from("asistencia_lecciones").select("*").eq("fecha", fecha).in("leccion_id", leccionIds)
    : { data: [] };
  // porEstudiante[estudianteId][leccionId] = estado
  const porEstudiante = {};
  (existentes || []).forEach(r => {
    porEstudiante[r.estudiante_id] = porEstudiante[r.estudiante_id] || {};
    porEstudiante[r.estudiante_id][r.leccion_id] = r.estado;
  });
  function estadoGeneralDe(stId) {
    const regs = porEstudiante[stId] || {};
    const valores = grupo.map(l => regs[l.id] || "presente");
    return valores.every(v => v === valores[0]) ? valores[0] : null; // null = personalizado (mezcla)
  }

  roster.innerHTML = `
    <h3>${horaCorta(primero.hora_inicio)} – ${horaCorta(ultimo.hora_fin)} — ${primero.materias?.nombre || ""} — ${new Date(fecha + "T00:00").toLocaleDateString("es-CR", { weekday: "long", day: "numeric", month: "long" })}</h3>
    ${estudiantes.length === 0 ? `<p class="empty">No hay estudiantes asignados a esta materia todavía (ve a "Materias" en el perfil del estudiante).</p>` : `
    <div class="roster">
      ${estudiantes.map((st, i) => {
        const general = estadoGeneralDe(st.id);
        return `
        <div class="roster-row" data-fila-estudiante="${st.id}" style="flex-direction:column; align-items:stretch; gap:0.5rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:0.6rem; flex-wrap:wrap;">
            <span class="name">${i + 1}. ${st.apellido1} ${st.apellido2}, ${st.nombre}</span>
            <span style="display:flex; align-items:center; gap:0.6rem;">
              <select data-estado-general="${st.id}" style="padding:0.3rem 0.5rem; border:1px solid var(--paper-line); border-radius:3px; font-family:var(--sans); font-size:0.85rem;">
                ${ESTADOS_ASISTENCIA.map(e => `<option value="${e.v}" ${general === e.v ? "selected" : ""}>${e.l}</option>`).join("")}
              </select>
              ${grupo.length > 1 ? `<button class="btn secondary small" data-toggle-personalizar="${st.id}">${general === null ? "Personalizado ▾" : "Personalizar por lección"}</button>` : ""}
              <span data-notificar-holder="${st.id}"></span>
            </span>
          </div>
          ${grupo.length > 1 ? `
          <div data-personalizar-panel="${st.id}" style="display:${general === null ? "block" : "none"}; background:var(--paper); border-left:2px solid var(--paper-line); padding:0.5rem 0.8rem; margin-left:1rem;">
            ${grupo.map((l, idx) => `
              <div style="display:flex; justify-content:space-between; align-items:center; gap:0.6rem; padding:0.25rem 0;">
                <span style="font-size:0.8rem; color:var(--text-muted);">${primero.materias?.nombre || ""} - Lección ${idx + 1} (${horaCorta(l.hora_inicio)}–${horaCorta(l.hora_fin)})</span>
                <select data-estado-leccion="${st.id}" data-leccion-id="${l.id}" style="padding:0.25rem 0.4rem; border:1px solid var(--paper-line); border-radius:3px; font-family:var(--sans); font-size:0.8rem;">
                  ${ESTADOS_ASISTENCIA.map(e => `<option value="${e.v}" ${(porEstudiante[st.id]?.[l.id] || "presente") === e.v ? "selected" : ""}>${e.l}</option>`).join("")}
                </select>
              </div>`).join("")}
            <button class="link-btn" data-usar-general="${st.id}" style="margin-top:0.3rem;">Usar estado general para todas</button>
          </div>` : ""}
        </div>`;
      }).join("")}
    </div>
    <div class="row" style="margin-top:0.8rem;"><button class="btn" id="guardar-asistencia-leccion">Guardar asistencia</button></div>
    `}`;

  function estadoActualPersonalizado(stId) {
    const panel = roster.querySelector(`[data-personalizar-panel="${stId}"]`);
    if (!panel || panel.style.display === "none") return null;
    return grupo.map(l => panel.querySelector(`[data-leccion-id="${l.id}"]`).value);
  }

  function peorDe(estados) {
    // prioriza el estado más grave para decidir si avisar al encargado
    const orden = ["ausente_injustificada", "tardia_grave", "tardia_leve", "ausente_justificada", "tardia_justificada", "presente"];
    for (const e of orden) if (estados.includes(e)) return e;
    return "presente";
  }

  function actualizarBotonNotificar(st) {
    const holder = roster.querySelector(`[data-notificar-holder="${st.id}"]`);
    if (!holder) return;
    const personalizados = estadoActualPersonalizado(st.id);
    const estado = personalizados ? peorDe(personalizados) : roster.querySelector(`[data-estado-general="${st.id}"]`).value;
    const etiqueta = ESTADOS_ASISTENCIA.find(e => e.v === estado)?.l || estado;
    if (estado === "presente") { holder.innerHTML = ""; return; }
    if (!st.correo_padre) { holder.innerHTML = `<span class="no-phone-note" style="margin:0;">Sin correo guardado</span>`; return; }
    const asunto = `Asistencia registrada: ${etiqueta}`;
    const cuerpo = `Estimado(a) encargado(a) de ${st.nombre} ${st.apellido1}, le informamos que fue registrado(a) como "${etiqueta}" el día ${fecha}, en la lección de ${horaCorta(primero.hora_inicio)} a ${horaCorta(ultimo.hora_fin)} (${primero.materias?.nombre || ""}). CTP Mercedes Norte.`;
    holder.innerHTML = `<a class="btn small wa-btn" href="mailto:${st.correo_padre}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}" target="_blank">✉ Notificar</a>`;
  }

  estudiantes.forEach(st => actualizarBotonNotificar(st));

  roster.querySelectorAll("[data-estado-general]").forEach(sel => {
    sel.addEventListener("change", () => actualizarBotonNotificar(estudiantes.find(e => e.id === sel.dataset.estadoGeneral)));
  });
  roster.querySelectorAll("[data-estado-leccion]").forEach(sel => {
    sel.addEventListener("change", () => actualizarBotonNotificar(estudiantes.find(e => e.id === sel.dataset.estadoLeccion)));
  });
  roster.querySelectorAll("[data-toggle-personalizar]").forEach(btn => {
    btn.addEventListener("click", () => {
      const panel = roster.querySelector(`[data-personalizar-panel="${btn.dataset.togglePersonalizar}"]`);
      panel.style.display = panel.style.display === "none" ? "block" : "none";
    });
  });
  roster.querySelectorAll("[data-usar-general]").forEach(btn => {
    btn.addEventListener("click", () => {
      const stId = btn.dataset.usarGeneral;
      roster.querySelector(`[data-personalizar-panel="${stId}"]`).style.display = "none";
      actualizarBotonNotificar(estudiantes.find(e => e.id === stId));
    });
  });

  const guardarBtn = document.getElementById("guardar-asistencia-leccion");
  if (guardarBtn) guardarBtn.addEventListener("click", async () => {
    guardarBtn.textContent = "Guardando…";
    const filas = [];
    estudiantes.forEach(st => {
      const panel = roster.querySelector(`[data-personalizar-panel="${st.id}"]`);
      const personalizado = panel && panel.style.display !== "none";
      const general = roster.querySelector(`[data-estado-general="${st.id}"]`).value;
      grupo.forEach(l => {
        const estado = personalizado ? panel.querySelector(`[data-leccion-id="${l.id}"]`).value : general;
        filas.push({ leccion_id: l.id, estudiante_id: st.id, fecha, estado });
      });
    });
    await sb.from("asistencia_lecciones").upsert(filas, { onConflict: "leccion_id,estudiante_id,fecha" });
    guardarBtn.textContent = "Guardado ✓";
    pintarLecciones(fecha);
    setTimeout(() => { guardarBtn.textContent = "Guardar asistencia"; }, 1500);
  });
}

// ---------- Configurar horario de lecciones ----------

const DIAS_SEMANA = [
  { num: 1, nombre: "Lunes" },
  { num: 2, nombre: "Martes" },
  { num: 3, nombre: "Miércoles" },
  { num: 4, nombre: "Jueves" },
  { num: 5, nombre: "Viernes" }
];
function horaCorta(hhmmss) { return (hhmmss || "").slice(0, 5); }

// Estados de asistencia según el artículo 31° del REA (Reglamento de Evaluación
// de los Aprendizajes del MEP). "peso" = cuánto cuenta como ausencia injustificada
// para el cálculo del porcentaje de asistencia (las justificadas no restan).
const ESTADOS_ASISTENCIA = [
  { v: "presente", l: "Presente", peso: 0 },
  { v: "ausente_justificada", l: "Ausente (justificada)", peso: 0 },
  { v: "ausente_injustificada", l: "Ausente (injustificada)", peso: 1 },
  { v: "tardia_leve", l: "Tardía injustificada < 10 min", peso: 0.5 },
  { v: "tardia_grave", l: "Tardía injustificada ≥ 10 min", peso: 1 },
  { v: "tardia_justificada", l: "Tardía (justificada)", peso: 0 }
];
function pesoAusencia(estado) {
  return ESTADOS_ASISTENCIA.find(e => e.v === estado)?.peso ?? 0;
}

// Calcula la nota de Asistencia (0-100) de un estudiante en una materia,
// según el artículo 31° del REA: % de ausencias injustificadas sobre el
// total de lecciones impartidas (con llegadas tardías ponderadas).
async function calcularNotaAsistencia(estudianteId, materiaId) {
  const { data: lecciones } = await sb.from("lecciones").select("id").eq("materia_id", materiaId);
  const leccionIds = (lecciones || []).map(l => l.id);
  if (leccionIds.length === 0) return null;

  const { data: todas } = await sb.from("asistencia_lecciones").select("leccion_id, fecha, estudiante_id, estado").in("leccion_id", leccionIds);
  if (!todas || todas.length === 0) return null;

  const impartidas = new Set(todas.map(r => `${r.leccion_id}-${r.fecha}`)).size;
  const delEstudiante = todas.filter(r => r.estudiante_id === estudianteId);
  const ausenciasComputadas = delEstudiante.reduce((acc, r) => acc + pesoAusencia(r.estado), 0);

  if (impartidas === 0) return null;
  const nota = Math.max(0, (1 - ausenciasComputadas / impartidas) * 100);
  return { nota, impartidas, ausenciasComputadas };
}

// Calcula la nota (0-100) de un estudiante en una categoría de una materia,
// a partir de los Indicadores y Criterios de evaluación (si existen).
async function calcularNotaIndicadores(estudianteId, materiaId, categoriaNombre) {
  const { data: indicadores } = await sb.from("indicadores").select("*").eq("materia_id", materiaId).eq("categoria", categoriaNombre).order("orden");
  if (!indicadores || indicadores.length === 0) return null;

  const indicadorIds = indicadores.map(i => i.id);
  const { data: calificaciones } = await sb.from("calificaciones_indicador").select("*").eq("estudiante_id", estudianteId).in("indicador_id", indicadorIds);
  const porIndicador = {};
  (calificaciones || []).forEach(c => { porIndicador[c.indicador_id] = c.puntaje_obtenido; });

  const sumaMaxima = indicadores.reduce((a, i) => a + Number(i.puntaje_maximo), 0);
  const sumaObtenida = indicadores.reduce((a, i) => a + Number(porIndicador[i.id] || 0), 0);
  const nota = sumaMaxima > 0 ? (sumaObtenida / sumaMaxima) * 100 : null;
  return { nota, indicadores, porIndicador, sumaObtenida, sumaMaxima };
}

async function renderHorario() {
  const { data: plantilla } = await sb.from("plantilla_lecciones").select("*").order("orden");
  const { data: materiasPorSeccion } = await sb.from("materias").select("*").order("seccion").order("nombre");
  const { data: lecciones } = await sb.from("lecciones").select("*");

  const mapa = {}; // "dia-horaInicio" -> leccion
  (lecciones || []).forEach(l => { mapa[`${l.dia_semana}-${horaCorta(l.hora_inicio)}`] = l; });

  app.innerHTML = `
    ${topbar()}
    <div class="wrap">
      <a href="#/asistencia" class="btn secondary small" style="margin-bottom:1rem; display:inline-block;">&larr; Asistencia</a>
      <h1>Mis lecciones (horas exactas)</h1>
      <p style="color:var(--text-muted); margin-top:-0.6em;">Define las horas exactas de cada lección (con sus espacios entre clases). Se usan igual todos los días.</p>
      <div class="roster" id="plantilla-lista">
        ${(plantilla || []).map(p => `
          <div class="roster-row">
            <span class="name">Lección ${p.numero} — ${horaCorta(p.hora_inicio)} a ${horaCorta(p.hora_fin)}</span>
            <button class="btn danger small" data-del-plantilla="${p.id}">Eliminar</button>
          </div>`).join("") || '<p class="empty">Todavía no has definido tus lecciones.</p>'}
      </div>
      <form class="inline-form" id="plantilla-form" style="margin-top:0.8rem;">
        <input name="numero" type="number" min="1" placeholder="N.º de lección" required style="width:8rem" />
        <input name="hora_inicio" type="time" required />
        <input name="hora_fin" type="time" required />
        <button class="btn small" type="submit">Agregar lección</button>
      </form>
    </div>`;
  bindTopbar();

  document.querySelectorAll("[data-del-plantilla]").forEach(btn => {
    btn.addEventListener("click", async () => {
      await sb.from("plantilla_lecciones").delete().eq("id", btn.dataset.delPlantilla);
      renderHorario();
    });
  });
  document.getElementById("plantilla-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    await sb.from("plantilla_lecciones").insert({
      numero: Number(f.get("numero")),
      hora_inicio: f.get("hora_inicio"),
      hora_fin: f.get("hora_fin")
    });
    renderHorario();
  });

  if (!plantilla || plantilla.length === 0) return; // sin plantilla todavía, no se puede armar la cuadrícula

  // Cuadrícula: qué materia das en cada (día, lección de la plantilla).
  const gridWrap = document.createElement("div");
  gridWrap.innerHTML = `
    <h2 style="margin-top:1.8rem;">Asignar materia por día</h2>
    <div style="overflow-x:auto; margin-top:0.6rem;">
      <table class="grades" id="horario-tabla">
        <thead><tr><th>Lección</th>${DIAS_SEMANA.map(d => `<th>${d.nombre}</th>`).join("")}</tr></thead>
        <tbody>
          ${plantilla.map(p => `
            <tr>
              <td style="white-space:nowrap; font-size:0.78rem; color:var(--text-muted);">${p.numero}<br/>${horaCorta(p.hora_inicio)}–${horaCorta(p.hora_fin)}</td>
              ${DIAS_SEMANA.map(d => {
                const existente = mapa[`${d.num}-${horaCorta(p.hora_inicio)}`];
                return `<td>
                  <select data-dia="${d.num}" data-ini="${p.hora_inicio}" data-fin="${p.hora_fin}" style="width:100%; min-width:9rem; padding:0.3rem; border:1px solid var(--paper-line); border-radius:3px; font-family:var(--sans); font-size:0.78rem;">
                    <option value="">—</option>
                    ${(materiasPorSeccion || []).map(m => `<option value="${m.id}" ${existente?.materia_id === m.id ? "selected" : ""}>${m.nombre} (${m.seccion})</option>`).join("")}
                  </select>
                </td>`;
              }).join("")}
            </tr>`).join("")}
        </tbody>
      </table>
    </div>
    <div class="row" style="margin-top:1rem;"><button class="btn" id="guardar-horario">Guardar horario</button></div>`;
  document.querySelector(".wrap").appendChild(gridWrap);

  document.getElementById("guardar-horario").addEventListener("click", async (e) => {
    const btn = e.target;
    btn.textContent = "Guardando…";
    const filas = [];
    const celdasLlenas = new Set();
    document.querySelectorAll("#horario-tabla select").forEach(sel => {
      const clave = `${sel.dataset.dia}-${sel.dataset.ini}`;
      if (!sel.value) return;
      celdasLlenas.add(clave);
      const materia = (materiasPorSeccion || []).find(m => m.id === Number(sel.value));
      filas.push({
        dia_semana: Number(sel.dataset.dia),
        hora_inicio: sel.dataset.ini,
        hora_fin: sel.dataset.fin,
        materia_id: Number(sel.value),
        seccion: materia?.seccion || ""
      });
    });
    if (filas.length > 0) {
      const { error } = await sb.from("lecciones").upsert(filas, { onConflict: "dia_semana,hora_inicio" });
      if (error) {
        console.error(error);
        alert("No se pudo guardar: " + error.message);
        btn.textContent = "Guardar horario";
        return;
      }
    }
    const celdasVacias = (lecciones || []).filter(l => !celdasLlenas.has(`${l.dia_semana}-${horaCorta(l.hora_inicio)}`));
    if (celdasVacias.length > 0) await sb.from("lecciones").delete().in("id", celdasVacias.map(l => l.id));
    btn.textContent = "Guardado ✓";
    setTimeout(() => { btn.textContent = "Guardar horario"; }, 1500);
  });
}

async function renderInformeAsistenciaSeccion() {
  app.innerHTML = `
    ${topbar()}
    <div class="wrap">
      <a href="#/asistencia" class="btn secondary small" style="margin-bottom:1rem; display:inline-block;">&larr; Asistencia</a>
      <h1>Informe de asistencia por sección</h1>
      <p style="color:var(--text-muted); margin-top:-0.6em;">Récord de cada estudiante: ausencias y tardías injustificadas, y % de asistencia según el artículo 31° del REA (contando todas sus materias juntas).</p>
      <div id="informe-asistencia-holder">Cargando…</div>
    </div>`;
  bindTopbar();

  const holder = document.getElementById("informe-asistencia-holder");
  const { data: estudiantes } = await sb.from("estudiantes").select("*").order("seccion").order("apellido1").order("apellido2");
  const porSeccion = {};
  (estudiantes || []).forEach(e => {
    porSeccion[e.seccion] = porSeccion[e.seccion] || [];
    porSeccion[e.seccion].push(e);
  });

  let html = "";
  for (const sec of Object.keys(porSeccion).sort()) {
    html += `
      <details class="group-promo" style="margin-top:1.2rem;" open>
        <summary style="font-family:var(--serif); font-weight:600; font-size:1.02rem;">Sección ${sec}</summary>
        <div style="overflow-x:auto; margin-top:0.8rem;">
          <table class="grades">
            <thead><tr><th>Estudiante</th><th>Lecciones impartidas</th><th>Ausentes injust.</th><th>Tardías injust.</th><th>% Asistencia</th></tr></thead>
            <tbody id="informe-tbody-${sec.replace(/[^a-zA-Z0-9]/g, "")}">
              ${porSeccion[sec].map(() => `<tr><td colspan="5" class="empty">Calculando…</td></tr>`).join("")}
            </tbody>
          </table>
        </div>
      </details>`;
  }
  holder.innerHTML = html;

  for (const sec of Object.keys(porSeccion)) {
    const tbody = document.getElementById(`informe-tbody-${sec.replace(/[^a-zA-Z0-9]/g, "")}`);
    const filas = await Promise.all(porSeccion[sec].map(async st => {
      const { data: leccionesSeccion } = await sb.from("lecciones").select("id").eq("seccion", sec);
      const leccionIds = (leccionesSeccion || []).map(l => l.id);
      if (leccionIds.length === 0) {
        return `<tr><td>${st.apellido1} ${st.apellido2}, ${st.nombre}</td><td colspan="4" class="empty">Sin lecciones configuradas para esta sección.</td></tr>`;
      }
      const { data: registros } = await sb.from("asistencia_lecciones").select("leccion_id, fecha, estado").eq("estudiante_id", st.id).in("leccion_id", leccionIds);
      const { data: todosRegistros } = await sb.from("asistencia_lecciones").select("leccion_id, fecha").in("leccion_id", leccionIds);
      const impartidas = new Set((todosRegistros || []).map(r => `${r.leccion_id}-${r.fecha}`)).size;
      const ausentesInj = (registros || []).filter(r => r.estado === "ausente_injustificada").length;
      const tardiasInj = (registros || []).filter(r => r.estado === "tardia_leve" || r.estado === "tardia_grave").length;
      const ausenciasComputadas = (registros || []).reduce((a, r) => a + pesoAusencia(r.estado), 0);
      const porcentaje = impartidas > 0 ? Math.max(0, (1 - ausenciasComputadas / impartidas) * 100) : null;
      return `<tr>
        <td><a href="#/perfil/${encodeURIComponent(st.id)}">${st.apellido1} ${st.apellido2}, ${st.nombre}</a></td>
        <td class="num">${impartidas}</td>
        <td class="num ${ausentesInj > 0 ? "low" : ""}">${ausentesInj}</td>
        <td class="num">${tardiasInj}</td>
        <td class="num ${porcentaje !== null && porcentaje < 70 ? "low" : ""}">${porcentaje !== null ? porcentaje.toFixed(1) + "%" : "—"}</td>
      </tr>`;
    }));
    tbody.innerHTML = filas.join("") || '<tr><td colspan="5" class="empty">No hay estudiantes.</td></tr>';
  }
}

async function renderResumenAsistencia() {
  const { data: lecciones } = await sb.from("lecciones").select("*, materias(nombre)").order("dia_semana").order("hora_inicio");
  const { data: impartidas } = await sb.from("asistencia_lecciones").select("leccion_id, fecha");
  const { data: noImpartidas } = await sb.from("lecciones_sin_clase").select("leccion_id, fecha");

  const impartidasPorLeccion = {};
  const fechasVistas = {};
  (impartidas || []).forEach(r => {
    const clave = `${r.leccion_id}-${r.fecha}`;
    if (fechasVistas[clave]) return;
    fechasVistas[clave] = true;
    impartidasPorLeccion[r.leccion_id] = (impartidasPorLeccion[r.leccion_id] || 0) + 1;
  });
  const noImpartidasPorLeccion = {};
  (noImpartidas || []).forEach(r => {
    noImpartidasPorLeccion[r.leccion_id] = (noImpartidasPorLeccion[r.leccion_id] || 0) + 1;
  });

  let totalImp = 0, totalNoImp = 0;
  const filas = (lecciones || []).map(l => {
    const imp = impartidasPorLeccion[l.id] || 0;
    const noImp = noImpartidasPorLeccion[l.id] || 0;
    totalImp += imp;
    totalNoImp += noImp;
    const diaNombre = DIAS_SEMANA.find(d => d.num === l.dia_semana)?.nombre || "";
    return `<tr>
      <td>${diaNombre} ${horaCorta(l.hora_inicio)}–${horaCorta(l.hora_fin)}</td>
      <td>${l.materias?.nombre || "—"}</td>
      <td class="num">${imp}</td>
      <td class="num">${noImp}</td>
    </tr>`;
  }).join("");

  app.innerHTML = `
    ${topbar()}
    <div class="wrap">
      <a href="#/asistencia" class="btn secondary small" style="margin-bottom:1rem; display:inline-block;">&larr; Asistencia</a>
      <h1>Resumen de lecciones</h1>
      <p style="color:var(--text-muted); margin-top:-0.6em;">Total de veces que cada lección fue impartida o marcada sin clase, desde que empezaste a registrar.</p>
      <div class="roster" style="margin:1rem 0;">
        <div class="roster-row"><span class="name">Total de lecciones impartidas</span><span class="badge">${totalImp}</span></div>
        <div class="roster-row"><span class="name">Total de lecciones no impartidas</span><span class="badge" style="opacity:0.6;">${totalNoImp}</span></div>
      </div>
      <table class="grades">
        <thead><tr><th>Lección</th><th>Materia</th><th>Impartidas</th><th>No impartidas</th></tr></thead>
        <tbody>${filas || '<tr><td colspan="4" class="empty">No hay lecciones configuradas.</td></tr>'}</tbody>
      </table>
    </div>`;
  bindTopbar();
}

async function cargarAsignacionesSeccion(sec, students) {
  const holder = document.getElementById("asignaciones-seccion");
  if (!holder) return;
  const studentIds = students.map(s => s.id);

  const { data: materias } = await sb.from("materias").select("*").eq("seccion", sec).order("nombre");
  const { data: categorias } = await sb.from("rubrica_categorias").select("*").order("orden");
  const { data: todasLasTareas } = studentIds.length
    ? await sb.from("tareas").select("*").in("estudiante_id", studentIds).not("lote", "is", null)
    : { data: [] };

  // Agrupa por lote (cada asignación creada de una vez para la sección).
  const lotes = {};
  (todasLasTareas || []).forEach(t => {
    if (!lotes[t.lote]) lotes[t.lote] = [];
    lotes[t.lote].push(t);
  });
  const listaLotes = Object.entries(lotes).sort((a, b) => (b[1][0].creado_en || "").localeCompare(a[1][0].creado_en || ""));

  const materiaOptions = `<option value="">(general)</option>` + (materias || []).map(m => `<option value="${m.id}">${m.nombre}</option>`).join("");
  const categoriaOptions = `<option value="">Sin categoría</option>` + (categorias || []).map(c => `<option value="${c.nombre}">${c.nombre}</option>`).join("");

  async function resultadoOptionsHTML(materiaIdsFiltro) {
    if (!materiaIdsFiltro || materiaIdsFiltro.length === 0) return "";
    const { data: unidades } = await sb.from("programa").select("id, unidad, materias(nombre)").in("materia_id", materiaIdsFiltro);
    const programaIds = (unidades || []).map(u => u.id);
    if (programaIds.length === 0) return "";
    const { data: resultados } = await sb.from("resultados_aprendizaje").select("id, resultado, programa_id").in("programa_id", programaIds);
    return (unidades || []).map(u => {
      const items = (resultados || []).filter(r => r.programa_id === u.id);
      if (items.length === 0) return "";
      return `<optgroup label="${u.materias?.nombre || ""} — ${u.unidad}">
        ${items.map(r => `<option value="${r.id}">${r.resultado.slice(0, 90)}${r.resultado.length > 90 ? "…" : ""}</option>`).join("")}
      </optgroup>`;
    }).join("");
  }

  const todasMateriaIds = (materias || []).map(m => m.id);
  const resultadoOptions = await resultadoOptionsHTML(todasMateriaIds);

  holder.innerHTML = `
    <div class="roster">
      ${listaLotes.map(([loteId, items]) => {
        const hechos = items.filter(t => t.hecha).length;
        const total = items.length;
        const ejemplo = items[0];
        return `
        <div class="roster-row" style="cursor:pointer;" data-lote-toggle="${loteId}">
          <span class="name">${ejemplo.categoria ? `[${ejemplo.categoria}] ` : ""}${ejemplo.titulo}${ejemplo.fecha ? " · " + ejemplo.fecha : ""}</span>
          <span style="display:flex; align-items:center; gap:0.8rem;">
            <span class="badge">${hechos}/${total} completado${hechos === 1 ? "" : "s"}</span>
            <button class="btn danger small" data-del-lote="${loteId}">Eliminar</button>
          </span>
        </div>
        <div class="lote-detalle" data-lote-detalle="${loteId}" style="display:none; padding:0.6rem 0.8rem 0.9rem;">
          ${students.map(st => {
            const t = items.find(x => x.estudiante_id === st.id);
            return `<div class="task-row ${t?.hecha ? "done" : ""}">
              <input type="checkbox" ${t?.hecha ? "checked" : ""} data-toggle-lote="${t?.id}" ${!t ? "disabled" : ""} />
              <span class="task-title">${st.apellido1} ${st.apellido2}, ${st.nombre}</span>
            </div>`;
          }).join("")}
        </div>`;
      }).join("") || '<p class="empty">Todavía no hay asignaciones creadas para toda la sección.</p>'}
    </div>

    <form class="inline-form" id="asignacion-seccion-form" style="margin-top:1rem;">
      <select name="materia_id">${materiaOptions}</select>
      <select name="categoria">${categoriaOptions}</select>
      <input name="titulo" placeholder="Asignación (ej. Guía de ejercicios 1)" required style="flex:1; min-width:10rem" />
      <input name="fecha" type="date" />
      <select name="resultado_id" style="flex-basis:100%;">${resultadoOptions || '<option value="">— Sin vincular a un resultado —</option>'}</select>
      <button class="btn small" type="submit">Crear para toda la sección</button>
    </form>`;

  holder.querySelectorAll("[data-lote-toggle]").forEach(row => {
    row.addEventListener("click", () => {
      const detalle = holder.querySelector(`[data-lote-detalle="${row.dataset.loteToggle}"]`);
      if (detalle) detalle.style.display = detalle.style.display === "none" ? "block" : "none";
    });
  });
  holder.querySelectorAll("[data-del-lote]").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!confirm("¿Eliminar esta asignación para toda la sección? Se borrará para todos los estudiantes.")) return;
      await sb.from("tareas").delete().eq("lote", btn.dataset.delLote);
      cargarAsignacionesSeccion(sec, students);
    });
  });
  holder.querySelectorAll("[data-toggle-lote]").forEach(cb => {
    cb.addEventListener("click", (e) => e.stopPropagation());
    cb.addEventListener("change", async () => {
      await sb.from("tareas").update({ hecha: cb.checked }).eq("id", cb.dataset.toggleLote);
    });
  });

  const form = document.getElementById("asignacion-seccion-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const loteId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const filas = students.map(st => ({
      estudiante_id: st.id,
      materia_id: f.get("materia_id") ? Number(f.get("materia_id")) : null,
      categoria: f.get("categoria") || null,
      resultado_id: f.get("resultado_id") ? Number(f.get("resultado_id")) : null,
      titulo: f.get("titulo"),
      fecha: f.get("fecha") || null,
      hecha: false,
      lote: loteId
    }));
    await sb.from("tareas").insert(filas);
    cargarAsignacionesSeccion(sec, students);
  });
}

function initials(s) { return (s.apellido1[0] || "") + (s.nombre[0] || ""); }

// ---------- PERFIL (notas, tareas, whatsapp, materias) ----------

async function renderPerfil(id, isSelf) {
  const { data: s } = await sb.from("estudiantes").select("*").eq("id", id).maybeSingle();
  if (!s) { location.hash = isSelf ? "#/login" : "#/"; return; }
  const previewing = isSelf && session.role === "docente"; // el profesor viendo "como lo vería el estudiante"
  if (isSelf && session.role === "estudiante" && session.id !== s.id) { location.hash = "#/login"; return; } // seguridad extra

  const activeTab = (location.hash.split("?tab=")[1]) || "notas";

  app.innerHTML = `
    ${topbar()}
    <div class="wrap">
      ${!isSelf ? `<a href="#/seccion/${encodeURIComponent(s.seccion)}" class="btn secondary small" style="margin-bottom:1rem; display:inline-block;">&larr; Sección ${s.seccion}</a>` : ""}
      ${previewing ? `
      <div class="whatsapp-panel" style="border-left: 4px solid var(--ochre); margin-bottom: 1rem;">
        <strong style="font-family:var(--serif);">Vista previa</strong>
        <p style="font-size:0.85rem; color:var(--text-muted); margin:0.3rem 0 0.6rem;">Esto es exactamente lo que ve ${s.nombre} al entrar con su cédula y PIN. No puedes editar nada desde aquí.</p>
        <button class="btn small" id="salir-vista-previa">&larr; Volver a modo profesor</button>
      </div>` : ""}
      <div class="profile-head">
        <div style="display:flex; gap:1rem; align-items:center;">
          <div class="avatar-wrap">
            <div class="avatar" id="avatar-box">${s.foto_url ? `<img src="${s.foto_url}" alt="Foto de ${s.nombre}" />` : initials(s)}</div>
            ${!isSelf ? `
            <label class="photo-upload-btn" for="photo-input">${s.foto_url ? "Cambiar foto" : "Agregar foto"}</label>
            <input type="file" id="photo-input" accept="image/*" style="display:none" />
            ${s.foto_url ? '<button class="link-btn" id="remove-photo">Quitar foto</button>' : ""}` : ""}
          </div>
          <div>
            <h1>${s.apellido1} ${s.apellido2}, ${s.nombre}</h1>
            <div class="meta">${!isSelf ? `Cédula ${s.id} · ` : ""}Sección ${s.seccion} · ${s.especialidad}</div>
          </div>
        </div>
        ${!isSelf && session.role === "docente" ? `<button class="btn secondary small" id="ver-como-estudiante">Ver como estudiante</button>` : ""}
      </div>

      <div class="tabs">
        <button class="tab-btn ${(activeTab === "notas" || activeTab === "tareas") ? "active" : ""}" data-tab="notas">Notas y Tareas</button>
        <button class="tab-btn ${activeTab === "programa" ? "active" : ""}" data-tab="programa">Programa</button>
        <button class="tab-btn ${activeTab === "rubrica" ? "active" : ""}" data-tab="rubrica">Rúbrica</button>
        <button class="tab-btn ${activeTab === "asistencia" ? "active" : ""}" data-tab="asistencia">Asistencia</button>
        <button class="tab-btn ${activeTab === "avisos" ? "active" : ""}" data-tab="avisos">Avisos</button>
        <button class="tab-btn ${activeTab === "materias-est" ? "active" : ""}" data-tab="materias-est">Materias</button>
        ${!isSelf ? `<button class="tab-btn ${activeTab === "whatsapp" ? "active" : ""}" data-tab="whatsapp">WhatsApp</button>
        <button class="tab-btn ${activeTab === "acceso" ? "active" : ""}" data-tab="acceso">Materias</button>` : ""}
      </div>

      <div id="tab-content">Cargando…</div>
    </div>`;
  bindTopbar();

  const verComoBtn = document.getElementById("ver-como-estudiante");
  if (verComoBtn) verComoBtn.addEventListener("click", () => renderPerfil(s.id, true));
  const salirPreviewBtn = document.getElementById("salir-vista-previa");
  if (salirPreviewBtn) salirPreviewBtn.addEventListener("click", () => renderPerfil(s.id, false));

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderTabContent(s, btn.dataset.tab, isSelf);
    });
  });

  if (!isSelf) {
    const photoInput = document.getElementById("photo-input");
    if (photoInput) {
      photoInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        resizeImageToDataUrl(file, 320, async (dataUrl) => {
          await sb.from("estudiantes").update({ foto_url: dataUrl }).eq("id", s.id);
          renderPerfil(s.id, isSelf);
        });
      });
    }
    const removeBtn = document.getElementById("remove-photo");
    if (removeBtn) {
      removeBtn.addEventListener("click", async () => {
        await sb.from("estudiantes").update({ foto_url: null }).eq("id", s.id);
        renderPerfil(s.id, isSelf);
      });
    }
  }

  renderTabContent(s, activeTab, isSelf);
}

function resizeImageToDataUrl(file, maxSize, callback) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      callback(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
}
