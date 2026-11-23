// Portal de familias: justificación de ausencias y tardías por el encargado.
// Se llama por /api/padres (reescrito a /api/ia?fn=padres). Acciones (POST {accion, ...}):
//  · firmar_enlace  (docente) → enlace personal para el WhatsApp del encargado, vence en N días.
//  · enviar_codigo  (familia)  → código de 6 dígitos al correo registrado del encargado.
//  · verificar_codigo (familia) → pase de 2 horas para el portal.
//  · ver            (familia)  → ausencias y tardías del estudiante y sus solicitudes.
//  · justificar     (familia)  → guarda la solicitud como «pendiente» (el docente la aprueba).
//  · validar        (docente) → dice si cada solicitud salió de verdad del portal (firma).
//  · registrar      (familia)  → registro del encargado desde registro-familias.html («pendiente»).
//  · validar_registros (docente) → dice si cada registro salió de verdad del formulario.
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
const ESTR_REG = "registro_encargado";
const CAMPOS_REG = ["est", "estNombre", "nivel", "nombre", "cedula", "parentesco", "telefono", "correo", "nombre2", "parentesco2", "telefono2", "enviado"];
const selloReg = r => firma("reg|" + CAMPOS_REG.map(k => String(r[k] == null ? "" : r[k])).join("|"));
const sello = j => firma(`jus|${j.est}|${j.registros.join(",")}|${j.motivo}|${j.encargado}|${j.enviado}` + (Array.isArray(j.adjuntos) && j.adjuntos.length ? "|" + j.adjuntos.join(",") : ""));

async function enviarCorreo(para, asunto, html) {
  const user = process.env.GMAIL_USER, pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) throw new Error("Todavía no está configurado el envío de correos. Avísele al docente.");
  const nodemailer = require("nodemailer");
  const t = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
  await t.sendMail({ from: `"CTP Mercedes Norte · Contabilidad" <${user}>`, to: para, subject: asunto, html });
}


// ───── Resumen para el portal (2027): notas, trabajos, calendario y avisos ─────
// Lo que se muestra lo decide el docente en padres-docente.html (registro «portal_padres»).
// Las notas se calculan igual que en la plataforma (js/app-parte1.js): indicadores con
// justificados y puntos extra, pruebas por su peso y asistencia (REA, art. 31).
const ESTR_PORTAL = "portal_padres";
async function todas(path) { const out = []; for (let o = 0; ; o += 1000) { const d = await rest(path + `&limit=1000&offset=${o}`) || []; out.push(...d); if (d.length < 1000) return out; } }
async function configPortal() {
  const d = await rest(`trabajos_cotidianos?select=contenido_actividad&contenido_actividad->>estrategia=eq.${ESTR_PORTAL}&order=id.asc&limit=1`);
  const c = (d && d[0] && d[0].contenido_actividad) || {};
  return { mostrar: { notas: false, trabajos: false, calendario: false, avisos: false, ...(c.mostrar || {}) }, avisos: c.avisos || [], eventos: c.eventos || [] };
}
const PESO_AUS = { ausente_injustificada: 1, tardia_leve: 0.5, tardia_grave: 1 };
const r2 = n => Math.round((+n || 0) * 100) / 100;
async function datosMateria(est, m) {
  const inds0 = await rest(`indicadores?select=id,categoria,letra,descripcion,puntaje_maximo,peso_prueba,fecha_evaluacion,orden&materia_id=eq.${m}&order=orden.asc,id.asc`) || [];
  const ids = inds0.map(i => i.id);
  const cal = ids.length ? await rest(`calificaciones_indicador?select=indicador_id,puntaje_obtenido&estudiante_id=eq.${enc(est)}&indicador_id=in.(${ids.join(",")})`) || [] : [];
  const porInd = {}; cal.forEach(c => { porInd[c.indicador_id] = c.puntaje_obtenido; });
  // Igual que lo que ve el estudiante: un indicador de un trabajo cerrado y sin calificar no aparece.
  let inds = inds0;
  if (ids.length) {
    const tr = await rest(`trabajos_cotidianos?select=indicador_id,habilitado,contenido_actividad&or=(indicador_id.in.(${ids.join(",")}),contenido_actividad->indicadores_criterio.not.is.null)`) || [];
    const hab = {}; tr.forEach(t => [t.indicador_id, ...(((t.contenido_actividad || {}).indicadores_criterio) || [])].filter(x => x != null && ids.includes(Number(x))).forEach(id => { hab[id] = (hab[id] || false) || t.habilitado !== false; }));
    inds = inds0.filter(i => !(i.id in hab) || hab[i.id] || i.id in porInd);
  }
  return { inds, porInd };
}
async function notasDe(est, mats) {
  const cats = await rest(`rubrica_categorias?select=nombre,porcentaje`) || [];
  const ajD = await rest(`trabajos_cotidianos?select=contenido_actividad&contenido_actividad->>estrategia=eq.ajustes_nota&order=id.asc&limit=1`);
  const aj = (ajD && ajD[0] && ajD[0].contenido_actividad) || {};
  const just = new Set(Object.keys(aj.justificados || {}).filter(k => k.startsWith(est + "|")).map(k => Number(k.split("|")[1])));
  const out = [], doc = await rest(`docentes?select=nombre&order=id.asc&limit=1`) || [];
  for (const mt of mats) {
    const m = mt.id, { inds, porInd } = await datosMateria(est, m);
    const comps = [];
    for (const c of cats) {
      const pct = Number(c.porcentaje) || 0; let nota = null, aporte = null, items = [];
      if (c.nombre === "Pruebas") {
        const L = inds.filter(i => i.categoria === "Pruebas" && i.peso_prueba != null && Number(i.puntaje_maximo) > 0);
        items = L.map(i => ({ titulo: i.descripcion, fecha: i.fecha_evaluacion, puntos: porInd[i.id] == null ? null : Number(porInd[i.id]), max: Number(i.puntaje_maximo), peso: Number(i.peso_prueba) }));
        if (L.length) { aporte = L.reduce((a, i) => a + Number(porInd[i.id] || 0) / Number(i.puntaje_maximo) * Number(i.peso_prueba), 0); const pesos = L.reduce((a, i) => a + Number(i.peso_prueba), 0); nota = pesos ? aporte / pesos * 100 : null; }
      } else if (c.nombre === "Asistencia") {
        const lecs = (await rest(`lecciones?select=id&materia_id=eq.${m}`) || []).map(l => l.id);
        const ext = (await rest(`trabajos_cotidianos?select=contenido_actividad&contenido_actividad->>estrategia=eq.asistencia_externa&contenido_actividad->>materia_id=eq.${m}`) || []).map(x => ((x.contenido_actividad || {}).estudiantes || {})[est]).filter(Boolean);
        let imp = ext.reduce((a, e) => a + (Number(e.impartidas) || 0), 0), aus = ext.reduce((a, e) => a + (Number(e.total_injustificadas) || 0), 0);
        if (lecs.length) {
          const todos = await todas(`asistencia_lecciones?select=leccion_id,fecha&leccion_id=in.(${lecs.join(",")})&order=id.asc`);
          imp += new Set(todos.map(r => r.leccion_id + "-" + r.fecha)).size;
          const mios = await rest(`asistencia_lecciones?select=estado&estudiante_id=eq.${enc(est)}&leccion_id=in.(${lecs.join(",")})`) || [];
          aus += mios.reduce((a, r) => a + (PESO_AUS[r.estado] || 0), 0);
        }
        if (imp) { nota = Math.max(0, (1 - aus / imp) * 100); aporte = nota * pct / 100; items = [{ titulo: "Lecciones impartidas", valor: imp }, { titulo: "Ausencias injustificadas (con tardías)", valor: r2(aus) }]; }
      } else {
        const L = inds.filter(i => i.categoria === c.nombre && !just.has(i.id));
        items = inds.filter(i => i.categoria === c.nombre).map(i => ({ titulo: (i.letra ? i.letra + ". " : "") + i.descripcion, fecha: i.fecha_evaluacion, puntos: porInd[i.id] == null ? null : Number(porInd[i.id]), max: Number(i.puntaje_maximo), justificado: just.has(i.id) }));
        const max = L.reduce((a, i) => a + Number(i.puntaje_maximo), 0);
        if (max > 0) {
          nota = L.reduce((a, i) => a + Number(porInd[i.id] || 0), 0) / max * 100;
          const bono = Number(((aj.bonos || {})[m + "|" + c.nombre] || {}).puntos || 0) + ((aj.bonosEst || {})[`${est}|${m}|${c.nombre}`] || []).reduce((a, b) => a + (Number(b.puntos) || 0), 0);
          if (bono && pct) nota = Math.min(100, nota + bono * 100 / pct);
          aporte = nota * pct / 100;
          if (bono) items.push({ titulo: "Puntos adicionales del docente", bono: r2(bono) });
        }
      }
      comps.push({ nombre: c.nombre, porcentaje: pct, nota: nota == null ? null : r2(nota), aporte: aporte == null ? null : r2(aporte), items });
    }
    const np = await rest(`trabajos_cotidianos?select=contenido_actividad&contenido_actividad->>estrategia=eq.notas_periodo&contenido_actividad->>materia_id=eq.${m}&limit=1`);
    const NP = (np && np[0] && np[0].contenido_actividad) || {};
    const p1 = NP.visible_p1 && NP.p1 && NP.p1.notas ? NP.p1.notas[est] : null;
    out.push({ materia: String(mt.nombre || "").trim(), seccion: mt.seccion, docente: (doc[0] && doc[0].nombre) || "", componentes: comps, actual: r2(comps.reduce((a, c) => a + (c.aporte || 0), 0)), p1: p1 == null ? null : Number(p1) });
  }
  return out;
}
async function trabajosDe(est, mats) {
  const out = [];
  for (const mt of mats) {
    const { inds, porInd } = await datosMateria(est, mt.id);
    const ajD = await rest(`trabajos_cotidianos?select=contenido_actividad&contenido_actividad->>estrategia=eq.ajustes_nota&order=id.asc&limit=1`);
    const J = ((ajD && ajD[0] && ajD[0].contenido_actividad) || {}).justificados || {};
    const lista = inds.filter(i => i.categoria !== "Pruebas" && i.categoria !== "Asistencia").map(i => ({ componente: i.categoria, letra: i.letra || "", descripcion: i.descripcion, fecha: i.fecha_evaluacion,
      puntos: porInd[i.id] == null ? null : Number(porInd[i.id]), max: Number(i.puntaje_maximo), justificado: !!J[`${est}|${i.id}`] }));
    const tareas = await rest(`entregas_tareas?select=id,titulo,tipo,componente,fecha_limite&visible=eq.true&materia_id=eq.${mt.id}&order=fecha_limite.desc`) || [];
    const ent = tareas.length ? await rest(`entregas_estudiantes?select=tarea_id,estado,entregado_en,calificacion&estudiante_id=eq.${enc(est)}&tarea_id=in.(${tareas.map(t => t.id).join(",")})`) || [] : [];
    const porT = {}; ent.forEach(e => { porT[e.tarea_id] = e; });
    out.push({ materia: String(mt.nombre || "").trim(), indicadores: lista, entregas: tareas.map(t => { const e = porT[t.id]; return { titulo: t.titulo, tipo: t.tipo, componente: t.componente, fecha_limite: t.fecha_limite,
      estado: e ? (e.calificacion ? "calificada" : e.estado || "entregada") : (t.fecha_limite && new Date(t.fecha_limite) < new Date() ? "sin_entregar" : "pendiente"), entregado_en: e ? e.entregado_en : null,
      nota: e && e.calificacion ? { puntos: e.calificacion.puntos, total: e.calificacion.total } : null }; }) });
  }
  return out;
}
async function calendarioDe(mats, cfg) {
  const ev = [], secs = mats.map(m => m.seccion), desde = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  for (const mt of mats) {
    const pr = await rest(`indicadores?select=descripcion,fecha_evaluacion,peso_prueba&materia_id=eq.${mt.id}&categoria=eq.Pruebas&fecha_evaluacion=gte.${desde}`) || [];
    pr.forEach(p => ev.push({ fecha: p.fecha_evaluacion, tipo: "Prueba", titulo: p.descripcion + (p.peso_prueba != null ? ` (${p.peso_prueba} %)` : ""), seccion: mt.seccion }));
    const ts = await rest(`entregas_tareas?select=titulo,tipo,fecha_limite&visible=eq.true&materia_id=eq.${mt.id}&fecha_limite=gte.${desde}`) || [];
    ts.forEach(t => ev.push({ fecha: String(t.fecha_limite).slice(0, 10), tipo: t.tipo === "proyecto" ? "Entrega de proyecto" : "Entrega de tarea", titulo: t.titulo, seccion: mt.seccion }));
  }
  cfg.eventos.filter(e => e.fecha >= desde && (!e.seccion || secs.includes(e.seccion))).forEach(e => ev.push({ fecha: e.fecha, tipo: e.tipo || "Actividad", titulo: e.titulo, detalle: e.detalle || "", seccion: e.seccion || "" }));
  return ev.sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
}

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "Método no permitido." }); return; }
  let b = req.body; if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = {}; } } b = b || {};
  try {
    const a = b.accion;
    if (a === "firmar_enlace") {
      res.status(410).json({ error: "Los enlaces por WhatsApp ya no se usan; el encargado entra con el código a su correo." }); return;
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
    if (a === "registrar_visita") {
      // Bitácora del portal: cada entrada al portal y cada vez que abren Calificaciones (después de aceptar el aviso).
      const tk = leerToken(b.token);
      const tipo = ["calificaciones", "reglamento"].includes(b.tipo) ? b.tipo : "portal";
      if (tk.t !== "docente") await rest("portal_padres_bitacora", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ estudiante_id: tk.est, tipo, dispositivo: String(b.dispositivo || "").slice(0, 80) }) });
      res.json({ ok: true, fecha: new Date().toISOString() }); return;
    }
    if (a === "token_docente") {
      // Vista previa del docente: entra al portal como la familia de un estudiante, sin poder enviar justificaciones.
      if (!(await docenteOk(b.pin))) { res.status(403).json({ error: "PIN de docente incorrecto." }); return; }
      const est = String(b.est || "").trim(); if (!est) throw new Error("Elija un estudiante.");
      res.json({ token: token({ t: "docente", est, exp: Date.now() + 3600e3 }) }); return;
    }
    if (a === "resumen") {
      const tk = leerToken(b.token), est = tk.est;
      const cfg = await configPortal(), M = cfg.mostrar;
      const ems = await rest(`estudiante_materias?select=materia_id&estudiante_id=eq.${enc(est)}`) || [];
      const mats = ems.length ? await rest(`materias?select=id,nombre,seccion&id=in.(${ems.map(x => x.materia_id).join(",")})`) || [] : [];
      const secs = mats.map(m => m.seccion);
      const r = { mostrar: M };
      if (M.notas) r.notas = await notasDe(est, mats);
      if (M.trabajos) r.trabajos = await trabajosDe(est, mats);
      if (M.calendario) r.calendario = await calendarioDe(mats, cfg);
      if (M.avisos) r.avisos = cfg.avisos.filter(x => !x.para || x.para === "todos" || x.para === est || secs.includes(x.para))
        .map(x => ({ fecha: x.fecha, titulo: x.titulo, texto: x.texto, para: x.para === est ? "Solo para su hijo(a)" : x.para && x.para !== "todos" ? "Sección " + x.para : "Todas las familias" }))
        .sort((x, y) => String(y.fecha).localeCompare(String(x.fecha))).slice(0, 40);
      res.json(r); return;
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
      if (tk.t === "docente") throw new Error("Es la vista previa del docente: aquí no se envían justificaciones.");
      const ids = new Set(regs.filter(r => INJUST.includes(r.estado)).map(r => String(r.id)));
      const pedidos = (Array.isArray(b.registros) ? b.registros : []).map(String).filter(x => ids.has(x));
      if (!pedidos.length) throw new Error("Marque al menos una ausencia o tardía.");
      const motivo = String(b.motivo || "").replace(/\s+/g, " ").trim().slice(0, 600), encargado = String(b.encargado || "").replace(/\s+/g, " ").trim().slice(0, 120);
      if (motivo.length < 5 || encargado.length < 5) throw new Error("Escriba el motivo y su nombre completo.");
      const j = { estrategia: ESTR_JUS, est, registros: pedidos, motivo, encargado, cedula: String(b.cedula || "").slice(0, 30), parentesco: String(b.parentesco || "").slice(0, 40),
        adjuntos: (Array.isArray(b.adjuntos) ? b.adjuntos : b.adjunto ? [b.adjunto] : []).map(x => String(x).slice(0, 200)).filter(x => /^justificaciones\//.test(x)).slice(0, 3), via: tk.t === "wa" ? "WhatsApp" : "Correo " + (tk.correo || ""), dispositivo: String(b.dispositivo || "").slice(0, 80),
        estado: "pendiente", enviado: new Date().toISOString() };
      if (b.leyo_reglamento) j.leyo_reglamento = String(b.leyo_reglamento).slice(0, 40);
      j.adjunto = j.adjuntos[0] || "";
      j.sello = sello(j);
      await rest("trabajos_cotidianos", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ titulo: "Justificación de asistencia (portal de familias)", tipo_actividad: "rubrica_directa", habilitado: false, contenido_actividad: j }) });
      res.json({ ok: true }); return;
    }
    if (a === "registrar") {
      // Registro público del encargado (código QR / enlace). Queda «pendiente» hasta que el docente lo aprueba.
      if (String(b.web || "").trim()) { res.json({ ok: true }); return; } // trampa para robots
      const t = (v, n) => String(v || "").replace(/\s+/g, " ").trim().slice(0, n);
      const r = { estrategia: ESTR_REG, est: t(b.est, 20).replace(/[^0-9A-Za-z-]/g, ""), estNombre: t(b.estNombre, 120), nivel: t(b.nivel, 20),
        nombre: t(b.nombre, 120), cedula: t(b.cedula, 30), parentesco: t(b.parentesco, 40), telefono: t(b.telefono, 20).replace(/[^0-9+ -]/g, ""),
        correo: t(b.correo, 120).toLowerCase(), nombre2: t(b.nombre2, 120), parentesco2: t(b.parentesco2, 40), telefono2: t(b.telefono2, 20).replace(/[^0-9+ -]/g, ""),
        acepta: b.acepta === true, dispositivo: t(b.dispositivo, 80), estado: "pendiente", enviado: new Date().toISOString() };
      if (r.est.length < 9) throw new Error("Escriba la cédula del estudiante completa.");
      if (r.estNombre.length < 5 || r.nombre.length < 5) throw new Error("Escriba el nombre completo del estudiante y el suyo.");
      if (r.cedula.length < 9) throw new Error("Escriba su número de cédula.");
      if (!r.parentesco) throw new Error("Indique su parentesco con el estudiante.");
      if (r.telefono.replace(/\D/g, "").length < 8) throw new Error("Escriba un teléfono de 8 dígitos.");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.correo)) throw new Error("Revise el correo electrónico.");
      if (!r.acepta) throw new Error("Debe leer y aceptar las responsabilidades del encargado.");
      r.sello = selloReg(r);
      await rest("trabajos_cotidianos", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ titulo: "Registro de encargado (portal de familias)", tipo_actividad: "rubrica_directa", habilitado: false, contenido_actividad: r }) });
      res.json({ ok: true }); return;
    }
    if (a === "validar_registros") {
      const L = Array.isArray(b.registros) ? b.registros.slice(0, 300) : [];
      res.json({ validas: L.map(r => !!(r && r.sello && r.sello === selloReg(r))) }); return;
    }
    if (a === "estado_correo") { res.json({ correo: !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD), secreto: !!process.env.PADRES_SECRET }); return; }
    if (a === "validar") {
      const L = Array.isArray(b.solicitudes) ? b.solicitudes.slice(0, 200) : [];
      res.json({ validas: L.map(j => !!(j && j.sello && j.registros && j.sello === sello(j))) }); return;
    }
    res.status(400).json({ error: "Acción desconocida." });
  } catch (e) {
    res.status(400).json({ error: e.message || "Error" });
  }
};
