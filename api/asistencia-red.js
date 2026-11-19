// Asistencia por red (2027). El estudiante se conecta al Wi-Fi del aula, pide un PIN que le llega
// a su correo del MEP y con ese PIN queda presente (o tardía) en la lección que está abierta según el horario.
//
// Pendiente para 2027 (variables de entorno en Vercel):
//   SUPABASE_SERVICE_ROLE_KEY  clave de servicio de Supabase (solo servidor; los PIN no se leen desde el navegador)
//   BREVO_API_KEY              clave de envío de Brevo (plan gratuito)
//   BREVO_REMITENTE            correo verificado en Brevo que firma los mensajes
//   ASISTENCIA_SECRETO         (opcional) texto largo para proteger los PIN guardados
// Y en la plataforma: la IP pública del router del aula y activar la asistencia (asistencia_red_config).
const crypto = require("crypto");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://dyulfowcvvmdmwbjhubq.supabase.co";
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const BREVO = process.env.BREVO_API_KEY || "";
const REMITENTE = process.env.BREVO_REMITENTE || "";
const SECRETO = process.env.ASISTENCIA_SECRETO || KEY;
const MIN_PIN = 5, MAX_INTENTOS = 5, MAX_PINES = 3;
const CORREO_MEP = /^[a-z0-9._%+-]+@est\.mep\.go\.cr$/i;

const ipDe = req => String(req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || "").split(",")[0].trim();
const hash = pin => crypto.createHash("sha256").update(SECRETO + ":" + pin).digest("hex");

async function db(ruta, opc = {}) {
  const r = await fetch(SUPABASE_URL + "/rest/v1/" + ruta, Object.assign({}, opc, {
    headers: Object.assign({ apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json" }, opc.headers || {})
  }));
  const t = await r.text();
  if (!r.ok) throw new Error("BD " + r.status + ": " + t.slice(0, 200));
  return t ? JSON.parse(t) : null;
}
const q = encodeURIComponent;

// Hora de Costa Rica (UTC-6, sin horario de verano).
function ahoraCR() {
  const d = new Date(Date.now() - 6 * 3600e3), p = n => String(n).padStart(2, "0");
  return { dia: d.getUTCDay(), fecha: d.toISOString().slice(0, 10), hora: p(d.getUTCHours()) + ":" + p(d.getUTCMinutes()) + ":" + p(d.getUTCSeconds()) };
}
const aMin = h => { const [a, b] = String(h).split(":").map(Number); return a * 60 + b; };

async function contexto(estudianteId, req) {
  const [cfg] = await db("asistencia_red_config?id=eq.1&select=*");
  const [est] = await db("estudiantes?id=eq." + q(estudianteId) + "&select=id,nombre,apellido1,seccion,correo_mep");
  if (!est) return { error: "Estudiante no encontrado." };
  const t = ahoraCR();
  const lecs = await db("lecciones?seccion=eq." + q(est.seccion) + "&dia_semana=eq." + t.dia + "&hora_inicio=lte." + t.hora + "&hora_fin=gt." + t.hora + "&select=id,materia_id,hora_inicio,hora_fin&order=hora_inicio");
  let lec = lecs[0] || null;
  if (lec) {
    const sin = await db("lecciones_sin_clase?leccion_id=eq." + lec.id + "&fecha=eq." + t.fecha + "&select=id");
    if (sin.length) lec = null;
  }
  const ip = ipDe(req), ips = (cfg && cfg.ips) || [];
  let marca = null;
  if (lec) [marca] = await db("asistencia_lecciones?leccion_id=eq." + lec.id + "&estudiante_id=eq." + q(est.id) + "&fecha=eq." + t.fecha + "&select=estado");
  return { cfg, est, t, lec, ip, ipOk: ips.length > 0 && ips.includes(ip), ipPendiente: !ips.length, marca: marca || null };
}

async function enviarPin(correo, nombre, pin, lec) {
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": BREVO, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { name: "Asistencia · CTP Mercedes Norte", email: REMITENTE },
      to: [{ email: correo, name: nombre }],
      subject: "Tu PIN de asistencia: " + pin,
      htmlContent: `<p>Hola ${nombre}:</p><p>Tu PIN de asistencia para la lección de las ${String(lec.hora_inicio).slice(0, 5)} es:</p>
        <p style="font-size:30px;font-weight:700;letter-spacing:6px">${pin}</p><p>Vence en ${MIN_PIN} minutos y solo sirve para ti.
        Si no lo pediste, avísale a tu profesor.</p><p>CTP Mercedes Norte · Contabilidad</p>`
    })
  });
  if (!r.ok) throw new Error("No se pudo enviar el correo (" + r.status + ").");
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const enviar = (code, obj) => res.status(code).json(obj);
  try {
    const b = (typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body) || {};
    const accion = b.accion || (req.query && req.query.accion);

    // Para que el profe vea la IP del router estando conectado a él. No necesita claves.
    if (accion === "mi_ip") return enviar(200, { ok: true, ip: ipDe(req) });

    if (!KEY) return enviar(200, { ok: false, pendiente: true, msg: "La asistencia por red se activa en 2027 (falta configurar el servidor)." });
    const id = String(b.estudiante_id || "").trim();
    if (!id) return enviar(400, { ok: false, msg: "Falta el estudiante." });
    const c = await contexto(id, req);
    if (c.error) return enviar(404, { ok: false, msg: c.error });
    const base = { ok: true, activo: !!(c.cfg && c.cfg.activo), leccion: c.lec, correo: c.est.correo_mep || null, ipOk: c.ipOk, ipPendiente: c.ipPendiente, marca: c.marca, tolerancia: c.cfg ? c.cfg.tolerancia_min : 10 };

    if (accion === "estado") return enviar(200, base);

    if (accion === "registrar_correo") {
      const correo = String(b.correo || "").trim().toLowerCase();
      if (!CORREO_MEP.test(correo)) return enviar(400, { ok: false, msg: "Escribe tu correo del MEP (termina en @est.mep.go.cr)." });
      if (c.est.correo_mep) return enviar(409, { ok: false, msg: "Ya tienes un correo registrado. Si está mal, pídele al profe que lo cambie." });
      await db("estudiantes?id=eq." + q(id), { method: "PATCH", body: JSON.stringify({ correo_mep: correo }) });
      return enviar(200, Object.assign(base, { correo }));
    }

    // Revisiones comunes para pedir y confirmar el PIN.
    if (!base.activo) return enviar(403, { ok: false, msg: "La asistencia por red todavía no está activa." });
    if (!c.lec) return enviar(403, { ok: false, msg: "Ahora no hay una lección abierta para tu sección." });
    if (c.marca) return enviar(409, { ok: false, msg: "Tu asistencia de esta lección ya está registrada." });
    if (c.ipPendiente) return enviar(403, { ok: false, msg: "El profe todavía no registra el router del aula." });
    if (!c.ipOk) return enviar(403, { ok: false, msg: "Conéctate al Wi-Fi del aula para marcar asistencia." });

    if (accion === "pedir_pin") {
      if (!c.est.correo_mep) return enviar(400, { ok: false, msg: "Primero registra tu correo del MEP." });
      if (!BREVO || !REMITENTE) return enviar(200, { ok: false, pendiente: true, msg: "Falta configurar el envío de correos (2027)." });
      const previos = await db("asistencia_red_pines?estudiante_id=eq." + q(id) + "&leccion_id=eq." + c.lec.id + "&fecha=eq." + c.t.fecha + "&select=id");
      if (previos.length >= MAX_PINES) return enviar(429, { ok: false, msg: "Ya pediste " + MAX_PINES + " PIN en esta lección. Habla con el profe." });
      const pin = String(crypto.randomInt(0, 1e6)).padStart(6, "0");
      await db("asistencia_red_pines", { method: "POST", body: JSON.stringify({ estudiante_id: id, leccion_id: c.lec.id, fecha: c.t.fecha, pin_hash: hash(pin),
        expira: new Date(Date.now() + MIN_PIN * 60e3).toISOString(), ip: c.ip, dispositivo: String(req.headers["user-agent"] || "").slice(0, 200) }) });
      await enviarPin(c.est.correo_mep, c.est.nombre, pin, c.lec);
      const [u, d] = c.est.correo_mep.split("@");
      return enviar(200, { ok: true, enviado: true, correo: u.slice(0, 2) + "•••@" + d, minutos: MIN_PIN });
    }

    if (accion === "confirmar") {
      const pin = String(b.pin || "").replace(/\D/g, "");
      const [p] = await db("asistencia_red_pines?estudiante_id=eq." + q(id) + "&leccion_id=eq." + c.lec.id + "&fecha=eq." + c.t.fecha + "&usado=eq.false&select=*&order=creado_en.desc&limit=1");
      if (!p) return enviar(400, { ok: false, msg: "Primero pide tu PIN." });
      if (new Date(p.expira) < new Date()) return enviar(400, { ok: false, msg: "El PIN venció. Pide uno nuevo." });
      if (p.intentos >= MAX_INTENTOS) return enviar(429, { ok: false, msg: "Demasiados intentos. Pide un PIN nuevo." });
      if (hash(pin) !== p.pin_hash) {
        await db("asistencia_red_pines?id=eq." + p.id, { method: "PATCH", body: JSON.stringify({ intentos: p.intentos + 1 }) });
        return enviar(400, { ok: false, msg: "PIN incorrecto. Te quedan " + (MAX_INTENTOS - p.intentos - 1) + " intentos." });
      }
      const tarde = aMin(c.t.hora) - aMin(c.lec.hora_inicio) > (c.cfg.tolerancia_min || 0);
      const estado = tarde ? "tardia_leve" : "presente";
      await db("asistencia_red_pines?id=eq." + p.id, { method: "PATCH", body: JSON.stringify({ usado: true }) });
      // No reemplaza una marca que ya haya puesto el profe.
      await db("asistencia_lecciones?on_conflict=leccion_id,estudiante_id,fecha", { method: "POST", headers: { Prefer: "resolution=ignore-duplicates" },
        body: JSON.stringify({ leccion_id: c.lec.id, estudiante_id: id, fecha: c.t.fecha, estado }) });
      return enviar(200, { ok: true, estado, hora: c.t.hora.slice(0, 5) });
    }
    return enviar(400, { ok: false, msg: "Acción desconocida." });
  } catch (e) {
    return enviar(500, { ok: false, msg: "Error del servidor: " + e.message });
  }
};
