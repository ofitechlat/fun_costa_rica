import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createApp } = require('../server/index.cjs');
const db = require('../server/db.cjs');

let appInstance = null;

async function getApp() {
  if (!appInstance) {
    try {
      await db.open();
    } catch (err) {
      console.error('Error inicializando base de datos en Vercel:', err);
    }
    appInstance = createApp();
  }
  return appInstance;
}

export default async function handler(req, res) {
  try {
    const app = await getApp();
    return app(req, res);
  } catch (err) {
    console.error('Error en Serverless Function Vercel /api:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
