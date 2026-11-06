// Guarda los datos de cada rubro en el navegador (localStorage).
// "Reiniciar demo" vuelve a generar exactamente los datos originales.

import { generarDatos, VERSION_DATOS } from './datos/generador.js';
import { hashTexto } from './datos/semilla.js';
import { hoyIso } from './formato.js';

const PREFIJO = 'demo-negocios:datos:';

// Memoria de respaldo por si el navegador bloquea localStorage (p. ej. modo privado estricto).
const memoria = new Map();

function leer(clave) {
  try {
    const raw = localStorage.getItem(clave);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return memoria.get(clave) ?? null;
  }
}

function escribir(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    memoria.set(clave, valor);
  }
}

export function leerPreferencia(nombre) {
  try {
    return localStorage.getItem(`demo-negocios:${nombre}`);
  } catch {
    return null;
  }
}

export function guardarPreferencia(nombre, valor) {
  try {
    localStorage.setItem(`demo-negocios:${nombre}`, valor);
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}

/** Firma de la configuración: si editas el archivo del rubro, los datos se regeneran solos. */
function firma(config) {
  return hashTexto(JSON.stringify(config)).toString(36);
}

/** Las citas que quedaron "programadas" en días pasados se cierran como atendidas. */
function cerrarPasadas(datos) {
  const hoy = hoyIso();
  for (const c of datos.citas) {
    if (c.estado === 'programada' && c.fecha < hoy) {
      c.estado = 'completada';
      c.pagado = true;
      c.metodo = c.metodo || 'tarjeta';
    }
  }
}

export function crearStore(config) {
  const clave = PREFIJO + config.id;
  const f = firma(config);
  let datos = leer(clave);

  const vigente =
    datos &&
    datos.version === VERSION_DATOS &&
    datos.firma === f &&
    (datos.modificado || datos.fechaBase === hoyIso());

  if (!vigente) datos = regenerar();
  else cerrarPasadas(datos);

  function regenerar() {
    const nuevos = generarDatos(config);
    nuevos.firma = f;
    escribir(clave, nuevos);
    return nuevos;
  }

  return {
    get datos() {
      return datos;
    },
    guardar() {
      datos.modificado = true;
      escribir(clave, datos);
    },
    reiniciar() {
      datos = regenerar();
      return datos;
    },
  };
}

/** Borra los datos guardados de todos los rubros. */
export function borrarTodo() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIJO))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    memoria.clear();
  }
}
