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

  if (session.role === "estudiante") {
    // El estudiante solo ve su propio perfil, nunca otras rutas.
    return renderPerfil(session.id, true);
  }

  // Rol docente/admin
  if (hash === "#/") return renderHome();
  const secMatch = hash.match(/^#\/seccion\/(.+)$/);
  if (secMatch) return renderSeccion(decodeURIComponent(secMatch[1]));
  const perfilMatch = hash.match(/^#\/perfil\/(.+)$/);
  if (perfilMatch) return renderPerfil(decodeURIComponent(perfilMatch[1]), false);
  if (hash === "#/materias") return renderMaterias();
  if (hash === "#/rubrica") return renderRubrica();
  if (hash === "#/programa") return renderProgramaNiveles();
  const progUnidadMatch = hash.match(/^#\/programa\/(.+)$/);
  if (progUnidadMatch) return renderProgramaUnidad(decodeURIComponent(progUnidadMatch[1]));
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
        ${role === "docente" ? `<a href="#/">Secciones</a><a href="#/materias">Materias</a><a href="#/rubrica">Rúbrica</a><a href="#/programa">Programa</a>` : ""}
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
        <button class="tab-btn ${activeTab === "notas" ? "active" : ""}" data-tab="notas">Notas</button>
        <button class="tab-btn ${activeTab === "tareas" ? "active" : ""}" data-tab="tareas">Tareas</button>
        <button class="tab-btn ${activeTab === "programa" ? "active" : ""}" data-tab="programa">Programa</button>
        <button class="tab-btn ${activeTab === "rubrica" ? "active" : ""}" data-tab="rubrica">Rúbrica</button>
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

async function renderTabContent(s, tab, isSelf) {
  const el = document.getElementById("tab-content");
  if (tab === "tareas") return renderTareas(el, s, isSelf);
  if (tab === "programa") return renderProgramaEstudiante(el, s);
  if (tab === "rubrica") return renderRubricaEstudiante(el, s);
  if (tab === "whatsapp" && !isSelf) return renderWhatsapp(el, s);
  if (tab === "acceso" && !isSelf) return renderAcceso(el, s);
  return renderNotas(el, s, isSelf);
}

// --- Notas (filtradas por materias asignadas si es estudiante) ---

async function renderNotas(el, s, isSelf) {
  el.innerHTML = "Cargando…";
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
  const finalesPorMateria = materiasAsignadas.map(m => {
    const notasMateria = (notas || []).filter(n => n.materia_id === m.id);
    let pesoUsado = 0, suma = 0;
    const detalle = (categorias || []).map(c => {
      const notasCat = notasMateria.filter(n => n.rubro === c.nombre);
      if (notasCat.length === 0) return { nombre: c.nombre, porcentaje: c.porcentaje, promedio: null };
      const promedio = notasCat.reduce((a, n) => a + Number(n.nota), 0) / notasCat.length;
      suma += promedio * (c.porcentaje / 100);
      pesoUsado += Number(c.porcentaje);
      return { nombre: c.nombre, porcentaje: c.porcentaje, promedio };
    });
    return { materia: m.nombre, final: pesoUsado > 0 ? suma : null, pesoUsado, detalle };
  });

  const materiaOptions = materiasAsignadas.map(m => `<option value="${m.id}">${m.nombre}</option>`).join("");
  const categoriaOptions = (categorias || []).map(c => `<option value="${c.nombre}">${c.nombre} (${c.porcentaje}%)</option>`).join("");

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
    html += `
      <h3 style="margin-top:1.4rem;">${u.unidad}</h3>
      <p style="color:var(--text-muted); font-size:0.85rem; margin-top:-0.6em;">${u.nivel} · ${u.subarea}</p>
      <div class="roa-table">
        <div class="roa-row roa-head">
          <div>Resultado de Aprendizaje</div>
          <div>Saberes Esenciales</div>
          <div>Estado</div>
        </div>
        ${(items || []).map(it => {
          const tareasVinculadas = (misTareas || []).filter(t => t.resultado_id === it.id);
          return `
          <div class="roa-row">
            <div>
              ${it.resultado}
              ${tareasVinculadas.length > 0 ? `
                <div style="margin-top:0.5rem; font-size:0.8rem;">
                  ${tareasVinculadas.map(t => `<div>${t.hecha ? "✓" : "○"} ${t.titulo}</div>`).join("")}
                </div>` : ""}
            </div>
            <div>${it.saberes}</div>
            <div style="text-align:center;">
              <span class="badge" style="${it.impartido ? "" : "opacity:0.5;"}">${it.impartido ? "Impartido" : "No impartido"}</span>
            </div>
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
      html += `
        <table class="grades">
          <thead><tr><th>Componente</th><th>Peso</th><th>Tu promedio</th><th>Aporte</th></tr></thead>
          <tbody>
            ${categorias.map(c => {
              const notasCat = notasMateria.filter(n => n.rubro === c.nombre);
              const promedio = notasCat.length ? notasCat.reduce((a, n) => a + Number(n.nota), 0) / notasCat.length : null;
              const aporte = promedio !== null ? (promedio * c.porcentaje / 100).toFixed(1) : "—";
              return `<tr>
                <td>${c.nombre}</td>
                <td class="num">${c.porcentaje}%</td>
                <td class="num ${promedio !== null && promedio < 70 ? "low" : ""}">${promedio !== null ? promedio.toFixed(1) : "Sin notas"}</td>
                <td class="num">${aporte}</td>
              </tr>`;
            }).join("")}
          </tbody>
        </table>`;
    }
  }

  el.innerHTML = html;
}

// --- WhatsApp (solo docente) ---

function renderWhatsapp(el, s) {
  const phone = s.telefono || "";
  el.innerHTML = `
    <div class="whatsapp-panel">
      <label for="phone-input">Teléfono de contacto (con código de país, ej. 506 8888 8888)</label>
      <input id="phone-input" value="${phone}" placeholder="506 8888 8888" />
      <div class="row"><button class="btn small" id="save-phone">Guardar teléfono</button></div>
      <label for="wa-message">Mensaje</label>
      <textarea id="wa-message" rows="4">Estimado(a) encargado(a) de ${s.nombre} ${s.apellido1}, le saludamos desde el CTP Mercedes Norte, especialidad de Contabilidad.</textarea>
      <div class="row"><button class="btn wa-btn" id="send-wa">Enviar por WhatsApp</button></div>
      ${!phone ? '<p class="no-phone-note">Guarda un teléfono primero para poder enviar.</p>' : ""}
    </div>`;

  document.getElementById("save-phone").addEventListener("click", async () => {
    const val = document.getElementById("phone-input").value.trim();
    await sb.from("estudiantes").update({ telefono: val }).eq("id", s.id);
    s.telefono = val;
    renderWhatsapp(el, s);
  });
  document.getElementById("send-wa").addEventListener("click", () => {
    const currentPhone = onlyDigits(document.getElementById("phone-input").value);
    if (!currentPhone) { alert("Escribe y guarda un teléfono primero."); return; }
    const msg = document.getElementById("wa-message").value;
    window.open(`https://wa.me/${currentPhone}?text=${encodeURIComponent(msg)}`, "_blank");
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
          <span class="name">${m.nombre}</span>
          <button class="btn danger small" data-del-materia="${m.id}">Eliminar</button>
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
          <div>${soloLectura ? "Estado" : "Impartido"}</div>
        </div>
        ${(items || []).map(it => `
          <div class="roa-row">
            <div>${it.resultado}</div>
            <div>${it.saberes}</div>
            <div style="text-align:center;">
              ${soloLectura
                ? `<span class="badge" style="${it.impartido ? "" : "opacity:0.5;"}">${it.impartido ? "Impartido" : "No impartido"}</span>`
                : `<input type="checkbox" data-impartido="${it.id}" ${it.impartido ? "checked" : ""} style="width:1.2rem; height:1.2rem;" />`}
            </div>
          </div>`).join("") || `<p class="empty">No se encontraron resultados de aprendizaje para esta unidad.</p>`}
      </div>
    </div>`;
  bindTopbar();

  if (!soloLectura) {
    const saveBtn = document.getElementById("save-materia-link");
    if (saveBtn) saveBtn.addEventListener("click", async () => {
      const val = document.getElementById("materia-link").value;
      await sb.from("programa").update({ materia_id: val ? Number(val) : null }).eq("id", id);
      renderProgramaUnidad(id, soloLectura);
    });
    document.querySelectorAll("[data-impartido]").forEach(cb => {
      cb.addEventListener("change", async () => {
        await sb.from("resultados_aprendizaje").update({ impartido: cb.checked }).eq("id", cb.dataset.impartido);
      });
    });
  }
}

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", render);
