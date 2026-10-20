// Servidor Node.js de FuN Costa Rica: API + archivos estáticos (dist).
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('./db.cjs');

const ADMIN_USER = process.env.ADMIN_USER || 'funcr';
const ADMIN_PASS = process.env.ADMIN_PASS || 'funcr123';
const SECRET = process.env.SESSION_SECRET || crypto.createHash('sha256').update('fun-cr|' + ADMIN_PASS).digest('hex');
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const DIST_DIR = path.join(__dirname, '..', 'dist');

const sign = (v) => crypto.createHmac('sha256', SECRET).update(v).digest('hex');

function makeToken() {
  const exp = String(Date.now() + TOKEN_TTL_MS);
  return exp + '.' + sign(exp);
}

function isAdmin(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  const [exp, sig] = token.split('.');
  if (!exp || !sig) return false;
  const expected = sign(exp);
  if (sig.length !== expected.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  return Number(exp) > Date.now();
}

function requireAdmin(req, res, next) {
  if (isAdmin(req)) return next();
  res.status(401).json({ error: 'No autorizado' });
}

const EXT = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'video/webm': 'webm', 'video/mp4': 'mp4', 'video/quicktime': 'mov'
};

// Convierte data URLs (imágenes/videos en base64) en archivos dentro de data/uploads (en servidores locales/Namecheap).
// En Vercel serverless, se conserva en la base de datos Turso para que todos los usuarios tengan acceso sin depender de disco local.
function externalizeMedia(story, field) {
  const value = story[field];
  if (process.env.VERCEL || process.env.SUPABASE_URL || process.env.SUPABASE_KEY) return;
  try {
    const m = /^data:([\w/+.-]+)(?:;[^,]*)?;base64,(.*)$/s.exec(value);
    if (!m) { delete story[field]; return; }
    const ext = EXT[m[1]] || 'bin';
    const safeId = String(story.id).replace(/[^\w-]/g, '_');
    const file = `${safeId}-${field}-${Date.now()}.${ext}`;
    fs.writeFileSync(path.join(db.UPLOADS_DIR, file), Buffer.from(m[2], 'base64'));
    story[field] = '/uploads/' + file;
  } catch (err) {
    console.warn('No se pudo escribir archivo en disco, se mantiene en base de datos:', err.message);
  }
}

function removeUploads(story) {
  if (process.env.VERCEL) return;
  for (const f of [story && story.photoUrl, story && story.videoUrl]) {
    if (typeof f === 'string' && f.startsWith('/uploads/')) {
      const p = path.join(db.UPLOADS_DIR, path.basename(f));
      fs.rm(p, { force: true }, () => {});
    }
  }
}

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : undefined);

function sanitizeStory(body, admin, existing, autoApprove = true) {
  const author = body.author || {};
  const story = {
    id: existing ? existing.id : (admin && typeof body.id === 'string' && body.id ? body.id : 'story-' + Date.now() + '-' + crypto.randomBytes(3).toString('hex')),
    createdAt: existing ? existing.createdAt : (admin && Number(body.createdAt)) || Date.now(),
    title: str(body.title, 300) || 'Sin título',
    category: str(body.category, 80) || 'General',
    author: {
      isAnonymous: author.isAnonymous !== false,
      name: str(author.name, 120),
      linkedin: str(author.linkedin, 200),
      instagram: str(author.instagram, 120),
      website: str(author.website, 200)
    },
    mediaType: ['text', 'video', 'photo'].includes(body.mediaType) ? body.mediaType : 'text',
    content: str(body.content, 5000) || '',
    learnings: str(body.learnings, 1000) || undefined,
    photoUrl: typeof body.photoUrl === 'string' ? body.photoUrl : undefined,
    videoUrl: typeof body.videoUrl === 'string' ? body.videoUrl : undefined,
    videoDuration: Number(body.videoDuration) || undefined,
    status: 'pending',
    likes: 1,
    featured: false
  };
  if (admin) {
    story.status = ['approved', 'pending', 'rejected'].includes(body.status) ? body.status : 'approved';
    story.likes = Number.isFinite(Number(body.likes)) ? Number(body.likes) : 1;
    story.featured = !!body.featured;
  } else {
    story.status = existing ? existing.status : (autoApprove ? 'approved' : 'pending');
    story.likes = existing ? existing.likes : 1;
    story.featured = existing ? existing.featured : false;
  }
  externalizeMedia(story, 'photoUrl');
  externalizeMedia(story, 'videoUrl');
  return story;
}

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '80mb' }));

  const router = express.Router();

  router.get('/health', (_req, res) => res.json({ ok: true, app: 'fun-costa-rica' }));

  router.get('/status', async (_req, res) => {
    try {
      const status = await db.getStatus();
      res.json(status);
    } catch (e) {
      res.status(500).json({ ok: false, error: e.message });
    }
  });

  router.post('/login', (req, res) => {
    const { user, pass } = req.body || {};
    if (String(user || '').trim() === ADMIN_USER && String(pass || '').trim() === ADMIN_PASS) {
      return res.json({ token: makeToken() });
    }
    res.status(401).json({ error: 'Credenciales incorrectas' });
  });

  router.get('/config', async (_req, res) => {
    try {
      res.json(await db.getConfig());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.put('/config', requireAdmin, async (req, res) => {
    try {
      res.json(await db.saveConfig(req.body || {}));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/stories', async (req, res) => {
    try {
      const all = await db.getAllStories();
      res.json(isAdmin(req) ? all : all.filter(s => s.status === 'approved'));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/stories', async (req, res) => {
    try {
      const cfg = await db.getConfig();
      const story = sanitizeStory(req.body || {}, isAdmin(req), undefined, cfg.autoApprove);
      await db.saveStory(story);
      res.status(201).json(story);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.put('/stories/:id', async (req, res) => {
    try {
      const existing = await db.getStory(req.params.id);
      const cfg = await db.getConfig();
      const admin = isAdmin(req);
      const story = sanitizeStory({ ...(req.body || {}), id: req.params.id }, admin, existing || undefined, cfg.autoApprove);
      if (!existing) story.id = req.params.id;
      await db.saveStory(story);
      res.json(story);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.delete('/stories/:id', requireAdmin, async (req, res) => {
    try {
      const existing = await db.getStory(req.params.id);
      removeUploads(existing);
      await db.deleteStory(req.params.id);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  router.post('/admin/reset', requireAdmin, async (_req, res) => {
    try {
      const all = await db.getAllStories();
      all.forEach(removeUploads);
      await db.resetStories();
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // Montado tanto en /api como en raíz para compatibilidad universal con Vercel rewrites y dev local
  app.use('/api', router);
  app.use('/', router);

  app.use('/uploads', express.static(db.UPLOADS_DIR, { maxAge: '7d' }));

  if (fs.existsSync(DIST_DIR)) {
    app.use(express.static(DIST_DIR));
    app.get('*', (_req, res) => res.sendFile(path.join(DIST_DIR, 'index.html')));
  } else {
    app.get('/', (_req, res) => res.status(503).send('Falta la carpeta dist. Ejecuta: npm run build'));
  }

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(err.status || 500).json({ error: err.message || 'Error interno' });
  });

  return app;
}

async function start() {
  await db.open();
  const app = createApp();
  const port = process.env.PORT || 8004;
  app.listen(port, () => console.log(`FuN Costa Rica escuchando en http://localhost:${port}`));
}

module.exports = { start, createApp };
