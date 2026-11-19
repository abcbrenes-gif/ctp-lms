// Pendientes de la asistencia por Wi-Fi: a partir del 1 de febrero de 2027 (hora de Costa Rica) el profe ve
// dos ventanas emergentes al entrar a la plataforma, una por pendiente, hasta que queden listos:
//   1. IP del router del aula  (se guarda aquí mismo, en asistencia_red_config)
//   2. Cuenta de envío de correos (Brevo) y configuración del servidor
// «Recordarme mañana» las pospone un día en este dispositivo.
(function () {
  const INICIO = "2027-02-01";
  const hoyCR = () => new Date(Date.now() - 6 * 3600e3).toISOString().slice(0, 10);
  if (hoyCR() < INICIO) return;
  let s = null, hecho = false;
  // La sesión puede iniciarse después de cargar la página: se revisa también al cambiar de pantalla.
  function intentar() {
    if (hecho) return;
    try { s = JSON.parse(sessionStorage.getItem("ctp_lms_session_v2") || "null"); } catch (e) { s = null; }
    if (!s || s.role !== "docente") return;
    hecho = true; setTimeout(iniciar, 1200);
  }
  window.addEventListener("hashchange", intentar);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", intentar); else intentar();
  function iniciar() {
  const CLAVE = "ctp_pend2027_posponer_" + s.id;
  let pos = {}; try { pos = JSON.parse(localStorage.getItem(CLAVE) || "{}"); } catch (e) {}
  const posponer = k => { pos[k] = hoyCR(); try { localStorage.setItem(CLAVE, JSON.stringify(pos)); } catch (e) {} };
  const pospuesto = k => pos[k] === hoyCR();
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const api = async (accion) => { try { const r = await fetch("/api/asistencia-red", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accion }) }); return await r.json(); } catch (e) { return { ok: false }; } };

  function estilo() {
    if (document.getElementById("pend27-css")) return;
    const st = document.createElement("style"); st.id = "pend27-css";
    st.textContent = `#pend27{position:fixed;inset:0;z-index:10001;background:rgba(10,15,30,.6);display:flex;align-items:center;justify-content:center;padding:16px}
#pend27 .v{background:var(--surface,#fff);color:var(--text,#0F172A);max-width:520px;width:100%;border-radius:18px;padding:22px;box-shadow:0 20px 60px rgba(0,0,0,.35);max-height:90vh;overflow:auto;font:15px/1.55 Inter,"Segoe UI",system-ui,sans-serif}
#pend27 h2{margin:0 0 6px;font-size:1.2rem}#pend27 .k{font-size:.75rem;font-weight:800;letter-spacing:.08em;color:#b45309;text-transform:uppercase}
#pend27 ol{padding-left:20px}#pend27 li{margin:4px 0}#pend27 .b{display:inline-block;background:#1d63e8;color:#fff;border:0;border-radius:10px;padding:9px 14px;font:600 .9rem inherit;cursor:pointer;margin:6px 6px 0 0;text-decoration:none}
#pend27 .b.s{background:transparent;color:inherit;border:1px solid rgba(120,130,150,.5)}#pend27 .ok{background:#DDF1DC;color:#0f3d27;border-radius:10px;padding:8px 12px;margin-top:8px}#pend27 code{background:rgba(120,130,150,.18);padding:1px 6px;border-radius:6px}`;
    document.head.appendChild(st);
  }
  function ventana(html, alCerrar) {
    estilo();
    const d = document.createElement("div"); d.id = "pend27"; d.setAttribute("role", "dialog"); d.setAttribute("aria-modal", "true");
    d.innerHTML = '<div class="v">' + html + "</div>"; document.body.appendChild(d);
    const cerrar = () => { d.remove(); alCerrar && alCerrar(); };
    return { d, cerrar };
  }

  function ventanaIP(sig) {
    const w = ventana(`<div class="k">Pendiente 1 de 2 · Asistencia por Wi-Fi</div><h2>📍 Registre el router del aula</h2>
      <ol><li>Conéctese al Wi-Fi del router del aula y apague los datos móviles.</li><li>Toque «Ver mi IP».</li><li>Toque «Guardar como router del aula».</li></ol>
      <div id="p27ip"></div>
      <button class="b" id="p27ver">Ver mi IP</button><button class="b s" id="p27luego">Recordarme mañana</button><a class="b s" href="asistencia-red-docente.html">Abrir la pantalla completa</a>`, sig);
    w.d.querySelector("#p27luego").onclick = () => { posponer("ip"); w.cerrar(); };
    w.d.querySelector("#p27ver").onclick = async () => {
      const r = await api("mi_ip"), box = w.d.querySelector("#p27ip");
      if (!r.ok) { box.innerHTML = '<p>No se pudo leer la IP. Intente de nuevo.</p>'; return; }
      box.innerHTML = '<p>Esta conexión sale a internet con la IP <code>' + esc(r.ip) + '</code>.</p><button class="b" id="p27guardar">Guardar como router del aula</button>';
      box.querySelector("#p27guardar").onclick = async () => {
        const { data } = await sb.from("asistencia_red_config").select("ips").eq("id", 1).maybeSingle();
        const ips = Array.from(new Set([...(data && data.ips || []), r.ip]));
        const { error } = await sb.from("asistencia_red_config").update({ ips, actualizado_en: new Date().toISOString() }).eq("id", 1);
        box.innerHTML = error ? '<p>No se pudo guardar: ' + esc(error.message) + '</p>' : '<div class="ok">✅ Router guardado. Este pendiente ya no le volverá a salir.</div><button class="b" id="p27cont">Continuar</button>';
        const c = box.querySelector("#p27cont"); if (c) c.onclick = w.cerrar;
      };
    };
  }
  function ventanaCorreo(sig) {
    const w = ventana(`<div class="k">Pendiente 2 de 2 · Asistencia por Wi-Fi</div><h2>📩 Cuenta para enviar los PIN</h2>
      <ol><li>Cree una cuenta gratuita en <a href="https://www.brevo.com/es/" target="_blank" rel="noopener">brevo.com/es</a> (300 correos al día gratis).</li>
      <li>Verifique el correo que firmará los mensajes.</li><li>En su perfil, entre a «SMTP y API» y cree una <b>clave API</b>.</li>
      <li>Abra un chat con Claude y pídale: «configura la asistencia por Wi-Fi», con la clave y el correo remitente. La clave va al servidor, nunca a la página.</li></ol>
      <p style="font-size:.85rem;opacity:.8">Esta ventana deja de salir cuando el servidor tenga la clave configurada.</p>
      <button class="b" id="p27ok">Entendido</button><button class="b s" id="p27luego2">Recordarme mañana</button>`, sig);
    w.d.querySelector("#p27ok").onclick = () => { posponer("correo"); w.cerrar(); };
    w.d.querySelector("#p27luego2").onclick = () => { posponer("correo"); w.cerrar(); };
  }

  async function revisar() {
    if (typeof sb === "undefined") return;
    const [{ data: cfg }, est] = await Promise.all([sb.from("asistencia_red_config").select("ips").eq("id", 1).maybeSingle(), api("config_estado")]);
    const faltaIP = !(cfg && cfg.ips && cfg.ips.length) && !pospuesto("ip");
    const faltaCorreo = !(est && est.ok && est.servidor && est.correo) && !pospuesto("correo");
    const cola = []; if (faltaIP) cola.push(ventanaIP); if (faltaCorreo) cola.push(ventanaCorreo);
    const sig = () => { const f = cola.shift(); if (f) f(sig); };
    sig();
  }
  revisar();
  }
})();
