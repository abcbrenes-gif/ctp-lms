// Función de IA del Taller del Ciclo Contable: inventa una empresa comercial
// costarricense y las facturas electrónicas de un mes (ventas, compras y
// gastos) con todas las variables del mercado: IVA 13 %, 4 %, 2 %, 1 % y
// exento, descuentos, flete, contado o crédito, medio de pago y compras en
// dólares. La IA SOLO da los datos de las facturas: los totales, los asientos y
// la solución los calcula la plataforma, para que nunca dependan de la IA.
const corto = (v, n) => String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, n);
function extraerJson(t) {
  let s = String(t || "").trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a !== -1 && b > a) s = s.slice(a, b + 1);
  return JSON.parse(s);
}
const num = (v, a, b, d) => { const x = Number(v); return isFinite(x) ? Math.min(b, Math.max(a, x)) : d; };
const TARIFAS = [13, 4, 2, 1, 0];
const GASTOS = ["alquiler", "servicios", "publicidad", "mantenimiento", "papeleria"];
const MEDIOS = ["efectivo", "transferencia", "tarjeta", "sinpe"];
const CENTROS = ["ADM", "VEN", "BOD", "FIN"];

// Limpia lo que devuelve la IA para que siempre sea un caso válido.
function limpiar(j, n) {
  const e = j && j.empresa || {};
  const empresa = { nombre: corto(e.nombre, 70) || "Comercial La Esquina S.A.", cedula: corto(e.cedula || e.cedula_juridica, 20) || "3-101-000000", actividad: corto(e.actividad, 90) || "Venta de mercadería al por menor", provincia: corto(e.provincia, 30) || "Heredia" };
  let F = (Array.isArray(j && j.facturas) ? j.facturas : []).slice(0, 14).map(f => {
    const tipo = ["venta", "compra", "gasto"].includes(f.tipo) ? f.tipo : "venta";
    const moneda = tipo === "compra" && String(f.moneda).toUpperCase() === "USD" ? "USD" : "CRC";
    const lineas = (Array.isArray(f.lineas) ? f.lineas : []).slice(0, 6).map(l => {
      let t = Number(l.tarifa_iva); if (!TARIFAS.includes(t)) t = 13; if (l.exento === true) t = 0; if (moneda === "USD") t = 0;
      return {
        cabys: String(l.cabys || "").replace(/\D/g, "").slice(0, 13).padEnd(13, "0"),
        detalle: corto(l.detalle, 70) || "Mercadería", unidad: corto(l.unidad, 8) || "Unid",
        cantidad: Math.round(num(l.cantidad, 1, 500, 1)),
        precio: moneda === "USD" ? Math.round(num(l.precio_unitario, 0.01, 20000, 10) * 100) / 100 : Math.round(num(l.precio_unitario, 100, 3000000, 1000)),
        desc_pct: Math.round(num(l.descuento_pct, 0, 25, 0)), tarifa: t
      };
    });
    if (!lineas.length) return null;
    return {
      tipo, dia: Math.round(num(f.dia, 2, 28, 10)), moneda,
      tipo_cambio: moneda === "USD" ? Math.round(num(f.tipo_cambio, 480, 560, 510) * 100) / 100 : null,
      contraparte: { nombre: corto(f.contraparte && f.contraparte.nombre, 70) || (tipo === "venta" ? "Cliente de contado" : "Proveedor S.A."), cedula: corto(f.contraparte && f.contraparte.cedula, 20) || "3-101-111111" },
      condicion: f.condicion === "credito" ? "credito" : "contado", plazo: f.condicion === "credito" ? Math.round(num(f.plazo_dias, 8, 90, 30)) : 0,
      medio: MEDIOS.includes(f.medio) ? f.medio : "transferencia",
      gasto: tipo === "gasto" ? (GASTOS.includes(f.gasto) ? f.gasto : "servicios") : null,
      centro: CENTROS.includes(f.centro) ? f.centro : (tipo === "venta" ? "VEN" : "ADM"),
      flete: tipo === "compra" ? Math.round(num(f.flete, 0, 500000, 0) * (moneda === "USD" ? 100 : 1)) / (moneda === "USD" ? 100 : 1) : 0,
      costo_pct: tipo === "venta" ? Math.round(num(f.costo_pct, 0.45, 0.8, 0.6) * 100) / 100 : null,
      lineas
    };
  }).filter(Boolean);
  // A lo sumo una compra en dólares; ninguna venta en dólares.
  let usd = 0; F.forEach(f => { if (f.moneda === "USD" && ++usd > 1) { f.moneda = "CRC"; f.tipo_cambio = null; f.lineas.forEach(l => { l.precio = Math.round(l.precio * 500); l.tarifa = 13; }); } });
  F.sort((a, b) => a.dia - b.dia);
  return { empresa, facturas: F.slice(0, n) };
}

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.status(405).json({ error: "Método no permitido." }); return; }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.status(500).json({ error: "Falta configurar ANTHROPIC_API_KEY en Vercel." }); return; }
  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch { b = {}; } }
  b = b || {};
  const n = Math.round(num(b.n, 6, 12, 8));
  const prompt = `Sos docente de Contabilidad de un colegio técnico de Costa Rica. Inventá una EMPRESA COMERCIAL costarricense (sociedad anónima) y las FACTURAS ELECTRÓNICAS de un mes de operaciones (marzo de 2027) para que estudiantes de décimo año registren los asientos.
Giro o tema pedido: ${corto(b.giro, 120) || "libre (tienda, ferretería, farmacia, supermercado, librería, etc.)"}
Cantidad de facturas: exactamente ${n}.
${b.indicaciones ? "Indicaciones del docente: " + corto(b.indicaciones, 600) : ""}

REGLAS
1. Mezclá tipos: al menos ${Math.max(2, Math.round(n * 0.4))} ventas, al menos 2 compras de mercadería y al menos 1 gasto con factura (alquiler, servicios, publicidad, mantenimiento o papeleria).
2. Usá TODAS las variables del mercado costarricense, repartidas entre las facturas:
   - tarifas de IVA: 13 % (general), 4 % (p. ej. servicios de salud privados), 2 % (p. ej. medicamentos, servicios de educación privada), 1 % (canasta básica tributaria, insumos agropecuarios) y 0 = exento; que haya líneas de al menos tres tarifas distintas y alguna exenta;
   - descuentos comerciales por línea (descuento_pct entre 0 y 20) en algunas facturas;
   - flete en alguna compra (monto del transporte facturado por el proveedor);
   - condición de venta contado y crédito (con plazo en días);
   - medios de pago: efectivo, transferencia, tarjeta y sinpe;
   - exactamente UNA compra a un proveedor del exterior en dólares (moneda "USD", con tipo_cambio entre 500 y 540, sin IVA porque el IVA de importación se paga en aduana);
   - centro de costo: ventas → "VEN"; gastos → "ADM", "VEN", "BOD" o "FIN" según corresponda.
3. Productos, precios y cantidades realistas para el giro, en colones (las de dólares en dólares). Códigos CABYS de 13 dígitos verosímiles. Nombres y cédulas de clientes y proveedores inventados (no uses personas reales).
4. En cada venta indicá costo_pct: proporción del precio neto que es costo de la mercadería (0,45 a 0,8).
5. Días del mes entre 2 y 28, en orden.

Respondé SOLO con JSON válido, sin texto adicional, con esta forma:
{"empresa":{"nombre":"","cedula":"3-101-XXXXXX","actividad":"","provincia":""},
 "facturas":[{"tipo":"venta|compra|gasto","dia":5,"contraparte":{"nombre":"","cedula":""},"condicion":"contado|credito","plazo_dias":30,"medio":"efectivo|transferencia|tarjeta|sinpe","moneda":"CRC|USD","tipo_cambio":null,"gasto":"alquiler|servicios|publicidad|mantenimiento|papeleria|null","centro":"VEN","flete":0,"costo_pct":0.6,
   "lineas":[{"cabys":"0000000000000","detalle":"","unidad":"Unid","cantidad":1,"precio_unitario":1000,"descuento_pct":0,"tarifa_iva":13}]}]}`;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-5-5", max_tokens: 8000, messages: [{ role: "user", content: prompt }] })
    });
    const d = await r.json();
    if (!r.ok) {
      const msg = (d && d.error && d.error.message) || "Error de la IA.";
      res.status(r.status === 429 || r.status >= 500 ? 503 : 502).json({ error: msg, reintentar: r.status === 429 || r.status >= 500 }); return;
    }
    const texto = (d.content || []).map(x => x.text || "").join("");
    let j; try { j = extraerJson(texto); } catch (e) { res.status(502).json({ error: "La IA no devolvió un JSON válido. Intente de nuevo.", reintentar: true }); return; }
    const caso = limpiar(j, n);
    if (caso.facturas.length < 4) { res.status(502).json({ error: "La IA devolvió muy pocas facturas. Intente de nuevo.", reintentar: true }); return; }
    res.status(200).json(caso);
  } catch (e) {
    res.status(500).json({ error: "No se pudo conectar con la IA: " + (e.message || e), reintentar: true });
  }
};
module.exports.limpiar = limpiar;
