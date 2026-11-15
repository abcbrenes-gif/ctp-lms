# AuditPro CTP (prototipo 2027, solo docente)

Aplicación educativa de auditoría en React + Tailwind CSS. Se abre desde 📅 2027 → Herramientas 2027.

- `AuditPro.jsx`: interfaz (La Brújula y Laboratorio AuditCity).
- `contenido.js`: textos de COSO, fases, Ley 8292, reto y pruebas.
- `pruebas.js`: lógica de las pruebas analíticas.
- `datos.js`: datos ficticios del caso Municipalidad de Valle Sereno.
- `estilos.css`: entrada de Tailwind y animaciones.

Para recompilar a `js/auditpro.js` y `css/auditpro.css` (requiere react, react-dom, tailwindcss 4 y esbuild en la carpeta indicada):

    NODE_PATH=/ruta/a/node_modules node auditpro-src/build.mjs

No guarda notas ni toca la base de datos: el avance (XP y hallazgos) queda solo en el navegador.
