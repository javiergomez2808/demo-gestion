// Descubre automáticamente los módulos extra de src/extras/. Cada rubro activa los suyos con la clave `extras`.

const archivos = import.meta.glob('../extras/*.js', { eager: true });

export const EXTRAS = Object.fromEntries(
  Object.values(archivos)
    .map((m) => m.default)
    .filter((e) => e && e.id)
    .map((e) => [e.id, e]),
);

export function extrasDelRubro(config) {
  return Object.keys(config.extras || {})
    .filter((id) => {
      if (!EXTRAS[id]) console.warn(`[demo] El rubro "${config.id}" pide el extra "${id}", pero no existe src/extras/${id}.js`);
      return EXTRAS[id];
    })
    .map((id) => EXTRAS[id]);
}
