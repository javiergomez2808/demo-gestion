// Configuración del rubro SPA / ESTÉTICA.
// Todo lo que ves aquí es ficticio: nombre, dirección, teléfono, personas y números.

export default {
  id: 'spa',
  orden: 1,
  rubro: 'Spa / Estética',

  negocio: {
    nombre: 'Casa Olmo Spa',
    tagline: 'Tu pausa en medio de la ciudad',
    logo: {
      svg: '<svg viewBox="0 0 32 32"><path d="M7 25C7 14 14 7 25 7c0 11-7 18-18 18z" fill="currentColor"/><path d="M8 24L19 13" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>',
    },
    direccion: 'Av. de los Fresnos 214, Col. Jardines (dirección ficticia)',
    whatsapp: '55 0000 0000',
    dueno: 'Laura',
    horario: { dias: [1, 2, 3, 4, 5, 6], abre: '10:00', cierra: '20:00' },
  },

  tema: { primario: '#4E7A68', acento: '#C29A6B', fondo: '#F6F3EE' },

  vocabulario: {
    profesional: ['terapeuta', 'terapeutas'],
    cliente: ['cliente', 'clientes'],
    cita: ['cita', 'citas'],
    servicio: ['servicio', 'servicios'],
  },

  // demanda: qué tan seguido se pide (1–5). insumos: costo de material por servicio.
  servicios: [
    { id: 'relajante', nombre: 'Masaje relajante', categoria: 'Masajes', precio: 750, duracion: 60, insumos: 60, demanda: 5, descripcion: 'Presión suave con aceites tibios.' },
    { id: 'descontract', nombre: 'Masaje descontracturante', categoria: 'Masajes', precio: 850, duracion: 60, insumos: 70, demanda: 4, descripcion: 'Para espalda, cuello y hombros cargados.' },
    { id: 'piedras', nombre: 'Piedras calientes', categoria: 'Masajes', precio: 1200, duracion: 90, insumos: 120, demanda: 2, descripcion: 'Relajación profunda con piedras volcánicas.' },
    { id: 'facial', nombre: 'Facial hidratante', categoria: 'Faciales y corporales', precio: 790, duracion: 50, insumos: 60, demanda: 5, descripcion: 'Limpieza, exfoliación y mascarilla.' }, // ⭐ el muy rentable
    { id: 'chocolate', nombre: 'Envoltura de chocolate', categoria: 'Faciales y corporales', precio: 1100, duracion: 90, insumos: 420, demanda: 1, descripcion: 'Tratamiento corporal nutritivo.' }, // ⚠️ el poco rentable
    { id: 'manicure', nombre: 'Manicure spa', categoria: 'Manos y pies', precio: 450, duracion: 45, insumos: 50, demanda: 3, descripcion: 'Exfoliación, hidratación y esmaltado.' },
  ],

  personal: [
    { id: 'p1', nombre: 'Mariana Robles', puesto: 'Terapeuta senior', comision: 0.35, color: '#2a78d6', servicios: '*', peso: 1.2 },
    { id: 'p2', nombre: 'Daniela Ortiz', puesto: 'Terapeuta', comision: 0.35, color: '#eb6834', servicios: '*' },
    { id: 'p3', nombre: 'Itzel Ramírez', puesto: 'Cosmetóloga', comision: 0.3, color: '#1baf7a', servicios: ['facial', 'manicure', 'relajante', 'chocolate'], descanso: [1] },
  ],

  gastos: {
    fijos: [
      { concepto: 'Renta del local', categoria: 'Renta', monto: 19000, dia: 1 },
      { concepto: 'Luz', categoria: 'Servicios', monto: 2400, dia: 10 },
      { concepto: 'Agua', categoria: 'Servicios', monto: 650, dia: 12 },
      { concepto: 'Internet y teléfono', categoria: 'Servicios', monto: 599, dia: 5 },
      { concepto: 'Nómina recepción', categoria: 'Nómina', monto: 5500, dia: [15, 30] },
      { concepto: 'Nómina limpieza', categoria: 'Nómina', monto: 3200, dia: [15, 30] },
      { concepto: 'Contador', categoria: 'Honorarios', monto: 1800, dia: 3 },
    ],
    variables: [
      { concepto: 'Compra de insumos', categoria: 'Insumos', cadaDias: 7, rango: [1500, 3200] },
      { concepto: 'Lavandería de toallas', categoria: 'Lavandería', cadaDias: 7, rango: [450, 800] },
      { concepto: 'Anuncios en redes', categoria: 'Publicidad', cadaDias: 30, rango: [1500, 3000] },
      { concepto: 'Mantenimiento', categoria: 'Mantenimiento', cadaDias: 40, rango: [600, 2500] },
    ],
  },

  // Extras: cada clave activa un módulo de src/extras/ (se ven en el plan Crecimiento)
  extras: {
    paquetes: [
      { id: 'paq10', nombre: '10 masajes relajantes', servicio: 'relajante', sesiones: 10, precio: 6000, vigenciaDias: 120 },
      { id: 'paq5f', nombre: '5 faciales hidratantes', servicio: 'facial', sesiones: 5, precio: 3450, vigenciaDias: 90 },
    ],
    insumos: [
      { id: 'aceite', nombre: 'Aceite de almendras', unidad: 'L', stock: 1.8, minimo: 2, costo: 320, consumo: { relajante: 0.04, descontract: 0.04, piedras: 0.06 } },
      { id: 'mascarilla', nombre: 'Mascarilla hidratante', unidad: 'pza', stock: 24, minimo: 15, costo: 45, consumo: { facial: 1 } },
      { id: 'chocolate', nombre: 'Crema de cacao corporal', unidad: 'kg', stock: 1.6, minimo: 1, costo: 380, consumo: { chocolate: 0.4 } },
      { id: 'toallas', nombre: 'Toallas desechables (paq. 50)', unidad: 'paq', stock: 5, minimo: 4, costo: 180, consumo: { relajante: 0.04, descontract: 0.04, piedras: 0.04, facial: 0.04, chocolate: 0.06, manicure: 0.02 } },
      { id: 'velas', nombre: 'Velas aromáticas', unidad: 'pza', stock: 8, minimo: 10, costo: 85, consumo: { relajante: 0.1, piedras: 0.2 } },
      { id: 'esmalte', nombre: 'Kit de esmalte y removedor', unidad: 'kit', stock: 6, minimo: 3, costo: 150, consumo: { manicure: 0.1 } },
    ],
  },

  resenas: [
    { autor: 'Valeria M.', estrellas: 5, texto: 'Salí nueva. El masaje descontracturante me quitó el dolor de espalda de toda la semana.' },
    { autor: 'Ana Sofía R.', estrellas: 5, texto: 'Reservé desde el celular en un minuto y me llegó el recordatorio un día antes.' },
    { autor: 'Carlos G.', estrellas: 4, texto: 'Muy buen ambiente y puntuales. El paquete de masajes vale mucho la pena.' },
  ],

  // Opcional: cambia el texto de los mensajes automáticos ({nombre}, {servicio}, {cuando}, {hora}, {profesional}…)
  mensajes: {
    promoInactivos: '15% de descuento',
    recordatorio:
      'Hola {nombre} 🌿\nTe esperamos {cuando} a las *{hora}* para tu *{servicio}* con {profesional}.\n\n📍 {direccion}\n\nResponde *1* para confirmar o *2* si necesitas cambiarla.',
  },

  // La "historia" de los números
  simulacion: {
    semilla: 101,
    clientes: 55,
    proporcionMujeres: 0.8,
    citasPorDia: [6, 11],
    mesFlojo: { haceMeses: 2, factor: 0.7 }, // hace dos meses se vendió ~30% menos
    tendencia: 0.08, // ligera mejora mes con mes
    porcentajeSinPagar: 0.04, // alimenta cuentas por cobrar
    saldoInicial: 45000,
    notasClientes: [
      'Prefiere presión suave.',
      'Alergia a frutos secos: no usar aceite de almendras.',
      'Le gusta la cabina con música tranquila.',
      'Siempre pide con Mariana.',
      'Viene en su hora de comida: ser puntuales.',
      'Contractura en hombro derecho.',
    ],
  },
};
