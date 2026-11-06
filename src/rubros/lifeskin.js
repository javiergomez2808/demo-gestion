// Demo personalizada para LIFE SKIN CARE IRAPUATO (spa y estética).
// REAL (tomado de lifeskincareirapuato.com): nombre, logotipo, foto de portada, WhatsApp, horario,
//   tratamientos, precios y reseñas.
// DE EJEMPLO (por confirmar con la dueña): nombres del equipo y comisiones, duraciones que el sitio no dice,
//   número de sesiones y precio de los paquetes, gastos, productos, fechas y precios de los cursos,
//   y todos los clientes, citas y cifras.
// Está oculta del selector de rubros: solo se abre con el enlace ?rubro=lifeskin

const MASAJES = ['relajante', 'descontract', 'shiatsu', 'tuina', 'tailandes', 'lomi', 'piedras', 'terapeutico', 'deportivo', 'drenaje', 'ayurveda', 'miyana'];
const FACIALES = ['limpieza', 'aparatologia', 'antiaging', 'acne', 'despigmentante', 'hidratacion'];
const CORPORALES = ['reductivo', 'hifem', 'anticelulitico', 'postquirurgico'];
const LASER = ['bozo', 'axilas', 'rostro', 'bikini', 'brasileno', 'mediapierna', 'piernacompleta', 'brazos', 'espalda'];
const LASER_OTROS = ['tatuajes', 'verrugas'];
const cada = (ids, cantidad) => Object.fromEntries(ids.map((id) => [id, cantidad]));

export default {
  id: 'lifeskin',
  orden: 90,
  oculto: true,
  rubro: 'Spa / Estética',
  etiqueta: 'Demo personalizada',
  aviso: 'Demo para Life Skin Care · clientes, citas y cifras de ejemplo',

  negocio: {
    nombre: 'Life Skin Care Irapuato',
    tagline: 'Amamos cuidar tu piel',
    logo: { img: 'clientes/lifeskin/marca.webp' },
    portada: 'clientes/lifeskin/portada.webp',
    direccion: 'Irapuato, Guanajuato',
    whatsapp: '462 105 9586',
    datosReales: true,
    pie: 'Vista previa · tratamientos, precios y reseñas de tu sitio; equipo de ejemplo',
    horario: { dias: [1, 2, 3, 4, 5, 6], abre: '10:00', cierra: '20:00', porDia: { 6: { cierra: '14:00' } } },
  },

  // Colores de lifeskincareirapuato.com (café y crema) con el turquesa del logotipo
  tema: { primario: '#6B4336', acento: '#3E9AA6', fondo: '#F6EEE8' },

  vocabulario: {
    profesional: ['especialista', 'especialistas'],
    cliente: ['cliente', 'clientes'],
    cita: ['cita', 'citas'],
    servicio: ['tratamiento', 'tratamientos'],
  },

  // Un solo equipo láser: el sistema no agenda dos depilaciones a la misma hora aunque haya dos especialistas libres
  recursos: [{ id: 'soprano', nombre: 'el láser Soprano Titanium', cantidad: 1 }],

  // Precios del sitio. duracion: 45 min en masajes (del sitio); en lo demás es un estimado por confirmar.
  // desde: se muestra "Desde $…". precioTexto: se muestra ese texto y `precio` solo alimenta los números de ejemplo.
  servicios: [
    { id: 'relajante', nombre: 'Masaje relajante', categoria: 'Masajes', precio: 600, desde: true, duracion: 45, insumos: 55, demanda: 6, descripcion: 'Movimientos suaves y armoniosos para disminuir el estrés y renovar tu energía.' },
    { id: 'descontract', nombre: 'Masaje descontracturante', categoria: 'Masajes', precio: 600, desde: true, duracion: 45, insumos: 60, demanda: 5, descripcion: 'Trabajo firme en espalda, cuello y hombros para liberar nudos musculares.' },
    { id: 'shiatsu', nombre: 'Shiatsu', categoria: 'Masajes', precio: 700, desde: true, duracion: 45, insumos: 30, demanda: 1, descripcion: 'Presión manual en puntos clave para armonizar cuerpo y mente.' },
    { id: 'tuina', nombre: 'Tuina', categoria: 'Masajes', precio: 600, desde: true, duracion: 45, insumos: 35, demanda: 1, descripcion: 'Presiones, estiramientos y movilizaciones para equilibrar el Qi.' },
    { id: 'tailandes', nombre: 'Masaje tailandés', categoria: 'Masajes', precio: 600, desde: true, duracion: 45, insumos: 30, demanda: 1, descripcion: 'Estiramientos asistidos y presión profunda con un ritmo fluido.' },
    { id: 'lomi', nombre: 'Lomi Lomi Nui', categoria: 'Masajes', precio: 700, desde: true, duracion: 45, insumos: 70, demanda: 2, descripcion: 'Movimientos largos y envolventes para liberar bloqueos físicos y emocionales.' },
    { id: 'piedras', nombre: 'Ritual de piedras calientes', categoria: 'Masajes', precio: 800, desde: true, duracion: 45, insumos: 140, demanda: 2, descripcion: 'Termoterapia con masaje relajante para liberar tensión muscular.' },
    { id: 'terapeutico', nombre: 'Masaje terapéutico', categoria: 'Masajes', precio: 450, desde: true, duracion: 45, insumos: 50, demanda: 3, descripcion: 'Maniobras profundas y precisas para aliviar dolor, rigidez y limitación de movimiento.' },
    { id: 'deportivo', nombre: 'Masaje deportivo', categoria: 'Masajes', precio: 600, desde: true, duracion: 45, insumos: 60, demanda: 2, descripcion: 'Masaje profundo con técnicas complementarias para personas con alta demanda física.' },
    { id: 'drenaje', nombre: 'Drenaje linfático', categoria: 'Masajes', precio: 600, desde: true, duracion: 45, insumos: 55, demanda: 4, descripcion: 'Movimientos suaves para estimular el sistema linfático y disminuir la retención de líquidos.' },
    { id: 'ayurveda', nombre: 'Masaje Ayurveda', categoria: 'Masajes', precio: 750, desde: true, duracion: 45, insumos: 330, demanda: 1, descripcion: 'Masaje con enfoque holístico para armonizar cuerpo, mente y energía.' }, // ⚠️ el poco rentable (aceites medicados)
    { id: 'miyana', nombre: 'Masaje Miyana', categoria: 'Masajes', precio: 600, desde: true, duracion: 45, insumos: 50, demanda: 1, descripcion: 'Técnica suave para relajar, armonizar y generar una sensación de ligereza.' },

    { id: 'limpieza', nombre: 'Limpieza facial', categoria: 'Faciales', precio: 450, desde: true, duracion: 60, insumos: 90, demanda: 5, descripcion: 'Tratamiento esencial para mantener la piel sana, luminosa y libre de impurezas.' },
    { id: 'aparatologia', nombre: 'Facial con aparatología', categoria: 'Faciales', precio: 500, desde: true, duracion: 60, insumos: 110, demanda: 3, descripcion: 'Equipos especializados que potencian limpieza, hidratación y rejuvenecimiento.' },
    { id: 'antiaging', nombre: 'Facial antiaging', categoria: 'Faciales', precio: 2300, desde: true, duracion: 75, insumos: 650, demanda: 1, descripcion: 'Tratamiento diseñado para combatir signos visibles del envejecimiento.' },
    { id: 'acne', nombre: 'Tratamiento facial para acné', categoria: 'Faciales', precio: 500, desde: true, duracion: 60, insumos: 110, demanda: 3, ficha: 'acne', seguimientoDias: 21, descripcion: 'Para pieles con imperfecciones, brotes y exceso de grasa.' },
    { id: 'despigmentante', nombre: 'Facial despigmentante', categoria: 'Faciales', precio: 650, precioTexto: 'Según valoración', duracion: 60, insumos: 160, demanda: 2, descripcion: 'Reduce manchas y mejora el tono y textura de la piel.' },
    { id: 'hidratacion', nombre: 'Facial de hidratación', categoria: 'Faciales', precio: 500, desde: true, duracion: 60, insumos: 100, demanda: 3, descripcion: 'Hidratación profunda para pieles secas, deshidratadas o apagadas.' },

    { id: 'reductivo', nombre: 'Sesión reductiva', categoria: 'Corporales', precio: 450, precioTexto: 'Programa desde $3,000', duracion: 60, insumos: 60, demanda: 3, ficha: 'corporal', seguimientoDias: 4, descripcion: 'Reduce medidas, mejora la textura de la piel y favorece la eliminación de toxinas.' },
    { id: 'hifem', nombre: 'HIFEM', categoria: 'Corporales', precio: 900, precioTexto: 'Según valoración', duracion: 30, insumos: 60, demanda: 2, ficha: 'corporal', seguimientoDias: 7, descripcion: 'Tonificación, aumento de glúteo y firmeza con energía electromagnética focalizada.' },
    { id: 'anticelulitico', nombre: 'Tratamiento anticelulítico', categoria: 'Corporales', precio: 700, precioTexto: 'Según valoración', duracion: 60, insumos: 140, demanda: 2, ficha: 'corporal', seguimientoDias: 7, descripcion: 'Reduce la apariencia de la celulitis y mejora la textura de la piel.' },
    { id: 'postquirurgico', nombre: 'Sesión postquirúrgica', categoria: 'Corporales', precio: 550, precioTexto: 'Programa desde $5,000', duracion: 60, insumos: 80, demanda: 2, ficha: 'postqx', seguimientoDias: 3, descripcion: 'Acompaña tu recuperación después de una cirugía estética o médica.' },

    // Depilación láser Soprano Titanium: precio por zona y por sesión (del sitio)
    { id: 'bozo', nombre: 'Láser · Bozo', categoria: 'Depilación láser Soprano Titanium', precio: 200, duracion: 15, insumos: 15, demanda: 3, recurso: 'soprano', ficha: 'laser', seguimientoDias: 35 },
    { id: 'axilas', nombre: 'Láser · Axilas', categoria: 'Depilación láser Soprano Titanium', precio: 500, duracion: 15, insumos: 20, demanda: 5, recurso: 'soprano', ficha: 'laser', seguimientoDias: 35 }, // ⭐ el muy rentable
    { id: 'rostro', nombre: 'Láser · Rostro', categoria: 'Depilación láser Soprano Titanium', precio: 500, duracion: 30, insumos: 25, demanda: 2, recurso: 'soprano', ficha: 'laser', seguimientoDias: 35 },
    { id: 'bikini', nombre: 'Láser · Bikini', categoria: 'Depilación láser Soprano Titanium', precio: 500, duracion: 30, insumos: 25, demanda: 3, recurso: 'soprano', ficha: 'laser', seguimientoDias: 35 },
    { id: 'brasileno', nombre: 'Láser · Brasileño', categoria: 'Depilación láser Soprano Titanium', precio: 650, duracion: 30, insumos: 30, demanda: 3, recurso: 'soprano', ficha: 'laser', seguimientoDias: 35 },
    { id: 'mediapierna', nombre: 'Láser · Media pierna', categoria: 'Depilación láser Soprano Titanium', precio: 650, duracion: 30, insumos: 35, demanda: 2, recurso: 'soprano', ficha: 'laser', seguimientoDias: 35 },
    { id: 'piernacompleta', nombre: 'Láser · Pierna completa', categoria: 'Depilación láser Soprano Titanium', precio: 1300, duracion: 60, insumos: 60, demanda: 2, recurso: 'soprano', ficha: 'laser', seguimientoDias: 35 },
    { id: 'brazos', nombre: 'Láser · Brazo', categoria: 'Depilación láser Soprano Titanium', precio: 650, duracion: 30, insumos: 35, demanda: 1, recurso: 'soprano', ficha: 'laser', seguimientoDias: 35 },
    { id: 'espalda', nombre: 'Láser · Espalda', categoria: 'Depilación láser Soprano Titanium', precio: 600, desde: true, duracion: 45, insumos: 45, demanda: 1, recurso: 'soprano', ficha: 'laser', seguimientoDias: 35 },

    { id: 'tatuajes', nombre: 'Eliminación de tatuajes', categoria: 'Otros tratamientos', precio: 1200, precioTexto: 'Según tamaño y ubicación', duracion: 30, insumos: 60, demanda: 1, ficha: 'tatuaje', seguimientoDias: 49, descripcion: 'Procedimiento seguro y eficaz para eliminar pigmentos progresivamente.' },
    { id: 'verrugas', nombre: 'Eliminación de verrugas', categoria: 'Otros tratamientos', precio: 700, precioTexto: 'Según tamaño y ubicación', duracion: 30, insumos: 80, demanda: 1, descripcion: 'Tecnología Plasma Pen para remover lesiones cutáneas sin cirugía.' },
  ],

  // 5 especialistas (como dice el sitio). Nombres y comisiones de ejemplo.
  personal: [
    { id: 'p1', nombre: 'Mónica Ávila', puesto: 'Masoterapeuta senior', comision: 0.35, servicios: [...MASAJES, 'reductivo', 'postquirurgico'], peso: 1.2 },
    { id: 'p2', nombre: 'Karla Villanueva', puesto: 'Masoterapeuta', comision: 0.35, servicios: [...MASAJES, ...CORPORALES] },
    { id: 'p3', nombre: 'Alejandra Ruiz', puesto: 'Cosmetóloga', comision: 0.3, servicios: [...FACIALES, 'hifem', 'anticelulitico'] },
    { id: 'p4', nombre: 'Brenda Solís', puesto: 'Cosmetóloga', comision: 0.3, servicios: [...FACIALES, ...LASER], descanso: [6] },
    { id: 'p5', nombre: 'Gabriela Núñez', puesto: 'Especialista en láser', comision: 0.3, servicios: [...LASER, ...LASER_OTROS, 'aparatologia'], peso: 1.1 },
  ],

  gastos: {
    fijos: [
      { concepto: 'Renta del local', categoria: 'Renta', monto: 16000, dia: 1 },
      { concepto: 'Luz', categoria: 'Servicios', monto: 3600, dia: 10 },
      { concepto: 'Agua', categoria: 'Servicios', monto: 600, dia: 12 },
      { concepto: 'Internet y teléfono', categoria: 'Servicios', monto: 599, dia: 5 },
      { concepto: 'Nómina recepción', categoria: 'Nómina', monto: 5000, dia: [15, 30] },
      { concepto: 'Nómina limpieza', categoria: 'Nómina', monto: 3000, dia: [15, 30] },
      { concepto: 'Contador', categoria: 'Honorarios', monto: 1800, dia: 3 },
    ],
    variables: [
      { concepto: 'Aceites, cremas y mascarillas', categoria: 'Insumos', cadaDias: 7, rango: [1500, 3000] },
      { concepto: 'Gel y consumibles del láser', categoria: 'Insumos', cadaDias: 14, rango: [600, 1200] },
      { concepto: 'Lavandería de toallas y sábanas', categoria: 'Lavandería', cadaDias: 7, rango: [450, 800] },
      { concepto: 'Anuncios en redes', categoria: 'Publicidad', cadaDias: 30, rango: [1500, 3000] },
      { concepto: 'Compra de productos para venta', categoria: 'Productos para venta', cadaDias: 30, rango: [2500, 4500] },
      { concepto: 'Mantenimiento de equipos', categoria: 'Mantenimiento', cadaDias: 60, rango: [1500, 4000] },
    ],
  },

  extras: {
    // Número de sesiones y precio de paquetes: propuesta por confirmar (el sitio dice "pregunta por paquetes")
    paquetes: [
      { id: 'prog-reductivo', nombre: 'Programa reductivo · 6 sesiones', servicio: 'reductivo', sesiones: 6, precio: 3000, vigenciaDias: 60, vendidosDemo: 5 },
      { id: 'prog-postqx', nombre: 'Programa postquirúrgico · 10 sesiones', servicio: 'postquirurgico', sesiones: 10, precio: 5000, vigenciaDias: 45, vendidosDemo: 3 },
      { id: 'axilas6', nombre: 'Axilas con láser · 6 sesiones', servicio: 'axilas', sesiones: 6, precio: 2500, vigenciaDias: 240, vendidosDemo: 6 },
      { id: 'relajante5', nombre: '5 masajes relajantes', servicio: 'relajante', sesiones: 5, precio: 2700, vigenciaDias: 120, vendidosDemo: 5 },
    ],
    seguimiento: {
      nombres: { laser: 'Depilación láser', corporal: 'Corporales', postqx: 'Postquirúrgico', acne: 'Acné', tatuaje: 'Eliminación de tatuaje' },
      plantillas: {
        laser: [
          { id: 'reduccion', etiqueta: 'Reducción de vello', unidad: '%', inicio: [0, 8], cambio: [9, 17], min: 0, max: 95 },
          { id: 'molestia', etiqueta: 'Molestia (0–10)', unidad: '', inicio: [3, 6], cambio: [-1, 0.3], min: 0, max: 10, mejorEsBajar: true },
        ],
        corporal: [
          { id: 'cintura', etiqueta: 'Cintura', unidad: 'cm', inicio: [78, 104], cambio: [-1.4, 0.2], mejorEsBajar: true },
          { id: 'cadera', etiqueta: 'Cadera', unidad: 'cm', inicio: [96, 122], cambio: [-1.1, 0.3], mejorEsBajar: true },
        ],
        postqx: [
          { id: 'inflamacion', etiqueta: 'Inflamación (0–10)', unidad: '', inicio: [6, 9], cambio: [-1.1, 0.2], min: 0, max: 10, mejorEsBajar: true },
          { id: 'fibrosis', etiqueta: 'Fibrosis (0–10)', unidad: '', inicio: [3, 7], cambio: [-0.8, 0.2], min: 0, max: 10, mejorEsBajar: true },
        ],
        acne: [{ id: 'lesiones', etiqueta: 'Lesiones activas', unidad: '', inicio: [14, 30], cambio: [-5, 1], min: 0, mejorEsBajar: true }],
        tatuaje: [{ id: 'aclarado', etiqueta: 'Aclarado del tatuaje', unidad: '%', inicio: [0, 6], cambio: [9, 18], min: 0, max: 100 }],
      },
      notas: {
        laser: ['Sin reacción en la piel.', 'Ligero enrojecimiento que cede en minutos.', 'Evitar sol 48 horas y usar protector.', 'Se subió la energía un nivel.', 'Vello más delgado y disperso.'],
        corporal: ['Buena respuesta al tratamiento.', 'Tomar 2 L de agua al día.', 'Se combinó con maderoterapia.', 'Piel más firme en abdomen.'],
        postqx: ['Disminuye la inflamación.', 'Usar faja todo el día.', 'Se trabajó zona de fibrosis en flancos.', 'Sin dolor al final de la sesión.'],
        acne: ['Menos brotes en mejillas.', 'Rutina en casa: limpiador y protector solar.', 'Extracción suave en zona T.'],
        tatuaje: ['Pigmento negro aclarando bien.', 'Costra leve: no rascar.', 'Esperar 7 semanas para la siguiente sesión.'],
      },
    },
    insumos: [
      { id: 'aceite', nombre: 'Aceite para masaje', unidad: 'L', stock: 2.2, minimo: 2, costo: 280, consumo: cada(MASAJES, 0.04) },
      { id: 'gel', nombre: 'Gel frío para láser', unidad: 'L', stock: 1.1, minimo: 1.5, costo: 450, consumo: cada(LASER, 0.03) },
      { id: 'mascarilla', nombre: 'Mascarillas faciales', unidad: 'pza', stock: 28, minimo: 15, costo: 55, consumo: cada(FACIALES, 1) },
      { id: 'crema-red', nombre: 'Crema reductiva', unidad: 'kg', stock: 1.4, minimo: 1, costo: 650, consumo: { reductivo: 0.12, anticelulitico: 0.1 } },
      { id: 'sabanas', nombre: 'Sábanas desechables (rollo)', unidad: 'rollo', stock: 5, minimo: 4, costo: 220, consumo: cada([...MASAJES, ...FACIALES, ...CORPORALES, ...LASER], 0.02) },
      { id: 'esencias', nombre: 'Esencias para aromaterapia', unidad: 'pza', stock: 4, minimo: 5, costo: 160, consumo: cada(['relajante', 'piedras', 'lomi', 'ayurveda', 'miyana'], 0.05) },
    ],
    // Productos de ejemplo: el sitio dice "pregunta por disponibilidad", pero no publica la lista
    mostrador: {
      comision: 0.1,
      ventasPorDia: [0, 3],
      productos: [
        { id: 'fps', nombre: 'Protector solar FPS 50', precio: 450, costo: 220, stock: 12, minimo: 6, demanda: 4 },
        { id: 'serum', nombre: 'Sérum vitamina C', precio: 650, costo: 300, stock: 7, minimo: 4, demanda: 3 },
        { id: 'post-laser', nombre: 'Gel calmante post-láser', precio: 280, costo: 120, stock: 3, minimo: 5, demanda: 3 },
        { id: 'limpiador', nombre: 'Limpiador facial', precio: 380, costo: 170, stock: 10, minimo: 5, demanda: 2 },
        { id: 'hidratante', nombre: 'Crema hidratante', precio: 420, costo: 190, stock: 9, minimo: 4, demanda: 2 },
      ],
    },
    // Cursos del sitio. Fechas, cupos y precios de ejemplo, salvo la clase de los viernes ($120).
    cursos: [
      { id: 'clase-viernes', nombre: 'Clase de masajes · sin experiencia', cuando: 'cada viernes, 3:00 – 4:00 p. m.', enDias: 0, diaSemana: 5, precio: 120, cupo: 10, inscritasDemo: 6 },
      { id: 'masaje-pro', nombre: 'Masaje profesional con certificación', cuando: 'sábado y domingo, 9:00 a. m. – 6:00 p. m.', enDias: 10, diaSemana: 6, precio: 4500, anticipo: 1500, cupo: 12, imparte: 'Mónica Ávila', inscritasDemo: 9 },
      { id: 'drenaje', nombre: 'Drenaje linfático', cuando: 'dos sábados, 10:00 a. m. – 2:00 p. m.', enDias: 24, diaSemana: 6, precio: 2800, anticipo: 1000, cupo: 10, imparte: 'Karla Villanueva', inscritasDemo: 4 },
      { id: 'maderoterapia', nombre: 'Maderoterapia', cuando: 'sábado, 10:00 a. m. – 2:00 p. m.', enDias: 38, diaSemana: 6, precio: 3200, anticipo: 1000, cupo: 10, imparte: 'Karla Villanueva', inscritasDemo: 2 },
      { id: 'lomi', nombre: 'Lomi Lomi Nui', cuando: 'sábado y domingo', enDias: -33, diaSemana: 6, precio: 3000, cupo: 10, imparte: 'Mónica Ávila', inscritasDemo: 8 },
    ],
  },

  // Reseñas publicadas en lifeskincareirapuato.com
  resenas: [
    { autor: 'María G.', estrellas: 5, texto: 'Excelente atención y súper profesional. Salí completamente relajada.' },
    { autor: 'Andrea L.', estrellas: 5, texto: 'Mi piel mejoró mucho con los faciales. El personal explica todo con detalle.' },
    { autor: 'Carlos R.', estrellas: 5, texto: 'El masaje descontracturante fue justo lo que necesitaba. Muy recomendado.' },
    { autor: 'Luisa N.', estrellas: 5, texto: 'Sin duda uno de los mejores spas en Irapuato. Muy buena experiencia.' },
  ],

  mensajes: {
    promoInactivos: '20% de descuento',
    recordatorio:
      'Hola {nombre} 🌿\nTe esperamos {cuando} a las *{hora}* para tu *{servicio}* con {profesional} en Life Skin Care.\n\n📍 {direccion}\n\nResponde *1* para confirmar o *2* si necesitas cambiarla.',
  },

  simulacion: {
    semilla: 808,
    clientes: 70,
    proporcionMujeres: 0.82,
    citasPorDia: [8, 13],
    afinidad: 0.7, // la mayoría repite su tratamiento: alimenta paquetes y seguimiento
    respetarIntervalos: true, // p. ej. láser cada ~5 semanas, no cada semana
    mesFlojo: { haceMeses: 2, factor: 0.8 },
    tendencia: 0.08,
    porcentajeSinPagar: 0.03,
    origenWeb: 0.2,
    saldoInicial: 60000,
    notasClientes: [
      'Piel sensible: evitar exfoliantes fuertes.',
      'Fototipo IV: ajustar energía del láser.',
      'Prefiere presión media en espalda.',
      'Alergia a la lavanda.',
      'Siempre pide con Mónica.',
      'Viene después del trabajo: agendar por la tarde.',
      'Postoperatorio de lipoescultura (octubre).',
    ],
  },
};
