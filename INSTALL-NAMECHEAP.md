# Instalación en Namecheap (Node.js App) – FuN Costa Rica

La app es un servidor **Node.js + Express** con base de datos **SQLite** (`sql.js`, sin compilar nada).
La base se crea sola en `data/fun.db` la primera vez que arranca (también con `npm run setup`).

## 1. Preparar el paquete (en tu PC)

```powershell
npm install
npm run build
npm run package     # crea la carpeta deploy/
```

Comprime **el contenido** de `deploy/` en un `.zip` (`app.cjs`, `server/`, `dist/`, `package.json`).

## 2. Subir y configurar en cPanel

1. cPanel → **Setup Node.js App** → **Create Application**.
   - Node.js version: **18 o superior** (20/22 recomendado)
   - Application mode: **Production**
   - Application root: `fun-costa-rica` (carpeta nueva)
   - Application URL: tu dominio o subdominio
   - Application startup file: **`app.cjs`**
2. En **File Manager** sube el `.zip` a la *Application root* y extráelo.
3. En la pantalla de la app pulsa **Run NPM Install** (instala `express` y `sql.js`).
4. En **Environment variables** agrega (muy recomendado):

   | Variable | Valor |
   |---|---|
   | `ADMIN_USER` | tu usuario admin (por defecto `funcr`) |
   | `ADMIN_PASS` | tu contraseña admin (por defecto `funcr123`) — **cámbiala** |
   | `SESSION_SECRET` | cualquier texto largo aleatorio |

5. Pulsa **Restart**. Abre tu dominio: debe cargar la pizarra.

## 3. Datos y respaldos

- Base de datos: `data/fun.db` · Fotos/videos subidos: `data/uploads/`
- Respaldo = descargar la carpeta `data/`. **No la borres al actualizar la app.**
- Para actualizar: sube de nuevo `dist/` y `server/` (sin tocar `data/`) y reinicia.
- Para recrear la base con datos de ejemplo: borra `data/fun.db` y reinicia (o `npm run setup`).

## 4. Desarrollo local

```powershell
npm run dev:server   # API + SQLite en http://localhost:8080
npm run dev          # Vite en http://localhost:5173 (usa la API por proxy)
# o, producción local:
npm run build; npm start   # http://localhost:8080
```

## Herramientas del menú

- 📺 **Pizarra Flotante**: pantalla de fondo del evento (spotlight automático).
- 🃏 **Tarjetas**: creador con muestras, imagen (subida o meme) y vista de teleprompter a pantalla completa.
- 😂 **Memes**: buscador del catálogo curado (`public/memes`) → "Usar en una tarjeta".
- 🎨 **Ad Studio**: generador de piezas publicitarias en PNG.
- ⚙️ **Admin**: moderación, configuración y exportación.
