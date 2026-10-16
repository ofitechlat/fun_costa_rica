// Base de datos SQLite (sql.js: SQLite compilado a WebAssembly, sin compilación nativa,
// por eso se instala sin problemas en hosting compartido como Namecheap).
const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const { seedStories, DEFAULT_CONFIG } = require('./seed.cjs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'fun.db');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

let db = null;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS stories (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    status TEXT NOT NULL,
    data TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_stories_status ON stories(status);
  CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`;

function persist() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, Buffer.from(db.export()));
  fs.renameSync(tmp, DB_FILE);
}

function rows(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const out = [];
  while (stmt.step()) out.push(stmt.getAsObject());
  stmt.free();
  return out;
}

async function open() {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const SQL = await initSqlJs();
  db = fs.existsSync(DB_FILE) ? new SQL.Database(fs.readFileSync(DB_FILE)) : new SQL.Database();
  db.run(SCHEMA);
  if (rows('SELECT COUNT(*) AS n FROM stories')[0].n === 0) {
    seedStories().forEach(upsertStory);
  }
  persist();
  return db;
}

function upsertStory(story) {
  db.run('INSERT OR REPLACE INTO stories (id, created_at, status, data) VALUES (?, ?, ?, ?)', [
    story.id, story.createdAt, story.status, JSON.stringify(story)
  ]);
}

function saveStory(story) {
  upsertStory(story);
  persist();
}

function getAllStories() {
  return rows('SELECT data FROM stories ORDER BY created_at DESC').map(r => JSON.parse(r.data));
}

function getStory(id) {
  const r = rows('SELECT data FROM stories WHERE id = ?', [id])[0];
  return r ? JSON.parse(r.data) : null;
}

function deleteStory(id) {
  db.run('DELETE FROM stories WHERE id = ?', [id]);
  persist();
}

function resetStories() {
  db.run('DELETE FROM stories');
  seedStories().forEach(upsertStory);
  persist();
}

function getConfig() {
  const r = rows("SELECT value FROM config WHERE key = 'board'")[0];
  try {
    return { ...DEFAULT_CONFIG, ...(r ? JSON.parse(r.value) : {}) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig(cfg) {
  const clean = {};
  for (const k of Object.keys(DEFAULT_CONFIG)) {
    clean[k] = cfg[k] !== undefined ? cfg[k] : DEFAULT_CONFIG[k];
  }
  db.run("INSERT OR REPLACE INTO config (key, value) VALUES ('board', ?)", [JSON.stringify(clean)]);
  persist();
  return clean;
}

module.exports = {
  DATA_DIR, DB_FILE, UPLOADS_DIR,
  open, saveStory, getAllStories, getStory, deleteStory, resetStories, getConfig, saveConfig
};
