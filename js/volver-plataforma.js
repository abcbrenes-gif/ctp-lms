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
