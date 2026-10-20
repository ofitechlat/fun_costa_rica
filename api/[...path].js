import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createApp } = require('../server/index.cjs');
const db = require('../server/db.cjs');

let appInstance = null;

async function getApp() {
  if (!appInstance) {
    await db.open();
    appInstance = createApp();
  }
  return appInstance;
}

export default async function handler(req, res) {
  const app = await getApp();
  return app(req, res);
}
