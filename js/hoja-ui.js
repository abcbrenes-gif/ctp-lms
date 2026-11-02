// ─────────────────────────────────────────────────────────────────────────
// Hoja de cálculo reutilizable (interfaz tipo Excel) sobre hoja-calculo.js.
//   hojaUIMontar(contenedor, { obtener: () => objetoDeCeldas, guardar: () => {}, soloLectura })
// Clic en celdas para armar fórmulas (y arrastrar para rangos), $A$1, cuadrito
// de llenado, pegar desde Excel, Enter/Tab/flechas. Todo queda dentro del
// contenedor; el objeto de celdas lo guarda quien la usa.
// También: hojaVentana(...) abre la hoja en una ventana flotante que se
// puede minimizar, maximizar y cerrar.
// ─────────────────────────────────────────────────────────────────────────

(function () {
  if (document.getElementById("hj-estilos")) return;
  const st = document.createElement("style"); st.id = "hj-estilos";
  st.textContent = `
.hj-fx{display:flex;gap:8px;align-items:center;margin:0 0 6px;font-family:ui-monospace,Consolas,monospace;font-size:.85rem}
.hj-fx b{min-width:2.6rem;text-align:center;background:#f3f5f9;border:1px solid #dfe3ec;border-radius:7px;padding:4px;color:#17203a}
.hj-fx input{flex:1;border:1px solid #dfe3ec;border-radius:7px;padding:5px 8px;font-family:inherit;background:#fff;color:#17203a}
.hj-caja{position:relative;overflow:auto;border:1px solid #dfe3ec;border-radius:10px;user-select:none;background:#fff}
.hj-caja table{border-collapse:separate;border-spacing:0;font-size:.84rem;width:max-content}
.hj-caja th,.hj-caja td{border:0;border-right:1px solid #e3e7ef;border-bottom:1px solid #e3e7ef;padding:0;background:#fff}
.hj-caja thead th{position:sticky;top:0;background:#f3f5f9;text-align:center;padding:4px 0;z-index:1;color:#5d6785;font-weight:700}
.hj-caja tbody th{position:sticky;left:0;background:#f3f5f9;text-align:center;width:2.4rem;font-size:.75rem;color:#5d6785;z-index:1}
.hj-caja input{width:8.5rem;border:0;padding:6px 7px;font-family:ui-monospace,Consolas,monospace;font-size:.84rem;background:#fff;color:#17203a;outline:none}
.hj-caja input.num{text-align:right}.hj-caja input.err{color:#c62f3c}.hj-caja input:disabled{background:#f7f8fc}
.hj-caja td.sel input{box-shadow:inset 0 0 0 2px #2446c7}
.hj-caja td.refd input{background:#e3ecff;box-shadow:inset 0 0 0 1px #6d8cf0}
.hj-asa{position:absolute;width:9px;height:9px;background:#2446c7;border:2px solid #fff;cursor:crosshair;z-index:3}
.hj-win{position:fixed;right:18px;bottom:18px;width:min(760px,calc(100vw - 36px));height:min(470px,calc(100vh - 36px));z-index:9000;background:#fff;color:#17203a;border:1px solid #cfd6e6;border-radius:14px;box-shadow:0 18px 50px rgba(15,20,40,.35);display:flex;flex-direction:column;overflow:hidden;font-family:inherit}
.hj-win.max{inset:10px;width:auto;height:auto}
.hj-win.min{height:auto;width:min(340px,calc(100vw - 36px))}
.hj-win.min .hj-cuerpo{display:none}
.hj-bar{display:flex;align-items:center;gap:6px;padding:7px 8px 7px 12px;background:linear-gradient(90deg,#2446c7,#6d3df0);color:#fff;cursor:default}
.hj-bar b{flex:1;font-size:.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hj-bar button{border:0;background:#ffffff26;color:#fff;border-radius:7px;width:30px;height:28px;cursor:pointer;font-weight:800;font-size:.95rem}
.hj-bar button:hover{background:#ffffff40}
.hj-cuerpo{flex:1;min-height:0;display:flex;flex-direction:column;padding:8px 10px 10px}
.hj-cuerpo .hj-caja{flex:1;min-height:0}
.hj-herr{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 6px}
.hj-herr button{border:1px solid #dfe3ec;background:#f7f8fc;border-radius:8px;padding:5px 9px;cursor:pointer;font:inherit;font-size:.8rem;font-weight:600;color:#17203a}
.hj-nota{font-size:.75rem;color:#5d6785;margin:0 0 6px}
@media (max-width:600px){.hj-win{right:8px;bottom:8px;width:calc(100vw - 16px)}}`;
  document.head.appendChild(st);
})();

const hjEsc = t => String(t == null ? "" : t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function hojaUIMontar(cont, opts) {
  const H = () => opts.obtener() || {};
  const ro = !!opts.soloLectura;
  const celdaTxt = ref => { const raw = H()[ref]; if (raw == null || raw === "") return { txt: "", cls: "" }; const r = hojaValorCelda(H(), ref); return { txt: hojaMostrar(r), cls: r.error ? "err" : typeof r.valor === "number" ? "num" : "" }; };
  cont.innerHTML = `<div class="hj-fx"><b data-hj="ref">A1</b><span style="color:#5d6785">fx</span><input data-hj="fx" placeholder="Contenido de la celda" ${ro ? "disabled" : ""}></div>
    <div class="hj-caja" data-hj="caja"><table><thead><tr><th></th>${HOJA_COLS.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>
    ${Array.from({ length: HOJA_FILAS }, (_, i) => `<tr><th>${i + 1}</th>${HOJA_COLS.map(c => { const ref = c + (i + 1), x = celdaTxt(ref); return `<td data-td="${ref}"><input data-cel="${ref}" class="${x.cls}" value="${hjEsc(x.txt)}" aria-label="Celda ${ref}" autocomplete="off" spellcheck="false" ${ro ? "disabled" : ""}></td>`; }).join("")}</tr>`).join("")}
    </tbody></table><div class="hj-asa" data-hj="asa" hidden title="Arrastrá para copiar"></div></div>`;
  const q = s => cont.querySelector(s);
  const fx = q('[data-hj="fx"]'), fr = q('[data-hj="ref"]'), caja = q('[data-hj="caja"]'), asa = q('[data-hj="asa"]');
  const poner = (ref, txt) => { const h = opts.obtener(); if (!h) return; if (txt === "") delete h[ref]; else h[ref] = txt; opts.guardar && opts.guardar(); };
  const inpDe = ref => cont.querySelector(`[data-cel="${ref}"]`);
  const partes = ref => ({ c: HOJA_COLS.indexOf(ref[0]), f: Number(ref.slice(1)) });
  const refrescar = () => cont.querySelectorAll("[data-cel]").forEach(inp => { if (inp === document.activeElement) return; const x = celdaTxt(inp.dataset.cel); inp.value = x.txt; inp.className = x.cls; });
  if (ro) return { refrescar };
  let actual = "A1", editando = null, apuntando = null, clicPendiente = null, llenando = null;
  const marcar = (cls, refs) => { cont.querySelectorAll("." + cls).forEach(x => x.classList.remove(cls)); (refs || []).forEach(r => { const td = cont.querySelector(`[data-td="${r}"]`); if (td) td.classList.add(cls); }); };
  const rangoRefs = (a, b) => { const A = partes(a), B = partes(b), out = []; for (let c = Math.min(A.c, B.c); c <= Math.max(A.c, B.c); c++) for (let f = Math.min(A.f, B.f); f <= Math.max(A.f, B.f); f++) out.push(HOJA_COLS[c] + f); return out; };
  const ponerAsa = () => { const td = cont.querySelector(`[data-td="${actual}"]`); if (!td) { asa.hidden = true; return; } const r = td.getBoundingClientRect(), rc = caja.getBoundingClientRect(); asa.style.left = (r.right - rc.left + caja.scrollLeft - 5) + "px"; asa.style.top = (r.bottom - rc.top + caja.scrollTop - 5) + "px"; asa.hidden = false; };
  const aceptaRef = inp => { const val = inp.value, pos = inp.selectionEnd == null ? val.length : inp.selectionEnd; if (!hojaEsFormula(val + "0") && !/^[=+]$/.test(val.trim())) return false; const antes = val.slice(0, pos).replace(/\s+$/, ""); return /[=+\-*/^(;,<>&%]$/.test(antes) || !!(apuntando && apuntando.ini != null); };
  const insertarRef = (inp, texto) => {
    const val = inp.value;
    if (apuntando && apuntando.ini != null) { inp.value = val.slice(0, apuntando.ini) + texto + val.slice(apuntando.fin); apuntando.fin = apuntando.ini + texto.length; }
    else { const pos = inp.selectionStart == null ? val.length : inp.selectionStart; inp.value = val.slice(0, pos) + texto + val.slice(inp.selectionEnd == null ? pos : inp.selectionEnd); apuntando = { ...(apuntando || {}), ini: pos, fin: pos + texto.length }; }
    inp.setSelectionRange(apuntando.fin, apuntando.fin); fx.value = inp.value; poner(inp.dataset.cel, inp.value);
  };
  cont.querySelectorAll("[data-cel]").forEach(inp => {
    inp.addEventListener("mousedown", () => { clicPendiente = document.activeElement === inp ? null : inp; });
    inp.addEventListener("dblclick", () => { const n = inp.value.length; inp.setSelectionRange(n, n); });
    inp.addEventListener("focus", () => {
      actual = inp.dataset.cel; editando = inp; apuntando = null; fr.textContent = actual;
      inp.value = H()[actual] || ""; fx.value = inp.value; inp.className = ""; marcar("sel", [actual]); ponerAsa(); inp.select();
      if (clicPendiente === inp) { const fin = ev => { ev.preventDefault(); inp.removeEventListener("mouseup", fin); }; inp.addEventListener("mouseup", fin); }
    });
    inp.addEventListener("input", () => { apuntando = null; marcar("refd"); fx.value = inp.value; poner(inp.dataset.cel, inp.value); });
    inp.addEventListener("blur", () => { if (apuntando && apuntando.arrastrando) return; poner(inp.dataset.cel, inp.value.trim()); editando = null; apuntando = null; marcar("refd"); refrescar(); });
    inp.addEventListener("keydown", e => {
      const { c, f } = partes(inp.dataset.cel); let dest = null;
      if (e.key === "Enter") dest = HOJA_COLS[c] + Math.max(1, Math.min(HOJA_FILAS, f + (e.shiftKey ? -1 : 1)));
      else if (e.key === "Tab") dest = HOJA_COLS[Math.max(0, Math.min(HOJA_COLS.length - 1, c + (e.shiftKey ? -1 : 1)))] + f;
      else if (e.key === "Escape") { inp.value = H()[inp.dataset.cel] || ""; inp.blur(); return; }
      else if (!hojaEsFormula(inp.value) && !/^[=+]$/.test(inp.value.trim())) {
        if (e.key === "ArrowDown") dest = HOJA_COLS[c] + Math.min(HOJA_FILAS, f + 1);
        else if (e.key === "ArrowUp") dest = HOJA_COLS[c] + Math.max(1, f - 1);
        else if (e.key === "ArrowRight" && inp.selectionStart === inp.value.length) dest = HOJA_COLS[Math.min(HOJA_COLS.length - 1, c + 1)] + f;
        else if (e.key === "ArrowLeft" && inp.selectionStart === 0 && inp.selectionEnd === 0) dest = HOJA_COLS[Math.max(0, c - 1)] + f;
      }
      if (dest) { e.preventDefault(); const t = inpDe(dest); if (t) t.focus(); }
    });
  });
  caja.addEventListener("mousedown", e => {
    const td = e.target.closest("[data-td]"); if (!td || !editando) return;
    const ref = td.dataset.td; if (ref === editando.dataset.cel || !aceptaRef(editando)) return;
    e.preventDefault(); apuntando = { ...(apuntando || {}), desde: ref, hasta: ref, arrastrando: true };
    insertarRef(editando, ref); marcar("refd", [ref]);
  });
  caja.addEventListener("mouseover", e => {
    const td = e.target.closest("[data-td]"); if (!td) return;
    if (apuntando && apuntando.arrastrando && editando && td.dataset.td !== apuntando.hasta) {
      apuntando.hasta = td.dataset.td; const txt = apuntando.desde === apuntando.hasta ? apuntando.desde : apuntando.desde + ":" + apuntando.hasta;
      insertarRef(editando, txt); marcar("refd", rangoRefs(apuntando.desde, apuntando.hasta));
    }
    if (llenando) { const o = partes(llenando.origen), t = partes(td.dataset.td);
      llenando.hasta = Math.abs(t.f - o.f) >= Math.abs(t.c - o.c) ? HOJA_COLS[o.c] + Math.max(o.f, t.f) : HOJA_COLS[Math.max(o.c, t.c)] + o.f;
      marcar("refd", rangoRefs(llenando.origen, llenando.hasta)); }
  });
  asa.addEventListener("mousedown", e => { e.preventDefault(); if (editando) poner(editando.dataset.cel, editando.value.trim()); llenando = { origen: actual, hasta: actual }; });
  const alSoltar = () => {
    if (!cont.isConnected) { document.removeEventListener("mouseup", alSoltar); return; }
    if (apuntando && apuntando.arrastrando) { apuntando.arrastrando = false; if (editando) editando.focus(); }
    if (llenando) { const { origen, hasta } = llenando; llenando = null; marcar("refd");
      const raw = H()[origen]; if (raw != null && origen !== hasta) { const o = partes(origen); rangoRefs(origen, hasta).forEach(ref => { if (ref === origen) return; const t = partes(ref); poner(ref, hojaDesplazar(raw, t.c - o.c, t.f - o.f)); }); editando = null; refrescar(); ponerAsa(); } }
  };
  document.addEventListener("mouseup", alSoltar);
  caja.addEventListener("scroll", ponerAsa);
  fx.addEventListener("input", () => { poner(actual, fx.value); const t = inpDe(actual); if (t) t.value = fx.value; });
  fx.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); poner(actual, fx.value.trim()); refrescar(); const { c, f } = partes(actual); const t = inpDe(HOJA_COLS[c] + Math.min(HOJA_FILAS, f + 1)); if (t) t.focus(); } });
  fx.addEventListener("change", () => { poner(actual, fx.value.trim()); refrescar(); });
  caja.addEventListener("paste", e => {
    const txt = (e.clipboardData || window.clipboardData).getData("text"); if (!txt || !/[\t\n]/.test(txt.trim()) || !editando) return;
    e.preventDefault(); const o = partes(editando.dataset.cel);
    txt.replace(/\r/g, "").replace(/\n$/, "").split("\n").forEach((fila, i) => fila.split("\t").forEach((val, j) => { const c = o.c + j, f = o.f + i; if (c < HOJA_COLS.length && f <= HOJA_FILAS) poner(HOJA_COLS[c] + f, val.trim()); }));
    editando.blur(); refrescar();
  });
  return { refrescar };
}

// Ventana flotante con la hoja: se puede minimizar, maximizar y cerrar.
// opts: { id, titulo, obtener, guardar, soloLectura, herramientas: [[texto, fn]] , nota }
function hojaVentana(opts) {
  let w = document.querySelector(`.hj-win[data-id="${opts.id}"]`);
  if (w) { w.classList.remove("min"); w.style.zIndex = 9001; return w; }
  document.querySelectorAll(".hj-win").forEach(x => x.classList.add("min"));
  w = document.createElement("div"); w.className = "hj-win"; w.dataset.id = opts.id;
  w.innerHTML = `<div class="hj-bar"><b>🧮 ${hjEsc(opts.titulo)}</b><button type="button" data-hjw="min" title="Minimizar">—</button><button type="button" data-hjw="max" title="Maximizar">▢</button><button type="button" data-hjw="x" title="Cerrar">✕</button></div>
    <div class="hj-cuerpo">${opts.nota ? `<p class="hj-nota">${opts.nota}</p>` : ""}${(opts.herramientas || []).length && !opts.soloLectura ? `<div class="hj-herr">${opts.herramientas.map((h, i) => `<button type="button" data-hjh="${i}">${hjEsc(h[0])}</button>`).join("")}</div>` : ""}<div data-hj="hoja" style="display:flex;flex-direction:column;flex:1;min-height:0"></div></div>`;
  document.body.appendChild(w);
  const ui = hojaUIMontar(w.querySelector('[data-hj="hoja"]'), opts);
  w.querySelector('[data-hjw="min"]').onclick = () => { w.classList.toggle("min"); w.classList.remove("max"); };
  w.querySelector('[data-hjw="max"]').onclick = () => { w.classList.toggle("max"); w.classList.remove("min"); };
  w.querySelector('[data-hjw="x"]').onclick = () => w.remove();
  w.querySelector(".hj-bar").addEventListener("dblclick", () => { w.classList.toggle("max"); w.classList.remove("min"); });
  w.querySelectorAll("[data-hjh]").forEach(b => b.onclick = () => { opts.herramientas[+b.dataset.hjh][1](); const cont = w.querySelector('[data-hj="hoja"]'); hojaUIMontar(cont, opts); });
  return w;
}
