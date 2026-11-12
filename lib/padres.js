// Portal de familias: justificación de ausencias y tardías por el encargado.
// Se llama por /api/padres (reescrito a /api/ia?fn=padres). Acciones (POST {accion, ...}):
//  · firmar_enlace  (docente) → enlace personal para el WhatsApp del encargado, vence en N días.
//  · enviar_codigo  (familia)  → código de 6 dígitos al correo registrado del encargado.
//  · verificar_codigo (familia) → pase de 2 horas para el portal.
//  · ver            (familia)  → ausencias y tardías del estudiante y sus solicitudes.
//  · justificar     (familia)  → guarda la solicitud como «pendiente» (el docente la aprueba).
//  · validar        (docente) → dice si cada solicitud salió de verdad del portal (firma).
// Nada cambia en la asistencia hasta que el docente aprueba en la plataforma.
// Secreto para firmar: PADRES_SECRET (o, si no existe, uno derivado de ANTHROPIC_API_KEY).
// Correo: GMAIL_USER + GMAIL_APP_PASSWORD (contraseña de aplicación de Google).
const crypto = require("crypto");
const SB_URL = "https://dyulfowcvvmdmwbjhubq.supabase.co";
const SB_KEY = "sb_publishable_WXHTshzfy4vMITGIHbfY3g_ra1U3mBd";
const H = { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, "Content-Type": "application/json" };
const ESTR_ENC = "encargados", ESTR_JUS = "justificacion_asistencia";
const INJUST = ["ausente_injustificada", "tardia_leve", "tardia_grave"];

const secreto = () => process.env.PADRES_SECRET || crypto.createHash("sha256").update("padres|" + (process.env.ANTHROPIC_API_KEY || "sin-clave")).digest("hex");
const b64 = s => Buffer.from(s).toString("base64url");
const firma = s => crypto.createHmac("sha256", secreto()).update(s).digest("base64url");
function token(obj) { const p = b64(JSON.stringify(obj)); return p + "." + firma(p); }
function leerToken(t) {
  const [p, f] = String(t || "").split(".");
  if (!p || !f || f.length !== firma(p).length || !crypto.timingSafeEqual(Buffer.from(f), Buffer.from(firma(p)))) throw new Error("El enlace o el código no es válido.");
  const o = JSON.parse(Buffer.from(p, "base64url").toString());
  if (!o.exp || Date.now() > o.exp) throw new Error("El enlace venció. Pídale al docente uno nuevo.");
  return o;
}
async function rest(path, opt) {
  const r = await fetch(SB_URL + "/rest/v1/" + path, { ...(opt || {}), headers: { ...H, ...((opt && opt.headers) || {}) } });
  const t = await r.text(); let d = null; try { d = t ? JSON.parse(t) : null; } catch { d = t; }
  if (!r.ok) throw new Error((d && d.message) || "Error de la base de datos");
  return d;
}
const enc = encodeURIComponent;
async function encargadoDe(estId) {
  const d = await rest(`trabajos_cotidianos?select=contenido_actividad&contenido_actividad->>estrategia=eq.${ESTR_ENC}&order=id.asc&limit=1`);
  return (((d && d[0] && d[0].contenido_actividad) || {}).datos || {})[estId] || null;
}
async function docenteOk(pin) {
  if (!pin) return false;
  const d = await rest(`docentes?select=id&pin=eq.${enc(String(pin))}&limit=1`);
  return !!(d && d.length);
}
const codigo = (est, correo, ventana) => String(parseInt(crypto.createHmac("sha256", secreto()).update(`cod|${est}|${correo}|${ventana}`).digest("hex").slice(0, 10), 16) % 1000000).padStart(6, "0");
const VENT = 10 * 60 * 1000;
const sello = j => firma(`jus|${j.est}|${j.registros.join(",")}|${j.motivo}|${j.encargado}|${j.enviado}`);

async function enviarCorreo(para, asunto, html) {
  const user = process.env.GMAIL_USER, pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw new Error("Todavía no está configurado el envío de correos. Avísele al docente.");
  const nodemailer = require("nodemailer");
  const t = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  await t.sendMail({ from: `"CTP Mercedes Norte · Contabilidad" <${user}>`, to: para, subject: asunto, html });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "Método no permitido." }); return; }
  let b = req.body; if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = {}; } } b = b || {};
  try {
    const a = b.accion;
    if (a === "firmar_enlace") {
      if (!(await docenteOk(b.pin))) { res.status(403).json({ error: "PIN de docente incorrecto." }); return; }
      const dias = Math.min(15, Math.max(1, Number(b.dias) || 5));
      const regs = (Array.isArray(b.registros) ? b.registros : []).map(String).slice(0, 60);
      res.json({ token: token({ t: "wa", est: String(b.est), regs, exp: Date.now() + dias * 864e5 }) }); return;
    }
    if (a === "enviar_codigo") {
      const est = String(b.est || "").trim(), correo = String(b.correo || "").trim().toLowerCase();
      const e = await encargadoDe(est);
      // Respuesta igual aunque no coincida, para no revelar qué correos están registrados.
      if (e && e.correo && e.correo.trim().toLowerCase() === correo) {
        const c = codigo(est, correo, Math.floor(Date.now() / VENT));
        await enviarCorreo(correo, "Código para justificar ausencias · CTP Mercedes Norte",
          `<p>Hola${e.nombre ? " " + e.nombre : ""}:</p><p>Su código para entrar al Portal de familias es:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">${c}</p><p>Vence en unos 10 minutos. Si usted no lo pidió, ignore este correo.</p>`);
      }
      res.json({ ok: true }); return;
    }
    if (a === "verificar_codigo") {
      const est = String(b.est || "").trim(), correo = String(b.correo || "").trim().toLowerCase(), c = String(b.codigo || "").trim();
      const v = Math.floor(Date.now() / VENT);
      if (!c || (c !== codigo(est, correo, v) && c !== codigo(est, correo, v - 1))) { res.status(403).json({ error: "El código no es correcto o ya venció." }); return; }
      res.json({ token: token({ t: "mail", est, correo, exp: Date.now() + 2 * 3600e3 }) }); return;
    }
    if (a === "ver" || a === "justificar") {
      const tk = leerToken(b.token), est = tk.est;
      const [es] = await rest(`estudiantes?select=id,nombre,apellido1,apellido2,seccion&id=eq.${enc(est)}`) || [];
      if (!es) throw new Error("No se encontró el estudiante.");
      let regs = await rest(`asistencia_lecciones?select=id,fecha,estado,leccion_id&estudiante_id=eq.${enc(est)}&order=fecha.desc&limit=400`) || [];
      if (tk.t === "wa" && tk.regs && tk.regs.length) regs = regs.filter(r => tk.regs.includes(String(r.id)));
      const sols = (await rest(`trabajos_cotidianos?select=id,contenido_actividad&contenido_actividad->>estrategia=eq.${ESTR_JUS}&contenido_actividad->>est=eq.${enc(est)}&order=id.desc&limit=50`) || []).map(x => ({ id: x.id, ...x.contenido_actividad }));
      if (a === "ver") {
        res.json({ estudiante: { nombre: `${es.nombre} ${es.apellido1 || ""} ${es.apellido2 || ""}`.replace(/\s+/g, " ").trim(), seccion: es.seccion }, via: tk.t,
          registros: regs.filter(r => INJUST.includes(r.estado) || r.estado.includes("justificada")).map(r => ({ id: String(r.id), fecha: r.fecha, estado: r.estado })),
          solicitudes: sols.map(s => ({ id: s.id, registros: s.registros, motivo: s.motivo, estado: s.estado, enviado: s.enviado, respuesta: s.respuesta || "" })) });
        return;
      }
      const ids = new Set(regs.filter(r => INJUST.includes(r.estado)).map(r => String(r.id)));
      const pedidos = (Array.isArray(b.registros) ? b.registros : []).map(String).filter(x => ids.has(x));
      if (!pedidos.length) throw new Error("Marque al menos una ausencia o tardía.");
      const motivo = String(b.motivo || "").replace(/\s+/g, " ").trim().slice(0, 600), encargado = String(b.encargado || "").replace(/\s+/g, " ").trim().slice(0, 120);
      if (motivo.length < 5 || encargado.length < 5) throw new Error("Escriba el motivo y su nombre completo.");
      const j = { estrategia: ESTR_JUS, est, registros: pedidos, motivo, encargado, cedula: String(b.cedula || "").slice(0, 30), parentesco: String(b.parentesco || "").slice(0, 40),
        adjunto: String(b.adjunto || "").slice(0, 300), via: tk.t === "wa" ? "WhatsApp" : "Correo " + (tk.correo || ""), dispositivo: String(b.dispositivo || "").slice(0, 80),
        estado: "pendiente", enviado: new Date().toISOString() };
      j.sello = sello(j);
      await rest("trabajos_cotidianos", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ titulo: "Justificación de asistencia (portal de familias)", tipo_actividad: "rubrica_directa", habilitado: false, contenido_actividad: j }) });
      res.json({ ok: true }); return;
    }
    if (a === "validar") {
      const L = Array.isArray(b.solicitudes) ? b.solicitudes.slice(0, 200) : [];
      res.json({ validas: L.map(j => !!(j && j.sello && j.registros && j.sello === sello(j))) }); return;
    }
    res.status(400).json({ error: "Acción desconocida." });
  } catch (e) {
    res.status(400).json({ error: e.message || "Error" });
  }
};
