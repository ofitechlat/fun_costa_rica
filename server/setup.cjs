// Instalación de la base de datos: crea data/fun.db con sus tablas y datos de ejemplo.
// Uso: npm run setup   (también se ejecuta solo al iniciar el servidor si no existe)
const db = require('./db.cjs');

db.open()
  .then(() => {
    console.log('Base de datos lista en: ' + db.DB_FILE);
    console.log('Historias cargadas: ' + db.getAllStories().length);
  })
  .catch((err) => {
    console.error('Error instalando la base de datos:', err);
    process.exit(1);
  });
