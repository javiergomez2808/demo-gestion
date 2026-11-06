// Extra: paquetes de sesiones (p. ej. 10 masajes). Controla sesiones usadas, vencimientos y abonos.
// Se activa con `extras.paquetes: [ { id, nombre, servicio, sesiones, precio, vigenciaDias } ]` en la configuración del rubro.

import * as F from '../core/formato.js';
import { esc } from '../core/formato.js';
import { icono } from '../core/ui/iconos.js';
import { abrirModal, aviso, kpi, vacio, leerFormulario } from '../core/ui/ui.js';
import { buscarOCrearCliente } from '../core/citas.js';

let filtro = 'activos';
const tipos = (ctx) => ctx.config.extras.paquetes || [];
const estadoDe = (ctx) => (ctx.datos.extras.paquetes ||= { vendidos: [] });

function avance(ctx, v) {
  let usadas = 0;
  let reservadas = 0;
  for (const c of ctx.datos.citas) {
    if (c.paqueteId !== v.id) continue;
    if (c.estado === 'completada' || c.estado === 'no-asistio') usadas++;
    else if (c.estado === 'programada') reservadas++;
  }
  const restantes = Math.max(0, v.sesiones - usadas - reservadas);
  const vencido = v.vence < ctx.hoy;
  const estado = usadas >= v.sesiones ? 'terminado' : vencido ? 'vencido' : F.difDias(ctx.hoy, v.vence) <= 14 ? 'por-vencer' : 'activo';
  return { usadas, reservadas, restantes, estado };
}

function tarjetaPaquete(ctx, v) {
  const tipo = tipos(ctx).find((x) => x.id === v.tipoId) || { nombre: 'Paquete' };
  const a = avance(ctx, v);
  const venta = ctx.datos.ventas.find((x) => x.id === v.ventaId);
  const saldo = venta ? venta.monto - venta.pagado : 0;
  const chip = { activo: ['Activo', 'ok'], 'por-vencer': ['Por vencer', 'alerta'], terminado: ['Terminado', 'neutro'], vencido: ['Vencido', 'neutro'] }[a.estado];
  return `<div class="paquete-fila">
    <div class="fila-principal">
      <b>${esc(tipo.nombre)}</b>
      <small>Vence ${F.relativo(v.vence, ctx.hoy)} (${F.fechaCorta(v.vence)})${saldo > 0 ? ` · <span class="texto-alerta">Debe ${F.dinero(saldo)}</span>` : ''}</small>
      <span class="sesiones" aria-label="${a.usadas} de ${v.sesiones} sesiones usadas">${Array.from({ length: v.sesiones }, (_, i) => `<i class="${i < a.usadas ? 'usada' : i < a.usadas + a.reservadas ? 'reservada' : ''}"></i>`).join('')}</span>
    </div>
    <div class="fila-lado"><span class="chip chip-${chip[1]}">${chip[0]}</span><small>${a.usadas}/${v.sesiones} usadas</small></div>
  </div>`;
}

export default {
  id: 'paquetes',
  titulo: 'Paquetes',
  icono: 'paquete',
  plan: 'crecimiento',
  descripcion: 'Vende paquetes de sesiones y lleva el control de cuántas quedan, cuándo vencen y quién debe abonos.',
  beneficios: ['Cobro por adelantado', 'Sesiones restantes por persona', 'Aviso automático antes de vencer', 'Abonos y saldos'],

  generar({ datos, config, azar, hoy, inicio }) {
    const vendidos = [];
    let n = 0;
    for (const tipo of config.extras.paquetes) {
      // Clientes que repiten ese servicio son los candidatos naturales
      const porCliente = new Map();
      for (const c of datos.citas) {
        if (c.servicioId !== tipo.servicio || c.estado === 'cancelada' || c.clienteId === 'publico') continue;
        if (!porCliente.has(c.clienteId)) porCliente.set(c.clienteId, []);
        porCliente.get(c.clienteId).push(c);
      }
      const candidatos = azar.mezclar([...porCliente.entries()].filter(([, citas]) => citas.length >= 3));
      const cuantos = Math.min(candidatos.length, tipo.vendidosDemo ?? 6);
      candidatos.slice(0, cuantos).forEach(([clienteId, citas], i) => {
        const porVencer = i < 2; // dos casos para el aviso automático
        // La compra ocurre en alguna de sus primeras visitas: así las ventas se reparten entre los meses
        let fecha = porVencer
          ? F.sumarDias(hoy, -(tipo.vigenciaDias - azar.entero(4, 12)))
          : citas[azar.entero(0, Math.max(0, Math.floor(citas.length / 2)))].fecha;
        if (fecha < inicio) fecha = inicio;
        if (fecha > hoy) fecha = F.sumarDias(hoy, -azar.entero(2, 20));
        const v = { id: `pq${++n}`, tipoId: tipo.id, clienteId, fecha, vence: F.sumarDias(fecha, tipo.vigenciaDias), sesiones: tipo.sesiones, ventaId: `vp${n}` };
        const precioSesion = Math.round(tipo.precio / tipo.sesiones);
        const tope = porVencer ? tipo.sesiones - azar.entero(2, 4) : tipo.sesiones;
        let usadas = 0;
        for (const c of citas) {
          if (c.fecha < fecha || c.fecha > v.vence || usadas >= tope) continue;
          Object.assign(c, { paqueteId: v.id, precio: precioSesion, cobrado: 0, pagado: true });
          usadas++;
        }
        const reciente = F.difDias(fecha, hoy) <= 45;
        const abono = reciente && azar.prob(0.35);
        datos.ventas.push({
          id: v.ventaId,
          fecha,
          tipo: 'paquete',
          concepto: tipo.nombre,
          clienteId,
          monto: tipo.precio,
          pagado: abono ? Math.round(tipo.precio / 2) : tipo.precio,
          metodo: azar.prob(0.6) ? 'tarjeta' : 'transferencia',
        });
        vendidos.push(v);
      });
    }
    datos.ventas.sort((a, b) => a.fecha.localeCompare(b.fecha));
    return { vendidos };
  },

  render(el, ctx) {
    const { t } = ctx;
    const est = estadoDe(ctx);
    const filas = est.vendidos.map((v) => ({ v, a: avance(ctx, v) }));
    const activos = filas.filter((f) => f.a.estado === 'activo' || f.a.estado === 'por-vencer');
    const porVencer = filas.filter((f) => f.a.estado === 'por-vencer' && f.a.restantes > 0);
    const mes = F.claveMes(ctx.hoy);
    const ventasMes = ctx.datos.ventas.filter((v) => v.tipo === 'paquete' && v.fecha.startsWith(mes));

    el.innerHTML = `
      <div class="encabezado-vista">
        <div><p class="sobretitulo">Extra del rubro</p><h1>Paquetes</h1></div>
        <button type="button" class="btn btn-primario" data-vender>${icono('agregar')} Vender paquete</button>
      </div>
      <div class="kpis kpis-4">
        ${kpi({ etiqueta: 'Paquetes activos', valor: activos.length })}
        ${kpi({ etiqueta: 'Sesiones por usar', valor: F.suma(activos, (f) => f.a.restantes + f.a.reservadas) })}
        ${kpi({ etiqueta: 'Vendido este mes', valor: F.dinero(F.suma(ventasMes, (v) => v.monto)), nota: `${ventasMes.length} paquetes` })}
        ${kpi({ etiqueta: 'Por vencer (14 días)', valor: porVencer.length, nota: porVencer.length ? 'Se les avisa por WhatsApp' : '' })}
      </div>
      <section class="tarjeta">
        <h2 class="tarjeta-titulo">Catálogo</h2>
        <div class="rejilla-catalogo">
          ${tipos(ctx)
            .map((tp) => {
              const s = ctx.q.servicio(tp.servicio);
              const ahorro = s.precio * tp.sesiones - tp.precio;
              return `<article class="catalogo-item"><h3>${esc(tp.nombre)}</h3><p class="texto-sec">${tp.sesiones} × ${esc(s.nombre)} · vigencia ${tp.vigenciaDias} días</p>
                <p class="precio-grande">${F.dinero(tp.precio)}</p>${ahorro > 0 ? `<span class="chip chip-ok">Ahorra ${F.dinero(ahorro)}</span>` : ''}
                <button type="button" class="btn btn-sec btn-chico" data-vender="${tp.id}">Vender</button></article>`;
            })
            .join('')}
        </div>
      </section>
      <section class="tarjeta">
        <div class="tarjeta-cab"><h2 class="tarjeta-titulo">Paquetes vendidos</h2></div>
        <div class="filtros">
          ${[['activos', 'Activos'], ['por-vencer', 'Por vencer'], ['todos', 'Todos']].map(([k, v]) => `<button type="button" class="filtro ${filtro === k ? 'activo' : ''}" data-filtro-paq="${k}">${v}</button>`).join('')}
        </div>
        ${(() => {
          const lista = filas
            .filter((f) => (filtro === 'todos' ? true : filtro === 'activos' ? activos.includes(f) : f.a.estado === 'por-vencer'))
            .sort((a, b) => a.v.vence.localeCompare(b.v.vence));
          return lista.length
            ? lista.map((f) => `<a class="paquete-enlace" href="#/clientes/${f.v.clienteId}"><span class="paquete-cliente">${esc(ctx.q.cliente(f.v.clienteId).nombre)}</span>${tarjetaPaquete(ctx, f.v)}</a>`).join('')
            : vacio('No hay paquetes con este filtro.', 'paquete');
        })()}
        <p class="ayuda"><span class="leyenda-sesion usada"></span> usada <span class="leyenda-sesion reservada"></span> agendada <span class="leyenda-sesion"></span> disponible</p>
      </section>`;

    el.addEventListener('click', (e) => {
      const f = e.target.closest('[data-filtro-paq]');
      if (f) {
        filtro = f.dataset.filtroPaq;
        return ctx.refrescar();
      }
      const v = e.target.closest('[data-vender]');
      if (v) venderPaquete(ctx, v.dataset.vender || null);
    });
  },

  hooks: {
    fichaCliente(cliente, ctx) {
      const propios = estadoDe(ctx).vendidos.filter((v) => v.clienteId === cliente.id);
      if (!propios.length) return '';
      return `<section class="tarjeta"><h2 class="tarjeta-titulo">${icono('paquete')} Paquetes</h2>${propios.map((v) => tarjetaPaquete(ctx, v)).join('')}</section>`;
    },
    /** Al agendar, si la persona tiene un paquete vigente de ese servicio, la sesión se descuenta de ahí. */
    alGuardarCita(cita, ctx) {
      for (const v of estadoDe(ctx).vendidos) {
        const tipo = tipos(ctx).find((x) => x.id === v.tipoId);
        if (!tipo || v.clienteId !== cita.clienteId || tipo.servicio !== cita.servicioId || v.vence < cita.fecha) continue;
        const a = avance(ctx, v);
        if (a.restantes <= 0) continue;
        Object.assign(cita, { paqueteId: v.id, precio: Math.round(tipo.precio / tipo.sesiones), cobrado: 0 });
        return `Se usará su paquete "${tipo.nombre}" (quedan ${a.restantes - 1} sesiones)`;
      }
      return null;
    },
    detalleCita(cita, ctx) {
      if (!cita.paqueteId) return '';
      const v = estadoDe(ctx).vendidos.find((x) => x.id === cita.paqueteId);
      if (!v) return '';
      const tipo = tipos(ctx).find((x) => x.id === v.tipoId);
      const n = ctx.datos.citas.filter((c) => c.paqueteId === v.id && c.estado !== 'cancelada' && c.fecha + c.hora <= cita.fecha + cita.hora).length;
      return `<div class="nota-linea">${icono('paquete')}<span>Sesión ${n} de ${v.sesiones} del paquete <b>${esc(tipo?.nombre || '')}</b> · vence ${F.fechaCorta(v.vence)}</span></div>`;
    },
    mensajesProgramados(ctx) {
      const out = [];
      for (const v of estadoDe(ctx).vendidos) {
        const a = avance(ctx, v);
        if (a.estado !== 'por-vencer' || a.restantes <= 0) continue;
        const tipo = tipos(ctx).find((x) => x.id === v.tipoId);
        const cl = ctx.q.cliente(v.clienteId);
        const envio = F.sumarDias(v.vence, -14);
        const enviado = envio < ctx.hoy;
        out.push({
          id: `paq-${v.id}`,
          tipo: 'paquete',
          para: cl.nombre,
          orden: `${enviado ? envio : ctx.hoy}10:00`,
          estado: enviado ? 'enviado' : 'programado',
          cuandoTexto: `${F.capital(F.relativo(enviado ? envio : ctx.hoy, ctx.hoy))}, 10:00 a. m.`,
          vars: { nombre: cl.nombre.split(' ')[0], paquete: tipo.nombre, vence: F.fechaLarga(v.vence), restantes: a.restantes },
        });
      }
      return out;
    },
    seccionWeb(ctx) {
      const lista = tipos(ctx);
      if (!lista.length) return '';
      return `<section class="sitio-seccion"><h3>Paquetes</h3><div class="sitio-servicios">${lista
        .map((tp) => {
          const s = ctx.q.servicio(tp.servicio);
          const ahorro = s.precio * tp.sesiones - tp.precio;
          return `<article class="sitio-servicio destacado"><div><h4>${esc(tp.nombre)}</h4><p>${tp.sesiones} sesiones de ${esc(s.nombre.toLowerCase())} · vigencia ${tp.vigenciaDias} días</p>${ahorro > 0 ? `<small class="texto-ok">Ahorras ${F.dinero(ahorro)}</small>` : ''}</div><div class="sitio-precio"><b>${F.dinero(tp.precio)}</b></div></article>`;
        })
        .join('')}</div></section>`;
    },
  },
};

function venderPaquete(ctx, tipoId) {
  const { t } = ctx;
  const m = abrirModal({
    titulo: 'Vender paquete',
    clase: 'modal-chico',
    cuerpo: `<form class="form" id="form-paq" autocomplete="off">
      <label class="campo"><span>${t.M('cliente')}</span><input name="cliente" list="dl-cli-paq" required placeholder="Escribe un nombre">
        <datalist id="dl-cli-paq">${ctx.datos.clientes.map((c) => `<option value="${esc(c.nombre)}">`).join('')}</datalist></label>
      <label class="campo"><span>Paquete</span><select name="tipo">${tipos(ctx).map((tp) => `<option value="${tp.id}" ${tp.id === tipoId ? 'selected' : ''}>${esc(tp.nombre)} · ${F.dinero(tp.precio)}</option>`).join('')}</select></label>
      <fieldset class="campo"><legend>Pago</legend><div class="opciones">
        <label class="opcion"><input type="radio" name="pago" value="completo" checked><span>Completo</span></label>
        <label class="opcion"><input type="radio" name="pago" value="anticipo"><span>Anticipo 50%</span></label>
      </div></fieldset>
    </form>`,
    pie: `<button type="button" class="btn btn-sec" data-cerrar>Cancelar</button><button type="submit" form="form-paq" class="btn btn-primario">Registrar venta</button>`,
  });
  m.$('#form-paq').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = leerFormulario(e.target);
    const tipo = tipos(ctx).find((x) => x.id === v.tipo);
    const cliente = buscarOCrearCliente(ctx, { nombre: v.cliente });
    if (!cliente) return;
    const id = F.uid('pq');
    const ventaId = F.uid('vp');
    estadoDe(ctx).vendidos.push({ id, tipoId: tipo.id, clienteId: cliente.id, fecha: ctx.hoy, vence: F.sumarDias(ctx.hoy, tipo.vigenciaDias), sesiones: tipo.sesiones, ventaId });
    ctx.datos.ventas.push({ id: ventaId, fecha: ctx.hoy, tipo: 'paquete', concepto: tipo.nombre, clienteId: cliente.id, monto: tipo.precio, pagado: v.pago === 'anticipo' ? Math.round(tipo.precio / 2) : tipo.precio, metodo: 'tarjeta' });
    ctx.guardar();
    m.cerrar();
    aviso(`Paquete vendido a ${esc(cliente.nombre)}. Sus próximas ${t('cita', true)} de ese ${t('servicio')} se descontarán solas.`);
    ctx.refrescar();
  });
}
