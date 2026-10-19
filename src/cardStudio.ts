import type { Story } from './types';
import { storage } from './storage';
import { MediaCompressor } from './mediaCompressor';
import { loadMemeCatalog, escapeHtml, type Meme } from './memeFinder';
import { MemePickerModal } from './memePickerModal';
import confetti from 'canvas-confetti';

interface CardSample {
  id: string;
  label: string;
  title: string;
  category: string;
  content: string;
  learnings: string;
  memeFile?: string;
}

const CATEGORIES = [
  'Emprendimiento', 'Tecnología', 'Marketing', 'Finanzas', 'Ventas B2B',
  'Eventos & Operaciones', 'Legal & Contratos', 'Amor & Negocios', 'Gastronomía & Eventos', 'General'
];

// Muestras visuales pre-diseñadas para arrancar rápido o inspirarse
const SAMPLES: CardSample[] = [
  {
    id: 'sample-1',
    label: '💥 Se cayó producción',
    title: 'Subí un cambio un viernes a las 5 PM y tumbé toda la plataforma',
    category: 'Tecnología',
    content: 'Dije "es un cambio de una sola línea, no pasa nada". Esa línea reinició el servicio de pagos justo en quincena. Pasamos 6 horas con el equipo completo apagando el incendio mientras el jefe miraba en silencio.',
    learnings: 'Nada de despliegues los viernes y siempre tener un plan de reversa probado antes de tocar producción.',
    memeFile: 'imgflip_Disaster_Girl.webp'
  },
  {
    id: 'sample-2',
    label: '💸 Se acabó la plata',
    title: 'Gasté todo el presupuesto de marketing en una campaña sin medir nada',
    category: 'Marketing',
    content: 'Invertimos en influencers, vallas y un evento de lanzamiento. Nadie puso un solo seguimiento de conversiones ni métricas. Tres meses después no sabíamos si había servido de algo… y la caja estaba en cero.',
    learnings: 'Si no se puede medir, se prueba en pequeño con experimentos controlados antes de escalar.',
    memeFile: 'imgflip_Drake_Hotline_Bling.webp'
  },
  {
    id: 'sample-3',
    label: '🤝 Mala alianza',
    title: 'Me asocié con un amigo sin firmar nada y se quedó con el negocio',
    category: 'Legal & Contratos',
    content: 'Nos dimos la mano y brindamos con cerveza. Dos años después él tenía el dominio, las cuentas bancarias y a los clientes. Yo me quedé con una amistad rota y facturas por pagar.',
    learnings: 'Los acuerdos siempre se escriben y se firman, especialmente entre amigos y familiares.',
    memeFile: 'imgflip_Distracted_Boyfriend.webp'
  },
  {
    id: 'sample-4',
    label: '🎪 Evento desastroso',
    title: 'Organicé un congreso para 500 personas… y llegaron 12',
    category: 'Eventos & Operaciones',
    content: 'Alquilé el salón más caro, contraté catering gourmet y sonido profesional. Olvidé validar la fecha y coincidió con la final de fútbol nacional. Los 12 asistentes se comieron todo el buffet.',
    learnings: 'Validar fechas, calendarios públicos, aliados y competencia antes de dar el primer depósito.',
    memeFile: 'imgflip_Change_My_Mind.webp'
  },
  {
    id: 'sample-5',
    label: '📉 Vendí a pérdida',
    title: 'Cotización mal calculada: vendí a pérdida durante un año entero',
    category: 'Finanzas',
    content: 'Olvidé incluir el costo de envío, empaque y el IVA en la hoja de cálculo. Cada venta que celebraba en realidad me costaba plata a mí. Cuando lo noté ya había quemado casi todo el capital de trabajo.',
    learnings: 'Revisar márgenes y costos reales cada trimestre con un contador o una segunda mirada experta.',
    memeFile: 'imgflip_Clown_Applying_Makeup.webp'
  },
  {
    id: 'sample-6',
    label: '😱 Pánico en vivo',
    title: 'Mi primer pitch con inversionistas duró 3 minutos por culpa del pánico',
    category: 'Emprendimiento',
    content: 'Subí a la tarima, el micrófono hizo un feedback chirriante, me puse tan nerviosa que olvidé el nombre de mi propia startup. Dije "Gracias por su tiempo" y salí corriendo del auditorio.',
    learnings: 'Respirar hondo, reírse del error en el momento y recordar que el jurado también es humano.',
    memeFile: 'imgflip_Panik_Kalm_Panik.webp'
  }
];

export class CardStudio {
  private container: HTMLElement;
  private imageUrl: string | null = null;
  private videoUrl: string | null = null;
  private memes: Meme[] = [];
  private allStories: Story[] = [];
  private editingStoryId: string | null = null;
  private samplesVisible = true;
  private onSaved?: () => void;
  private memePickerModal?: MemePickerModal;

  constructor(container: HTMLElement, onSaved?: () => void, memePickerModal?: MemePickerModal) {
    this.container = container;
    this.onSaved = onSaved;
    this.memePickerModal = memePickerModal;
  }

  /** Permite que el buscador de memes u otro componente cargue un meme en el formulario */
  public async useMeme(meme: Meme) {
    await this.render();
    this.setImage(`/memes/${meme.file}`);
    const title = this.q<HTMLInputElement>('#cs-title');
    if (title && !title.value) title.value = meme.name;
    this.updatePreview();
  }

  /** Abre el estudio con un formulario limpio (modo crear). */
  public async startNew() {
    this.editingStoryId = null;
    await this.render();
  }

  /** Pone el estudio en modo edición para una historia específica */
  public async editStory(story: Story) {
    this.editingStoryId = story.id;
    await this.render();
    this.populateFormWithStory(story);
    this.container.scrollIntoView({ behavior: 'smooth' });
  }

  private q<T extends HTMLElement>(sel: string): T | null {
    return this.container.querySelector(sel) as T | null;
  }

  public async render() {
    if (this.memes.length === 0) {
      try { this.memes = await loadMemeCatalog(); } catch { this.memes = []; }
    }

    if (!this.editingStoryId) { this.imageUrl = null; this.videoUrl = null; }

    try {
      this.allStories = await storage.getAllStories();
    } catch {
      this.allStories = [];
    }

    const currentStory = this.editingStoryId
      ? this.allStories.find(s => s.id === this.editingStoryId) || null
      : null;

    if (!currentStory) {
      this.editingStoryId = null;
    }

    this.container.innerHTML = `
      <div class="tool-wrap">
        <!-- Encabezado principal -->
        <div class="tool-heading">
          <span class="tool-tag">ESTUDIO DE TARJETAS</span>
          <h2>Diseñador y Teleprompter de Fuckups</h2>
          <p>Crea o edita tarjetas con memes de alta resolución en formato WebP. Las tarjetas aparecen nadando en la pizarra y en modo teleprompter en la TV.</p>
        </div>

        <!-- MUESTRAS PRE-DISEÑADAS CON MEMES -->
        <div class="samples-showcase-box">
          <div class="samples-header">
            <div class="samples-header-info">
              <span class="samples-badge">💡 MUESTRAS INSPIRACIONALES</span>
              <strong>Plantillas listas con memes oficiales (${SAMPLES.length} disponibles)</strong>
            </div>
            <button type="button" class="btn-toggle-samples" id="cs-toggle-samples" title="Mostrar u ocultar los ejemplos prediseñados">
              ${this.samplesVisible ? '👁️ Ocultar muestras' : '👁️ Mostrar muestras'}
            </button>
          </div>

          <div class="samples-grid ${this.samplesVisible ? '' : 'collapsed'}" id="cs-samples-grid">
            ${SAMPLES.map(s => `
              <div class="sample-card" data-sample-id="${s.id}">
                <div class="sample-card-thumb">
                  ${s.memeFile ? `<img src="/memes/${s.memeFile}" alt="${escapeHtml(s.label)}" loading="lazy" />` : '<span class="ph-icon">📝</span>'}
                  <span class="sample-tag">${escapeHtml(s.category)}</span>
                </div>
                <div class="sample-card-body">
                  <h4 class="sample-card-title">${escapeHtml(s.label)}</h4>
                  <p class="sample-card-desc">${escapeHtml(s.title)}</p>
                  <button type="button" class="btn-use-sample" data-sample-id="${s.id}">
                    ⚡ Cargar esta plantilla
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- BANNER DE MODO EDICIÓN (SI ESTÁ ACTIVO) -->
        <div id="cs-edit-banner" class="edit-mode-banner ${currentStory ? '' : 'hidden'}">
          <div class="edit-mode-info">
            <span class="badge-edit">✏️ MODO EDICIÓN ACTIVO</span>
            <strong>Editando tarjeta: "<span id="cs-edit-title-display">${currentStory ? escapeHtml(currentStory.title) : ''}</span>"</strong>
            <small>Los cambios actualizarán esta tarjeta existente en la pizarra y en la base de datos.</small>
          </div>
          <button type="button" class="btn-cancel-edit" id="cs-cancel-edit">
            ✕ Cancelar edición (Crear nueva)
          </button>
        </div>

        <!-- GRID PRINCIPAL: FORMULARIO + VISTA PREVIA TELEPROMPTER -->
        <div class="card-studio-grid">
          <!-- Columna Formulario -->
          <form id="cs-form" class="card-form" autocomplete="off">
            <div class="form-group">
              <label for="cs-title">Título o frase resumen *</label>
              <input type="text" id="cs-title" placeholder="Ej. Mandé a imprimir 500 camisetas con el año equivocado..." required />
            </div>

            <div class="form-group">
              <label for="cs-category">Categoría</label>
              <select id="cs-category">
                ${CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('')}
              </select>
            </div>

            <div class="form-group">
              <label for="cs-content">Historia detallada (se muestra en grande en la TV) *</label>
              <textarea id="cs-content" rows="5" placeholder="Qué pasó, cómo te diste cuenta y qué pasó después..." required></textarea>
            </div>

            <div class="form-group">
              <label for="cs-learnings">💡 Aprendizaje clave (opcional)</label>
              <input type="text" id="cs-learnings" placeholder="Ej. Si no se puede medir, no se gasta el presupuesto..." />
            </div>

            <!-- Datos de Autor y Redes Sociales -->
            <div class="form-group">
              <label>Autor / Expositor</label>
              <div class="inline-row" style="margin-bottom: 8px;">
                <label class="check-inline">
                  <input type="checkbox" id="cs-anon" checked /> 🕵️ 100% Anónimo
                </label>
              </div>

              <div id="cs-author-details" class="author-inputs-grid hidden">
                <div class="input-field">
                  <label>Nombre o apodo</label>
                  <input type="text" id="cs-author" placeholder="Ej. Carlos Brenes" />
                </div>
                <div class="input-field">
                  <label>Instagram</label>
                  <input type="text" id="cs-instagram" placeholder="@usuario" />
                </div>
                <div class="input-field">
                  <label>LinkedIn</label>
                  <input type="text" id="cs-linkedin" placeholder="linkedin.com/in/usuario" />
                </div>
                <div class="input-field">
                  <label>Sitio Web</label>
                  <input type="text" id="cs-website" placeholder="tuweb.com" />
                </div>
              </div>
            </div>

            <!-- Imagen / Meme Adjunto -->
            <div class="form-group">
              <label>🖼️ Imagen o Meme de la tarjeta (Formato WebP)</label>
              <div class="inline-row">
                <button type="button" class="btn-tool-secondary" id="cs-pick-meme">
                  😂 Elegir meme del catálogo (328 disponibles)
                </button>
                <label class="btn-tool-secondary" for="cs-file">
                  ⬆️ Subir propia imagen
                </label>
                <input type="file" id="cs-file" accept="image/*" class="file-hidden" />
                <label class="btn-tool-secondary" for="cs-video-file" id="cs-video-label">
                  🎬 Subir video
                </label>
                <input type="file" id="cs-video-file" accept="video/*" class="file-hidden" />
                <button type="button" class="btn-tool-ghost hidden" id="cs-remove-image">
                  ✕ Quitar imagen/video
                </button>
              </div>
              <div id="cs-video-status" class="empty-note" style="margin-top:8px;"></div>
              <div id="cs-meme-picker" class="meme-picker hidden"></div>
            </div>

            <!-- Botones de Acción -->
            <div class="card-form-actions">
              <button type="submit" class="btn-primary" id="cs-save">
                ${currentStory ? '💾 Guardar cambios de esta tarjeta' : '🚀 Guardar en la pizarra'}
              </button>
              <button type="button" class="btn-tool-secondary ${currentStory ? 'hidden' : ''}" id="cs-save-another">
                ➕ Guardar y crear otra
              </button>
              <button type="button" class="btn-tool-ghost" id="cs-clear">
                🧹 Limpiar formulario
              </button>
            </div>
          </form>

          <!-- Columna Vista Previa (Teleprompter) -->
          <aside class="card-preview-col">
            <div class="preview-head">
              <span>Vista previa en tiempo real (Teleprompter TV)</span>
              <button type="button" class="btn-tool-ghost" id="cs-fullscreen" title="Ver en pantalla completa">
                ⛶ Pantalla completa
              </button>
            </div>
            <div class="teleprompter-card" id="cs-preview">
              <!-- Renderizado en vivo -->
            </div>
          </aside>
        </div>

        <!-- SECCIÓN DE EDICIÓN: LISTA DE TARJETAS EXISTENTES (SEED + CREADAS) -->
        <div class="existing-stories-section">
          <div class="existing-stories-header">
            <div>
              <h3>📚 Tarjetas en la Pizarra (${this.allStories.length})</h3>
              <p>Puedes editar cualquier tarjeta existente (incluyendo las de prueba). Haz clic en <strong>"✏️ Editar"</strong> para cargarla en el formulario.</p>
            </div>
          </div>

          <div class="existing-stories-grid" id="cs-existing-grid">
            ${this.renderStoriesCardsHtml()}
          </div>
        </div>
      </div>
    `;

    this.bind();

    if (currentStory) {
      this.populateFormWithStory(currentStory);
    } else {
      this.updatePreview();
    }
  }

  private renderStoriesCardsHtml(): string {
    if (this.allStories.length === 0) {
      return '<p class="empty-note">No hay tarjetas registradas en este momento.</p>';
    }

    return this.allStories.map(story => {
      const isCurrent = this.editingStoryId === story.id;
      const thumb = story.photoUrl
        ? `<div class="story-thumb" style="background-image: url('${escapeHtml(story.photoUrl)}')"></div>`
        : `<div class="story-thumb-icon">📝</div>`;

      const authorName = story.author?.isAnonymous ? '🕵️ Anónimo' : `🔥 ${escapeHtml(story.author?.name || 'Autor')}`;

      return `
        <div class="existing-card-item ${isCurrent ? 'active-editing' : ''}" data-story-id="${story.id}">
          ${thumb}
          <div class="story-card-details">
            <div class="story-meta-tags">
              <span class="card-cat-badge">${escapeHtml(story.category || 'General')}</span>
              <span class="card-status-badge ${story.status === 'approved' ? 'approved' : 'pending'}">
                ${story.status === 'approved' ? '🟢 En Pizarra' : '🟡 Pendiente'}
              </span>
            </div>
            <h4 class="story-card-title">${escapeHtml(story.title)}</h4>
            <p class="story-card-excerpt">${escapeHtml(story.content.substring(0, 90))}${story.content.length > 90 ? '...' : ''}</p>
            <div class="story-card-author">${authorName}</div>
          </div>
          <div class="story-card-actions">
            <button type="button" class="btn-action-edit" data-edit-id="${story.id}" title="Editar esta tarjeta">
              ✏️ Editar
            </button>
            <button type="button" class="btn-action-preview" data-preview-id="${story.id}" title="Ver en teleprompter">
              👁️ Previsualizar
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  private bind() {
    // Toggle muestras prediseñadas
    this.q('#cs-toggle-samples')?.addEventListener('click', () => {
      this.samplesVisible = !this.samplesVisible;
      const grid = this.q('#cs-samples-grid');
      const btn = this.q('#cs-toggle-samples');
      if (grid) grid.classList.toggle('collapsed', !this.samplesVisible);
      if (btn) btn.textContent = this.samplesVisible ? '👁️ Ocultar muestras' : '👁️ Mostrar muestras';
    });

    // Cargar muestra
    this.container.querySelectorAll<HTMLButtonElement>('.btn-use-sample').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.sampleId;
        const sample = SAMPLES.find(s => s.id === id);
        if (sample) this.loadSample(sample);
      });
    });

    this.container.querySelectorAll<HTMLElement>('.sample-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.sampleId;
        const sample = SAMPLES.find(s => s.id === id);
        if (sample) this.loadSample(sample);
      });
    });

    // Cancelar edición
    this.q('#cs-cancel-edit')?.addEventListener('click', () => {
      this.editingStoryId = null;
      this.render();
    });

    // Eventos de inputs para actualización en vivo del teleprompter
    ['#cs-title', '#cs-category', '#cs-content', '#cs-learnings', '#cs-author', '#cs-instagram', '#cs-linkedin', '#cs-website'].forEach(sel => {
      this.q(sel)?.addEventListener('input', () => this.updatePreview());
    });

    // Toggle de anónimo
    const anon = this.q<HTMLInputElement>('#cs-anon');
    const authorDetails = this.q('#cs-author-details');
    anon?.addEventListener('change', () => {
      if (authorDetails) {
        authorDetails.classList.toggle('hidden', anon.checked);
      }
      this.updatePreview();
    });

    // Subir imagen propia
    this.q<HTMLInputElement>('#cs-file')?.addEventListener('change', async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const res = await MediaCompressor.compressImage(file);
        this.setImage(res.dataUrl);
      } catch (err) {
        alert('Error procesando la imagen: ' + (err as Error).message);
      }
    });

    // Elegir meme con el modal o catálogo
    this.q('#cs-pick-meme')?.addEventListener('click', () => {
      if (this.memePickerModal) {
        this.memePickerModal.open((meme) => {
          this.setImage(`/memes/${meme.file}`);
          const title = this.q<HTMLInputElement>('#cs-title');
          if (title && !title.value) title.value = meme.name;
        });
      } else {
        this.toggleMemePicker();
      }
    });

    // Subir video (se comprime en el navegador antes de guardarse)
    this.q<HTMLInputElement>('#cs-video-file')?.addEventListener('change', async (e) => {
      const input = e.target as HTMLInputElement;
      const file = input.files?.[0];
      if (!file) return;
      const status = this.q('#cs-video-status');
      const label = this.q('#cs-video-label');
      label?.classList.add('disabled');
      const saveBtn = this.q<HTMLButtonElement>('#cs-save');
      if (saveBtn) saveBtn.disabled = true;
      try {
        const sizeMB = file.size / (1024 * 1024);
        if (sizeMB <= 12 && /^video\/(mp4|webm)$/.test(file.type)) {
          // Archivo liviano: se usa directo (la compresión corre en tiempo real y es lenta)
          if (status) status.textContent = '⏳ Cargando video...';
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result as string);
            r.onerror = () => reject(new Error('No se pudo leer el video'));
            r.readAsDataURL(file);
          });
          this.setVideo(dataUrl);
          if (status) status.textContent = `✅ Video listo (${sizeMB.toFixed(1)} MB)`;
        } else {
          const res = await MediaCompressor.compressVideo(file, (p) => {
            if (status) status.textContent = `🎬 ${p.stage} ${Math.round(p.percent)}% — espera antes de guardar`;
          });
          this.setVideo(res.dataUrl);
          if (status) status.textContent = `✅ Video listo (${res.compressedSizeMB} MB, ${Math.round(res.duration)} s)`;
        }
      } catch (err) {
        if (status) status.textContent = '';
        alert('Error procesando el video: ' + (err as Error).message);
      } finally {
        label?.classList.remove('disabled');
        if (saveBtn) saveBtn.disabled = false;
        input.value = '';
      }
    });

    // Quitar imagen / video
    this.q('#cs-remove-image')?.addEventListener('click', () => {
      this.videoUrl = null;
      const status = this.q('#cs-video-status');
      if (status) status.textContent = '';
      this.setImage(null);
    });

    // Limpiar formulario
    this.q('#cs-clear')?.addEventListener('click', () => {
      this.editingStoryId = null;
      this.render();
    });

    // Pantalla completa del teleprompter
    this.q('#cs-fullscreen')?.addEventListener('click', () => {
      const el = this.q('#cs-preview');
      if (!el) return;
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        el.requestFullscreen().catch(() => {});
      }
    });

    // Enviar formulario (Guardar nueva o Actualizar existente)
    this.q<HTMLFormElement>('#cs-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.save(false);
    });

    this.q('#cs-save-another')?.addEventListener('click', () => {
      const form = this.q<HTMLFormElement>('#cs-form');
      if (form && form.reportValidity()) {
        this.save(true);
      }
    });

    // Botones de acción en la lista de tarjetas existentes
    this.container.querySelectorAll<HTMLButtonElement>('.btn-action-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.editId;
        const story = this.allStories.find(s => s.id === id);
        if (story) {
          this.editStory(story);
        }
      });
    });

    this.container.querySelectorAll<HTMLButtonElement>('.btn-action-preview').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.previewId;
        const story = this.allStories.find(s => s.id === id);
        if (story) {
          this.previewStory(story);
        }
      });
    });
  }

  private loadSample(s: CardSample) {
    this.editingStoryId = null;
    const banner = this.q('#cs-edit-banner');
    if (banner) banner.classList.add('hidden');

    const saveBtn = this.q<HTMLButtonElement>('#cs-save');
    if (saveBtn) saveBtn.textContent = '🚀 Guardar en la pizarra';

    this.q<HTMLInputElement>('#cs-title')!.value = s.title;
    this.q<HTMLSelectElement>('#cs-category')!.value = s.category;
    this.q<HTMLTextAreaElement>('#cs-content')!.value = s.content;
    this.q<HTMLInputElement>('#cs-learnings')!.value = s.learnings;
    this.videoUrl = null;
    this.setImage(s.memeFile ? `/memes/${s.memeFile}` : null);
    this.updatePreview();

    // Scroll suave hacia el formulario
    this.q('#cs-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  private populateFormWithStory(story: Story) {
    this.editingStoryId = story.id;
    this.setImage(story.photoUrl || null);
    this.setVideo(story.videoUrl || null);

    const titleEl = this.q<HTMLInputElement>('#cs-title');
    const catEl = this.q<HTMLSelectElement>('#cs-category');
    const contentEl = this.q<HTMLTextAreaElement>('#cs-content');
    const learnEl = this.q<HTMLInputElement>('#cs-learnings');
    const anonEl = this.q<HTMLInputElement>('#cs-anon');
    const authorEl = this.q<HTMLInputElement>('#cs-author');
    const instaEl = this.q<HTMLInputElement>('#cs-instagram');
    const linkEl = this.q<HTMLInputElement>('#cs-linkedin');
    const webEl = this.q<HTMLInputElement>('#cs-website');
    const detailsEl = this.q('#cs-author-details');

    if (titleEl) titleEl.value = story.title || '';
    if (catEl) catEl.value = story.category || 'General';
    if (contentEl) contentEl.value = story.content || '';
    if (learnEl) learnEl.value = story.learnings || '';

    const isAnon = story.author?.isAnonymous !== false;
    if (anonEl) anonEl.checked = isAnon;
    if (detailsEl) detailsEl.classList.toggle('hidden', isAnon);

    if (authorEl) authorEl.value = story.author?.name || '';
    if (instaEl) instaEl.value = story.author?.instagram || '';
    if (linkEl) linkEl.value = story.author?.linkedin || '';
    if (webEl) webEl.value = story.author?.website || '';

    const banner = this.q('#cs-edit-banner');
    if (banner) banner.classList.remove('hidden');

    const displayTitle = this.q('#cs-edit-title-display');
    if (displayTitle) displayTitle.textContent = story.title;

    const saveBtn = this.q<HTMLButtonElement>('#cs-save');
    if (saveBtn) saveBtn.textContent = '💾 Guardar cambios de esta tarjeta';

    const saveAnother = this.q('#cs-save-another');
    if (saveAnother) saveAnother.classList.add('hidden');

    this.updatePreview();
  }

  private previewStory(story: Story) {
    this.populateFormWithStory(story);
    this.q('.card-preview-col')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  private setImage(url: string | null) {
    this.imageUrl = url;
    this.q('#cs-remove-image')?.classList.toggle('hidden', !url && !this.videoUrl);
    this.updatePreview();
  }

  private setVideo(url: string | null) {
    this.videoUrl = url;
    if (url) this.imageUrl = null;
    this.q('#cs-remove-image')?.classList.toggle('hidden', !url && !this.imageUrl);
    this.updatePreview();
  }

  private toggleMemePicker() {
    const picker = this.q('#cs-meme-picker');
    if (!picker) return;
    if (!picker.classList.contains('hidden')) {
      picker.classList.add('hidden');
      return;
    }
    picker.innerHTML = this.memes.length
      ? this.memes.map(m => `
          <button type="button" class="meme-pick" data-file="${escapeHtml(m.file)}" title="${escapeHtml(m.name)}">
            <img src="/memes/${encodeURIComponent(m.file)}" alt="${escapeHtml(m.name)}" loading="lazy" />
          </button>`).join('')
      : '<p class="empty-note">No se pudo cargar el catálogo de memes.</p>';
    picker.classList.remove('hidden');
    picker.querySelectorAll<HTMLButtonElement>('.meme-pick').forEach(b => {
      b.addEventListener('click', () => {
        this.setImage(`/memes/${b.dataset.file}`);
        picker.classList.add('hidden');
      });
    });
  }

  private values() {
    const anonymous = this.q<HTMLInputElement>('#cs-anon')?.checked ?? true;
    return {
      title: this.q<HTMLInputElement>('#cs-title')?.value.trim() || '',
      category: this.q<HTMLSelectElement>('#cs-category')?.value || 'General',
      content: this.q<HTMLTextAreaElement>('#cs-content')?.value.trim() || '',
      learnings: this.q<HTMLInputElement>('#cs-learnings')?.value.trim() || '',
      anonymous,
      author: this.q<HTMLInputElement>('#cs-author')?.value.trim() || '',
      instagram: this.q<HTMLInputElement>('#cs-instagram')?.value.trim() || '',
      linkedin: this.q<HTMLInputElement>('#cs-linkedin')?.value.trim() || '',
      website: this.q<HTMLInputElement>('#cs-website')?.value.trim() || ''
    };
  }

  private updatePreview() {
    const preview = this.q('#cs-preview');
    if (!preview) return;
    const v = this.values();

    let authorBadge = '🕵️ Anónimo';
    if (!v.anonymous) {
      authorBadge = `🔥 ${escapeHtml(v.author || 'Emprendedor/a')}`;
      if (v.instagram) authorBadge += ` · ${escapeHtml(v.instagram)}`;
    }

    preview.innerHTML = `
      ${this.videoUrl
        ? `<div class="tp-image"><video src="${this.videoUrl}" controls muted playsinline style="max-width:100%;max-height:280px;"></video></div>`
        : (this.imageUrl ? `<div class="tp-image"><img src="${this.imageUrl}" alt="Imagen de la tarjeta" /></div>` : '')}
      <div class="tp-body">
        <div class="tp-top-row">
          <span class="tp-category">${escapeHtml(v.category)}</span>
          <span class="tp-hashtag">#ShareTheFailure</span>
        </div>
        <h3 class="tp-title">${escapeHtml(v.title) || 'Título o frase de tu fuckup'}</h3>
        <p class="tp-content">${escapeHtml(v.content) || 'Aquí aparecerá la historia completa que se leerá en el teleprompter...'}</p>
        ${v.learnings ? `
          <div class="tp-learning-box">
            <span class="learning-icon">💡</span>
            <div class="learning-text">${escapeHtml(v.learnings)}</div>
          </div>
        ` : ''}
        <div class="tp-footer-row">
          <span class="tp-author">${authorBadge}</span>
        </div>
      </div>
    `;
  }

  private async save(another: boolean) {
    const v = this.values();
    if (!v.title || !v.content) {
      alert('Por favor completa al menos el título y la historia.');
      return;
    }

    const saveBtn = this.q<HTMLButtonElement>('#cs-save');
    if (saveBtn) saveBtn.disabled = true;

    const isEdit = !!this.editingStoryId;
    const existing = isEdit ? this.allStories.find(s => s.id === this.editingStoryId) : null;
    const cfg = storage.getConfig();

    const story: Story = {
      id: isEdit && existing ? existing.id : ('story-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7)),
      createdAt: isEdit && existing ? existing.createdAt : Date.now(),
      title: v.title,
      category: v.category,
      author: {
        isAnonymous: v.anonymous,
        name: v.anonymous ? undefined : (v.author || 'Anónimo'),
        instagram: v.anonymous ? undefined : (v.instagram || undefined),
        linkedin: v.anonymous ? undefined : (v.linkedin || undefined),
        website: v.anonymous ? undefined : (v.website || undefined)
      },
      mediaType: this.videoUrl ? 'video' : (this.imageUrl ? 'photo' : 'text'),
      content: v.content,
      learnings: v.learnings || undefined,
      photoUrl: this.imageUrl || undefined,
      videoUrl: this.videoUrl || undefined,
      status: isEdit && existing ? existing.status : (cfg.autoApprove ? 'approved' : 'pending'),
      likes: isEdit && existing ? existing.likes : 1,
      featured: isEdit && existing ? existing.featured : false
    };

    try {
      if (isEdit) {
        await storage.updateStory(story);
      } else {
        await storage.saveStory(story, false);
      }

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#ff006e', '#4cc9f0', '#ffffff', '#ffbe0b']
      });

      this.editingStoryId = null;
      this.onSaved?.();

      if (another) {
        await this.render();
      } else {
        await this.render();
        this.q('.existing-stories-section')?.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err) {
      alert('No se pudo guardar la tarjeta: ' + (err as Error).message);
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }
}
