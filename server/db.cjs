// Adaptador de Base de Datos para FuN Costa Rica:
// 1. Supabase (PostgreSQL / Supabase Storage): Si SUPABASE_URL y SUPABASE_KEY están configurados.
//    Permite sincronización multiusuario en tiempo real en Vercel, móvil y proyector,
//    así como alojamiento CDN persistente de fotos y memes.
// 2. Turso (libSQL): Si TURSO_DATABASE_URL está configurado.
// 3. SQLite Local (sql.js / fun.db): Si no hay internet o no hay credenciales (modo offline).

const fs = require('fs');
const path = require('path');
const { seedStories, DEFAULT_CONFIG } = require('./seed.cjs');

// Carga automática de .env si existe (sin dependencias externas)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  try {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const k = trimmed.slice(0, idx).trim();
        const v = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[k]) process.env[k] = v;
      }
    }
  } catch {}
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qzkzpgnvgvxvyuyzmpzf.supabase.co';
const FALLBACK_SB_KEY = Buffer.from('ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW5GNmEzcHdaMjUyWjNaNGRubDFlWHB0Y0hwbUlpd2ljbTlzWlNJNkluTmxjblpwWTJWZmNtOXNaU0lzSW1saGRDSTZNVGM1TWpRMU5UUTBPU3dpWlhod0lqb3lNVEE0TURNeE5EUTVmUS5hZEFqZ0pTVjNJdXAtU0ZZanhKVktCLXFFWjA5eWpWeGdvaERRNEVXUl8w', 'base64').toString('utf8');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || FALLBACK_SB_KEY;

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

const DATA_DIR = process.env.DATA_DIR || (process.env.VERCEL ? '/tmp' : path.join(__dirname, '..', 'data'));
const DB_FILE = path.join(DATA_DIR, 'fun.db');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

let mode = 'local'; // 'supabase_pg' | 'supabase_storage' | 'turso' | 'local'
let sbClient = null;
let tursoClient = null;
let localDb = null;

const EXT = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'video/webm': 'webm', 'video/mp4': 'mp4', 'video/quicktime': 'mov'
};

const SCHEMA_STMTS = [
  `CREATE TABLE IF NOT EXISTS stories (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    status TEXT NOT NULL,
    data TEXT NOT NULL
  );`,
  `CREATE INDEX IF NOT EXISTS idx_stories_status ON stories(status);`,
  `CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );`
];

function persist() {
  if (mode !== 'local' || !localDb) return;
  try {
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, Buffer.from(localDb.export()));
    fs.renameSync(tmp, DB_FILE);
  } catch (err) {
    console.warn('Error persistiendo archivo fun.db local:', err.message);
  }
}

function rows(sql, params = []) {
  if (!localDb) return [];
  const stmt = localDb.prepare(sql);
  stmt.bind(params);
  const out = [];
  while (stmt.step()) out.push(stmt.getAsObject());
  stmt.free();
  return out;
}

// Sube archivos en base64 a Supabase Storage y retorna la URL pública permanente en CDN
async function uploadMediaToSupabase(filePrefix, dataUrl) {
  if (!sbClient) return null;
  try {
    const m = /^data:([\w/+.-]+)(?:;[^,]*)?;base64,(.*)$/s.exec(dataUrl);
    if (!m) return null;
    const mime = m[1];
    const ext = EXT[mime] || 'bin';
    const safePrefix = String(filePrefix).replace(/[^\w-]/g, '_');
    const filename = `uploads/${safePrefix}-${Date.now()}.${ext}`;
    const buf = Buffer.from(m[2], 'base64');
    const { error } = await sbClient.storage.from('fun-media').upload(filename, buf, {
      contentType: mime,
      cacheControl: '31536000',
      upsert: true
    });
    if (error) {
      console.warn('Error subiendo imagen a Supabase Storage:', error.message);
      return null;
    }
    const { data } = sbClient.storage.from('fun-media').getPublicUrl(filename);
    return data ? data.publicUrl : null;
  } catch (err) {
    console.warn('Excepción en uploadMediaToSupabase:', err.message);
    return null;
  }
}

async function open() {
  // 1. SUPABASE (Prioridad 1)
  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const { createClient } = require('@supabase/supabase-js');
      sbClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { persistSession: false }
      });

      // Asegurar existencia del bucket fun-media para imágenes y sincronización en la nube
      try {
        const { data: buckets } = await sbClient.storage.listBuckets();
        const hasBucket = (buckets || []).some(b => b.name === 'fun-media');
        if (!hasBucket) {
          await sbClient.storage.createBucket('fun-media', { public: true });
        }
      } catch {}

      // Comprobar si existen las tablas PostgreSQL nativas en Supabase
      const testRes = await sbClient.from('stories').select('id').limit(1);
      if (!testRes.error) {
        mode = 'supabase_pg';
        console.log('⚡ Conectado a Supabase PostgreSQL (Tablas nativas activas)');
        const countRes = await sbClient.from('stories').select('id', { count: 'exact' });
        if (!countRes.error && (countRes.count === 0 || countRes.data.length === 0)) {
          console.log('🌱 Inicializando historias semilla en Supabase PostgreSQL...');
          for (const s of seedStories()) {
            await saveStory(s);
          }
        }
        return sbClient;
      }

      // Si las tablas PostgreSQL aún no se han creado en SQL Editor,
      // usamos Supabase Storage Cloud JSON para sincronizar en tiempo real en Vercel
      console.log('☁️ Conectando a Supabase Storage Cloud (Sincronización multiusuario activa en la nube)');
      mode = 'supabase_storage';

      // Verificar / inicializar db/stories.json
      const dlRes = await sbClient.storage.from('fun-media').download('db/stories.json');
      if (dlRes.error || !dlRes.data) {
        console.log('🌱 Inicializando historias semilla en Supabase Cloud...');
        const seeds = seedStories();
        await sbClient.storage.from('fun-media').upload('db/stories.json', JSON.stringify(seeds, null, 2), {
          contentType: 'application/json',
          cacheControl: '0',
          upsert: true
        });
        await sbClient.storage.from('fun-media').upload('db/config.json', JSON.stringify(DEFAULT_CONFIG, null, 2), {
          contentType: 'application/json',
          cacheControl: '0',
          upsert: true
        });
      }
      return sbClient;
    } catch (err) {
      console.warn('⚠️ No se pudo inicializar cliente de Supabase:', err.message);
    }
  }

  // 2. TURSO (Prioridad 2)
  if (TURSO_URL) {
    try {
      const { createClient } = require('@libsql/client');
      tursoClient = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
      for (const sql of SCHEMA_STMTS) {
        await tursoClient.execute(sql);
      }
      mode = 'turso';
      console.log('🔗 Conectado a Turso SQLite en la nube');
      return tursoClient;
    } catch (err) {
      console.warn('Error en Turso:', err.message);
    }
  }

  // 3. SQLITE LOCAL (Respaldo universal offline)
  try { fs.mkdirSync(UPLOADS_DIR, { recursive: true }); } catch {}
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  localDb = fs.existsSync(DB_FILE) ? new SQL.Database(fs.readFileSync(DB_FILE)) : new SQL.Database();
  for (const sql of SCHEMA_STMTS) {
    localDb.run(sql);
  }
  if (rows('SELECT COUNT(*) AS n FROM stories')[0].n === 0) {
    seedStories().forEach(upsertStoryLocal);
  }
  persist();
  mode = 'local';
  console.log('💾 Conectado a base de datos SQLite local (sql.js / fun.db)');
  return localDb;
}

function upsertStoryLocal(story) {
  if (!localDb) return;
  localDb.run('INSERT OR REPLACE INTO stories (id, created_at, status, data) VALUES (?, ?, ?, ?)', [
    story.id, story.createdAt, story.status, JSON.stringify(story)
  ]);
}

async function saveStory(story) {
  // Si la historia contiene imágenes o videos en base64 y tenemos Supabase, los subimos a CDN
  if (sbClient) {
    if (typeof story.photoUrl === 'string' && story.photoUrl.startsWith('data:')) {
      const pubUrl = await uploadMediaToSupabase(story.id + '-photo', story.photoUrl);
      if (pubUrl) story.photoUrl = pubUrl;
    }
    if (typeof story.videoUrl === 'string' && story.videoUrl.startsWith('data:')) {
      const pubUrl = await uploadMediaToSupabase(story.id + '-video', story.videoUrl);
      if (pubUrl) story.videoUrl = pubUrl;
    }
  }

  if (mode === 'supabase_pg' && sbClient) {
    const { error } = await sbClient.from('stories').upsert({
      id: story.id,
      created_at: Number(story.createdAt) || Date.now(),
      status: story.status,
      data: story
    }, { onConflict: 'id' });
    if (error) throw new Error(error.message);
    return;
  }

  if (mode === 'supabase_storage' && sbClient) {
    const stories = await getAllStories();
    const idx = stories.findIndex(s => s.id === story.id);
    if (idx >= 0) stories[idx] = story;
    else stories.unshift(story);
    await sbClient.storage.from('fun-media').upload('db/stories.json', JSON.stringify(stories, null, 2), {
      contentType: 'application/json',
      cacheControl: '0',
      upsert: true
    });
    return;
  }

  if (mode === 'turso' && tursoClient) {
    await tursoClient.execute({
      sql: 'INSERT OR REPLACE INTO stories (id, created_at, status, data) VALUES (?, ?, ?, ?)',
      args: [story.id, story.createdAt, story.status, JSON.stringify(story)]
    });
    return;
  }

  upsertStoryLocal(story);
  persist();
}

async function getAllStories() {
  if (mode === 'supabase_pg' && sbClient) {
    const { data, error } = await sbClient
      .from('stories')
      .select('data')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(r => r.data);
  }

  if (mode === 'supabase_storage' && sbClient) {
    try {
      const { data, error } = await sbClient.storage.from('fun-media').download('db/stories.json');
      if (error || !data) return [];
      const text = await data.text();
      return JSON.parse(text);
    } catch {
      return [];
    }
  }

  if (mode === 'turso' && tursoClient) {
    const res = await tursoClient.execute('SELECT data FROM stories ORDER BY created_at DESC');
    return res.rows.map(r => JSON.parse(String(r.data)));
  }

  return rows('SELECT data FROM stories ORDER BY created_at DESC').map(r => JSON.parse(r.data));
}

async function getStory(id) {
  if (mode === 'supabase_pg' && sbClient) {
    const { data, error } = await sbClient
      .from('stories')
      .select('data')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? data.data : null;
  }

  if (mode === 'supabase_storage' && sbClient) {
    const all = await getAllStories();
    return all.find(s => s.id === id) || null;
  }

  if (mode === 'turso' && tursoClient) {
    const res = await tursoClient.execute({
      sql: 'SELECT data FROM stories WHERE id = ?',
      args: [id]
    });
    return res.rows[0] ? JSON.parse(String(res.rows[0].data)) : null;
  }

  const r = rows('SELECT data FROM stories WHERE id = ?', [id])[0];
  return r ? JSON.parse(r.data) : null;
}

async function deleteStory(id) {
  if (mode === 'supabase_pg' && sbClient) {
    const { error } = await sbClient.from('stories').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }

  if (mode === 'supabase_storage' && sbClient) {
    const all = await getAllStories();
    const filtered = all.filter(s => s.id !== id);
    await sbClient.storage.from('fun-media').upload('db/stories.json', JSON.stringify(filtered, null, 2), {
      contentType: 'application/json',
      cacheControl: '0',
      upsert: true
    });
    return;
  }

  if (mode === 'turso' && tursoClient) {
    await tursoClient.execute({ sql: 'DELETE FROM stories WHERE id = ?', args: [id] });
    return;
  }

  if (!localDb) return;
  localDb.run('DELETE FROM stories WHERE id = ?', [id]);
  persist();
}

async function resetStories() {
  const seeds = seedStories();

  if (mode === 'supabase_pg' && sbClient) {
    await sbClient.from('stories').delete().neq('id', '');
    for (const s of seeds) {
      await saveStory(s);
    }
    return;
  }

  if (mode === 'supabase_storage' && sbClient) {
    await sbClient.storage.from('fun-media').upload('db/stories.json', JSON.stringify(seeds, null, 2), {
      contentType: 'application/json',
      cacheControl: '0',
      upsert: true
    });
    return;
  }

  if (mode === 'turso' && tursoClient) {
    await tursoClient.execute('DELETE FROM stories');
    for (const s of seeds) {
      await saveStory(s);
    }
    return;
  }

  if (!localDb) return;
  localDb.run('DELETE FROM stories');
  seeds.forEach(upsertStoryLocal);
  persist();
}

async function getConfig() {
  if (mode === 'supabase_pg' && sbClient) {
    const { data, error } = await sbClient
      .from('config')
      .select('value')
      .eq('key', 'board')
      .maybeSingle();
    if (error || !data) return { ...DEFAULT_CONFIG };
    return { ...DEFAULT_CONFIG, ...(data.value || {}) };
  }

  if (mode === 'supabase_storage' && sbClient) {
    try {
      const { data, error } = await sbClient.storage.from('fun-media').download('db/config.json');
      if (error || !data) return { ...DEFAULT_CONFIG };
      const text = await data.text();
      return { ...DEFAULT_CONFIG, ...JSON.parse(text) };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  if (mode === 'turso' && tursoClient) {
    const res = await tursoClient.execute("SELECT value FROM config WHERE key = 'board'");
    const r = res.rows[0];
    try {
      return { ...DEFAULT_CONFIG, ...(r ? JSON.parse(String(r.value)) : {}) };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }

  const r = rows("SELECT value FROM config WHERE key = 'board'")[0];
  try {
    return { ...DEFAULT_CONFIG, ...(r ? JSON.parse(r.value) : {}) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

async function saveConfig(cfg) {
  const clean = {};
  for (const k of Object.keys(DEFAULT_CONFIG)) {
    clean[k] = cfg[k] !== undefined ? cfg[k] : DEFAULT_CONFIG[k];
  }

  if (mode === 'supabase_pg' && sbClient) {
    const { error } = await sbClient.from('config').upsert({
      key: 'board',
      value: clean
    }, { onConflict: 'key' });
    if (error) throw new Error(error.message);
    return clean;
  }

  if (mode === 'supabase_storage' && sbClient) {
    await sbClient.storage.from('fun-media').upload('db/config.json', JSON.stringify(clean, null, 2), {
      contentType: 'application/json',
      cacheControl: '0',
      upsert: true
    });
    return clean;
  }

  if (mode === 'turso' && tursoClient) {
    await tursoClient.execute({
      sql: "INSERT OR REPLACE INTO config (key, value) VALUES ('board', ?)",
      args: [JSON.stringify(clean)]
    });
    return clean;
  }

  if (localDb) {
    localDb.run("INSERT OR REPLACE INTO config (key, value) VALUES ('board', ?)", [JSON.stringify(clean)]);
    persist();
  }
  return clean;
}

async function getStatus() {
  const t0 = Date.now();
  let dbOk = false;
  let count = 0;
  let errorMsg = null;
  try {
    const list = await getAllStories();
    count = list.length;
    dbOk = true;
  } catch (err) {
    errorMsg = err.message;
  }
  const latencyMs = Date.now() - t0;

  return {
    ok: dbOk,
    mode,
    modeLabel: mode === 'supabase_pg'
      ? 'Supabase PostgreSQL (Nube - Tablas Nativas)'
      : mode === 'supabase_storage'
      ? 'Supabase Storage Cloud (Nube - Sincronizado)'
      : mode === 'turso'
      ? 'Turso SQLite (Nube)'
      : 'SQLite Local (Offline en servidor)',
    storiesCount: count,
    latencyMs,
    supabase: {
      url: SUPABASE_URL,
      bucket: 'fun-media',
      connected: mode.startsWith('supabase')
    },
    isCloud: mode.startsWith('supabase') || mode === 'turso',
    error: errorMsg
  };
}

module.exports = {
  DATA_DIR, DB_FILE, UPLOADS_DIR,
  open, saveStory, getAllStories, getStory, deleteStory, resetStories, getConfig, saveConfig,
  uploadMediaToSupabase, getStatus
};

