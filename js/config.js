// Conexión a la base de datos (Supabase).
// La "publishable key" es segura para usar en el navegador: no da acceso
// administrativo, solo lo que las políticas de la base de datos permitan.
const SUPABASE_URL = "https://dyulfowcvvmdmwbjhubq.supabase.co";
const SUPABASE_KEY = "sb_publishable_WXHTshzfy4vMITGIHbfY3g_ra1U3mBd";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Exámenes para estudiantes: interruptor general (cerrados por pedido del docente, 11-11-2026).
//  · false: los estudiantes no ven «Exámenes» en el menú, la página no les muestra nada y el
//    «modo examen» (js/volver-plataforma.js) queda apagado.
//  · true: ven sus exámenes publicados y, mientras tengan uno abierto, la plataforma solo les
//    muestra el examen.
const EXAMENES_ABIERTOS = false;

const INSTITUCION = {
  nombre: "CTP Mercedes Norte",
  especialidad: "Contabilidad"
};
