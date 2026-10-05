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
        ${role === "docente" ? `<a href="#/">Secciones</a><a href="#/materias">Materias</a><a href="#/programa">Programa</a>` : ""}
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
}

function initials(s) { return (s.apellido1[0] || "") + (s.nombre[0] || ""); }

// ---------- PERFIL (notas, tareas, whatsapp, materias) ----------

async function renderPerfil(id, isSelf) {
  const { data: s } = await sb.from("estudiantes").select("*").eq("id", id).maybeSingle();
  if (!s) { location.hash = isSelf ? "#/login" : "#/"; return; }
  if (isSelf && session.id !== s.id) { location.hash = "#/login"; return; } // seguridad extra

  const activeTab = (location.hash.split("?tab=")[1]) || "notas";

  app.innerHTML = `
    ${topbar()}
    <div class="wrap">
      ${!isSelf ? `<a href="#/seccion/${encodeURIComponent(s.seccion)}" class="btn secondary small" style="margin-bottom:1rem; display:inline-block;">&larr; Sección ${s.seccion}</a>` : ""}
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
      </div>

      <div class="tabs">
        <button class="tab-btn ${activeTab === "notas" ? "active" : ""}" data-tab="notas">Notas</button>
        <button class="tab-btn ${activeTab === "tareas" ? "active" : ""}" data-tab="tareas">Tareas</button>
        ${!isSelf ? `<button class="tab-btn ${activeTab === "whatsapp" ? "active" : ""}" data-tab="whatsapp">WhatsApp</button>
        <button class="tab-btn ${activeTab === "acceso" ? "active" : ""}" data-tab="acceso">Materias</button>` : ""}
      </div>

      <div id="tab-content">Cargando…</div>
    </div>`;
  bindTopbar();

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
  if (tab === "whatsapp" && !isSelf) return renderWhatsapp(el, s);
  if (tab === "acceso" && !isSelf) return renderAcceso(el, s);
  return renderNotas(el, s, isSelf);
}

// --- Notas (filtradas por materias asignadas si es estudiante) ---

async function renderNotas(el, s, isSelf) {
  el.innerHTML = "Cargando…";
  const { data: asignadas } = await sb.from("estudiante_materias").select("materia_id, materias(id, nombre)").eq("estudiante_id", s.id);
  const materiasAsignadas = (asignadas || []).map(a => a.materias).filter(Boolean);

  let query = sb.from("notas").select("*, materias(nombre)").eq("estudiante_id", s.id).order("creado_en", { ascending: false });
  const { data: notas } = await query;

  const rows = (notas || []).map(n => `
    <tr>
      <td>${n.materias?.nombre || "—"}</td>
      <td>${n.rubro}</td>
      <td class="num ${n.nota < 70 ? "low" : ""}">${n.nota}</td>
      ${!isSelf ? `<td><button class="btn danger small" data-del="${n.id}">Eliminar</button></td>` : ""}
    </tr>`).join("");

  const materiaOptions = materiasAsignadas.map(m => `<option value="${m.id}">${m.nombre}</option>`).join("");

  el.innerHTML = `
    ${!isSelf && materiasAsignadas.length === 0 ? `<p class="no-phone-note">Este estudiante no tiene materias asignadas todavía. Ve a la pestaña "Materias" para asignarle al menos una antes de poder registrar notas.</p>` : ""}
    <table class="grades">
      <thead><tr><th>Materia</th><th>Rubro</th><th>Nota</th>${!isSelf ? "<th></th>" : ""}</tr></thead>
      <tbody>${rows || `<tr><td colspan="${isSelf ? 3 : 4}" class="empty">Todavía no hay notas registradas.</td></tr>`}</tbody>
    </table>
    ${!isSelf && materiasAsignadas.length > 0 ? `
    <form class="inline-form" id="grade-form">
      <select name="materia_id" required>${materiaOptions}</select>
      <input name="rubro" placeholder="Rubro (ej. Examen I trim.)" required />
      <input name="nota" type="number" min="0" max="100" step="0.1" placeholder="Nota" required style="width:6rem" />
      <button class="btn small" type="submit">Agregar nota</button>
    </form>` : ""}`;

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

async function renderTareas(el, s, isSelf) {
  el.innerHTML = "Cargando…";
  const { data: tareas } = await sb.from("tareas").select("*, materias(nombre)").eq("estudiante_id", s.id).order("fecha", { ascending: true });

  const rows = (tareas || []).map(t => `
    <div class="task-row ${t.hecha ? "done" : ""}">
      <input type="checkbox" data-toggle="${t.id}" ${t.hecha ? "checked" : ""} />
      <span class="task-title">${t.materias?.nombre ? `[${t.materias.nombre}] ` : ""}${t.titulo}</span>
      <span class="task-due">${t.fecha || ""}</span>
      ${!isSelf ? `<button class="btn danger small" data-del="${t.id}">Eliminar</button>` : ""}
    </div>`).join("");

  let materiaOptions = "";
  if (!isSelf) {
    const { data: asignadas } = await sb.from("estudiante_materias").select("materias(id, nombre)").eq("estudiante_id", s.id);
    materiaOptions = `<option value="">(general)</option>` + (asignadas || []).map(a => a.materias ? `<option value="${a.materias.id}">${a.materias.nombre}</option>` : "").join("");
  }

  el.innerHTML = `
    <div>${rows || '<p class="empty">Todavía no hay tareas asignadas.</p>'}</div>
    ${!isSelf ? `
    <form class="inline-form" id="task-form">
      <select name="materia_id">${materiaOptions}</select>
      <input name="titulo" placeholder="Tarea (ej. Asiento de diario)" required style="flex:1; min-width:10rem" />
      <input name="fecha" type="date" />
      <button class="btn small" type="submit">Agregar tarea</button>
    </form>` : ""}`;

  el.querySelectorAll("[data-toggle]").forEach(cb => {
    cb.addEventListener("change", async () => {
      await sb.from("tareas").update({ hecha: cb.checked }).eq("id", cb.dataset.toggle);
      renderTareas(el, s, isSelf);
    });
  });
  if (!isSelf) {
    el.querySelectorAll("[data-del]").forEach(btn => {
      btn.addEventListener("click", async () => {
        await sb.from("tareas").delete().eq("id", btn.dataset.del);
        renderTareas(el, s, isSelf);
      });
    });
    const form = el.querySelector("#task-form");
    if (form) form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      await sb.from("tareas").insert({
        estudiante_id: s.id,
        materia_id: f.get("materia_id") ? Number(f.get("materia_id")) : null,
        titulo: f.get("titulo"),
        fecha: f.get("fecha") || null,
        hecha: false
      });
      renderTareas(el, s, isSelf);
    });
  }
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

async function renderProgramaUnidad(id) {
  const { data: u } = await sb.from("programa").select("*").eq("id", id).maybeSingle();
  if (!u) { location.hash = "#/programa"; return; }

  app.innerHTML = `
    ${topbar()}
    <div class="wrap">
      <a href="#/programa" class="btn secondary small" style="margin-bottom:1rem; display:inline-block;">&larr; Programa</a>
      <h1>${u.unidad}</h1>
      <p style="color:var(--text-muted); margin-top:-0.6em;">${u.nivel} · ${u.subarea}${u.tiempo_estimado ? " · " + u.tiempo_estimado + " horas" : ""}</p>
      <pre style="white-space:pre-wrap; font-family:var(--sans); font-size:0.88rem; line-height:1.6; background:var(--white); border:1px solid var(--paper-line); padding:1.2rem; margin-top:1rem; max-width:100%; overflow-x:auto;">${u.contenido.replace(/</g, "&lt;")}</pre>
    </div>`;
  bindTopbar();
}

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", render);
