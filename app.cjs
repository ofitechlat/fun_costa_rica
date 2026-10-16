// Archivo de arranque (Namecheap "Application startup file": app.cjs)
require('./server/index.cjs').start().catch((err) => {
  console.error('No se pudo iniciar la aplicación:', err);
  process.exit(1);
});
