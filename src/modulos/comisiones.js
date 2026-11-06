// Comisiones: cuánto le toca a cada profesional por quincena o por mes.

import * as F from '../core/formato.js';
import { esc } from '../core/formato.js';
import { icono } from '../core/ui/iconos.js';
import { aviso, avatar, kpi } from '../core/ui/ui.js';

let periodo = 'quincena';

function rangos(hoy) {
  const clave = F.claveMes(hoy);
  const previo = F.claveMes(F.sumarMeses(hoy, -1));
  const dia = Number(hoy.slice(8));
  const primera = dia <= 15;
  return {
    quincena: { nombre: 'Esta quincena', desde: primera ? `${clave}-01` : `${clave}-16`, hasta: hoy },
    quincenaAnterior: primera
      ? { nombre: 'Quincena anterior', desde: `${previo}-16`, hasta: F.ultimoDiaMes(previo) }
      : { nombre: 'Quincena anterior', desde: `${clave}-01`, hasta: `${clave}-15` },
    mes: { nombre: 'Este mes', desde: `${clave}-01`, hasta: hoy },
    mesAnterior: { nombre: F.capital(F.mesSolo(previo)), desde: `${previo}-01`, hasta: F.ultimoDiaMes(previo) },
  };
}

export default {
  id: 'comisiones',
  orden: 5,
  plan: 'control',
  grupo: 'dinero',
  icono: 'porcentaje',
  titulo: 'Comisiones',
  descripcion: 'Calcula solo la comisión de cada profesional por quincena o por mes, sin hojas de cálculo.',
  beneficios: ['Comisión por servicio y por venta', 'Cortes por quincena', 'Detalle por profesional', 'Sin errores de cálculo'],

  render(el, ctx) {
    const { q, t, hoy } = ctx;
    const r = rangos(hoy);
    const sel = r[periodo];
    const filas = q.comisiones(sel.desde, sel.hasta).sort((a, b) => b.comision - a.comision);
    const entregar = (f) => f.comision + F.suma(f.extras.filter((e) => e.sumaAComision === false), (e) => e.monto);
    const total = F.suma(filas, entregar);
    const ventas = F.suma(filas, (f) => f.base);

    el.innerHTML = `
      <div class="encabezado-vista">
        <div><p class="sobretitulo">${F.fechaCorta(sel.desde)} – ${F.fechaCorta(sel.hasta)}</p><h1>Comisiones</h1></div>
      </div>
      <div class="filtros" role="tablist">
        ${Object.entries(r).map(([k, v]) => `<button type="button" role="tab" class="filtro ${k === periodo ? 'activo' : ''}" data-periodo="${k}">${esc(v.nombre)}</button>`).join('')}
      </div>
      <div class="kpis kpis-3">
        ${kpi({ etiqueta: 'Total a pagar', valor: F.dinero(total), destacado: true })}
        ${kpi({ etiqueta: `Venta en ${t('servicio', true)}`, valor: F.dinero(ventas) })}
        ${kpi({ etiqueta: `${t.M('cita', true)} atendidas`, valor: F.numero(F.suma(filas, (f) => f.citas)) })}
      </div>
      <div class="rejilla-tarjetas">
        ${filas
          .map((f) => {
            const p = f.profesional;
            return `<article class="tarjeta tarjeta-persona">
            <header>${avatar(p.nombre, p.color)}<div><h2>${esc(p.nombre)}</h2><small class="texto-sec">${esc(p.puesto || t.M('profesional'))} · ${F.porcentaje(p.comision)} por ${t('servicio')}</small></div></header>
            <dl class="lista-datos">
              <div><dt>${t.M('cita', true)} atendidas</dt><dd>${f.citas} <small class="texto-sec">(${F.numero(f.horas)} h)</small></dd></div>
              <div><dt>Venta en ${t('servicio', true)}</dt><dd>${F.dinero(f.base)}</dd></div>
              <div><dt>Comisión por ${t('servicio', true)}</dt><dd>${F.dinero(f.base * p.comision)}</dd></div>
              ${f.extras.map((e) => `<div><dt>${esc(e.concepto)}</dt><dd>${F.dinero(e.monto)}${e.detalle ? ` <small class="texto-sec">${esc(e.detalle)}</small>` : ''}</dd></div>`).join('')}
            </dl>
            <footer><span>Total a entregar</span><b>${F.dinero(entregar(f))}</b></footer>
            <button type="button" class="btn btn-sec btn-bloque" data-pagar="${esc(p.nombre)}">${icono('ok')} Marcar como pagado</button>
          </article>`;
          })
          .join('')}
      </div>`;

    el.addEventListener('click', (e) => {
      const p = e.target.closest('[data-periodo]');
      if (p) {
        periodo = p.dataset.periodo;
        return ctx.refrescar();
      }
      const b = e.target.closest('[data-pagar]');
      if (b) {
        b.disabled = true;
        b.innerHTML = `${icono('ok')} Pagado`;
        aviso(`Pago de comisión a ${esc(b.dataset.pagar)} registrado (simulado)`);
      }
    });
  },
};
