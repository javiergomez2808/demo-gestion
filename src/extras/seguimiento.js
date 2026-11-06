// Extra: ficha de seguimiento por sesión (p. ej. peso o nivel de dolor) y próxima cita sugerida.
// Se activa con `extras.seguimiento: { plantillas: { tipo: [campos] }, notas: { tipo: [textos] } }`
// y en cada servicio: `ficha: 'tipo'` y `seguimientoDias: 14`.

import * as F from '../core/formato.js';
import { esc } from '../core/formato.js';
import { icono } from '../core/ui/iconos.js';
import { kpi, vacio, avatar } from '../core/ui/ui.js';
import { formularioCita } from '../core/citas.js';

const cfgDe = (ctx) => ctx.config.extras.seguimiento;
const estadoDe = (ctx) => (ctx.datos.extras.seguimiento ||= { registros: {} });

/** Sesiones con ficha de un paciente, en orden. */
function sesiones(ctx, clienteId, tipo = null) {
  const reg = estadoDe(ctx).registros;
  return ctx.datos.citas
    .filter((c) => c.clienteId === clienteId && reg[c.id] && (!tipo || reg[c.id].tipo === tipo))
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
    .map((c) => ({ cita: c, ...reg[c.id] }));
}

/** Próxima cita sugerida de cada paciente según el último servicio con seguimiento. */
function sugerencias(ctx) {
  const out = [];
  const porCliente = new Map();
  for (const c of ctx.datos.citas) {
    const s = ctx.q.servicio(c.servicioId);
    if (!s.seguimientoDias) continue;
    const r = porCliente.get(c.clienteId) || { ultima: null, proxima: null };
    if (c.estado === 'completada' && (!r.ultima || c.fecha > r.ultima.fecha)) r.ultima = c;
    if (c.estado === 'programada' && c.fecha >= ctx.hoy && (!r.proxima || c.fecha < r.proxima.fecha)) r.proxima = c;
    porCliente.set(c.clienteId, r);
  }
  for (const [clienteId, r] of porCliente) {
    if (!r.ultima) continue;
    const s = ctx.q.servicio(r.ultima.servicioId);
    const sugerida = F.sumarDias(r.ultima.fecha, s.seguimientoDias);
    out.push({ clienteId, ultima: r.ultima, proxima: r.proxima, sugerida, servicio: s, atrasado: !r.proxima && sugerida < ctx.hoy });
  }
  return out;
}

/** Línea pequeña (SVG) con la evolución de una medida. */
function minigrafica(valores, color = 'var(--primario)') {
  if (valores.length < 2) return '';
  const w = 220;
  const h = 48;
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = max - min || 1;
  const pts = valores.map((v, i) => [4 + (i * (w - 8)) / (valores.length - 1), 6 + (1 - (v - min) / rango) * (h - 12)]);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [ux, uy] = pts.at(-1);
  return `<svg class="minigrafica" viewBox="0 0 ${w} ${h}" width="100%" height="${h}" aria-hidden="true">
    <path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${ux}" cy="${uy}" r="4" fill="${color}" stroke="#fff" stroke-width="2"/></svg>`;
}

export default {
  id: 'seguimiento',
  titulo: 'Seguimiento',
  icono: 'ficha',
  plan: 'crecimiento',
  descripcion: 'Ficha clínica por sesión con medidas, notas y la próxima cita sugerida para cada paciente.',
  beneficios: ['Evolución sesión a sesión', 'Próxima cita sugerida', 'Pacientes que no regresaron', 'Notas por consulta'],

  generar({ datos, config, azar }) {
    const cfg = config.extras.seguimiento;
    const registros = {};
    const servicios = new Map(config.servicios.map((s) => [s.id, s]));
    const inicioPaciente = {};
    for (const c of datos.citas) {
      const s = servicios.get(c.servicioId);
      if (!s?.ficha || c.estado !== 'completada') continue;
      const campos = cfg.plantillas[s.ficha] || [];
      const clave = `${c.clienteId}|${s.ficha}`;
      // Cada paciente arranca en un punto distinto y mejora poco a poco (con algo de ruido)
      if (!inicioPaciente[clave]) {
        inicioPaciente[clave] = Object.fromEntries(campos.map((f) => [f.id, azar.entre(f.inicio[0], f.inicio[1])]));
      }
      const actual = inicioPaciente[clave];
      const valores = {};
      for (const f of campos) {
        valores[f.id] = Math.round(actual[f.id] * 10) / 10;
        const paso = azar.entre(f.cambio[0], f.cambio[1]);
        actual[f.id] = Math.min(f.max ?? Infinity, Math.max(f.min ?? -Infinity, actual[f.id] + paso));
      }
      registros[c.id] = { tipo: s.ficha, valores, nota: azar.elegir(cfg.notas?.[s.ficha] || ['Evolución favorable.']) };
    }
    return { registros };
  },

  render(el, ctx) {
    const { q, t, hoy } = ctx;
    const cfg = cfgDe(ctx);
    const reg = estadoDe(ctx).registros;
    const sug = sugerencias(ctx);
    // Pendientes recientes: los muy atrasados (más de 30 días) ya los cubre la promoción a inactivos
    const pendientes = sug
      .filter((s) => !s.proxima && s.sugerida <= F.sumarDias(hoy, 7) && s.sugerida >= F.sumarDias(hoy, -30))
      .sort((a, b) => a.sugerida.localeCompare(b.sugerida));
    const enSeguimiento = new Set(Object.keys(reg).map((id) => q.cita(id)?.clienteId).filter(Boolean));
    const mes = F.claveMes(hoy);
    const sesionesMes = Object.keys(reg).filter((id) => q.cita(id)?.fecha.startsWith(mes)).length;
    const conAgenda = sug.filter((s) => s.proxima).length;

    // Avances destacados por tipo de ficha: primera vs. última medición del campo principal
    const avances = [];
    for (const [tipo, campos] of Object.entries(cfg.plantillas)) {
      const principal = campos[0];
      for (const clienteId of enSeguimiento) {
        const ses = sesiones(ctx, clienteId, tipo);
        if (ses.length < 3) continue;
        const primero = ses[0].valores[principal.id];
        const delta = ses.at(-1).valores[principal.id] - primero;
        // Mejora relativa, para comparar medidas distintas (kg, dolor…)
        const mejora = ((principal.mejorEsBajar ? -delta : delta) / Math.max(1, Math.abs(primero)));
        avances.push({ clienteId, tipo, campo: principal, delta, mejora, ses });
      }
    }
    const destacados = avances.sort((a, b) => b.mejora - a.mejora).slice(0, 5);

    el.innerHTML = `
      <div class="encabezado-vista"><div><p class="sobretitulo">Extra del rubro</p><h1>Seguimiento</h1></div></div>
      <div class="kpis kpis-4">
        ${kpi({ etiqueta: `${t.M('cliente', true)} en seguimiento`, valor: enSeguimiento.size, destacado: true })}
        ${kpi({ etiqueta: 'Fichas este mes', valor: sesionesMes })}
        ${kpi({ etiqueta: 'Con próxima cita agendada', valor: F.porcentaje(sug.length ? conAgenda / sug.length : 0), nota: `${conAgenda} de ${sug.length}` })}
        ${kpi({ etiqueta: 'Por agendar (7 días)', valor: pendientes.length, nota: 'Según su próxima cita sugerida' })}
      </div>
      <div class="rejilla-2">
        <section class="tarjeta">
          <h2 class="tarjeta-titulo">${icono('calendario')} Próxima cita sugerida</h2>
          ${
            pendientes.length
              ? pendientes
                  .slice(0, 10)
                  .map((s) => {
                    const cl = q.cliente(s.clienteId);
                    return `<div class="fila-historial">${avatar(cl.nombre, null, 'avatar-chico')}
                    <span class="fila-principal"><b>${esc(cl.nombre)}</b><small>Última: ${esc(s.servicio.nombre)} ${F.relativo(s.ultima.fecha, hoy)} · sugerida ${s.atrasado ? `<span class="texto-alerta">${F.relativo(s.sugerida, hoy)}</span>` : F.relativo(s.sugerida, hoy)}</small></span>
                    <span class="fila-lado"><button type="button" class="btn btn-sec btn-chico" data-agendar="${s.clienteId}" data-fecha="${s.sugerida < hoy ? hoy : s.sugerida}" data-servicio="${s.servicio.id}" data-prof="${s.ultima.profesionalId}">Agendar</button></span></div>`;
                  })
                  .join('')
              : vacio(`Todos tus ${t('cliente', true)} tienen su siguiente ${t('cita')} agendada.`, 'ok')
          }
          <p class="ayuda">Cada ${t('servicio')} define cada cuántos días conviene volver.</p>
        </section>
        <section class="tarjeta">
          <h2 class="tarjeta-titulo">${icono('tendencia')} Avances destacados</h2>
          ${
            destacados.length
              ? destacados
                  .map((a) => {
                    const cl = q.cliente(a.clienteId);
                    const valores = a.ses.map((s) => s.valores[a.campo.id]);
                    return `<a class="fila-historial" href="#/clientes/${a.clienteId}">
                    <span class="fila-principal"><b>${esc(cl.nombre)}</b><small>${esc(a.campo.etiqueta)}: ${F.numero(valores[0])} → ${F.numero(valores.at(-1))} ${esc(a.campo.unidad || '')} en ${a.ses.length} sesiones</small>${minigrafica(valores)}</span>
                    <span class="fila-lado"><span class="chip chip-ok">${a.delta > 0 ? '+' : ''}${F.numero(a.delta)} ${esc(a.campo.unidad || '')}</span></span></a>`;
                  })
                  .join('')
              : vacio('Aún no hay suficientes sesiones para mostrar avances.')
          }
        </section>
      </div>`;

    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-agendar]');
      if (b) formularioCita(ctx, { clienteId: b.dataset.agendar, fecha: b.dataset.fecha, servicioId: b.dataset.servicio, profesionalId: b.dataset.prof, alGuardar: () => ctx.refrescar() });
    });
  },

  hooks: {
    fichaCliente(cliente, ctx) {
      const cfg = cfgDe(ctx);
      const sug = sugerencias(ctx).find((s) => s.clienteId === cliente.id);
      const bloques = Object.entries(cfg.plantillas)
        .map(([tipo, campos]) => {
          const ses = sesiones(ctx, cliente.id, tipo);
          if (!ses.length) return '';
          const principal = campos[0];
          return `<div class="seg-bloque">
            <p class="sobretitulo">${esc(cfg.nombres?.[tipo] || tipo)} · ${esc(principal.etiqueta)}</p>
            ${minigrafica(ses.map((s) => s.valores[principal.id]))}
            <div class="tabla-scroll"><table class="tabla tabla-compacta">
              <thead><tr><th>Fecha</th>${campos.map((f) => `<th>${esc(f.etiqueta)}</th>`).join('')}<th>Nota</th></tr></thead>
              <tbody>${ses
                .slice()
                .reverse()
                .map((s) => `<tr><td>${F.fechaCorta(s.cita.fecha)}</td>${campos.map((f) => `<td>${F.numero(s.valores[f.id])}${esc(f.unidad ? ` ${f.unidad}` : '')}</td>`).join('')}<td class="texto-sec">${esc(s.nota || '')}</td></tr>`)
                .join('')}</tbody>
            </table></div></div>`;
        })
        .join('');
      if (!bloques && !sug) return '';
      return `<section class="tarjeta">
        <h2 class="tarjeta-titulo">${icono('ficha')} Ficha de seguimiento</h2>
        ${sug ? `<div class="nota-linea">${icono('calendario')}<span>Próxima ${ctx.t('cita')} sugerida: <b>${F.capital(F.fechaLarga(sug.sugerida))}</b>${sug.proxima ? ` · ya agendada para el ${F.fechaCorta(sug.proxima.fecha)}` : sug.atrasado ? ' · <span class="texto-alerta">pendiente de agendar</span>' : ''}</span></div>` : ''}
        ${bloques}
      </section>`;
    },
    detalleCita(cita, ctx) {
      const r = estadoDe(ctx).registros[cita.id];
      if (!r) return '';
      const campos = cfgDe(ctx).plantillas[r.tipo] || [];
      return `<div class="nota-linea">${icono('ficha')}<span>${campos.map((f) => `${esc(f.etiqueta)}: <b>${F.numero(r.valores[f.id])}${esc(f.unidad ? ` ${f.unidad}` : '')}</b>`).join(' · ')}${r.nota ? `<br>${esc(r.nota)}` : ''}</span></div>`;
    },
    /** Al atender, se llena la ficha de la sesión. */
    camposCobro(cita, ctx) {
      const s = ctx.q.servicio(cita.servicioId);
      if (!s.ficha) return '';
      const campos = cfgDe(ctx).plantillas[s.ficha] || [];
      const previas = sesiones(ctx, cita.clienteId, s.ficha);
      const ultima = previas.at(-1);
      return `<fieldset class="campo"><legend>Ficha de la sesión</legend>
        <div class="campos-2">${campos
          .map((f) => `<label class="campo"><span>${esc(f.etiqueta)}${f.unidad ? ` (${esc(f.unidad)})` : ''}</span><input name="seg_${f.id}" type="number" step="0.1" inputmode="decimal" value="${ultima ? ultima.valores[f.id] : ''}"></label>`)
          .join('')}</div>
        <label class="campo" style="margin-top:10px"><span>Nota de la sesión</span><input name="seg_nota" maxlength="140" placeholder="Ej. buena adherencia al plan"></label>
        <p class="ayuda">Próxima ${ctx.t('cita')} sugerida: ${F.fechaCorta(F.sumarDias(cita.fecha, s.seguimientoDias || 14))}</p>
      </fieldset>`;
    },
    alCobrar(cita, form, ctx) {
      const s = ctx.q.servicio(cita.servicioId);
      if (!s.ficha) return;
      const campos = cfgDe(ctx).plantillas[s.ficha] || [];
      const valores = {};
      for (const f of campos) if (form[`seg_${f.id}`] !== '' && form[`seg_${f.id}`] != null) valores[f.id] = Number(form[`seg_${f.id}`]);
      if (Object.keys(valores).length) estadoDe(ctx).registros[cita.id] = { tipo: s.ficha, valores, nota: form.seg_nota || '' };
    },
  },
};
