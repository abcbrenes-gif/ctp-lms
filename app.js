// Mini-LMS — CTP Mercedes Norte
// Todo el estado (notas y tareas) se guarda en localStorage del navegador.
// Esto es suficiente para uso de un solo docente en un dispositivo. Si necesitas
// que varios dispositivos vean los mismos datos, lee la sección "Siguiente paso"
// del README para conectar una base de datos real (por ejemplo Supabase).

const STORAGE_KEY = "ctp_lms_v1";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { grades: {}, tasks: {}, docenteNombre: "" };
  } catch {
    return { grades: {}, tasks: {}, docenteNombre: "" };
  }
}
function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
let state = loadState();

function studentById(id) {
  return ESTUDIANTES.find(e => e.id === id);
}
function studentsBySection(sec) {
  return ESTUDIANTES.filter(e => e.seccion === sec).sort((a, b) =>
    (a.apellido1 + a.apellido2).localeCompare(b.apellido1 + b.apellido2)
  );
}

const app = document.getElementById("app");

function render() {
  const hash = location.hash || "#/";
  if (!state.docenteNombre && hash !== "#/login") {
    location.hash = "#/login";
    return;
  }
  if (hash === "#/login") return renderLogin();
  if (hash === "#/" ) return renderHome();
  const secMatch = hash.match(/^#\/seccion\/(.+)$/);
  if (secMatch) return renderSeccion(decodeURIComponent(secMatch[1]));
  const perfilMatch = hash.match(/^#\/perfil\/(.+)$/);
  if (perfilMatch) return renderPerfil(decodeURIComponent(perfilMatch[1]));
  renderHome();
}

function topbar(activeLabel) {
  return `
  <div class="topbar">
    <div class="brand">${INSTITUCION.nombre}<small>Especialidad de ${INSTITUCION.especialidad} — Plataforma de aula</small></div>
    <div>
      <span class="docente">${state.docenteNombre ? "Prof. " + state.docenteNombre : ""}</span>
      <nav style="display:inline">
        <a href="#/">Secciones</a>
      </nav>
    </div>
  </div>`;
}

function renderLogin() {
  app.innerHTML = `
    <div class="login-card">
      <h1>Ingresar</h1>
      <p class="sub">${INSTITUCION.nombre} · Especialidad de ${INSTITUCION.especialidad}</p>
      <form id="login-form">
        <label for="docente">Nombre del docente</label>
        <input id="docente" type="text" value="${INSTITUCION.docente}" required />
        <button class="btn" type="submit" style="width:100%">Entrar</button>
      </form>
    </div>`;
  document.getElementById("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    state.docenteNombre = document.getElementById("docente").value.trim() || INSTITUCION.docente;
    saveState(state);
    location.hash = "#/";
  });
}

function renderHome() {
  const tiles = SECCIONES.map(sec => {
    const count = studentsBySection(sec).length;
    return `<a class="section-tile" href="#/seccion/${encodeURIComponent(sec)}">
      <div class="num">${sec}</div>
      <div class="count">${count} estudiantes · ${INSTITUCION.especialidad}</div>
    </a>`;
  }).join("");

  app.innerHTML = `
    ${topbar()}
    <div class="wrap">
      <h1>Secciones</h1>
      <div class="section-grid">${tiles}</div>
      <p class="footer-note">Los datos de notas y tareas se guardan en este navegador. Lee el README del proyecto si necesitas acceso compartido entre varios dispositivos.</p>
    </div>`;
}

function renderSeccion(sec) {
  const students = studentsBySection(sec);
  const rows = students.map(s => `
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
      <p style="color:var(--text-muted); margin-top:-0.6em;">${students.length} estudiantes · ${INSTITUCION.especialidad}</p>
      <div class="roster">${rows || '<p class="empty">No hay estudiantes registrados en esta sección.</p>'}</div>
    </div>`;
}

function initials(s) {
  return (s.apellido1[0] || "") + (s.nombre[0] || "");
}

function renderPerfil(id) {
  const s = studentById(id);
  if (!s) { location.hash = "#/"; return; }
  if (!state.grades[id]) state.grades[id] = [];
  if (!state.tasks[id]) state.tasks[id] = [];

  const activeTab = (location.hash.split("?tab=")[1]) || "notas";

  app.innerHTML = `
    ${topbar()}
    <div class="wrap">
      <a href="#/seccion/${encodeURIComponent(s.seccion)}" class="btn secondary small" style="margin-bottom:1rem; display:inline-block;">&larr; Sección ${s.seccion}</a>
      <div class="profile-head">
        <div style="display:flex; gap:1rem; align-items:center;">
          <div class="avatar">${initials(s)}</div>
          <div>
            <h1>${s.apellido1} ${s.apellido2}, ${s.nombre}</h1>
            <div class="meta">Cédula ${s.id} · Sección ${s.seccion} · ${s.especialidad}</div>
          </div>
        </div>
      </div>

      <div class="tabs">
        <button class="tab-btn ${activeTab === "notas" ? "active" : ""}" data-tab="notas">Notas</button>
        <button class="tab-btn ${activeTab === "tareas" ? "active" : ""}" data-tab="tareas">Tareas</button>
      </div>

      <div id="tab-content"></div>
    </div>`;

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderTabContent(s, btn.dataset.tab);
    });
  });

  renderTabContent(s, activeTab);
}

function renderTabContent(s, tab) {
  const el = document.getElementById("tab-content");
  if (tab === "tareas") return renderTareas(el, s);
  return renderNotas(el, s);
}

function renderNotas(el, s) {
  const grades = state.grades[s.id];
  const rows = grades.map((g, i) => `
    <tr>
      <td>${g.materia}</td>
      <td>${g.rubro}</td>
      <td class="num ${g.nota < 70 ? "low" : ""}">${g.nota}</td>
      <td><button class="btn danger small" data-del="${i}">Eliminar</button></td>
    </tr>`).join("");

  el.innerHTML = `
    <table class="grades">
      <thead><tr><th>Materia</th><th>Rubro</th><th>Nota</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4" class="empty">Todavía no hay notas registradas.</td></tr>'}</tbody>
    </table>
    <form class="inline-form" id="grade-form">
      <input name="materia" placeholder="Materia (ej. Contabilidad)" required />
      <input name="rubro" placeholder="Rubro (ej. Examen I trim.)" required />
      <input name="nota" type="number" min="0" max="100" step="0.1" placeholder="Nota" required style="width:6rem" />
      <button class="btn small" type="submit">Agregar nota</button>
    </form>`;

  el.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      grades.splice(Number(btn.dataset.del), 1);
      saveState(state);
      renderNotas(el, s);
    });
  });

  el.querySelector("#grade-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    grades.push({ materia: f.get("materia"), rubro: f.get("rubro"), nota: Number(f.get("nota")) });
    saveState(state);
    renderNotas(el, s);
  });
}

function renderTareas(el, s) {
  const tasks = state.tasks[s.id];
  const rows = tasks.map((t, i) => `
    <div class="task-row ${t.done ? "done" : ""}">
      <input type="checkbox" data-toggle="${i}" ${t.done ? "checked" : ""} />
      <span class="task-title">${t.titulo}</span>
      <span class="task-due">${t.fecha || ""}</span>
      <button class="btn danger small" data-del="${i}">Eliminar</button>
    </div>`).join("");

  el.innerHTML = `
    <div>${rows || '<p class="empty">Todavía no hay tareas asignadas.</p>'}</div>
    <form class="inline-form" id="task-form">
      <input name="titulo" placeholder="Tarea (ej. Asiento de diario)" required style="flex:1; min-width:10rem" />
      <input name="fecha" type="date" />
      <button class="btn small" type="submit">Agregar tarea</button>
    </form>`;

  el.querySelectorAll("[data-toggle]").forEach(cb => {
    cb.addEventListener("change", () => {
      tasks[Number(cb.dataset.toggle)].done = cb.checked;
      saveState(state);
      renderTareas(el, s);
    });
  });
  el.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => {
      tasks.splice(Number(btn.dataset.del), 1);
      saveState(state);
      renderTareas(el, s);
    });
  });
  el.querySelector("#task-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    tasks.push({ titulo: f.get("titulo"), fecha: f.get("fecha"), done: false });
    saveState(state);
    renderTareas(el, s);
  });
}

window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", render);
