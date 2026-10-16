export interface Meme {
  id: string;
  name: string;
  source: string;
  file: string;
  categoria?: string;
  descripcion?: string;
  tags?: string[];
  score?: number;
}

let catalogCache: Meme[] | null = null;

export async function loadMemeCatalog(): Promise<Meme[]> {
  if (catalogCache) return catalogCache;
  const res = await fetch('/memes/catalog_fun.json');
  if (!res.ok) throw new Error('No se encontró el catálogo de memes');
  catalogCache = await res.json();
  return catalogCache!;
}

export function escapeHtml(text: string): string {
  return String(text ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));
}

const normalize = (t: string) =>
  t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ');

const QUICK_FILTERS: Array<[string, string]> = [
  ['🔥 Se cayó producción', 'produccion fuego borrar base de datos'],
  ['💸 Se acabó el dinero', 'inversion dinero se fue presupuesto quebrar'],
  ['🤷 Mala decisión', 'decision dilema elegir mal atajo'],
  ['🫣 Disimular culpa', 'culpa verguenza yo no fui disimular'],
  ['⏳ Esperando al cliente', 'cliente espera nunca respondio demora']
];

/** Buscador de memes para anécdotas (indexado por etiquetas y categorías, sin IA). */
export class MemeFinder {
  private container: HTMLElement;
  private catalog: Meme[] = [];
  private onUseMeme: (meme: Meme) => void;

  constructor(container: HTMLElement, onUseMeme: (meme: Meme) => void) {
    this.container = container;
    this.onUseMeme = onUseMeme;
  }

  public async render() {
    this.container.innerHTML = `
      <div class="tool-wrap">
        <div class="tool-heading">
          <span class="tool-tag">MEMES</span>
          <h2>Buscador de memes para fracasos</h2>
          <p>Escribe la anécdota del asistente: el catálogo se filtra y puntúa al instante. Usa el meme directo en una tarjeta.</p>
        </div>

        <div class="meme-search-panel">
          <textarea id="mf-input" rows="3" placeholder="Ej: Subí un script a producción sin WHERE y borré todos los clientes antes de la demo..."></textarea>
          <div class="sample-bar">
            <span class="sample-bar-label">Filtros rápidos:</span>
            ${QUICK_FILTERS.map(([label, q]) => `<button type="button" class="sample-chip" data-q="${escapeHtml(q)}">${escapeHtml(label)}</button>`).join('')}
            <button type="button" class="sample-chip" id="mf-reset">✨ Mostrar todos</button>
          </div>
        </div>

        <div class="meme-count" id="mf-count">Cargando catálogo...</div>
        <div class="meme-grid" id="mf-grid"></div>
      </div>
    `;

    this.container.querySelector('#mf-input')!.addEventListener('input', (e) => this.search((e.target as HTMLTextAreaElement).value));
    this.container.querySelectorAll<HTMLButtonElement>('.sample-chip[data-q]').forEach(b => {
      b.addEventListener('click', () => {
        const q = b.dataset.q || '';
        (this.container.querySelector('#mf-input') as HTMLTextAreaElement).value = q;
        this.search(q);
      });
    });
    this.container.querySelector('#mf-reset')!.addEventListener('click', () => {
      (this.container.querySelector('#mf-input') as HTMLTextAreaElement).value = '';
      this.draw(this.catalog);
    });

    try {
      this.catalog = await loadMemeCatalog();
      this.draw(this.catalog);
    } catch (err) {
      this.container.querySelector('#mf-count')!.textContent = 'Error cargando catálogo: ' + (err as Error).message;
    }
  }

  private search(query: string) {
    if (!query.trim()) return this.draw(this.catalog);
    const tokens = normalize(query).split(/\s+/).filter(t => t.length > 2);

    const scored = this.catalog.map(m => {
      let score = 0;
      const name = normalize(m.name);
      const cat = normalize(m.categoria || '');
      const desc = normalize(m.descripcion || '');
      const tags = (m.tags || []).map(normalize);
      tokens.forEach(t => {
        tags.forEach(tag => {
          if (tag.includes(t)) score += 3;
          if (tag === t) score += 5;
        });
        if (name.includes(t)) score += 4;
        if (cat.includes(t)) score += 3;
        if (desc.includes(t)) score += 2;
      });
      return { ...m, score };
    }).filter(m => m.score > 0).sort((a, b) => b.score - a.score);

    if (scored.length) this.draw(scored, true);
    else this.draw(this.catalog, false, true);
  }

  private draw(items: Meme[], showScore = false, noMatch = false) {
    const count = this.container.querySelector('#mf-count')!;
    const grid = this.container.querySelector('#mf-grid')!;

    count.innerHTML = noMatch
      ? '<span style="color:#ffbe0b">Sin coincidencias exactas. Mostrando todo el catálogo:</span>'
      : `Mostrando ${items.length} meme${items.length === 1 ? '' : 's'}`;

    grid.innerHTML = items.map(m => `
      <article class="meme-card">
        <div class="meme-img">
          ${showScore && (m.score || 0) > 0 ? `<span class="meme-score">★ ${m.score}</span>` : ''}
          <img src="/memes/${encodeURIComponent(m.file)}" alt="${escapeHtml(m.name)}" loading="lazy" />
        </div>
        <div class="meme-body">
          <span class="meme-cat">${escapeHtml(m.categoria || 'Fuckup Night')}</span>
          <h3>${escapeHtml(m.name)}</h3>
          <div class="meme-tags">${(m.tags || []).slice(0, 4).map(t => `<span>#${escapeHtml(t)}</span>`).join('')}</div>
          <button type="button" class="btn-primary meme-use" data-file="${escapeHtml(m.file)}">🃏 Usar en una tarjeta</button>
        </div>
      </article>
    `).join('');

    grid.querySelectorAll<HTMLButtonElement>('.meme-use').forEach(btn => {
      btn.addEventListener('click', () => {
        const meme = this.catalog.find(m => m.file === btn.dataset.file);
        if (meme) this.onUseMeme(meme);
      });
    });
  }
}
