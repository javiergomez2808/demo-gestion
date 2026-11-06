// Configuración del rubro BARBERÍA / SALÓN.
// Todo lo que ves aquí es ficticio: nombre, dirección, teléfono, personas y números.

export default {
  id: 'barberia',
  orden: 2,
  rubro: 'Barbería / Salón',

  negocio: {
    nombre: 'Barbería Cuarto Peine',
    tagline: 'Cortes clásicos, trato de barrio',
    logo: {
      svg: '<svg viewBox="0 0 32 32"><rect x="11" y="3" width="10" height="26" rx="5" fill="currentColor"/><path d="M12 9.5l8 4M12 15.5l8 4M12 21.5l8 4" stroke="#C8553D" stroke-width="2.4" stroke-linecap="round"/></svg>',
    },
    direccion: 'Calle Cedros 58, Col. Centro (dirección ficticia)',
    whatsapp: '55 0000 0000',
    dueno: 'Arturo',
    horario: { dias: [1, 2, 3, 4, 5, 6], abre: '10:00', cierra: '21:00' },
  },

  tema: { primario: '#2B3A55', acento: '#C8553D', fondo: '#F4F3F1' },

  vocabulario: {
    profesional: ['barbero', 'barberos'],
    cliente: ['cliente', 'clientes'],
    cita: ['cita', 'citas'],
    servicio: ['servicio', 'servicios'],
  },

  servicios: [
    { id: 'corte', nombre: 'Corte clásico', categoria: 'Cortes', precio: 220, duracion: 40, insumos: 10, demanda: 5, descripcion: 'Tijera y máquina, lavado incluido.' }, // ⭐ el más rentable y el que más se vende
    { id: 'corte-barba', nombre: 'Corte + barba', categoria: 'Cortes', precio: 330, duracion: 60, insumos: 20, demanda: 4, descripcion: 'El combo completo.' },
    { id: 'infantil', nombre: 'Corte infantil', categoria: 'Cortes', precio: 160, duracion: 30, insumos: 8, demanda: 2, descripcion: 'Para menores de 12 años.' },
    { id: 'barba', nombre: 'Arreglo de barba', categoria: 'Barba', precio: 150, duracion: 30, insumos: 15, demanda: 3, descripcion: 'Perfilado y aceite.' },
    { id: 'afeitado', nombre: 'Afeitado con toalla caliente', categoria: 'Barba', precio: 250, duracion: 45, insumos: 35, demanda: 2, descripcion: 'Navaja, toalla caliente y bálsamo.' },
    { id: 'tinte', nombre: 'Tinte de cabello', categoria: 'Color', precio: 450, duracion: 75, insumos: 140, demanda: 1, descripcion: 'Color uniforme o cubrir canas.' }, // ⚠️ el poco rentable
  ],

  personal: [
    { id: 'b1', nombre: 'Iván Herrera', puesto: 'Barbero senior', comision: 0.45, color: '#2a78d6', peso: 1.3 },
    { id: 'b2', nombre: 'Óscar Medina', puesto: 'Barbero', comision: 0.45, color: '#eb6834' },
    { id: 'b3', nombre: 'Rafael Domínguez', puesto: 'Barbero', comision: 0.4, color: '#1baf7a', descanso: [2] },
    { id: 'b4', nombre: 'Emiliano Cruz', puesto: 'Barbero junior', comision: 0.4, color: '#6250d6', servicios: ['corte', 'infantil', 'barba', 'corte-barba'], peso: 0.8, descanso: [1] },
  ],

  gastos: {
    fijos: [
      { concepto: 'Renta del local', categoria: 'Renta', monto: 14000, dia: 1 },
      { concepto: 'Luz', categoria: 'Servicios', monto: 1900, dia: 10 },
      { concepto: 'Agua', categoria: 'Servicios', monto: 520, dia: 12 },
      { concepto: 'Internet y música', categoria: 'Servicios', monto: 650, dia: 5 },
      { concepto: 'Nómina auxiliar', categoria: 'Nómina', monto: 3000, dia: [15, 30] },
      { concepto: 'Contador', categoria: 'Honorarios', monto: 1500, dia: 3 },
    ],
    variables: [
      { concepto: 'Navajas, talco y lociones', categoria: 'Insumos', cadaDias: 7, rango: [600, 1200] },
      { concepto: 'Compra de productos para venta', categoria: 'Productos para venta', cadaDias: 18, rango: [3500, 6000] },
      { concepto: 'Lavandería de capas y toallas', categoria: 'Lavandería', cadaDias: 7, rango: [250, 450] },
      { concepto: 'Anuncios en redes', categoria: 'Publicidad', cadaDias: 30, rango: [800, 1600] },
      { concepto: 'Mantenimiento de sillones y máquinas', categoria: 'Mantenimiento', cadaDias: 45, rango: [500, 1800] },
    ],
  },

  extras: {
    turnos: { enFilaDemo: 4 },
    propinas: { probabilidad: 0.62, rango: [0.08, 0.2] },
    mostrador: {
      comision: 0.1,
      ventasPorDia: [1, 4],
      productos: [
        { id: 'pomada', nombre: 'Pomada mate', precio: 260, costo: 120, stock: 14, minimo: 6, demanda: 4 },
        { id: 'cera', nombre: 'Cera de brillo', precio: 230, costo: 105, stock: 9, minimo: 6, demanda: 3 },
        { id: 'aceite', nombre: 'Aceite para barba', precio: 290, costo: 130, stock: 4, minimo: 5, demanda: 3 },
        { id: 'shampoo', nombre: 'Shampoo para barba', precio: 240, costo: 115, stock: 11, minimo: 5, demanda: 2 },
        { id: 'peine', nombre: 'Peine de madera', precio: 120, costo: 40, stock: 18, minimo: 8, demanda: 2 },
      ],
    },
    paquetes: [{ id: 'club', nombre: 'Club mensual: 4 cortes', servicio: 'corte', sesiones: 4, precio: 760, vigenciaDias: 35, vendidosDemo: 7 }],
  },

  resenas: [
    { autor: 'Diego R.', estrellas: 5, texto: 'Veo en la página cuánta fila hay antes de salir de mi casa. Ya no espero de más.' },
    { autor: 'Juan Carlos M.', estrellas: 5, texto: 'Iván es un artista con la navaja. El afeitado con toalla caliente es otro nivel.' },
    { autor: 'Sebastián L.', estrellas: 4, texto: 'Buen ambiente y precio justo. El club mensual sale muy a cuenta.' },
  ],

  mensajes: {
    promoInactivos: 'el arreglo de barba gratis',
    recordatorio:
      '¿Qué tal, {nombre}? 💈\nTe esperamos {cuando} a las *{hora}* para tu *{servicio}* con {profesional}.\n\n📍 {direccion}\n\nResponde *1* para confirmar o *2* si no llegas.',
  },

  simulacion: {
    semilla: 202,
    clientes: 60,
    proporcionMujeres: 0.08,
    citasPorDia: [16, 24],
    sinRegistro: 0.6, // 60% de quienes vienen son clientes de paso (sin ficha)
    mesFlojo: { haceMeses: 3, factor: 0.72 }, // vacaciones de verano
    tendencia: 0.1,
    porcentajeSinPagar: 0.01,
    origenWeb: 0.4,
    saldoInicial: 25000,
    notasClientes: ['Degradado bajo, número 1 a los lados.', 'Siempre pide con Iván.', 'Piel sensible: usar bálsamo sin alcohol.', 'Le gusta la barba en punta.', 'Viene con su hijo los sábados.'],
  },
};
