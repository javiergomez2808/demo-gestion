// Clientes: lista con búsqueda y segmentos, y ficha con historial, gasto total y notas.

import * as F from '../core/formato.js';
import { esc } from '../core/formato.js';
import { icono } from '../core/ui/iconos.js';
import { abrirModal, aviso, avatar, kpi, vacio, chipEstado, leerFormulario } from '../core/ui/ui.js';
import { formularioCita, detalleCita, buscarOCrearCliente } from '../core/citas.js';

const SEGMENTOS = {
  todos: 'Todos',
  frecuente: 'Frecuentes',
  regular: 'Regulares',
  nuevo: 'Nuevos',
  inactivo: 'Inactivos',
  saldo: 'Con saldo',
};
const estado = { filtro: 'todos', busqueda: '' };

export default {
  id: 'clientes',
  orden: 3,
  plan: 'control',
  grupo: 'negocio',
  icono: 'usuarios',
  enBarra: true,
  titulo: (t) => t.M('cliente', true),
  descripcion: 'Ficha de cada persona con su historial de visitas, gasto total y notas.',
  beneficios: ['Historial completo de visitas', 'Cuánto ha gastado cada persona', 'Notas y preferencias', 'Quién dejó de venir'],

  render(el, ctx, params) {
    if (params[0]) return ficha(el, ctx, params[0]);
    lista(el, ctx);
  },
};

function lista(el, ctx) {
  const { t } = ctx;
  const resumen = ctx.q.resumenClientes();
  const conteo = { todos: 0, frecuente: 0, regular: 0, nuevo: 0, inactivo: 0, saldo: 0 };
  for (const r of resumen.values()) {
    conteo.todos++;
    conteo[r.segmento]++;
    if (r.saldo > 0) conteo.saldo++;
  }
  const nuevosMes = ctx.datos.clientes.filter((c) => F.claveMes(c.alta) === F.claveMes(ctx.hoy)).length;

  el.innerHTML = `
    <div class="encabezado-vista">
      <div><p class="sobretitulo">${conteo.todos} en total</p><h1>${t.M('cliente', true)}</h1></div>
      <button type="button" class="btn btn-primario" data-nuevo>${icono('agregar')} Nuevo</button>
    </div>
    <div class="kpis kpis-4">
      ${kpi({ etiqueta: 'Activos', valor: conteo.todos - conteo.inactivo, nota: 'Vinieron en los últimos 45 días o tienen cita' })}
      ${kpi({ etiqueta: 'Frecuentes', valor: conteo.frecuente, nota: 'Los que más vienen (últimos 90 días)' })}
      ${kpi({ etiqueta: 'Nuevos este mes', valor: nuevosMes })}
      ${kpi({ etiqueta: 'Inactivos', valor: conteo.inactivo, nota: 'Sin visita en más de 45 días' })}
    </div>
    <div class="buscador">${icono('buscar')}<input type="search" placeholder="Buscar por nombre o teléfono" value="${esc(estado.busqueda)}" data-buscar aria-label="Buscar"></div>
    <div class="filtros" role="group" aria-label="Segmentos">
      ${Object.entries(SEGMENTOS)
        .map(([k, v]) => `<button type="button" class="filtro ${estado.filtro === k ? 'activo' : ''}" data-filtro="${k}">${v} <small>${conteo[k]}</small></button>`)
        .join('')}
    </div>
    <div class="tarjeta lista-clientes" data-lista></div>`;

  const pintarLista = () => {
    const b = estado.busqueda.trim().toLowerCase();
    const filas = ctx.datos.clientes
      .map((c) => ({ c, r: resumen.get(c.id) }))
      .filter(({ c, r }) => {
        if (estado.filtro === 'saldo' ? r.saldo <= 0 : estado.filtro !== 'todos' && r.segmento !== estado.filtro) return false;
        return !b || c.nombre.toLowerCase().includes(b) || c.telefono.replace(/\D/g, '').includes(b.replace(/\D/g, '') || '§');
      })
      .sort((a, b2) => (b2.r.ultima || b2.c.alta).localeCompare(a.r.ultima || a.c.alta));
    el.querySelector('[data-lista]').innerHTML = filas.length
      ? filas
          .map(
            ({ c, r }) => `
        <a class="fila-cliente" href="#/clientes/${c.id}">
          ${avatar(c.nombre)}
          <span class="fila-principal"><b>${esc(c.nombre)}</b>
            <small>${r.ultima ? `Última visita ${F.relativo(r.ultima, ctx.hoy)}` : 'Sin visitas aún'} · ${r.visitas} ${r.visitas === 1 ? 'visita' : 'visitas'}${r.proxima ? ` · ${icono('calendario')} ${F.relativo(r.proxima.fecha, ctx.hoy)}` : ''}</small>
          </span>
          <span class="fila-lado">${etiquetaSegmento(r)}<b>${F.dinero(r.gasto)}</b></span>
        </a>`,
          )
          .join('')
      : vacio('No hay resultados con ese filtro.', 'buscar');
  };
  pintarLista();

  el.querySelector('[data-buscar]').addEventListener('input', (e) => {
    estado.busqueda = e.target.value;
    pintarLista();
  });
  el.addEventListener('click', (e) => {
    const f = e.target.closest('[data-filtro]');
    if (f) {
      estado.filtro = f.dataset.filtro;
      el.querySelectorAll('[data-filtro]').forEach((x) => x.classList.toggle('activo', x === f));
      pintarLista();
    }
    if (e.target.closest('[data-nuevo]')) nuevoCliente(ctx);
  });
}

function etiquetaSegmento(r) {
  if (r.saldo > 0) return `<span class="chip chip-alerta">Debe ${F.dinero(r.saldo)}</span>`;
  const map = { frecuente: ['Frecuente', 'ok'], nuevo: ['Nuevo', 'info'], inactivo: ['Inactivo', 'neutro'] };
  const s = map[r.segmento];
  return s ? `<span class="chip chip-${s[1]}">${s[0]}</span>` : '';
}

function nuevoCliente(ctx) {
  const { t } = ctx;
  const m = abrirModal({
    titulo: `Nuevo ${t('cliente')}`,
    clase: 'modal-chico',
    cuerpo: `<form class="form" id="form-cliente" autocomplete="off">
      <label class="campo"><span>Nombre</span><input name="nombre" required maxlength="60"></label>
      <label class="campo"><span>WhatsApp</span><input name="telefono" inputmode="tel" maxlength="20" placeholder="10 dígitos"></label>
      <label class="campo"><span>Notas</span><textarea name="notas" rows="2" maxlength="300" placeholder="Preferencias, alergias, cómo nos conoció…"></textarea></label>
    </form>`,
    pie: `<button type="button" class="btn btn-sec" data-cerrar>Cancelar</button><button type="submit" form="form-cliente" class="btn btn-primario">Guardar</button>`,
  });
  m.$('#form-cliente').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = leerFormulario(e.target);
    const c = buscarOCrearCliente(ctx, v);
    if (v.notas && !c.notas) c.notas = v.notas;
    ctx.guardar();
    m.cerrar();
    aviso(`${esc(c.nombre)} guardado`);
    ctx.ir(`clientes/${c.id}`);
  });
}

function ficha(el, ctx, id) {
  const { t, q } = ctx;
  const c = ctx.datos.clientes.find((x) => x.id === id);
  if (!c) {
    el.innerHTML = vacio(`No encontramos a este ${t('cliente')}.`);
    return;
  }
  const r = q.resumenClientes().get(id);
  const citas = ctx.datos.citas.filter((x) => x.clienteId === id).sort((a, b) => (b.fecha + b.hora).localeCompare(a.fecha + a.hora));
  const ventas = ctx.datos.ventas.filter((v) => v.clienteId === id);
  const historial = [
    ...citas.filter((x) => x.fecha <= ctx.hoy && x.estado !== 'programada').map((x) => ({ tipo: 'cita', fecha: x.fecha + x.hora, x })),
    ...ventas.map((v) => ({ tipo: 'venta', fecha: `${v.fecha}99`, v })),
  ].sort((a, b) => b.fecha.localeCompare(a.fecha));
  const proximas = citas.filter((x) => x.estado === 'programada' && x.fecha >= ctx.hoy).reverse();
  const secciones = ctx.hook('fichaCliente', c).join('');
  const favS = r.servicioFavorito ? q.servicio(r.servicioFavorito).nombre : null;
  const favP = r.profesionalFavorito ? q.profesional(r.profesionalFavorito).nombre : null;

  el.innerHTML = `
    <a class="volver" href="#/clientes">${icono('izq')} ${t.M('cliente', true)}</a>
    <section class="ficha-cab tarjeta">
      ${avatar(c.nombre, null, 'avatar-grande')}
      <div class="ficha-titulos">
        <h1>${esc(c.nombre)}</h1>
        <p class="texto-sec">${icono('chat')} ${esc(c.telefono || 'Sin teléfono')} · ${t.M('cliente')} desde ${F.fechaCortaAnio(c.alta)}</p>
        <div class="chips">${etiquetaSegmento(r)}${favS ? `<span class="chip chip-neutro">Prefiere: ${esc(favS)}</span>` : ''}${favP ? `<span class="chip chip-neutro">Con ${esc(favP.split(' ')[0])}</span>` : ''}</div>
      </div>
      <button type="button" class="btn btn-primario" data-agendar>${icono('calendario')} Agendar</button>
    </section>

    <div class="kpis kpis-4">
      ${kpi({ etiqueta: 'Visitas', valor: r.visitas })}
      ${kpi({ etiqueta: 'Gasto total', valor: F.dinero(r.gasto) })}
      ${kpi({ etiqueta: 'Ticket promedio', valor: F.dinero(r.ticket) })}
      ${kpi({ etiqueta: 'Última visita', valor: r.ultima ? F.capital(F.relativo(r.ultima, ctx.hoy)) : '—', nota: r.ultima ? F.fechaCortaAnio(r.ultima) : '' })}
    </div>

    <div class="rejilla-2">
      <div class="columna">
        <section class="tarjeta">
          <h2 class="tarjeta-titulo">Próximas ${t('cita', true)}</h2>
          ${
            proximas.length
              ? proximas.map((x) => filaCita(ctx, x)).join('')
              : `<p class="texto-sec">No tiene ${t('cita', true)} agendadas.</p>`
          }
        </section>
        ${secciones}
        <section class="tarjeta">
          <h2 class="tarjeta-titulo">Notas</h2>
          <textarea class="notas" rows="3" maxlength="500" data-notas placeholder="Preferencias, alergias, cómo nos conoció…">${esc(c.notas || '')}</textarea>
          <p class="ayuda" data-estado-notas>Se guardan solas en este navegador.</p>
        </section>
      </div>
      <section class="tarjeta">
        <h2 class="tarjeta-titulo">Historial</h2>
        ${
          historial.length
            ? historial
                .map((h) =>
                  h.tipo === 'cita'
                    ? filaCita(ctx, h.x)
                    : `<div class="fila-historial"><span class="fecha-mini"><b>${Number(h.v.fecha.slice(8))}</b><small>${F.mesCorto(F.claveMes(h.v.fecha))}</small></span>
                      <span class="fila-principal"><b>${esc(h.v.concepto)}</b><small>${h.v.tipo === 'paquete' ? 'Compra de paquete' : 'Compra en mostrador'}</small></span>
                      <span class="fila-lado"><b>${F.dinero(h.v.monto)}</b>${h.v.monto > h.v.pagado ? `<small class="texto-alerta">Debe ${F.dinero(h.v.monto - h.v.pagado)}</small>` : ''}</span></div>`,
                )
                .join('')
            : `<p class="texto-sec">Aún no tiene visitas.</p>`
        }
      </section>
    </div>`;

  const notas = el.querySelector('[data-notas]');
  let temporizador;
  notas.addEventListener('input', () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => {
      c.notas = notas.value;
      ctx.guardar();
      el.querySelector('[data-estado-notas]').textContent = 'Guardado ✓';
    }, 500);
  });
  el.addEventListener('click', (e) => {
    if (e.target.closest('[data-agendar]')) return formularioCita(ctx, { clienteId: c.id, servicioId: r.servicioFavorito || undefined, profesionalId: r.profesionalFavorito || undefined, alGuardar: () => ctx.refrescar() });
    const fc = e.target.closest('[data-cita]');
    if (fc) detalleCita(ctx, q.cita(fc.dataset.cita), { alCambiar: () => ctx.refrescar() });
  });
}

function filaCita(ctx, x) {
  const s = ctx.q.servicio(x.servicioId);
  const p = ctx.q.profesional(x.profesionalId);
  return `<button type="button" class="fila-historial" data-cita="${x.id}">
    <span class="fecha-mini"><b>${Number(x.fecha.slice(8))}</b><small>${F.mesCorto(F.claveMes(x.fecha))}</small></span>
    <span class="fila-principal"><b>${esc(s.nombre)}</b><small>${F.hora12(x.hora)} · ${esc(p.nombre)}${x.paqueteId ? ' · Paquete' : ''}</small></span>
    <span class="fila-lado">${x.estado === 'completada' ? `<b>${x.paqueteId ? '—' : F.dinero(x.cobrado)}</b>${!x.pagado && x.cobrado ? '<small class="texto-alerta">Pendiente</small>' : ''}` : chipEstado(x.estado)}</span>
  </button>`;
}
