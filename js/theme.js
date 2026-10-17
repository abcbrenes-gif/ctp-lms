// Tema claro/oscuro, dock de navegación flotante para celular, animación al
// aparecer en pantalla, y un pequeño confeti para momentos de éxito.
// Este archivo NO toca el resto de la plataforma — solo observa el DOM que
// ya se genera (#app) y agrega/actualiza elementos propios encima.
(function () {
  "use strict";

  // ---------- Tema oscuro/claro ----------
  var TEMA_KEY = "ctp-lms-tema";
  function temaGuardado() {
    try { return localStorage.getItem(TEMA_KEY); } catch (e) { return null; }
  }
  function guardarTema(t) {
    try { localStorage.setItem(TEMA_KEY, t); } catch (e) {}
  }
  function aplicarTema(t) {
    if (t === "light") document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");
    var btn = document.getElementById("ctp-theme-toggle");
    if (btn) btn.textContent = t === "light" ? "🌙" : "☀️";
  }
  aplicarTema(temaGuardado() || "dark");

  function crearToggle() {
    if (document.getElementById("ctp-theme-toggle")) return;
    var btn = document.createElement("button");
    btn.id = "ctp-theme-toggle";
    btn.type = "button";
    btn.className = "theme-toggle";
    btn.title = "Cambiar tema claro/oscuro";
    btn.setAttribute("aria-label", "Cambiar tema claro/oscuro");
    btn.textContent = (temaGuardado() || "dark") === "light" ? "🌙" : "☀️";
    btn.addEventListener("click", function () {
      var actual = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
      var siguiente = actual === "light" ? "dark" : "light";
      aplicarTema(siguiente);
      guardarTema(siguiente);
    });
    document.body.appendChild(btn);
  }

  // ---------- Dock de navegación flotante (se ve solo en celular) ----------
  function crearDock() {
    var existente = document.getElementById("ctp-dock-nav");
    if (existente) return existente;
    var dock = document.createElement("nav");
    dock.id = "ctp-dock-nav";
    dock.className = "dock-nav";
    document.body.appendChild(dock);
    return dock;
  }
  function sincronizarDock() {
    var navOriginal = document.querySelector(".topbar nav");
    var dock = crearDock();
    if (!navOriginal) { dock.innerHTML = ""; dock.removeAttribute("data-firma"); return; }
    var enlaces = Array.prototype.slice.call(navOriginal.querySelectorAll("a"));
    var firma = enlaces.map(function (a) { return (a.getAttribute("href") || "") + "|" + a.textContent; }).join(",");
    if (dock.getAttribute("data-firma") === firma) return;
    dock.setAttribute("data-firma", firma);
    dock.innerHTML = "";
    enlaces.forEach(function (original) {
      var clon = document.createElement("a");
      clon.href = original.getAttribute("href") || "#";
      clon.textContent = original.textContent;
      clon.addEventListener("click", function (ev) {
        ev.preventDefault();
        original.click();
      });
      dock.appendChild(clon);
    });
  }

  // ---------- Animación de entrada al hacer scroll ----------
  var SELECTORES_REVEAL = ".tema-section, .tema-header, .leccion-card, .tab-btn, .flip-card, .roster-row, .login-card, .profile-head, .badge-pill";
  var observerVisibilidad = ("IntersectionObserver" in window) ? new IntersectionObserver(function (entradas) {
    entradas.forEach(function (entrada) {
      if (entrada.isIntersecting) {
        entrada.target.classList.add("in-view");
        observerVisibilidad.unobserve(entrada.target);
      }
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }) : null;

  function marcarParaRevelar(raiz) {
    if (!raiz || !raiz.querySelectorAll) return;
    var nodos = raiz.querySelectorAll(SELECTORES_REVEAL);
    for (var i = 0; i < nodos.length; i++) {
      var el = nodos[i];
      if (el.classList.contains("reveal")) continue;
      el.classList.add("reveal");
      if (observerVisibilidad) observerVisibilidad.observe(el);
      else el.classList.add("in-view");
    }
  }

  function iniciar() {
    crearToggle();
    sincronizarDock();
    marcarParaRevelar(document.body);

    var app = document.getElementById("app");
    if (app && "MutationObserver" in window) {
      var mo = new MutationObserver(function () {
        sincronizarDock();
        marcarParaRevelar(app);
      });
      mo.observe(app, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }

  // ---------- Confeti para momentos de éxito (nota alta, logro, etc.) ----------
  window.lanzarConfeti = function (opts) {
    opts = opts || {};
    var cantidad = opts.cantidad || 60;
    var colores = ["#8B5CF6", "#06B6D4", "#EC4899", "#F97316", "#4ADE80"];
    var canvas = document.createElement("canvas");
    canvas.style.cssText = "position:fixed; inset:0; pointer-events:none; z-index:9999;";
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    var piezas = [];
    for (var i = 0; i < cantidad; i++) {
      piezas.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 140,
        y: canvas.height * 0.32,
        vx: (Math.random() - 0.5) * 8,
        vy: -(Math.random() * 6 + 4),
        g: 0.22,
        tam: Math.random() * 6 + 4,
        color: colores[Math.floor(Math.random() * colores.length)],
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3
      });
    }
    var inicio = Date.now();
    function cuadro() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      piezas.forEach(function (p) {
        p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.tam / 2, -p.tam / 2, p.tam, p.tam * 0.6);
        ctx.restore();
      });
      if (Date.now() - inicio < 1800) {
        requestAnimationFrame(cuadro);
      } else {
        canvas.remove();
      }
    }
    requestAnimationFrame(cuadro);
  };
})();
