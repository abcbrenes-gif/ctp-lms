// ─────────────────────────────────────────────────────────────────────────
// Hoja de cálculo pequeña (sin eval), con las costumbres de Excel:
// · una fórmula empieza con «=» o con «+» (también «-» seguido de celda o «(»)
// · celdas A1, $A$1, rangos A1:B5; operadores + - * / ^ %, comparaciones
// · decimales con coma o punto; argumentos separados con «;» o «,»
// · funciones: SUMA, PROMEDIO, MIN, MAX, CONTAR, REDONDEAR, ENTERO, ABS, SI
//   (y sus nombres en inglés: SUM, AVERAGE, COUNT, ROUND, INT, IF)
// La usan los estudiantes en Liquidaciones para calcular el salario a su modo.
// ─────────────────────────────────────────────────────────────────────────

const HOJA_COLS = "ABCDEFGHIJ".split("");
const HOJA_FILAS = 25;

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
// ¿El texto de una celda es una fórmula?
function hojaEsFormula(raw) {
  const s = String(raw == null ? "" : raw).trim();
  if (s.length < 2) return false;
  if (s[0] === "=") return true;
  if (s[0] === "+") return hojaNumeroTexto(s) === null;          // +A1*2 sí; +500 es un número
  if (s[0] === "-") return /^-\s*(\$?[A-Za-z]\$?\d|\(|[A-Za-zÁÉÍÓÚáéíóú]+\s*\()/.test(s);
  return false;
}
const hojaCuerpo = raw => { const s = String(raw).trim(); return s[0] === "=" || s[0] === "+" ? s.slice(1) : s; };

// Mueve las referencias relativas de una fórmula (para copiar hacia abajo o a la derecha).
function hojaDesplazar(raw, dCol, dFil) {
  if (!hojaEsFormula(raw)) return raw;
  return String(raw).replace(/(\$?)([A-Za-z])(\$?)(\d+)(?![\d(])/g, (all, dc, col, df, fil, off, str) => {
    const prev = str[off - 1]; if (prev && /[A-Za-zÁÉÍÓÚáéíóú]/.test(prev)) return all; // parte de un nombre de función
    let c = col.toUpperCase().charCodeAt(0) - 65, f = Number(fil);
    if (!dc) c += dCol; if (!df) f += dFil;
    if (c < 0 || f < 1) return "#REF";
    return dc + String.fromCharCode(65 + c) + df + f;
  });
}

// Devuelve { valor, error } de una celda o de un texto suelto (puede ser fórmula).
function hojaEvaluar(hoja, entrada) {
  hoja = hoja || {};
  const cache = {};
  const limpiaRef = r => r.replace(/\$/g, "").toUpperCase();
  const celda = (ref, pila) => {
    ref = limpiaRef(ref);
    if (ref in cache) return cache[ref];
    if (pila.includes(ref)) throw new Error("#CICLO");
    const raw = hoja[ref];
    let v;
    if (raw == null || String(raw).trim() === "") v = 0;
    else if (hojaEsFormula(raw)) v = formula(hojaCuerpo(raw), [...pila, ref]);
    else { const n = hojaNumeroTexto(raw); v = n === null ? String(raw) : n; }
    cache[ref] = v; return v;
  };
  const rango = (a, b, pila) => {
    const pa = /^([A-Z])(\d+)$/.exec(limpiaRef(a)), pb = /^([A-Z])(\d+)$/.exec(limpiaRef(b));
    if (!pa || !pb) throw new Error("#REF");
    const c1 = Math.min(pa[1].charCodeAt(0), pb[1].charCodeAt(0)), c2 = Math.max(pa[1].charCodeAt(0), pb[1].charCodeAt(0));
    const f1 = Math.min(+pa[2], +pb[2]), f2 = Math.max(+pa[2], +pb[2]);
    const out = [];
    for (let c = c1; c <= c2; c++) for (let f = f1; f <= f2; f++) out.push(celda(String.fromCharCode(c) + f, pila));
    return out;
  };
  const FUN = {
    SUMA: L => L.reduce((s, x) => s + x, 0),
    PROMEDIO: L => L.length ? FUN.SUMA(L) / L.length : 0,
    MIN: L => L.length ? Math.min(...L) : 0, MAX: L => L.length ? Math.max(...L) : 0,
    CONTAR: L => L.length,
    REDONDEAR: (L, a) => { const f = Math.pow(10, a.length > 1 ? a[1] : 0); return Math.round(a[0] * f) / f; },
    ENTERO: (L, a) => Math.floor(a[0]), ABS: (L, a) => Math.abs(a[0]),
    SI: (L, a) => (a[0] ? (a.length > 1 ? a[1] : 1) : (a.length > 2 ? a[2] : 0))
  };
  Object.assign(FUN, { SUM: FUN.SUMA, AVERAGE: FUN.PROMEDIO, COUNT: FUN.CONTAR, ROUND: FUN.REDONDEAR, INT: FUN.ENTERO, IF: FUN.SI });
  function formula(txt, pila) {
    const toks = [];
    // número (coma decimal solo si sigue un dígito y no es separador «, »), rango, celda, función(, operador
    // La coma es decimal si se usa «;» para separar argumentos o si no hay funciones.
    const comaDecimal = txt.includes(";") || !/[A-Za-z]\s*\(/.test(txt);
    const re = comaDecimal ? /(\d+(?:[.,]\d+)?)|(\$?[A-Za-z]\$?\d+:\$?[A-Za-z]\$?\d+)|(\$?[A-Za-z]\$?\d+)(?![A-Za-z(])|([A-Za-zÁÉÍÓÚáéíóú.]+)\s*\(|(<=|>=|<>|[-+*/^()%;,<>=])/y : /(\d+(?:\.\d+)?)|(\$?[A-Za-z]\$?\d+:\$?[A-Za-z]\$?\d+)|(\$?[A-Za-z]\$?\d+)(?![A-Za-z(])|([A-Za-zÁÉÍÓÚáéíóú.]+)\s*\(|(<=|>=|<>|[-+*/^()%;,<>=])/y;
    let i = 0;
    while (i < txt.length) {
      if (/\s/.test(txt[i])) { i++; continue; }
      re.lastIndex = i; const mm = re.exec(txt);
      if (!mm) throw new Error("#ERROR");
      i = re.lastIndex;
      if (mm[1]) toks.push({ t: "n", v: Number(mm[1].replace(",", ".")) });
      else if (mm[2]) toks.push({ t: "r", v: mm[2] });
      else if (mm[3]) toks.push({ t: "c", v: mm[3] });
      else if (mm[4]) toks.push({ t: "f", v: mm[4].toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "") });
      else toks.push({ t: "o", v: mm[5] });
    }
    let p = 0;
    const ver = () => toks[p], toma = () => toks[p++], es = (...ops) => ver() && ver().t === "o" && ops.includes(ver().v);
    const num = v => { if (typeof v === "number") return v; if (v === "") return 0; const n = hojaNumeroTexto(v); if (n === null) throw new Error("#VALOR"); return n; };
    function comp() {
      let v = expr();
      while (es("=", "<>", "<", ">", "<=", ">=")) { const o = toma().v, a = num(v), b = num(expr()); v = (o === "=" ? a === b : o === "<>" ? a !== b : o === "<" ? a < b : o === ">" ? a > b : o === "<=" ? a <= b : a >= b) ? 1 : 0; }
      return v;
    }
    function expr() { let v = term(); while (es("+", "-")) { const o = toma().v, b = term(); v = o === "+" ? num(v) + num(b) : num(v) - num(b); } return v; }
    function term() { let v = unario(); while (es("*", "/")) { const o = toma().v, b = unario(); if (o === "/" && num(b) === 0) throw new Error("#DIV/0"); v = o === "*" ? num(v) * num(b) : num(v) / num(b); } return v; }
    function unario() { if (es("-", "+")) { const o = toma().v, v = unario(); return o === "-" ? -num(v) : num(v); } return potencia(); }
    function potencia() { let v = postfijo(); if (es("^")) { toma(); v = Math.pow(num(v), num(unario())); } return v; }
    function postfijo() { let v = primario(); while (es("%")) { toma(); v = num(v) / 100; } return v; }
    function primario() {
      const k = toma(); if (!k) throw new Error("#ERROR");
      if (k.t === "n") return k.v;
      if (k.t === "c") return celda(k.v, pila);
      if (k.t === "r") { const vals = rango(...k.v.split(":"), pila).filter(x => typeof x === "number"); return FUN.SUMA(vals); }
      if (k.t === "o" && k.v === "(") { const v = comp(); const c = toma(); if (!c || c.v !== ")") throw new Error("#ERROR"); return v; }
      if (k.t === "f") {
        const fn = FUN[k.v]; if (!fn) throw new Error("#NOMBRE");
        const lista = [], args = [];
        if (!es(")")) {
          for (;;) {
            if (ver() && ver().t === "r" && toks[p + 1] && toks[p + 1].t === "o" && (toks[p + 1].v === ")" || toks[p + 1].v === ";" || toks[p + 1].v === ",")) {
              const [a, b] = toma().v.split(":"); const vals = rango(a, b, pila).filter(x => typeof x === "number"); lista.push(...vals); args.push(vals.length ? vals[0] : 0);
            } else { const v = num(comp()); lista.push(v); args.push(v); }
            if (es(";", ",")) { toma(); continue; }
            break;
          }
        }
        const c = toma(); if (!c || c.v !== ")") throw new Error("#ERROR");
        return fn(lista, args);
      }
      throw new Error("#ERROR");
    }
    const v = comp(); if (p < toks.length) throw new Error("#ERROR");
    return v;
  }
  try {
    const s = String(entrada == null ? "" : entrada).trim();
    if (/^\$?[A-Za-z]\$?\d+$/.test(s)) return { valor: celda(s, []) };
    if (hojaEsFormula(s)) return { valor: formula(hojaCuerpo(s), []) };
    const n = hojaNumeroTexto(s); return { valor: n === null ? s : n };
  } catch (e) { return { valor: null, error: e.message || "#ERROR" }; }
}
function hojaValorCelda(hoja, ref) { return hojaEvaluar(hoja, "=" + ref); }
function hojaMostrar(r) {
  if (r.error) return r.error;
  if (typeof r.valor === "number") return (Math.round(r.valor * 100) / 100).toLocaleString("es-CR", { maximumFractionDigits: 2 });
  return String(r.valor == null ? "" : r.valor);
}
