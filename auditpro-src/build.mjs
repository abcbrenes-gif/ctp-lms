// Compila AuditPro CTP: JSX → js/auditpro.js (esbuild) y Tailwind → css/auditpro.css.
// Uso: NODE_PATH=<carpeta con react, react-dom, tailwindcss y esbuild> node auditpro-src/build.mjs
import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module"; import { fileURLToPath } from "node:url";
const aqui = path.dirname(fileURLToPath(import.meta.url)), raiz = path.join(aqui, ".."), NP = process.env.NODE_PATH;
const req = createRequire(path.join(NP, "x.js")), esbuild = req("esbuild"), tw = req("tailwindcss");
await esbuild.build({ entryPoints: [path.join(aqui, "AuditPro.jsx")], bundle: true, minify: true, format: "iife", target: "es2019", nodePaths: [NP],
  define: { "process.env.NODE_ENV": '"production"' }, outfile: path.join(raiz, "js/auditpro.js"), legalComments: "none" });
const fuentes = ["AuditPro.jsx", "contenido.js", "pruebas.js"].map(f => fs.readFileSync(path.join(aqui, f), "utf8")).join("\n");
const candidatos = [...new Set(fuentes.split(/[\s"'`<>{}()=,;]+/).filter(Boolean))];
const twDir = path.dirname(req.resolve("tailwindcss/package.json"));
const comp = await tw.compile(fs.readFileSync(path.join(aqui, "estilos.css"), "utf8"), { base: aqui,
  loadStylesheet: async (id, base) => { const p = id === "tailwindcss" ? path.join(twDir, "index.css") : id.startsWith("tailwindcss/") ? path.join(twDir, id.slice(12)) : path.resolve(base, id);
    return { path: p, base: path.dirname(p), content: fs.readFileSync(p, "utf8") }; } });
const css = comp.build(candidatos);
fs.writeFileSync(path.join(raiz, "css/auditpro.css"), css);
console.log("js", fs.statSync(path.join(raiz, "js/auditpro.js")).size, "css", css.length);
