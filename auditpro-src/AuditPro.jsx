// AuditPro CTP — prototipo 2027 (solo docente). React + Tailwind CSS.
// Dos vistas: «La Brújula» (metodología) y «Laboratorio AuditCity» (práctica).
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { PLANILLA, COMPRAS } from "./datos.js";
import { COSO, FASES, LEY, RETO, NIVELES, PRUEBAS } from "./contenido.js";
import { correr, col, nivel } from "./pruebas.js";

const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
const leer = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v ?? d; } catch (e) { return d; } };
const sesion = () => { try { return JSON.parse(sessionStorage.getItem("ctp_lms_session_v2") || "null"); } catch (e) { return null; } };

const card = "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800";
const btn = "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400";
const btnPri = btn + " bg-indigo-600 text-white hover:bg-indigo-500";
const btnSec = btn + " border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700";
const suave = "text-slate-600 dark:text-slate-300";

function Titulo({ ico, children, sub }) {
  return <div className="mb-3"><h2 className="text-xl font-extrabold tracking-tight"><span aria-hidden="true">{ico}</span> {children}</h2>{sub && <p className={"mt-1 text-sm " + suave}>{sub}</p>}</div>;
}

/* ─────────── La Brújula ─────────── */
function Brujula({ ganar, vistos, marcar }) {
  const [sel, setSel] = useState(0), c = COSO[sel];
  const elegir = i => { setSel(i); if (!vistos.includes(COSO[i].id)) { marcar(COSO[i].id); ganar(10, "Componente explorado"); } };
  const ang = i => -90 + i * 72;
  return <div className="space-y-5">
    <section className={card + " anim-sube"}>
      <Titulo ico="🧭" sub="Toque cada punto de la brújula. Los cinco componentes de COSO son los mismos de los artículos 13 a 17 de la Ley 8292.">Los 5 componentes de COSO</Titulo>
      <div className="grid gap-5 md:grid-cols-2 md:items-center">
        <div className="relative mx-auto aspect-square w-full max-w-xs">
          <div className="absolute inset-6 rounded-full border-4 border-dashed border-slate-200 dark:border-slate-600" />
          <div className="absolute left-1/2 top-1/2 h-1.5 w-[34%] origin-left rounded-full bg-gradient-to-r from-indigo-500 to-rose-500 transition-transform duration-500 ease-out" style={{ transform: `rotate(${ang(sel)}deg)` }} />
          <div className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-800 ring-4 ring-white dark:bg-white dark:ring-slate-800" />
          {COSO.map((x, i) => { const r = ang(i) * Math.PI / 180, on = i === sel;
            return <button key={x.id} type="button" onClick={() => elegir(i)} aria-pressed={on} aria-label={x.nombre}
              className={"absolute flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br text-2xl shadow-lg transition duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 " + x.color + (on ? " scale-125 ring-4 ring-white dark:ring-slate-900" : " opacity-80 hover:scale-110 hover:opacity-100")}
              style={{ left: `${50 + 40 * Math.cos(r)}%`, top: `${50 + 40 * Math.sin(r)}%` }}>
              <span aria-hidden="true">{x.ico}</span>{vistos.includes(x.id) && <span className="absolute -right-1 -top-1 rounded-full bg-emerald-500 px-1 text-[10px] text-white">✓</span>}</button>; })}
        </div>
        <div key={c.id} className="anim-sube">
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">Ley 8292 · artículo {c.art} · «{c.ley}»</p>
          <h3 className="text-2xl font-extrabold">{c.ico} {c.nombre}</h3>
          <p className="mt-1 font-medium">{c.idea}</p>
          <p className={"mt-2 text-sm italic " + suave}>Pregunta del auditor: {c.pregunta}</p>
          <div className="mt-3 grid gap-2 text-sm">
            <p className="rounded-xl bg-sky-50 p-3 dark:bg-sky-900/30"><b>🏫 En el colegio:</b> {c.colegio}</p>
            <p className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-900/30"><b>🏢 En la empresa:</b> {c.empresa}</p>
            <p className="rounded-xl bg-rose-50 p-3 dark:bg-rose-900/30"><b>🚩 Señal de alerta:</b> {c.alerta}</p>
          </div>
        </div>
      </div>
      <p className={"mt-3 text-xs " + suave}>Explorados: {vistos.length} de 5</p>
    </section>

    <section className={card}>
      <Titulo ico="🛤️" sub="Toda auditoría sigue el mismo camino, sea financiera, operativa o administrativa.">Las fases de la auditoría</Titulo>
      <Fases />
    </section>

    <section className={card}>
      <Titulo ico="⚖️" sub="Toque una tarjeta para ver el artículo explicado en sencillo.">Artículos clave de la Ley 8292</Titulo>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{LEY.map(a => <Volteable key={a.art} a={a} />)}</div>
      <p className={"mt-3 rounded-xl bg-amber-50 p-3 text-sm dark:bg-amber-900/30"}>📌 La Ley 8292 rige para el sector público (y para privados que administren fondos públicos). Las empresas privadas usan COSO como buena práctica, no por esta ley.</p>
    </section>

    <Reto ganar={ganar} />
  </div>;
}

function Fases() {
  const [f, setF] = useState(0), x = FASES[f];
  return <div>
    <ol className="flex items-center">{FASES.map((p, i) => <li key={p.n} className={"flex items-center " + (i < FASES.length - 1 ? "flex-1" : "")}>
      <button type="button" onClick={() => setF(i)} aria-pressed={i === f} aria-label={`Fase ${p.n}: ${p.nombre}`}
        className={"flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl transition duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 " + (i === f ? "scale-110 bg-indigo-600 shadow-lg" : i < f ? "bg-indigo-200 dark:bg-indigo-900" : "bg-slate-200 dark:bg-slate-700")}><span aria-hidden="true">{p.ico}</span></button>
      {i < FASES.length - 1 && <div className={"mx-1 h-1 flex-1 rounded transition-colors duration-500 " + (i < f ? "bg-indigo-500" : "bg-slate-200 dark:bg-slate-700")} />}</li>)}</ol>
    <div key={x.n} className="anim-sube mt-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-900/50">
      <p className="text-xs font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">Fase {x.n} de 4</p>
      <h3 className="text-lg font-extrabold">{x.nombre}</h3><p className="mt-1">{x.que}</p>
      <p className="mt-2 text-sm"><b>Se entrega:</b> {x.producto}</p><p className={"text-sm " + suave}><b>En AuditCity:</b> {x.ejemplo}</p>
    </div></div>;
}

function Volteable({ a }) {
  const [v, setV] = useState(false);
  return <button type="button" onClick={() => setV(!v)} aria-pressed={v} className="voltea h-36 text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 rounded-2xl">
    <div className={"voltea-in relative h-full w-full " + (v ? "girada" : "")}>
      <div className="cara absolute inset-0 flex flex-col justify-between rounded-2xl bg-gradient-to-br from-slate-800 to-indigo-900 p-3 text-white">
        <span className="text-2xl font-black">Art. {a.art}</span><span className="text-xs leading-snug opacity-90">{a.titulo}</span></div>
      <div className="cara dorso absolute inset-0 flex items-center rounded-2xl border-2 border-indigo-400 bg-white p-3 text-xs leading-snug text-slate-800 dark:bg-slate-900 dark:text-slate-100">{a.claro}</div>
    </div></button>;
}

function Reto({ ganar }) {
  const [i, setI] = useState(0), [resp, setResp] = useState(null), [ok, setOk] = useState(0);
  if (i >= RETO.length) return <section className={card + " text-center"}><p className="text-4xl">🎯</p><h3 className="text-lg font-extrabold">Reto terminado: {ok} de {RETO.length}</h3>
    <button type="button" className={btnSec + " mt-3"} onClick={() => { setI(0); setOk(0); setResp(null); }}>↺ Jugar de nuevo</button></section>;
  const q = RETO[i], bien = resp === q.r;
  const responder = id => { if (resp) return; setResp(id); if (id === q.r) { setOk(ok + 1); ganar(15, "Respuesta correcta"); } };
  return <section className={card}>
    <Titulo ico="🎯" sub={`Situación ${i + 1} de ${RETO.length}. ¿Qué componente de COSO está fallando o funcionando?`}>Reto relámpago</Titulo>
    <p className="rounded-xl bg-slate-50 p-4 text-lg font-semibold dark:bg-slate-900/50">«{q.s}»</p>
    <div className="mt-3 grid gap-2 sm:grid-cols-2">{COSO.map(c => <button key={c.id} type="button" disabled={!!resp} onClick={() => responder(c.id)}
      className={btn + " justify-start border " + (resp && c.id === q.r ? "border-emerald-500 bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100" : resp === c.id ? "anim-tiembla border-red-500 bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100" : "border-slate-300 bg-white hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700")}>{c.ico} {c.nombre}</button>)}</div>
    {resp && <div className="anim-sube mt-3 flex flex-wrap items-center gap-3"><p className="font-semibold" role="status">{bien ? "✅ ¡Correcto! +15 XP" : `❌ Era «${COSO.find(c => c.id === q.r).nombre}».`}</p>
      <button type="button" className={btnPri} onClick={() => { setI(i + 1); setResp(null); }}>Siguiente →</button></div>}
  </section>;
}

/* ─────────── Laboratorio AuditCity ─────────── */
const COLS = {
  planilla: [["id", "Pago"], ["periodo", "Período"], ["nombre", "Funcionario"], ["depto", "Departamento"], ["base", "Salario base", 1], ["horas", "H. extra"], ["neto", "Neto", 1], ["salida", "Salida"], ["usuario", "Usuario"], ["registro", "Registrado"]],
  compras: [["oc", "Orden"], ["fecha", "Fecha"], ["proveedor", "Proveedor"], ["depto", "Departamento"], ["monto", "Monto", 1], ["factura", "Factura"], ["registra", "Registra"], ["aprueba", "Aprueba"], ["registro", "Registrado"]],
};

function Laboratorio({ ganar, H, setH }) {
  const [paso, setPaso] = useState(0);
  const pasos = ["① Pruebas", "② Matriz de riesgo", "③ Informe"];
  return <div className="space-y-4">
    <div className={card + " anim-sube"}>
      <Titulo ico="🏙️" sub="Usted es el equipo auditor de la Municipalidad de Valle Sereno (entidad ficticia). Encuentre las irregularidades, valore el riesgo y arme el informe.">Laboratorio AuditCity</Titulo>
      <div className="flex gap-2 overflow-x-auto" role="tablist">{pasos.map((p, i) => <button key={p} type="button" role="tab" aria-selected={paso === i} onClick={() => setPaso(i)}
        className={btn + " whitespace-nowrap " + (paso === i ? "bg-indigo-600 text-white shadow" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200")}>{p}{i > 0 && H.length ? ` (${H.length})` : ""}</button>)}</div>
    </div>
    {paso === 0 && <Pruebas ganar={ganar} H={H} setH={setH} ir={() => setPaso(1)} />}
    {paso === 1 && <Matriz ganar={ganar} H={H} setH={setH} ir={() => setPaso(2)} />}
    {paso === 2 && <Informe ganar={ganar} H={H} setH={setH} />}
  </div>;
}

function Pruebas({ ganar, H, setH, ir }) {
  const [tabla, setTabla] = useState("planilla"), [pid, setPid] = useState(null), [param, setParam] = useState(40);
  const datos = tabla === "planilla" ? PLANILLA : COMPRAS, idk = tabla === "planilla" ? "id" : "oc";
  const prueba = PRUEBAS[tabla].find(p => p.id === pid) || null;
  const r = useMemo(() => prueba ? correr(prueba.id, datos, param) : null, [prueba, datos, param]);
  const ya = prueba && H.some(h => h.id === prueba.id);
  const registrar = () => { setH([...H, { id: prueba.id, ico: prueba.ico, titulo: prueba.nombre, condicion: r.condicion, p: 0, i: 0, criterio: null, causa: "", efecto: "", reco: "" }]); ganar(20, "Hallazgo registrado"); };
  const filas = r ? [...datos].sort((a, b) => (r.ids.has(b[idk]) ? 1 : 0) - (r.ids.has(a[idk]) ? 1 : 0)) : datos;
  return <section className={card + " anim-sube"}>
    <div className="flex flex-wrap items-center gap-2">
      {[["planilla", "👥 Planilla", PLANILLA.length], ["compras", "🛒 Compras", COMPRAS.length]].map(([k, t, n]) => <button key={k} type="button" aria-pressed={tabla === k} onClick={() => { setTabla(k); setPid(null); }}
        className={btn + " " + (tabla === k ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200")}>{t} · {n}</button>)}
      <span className={"ml-auto text-xs " + suave}>Hallazgos registrados: {H.length} de 9</span>
    </div>
    <p className="mt-3 text-sm font-semibold">Elija una prueba analítica:</p>
    <div className="mt-2 flex flex-wrap gap-2">{PRUEBAS[tabla].map(p => <button key={p.id} type="button" aria-pressed={pid === p.id} onClick={() => { setPid(p.id); if (p.param) setParam(p.param.def); }}
      className={btn + " border " + (pid === p.id ? "border-indigo-500 bg-indigo-50 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-100" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100")}>{p.ico} {p.nombre}{H.some(h => h.id === p.id) ? " ✓" : ""}</button>)}</div>
    {prueba && <div key={prueba.id} className="anim-sube mt-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-900/50">
      <p className="text-sm"><b>Qué busca:</b> {prueba.busca}</p>
      {prueba.param && <label className="mt-2 block text-sm font-semibold">{prueba.param.nombre}: {param}
        <input type="range" min={prueba.param.min} max={prueba.param.max} step="5" value={param} onChange={e => setParam(+e.target.value)} className="mt-1 block w-full accent-indigo-600" /></label>}
      <div className="mt-2 flex flex-wrap items-center gap-3" role="status">
        {r.ids.size ? <p className="font-bold text-rose-700 dark:text-rose-300">🔎 {r.ids.size} filas marcadas{r.monto ? ` · ${col(r.monto)}` : ""}</p> : <p className="font-bold text-emerald-700 dark:text-emerald-300">✅ Sin excepciones con este criterio</p>}
        {r.ids.size > 0 && (ya ? <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Hallazgo ya registrado</span> : <button type="button" className={btnPri} onClick={registrar}>➕ Registrar hallazgo (+20 XP)</button>)}
      </div>
      {r.condicion && <p className={"mt-2 text-sm " + suave}><b>Condición:</b> {r.condicion}</p>}
    </div>}
    <div className="mt-3 max-h-96 overflow-auto rounded-xl border border-slate-200 dark:border-slate-700">
      <table className="w-full min-w-max text-left text-xs"><thead className="sticky top-0 bg-slate-800 text-white"><tr>{COLS[tabla].map(c => <th key={c[0]} className="px-2 py-2 font-semibold">{c[1]}</th>)}</tr></thead>
        <tbody>{filas.map((f, n) => { const m = r && r.ids.has(f[idk]);
          return <tr key={f[idk] + "-" + n} className={"border-t border-slate-100 transition-colors duration-500 dark:border-slate-700 " + (m ? "bg-rose-100 font-semibold dark:bg-rose-900/40" : "")}>
            {COLS[tabla].map(c => <td key={c[0]} className={"whitespace-nowrap px-2 py-1.5 " + (c[2] ? "text-right tabular-nums" : "")}>{c[2] ? col(f[c[0]]) : (f[c[0]] || "—")}</td>)}</tr>; })}</tbody></table>
    </div>
    <p className={"mt-2 text-xs " + suave}>Datos ficticios. Tope simulado: ₡3 000 000 por compra que adjudica la jefatura; sobre ese monto adjudica la Alcaldía.</p>
    {H.length > 0 && <button type="button" className={btnPri + " mt-3"} onClick={ir}>Clasificar {H.length} hallazgo{H.length === 1 ? "" : "s"} en la matriz →</button>}
  </section>;
}

function Matriz({ ganar, H, setH, ir }) {
  const [sel, setSel] = useState(H[0] ? H[0].id : null), [exp, setExp] = useState(false);
  if (!H.length) return <section className={card}><p>Todavía no hay hallazgos. Corra las pruebas del paso ① y registre los que encuentre.</p></section>;
  const poner = (p, i) => { if (!sel) return; const h = H.find(x => x.id === sel); if (!h.p) ganar(10, "Riesgo valorado"); setH(H.map(x => x.id === sel ? { ...x, p, i } : x)); };
  const todas = Object.values(PRUEBAS).flat(), listos = H.filter(h => h.p).length;
  return <section className={card + " anim-sube"}>
    <p className="text-sm font-semibold">1. Elija un hallazgo. 2. Toque la casilla según su probabilidad e impacto.</p>
    <div className="mt-2 flex flex-wrap gap-2">{H.map(h => <button key={h.id} type="button" aria-pressed={sel === h.id} onClick={() => setSel(h.id)}
      className={btn + " border " + (sel === h.id ? "border-indigo-500 bg-indigo-50 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-100" : "border-slate-300 bg-white text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100")}>{h.ico} {h.titulo}{h.p ? ` · ${h.p * h.i}` : ""}</button>)}</div>
    <div className="mt-4 overflow-x-auto"><div className="grid min-w-[340px] grid-cols-[auto_repeat(5,minmax(0,1fr))] gap-1 text-center text-xs">
      {[5, 4, 3, 2, 1].map(p => <React.Fragment key={p}>
        <div className={"flex items-center justify-end pr-1 font-semibold " + suave}>{p}</div>
        {[1, 2, 3, 4, 5].map(i => { const n = nivel(p * i), aqui = H.filter(h => h.p === p && h.i === i);
          return <button key={i} type="button" onClick={() => poner(p, i)} aria-label={`Probabilidad ${p}, impacto ${i}: nivel ${n.n}`}
            className={"flex h-14 flex-wrap items-center justify-center gap-0.5 rounded-lg text-lg transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 " + n.f}>
            {aqui.map(h => <span key={h.id} className={"anim-pop " + (h.id === sel ? "drop-shadow" : "opacity-80")} title={h.titulo}>{h.ico}</span>)}</button>; })}
      </React.Fragment>)}
      <div />{[1, 2, 3, 4, 5].map(i => <div key={i} className={"font-semibold " + suave}>{i}</div>)}
    </div></div>
    <p className={"mt-1 text-center text-xs " + suave}>↑ Probabilidad (1 raro · 5 casi seguro) &nbsp;·&nbsp; Impacto → (1 insignificante · 5 catastrófico)</p>
    <div className="mt-2 flex flex-wrap justify-center gap-2 text-xs">{[[3, "1 a 5"], [8, "6 a 10"], [12, "12 a 16"], [20, "20 a 25"]].map(([s, t]) => <span key={s} className={"rounded-full px-2 py-0.5 font-semibold " + nivel(s).c}>{nivel(s).n} ({t})</span>)}</div>
    <div className="mt-4 flex flex-wrap gap-2">
      <button type="button" className={btnSec} onClick={() => setExp(!exp)}>{exp ? "Ocultar" : "👩‍🏫 Comparar con la auditora experta"}</button>
      {listos === H.length && <button type="button" className={btnPri} onClick={ir}>Armar el informe →</button>}
    </div>
    {exp && <ul className="anim-sube mt-3 space-y-1 text-sm">{H.map(h => { const e = todas.find(t => t.id === h.id).experto, s = h.p * h.i, se = e.p * e.i;
      return <li key={h.id} className="rounded-lg bg-slate-50 p-2 dark:bg-slate-900/50">{h.ico} <b>{h.titulo}:</b> {h.p ? `usted ${s} (${nivel(s).n})` : "sin valorar"} · experta {se} ({nivel(se).n}, P{e.p} × I{e.i}) {h.p ? (nivel(s).n === nivel(se).n ? "✅ mismo nivel" : "🤔 distinto nivel: ¿qué dato le hizo pensar diferente?") : ""}</li>; })}
      <li className={"text-xs " + suave}>No hay una única respuesta correcta: lo importante es poder justificar la valoración con los datos.</li></ul>}
  </section>;
}

function Informe({ ganar, H, setH }) {
  const [listo, setListo] = useState(false), todas = Object.values(PRUEBAS).flat();
  if (!H.length) return <section className={card}><p>Todavía no hay hallazgos para informar. Empiece por el paso ①.</p></section>;
  const cambiar = (id, k, v) => setH(H.map(x => x.id === id ? { ...x, [k]: v } : x));
  const completo = h => h.p && h.criterio !== null && h.causa.trim() && h.efecto.trim() && h.reco.trim();
  const orden = [...H].sort((a, b) => b.p * b.i - a.p * a.i), faltan = H.filter(h => !completo(h)).length;
  const campo = "mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";
  if (listo) return <section className={card + " anim-sube"} id="informe">
    <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-300">Informe ejecutivo de auditoría</p>
      <h2 className="text-2xl font-extrabold">Municipalidad de Valle Sereno</h2><p className={"text-sm " + suave}>Planilla y compras · I semestre 2026 · Caso simulado con datos ficticios</p></div>
      <div className="no-print flex gap-2"><button type="button" className={btnSec} onClick={() => setListo(false)}>✏️ Editar</button><button type="button" className={btnPri} onClick={() => window.print()}>🖨️ Imprimir</button></div></div>
    <p className="mt-3">Se identificaron <b>{H.length} hallazgos</b>: {["Crítico", "Alto", "Medio", "Bajo"].map(n => [n, orden.filter(h => nivel(h.p * h.i).n === n).length]).filter(x => x[1]).map(x => `${x[1]} de nivel ${x[0].toLowerCase()}`).join(", ")}. Se presentan de mayor a menor riesgo.</p>
    {orden.map((h, n) => { const t = todas.find(x => x.id === h.id), nv = nivel(h.p * h.i);
      return <article key={h.id} className="mt-4 rounded-xl border border-slate-200 p-3 dark:border-slate-700" style={{ breakInside: "avoid" }}>
        <h3 className="font-extrabold">H-{n + 1}. {h.titulo} <span className={"ml-1 rounded-full px-2 py-0.5 text-xs " + nv.c}>{nv.n} · {h.p * h.i}</span></h3>
        <dl className="mt-2 grid gap-x-3 gap-y-1 text-sm sm:grid-cols-[8rem_1fr]">
          {[["Condición", h.condicion], ["Criterio", t.criterios[h.criterio]], ["Causa", h.causa], ["Efecto", h.efecto], ["Recomendación", h.reco]].map(([a, b]) => <React.Fragment key={a}><dt className={"font-bold " + suave}>{a}</dt><dd>{b}</dd></React.Fragment>)}
        </dl></article>; })}
    <p className={"mt-4 text-xs " + suave}>Elaborado por el equipo auditor estudiantil en AuditPro CTP. Probabilidad e impacto en escala de 1 a 5.</p>
  </section>;
  return <section className={card + " anim-sube"}>
    <p className="text-sm font-semibold">Complete cada hallazgo. La condición ya salió de su prueba; a usted le toca el criterio, la causa, el efecto y la recomendación.</p>
    <div className="mt-3 space-y-3">{H.map(h => { const t = todas.find(x => x.id === h.id);
      return <details key={h.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700" open={!completo(h)}>
        <summary className="cursor-pointer font-bold">{h.ico} {h.titulo} {completo(h) ? "✅" : "· pendiente"}</summary>
        <p className={"mt-2 text-sm " + suave}><b>Condición (lo que encontró):</b> {h.condicion}</p>
        <fieldset className="mt-2"><legend className="text-sm font-semibold">Criterio (la norma que se incumple)</legend>
          {t.criterios.map((c, k) => <label key={k} className={"mt-1 flex cursor-pointer gap-2 rounded-lg border p-2 text-sm " + (h.criterio === k ? (k === t.ok ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30" : "border-red-400 bg-red-50 dark:bg-red-900/30") : "border-slate-200 dark:border-slate-700")}>
            <input type="radio" name={"cr-" + h.id} checked={h.criterio === k} onChange={() => cambiar(h.id, "criterio", k)} className="mt-0.5 accent-indigo-600" /><span>{c}{h.criterio === k ? (k === t.ok ? " ✅" : " — revise: hay un criterio que calza mejor.") : ""}</span></label>)}</fieldset>
        {[["causa", "Causa (por qué pasó)"], ["efecto", "Efecto (qué consecuencia tiene)"], ["reco", "Recomendación (qué hacer)"]].map(([k, t2]) => <label key={k} className="mt-2 block text-sm font-semibold">{t2}
          <textarea rows="2" value={h[k]} onChange={e => cambiar(h.id, k, e.target.value)} className={campo} placeholder="Escriba con sus palabras…" />
          {!h[k].trim() && <button type="button" className="mt-1 text-xs font-semibold text-indigo-600 underline dark:text-indigo-300" onClick={() => cambiar(h.id, k, t[k])}>💡 Ver una sugerencia</button>}</label>)}
        {!h.p && <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">⚠️ Falta valorarlo en la matriz (paso ②).</p>}
      </details>; })}</div>
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button type="button" className={btnPri + (faltan ? " opacity-50" : "")} disabled={!!faltan} onClick={() => { setListo(true); ganar(30, "Informe generado"); }}>📄 Generar informe ejecutivo</button>
      {faltan > 0 && <span className={"text-sm " + suave}>Faltan {faltan} hallazgo{faltan === 1 ? "" : "s"} por completar.</span>}
      <button type="button" className={btnSec + " ml-auto"} onClick={() => { if (confirm("¿Borrar los hallazgos y empezar de nuevo?")) setH([]); }}>↺ Reiniciar laboratorio</button>
    </div>
  </section>;
}

/* ─────────── Aplicación ─────────── */
function App() {
  const [vista, setVista] = useState("brujula");
  const [oscuro, setOscuro] = useState(() => leer("auditpro_oscuro", matchMedia("(prefers-color-scheme: dark)").matches));
  const [xp, setXp] = useState(() => leer("auditpro_xp", 0)), [vistos, setVistos] = useState(() => leer("auditpro_vistos", []));
  const [H, setH0] = useState(() => leer("auditpro_hallazgos", [])), [toast, setToast] = useState(null);
  useEffect(() => { document.documentElement.classList.toggle("dark", oscuro); guardar("auditpro_oscuro", oscuro); }, [oscuro]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 1600); return () => clearTimeout(t); }, [toast]);
  const ganar = (n, t) => { setXp(x => { guardar("auditpro_xp", x + n); return x + n; }); setToast(`+${n} XP · ${t}`); };
  const setH = v => { setH0(v); guardar("auditpro_hallazgos", v); };
  const marcar = id => setVistos(v => { const n = [...v, id]; guardar("auditpro_vistos", n); return n; });
  const k = NIVELES.filter(n => xp >= n.min).length - 1, niv = NIVELES[k], sig = NIVELES[k + 1];
  const pct = sig ? Math.round((xp - niv.min) / (sig.min - niv.min) * 100) : 100;
  return <div className="min-h-screen bg-slate-100 pb-24 text-slate-900 transition-colors duration-300 dark:bg-slate-900 dark:text-slate-100">
    <header className="no-print top-0 z-10 border-b md:sticky border-slate-200 bg-white/90 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
        <div className="mr-auto"><h1 className="text-lg font-black tracking-tight"><span className="bg-gradient-to-r from-indigo-500 to-rose-500 bg-clip-text text-transparent">AuditPro</span> CTP <span className="ml-1 rounded-full bg-amber-300 px-2 py-0.5 align-middle text-[10px] font-extrabold uppercase text-slate-900">Prototipo 2027 · solo profe</span></h1>
          <p className={"text-xs " + suave}>Auditoría y control interno · COSO y Ley 8292</p></div>
        <div className="w-40" title={sig ? `Faltan ${sig.min - xp} XP para ${sig.nombre}` : "Nivel máximo"}>
          <p className="flex justify-between text-xs font-bold"><span>{niv.ico} {niv.nombre}</span><span>{xp} XP</span></p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100" aria-label="Progreso al siguiente nivel"><div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-rose-500 transition-all duration-700" style={{ width: pct + "%" }} /></div></div>
        <button type="button" className={btnSec + " px-3"} onClick={() => setOscuro(!oscuro)} aria-label={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}>{oscuro ? "☀️" : "🌙"}</button>
      </div>
      <nav className="mx-auto flex max-w-5xl gap-2 px-4 pb-3" role="tablist" aria-label="Vistas">{[["brujula", "🧭 La Brújula"], ["lab", "🏙️ Laboratorio AuditCity"]].map(([id, t]) => <button key={id} type="button" role="tab" aria-selected={vista === id} onClick={() => setVista(id)}
        className={btn + " flex-1 " + (vista === id ? "bg-slate-900 text-white shadow dark:bg-white dark:text-slate-900" : "bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200")}>{t}</button>)}</nav>
    </header>
    <main className="mx-auto max-w-5xl px-4 py-5">{vista === "brujula" ? <Brujula ganar={ganar} vistos={vistos} marcar={marcar} /> : <Laboratorio ganar={ganar} H={H} setH={setH} />}</main>
    {toast && <div className="anim-pop no-print fixed bottom-20 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-xl dark:bg-white dark:text-slate-900" role="status">{toast}</div>}
  </div>;
}

function SoloProfe() {
  return <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-900"><div className={card + " max-w-md text-center"}><h1 className="text-xl font-extrabold">Solo para el profe</h1>
    <p className="mt-2 text-sm text-slate-600">Este prototipo se abre desde la plataforma, en 📅 2027, con la sesión del docente.</p><a className={btnPri + " mt-4"} href="index.html">Ir a la plataforma</a></div></div>;
}

const s = sesion();
createRoot(document.getElementById("root")).render(s && s.role === "docente" ? <App /> : <SoloProfe />);
