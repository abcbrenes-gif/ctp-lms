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

// Cuando el profesor usa "Ver como estudiante", guardamos aquí la cédula del
// estudiante previsualizado. Mientras esté activo, TODA la navegación (clics
// en enlaces, el menú superior, etc.) se trata como si fuera un estudiante
// real: solo lectura, sin botones de edición ni de generar con IA. Se limpia
// al salir de la vista previa o al cerrar sesión.
let previewEstudianteId = null;

function onlyDigits(str) { return (str || "").replace(/\D/g, ""); }

async function render() {
  const hash = location.hash || "#/";
  if (!session) {
    if (hash !== "#/login") { location.hash = "#/login"; return; }
    return renderLogin();
  }
  if (hash === "#/login") { location.hash = "#/"; return; }

  const apartadoMatch = hash.match(/^#\/apartado\/(.+)$/);
  const cursoMatch = hash.match(/^#\/curso\/(.+)$/);
  const subtemaMatch = hash.match(/^#\/subtema\/(.+)$/);
  const demoEstrategiaMatch = hash.match(/^#\/estrategias\/demo\/(.+)$/);

  if (session.role === "estudiante" || previewEstudianteId) {
    // El estudiante (o el profesor en "Ver como estudiante") solo ve su propio
    // perfil, salvo apartado, subtema o curso interactivo (todos solo lectura/jugable),
    // y la guía de estrategias de evaluación (también de solo lectura).
    if (apartadoMatch) return renderApartado(decodeURIComponent(apartadoMatch[1]), true);
    if (subtemaMatch) return renderSubtema(Number(subtemaMatch[1]), true);
    if (cursoMatch) return renderCurso(Number(cursoMatch[1]), true);
    if (hash === "#/estrategias") return renderEstrategiasEvaluacion(true);
    if (demoEstrategiaMatch) return renderDemoEstrategia(decodeURIComponent(demoEstrategiaMatch[1]), true);
    return renderPerfil(previewEstudianteId || session.id, true);
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
  if (hash === "#/estrategias") return renderEstrategiasEvaluacion(false);
  if (demoEstrategiaMatch) return renderDemoEstrategia(decodeURIComponent(demoEstrategiaMatch[1]), false);
  if (hash === "#/mediacion") return renderEstrategiasMediacion();
  if (hash === "#/asistencia") return renderAsistenciaGeneral();
  if (hash === "#/horario") return renderHorario();
  if (hash === "#/asistencia/resumen") return renderResumenAsistencia();
  if (hash === "#/asistencia/informe") return renderInformeAsistenciaSeccion();
  if (hash === "#/periodos") return renderPeriodos();
  const progUnidadMatch = hash.match(/^#\/programa\/(.+)$/);
  if (progUnidadMatch) return renderProgramaUnidad(decodeURIComponent(progUnidadMatch[1]));
  if (apartadoMatch) return renderApartado(decodeURIComponent(apartadoMatch[1]), false);
  if (subtemaMatch) return renderSubtema(Number(subtemaMatch[1]), false);
  if (cursoMatch) return renderCurso(Number(cursoMatch[1]), false);
  renderHome();
}

function topbar() {
  const role = session?.role;
  const nombre = session?.nombre || "";
  const esDocenteSinPreview = role === "docente" && !previewEstudianteId;
  return `
  <div class="topbar">
    <div class="brand">${INSTITUCION.nombre}<small>Especialidad de ${INSTITUCION.especialidad} — Plataforma de aula</small></div>
    <div>
      <span class="docente">${role === "docente" ? "Prof. " + nombre : nombre}</span>
      <nav style="display:inline">
        ${esDocenteSinPreview ? `<a href="#/">Secciones</a><a href="#/materias">Materias</a><a href="#/programa">Programa</a><a href="#/evaluaciones">Rúbrica y Evaluaciones</a><a href="#/asistencia">Asistencia</a><a href="#/periodos">Períodos</a>` : ""}
        ${previewEstudianteId ? `<a href="#" id="salir-preview-topbar">&larr; Volver a modo profesor</a>` : ""}
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
    previewEstudianteId = null;
    location.hash = "#/login";
    render();
  });
  const salirPreviewTopbar = document.getElementById("salir-preview-topbar");
  if (salirPreviewTopbar) salirPreviewTopbar.addEventListener("click", (e) => {
    e.preventDefault();
    const id = previewEstudianteId;
    previewEstudianteId = null;
    renderPerfil(id, false);
  });
}

// ---------- LOGIN ----------

function renderLogin() {
  app.innerHTML = `
    <div class="hero-banner">
      <h1>${INSTITUCION.nombre}</h1>
      <p>Especialidad de ${INSTITUCION.especialidad} · Plataforma de aula</p>
    </div>
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

  // Entregas recientes de pruebas: para que el profesor vea de inmediato,
  // en su propia pantalla de inicio, cuando le "llegaron" las respuestas de
  // un estudiante (sin tener que entrar a cada materia a revisar).
  const { data: entregas, error: errorEntregas } = await sb
    .from("actividades_estudiante")
    .select("porcentaje, actualizado_en, estudiantes(nombre, apellido1, apellido2, seccion), trabajos_cotidianos!inner(titulo, tipo_actividad, publicaciones(titulo, materias(nombre)))")
    .eq("completado", true)
    .eq("trabajos_cotidianos.tipo_actividad", "prueba")
    .order("actualizado_en", { ascending: false })
    .limit(15);
  if (errorEntregas) console.error("No se pudieron cargar las entregas recientes:", errorEntregas.message);

  const entregasHTML = (entregas || []).length
    ? `<div class="list" style="margin-top:0.6rem;">
        ${(entregas || []).map(e => {
          const est = e.estudiantes;
          const nombreEst = est ? `${est.apellido1} ${est.apellido2}, ${est.nombre}` : "Estudiante";
          const trabajo = e.trabajos_cotidianos || {};
          const materiaNombre = trabajo.publicaciones?.materias?.nombre || "";
          const fecha = e.actualizado_en ? new Date(e.actualizado_en).toLocaleString("es-CR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
          const pct = typeof e.porcentaje === "number" ? `${e.porcentaje.toFixed(1)}%` : "—";
          return `
            <div class="list-item" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.3rem; padding:0.6rem 0; border-bottom:1px solid var(--border, #eee);">
              <div>
                <b>${nombreEst}</b>${est?.seccion ? ` <span style="color:var(--text-muted); font-size:0.78rem;">(${est.seccion})</span>` : ""}
                <div style="font-size:0.82rem; color:var(--text-muted);">${trabajo.titulo || "Prueba"}${materiaNombre ? " — " + materiaNombre : ""}</div>
              </div>
              <div style="text-align:right;">
                <div style="font-weight:600;">${pct}</div>
                <div style="font-size:0.75rem; color:var(--text-muted);">${fecha}</div>
              </div>
            </div>`;
        }).join("")}
      </div>`
    : `<p class="empty">Todavía no hay entregas de pruebas.</p>`;

  const tiles = secciones.map(sec => `
    <a class="section-tile flip-card" href="#/seccion/${encodeURIComponent(sec)}">
      <div class="flip-card-inner">
        <div class="flip-card-front">
          <div class="num">${sec}</div>
          <div class="count">${counts[sec]} estudiantes · ${INSTITUCION.especialidad}</div>
        </div>
        <div class="flip-card-back">
          <div class="flip-cta">Ver estudiantes →</div>
          <div class="flip-sub">Sección ${sec}</div>
        </div>
      </div>
    </a>`).join("");

  const accesos = [
    { href: "#/materias", icono: "📚", titulo: "Materias", sub: "Temas, apartados y publicaciones", cta: "Ver materias →" },
    { href: "#/programa", icono: "🗂️", titulo: "Programa", sub: "Unidades y resultados de aprendizaje", cta: "Ver programa →" },
    { href: "#/evaluaciones", icono: "📊", titulo: "Rúbrica y Evaluaciones", sub: "Categorías e indicadores de nota", cta: "Ver rúbrica →" },
    { href: "#/estrategias", icono: "🧪", titulo: "Estrategias de evaluación", sub: `Catálogo de ${Object.keys(ESTRATEGIAS_EVALUACION).length} estrategias para trabajos asignados`, cta: "Ver catálogo →" },
    { href: "#/mediacion", icono: "🎓", titulo: "Estrategias de mediación", sub: `Catálogo de ${Object.keys(ESTRATEGIAS_MEDIACION).length} formas de dar la clase, con pasos y guía en vivo`, cta: "Ver catálogo →" },
    { href: AULA_CONTABLE_URL, icono: "🧮", titulo: "Aula de Conta", sub: "Simulador del ciclo contable (NIC/NIIF)", cta: "Abrir aula →" },
    { href: "liquidaciones.html", icono: "📑", titulo: "Liquidaciones laborales", sub: "Preaviso, cesantía, vacaciones y aguinaldo: calculadora paso a paso y práctica", cta: "Abrir →" },
    { href: SIMULADOR_B2B_URL, icono: "🏆", titulo: "ContaRed", sub: "Simulador B2B de firmas contables (gamificado)", cta: "Abrir ContaRed →" },
    { href: "tiradera.html", icono: "⚡", titulo: "La Tiradera", sub: "Retos en vivo para la clase: selección, falso/verdadero, sopa de letras y crucigrama, con podio", cta: "Lanzar retos →" },
    { href: "tiradera.html?historial=1", icono: "📚", titulo: "Resultados de La Tiradera", sub: "Partidas anteriores: puntos ganados y perdidos de cada estudiante, descarga en Excel", cta: "Ver resultados →" },
    { href: "planilla-opoly.html", icono: "🎲", titulo: "Planilla Opoly", sub: "Juego 3D tipo Monopoly para 2–4 jugadores: compra empresas resolviendo problemas de planilla", cta: "Jugar →" }
  ].map(a => `
    <a class="section-tile flip-card" href="${a.href}" ${a.externo ? 'target="_blank" rel="noopener"' : ""}>
      <div class="flip-card-inner">
        <div class="flip-card-front">
          <div class="num" style="font-size:1.3rem;">${a.icono} ${a.titulo}</div>
          <div class="count">${a.sub}</div>
        </div>
        <div class="flip-card-back">
          <div class="flip-cta">${a.cta}</div>
          <div class="flip-sub">${a.titulo}</div>
        </div>
      </div>
    </a>`).join("");

  app.innerHTML = `
    ${topbar()}
    <div class="wrap">
      <h1>Secciones</h1>
      <div class="section-grid">${tiles || '<p class="empty">No hay secciones todavía.</p>'}</div>

      <h2 style="margin-top:2.2rem;">Accesos rápidos</h2>
      <div class="section-grid">${accesos}</div>

      <h2 style="margin-top:2.2rem;">📥 Entregas recientes de pruebas</h2>
      <p style="font-size:0.82rem; color:var(--text-muted); margin-top:-0.4rem; margin-bottom:0.4rem;">Apenas un estudiante termina una prueba, aparece aquí para que sepa que ya le llegaron las respuestas.</p>
      ${entregasHTML}

      <p class="footer-note">Datos guardados en la base de datos — visibles desde cualquier dispositivo.</p>
    </div>`;
  bindTopbar();
}

// ---------- Catálogo de estrategias de evaluación (referencia) ----------
// Página informativa: se genera directamente del catálogo real
// (ESTRATEGIAS_EVALUACION, en actividades.js) para que nunca quede
// desactualizada. No crea nada — para usar una estrategia hay que entrar
// al subtema correspondiente y elegirla al "Agregar actividad interactiva".
function renderEstrategiasEvaluacion(esEstudiante) {
  const NOMBRE_MOTOR = { rubrica_directa: "🧮 Rúbrica / Lista de cotejo", respuesta_abierta: "✍️ Respuesta abierta", autoevaluacion: "🪞 Autoevaluación / Coevaluación", proyecto: "📁 Proyecto" };
  const porMotor = {};
  Object.entries(ESTRATEGIAS_EVALUACION).forEach(([clave, e]) => { (porMotor[e.tipo] = porMotor[e.tipo] || []).push({ clave, ...e }); });

  const bloques = Object.entries(porMotor).map(([tipo, lista]) => `
    <div class="panel" style="margin-bottom:1rem;">
      <h3 style="margin-bottom:0.3rem;">${NOMBRE_MOTOR[tipo] || tipo}</h3>
      <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.8rem;">${{
        rubrica_directa: "El estudiante no entrega nada — el profesor califica directo a cada estudiante con los criterios, y la nota 0-3 se calcula sola.",
        respuesta_abierta: "El estudiante entrega un texto y el profesor lo califica a mano.",
        autoevaluacion: "El estudiante responde una escala de Nunca a Siempre y se califica sola.",
        proyecto: "El estudiante entrega título + descripción + archivo, y el profesor lo califica a mano."
      }[tipo] || ""}</p>
      <div style="display:grid; gap:0.5rem;">
        ${lista.map(e => `
          <div class="estrategia-item" style="background:var(--surface-soft); border-radius:8px; overflow:hidden;">
            <div style="display:flex; align-items:flex-start; gap:0.6rem; padding:0.5rem 0.6rem;">
              <span style="font-size:1.1rem;">${e.icono}</span>
              <div style="flex:1;">
                <strong style="font-size:0.9rem;">${e.etiqueta}</strong>
                <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.15rem;">${e.instrucciones}</div>
              </div>
              <button type="button" class="btn secondary small" data-toggle-demo="${e.clave}" style="white-space:nowrap;">Ver demo →</button>
            </div>
            <div data-demo-contenedor="${e.clave}" style="display:none; padding:0 0.6rem 0.8rem 0.6rem;"></div>
          </div>`).join("")}
      </div>
    </div>`).join("");

  app.innerHTML = `
    ${topbar()}
    <div class="wrap">
      <a href="${esEstudiante ? "#/" : "#/"}" class="btn secondary small" style="margin-bottom:1rem; display:inline-block;">&larr; Inicio</a>
      <h1>Estrategias de evaluación</h1>
      <p style="color:var(--text-muted); margin-top:-0.6em; margin-bottom:1.2rem;">${esEstudiante
        ? `Así se evalúan los distintos tipos de trabajos que tu profesor puede asignarte. Tocá "Ver demo" en cualquiera para ver un ejemplo de cómo se ve y se califica.`
        : `${Object.keys(ESTRATEGIAS_EVALUACION).length} estrategias listas para usar, agrupadas por cómo se califican. Para crear una: entrá al subtema donde la querés, "+ Agregar actividad interactiva" → elegí el tipo dentro del grupo "Estrategias de evaluación". Tocá "Ver demo" en cualquiera para mostrársela a tus estudiantes.`}</p>
      ${bloques}
      ${esEstudiante ? "" : `<p class="footer-note">¿Querés que agregue una estrategia nueva a este catálogo? Avisame.</p>`}
    </div>`;
  bindTopbar();

  const contenedorLista = app.querySelector(".wrap");
  if (contenedorLista) {
    contenedorLista.addEventListener("click", (ev) => {
      const toggleBtn = ev.target.closest("[data-toggle-demo]");
      if (toggleBtn) {
        const clave = toggleBtn.getAttribute("data-toggle-demo");
        const preset = ESTRATEGIAS_EVALUACION[clave];
        const cont = contenedorLista.querySelector(`[data-demo-contenedor="${clave}"]`);
        if (!preset || !cont) return;
        const abierto = cont.style.display !== "none";
        if (abierto) {
          cont.style.display = "none";
          toggleBtn.textContent = "Ver demo →";
        } else {
          if (!cont.innerHTML.trim()) {
            cont.innerHTML = construirDemoEstrategiaContenidoHTML({ ...preset, clave }, esEstudiante);
          }
          cont.style.display = "block";
          toggleBtn.textContent = "Ocultar demo ↑";
        }
        return;
      }
      const iniciarBtn = ev.target.closest("[data-iniciar-estrategia]");
      if (iniciarBtn) {
        const clave = iniciarBtn.getAttribute("data-iniciar-estrategia");
        if (clave) {
          sessionStorage.setItem("ctp_lms_estrategia_pendiente", clave);
          location.hash = "#/materias";
        }
        return;
      }
      const iniciarPizarraBtn = ev.target.closest("[data-iniciar-pizarra-rapida]");
      if (iniciarPizarraBtn) {
        const clave = iniciarPizarraBtn.getAttribute("data-iniciar-pizarra-rapida");
        const preset = ESTRATEGIAS_EVALUACION[clave];
        if (preset) abrirModalPizarraRapida({ ...preset, clave });
      }
    });
  }
}

// ---------- Demo de una estrategia de evaluación (ejemplo, no se guarda) ----------
// Página de solo lectura (para profesor Y estudiante) que muestra, con datos
// de ejemplo, cómo se ve y cómo se califica una estrategia específica. No
// escribe nada en la base de datos — es puramente ilustrativa.
function construirCuerpoDemoEstrategia(preset) {
  const demo = preset.demo || {};
  let cuerpoDemo = "";
  if (preset.tipo === "rubrica_directa") {
    const criterios = preset.criterios || [];
    const puntajes = demo.puntajes || criterios.map(c => c.puntos_max);
    const pct = porcentajeDesdeCriterios(criterios, puntajes);
    const puntaje03 = puntajeDesdePorcentaje(pct);
    cuerpoDemo = `
      <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.8rem;">El estudiante no ve ni entrega nada en la plataforma para este tipo. El profesor abre "🧮 Calificar" en el trabajo y llena esto, criterio por criterio, mientras observa al estudiante o revisa lo entregado en clase:</p>
      <div class="panel" style="background:var(--surface-soft);">
        ${criterios.map((c, i) => `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:0.4rem 0; border-bottom:1px solid var(--border, #eee);">
            <span style="font-size:0.88rem;">${c.nombre}</span>
            <strong style="font-size:0.88rem; white-space:nowrap; margin-left:0.6rem;">${puntajes[i]} / ${c.puntos_max}</strong>
          </div>`).join("")}
        <div style="display:flex; justify-content:space-between; align-items:center; padding:0.7rem 0 0.1rem; margin-top:0.4rem;">
          <strong>Resultado</strong>
          <strong>${pct.toFixed(1)}% → nota ${puntaje03}/3</strong>
        </div>
      </div>`;
  } else if (preset.tipo === "respuesta_abierta") {
    cuerpoDemo = `
      <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.8rem;">El estudiante ve la consigna y escribe su respuesta en un cuadro de texto. Ejemplo de una entrega real:</p>
      <div class="panel" style="background:var(--surface-soft);">
        <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.3rem;">Respuesta del estudiante (ejemplo):</div>
        <div style="white-space:pre-wrap; font-size:0.88rem; line-height:1.5;">${demo.respuesta || "(sin ejemplo)"}</div>
      </div>
      <p style="font-size:0.85rem; color:var(--text-muted); margin-top:0.8rem;">El profesor la lee desde "📨 Ver entregas" y le pone una nota de 0 a 3 a mano, con retroalimentación si quiere.</p>`;
  } else if (preset.tipo === "autoevaluacion") {
    const items = preset.afirmaciones || [];
    const respuestas = demo.respuestas || items.map(() => 3);
    const maximoPorItem = NIVELES_LIKERT.length - 1;
    const suma = respuestas.reduce((a, r) => a + r, 0);
    const pct = items.length ? (suma / (items.length * maximoPorItem)) * 100 : 0;
    const puntaje03 = puntajeDesdePorcentaje(pct);
    cuerpoDemo = `
      <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.8rem;">El estudiante responde cada afirmación tocando un nivel. Ejemplo de respuestas:</p>
      <div class="panel" style="background:var(--surface-soft);">
        ${items.map((texto, i) => `
          <div style="padding:0.4rem 0; border-bottom:1px solid var(--border, #eee);">
            <div style="font-size:0.88rem; margin-bottom:0.3rem;">${i + 1}. ${texto}</div>
            <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
              ${NIVELES_LIKERT.map((nivel, nv) => `<span class="badge" style="${respuestas[i] === nv ? "background:var(--accent, #4b6b8f); color:#fff;" : ""}">${nivel}</span>`).join("")}
            </div>
          </div>`).join("")}
        <div style="display:flex; justify-content:space-between; align-items:center; padding:0.7rem 0 0.1rem; margin-top:0.4rem;">
          <strong>Resultado (se calcula solo)</strong>
          <strong>${pct.toFixed(1)}% → nota ${puntaje03}/3</strong>
        </div>
      </div>`;
  } else if (preset.tipo === "lluvia_ideas") {
    const ideasEjemplo = demo.ideas || [];
    cuerpoDemo = `
      <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.8rem;">Cada estudiante escribe una o varias ideas cortas, y TODOS ven en el momento las ideas de sus compañeros con su nombre — como una pizarra compartida. Ejemplo de cómo se vería llenándose:</p>
      <div class="panel" style="background:var(--surface-soft);">
        ${ideasEjemplo.length ? ideasEjemplo.map((idea, i) => `
          <div style="font-size:0.88rem; padding:0.4rem 0; border-bottom:1px solid var(--border, #eee);">
            <strong>Estudiante ${i + 1}:</strong> ${idea}
          </div>`).join("") : `<p style="font-size:0.85rem; color:var(--text-muted);">(sin ejemplo)</p>`}
      </div>
      <p style="font-size:0.85rem; color:var(--text-muted); margin-top:0.8rem;">El profesor abre "💡 Ver ideas" en el trabajo: las ve agrupadas por estudiante, con el total de intervenciones de cada quien, y puede marcar cada idea como 👍 buena o 👎 mala.</p>`;
  }
  return cuerpoDemo;
}

// Contenido de la demo de una estrategia (consigna + ejemplo + botón
// "Iniciar"), sin topbar ni envoltorio de página — se usa tanto para
// desplegarla en el mismo lugar dentro de la lista de estrategias, como
// dentro de renderDemoEstrategia (enlace directo, por si alguien lo
// tiene guardado).
function construirDemoEstrategiaContenidoHTML(preset, esEstudiante) {
  const demo = preset.demo || {};
  const cuerpoDemo = construirCuerpoDemoEstrategia(preset);
  return `
    <p style="color:var(--text-muted); margin-top:0; margin-bottom:1rem;">DEMO — este ejemplo es solo para explicar cómo funciona. No se guarda nada.</p>
    <div class="panel" style="margin-bottom:1rem;">
      <strong>Consigna que vería el estudiante:</strong>
      <p style="font-size:0.9rem; margin-top:0.4rem;">${preset.instrucciones}</p>
      ${demo.escenario ? `<p style="font-size:0.82rem; color:var(--text-muted); margin-top:0.5rem;">Ejemplo de uso: ${demo.escenario}</p>` : ""}
    </div>
    ${cuerpoDemo}
    ${esEstudiante ? "" : (preset.tipo === "lluvia_ideas" ? `
    <div class="panel" style="margin-top:1rem; display:flex; justify-content:space-between; align-items:center; gap:0.8rem; flex-wrap:wrap;">
      <p style="font-size:0.85rem; margin:0;">Se abre al instante — elegís solo el título y la sección, sin pasar por materia ni subtema.</p>
      <button class="btn" data-iniciar-pizarra-rapida="${preset.clave || ""}">▶ Iniciar pizarra ahora</button>
    </div>` : `
    <div class="panel" style="margin-top:1rem; display:flex; justify-content:space-between; align-items:center; gap:0.8rem; flex-wrap:wrap;">
      <p style="font-size:0.85rem; margin:0;">Para usarla de verdad, elegí primero en qué materia y subtema la vas a asignar.</p>
      <button class="btn" data-iniciar-estrategia="${preset.clave || ""}">▶ Iniciar — elegir subtema</button>
    </div>`)}`;
}

// ---------- Pizarra rápida (lluvia de ideas "en el momento") ----------
// A diferencia de una actividad normal, esta NO se liga a ninguna materia
// ni subtema: el profesor solo pone un título y elige la sección, y los
// estudiantes de esa sección la ven de una vez en su pantalla de inicio.
// No queda guardada dentro del curso ni se usa para calificar.
async function abrirModalPizarraRapida(preset) {
  const overlay = document.createElement("div");
  overlay.id = "pizarra-rapida-overlay";
  overlay.style.cssText = "position:fixed; inset:0; background:rgba(8,11,20,0.78); z-index:9999; display:flex; align-items:center; justify-content:center; padding:1rem;";
  document.body.appendChild(overlay);

  function cerrar() { overlay.remove(); }
  overlay.addEventListener("click", (e) => { if (e.target === overlay) cerrar(); });

  const { data: estudiantesTodos } = await sb.from("estudiantes").select("seccion");
  const secciones = [...new Set((estudiantesTodos || []).map(e => e.seccion))].filter(Boolean).sort();

  function pintarFormulario() {
    overlay.innerHTML = `
      <div class="panel" style="max-width:420px; width:100%; max-height:90vh; overflow:auto; background:var(--paper); border:1px solid var(--glass-border); border-radius:var(--radius); padding:1.2rem; box-shadow:var(--shadow-sm);" data-pizarra-panel>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.6rem;">
          <h3 style="margin:0;">💡 Iniciar pizarra</h3>
          <button type="button" class="link-btn" data-pizarra-cerrar aria-label="Cerrar">✕</button>
        </div>
        <p style="font-size:0.82rem; color:var(--text-muted); margin-top:0; margin-bottom:0.8rem;">Se abre al instante — no queda guardada en ningún curso ni se usa para calificar.</p>
        <form id="pizarra-rapida-form">
          <label style="display:block; font-size:0.85rem; margin-bottom:0.3rem;">Título
            <input name="titulo" required maxlength="120" placeholder="Ej: ¿Qué sabés de planillas?" style="display:block; width:100%; margin-top:0.3rem; padding:0.5rem 0.6rem; border:1px solid var(--paper-line); border-radius:var(--radius); font-family:var(--sans);" />
          </label>
          <label style="display:block; font-size:0.85rem; margin:0.7rem 0 0.3rem;">Sección
            <select name="seccion" required style="display:block; width:100%; margin-top:0.3rem; padding:0.5rem 0.6rem; border:1px solid var(--paper-line); border-radius:var(--radius); font-family:var(--sans);">
              <option value="" disabled selected>Elegí una sección…</option>
              ${secciones.map(s => `<option value="${s}">${s}</option>`).join("")}
            </select>
          </label>
          <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1rem;">
            <button type="button" class="btn secondary small" data-pizarra-cerrar>Cancelar</button>
            <button type="submit" class="btn small">▶ Iniciar</button>
          </div>
        </form>
      </div>`;
    overlay.querySelectorAll("[data-pizarra-cerrar]").forEach(b => b.addEventListener("click", cerrar));
    overlay.querySelector("#pizarra-rapida-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const btn = e.target.querySelector("button[type=submit]");
      btn.disabled = true;
      btn.textContent = "Creando…";
      const { data: nueva, error } = await sb.from("pizarras_rapidas").insert({
        titulo: f.get("titulo").trim(), seccion: f.get("seccion"), activa: true
      }).select().maybeSingle();
      if (error || !nueva) {
        alert("No se pudo crear la pizarra: " + (error ? error.message : "intentá de nuevo"));
        btn.disabled = false;
        btn.textContent = "▶ Iniciar";
        return;
      }
      pintarEnVivo(nueva);
    });
  }

  async function pintarEnVivo(pizarra) {
    const { data: ideas } = await sb.from("pizarra_rapida_ideas").select("*").eq("pizarra_id", pizarra.id).order("creado_en");
    const listaIdeas = ideas || [];
    const autoresIds = [...new Set(listaIdeas.map(i => i.estudiante_id))];
    const { data: autoresInfo } = autoresIds.length
      ? await sb.from("estudiantes").select("id, nombre, apellido1, apellido2").in("id", autoresIds)
      : { data: [] };
    const nombrePorId = {};
    (autoresInfo || []).forEach(e => { nombrePorId[e.id] = [e.apellido1, e.apellido2, e.nombre].filter(Boolean).join(" "); });

    const porEstudiante = {};
    listaIdeas.forEach(i => { (porEstudiante[i.estudiante_id] = porEstudiante[i.estudiante_id] || []).push(i); });
    const estudiantesOrdenados = Object.keys(porEstudiante).sort((a, b) => (nombrePorId[a] || a).localeCompare(nombrePorId[b] || b));

    overlay.innerHTML = `
      <div class="panel" style="max-width:560px; width:100%; max-height:90vh; overflow:auto; background:var(--paper); border:1px solid var(--glass-border); border-radius:var(--radius); padding:1.2rem; box-shadow:var(--shadow-sm);" data-pizarra-panel>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.3rem;">
          <h3 style="margin:0;">💡 ${pizarra.titulo}</h3>
          <button type="button" class="link-btn" data-pizarra-cerrar aria-label="Cerrar">✕</button>
        </div>
        <p style="font-size:0.78rem; color:var(--text-muted); margin:0 0 0.6rem;">Sección ${pizarra.seccion} — los estudiantes ya la pueden ver y escribir desde su pantalla de inicio (entrando con su cédula y PIN, no en "Ver como estudiante").</p>
        <div style="display:flex; gap:0.5rem; margin-bottom:0.6rem; flex-wrap:wrap;">
          <button type="button" class="btn secondary small" data-pizarra-refrescar>🔄 Actualizar</button>
          <button type="button" class="btn secondary small" data-pizarra-guardar>📄 Guardar / Imprimir</button>
          <button type="button" class="btn secondary small" data-pizarra-finalizar style="margin-left:auto;">Finalizar pizarra</button>
        </div>
        <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.6rem;">${estudiantesOrdenados.length} estudiante${estudiantesOrdenados.length === 1 ? "" : "s"} participaron · ${listaIdeas.length} idea${listaIdeas.length === 1 ? "" : "s"} en total. Marcá cada idea como buena o mala para llevar la participación — un segundo clic en la misma la deja sin marcar.</p>
        ${estudiantesOrdenados.length ? estudiantesOrdenados.map(estId => {
          const propias = porEstudiante[estId];
          const buenas = propias.filter(i => i.calificacion === "buena").length;
          const malas = propias.filter(i => i.calificacion === "mala").length;
          return `
          <details open style="margin-bottom:0.5rem; background:var(--surface-soft); border-radius:8px; padding:0.6rem 0.8rem; border:1px solid var(--glass-border);">
            <summary style="cursor:pointer; font-size:0.85rem; display:flex; justify-content:space-between; align-items:center; gap:0.5rem;">
              <span>${nombrePorId[estId] || estId}</span>
              <span style="font-size:0.78rem; color:var(--text-muted);">${propias.length} intervención${propias.length === 1 ? "" : "es"} · 👍 ${buenas} · 👎 ${malas}</span>
            </summary>
            <div style="margin-top:0.5rem; display:grid; gap:0.4rem;">
              ${propias.map(idea => `
                <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; padding:0.4rem 0.5rem; border-left:3px solid ${idea.calificacion === "buena" ? "#1d7a43" : (idea.calificacion === "mala" ? "#c0392b" : "#ccc")}; font-size:0.85rem;">
                  <span>${idea.texto}</span>
                  <span style="display:flex; gap:0.3rem; flex-shrink:0;">
                    <button type="button" class="btn ${idea.calificacion === "buena" ? "" : "secondary"} small" data-pizarra-calificar-idea="${idea.id}" data-calificacion="buena">👍</button>
                    <button type="button" class="btn ${idea.calificacion === "mala" ? "danger" : "secondary"} small" data-pizarra-calificar-idea="${idea.id}" data-calificacion="mala">👎</button>
                  </span>
                </div>`).join("")}
            </div>
          </details>`;
        }).join("") : `<p class="empty" style="font-size:0.82rem;">Todavía nadie ha escrito una idea.</p>`}
      </div>`;
    overlay.querySelectorAll("[data-pizarra-cerrar]").forEach(b => b.addEventListener("click", cerrar));
    overlay.querySelector("[data-pizarra-refrescar]").addEventListener("click", () => pintarEnVivo(pizarra));
    overlay.querySelector("[data-pizarra-guardar]").addEventListener("click", () => {
      generarPdfPizarraRapida(pizarra, estudiantesOrdenados.map(estId => ({
        nombre: nombrePorId[estId] || estId,
        ideas: porEstudiante[estId]
      })));
    });
    overlay.querySelector("[data-pizarra-finalizar]").addEventListener("click", async () => {
      if (!confirm("¿Finalizar esta pizarra? Los estudiantes dejarán de verla.")) return;
      await sb.from("pizarras_rapidas").update({ activa: false }).eq("id", pizarra.id);
      cerrar();
    });
    overlay.querySelectorAll("[data-pizarra-calificar-idea]").forEach(b => {
      b.addEventListener("click", async () => {
        const ideaId = b.dataset.pizarraCalificarIdea;
        const nueva = b.dataset.calificacion;
        const idea = listaIdeas.find(i => String(i.id) === String(ideaId));
        const valorFinal = (idea && idea.calificacion === nueva) ? null : nueva;
        await sb.from("pizarra_rapida_ideas").update({ calificacion: valorFinal }).eq("id", ideaId);
        pintarEnVivo(pizarra);
      });
    });
  }

  pintarFormulario();
}

// Genera una página imprimible/"Guardar como PDF" (mismo patrón que
// generarPdfPrueba en app-parte2.js) con el detalle de una pizarra
// rápida, para que el profesor la pueda subir o archivar aparte, ya
// que la pizarra en sí no queda guardada dentro de ningún curso.
function generarPdfPizarraRapida(pizarra, bloquesPorEstudiante) {
  const hoy = new Date().toLocaleDateString("es-CR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const totalIdeas = bloquesPorEstudiante.reduce((acc, b) => acc + b.ideas.length, 0);

  const cuerpoHtml = bloquesPorEstudiante.length ? bloquesPorEstudiante.map(b => `
    <div style="margin-bottom:0.9rem; break-inside:avoid;">
      <p style="font-weight:700; margin:0 0 0.3rem;">${b.nombre}</p>
      <div style="padding-left:1.2rem; display:grid; gap:0.2rem;">
        ${b.ideas.map(i => `<div>• ${i.texto}${i.calificacion === "buena" ? " (👍)" : (i.calificacion === "mala" ? " (👎)" : "")}</div>`).join("")}
      </div>
    </div>`).join("") : `<p>Todavía nadie había escrito una idea al momento de guardar.</p>`;

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>${(pizarra.titulo || "Pizarra").replace(/[<>]/g, "")}</title>
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
    <div class="mep">${INSTITUCION.nombre}</div>
    <div>Especialidad: ${INSTITUCION.especialidad}</div>
    <div>Pizarra rápida — Lluvia de ideas</div>
  </header>

  <div class="datos">
    <div class="campo"><b>Título:</b> ${(pizarra.titulo || "").replace(/[<>]/g, "")}</div>
    <div class="campo"><b>Sección:</b> ${pizarra.seccion}</div>
    <div class="campo"><b>Fecha de guardado:</b> ${hoy}</div>
    <div class="campo"><b>Participantes / ideas:</b> ${bloquesPorEstudiante.length} / ${totalIdeas}</div>
  </div>

  ${cuerpoHtml}

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

// ---------- Estrategias de mediación (metodología de clase, no califican) ----------
// Ver ESTRATEGIAS_MEDIACION en actividades.js. A diferencia de las de
// evaluación, estas no entran a Rúbrica y Evaluaciones: son una guía de
// cómo dar la clase, con un registro simple (fecha, sección, pasos
// hechos) de cada vez que se usan, para tener evidencia propia.
function renderEstrategiasMediacion() {
  const grupos = {};
  Object.entries(ESTRATEGIAS_MEDIACION).forEach(([clave, e]) => { (grupos[e.grupo] = grupos[e.grupo] || []).push({ clave, ...e }); });

  const bloques = Object.entries(grupos).map(([grupo, lista]) => `
    <div class="panel" style="background:var(--surface); border:1px solid var(--glass-border); border-radius:var(--radius); padding:1rem; margin-bottom:1rem;">
      <h3 style="margin-bottom:0.6rem;">${grupo}</h3>
      <div style="display:grid; gap:0.5rem;">
        ${lista.map(e => `
          <div class="estrategia-item" style="background:var(--surface-soft); border-radius:8px; overflow:hidden;">
            <div style="display:flex; align-items:flex-start; gap:0.6rem; padding:0.5rem 0.6rem;">
              <span style="font-size:1.1rem;">${e.icono}</span>
              <div style="flex:1;">
                <strong style="font-size:0.9rem;">${e.etiqueta}</strong>
                <div style="font-size:0.8rem; color:var(--text-muted); margin-top:0.15rem;">${e.descripcion}</div>
              </div>
              <button type="button" class="btn secondary small" data-toggle-mediacion="${e.clave}" style="white-space:nowrap;">Ver pasos →</button>
            </div>
            <div data-mediacion-contenedor="${e.clave}" style="display:none; padding:0 0.6rem 0.8rem 0.6rem;"></div>
          </div>`).join("")}
      </div>
    </div>`).join("");

  app.innerHTML = `
    ${topbar()}
    <div class="wrap">
      <a href="#/" class="btn secondary small" style="margin-bottom:1rem; display:inline-block;">&larr; Inicio</a>
      <h1>🎓 Estrategias de mediación</h1>
      <p style="color:var(--text-muted); margin-top:-0.6em; margin-bottom:1.2rem;">${Object.keys(ESTRATEGIAS_MEDIACION).length} formas de dar la clase, con los pasos para ejecutarlas. Tocá "Ver pasos" y después "▶ Iniciar" para seguirlos en vivo durante la clase — al terminar, se guarda que la usaste (fecha, sección y pasos hechos).</p>
      ${bloques}
      <div id="mediacion-historial" style="margin-top:1.5rem;"></div>
    </div>`;
  bindTopbar();

  const contenedorLista = app.querySelector(".wrap");
  if (contenedorLista) {
    contenedorLista.addEventListener("click", (ev) => {
      const toggleBtn = ev.target.closest("[data-toggle-mediacion]");
      if (toggleBtn) {
        const clave = toggleBtn.getAttribute("data-toggle-mediacion");
        const preset = ESTRATEGIAS_MEDIACION[clave];
        const cont = contenedorLista.querySelector(`[data-mediacion-contenedor="${clave}"]`);
        if (!preset || !cont) return;
        const abierto = cont.style.display !== "none";
        if (abierto) {
          cont.style.display = "none";
          toggleBtn.textContent = "Ver pasos →";
        } else {
          if (!cont.innerHTML.trim()) {
            cont.innerHTML = `
              <ol style="margin:0 0 0.8rem; padding-left:1.2rem; display:grid; gap:0.3rem;">
                ${preset.pasos.map(p => `<li style="font-size:0.85rem;">${p}</li>`).join("")}
              </ol>
              <button type="button" class="btn" data-iniciar-mediacion="${clave}">▶ Iniciar</button>`;
          }
          cont.style.display = "block";
          toggleBtn.textContent = "Ocultar pasos ↑";
        }
        return;
      }
      const iniciarBtn = ev.target.closest("[data-iniciar-mediacion]");
      if (iniciarBtn) {
        const clave = iniciarBtn.getAttribute("data-iniciar-mediacion");
        const preset = ESTRATEGIAS_MEDIACION[clave];
        if (!preset) return;
        if (preset.motor === "pizarra_rapida") {
          const presetEvaluacion = ESTRATEGIAS_EVALUACION[preset.estrategiaEvaluacionClave];
          if (presetEvaluacion) abrirModalPizarraRapida({ ...presetEvaluacion, clave: preset.estrategiaEvaluacionClave });
        } else {
          abrirModalGuiaPasos({ ...preset, clave });
        }
      }
    });
  }

  pintarHistorialMediacion();
}

async function pintarHistorialMediacion() {
  const cont = document.getElementById("mediacion-historial");
  if (!cont) return;
  const { data: registros } = await sb.from("mediacion_registros").select("*").order("creado_en", { ascending: false }).limit(15);
  if (!registros || registros.length === 0) { cont.innerHTML = ""; return; }
  cont.innerHTML = `
    <h3 style="margin-bottom:0.5rem;">Historial reciente</h3>
    <div style="display:grid; gap:0.3rem;">
      ${registros.map(r => `
        <div style="display:flex; justify-content:space-between; gap:0.6rem; flex-wrap:wrap; font-size:0.82rem; padding:0.4rem 0.6rem; background:var(--surface-soft); border-radius:6px;">
          <span><strong>${r.etiqueta}</strong>${r.tema ? " — " + r.tema : ""} · Sección ${r.seccion}</span>
          <span style="color:var(--text-muted);">${formatearFechaHora(r.creado_en)} · ${r.pasos_completados}/${r.pasos_totales} pasos</span>
        </div>`).join("")}
    </div>`;
}

// Guía paso a paso para una estrategia de mediación: el profesor elige
// sección (y opcionalmente el tema), va marcando los pasos durante la
// clase, y al guardar queda un registro simple en mediacion_registros
// (no califica a nadie, es solo evidencia de que se usó la estrategia).
async function abrirModalGuiaPasos(preset) {
  const overlay = document.createElement("div");
  overlay.id = "mediacion-guia-overlay";
  overlay.style.cssText = "position:fixed; inset:0; background:rgba(8,11,20,0.78); z-index:9999; display:flex; align-items:center; justify-content:center; padding:1rem;";
  document.body.appendChild(overlay);

  function cerrar() { overlay.remove(); }
  overlay.addEventListener("click", (e) => { if (e.target === overlay) cerrar(); });

  const { data: estudiantesTodos } = await sb.from("estudiantes").select("seccion");
  const secciones = [...new Set((estudiantesTodos || []).map(e => e.seccion))].filter(Boolean).sort();
  const panelStyle = "max-width:520px; width:100%; max-height:90vh; overflow:auto; background:var(--paper); border:1px solid var(--glass-border); border-radius:var(--radius); padding:1.2rem; box-shadow:var(--shadow-sm);";

  function pintarFormulario() {
    overlay.innerHTML = `
      <div class="panel" style="${panelStyle}">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.6rem;">
          <h3 style="margin:0;">${preset.icono} ${preset.etiqueta}</h3>
          <button type="button" class="link-btn" data-guia-cerrar aria-label="Cerrar">✕</button>
        </div>
        <p style="font-size:0.82rem; color:var(--text-muted); margin-top:0; margin-bottom:0.8rem;">${preset.descripcion}</p>
        <form id="guia-pasos-form">
          <label style="display:block; font-size:0.85rem; margin-bottom:0.3rem;">Sección
            <select name="seccion" required style="display:block; width:100%; margin-top:0.3rem; padding:0.5rem 0.6rem; border:1px solid var(--paper-line); border-radius:var(--radius); font-family:var(--sans);">
              <option value="" disabled selected>Elegí una sección…</option>
              ${secciones.map(s => `<option value="${s}">${s}</option>`).join("")}
            </select>
          </label>
          <label style="display:block; font-size:0.85rem; margin:0.7rem 0 0.3rem;">Tema de la clase (opcional)
            <input name="tema" maxlength="120" placeholder="Ej: Planillas y cargas sociales" style="display:block; width:100%; margin-top:0.3rem; padding:0.5rem 0.6rem; border:1px solid var(--paper-line); border-radius:var(--radius); font-family:var(--sans);" />
          </label>
          <div style="display:flex; justify-content:flex-end; gap:0.5rem; margin-top:1rem;">
            <button type="button" class="btn secondary small" data-guia-cerrar>Cancelar</button>
            <button type="submit" class="btn small">▶ Comenzar</button>
          </div>
        </form>
      </div>`;
    overlay.querySelectorAll("[data-guia-cerrar]").forEach(b => b.addEventListener("click", cerrar));
    overlay.querySelector("#guia-pasos-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      pintarChecklist(f.get("seccion"), (f.get("tema") || "").trim());
    });
  }

  function pintarChecklist(seccion, tema) {
    const hechos = new Set();
    function actualizarProgreso() {
      const contador = overlay.querySelector("[data-guia-progreso]");
      if (contador) contador.textContent = `${hechos.size}/${preset.pasos.length} pasos completados`;
    }
    overlay.innerHTML = `
      <div class="panel" style="${panelStyle}">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.3rem;">
          <h3 style="margin:0;">${preset.icono} ${preset.etiqueta}</h3>
          <button type="button" class="link-btn" data-guia-cerrar aria-label="Cerrar">✕</button>
        </div>
        <p style="font-size:0.78rem; color:var(--text-muted); margin:0 0 0.6rem;">Sección ${seccion}${tema ? " · " + tema : ""} — marcá cada paso según lo vas haciendo en clase.</p>
        <div style="display:grid; gap:0.4rem; margin-bottom:0.8rem;">
          ${preset.pasos.map((p, i) => `
            <label style="display:flex; align-items:flex-start; gap:0.5rem; font-size:0.85rem; padding:0.4rem 0.5rem; background:var(--surface-soft); border-radius:6px; cursor:pointer;">
              <input type="checkbox" data-guia-paso="${i}" style="margin-top:0.2rem;" />
              <span>${p}</span>
            </label>`).join("")}
        </div>
        <p data-guia-progreso style="font-size:0.78rem; color:var(--text-muted); margin:0 0 0.8rem;">0/${preset.pasos.length} pasos completados</p>
        <div style="display:flex; justify-content:flex-end; gap:0.5rem;">
          <button type="button" class="btn secondary small" data-guia-cerrar>Cancelar sin guardar</button>
          <button type="button" class="btn small" data-guia-guardar>💾 Guardar y finalizar</button>
        </div>
      </div>`;
    overlay.querySelectorAll("[data-guia-cerrar]").forEach(b => b.addEventListener("click", cerrar));
    overlay.querySelectorAll("[data-guia-paso]").forEach(chk => {
      chk.addEventListener("change", () => {
        const i = chk.getAttribute("data-guia-paso");
        if (chk.checked) hechos.add(i); else hechos.delete(i);
        actualizarProgreso();
      });
    });
    overlay.querySelector("[data-guia-guardar]").addEventListener("click", async (ev) => {
      const btn = ev.target;
      btn.disabled = true;
      btn.textContent = "Guardando…";
      const { error } = await sb.from("mediacion_registros").insert({
        estrategia_clave: preset.clave,
        etiqueta: preset.etiqueta,
        seccion,
        tema: tema || null,
        pasos_totales: preset.pasos.length,
        pasos_completados: hechos.size
      });
      if (error) {
        alert("No se pudo guardar: " + error.message);
        btn.disabled = false;
        btn.textContent = "💾 Guardar y finalizar";
        return;
      }
      cerrar();
      pintarHistorialMediacion();
    });
  }

  pintarFormulario();
}

function renderDemoEstrategia(clave, esEstudiante) {
  const preset = ESTRATEGIAS_EVALUACION[clave];
  if (!preset) { location.hash = "#/estrategias"; return; }
  const volver = `#/estrategias`;

  app.innerHTML = `
    ${topbar()}
    <div class="wrap">
      <a href="${volver}" class="btn secondary small" style="margin-bottom:1rem; display:inline-block;">&larr; Estrategias de evaluación</a>
      <h1>${preset.icono} ${preset.etiqueta}</h1>
      ${construirDemoEstrategiaContenidoHTML({ ...preset, clave }, esEstudiante)}
    </div>`;
  bindTopbar();
  const iniciarBtn = document.querySelector("[data-iniciar-estrategia]");
  if (iniciarBtn) {
    iniciarBtn.addEventListener("click", () => {
      sessionStorage.setItem("ctp_lms_estrategia_pendiente", clave);
      location.hash = "#/materias";
    });
  }
  const iniciarPizarraBtn = document.querySelector("[data-iniciar-pizarra-rapida]");
  if (iniciarPizarraBtn) {
    iniciarPizarraBtn.addEventListener("click", () => abrirModalPizarraRapida({ ...preset, clave }));
  }
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
        ${s.pin ? `<span class="badge" style="font-family:monospace;">🔐 ${s.pin}</span>` : `<span class="badge" style="background:var(--danger-bg); color:var(--danger-text);">Sin PIN</span>`}
        ${s.clave_prueba ? `<span class="badge" style="font-family:monospace;">🎫 ${s.clave_prueba}</span>` : `<span class="badge" style="background:var(--danger-bg); color:var(--danger-text);">Sin clave de prueba</span>`}
      </span>
    </a>`).join("");

  app.innerHTML = `
    ${topbar()}
    <div class="wrap">
      <a href="#/" class="btn secondary small" style="margin-bottom:1rem; display:inline-block;">&larr; Secciones</a>
      <h1>Sección ${sec}</h1>
      <p style="color:var(--text-muted); margin-top:-0.6em;">${(students || []).length} estudiantes · ${INSTITUCION.especialidad}</p>
      <div class="row" style="margin:0.6rem 0;">
        <button class="btn secondary small" id="generar-pines-btn" type="button">🔐 Generar PIN a los que no tienen</button>
        <span id="generar-pines-estado" style="font-size:0.78rem; color:var(--text-muted);"></span>
      </div>
      <div class="row" style="margin:0.6rem 0;">
        <button class="btn secondary small" id="generar-claves-prueba-btn" type="button">🎫 Generar clave de prueba a los que no tienen</button>
        <span id="generar-claves-prueba-estado" style="font-size:0.78rem; color:var(--text-muted);"></span>
      </div>
      <div class="row" style="margin:0.6rem 0;">
        <button class="btn secondary small" id="generar-aula-conta-btn" type="button">🧮 Generar usuario/clave de Aula de Conta a los que no tienen</button>
        <span id="generar-aula-conta-estado" style="font-size:0.78rem; color:var(--text-muted);"></span>
      </div>
      <div class="row" style="margin:0.6rem 0;">
        <button class="btn secondary small" id="informe-aula-conta-btn" type="button">📈 Informe de notas de Aula de Conta (Excel / PDF)</button>
      </div>
      <div id="informe-aula-conta-panel"></div>
      <div class="roster">${rows || '<p class="empty">No hay estudiantes registrados en esta sección.</p>'}</div>

      <details class="group-promo" open>
        <summary>Asignaciones de la sección (trabajo cotidiano, tareas, proyectos, pruebas…)</summary>
        <p style="font-size:0.82rem; color:var(--text-muted); margin-top:0.6rem;">
          Crea una asignación una sola vez y se registra automáticamente para los ${(students || []).length} estudiantes de la sección.
        </p>
        <div id="asignaciones-seccion">Cargando…</div>
      </details>

      ${esSeccion113(sec) ? `
      <details class="group-promo" id="infografias-seccion-details">
        <summary>🖼️ Infografías entregadas por la sección</summary>
        <div id="infografias-seccion" style="margin-top:0.6rem;">Abrí este apartado para cargar las infografías.</div>
      </details>` : ""}

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

  const infografiasDetails = document.getElementById("infografias-seccion-details");
  if (infografiasDetails) infografiasDetails.addEventListener("toggle", () => {
    if (infografiasDetails.open) pintarInfografiasSeccion(document.getElementById("infografias-seccion"), students || []);
  });

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

  const generarPinesBtn = document.getElementById("generar-pines-btn");
  if (generarPinesBtn) generarPinesBtn.addEventListener("click", async () => {
    const estado = document.getElementById("generar-pines-estado");
    const sinPin = (students || []).filter(st => !st.pin);
    if (sinPin.length === 0) { estado.textContent = "Todos los estudiantes de esta sección ya tienen PIN."; return; }
    generarPinesBtn.disabled = true;
    estado.textContent = "Generando…";
    for (const st of sinPin) {
      const nuevoPin = generarPinAleatorio();
      await sb.from("estudiantes").update({ pin: nuevoPin }).eq("id", st.id);
      st.pin = nuevoPin;
    }
    estado.textContent = `Listo — se generó PIN para ${sinPin.length} estudiante(s). Entra al perfil de cada uno (pestaña "PIN de acceso") para verlo y comunicárselo.`;
    renderSeccion(sec);
  });

  const generarClavesPruebaBtn = document.getElementById("generar-claves-prueba-btn");
  if (generarClavesPruebaBtn) generarClavesPruebaBtn.addEventListener("click", async () => {
    const estado = document.getElementById("generar-claves-prueba-estado");
    const sinClave = (students || []).filter(st => !st.clave_prueba);
    if (sinClave.length === 0) { estado.textContent = "Todos los estudiantes de esta sección ya tienen clave de prueba."; return; }
    generarClavesPruebaBtn.disabled = true;
    estado.textContent = "Generando…";
    for (const st of sinClave) {
      const nuevaClave = generarClavePruebaAleatoria();
      await sb.from("estudiantes").update({ clave_prueba: nuevaClave }).eq("id", st.id);
      st.clave_prueba = nuevaClave;
    }
    estado.textContent = `Listo — se generó clave de prueba para ${sinClave.length} estudiante(s). Entra al perfil de cada uno (pestaña "Clave de prueba") para verla y comunicársela.`;
    renderSeccion(sec);
  });

  const informeAcBtn = document.getElementById("informe-aula-conta-btn");
  if (informeAcBtn) informeAcBtn.addEventListener("click", () => abrirInformeSeccionAulaConta(sec, students, document.getElementById("informe-aula-conta-panel")));

  const generarAulaContaBtn = document.getElementById("generar-aula-conta-btn");
  if (generarAulaContaBtn) generarAulaContaBtn.addEventListener("click", async () => {
    const estado = document.getElementById("generar-aula-conta-estado");
    const sinUsuario = (students || []).filter(st => !st.usuario_aula_contable);
    if (sinUsuario.length === 0) { estado.textContent = "Todos los estudiantes de esta sección ya tienen usuario de Aula de Conta."; return; }
    generarAulaContaBtn.disabled = true;
    estado.textContent = "Generando…";
    for (const st of sinUsuario) {
      const usuario = generarUsuarioAulaContable(st);
      const clave = generarClaveAulaContableAleatoria();
      await sb.from("estudiantes").update({ usuario_aula_contable: usuario, clave_aula_contable: clave }).eq("id", st.id);
      st.usuario_aula_contable = usuario;
      st.clave_aula_contable = clave;
    }
    estado.textContent = `Listo — se generó usuario y clave de Aula de Conta para ${sinUsuario.length} estudiante(s). Entra al perfil de cada uno (pestaña "Aula de Conta") para verlos y comunicárselos.`;
    renderSeccion(sec);
  });

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
      let aporteDirecto = null; // ya viene ponderado (0-c.porcentaje)
      if (c.nombre.trim().toLowerCase() === "asistencia") {
        for (const mid of materiaIds) {
          const r = await calcularNotaAsistencia(st.id, mid);
          if (r) { prom = r.nota; break; }
        }
      } else if (c.nombre.trim().toLowerCase() === "pruebas") {
        // Cada prueba puede valer un % distinto de la nota final (lo que
        // el profesor puso en "Calificar por puntos"), así que no se usa
        // el % de la categoría — se suma el aporte propio de cada prueba.
        for (const mid of materiaIds) {
          const a = await calcularAportePruebas(st.id, mid, c.nombre, c.porcentaje);
          if (a !== null) { aporteDirecto = a.aporte; break; }
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
      // Todas las columnas de categoría (incluida Asistencia) muestran los
      // puntos que el estudiante ya ganó del máximo que esa categoría
      // aporta a la nota final de 100 (ej. Pruebas: 6.1 de un máximo de
      // 45; Asistencia: 4.98 de un máximo de 5) — no el % real que sacó
      // en esa categoría.
      if (aporteDirecto !== null) {
        suma += aporteDirecto;
        pesoUsado += Number(c.porcentaje);
        const limite = Number(c.porcentaje) * 0.7;
        celdas.push(`<td class="num ${aporteDirecto < limite ? "low" : ""}">${aporteDirecto.toFixed(1)}%</td>`);
        continue;
      }
      if (prom === null) { celdas.push(`<td class="num">—</td>`); continue; }
      const aporte = prom * (c.porcentaje / 100);
      suma += aporte;
      pesoUsado += Number(c.porcentaje);
      const limite = Number(c.porcentaje) * 0.7;
      celdas.push(`<td class="num ${aporte < limite ? "low" : ""}">${aporte.toFixed(1)}%</td>`);
    }
    const final = pesoUsado > 0 ? `${suma.toFixed(1)}%` : "—";
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
// Supabase devuelve como máximo 1000 filas por consulta: esto pide de 1000
// en 1000 hasta traerlas todas (para contar bien las lecciones impartidas).
async function traerTodasLasFilas(armarConsulta) {
  const todas = [];
  for (let desde = 0; desde < 200000; desde += 1000) {
    const { data, error } = await armarConsulta().range(desde, desde + 999);
    if (error || !data) break;
    todas.push(...data);
    if (data.length < 1000) break;
  }
  return todas;
}
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

  // Dos consultas separadas: el total de lecciones impartidas (de todos
  // los estudiantes de la materia, para contar combinaciones distintas
  // de lección+fecha) y las del estudiante puntual, filtradas en el
  // servidor. Si se trae todo junto y se filtra en el navegador, con
  // varias secciones eso fácilmente pasa de las 1000 filas que Supabase
  // devuelve por consulta, y los registros de algunos estudiantes
  // quedaban fuera del corte (dando 0 ausencias = 100% de nota).
  const todosRegistros = await traerTodasLasFilas(() => sb.from("asistencia_lecciones").select("leccion_id, fecha").in("leccion_id", leccionIds).order("id"));
  if (!todosRegistros || todosRegistros.length === 0) return null;
  const { data: delEstudiante } = await sb.from("asistencia_lecciones").select("estado").eq("estudiante_id", estudianteId).in("leccion_id", leccionIds);

  const impartidas = new Set(todosRegistros.map(r => `${r.leccion_id}-${r.fecha}`)).size;
  const ausenciasComputadas = (delEstudiante || []).reduce((acc, r) => acc + pesoAusencia(r.estado), 0);

  if (impartidas === 0) return null;
  const nota = Math.max(0, (1 - ausenciasComputadas / impartidas) * 100);
  return { nota, impartidas, ausenciasComputadas };
}

// Igual que calcularNotaAsistencia, pero limitado a un rango de fechas (un período),
// y devuelve el desglose completo (presentes, justificadas, tardías, etc.) y el
// detalle de cada falta/tardía, para el Reporte oficial.
async function calcularNotaAsistenciaPeriodo(estudianteId, materiaId, fechaInicio, fechaFin) {
  const { data: lecciones } = await sb.from("lecciones").select("id, numero, dia_semana, hora_inicio").eq("materia_id", materiaId);
  const leccionIds = (lecciones || []).map(l => l.id);
  const leccionPorId = {};
  (lecciones || []).forEach(l => { leccionPorId[l.id] = l; });
  if (leccionIds.length === 0) return null;

  // Igual que en calcularNotaAsistencia: dos consultas separadas para no
  // perder registros del estudiante si la materia completa pasa de las
  // 1000 filas que Supabase devuelve por consulta.
  const todosRegistros = await traerTodasLasFilas(() => sb.from("asistencia_lecciones").select("leccion_id, fecha")
    .in("leccion_id", leccionIds).gte("fecha", fechaInicio).lte("fecha", fechaFin).order("id"));
  if (!todosRegistros || todosRegistros.length === 0) return null;
  const { data: delEstudianteRaw } = await sb.from("asistencia_lecciones").select("leccion_id, fecha, estado")
    .eq("estudiante_id", estudianteId).in("leccion_id", leccionIds).gte("fecha", fechaInicio).lte("fecha", fechaFin);
  const delEstudiante = delEstudianteRaw || [];

  const impartidas = new Set(todosRegistros.map(r => `${r.leccion_id}-${r.fecha}`)).size;

  const justificadas = delEstudiante.filter(r => r.estado === "ausente_justificada" || r.estado === "tardia_justificada").length;
  const tardias = delEstudiante.filter(r => r.estado === "tardia_leve" || r.estado === "tardia_grave");
  const ausentesInjustificadas = delEstudiante.filter(r => r.estado === "ausente_injustificada").length;
  const porConversionTardias = tardias.reduce((a, r) => a + pesoAusencia(r.estado), 0);
  const totalInjustificadas = ausentesInjustificadas + porConversionTardias;
  const presentes = Math.max(0, impartidas - justificadas - totalInjustificadas);

  const nota = Math.max(0, (1 - totalInjustificadas / impartidas) * 100);

  const detalleFaltas = delEstudiante
    .filter(r => r.estado !== "presente")
    .sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""))
    .map(r => ({
      fecha: r.fecha,
      leccion: leccionPorId[r.leccion_id]?.numero || "",
      estado: ESTADOS_ASISTENCIA.find(e => e.v === r.estado)?.l || r.estado
    }));

  return { nota, impartidas, presentes, justificadas, tardias: tardias.length, porConversionTardias, ausentesInjustificadas, totalInjustificadas, detalleFaltas };
}

// Calcula la nota (0-100) de un estudiante en una categoría de una materia,
// a partir de los Indicadores y Criterios de evaluación (si existen).
async function calcularNotaIndicadores(estudianteId, materiaId, categoriaNombre, soloHabilitados) {
  const { data: indicadoresTodos } = await sb.from("indicadores").select("*").eq("materia_id", materiaId).eq("categoria", categoriaNombre).order("orden");
  let indicadores = indicadoresTodos || [];

  // Para el estudiante viendo su propia nota (soloHabilitados = true), un
  // indicador que viene de una prueba todavía no habilitada no debe
  // aparecer ni contar — el profesor la está preparando y no la ha
  // soltado. Un indicador que NO viene de un trabajo (se creó a mano) no
  // se toca, siempre se muestra igual que antes.
  if (soloHabilitados && indicadores.length > 0) {
    const idsConPosibleTrabajo = indicadores.map(i => i.id);
    const { data: trabajosVinculados } = await sb.from("trabajos_cotidianos").select("indicador_id, habilitado").in("indicador_id", idsConPosibleTrabajo);
    const habilitadoPorIndicador = {};
    (trabajosVinculados || []).forEach(t => { habilitadoPorIndicador[t.indicador_id] = t.habilitado !== false; });
    indicadores = indicadores.filter(i => !(i.id in habilitadoPorIndicador) || habilitadoPorIndicador[i.id]);
  }

  if (indicadores.length === 0) return null;

  const indicadorIds = indicadores.map(i => i.id);
  const { data: calificaciones } = await sb.from("calificaciones_indicador").select("*").eq("estudiante_id", estudianteId).in("indicador_id", indicadorIds);
  const porIndicador = {};
  (calificaciones || []).forEach(c => { porIndicador[c.indicador_id] = c.puntaje_obtenido; });

  const sumaMaxima = indicadores.reduce((a, i) => a + Number(i.puntaje_maximo), 0);
  const sumaObtenida = indicadores.reduce((a, i) => a + Number(porIndicador[i.id] || 0), 0);
  const nota = sumaMaxima > 0 ? (sumaObtenida / sumaMaxima) * 100 : null;
  return { nota, indicadores, porIndicador, sumaObtenida, sumaMaxima };
}

// Para la categoría "Pruebas": cada prueba puede tener su propio peso
// hacia la nota final (lo que el profesor definió en "Calificar por
// puntos", guardado en indicadores.peso_prueba). Esta función suma el
// aporte de cada prueba en vez de promediar todas a la vez, para que
// el aporte nunca pueda pasarse del peso que esa prueba realmente vale.
// Si una prueba todavía no tiene peso_prueba guardado (nunca se le dio
// "Guardar" en ese panel), esa prueba simplemente no cuenta todavía —
// nunca se usa el % de toda la categoría como respaldo, porque eso
// inflaba el número por encima de lo que el estudiante realmente ganó.
async function calcularAportePruebas(estudianteId, materiaId, categoriaNombre, categoriaPorcentaje) {
  const { data: indicadoresTodos } = await sb.from("indicadores").select("*").eq("materia_id", materiaId).eq("categoria", categoriaNombre).order("orden");
  const indicadores = indicadoresTodos || [];
  if (indicadores.length === 0) return null;

  const indicadorIds = indicadores.map(i => i.id);
  const { data: calificaciones } = await sb.from("calificaciones_indicador").select("*").eq("estudiante_id", estudianteId).in("indicador_id", indicadorIds);
  const porIndicador = {};
  (calificaciones || []).forEach(c => { porIndicador[c.indicador_id] = c.puntaje_obtenido; });

  let aporte = 0, huboAlguno = false, sumaObtenida = 0, sumaMaxima = 0;
  indicadores.forEach(ind => {
    if (ind.peso_prueba === null || ind.peso_prueba === undefined) return; // todavía sin configurar, no cuenta
    const max = Number(ind.puntaje_maximo) || 0;
    if (max <= 0) return;
    const obtenido = Number(porIndicador[ind.id] || 0);
    aporte += (obtenido / max) * Number(ind.peso_prueba);
    sumaObtenida += obtenido;
    sumaMaxima += max;
    huboAlguno = true;
  });
  if (!huboAlguno) return null;
  // notaReal: el % realmente obtenido (puntos ganados sobre puntos
  // posibles en las pruebas que ya cuentan), para mostrar en pantalla.
  // aporte: lo mismo pero ya ponderado por el peso de cada prueba, para
  // sumarlo a la nota final.
  const notaReal = sumaMaxima > 0 ? (sumaObtenida / sumaMaxima) * 100 : null;
  return { aporte, notaReal };
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
      // Misma forma de clave que abajo (hora corta "07:00"): antes una lado
      // usaba "07:00:00" y el otro "07:00", nunca coincidían y al guardar se
      // borraban TODAS las lecciones (y con ellas toda la asistencia).
      const clave = `${sel.dataset.dia}-${horaCorta(sel.dataset.ini)}`;
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
    if (celdasVacias.length > 0) {
      // Nunca borrar en silencio una lección que ya tiene asistencia: al
      // borrarla se pierde toda la asistencia registrada en ella.
      const { data: conAsistencia } = await sb.from("asistencia_lecciones").select("leccion_id").in("leccion_id", celdasVacias.map(l => l.id));
      const idsConAsistencia = new Set((conAsistencia || []).map(r => r.leccion_id));
      let borrar = celdasVacias.filter(l => !idsConAsistencia.has(l.id));
      const protegidas = celdasVacias.filter(l => idsConAsistencia.has(l.id));
      if (protegidas.length && confirm(`Quitó del horario ${protegidas.length} lección(es) que ya tienen asistencia registrada. Si se borran, esa asistencia se pierde.\n\n¿Borrarlas de todos modos? (Cancelar = dejarlas para no perder la asistencia)`)) {
        borrar = celdasVacias;
      }
      if (borrar.length > 0) await sb.from("lecciones").delete().in("id", borrar.map(l => l.id));
    }
    btn.textContent = "Guardado ✓";
    setTimeout(() => { btn.textContent = "Guardar horario"; }, 1500);
  });
}

async function renderPeriodos() {
  app.innerHTML = `
    ${topbar()}
    <div class="wrap">
      <h1>Períodos</h1>
      <p style="color:var(--text-muted); margin-top:-0.6em;">Define las fechas de cada período (I, II, III). El sistema usa estas fechas para separar automáticamente los indicadores, las notas y la asistencia en el "Reporte oficial" de cada estudiante — por fecha, sin que tengas que etiquetar nada a mano.</p>
      <div id="periodos-lista" style="margin-top:1rem;">Cargando…</div>
      <form class="inline-form" id="periodo-form" style="margin-top:1rem;">
        <input name="nombre" placeholder="Nombre (ej. I Período)" required style="flex:1; min-width:10rem" />
        <input name="fecha_inicio" type="date" required />
        <input name="fecha_fin" type="date" required />
        <button class="btn small" type="submit">Agregar período</button>
      </form>
    </div>`;
  bindTopbar();

  async function cargar() {
    const { data: periodos } = await sb.from("periodos").select("*").order("orden").order("fecha_inicio");
    const holder = document.getElementById("periodos-lista");
    if (!holder) return;
    holder.innerHTML = `
      <div class="roster">
        ${(periodos || []).map(p => `
          <div class="roster-row">
            <span class="name">${p.nombre}</span>
            <span class="cedula">${p.fecha_inicio} → ${p.fecha_fin}</span>
            <button class="btn danger small" data-del-periodo="${p.id}">Eliminar</button>
          </div>`).join("") || '<p class="empty">Todavía no has definido períodos.</p>'}
      </div>`;
    holder.querySelectorAll("[data-del-periodo]").forEach(btn => {
      btn.addEventListener("click", async () => {
        await sb.from("periodos").delete().eq("id", btn.dataset.delPeriodo);
        cargar();
      });
    });
  }
  await cargar();

  document.getElementById("periodo-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const { data: existentes } = await sb.from("periodos").select("id");
    await sb.from("periodos").insert({
      nombre: f.get("nombre"),
      fecha_inicio: f.get("fecha_inicio"),
      fecha_fin: f.get("fecha_fin"),
      orden: (existentes || []).length + 1
    });
    e.target.reset();
    cargar();
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

// --- Logros / progreso del estudiante (gamificación) ---
// Se calcula en el momento a partir de lo que ya existe en la base de datos
// (no necesita tablas nuevas): actividades interactivas completadas,
// entregas de proyecto, y el promedio de los indicadores ya calificados.
const DEFINICION_LOGROS = [
  { id: "primeros-pasos", icono: "🎯", nombre: "Primeros pasos", cumple: (m) => m.actividadesCompletadas + m.entregasProyecto >= 1 },
  { id: "racha-5", icono: "🔥", nombre: "Racha de 5", cumple: (m) => m.actividadesCompletadas + m.entregasProyecto >= 5 },
  { id: "imparable", icono: "📚", nombre: "Imparable", cumple: (m) => m.actividadesCompletadas + m.entregasProyecto >= 15 },
  { id: "nota-perfecta", icono: "🏆", nombre: "Nota perfecta", cumple: (m) => m.algunaNotaPerfecta },
  { id: "mente-brillante", icono: "🧠", nombre: "Mente brillante", cumple: (m) => m.indicadoresCalificados >= 3 && m.promedioIndicadores >= 90 }
];

function formatearPuntos(n) {
  const num = Number(n) || 0;
  return Number.isInteger(num) ? String(num) : num.toFixed(1);
}

async function calcularMetricasLogros(estudianteId) {
  const [{ count: actividadesCompletadas }, { data: actividades }, { count: entregasProyecto }, { data: calificaciones }] = await Promise.all([
    sb.from("actividades_estudiante").select("id", { count: "exact", head: true }).eq("estudiante_id", estudianteId).eq("completado", true),
    sb.from("actividades_estudiante").select("porcentaje").eq("estudiante_id", estudianteId).eq("completado", true),
    sb.from("proyecto_entregas").select("id", { count: "exact", head: true }).eq("estudiante_id", estudianteId),
    sb.from("calificaciones_indicador").select("indicador_id, puntaje_obtenido").eq("estudiante_id", estudianteId).not("puntaje_obtenido", "is", null)
  ]);
  const algunaNotaPerfecta = (actividades || []).some(a => Number(a.porcentaje) >= 100);
  let filasIndicadores = [];
  if (calificaciones && calificaciones.length) {
    const { data: indicadoresInfo } = await sb.from("indicadores").select("id, puntaje_maximo").in("id", calificaciones.map(c => c.indicador_id));
    const maximoPorIndicador = {};
    (indicadoresInfo || []).forEach(i => { maximoPorIndicador[i.id] = i.puntaje_maximo; });
    filasIndicadores = calificaciones
      .map(c => ({ obtenido: c.puntaje_obtenido, maximo: maximoPorIndicador[c.indicador_id] }))
      .filter(f => f.maximo);
  }
  const indicadoresCalificados = filasIndicadores.length;
  const promedioIndicadores = indicadoresCalificados
    ? (filasIndicadores.reduce((acc, f) => acc + (f.obtenido / f.maximo) * 100, 0) / indicadoresCalificados)
    : 0;
  // Puntos reales (no promedio de %): cuánto ha ganado el estudiante de
  // todo lo que ha podido ganar en los trabajos ya calificados.
  const totalPuntosGanados = filasIndicadores.reduce((acc, f) => acc + Number(f.obtenido || 0), 0);
  const totalPuntosPosibles = filasIndicadores.reduce((acc, f) => acc + Number(f.maximo || 0), 0);
  return {
    actividadesCompletadas: actividadesCompletadas || 0,
    entregasProyecto: entregasProyecto || 0,
    algunaNotaPerfecta,
    indicadoresCalificados,
    promedioIndicadores,
    totalPuntosGanados,
    totalPuntosPosibles
  };
}

// Banner de "pizarra rápida" activa para la sección del estudiante (ver
// abrirModalPizarraRapida más arriba). No depende de ninguna materia ni
// subtema — se liga solo por sección.
async function pintarBannerPizarraRapida(s, soloLectura) {
  const cont = document.getElementById("pizarra-rapida-banner");
  if (!cont) return;
  const { data: activas } = await sb.from("pizarras_rapidas").select("*").eq("seccion", s.seccion).eq("activa", true).order("creado_en", { ascending: false }).limit(1);
  const pizarra = (activas || [])[0];
  if (!pizarra) { cont.innerHTML = ""; return; }

  const { data: ideas } = await sb.from("pizarra_rapida_ideas").select("*").eq("pizarra_id", pizarra.id).order("creado_en");
  const listaIdeas = ideas || [];
  const autoresIds = [...new Set(listaIdeas.map(i => i.estudiante_id))];
  const { data: autoresInfo } = autoresIds.length
    ? await sb.from("estudiantes").select("id, nombre, apellido1").in("id", autoresIds)
    : { data: [] };
  const nombrePorId = {};
  (autoresInfo || []).forEach(e => { nombrePorId[e.id] = `${e.nombre} ${e.apellido1}`; });
  const participantes = new Set(listaIdeas.map(i => i.estudiante_id)).size;

  cont.innerHTML = `
    <div class="panel" style="border-left:4px solid var(--ledger-green); margin-bottom:1rem;">
      <strong style="font-family:var(--serif);">💡 Pizarra en vivo: ${pizarra.titulo}</strong>
      <p style="font-size:0.78rem; color:var(--text-muted); margin:0.3rem 0 0.6rem;">Tu profesor la abrió para esta clase${soloLectura ? " (vista previa — acá no se envía nada de verdad)" : " — escribí tu idea"}.</p>
      ${soloLectura ? "" : `
      <div style="display:flex; gap:0.5rem; width:100%; flex-wrap:wrap;">
        <input type="text" id="pr-idea-input" placeholder="Escribí tu idea…" maxlength="300" style="flex:1; min-width:12rem; padding:0.5rem 0.6rem; border:1px solid var(--paper-line); border-radius:var(--radius); font-family:var(--sans); font-size:0.85rem;" />
        <button class="btn small" id="pr-idea-enviar">Enviar idea</button>
        <button class="btn secondary small" id="pr-idea-refrescar">🔄 Actualizar</button>
      </div>
      <span id="pr-idea-estado" style="font-size:0.78rem; color:var(--text-muted);"></span>`}
      <div style="width:100%; margin-top:0.5rem;">
        <p style="font-size:0.76rem; color:var(--text-muted); margin:0 0 0.4rem;">🗒️ ${participantes} compañero${participantes === 1 ? "" : "s"} participando · ${listaIdeas.length} idea${listaIdeas.length === 1 ? "" : "s"}</p>
        ${listaIdeas.length ? `<div style="display:grid; gap:0.3rem;">
          ${listaIdeas.map(idea => {
            const esMia = String(idea.estudiante_id) === String(s.id);
            return `<div style="font-size:0.82rem; padding:0.35rem 0.5rem; border-left:3px solid #bbb; background:${esMia ? "var(--warn-bg)" : "var(--surface-soft)"};">
              <strong>${nombrePorId[idea.estudiante_id] || "Compañero"}${esMia ? " (vos)" : ""}:</strong> ${idea.texto}
            </div>`;
          }).join("")}
        </div>` : `<p class="empty" style="font-size:0.8rem;">Todavía nadie ha escrito una idea — ¡sé el primero!</p>`}
      </div>
    </div>`;

  if (soloLectura) return;
  const input = document.getElementById("pr-idea-input");
  const enviarBtn = document.getElementById("pr-idea-enviar");
  const estado = document.getElementById("pr-idea-estado");
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); enviarBtn.click(); } });
  enviarBtn.addEventListener("click", async () => {
    const texto = (input.value || "").trim();
    if (!texto) return;
    enviarBtn.disabled = true;
    enviarBtn.textContent = "Enviando…";
    const { error } = await sb.from("pizarra_rapida_ideas").insert({ pizarra_id: pizarra.id, estudiante_id: s.id, texto });
    enviarBtn.disabled = false;
    enviarBtn.textContent = "Enviar idea";
    if (error) { estado.textContent = "No se pudo enviar: " + error.message; return; }
    input.value = "";
    pintarBannerPizarraRapida(s, soloLectura);
  });
  document.getElementById("pr-idea-refrescar").addEventListener("click", () => pintarBannerPizarraRapida(s, soloLectura));
}

async function pintarPanelLogros(estudianteId) {
  const panel = document.getElementById("logros-panel");
  if (!panel) return;
  panel.innerHTML = `<p style="font-size:0.82rem; color:var(--text-muted);">Cargando logros…</p>`;
  let metricas;
  try {
    metricas = await calcularMetricasLogros(estudianteId);
  } catch (e) {
    panel.innerHTML = "";
    return;
  }
  const pct = Math.round(metricas.promedioIndicadores);
  const pctPuntos = metricas.totalPuntosPosibles > 0 ? Math.round((metricas.totalPuntosGanados / metricas.totalPuntosPosibles) * 100) : 0;
  panel.innerHTML = `
    <div class="xp-progress">
      <div class="xp-label"><span>Desempeño general ${metricas.indicadoresCalificados ? `(${metricas.indicadoresCalificados} indicador${metricas.indicadoresCalificados === 1 ? "" : "es"} calificado${metricas.indicadoresCalificados === 1 ? "" : "s"})` : "(sin indicadores calificados todavía)"}</span><span>${pct}%</span></div>
      <div class="xp-progress-track"><div class="xp-progress-fill" style="width:${pct}%;"></div></div>
    </div>
    ${metricas.totalPuntosPosibles > 0 ? `
    <div class="xp-progress" style="margin-top:0.7rem;">
      <div class="xp-label"><span>Puntos ganados en los trabajos realizados</span><span>${formatearPuntos(metricas.totalPuntosGanados)} de ${formatearPuntos(metricas.totalPuntosPosibles)}</span></div>
      <div class="xp-progress-track"><div class="xp-progress-fill" style="width:${pctPuntos}%;"></div></div>
    </div>` : ""}
    <div class="badges-row">
      ${DEFINICION_LOGROS.map(l => {
        const desbloqueado = l.cumple(metricas);
        return `<div class="badge-pill${desbloqueado ? " unlocked" : ""}" title="${l.nombre}${desbloqueado ? "" : " (todavía bloqueada)"}">
          <span class="badge-icon">${l.icono}</span><span>${l.nombre}</span>
        </div>`;
      }).join("")}
    </div>`;
}

// ¿La sección es 11-3? Tolera espacios, ceros o guiones distintos ("11-3 ", "11-03", "11–3").
function esSeccion113(seccion) {
  const n = String(seccion == null ? "" : seccion).replace(/[\s]+/g, "").replace(/[–—−]/g, "-").replace(/-0+(?=\d)/, "-");
  return n === "11-3";
}

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
        ${!isSelf && session.role === "docente" ? `
        <span style="display:flex; gap:0.5rem;">
          <button class="btn secondary small" id="generar-reporte-oficial-btn">Generar reporte oficial</button>
          <button class="btn secondary small" id="ver-como-estudiante">Ver como estudiante</button>
        </span>` : ""}
      </div>
      ${!isSelf ? `<div id="reporte-oficial-selector" style="display:none; margin-bottom:1.2rem;"></div>` : ""}

      ${isSelf ? `<div id="pizarra-rapida-banner"></div>` : ""}

      <div id="logros-panel" style="margin-bottom:1.3rem;"></div>

      ${isSelf ? `<div style="margin-bottom:0.8rem;"><a href="#/estrategias" class="btn secondary small">🧪 Cómo se evalúa cada tipo de trabajo</a></div>` : ""}
      <div class="tabs">
        <button class="tab-btn ${(activeTab === "notas" || activeTab === "tareas") ? "active" : ""}" data-tab="notas"><span class="tab-icon">📝</span><span class="tab-label">Notas y Tareas</span></button>
        <button class="tab-btn ${activeTab === "rubrica" ? "active" : ""}" data-tab="rubrica"><span class="tab-icon">📊</span><span class="tab-label">Rúbrica</span></button>
        <button class="tab-btn ${activeTab === "asistencia" ? "active" : ""}" data-tab="asistencia"><span class="tab-icon">🗓️</span><span class="tab-label">Asistencia</span></button>
        <button class="tab-btn ${activeTab === "materias-est" ? "active" : ""}" data-tab="materias-est"><span class="tab-icon">📚</span><span class="tab-label">Materias</span></button>
        ${esSeccion113(s.seccion) ? `<button class="tab-btn ${activeTab === "infografias" ? "active" : ""}" data-tab="infografias"><span class="tab-icon">🖼️</span><span class="tab-label">${isSelf ? "Mis infografías" : "Infografías"}</span></button>` : ""}
        ${isSelf ? `<button class="tab-btn ${activeTab === "aula-informe" ? "active" : ""}" data-tab="aula-informe"><span class="tab-icon">🧮</span><span class="tab-label">Aula de Conta</span></button>` : ""}
        ${!isSelf ? `<button class="tab-btn ${activeTab === "whatsapp" ? "active" : ""}" data-tab="whatsapp"><span class="tab-icon">💬</span><span class="tab-label">WhatsApp</span></button>
        <button class="tab-btn ${activeTab === "acceso" ? "active" : ""}" data-tab="acceso"><span class="tab-icon">🔑</span><span class="tab-label">Materias</span></button>
        <button class="tab-btn ${activeTab === "pin" ? "active" : ""}" data-tab="pin"><span class="tab-icon">🔐</span><span class="tab-label">PIN de acceso</span></button>
        <button class="tab-btn ${activeTab === "clave-prueba" ? "active" : ""}" data-tab="clave-prueba"><span class="tab-icon">🎫</span><span class="tab-label">Clave de prueba</span></button>
        <button class="tab-btn ${activeTab === "aula-conta" ? "active" : ""}" data-tab="aula-conta"><span class="tab-icon">🧮</span><span class="tab-label">Aula de Conta</span></button>` : ""}
      </div>

      <div id="tab-content">Cargando…</div>
    </div>`;
  bindTopbar();

  const verComoBtn = document.getElementById("ver-como-estudiante");
  if (verComoBtn) verComoBtn.addEventListener("click", () => { previewEstudianteId = s.id; renderPerfil(s.id, true); });
  const reporteBtn = document.getElementById("generar-reporte-oficial-btn");
  if (reporteBtn) reporteBtn.addEventListener("click", () => mostrarSelectorReporteOficial(s));
  const salirPreviewBtn = document.getElementById("salir-vista-previa");
  if (salirPreviewBtn) salirPreviewBtn.addEventListener("click", () => { previewEstudianteId = null; renderPerfil(s.id, false); });

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderTabContent(s, btn.dataset.tab, isSelf);
    });
  });

  pintarPanelLogros(s.id);
  if (isSelf) pintarBannerPizarraRapida(s, previewing);

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

async function mostrarSelectorReporteOficial(s) {
  const panel = document.getElementById("reporte-oficial-selector");
  if (!panel) return;
  if (panel.style.display === "block") { panel.style.display = "none"; return; }

  const { data: asignadas } = await sb.from("estudiante_materias").select("materia_id, materias(id, nombre)").eq("estudiante_id", s.id);
  const materias = (asignadas || []).map(a => a.materias).filter(Boolean);
  if (materias.length === 0) {
    panel.style.display = "block";
    panel.innerHTML = `<p class="no-phone-note">Este estudiante no tiene materias asignadas todavía.</p>`;
    return;
  }
  const { data: periodos } = await sb.from("periodos").select("*").order("orden").order("fecha_inicio");

  panel.style.display = "block";
  panel.innerHTML = `
    <div class="whatsapp-panel" style="max-width:520px;">
      <label for="reporte-materia-sel">Asignatura</label>
      <select id="reporte-materia-sel">
        ${materias.map(m => `<option value="${m.id}">${m.nombre}</option>`).join("")}
      </select>
      <div class="row"><button class="btn small" id="reporte-generar-btn">Generar</button></div>
      ${(periodos || []).length === 0 ? `<p class="no-phone-note">No has definido períodos todavía. Ve a "Períodos" en el menú para crear al menos uno (ej. "I Período", con sus fechas).</p>` : ""}
    </div>`;

  document.getElementById("reporte-generar-btn").addEventListener("click", async (e) => {
    if ((periodos || []).length === 0) { alert('Primero define al menos un período en "Períodos" (menú superior).'); return; }
    const btn = e.target;
    btn.textContent = "Generando…";
    const materiaId = Number(document.getElementById("reporte-materia-sel").value);
    await generarReporteOficial(s, materiaId, periodos);
    btn.textContent = "Generar";
  });
}

async function generarReporteOficial(estudiante, materiaId, periodos) {
  const { data: materia } = await sb.from("materias").select("*").eq("id", materiaId).maybeSingle();
  const { data: categorias } = await sb.from("rubrica_categorias").select("*").order("orden");

  function fmtPct(n) { return (Math.round(n * 10) / 10) + "%"; }

  async function bloqueCategoria(cat, fechaInicio, fechaFin) {
    // Indicadores (con fecha dentro del período)
    const { data: indicadoresTodos } = await sb.from("indicadores").select("*, criterios_indicador(*)").eq("materia_id", materiaId).eq("categoria", cat.nombre).order("orden");
    const indicadores = (indicadoresTodos || []).filter(i => i.fecha_evaluacion && i.fecha_evaluacion >= fechaInicio && i.fecha_evaluacion <= fechaFin);

    if (indicadores.length > 0) {
      const indicadorIds = indicadores.map(i => i.id);
      const { data: calificaciones } = await sb.from("calificaciones_indicador").select("*").eq("estudiante_id", estudiante.id).in("indicador_id", indicadorIds);
      const porIndicador = {};
      (calificaciones || []).forEach(c => { porIndicador[c.indicador_id] = c.puntaje_obtenido; });
      const sumaMax = indicadores.reduce((a, i) => a + Number(i.puntaje_maximo), 0);
      const sumaObt = indicadores.reduce((a, i) => a + Number(porIndicador[i.id] || 0), 0);
      const notaCat = sumaMax > 0 ? (sumaObt / sumaMax) * 100 : 0;
      const contribucion = notaCat * cat.porcentaje / 100;

      const html = `
        <div class="titulo-principal" style="font-size:1rem; text-align:left; padding:0.5rem 0.8rem;">Evaluación de ${cat.nombre}</div>
        <table>
          <thead><tr>${indicadores.map(i => `<th style="text-align:center;">${i.letra}</th>`).join("")}<th>Resultado de ${cat.nombre.toLowerCase()} (valor: ${cat.porcentaje}%)</th></tr></thead>
          <tbody><tr>${indicadores.map(i => `<td style="text-align:center;">${porIndicador[i.id] || 0}</td>`).join("")}<td style="text-align:center; font-weight:700;">${fmtPct(contribucion)}</td></tr></tbody>
        </table>
        <p style="font-weight:600; margin:0.8rem 0 0.3rem;">Indicadores evaluados y criterios de evaluación</p>
        <table>
          <thead><tr><th style="width:45%;">Indicador</th><th style="width:12%;">Puntaje máximo</th><th>Criterios</th></tr></thead>
          <tbody>
            ${indicadores.map(i => `<tr>
              <td><strong>${i.letra}:</strong> ${i.descripcion}<div style="font-size:0.75rem; color:#666;">Fecha${i.lecciones ? " y lecciones" : ""}: ${i.fecha_evaluacion}${i.lecciones ? " · " + i.lecciones + " lecciones" : ""}</div></td>
              <td style="text-align:center;">${i.puntaje_maximo} puntos</td>
              <td>${(i.criterios_indicador || []).length ? i.criterios_indicador.sort((a, b) => a.puntaje - b.puntaje).map(c => `${c.puntaje} punto${c.puntaje === 1 ? "" : "s"}: ${c.descripcion}`).join("<br/>") : "Sin criterios configurados."}</td>
            </tr>`).join("")}
          </tbody>
        </table>`;
      return { html, contribucion };
    }

    // Si no hay indicadores en el período, usa notas manuales con fecha de creación dentro del rango.
    const { data: notasTodas } = await sb.from("notas").select("*").eq("estudiante_id", estudiante.id).eq("materia_id", materiaId).eq("rubro", cat.nombre);
    const notas = (notasTodas || []).filter(n => n.creado_en && n.creado_en.slice(0, 10) >= fechaInicio && n.creado_en.slice(0, 10) <= fechaFin);
    if (notas.length === 0) return null;
    const promedio = notas.reduce((a, n) => a + Number(n.nota), 0) / notas.length;
    const contribucion = promedio * cat.porcentaje / 100;
    const html = `
      <div class="titulo-principal" style="font-size:1rem; text-align:left; padding:0.5rem 0.8rem;">${cat.nombre}</div>
      <table>
        <thead><tr>${notas.map((n, idx) => `<th>${cat.nombre} ${idx + 1}</th>`).join("")}<th>Resultado del componente</th></tr></thead>
        <tbody>
          <tr>${notas.map(n => `<td style="text-align:center;">${new Date(n.creado_en).toLocaleDateString("es-CR")}</td>`).join("")}<td rowspan="2" style="text-align:center; font-weight:700;">${fmtPct(contribucion)}</td></tr>
          <tr>${notas.map(n => `<td style="text-align:center;">Nota: ${n.nota}</td>`).join("")}</tr>
        </tbody>
      </table>
      <p style="font-size:0.8rem; color:#555;">Valor: ${cat.porcentaje}%</p>`;
    return { html, contribucion };
  }

  async function bloqueAsistencia(cat, fechaInicio, fechaFin) {
    const r = await calcularNotaAsistenciaPeriodo(estudiante.id, materiaId, fechaInicio, fechaFin);
    if (!r) return null;
    const contribucion = r.nota * cat.porcentaje / 100;
    const html = `
      <div class="titulo-principal" style="font-size:1rem; text-align:left; padding:0.5rem 0.8rem;">Asistencia</div>
      <p style="font-size:0.85rem;">Cantidad de lecciones registradas por el docente: ${r.impartidas}. Fechas: ${fechaInicio} al ${fechaFin}.</p>
      <table>
        <thead><tr><th>Lecciones presentes</th><th>Ausencias justificadas</th><th>Tardanzas</th><th>Ausencias injustificadas por conversión de tardanzas</th><th>Ausencias injustificadas</th><th>Total de ausencias injustificadas</th><th>Resultado de asistencia (${cat.porcentaje}%)</th></tr></thead>
        <tbody><tr>
          <td style="text-align:center;">${r.presentes}</td>
          <td style="text-align:center;">${r.justificadas}</td>
          <td style="text-align:center;">${r.tardias}</td>
          <td style="text-align:center;">${r.porConversionTardias.toFixed(1)}</td>
          <td style="text-align:center;">${r.ausentesInjustificadas}</td>
          <td style="text-align:center;">${r.totalInjustificadas.toFixed(1)}</td>
          <td style="text-align:center; font-weight:700;">${fmtPct(contribucion)}</td>
        </tr></tbody>
      </table>
      ${r.detalleFaltas.length > 0 ? `
      <p style="font-weight:600; margin:0.8rem 0 0.3rem;">Reporte de ausencias y tardanzas</p>
      <table>
        <thead><tr><th>Fecha</th><th>Lección</th><th>Estado</th></tr></thead>
        <tbody>${r.detalleFaltas.map(f => `<tr><td>${new Date(f.fecha).toLocaleDateString("es-CR", { day: "numeric", month: "long", year: "numeric" })}</td><td style="text-align:center;">${f.leccion}</td><td>${f.estado}</td></tr>`).join("")}</tbody>
      </table>` : ""}`;
    return { html, contribucion };
  }

  let periodosHtml = "";
  for (const p of periodos) {
    let bloques = "", resumenCols = "", resumenVals = "", totalPct = 0;
    for (const cat of (categorias || [])) {
      const esAsistencia = cat.nombre.trim().toLowerCase() === "asistencia";
      const resultado = esAsistencia ? await bloqueAsistencia(cat, p.fecha_inicio, p.fecha_fin) : await bloqueCategoria(cat, p.fecha_inicio, p.fecha_fin);
      resumenCols += `<th>${cat.nombre} (${cat.porcentaje}%)</th>`;
      if (resultado) {
        bloques += `<div style="margin-top:1.3rem;">${resultado.html}</div>`;
        resumenVals += `<td style="text-align:center;">${fmtPct(resultado.contribucion)}</td>`;
        totalPct += resultado.contribucion;
      } else {
        resumenVals += `<td style="text-align:center; color:#999;">—</td>`;
      }
    }
    if (!bloques) continue; // sin ningún dato en este período, lo omite
    periodosHtml += `
      <div style="page-break-before:always; margin-top:2rem; padding-top:1rem; border-top:3px double #16232e;">
        <h2 style="text-align:center; font-family:Georgia,serif;">${p.nombre}</h2>
        ${bloques}
        <p style="font-weight:600; margin:1.2rem 0 0.3rem; text-align:center;">Resumen de ${p.nombre}</p>
        <table>
          <thead><tr>${resumenCols}<th>Total (%)</th></tr></thead>
          <tbody><tr>${resumenVals}<td style="text-align:center; font-weight:700;">${fmtPct(totalPct)}</td></tr></tbody>
        </table>
      </div>`;
  }

  if (!periodosHtml) periodosHtml = `<p style="margin-top:2rem; color:#999;">No se encontraron datos (indicadores, notas o asistencia) dentro de las fechas de los períodos definidos, para esta asignatura.</p>`;

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Reporte oficial — ${estudiante.nombre} ${estudiante.apellido1}</title>
<style>
  @page { size: letter portrait; margin: 1.6cm; }
  body { font-family: 'IBM Plex Sans', Arial, sans-serif; color: #232323; margin: 0; padding: 1.5rem; font-size: 0.85rem; }
  .no-print { margin-bottom: 1.2rem; }
  .no-print button { padding: 0.5rem 1rem; font-size: 0.9rem; cursor: pointer; }
  header.rep { text-align: center; border-bottom: 2px solid #16232e; padding-bottom: 0.7rem; margin-bottom: 1.1rem; }
  header.rep h1 { font-size: 1.1rem; margin: 0 0 0.15rem; font-family: Georgia, serif; }
  header.rep .sub { font-size: 0.8rem; color: #555; }
  .datos { display: grid; grid-template-columns: 1fr 1fr; gap: 0.25rem 1.5rem; margin-bottom: 1.2rem; font-size: 0.88rem; }
  .datos div { border-bottom: 1px solid #ccc; padding: 0.2rem 0; }
  .titulo-principal { font-weight: 700; font-family: Georgia, serif; border: 1px solid #16232e; }
  table { width: 100%; border-collapse: collapse; margin-top: 0.3rem; }
  th, td { border: 1px solid #16232e; padding: 0.4rem 0.35rem; font-size: 0.78rem; text-align: left; vertical-align: top; }
  th { background: #16232e; color: #fff; font-weight: 600; }
  @media print { .no-print { display: none; } body { padding: 0; } }
</style>
</head>
<body>
  <div class="no-print"><button id="btn-print">Imprimir / Guardar PDF</button></div>
  <header class="rep">
    <h1>${INSTITUCION.nombre}</h1>
    <div class="sub">Este reporte presenta un resumen de las calificaciones obtenidas por el estudiante en las diferentes evaluaciones realizadas.</div>
  </header>
  <div class="datos">
    <div><b>Estudiante:</b> ${estudiante.apellido1} ${estudiante.apellido2}, ${estudiante.nombre}</div>
    <div><b>Sección:</b> ${estudiante.seccion}</div>
    <div><b>Asignatura:</b> ${materia?.nombre || ""}</div>
    <div><b>Docente:</b> ${INSTITUCION.docente}</div>
    <div><b>Fecha del reporte:</b> ${new Date().toLocaleDateString("es-CR", { day: "numeric", month: "long", year: "numeric" })}</div>
  </div>
  ${periodosHtml}
  <script>document.getElementById("btn-print").addEventListener("click", () => window.print());</script>
</body>
</html>`;

  const w = window.open("", "_blank");
  if (!w) { alert("El navegador bloqueó la ventana nueva. Permite ventanas emergentes para generar el reporte."); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
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
