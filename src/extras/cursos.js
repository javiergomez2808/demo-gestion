// Extra: cursos y talleres con cupo, lista de inscritas, anticipos y saldos.
// Se activa con `extras.cursos: [ { id, nombre, cuando, enDias, precio, anticipo, cupo, imparte, inscritasDemo } ]`.
// enDias: en cuántos días es el curso (negativo = ya se impartió). diaSemana (opcional): recorre la fecha a ese día
// de la semana (6 = sábado; con enDias 0 y diaSemana 5 = "el próximo viernes"). cuando: horario en texto.
// Lo cobrado entra a Finanzas como venta de tipo "curso".

import * as F from '../core/formato.js';
import { esc } from '../core/formato.js';
import { icono } from '../core/ui/iconos.js';
import { abrirModal, aviso, kpi, vacio, leerFormulario, avatar } from '../core/ui/ui.js';
import { buscarOCrearCliente } from '../core/citas.js';

const cursos = (ctx) => ctx.config.extras.cursos || [];
const estadoDe = (ctx) => (ctx.datos.extras.cursos ||= { inscripciones: [] });
/** Fecha del curso a partir del día en que se generaron los datos. */
function fechaCurso(base, cu) {
  let d = F.sumarDias(base, cu.enDias ?? 0);
  if (cu.diaSemana != null) while (F.diaSemana(d) !== cu.diaSemana) d = F.sumarDias(d, 1);
  return d;
}
const cuandoTexto = (ctx, cu) => `${F.capital(F.fechaLarga(fechaDe(ctx, cu)))}${cu.cuando ? ` · ${cu.cuando}` : ''}`;
const fechaDe = (ctx, cu) => fechaCurso(ctx.datos.fechaBase || ctx.hoy, cu);
const porFecha = (ctx) => (a, b) => fechaDe(ctx, a).localeCompare(fechaDe(ctx, b));

/** Inscritas de un curso con lo que ha pagado cada una. */
function inscritas(ctx, cursoId) {
  return estadoDe(ctx)
    .inscripciones.filter((i) => i.cursoId === cursoId)
    .map((i) => {
      const venta = ctx.datos.ventas.find((v) => v.id === i.ventaId) || { monto: 0, pagado: 0 };
      return { ...i, cliente: ctx.q.cliente(i.clienteId), venta, saldo: Math.max(0, venta.monto - venta.pagado) };
    });
}

function tarjetaCurso(ctx, cu) {
  const fecha = fechaDe(ctx, cu);
  const pasado = fecha < ctx.hoy;
  const lista = inscritas(ctx, cu.id);
  const libres = Math.max(0, cu.cupo - lista.length);
  const porCobrar = F.suma(lista, (i) => i.saldo);
  return `<section class="tarjeta curso${pasado ? ' curso-pasado' : ''}">
    <div class="tarjeta-cab">
      <div>
        <h2 class="tarjeta-titulo">${icono('birrete')} ${esc(cu.nombre)}</h2>
        <p class="texto-sec">${esc(cuandoTexto(ctx, cu))}${cu.imparte ? ` · Imparte ${esc(cu.imparte)}` : ''} · ${F.dinero(cu.precio)}${cu.anticipo && cu.anticipo < cu.precio ? ` (anticipo ${F.dinero(cu.anticipo)})` : ''}</p>
      </div>
      ${pasado ? '<span class="chip chip-neutro">Ya se impartió</span>' : `<button type="button" class="btn btn-sec btn-chico" data-inscribir="${cu.id}" ${libres ? '' : 'disabled'}>${icono('agregar')} Inscribir</button>`}
    </div>
    <div class="curso-cupo">
      <span class="barra-fina"><i style="width:${Math.min(100, (lista.length / cu.cupo) * 100)}%;--c:var(--primario)"></i></span>
      <small><b>${lista.length} de ${cu.cupo}</b> lugares ocupados${pasado ? '' : libres ? ` · quedan ${libres}` : ' · <span class="texto-alerta">cupo lleno</span>'}${porCobrar ? ` · por cobrar <b>${F.dinero(porCobrar)}</b>` : ''}</small>
    </div>
    ${
      lista.length
        ? `<div class="curso-lista">${lista
            .map(
              (i) => `<div class="fila-historial">${avatar(i.cliente.nombre, null, 'avatar-chico')}
          <span class="fila-principal"><b>${esc(i.cliente.nombre)}</b><small>Inscrita ${F.relativo(i.fecha, ctx.hoy)} · pagó ${F.dinero(i.venta.pagado)}</small></span>
          <span class="fila-lado">${i.saldo ? `<span class="chip chip-alerta">Debe ${F.dinero(i.saldo)}</span><button type="button" class="btn btn-sec btn-chico" data-liquidar="${i.ventaId}">Cobrar</button>` : '<span class="chip chip-ok">Pagado</span>'}</span></div>`,
            )
            .join('')}</div>`
        : vacio('Aún no hay inscritas.', 'birrete')
    }
  </section>`;
}

export default {
  id: 'cursos',
  titulo: 'Cursos',
  icono: 'birrete',
  plan: 'crecimiento',
  descripcion: 'Cursos y talleres con cupo, lista de inscritas, anticipos y saldos pendientes.',
  beneficios: ['Cupo en tiempo real', 'Anticipos y saldos por alumna', 'Ingresos de cursos en tus finanzas', 'Cursos visibles en tu página'],

  generar({ datos, config, azar, hoy, inicio }) {
    const inscripciones = [];
    let n = 0;
    for (const cu of config.extras.cursos) {
      const fecha = fechaCurso(hoy, cu);
      const pasado = fecha < hoy;
      const cuantas = Math.min(cu.cupo, cu.inscritasDemo ?? Math.round(cu.cupo * 0.6));
      const alumnas = azar.mezclar(datos.clientes.filter((c) => c.alta <= hoy)).slice(0, cuantas);
      for (const al of alumnas) {
        // Se inscriben entre 1 y 5 semanas antes del curso (nunca después de hoy ni antes de la historia)
        let inscrita = F.sumarDias(fecha, -azar.entero(7, 35));
        if (inscrita > hoy) inscrita = F.sumarDias(hoy, -azar.entero(0, 10));
        if (inscrita < inicio) inscrita = inicio;
        const liquidado = pasado || !cu.anticipo || azar.prob(0.35);
        const ventaId = `vc${++n}`;
        datos.ventas.push({
          id: ventaId,
          fecha: inscrita,
          tipo: 'curso',
          concepto: `Curso: ${cu.nombre}`,
          clienteId: al.id,
          monto: cu.precio,
          pagado: liquidado ? cu.precio : cu.anticipo,
          metodo: azar.prob(0.55) ? 'transferencia' : 'efectivo',
        });
        inscripciones.push({ id: `in${n}`, cursoId: cu.id, clienteId: al.id, fecha: inscrita, ventaId });
      }
    }
    datos.ventas.sort((a, b) => a.fecha.localeCompare(b.fecha));
    return { inscripciones };
  },

  render(el, ctx) {
    const proximos = cursos(ctx).filter((cu) => fechaDe(ctx, cu) >= ctx.hoy).sort(porFecha(ctx));
    const pasados = cursos(ctx).filter((cu) => fechaDe(ctx, cu) < ctx.hoy);
    const todasProx = proximos.flatMap((cu) => inscritas(ctx, cu.id));
    const cupoProx = F.suma(proximos, (cu) => cu.cupo);
    const desde = F.sumarDias(ctx.hoy, -90);
    const ingresos = F.suma(ctx.datos.ventas.filter((v) => v.tipo === 'curso' && v.fecha >= desde), (v) => v.pagado);

    el.innerHTML = `
      <div class="encabezado-vista">
        <div><p class="sobretitulo">Extra del rubro</p><h1>Cursos</h1></div>
      </div>
      <div class="kpis kpis-4">
        ${kpi({ etiqueta: 'Próximos cursos', valor: proximos.length })}
        ${kpi({ etiqueta: 'Lugares ocupados', valor: F.porcentaje(cupoProx ? todasProx.length / cupoProx : 0), nota: `${todasProx.length} de ${cupoProx}`, destacado: true })}
        ${kpi({ etiqueta: 'Saldos por cobrar', valor: F.dinero(F.suma(todasProx, (i) => i.saldo)), nota: 'De los próximos cursos' })}
        ${kpi({ etiqueta: 'Cobrado en cursos (90 días)', valor: F.dinero(ingresos) })}
      </div>
      ${proximos.map((cu) => tarjetaCurso(ctx, cu)).join('')}
      ${pasados.length ? `<h2 class="subtitulo-vista">Cursos anteriores</h2>${pasados.map((cu) => tarjetaCurso(ctx, cu)).join('')}` : ''}`;

    el.addEventListener('click', (e) => {
      const b = e.target.closest('[data-inscribir]');
      if (b) return inscribir(ctx, b.dataset.inscribir);
      const l = e.target.closest('[data-liquidar]');
      if (l) {
        const v = ctx.datos.ventas.find((x) => x.id === l.dataset.liquidar);
        if (!v) return;
        v.pagado = v.monto;
        ctx.guardar();
        aviso('Saldo cobrado');
        ctx.refrescar();
      }
    });
  },

  hooks: {
    fichaCliente(cliente, ctx) {
      const propias = estadoDe(ctx).inscripciones.filter((i) => i.clienteId === cliente.id);
      if (!propias.length) return '';
      return `<section class="tarjeta"><h2 class="tarjeta-titulo">${icono('birrete')} Cursos</h2>${propias
        .map((i) => {
          const cu = cursos(ctx).find((c) => c.id === i.cursoId) || { nombre: 'Curso' };
          const v = ctx.datos.ventas.find((x) => x.id === i.ventaId) || { monto: 0, pagado: 0 };
          const saldo = v.monto - v.pagado;
          return `<div class="fila-historial"><span class="fila-principal"><b>${esc(cu.nombre)}</b><small>${esc(cuandoTexto(ctx, cu))}</small></span>
            <span class="fila-lado">${saldo > 0 ? `<span class="chip chip-alerta">Debe ${F.dinero(saldo)}</span>` : '<span class="chip chip-ok">Pagado</span>'}</span></div>`;
        })
        .join('')}</section>`;
    },
    /** En la web pública: próximos cursos con lugares disponibles. */
    seccionWeb(ctx) {
      const proximos = cursos(ctx).filter((cu) => fechaDe(ctx, cu) >= ctx.hoy).sort(porFecha(ctx));
      if (!proximos.length) return '';
      return `<section class="sitio-seccion"><h3>Cursos</h3><div class="sitio-servicios">${proximos
        .map((cu) => {
          const libres = Math.max(0, cu.cupo - inscritas(ctx, cu.id).length);
          return `<article class="sitio-servicio destacado"><div><h4>${esc(cu.nombre)}</h4><p>${esc(cuandoTexto(ctx, cu))}</p>
            <small class="${libres ? 'texto-ok' : 'texto-alerta'}">${libres ? `Quedan ${libres} lugares` : 'Cupo lleno'}</small></div>
            <div class="sitio-precio"><b>${F.dinero(cu.precio)}</b><button type="button" class="btn btn-sec btn-chico" data-whatsapp>Apartar lugar</button></div></article>`;
        })
        .join('')}</div></section>`;
    },
  },
};

function inscribir(ctx, cursoId) {
  const cu = cursos(ctx).find((c) => c.id === cursoId);
  if (!cu) return;
  const m = abrirModal({
    titulo: `Inscribir a ${cu.nombre}`,
    clase: 'modal-chico',
    cuerpo: `<form class="form" id="form-curso" autocomplete="off">
      <label class="campo"><span>Alumna</span><input name="nombre" list="dl-cli-curso" required placeholder="Escribe un nombre">
        <datalist id="dl-cli-curso">${ctx.datos.clientes.map((c) => `<option value="${esc(c.nombre)}">`).join('')}</datalist></label>
      <label class="campo"><span>WhatsApp</span><input name="telefono" inputmode="tel" maxlength="20" placeholder="10 dígitos"></label>
      ${
        cu.anticipo && cu.anticipo < cu.precio
          ? `<fieldset class="campo"><legend>Pago</legend><div class="opciones">
        <label class="opcion"><input type="radio" name="pago" value="anticipo" checked><span>Anticipo ${F.dinero(cu.anticipo)}</span></label>
        <label class="opcion"><input type="radio" name="pago" value="completo"><span>Completo ${F.dinero(cu.precio)}</span></label>
      </div></fieldset>`
          : `<p class="ayuda">Pago: ${F.dinero(cu.precio)}</p>`
      }
    </form>`,
    pie: `<button type="button" class="btn btn-sec" data-cerrar>Cancelar</button><button type="submit" form="form-curso" class="btn btn-primario">Inscribir</button>`,
  });
  m.$('#form-curso').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = leerFormulario(e.target);
    const cliente = buscarOCrearCliente(ctx, { nombre: v.nombre, telefono: v.telefono });
    if (!cliente) return;
    if (estadoDe(ctx).inscripciones.some((i) => i.cursoId === cu.id && i.clienteId === cliente.id)) {
      return aviso(`${esc(cliente.nombre)} ya está inscrita en este curso.`, { tipo: 'error' });
    }
    const ventaId = F.uid('vc');
    ctx.datos.ventas.push({
      id: ventaId,
      fecha: ctx.hoy,
      tipo: 'curso',
      concepto: `Curso: ${cu.nombre}`,
      clienteId: cliente.id,
      monto: cu.precio,
      pagado: v.pago === 'anticipo' ? cu.anticipo : cu.precio,
      metodo: 'transferencia',
    });
    estadoDe(ctx).inscripciones.push({ id: F.uid('in'), cursoId: cu.id, clienteId: cliente.id, fecha: ctx.hoy, ventaId });
    ctx.guardar();
    m.cerrar();
    aviso(`${esc(cliente.nombre)} quedó inscrita en <b>${esc(cu.nombre)}</b>`);
    ctx.refrescar();
  });
}
