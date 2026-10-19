# 🔍 Diagnóstico Técnico y Análisis de Errores de Diseño Visual en Modo Spotlight

**Documento elaborado para equipo de ingeniería / IA experta en corrección visual**  
**Proyecto:** Fuckup Nights San José, Costa Rica (`fun_costa_rica`)  
**Fecha:** 19 de Octubre, 2026  
**Entorno de prueba:** Pantallas Widescreen / TV (1920×1080 / 1536×695)

---

## 📌 1. Resumen Ejecutivo de la Falla Visual

En la captura de pantalla (`spotlight-modal`) se evidencian tres anomalías visuales críticas simultáneas:

1. **Colisión y Superposición Frontal:** Las placas viales 3D ("CONFESIÓN 100% ANÓNIMA", "#ShareTheFailure") aparecen renderizadas **encima del texto de la historia**, cruzando el centro del contenedor de la tarjeta e interceptando el título y los textos explicativos.
2. **Duplicación Fantasma / Doble Render:** Aparecen **dos señales viales 3D distintas al mismo tiempo**:
   - Una señal central superpuesta con datos anónimos ("CONFESIÓN 100% ANÓNIMA").
   - Una segunda señal en el lateral derecho fuera del contenedor con datos de otro autor ("VALERIA SOLANO", "@valegastrocr", "saborespuravida.cr").
3. **Corte y Oclusión de Textos en la Tarjeta:** El título principal de la historia se corta abruptamente a la derecha (`BORRÉ LA BASE DE DATOS DE PRODUCC...`) perdiendo la palabra `PRODUCCIÓN` contra una línea vertical negra opaca.

---

## 📁 2. Inventario de Archivos, Funciones y Selectores Involucrados

| Componente | Archivo | Funciones / Clases / IDs | Rol en el Sistema |
|---|---|---|---|
| **Estructura HTML** | `index.html` | `#spotlight-modal`<br>`.spotlight-stage-wrap`<br>`.spotlight-card-box`<br>`#spotlight-street-signs-anchor` | Define la jerarquía del DOM del modal a pantalla completa. |
| **Controlador del Spotlight** | `src/boardEngine.ts` | `BoardEngine.openSpotlight(story)`<br>`BoardEngine.closeSpotlight()`<br>`BoardEngine.renderSpotlightContent(story)` | Inyecta el contenido HTML de la historia e instancia `StreetSign3D`. |
| **Renderizador 3D Three.js** | `src/streetSign3D.ts` | `class StreetSign3D`<br>`constructor(container)`<br>`render(author)`<br>`initThree(items)`<br>`destroy()` | Crea el canvas WebGL, el poste, las placas y la animación Three.js. |
| **Estilos CSS Globales** | `src/style.css` | `.spotlight-modal-overlay`<br>`.spotlight-stage-wrap`<br>`.spotlight-card-box`<br>`.spotlight-street-signs-lateral`<br>`.spotlight-street-signs-anchor`<br>`.spotlight-tv-layout`<br>`.spotlight-info-column` | Reglas de flexbox, grid, tamaños porcentuales, `overflow` y z-index. |

---

## 🔬 3. Análisis Causa Raíz de Cada Problema

### 3.1. Causa de la Duplicación Fantasma (Doble Señal 3D)

#### 📍 Ubicación en el código:
- `src/boardEngine.ts` (Líneas 534–541):
```typescript
const streetSignAnchor = (this.spotlightModal.querySelector('#spotlight-street-signs-anchor') || modalBody.querySelector('#spotlight-street-signs-anchor')) as HTMLElement;
if (streetSignAnchor) {
  if (this.streetSign3D) this.streetSign3D.destroy();
  this.streetSign3D = new StreetSign3D(streetSignAnchor);
  this.streetSign3D.render(story.author);
}
```
- `src/streetSign3D.ts` (Líneas 29–34 y 490–510):
```typescript
constructor(container: HTMLElement) {
  this.container = container;
  this.canvas = document.createElement('canvas');
  this.canvas.className = 'street-signs-3d-canvas';
  this.container.appendChild(this.canvas);
}
```

#### 🔍 Diagnóstico del Error:
1. `StreetSign3D.constructor` hace `this.container.appendChild(this.canvas)` cada vez que se instancia.
2. Sin embargo, en el método `destroy()` de `src/streetSign3D.ts`:
   - Se libera el `WebGLRenderer` (`renderer.dispose()`), la escena y el `requestAnimationFrame`.
   - **PERO NUNCA SE REMUEVE EL ELEMENTO CANVAS DEL DOM** (`this.canvas.remove()` o `this.container.innerHTML = ''`).
3. En transiciones rápidas o si existe un contenedor residual previo en el DOM (o si un anchor residual quedó dentro de `modalBody` o en caché de compilación previa):
   - El canvas viejo permanece en el DOM mostrando el último frame renderizado (Valeria Solano).
   - Se crea un segundo canvas en otro anchor montando la historia actual (Confesión anónima).
   - Resultado: **Ambas señales conviven simultáneamente en pantalla.**

---

### 3.2. Causa de la Señal 3D Flotando Sobre el Texto

#### 📍 Ubicación en el código:
- `src/style.css` (Líneas 862–878):
```css
.spotlight-street-signs-lateral,
.spotlight-street-signs-anchor {
  width: 400px;
  max-width: 420px;
  height: 100%;
  max-height: 94vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 100;
  pointer-events: none;
  filter: drop-shadow(0 25px 50px rgba(0, 0, 0, 0.95));
}
```
- `src/streetSign3D.ts` (Líneas 166–171 y 234–238):
```typescript
this.poleGroup = new THREE.Group();
this.poleGroup.position.set(-0.65, 0, 0); // Offset artificial del poste
...
signMesh.position.set(plateWidth / 2 + 0.08, 0, 0); // Offset de la placa (2.42 unidades hacia la derecha)
```

#### 🔍 Diagnóstico del Error:
1. Si `#spotlight-street-signs-anchor` se resuelve hacia un elemento dentro de `.spotlight-card-box` (o si `streetSignAnchor` toma un fallback relativo al cuerpo de la tarjeta):
   - El poste se ubica en el centro o hacia la derecha del contenedor de texto.
   - Las placas viales tienen una anchura de `2.42` unidades en Three.js proyectándose hacia la derecha.
   - La cámara Three.js tiene `camera.position.set(0.1, 0.05, 5.8)`.
2. Como el canvas tiene `alpha: true` (fondo transparente) y `z-index: 100`, las placas 3D tapan directamente el texto HTML inferior de la tarjeta.

---

### 3.3. Causa del Corte del Título (`BORRÉ LA BASE DE DATOS DE PRODUCC...`)

#### 📍 Ubicación en el código:
- `src/style.css` (Líneas 709–716, 751–760 y 788–800):
```css
.spotlight-tv-layout.has-media {
  display: grid;
  grid-template-columns: minmax(360px, 46%) minmax(400px, 54%);
  gap: 36px;
  align-items: center;
  overflow: hidden;
}

.spotlight-info-column {
  width: 100%;
  height: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 16px;
  overflow: hidden;
}

.spotlight-main-title {
  font-size: clamp(22px, 2.5vw, 36px);
  font-weight: 900;
  line-height: 1.15;
  color: var(--text-white);
  text-transform: uppercase;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
```

#### 🔍 Diagnóstico del Error:
1. En `seed-1` (`Borré la base de datos de producción...`), la historia es de tipo `mediaType === 'text'` (sin foto ni video).
2. En `src/boardEngine.ts`:
   - La clase asignada es `spotlight-tv-layout text-only`.
3. Sin embargo, en `src/style.css`, `.spotlight-tv-layout:not(.has-media)` carece de una definición de columnas explícita cuando comparte el espacio con una señal lateral o cuando un elemento superpuesto (el poste cilíndrico central) crea una barra divisoria visual negra vertical.
4. El contenedor `.spotlight-info-column` tiene `overflow: hidden`, lo que trunca el título si el ancho disponible se reduce por colisión de layouts.

---

## 🛠️ 4. Guía de Reparación Recomendada para la IA Especialista

Para que la IA experta implemente la solución limpia y definitiva, se recomienda seguir estos 3 pasos:

### Paso 1: Limpieza del Ciclo de Vida del Canvas en `StreetSign3D`
En `src/streetSign3D.ts`:
- En `destroy()`:
  - Agregar `if (this.canvas && this.canvas.parentNode) this.canvas.parentNode.removeChild(this.canvas);`
  - Limpiar el contenedor con `this.container.innerHTML = '';` antes de montar cualquier nuevo canvas.
- Esto evitará de raíz que coexistan dos señales al cambiar de tarjeta o al reabrir el spotlight.

### Paso 2: Unificación Estricta del Anchor Lateral en el DOM
En `index.html` y `src/boardEngine.ts`:
- Asegurar que exista **UN ÚNICO** elemento con ID `spotlight-street-signs-anchor` en todo el documento, ubicado exclusivamente dentro de `<aside class="spotlight-street-signs-lateral" id="spotlight-street-signs-anchor">` a la derecha de `.spotlight-card-box`.
- Eliminar cualquier referencia o fallback que busque `#spotlight-street-signs-anchor` dentro de `modalBody`.

### Paso 3: Ajuste de Dimensiones y Margen del Layout en CSS
En `src/style.css`:
- Asignar a `.spotlight-stage-wrap`:
  ```css
  display: grid;
  grid-template-columns: 1fr 380px; /* Tarjeta a la izquierda, Señal fija a la derecha */
  width: 95vw;
  max-width: 1750px;
  height: 92vh;
  gap: 24px;
  ```
- Asignar a `.spotlight-card-box`:
  ```css
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
  ```
- Asignar a `.spotlight-street-signs-lateral`:
  ```css
  width: 380px;
  height: 100%;
  position: relative;
  overflow: visible;
  ```
- En `src/streetSign3D.ts`, centrar el poste exactamente en el canvas del lateral:
  ```typescript
  this.poleGroup.position.set(0, 0, 0); // Poste al centro del lateral
  this.camera.position.set(0, 0, 6.0);
  this.camera.lookAt(0, 0, 0);
  ```

---

*Reporte técnico generado sin modificar el código fuente del proyecto.*
