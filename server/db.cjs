// Base de datos SQLite universal para FuN Costa Rica:
// 1. En Vercel / Cloud: usa Turso (libSQL) remoto cuando TURSO_DATABASE_URL está configurado.
//    Permite que múltiples usuarios compartan la misma base de datos en tiempo real.
// 2. En local / hosting tradicional: usa sql.js (WebAssembly SQLite) guardando en data/fun.db.

const fs = require('fs');
const path = require('path');
const { seedStories, DEFAULT_CONFIG } = require('./seed.cjs');

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'fun.db');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

let isTurso = false;
let tursoClient = null;
let localDb = null;

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
  if (isTurso || !localDb) return;
  try {
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, Buffer.from(localDb.export()));
    fs.renameSync(tmp, DB_FILE);
  } catch (err) {
    console.warn('Error al persistir archivo local fun.db:', err.message);
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

async function open() {
  if (TURSO_URL) {
    try {
      const { createClient } = require('@libsql/client');
      tursoClient = createClient({
        url: TURSO_URL,
        authToken: TURSO_TOKEN
      });
      isTurso = true;
      console.log('🔗 Conectado a base de datos SQLite en la nube (Turso / libSQL)');

      for (const sql of SCHEMA_STMTS) {
        await tursoClient.execute(sql);
      }

      const countRes = await tursoClient.execute('SELECT COUNT(*) AS n FROM stories');
      const count = Number(countRes.rows[0]?.n || 0);
      if (count === 0) {
        console.log('🌱 Inicializando historias semilla en Turso...');
        for (const s of seedStories()) {
          await saveStory(s);
        }
      }

      // Migración para seed-5
      const s5Res = await tursoClient.execute({ sql: "SELECT data FROM stories WHERE id = 'seed-5'", args: [] });
      if (s5Res.rows.length > 0) {
        const st = JSON.parse(s5Res.rows[0].data);
        if (st.mediaType === 'video' && !st.videoUrl) {
          st.videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
          await saveStory(st);
        }
      }

      return tursoClient;
    } catch (err) {
      console.error('❌ Error conectando a Turso, recurriendo a SQLite local:', err.message);
      isTurso = false;
      tursoClient = null;
    }
  }

  // Modo local offline con sql.js
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

  // Migración local para seed-5
  const s5 = rows("SELECT data FROM stories WHERE id = 'seed-5'")[0];
  if (s5) {
    const st = JSON.parse(s5.data);
    if (st.mediaType === 'video' && !st.videoUrl) {
      st.videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
      upsertStoryLocal(st);
    }
  }

  persist();
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
  if (isTurso && tursoClient) {
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
  if (isTurso && tursoClient) {
    const res = await tursoClient.execute('SELECT data FROM stories ORDER BY created_at DESC');
    return res.rows.map(r => JSON.parse(String(r.data)));
  }
  return rows('SELECT data FROM stories ORDER BY created_at DESC').map(r => JSON.parse(r.data));
}

async function getStory(id) {
  if (isTurso && tursoClient) {
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
  if (isTurso && tursoClient) {
    await tursoClient.execute({
      sql: 'DELETE FROM stories WHERE id = ?',
      args: [id]
    });
    return;
  }
  if (!localDb) return;
  localDb.run('DELETE FROM stories WHERE id = ?', [id]);
  persist();
}

async function resetStories() {
  if (isTurso && tursoClient) {
    await tursoClient.execute('DELETE FROM stories');
    for (const s of seedStories()) {
      await saveStory(s);
    }
    return;
  }
  if (!localDb) return;
  localDb.run('DELETE FROM stories');
  seedStories().forEach(upsertStoryLocal);
  persist();
}

async function getConfig() {
  if (isTurso && tursoClient) {
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
  if (isTurso && tursoClient) {
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

module.exports = {
  DATA_DIR, DB_FILE, UPLOADS_DIR,
  open, saveStory, getAllStories, getStory, deleteStory, resetStories, getConfig, saveConfig
};
