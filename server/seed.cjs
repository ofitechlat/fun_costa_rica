// Datos iniciales (se cargan solo cuando la base de datos está vacía).
const H = 1000 * 60 * 60;

function seedStories() {
  const now = Date.now();
  return [
    {
      id: 'seed-1', createdAt: now - 18 * H,
      title: 'Borré la base de datos de producción un viernes a las 6:00 PM',
      category: 'Tecnología',
      author: { isAnonymous: false, name: 'Esteban Monge', linkedin: 'linkedin.com/in/esteban-cr', instagram: '@esteban_dev_cr', website: 'esteban.tech' },
      mediaType: 'text',
      content: 'Pensé que estaba conectado al ambiente de Staging. Tiré un DROP DATABASE sin respaldo reciente porque "sólo íbamos a limpiar pruebas". Toda la app de delivery estuvo caída 14 horas un fin de semana completo en plena quincena.',
      learnings: 'Nunca ejecutar scripts destructivos los viernes, y los permisos de admin no deberían estar en el mismo perfil de desarrollo.',
      status: 'approved', likes: 42
    },
    {
      id: 'seed-2', createdAt: now - 12 * H,
      title: 'Imprimí 10,000 panfletos con el QR apuntando a la competencia',
      category: 'Marketing',
      author: { isAnonymous: true },
      mediaType: 'text',
      content: 'Teníamos el lanzamiento de una nueva cafetería en San Pedro. Copié el enlace de una plantilla de Canva que tenía un QR de ejemplo hacia Starbucks. No lo probé en físico antes de mandar a litografía.',
      learnings: 'Siempre imprimir una prueba física y escanear el QR tres veces con diferentes celulares antes de autorizar el tiraje masivo.',
      status: 'approved', likes: 67
    },
    {
      id: 'seed-3', createdAt: now - 8 * H,
      title: 'Compré 400 kg de aguacates para un festival... todos verdes como piedras',
      category: 'Gastronomía & Eventos',
      author: { isAnonymous: false, name: 'Valeria Solano', instagram: '@valegastrocr', website: 'saborespuravida.cr' },
      mediaType: 'photo',
      content: 'Prometimos guacamole ilimitado en el festival gastronómico de La Sabana. El proveedor me prometió que madurarían en 2 días. Tuvimos a 8 personas metiendo aguacates en bolsas de papel con bananos y secadoras de pelo en el camerino a medianoche.',
      learnings: 'No confiar en la promesa de maduración ajena; tener siempre plan de contingencia con proveedores locales de reserva.',
      photoUrl: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=800&auto=format&fit=crop&q=80',
      status: 'approved', likes: 89
    },
    {
      id: 'seed-4', createdAt: now - 4 * H,
      title: 'Le mandé la propuesta comercial con los costos internos de mi proveedor',
      category: 'Ventas B2B',
      author: { isAnonymous: true },
      mediaType: 'text',
      content: 'En vez de adjuntar la cotización limpia en PDF, envié el Excel de cálculo donde se leía claramente: "Costo real $2,000 - Cobrarles $12,000 porque tienen presupuesto de sobra". El cliente me respondió: "Muchas gracias por la transparencia, aceptamos por $2,500".',
      learnings: 'Revisar dos veces los adjuntos y nunca calcular márgenes brutos en el mismo libro donde se genera la cotización.',
      status: 'approved', likes: 114
    },
    {
      id: 'seed-5', createdAt: now - 2 * H,
      title: 'Mi primer pitch con inversionistas duró 3 minutos por culpa del micrófono',
      category: 'Emprendimiento',
      author: { isAnonymous: false, name: 'Mariana Cordero', linkedin: 'linkedin.com/in/mariana-cordero', instagram: '@marianastartup' },
      mediaType: 'video',
      content: 'Subí a tarima, el micrófono hizo un feedback ensordecedor que asustó al jurado, me puse tan nerviosa que olvidé el nombre de mi propia empresa y dije "Bueno, gracias por su tiempo" y me bajé corriendo.',
      learnings: 'Aprender a respirar, reírse del error en vivo y que el jurado también es humano.',
      status: 'approved', likes: 135
    }
  ];
}

const DEFAULT_CONFIG = {
  minIntervalSeconds: 15,
  maxIntervalSeconds: 35,
  readingTimeSeconds: 10,
  videoAutoplay: true,
  videoMuted: false,
  swimSpeed: 'normal',
  autoApprove: true,
  ambientParticles: true,
  spotlightEnabled: true
};

module.exports = { seedStories, DEFAULT_CONFIG };
