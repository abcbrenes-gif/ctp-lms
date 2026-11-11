// Enrutador único de funciones de IA (el plan de Vercel permite máximo 12
// funciones serverless). Las rutas de siempre siguen funcionando gracias a las
// reglas de vercel.json: /api/<nombre> → /api/ia?fn=<nombre>.
const FN = {
  "redactar-instruccion-examen": require("../lib/redactar-instruccion-examen.js"),
  "planear-examen": require("../lib/planear-examen.js"),
  "generar-examen-ia": require("../lib/generar-examen-ia.js"),
  "revisar-ley-infografia": require("../lib/revisar-ley-infografia.js"),
  "plan-practica-ia": require("../lib/plan-practica-ia.js")
};
module.exports = async (req, res) => {
  const fn = String((req.query && req.query.fn) || "");
  const h = FN[fn];
  if (!h) { res.status(404).json({ error: "Función no encontrada: " + fn }); return; }
  return h(req, res);
};
module.exports.config = { maxDuration: 300 };
