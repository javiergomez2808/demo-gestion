// Formatos y utilidades de fecha para es-MX. Las fechas se manejan como texto 'AAAA-MM-DD' (hora local).

const fmtDinero = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0, minimumFractionDigits: 0 });
const fmtNumero = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 });

export const dinero = (n) => fmtDinero.format(Math.round(n || 0));
export const numero = (n) => fmtNumero.format(n || 0);
export const porcentaje = (n, dec = 0) => `${((n || 0) * 100).toFixed(dec)}%`;
export const dineroEje = (n) => {
  const a = Math.abs(n);
  if (a >= 1e6) return `$${(n / 1e6).toFixed(1)} M`;
  if (a >= 1e4) return `$${Math.round(n / 1000)} mil`;
  return fmtDinero.format(n);
};

const pad = (n) => String(n).padStart(2, '0');
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const deIso = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const hoyIso = () => iso(new Date());
export const sumarDias = (s, n) => {
  const d = deIso(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
/** Días de a hasta b (b - a). */
export const difDias = (a, b) => Math.round((deIso(b) - deIso(a)) / 864e5);
export const diaSemana = (s) => deIso(s).getDay();
export const claveMes = (s) => s.slice(0, 7);
/** Primer día del mes desplazado n meses. */
export const sumarMeses = (s, n) => {
  const d = deIso(s);
  return iso(new Date(d.getFullYear(), d.getMonth() + n, 1));
};
export const primerDiaMes = (s) => `${s.slice(0, 7)}-01`;
export const ultimoDiaMes = (clave) => {
  const [y, m] = clave.split('-').map(Number);
  return iso(new Date(y, m, 0));
};
export const diasEnMes = (clave) => Number(ultimoDiaMes(clave).slice(8));
/** Lunes de la semana de la fecha. */
export const inicioSemana = (s) => sumarDias(s, -((diaSemana(s) + 6) % 7));
export const rangoFechas = (desde, hasta) => {
  const out = [];
  for (let d = desde; d <= hasta; d = sumarDias(d, 1)) out.push(d);
  return out;
};

export const aMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
export const aHora = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
export const minutosAhora = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};
export const hora12 = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'a. m.' : 'p. m.'}`;
};
export const horaCorta = (min) => {
  const h = Math.floor(min / 60);
  return `${h % 12 || 12} ${h < 12 ? 'am' : 'pm'}`;
};

const fLarga = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
const fCorta = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' });
const fCortaAnio = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
const fDia = new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric' });
const fDiaNombre = new Intl.DateTimeFormat('es-MX', { weekday: 'long' });
const fMes = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' });
const fMesSolo = new Intl.DateTimeFormat('es-MX', { month: 'long' });
const fMesCorto = new Intl.DateTimeFormat('es-MX', { month: 'short' });
const sinPunto = (s) => s.replace(/\./g, '');

export const fechaLarga = (s) => fLarga.format(deIso(s));
export const fechaCorta = (s) => sinPunto(fCorta.format(deIso(s)));
export const fechaCortaAnio = (s) => sinPunto(fCortaAnio.format(deIso(s)));
export const diaCorto = (s) => sinPunto(fDia.format(deIso(s)));
export const nombreDia = (s) => fDiaNombre.format(deIso(s));
export const nombreMes = (clave) => fMes.format(deIso(`${clave}-01`));
export const mesSolo = (clave) => fMesSolo.format(deIso(`${clave}-01`));
export const mesCorto = (clave) => capital(sinPunto(fMesCorto.format(deIso(`${clave}-01`))));

export const capital = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export function relativo(fecha, hoy) {
  const d = difDias(hoy, fecha);
  if (d === 0) return 'hoy';
  if (d === 1) return 'mañana';
  if (d === -1) return 'ayer';
  if (d < 0) return `hace ${-d} días`;
  if (d < 7) return `el ${nombreDia(fecha)}`;
  return `el ${fechaCorta(fecha)}`;
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Escapa texto para insertarlo en HTML (los visitantes escriben datos libres). */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

export const iniciales = (nombre) =>
  String(nombre || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

export const uid = (prefijo = 'x') => `${prefijo}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const suma = (arr, fn = (x) => x) => arr.reduce((s, x) => s + (fn(x) || 0), 0);

export const variacion = (actual, anterior) => (anterior ? (actual - anterior) / anterior : 0);

/** Precio para mostrar al público: "$600", "Desde $600" (desde: true) o un texto libre (precioTexto). */
export const precioPublico = (s) => s.precioTexto || (s.desde ? `Desde ${dinero(s.precio)}` : dinero(s.precio));
