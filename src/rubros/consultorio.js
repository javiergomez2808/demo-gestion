// Configuración del rubro CONSULTORIO (nutrición y fisioterapia).
// Todo lo que ves aquí es ficticio: nombre, dirección, teléfono, personas y números.

export default {
  id: 'consultorio',
  orden: 3,
  rubro: 'Consultorio (nutrición / fisio)',

  negocio: {
    nombre: 'Centro Raíz',
    tagline: 'Nutrición y fisioterapia, sesión a sesión',
    logo: {
      svg: '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="currentColor"/><path d="M16 9.5v13M9.5 16h13" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>',
    },
    direccion: 'Av. Las Palmas 1020, consultorio 3, Col. Moderna (dirección ficticia)',
    whatsapp: '55 0000 0000',
    dueno: 'Fernanda',
    horario: { dias: [1, 2, 3, 4, 5, 6], abre: '08:00', cierra: '19:00' },
  },

  tema: { primario: '#1E7A86', acento: '#E09F3E', fondo: '#F2F6F6' },

  vocabulario: {
    profesional: ['especialista', 'especialistas'],
    cliente: ['paciente', 'pacientes'],
    cita: ['consulta', 'consultas'],
    servicio: ['servicio', 'servicios'],
  },

  // ficha: qué plantilla de seguimiento se llena. seguimientoDias: cada cuánto conviene volver.
  // soloPrimeraVez: si la persona ya vino antes, en los datos de ejemplo recibe ese otro servicio.
  servicios: [
    { id: 'nutri-inicial', nombre: 'Primera consulta de nutrición', categoria: 'Nutrición', precio: 750, duracion: 60, insumos: 30, demanda: 2, ficha: 'nutricion', seguimientoDias: 14, soloPrimeraVez: 'nutri-seg', descripcion: 'Historia clínica, mediciones y plan personalizado.' },
    { id: 'nutri-seg', nombre: 'Consulta de seguimiento', categoria: 'Nutrición', precio: 550, duracion: 40, insumos: 15, demanda: 5, ficha: 'nutricion', seguimientoDias: 14, descripcion: 'Ajuste del plan y mediciones.' }, // ⭐ el muy rentable
    { id: 'composicion', nombre: 'Análisis de composición corporal', categoria: 'Nutrición', precio: 350, duracion: 30, insumos: 25, demanda: 2, descripcion: 'Grasa, músculo y agua corporal.' },
    { id: 'fisio-val', nombre: 'Valoración de fisioterapia', categoria: 'Fisioterapia', precio: 700, duracion: 60, insumos: 40, demanda: 2, ficha: 'fisio', seguimientoDias: 4, soloPrimeraVez: 'fisio-sesion', descripcion: 'Diagnóstico funcional y plan de tratamiento.' },
    { id: 'fisio-sesion', nombre: 'Sesión de fisioterapia', categoria: 'Fisioterapia', precio: 600, duracion: 50, insumos: 60, demanda: 5, ficha: 'fisio', seguimientoDias: 4, descripcion: 'Terapia manual y ejercicio terapéutico.' },
    { id: 'electro', nombre: 'Electroterapia con compresas', categoria: 'Fisioterapia', precio: 480, duracion: 60, insumos: 110, demanda: 2, ficha: 'fisio', seguimientoDias: 4, descripcion: 'Corrientes y compresas calientes.' }, // ⚠️ el poco rentable
  ],

  personal: [
    { id: 'e1', nombre: 'Fernanda Salazar', puesto: 'Nutrióloga', comision: 0.4, color: '#2a78d6', servicios: ['nutri-inicial', 'nutri-seg', 'composicion'] },
    { id: 'e2', nombre: 'Mauricio Campos', puesto: 'Fisioterapeuta', comision: 0.4, color: '#eb6834', servicios: ['fisio-val', 'fisio-sesion', 'electro'], peso: 1.2 },
    { id: 'e3', nombre: 'Paulina Rivera', puesto: 'Fisioterapeuta', comision: 0.35, color: '#1baf7a', servicios: ['fisio-sesion', 'electro', 'fisio-val'], descanso: [6] },
  ],

  gastos: {
    fijos: [
      { concepto: 'Renta del consultorio', categoria: 'Renta', monto: 17000, dia: 1 },
      { concepto: 'Luz', categoria: 'Servicios', monto: 1600, dia: 10 },
      { concepto: 'Agua', categoria: 'Servicios', monto: 450, dia: 12 },
      { concepto: 'Internet y teléfono', categoria: 'Servicios', monto: 599, dia: 5 },
      { concepto: 'Nómina recepción', categoria: 'Nómina', monto: 5200, dia: [15, 30] },
      { concepto: 'Contador', categoria: 'Honorarios', monto: 2000, dia: 3 },
    ],
    variables: [
      { concepto: 'Vendas, gel y electrodos', categoria: 'Insumos', cadaDias: 10, rango: [900, 1800] },
      { concepto: 'Material de consulta', categoria: 'Insumos', cadaDias: 21, rango: [400, 900] },
      { concepto: 'Lavandería de sábanas', categoria: 'Lavandería', cadaDias: 7, rango: [300, 550] },
      { concepto: 'Anuncios en redes', categoria: 'Publicidad', cadaDias: 30, rango: [1200, 2400] },
      { concepto: 'Mantenimiento de equipo', categoria: 'Mantenimiento', cadaDias: 60, rango: [800, 2500] },
    ],
  },

  extras: {
    seguimiento: {
      nombres: { nutricion: 'Nutrición', fisio: 'Fisioterapia' },
      // inicio: rango del primer valor; cambio: cuánto se mueve por sesión
      plantillas: {
        nutricion: [
          { id: 'peso', etiqueta: 'Peso', unidad: 'kg', inicio: [68, 104], cambio: [-1.3, 0.2], mejorEsBajar: true },
          { id: 'grasa', etiqueta: '% grasa', unidad: '%', inicio: [26, 39], cambio: [-0.9, 0.1], min: 14 },
          { id: 'cintura', etiqueta: 'Cintura', unidad: 'cm', inicio: [80, 112], cambio: [-1.6, 0.3] },
        ],
        fisio: [
          { id: 'dolor', etiqueta: 'Dolor (0–10)', unidad: '', inicio: [6, 9], cambio: [-1.1, 0.2], min: 0, max: 10, mejorEsBajar: true },
          { id: 'movilidad', etiqueta: 'Movilidad', unidad: '°', inicio: [70, 110], cambio: [-1, 9], max: 175 },
        ],
      },
      notas: {
        nutricion: ['Buena adherencia al plan.', 'Aumentar agua a 2 L diarios.', 'Ajustar porciones en la cena.', 'Incluir colación media tarde.', 'Retomó actividad física 3 veces por semana.'],
        fisio: ['Disminuye dolor al final de la sesión.', 'Ejercicios en casa: 2 series diarias.', 'Mejora rango de movimiento.', 'Aplicar hielo después de entrenar.', 'Buena tolerancia a la carga.'],
      },
    },
    paquetes: [
      { id: 'plan-nutri', nombre: 'Plan nutricional: 4 consultas', servicio: 'nutri-seg', sesiones: 4, precio: 1900, vigenciaDias: 75 },
      { id: 'rehab10', nombre: 'Rehabilitación: 10 sesiones', servicio: 'fisio-sesion', sesiones: 10, precio: 5200, vigenciaDias: 90 },
    ],
  },

  resenas: [
    { autor: 'Mariana T.', estrellas: 5, texto: 'Ver mi avance consulta a consulta me motivó muchísimo. Bajé 7 kilos en tres meses.' },
    { autor: 'Héctor P.', estrellas: 5, texto: 'Mauricio me ayudó con la lesión de rodilla. Me recuerdan cada sesión por WhatsApp.' },
    { autor: 'Rocío A.', estrellas: 4, texto: 'Muy profesionales y puntuales. El paquete de sesiones conviene.' },
  ],

  mensajes: {
    promoInactivos: 'una valoración de seguimiento sin costo',
    recordatorio:
      'Hola {nombre} 👋\nTe recordamos tu *{servicio}* con {profesional} {cuando} a las *{hora}*.\n\n📍 {direccion}\nTrae ropa cómoda.\n\nResponde *1* para confirmar o *2* para reagendar.',
  },

  simulacion: {
    semilla: 303,
    clientes: 48,
    proporcionMujeres: 0.62,
    citasPorDia: [8, 13],
    mesFlojo: { haceMeses: 2, factor: 0.75 },
    tendencia: 0.07,
    porcentajeSinPagar: 0.05,
    origenWeb: 0.35,
    saldoInicial: 38000,
    notasClientes: ['Hipotiroidismo controlado.', 'Lesión de rodilla derecha (menisco).', 'Vegetariana.', 'Prefiere consultas temprano.', 'Lumbalgia crónica.', 'Entrena para un medio maratón.'],
  },
};
