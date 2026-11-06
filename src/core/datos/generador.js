// Genera ~3 meses de actividad ficticia a partir de la configuración del rubro.
// Es determinista: con la misma configuración y la misma fecha produce exactamente los mismos datos.
// Las fechas son relativas a HOY, así la demo siempre se ve "viva".

import { crearAzar, hashTexto } from './semilla.js';
import { MUJERES, HOMBRES, APELLIDOS } from './nombres.js';
import * as F from '../formato.js';
import { extrasDelRubro } from '../extras.js';

export const VERSION_DATOS = 7;
/** Ventas a personas sin registro (p. ej. quien llega sin cita a la barbería). */
export const ID_DE_PASO = 'publico';

const FACTOR_DIA_SEMANA = { 0: 0.8, 1: 0.78, 2: 0.88, 3: 0.95, 4: 1.0, 5: 1.18, 6: 1.32 };
const METODOS = ['efectivo', 'tarjeta', 'transferencia'];

function telefonoFicticio(azar) {
  // Los números de abonado en México no empiezan con 0: este formato nunca corresponde a un teléfono real.
  const n = () => azar.entero(0, 9);
  return `55 0${n()}${n()}${n()} ${n()}${n()}${n()}${n()}`;
}

export function profesionalOfrece(prof, servicioId) {
  return prof.servicios === '*' || !prof.servicios || prof.servicios.includes(servicioId);
}

export function trabajaEseDia(prof, fecha) {
  return !(prof.descanso || []).includes(F.diaSemana(fecha));
}

/**
 * Horario de una fecha en minutos ({ abre, cierra }), o null si ese día no abre.
 * `horario.porDia` permite horas distintas por día, p. ej. { 6: { cierra: '14:00' } } = sábado hasta las 2 pm.
 */
export function horarioDelDia(horario, fecha) {
  const dia = F.diaSemana(fecha);
  if (!horario.dias.includes(dia)) return null;
  const h = { abre: horario.abre, cierra: horario.cierra, ...(horario.porDia?.[dia] || {}) };
  return { abre: F.aMin(h.abre), cierra: F.aMin(h.cierra) };
}

/** Cuántos equipos hay de un recurso compartido (p. ej. un solo láser). Sin recurso → sin límite. */
export function capacidadRecurso(config, recursoId) {
  if (!recursoId) return Infinity;
  return (config.recursos || []).find((r) => r.id === recursoId)?.cantidad ?? 1;
}

export function generarDatos(config) {
  const hoy = F.hoyIso();
  const ahora = F.minutosAhora();
  const sim = config.simulacion;
  const azar = crearAzar(((sim.semilla ?? 1) ^ hashTexto(config.id)) >>> 0);
  const inicio = F.sumarMeses(hoy, -(sim.meses ?? 3));
  const fin = F.sumarDias(hoy, sim.diasFuturos ?? 14);
  const totalDias = F.difDias(inicio, hoy);
  const horario = config.negocio.horario;
  const abre = F.aMin(horario.abre);
  const cierra = F.aMin(horario.cierra);
  const mesFlojo = sim.mesFlojo ? F.claveMes(F.sumarMeses(hoy, -sim.mesFlojo.haceMeses)) : null;

  const datos = {
    version: VERSION_DATOS,
    fechaBase: hoy,
    modificado: false,
    clientes: [],
    citas: [],
    ventas: [],
    gastos: [],
    extras: {},
    ajustes: { automatizaciones: {} },
  };

  // ---------- Clientes ----------
  const usados = new Set();
  const notas = sim.notasClientes || [];
  for (let i = 0; i < (sim.clientes ?? 50); i++) {
    let nombre;
    do {
      const pila = azar.prob(sim.proporcionMujeres ?? 0.5) ? MUJERES : HOMBRES;
      nombre = `${azar.elegir(pila)} ${azar.elegir(APELLIDOS)}`;
    } while (usados.has(nombre));
    usados.add(nombre);

    const r = azar.num();
    let ritmo;
    let desde = inicio;
    let hasta = fin;
    if (r < 0.2) ritmo = azar.entero(7, 14); // frecuentes
    else if (r < 0.54) ritmo = azar.entero(16, 32); // regulares
    else if (r < 0.74) ritmo = azar.entero(38, 65); // ocasionales
    else if (r < 0.91) {
      ritmo = azar.entero(12, 25); // dejaron de venir: candidatos a la promoción de inactivos
      hasta = F.sumarDias(inicio, azar.entero(6, 38));
    } else {
      ritmo = azar.entero(12, 25); // nuevos
      desde = F.sumarDias(hoy, -azar.entero(3, 26));
    }
    const alta = desde === inicio ? F.sumarDias(inicio, -azar.entero(15, 540)) : desde;
    datos.clientes.push({
      id: `cl${i + 1}`,
      nombre,
      telefono: telefonoFicticio(azar),
      alta,
      notas: notas.length && azar.prob(0.35) ? azar.elegir(notas) : '',
      _ritmo: ritmo,
      _desde: desde,
      _hasta: hasta,
      // Opcional (simulacion.afinidad): cada cliente tiene un servicio favorito que suele repetir
      ...(sim.afinidad ? { _fav: azar.ponderado(config.servicios.filter((s) => !s.soloVenta), (s) => s.demanda ?? 1).id } : {}),
    });
  }

  // ---------- Citas ----------
  const ocupacion = new Map(); // `${fecha}|${profId}` y `${fecha}|recurso:${id}` -> [[ini, fin]]
  const ultimaVisita = new Map();
  const cruces = (k, ini, dur) => (ocupacion.get(k) || []).filter(([a, b]) => ini < b && a < ini + dur).length;
  const libre = (fecha, profId, ini, serv, dia) =>
    ini >= dia.abre &&
    ini + serv.duracion <= dia.cierra &&
    !cruces(`${fecha}|${profId}`, ini, serv.duracion) &&
    (!serv.recurso || cruces(`${fecha}|recurso:${serv.recurso}`, ini, serv.duracion) < capacidadRecurso(config, serv.recurso));
  const ocupar = (fecha, profId, ini, serv) => {
    const claves = [`${fecha}|${profId}`, ...(serv.recurso ? [`${fecha}|recurso:${serv.recurso}`] : [])];
    for (const k of claves) {
      if (!ocupacion.has(k)) ocupacion.set(k, []);
      ocupacion.get(k).push([ini, ini + serv.duracion]);
    }
  };
  const servicios = config.servicios;
  const personal = config.personal;
  const yaVino = new Set(); // `${clienteId}|${tipo}`: para que la "primera consulta" sea solo la primera
  // Opcional (simulacion.respetarIntervalos): nadie repite un tratamiento con seguimiento antes de tiempo
  // (p. ej. láser cada ~5 semanas), así las fichas y los paquetes se ven realistas.
  const ultimaSesion = new Map(); // `${clienteId}|${ficha}` -> fecha
  const tipoSesion = (s) => s.ficha || s.id;
  const muyPronto = (cli, s, fecha) => {
    if (!sim.respetarIntervalos || !s.seguimientoDias) return false;
    const u = ultimaSesion.get(`${cli.id}|${tipoSesion(s)}`);
    return !!u && F.difDias(u, fecha) < s.seguimientoDias * 0.8;
  };
  let idCita = 0;

  function elegirCliente(fecha) {
    const candidatos = datos.clientes.filter((c) => {
      if (c._desde > fecha || fecha > c._hasta) return false;
      const u = ultimaVisita.get(c.id);
      return !u || Math.abs(F.difDias(u, fecha)) >= 3;
    });
    if (!candidatos.length) return null;
    return azar.ponderado(candidatos, (c) => {
      const u = ultimaVisita.get(c.id);
      const hueco = u ? Math.abs(F.difDias(u, fecha)) : c._ritmo;
      return Math.max(0.03, Math.min(4, (hueco / c._ritmo) ** 2)) / Math.sqrt(c._ritmo);
    });
  }

  for (let fecha = inicio; fecha <= fin; fecha = F.sumarDias(fecha, 1)) {
    const dia = F.diaSemana(fecha);
    const horas = horarioDelDia(horario, fecha);
    if (!horas) continue;
    const dias = F.difDias(inicio, fecha);
    let factor = (sim.factorDia || FACTOR_DIA_SEMANA)[dia] ?? 1;
    factor *= (horas.cierra - horas.abre) / (cierra - abre); // días con horario corto, menos citas
    factor *= 1 + (sim.tendencia ?? 0.06) * (dias / Math.max(1, totalDias));
    if (F.claveMes(fecha) === mesFlojo) factor *= sim.mesFlojo.factor;
    const adelante = F.difDias(hoy, fecha);
    if (adelante > 0) factor *= Math.max(0.12, 0.92 - 0.06 * adelante);

    const [min, max] = sim.citasPorDia;
    // Variación moderada alrededor del promedio: la tendencia y el mes flojo se notan más que el azar
    const n = Math.round(((min + max) / 2) * factor * azar.entre(0.86, 1.14));
    for (let k = 0; k < n; k++) {
      const prof = azar.ponderado(
        personal.filter((p) => trabajaEseDia(p, fecha)),
        (p) => p.peso ?? 1,
      );
      if (!prof) continue;
      const opciones = servicios.filter((s) => profesionalOfrece(prof, s.id) && !s.soloVenta);
      let serv = azar.ponderado(opciones, (s) => s.demanda ?? 1);
      const paso = sim.pasoMinutos ?? 30;
      const huecos = Math.floor((horas.cierra - horas.abre - serv.duracion) / paso);
      let ini = null;
      for (let intento = 0; intento < 14; intento++) {
        // Más demanda por la tarde
        const t = azar.prob(0.55) ? azar.entero(Math.floor(huecos * 0.45), huecos) : azar.entero(0, huecos);
        const candidato = horas.abre + t * paso;
        if (libre(fecha, prof.id, candidato, serv, horas)) {
          ini = candidato;
          break;
        }
      }
      if (ini === null) continue;
      const pasada = fecha < hoy || (fecha === hoy && ini + serv.duracion <= ahora);
      const dePaso = pasada && sim.sinRegistro > 0 && azar.prob(sim.sinRegistro);
      let cliente = dePaso ? { id: ID_DE_PASO } : elegirCliente(fecha);
      for (let intento = 0; sim.respetarIntervalos && cliente && !dePaso && muyPronto(cliente, serv, fecha) && intento < 6; intento++) cliente = elegirCliente(fecha);
      if (!cliente || (!dePaso && muyPronto(cliente, serv, fecha))) continue;
      // Afinidad: si el cliente tiene un favorito y este profesional lo ofrece, casi siempre pide ese
      if (sim.afinidad && cliente._fav && cliente._fav !== serv.id && azar.prob(sim.afinidad)) {
        const fav = servicios.find((s) => s.id === cliente._fav);
        if (fav && profesionalOfrece(prof, fav.id) && libre(fecha, prof.id, ini, fav, horas) && !muyPronto(cliente, fav, fecha)) serv = fav;
      }
      // Servicios de primera vez (p. ej. valoración inicial): quien ya vino recibe el servicio de seguimiento
      const tipo = serv.ficha || serv.categoria || serv.id;
      if (serv.soloPrimeraVez && yaVino.has(`${cliente.id}|${tipo}`)) {
        const alterno = servicios.find((s) => s.id === serv.soloPrimeraVez);
        if (alterno && alterno.duracion <= serv.duracion && profesionalOfrece(prof, alterno.id)) serv = alterno;
      }
      if (!dePaso) yaVino.add(`${cliente.id}|${tipo}`);

      let estado = 'programada';
      if (pasada) {
        const r = azar.num();
        estado = r < 0.045 ? 'cancelada' : r < 0.07 ? 'no-asistio' : 'completada';
      }
      const reciente = F.difDias(fecha, hoy) <= 21;
      const pagado = estado === 'completada' ? dePaso || !(reciente && azar.prob(sim.porcentajeSinPagar ?? 0.03)) : false;
      const r2 = azar.num();
      datos.citas.push({
        id: `ci${++idCita}`,
        fecha,
        hora: F.aHora(ini),
        duracion: serv.duracion,
        clienteId: cliente.id,
        servicioId: serv.id,
        profesionalId: prof.id,
        estado,
        precio: serv.precio,
        cobrado: serv.precio,
        pagado,
        metodo: estado === 'completada' ? azar.ponderado(METODOS, (m) => ({ efectivo: 0.35, tarjeta: 0.45, transferencia: 0.2 })[m]) : null,
        origen: dePaso ? 'fila' : r2 < (sim.origenWeb ?? 0.3) ? 'web' : r2 < 0.72 ? 'whatsapp' : 'recepcion',
        confirmada: estado === 'programada' ? adelante <= 1 && azar.prob(0.7) : true,
        notas: '',
      });
      if (estado !== 'cancelada') ocupar(fecha, prof.id, ini, serv);
      if (!dePaso && estado !== 'cancelada' && fecha <= hoy) ultimaVisita.set(cliente.id, fecha);
      if (sim.respetarIntervalos && !dePaso && estado !== 'cancelada') ultimaSesion.set(`${cliente.id}|${tipoSesion(serv)}`, fecha);
    }
  }
  datos.citas.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));

  // ---------- Gastos ----------
  let idGasto = 0;
  const gastos = config.gastos || {};
  for (let mes = inicio; mes <= hoy; mes = F.sumarMeses(mes, 1)) {
    const clave = F.claveMes(mes);
    const ultimo = F.diasEnMes(clave);
    for (const g of gastos.fijos || []) {
      const diasPago = Array.isArray(g.dia) ? g.dia : [g.dia ?? 1];
      for (const d of diasPago) {
        const fecha = `${clave}-${String(Math.min(d, ultimo)).padStart(2, '0')}`;
        if (fecha > hoy) continue;
        datos.gastos.push({ id: `ga${++idGasto}`, fecha, concepto: g.concepto, categoria: g.categoria, monto: g.monto, tipo: 'fijo' });
      }
    }
  }
  for (const g of gastos.variables || []) {
    let fecha = F.sumarDias(inicio, azar.entero(0, Math.max(0, g.cadaDias - 1)));
    while (fecha <= hoy) {
      let monto = azar.entre(g.rango[0], g.rango[1]);
      if (F.claveMes(fecha) === mesFlojo) monto *= 0.85;
      datos.gastos.push({
        id: `ga${++idGasto}`,
        fecha,
        concepto: g.concepto || g.categoria,
        categoria: g.categoria,
        monto: azar.redondear(monto, 10),
        tipo: 'variable',
      });
      fecha = F.sumarDias(fecha, Math.max(1, Math.round(g.cadaDias * azar.entre(0.8, 1.2))));
    }
  }
  datos.gastos.sort((a, b) => a.fecha.localeCompare(b.fecha));

  // ---------- Extras del rubro ----------
  for (const extra of extrasDelRubro(config)) {
    if (typeof extra.generar === 'function') {
      datos.extras[extra.id] = extra.generar({ datos, config, azar: azar.derivar(extra.id), hoy, ahora, inicio, fin, mesFlojo }) ?? {};
    } else {
      datos.extras[extra.id] = {};
    }
  }

  // Limpia campos internos de la simulación
  for (const c of datos.clientes) {
    delete c._ritmo;
    delete c._desde;
    delete c._hasta;
    delete c._fav;
  }
  return datos;
}
