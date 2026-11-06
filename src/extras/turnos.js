// Extra: fila de turnos para quien llega sin cita. Calcula el tiempo de espera por profesional
// combinando la fila con las citas ya agendadas. Se activa con `extras.turnos: { enFilaDemo }`.

import * as F from '../core/formato.js';
import { esc } from '../core/formato.js';
import { icono } from '../core/ui/iconos.js';
import { abrirModal, aviso, avatar, kpi, vacio, leerFormulario } from '../core/ui/ui.js';
import { buscarOCrearCliente } from '../core/citas.js';
import { profesionalOfrece, trabajaEseDia } from '../core/datos/generador.js';

const NOMBRES_FILA = ['Jorge', 'Luis', 'Emiliano', 'Santiago', 'Raúl', 'Iker', 'Gael', 'Mateo', 'Bruno', 'Rodrigo'];

/** Si el negocio está cerrado, la demo simula la hora pico para que la fila tenga sentido. */
function relojDemo(ctx) {
  const ahora = F.minutosAhora();
  const abierto = ctx.q.abiertoEl(ctx.hoy) && ahora >= ctx.q.abre && ahora < ctx.q.cierra - 30;
  return { min: abierto ? ahora : Math.min(ctx.q.cierra - 150, 18 * 60), simulado: !abierto };
}

function estadoDe(ctx) {
  const est = (ctx.datos.extras.turnos ||= { fila: [], fecha: null });
  // La fila es del día: si cambió la fecha, se arma una nueva fila de ejemplo
  if (est.fecha !== ctx.hoy) {
    const reloj = relojDemo(ctx);
    const servicios = ctx.config.servicios.filter((s) => !s.soloVenta && (s.demanda ?? 1) >= 3);
    const n = ctx.config.extras.turnos?.enFilaDemo ?? 4;
    // Nombres que no coincidan con los del personal, para no confundir
    const delPersonal = new Set(ctx.config.personal.map((p) => p.nombre.split(' ')[0]));
    const nombres = NOMBRES_FILA.filter((x) => !delPersonal.has(x));
    const preferido = ctx.config.personal[1] || ctx.config.personal[0];
    est.fila = Array.from({ length: n }, (_, i) => ({
      id: `tf${i + 1}`,
      nombre: `${nombres[(i + ctx.hoy.charCodeAt(9)) % nombres.length]} (de paso)`,
      servicioId: servicios[i % servicios.length].id,
      preferencia: i === 1 ? preferido.id : null,
      llegada: F.aHora(Math.max(ctx.q.abre, reloj.min - (n - i) * 7)),
    }));
    est.fecha = ctx.hoy;
  }
  return est;
}

/** Reparte la fila entre profesionales y estima la espera de cada persona. */
function calcularEspera(ctx) {
  const { q, config, hoy } = ctx;
  const reloj = relojDemo(ctx);
  const est = estadoDe(ctx);
  const citasHoy = ctx.datos.citas.filter((c) => c.fecha === hoy && c.estado !== 'cancelada');
  const barberos = config.personal
    .filter((p) => trabajaEseDia(p, hoy))
    .map((p) => {
      const suyas = citasHoy.filter((c) => c.profesionalId === p.id).sort((a, b) => a.hora.localeCompare(b.hora));
      const actual = suyas.find((c) => F.aMin(c.hora) <= reloj.min && reloj.min < F.aMin(c.hora) + c.duracion);
      const siguiente = suyas.find((c) => F.aMin(c.hora) > reloj.min);
      return { p, actual, siguiente, libre: actual ? F.aMin(actual.hora) + actual.duracion : reloj.min, citas: suyas, asignados: [] };
    });
  const asignacion = est.fila.map((t) => {
    const s = q.servicio(t.servicioId);
    const opciones = barberos.filter((b) => (!t.preferencia || b.p.id === t.preferencia) && profesionalOfrece(b.p, t.servicioId));
    let mejor = null;
    let inicioMejor = Infinity;
    for (const b of opciones) {
      // Busca el primer hueco libre después de "libre" que no choque con citas agendadas
      let ini = b.libre;
      for (const c of b.citas) {
        const ci = F.aMin(c.hora);
        const cf = ci + c.duracion;
        if (ini < cf && ci < ini + s.duracion) ini = cf;
      }
      if (ini < inicioMejor) {
        inicioMejor = ini;
        mejor = b;
      }
    }
    if (mejor) {
      mejor.libre = inicioMejor + s.duracion;
      mejor.asignados.push(t);
    }
    return { t, barbero: mejor, espera: mejor ? Math.max(0, inicioMejor - reloj.min) : null, inicio: inicioMejor };
  });
  return { reloj, barberos, asignacion };
}

export default {
  id: 'turnos',
  titulo: 'Fila de turnos',
  icono: 'fila',
  plan: 'crecimiento',
  descripcion: 'Fila para quien llega sin cita, con tiempo de espera estimado por profesional.',
  beneficios: ['Tiempo de espera en vivo', 'Respeta preferencias de profesional', 'Combina fila y citas agendadas', 'Se muestra en tu web pública'],

  render(el, ctx) {
    const { q, t } = ctx;
    const est = estadoDe(ctx);
    const { reloj, barberos, asignacion } = calcularEspera(ctx);
    const esperaPromedio = asignacion.length ? F.suma(asignacion, (a) => a.espera || 0) / asignacion.length : 0;
    const proxLibre = Math.min(...barberos.map((b) => b.libre));

    el.innerHTML = `
      <div class="encabezado-vista">
        <div><p class="sobretitulo">Extra del rubro${reloj.simulado ? ' · hora pico simulada' : ''}</p><h1>Fila de turnos</h1></div>
        <button type="button" class="btn btn-primario" data-agregar>${icono('agregar')} Agregar a la fila</button>
      </div>
      ${reloj.simulado ? `<p class="historia">${icono('reloj')}<span>El negocio está cerrado ahorita, así que la demo simula las <b>${F.hora12(F.aHora(reloj.min))}</b>, una hora de mucho movimiento.</span></p>` : ''}
      <div class="kpis kpis-3">
        ${kpi({ etiqueta: 'Personas en espera', valor: est.fila.length, destacado: true })}
        ${kpi({ etiqueta: 'Espera promedio', valor: `${Math.round(esperaPromedio)} min` })}
        ${kpi({ etiqueta: 'Próximo lugar libre', valor: F.hora12(F.aHora(Math.max(reloj.min, proxLibre))) })}
      </div>
      <div class="rejilla-2">
        <section class="tarjeta">
          <h2 class="tarjeta-titulo">En espera</h2>
          ${
            asignacion.length
              ? asignacion
                  .map(({ t: tu, barbero, espera }, i) => `<div class="fila-historial">
              <span class="fecha-mini"><b>${i + 1}</b><small>turno</small></span>
              <span class="fila-principal"><b>${esc(tu.nombre)}</b><small>${esc(q.servicio(tu.servicioId).nombre)} · llegó ${F.hora12(tu.llegada)}${tu.preferencia ? ` · quiere con ${esc(q.profesional(tu.preferencia).nombre.split(' ')[0])}` : ''}</small></span>
              <span class="fila-lado"><b>${espera === null ? '—' : espera === 0 ? 'Ya pasa' : `~${espera} min`}</b>${barbero ? `<small>con ${esc(barbero.p.nombre.split(' ')[0])}</small>` : ''}
                <span class="grupo-botones">${i === 0 ? `<button type="button" class="btn btn-primario btn-chico" data-pasar="${tu.id}">Pasar</button>` : ''}<button type="button" class="btn-icono" data-quitar="${tu.id}" aria-label="Quitar de la fila">${icono('cerrar')}</button></span></span>
            </div>`)
                  .join('')
              : vacio('No hay nadie esperando.', 'fila')
          }
        </section>
        <section class="tarjeta">
          <h2 class="tarjeta-titulo">${t.M('profesional', true)} ahora</h2>
          ${barberos
            .map((b) => {
              const actual = b.actual ? `${esc(q.cliente(b.actual.clienteId).nombre)} · termina ${F.hora12(F.aHora(F.aMin(b.actual.hora) + b.actual.duracion))}` : 'Disponible';
              return `<div class="fila-barra">${avatar(b.p.nombre, b.p.color, 'avatar-chico')}
                <span class="fila-principal"><b>${esc(b.p.nombre)}</b><small>${b.actual ? `${icono('tijeras')} ` : ''}${actual}</small>
                <small>${b.siguiente ? `Próxima ${t('cita')}: ${F.hora12(b.siguiente.hora)}` : `Sin ${t('cita', true)} agendadas después`}${b.asignados.length ? ` · ${b.asignados.length} de la fila` : ''}</small></span>
                <span class="chip ${b.actual ? 'chip-info' : 'chip-ok'}">${b.actual ? 'Ocupado' : 'Libre'}</span></div>`;
            })
            .join('')}
        </section>
      </div>`;

    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-agregar]')) return agregar(ctx);
      const quitar = e.target.closest('[data-quitar]');
      if (quitar) {
        est.fila = est.fila.filter((x) => x.id !== quitar.dataset.quitar);
        ctx.guardar();
        return ctx.refrescar();
      }
      const pasar = e.target.closest('[data-pasar]');
      if (pasar) {
        const { asignacion: a } = calcularEspera(ctx);
        const primero = a.find((x) => x.t.id === pasar.dataset.pasar);
        if (!primero?.barbero) return aviso('No hay quién lo atienda en este momento.', { tipo: 'error' });
        const s = q.servicio(primero.t.servicioId);
        const cliente = buscarOCrearCliente(ctx, { nombre: primero.t.nombre.replace(' (de paso)', '') });
        ctx.datos.citas.push({
          id: F.uid('ci'),
          fecha: ctx.hoy,
          hora: F.aHora(Math.round(primero.inicio / 5) * 5),
          duracion: s.duracion,
          clienteId: cliente.id,
          servicioId: s.id,
          profesionalId: primero.barbero.p.id,
          estado: 'programada',
          precio: s.precio,
          cobrado: s.precio,
          pagado: false,
          metodo: null,
          origen: 'fila',
          confirmada: true,
          notas: 'Llegó sin cita',
        });
        ctx.datos.citas.sort((x, y) => (x.fecha + x.hora).localeCompare(y.fecha + y.hora));
        est.fila = est.fila.filter((x) => x.id !== primero.t.id);
        ctx.guardar();
        aviso(`${esc(cliente.nombre)} pasa con ${esc(primero.barbero.p.nombre.split(' ')[0])}. Ya está en la agenda.`);
        ctx.refrescar();
      }
    });
  },

  hooks: {
    /** La web pública muestra la espera en vivo. */
    seccionWeb(ctx) {
      const { asignacion, reloj } = calcularEspera(ctx);
      const espera = asignacion.length ? Math.max(0, ...asignacion.map((a) => a.espera || 0)) : 0;
      return `<section class="sitio-seccion"><div class="sitio-servicio destacado" style="align-items:center">
        <div><h4>${icono('fila')} Fila en vivo</h4><p>${asignacion.length} ${asignacion.length === 1 ? 'persona' : 'personas'} esperando · espera aproximada <b>${espera} min</b>${reloj.simulado ? ' (simulado)' : ''}</p>
        <small>¿Sin tiempo para esperar? Reserva tu horario.</small></div>
        <div class="sitio-precio"><button type="button" class="btn btn-primario btn-chico" data-reservar>Reservar</button></div></div></section>`;
    },
  },
};

function agregar(ctx) {
  const { q, t, config } = ctx;
  const m = abrirModal({
    titulo: 'Agregar a la fila',
    clase: 'modal-chico',
    cuerpo: `<form class="form" id="form-fila" autocomplete="off">
      <label class="campo"><span>Nombre</span><input name="nombre" required maxlength="40" placeholder="¿Cómo se llama?"></label>
      <label class="campo"><span>${t.M('servicio')}</span><select name="servicioId">${config.servicios.filter((s) => !s.soloVenta).map((s) => `<option value="${s.id}">${esc(s.nombre)} · ${s.duracion} min</option>`).join('')}</select></label>
      <label class="campo"><span>Preferencia</span><select name="preferencia"><option value="">Con quien se desocupe primero</option>${config.personal.map((p) => `<option value="${p.id}">${esc(p.nombre)}</option>`).join('')}</select></label>
    </form>`,
    pie: `<button type="button" class="btn btn-sec" data-cerrar>Cancelar</button><button type="submit" form="form-fila" class="btn btn-primario">Agregar</button>`,
  });
  m.$('#form-fila').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = leerFormulario(e.target);
    const est = estadoDe(ctx);
    est.fila.push({ id: F.uid('tf'), nombre: v.nombre.trim(), servicioId: v.servicioId, preferencia: v.preferencia || null, llegada: F.aHora(relojDemo(ctx).min) });
    ctx.guardar();
    m.cerrar();
    const { asignacion } = calcularEspera(ctx);
    const yo = asignacion.at(-1);
    aviso(`${esc(v.nombre)} quedó en el turno ${est.fila.length}${yo?.espera != null ? `, espera aproximada de ${yo.espera} min` : ''}.`);
    ctx.refrescar();
  });
}
