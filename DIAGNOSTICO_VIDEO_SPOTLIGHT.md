# 🎬 Diagnóstico Técnico: Fallo en Visualización y Carga de Video en Modo Spotlight

**Documento elaborado para equipo de ingeniería / IA experta en corrección de funcionalidades multimedia**  
**Proyecto:** Fuckup Nights San José, Costa Rica (`fun_costa_rica`)  
**Fecha:** 19 de Octubre, 2026  
**Entorno:** Pantallas TV / Pizarra en Vivo (1920×1080 / 1536×695)

---

## 📌 1. Resumen Ejecutivo del Problema

El usuario reporta que en la tarjeta de video de Mariana Cordero (**"Mi primer pitch con inversionistas duró 3 minutos por culpa del micrófono"**), el video **no aparece**, y al intentar cargarle un video, tampoco se visualiza en pantalla.

### 🖼️ Comparativa Visual de las Dos Capturas del Usuario

1. **Captura 1 (Tarjeta con Falla - Mariana Cordero):**
   - Aparece renderizada a pantalla completa ocupando el 100% del ancho con puro texto centrado (layout `.text-only`).
   - En el dashboard y en la metadata la tarjeta está marcada como `mediaType: "video"`, pero en pantalla **no hay ningún reproductor de video**, no hay columna multimedia y no se ve el espacio lateral del video.
   
2. **Captura 2 (Comportamiento Deseado - Tarjeta de Valeria Solano / Aguacate):**
   - Esta tarjeta (`seed-3`, "Compré 400 kg de aguacates para un festival...") tiene una imagen (`photoUrl`).
   - El diseño se divide elegantemente en **dos columnas** (`.spotlight-tv-layout.has-media`):
     - **Columna Izquierda (46% del ancho):** Marco contenedor multimedia (`.spotlight-media-frame`) con bordes redondeados, resplandor neón y la imagen ajustada.
     - **Columna Derecha (54% del ancho):** Columna de información (`.spotlight-info-column`) con etiqueta de categoría, hashtag, título grande, texto de la historia, caja dorada de aprendizajes y autor.
     - **Lateral Exterior Derecho:** Poste con las señales viales 3D Three.js.

### 🎯 Comportamiento Esperado por el Usuario
> *"Debería verse como las que tienen imagen, como esa del aguacate que tiene una imagen y se ajusta todo a la derecha. En vez de la imagen, debería reproducirse el video en ese espacio."*

El video debe reproducirse en la columna izquierda dentro de `.spotlight-media-frame`, con controles de reproducción y botón de audio, mientras toda la información de la historia se ubica en la columna derecha, exactamente con la misma simetría y proporciones que la tarjeta del aguacate.

---

## 📁 2. Inventario de Archivos y Componentes Involucrados

| Archivo | Funciones / Clases / Claves | Rol en el Sistema |
|---|---|---|
| `server/seed.cjs` | `seedStories()` (Línea 49-57) | Define las historias iniciales precargadas en el servidor. |
| `src/storage.ts` | `SEED_STORIES` (Línea 86-103) y `saveStory()` | Historias semilla del frontend y persistencia en IndexedDB/API. |
| `src/boardEngine.ts` | `renderSpotlightContent()` (Línea 472-532) | Inyecta el HTML del modal a pantalla completa (Spotlight). Determina si se aplica `.has-media` o `.text-only`. |
| `src/style.css` | `.spotlight-tv-layout.has-media`, `.spotlight-media-frame video` (Líneas 709-750) | Reglas CSS Grid de dos columnas para tarjetas con foto o video. |
| `src/cardStudio.ts` | `setVideo()`, `updatePreview()`, `save()` (Líneas 444-465, 602-606, 680-715) | Formulario de creación/edición de tarjetas y selector de archivo de video (`#cs-video-file`). |
| `src/mediaCompressor.ts` | `compressVideo()`, `generateSampleFuckupVideo()` | Motor de compresión de video mediante Canvas y `MediaRecorder` en el navegador. |
| `server/index.cjs` | `externalizeMedia()`, `sanitizeStory()` (Líneas 43-53, 66-102) | Servidor Express: guarda videos base64 como archivos físicos en `data/uploads/` y valida rutas `/uploads/...`. |
| `data/fun.db` | Tabla `stories` | Base de datos SQLite (`sql.js`) donde está guardada la tarjeta `seed-5`. |

---

## 🔬 3. Análisis Técnico de las Causas Raíz

### 🚨 Causa Raíz 1: La historia semilla `seed-5` tiene `mediaType: 'video'` pero NO posee la propiedad `videoUrl`

Tanto en el servidor (`server/seed.cjs`) como en el almacenamiento local (`src/storage.ts`), la historia `seed-5` de Mariana Cordero fue creada con:

```javascript
// server/seed.cjs (Líneas 49-57)
{
  id: 'seed-5', createdAt: now - 2 * H,
  title: 'Mi primer pitch con inversionistas duró 3 minutos por culpa del micrófono',
  category: 'Emprendimiento',
  author: { isAnonymous: false, name: 'Mariana Cordero', linkedin: 'linkedin.com/in/mariana-cordero', instagram: '@marianastartup' },
  mediaType: 'video', // <--- DECLARADA COMO VIDEO
  content: 'Subí a tarima, el micrófono hizo un feedback ensordecedor...',
  learnings: 'Aprender a respirar, reírse del error en vivo y que el jurado también es humano.',
  status: 'approved', likes: 135
  // ⚠️ FALTA COMPLETAMENTE LA PROPIEDAD videoUrl
}
```

Al inicializar la base de datos `data/fun.db`, la tarjeta se insertó sin `videoUrl`.

---

### 🚨 Causa Raíz 2: La condición de visualización en `boardEngine.ts` fuerza el modo `text-only` si falta `videoUrl`

En `src/boardEngine.ts` (Líneas 472–490 y 504):

```typescript
// Línea 473
const hasMedia = (story.mediaType === 'video' && !!story.videoUrl) || (story.mediaType === 'photo' && !!story.photoUrl);

let mediaSection = '';
if (story.mediaType === 'video' && story.videoUrl) {
  mediaSection = `
    <div class="spotlight-media-frame">
      <video id="spotlight-active-video" src="${story.videoUrl}" playsinline ${this.config.videoMuted ? 'muted' : ''} controls></video>
      <div class="video-sound-toggle-btn" id="btn-video-sound">
        ${this.config.videoMuted ? '🔇 Activar Sonido' : '🔊 Con Audio'}
      </div>
    </div>
  `;
}
...
// Línea 504
modalBody.innerHTML = `
  <div class="spotlight-tv-layout ${hasMedia ? 'has-media' : 'text-only'}">
    ${hasMedia ? `
      <div class="spotlight-media-column">
        ${mediaSection}
      </div>
    ` : ''}
    <div class="spotlight-info-column">
      ...
    </div>
  </div>
`;
```

**Efecto:**
Como `story.videoUrl` es `undefined`, `hasMedia` resulta en `false`. Por tanto:
1. No se inyecta la columna `<div class="spotlight-media-column">`.
2. Se asigna la clase CSS `.text-only`.
3. El CSS expande la columna de información al 100% del ancho centrado, luciendo idéntica a una confesión de solo texto (como se ve en la Captura 1).

---

### 🚨 Causa Raíz 3: Por qué falla la carga de video cuando el usuario intenta subirlo

El usuario mencionó: *"yo le acargue un video y no aparece"*. Al rastrear el flujo de subida de video se identificaron los siguientes cuellos de botella críticos:

#### 1. Cuello de botella en `MediaCompressor.compressVideo` (`src/mediaCompressor.ts`):
```typescript
// Líneas 198-229
video.currentTime = 0;
await video.play().catch(() => {
  video.muted = true;
  return video.play();
});

const renderFrame = () => {
  if (video.paused || video.ended) return;
  ctx.drawImage(video, 0, 0, width, height);
  ...
  requestAnimationFrame(renderFrame);
};
```
- **El compresor reproduce el video en tiempo real** a través de un elemento `<video>` en memoria para capturarlo con `canvas.captureStream(25)` y `MediaRecorder`.
- **Consecuencia:** Si el usuario sube un video de 30 segundos, el proceso de compresión tarda **30 segundos reales**. Si el video dura 2 minutos, tarda **2 minutos completos**.
- Si el usuario presiona el botón **"💾 Guardar cambios de esta tarjeta"** antes de que finalice el proceso de compresión, la variable `this.videoUrl` en `CardStudio` todavía es `null`, por lo que la tarjeta se envía y guarda en el servidor sin video.
- En muchos navegadores bajo Windows, si el video subido tiene pistas de audio no sincronizadas con el canvas, `MediaRecorder` arroja una excepción no controlada o el archivo resultante queda vacío.

#### 2. Ausencia de limpieza de imagen al asignar video en `CardStudio` (`src/cardStudio.ts`):
```typescript
// Líneas 602-606
private setVideo(url: string | null) {
  this.videoUrl = url;
  this.q('#cs-remove-image')?.classList.toggle('hidden', !url && !this.imageUrl);
  this.updatePreview();
}
```
- Al seleccionar un video, no se resetea `this.imageUrl = null`. Si la tarjeta previamente tenía una imagen asignada o se usó una plantilla con meme, ambas variables quedan con valor y pueden provocar conflictos de prioridad entre `photoUrl` y `videoUrl`.

#### 3. En `server/index.cjs` (Persistencia de Media):
```javascript
// Líneas 43-53
function externalizeMedia(story, field) {
  const value = story[field];
  if (typeof value !== 'string' || !value.startsWith('data:')) return;
  const m = /^data:([\w/+.-]+)(?:;[^,]*)?;base64,(.*)$/s.exec(value);
  if (!m) { delete story[field]; return; }
  const ext = EXT[m[1]] || 'bin';
  ...
}
```
- Si el video dataUrl no cumple estrictamente la expresión regular en base64 o supera el límite de parsing de Express (o si el MIME type no está en `EXT`), el servidor ejecuta `delete story[field]`, eliminando silenciosamente el video de la tarjeta antes de guardarla en `data/fun.db`.

---

## 📐 4. Arquitectura del Diseño Deseado (El Modelo del Aguacate)

El layout en modo Spotlight para cualquier tarjeta con contenido multimedia (imagen o video) debe estructurarse mediante CSS Grid de 2 columnas:

```
+---------------------------------------------------------------------------------------------------+
|  MODAL SPOTLIGHT (.spotlight-stage-wrap)                                                           |
|                                                                                                   |
|  +-------------------------------------------------------------+    +--------------------------+  |
|  |  TARJETA (.spotlight-card-box)                              |    |  POSTE VIAL 3D           |  |
|  |                                                             |    |  (Fuera de la tarjeta)   |  |
|  |  +-----------------------------+-------------------------+  |    |                          |  |
|  |  | COLUMNA IZQUIERDA (46%)     | COLUMNA DERECHA (54%)   |  |    |    O (Luz Neón)          |  |
|  |  |                             |                         |  |    |    |                     |  |
|  |  | [.spotlight-media-frame]    | [CATEGORÍA] #Hashtag    |  |    |    +-- [ AUTOR / REDES ] |  |
|  |  |                             |                         |  |    |    |                     |  |
|  |  |  🎬 REPRODUCTOR DE VIDEO    | TÍTULO GRANDE           |  |    |    +-- [ INSTAGRAM ]     |  |
|  |  |  <video playsinline controls|                         |  |    |    |                     |  |
|  |  |  src="..."></video>         | Historia completa...    |  |    |    +-- [ LINKEDIN/WEB ]  |  |
|  |  |                             |                         |  |    |    |                     |  |
|  |  |  [🔇 Activar Sonido]        | 💡 CAJA APRENDIZAJE     |  |    |    |                     |  |
|  |  |                             |                         |  |    |    |                     |  |
|  |  |                             | 🔥 Chip Autor           |  |    |    |                     |  |
|  |  +-----------------------------+-------------------------+  |    +--------------------------+  |
|  +-------------------------------------------------------------+                                  |
+---------------------------------------------------------------------------------------------------+
```

### Reglas CSS Aplicables (`src/style.css`, Líneas 709–750)
- `.spotlight-tv-layout.has-media`: `grid-template-columns: minmax(360px, 46%) minmax(400px, 54%);`
- `.spotlight-media-frame`: `background: #000; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.12);`
- `.spotlight-media-frame video`: `width: 100%; height: 100%; max-height: calc(92vh - 120px); object-fit: contain;`

---

## 🛠️ 5. Plan de Acción y Solución Paso a Paso para la Otra IA

### Paso 1: Dotar a `seed-5` de un Video Demo Funcional en el Código Semilla

Modificar `server/seed.cjs` y `src/storage.ts` para que `seed-5` contenga un `videoUrl` válido por defecto.

**Opciones de video válidas:**
1. Un video MP4/WebM ligero de demostración alojado públicamente (por ejemplo, video libre de Pexels o Big Buck Bunny optimizado).
2. O un archivo de video local en `public/videos/pitch-demo.mp4` o `data/uploads/seed-pitch.mp4`.
3. O la llamada generadora en base64 de `MediaCompressor.generateSampleFuckupVideo()`.

Ejemplo de asignación en `server/seed.cjs`:
```javascript
{
  id: 'seed-5', createdAt: now - 2 * H,
  title: 'Mi primer pitch con inversionistas duró 3 minutos por culpa del micrófono',
  category: 'Emprendimiento',
  author: { isAnonymous: false, name: 'Mariana Cordero', linkedin: 'linkedin.com/in/mariana-cordero', instagram: '@marianastartup' },
  mediaType: 'video',
  content: 'Subí a tarima, el micrófono hizo un feedback ensordecedor que asustó al jurado, me puse tan nerviosa que olvidé el nombre de mi propia empresa y dije "Bueno, gracias por su tiempo" y me bajé corriendo.',
  learnings: 'Aprender a respirar, reírse del error en vivo y que el jurado también es humano.',
  videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4', // URL de prueba estable
  status: 'approved', likes: 135
}
```

### Paso 2: Actualizar la Base de Datos Existente (`data/fun.db`)

Para no forzar un borrado de la base de datos de producción o pruebas, se debe ejecutar un script de actualización que inyecte el `videoUrl` en el registro `seed-5`:

```javascript
const db = require('./server/db.cjs');
db.open().then(() => {
  const story = db.getStory('seed-5');
  if (story) {
    story.mediaType = 'video';
    story.videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
    db.saveStory(story);
    console.log('✅ Historia seed-5 actualizada con video con éxito.');
  }
});
```

### Paso 3: Optimizar la Carga de Video en `src/cardStudio.ts`

1. **Evitar compresión en tiempo real si el video ya es liviano:**  
   Si el archivo seleccionado pesa menos de 10 MB y ya es un formato web compatible (`video/mp4`, `video/webm`), leerlo directamente con `FileReader.readAsDataURL(file)` en lugar de someterlo a la reproducción lenta en Canvas.
2. **Deshabilitar el botón de Guardar mientras se procesa el video:**  
   Colocar indicador visual claro (`⏳ Procesando video, por favor espera...`) y deshabilitar `#cs-save` hasta que `this.videoUrl` esté listo.
3. **Limpiar `imageUrl` cuando se selecciona video:**
   ```typescript
   private setVideo(url: string | null) {
     this.videoUrl = url;
     if (url) this.imageUrl = null; // Evitar colisión de medios
     this.q('#cs-remove-image')?.classList.toggle('hidden', !url && !this.imageUrl);
     this.updatePreview();
   }
   ```
4. **Mostrar miniatura de video en la lista de tarjetas existentes (`renderStoriesCardsHtml`):**  
   Reemplazar el ícono `📝` por un thumbnail con `<video>` o badge de cámara `🎬` para tarjetas que tengan `videoUrl`.

### Paso 4: Validar la Reproducción en `src/boardEngine.ts`

1. Verificar que al abrir el spotlight de una tarjeta con `mediaType === 'video'` y `videoUrl`:
   - Se cree el elemento `<video id="spotlight-active-video">`.
   - Se respete la configuración de `videoAutoplay` y `videoMuted`.
   - Si las políticas del navegador bloquean la reproducción con audio, silenciar automáticamente y notificar al usuario mediante el botón `#btn-video-sound`.

---

## 📋 6. Resumen de Archivos a Modificar

1. **[server/seed.cjs](file:///c:/Users/tapac/OneDrive/Documents/FUN%20COSTA%20RICA/server/seed.cjs#L49-L57):** Agregar `videoUrl` a `seed-5`.
2. **[src/storage.ts](file:///c:/Users/tapac/OneDrive/Documents/FUN%20COSTA%20RICA/src/storage.ts#L86-L103):** Agregar `videoUrl` a `seed-5`.
3. **[src/cardStudio.ts](file:///c:/Users/tapac/OneDrive/Documents/FUN%20COSTA%20RICA/src/cardStudio.ts#L444-L465):** Carga rápida de video (fallback a DataURL directa si es < 10 MB), bloqueo del botón Guardar durante la carga y reset de `imageUrl`.
4. **[data/fun.db](file:///c:/Users/tapac/OneDrive/Documents/FUN%20COSTA%20RICA/data/fun.db):** Actualizar registro `seed-5` existente con `videoUrl`.
