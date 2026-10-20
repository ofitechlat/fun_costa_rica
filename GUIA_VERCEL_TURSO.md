# 🚀 Guía de Despliegue en Vercel con SQLite en la Nube (Turso / libSQL)

**Proyecto:** Fuckup Nights San José, Costa Rica (`fun_costa_rica`)  
**Objetivo:** Permitir que 2 o más personas conectadas a la misma URL de Vercel compartan la misma base de datos SQLite en tiempo real (creación, edición y moderación de cagadas).

---

## 🧠 ¿Por qué se necesita Turso en Vercel?

En servidores tradicionales (como tu PC o cPanel), el archivo `data/fun.db` vive en un disco duro permanente.

Sin embargo, **Vercel es Serverless**:
- Cada usuario que entra activa una instancia temporal (lambda) sin disco duro compartido.
- Si dos personas entran a Vercel, caen en servidores temporales distintos y un archivo SQLite local no se sincronizaría.
- **Solución:** **Turso** es SQLite distribuido en la nube (100% gratuito, plan libre de hasta 500 bases de datos y 9 GB de almacenamiento). Con Turso, todas las instancias de Vercel consultan la misma base de datos SQLite compartida al instante.

---

## 🛠️ Paso 1: Crear la Base de Datos SQLite Gratuita en Turso (2 minutos)

1. Ve a **[https://turso.tech](https://turso.tech)** e inicia sesión con tu cuenta de GitHub.
2. En el panel de Turso (o en tu terminal con `turso db create`), haz clic en **"Create Database"**:
   - **Name:** `fun-costa-rica`
   - **Location:** Elige la más cercana (ej. `iad` / Washington DC o Miami).
3. Una vez creada la base de datos, Turso te mostrará:
   - **Database URL:** (Ejemplo: `libsql://fun-costa-rica-tuusuario.turso.io`)
4. Genera un token de autenticación haciendo clic en **"Generate Token"** (o ejecuta `turso db tokens create fun-costa-rica`).
   - Copia el **Auth Token**.

---

## ⚙️ Paso 2: Configurar las Variables de Entorno en Vercel

1. Ve a tu proyecto en **[Vercel Dashboard](https://vercel.com)**.
2. Entra a **Settings** $\rightarrow$ **Environment Variables**.
3. Agrega las siguientes dos variables:

| Variable | Valor | Descripción |
|---|---|---|
| `TURSO_DATABASE_URL` | `libsql://fun-costa-rica-tuusuario.turso.io` | URL de tu base de datos SQLite en Turso |
| `TURSO_AUTH_TOKEN` | `eyJhbGciOi...` | Token secreto generado en Turso |

*(Opcional: Si deseas cambiar la contraseña de admin en Vercel, agrega también `ADMIN_USER` y `ADMIN_PASS`).*

---

## 🚀 Paso 3: Desplegar en Vercel

El proyecto ya incluye la configuración lista en el repositorio:
- [vercel.json](file:///c:/Users/tapac/OneDrive/Documents/FUN%20COSTA%20RICA/vercel.json): Redirige automáticamente las llamadas de `/api/*` a las funciones serverless y sirve los archivos estáticos de Vite (`dist`).
- [api/index.cjs](file:///c:/Users/tapac/OneDrive/Documents/FUN%20COSTA%20RICA/api/index.cjs): Punto de entrada Serverless para Express.
- [server/db.cjs](file:///c:/Users/tapac/OneDrive/Documents/FUN%20COSTA%20RICA/server/db.cjs): Conector dual inteligente que detecta Turso automáticamente si las variables están presentes.

**Para desplegar:**
1. Solo haz push a tu repositorio en GitHub:
   ```bash
   git push origin main
   ```
2. Vercel detectará el commit y compilará la aplicación automáticamente.
3. Al arrancar por primera vez, Turso creará las tablas (`stories` y `config`) y cargará automáticamente las historias demo oficiales con sus memes y videos.

---

## 👥 ¿Cómo funciona la conexión entre 2 personas?

1. **Persona A** abre el enlace de Vercel en su laptop o celular (ej. `https://fun-costa-rica.vercel.app/`).
2. **Persona B** abre el mismo enlace en otro dispositivo (o proyector del evento).
3. Cuando **Persona A** confiesa una cagada o aprueba una tarjeta desde el Admin:
   - Los datos se guardan al instante en **Turso SQLite**.
   - **Persona B** ve la tarjeta aparecer nadando en la pantalla gigante de inmediato.
   - Si se recarga la página o se apagan los dispositivos, **todos los datos quedan permanentemente guardados en la nube**.

---

## 💻 Compatibilidad Local (Offline)

Si ejecutas el proyecto en tu computadora localmente (`npm run dev:server` o `npm start` en `http://localhost:8004`):
- Si no configuras variables de entorno, el sistema utiliza automáticamente **SQLite local** (`data/fun.db`) sin necesidad de conexión a internet.
- Si agregas `TURSO_DATABASE_URL` a tu archivo `.env`, tu entorno local se conectará a la misma base de datos de producción.
