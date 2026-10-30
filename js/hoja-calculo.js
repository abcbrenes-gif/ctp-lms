// ─────────────────────────────────────────────────────────────────────────
// Hoja de cálculo pequeña (sin eval): celdas A1…, fórmulas que empiezan con
// «=», operadores + - * / ^ %, paréntesis, rangos A1:B5 y funciones
// SUMA/SUM, PROMEDIO/AVERAGE, MIN, MAX, REDONDEAR/ROUND, CONTAR/COUNT.
// La usan los estudiantes en Liquidaciones para calcular el salario a su modo.
// ─────────────────────────────────────────────────────────────────────────

const HOJA_COLS = "ABCDEFGH".split("");
const HOJA_FILAS = 20;

function hojaNumeroTexto(v) {
  const s = String(v == null ? "" : v).trim().replace(/[₡\s]/g, "");
  if (!s) return null;
  let t = s;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) t = t.replace(/\./g, "").replace(",", "."); // 1.234.567,89
  else if (/^-?\d+,\d+$/.test(t)) t = t.replace(",", ".");                                  // 1234,5
  else t = t.replace(/,/g, "");                                                             // 1,234,567.89
  const n = Number(t);
  return isFinite(n) ? n : null;
}

// Devuelve { valor, error } de una celda o de un texto suelto (puede ser fórmula).
function hojaEvaluar(hoja, entrada) {
  hoja = hoja || {};
  const cache = {};
  const celda = (ref, pila) => {
    ref = ref.toUpperCase();
    if (ref in cache) return cache[ref];
    if (pila.includes(ref)) throw new Error("#CICLO");
    const raw = hoja[ref];
    let v;
    if (raw == null || String(raw).trim() === "") v = 0;
    else if (String(raw).trim().startsWith("=")) v = formula(String(raw).trim().slice(1), [...pila, ref]);
    else { const n = hojaNumeroTexto(raw); v = n === null ? String(raw) : n; }
    cache[ref] = v; return v;
  };
  const rango = (a, b, pila) => {
    const pa = /^([A-Z])(\d+)$/.exec(a.toUpperCase()), pb = /^([A-Z])(\d+)$/.exec(b.toUpperCase());
    if (!pa || !pb) throw new Error("#REF");
    const c1 = Math.min(pa[1].charCodeAt(0), pb[1].charCodeAt(0)), c2 = Math.max(pa[1].charCodeAt(0), pb[1].charCodeAt(0));
    const f1 = Math.min(+pa[2], +pb[2]), f2 = Math.max(+pa[2], +pb[2]);
    const out = [];
    for (let c = c1; c <= c2; c++) for (let f = f1; f <= f2; f++) out.push(celda(String.fromCharCode(c) + f, pila));
    return out;
  };
  const FUN = {
    SUMA: L => L.reduce((s, x) => s + x, 0), SUM: L => FUN.SUMA(L),
    PROMEDIO: L => L.length ? FUN.SUMA(L) / L.length : 0, AVERAGE: L => FUN.PROMEDIO(L),
    MIN: L => L.length ? Math.min(...L) : 0, MAX: L => L.length ? Math.max(...L) : 0,
    CONTAR: L => L.length, COUNT: L => L.length,
    REDONDEAR: (L, args) => { const d = args.length > 1 ? args[1] : 0; const f = Math.pow(10, d); return Math.round(args[0] * f) / f; },
    ROUND: (L, args) => FUN.REDONDEAR(L, args)
  };
  function formula(txt, pila) {
    const toks = [];
    const re = /\s*(?:(\d+(?:\.\d+)?)|([A-Za-z]+\d+:[A-Za-z]+\d+)|([A-Za-z]+\d+)|([A-Za-zÁÉÍÓÚáéíóú]+)\s*\(|([-+*/^()%;,]))/y;
    let i = 0;
    while (i < txt.length) {
      if (/\s/.test(txt[i])) { i++; continue; }
      re.lastIndex = i; const mm = re.exec(txt);
      if (!mm) throw new Error("#ERROR");
      i = re.lastIndex;
      if (mm[1]) toks.push({ t: "n", v: Number(mm[1]) });
      else if (mm[2]) toks.push({ t: "r", v: mm[2] });
      else if (mm[3]) toks.push({ t: "c", v: mm[3] });
      else if (mm[4]) toks.push({ t: "f", v: mm[4].toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "") });
      else toks.push({ t: "o", v: mm[5] });
    }
    let p = 0;
    const ver = () => toks[p], toma = () => toks[p++];
    const num = v => { if (typeof v === "number") return v; const n = hojaNumeroTexto(v); if (n === null) throw new Error("#VALOR"); return n; };
    function expr() { let v = term(); while (ver() && ver().t === "o" && (ver().v === "+" || ver().v === "-")) { const o = toma().v, b = term(); v = o === "+" ? num(v) + num(b) : num(v) - num(b); } return v; }
    function term() { let v = unario(); while (ver() && ver().t === "o" && (ver().v === "*" || ver().v === "/")) { const o = toma().v, b = unario(); if (o === "/" && num(b) === 0) throw new Error("#DIV/0"); v = o === "*" ? num(v) * num(b) : num(v) / num(b); } return v; }
    function unario() { if (ver() && ver().t === "o" && (ver().v === "-" || ver().v === "+")) { const o = toma().v, v = unario(); return o === "-" ? -num(v) : num(v); } return potencia(); }
    function potencia() { let v = postfijo(); if (ver() && ver().t === "o" && ver().v === "^") { toma(); v = Math.pow(num(v), num(unario())); } return v; }
    function postfijo() { let v = primario(); while (ver() && ver().t === "o" && ver().v === "%") { toma(); v = num(v) / 100; } return v; }
    function primario() {
      const k = toma(); if (!k) throw new Error("#ERROR");
      if (k.t === "n") return k.v;
      if (k.t === "c") return celda(k.v, pila);
      if (k.t === "o" && k.v === "(") { const v = expr(); const c = toma(); if (!c || c.v !== ")") throw new Error("#ERROR"); return v; }
      if (k.t === "f") {
        const fn = FUN[k.v]; if (!fn) throw new Error("#NOMBRE");
        const lista = [], args = [];
        if (!(ver() && ver().v === ")")) {
          for (;;) {
            if (ver() && ver().t === "r") { const [a, b] = toma().v.split(":"); const vals = rango(a, b, pila).filter(x => typeof x === "number"); lista.push(...vals); args.push(vals.length ? vals[0] : 0); }
            else { const v = num(expr()); lista.push(v); args.push(v); }
            if (ver() && (ver().v === ";" || ver().v === ",")) { toma(); continue; }
            break;
          }
        }
        const c = toma(); if (!c || c.v !== ")") throw new Error("#ERROR");
        return fn(lista, args);
      }
      throw new Error("#ERROR");
    }
    const v = expr(); if (p < toks.length) throw new Error("#ERROR");
    return v;
  }
  try {
    const s = String(entrada == null ? "" : entrada).trim();
    if (/^[A-Za-z]\d+$/.test(s) ) return { valor: celda(s, []) };
    if (s.startsWith("=")) return { valor: formula(s.slice(1), []) };
    const n = hojaNumeroTexto(s); return { valor: n === null ? s : n };
  } catch (e) { return { valor: null, error: e.message || "#ERROR" }; }
}
function hojaValorCelda(hoja, ref) { return hojaEvaluar(hoja, "=" + ref); }
function hojaMostrar(r) {
  if (r.error) return r.error;
  if (typeof r.valor === "number") return (Math.round(r.valor * 100) / 100).toLocaleString("es-CR", { maximumFractionDigits: 2 });
  return String(r.valor == null ? "" : r.valor);
}
