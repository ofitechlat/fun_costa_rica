// Prepara la carpeta "deploy/" lista para subir a Namecheap (cPanel > Setup Node.js App).
// Uso: npm run build && npm run package
// Resultado: deploy/ + deploy.zip con app.cjs, server/, dist/, package.json (solo producción).
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'deploy');

if (!fs.existsSync(path.join(root, 'dist', 'index.html'))) {
  console.error('Falta dist/. Ejecuta primero: npm run build');
  process.exit(1);
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

fs.cpSync(path.join(root, 'dist'), path.join(out, 'dist'), { recursive: true });
fs.cpSync(path.join(root, 'server'), path.join(out, 'server'), { recursive: true });
fs.copyFileSync(path.join(root, 'app.cjs'), path.join(out, 'app.cjs'));
fs.copyFileSync(path.join(root, 'INSTALL-NAMECHEAP.md'), path.join(out, 'INSTALL-NAMECHEAP.md'));

// package.json mínimo de producción (sin Vite/TypeScript).
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const prod = {
  name: pkg.name,
  version: pkg.version,
  private: true,
  main: 'app.cjs',
  engines: pkg.engines,
  scripts: { start: 'node app.cjs', setup: 'node server/setup.cjs' },
  dependencies: { express: pkg.dependencies.express, 'sql.js': pkg.dependencies['sql.js'] }
};
fs.writeFileSync(path.join(out, 'package.json'), JSON.stringify(prod, null, 2) + '\n');

console.log('Carpeta lista: ' + out);
console.log('Comprímela (contenido de deploy/) y súbela a Namecheap. Ver INSTALL-NAMECHEAP.md');
