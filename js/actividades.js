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

// Tipos de actividad donde tiene sentido mostrarle al profesor, por
// estudiante, qué respondió frente a la respuesta correcta en cada
// pregunta (retroalimentación detallada), además de la nota.
const TIPOS_CON_RETRO = ["seleccion_unica", "falso_verdadero"];

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
  const tamano = Math.min(18, Math.max(10, masLarga + 2));
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
            <div data-f="${f}" data-c="${c}" class="sopa-celda" style="width:1.8rem; height:1.8rem; display:flex; align-items:center; justify-content:center; background:#1b2340; border-radius:4px; cursor:pointer; font-weight:600; font-size:0.85rem;">${letra}</div>`).join("")).join("")}
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
        if (!origen) { origen = { f, c }; el.style.background = "#2E6FDB"; return; }
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
            <input maxlength="1" data-f="${f}" data-c="${c}" style="width:100%; height:100%; text-align:center; text-transform:uppercase; background:#1b2340; color:#fff; border:1px solid #2c3660; border-radius:3px; font-weight:600;" />
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

// Punto de entrada: arranca la actividad correcta según tipo_actividad y
// guarda el resultado al terminar. `onTerminado(puntaje)` se llama al final
// para que la pantalla pueda refrescarse.
function iniciarActividadInteractiva(trabajo, estudianteId, onTerminado) {
  const tipo = trabajo.tipo_actividad;
  const jugadores = {
    seleccion_unica: jugarSeleccionUnica,
    falso_verdadero: jugarFalsoVerdadero,
    sopa_letras: jugarSopaDeLetras,
    crucigrama: jugarCrucigrama
  };
  const jugador = jugadores[tipo];
  if (!jugador) { alert("Este tipo de actividad todavía no está disponible para jugar."); return; }

  lanzarActividadBloqueada(trabajo, (cuerpo, terminar) => jugador(trabajo, cuerpo, terminar), async (resultado) => {
    const puntaje = await guardarResultadoActividad(trabajo, estudianteId, resultado);
    onTerminado(puntaje, resultado.porcentaje, resultado.intentosSalida);
  });
}
