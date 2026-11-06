// Extra: venta de productos en mostrador, con inventario y comisión para quien vende.
// Se activa con `extras.mostrador: { comision, ventasPorDia: [min, max], productos: [ { id, nombre, precio, costo, stock, minimo } ] }`.

import * as F from '../core/formato.js';
import { esc } from '../core/formato.js';
import { icono } from '../core/ui/iconos.js';
import { abrirModal, aviso, kpi, leerFormulario } from '../core/ui/ui.js';

const cfgDe = (ctx) => ctx.config.extras.mostrador;
const estadoDe = (ctx) => (ctx.datos.extras.mostrador ||= { productos: structuredClone(cfgDe(ctx).productos) });

export default {
  id: 'mostrador',
  titulo: 'Mostrador',
  icono: 'bolsa',
  plan: 'crecimiento',
  descripcion: 'Vende productos en mostrador, controla el inventario y paga comisión a quien vende.',
  beneficios: ['Venta rápida desde el celular', 'Inventario que se descuenta solo', 'Margen por producto', 'Comisión por venta'],

  generar({ datos, config, azar, hoy, inicio, mesFlojo }) {
    const cfg = config.extras.mostrador;
    const productos = structuredClone(cfg.productos);
    const [min, max] = cfg.ventasPorDia || [1, 4];
    let n = 0;
    for (let fecha = inicio; fecha <= hoy; fecha = F.sumarDias(fecha, 1)) {
      if (!config.negocio.horario.dias.includes(F.diaSemana(fecha))) continue;
      let ventas = azar.entero(min, max);
      if (F.claveMes(fecha) === mesFlojo) ventas = Math.round(ventas * 0.7);
      for (let i = 0; i < ventas; i++) {
        const p = azar.ponderado(productos, (x) => x.demanda ?? 1);
        const cantidad = azar.prob(0.15) ? 2 : 1;
        const vendedor = azar.elegir(config.personal);
        const cliente = azar.prob(0.45) ? azar.elegir(datos.clientes).id : 'publico';
        datos.ventas.push({
          id: `vm${++n}`,
          fecha,
          tipo: 'producto',
          concepto: `${p.nombre}${cantidad > 1 ? ` (×${cantidad})` : ''}`,
          clienteId: cliente,
          profesionalId: vendedor.id,
          productoId: p.id,
          cantidad,
          costo: p.costo * cantidad,
          monto: p.precio * cantidad,
          pagado: p.precio * cantidad,
          metodo: azar.prob(0.5) ? 'efectivo' : 'tarjeta',
        });
      }
    }
    datos.ventas.sort((a, b) => a.fecha.localeCompare(b.fecha));
    return { productos };
  },

  render(el, ctx) {
    const { q, t, hoy } = ctx;
    const est = estadoDe(ctx);
    const mes = F.claveMes(hoy);
    const desde = F.sumarDias(hoy, -30);
    const ventas30 = ctx.datos.ventas.filter((v) => v.tipo === 'producto' && v.fecha >= desde);
    const ventasMes = ctx.datos.ventas.filter((v) => v.tipo === 'producto' && v.fecha.startsWith(mes));
    const total30 = F.suma(ventas30, (v) => v.monto);
    const margen30 = total30 - F.suma(ventas30, (v) => v.costo || 0);
    const porProducto = {};
    for (const v of ventas30) porProducto[v.productoId] = (porProducto[v.productoId] || 0) + (v.cantidad || 1);
    const top = est.productos.slice().sort((a, b) => (porProducto[b.id] || 0) - (porProducto[a.id] || 0))[0];
    const bajos = est.productos.filter((p) => p.stock <= p.minimo);

    el.innerHTML = `
      <div class="encabezado-vista"><div><p class="sobretitulo">Extra del rubro</p><h1>Mostrador</h1></div></div>
      <div class="kpis kpis-4">
        ${kpi({ etiqueta: 'Venta de productos (30 días)', valor: F.dinero(total30), destacado: true, nota: `${ventas30.length} ventas` })}
        ${kpi({ etiqueta: 'Ganancia en productos', valor: F.dinero(margen30), nota: `Margen ${F.porcentaje(total30 ? margen30 / total30 : 0)}` })}
        ${kpi({ etiqueta: 'Lo más vendido', valor: esc(top?.nombre.split(' ').slice(0, 2).join(' ') || '—'), nota: top ? `${porProducto[top.id] || 0} piezas en 30 días` : '' })}
        ${kpi({ etiqueta: 'Por agotarse', valor: bajos.length, nota: bajos.map((p) => p.nombre).slice(0, 2).join(', ') || 'Todo en orden' })}
      </div>
      <section class="tarjeta">
        <div class="tarjeta-cab"><h2 class="tarjeta-titulo">Venta rápida</h2><span class="texto-sec">Comisión de ${F.porcentaje(cfgDe(ctx).comision || 0)} para quien vende</span></div>
        <div class="rejilla-catalogo">
          ${est.productos
            .map((p) => `<article class="catalogo-item">
              <h3>${esc(p.nombre)}</h3>
              <p class="texto-sec">Costo ${F.dinero(p.costo)} · ganas ${F.dinero(p.precio - p.costo)}</p>
              <p class="precio-grande">${F.dinero(p.precio)}</p>
              ${p.stock <= p.minimo ? `<span class="chip chip-alerta">${icono('alerta')} Quedan ${p.stock}</span>` : `<span class="chip chip-neutro">${p.stock} en existencia</span>`}
              <button type="button" class="btn btn-primario btn-chico" data-vender="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}>${icono('bolsa')} Vender</button>
            </article>`)
            .join('')}
        </div>
      </section>
      <section class="tarjeta">
        <h2 class="tarjeta-titulo">Ventas de este mes</h2>
        <div class="tabla-scroll"><table class="tabla">
          <thead><tr><th>Fecha</th><th>Producto</th><th>Vendió</th><th>Monto</th></tr></thead>
          <tbody>${ventasMes
            .slice(-15)
            .reverse()
            .map((v) => `<tr><td>${F.fechaCorta(v.fecha)}</td><td>${esc(v.concepto)}</td><td>${esc(q.profesional(v.profesionalId).nombre.split(' ')[0])}</td><td><b>${F.dinero(v.monto)}</b></td></tr>`)
            .join('') || `<tr><td colspan="4" class="texto-sec">Aún no hay ventas este mes.</td></tr>`}</tbody>
        </table></div>
        <p class="ayuda">Las ventas de productos se suman a Finanzas como ingreso y la comisión aparece en el corte de cada ${t('profesional')}.</p>
      </section>`;

    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-vender]');
      if (b) vender(ctx, b.dataset.vender);
    });
  },

  hooks: {
    comisiones({ desde, hasta }, ctx) {
      const pct = cfgDe(ctx).comision || 0;
      if (!pct) return [];
      const porProf = {};
      for (const v of ctx.datos.ventas) {
        if (v.tipo !== 'producto' || v.fecha < desde || v.fecha > hasta || !v.profesionalId) continue;
        porProf[v.profesionalId] = (porProf[v.profesionalId] || 0) + v.monto;
      }
      return Object.entries(porProf).map(([profesionalId, base]) => ({
        profesionalId,
        concepto: 'Comisión por productos',
        monto: base * pct,
        detalle: `(vendió ${F.dinero(base)})`,
      }));
    },
  },
};

function vender(ctx, id) {
  const { t } = ctx;
  const p = estadoDe(ctx).productos.find((x) => x.id === id);
  const m = abrirModal({
    titulo: `Vender ${p.nombre}`,
    clase: 'modal-chico',
    cuerpo: `<form class="form" id="form-venta">
      <div class="campos-2">
        <label class="campo"><span>Cantidad</span><input name="cantidad" type="number" min="1" max="${p.stock}" value="1" required></label>
        <label class="campo"><span>Vendió</span><select name="profesionalId">${ctx.config.personal.map((x) => `<option value="${x.id}">${esc(x.nombre)}</option>`).join('')}</select></label>
      </div>
      <fieldset class="campo"><legend>Método de pago</legend><div class="opciones">
        <label class="opcion"><input type="radio" name="metodo" value="efectivo" checked><span>Efectivo</span></label>
        <label class="opcion"><input type="radio" name="metodo" value="tarjeta"><span>Tarjeta</span></label>
      </div></fieldset>
      <div class="total-cobro"><span>Total</span><b data-total>${F.dinero(p.precio)}</b></div>
    </form>`,
    pie: `<button type="button" class="btn btn-sec" data-cerrar>Cancelar</button><button type="submit" form="form-venta" class="btn btn-primario">${icono('ok')} Cobrar</button>`,
  });
  m.$('[name="cantidad"]').addEventListener('input', (e) => (m.$('[data-total]').textContent = F.dinero(p.precio * Number(e.target.value || 0))));
  m.$('#form-venta').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = leerFormulario(e.target);
    const cantidad = Math.max(1, Math.min(p.stock, Number(v.cantidad)));
    p.stock -= cantidad;
    ctx.datos.ventas.push({
      id: F.uid('vm'),
      fecha: ctx.hoy,
      tipo: 'producto',
      concepto: `${p.nombre}${cantidad > 1 ? ` (×${cantidad})` : ''}`,
      clienteId: 'publico',
      profesionalId: v.profesionalId,
      productoId: p.id,
      cantidad,
      costo: p.costo * cantidad,
      monto: p.precio * cantidad,
      pagado: p.precio * cantidad,
      metodo: v.metodo,
    });
    ctx.guardar();
    m.cerrar();
    aviso(`Venta registrada: ${F.dinero(p.precio * cantidad)}. Ya aparece en Finanzas y en las comisiones de ${esc(ctx.q.profesional(v.profesionalId).nombre.split(' ')[0])}.`);
    ctx.refrescar();
  });
}
