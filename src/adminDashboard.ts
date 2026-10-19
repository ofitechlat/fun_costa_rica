import type { Story, BoardConfig } from './types';
import { storage } from './storage';
import { MediaCompressor } from './mediaCompressor';
import { AdminAuth } from './adminAuth';

export class AdminDashboard {
  private container: HTMLElement;
  private onConfigChanged?: (config: BoardConfig) => void;
  private onStoriesChanged?: () => void;
  private onTriggerSpotlight?: (story: Story) => void;
  private onEditStory?: (story: Story) => void;
  private onCreateStory?: () => void;
  private onCloseDashboard?: () => void;

  private currentFilter: 'all' | 'approved' | 'pending' | 'video' = 'all';
  private searchQuery = '';

  constructor(
    container: HTMLElement,
    callbacks: {
      onConfigChanged?: (config: BoardConfig) => void;
      onStoriesChanged?: () => void;
      onTriggerSpotlight?: (story: Story) => void;
      onEditStory?: (story: Story) => void;
      onCreateStory?: () => void;
      onCloseDashboard?: () => void;
    }
  ) {
    this.container = container;
    this.onConfigChanged = callbacks.onConfigChanged;
    this.onStoriesChanged = callbacks.onStoriesChanged;
    this.onTriggerSpotlight = callbacks.onTriggerSpotlight;
    this.onEditStory = callbacks.onEditStory;
    this.onCreateStory = callbacks.onCreateStory;
    this.onCloseDashboard = callbacks.onCloseDashboard;
  }

  public async render() {
    if (!AdminAuth.isAuthenticated()) {
      return;
    }

    const config = storage.getConfig();
    const allStories = await storage.getAllStories();

    // Stats
    const totalCount = allStories.length;
    const approvedCount = allStories.filter(s => s.status === 'approved').length;
    const pendingCount = allStories.filter(s => s.status === 'pending').length;
    const videoCount = allStories.filter(s => s.mediaType === 'video').length;
    const anonCount = allStories.filter(s => s.author.isAnonymous).length;

    this.container.innerHTML = `
      <div class="admin-layout">
        <!-- Sidebar Navigation -->
        <aside class="admin-sidebar">
          <div class="admin-logo-block">
            <img src="/logo.svg" alt="FuN Logo" class="admin-logo-img" />
            <div>
              <h2>ADMIN DASHBOARD</h2>
              <span class="admin-city-badge">SAN JOSÉ, COSTA RICA</span>
            </div>
          </div>

          <nav class="admin-nav">
            <button class="nav-item active" data-tab="stories">
              📋 Gestión de Cagadas <span class="nav-badge">${totalCount}</span>
            </button>
            <button class="nav-item" data-tab="timing">
              ⏱️ Configuración de Tiempos
            </button>
            <button class="nav-item" data-tab="tools">
              🛠️ Herramientas & Demo
            </button>
          </nav>

          <div class="admin-sidebar-footer">
            <button class="btn-primary btn-view-board" id="btn-return-board">
              📺 Ver Pizarra En Vivo
            </button>
            <button class="btn-logout" id="btn-admin-logout">
              Cerrar Sesión (funcr)
            </button>
          </div>
        </aside>

        <!-- Main Content Area -->
        <main class="admin-main">
          <!-- TOP STATS BAR -->
          <div class="stats-grid">
            <div class="stat-card">
              <span class="stat-num">${totalCount}</span>
              <span class="stat-label">Total Cagadas</span>
            </div>
            <div class="stat-card highlight-green">
              <span class="stat-num">${approvedCount}</span>
              <span class="stat-label">Nadando en Pizarra</span>
            </div>
            <div class="stat-card ${pendingCount > 0 ? 'highlight-yellow' : ''}">
              <span class="stat-num">${pendingCount}</span>
              <span class="stat-label">Pendientes Moderación</span>
            </div>
            <div class="stat-card highlight-cyan">
              <span class="stat-num">${videoCount}</span>
              <span class="stat-label">Confesiones en Video</span>
            </div>
            <div class="stat-card">
              <span class="stat-num">${Math.round((anonCount / (totalCount || 1)) * 100)}%</span>
              <span class="stat-label">Tasa de Anonimato</span>
            </div>
          </div>

          <!-- TAB 1: STORIES MANAGEMENT -->
          <section id="tab-stories" class="admin-tab-pane active">
            <div class="tab-header-flex">
              <div>
                <h2>Historias & Confesiones</h2>
                <p>Modera, aprueba o dispara cualquier historia inmediatamente a pantalla completa.</p>
              </div>

              <div class="tab-actions-right">
                <button class="btn-primary" id="btn-create-manual-story">
                  + Nueva Historia (foto / meme / 🎬 video)
                </button>
              </div>
            </div>

            <!-- Filters Bar -->
            <div class="table-filter-bar">
              <div class="filter-pills">
                <button class="filter-btn ${this.currentFilter === 'all' ? 'active' : ''}" data-filter="all">Todas (${totalCount})</button>
                <button class="filter-btn ${this.currentFilter === 'approved' ? 'active' : ''}" data-filter="approved">Aprobadas (${approvedCount})</button>
                <button class="filter-btn ${this.currentFilter === 'pending' ? 'active' : ''}" data-filter="pending">Pendientes (${pendingCount})</button>
                <button class="filter-btn ${this.currentFilter === 'video' ? 'active' : ''}" data-filter="video">Con Video (${videoCount})</button>
              </div>

              <div class="search-wrap">
                <input type="text" id="admin-search-input" placeholder="Buscar por título, autor o lección..." value="${this.searchQuery}" />
              </div>
            </div>

            <!-- Stories Table -->
            <div class="stories-table-wrap">
              <table class="stories-table">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Título & Cagada</th>
                    <th>Autor / Redes</th>
                    <th>Categoría</th>
                    <th>Estado</th>
                    <th style="text-align: right;">Acciones de Control</th>
                  </tr>
                </thead>
                <tbody id="admin-stories-tbody">
                  <!-- Injected via helper -->
                </tbody>
              </table>
            </div>
          </section>

          <!-- TAB 2: TIMING & BOARD CONFIG -->
          <section id="tab-timing" class="admin-tab-pane">
            <div class="tab-header-flex">
              <div>
                <h2>Configuración de Tiempos y Pizarra</h2>
                <p>Ajusta con qué frecuencia y cuánto tiempo permanecen las tarjetas nadando y en pantalla completa.</p>
              </div>
            </div>

            <form id="form-board-config" class="config-form-card">
              <div class="config-grid">
                <div class="config-box">
                  <h3>⏱️ Intervalos de Spotlight Aleatorio</h3>
                  <p class="config-desc">Define el rango de segundos aleatorios para que una tarjeta salte a pantalla completa.</p>

                  <div class="form-group">
                    <label>Intervalo MÍNIMO entre tarjetas (Segundos)</label>
                    <div class="range-with-val">
                      <input type="range" id="cfg-min-interval" min="5" max="90" value="${config.minIntervalSeconds}" />
                      <span class="range-display" id="val-min-interval">${config.minIntervalSeconds}s</span>
                    </div>
                  </div>

                  <div class="form-group">
                    <label>Intervalo MÁXIMO entre tarjetas (Segundos)</label>
                    <div class="range-with-val">
                      <input type="range" id="cfg-max-interval" min="10" max="180" value="${config.maxIntervalSeconds}" />
                      <span class="range-display" id="val-max-interval">${config.maxIntervalSeconds}s</span>
                    </div>
                  </div>

                  <div class="form-group">
                    <label>Tiempo de lectura en pantalla completa (Texto / Foto)</label>
                    <div class="range-with-val">
                      <input type="range" id="cfg-reading-time" min="4" max="30" value="${config.readingTimeSeconds}" />
                      <span class="range-display" id="val-reading-time">${config.readingTimeSeconds}s</span>
                    </div>
                    <small>Si la tarjeta tiene video, permanecerá lo que dure la reproducción del video.</small>
                  </div>
                </div>

                <div class="config-box">
                  <h3>🎥 Comportamiento de Video & Nado</h3>
                  <p class="config-desc">Personaliza la experiencia visual y auditiva durante el evento.</p>

                  <div class="form-group checkbox-group">
                    <label class="custom-checkbox">
                      <input type="checkbox" id="cfg-video-autoplay" ${config.videoAutoplay ? 'checked' : ''} />
                      <span class="checkmark"></span>
                      <span>Autoplay de Video al abrir tarjeta</span>
                    </label>
                  </div>

                  <div class="form-group checkbox-group">
                    <label class="custom-checkbox">
                      <input type="checkbox" id="cfg-video-muted" ${config.videoMuted ? 'checked' : ''} />
                      <span class="checkmark"></span>
                      <span>Iniciar videos silenciados (Requiere clic para audio)</span>
                    </label>
                  </div>

                  <div class="form-group">
                    <label>Velocidad de nado de las tarjetas en la pizarra</label>
                    <select id="cfg-swim-speed">
                      <option value="slow" ${config.swimSpeed === 'slow' ? 'selected' : ''}>Lenta (Efecto Zen y lectura tranquila)</option>
                      <option value="normal" ${config.swimSpeed === 'normal' ? 'selected' : ''}>Normal (Dinámica y fluida)</option>
                      <option value="fast" ${config.swimSpeed === 'fast' ? 'selected' : ''}>Rápida (Alta energía)</option>
                    </select>
                  </div>

                  <div class="form-group checkbox-group">
                    <label class="custom-checkbox">
                      <input type="checkbox" id="cfg-auto-approve" ${config.autoApprove ? 'checked' : ''} />
                      <span class="checkmark"></span>
                      <span>Aprobación automática (Aparecen sin revisión previa)</span>
                    </label>
                  </div>

                  <div class="form-group checkbox-group">
                    <label class="custom-checkbox">
                      <input type="checkbox" id="cfg-particles" ${config.ambientParticles ? 'checked' : ''} />
                      <span class="checkmark"></span>
                      <span>Efecto de partículas neón en el fondo</span>
                    </label>
                  </div>

                  <div class="form-group checkbox-group">
                    <label class="custom-checkbox">
                      <input type="checkbox" id="cfg-spotlight-enabled" ${config.spotlightEnabled ? 'checked' : ''} />
                      <span class="checkmark"></span>
                      <span>Ciclo automático de Spotlight activo</span>
                    </label>
                  </div>
                </div>
              </div>

              <div class="config-save-bar">
                <button type="submit" class="btn-primary" id="btn-save-config">
                  💾 GUARDAR CONFIGURACIÓN DE PIZARRA
                </button>
                <span id="config-save-status" class="save-status-msg"></span>
              </div>
            </form>
          </section>

          <!-- TAB 3: TOOLS & DEMO -->
          <section id="tab-tools" class="admin-tab-pane">
            <div class="tab-header-flex">
              <div>
                <h2>Herramientas & Pruebas en Vivo</h2>
                <p>Utilidades para proyectores, respaldo de historias y generación de contenido de prueba.</p>
              </div>
            </div>

            <div class="tools-grid">
              <div class="tool-card">
                <div class="tool-icon">🎥</div>
                <h3>Generar Confesión de Video de Prueba</h3>
                <p>Crea al instante una historia con un video comprimido sintetizado para validar el spotlight de video sin subir archivos.</p>
                <button type="button" class="btn-secondary" id="btn-generate-demo-video">
                  ⚡ Crear Video Demo
                </button>
              </div>

              <div class="tool-card">
                <div class="tool-icon">🔄</div>
                <h3>Restablecer Historias Demo</h3>
                <p>Restaura la colección de historias divertidas y realistas de Fuckup Nights Costa Rica.</p>
                <button type="button" class="btn-secondary" id="btn-reset-seed">
                  Recargar Historias FuN CR
                </button>
              </div>

              <div class="tool-card">
                <div class="tool-icon">💾</div>
                <h3>Exportar e Importar Historias</h3>
                <p>Descarga un archivo JSON con todas las historias y videos para respaldo o transferir a otra máquina.</p>
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                  <button type="button" class="btn-secondary" id="btn-export-json">Exportar JSON</button>
                  <label class="btn-secondary" style="cursor: pointer;">
                    Importar JSON
                    <input type="file" id="input-import-json" accept=".json" style="display: none;" />
                  </label>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    `;

    this.renderStoriesRows(allStories);
    this.attachEvents();
  }

  private renderStoriesRows(allStories: Story[]) {
    const tbody = this.container.querySelector('#admin-stories-tbody');
    if (!tbody) return;

    let filtered = allStories;

    if (this.currentFilter === 'approved') {
      filtered = filtered.filter(s => s.status === 'approved');
    } else if (this.currentFilter === 'pending') {
      filtered = filtered.filter(s => s.status === 'pending');
    } else if (this.currentFilter === 'video') {
      filtered = filtered.filter(s => s.mediaType === 'video');
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.content.toLowerCase().includes(q) ||
        (s.author.name && s.author.name.toLowerCase().includes(q)) ||
        (s.learnings && s.learnings.toLowerCase().includes(q))
      );
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px; color: #888;">
            No se encontraron historias con el filtro actual.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(story => {
      // Type Icon
      let typeBadge = '';
      if (story.mediaType === 'video') {
        typeBadge = `<span class="tbl-badge video">🎥 Video</span>`;
      } else if (story.mediaType === 'photo') {
        typeBadge = `<span class="tbl-badge photo">📸 Foto</span>`;
      } else {
        typeBadge = `<span class="tbl-badge text">📝 Texto</span>`;
      }

      // Author summary
      let authorSummary = '';
      if (story.author.isAnonymous) {
        authorSummary = `<span class="tbl-author anon">🕵️ Anónimo</span>`;
      } else {
        authorSummary = `
          <div class="tbl-author known">
            <strong>${story.author.name || 'Emprendedor'}</strong>
            <small>${[story.author.instagram, story.author.linkedin, story.author.website].filter(Boolean).join(' • ') || 'Sin redes'}</small>
          </div>
        `;
      }

      // Status Badge
      const statusBadge = story.status === 'approved'
        ? `<span class="tbl-status approved">● Aprobada</span>`
        : `<span class="tbl-status pending">○ Pendiente</span>`;

      return `
        <tr data-story-id="${story.id}">
          <td>${typeBadge}</td>
          <td>
            <div class="tbl-title"><strong>${story.title}</strong></div>
            <div class="tbl-excerpt">${story.content.substring(0, 90)}...</div>
          </td>
          <td>${authorSummary}</td>
          <td><span class="tbl-cat">${story.category || 'General'}</span></td>
          <td>${statusBadge}</td>
          <td style="text-align: right;">
            <div class="tbl-actions">
              <button class="btn-tbl-spotlight" data-action="spotlight" title="Lanzar ahora a pantalla completa en la pizarra">
                ⚡ Proyectar
              </button>
              <button class="btn-tbl-edit" data-action="edit" title="Editar textos o memes en el creador de tarjetas">
                ✏️ Editar
              </button>
              <button class="btn-tbl-toggle" data-action="toggle-status" title="${story.status === 'approved' ? 'Desaprobar' : 'Aprobar'}">
                ${story.status === 'approved' ? 'Ocultar' : 'Aprobar'}
              </button>
              <button class="btn-tbl-del" data-action="delete" title="Eliminar historia">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Attach actions to table buttons
    tbody.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const target = e.currentTarget as HTMLElement;
        const row = target.closest('tr');
        const id = row?.getAttribute('data-story-id');
        if (!id) return;

        const action = target.getAttribute('data-action');
        const story = allStories.find(s => s.id === id);
        if (!story) return;

        if (action === 'spotlight') {
          if (this.onTriggerSpotlight) {
            this.onTriggerSpotlight(story);
          }
        } else if (action === 'edit') {
          if (this.onEditStory) {
            this.onEditStory(story);
          }
        } else if (action === 'toggle-status') {
          story.status = story.status === 'approved' ? 'pending' : 'approved';
          await storage.updateStory(story);
          this.render();
          this.onStoriesChanged?.();
        } else if (action === 'delete') {
          if (confirm(`¿Eliminar la historia "${story.title}"?`)) {
            await storage.deleteStory(story.id);
            this.render();
            this.onStoriesChanged?.();
          }
        }
      });
    });
  }

  private attachEvents() {
    // Navigation tabs in sidebar
    const navItems = this.container.querySelectorAll('.admin-nav .nav-item');
    const tabPanes = this.container.querySelectorAll('.admin-tab-pane');

    navItems.forEach(item => {
      item.addEventListener('click', () => {
        navItems.forEach(n => n.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));

        item.classList.add('active');
        const tab = item.getAttribute('data-tab');
        this.container.querySelector(`#tab-${tab}`)?.classList.add('active');
      });
    });

    // Return to board
    this.container.querySelector('#btn-return-board')?.addEventListener('click', () => {
      this.onCloseDashboard?.();
    });

    // Logout
    this.container.querySelector('#btn-admin-logout')?.addEventListener('click', () => {
      AdminAuth.logout();
      this.onCloseDashboard?.();
    });

    // Filter pills
    this.container.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        this.currentFilter = btn.getAttribute('data-filter') as any;
        const all = await storage.getAllStories();
        this.container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderStoriesRows(all);
      });
    });

    // Search input
    const searchInput = this.container.querySelector('#admin-search-input') as HTMLInputElement;
    searchInput?.addEventListener('input', async () => {
      this.searchQuery = searchInput.value;
      const all = await storage.getAllStories();
      this.renderStoriesRows(all);
    });

    // Sliders dynamic value display
    const minSlider = this.container.querySelector('#cfg-min-interval') as HTMLInputElement;
    const maxSlider = this.container.querySelector('#cfg-max-interval') as HTMLInputElement;
    const readingSlider = this.container.querySelector('#cfg-reading-time') as HTMLInputElement;

    minSlider?.addEventListener('input', () => {
      (this.container.querySelector('#val-min-interval') as HTMLElement).textContent = minSlider.value + 's';
      if (+minSlider.value > +maxSlider.value) {
        maxSlider.value = minSlider.value;
        (this.container.querySelector('#val-max-interval') as HTMLElement).textContent = maxSlider.value + 's';
      }
    });

    maxSlider?.addEventListener('input', () => {
      (this.container.querySelector('#val-max-interval') as HTMLElement).textContent = maxSlider.value + 's';
      if (+maxSlider.value < +minSlider.value) {
        minSlider.value = maxSlider.value;
        (this.container.querySelector('#val-min-interval') as HTMLElement).textContent = minSlider.value + 's';
      }
    });

    readingSlider?.addEventListener('input', () => {
      (this.container.querySelector('#val-reading-time') as HTMLElement).textContent = readingSlider.value + 's';
    });

    // Save Configuration Form
    const configForm = this.container.querySelector('#form-board-config') as HTMLFormElement;
    configForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const newConfig: BoardConfig = {
        minIntervalSeconds: +minSlider.value,
        maxIntervalSeconds: +maxSlider.value,
        readingTimeSeconds: +readingSlider.value,
        videoAutoplay: (this.container.querySelector('#cfg-video-autoplay') as HTMLInputElement).checked,
        videoMuted: (this.container.querySelector('#cfg-video-muted') as HTMLInputElement).checked,
        swimSpeed: (this.container.querySelector('#cfg-swim-speed') as HTMLSelectElement).value as any,
        autoApprove: (this.container.querySelector('#cfg-auto-approve') as HTMLInputElement).checked,
        ambientParticles: (this.container.querySelector('#cfg-particles') as HTMLInputElement).checked,
        spotlightEnabled: (this.container.querySelector('#cfg-spotlight-enabled') as HTMLInputElement).checked
      };

      storage.saveConfig(newConfig);
      this.onConfigChanged?.(newConfig);

      const statusEl = this.container.querySelector('#config-save-status') as HTMLElement;
      statusEl.textContent = '✅ ¡Configuración guardada y aplicada en vivo a la pizarra!';
      setTimeout(() => {
        statusEl.textContent = '';
      }, 3500);
    });

    // Create Manual Story Button
    this.container.querySelector('#btn-create-manual-story')?.addEventListener('click', () => {
      if (this.onCreateStory) {
        this.onCreateStory();
        return;
      }
      const title = prompt('Título o Frase de la Cagada:');
      if (!title) return;
      const content = prompt('Explicación de la historia:');
      if (!content) return;
      const learnings = prompt('Lección aprendida:') || '';
      const author = prompt('Nombre del autor (deja vacío para 100% Anónimo):');

      const newStory: Story = {
        id: 'manual-' + Date.now(),
        createdAt: Date.now(),
        title,
        category: 'Emprendimiento',
        author: {
          isAnonymous: !author,
          name: author || undefined
        },
        mediaType: 'text',
        content,
        learnings,
        status: 'approved'
      };

      storage.saveStory(newStory).then(() => {
        this.render();
        this.onStoriesChanged?.();
      });
    });

    // Reset Seed stories
    this.container.querySelector('#btn-reset-seed')?.addEventListener('click', async () => {
      if (confirm('¿Restablecer las historias demo oficiales de FuN Costa Rica?')) {
        await storage.resetSeedData();
        this.render();
        this.onStoriesChanged?.();
        alert('Historias restablecidas con éxito.');
      }
    });

    // Generate Demo Video Story
    this.container.querySelector('#btn-generate-demo-video')?.addEventListener('click', async () => {
      const btn = this.container.querySelector('#btn-generate-demo-video') as HTMLButtonElement;
      btn.disabled = true;
      btn.textContent = '⏳ Sintetizando video demo...';

      try {
        const videoDataUrl = await MediaCompressor.generateSampleFuckupVideo();
        const demoStory: Story = {
          id: 'demo-video-' + Date.now(),
          createdAt: Date.now(),
          title: 'Nuestro primer demo en video para el evento de San José',
          category: 'Tecnología',
          author: {
            isAnonymous: false,
            name: 'Equipo FuN San José',
            instagram: '@fuckupnights.sanjose',
            website: 'fuckupnights.com/city/san_jose'
          },
          mediaType: 'video',
          content: 'Probando el reproductor de video en vivo de la pizarra flotante. Cuando esta tarjeta es elegida al azar, se expande a tamaño completo y reproduce este video comprimido.',
          learnings: 'Probar todo antes de salir al escenario salva eventos.',
          videoUrl: videoDataUrl,
          status: 'approved'
        };

        await storage.saveStory(demoStory);
        this.render();
        this.onStoriesChanged?.();
        alert('🎉 ¡Video demo creado con éxito! Ya está disponible en la lista y nadando en la pizarra.');
      } catch (err) {
        alert('Error: ' + (err as Error).message);
      } finally {
        btn.disabled = false;
        btn.textContent = '⚡ Crear Video Demo';
      }
    });

    // Export JSON
    this.container.querySelector('#btn-export-json')?.addEventListener('click', async () => {
      const all = await storage.getAllStories();
      const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fun-costa-rica-stories-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    // Import JSON
    const importInput = this.container.querySelector('#input-import-json') as HTMLInputElement;
    importInput?.addEventListener('change', async () => {
      const file = importInput.files?.[0];
      if (file) {
        try {
          const text = await file.text();
          const list: Story[] = JSON.parse(text);
          if (Array.isArray(list)) {
            for (const s of list) {
              await storage.saveStory(s);
            }
            this.render();
            this.onStoriesChanged?.();
            alert(`¡Se importaron ${list.length} historias con éxito!`);
          }
        } catch (err) {
          alert('Error importando archivo JSON: ' + (err as Error).message);
        }
      }
    });
  }
}
