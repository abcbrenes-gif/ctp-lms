// --- Actividades interactivas (selección única, falso y verdadero, crucigrama,
// sopa de letras, infografía) para los trabajos cotidianos de un subtema. ---
//
// Cada actividad se guarda como una fila en "trabajos_cotidianos" con:
//   tipo_actividad: 'simple' | 'seleccion_unica' | 'falso_verdadero' | 'crucigrama' | 'sopa_letras' | 'infografia'
//   contenido_actividad: jsonb con las preguntas/palabras que define el profesor
//
// El resultado de cada estudiante se guarda en "actividades_estudiante"
// (respuestas, porcentaje, puntaje 0-3, completado, intentos_salida).
// El puntaje 0-3 también se escribe en "calificaciones_indicador" para que
// aparezca automáticamente en Rúbrica y Evaluaciones.

const NOMBRES_ACTIVIDAD = {
  simple: "Trabajo simple",
  seleccion_unica: "Selección única",
  falso_verdadero: "Falso y verdadero",
  crucigrama: "Crucigrama",
  sopa_letras: "Sopa de letras",
  infografia: "Infografía",
  prueba: "Prueba",
  lluvia_ideas: "Lluvia de ideas",
  proyecto: "Proyecto"
};

// Todas estas actividades, salvo la infografía, se hacen en modo "pantalla
// completa + aviso": no se puede impedir al 100% que el estudiante salga,
// pero si cambia de pestaña o sale de pantalla completa queda registrado.
const ACTIVIDADES_BLOQUEADAS = ["seleccion_unica", "falso_verdadero", "crucigrama", "sopa_letras", "prueba"];

// Tipos de actividad donde tiene sentido mostrarle al profesor, por
// estudiante, qué respondió frente a la respuesta correcta en cada
// pregunta (retroalimentación detallada), además de la nota.
const TIPOS_CON_RETRO = ["seleccion_unica", "falso_verdadero", "prueba"];

// Formatea una fecha/hora ISO al estilo "13 oct 2026, 2:30 p. m." en español.
function formatearFechaHora(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("es-CR", { dateStyle: "medium", timeStyle: "short" });
  } catch (e) {
    return iso;
  }
}

// Muestra las reglas/instrucciones de la Prueba ANTES de pedir los datos del
// estudiante y de empezar. Devuelve una Promise<boolean>: true si el
// estudiante le da "Entendido, continuar", false si cancela.
function mostrarReglasPrueba(trabajo) {
  const instrucciones = (trabajo.contenido_actividad && trabajo.contenido_actividad.instrucciones) || "";
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed; inset:0; background:rgba(15,23,42,0.75); z-index:9998; display:flex; align-items:center; justify-content:center; padding:1rem;";
    overlay.innerHTML = `
      <div style="background:#fff; border-radius:12px; padding:1.4rem; max-width:30rem; width:100%;">
        <h3 style="margin-bottom:0.3rem;">📝 ${trabajo.titulo || "Prueba"}</h3>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:0.8rem;">Antes de empezar, leé las reglas:</p>
        <ul style="font-size:0.85rem; margin:0 0 0.8rem 1.1rem; padding:0; display:grid; gap:0.4rem;">
          <li>Se abre en pantalla completa.</li>
          <li>No podés salir de la pantalla ni cambiar de pestaña — si lo hacés, queda registrado y tu profesor lo va a ver.</li>
          <li>Una vez que empezás, la prueba se guarda y no se puede volver a hacer.</li>
          <li>La nota se calcula automáticamente al terminar.</li>
        </ul>
        ${instrucciones ? `<div style="background:#FFF7E8; border:1px solid #E8C777; border-radius:8px; padding:0.7rem; font-size:0.85rem; margin-bottom:0.8rem; white-space:pre-wrap;">${instrucciones.replace(/[<>]/g, "")}</div>` : ""}
        <div class="row" style="margin-top:0.6rem; justify-content:flex-end; gap:0.5rem;">
          <button type="button" class="btn secondary small" id="rp-cancelar">Cancelar</button>
          <button type="button" class="btn small" id="rp-continuar">Entendido, continuar</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector("#rp-cancelar").addEventListener("click", () => { overlay.remove(); resolve(false); });
    overlay.querySelector("#rp-continuar").addEventListener("click", () => { overlay.remove(); resolve(true); });
  });
}

// Membrete institucional (estilo MEP) que se muestra antes de las preguntas
// de una Prueba, con los datos que ya conocemos de la actividad. Es solo
// informativo (de lectura), no editable.
function construirMembreteHTML(trabajo) {
  const hoy = new Date().toLocaleDateString("es-CR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const contenidoAct = trabajo.contenido_actividad || {};
  const puntosTotales = contenidoAct.puntosTotales
    || (contenidoAct.preguntas ? contenidoAct.preguntas.length : "—");
  return `
    <div style="border:1px solid #333; border-radius:4px; margin-bottom:1rem; font-size:0.78rem;">
      <div style="text-align:center; font-weight:700; padding:0.5rem 0.4rem 0.3rem; border-bottom:1px solid #333;">MINISTERIO DE EDUCACIÓN PÚBLICA</div>
      <div style="text-align:center; padding:0.3rem 0.4rem; border-bottom:1px solid #333;">Institución: <strong>Colegio Técnico Profesional Mercedes Norte</strong></div>
      <div style="display:grid; grid-template-columns:1fr 1fr;">
        <div style="padding:0.3rem 0.5rem; border-right:1px solid #333; border-bottom:1px solid #333;">Especialidad: Contabilidad</div>
        <div style="padding:0.3rem 0.5rem; border-bottom:1px solid #333;">Docente: Andrés Brenes Conejo</div>
        <div style="padding:0.3rem 0.5rem; border-right:1px solid #333; border-bottom:1px solid #333;">Prueba: ${(trabajo.titulo || "Prueba").replace(/[<>]/g, "")}</div>
        <div style="padding:0.3rem 0.5rem; border-bottom:1px solid #333;">Fecha: ${hoy}</div>
        <div style="padding:0.3rem 0.5rem; border-right:1px solid #333;">Puntos totales: ${puntosTotales}</div>
        <div style="padding:0.3rem 0.5rem;">Puntos obtenidos: se calcula al terminar</div>
      </div>
    </div>`;
}

// Pide los datos iniciales de un estudiante antes de empezar una Prueba
// (nombre completo, cédula, correo del MEP y correo del padre/encargado).
// Devuelve una Promise que resuelve con esos datos, o null si cancela.
function pedirDatosPrueba(trabajo) {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed; inset:0; background:rgba(15,23,42,0.75); z-index:9998; display:flex; align-items:center; justify-content:center; padding:1rem; overflow:auto;";
    overlay.innerHTML = `
      <div style="background:#fff; border-radius:12px; padding:1.4rem; max-width:28rem; width:100%;">
        ${construirMembreteHTML(trabajo || {})}
        <h3 style="margin-bottom:0.3rem;">Antes de empezar</h3>
        <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem;">Completá tus datos para esta prueba.</p>
        <div style="display:grid; gap:0.6rem;">
          <label style="font-size:0.82rem;">Nombre completo
            <input id="pd-nombre" style="width:100%; margin-top:0.2rem; box-sizing:border-box;" />
          </label>
          <label style="font-size:0.82rem;">Cédula
            <input id="pd-cedula" style="width:100%; margin-top:0.2rem; box-sizing:border-box;" />
          </label>
          <label style="font-size:0.82rem;">Correo electrónico del MEP
            <input id="pd-correo-mep" type="email" style="width:100%; margin-top:0.2rem; box-sizing:border-box;" />
          </label>
          <label style="font-size:0.82rem;">Correo electrónico del padre/encargado
            <input id="pd-correo-padre" type="email" style="width:100%; margin-top:0.2rem; box-sizing:border-box;" />
          </label>
          <label style="font-size:0.82rem;">Clave de la prueba (te la dio tu profesor)
            <input id="pd-clave-prueba" style="width:100%; margin-top:0.2rem; box-sizing:border-box; text-transform:uppercase; letter-spacing:0.15em;" />
          </label>
        </div>
        <p id="pd-error" style="color:#c0392b; font-size:0.8rem; margin-top:0.6rem; min-height:1em;"></p>
        <div class="row" style="margin-top:1rem; justify-content:flex-end; gap:0.5rem;">
          <button type="button" class="btn secondary small" id="pd-cancelar">Cancelar</button>
          <button type="button" class="btn small" id="pd-continuar">Continuar a la prueba</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector("#pd-cancelar").addEventListener("click", () => { overlay.remove(); resolve(null); });
    overlay.querySelector("#pd-continuar").addEventListener("click", async () => {
      const btnContinuar = overlay.querySelector("#pd-continuar");
      const errorEl = overlay.querySelector("#pd-error");
      const nombre_completo = overlay.querySelector("#pd-nombre").value.trim();
      const cedula = overlay.querySelector("#pd-cedula").value.trim();
      const correo_mep = overlay.querySelector("#pd-correo-mep").value.trim();
      const correo_padre = overlay.querySelector("#pd-correo-padre").value.trim();
      const clave_prueba = overlay.querySelector("#pd-clave-prueba").value.trim().toUpperCase();
      if (!nombre_completo || !cedula || !correo_mep || !correo_padre || !clave_prueba) {
        errorEl.textContent = "Completá los 5 campos para continuar.";
        return;
      }
      // Confirma que la clave corresponde al estudiante que tiene la sesión
      // abierta — así se evita que alguien haga la prueba con la sesión de
      // otro compañero. Si no hay sesión de estudiante (p. ej. una vista
      // previa) o la tabla no tiene esta columna todavía, no bloquea.
      if (typeof session !== "undefined" && session && session.role === "estudiante" && typeof sb !== "undefined") {
        btnContinuar.disabled = true;
        errorEl.textContent = "Verificando clave…";
        errorEl.style.color = "var(--text-muted)";
        const { data: est, error } = await sb.from("estudiantes").select("clave_prueba").eq("id", session.id).maybeSingle();
        btnContinuar.disabled = false;
        if (!error && est && est.clave_prueba) {
          if (est.clave_prueba.trim().toUpperCase() !== clave_prueba) {
            errorEl.style.color = "#c0392b";
            errorEl.textContent = "Esa clave no es correcta. Pedísela de nuevo a tu profesor.";
            return;
          }
        }
        // Si el estudiante todavía no tiene clave asignada en la base de
        // datos, se deja pasar (para no trabar pruebas mientras el
        // profesor todavía no le ha puesto clave a todos).
      }
      errorEl.textContent = "";
      overlay.remove();
      resolve({ nombre_completo, cedula, correo_mep, correo_padre, clave_prueba });
    });
  });
}

function puntajeDesdePorcentaje(pct) {
  if (pct >= 85) return 3;
  if (pct >= 60) return 2;
  if (pct >= 35) return 1;
  return 0;
}

// Cuando el profesor edita las preguntas/afirmaciones/pares de una
// actividad ya resuelta por estudiantes (por ejemplo, borra preguntas de un
// tema que no se alcanzó a cubrir), esto recalcula la nota de UNA entrega ya
// guardada contra el contenido NUEVO, sin obligar al estudiante a repetirla.
//
// Empareja cada pregunta/afirmación/par VIEJO con su versión nueva por el
// texto exacto (no por posición, porque al borrar una pregunta del medio
// las que quedan se recorren de lugar):
//  - si una pregunta ya no existe en la versión nueva, se descarta por
//    completo (no cuenta ni a favor ni en contra de la nota);
//  - si sigue existiendo, se revisa si lo que el estudiante había
//    contestado sigue siendo la opción correcta en la versión nueva.
// Devuelve null si el tipo no se recalcula automáticamente.
function recalcularResultadoActividad(tipo, contenidoViejo, contenidoNuevo, entregaVieja) {
  const respuestasViejas = Array.isArray(entregaVieja.respuestas) ? entregaVieja.respuestas : [];

  if (tipo === "seleccion_unica" || tipo === "prueba") {
    const preguntasViejas = (contenidoViejo && contenidoViejo.preguntas) || [];
    const preguntasNuevas = (contenidoNuevo && contenidoNuevo.preguntas) || [];
    const textoRespondidoPorPregunta = {};
    preguntasViejas.forEach((p, i) => {
      const r = respuestasViejas[i];
      textoRespondidoPorPregunta[p.pregunta] = (r === null || r === undefined) ? null : (p.opciones || [])[r];
    });
    let correctasSeleccion = 0;
    const respuestasNuevas = preguntasNuevas.map(p => {
      const textoRespuesta = textoRespondidoPorPregunta.hasOwnProperty(p.pregunta) ? textoRespondidoPorPregunta[p.pregunta] : undefined;
      if (textoRespuesta == null) return null;
      const idx = (p.opciones || []).indexOf(textoRespuesta);
      if (idx !== -1 && idx === Number(p.correcta)) correctasSeleccion++;
      return idx === -1 ? null : idx;
    });

    if (tipo === "seleccion_unica") {
      const porcentaje = preguntasNuevas.length ? (correctasSeleccion / preguntasNuevas.length) * 100 : 0;
      return { respuestas: respuestasNuevas, porcentaje };
    }

    // "prueba" puede llevar además una sección de apareamiento, que también
    // cuenta en el % automático — se recalcula igual, emparejando por el
    // texto de la situación.
    const paresViejos = (contenidoViejo && contenidoViejo.apareamiento && contenidoViejo.apareamiento.pares) || [];
    const paresNuevos = (contenidoNuevo && contenidoNuevo.apareamiento && contenidoNuevo.apareamiento.pares) || [];
    const apareamientoRespuestasViejas = (entregaVieja.datos_prueba && entregaVieja.datos_prueba.apareamiento_respuestas) || [];
    let correctasApareamiento = 0;
    let apareamientoRespuestasNuevas = null;
    if (paresNuevos.length) {
      const respuestaTextoPorSituacion = {};
      paresViejos.forEach((par, i) => {
        const r = apareamientoRespuestasViejas[i];
        respuestaTextoPorSituacion[par.situacion] = (r === null || r === undefined) ? null : (paresViejos[r] || {}).respuesta;
      });
      apareamientoRespuestasNuevas = paresNuevos.map((par, i) => {
        const textoRespuesta = respuestaTextoPorSituacion.hasOwnProperty(par.situacion) ? respuestaTextoPorSituacion[par.situacion] : undefined;
        if (textoRespuesta == null) return null;
        const idx = paresNuevos.findIndex(p2 => p2.respuesta === textoRespuesta);
        if (idx === i && idx !== -1) correctasApareamiento++;
        return idx === -1 ? null : idx;
      });
    }
    const totalAuto = preguntasNuevas.length + paresNuevos.length;
    const porcentaje = totalAuto ? ((correctasSeleccion + correctasApareamiento) / totalAuto) * 100 : 0;
    return { respuestas: respuestasNuevas, porcentaje, apareamientoRespuestas: apareamientoRespuestasNuevas };
  }

  if (tipo === "falso_verdadero") {
    const itemsViejos = (contenidoViejo && contenidoViejo.afirmaciones) || [];
    const itemsNuevos = (contenidoNuevo && contenidoNuevo.afirmaciones) || [];
    const respuestaPorTexto = {};
    itemsViejos.forEach((it, i) => { respuestaPorTexto[it.texto] = respuestasViejas[i]; });
    let correctas = 0;
    const respuestasNuevas = itemsNuevos.map(it => {
      const r = respuestaPorTexto.hasOwnProperty(it.texto) ? respuestaPorTexto[it.texto] : undefined;
      if (r === undefined) return null;
      if (r !== null && r === it.correcta) correctas++;
      return r === undefined ? null : r;
    });
    const porcentaje = itemsNuevos.length ? (correctas / itemsNuevos.length) * 100 : 0;
    return { respuestas: respuestasNuevas, porcentaje };
  }

  return null;
}

function mezclar(arr) {
  const copia = arr.slice();
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// "Upsert" manual que NO depende de que exista una restricción unique en la
// base de datos para las columnas de `filtro`. Un upsert normal con
// onConflict falla por completo (sin guardar nada, y sin que nadie se dé
// cuenta porque el error no se mostraba) si esa restricción no está creada
// o no coincide exactamente — eso era lo que dejaba a un estudiante volver
// a hacer una actividad ya completada: el resultado nunca quedaba guardado.
async function upsertSinConflicto(tabla, filtro, datos) {
  const { data: existente } = await sb.from(tabla).select("id").match(filtro).limit(1).maybeSingle();
  if (existente) {
    return sb.from(tabla).update(datos).eq("id", existente.id);
  }
  return sb.from(tabla).insert({ ...filtro, ...datos });
}

// Guarda el resultado del estudiante: fila en actividades_estudiante y,
// si el trabajo tiene indicador_id, también en calificaciones_indicador
// (así aparece de inmediato en Rúbrica y Evaluaciones, sin que el profesor
// tenga que calificarlo a mano).
async function guardarResultadoActividad(trabajo, estudianteId, { respuestas, porcentaje, intentosSalida, datosPrueba }) {
  const puntaje = puntajeDesdePorcentaje(porcentaje);

  const datosActividad = { respuestas, porcentaje, puntaje, completado: true, intentos_salida: intentosSalida || 0, actualizado_en: new Date().toISOString() };
  if (datosPrueba) datosActividad.datos_prueba = datosPrueba;

  const { error: errorActividad } = await upsertSinConflicto(
    "actividades_estudiante",
    { trabajo_id: trabajo.id, estudiante_id: estudianteId },
    datosActividad
  );
  if (errorActividad) {
    alert("No se pudo guardar tu resultado (" + errorActividad.message + "). Avisale a tu profesor antes de salir de esta pantalla.");
  }

  const { error: errorEstado } = await upsertSinConflicto(
    "trabajos_cotidianos_estudiante",
    { trabajo_id: trabajo.id, estudiante_id: estudianteId },
    { completado: true, entregado_en: new Date().toISOString() }
  );
  if (errorEstado) console.error("No se pudo actualizar trabajos_cotidianos_estudiante:", errorEstado.message);

  // Si la prueba tiene caso práctico (se califica a mano), NO se publica
  // sola la nota automática — quedaría "ya calificado" con una nota
  // incompleta (sin el caso) antes de que el profesor la revise. En ese
  // caso se deja "Sin calificar aún" hasta que el profesor ponga la nota
  // final a mano (ya viendo el % automático + la respuesta del caso).
  const tieneCasoPractico = !!(trabajo.contenido_actividad && trabajo.contenido_actividad.casoPractico
    && ((trabajo.contenido_actividad.casoPractico.enunciado || "").trim() || (trabajo.contenido_actividad.casoPractico.instruccion || "").trim()));

  if (trabajo.indicador_id && !tieneCasoPractico) {
    const { error: errorIndicador } = await upsertSinConflicto(
      "calificaciones_indicador",
      { indicador_id: trabajo.indicador_id, estudiante_id: estudianteId },
      { puntaje_obtenido: puntaje }
    );
    if (errorIndicador) console.error("No se pudo actualizar calificaciones_indicador:", errorIndicador.message);
  }
  return puntaje;
}

// Crea el overlay de pantalla completa, maneja el aviso de "saliste de la
// actividad", y delega el contenido real (las preguntas) a `construirContenido`.
// `construirContenido(cuerpoEl, terminar)` debe llenar cuerpoEl con la UI de
// la actividad y llamar a terminar({respuestas, porcentaje}) cuando el
// estudiante termine.
function lanzarActividadBloqueada(trabajo, construirContenido, onListo) {
  let intentosSalida = 0;
  let terminado = false;

  const overlay = document.createElement("div");
  overlay.className = "actividad-overlay";
  overlay.style.cssText = "position:fixed; inset:0; z-index:9999; display:flex; flex-direction:column; color:#F1F5F9; overflow:auto; font-family:'Plus Jakarta Sans','Poppins',-apple-system,sans-serif; background:radial-gradient(900px 500px at 100% -10%, rgba(139,92,246,0.25), transparent 60%), radial-gradient(800px 450px at -10% 10%, rgba(6,182,212,0.18), transparent 55%), #0B0F19;";
  overlay.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:0.9rem 1.3rem; background:rgba(255,255,255,0.05); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); border-bottom:1px solid rgba(255,255,255,0.1); flex-wrap:wrap; gap:0.5rem; position:sticky; top:0; z-index:2;">
      <strong style="background:linear-gradient(135deg,#EC4899,#F97316); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent;">${trabajo.titulo}</strong>
      <span id="actividad-aviso" style="font-size:0.82rem; color:#FB7185; min-height:1.2em;"></span>
    </div>
    <div id="actividad-cuerpo" style="flex:1; padding:1.4rem; max-width:48rem; margin:0 auto; width:100%;"></div>`;
  document.body.appendChild(overlay);

  const aviso = overlay.querySelector("#actividad-aviso");
  const cuerpo = overlay.querySelector("#actividad-cuerpo");

  function mostrarAviso() {
    intentosSalida++;
    aviso.textContent = `⚠️ Saliste de la actividad (${intentosSalida}). Esto queda registrado para tu profesor.`;
  }

  function onVisibilityChange() {
    if (document.hidden && !terminado) mostrarAviso();
  }
  function onFullscreenChange() {
    if (!document.fullscreenElement && !terminado) mostrarAviso();
  }
  document.addEventListener("visibilitychange", onVisibilityChange);
  document.addEventListener("fullscreenchange", onFullscreenChange);

  if (overlay.requestFullscreen) overlay.requestFullscreen().catch(() => {});

  function limpiar() {
    terminado = true;
    document.removeEventListener("visibilitychange", onVisibilityChange);
    document.removeEventListener("fullscreenchange", onFullscreenChange);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    overlay.remove();
  }

  function terminar(resultado) {
    limpiar();
    onListo({ ...resultado, intentosSalida });
  }

  construirContenido(cuerpo, terminar, () => intentosSalida);
}

// Barra de progreso compacta para las actividades tipo "pregunta a la vez"
// (selección única, prueba) — degradado neón animado, igual que el resto
// de la plataforma.
function barraProgresoActividad(actual, total) {
  const pct = total ? Math.round(((actual + 1) / total) * 100) : 0;
  return `
    <div style="margin-bottom:1rem;">
      <div style="display:flex; justify-content:space-between; font-size:0.78rem; color:#94A3B8; font-weight:600; margin-bottom:0.35rem;">
        <span>Pregunta ${actual + 1} de ${total}</span><span>${pct}%</span>
      </div>
      <div style="width:100%; height:10px; border-radius:999px; background:rgba(255,255,255,0.08); overflow:hidden;">
        <div style="height:100%; width:${pct}%; border-radius:999px; background:linear-gradient(90deg,#8B5CF6,#06B6D4,#8B5CF6); background-size:200% 100%; animation:xpShimmer 2.4s linear infinite; transition:width 0.4s cubic-bezier(.34,1.56,.64,1);"></div>
      </div>
    </div>`;
}

// --- Selección única ---

function jugarSeleccionUnica(trabajo, cuerpo, terminar) {
  const preguntas = (trabajo.contenido_actividad && trabajo.contenido_actividad.preguntas) || [];
  let actual = 0;
  const respuestas = new Array(preguntas.length).fill(null);

  function render() {
    const p = preguntas[actual];
    cuerpo.innerHTML = `
      ${barraProgresoActividad(actual, preguntas.length)}
      <h3 style="font-size:1.3rem; margin-bottom:1rem;">${p.pregunta}</h3>
      <div id="opciones-actividad" style="display:flex; flex-direction:column; gap:0.6rem;">
        ${p.opciones.map((op, i) => `
          <button type="button" class="quiz-option${respuestas[actual] === i ? " selected" : ""}" data-opcion="${i}">${op}</button>`).join("")}
      </div>
      <div class="row" style="margin-top:1.5rem; justify-content:space-between;">
        <button type="button" class="btn secondary small" id="act-anterior" ${actual === 0 ? "disabled" : ""}>&larr; Anterior</button>
        <button type="button" class="btn small" id="act-siguiente">${actual === preguntas.length - 1 ? "Terminar" : "Siguiente →"}</button>
      </div>`;

    cuerpo.querySelectorAll("[data-opcion]").forEach(btn => {
      btn.addEventListener("click", () => {
        respuestas[actual] = Number(btn.dataset.opcion);
        render();
      });
    });
    cuerpo.querySelector("#act-anterior").addEventListener("click", () => { actual--; render(); });
    cuerpo.querySelector("#act-siguiente").addEventListener("click", () => {
      if (actual < preguntas.length - 1) { actual++; render(); return; }
      const sinResponder = respuestas.some(r => r === null);
      if (sinResponder && !confirm("Todavía hay preguntas sin responder. ¿Terminar de todos modos?")) return;
      const correctas = preguntas.reduce((acc, p, i) => acc + (respuestas[i] === p.correcta ? 1 : 0), 0);
      const porcentaje = preguntas.length ? (correctas / preguntas.length) * 100 : 0;
      terminar({ respuestas, porcentaje });
    });
  }
  render();
}

// --- Falso y verdadero ---

function jugarFalsoVerdadero(trabajo, cuerpo, terminar) {
  const items = (trabajo.contenido_actividad && trabajo.contenido_actividad.afirmaciones) || [];
  const respuestas = new Array(items.length).fill(null);

  function render() {
    const respondidas = respuestas.filter(r => r !== null).length;
    cuerpo.innerHTML = `
      ${barraProgresoActividad(Math.max(0, respondidas - 1), items.length)}
      <h3 style="margin-bottom:1rem;">Marcá si cada afirmación es verdadera o falsa</h3>
      <div style="display:flex; flex-direction:column; gap:0.8rem;">
        ${items.map((it, i) => `
          <div style="background:rgba(255,255,255,0.05); backdrop-filter:blur(12px); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:0.9rem; transition:border-color 0.2s ease;">
            <p style="margin-bottom:0.6rem;">${i + 1}. ${it.texto}</p>
            <div style="display:flex; gap:0.6rem;">
              <button type="button" class="btn ${respuestas[i] === true ? "" : "secondary"} small" data-fv="${i}" data-val="true" style="${respuestas[i] === true ? "background:linear-gradient(135deg,#22C55E,#4ADE80); box-shadow:0 0 18px rgba(74,222,128,0.45);" : ""}">✔ Verdadero</button>
              <button type="button" class="btn ${respuestas[i] === false ? "" : "secondary"} small" data-fv="${i}" data-val="false" style="${respuestas[i] === false ? "background:linear-gradient(135deg,#F43F5E,#FB7185); box-shadow:0 0 18px rgba(244,63,94,0.45);" : ""}">✘ Falso</button>
            </div>
          </div>`).join("")}
      </div>
      <div class="row" style="margin-top:1.5rem; justify-content:flex-end;">
        <button type="button" class="btn small" id="act-terminar-fv">Terminar</button>
      </div>`;

    cuerpo.querySelectorAll("[data-fv]").forEach(btn => {
      btn.addEventListener("click", () => {
        respuestas[Number(btn.dataset.fv)] = btn.dataset.val === "true";
        render();
      });
    });
    cuerpo.querySelector("#act-terminar-fv").addEventListener("click", () => {
      const sinResponder = respuestas.some(r => r === null);
      if (sinResponder && !confirm("Todavía hay afirmaciones sin responder. ¿Terminar de todos modos?")) return;
      const correctas = items.reduce((acc, it, i) => acc + (respuestas[i] === it.correcta ? 1 : 0), 0);
      const porcentaje = items.length ? (correctas / items.length) * 100 : 0;
      terminar({ respuestas, porcentaje });
    });
  }
  render();
}

// --- Sopa de letras ---

const ABECEDARIO = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
const DIRECCIONES = [
  [0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]
];

function normalizarPalabra(p) {
  return p.toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-ZÑ]/g, "");
}

// Genera una sopa de letras que contiene las `palabras` dadas. Se genera UNA
// vez, cuando el profesor crea la actividad, y la misma cuadrícula se guarda
// para que todos los estudiantes resuelvan exactamente la misma.
function generarSopaDeLetras(palabrasOriginales) {
  const palabras = palabrasOriginales.map(normalizarPalabra).filter(Boolean);
  const masLarga = Math.max(...palabras.map(p => p.length), 8);
  // El tamaño de la cuadrícula crece también con la cantidad de palabras
  // (no solo con la más larga), para que quepan bien aunque se pidan muchas.
  const porCantidad = Math.ceil(Math.sqrt(palabras.length * 14));
  const tamano = Math.min(24, Math.max(10, masLarga + 2, porCantidad));
  const grid = Array.from({ length: tamano }, () => Array(tamano).fill(null));
  const colocadas = [];

  palabras.forEach(palabra => {
    let colocada = false;
    for (let intento = 0; intento < 200 && !colocada; intento++) {
      const [df, dc] = DIRECCIONES[Math.floor(Math.random() * DIRECCIONES.length)];
      const filaMax = df === 1 ? tamano - palabra.length : (df === -1 ? tamano - 1 : tamano - 1);
      const filaIni = df === 1 ? 0 : (df === -1 ? palabra.length - 1 : 0);
      const colMax = dc === 1 ? tamano - palabra.length : (dc === -1 ? tamano - 1 : tamano - 1);
      const colIni = dc === 1 ? 0 : (dc === -1 ? palabra.length - 1 : 0);
      const fila = filaIni + Math.floor(Math.random() * Math.max(1, filaMax - filaIni + 1));
      const col = colIni + Math.floor(Math.random() * Math.max(1, colMax - colIni + 1));

      let cabe = true;
      for (let i = 0; i < palabra.length; i++) {
        const f = fila + df * i, c = col + dc * i;
        if (f < 0 || f >= tamano || c < 0 || c >= tamano) { cabe = false; break; }
        const actual = grid[f][c];
        if (actual !== null && actual !== palabra[i]) { cabe = false; break; }
      }
      if (!cabe) continue;
      for (let i = 0; i < palabra.length; i++) {
        grid[fila + df * i][col + dc * i] = palabra[i];
      }
      colocadas.push({ palabra, fila, col, df, dc });
      colocada = true;
    }
  });

  for (let f = 0; f < tamano; f++) {
    for (let c = 0; c < tamano; c++) {
      if (grid[f][c] === null) grid[f][c] = ABECEDARIO[Math.floor(Math.random() * ABECEDARIO.length)];
    }
  }

  return { tamano, grid, colocadas };
}

function jugarSopaDeLetras(trabajo, cuerpo, terminar) {
  const { tamano, grid, colocadas } = trabajo.contenido_actividad;
  const encontradas = new Set();
  let origen = null;
  let seleccionActual = [];

  function celdasDe(c) {
    const out = [];
    for (let i = 0; i < c.palabra.length; i++) out.push(`${c.fila + c.df * i}-${c.col + c.dc * i}`);
    return out;
  }

  function render() {
    cuerpo.innerHTML = `
      <h3 style="margin-bottom:0.4rem;">Encontrá las ${colocadas.length} palabras</h3>
      <p style="font-size:0.8rem; color:#9FB0D6; margin-bottom:0.8rem;">Hacé clic en la primera letra de una palabra y despues en la última letra (en línea recta) para marcarla.</p>
      <div style="display:flex; flex-wrap:wrap; gap:1.2rem;">
        <div id="sopa-grid" style="display:grid; grid-template-columns:repeat(${tamano}, 1.8rem); gap:2px; user-select:none;">
          ${grid.map((fila, f) => fila.map((letra, c) => `
            <div data-f="${f}" data-c="${c}" class="sopa-celda" style="width:1.8rem; height:1.8rem; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.05); backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,0.08); border-radius:4px; cursor:pointer; font-weight:600; font-size:0.85rem;">${letra}</div>`).join("")).join("")}
        </div>
        <div style="min-width:10rem;">
          <p style="font-weight:600; margin-bottom:0.5rem;">Palabras</p>
          ${colocadas.map(c => `<p style="text-decoration:${encontradas.has(c.palabra) ? "line-through" : "none"}; color:${encontradas.has(c.palabra) ? "#27AE60" : "#fff"}; margin-bottom:0.3rem;">${c.palabra}</p>`).join("")}
        </div>
      </div>
      <div class="row" style="margin-top:1.2rem; justify-content:space-between;">
        <span style="font-size:0.82rem; color:#9FB0D6;">${encontradas.size} / ${colocadas.length} encontradas</span>
        <button type="button" class="btn small" id="act-terminar-sopa">Terminar</button>
      </div>`;

    const celdas = cuerpo.querySelectorAll(".sopa-celda");
    celdas.forEach(el => {
      el.addEventListener("click", () => {
        const f = Number(el.dataset.f), c = Number(el.dataset.c);
        if (!origen) { origen = { f, c }; el.style.background = "linear-gradient(135deg,#8B5CF6,#06B6D4)"; el.style.boxShadow = "0 0 14px rgba(139,92,246,0.6)"; return; }
        // Buscar si la línea entre origen y destino forma alguna palabra colocada
        const df = Math.sign(f - origen.f), dc = Math.sign(c - origen.c);
        for (const col of colocadas) {
          if (encontradas.has(col.palabra)) continue;
          if (col.df === df && col.dc === dc && col.fila === origen.f && col.col === origen.c) {
            const destinoEsperado = { f: col.fila + col.df * (col.palabra.length - 1), c: col.col + col.dc * (col.palabra.length - 1) };
            if (destinoEsperado.f === f && destinoEsperado.c === c) {
              encontradas.add(col.palabra);
              origen = null;
              render();
              if (encontradas.size === colocadas.length) {
                setTimeout(() => terminar({ respuestas: { encontradas: Array.from(encontradas) }, porcentaje: 100 }), 400);
              }
              return;
            }
          }
        }
        origen = null;
        render();
      });
    });

    cuerpo.querySelector("#act-terminar-sopa").addEventListener("click", () => {
      const porcentaje = colocadas.length ? (encontradas.size / colocadas.length) * 100 : 0;
      terminar({ respuestas: { encontradas: Array.from(encontradas) }, porcentaje });
    });
  }
  render();
}

// --- Crucigrama ---

// Genera un crucigrama simple: coloca la primera palabra horizontal en el
// centro, y cada palabra siguiente donde encuentre una letra en común con
// alguna ya colocada (perpendicular). Si no encuentra cruce, la coloca
// suelta en una fila/columna libre. No es óptimo, pero siempre es jugable.
function generarCrucigrama(items) {
  const palabras = items.map(it => ({ palabra: normalizarPalabra(it.palabra), pista: it.pista })).filter(it => it.palabra);
  const TAM = 26;
  const grid = Array.from({ length: TAM }, () => Array(TAM).fill(null));
  const colocadas = [];

  function cabePalabra(palabra, fila, col, horizontal) {
    for (let i = 0; i < palabra.length; i++) {
      const f = horizontal ? fila : fila + i;
      const c = horizontal ? col + i : col;
      if (f < 0 || f >= TAM || c < 0 || c >= TAM) return false;
      const actual = grid[f][c];
      if (actual !== null && actual !== palabra[i]) return false;
      // evitar palabras pegadas sin cruce real (celda vecina ocupada en dirección perpendicular, salvo en el propio cruce)
      if (actual === null) {
        if (horizontal) {
          if (grid[f - 1]?.[c] || grid[f + 1]?.[c]) return false;
        } else {
          if (grid[f][c - 1] || grid[f][c + 1]) return false;
        }
      }
    }
    const antes = horizontal ? grid[fila]?.[col - 1] : grid[fila - 1]?.[col];
    const despues = horizontal ? grid[fila]?.[col + palabra.length] : grid[fila + palabra.length]?.[col];
    if (antes || despues) return false;
    return true;
  }

  function colocar(palabra, pista, fila, col, horizontal) {
    for (let i = 0; i < palabra.length; i++) {
      const f = horizontal ? fila : fila + i;
      const c = horizontal ? col + i : col;
      grid[f][c] = palabra[i];
    }
    colocadas.push({ palabra, pista, fila, col, horizontal });
  }

  palabras.forEach((item, idx) => {
    if (idx === 0) {
      colocar(item.palabra, item.pista, Math.floor(TAM / 2), Math.floor(TAM / 2) - Math.floor(item.palabra.length / 2), true);
      return;
    }
    let mejor = null;
    for (const previa of colocadas) {
      for (let i = 0; i < previa.palabra.length; i++) {
        const letraPrevia = previa.palabra[i];
        for (let j = 0; j < item.palabra.length; j++) {
          if (item.palabra[j] !== letraPrevia) continue;
          const horizontal = !previa.horizontal;
          const fila = previa.horizontal ? (previa.fila - j) : (previa.fila + i);
          const col = previa.horizontal ? (previa.col + i) : (previa.col - j);
          if (cabePalabra(item.palabra, fila, col, horizontal)) { mejor = { fila, col, horizontal }; break; }
        }
        if (mejor) break;
      }
      if (mejor) break;
    }
    if (mejor) {
      colocar(item.palabra, item.pista, mejor.fila, mejor.col, mejor.horizontal);
    } else {
      // sin cruce posible: lo deja en una fila suelta debajo de lo ya colocado
      const filaLibre = Math.min(TAM - 1, 2 + colocadas.reduce((max, p) => Math.max(max, p.horizontal ? p.fila : p.fila + p.palabra.length), 0));
      if (cabePalabra(item.palabra, filaLibre, 1, true)) colocar(item.palabra, item.pista, filaLibre, 1, true);
    }
  });

  let minF = TAM, maxF = 0, minC = TAM, maxC = 0;
  colocadas.forEach(p => {
    const f2 = p.horizontal ? p.fila : p.fila + p.palabra.length - 1;
    const c2 = p.horizontal ? p.col + p.palabra.length - 1 : p.col;
    minF = Math.min(minF, p.fila); maxF = Math.max(maxF, f2);
    minC = Math.min(minC, p.col); maxC = Math.max(maxC, c2);
  });

  const alto = maxF - minF + 1, ancho = maxC - minC + 1;
  const recortado = Array.from({ length: alto }, (_, f) => Array.from({ length: ancho }, (_, c) => grid[f + minF][c + minC]));
  const colocadasAjustadas = colocadas.map(p => ({ ...p, fila: p.fila - minF, col: p.col - minC }));

  // Numerar: cualquier celda donde empieza una palabra (horizontal o vertical)
  let numero = 1;
  const numeroPorCelda = {};
  colocadasAjustadas
    .slice()
    .sort((a, b) => (a.fila - b.fila) || (a.col - b.col))
    .forEach(p => {
      const key = `${p.fila}-${p.col}`;
      if (!numeroPorCelda[key]) numeroPorCelda[key] = numero++;
      p.numero = numeroPorCelda[key];
    });

  return { alto, ancho, grid: recortado, colocadas: colocadasAjustadas };
}

function jugarCrucigrama(trabajo, cuerpo, terminar) {
  const { alto, ancho, grid, colocadas } = trabajo.contenido_actividad;

  cuerpo.innerHTML = `
    <h3 style="margin-bottom:0.8rem;">Completá el crucigrama</h3>
    <div style="display:flex; flex-wrap:wrap; gap:1.5rem;">
      <div id="cruci-grid" style="display:grid; grid-template-columns:repeat(${ancho}, 1.9rem); gap:2px;">
        ${grid.map((fila, f) => fila.map((letra, c) => {
          if (letra === null) return `<div style="width:1.9rem; height:1.9rem;"></div>`;
          const esInicio = colocadas.find(p => p.fila === f && p.col === c);
          return `<div style="position:relative; width:1.9rem; height:1.9rem;">
            ${esInicio ? `<span style="position:absolute; top:0; left:2px; font-size:0.6rem; color:#9FB0D6;">${esInicio.numero}</span>` : ""}
            <input maxlength="1" data-f="${f}" data-c="${c}" style="width:100%; height:100%; text-align:center; text-transform:uppercase; background:rgba(255,255,255,0.05); backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,0.14); color:#fff; border-radius:3px; font-weight:600;" />
          </div>`;
        }).join("")).join("")}
      </div>
      <div style="min-width:14rem; max-width:18rem;">
        <p style="font-weight:600; margin-bottom:0.4rem;">Horizontales</p>
        ${colocadas.filter(p => p.horizontal).map(p => `<p style="font-size:0.85rem; margin-bottom:0.3rem;">${p.numero}. ${p.pista}</p>`).join("")}
        <p style="font-weight:600; margin:0.8rem 0 0.4rem;">Verticales</p>
        ${colocadas.filter(p => !p.horizontal).map(p => `<p style="font-size:0.85rem; margin-bottom:0.3rem;">${p.numero}. ${p.pista}</p>`).join("")}
      </div>
    </div>
    <div class="row" style="margin-top:1.2rem; justify-content:flex-end;">
      <button type="button" class="btn small" id="act-terminar-cruci">Terminar</button>
    </div>`;

  cuerpo.querySelector("#act-terminar-cruci").addEventListener("click", () => {
    let correctas = 0;
    colocadas.forEach(p => {
      let ok = true;
      for (let i = 0; i < p.palabra.length; i++) {
        const f = p.horizontal ? p.fila : p.fila + i;
        const c = p.horizontal ? p.col + i : p.col;
        const input = cuerpo.querySelector(`input[data-f="${f}"][data-c="${c}"]`);
        if (!input || input.value.toUpperCase() !== p.palabra[i]) { ok = false; break; }
      }
      if (ok) correctas++;
    });
    const porcentaje = colocadas.length ? (correctas / colocadas.length) * 100 : 0;
    terminar({ respuestas: { correctas }, porcentaje });
  });
}

// --- Prueba: selección única + apareamiento (opcional) + caso práctico
// (opcional), una después de la otra. Solo la selección única y el
// apareamiento se corrigen solos; el caso práctico lo califica el
// profesor a mano (igual que la Infografía). ---
function jugarPrueba(trabajo, cuerpo, terminar) {
  const contenido = trabajo.contenido_actividad || {};
  const preguntas = contenido.preguntas || [];
  const apareamiento = (contenido.apareamiento && Array.isArray(contenido.apareamiento.pares) && contenido.apareamiento.pares.length)
    ? contenido.apareamiento
    : null;
  const casoPractico = (contenido.casoPractico && ((contenido.casoPractico.enunciado || "").trim() || (contenido.casoPractico.instruccion || "").trim()))
    ? contenido.casoPractico
    : null;

  const respuestas = new Array(preguntas.length).fill(null);
  // Orden de las preguntas, mezclado una sola vez por estudiante/intento
  // (para que no vean la misma pregunta al mismo tiempo que el compañero de
  // al lado). Las respuestas siempre se guardan con el índice ORIGINAL de la
  // pregunta, así que el cálculo de la nota no cambia.
  const ordenPreguntas = mezclar(preguntas.map((_, i) => i));
  let actual = 0;
  let apareamientoRespuestas = [];
  let casoRespuesta = "";

  function renderSeleccion() {
    const indiceReal = ordenPreguntas[actual];
    const p = preguntas[indiceReal];
    cuerpo.innerHTML = `
      ${barraProgresoActividad(actual, preguntas.length)}
      <h3 style="font-size:1.3rem; margin-bottom:1rem;">${p.pregunta}</h3>
      <div id="opciones-actividad" style="display:flex; flex-direction:column; gap:0.6rem;">
        ${p.opciones.map((op, i) => `
          <button type="button" class="quiz-option${respuestas[indiceReal] === i ? " selected" : ""}" data-opcion="${i}">${op}</button>`).join("")}
      </div>
      <div class="row" style="margin-top:1.5rem; justify-content:space-between;">
        <button type="button" class="btn secondary small" id="act-anterior" ${actual === 0 ? "disabled" : ""}>&larr; Anterior</button>
        <button type="button" class="btn small" id="act-siguiente">${actual === preguntas.length - 1 ? "Siguiente parte →" : "Siguiente →"}</button>
      </div>`;
    cuerpo.querySelectorAll("[data-opcion]").forEach(btn => {
      btn.addEventListener("click", () => { respuestas[indiceReal] = Number(btn.dataset.opcion); renderSeleccion(); });
    });
    cuerpo.querySelector("#act-anterior").addEventListener("click", () => { actual--; renderSeleccion(); });
    cuerpo.querySelector("#act-siguiente").addEventListener("click", () => {
      if (actual < preguntas.length - 1) { actual++; renderSeleccion(); return; }
      const sinResponder = respuestas.some(r => r === null);
      if (sinResponder && !confirm("Todavía hay preguntas sin responder. ¿Continuar de todos modos?")) return;
      irAApareamiento();
    });
  }

  function irAApareamiento() {
    if (!apareamiento) { irACaso(); return; }
    const pares = apareamiento.pares;
    apareamientoRespuestas = new Array(pares.length).fill(null);
    const opcionesMezcladas = mezclar(pares.map((_, i) => i));
    function render() {
      cuerpo.innerHTML = `
        <h3 style="margin-bottom:0.6rem;">Apareamiento</h3>
        <p style="font-size:0.85rem; color:#9FB0D6; margin-bottom:1rem;">${(apareamiento.instrucciones || "Relacioná cada situación con la opción que corresponde.").replace(/[<>]/g, "")}</p>
        <div style="display:flex; flex-direction:column; gap:0.8rem;">
          ${pares.map((p, i) => `
            <div style="background:rgba(255,255,255,0.05); backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:0.9rem;">
              <p style="margin-bottom:0.5rem;">${i + 1}. ${p.situacion}</p>
              <select data-apar="${i}" style="width:100%; padding:0.4rem;">
                <option value="">— Elegir —</option>
                ${opcionesMezcladas.map(j => `<option value="${j}" ${apareamientoRespuestas[i] === j ? "selected" : ""}>${pares[j].respuesta}</option>`).join("")}
              </select>
            </div>`).join("")}
        </div>
        <div class="row" style="margin-top:1.5rem; justify-content:flex-end;">
          <button type="button" class="btn small" id="act-terminar-apareamiento">${casoPractico ? "Siguiente parte →" : "Terminar"}</button>
        </div>`;
      cuerpo.querySelectorAll("[data-apar]").forEach(sel => {
        sel.addEventListener("change", () => { apareamientoRespuestas[Number(sel.dataset.apar)] = sel.value === "" ? null : Number(sel.value); });
      });
      cuerpo.querySelector("#act-terminar-apareamiento").addEventListener("click", () => {
        const sinResponder = apareamientoRespuestas.some(r => r === null);
        if (sinResponder && !confirm("Todavía hay pares sin relacionar. ¿Continuar de todos modos?")) return;
        irACaso();
      });
    }
    render();
  }

  function irACaso() {
    if (!casoPractico) { finalizar(); return; }
    cuerpo.innerHTML = `
      <h3 style="margin-bottom:0.6rem;">Caso práctico</h3>
      <div style="background:rgba(255,255,255,0.05); backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:0.9rem; margin-bottom:0.8rem; font-size:0.9rem; line-height:1.5;">${casoPractico.enunciado || ""}</div>
      ${casoPractico.instruccion ? `<p style="font-size:0.85rem; color:#9FB0D6; margin-bottom:0.6rem;">${casoPractico.instruccion.replace(/[<>]/g, "")}</p>` : ""}
      <textarea id="act-caso-respuesta" rows="12" placeholder="Escribí aquí tu respuesta..." style="width:100%; font-family:inherit; padding:0.6rem; box-sizing:border-box; resize:vertical;">${casoRespuesta}</textarea>
      <p style="font-size:0.78rem; color:#9FB0D6; margin-top:0.4rem;">Esta parte la revisa y califica tu profesor a mano; no se corrige automáticamente.</p>
      <div class="row" style="margin-top:1rem; justify-content:flex-end;">
        <button type="button" class="btn small" id="act-terminar-caso">Terminar prueba</button>
      </div>`;
    cuerpo.querySelector("#act-terminar-caso").addEventListener("click", () => {
      casoRespuesta = cuerpo.querySelector("#act-caso-respuesta").value.trim();
      if (!casoRespuesta && !confirm("No escribiste ninguna respuesta para el caso práctico. ¿Terminar de todos modos?")) return;
      finalizar();
    });
  }

  function finalizar() {
    const correctasSeleccion = preguntas.reduce((acc, p, i) => acc + (respuestas[i] === p.correcta ? 1 : 0), 0);
    const correctasApareamiento = apareamiento ? apareamiento.pares.reduce((acc, _, i) => acc + (apareamientoRespuestas[i] === i ? 1 : 0), 0) : 0;
    const totalAuto = preguntas.length + (apareamiento ? apareamiento.pares.length : 0);
    const porcentaje = totalAuto ? ((correctasSeleccion + correctasApareamiento) / totalAuto) * 100 : 0;
    terminar({
      respuestas,
      porcentaje,
      apareamientoRespuestas: apareamiento ? apareamientoRespuestas : null,
      casoRespuesta: casoPractico ? casoRespuesta : null
    });
  }

  if (preguntas.length) renderSeleccion();
  else irAApareamiento();
}

// Punto de entrada: arranca la actividad correcta según tipo_actividad y
// guarda el resultado al terminar. `onTerminado(puntaje)` se llama al final
// para que la pantalla pueda refrescarse.
async function iniciarActividadInteractiva(trabajo, estudianteId, onTerminado) {
  const tipo = trabajo.tipo_actividad;
  const jugadores = {
    seleccion_unica: jugarSeleccionUnica,
    falso_verdadero: jugarFalsoVerdadero,
    sopa_letras: jugarSopaDeLetras,
    crucigrama: jugarCrucigrama,
    prueba: jugarPrueba
  };
  const jugador = jugadores[tipo];
  if (!jugador) { alert("Este tipo de actividad todavía no está disponible para jugar."); return; }

  let datosPrueba = null;
  if (tipo === "prueba") {
    const aceptaReglas = await mostrarReglasPrueba(trabajo);
    if (!aceptaReglas) return; // el estudiante canceló
    datosPrueba = await pedirDatosPrueba(trabajo);
    if (!datosPrueba) return; // el estudiante canceló
  }

  lanzarActividadBloqueada(trabajo, (cuerpo, terminar) => jugador(trabajo, cuerpo, terminar), async (resultado) => {
    const datosPruebaCompleto = datosPrueba
      ? { ...datosPrueba, apareamiento_respuestas: resultado.apareamientoRespuestas || null, caso_respuesta: resultado.casoRespuesta || null }
      : null;
    const puntaje = await guardarResultadoActividad(trabajo, estudianteId, { ...resultado, datosPrueba: datosPruebaCompleto });
    if (resultado.porcentaje >= 85 && typeof window !== "undefined" && window.lanzarConfeti) window.lanzarConfeti();
    onTerminado(puntaje, resultado.porcentaje, resultado.intentosSalida);
  });
}
