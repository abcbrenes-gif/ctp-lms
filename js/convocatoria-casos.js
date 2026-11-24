// Cálculos de caja chica, conciliación bancaria e inventarios (PEPS, UEPS, Promedio Ponderado)
// para las prácticas de convocatoria y el solucionario del docente.
// Siguen la forma del folleto de clase: reintegro = Gastos Administrativos + Cuentas por Cobrar
// (vales) contra Bancos; faltante: Cuentas por Cobrar (responsable) contra Bancos; sobrante:
// Bancos contra Ingresos por Sobrantes; inventario perpetuo con capas (PEPS/UEPS) o promedio móvil.
(function () {
  const r2 = n => Math.round((+n || 0) * 100) / 100;
  const suma = (o) => Object.values(o || {}).reduce((a, b) => a + (+b || 0), 0);

  // ── Inventarios: movs = [{f, tipo:"E"|"S", u, c?}] ──
  function kardex(movs, metodo) {
    let capas = []; // [{u, c}] en orden de entrada
    const filas = [], ventas = [];
    let prom = 0;
    for (const m of movs) {
      if (m.tipo === "E") {
        if (metodo === "PP") {
          const uAnt = capas.reduce((a, x) => a + x.u, 0), vAnt = capas.reduce((a, x) => a + x.u * x.c, 0);
          const u = uAnt + m.u, v = vAnt + m.u * m.c; prom = v / u; capas = [{ u, c: prom }];
        } else capas.push({ u: m.u, c: m.c });
        filas.push({ f: m.f, ent: m.u, cEnt: m.c, capas: capas.map(x => ({ ...x })) });
      } else {
        let resta = m.u, costo = 0;
        if (metodo === "PP") { const c = capas[0]; costo = m.u * c.c; c.u -= m.u; }
        else {
          while (resta > 0 && capas.length) {
            const i = metodo === "PEPS" ? 0 : capas.length - 1, cap = capas[i], t = Math.min(resta, cap.u);
            costo += t * cap.c; cap.u -= t; resta -= t; if (!cap.u) capas.splice(i, 1);
          }
        }
        capas = capas.filter(x => x.u > 0);
        ventas.push({ f: m.f, u: m.u, costo: r2(costo) });
        filas.push({ f: m.f, sal: m.u, costoSal: r2(costo), capas: capas.map(x => ({ ...x })) });
      }
    }
    const uFin = capas.reduce((a, x) => a + x.u, 0), vFin = r2(capas.reduce((a, x) => a + x.u * x.c, 0));
    return { filas, ventas, uFin, vFin, costoVentas: r2(ventas.reduce((a, v) => a + v.costo, 0)) };
  }

  // ── Caja chica: pasos = [{f, op:"abrir"|"reintegro"|"aumento"|"disminucion"|"cierre", ...}] ──
  // reintegro: {gastos:{concepto:monto}, vales, efectivo, responsable}
  function cajaChica(pasos) {
    let fondo = 0; const asientos = [], revisiones = [];
    for (const p of pasos) {
      if (p.op === "existe") fondo = p.monto;
      if (p.op === "abrir") { fondo = p.monto; asientos.push({ f: p.f, n: "Apertura del Fondo Fijo de Caja Chica", lineas: [["Caja Chica", p.monto, 0], ["Bancos", 0, p.monto]] }); }
      if (p.op === "aumento") { fondo += p.monto; asientos.push({ f: p.f, n: "Aumento del Fondo Fijo de Caja Chica", lineas: [["Caja Chica", p.monto, 0], ["Bancos", 0, p.monto]] }); }
      if (p.op === "disminucion") { fondo -= p.monto; asientos.push({ f: p.f, n: "Disminución del Fondo Fijo de Caja Chica", lineas: [["Bancos", p.monto, 0], ["Caja Chica", 0, p.monto]] }); }
      if (p.op === "cierre") { asientos.push({ f: p.f, n: "Cierre del Fondo Fijo de Caja Chica", lineas: [["Bancos", fondo, 0], ["Caja Chica", 0, fondo]] }); fondo = 0; }
      if (p.op === "reintegro") {
        const g = r2(suma(p.gastos)), v = r2(p.vales || 0), tot = r2(g + v + p.efectivo), dif = r2(tot - fondo);
        const lin = [["Gastos Administrativos", g, 0]]; if (v) lin.push(["Cuentas por Cobrar Empleados", v, 0]); lin.push(["Bancos", 0, r2(g + v)]);
        asientos.push({ f: p.f, n: "Reintegro del Fondo Fijo de Caja Chica", detalle: p.gastos, lineas: lin });
        revisiones.push({ f: p.f, gastos: g, vales: v, efectivo: p.efectivo, total: tot, fondo, dif });
        if (dif < 0) asientos.push({ f: p.f, n: "Faltante del Fondo Fijo de Caja Chica", lineas: [["Cuentas por Cobrar " + (p.responsable || "Responsable"), -dif, 0], ["Bancos", 0, -dif]] });
        if (dif > 0) asientos.push({ f: p.f, n: "Sobrante del Fondo Fijo de Caja Chica", lineas: [["Bancos", dif, 0], ["Ingresos por Sobrantes", 0, dif]] });
      }
    }
    return { asientos, revisiones, fondoFinal: fondo };
  }

  // ── Conciliación de saldos ajustados ──
  // c = {banco, libros, transito:[], pendientes:[], errBancoMas:[], errBancoMenos:[], ncredito:[], ndebito:[], errLibrosMas:[], errLibrosMenos:[]} (listas de {t, m})
  function conciliacion(c) {
    const s = l => r2((l || []).reduce((a, x) => a + x.m, 0));
    const subB = r2(c.banco + s(c.transito) + s(c.errBancoMas)), realB = r2(subB - s(c.pendientes) - s(c.errBancoMenos));
    const subL = r2(c.libros + s(c.ncredito) + s(c.errLibrosMas)), realL = r2(subL - s(c.ndebito) - s(c.errLibrosMenos));
    return { subB, realB, subL, realL, cuadra: Math.abs(realB - realL) < 0.005 };
  }

  window.CONV_CALC = { kardex, cajaChica, conciliacion, r2 };
})();
