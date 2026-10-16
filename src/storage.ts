import type { Story, BoardConfig } from './types';

const DB_NAME = 'FuN_CostaRica_DB';
const DB_VERSION = 1;
const STORE_STORIES = 'stories';
const CONFIG_KEY = 'fun_board_config';
const ADMIN_SESSION_KEY = 'fun_admin_session';

export const DEFAULT_CONFIG: BoardConfig = {
  minIntervalSeconds: 15,
  maxIntervalSeconds: 35,
  readingTimeSeconds: 10,
  videoAutoplay: true,
  videoMuted: false,
  swimSpeed: 'normal',
  autoApprove: true,
  ambientParticles: true,
  spotlightEnabled: true
};

const SEED_STORIES: Story[] = [
  {
    id: 'seed-1',
    createdAt: Date.now() - 1000 * 60 * 60 * 18,
    title: 'Borré la base de datos de producción un viernes a las 6:00 PM',
    category: 'Tecnología',
    author: {
      isAnonymous: false,
      name: 'Esteban Monge',
      linkedin: 'linkedin.com/in/esteban-cr',
      instagram: '@esteban_dev_cr',
      website: 'esteban.tech'
    },
    mediaType: 'text',
    content: 'Pensé que estaba conectado al ambiente de Staging. Tiré un DROP DATABASE sin respaldo reciente porque "sólo íbamos a limpiar pruebas". Toda la app de delivery estuvo caída 14 horas un fin de semana completo en plena quincena.',
    learnings: 'Nunca ejecutar scripts destructivos los viernes, y los permisos de admin no deberían estar en el mismo perfil de desarrollo.',
    status: 'approved',
    likes: 42
  },
  {
    id: 'seed-2',
    createdAt: Date.now() - 1000 * 60 * 60 * 12,
    title: 'Imprimí 10,000 panfletos con el QR apuntando a la competencia',
    category: 'Marketing',
    author: {
      isAnonymous: true
    },
    mediaType: 'text',
    content: 'Teníamos el lanzamiento de una nueva cafetería en San Pedro. Copié el enlace de una plantilla de Canva que tenía un QR de ejemplo hacia Starbucks. No lo probé en físico antes de mandar a litografía.',
    learnings: 'Siempre imprimir una prueba física y escanear el QR tres veces con diferentes celulares antes de autorizar el tiraje masivo.',
    status: 'approved',
    likes: 67
  },
  {
    id: 'seed-3',
    createdAt: Date.now() - 1000 * 60 * 60 * 8,
    title: 'Compré 400 kg de aguacates para un festival... todos verdes como piedras',
    category: 'Gastronomía & Eventos',
    author: {
      isAnonymous: false,
      name: 'Valeria Solano',
      instagram: '@valegastrocr',
      website: 'saborespuravida.cr'
    },
    mediaType: 'photo',
    content: 'Prometimos guacamole ilimitado en el festival gastronómico de La Sabana. El proveedor me prometió que madurarían en 2 días. Tuvimos a 8 personas metiendo aguacates en bolsas de papel con bananos y secadoras de pelo en el camerino a medianoche.',
    learnings: 'No confiar en la promesa de maduración ajena; tener siempre plan de contingencia con proveedores locales de reserva.',
    photoUrl: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=800&auto=format&fit=crop&q=80',
    status: 'approved',
    likes: 89
  },
  {
    id: 'seed-4',
    createdAt: Date.now() - 1000 * 60 * 60 * 4,
    title: 'Le mandé la propuesta comercial con los costos internos de mi proveedor',
    category: 'Ventas B2B',
    author: {
      isAnonymous: true
    },
    mediaType: 'text',
    content: 'En vez de adjuntar la cotización limpia en PDF, envié el Excel de cálculo donde se leía claramente: "Costo real $2,000 - Cobrarles $12,000 porque tienen presupuesto de sobra". El cliente me respondió: "Muchas gracias por la transparencia, aceptamos por $2,500".',
    learnings: 'Revisar dos veces los adjuntos y nunca calcular márgenes brutos en el mismo libro donde se genera la cotización.',
    status: 'approved',
    likes: 114
  },
  {
    id: 'seed-5',
    createdAt: Date.now() - 1000 * 60 * 60 * 2,
    title: 'Mi primer pitch con inversionistas duró 3 minutos por culpa del micrófono',
    category: 'Emprendimiento',
    author: {
      isAnonymous: false,
      name: 'Mariana Cordero',
      linkedin: 'linkedin.com/in/mariana-cordero',
      instagram: '@marianastartup'
    },
    mediaType: 'video',
    content: 'Subí a tarima, el micrófono hizo un feedback ensordecedor que asustó al jurado, me puse tan nerviosa que olvidé el nombre de mi propia empresa y dije "Bueno, gracias por su tiempo" y me bajé corriendo.',
    learnings: 'Aprender a respirar, reírse del error en vivo y que el jurado también es humano.',
    status: 'approved',
    likes: 135
  }
];


const TOKEN_KEY = 'fun_admin_token';
const OFFLINE_USER = 'funcr';
const OFFLINE_PASS = 'funcr123';

/**
 * Almacenamiento híbrido:
 *  - Modo servidor (producción / Namecheap): usa la API Node + SQLite (/api/...).
 *  - Modo local (si no hay servidor, ej. abrir solo Vite): usa IndexedDB del navegador.
 */
class StorageManager {
  private db: IDBDatabase | null = null;
  private dbReady: Promise<IDBDatabase> | null = null;
  private apiReady: Promise<boolean>;

  constructor() {
    this.apiReady = this.detectApi();
  }

  // ---------- Detección del servidor ----------
  private async detectApi(): Promise<boolean> {
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      if (!res.ok) return false;
      const data = await res.json();
      if (!data || data.ok !== true) return false;
      await this.syncConfig();
      return true;
    } catch {
      return false;
    }
  }

  /** Espera a que se determine el modo de almacenamiento. Devuelve true si hay servidor. */
  async init(): Promise<boolean> {
    return this.apiReady;
  }

  private async syncConfig(): Promise<void> {
    try {
      const res = await fetch('/api/config', { cache: 'no-store' });
      if (res.ok) localStorage.setItem(CONFIG_KEY, JSON.stringify(await res.json()));
    } catch { /* se usa la copia local */ }
  }

  private async api<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = { ...(init.headers as Record<string, string> || {}) };
    if (init.body) headers['Content-Type'] = 'application/json; charset=utf-8';
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const res = await fetch(path, { ...init, headers });
    if (res.status === 401) localStorage.removeItem(TOKEN_KEY);
    if (!res.ok) {
      let msg = 'Error ' + res.status;
      try { msg = (await res.json()).error || msg; } catch { /* sin cuerpo */ }
      throw new Error(msg);
    }
    return res.json();
  }

  // ---------- IndexedDB (modo local) ----------
  private idb(): Promise<IDBDatabase> {
    if (!this.dbReady) this.dbReady = this.initDB();
    return this.dbReady;
  }

  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_STORIES)) {
          const store = db.createObjectStore(STORE_STORIES, { keyPath: 'id' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };

      request.onsuccess = async () => {
        this.db = request.result;
        await this.checkSeedData();
        resolve(this.db);
      };

      request.onerror = () => {
        console.error('Error abriendo IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }

  private async checkSeedData(): Promise<void> {
    const stories = await this.localGetAll();
    if (stories.length === 0) {
      for (const s of SEED_STORIES) {
        await this.localSave(s);
      }
    }
  }

  private async localGetAll(): Promise<Story[]> {
    if (!this.db) await new Promise(r => setTimeout(r, 0));
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve([]);
      const req = this.db.transaction(STORE_STORIES, 'readonly').objectStore(STORE_STORIES).getAll();
      req.onsuccess = () => {
        const list: Story[] = req.result || [];
        list.sort((a, b) => b.createdAt - a.createdAt);
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  }

  private async localSave(story: Story): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not initialized'));
      const req = this.db.transaction(STORE_STORIES, 'readwrite').objectStore(STORE_STORIES).put(story);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  // ---------- Historias ----------
  async getAllStories(): Promise<Story[]> {
    if (await this.apiReady) return this.api<Story[]>('/api/stories');
    await this.idb();
    return this.localGetAll();
  }

  async getApprovedStories(): Promise<Story[]> {
    const all = await this.getAllStories();
    return all.filter(s => s.status === 'approved');
  }

  /** Guarda una historia: POST si es nueva, PUT si se está editando una existente. */
  async saveStory(story: Story, isEdit = false): Promise<Story> {
    if (await this.apiReady) {
      if (isEdit) {
        return this.api<Story>('/api/stories/' + encodeURIComponent(story.id), {
          method: 'PUT',
          body: JSON.stringify(story)
        });
      }
      return this.api<Story>('/api/stories', {
        method: 'POST',
        body: JSON.stringify(story)
      });
    }
    await this.idb();
    await this.localSave(story);
    return story;
  }

  /** Actualiza una historia existente. */
  async updateStory(story: Story): Promise<Story> {
    return this.saveStory(story, true);
  }

  async deleteStory(id: string): Promise<void> {
    if (await this.apiReady) {
      await this.api('/api/stories/' + encodeURIComponent(id), { method: 'DELETE' });
      return;
    }
    await this.idb();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not initialized'));
      const req = this.db.transaction(STORE_STORIES, 'readwrite').objectStore(STORE_STORIES).delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async resetSeedData(): Promise<void> {
    if (await this.apiReady) {
      await this.api('/api/admin/reset', { method: 'POST' });
      return;
    }
    await this.idb();
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('DB not initialized'));
      const clearReq = this.db.transaction(STORE_STORIES, 'readwrite').objectStore(STORE_STORIES).clear();
      clearReq.onsuccess = async () => {
        for (const s of SEED_STORIES) await this.localSave(s);
        resolve();
      };
      clearReq.onerror = () => reject(clearReq.error);
    });
  }

  // ---------- Configuración de la pizarra ----------
  getConfig(): BoardConfig {
    try {
      const data = localStorage.getItem(CONFIG_KEY);
      if (!data) return { ...DEFAULT_CONFIG };
      return { ...DEFAULT_CONFIG, ...JSON.parse(data) };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  saveConfig(config: BoardConfig): void {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    // Solo el administrador puede persistir la configuración en el servidor.
    this.apiReady.then(ok => {
      if (ok && this.isAdminLoggedIn()) {
        this.api('/api/config', { method: 'PUT', body: JSON.stringify(config) }).catch(() => {});
      }
    });
  }

  // ---------- Sesión de administrador ----------
  isAdminLoggedIn(): boolean {
    return !!localStorage.getItem(TOKEN_KEY) || localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
  }

  async adminLogin(user: string, pass: string): Promise<boolean> {
    if (await this.apiReady) {
      try {
        const res = await this.api<{ token: string }>('/api/login', {
          method: 'POST',
          body: JSON.stringify({ user, pass })
        });
        localStorage.setItem(TOKEN_KEY, res.token);
        return true;
      } catch {
        return false;
      }
    }
    // Modo local (sin servidor): solo para desarrollo.
    if (user.trim() === OFFLINE_USER && pass.trim() === OFFLINE_PASS) {
      localStorage.setItem(ADMIN_SESSION_KEY, 'true');
      return true;
    }
    return false;
  }

  adminLogout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ADMIN_SESSION_KEY);
  }
}

export const storage = new StorageManager();
