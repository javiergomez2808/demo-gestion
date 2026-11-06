// Extra: control de insumos (inventario). Calcula el consumo con base en los servicios realizados
// y avisa qué está por agotarse. Se activa con `extras.insumos: [ { id, nombre, unidad, stock, minimo, costo, consumo } ]`.

import * as F from '../core/formato.js';
import { esc } from '../core/formato.js';
import { icono } from '../core/ui/iconos.js';
import { abrirModal, aviso, kpi, leerFormulario } from '../core/ui/ui.js';

const estadoDe = (ctx) => (ctx.datos.extras.insumos ||= { items: structuredClone(ctx.config.extras.insumos) });
const fmtCant = (n) => F.numero(Math.round(n * 10) / 10);

function consumoSemanal(ctx, item) {
  const desde = F.sumarDias(ctx.hoy, -28);
  let total = 0;
  for (const c of ctx.datos.citas) {
    if (c.estado !== 'completada' || c.fecha < desde) continue;
    total += item.consumo?.[c.servicioId] || 0;
  }
  return total / 4;
}

export default {
  id: 'insumos',
  titulo: 'Insumos',
  icono: 'inventario',
  plan: 'crecimiento',
  descripcion: 'Inventario de insumos con consumo calculado por servicio y alertas antes de que se acaben.',
  beneficios: ['Consumo real por servicio', 'Alertas de stock mínimo', 'Cuánto te dura cada insumo', 'Costo de insumos por servicio'],

  generar({ config }) {
    return { items: structuredClone(config.extras.insumos) };
  },

  render(el, ctx) {
    const { t, config } = ctx;
    const items = estadoDe(ctx).items.map((it) => {
      const semanal = consumoSemanal(ctx, it);
      const dias = semanal > 0 ? (it.stock / semanal) * 7 : Infinity;
      const estado = it.stock <= 0 ? 'agotado' : it.stock <= it.minimo || dias < 10 ? 'bajo' : 'ok';
      return { it, semanal, dias, estado };
    });
    const bajos = items.filter((x) => x.estado !== 'ok');
    const valor = F.suma(items, (x) => x.it.stock * x.it.costo);
    const desde = F.sumarDias(ctx.hoy, -30);
    const costoMes = F.suma(ctx.datos.citas.filter((c) => c.estado === 'completada' && c.fecha >= desde), (c) => ctx.q.servicio(c.servicioId).insumos || 0);
    const servicios = config.servicios.filter((s) => !s.soloVenta && s.insumos).sort((a, b) => b.insumos / b.precio - a.insumos / a.precio);

    el.innerHTML = `
      <div class="encabezado-vista">
        <div><p class="sobretitulo">Extra del rubro</p><h1>Insumos</h1></div>
      </div>
      <div class="kpis kpis-3">
        ${kpi({ etiqueta: 'Por agotarse', valor: bajos.length, nota: bajos.length ? bajos.map((x) => x.it.nombre).slice(0, 2).join(', ') : 'Todo en orden' })}
        ${kpi({ etiqueta: 'Valor del inventario', valor: F.dinero(valor) })}
        ${kpi({ etiqueta: 'Insumos usados (30 días)', valor: F.dinero(costoMes), nota: `Según los ${t('servicio', true)} atendidos` })}
      </div>
      <section class="tarjeta">
        <h2 class="tarjeta-titulo">Inventario</h2>
        <div class="tabla-scroll"><table class="tabla">
          <thead><tr><th>Insumo</th><th>En existencia</th><th>Uso por semana</th><th>Alcanza para</th><th></th></tr></thead>
          <tbody>${items
            .map(({ it, semanal, dias, estado }) => `<tr>
              <td><b>${esc(it.nombre)}</b><br><small class="texto-sec">Mínimo ${fmtCant(it.minimo)} ${esc(it.unidad)} · ${F.dinero(it.costo)} c/u</small></td>
              <td><span class="stock"><span class="barra-fina"><i style="width:${Math.min(100, (it.stock / Math.max(it.minimo * 3, 1)) * 100)}%;--c:${estado === 'ok' ? '#2a78d6' : '#d03b3b'}"></i></span>${fmtCant(it.stock)} ${esc(it.unidad)}</span></td>
              <td>${semanal ? `${fmtCant(semanal)} ${esc(it.unidad)}` : '—'}</td>
              <td>${estado === 'ok' ? `<span class="chip chip-ok">${dias === Infinity ? 'Sin consumo' : `~${Math.round(dias)} días`}</span>` : `<span class="chip chip-alerta">${icono('alerta')} ${estado === 'agotado' ? 'Agotado' : `~${Math.max(0, Math.round(dias))} días`}</span>`}</td>
              <td><button type="button" class="btn btn-sec btn-chico" data-comprar="${it.id}">Comprar</button></td>
            </tr>`)
            .join('')}</tbody>
        </table></div>
        <p class="ayuda">Cada ${t('servicio')} atendido descuenta su consumo del inventario.</p>
      </section>
      <section class="tarjeta">
        <h2 class="tarjeta-titulo">Costo de insumos por ${t('servicio')}</h2>
        <div class="lista-barras">
          ${servicios
            .map((s) => {
              const pct = s.insumos / s.precio;
              return `<div class="fila-cat"><span>${esc(s.nombre)}</span><span class="barra-fina"><i style="width:${Math.min(100, pct * 250)}%;--c:#eb6834"></i></span><b>${F.dinero(s.insumos)}</b><small>${F.porcentaje(pct)} del precio</small></div>`;
            })
            .join('')}
        </div>
      </section>`;

    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-comprar]');
      if (b) comprar(ctx, b.dataset.comprar);
    });
  },

  hooks: {
    /** Al atender un servicio, descuenta del inventario lo que consume. */
    alCobrar(cita, _form, ctx) {
      for (const it of estadoDe(ctx).items) {
        const uso = it.consumo?.[cita.servicioId];
        if (uso) it.stock = Math.max(0, Math.round((it.stock - uso) * 100) / 100);
      }
    },
  },
};

function comprar(ctx, id) {
  const it = estadoDe(ctx).items.find((x) => x.id === id);
  const sugerida = Math.max(1, Math.ceil(it.minimo * 2 - it.stock));
  const m = abrirModal({
    titulo: `Comprar ${it.nombre}`,
    clase: 'modal-chico',
    cuerpo: `<form class="form" id="form-compra">
      <div class="campos-2">
        <label class="campo"><span>Cantidad (${esc(it.unidad)})</span><input name="cantidad" type="number" min="1" step="1" value="${sugerida}" required></label>
        <label class="campo"><span>Costo total (MXN)</span><input name="costo" type="number" min="0" step="1" value="${sugerida * it.costo}" required></label>
      </div>
      <p class="ayuda">Se sumará al inventario y se registrará como gasto en Finanzas.</p>
    </form>`,
    pie: `<button type="button" class="btn btn-sec" data-cerrar>Cancelar</button><button type="submit" form="form-compra" class="btn btn-primario">Registrar compra</button>`,
  });
  m.$('[name="cantidad"]').addEventListener('input', (e) => (m.$('[name="costo"]').value = Math.round(Number(e.target.value || 0) * it.costo)));
  m.$('#form-compra').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = leerFormulario(e.target);
    it.stock += Number(v.cantidad);
    ctx.datos.gastos.push({ id: F.uid('ga'), fecha: ctx.hoy, concepto: `Compra: ${it.nombre}`, categoria: 'Insumos', monto: Math.round(Number(v.costo)), tipo: 'variable', propio: true });
    ctx.guardar();
    m.cerrar();
    aviso(`Compra registrada: ${v.cantidad} ${esc(it.unidad)} de ${esc(it.nombre)}`);
    ctx.refrescar();
  });
}
