// Lógica de las pruebas analíticas (estilo CAATs). Cada función recibe los datos y
// devuelve { ids: Set de filas con excepción, casos, monto, condicion }.
import { TOPE } from "./datos.js";

export const col = n => "₡" + Math.round(n).toLocaleString("es-CR").replace(/[., ]/g, " ");
const fuera = s => { const d = new Date(s.replace(" ", "T")); const h = d.getHours(), w = d.getDay(); return h < 6 || h >= 19 || w === 0 || w === 6; };
const grupos = (filas, clave) => { const m = new Map(); filas.forEach(f => { const k = clave(f); if (!m.has(k)) m.set(k, []); m.get(k).push(f); }); return [...m.values()]; };
const suma = (L, k) => L.reduce((t, x) => t + x[k], 0);
const res = (L, idk, mk, condicion) => ({ ids: new Set(L.map(x => x[idk])), casos: L.length, monto: mk ? suma(L, mk) : 0, condicion: L.length ? condicion(L) : "" });

export function correr(id, datos, param) {
  switch (id) {
    case "pl-dup": { const g = grupos(datos, f => f.cod + "|" + f.periodo).filter(x => x.length > 1), todos = g.flat(), rep = g.flatMap(x => x.slice(1));
      return { ...res(todos, "id", null, () => `${rep.length} pagos repetidos al mismo funcionario en el mismo período, por ${col(suma(rep, "neto"))} netos.`), casos: rep.length, monto: suma(rep, "neto") }; }
    case "pl-ex": { const L = datos.filter(f => f.salida && f.periodo > f.salida.slice(0, 7));
      return res(L, "id", "neto", L => `${L.length} pagos a ${new Set(L.map(x => x.cod)).size} personas después de su fecha de salida, por ${col(suma(L, "neto"))} netos.`); }
    case "pl-ext": { const L = datos.filter(f => f.horas > param);
      return res(L, "id", "extra", L => `${L.length} pagos con más de ${param} horas extra en el mes (hasta ${Math.max(...L.map(x => x.horas))} horas), por ${col(suma(L, "extra"))} en extras.`); }
    case "pl-hor": { const L = datos.filter(f => fuera(f.registro));
      return res(L, "id", null, L => `${L.length} registros de planilla digitados de noche o en fin de semana por ${[...new Set(L.map(x => x.usuario))].join(", ")}.`); }
    case "co-dup": { const g = grupos(datos, f => f.proveedor + "|" + f.factura + "|" + f.monto).filter(x => x.length > 1), todos = g.flat(), rep = g.flatMap(x => x.slice(1));
      return { ...res(todos, "oc", null, () => `${rep.length} facturas registradas dos veces (mismo proveedor, número y monto), por ${col(suma(rep, "monto"))}.`), casos: rep.length, monto: suma(rep, "monto") }; }
    case "co-fra": { const dia = s => Date.parse(s) / 864e5, out = [];
      grupos(datos.filter(f => f.monto <= TOPE), f => f.proveedor + "|" + f.depto).forEach(g => { g = g.slice().sort((a, b) => a.fecha < b.fecha ? -1 : 1); let i = 0;
        while (i < g.length) { const w = g.filter(x => dia(x.fecha) >= dia(g[i].fecha) && dia(x.fecha) <= dia(g[i].fecha) + 7);
          if (w.length > 1 && suma(w, "monto") > TOPE && new Set(w.map(x => x.factura)).size === w.length) { out.push(w); i += w.length; } else i++; } });
      const L = out.flat();
      return { ...res(L, "oc", "monto", () => `${out.length} grupos de órdenes (${L.length} órdenes, ${col(suma(L, "monto"))}) al mismo proveedor y departamento que, sumadas en 7 días o menos, superan el tope de ${col(TOPE)}: ${out.map(w => w[0].proveedor.replace(/\.$/, "")).join(" y ")}.`), casos: out.length }; }
    case "co-top": { const L = datos.filter(f => f.monto >= TOPE * 0.95 && f.monto <= TOPE);
      return res(L, "oc", "monto", L => `${L.length} órdenes entre 95 % y 100 % del tope de ${col(TOPE)}, por ${col(suma(L, "monto"))}.`); }
    case "co-seg": { const L = datos.filter(f => f.registra === f.aprueba);
      return res(L, "oc", "monto", L => `${L.length} órdenes por ${col(suma(L, "monto"))} registradas y aprobadas por el mismo usuario.`); }
    case "co-hor": { const L = datos.filter(f => fuera(f.registro));
      return res(L, "oc", "monto", L => `${L.length} órdenes por ${col(suma(L, "monto"))} registradas de noche o en fin de semana por ${[...new Set(L.map(x => x.registra))].join(", ")}.`); }
  }
  return { ids: new Set(), casos: 0, monto: 0, condicion: "" };
}

export const nivel = s => s >= 20 ? { n: "Crítico", c: "bg-red-500 text-white", f: "bg-red-200 dark:bg-red-900/60" } : s >= 12 ? { n: "Alto", c: "bg-orange-500 text-white", f: "bg-orange-200 dark:bg-orange-900/50" }
  : s >= 6 ? { n: "Medio", c: "bg-amber-300 text-slate-900", f: "bg-amber-100 dark:bg-amber-900/30" } : { n: "Bajo", c: "bg-emerald-500 text-white", f: "bg-emerald-100 dark:bg-emerald-900/30" };
