// Memoria Contable — separa un PDF en cartas: cada imagen del PDF con el
// texto que tiene debajo (su explicación). Funciona con PDF hechos en Word,
// PowerPoint, Canva, etc. (imágenes y texto reales, no una página escaneada).
// Devuelve [{ blob, texto, pagina }]. Usa pdf.js alojado en la plataforma.
async function memoriaExtraerCartasDePdf(file, progreso) {
  const pdfjs = await import(new URL("js/vendor/pdfjs/pdf.min.mjs", location.href).href);
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("js/vendor/pdfjs/pdf.worker.min.mjs", location.href).href;
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const OPS = pdfjs.OPS;
  const ESCALA = 2;
  const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  const ap = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  const cartas = [], avisos = [], laminas = [];

  for (let p = 1; p <= pdf.numPages; p++) {
    if (progreso) progreso(`Leyendo página ${p} de ${pdf.numPages}…`);
    const page = await pdf.getPage(p);
    const vp = page.getViewport({ scale: ESCALA });
    const ops = await page.getOperatorList();

    // 1) Dónde se dibuja cada imagen (siguiendo la matriz de transformación).
    let ctm = [1, 0, 0, 1, 0, 0];
    const pila = [], cajas = [];
    for (let i = 0; i < ops.fnArray.length; i++) {
      const fn = ops.fnArray[i], a = ops.argsArray[i];
      if (fn === OPS.save) pila.push(ctm);
      else if (fn === OPS.restore) ctm = pila.pop() || ctm;
      else if (fn === OPS.transform) ctm = mul(ctm, a);
      else if (fn === OPS.paintFormXObjectBegin) { pila.push(ctm); if (a && Array.isArray(a[0]) || (a && a[0] && a[0].length === 6)) ctm = mul(ctm, Array.from(a[0])); }
      else if (fn === OPS.paintFormXObjectEnd) ctm = pila.pop() || ctm;
      else if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject || fn === OPS.paintImageXObjectRepeat) {
        const pts = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y]) => vp.convertToViewportPoint(...ap(ctm, x, y)));
        const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
        cajas.push({ x0: Math.max(0, Math.min(...xs)), y0: Math.max(0, Math.min(...ys)), x1: Math.min(vp.width, Math.max(...xs)), y1: Math.min(vp.height, Math.max(...ys)) });
      }
    }
    // Quitar fondos (casi toda la página), adornos muy pequeños y repetidas.
    const areaPag = vp.width * vp.height;
    let imgs = cajas.filter(c => (c.x1 - c.x0) > 40 && (c.y1 - c.y0) > 40 && (c.x1 - c.x0) * (c.y1 - c.y0) < areaPag * 0.8);
    const solapa = (a, b) => { const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0); return w > 0 && h > 0 ? w * h / Math.min((a.x1 - a.x0) * (a.y1 - a.y0), (b.x1 - b.x0) * (b.y1 - b.y0)) : 0; };
    const unidas = [];
    imgs.forEach(c => { const u = unidas.find(x => solapa(x, c) > 0.5); if (u) { u.x0 = Math.min(u.x0, c.x0); u.y0 = Math.min(u.y0, c.y0); u.x1 = Math.max(u.x1, c.x1); u.y1 = Math.max(u.y1, c.y1); } else unidas.push({ ...c }); });
    imgs = unidas.sort((a, b) => Math.abs(a.y0 - b.y0) > 30 ? a.y0 - b.y0 : a.x0 - b.x0);
    if (!imgs.length) {
      // Página escaneada o hecha de una sola imagen: se devuelve entera para
      // dividirla como lámina (cuadros con título, dibujo y explicación).
      const lam = document.createElement("canvas");
      lam.width = Math.ceil(vp.width); lam.height = Math.ceil(vp.height);
      await page.render({ canvasContext: lam.getContext("2d"), viewport: vp }).promise;
      laminas.push({ lienzo: lam, pagina: p });
      page.cleanup();
      continue;
    }

    // 2) Líneas de texto con su posición.
    const tc = await page.getTextContent();
    const piezas = tc.items.filter(t => t.str && t.str.trim()).map(t => {
      const [x, y] = vp.convertToViewportPoint(t.transform[4], t.transform[5]);
      const alto = Math.max(6, Math.hypot(t.transform[2], t.transform[3]) * ESCALA);
      return { x, y, w: (t.width || 0) * ESCALA, alto, str: t.str };
    }).sort((a, b) => a.y - b.y || a.x - b.x);
    const lineas = [];
    piezas.forEach(t => {
      const l = lineas.find(L => Math.abs(L.y - t.y) < Math.max(4, t.alto * 0.45) && t.x < L.x1 + t.alto * 1.2 && t.x + t.w > L.x0 - t.alto * 1.2);
      if (l) { l.partes.push(t); l.x0 = Math.min(l.x0, t.x); l.x1 = Math.max(l.x1, t.x + t.w); l.alto = Math.max(l.alto, t.alto); }
      else lineas.push({ y: t.y, x0: t.x, x1: t.x + t.w, alto: t.alto, partes: [t] });
    });
    lineas.forEach(l => { l.partes.sort((a, b) => a.x - b.x); l.texto = l.partes.map(t => t.str).join(" ").replace(/\s+/g, " ").trim(); });
    lineas.sort((a, b) => a.y - b.y || a.x0 - b.x0);
    const usadas = new Set();

    // 3) Para cada imagen, el texto que tiene debajo (hasta la siguiente imagen de esa columna).
    const textoDe = c => {
      const cruza = l => l.x0 < c.x1 + 10 && l.x1 > c.x0 - 10;
      const siguiente = imgs.filter(o => o !== c && o.y0 > c.y1 - 5 && o.x0 < c.x1 && o.x1 > c.x0).reduce((m, o) => Math.min(m, o.y0), vp.height);
      const debajo = lineas.filter(l => !usadas.has(l) && cruza(l) && l.y > c.y1 - 2 && l.y - l.alto < siguiente);
      const sel = [];
      for (const l of debajo) {
        const prev = sel.length ? sel[sel.length - 1] : null;
        const gap = prev ? l.y - prev.y : l.y - c.y1;
        if (!prev && gap > vp.height * 0.2) break;
        if (prev && gap > Math.max(prev.alto, l.alto) * 3) break;
        sel.push(l);
      }
      if (!sel.length) { // si no hay nada abajo, el título que esté justo arriba
        const arriba = lineas.filter(l => !usadas.has(l) && cruza(l) && l.y < c.y0 + 2 && c.y0 - l.y < vp.height * 0.08);
        if (arriba.length) sel.push(arriba[arriba.length - 1]);
      }
      sel.forEach(l => usadas.add(l));
      return sel.map(l => l.texto).join("\n");
    };
    const textos = imgs.map(textoDe);

    // 4) Recortar cada imagen de la página dibujada.
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.ceil(vp.width); lienzo.height = Math.ceil(vp.height);
    await page.render({ canvasContext: lienzo.getContext("2d"), viewport: vp }).promise;
    for (let k = 0; k < imgs.length; k++) {
      const c = imgs[k], w = Math.round(c.x1 - c.x0), h = Math.round(c.y1 - c.y0);
      const k2 = Math.min(1, 640 / Math.max(w, h));
      const cv = document.createElement("canvas");
      cv.width = Math.max(1, Math.round(w * k2)); cv.height = Math.max(1, Math.round(h * k2));
      cv.getContext("2d").drawImage(lienzo, Math.round(c.x0), Math.round(c.y0), w, h, 0, 0, cv.width, cv.height);
      const blob = await new Promise(r => cv.toBlob(r, "image/webp", 0.82));
      if (blob) cartas.push({ blob, texto: textos[k], pagina: p });
    }
    page.cleanup();
  }
  return { cartas, avisos, laminas };
}

// Saca el concepto (lo que el estudiante debe escribir) y una pista de cada
// explicación. Primero lo intenta con IA; si no hay conexión, usa la primera
// línea como concepto y el resto como pista.
async function memoriaConceptosDeTextos(textos, tema) {
  const local = textos.map(t => {
    const lineas = String(t || "").split("\n").map(x => x.trim()).filter(Boolean);
    const concepto = (lineas[0] || "").replace(/[:.\-–—]+$/, "").trim();
    return { concepto, pista: memoriaPistaSinConcepto(lineas.slice(1).join(" "), concepto), otras: "" };
  });
  try {
    const r = await fetch("/api/memoria-conceptos", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ textos, tema }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !Array.isArray(j.cartas)) return local;
    return textos.map((t, i) => {
      const x = j.cartas.find(c => Number(c.i) === i);
      if (!x || !x.concepto) return local[i];
      return { concepto: x.concepto, pista: memoriaPistaSinConcepto(x.pista || "", x.concepto), otras: x.otras || "" };
    });
  } catch (e) { return local; }
}
function memoriaPistaSinConcepto(pista, concepto) {
  // Tapa en la pista las palabras del concepto, para que no regale la respuesta.
  const n = w => String(w || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9ñ]/g, "");
  const claves = new Set(String(concepto || "").split(/\s+/).map(n).filter(w => w.length > 3));
  let p = String(pista || "").replace(/\s+/g, " ").trim().split(/(\s+)/).map(tok => claves.has(n(tok)) ? tok.replace(/[\p{L}\p{N}]+/u, "___") : tok).join("");
  return p.length > 120 ? p.slice(0, 117).replace(/\s+\S*$/, "") + "…" : p;
}
