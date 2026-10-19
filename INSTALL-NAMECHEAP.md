# 🚀 Guía de Despliegue: FuN Costa Rica en Namecheap cPanel (Node.js + Phusion Passenger)
**Elaborado por Ofitech.lat** · Configurado para producción en hosting compartido (CloudLinux / Passenger)

---

> [!IMPORTANT]
> Esta guía aplica a **Namecheap Shared & Business Hosting** con cPanel + CloudLinux + Phusion Passenger.
> El hosting compartido **NO permite compilar Vite o TypeScript en el servidor** por límites estrictos de RAM.
> La compilación del frontend se realiza en tu computadora local y al servidor solo se sube el paquete optimizado de producción.

---

## 🧠 Contexto: Arquitectura de la Aplicación en Producción

- **Frontend:** Single-Page Application (SPA) compilada con Vite en `dist/` (HTML, CSS y JS minimizados, Three.js 3D y 328 memes en WebP).
- **Backend:** Servidor Node.js con Express (`server/` y `server.js` / `app.cjs`) que atiende la API REST `/api/...` y sirve los archivos estáticos de `dist/`.
- **Base de Datos:** SQLite embebido (`sql.js` compilado a WebAssembly). No requiere MySQL ni compiladores nativos C/C++; crea automáticamente su archivo en `data/fun.db` al arrancar.
- **Servidor Web:** Phusion Passenger en cPanel ejecuta `server.js` en el puerto asignado por `process.env.PORT`.

---

## 📋 Requisitos Previos

1. Node.js v18+ instalado en tu computadora local.
2. Acceso al cPanel de Namecheap del dominio (ej. `fun.ofitech.lat` o tu dominio principal).
3. Acceso a **File Manager** (Administrador de Archivos) y **Terminal** en cPanel (o SSH habilitado).

---

## 💻 PARTE 1 — Preparación y Compilación Local (en tu PC)

### Paso 1: Compilar y empaquetar el proyecto

En la terminal de tu computadora, dentro de la carpeta del proyecto, ejecuta:

```powershell
# En Windows (PowerShell):
npm.cmd run build
npm.cmd run package
```

```bash
# En Mac o Linux:
npm run build
npm run package
```

Este comando:
1. Compila el frontend TypeScript en `dist/`.
2. Genera la carpeta `deploy/` con los archivos esenciales:
   - `dist/` (frontend compilado con memes WebP).
   - `server/` (lógica del backend Express + SQLite).
   - `server.js` y `app.cjs` (puntos de entrada para Phusion Passenger).
   - `package.json` de producción (solo `express` y `sql.js`, sin herramientas de desarrollo).
3. Crea automáticamente en la raíz el archivo listo para subir: **`deploy.zip`**.

> [!WARNING]
> **NUNCA incluyas la carpeta `node_modules` en el ZIP.** CloudLinux en cPanel maneja las dependencias en un entorno virtual aislado (`nodevenv`) y arroja errores si encuentra una carpeta física de módulos.

---

## 🌐 PARTE 2 — Configuración en Namecheap cPanel

### Paso 2: Subir y extraer `deploy.zip`

1. Abre cPanel → **File Manager** (Administrador de archivos).
2. Entra a la carpeta de tu aplicación/dominio (ejemplo: `/public_html` o `/subdominio/`).
3. Haz clic en **Upload** (Subir) y carga **`deploy.zip`**.
4. Haz clic derecho sobre `deploy.zip` → **Extract** (Extraer en la misma carpeta).
5. Elimina `deploy.zip` para ahorrar espacio en disco.

---

### Paso 3: Crear la Aplicación Node.js en cPanel

1. En el buscador de cPanel, busca **"Node.js"** y abre **Setup Node.js App**.
2. Haz clic en **Create Application** (+).
3. Configura los campos exactamente así:

| Campo | Valor Recomendado |
|---|---|
| **Node.js version** | `20.x` (o la versión LTS más reciente disponible) |
| **Application mode** | `Production` ⚠️ *(Esencial: no usar Development)* |
| **Application root** | La ruta de la carpeta donde extrajiste el ZIP (ej. `/public_html` o `/fun-costa-rica`) |
| **Application URL** | El dominio o subdominio asignado |
| **Application startup file** | `server.js` *(o `app.cjs`)* |

4. En la sección **Environment variables** (Variables de entorno), agrega:

| Variable | Valor | Descripción |
|---|---|---|
| `ADMIN_USER` | `funcr` | Usuario para el panel de administración |
| `ADMIN_PASS` | *(Elige una contraseña segura)* | Contraseña del panel administrativo |
| `SESSION_SECRET` | *(Cadena aleatoria de 32+ caracteres)* | Clave para firmar sesiones JWT de moderación |

5. Haz clic en **Create** (o Guardar).

---

### Paso 4: Instalar las dependencias en el servidor

1. En la parte superior de la aplicación en cPanel, verás un comando que inicia con `source /home/.../bin/activate`. Haz clic sobre él para copiarlo.
2. Abre la **Terminal** de cPanel y pega el comando:

```bash
source /home/TU_USUARIO/nodevenv/TU_CARPETA/20/bin/activate && cd /home/TU_USUARIO/TU_CARPETA
```

3. **Si existe una carpeta `node_modules` física creada por error, bórrala primero:**
```bash
rm -rf node_modules
```

4. Instala las 2 únicas dependencias de producción (`express` y `sql.js`):
```bash
npm install --production
```
*(O también puedes presionar el botón **Run NPM Install** dentro de la interfaz gráfica de Setup Node.js App).*

---

### Paso 5: Corregir permisos de archivos ⚠️ PASO CRÍTICO

> [!CAUTION]
> Los archivos extraídos desde un ZIP creado en Windows suelen llegar a Linux con permisos restrictivos. Esto puede provocar un **Error 503 Service Unavailable** o `EACCES: permission denied` al intentar leer archivos de `dist/` o la base de datos `data/`.

En la **Terminal** de cPanel, ejecuta:

```bash
chmod -R 755 /home/TU_USUARIO/TU_CARPETA
```

---

### Paso 6: Verificación manual y arranque

Antes de abrir el navegador, comprueba que el servidor arranca limpiamente en la terminal:

```bash
node server.js
```

Deberás ver en la consola:
```
FuN Costa Rica escuchando en http://localhost:XXXX
```

Presiona `Ctrl + C` para detener la prueba manual.

---

### Paso 7: Iniciar o Reiniciar la App desde cPanel

1. Regresa a **Setup Node.js App** en cPanel.
2. Haz clic en el botón **Restart** (Reiniciar) de la aplicación.
3. Abre tu dominio en el navegador. ✅  
   ¡Verás la pizarra con las tarjetas nadando, el teleprompter y la señal 3D en vivo!

---

## 💾 Persistencia y Respaldos de Datos

- **Base de Datos SQLite:** Se guarda en `data/fun.db`.
- **Imágenes/Videos subidos por la audiencia:** Se almacenan en `data/uploads/`.
- **Respaldar el evento:** Simplemente descarga la carpeta `data/` desde el File Manager.
- **Limpieza de pruebas:** Si deseas reiniciar la pizarra a su estado inicial de demostración con datos limpios, ve a la pestaña **Herramientas** del panel de Admin y pulsa **"Restablecer Historias Demo"**, o elimina `data/fun.db` y reinicia la app.

---

## 🔄 PARTE 3 — Actualizaciones Futuras de Código

Una vez configurada la app en cPanel, actualizarla toma menos de 2 minutos:

1. **En tu PC:** Haz tus cambios y compila de nuevo:
   ```powershell
   npm.cmd run build
   npm.cmd run package
   ```
2. **En cPanel File Manager:** Sube el nuevo `deploy.zip` a tu carpeta y dale **Extract** (sobrescribirá `dist/`, `server/` y `server.js` sin tocar tu base de datos en `data/`).
3. **En cPanel Terminal:** Asegura permisos y reinicia:
   ```bash
   chmod -R 755 /home/TU_USUARIO/TU_CARPETA
   ```
4. En **Setup Node.js App**, haz clic en **Restart**. ✅

---

## 🐛 Solución de Problemas Frecuentes

| Síntoma / Error | Causa Raíz | Solución |
|---|---|---|
| **Error 503 Service Unavailable** | Permisos incorrectos tras extraer el zip o error de sintaxis en startup file. | Ejecuta `chmod -R 755 /home/TU_USUARIO/TU_CARPETA` y prueba `node server.js` en terminal. |
| `Cloudlinux NodeJS Selector demands to store node modules in separate folder` | Existe una carpeta física `node_modules` en la raíz. | En terminal: `rm -rf node_modules` y luego `npm install --production`. |
| `It works! NodeJS 20.x` | Passenger está corriendo el archivo por defecto de cPanel en vez de tu app. | Verifica que el campo **Application startup file** diga exactamente `server.js` o `app.cjs`. |
| La base de datos no guarda cambios | Permiso denegado para escribir en la carpeta `data/`. | Asegúrate de que la carpeta `data/` tenga permisos `755` (`chmod 755 data`). |

---

*Documentado por Ofitech.lat · Adaptado para el despliegue de FuN Costa Rica en Namecheap Business Hosting*
