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
  infografia: "Infografía"
};

// Todas estas actividades, salvo la infografía, se hacen en modo "pantalla
// completa + aviso": no se puede impedir al 100% que el estudiante salga,
// pero si cambia de pestaña o sale de pantalla completa queda registrado.
const ACTIVIDADES_BLOQUEADAS = ["seleccion_unica", "falso_verdadero", "crucigrama", "sopa_letras"];

function puntajeDesdePorcentaje(pct) {
  if (pct >= 85) return 3;
  if (pct >= 60) return 2;
  if (pct >= 35) return 1;
  return 0;
}

function mezclar(arr) {
  const copia = arr.slice();
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

// Guarda el resultado del estudiante: fila en actividades_estudiante y,
// si el trabajo tiene indicador_id, también en calificaciones_indicador
// (así aparece de inmediato en Rúbrica y Evaluaciones, sin que el profesor
// tenga que calificarlo a mano).
async function guardarResultadoActividad(trabajo, estudianteId, { respuestas, porcentaje, intentosSalida }) {
  const puntaje = puntajeDesdePorcentaje(porcentaje);
  await sb.from("actividades_estudiante").upsert({
    trabajo_id: trabajo.id,
    estudiante_id: estudianteId,
    respuestas,
    porcentaje,
    puntaje,
    completado: true,
    intentos_salida: intentosSalida || 0,
    actualizado_en: new Date().toISOString()
  }, { onConflict: "trabajo_id,estudiante_id" });

  await sb.from("trabajos_cotidianos_estudiante").upsert({
    trabajo_id: trabajo.id,
    estudiante_id: estudianteId,
    completado: true,
    entregado_en: new Date().toISOString()
  }, { onConflict: "trabajo_id,estudiante_id" });

  if (trabajo.indicador_id) {
    await sb.from("calificaciones_indicador").upsert({
      indicador_id: trabajo.indicador_id,
      estudiante_id: estudianteId,
      puntaje_obtenido: puntaje
    }, { onConflict: "indicador_id,estudiante_id" });
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
  overlay.style.cssText = "position:fixed; inset:0; background:#0f172a; z-index:9999; display:flex; flex-direction:column; color:#fff; overflow:auto;";
  overlay.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; padding:0.8rem 1.2rem; background:#1b2340; flex-wrap:wrap; gap:0.5rem;">
      <strong>${trabajo.titulo}</strong>
      <span id="actividad-aviso" style="font-size:0.82rem; color:#ffb4a2; min-height:1.2em;"></span>
    </div>
    <div id="actividad-cuerpo" style="flex:1; padding:1.2rem; max-width:48rem; margin:0 auto; width:100%;"></div>`;
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

// --- Selección única ---

function jugarSeleccionUnica(trabajo, cuerpo, terminar) {
  const preguntas = (trabajo.contenido_actividad && trabajo.contenido_actividad.preguntas) || [];
  let actual = 0;
  const respuestas = new Array(preguntas.length).fill(null);

  function render() {
    const p = preguntas[actual];
    cuerpo.innerHTML = `
      <p style="font-size:0.85rem; color:#9FB0D6; margin-bottom:0.6rem;">Pregunta ${actual + 1} de ${preguntas.length}</p>
      <h3 style="font-size:1.3rem; margin-bottom:1rem;">${p.pregunta}</h3>
      <div id="opciones-actividad" style="display:flex; flex-direction:column; gap:0.6rem;">
        ${p.opciones.map((op, i) => `
          <button type="button" class="btn secondary" data-opcion="${i}" style="text-align:left; background:${respuestas[actual] === i ? "#2E6FDB" : ""}; color:${respuestas[actual] === i ? "#fff" : ""};">${op}</button>`).join("")}
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
    cuerpo.innerHTML = `
      <h3 style="margin-bottom:1rem;">Marcá si cada afirmación es verdadera o falsa</h3>
      <div style="display:flex; flex-direction:column; gap:0.8rem;">
        ${items.map((it, i) => `
          <div style="background:#1b2340; border-radius:10px; padding:0.9rem;">
            <p style="margin-bottom:0.6rem;">${i + 1}. ${it.texto}</p>
            <div style="display:flex; gap:0.6rem;">
              <button type="button" class="btn secondary small" data-fv="${i}" data-val="true" style="background:${respuestas[i] === true ? "#27AE60" : ""}; color:${respuestas[i] === true ? "#fff" : ""};">Verdadero</button>
              <button type="button" class="btn secondary small" data-fv="${i}" data-val="false" style="background:${respuestas[i] === false ? "#E8604C" : ""}; color:${respuestas[i] === false ? "#fff" : ""};">Falso</button>
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

// Punto de entrada: arranca la actividad correcta según tipo_actividad y
// guarda el resultado al terminar. `onTerminado(puntaje)` se llama al final
// para que la pantalla pueda refrescarse.
function iniciarActividadInteractiva(trabajo, estudianteId, onTerminado) {
  const tipo = trabajo.tipo_actividad;
  const jugadores = {
    seleccion_unica: jugarSeleccionUnica,
    falso_verdadero: jugarFalsoVerdadero
  };
  const jugador = jugadores[tipo];
  if (!jugador) { alert("Este tipo de actividad todavía no está disponible para jugar."); return; }

  lanzarActividadBloqueada(trabajo, (cuerpo, terminar) => jugador(trabajo, cuerpo, terminar), async (resultado) => {
    const puntaje = await guardarResultadoActividad(trabajo, estudianteId, resultado);
    onTerminado(puntaje, resultado.porcentaje, resultado.intentosSalida);
  });
}
