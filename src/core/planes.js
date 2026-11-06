// Los tres niveles de la plataforma. Cada módulo declara el plan mínimo que lo incluye.

export const PLANES = [
  { id: 'presencia', nombre: 'Presencia', nivel: 1, lema: 'Que te encuentren y reserven en línea' },
  { id: 'control', nombre: 'Control', nivel: 2, lema: 'Ordena tus clientes y tus números' },
  { id: 'crecimiento', nombre: 'Crecimiento', nivel: 3, lema: 'Atrae, retiene y vende más' },
];

export const planPorId = (id) => PLANES.find((p) => p.id === id) || PLANES[2];
export const esPlan = (id) => PLANES.some((p) => p.id === id);
export const nivel = (id) => planPorId(id).nivel;
/** ¿El plan actual incluye lo que requiere el plan indicado? */
export const incluye = (planActual, planRequerido = 'presencia') => nivel(planActual) >= nivel(planRequerido);
