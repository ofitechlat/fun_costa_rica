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
fs.copyFileSync(path.join(root, 'server.js'), path.join(out, 'server.js'));
fs.copyFileSync(path.join(root, 'INSTALL-NAMECHEAP.md'), path.join(out, 'INSTALL-NAMECHEAP.md'));

// package.json mínimo de producción (solo dependencias de runtime: express y sql.js).
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const prod = {
  name: pkg.name,
  version: pkg.version,
  private: true,
  main: 'server.js',
  engines: pkg.engines,
  scripts: { start: 'node server.js', setup: 'node server/setup.cjs' },
  dependencies: { express: pkg.dependencies.express, 'sql.js': pkg.dependencies['sql.js'] }
};
fs.writeFileSync(path.join(out, 'package.json'), JSON.stringify(prod, null, 2) + '\n');

// Generar deploy.zip automáticamente en la raíz
const zipPath = path.join(root, 'deploy.zip');
try {
  const { execSync } = require('child_process');
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  if (process.platform === 'win32') {
    execSync(`powershell.exe -NoProfile -Command "Compress-Archive -Path '${out}\\*' -DestinationPath '${zipPath}' -Force"`);
  } else {
    execSync(`cd "${out}" && zip -r "${zipPath}" ./*`);
  }
  console.log('✅ Archivo ZIP generado con éxito: deploy.zip');
} catch (err) {
  console.warn('⚠️ No se pudo comprimir automáticamente deploy.zip:', err.message);
}

console.log('Carpeta de despliegue lista: ' + out);
console.log('Sube el archivo deploy.zip a Namecheap cPanel siguiendo INSTALL-NAMECHEAP.md');

