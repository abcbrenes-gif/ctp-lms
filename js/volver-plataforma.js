// Botones flotantes «← Atrás» y «🏠 Salir» para todas las aplicaciones de la
// plataforma (Aula de Conta, Liquidaciones, Misión Seguros, La Tiradera, ContaRed,
// Planilla Opoly, Ruta Laboral, Memoria, Exámenes, Planeamiento…), para no tener
// que salir del sitio.
//  · Atrás: regresa a la pantalla anterior (si no hay, sale a la plataforma).
//  · Salir: vuelve a la plataforma; al estudiante lo deja en su grupo de tarjetas.
// Uso en una aplicación:  <script src="js/volver-plataforma.js" data-grupo="juegos"></script>
// Uso en la plataforma:   <script src="js/volver-plataforma.js" data-modo="spa"></script>
//   (ahí «Salir» lleva al inicio y los botones se esconden en el inicio y el ingreso).
(function () {
  var me = document.currentScript, grupo = (me && me.dataset.grupo) || "", spa = me && me.dataset.modo === "spa";
  function sesion() { try { return JSON.parse(sessionStorage.getItem("ctp_lms_session_v2") || "null"); } catch (e) { return null; } }
  function destinoSalir() {
    if (spa) return "#/";
    var ses = sesion(), est = ses && ses.role === "estudiante";
    return "index.html" + (est && grupo ? "#/g/" + grupo : "");
  }
  function boton(id, txt, etiqueta, accion) {
    var b = document.createElement("button");
    b.type = "button"; b.id = id; b.textContent = txt; b.setAttribute("aria-label", etiqueta); b.title = etiqueta;
    b.style.cssText = "padding:9px 14px;border:0;border-radius:999px;background:#1f2937;color:#fff;font:600 14px/1.1 system-ui,sans-serif;cursor:pointer;" +
      "box-shadow:0 6px 18px rgba(0,0,0,.25);opacity:.9";
    b.onmouseenter = function () { b.style.opacity = "1"; };
    b.onmouseleave = function () { b.style.opacity = ".9"; };
    b.onfocus = b.onmouseenter; b.onblur = b.onmouseleave;
    b.onclick = accion;
    return b;
  }
  function atras() {
    var mismoSitio = false; try { mismoSitio = !!document.referrer && new URL(document.referrer).origin === location.origin; } catch (e) {}
    if (history.length > 1 && (spa || mismoSitio)) history.back();
    else location.href = destinoSalir();
  }
  function salir() { if (spa) location.hash = "#/"; else location.href = destinoSalir(); }
  function visible() {
    if (!spa) return true;
    var h = location.hash || "";
    return !(h === "" || h === "#" || h === "#/" || /^#\/login/.test(h));
  }
  function poner() {
    var caja = document.getElementById("volver-plataforma");
    if (!caja) {
      caja = document.createElement("div");
      caja.id = "volver-plataforma";
      caja.setAttribute("role", "navigation");
      caja.setAttribute("aria-label", "Navegación de la plataforma");
      caja.style.cssText = "position:fixed;left:calc(12px + env(safe-area-inset-left,0px));bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:9999;display:flex;gap:8px;";
      caja.appendChild(boton("vp-atras", "← Atrás", "Regresar a la pantalla anterior", atras));
      caja.appendChild(boton("vp-salir", spa ? "🏠 Inicio" : "🏠 Salir", spa ? "Ir al inicio de la plataforma" : "Salir a la plataforma", salir));
      document.body.appendChild(caja);
    }
    caja.style.display = visible() ? "flex" : "none";
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", poner); else poner();
  if (spa) window.addEventListener("hashchange", poner);
  window.addEventListener("beforeprint", function () { var c = document.getElementById("volver-plataforma"); if (c) c.style.display = "none"; });
  window.addEventListener("afterprint", poner);
})();

// ── Modo examen ─────────────────────────────────────────────────────────────
// Mientras un estudiante tenga un examen abierto (publicado, con «🔒 Modo examen», ya pasó su
// hora de inicio y todavía no lo entregó), cualquier página de la plataforma lo devuelve al
// examen. Solo funciona con EXAMENES_ABIERTOS = true (js/config.js). Ante cualquier fallo de
// conexión NO bloquea: es preferible dejar pasar que dejar a un estudiante sin plataforma.
// Límite: esto solo controla las páginas de la plataforma; no puede impedir que el estudiante
// abra otra pestaña u otra aplicación (eso lo registra el propio examen como «salida»).
(function () {
  if (typeof EXAMENES_ABIERTOS === "undefined" || EXAMENES_ABIERTOS !== true || typeof sb === "undefined") return;
  if (/(^|\/)examen(\.html)?$/.test(location.pathname)) return;
  var CLAVE = "ctp_modo_examen", ocupado = false;
  function sesion() { try { return JSON.parse(sessionStorage.getItem("ctp_lms_session_v2") || "null"); } catch (e) { return null; } }
  // Aplicación que el propio examen pide usar (enlace «↗ Abrir …» dentro del examen).
  function appPermitida() {
    try { var p = JSON.parse(localStorage.getItem("ctp_examen_app") || "null"); return !!(p && p.hasta > Date.now() && p.ruta && location.pathname.replace(/\.html$/, "") === String(p.ruta).replace(/\.html$/, "")); } catch (e) { return false; }
  }
  async function examenAbierto(ses) {
    try { var c = JSON.parse(sessionStorage.getItem(CLAVE) || "null"); if (c && c.u === String(ses.id) && Date.now() - c.t < 45000) return c.id; } catch (e) {}
    var id = null;
    try {
      var r = await sb.from("trabajos_cotidianos")
        .select("id,publicado:contenido_actividad->ex->publicado,modo:contenido_actividad->ex->modo_examen,inicio:contenido_actividad->ex->>inicio,cierre:contenido_actividad->ex->>cierre,duracion:contenido_actividad->ex->duracion,materia:contenido_actividad->ex->materia_id")
        .eq("contenido_actividad->>estrategia", "examen_modulo").eq("habilitado", true);
      if (r.error) {
        // Respaldo: si la consulta resumida falla, se lee el examen completo y se arma igual.
        var r2 = await sb.from("trabajos_cotidianos").select("id,contenido_actividad").eq("contenido_actividad->>estrategia", "examen_modulo").eq("habilitado", true);
        if (r2.error) return null;
        r = { data: (r2.data || []).map(function (t) { var x = (t.contenido_actividad || {}).ex || {}; return { id: t.id, publicado: x.publicado, modo: x.modo_examen, inicio: x.inicio, cierre: x.cierre, duracion: x.duracion, materia: x.materia_id }; }) };
      }
      var ahora = Date.now();
      var act = (r.data || []).filter(function (t) {
        if (t.publicado !== true || t.modo === false || !t.inicio) return false;
        var ini = Date.parse(t.inicio); if (isNaN(ini) || ahora < ini) return false;
        var fin = t.cierre ? Date.parse(t.cierre) : ini + ((+t.duracion || 120) + 30) * 60000;
        return ahora <= fin;
      });
      if (act.length) {
        var em = await sb.from("estudiante_materias").select("materia_id").eq("estudiante_id", String(ses.id));
        if (em.error) return null;
        var mats = (em.data || []).map(function (x) { return +x.materia_id; });
        act = act.filter(function (t) { return mats.indexOf(+t.materia) > -1; });
      }
      if (act.length) {
        var ae = await sb.from("actividades_estudiante").select("trabajo_id,completado").eq("estudiante_id", String(ses.id)).in("trabajo_id", act.map(function (t) { return t.id; }));
        if (ae.error) return null;
        var hechos = (ae.data || []).filter(function (a) { return a.completado; }).map(function (a) { return a.trabajo_id; });
        act = act.filter(function (t) { return hechos.indexOf(t.id) === -1; });
      }
      if (act.length) id = act[0].id;
    } catch (e) { return null; }
    try { sessionStorage.setItem(CLAVE, JSON.stringify({ t: Date.now(), u: String(ses.id), id: id })); } catch (e) {}
    return id;
  }
  async function revisar() {
    var ses = sesion(); if (!ses || ses.role !== "estudiante" || ocupado || appPermitida()) return;
    ocupado = true;
    try { var id = await examenAbierto(ses); if (id) location.replace("examen.html#/hacer/" + id); } finally { ocupado = false; }
  }
  revisar();
  window.addEventListener("hashchange", revisar);
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") revisar(); });
  setInterval(function () { if (document.visibilityState === "visible") revisar(); }, 60000);
})();
