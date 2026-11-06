// Descubre automáticamente cada archivo de src/rubros/. Para agregar un rubro basta con crear su archivo.

const archivos = import.meta.glob('../rubros/*.js', { eager: true });

const VOCAB_BASE = {
  profesional: ['profesional', 'profesionales'],
  cliente: ['cliente', 'clientes'],
  cita: ['cita', 'citas'],
  servicio: ['servicio', 'servicios'],
};

function normalizar(cfg) {
  return {
    orden: 99,
    mensajes: {},
    extras: {},
    gastos: { fijos: [], variables: [] },
    resenas: [],
    ...cfg,
    vocabulario: { ...VOCAB_BASE, ...(cfg.vocabulario || {}) },
    tema: { primario: '#2F5D8A', acento: '#D08C3C', fondo: '#F5F6F8', ...(cfg.tema || {}) },
    simulacion: {
      semilla: 1,
      clientes: 50,
      citasPorDia: [5, 9],
      meses: 3,
      diasFuturos: 14,
      porcentajeSinPagar: 0.03,
      saldoInicial: 40000,
      ...(cfg.simulacion || {}),
    },
    personal: (cfg.personal || []).map((p, i) => ({ color: COLORES[i % COLORES.length], servicios: '*', ...p })),
  };
}

// Colores de respaldo para el personal si la configuración no los define.
const COLORES = ['#2a78d6', '#eb6834', '#1baf7a', '#e87ba4', '#6250d6', '#eda100'];

export const RUBROS = Object.values(archivos)
  .map((m) => m.default)
  .filter((c) => c && c.id)
  .map(normalizar)
  .sort((a, b) => a.orden - b.orden);

/** Rubros del selector. Los `oculto: true` (demos personalizadas para un cliente) solo se abren con su enlace ?rubro=… */
export const RUBROS_VISIBLES = RUBROS.filter((r) => !r.oculto);

export function obtenerRubro(id) {
  return RUBROS.find((r) => r.id === id) || RUBROS_VISIBLES[0];
}
