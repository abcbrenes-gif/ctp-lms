# Plataforma de Contabilidad — CTP Mercedes Norte

Mini-LMS para el profesor Andrés Brenes Conejo: perfiles de estudiantes por sección (10-1 y 11-3), notas por materia y tareas asignadas.

Es un sitio 100% estático (HTML/CSS/JS puro, sin frameworks ni servidor), así que Vercel lo despliega sin ningún paso de compilación.

## Cómo funciona por dentro

- `index.html` — carga la app.
- `css/style.css` — estilos.
- `js/data.js` — lista de estudiantes (editable a mano si cambia la matrícula).
- `js/app.js` — rutas, notas y tareas. Todo se guarda en `localStorage` del navegador (es decir, solo tú lo ves, y solo en el navegador/computadora donde lo abras).

## 1. Subirlo a GitHub

1. Crea un repositorio nuevo en GitHub (por ejemplo `ctp-contabilidad-lms`), vacío, sin README.
2. En tu computadora, dentro de esta carpeta descargada, abre una terminal y ejecuta:
   ```bash
   git init
   git add .
   git commit -m "Primera versión de la plataforma"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/ctp-contabilidad-lms.git
   git push -u origin main
   ```

## 2. Conectarlo a Vercel

1. Entra a [vercel.com](https://vercel.com) → **Add New → Project**.
2. Elige **Import Git Repository** y selecciona el repositorio que acabas de subir.
3. Framework Preset: déjalo en **Other** (no necesita build). Build Command y Output Directory: déjalos vacíos.
4. Haz clic en **Deploy**. En menos de un minuto tendrás una URL pública tipo `ctp-contabilidad-lms.vercel.app`.
5. Cada vez que hagas `git push` a `main`, Vercel actualiza el sitio automáticamente.

## 3. Uso diario

- Entra con tu nombre (ya viene precargado el tuyo).
- Elige la sección (10-1 o 11-3).
- Haz clic en un estudiante para ver su perfil, agregar notas o tareas.

## Siguiente paso recomendado (si necesitas usarlo desde varios dispositivos)

Ahora mismo las notas y tareas viven solo en el navegador donde las escribes — si entras desde el celular no verás lo que guardaste en la computadora. Para que los datos se compartan entre dispositivos hace falta una base de datos real. La opción más simple para conectar con Vercel es **Supabase** (gratis para este tamaño de proyecto): se crea una tabla de notas y otra de tareas, y se reemplazan las funciones `loadState`/`saveState` de `js/app.js` por llamadas a la API de Supabase. Si quieres, puedo ayudarte con ese paso cuando lo necesites.
