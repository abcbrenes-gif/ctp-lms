// ─────────────────────────────────────────────────────────────────────────
// Liquidaciones laborales (Costa Rica) — motor de cálculo, sin pantalla.
// Base legal: Código de Trabajo art. 28 (preaviso), 29 (cesantía, reformado
// por la Ley de Protección al Trabajador), 30 (salario promedio de los
// últimos 6 meses), 153 y 157 (vacaciones) y Ley 2412 (aguinaldo).
// Lo usan liquidaciones.html (calculadora y práctica) y la plataforma.
// ─────────────────────────────────────────────────────────────────────────

const LIQ_MOTIVOS = [
  ["despido_responsabilidad", "Despido con responsabilidad patronal"],
  ["despido_justa_causa", "Despido sin responsabilidad patronal (justa causa)"],
  ["renuncia", "Renuncia voluntaria"],
  ["jubilacion_fallecimiento", "Jubilación / pensión o fallecimiento"]
];
const LIQ_SALARIO_MODOS = [
  ["mensual", "Salario mensual fijo"],
  ["meses", "Últimos 12 meses (se calculan con las fechas)"]
];
// Formas de pago anteriores (quincenal, semanal, por hora): se convierten a
// salario mensual fijo para que los casos ya guardados sigan funcionando.
function liqNormalizarCaso(c) {
  if (!c || c.salarioModo === "mensual" || c.salarioModo === "meses") return c;
  c.salarioMensual = liqMensualDe(c).mensual; c.salarioModo = "mensual"; return c;
}
// Días de cesantía por año, según los años de la relación laboral (art. 29).
const LIQ_CES_TABLA = { 1: 19.5, 2: 20, 3: 20.5, 4: 21, 5: 21.24, 6: 21.5, 7: 22, 8: 22, 9: 22, 10: 21.5, 11: 21, 12: 20.5, 13: 20 };
const LIQ_CES_TOPE = 8;
const LIQ_SEMANAS_MES = 4.33;

const liqR = n => Math.round((+n || 0) * 100) / 100;
const liqFecha = s => { const [y, m, d] = String(s || "").split("-").map(Number); return y ? new Date(Date.UTC(y, (m || 1) - 1, d || 1)) : null; };
const liqIsoF = d => d.toISOString().slice(0, 10);
const liqMesNombre = ym => { const [y, m] = ym.split("-").map(Number); return ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"][m - 1] + " " + y; };

function liqAntig(ing, sal) {
  let y = sal.getUTCFullYear() - ing.getUTCFullYear(), m = sal.getUTCMonth() - ing.getUTCMonth(), d = sal.getUTCDate() - ing.getUTCDate() + 1;
  if (d < 0) { m--; d += 30; } if (d >= 30) { m++; d -= 30; } if (m < 0) { y--; m += 12; }
  return { anios: Math.max(0, y), meses: Math.max(0, m), dias: Math.max(0, d) };
}
// Los 12 meses que terminan en el mes de salida (para la tabla mes a mes).
function liqMeses12(fechaSalida) {
  const s = liqFecha(fechaSalida) || new Date(), out = [];
  for (let i = 11; i >= 0; i--) { const d = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() - i, 1)); out.push(d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0")); }
  return out;
}

// Días laborados en un mes (mes comercial de 30 días).
function liqDiasDelMes(ym, ing, sal) {
  const [y, m] = ym.split("-").map(Number);
  const ini = Date.UTC(y, m - 1, 1), finMes = new Date(Date.UTC(y, m, 0)), fin = finMes.getTime();
  if (sal && sal.getTime() < ini) return 0; if (ing && ing.getTime() > fin) return 0;
  const ultimo = finMes.getUTCDate();
  const dia = (d, esFin) => { const n = d.getUTCDate(); return esFin && n === ultimo ? 30 : Math.min(30, n); };
  const desde = ing && ing.getTime() >= ini ? dia(ing, false) : 1;
  const hasta = sal && sal.getTime() <= fin ? dia(sal, true) : 30;
  return Math.max(0, Math.min(30, hasta - desde + 1));
}
// Los 12 meses calculados con las fechas: días laborados de cada mes y su
// salario ordinario (salario mensual ÷ 30 × días). Las horas extra y las
// incapacidades se toman de lo que se escribió en c.salarios.
function liqMesesAuto(c) {
  const ing = liqFecha(c.fechaIngreso), sal = liqFecha(c.fechaSalida), base = +c.salarioMensual || 0;
  const prev = {}; (c.salarios || []).forEach(x => { if (x && x.mes) prev[x.mes] = x; });
  return liqMeses12(c.fechaSalida).map(mes => {
    const dias = ing && sal ? liqDiasDelMes(mes, ing, sal) : 30, p = prev[mes] || {};
    return { mes, dias, ordinario: liqR(base / 30 * dias), extra: dias ? (+p.extra || 0) : 0, incap: dias ? !!p.incap : false };
  });
}

// Salario mensual equivalente según la forma de pago.
function liqMensualDe(c) {
  const m = c.salarioModo;
  if (m === "quincenal") return { mensual: liqR((+c.quincena || 0) * 2), formula: `quincena × 2 = ${liqR(c.quincena)} × 2` };
  if (m === "semanal") return { mensual: liqR((+c.semana || 0) * LIQ_SEMANAS_MES), formula: `salario semanal × ${LIQ_SEMANAS_MES} = ${liqR(c.semana)} × ${LIQ_SEMANAS_MES}` };
  if (m === "hora") return { mensual: liqR((+c.valorHora || 0) * (+c.horasSemana || 0) * LIQ_SEMANAS_MES), formula: `valor hora × horas por semana × ${LIQ_SEMANAS_MES} = ${liqR(c.valorHora)} × ${+c.horasSemana || 0} × ${LIQ_SEMANAS_MES}` };
  return { mensual: liqR(c.salarioMensual), formula: "salario mensual" };
}

// Cálculo completo. Devuelve cada parte con sus pasos.
function liqCalcularCaso(c) {
  const adv = [];
  // 1) Tiempo laborado
  let ant, ing = null, sal = null;
  if (c.tiempoModo === "directo") ant = { anios: +c.anios || 0, meses: +c.meses || 0, dias: +c.dias || 0 };
  else {
    ing = liqFecha(c.fechaIngreso); sal = liqFecha(c.fechaSalida);
    if (!ing || !sal) return { error: "Escriba la fecha de ingreso y la de salida." };
    if (sal < ing) return { error: "La fecha de salida debe ser igual o posterior a la de ingreso." };
    ant = liqAntig(ing, sal);
  }
  const mesesTot = ant.anios * 12 + ant.meses + ant.dias / 30;

  // 2) Salarios: promedio de los últimos 6 meses (preaviso y cesantía) y de 12 (vacaciones)
  let prom6, prom12, usados6 = 0, usados12 = 0, formulaMensual = "";
  c = liqNormalizarCaso({ ...c });
  if (c.salarioModo === "meses" && c.tiempoModo !== "fechas") c.salarioModo = "mensual";
  const auto = c.salarioModo === "meses" ? liqMesesAuto(c) : [];
  const filas = auto.map(x => ({ mes: x.mes, dias: x.dias, total: liqR(x.ordinario + x.extra), incap: x.incap }));
  if (c.salarioModo === "meses") {
    // Promedio = total devengado ÷ meses laborados; un mes incompleto cuenta por sus días ÷ 30.
    const utiles = filas.filter(x => !x.incap && x.dias > 0);
    if (filas.some(x => x.incap)) adv.push("Los meses con incapacidad se excluyen del promedio y del aguinaldo (el subsidio no es salario).");
    const prom = L => { const m = L.reduce((s, x) => s + x.dias, 0) / 30; return m ? liqR(L.reduce((s, x) => s + x.total, 0) / m) : 0; };
    const u6 = utiles.slice(-6); usados6 = liqR(u6.reduce((s, x) => s + x.dias, 0) / 30); usados12 = liqR(utiles.reduce((s, x) => s + x.dias, 0) / 30);
    prom6 = prom(u6); prom12 = prom(utiles);
    formulaMensual = `total devengado en los últimos 6 meses ÷ ${String(usados6).replace(".", ",")} meses laborados`;
  } else {
    const r = liqMensualDe(c); prom6 = prom12 = r.mensual; formulaMensual = r.formula; usados6 = usados12 = 0;
  }
  const divCes = c.salarioModo === "semanal" && c.actividad === "no_comercial" ? 26 : 30;
  const diario = liqR(prom6 / 30), diarioCes = liqR(prom6 / divCes), diarioVac = liqR(prom12 / 30);

  // 3) Preaviso (art. 28)
  let pLegal = 0; if (mesesTot >= 12) pLegal = 30; else if (mesesTot >= 6) pLegal = 15; else if (mesesTot >= 3) pLegal = 7;
  const pagaPre = c.motivo === "despido_responsabilidad";
  const lab = c.preavisoEstado === "completo" ? pLegal : c.preavisoEstado === "parcial" ? Math.min(pLegal, Math.max(0, +c.preavisoDias || 0)) : 0;
  const pPagar = pagaPre ? Math.max(0, pLegal - lab) : 0;
  const preaviso = {
    aplica: pagaPre && pLegal > 0, diasLegales: pLegal, diasLaborados: lab, diasPagar: pPagar, promedio: prom6, diario, monto: liqR(pPagar * diario),
    tramo: mesesTot < 3 ? "Menos de 3 meses" : mesesTot < 6 ? "De 3 a menos de 6 meses" : mesesTot < 12 ? "De 6 meses a menos de 1 año" : "1 año o más"
  };
  if (c.motivo === "renuncia" && pLegal > 0) adv.push("En una renuncia el preaviso lo debe dar el trabajador: la empresa no lo paga ni puede rebajarlo de la liquidación.");

  // 4) Cesantía (art. 29)
  const pagaCes = c.motivo === "despido_responsabilidad" || c.motivo === "jubilacion_fallecimiento";
  let cDias = 0, cTarifa = null, cAnios = 0, cTramo = "Menos de 3 meses: no hay cesantía";
  if (mesesTot >= 3 && mesesTot < 6) { cDias = 7; cTramo = "De 3 a menos de 6 meses: 7 días"; }
  else if (mesesTot >= 6 && mesesTot < 12) { cDias = 14; cTramo = "De 6 meses a menos de 1 año: 14 días"; }
  else if (mesesTot >= 12) {
    const frac = ant.meses + ant.dias / 30;
    cAnios = ant.anios + (frac > 6 ? 1 : 0);
    cTarifa = LIQ_CES_TABLA[Math.min(cAnios, 13)];
    const ind = Math.min(cAnios, LIQ_CES_TOPE);
    cDias = liqR(cTarifa * ind);
    cTramo = `${cAnios} año(s) contados${frac > 6 ? " (la fracción de más de 6 meses cuenta como 1 año)" : ""} → ${String(cTarifa).replace(".", ",")} días por año × ${ind} año(s)${cAnios > LIQ_CES_TOPE ? " (tope de 8 años)" : ""}`;
  }
  const cesantia = { aplica: pagaCes && cDias > 0, aniosContados: cAnios, tarifa: cTarifa, dias: cDias, tramo: cTramo, promedio: prom6, divisor: divCes, diario: diarioCes, monto: pagaCes ? liqR(cDias * diarioCes) : 0 };

  // 5) Vacaciones (art. 153: 1 día por cada mes del período sin disfrutar)
  const mesesPeriodo = ant.anios >= 1 ? ant.meses + ant.dias / 30 : mesesTot;
  const acum = liqR(Math.min(12, mesesPeriodo) + (+c.vacAnteriores || 0));
  const disf = +c.vacDisfrutadas || 0, pend = Math.max(0, liqR(acum - disf));
  if (disf > acum) adv.push("Los días disfrutados superan los acumulados: no se rebaja de más.");
  const vacaciones = { mesesPeriodo: liqR(Math.min(12, mesesPeriodo)), anteriores: +c.vacAnteriores || 0, acumulados: acum, disfrutados: disf, pendientes: pend, promedio: prom12, diario: diarioVac, monto: liqR(pend * diarioVac) };

  // 6) Aguinaldo (Ley 2412): lo devengado del 1 de diciembre al 30 de noviembre ÷ 12
  let agTotal = 0, agMeses = 0, agPeriodo = "";
  if (c.tiempoModo === "directo") {
    agMeses = Math.min(12, +c.mesesAguinaldo || 0);
    agTotal = liqR(prom6 * agMeses);
    agPeriodo = `${agMeses} mes(es) desde el 1 de diciembre`;
  } else {
    const aY = sal.getUTCMonth() === 11 ? sal.getUTCFullYear() : sal.getUTCFullYear() - 1;
    const desde = new Date(Math.max(ing.getTime(), Date.UTC(aY, 11, 1)));
    const a = liqAntig(desde, sal); agMeses = liqR(Math.min(12, a.anios * 12 + a.meses + a.dias / 30));
    agPeriodo = `${liqIsoF(desde)} al ${c.fechaSalida}`;
    if (c.salarioModo === "meses") { const dm = liqIsoF(desde).slice(0, 7); const sel = filas.filter(x => x.mes >= dm && !x.incap); agTotal = liqR(sel.reduce((s, x) => s + x.total, 0)); }
    else agTotal = liqR(prom6 * agMeses);
  }
  const aguinaldo = { periodo: agPeriodo, meses: agMeses, totalDevengado: agTotal, monto: liqR(agTotal / 12) };

  const total = liqR((preaviso.aplica ? preaviso.monto : 0) + (cesantia.aplica ? cesantia.monto : 0) + vacaciones.monto + aguinaldo.monto);
  return { antiguedad: { ...ant, mesesTotales: liqR(mesesTot) }, salario: { modo: c.salarioModo, meses: auto, total12: liqR(filas.filter(x => !x.incap).reduce((t, x) => t + x.total, 0)), formulaMensual, promedio6: prom6, promedio12: prom12, usados6, usados12, diario, diarioCes, diarioVac, divCes }, preaviso, cesantia, vacaciones, aguinaldo, total, advertencias: adv };
}

// Pasos que el estudiante llena en la práctica (cada uno se revisa solo).
// tipo "dias" acepta ±0,01; "monto" acepta ±1 colón o 0,05 % (por redondeos).
function liqPasosPractica(R) {
  const p = R.preaviso, c = R.cesantia, v = R.vacaciones, a = R.aguinaldo;
  const s = R.salario;
  return {
    salario: s.modo === "meses" ? [
      { k: "sal_total12", et: "Total devengado en los últimos 12 meses (sin los meses de incapacidad)", tipo: "monto", ok: s.total12, ayuda: "Cada mes: salario mensual ÷ 30 × días laborados, más las horas extra o comisiones." },
      { k: "sal_prom6", et: "Salario promedio mensual de los últimos 6 meses", tipo: "monto", ok: s.promedio6, ayuda: "Total de los últimos 6 meses ÷ meses laborados (un mes incompleto cuenta por sus días ÷ 30)." },
      { k: "sal_prom12", et: "Salario promedio mensual de los últimos 12 meses", tipo: "monto", ok: s.promedio12 },
      { k: "sal_diario", et: "Salario diario (promedio de 6 meses ÷ 30)", tipo: "monto", ok: s.diario }
    ] : [
      { k: "sal_prom6", et: "Salario promedio mensual", tipo: "monto", ok: s.promedio6 },
      { k: "sal_diario", et: "Salario diario (promedio ÷ 30)", tipo: "monto", ok: s.diario }
    ],
    preaviso: [
      { k: "pre_dias_legales", et: "Días de preaviso según el tiempo laborado", tipo: "dias", ok: p.diasLegales },
      { k: "pre_dias_pagar", et: "Días de preaviso a pagar", tipo: "dias", ok: p.aplica ? p.diasPagar : 0, ayuda: "Solo se paga en despido con responsabilidad patronal; se rebajan los días que sí trabajó." },
      { k: "pre_promedio", et: "Salario promedio mensual (últimos 6 meses)", tipo: "monto", ok: p.promedio },
      { k: "pre_diario", et: "Salario diario (promedio ÷ 30)", tipo: "monto", ok: p.diario },
      { k: "pre_monto", et: "Monto del preaviso", tipo: "monto", ok: p.aplica ? p.monto : 0 }
    ],
    cesantia: [
      { k: "ces_dias", et: "Días de cesantía", tipo: "dias", ok: c.aplica ? c.dias : 0, ayuda: "Si no corresponde por el motivo de salida, escriba 0." },
      { k: "ces_diario", et: `Salario diario para cesantía (promedio ÷ ${c.divisor})`, tipo: "monto", ok: c.diario },
      { k: "ces_monto", et: "Monto de la cesantía", tipo: "monto", ok: c.aplica ? c.monto : 0 }
    ],
    vacaciones: [
      { k: "vac_acum", et: "Días de vacaciones acumulados", tipo: "dias", ok: v.acumulados },
      { k: "vac_pend", et: "Días pendientes de disfrutar", tipo: "dias", ok: v.pendientes },
      { k: "vac_diario", et: "Salario diario para vacaciones", tipo: "monto", ok: v.diario },
      { k: "vac_monto", et: "Monto de las vacaciones", tipo: "monto", ok: v.monto }
    ],
    aguinaldo: [
      { k: "ag_total", et: "Salarios devengados del 1 de diciembre a la salida", tipo: "monto", ok: a.totalDevengado },
      { k: "ag_monto", et: "Monto del aguinaldo (total ÷ 12)", tipo: "monto", ok: a.monto }
    ]
  };
}
const liqNumero = v => { const s = String(v == null ? "" : v).trim().replace(/[₡\s]/g, ""); if (!s) return null; const n = Number(s.includes(",") && !s.includes(".") ? s.replace(",", ".") : s.replace(/,/g, "")); return isFinite(n) ? n : null; };
function liqRevisarPaso(paso, valor) {
  const n = liqNumero(valor); if (n === null) return null;
  const tol = paso.tipo === "dias" ? 0.011 : Math.max(1, Math.abs(paso.ok) * 0.0005);
  return Math.abs(n - paso.ok) <= tol;
}

// Caso aleatorio de práctica.
function liqCasoAleatorio() {
  const r = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const hoy = new Date(), salida = new Date(Date.UTC(hoy.getUTCFullYear(), r(0, 10), r(1, 28)));
  const totalMeses = [r(4, 5), r(7, 11), r(13, 30), r(31, 70), r(80, 130)][r(0, 4)];
  const ingreso = new Date(Date.UTC(salida.getUTCFullYear(), salida.getUTCMonth() - totalMeses, r(1, 28)));
  const modo = ["mensual", "meses"][r(0, 1)];
  const base = r(38, 95) * 10000;
  const nombres = ["Ana Vargas", "Luis Mora", "Karla Solís", "José Rojas", "María Jiménez", "Diego Castro", "Sofía Araya", "Andrés Quesada"];
  const c = { trabajador: nombres[r(0, nombres.length - 1)], tiempoModo: "fechas", fechaIngreso: liqIsoF(ingreso), fechaSalida: liqIsoF(salida),
    motivo: ["despido_responsabilidad", "despido_responsabilidad", "renuncia", "despido_justa_causa"][r(0, 3)], preavisoEstado: ["no", "no", "parcial", "completo"][r(0, 3)], preavisoDias: r(2, 6),
    salarioModo: modo, salarioMensual: base, quincena: Math.round(base / 2), semana: Math.round(base / LIQ_SEMANAS_MES), actividad: r(0, 1) ? "comercial" : "no_comercial",
    valorHora: Math.round(base / (48 * LIQ_SEMANAS_MES)), horasSemana: 48, vacDisfrutadas: r(0, 3), vacAnteriores: 0, salarios: [] };
  c.salarios = liqMeses12(c.fechaSalida).map(mes => ({ mes, extra: r(0, 2) ? 0 : r(1, 6) * 5000, incap: false }));
  return c;
}
function liqCasoVacio() {
  const hoy = new Date().toISOString().slice(0, 10);
  return { trabajador: "", tiempoModo: "fechas", fechaIngreso: "", fechaSalida: hoy, anios: 0, meses: 0, dias: 0, mesesAguinaldo: 0, motivo: "despido_responsabilidad", preavisoEstado: "no", preavisoDias: 0,
    salarioModo: "mensual", salarioMensual: 0, quincena: 0, semana: 0, actividad: "comercial", valorHora: 0, horasSemana: 48, vacDisfrutadas: 0, vacAnteriores: 0,
    salarios: liqMeses12(hoy).map(mes => ({ mes, ordinario: 0, extra: 0, incap: false })) };
}

// ───── Asiento contable de la liquidación ─────
// Mismas cuentas del catálogo de Aula de Conta. Si la empresa provisionó
// (aguinaldo, vacaciones y cesantía) se carga la provisión (pasivo); si no,
// el gasto. Las vacaciones son salario: se les rebaja la cuota obrera
// (CCSS: SEM 5,50 % + IVM 4,33 % · Banco Popular 1 %). Preaviso, cesantía y
// aguinaldo no pagan cargas sociales.
const LIQ_CTAS = {
  "1102": "Bancos", "2107": "CCSS por pagar", "2108": "Banco Popular por pagar",
  "2111": "Provisión para aguinaldo", "2112": "Provisión para vacaciones", "2113": "Provisión para cesantía",
  "6108": "Gasto por aguinaldo", "6109": "Gasto por vacaciones", "6110": "Gasto por cesantía", "6111": "Gasto por preaviso"
};
function liqAsientoDe(R, op) {
  op = { provisiones: true, pctCcss: 9.83, pctBp: 1, ...(op || {}) };
  const pre = R.preaviso.aplica ? R.preaviso.monto : 0, ces = R.cesantia.aplica ? R.cesantia.monto : 0;
  const vac = R.vacaciones.monto, agu = R.aguinaldo.monto;
  const ccss = liqR(vac * op.pctCcss / 100), bp = liqR(vac * op.pctBp / 100);
  const L = [];
  if (pre > 0) L.push({ cod: "6111", debe: pre });
  if (ces > 0) L.push({ cod: op.provisiones ? "2113" : "6110", debe: ces });
  if (vac > 0) L.push({ cod: op.provisiones ? "2112" : "6109", debe: vac });
  if (agu > 0) L.push({ cod: op.provisiones ? "2111" : "6108", debe: agu });
  if (ccss > 0) L.push({ cod: "2107", haber: ccss });
  if (bp > 0) L.push({ cod: "2108", haber: bp });
  const totalDebe = liqR(L.reduce((s, x) => s + (x.debe || 0), 0));
  L.push({ cod: "1102", haber: liqR(totalDebe - ccss - bp) });
  return { lineas: L.map(x => ({ ...x, cuenta: LIQ_CTAS[x.cod] })), totalDebe, totalHaber: totalDebe, retenciones: liqR(ccss + bp), neto: liqR(totalDebe - ccss - bp) };
}
// Suma los asientos de varios empleados por cuenta (asiento de la empresa).
function liqAsientoTotal(asientos) {
  const por = {};
  asientos.forEach(a => a.lineas.forEach(l => { const k = l.cod + (l.debe ? "D" : "H"); por[k] = por[k] || { cod: l.cod, cuenta: l.cuenta, debe: 0, haber: 0 }; por[k].debe = liqR(por[k].debe + (l.debe || 0)); por[k].haber = liqR(por[k].haber + (l.haber || 0)); }));
  const lineas = Object.values(por).sort((a, b) => (b.debe > 0) - (a.debe > 0) || (a.cod === "1102") - (b.cod === "1102") || a.cod.localeCompare(b.cod)).map(l => l.debe ? { cod: l.cod, cuenta: l.cuenta, debe: l.debe } : { cod: l.cod, cuenta: l.cuenta, haber: l.haber });
  const t = liqR(lineas.reduce((s, x) => s + (x.debe || 0), 0));
  return { lineas, totalDebe: t, totalHaber: liqR(lineas.reduce((s, x) => s + (x.haber || 0), 0)) };
}

// Convierte un empleado que propone la IA en un caso válido para el motor.
function liqCasoDesdeIA(e) {
  const c = liqCasoVacio();
  const num = v => { const n = Number(v); return isFinite(n) && n >= 0 ? n : 0; };
  c.trabajador = String(e.nombre || "").slice(0, 80);
  c.tiempoModo = "fechas"; c.fechaIngreso = String(e.fecha_ingreso || "").slice(0, 10); c.fechaSalida = String(e.fecha_salida || "").slice(0, 10);
  c.motivo = LIQ_MOTIVOS.some(m => m[0] === e.motivo) ? e.motivo : "despido_responsabilidad";
  c.preavisoEstado = ["no", "parcial", "completo"].includes(e.preaviso_trabajado) ? e.preaviso_trabajado : "no";
  c.preavisoDias = num(e.preaviso_dias);
  c.salarioModo = LIQ_SALARIO_MODOS.some(m => m[0] === e.forma_pago) ? e.forma_pago : "mensual";
  c.salarioMensual = num(e.salario_mensual); c.quincena = num(e.quincena); c.semana = num(e.salario_semanal);
  c.actividad = e.actividad === "no_comercial" ? "no_comercial" : "comercial";
  c.valorHora = num(e.valor_hora); c.horasSemana = num(e.horas_semana) || 48;
  c.vacDisfrutadas = num(e.vacaciones_disfrutadas); c.vacAnteriores = num(e.vacaciones_anteriores);
  const meses = liqMeses12(c.fechaSalida);
  const lista = Array.isArray(e.salarios_12_meses) ? e.salarios_12_meses : [];
  c.salarios = meses.map((mes, i) => { const x = lista[i] || {}; return { mes, extra: num(x.extra), incap: !!x.incapacidad }; });
  if (c.salarioModo === "meses" && !c.salarioMensual) c.salarioMensual = Math.max(0, ...lista.map(x => num(x && x.ordinario != null ? x.ordinario : x)));
  return liqNormalizarCaso(c);
}
