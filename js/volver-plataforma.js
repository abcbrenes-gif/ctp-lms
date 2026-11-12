// Botón flotante «← Plataforma» para las aplicaciones que se abren desde el menú
// del estudiante (Aula de Conta, Ruta Laboral, ContaRed, Planilla Opoly…), para
// volver sin salir de la plataforma. Uso: <script src="js/volver-plataforma.js" data-grupo="simuladores"></script>
(function () {
  var me = document.currentScript, grupo = (me && me.dataset.grupo) || "";
  function poner() {
    if (document.getElementById("volver-plataforma")) return;
    var ses = null; try { ses = JSON.parse(sessionStorage.getItem("ctp_lms_session_v2") || "null"); } catch (e) {}
    var est = ses && ses.role === "estudiante";
    var a = document.createElement("a");
    a.id = "volver-plataforma";
    a.href = "index.html" + (est && grupo ? "#/g/" + grupo : "");
    a.textContent = "← Plataforma";
    a.setAttribute("aria-label", "Volver a la plataforma");
    a.style.cssText = "position:fixed;left:calc(12px + env(safe-area-inset-left,0px));bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:9999;" +
      "padding:9px 14px;border-radius:999px;background:#1f2937;color:#fff;font:600 14px/1.1 system-ui,sans-serif;text-decoration:none;" +
      "box-shadow:0 6px 18px rgba(0,0,0,.25);opacity:.92";
    a.onmouseenter = function () { a.style.opacity = "1"; };
    a.onmouseleave = function () { a.style.opacity = ".92"; };
    document.body.appendChild(a);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", poner); else poner();
})();
