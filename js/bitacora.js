// ─────────────────────────────────────────────────────────────────────────
// Bitácora de ingresos: cada vez que un estudiante entra a la plataforma o a
// uno de sus módulos (Aula de Conta, Liquidaciones, Memoria) se guarda una fila
// en la tabla bitacora_ingresos. El estudiante ve un aviso de que sus ingresos
// quedan registrados y su propia lista; el docente ve la bitácora completa.
// Si la tabla todavía no existe, nada se rompe: simplemente no se registra.
// ─────────────────────────────────────────────────────────────────────────

const BITACORA_TABLA = "bitacora_ingresos";
const BITACORA_MODULOS = { plataforma: "🏫 Plataforma", aula_conta: "🧮 Aula de Conta", liquidaciones: "📑 Liquidaciones", memoria: "🧠 Memoria Contable" };
const BITACORA_AVISO = "🔒 Tus ingresos a la plataforma quedan registrados (fecha, hora y módulo) en una bitácora que ve tu profe.";
const BITACORA_SQL = `create table if not exists public.bitacora_ingresos (
  id bigserial primary key,
  estudiante_id text not null,
  modulo text not null default 'plataforma',
  dispositivo text,
  fecha timestamptz not null default now()
);
create index if not exists bitacora_ingresos_est_fecha on public.bitacora_ingresos (estudiante_id, fecha desc);
alter table public.bitacora_ingresos enable row level security;
create policy "bitacora_insertar" on public.bitacora_ingresos for insert to anon, authenticated with check (true);
create policy "bitacora_leer" on public.bitacora_ingresos for select to anon, authenticated using (true);`;

function bitacoraSesion() { try { return JSON.parse(sessionStorage.getItem("ctp_lms_session_v2") || "null"); } catch (e) { return null; } }

// Registra el ingreso del estudiante a un módulo. No repite el mismo módulo
// dentro de 30 minutos en la misma pestaña (recargar no cuenta como otro ingreso).
async function bitacoraRegistrar(modulo, forzar) {
  try {
    const s = bitacoraSesion();
    if (!s || s.role !== "estudiante" || !s.id || typeof sb === "undefined") return;
    const k = "bitacora_" + modulo, prev = Number(sessionStorage.getItem(k)) || 0;
    if (!forzar && Date.now() - prev < 30 * 60 * 1000) return;
    sessionStorage.setItem(k, String(Date.now()));
    await sb.from(BITACORA_TABLA).insert({ estudiante_id: String(s.id), modulo, dispositivo: bitacoraDispositivo(navigator.userAgent) });
  } catch (e) { /* la bitácora nunca bloquea el ingreso */ }
}
function bitacoraDispositivo(ua) {
  ua = String(ua || "");
  const tipo = /iPad|Tablet/i.test(ua) ? "Tableta" : /Mobi|Android|iPhone/i.test(ua) ? "Celular" : "Computadora";
  const nav = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Navegador";
  const so = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad|Mac OS/.test(ua) ? (/(iPhone|iPad)/.test(ua) ? "iOS" : "Mac") : /CrOS/.test(ua) ? "ChromeOS" : /Linux/.test(ua) ? "Linux" : "";
  return `${tipo} · ${nav}${so ? " · " + so : ""}`;
}
// Últimos ingresos de un estudiante. Devuelve { filas, error, sinTabla }.
async function bitacoraDe(estudianteId, limite) {
  const r = await sb.from(BITACORA_TABLA).select("modulo, dispositivo, fecha").eq("estudiante_id", String(estudianteId)).order("fecha", { ascending: false }).limit(limite || 20);
  return { filas: r.data || [], error: r.error, sinTabla: !!(r.error && /bitacora_ingresos|relation|does not exist|schema cache/i.test(r.error.message || "")) };
}
// Todos los ingresos desde una fecha (paginado de 1000 en 1000).
async function bitacoraDesde(desdeISO, ids) {
  const filas = []; let error = null;
  for (let i = 0; i < 50; i++) {
    let q = sb.from(BITACORA_TABLA).select("estudiante_id, modulo, dispositivo, fecha").gte("fecha", desdeISO).order("fecha", { ascending: false }).range(i * 1000, i * 1000 + 999);
    if (ids && ids.length) q = q.in("estudiante_id", ids);
    const r = await q;
    if (r.error) { error = r.error; break; }
    filas.push(...(r.data || []));
    if (!r.data || r.data.length < 1000) break;
  }
  return { filas, error, sinTabla: !!(error && /bitacora_ingresos|relation|does not exist|schema cache/i.test(error.message || "")) };
}
function bitacoraFecha(iso) { try { return new Date(iso).toLocaleString("es-CR", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }); } catch (e) { return iso; } }
function bitacoraHace(iso) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "hace un momento"; if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60); if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24); return `hace ${d} día${d === 1 ? "" : "s"}`;
}
