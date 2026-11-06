// Cálculos del negocio que comparten todos los módulos: disponibilidad, resumen de clientes, finanzas y comisiones.

import * as F from './formato.js';
import { crearVocab } from './vocab.js';
import { profesionalOfrece, trabajaEseDia, horarioDelDia, capacidadRecurso, ID_DE_PASO } from './datos/generador.js';

export function crearConsultas(config, getDatos, hook) {
  const servicios = new Map(config.servicios.map((s) => [s.id, s]));
  const personal = new Map(config.personal.map((p) => [p.id, p]));
  const D = () => getDatos();
  const vocab = crearVocab(config);
  const horario = config.negocio.horario;
  const abre = F.aMin(horario.abre);
  const cierra = F.aMin(horario.cierra);

  const q = {
    abre,
    cierra,
    servicio: (id) => servicios.get(id) || { id, nombre: 'Servicio', precio: 0, duracion: 30, insumos: 0 },
    profesional: (id) => personal.get(id) || { id, nombre: '—', comision: 0, color: '#999' },
    cliente: (id) =>
      id === ID_DE_PASO
        ? { id, nombre: 'Cliente de paso', telefono: '', dePaso: true }
        : D().clientes.find((c) => c.id === id) || { id, nombre: 'Cliente', telefono: '', dePaso: true },
    cita: (id) => D().citas.find((c) => c.id === id),
    abiertoEl: (fecha) => horario.dias.includes(F.diaSemana(fecha)),
    profesionalesPara: (servicioId, fecha) =>
      config.personal.filter((p) => profesionalOfrece(p, servicioId) && (!fecha || trabajaEseDia(p, fecha))),

    /** Citas que ocupan agenda (no canceladas). */
    citasActivas: (fecha) => D().citas.filter((c) => c.fecha === fecha && c.estado !== 'cancelada'),

    /** Horario de esa fecha en minutos, o null si cierra (respeta `horario.porDia`). */
    horasDelDia: (fecha) => horarioDelDia(horario, fecha),

    /** Citas que ya usan el equipo compartido de un servicio (p. ej. el único láser) en ese rango. */
    usoDeRecurso({ fecha, ini, duracion, servicioId, ignorarId = null, citas = null }) {
      const rec = q.servicio(servicioId).recurso;
      if (!rec) return { lleno: false };
      const usan = (citas || q.citasActivas(fecha)).filter(
        (c) => c.id !== ignorarId && c.fecha === fecha && c.estado !== 'cancelada' && q.servicio(c.servicioId).recurso === rec && ini < F.aMin(c.hora) + c.duracion && F.aMin(c.hora) < ini + duracion,
      );
      const nombre = (config.recursos || []).find((r) => r.id === rec)?.nombre || 'el equipo';
      return { lleno: usan.length >= capacidadRecurso(config, rec), nombre, citas: usan };
    },

    /** Por qué no se puede poner una cita en ese lugar ('' si sí se puede). */
    motivoNoDisponible({ fecha, hora, duracion, profesionalId, servicioId, id }) {
      const dia = q.horasDelDia(fecha);
      const ini = F.aMin(hora);
      if (!dia) return 'El negocio no abre ese día.';
      if (ini < dia.abre || ini + duracion > dia.cierra) return `Ese día se atiende de ${F.hora12(F.aHora(dia.abre))} a ${F.hora12(F.aHora(dia.cierra))}.`;
      if (q.hayConflicto({ fecha, hora, duracion, profesionalId, id })) return `Ese horario se cruza con otra ${vocab('cita')} de ${q.profesional(profesionalId).nombre}.`;
      const rec = q.usoDeRecurso({ fecha, ini, duracion, servicioId, ignorarId: id });
      if (rec.lleno) return `${F.capital(rec.nombre)} ya está ocupado a esa hora.`;
      return '';
    },

    hayConflicto({ fecha, hora, duracion, profesionalId, id }) {
      const ini = F.aMin(hora);
      return D().citas.find(
        (c) =>
          c.id !== id &&
          c.fecha === fecha &&
          c.profesionalId === profesionalId &&
          c.estado !== 'cancelada' &&
          ini < F.aMin(c.hora) + c.duracion &&
          F.aMin(c.hora) < ini + duracion,
      );
    },

    /** Horarios libres para un servicio en una fecha. profesionalId = null → cualquiera. */
    horariosLibres({ fecha, servicioId, profesionalId = null, ignorarId = null, paso = 30 }) {
      const dia = q.horasDelDia(fecha);
      if (!dia) return [];
      const serv = q.servicio(servicioId);
      const profs = profesionalId ? [q.profesional(profesionalId)] : q.profesionalesPara(servicioId, fecha);
      const citas = D().citas.filter((c) => c.fecha === fecha && c.estado !== 'cancelada' && c.id !== ignorarId);
      const hoy = F.hoyIso();
      const ahora = F.minutosAhora();
      const out = [];
      for (let t = dia.abre; t + serv.duracion <= dia.cierra; t += paso) {
        if (fecha < hoy || (fecha === hoy && t < ahora + 10)) continue;
        if (q.usoDeRecurso({ fecha, ini: t, duracion: serv.duracion, servicioId, ignorarId, citas }).lleno) continue;
        const libres = profs.filter(
          (p) =>
            trabajaEseDia(p, fecha) &&
            !citas.some((c) => c.profesionalId === p.id && t < F.aMin(c.hora) + c.duracion && F.aMin(c.hora) < t + serv.duracion),
        );
        if (libres.length) out.push({ hora: F.aHora(t), profesionales: libres.map((p) => p.id) });
      }
      return out;
    },

    // ---------- Clientes ----------
    resumenClientes() {
      const hoy = F.hoyIso();
      const mapa = new Map(
        D().clientes.map((c) => [
          c.id,
          { visitas: 0, gasto: 0, ultima: null, proxima: null, recientes: 0, servicios: {}, profesionales: {}, saldo: 0 },
        ]),
      );
      const hace90 = F.sumarDias(hoy, -90);
      for (const c of D().citas) {
        const r = mapa.get(c.clienteId);
        if (!r) continue;
        if (c.estado === 'completada') {
          r.visitas++;
          r.gasto += c.cobrado || 0;
          if (!r.ultima || c.fecha > r.ultima) r.ultima = c.fecha;
          if (c.fecha >= hace90) r.recientes++;
          r.servicios[c.servicioId] = (r.servicios[c.servicioId] || 0) + 1;
          r.profesionales[c.profesionalId] = (r.profesionales[c.profesionalId] || 0) + 1;
          if (!c.pagado && c.cobrado > 0) r.saldo += c.cobrado;
        } else if (c.estado === 'programada' && c.fecha >= hoy) {
          if (!r.proxima || c.fecha + c.hora < r.proxima.fecha + r.proxima.hora) r.proxima = c;
        }
      }
      for (const v of D().ventas) {
        const r = mapa.get(v.clienteId);
        if (!r) continue;
        r.gasto += v.monto;
        r.saldo += Math.max(0, v.monto - v.pagado);
      }
      const clientes = new Map(D().clientes.map((c) => [c.id, c]));
      // "Frecuente" es relativo al negocio: el 30% que más vino en los últimos 90 días (mínimo 4 visitas)
      const recientes = [...mapa.values()].map((r) => r.recientes).filter(Boolean).sort((a, b) => a - b);
      const umbral = Math.max(4, recientes[Math.floor(recientes.length * 0.7)] || 0);
      for (const [id, r] of mapa) {
        const c = clientes.get(id);
        r.ticket = r.visitas ? r.gasto / r.visitas : 0;
        r.diasSinVenir = r.ultima ? F.difDias(r.ultima, hoy) : null;
        r.servicioFavorito = masFrecuente(r.servicios);
        r.profesionalFavorito = masFrecuente(r.profesionales);
        r.segmento =
          F.difDias(c.alta, hoy) <= 30
            ? 'nuevo'
            : !r.proxima && (r.diasSinVenir === null || r.diasSinVenir > 45)
              ? 'inactivo'
              : r.recientes >= umbral
                ? 'frecuente'
                : 'regular';
      }
      return mapa;
    },

    // ---------- Finanzas ----------
    /** Ingresos facturados (servicios atendidos + ventas) en un rango. */
    ingresos(desde, hasta) {
      let servicios = 0;
      let atendidas = 0;
      for (const c of D().citas) {
        if (c.estado !== 'completada' || c.fecha < desde || c.fecha > hasta) continue;
        servicios += c.cobrado || 0;
        atendidas++;
      }
      const porTipo = {};
      for (const v of D().ventas) {
        if (v.fecha < desde || v.fecha > hasta) continue;
        porTipo[v.tipo] = (porTipo[v.tipo] || 0) + v.monto;
      }
      const ventas = F.suma(Object.values(porTipo));
      return { servicios, ventas, porTipo, total: servicios + ventas, atendidas };
    },

    /** Comisiones por profesional (servicios + lo que aporten los extras, p. ej. venta de productos). */
    comisiones(desde, hasta) {
      const filas = new Map(config.personal.map((p) => [p.id, { profesional: p, citas: 0, base: 0, comision: 0, horas: 0, extras: [] }]));
      for (const c of D().citas) {
        if (c.estado !== 'completada' || c.fecha < desde || c.fecha > hasta) continue;
        const f = filas.get(c.profesionalId);
        if (!f) continue;
        f.citas++;
        f.base += c.precio;
        f.comision += c.precio * (f.profesional.comision || 0);
        f.horas += c.duracion / 60;
      }
      for (const lista of hook('comisiones', { desde, hasta })) {
        for (const e of lista || []) {
          const f = filas.get(e.profesionalId);
          if (!f) continue;
          f.extras.push(e);
          if (e.sumaAComision !== false) f.comision += e.monto;
        }
      }
      return [...filas.values()];
    },

    gastosRegistrados: (desde, hasta) => D().gastos.filter((g) => g.fecha >= desde && g.fecha <= hasta),

    /** Estado de resultados del periodo: ingresos, gastos (incluye comisiones) y utilidad. */
    resultado(desde, hasta) {
      const ing = q.ingresos(desde, hasta);
      const gastos = q.gastosRegistrados(desde, hasta);
      const comisiones = F.suma(q.comisiones(desde, hasta), (f) => f.comision);
      const porCategoria = {};
      for (const g of gastos) porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + g.monto;
      if (comisiones) porCategoria.Comisiones = (porCategoria.Comisiones || 0) + comisiones;
      const totalGastos = F.suma(Object.values(porCategoria));
      return {
        ingresos: ing.total,
        ingresosServicios: ing.servicios,
        ingresosVentas: ing.ventas,
        ventasPorTipo: ing.porTipo,
        atendidas: ing.atendidas,
        ticket: ing.atendidas ? ing.servicios / ing.atendidas : 0,
        gastos: totalGastos,
        porCategoria,
        comisiones,
        utilidad: ing.total - totalGastos,
        margen: ing.total ? (ing.total - totalGastos) / ing.total : 0,
      };
    },

    /** Ganancia por servicio: precio − comisión − insumos, también por hora de trabajo. */
    rentabilidad(desde, hasta) {
      const filas = new Map();
      for (const c of D().citas) {
        if (c.estado !== 'completada' || c.fecha < desde || c.fecha > hasta) continue;
        const s = q.servicio(c.servicioId);
        const p = q.profesional(c.profesionalId);
        if (!filas.has(s.id)) filas.set(s.id, { servicio: s, cantidad: 0, ingresos: 0, comision: 0, insumos: 0, minutos: 0 });
        const f = filas.get(s.id);
        f.cantidad++;
        f.ingresos += c.precio;
        f.comision += c.precio * (p.comision || 0);
        f.insumos += s.insumos || 0;
        f.minutos += c.duracion;
      }
      return [...filas.values()]
        .map((f) => {
          const ganancia = f.ingresos - f.comision - f.insumos;
          return { ...f, ganancia, margen: f.ingresos ? ganancia / f.ingresos : 0, porHora: f.minutos ? ganancia / (f.minutos / 60) : 0 };
        })
        .sort((a, b) => b.ganancia - a.ganancia);
    },

    /** Lo que los clientes deben: servicios sin pagar y saldos de ventas (p. ej. paquetes en abonos). */
    cuentasPorCobrar() {
      const hoy = F.hoyIso();
      const out = [];
      for (const c of D().citas) {
        if (c.estado === 'completada' && !c.pagado && c.cobrado > 0) {
          out.push({ tipo: 'cita', id: c.id, clienteId: c.clienteId, concepto: q.servicio(c.servicioId).nombre, fecha: c.fecha, saldo: c.cobrado, dias: F.difDias(c.fecha, hoy) });
        }
      }
      for (const v of D().ventas) {
        const saldo = v.monto - v.pagado;
        if (saldo > 0) out.push({ tipo: 'venta', id: v.id, clienteId: v.clienteId, concepto: v.concepto, fecha: v.fecha, saldo, dias: F.difDias(v.fecha, hoy) });
      }
      return out.sort((a, b) => b.dias - a.dias);
    },

    /** Saldo de caja día por día: entradas cobradas − gastos − comisiones (pagadas el 15 y fin de mes). */
    flujoDiario(desde, hasta) {
      const entradas = new Map();
      const salidas = new Map();
      const sumar = (m, f, n) => m.set(f, (m.get(f) || 0) + n);
      for (const c of D().citas) if (c.estado === 'completada' && c.pagado) sumar(entradas, c.fecha, c.cobrado || 0);
      for (const v of D().ventas) sumar(entradas, v.fecha, v.pagado || 0);
      for (const g of D().gastos) sumar(salidas, g.fecha, g.monto);
      // Comisiones: se pagan por quincena
      let ini = F.primerDiaMes(desde);
      while (ini <= hasta) {
        const clave = F.claveMes(ini);
        const q15 = `${clave}-15`;
        const fin = F.ultimoDiaMes(clave);
        for (const [a, b] of [[ini, q15], [`${clave}-16`, fin]]) {
          if (b > F.hoyIso()) continue;
          const monto = F.suma(q.comisiones(a, b), (f) => f.comision);
          sumar(salidas, b, monto);
        }
        ini = F.sumarMeses(ini, 1);
      }
      let saldo = config.simulacion.saldoInicial || 0;
      const dias = [];
      for (const fecha of F.rangoFechas(desde, hasta)) {
        const e = entradas.get(fecha) || 0;
        const s = salidas.get(fecha) || 0;
        saldo += e - s;
        dias.push({ fecha, entradas: e, salidas: s, saldo });
      }
      return dias;
    },
  };
  return q;
}

function masFrecuente(obj) {
  let mejor = null;
  let n = 0;
  for (const [k, v] of Object.entries(obj)) if (v > n) [mejor, n] = [k, v];
  return mejor;
}
