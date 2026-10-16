import { loadMemeCatalog, escapeHtml, type Meme } from './memeFinder';

const CATEGORIES = [
  '🌟 Todos',
  '💥 Desastres & Producción',
  '💸 Dinero & Quiebra',
  '🤷 Malas Decisiones',
  '🫣 Culpa & Disimulo',
  '⏳ Espera Agónica',
  '🥊 Traición & Malas Alianzas',
  '🦁 Emprendimiento & Ego',
  '😂 Humor Clásico & Fracasos'
];

export class MemePickerModal {
  private modalEl: HTMLElement;
  private catalog: Meme[] = [];
  private onSelectCallback: ((meme: Meme) => void) | null = null;
  private selectedCategory = '🌟 Todos';
  private searchQuery = '';

  constructor(modalEl: HTMLElement) {
    this.modalEl = modalEl;
  }

  public async open(onSelect: (meme: Meme) => void) {
    this.onSelectCallback = onSelect;
    this.searchQuery = '';
    this.selectedCategory = '🌟 Todos';

    if (this.catalog.length === 0) {
      try {
        this.catalog = await loadMemeCatalog();
      } catch (err) {
        console.error('Error cargando catálogo de memes:', err);
      }
    }

    this.render();
    this.modalEl.classList.add('active');
    document.body.classList.add('modal-open');
  }

  public close() {
    this.modalEl.classList.remove('active');
    document.body.classList.remove('modal-open');
    this.onSelectCallback = null;
  }

  private render() {
    this.modalEl.innerHTML = `
      <div class="modal-dialog meme-picker-dialog">
        <div class="modal-header">
          <div class="modal-title-wrap">
            <span class="modal-tag">RECURSOS & MEMES</span>
            <h2>EXPLORADOR DE MEMES PARA FRACASOS</h2>
            <p>Selecciona entre ${this.catalog.length} memes curados en formato WebP optimizado para tu tarjeta.</p>
          </div>
          <button class="btn-close-modal" id="btn-close-meme-picker">&times;</button>
        </div>

        <div class="meme-picker-filter-bar">
          <div class="meme-search-box">
            <span class="search-icon">🔍</span>
            <input type="text" id="meme-picker-search" placeholder="Buscar por nombre, palabra clave o error (ej. produccion, dinero, clown)..." value="${escapeHtml(this.searchQuery)}" />
            ${this.searchQuery ? `<button type="button" class="btn-clear-search" id="btn-clear-meme-search">&times;</button>` : ''}
          </div>

          <div class="meme-cat-pills" id="meme-picker-cats">
            ${CATEGORIES.map(cat => `
              <button type="button" class="cat-pill ${cat === this.selectedCategory ? 'active' : ''}" data-cat="${escapeHtml(cat)}">
                ${escapeHtml(cat)}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="meme-picker-stats">
          <span id="meme-picker-count">Filtrando memes...</span>
          <small>💡 Haz clic en cualquier imagen para seleccionarla inmediatamente</small>
        </div>

        <div class="meme-picker-grid-wrap">
          <div class="meme-picker-grid" id="meme-picker-grid"></div>
        </div>
      </div>
    `;

    this.attachEvents();
    this.updateGrid();
  }

  private attachEvents() {
    this.modalEl.querySelector('#btn-close-meme-picker')?.addEventListener('click', () => this.close());
    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.close();
    });

    const searchInput = this.modalEl.querySelector('#meme-picker-search') as HTMLInputElement;
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value;
      this.updateGrid();
    });

    this.modalEl.querySelector('#btn-clear-meme-search')?.addEventListener('click', () => {
      this.searchQuery = '';
      if (searchInput) searchInput.value = '';
      this.updateGrid();
    });

    this.modalEl.querySelectorAll<HTMLButtonElement>('.cat-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedCategory = btn.dataset.cat || '🌟 Todos';
        this.modalEl.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        this.updateGrid();
      });
    });
  }

  private filterMemes(): Meme[] {
    const q = this.searchQuery.trim().toLowerCase();
    const cat = this.selectedCategory;

    return this.catalog.filter(m => {
      // Category filter
      if (cat !== '🌟 Todos') {
        const cleanCat = cat.replace(/^[^\w\s]+\s*/, '').trim().toLowerCase();
        const memeCat = (m.categoria || '').toLowerCase();
        if (!memeCat.includes(cleanCat) && !cleanCat.includes(memeCat)) {
          return false;
        }
      }

      // Query filter
      if (!q) return true;
      const name = (m.name || '').toLowerCase();
      const tags = (m.tags || []).join(' ').toLowerCase();
      const desc = (m.descripcion || '').toLowerCase();
      const file = (m.file || '').toLowerCase();

      return name.includes(q) || tags.includes(q) || desc.includes(q) || file.includes(q);
    });
  }

  private updateGrid() {
    const grid = this.modalEl.querySelector('#meme-picker-grid');
    const countEl = this.modalEl.querySelector('#meme-picker-count');
    if (!grid) return;

    const filtered = this.filterMemes();
    if (countEl) {
      countEl.textContent = `Mostrando ${filtered.length} de ${this.catalog.length} memes`;
    }

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="empty-memes-notice">
          <span style="font-size: 38px;">🔍</span>
          <p>No se encontraron memes con "<strong>${escapeHtml(this.searchQuery)}</strong>"</p>
          <button type="button" class="btn-tool-secondary" id="btn-reset-filters">Ver todos los memes</button>
        </div>
      `;
      grid.querySelector('#btn-reset-filters')?.addEventListener('click', () => {
        this.searchQuery = '';
        this.selectedCategory = '🌟 Todos';
        this.render();
      });
      return;
    }

    grid.innerHTML = filtered.map(m => `
      <div class="meme-picker-card" data-file="${escapeHtml(m.file)}" title="${escapeHtml(m.name)}">
        <div class="meme-thumb-frame">
          <img src="/memes/${encodeURIComponent(m.file)}" alt="${escapeHtml(m.name)}" loading="lazy" />
        </div>
        <div class="meme-card-info">
          <span class="meme-tag-pill">${escapeHtml(m.categoria || 'Fuckup Night')}</span>
          <div class="meme-name-text">${escapeHtml(m.name)}</div>
          <button type="button" class="btn-select-meme-chip">✓ Seleccionar</button>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll<HTMLElement>('.meme-picker-card').forEach(card => {
      card.addEventListener('click', () => {
        const file = card.dataset.file;
        const meme = this.catalog.find(m => m.file === file);
        if (meme && this.onSelectCallback) {
          this.onSelectCallback(meme);
          this.close();
        }
      });
    });
  }
}
