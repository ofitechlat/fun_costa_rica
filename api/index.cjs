// Entry point de Serverless Function para Vercel
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

module.exports = async (req, res) => {
  const app = await getApp();
  return app(req, res);
};
