// ¿Ya se abrió lo de 2027 a los estudiantes? Se abre solo el 1 de febrero de 2027 (hora de
// Costa Rica) o antes, si el docente lo activa en 📅 2027 → Secciones (plan_2027.abierto_estudiantes).
// No depende de supabase-js: algunas páginas no lo cargan.
async function abierto2027() {
  try { if (new Date().toLocaleDateString("sv-SE", { timeZone: "America/Costa_Rica" }) >= "2027-02-01") return true; } catch (e) { }
  try {
    const K = "sb_publishable_WXHTshzfy4vMITGIHbfY3g_ra1U3mBd";
    const r = await fetch("https://dyulfowcvvmdmwbjhubq.supabase.co/rest/v1/trabajos_cotidianos?select=contenido_actividad&contenido_actividad->>estrategia=eq.plan_2027&order=id.asc&limit=1", { headers: { apikey: K, Authorization: "Bearer " + K } });
    const d = await r.json();
    return !!(((d || [])[0] || {}).contenido_actividad || {}).abierto_estudiantes;
  } catch (e) { return false; }
}
