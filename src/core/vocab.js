import { capital } from './formato.js';

/**
 * Vocabulario del rubro: t('profesional') → "terapeuta"; t('cliente', true) → "pacientes".
 * t.M('cliente', true) → "Pacientes" (con mayúscula inicial).
 */
export function crearVocab(config) {
  const v = config.vocabulario;
  const t = (clave, plural = false) => (v[clave] ? v[clave][plural ? 1 : 0] : clave);
  t.M = (clave, plural = false) => capital(t(clave, plural));
  return t;
}
