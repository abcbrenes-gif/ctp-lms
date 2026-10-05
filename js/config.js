// Conexión a la base de datos (Supabase).
// La "publishable key" es segura para usar en el navegador: no da acceso
// administrativo, solo lo que las políticas de la base de datos permitan.
const SUPABASE_URL = "https://dyulfowcvvmdmwbjhubq.supabase.co";
const SUPABASE_KEY = "sb_publishable_WXHTshzfy4vMITGIHbfY3g_ra1U3mBd";

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const INSTITUCION = {
  nombre: "CTP Mercedes Norte",
  especialidad: "Contabilidad"
};
