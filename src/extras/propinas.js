// Extra: propinas por profesional. Se registran al cobrar y se entregan completas (no son ingreso del negocio).
// Se activa con `extras.propinas: { probabilidad, rango: [min, max] }` en la configuración del rubro.

import * as F from '../core/formato.js';
import { esc } from '../core/formato.js';
import { avatar, kpi } from '../core/ui/ui.js';

let periodo = 'mes';

export default {
  id: 'propinas',
  titulo: 'Propinas',
  icono: 'dinero',
  plan: 'crecimiento',
  descripcion: 'Registra las propinas al cobrar y entrega a cada quien lo suyo, sin cuentas a mano.',
  beneficios: ['Propina por servicio', 'Total por profesional', 'Se suma al corte de comisiones', 'Promedio y tendencia'],

  generar({ datos, config, azar }) {
    const cfg = config.extras.propinas || {};
    const [min, max] = cfg.rango || [0.08, 0.2];
    for (const c of datos.citas) {
      if (c.estado !== 'completada' || !azar.prob(cfg.probabilidad ?? 0.6)) continue;
      c.propina = Math.max(10, azar.redondear(c.precio * azar.entre(min, max), 10));
    }
    return {};
  },

  render(el, ctx) {
    const { q, t, hoy } = ctx;
    const clave = F.claveMes(hoy);
    const rangos = {
      semana: { nombre: 'Esta semana', desde: F.inicioSemana(hoy), hasta: hoy },
      mes: { nombre: 'Este mes', desde: `${clave}-01`, hasta: hoy },
      mesAnterior: { nombre: F.capital(F.mesSolo(F.claveMes(F.sumarMeses(hoy, -1)))), desde: F.sumarMeses(hoy, -1), hasta: F.ultimoDiaMes(F.claveMes(F.sumarMeses(hoy, -1))) },
    };
    const r = rangos[periodo];
    const citas = ctx.datos.citas.filter((c) => c.estado === 'completada' && c.fecha >= r.desde && c.fecha <= r.hasta);
    const conPropina = citas.filter((c) => c.propina > 0);
    const total = F.suma(conPropina, (c) => c.propina);
    const porProf = ctx.config.personal
      .map((p) => {
        const suyas = citas.filter((c) => c.profesionalId === p.id);
        const pr = suyas.filter((c) => c.propina > 0);
        return { p, servicios: suyas.length, conPropina: pr.length, total: F.suma(pr, (c) => c.propina), venta: F.suma(suyas, (c) => c.precio) };
      })
      .sort((a, b) => b.total - a.total);
    const max = Math.max(1, ...porProf.map((x) => x.total));

    el.innerHTML = `
      <div class="encabezado-vista"><div><p class="sobretitulo">Extra del rubro</p><h1>Propinas</h1></div></div>
      <div class="filtros">${Object.entries(rangos).map(([k, v]) => `<button type="button" class="filtro ${k === periodo ? 'activo' : ''}" data-periodo="${k}">${esc(v.nombre)}</button>`).join('')}</div>
      <div class="kpis kpis-3">
        ${kpi({ etiqueta: 'Propinas recibidas', valor: F.dinero(total), destacado: true })}
        ${kpi({ etiqueta: `${t.M('servicio', true)} con propina`, valor: F.porcentaje(citas.length ? conPropina.length / citas.length : 0), nota: `${conPropina.length} de ${citas.length}` })}
        ${kpi({ etiqueta: 'Propina promedio', valor: F.dinero(conPropina.length ? total / conPropina.length : 0), nota: `${F.porcentaje(total / Math.max(1, F.suma(conPropina, (c) => c.precio)))} del ticket` })}
      </div>
      <section class="tarjeta">
        <h2 class="tarjeta-titulo">Por ${t('profesional')}</h2>
        ${porProf
          .map((x) => `<div class="fila-barra">${avatar(x.p.nombre, x.p.color, 'avatar-chico')}
            <span class="fila-principal"><b>${esc(x.p.nombre)}</b><small>${x.conPropina} de ${x.servicios} ${t('servicio', true)} dejaron propina</small>
            <span class="barra-fina"><i style="width:${(x.total / max) * 100}%;--c:${x.p.color}"></i></span></span>
            <b>${F.dinero(x.total)}</b></div>`)
          .join('')}
        <p class="ayuda">Las propinas se entregan completas a cada ${t('profesional')} y aparecen en su corte de Comisiones.</p>
      </section>
      <section class="tarjeta">
        <h2 class="tarjeta-titulo">Últimas propinas</h2>
        <div class="tabla-scroll"><table class="tabla">
          <thead><tr><th>Fecha</th><th>${t.M('profesional')}</th><th>${t.M('servicio')}</th><th>Propina</th></tr></thead>
          <tbody>${conPropina
            .slice(-12)
            .reverse()
            .map((c) => `<tr><td>${F.fechaCorta(c.fecha)} · ${F.hora12(c.hora)}</td><td>${esc(q.profesional(c.profesionalId).nombre.split(' ')[0])}</td><td>${esc(q.servicio(c.servicioId).nombre)}</td><td><b>${F.dinero(c.propina)}</b></td></tr>`)
            .join('')}</tbody>
        </table></div>
      </section>`;

    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-periodo]');
      if (b) {
        periodo = b.dataset.periodo;
        ctx.refrescar();
      }
    });
  },

  hooks: {
    camposCobro(cita) {
      const base = cita.precio || 0;
      const sugeridas = [0.1, 0.15, 0.2].map((p) => Math.round((base * p) / 10) * 10);
      return `<fieldset class="campo"><legend>Propina (opcional)</legend>
        <div class="opciones">
          <label class="opcion"><input type="radio" name="propina" value="0" checked><span>Sin propina</span></label>
          ${sugeridas.map((m) => `<label class="opcion"><input type="radio" name="propina" value="${m}"><span>${F.dinero(m)}</span></label>`).join('')}
        </div></fieldset>`;
    },
    alCobrar(cita, form) {
      const p = Number(form.propina || 0);
      if (p > 0) cita.propina = p;
    },
    detalleCita(cita) {
      return cita.propina ? `<div class="nota-linea"><span>Propina: <b>${F.dinero(cita.propina)}</b></span></div>` : '';
    },
    /** Se suman al corte de cada profesional como "a entregar" (no forman parte de la comisión). */
    comisiones({ desde, hasta }, ctx) {
      const porProf = {};
      for (const c of ctx.datos.citas) {
        if (c.estado !== 'completada' || !c.propina || c.fecha < desde || c.fecha > hasta) continue;
        porProf[c.profesionalId] = (porProf[c.profesionalId] || 0) + c.propina;
      }
      return Object.entries(porProf).map(([profesionalId, monto]) => ({ profesionalId, concepto: 'Propinas', monto, sumaAComision: false, detalle: '(se entregan completas)' }));
    },
  },
};
