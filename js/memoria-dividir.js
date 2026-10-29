// Memoria Contable — dividir una LÁMINA (una imagen con varios cuadros: título,
// dibujo y explicación) en cartas. Cada carta muestra solo el DIBUJO; el
// título pasa a ser el concepto que el estudiante escribe y la explicación,
// la pista. El docente revisa y ajusta cada recorte antes de crear las cartas.
//
//   const cartas = await memoriaDividirLamina({ lienzo, nombre, tema, subir });
//   → [{ img, concepto, pista, otras, explicacion }]  ([] si cancela)

// Carga una imagen (File, Blob o URL) en un lienzo a resolución completa.
async function memoriaLienzoDe(fuente) {
  const url = typeof fuente === "string" ? fuente : URL.createObjectURL(fuente);
  try {
    const im = await new Promise((ok, mal) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = () => mal(new Error("No se pudo abrir la imagen.")); i.src = url; });
    const k = Math.min(1, 2400 / Math.max(im.naturalWidth, im.naturalHeight));
    const cv = document.createElement("canvas");
    cv.width = Math.round(im.naturalWidth * k); cv.height = Math.round(im.naturalHeight * k);
    cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height);
    return cv;
  } finally { if (typeof fuente !== "string") URL.revokeObjectURL(url); }
}

// Busca los cuadros de la lámina por las franjas blancas que los separan
// (corte recursivo en X y en Y). Devuelve cajas en fracciones 0–1.
function memoriaDetectarPaneles(lienzo) {
  const W = 700, H = Math.max(1, Math.round(lienzo.height * W / lienzo.width));
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g = cv.getContext("2d", { willReadFrequently: true }); g.drawImage(lienzo, 0, 0, W, H);
  const px = g.getImageData(0, 0, W, H).data;
  const claro = new Uint8Array(W * H);
  for (let i = 0, j = 0; i < px.length; i += 4, j++) claro[j] = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) > 228 ? 1 : 0;
  const MIN = Math.max(40, Math.round(Math.min(W, H) * 0.12));
  const cortes = (x0, y0, x1, y1, horiz) => {
    const n = horiz ? y1 - y0 : x1 - x0, largo = horiz ? x1 - x0 : y1 - y0, vacio = [];
    for (let a = 0; a < n; a++) {
      let s = 0;
      for (let b = 0; b < largo; b++) s += horiz ? claro[(y0 + a) * W + x0 + b] : claro[(y0 + b) * W + x0 + a];
      vacio.push(s / largo > 0.985);
    }
    const seg = []; let ini = null;
    for (let a = 0; a <= n; a++) {
      const v = a === n ? true : vacio[a];
      if (!v && ini === null) ini = a;
      if (v && ini !== null) { if (a - ini >= MIN) seg.push([ini, a]); ini = null; }
    }
    return seg;
  };
  const res = [];
  const xy = (x0, y0, x1, y1, prof) => {
    const filas = cortes(x0, y0, x1, y1, true);
    const bandas = filas.length ? filas.map(([a, b]) => [y0 + a, y0 + b]) : [[y0, y1]];
    for (const [ya, yb] of bandas) {
      const cols = cortes(x0, ya, x1, yb, false);
      const celdas = cols.length ? cols.map(([a, b]) => [x0 + a, x0 + b]) : [[x0, x1]];
      for (const [xa, xb] of celdas) {
        const partio = filas.length > 1 || cols.length > 1;
        if (partio && prof < 3) xy(xa, ya, xb, yb, prof + 1);
        else res.push({ x0: xa / W, y0: ya / H, x1: xb / W, y1: yb / H });
      }
    }
  };
  xy(0, 0, W, H, 0);
  const area = c => (c.x1 - c.x0) * (c.y1 - c.y0);
  const ok = res.filter(c => area(c) > 0.025);
  return ok.length ? ok.sort((a, b) => Math.abs(a.y0 - b.y0) > 0.05 ? a.y0 - b.y0 : a.x0 - b.x0) : [{ x0: 0, y0: 0, x1: 1, y1: 1 }];
}

const memoriaGrilla = (filas, cols) => { const r = []; for (let f = 0; f < filas; f++) for (let c = 0; c < cols; c++) r.push({ x0: c / cols, y0: f / filas, x1: (c + 1) / cols, y1: (f + 1) / filas }); return r; };

function memoriaRecorte(lienzo, caja, maxLado) {
  const x = Math.round(caja.x0 * lienzo.width), y = Math.round(caja.y0 * lienzo.height);
  const w = Math.max(1, Math.round((caja.x1 - caja.x0) * lienzo.width)), h = Math.max(1, Math.round((caja.y1 - caja.y0) * lienzo.height));
  const k = Math.min(1, (maxLado || 640) / Math.max(w, h));
  const cv = document.createElement("canvas"); cv.width = Math.max(1, Math.round(w * k)); cv.height = Math.max(1, Math.round(h * k));
  cv.getContext("2d").drawImage(lienzo, x, y, w, h, 0, 0, cv.width, cv.height);
  return cv;
}

// La IA lee cada cuadro: título (concepto), explicación, y dónde empieza y
// termina el dibujo (para no mostrar el título, que es la respuesta).
async function memoriaLeerPaneles(lienzo, paneles, tema) {
  const imagenes = paneles.map(p => memoriaRecorte(lienzo, p, 760).toDataURL("image/jpeg", 0.85).split(",")[1]);
  try {
    const r = await fetch("/api/memoria-conceptos", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ modo: "dividir", imagenes, tema }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok && Array.isArray(j.paneles)) return j.paneles;
  } catch (e) {}
  return [];
}

function memoriaDividirLamina({ lienzo, nombre, tema, subir }) {
  return new Promise(resolve => {
    let paneles = memoriaDetectarPaneles(lienzo);
    let datos = [];
    const fondo = document.createElement("div");
    fondo.className = "overlay"; fondo.style.zIndex = "60";
    fondo.innerHTML = `<div class="modal ancho" role="dialog" aria-modal="true" style="width:min(1100px,100%)">
      <h2 style="margin:0 0 4px">✂️ Dividir lámina en cartas</h2>
      <p class="note">${nombre ? `<b>${String(nombre).replace(/[<>&]/g, "")}</b> · ` : ""}Cada cuadro será una carta. La carta muestra <b>solo lo que queda entre las dos líneas</b> (el dibujo): arrastre las líneas para que no se vea el título, que es la respuesta. Revise el concepto y la pista de cada uno.</p>
      <div class="row" style="margin:8px 0">
        <span class="note">¿No separó bien los cuadros? Dividir en</span>
        <select data-filas aria-label="Filas">${[1, 2, 3, 4, 5].map(n => `<option>${n}</option>`).join("")}</select><span class="note">filas ×</span>
        <select data-cols aria-label="Columnas">${[1, 2, 3, 4, 5].map(n => `<option>${n}</option>`).join("")}</select><span class="note">columnas</span>
        <button class="btn ghost" type="button" data-regrilla>Aplicar</button>
        <button class="btn ghost" type="button" data-releer>✨ Volver a leer con IA</button>
      </div>
      <div data-estado class="note"></div>
      <div data-paneles class="div-grid"></div>
      <div class="barra-guardar" style="background:var(--panel)">
        <button class="btn ghost" type="button" data-cancelar>Cancelar</button>
        <button class="btn ghost" type="button" data-entera>Usar la imagen entera como 1 carta</button>
        <button class="btn primary" type="button" data-crear>✅ CREAR CARTAS</button>
      </div></div>`;
    document.body.appendChild(fondo);
    const $f = s => fondo.querySelector(s);
    const estado = t => { $f("[data-estado]").innerHTML = t; };
    const cerrar = v => { fondo.remove(); resolve(v); };

    const pintar = () => {
      const caja = $f("[data-paneles]");
      caja.innerHTML = "";
      paneles.forEach((p, i) => {
        const d = datos[i] || (datos[i] = { usar: true, concepto: "", pista: "", otras: "", explicacion: "", desde: 0.2, hasta: 0.82 });
        const prev = memoriaRecorte(lienzo, p, 420);
        const tile = document.createElement("div");
        tile.className = "div-tile" + (d.usar ? "" : " off");
        tile.innerHTML = `
          <label class="chk"><input type="checkbox" data-usar ${d.usar ? "checked" : ""}> Carta ${i + 1}</label>
          <div class="div-vista"><canvas></canvas><div class="div-som arriba"></div><div class="div-som abajo"></div>
            <div class="div-linea" data-l="desde" title="Arrastre: inicio del dibujo"></div><div class="div-linea" data-l="hasta" title="Arrastre: fin del dibujo"></div></div>
          <input data-c="concepto" placeholder="Concepto exacto *" value="${(d.concepto || "").replace(/"/g, "&quot;")}" class="${d.concepto ? "" : "falta"}">
          <input data-c="pista" placeholder="Pista (opcional)" value="${(d.pista || "").replace(/"/g, "&quot;")}">
          <input data-c="otras" placeholder="Otras respuestas; separadas por ;" value="${(d.otras || "").replace(/"/g, "&quot;")}">`;
        const c = tile.querySelector("canvas"); c.width = prev.width; c.height = prev.height; c.getContext("2d").drawImage(prev, 0, 0);
        const vista = tile.querySelector(".div-vista");
        const ubicar = () => {
          vista.querySelector('[data-l="desde"]').style.top = (d.desde * 100) + "%";
          vista.querySelector('[data-l="hasta"]').style.top = (d.hasta * 100) + "%";
          vista.querySelector(".arriba").style.height = (d.desde * 100) + "%";
          vista.querySelector(".abajo").style.top = (d.hasta * 100) + "%";
        };
        ubicar();
        vista.querySelectorAll(".div-linea").forEach(l => {
          l.addEventListener("pointerdown", e => {
            e.preventDefault(); l.setPointerCapture(e.pointerId);
            const mover = ev => {
              const r = vista.getBoundingClientRect();
              let y = Math.max(0, Math.min(1, (ev.clientY - r.top) / r.height));
              if (l.dataset.l === "desde") d.desde = Math.min(y, d.hasta - 0.08); else d.hasta = Math.max(y, d.desde + 0.08);
              ubicar();
            };
            l.addEventListener("pointermove", mover);
            l.addEventListener("pointerup", () => l.removeEventListener("pointermove", mover), { once: true });
          });
        });
        tile.querySelector("[data-usar]").addEventListener("change", e => { d.usar = e.target.checked; tile.classList.toggle("off", !d.usar); });
        tile.querySelectorAll("[data-c]").forEach(inp => inp.addEventListener("input", () => { d[inp.dataset.c] = inp.value; if (inp.dataset.c === "concepto") inp.classList.toggle("falta", !inp.value.trim()); }));
        caja.appendChild(tile);
      });
    };
    const leer = async () => {
      estado(`✨ La IA está leyendo ${paneles.length} cuadro${paneles.length === 1 ? "" : "s"} (título, dibujo y explicación)…`);
      datos = paneles.map(() => ({ usar: true, concepto: "", pista: "", otras: "", explicacion: "", desde: 0.2, hasta: 0.82 }));
      pintar();
      const ia = await memoriaLeerPaneles(lienzo, paneles, tema);
      ia.forEach(x => {
        const d = datos[x.k]; if (!d) return;
        d.usar = x.es_carta !== false;
        d.concepto = x.concepto || ""; d.explicacion = x.explicacion || "";
        d.pista = typeof memoriaPistaSinConcepto === "function" ? memoriaPistaSinConcepto(x.pista || x.explicacion || "", d.concepto) : (x.pista || "");
        d.otras = x.otras || "";
        const a = Number(x.dibujo_desde), b = Number(x.dibujo_hasta);
        if (a >= 0 && b <= 1 && b - a > 0.15) { d.desde = a; d.hasta = b; }
      });
      pintar();
      estado(ia.length ? `Listo: ${ia.filter(x => x.es_carta !== false).length} carta(s). Revise que <b>entre las líneas no quede el título</b> y que cada concepto esté bien escrito.` : "No se pudo leer con IA: escriba los conceptos y ajuste las líneas a mano.");
    };

    $f("[data-filas]").value = "2"; $f("[data-cols]").value = "2";
    $f("[data-regrilla]").addEventListener("click", () => { paneles = memoriaGrilla(Number($f("[data-filas]").value), Number($f("[data-cols]").value)); leer(); });
    $f("[data-releer]").addEventListener("click", leer);
    $f("[data-cancelar]").addEventListener("click", () => cerrar([]));
    $f("[data-entera]").addEventListener("click", async () => {
      estado("Subiendo…");
      const blob = await new Promise(r => memoriaRecorte(lienzo, { x0: 0, y0: 0, x1: 1, y1: 1 }, 640).toBlob(r, "image/webp", 0.82));
      cerrar([{ img: await subir(blob), concepto: "", pista: "", otras: "" }]);
    });
    $f("[data-crear]").addEventListener("click", async ev => {
      const elegidos = paneles.map((p, i) => ({ p, d: datos[i] })).filter(x => x.d && x.d.usar);
      if (!elegidos.length) { estado("Marque al menos una carta."); return; }
      const falta = elegidos.findIndex(x => !(x.d.concepto || "").trim());
      if (falta >= 0) { estado(`<span style="color:var(--bad)">Falta el concepto de una carta (marcada en rojo).</span>`); return; }
      ev.target.disabled = true;
      const out = [];
      for (let k = 0; k < elegidos.length; k++) {
        estado(`Creando cartas… ${k + 1}/${elegidos.length}`);
        const { p, d } = elegidos[k], hP = p.y1 - p.y0;
        const caja = { x0: p.x0, x1: p.x1, y0: p.y0 + hP * d.desde, y1: p.y0 + hP * d.hasta };
        const blob = await new Promise(r => memoriaRecorte(lienzo, caja, 640).toBlob(r, "image/webp", 0.85));
        try { out.push({ img: await subir(blob), concepto: d.concepto.trim(), pista: (d.pista || "").trim(), otras: (d.otras || "").trim(), ...(d.explicacion ? { explicacion: d.explicacion } : {}) }); }
        catch (e) { estado(`<span style="color:var(--bad)">${e.message || e}</span>`); ev.target.disabled = false; return; }
      }
      cerrar(out);
    });
    leer();
  });
}
