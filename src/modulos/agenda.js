// Agenda: vista diaria (columna por profesional) y semanal. Crear citas tocando un hueco; moverlas arrastrando
// (con mouse) o desde "Mover o editar" (en celular).

import * as F from '../core/formato.js';
import { esc } from '../core/formato.js';
import { icono } from '../core/ui/iconos.js';
import { aviso, avatar } from '../core/ui/ui.js';
import { formularioCita, detalleCita } from '../core/citas.js';
import { profesionalOfrece } from '../core/datos/generador.js';

const PXM = 1.2; // píxeles por minuto (72 px por hora)
const estado = { vista: 'dia', fecha: null, prof: 'todos' };
let ultimoArrastre = 0;

export default {
  id: 'agenda',
  orden: 2,
  plan: 'presencia',
  grupo: 'negocio',
  icono: 'calendario',
  enBarra: true,
  titulo: 'Agenda',
  descripcion: 'Agenda diaria y semanal por profesional.',

  render(el, ctx, params) {
    if (params[0] && /^\d{4}-\d{2}-\d{2}$/.test(params[0])) estado.fecha = params[0];
    if (!estado.fecha) estado.fecha = ctx.hoy;
    if (matchMedia('(max-width: 640px)').matches && estado.vista === 'semana' && !estado.elegidaSemana) estado.vista = 'dia';

    const pintar = () => (estado.vista === 'dia' ? vistaDia(el, ctx, pintar) : vistaSemana(el, ctx, pintar));
    pintar();

    const quitarArrastre = habilitarArrastre(el, ctx, pintar);
    el.addEventListener('click', (e) => {
      if (e.target.matches('[data-elegir-fecha]')) {
        try {
          e.target.showPicker();
        } catch {
          /* navegadores sin showPicker abren el selector solos */
        }
        return;
      }
      const nav = e.target.closest('[data-nav]');
      if (nav) {
        const paso = estado.vista === 'dia' ? 1 : 7;
        estado.fecha = nav.dataset.nav === 'hoy' ? ctx.hoy : F.sumarDias(estado.fecha, Number(nav.dataset.nav) * paso);
        if (estado.vista === 'dia' && nav.dataset.nav !== 'hoy') {
          // Salta los días cerrados
          let guard = 0;
          while (!ctx.q.abiertoEl(estado.fecha) && guard++ < 7) estado.fecha = F.sumarDias(estado.fecha, Number(nav.dataset.nav));
        }
        return pintar();
      }
      const v = e.target.closest('[data-vista]');
      if (v) {
        estado.vista = v.dataset.vista;
        estado.elegidaSemana = estado.vista === 'semana';
        return pintar();
      }
      const fp = e.target.closest('[data-filtro-prof]');
      if (fp) {
        estado.prof = fp.dataset.filtroProf;
        return pintar();
      }
      const ir = e.target.closest('[data-ir-dia]');
      if (ir) {
        estado.fecha = ir.dataset.irDia;
        estado.vista = 'dia';
        return pintar();
      }
      if (e.target.closest('[data-nueva]')) return formularioCita(ctx, { fecha: estado.fecha < ctx.hoy ? ctx.hoy : estado.fecha, alGuardar: pintar });
      const b = e.target.closest('.ag-cita');
      if (b) {
        if (Date.now() - ultimoArrastre < 250) return;
        const cita = ctx.q.cita(b.dataset.id);
        if (cita) detalleCita(ctx, cita, { alCambiar: pintar });
        return;
      }
      const col = e.target.closest('.ag-col');
      if (col && e.target === col) {
        const min = ctx.q.abre + Math.floor(e.offsetY / PXM / 15) * 15;
        formularioCita(ctx, { fecha: col.dataset.fecha, hora: F.aHora(min), profesionalId: col.dataset.prof || undefined, alGuardar: pintar });
      }
    });
    el.addEventListener('change', (e) => {
      if (e.target.matches('[data-elegir-fecha]') && e.target.value) {
        estado.fecha = e.target.value;
        pintar();
      }
    });
    return quitarArrastre;
  },
};

// ---------- Barra superior ----------
function barra(ctx, titulo, resumen) {
  return `
    <div class="encabezado-vista ag-encabezado">
      <div>
        <p class="sobretitulo">Agenda</p>
        <h1 class="ag-titulo"><label>${esc(titulo)}<input type="date" data-elegir-fecha value="${estado.fecha}" aria-label="Elegir fecha"></label></h1>
      </div>
      <button type="button" class="btn btn-primario" data-nueva>${icono('agregar')} Nueva ${ctx.t('cita')}</button>
    </div>
    <div class="ag-controles">
      <div class="grupo-botones">
        <button type="button" class="btn-icono" data-nav="-1" aria-label="Anterior">${icono('izq')}</button>
        <button type="button" class="btn btn-sec btn-chico" data-nav="hoy">Hoy</button>
        <button type="button" class="btn-icono" data-nav="1" aria-label="Siguiente">${icono('der')}</button>
      </div>
      <div class="segmentado" role="tablist">
        <button type="button" role="tab" aria-selected="${estado.vista === 'dia'}" data-vista="dia">Día</button>
        <button type="button" role="tab" aria-selected="${estado.vista === 'semana'}" data-vista="semana">Semana</button>
      </div>
    </div>
    ${resumen}`;
}

function resumenCitas(ctx, citas) {
  const activas = citas.filter((c) => c.estado !== 'cancelada');
  const web = activas.filter((c) => c.origen === 'web').length;
  const sinConfirmar = activas.filter((c) => c.estado === 'programada' && !c.confirmada).length;
  return `<div class="ag-resumen">
    <span><b>${activas.length}</b> ${ctx.t('cita', activas.length !== 1)}</span>
    <span><b>${F.dinero(F.suma(activas, (c) => c.cobrado))}</b> estimado</span>
    ${web ? `<span>${icono('globo')} <b>${web}</b> por la web</span>` : ''}
    ${sinConfirmar ? `<span>${icono('campana')} <b>${sinConfirmar}</b> por confirmar</span>` : ''}
  </div>`;
}

function bloqueCita(ctx, c, extraEstilo = '') {
  const s = ctx.q.servicio(c.servicioId);
  const p = ctx.q.profesional(c.profesionalId);
  const cl = ctx.q.cliente(c.clienteId);
  const ini = F.aMin(c.hora);
  const top = (ini - ctx.q.abre) * PXM;
  const alto = Math.max(22, c.duracion * PXM - 3);
  const ahora = F.minutosAhora();
  const enCurso = c.estado === 'programada' && c.fecha === ctx.hoy && ini <= ahora && ahora < ini + c.duracion;
  const movible = c.estado === 'programada' && !enCurso;
  const compacto = alto < 44;
  return `<button type="button" class="ag-cita est-${enCurso ? 'en-curso' : c.estado}${compacto ? ' compacta' : ''}" data-id="${c.id}" ${movible ? 'data-movible' : ''}
      style="top:${top}px;height:${alto}px;--c:${p.color};${extraEstilo}" title="${esc(`${F.hora12(c.hora)} · ${cl.nombre} · ${s.nombre} · ${p.nombre}`)}">
    <span class="ag-cita-hora">${F.hora12(c.hora).replace(' a. m.', '').replace(' p. m.', '')}${c.origen === 'web' ? ` ${icono('globo')}` : ''}${c.paqueteId ? ` ${icono('paquete')}` : ''}${c.estado === 'completada' ? ` ${icono('ok')}` : ''}</span>
    <b>${esc(cl.nombre)}</b>
    ${compacto ? '' : `<span class="ag-cita-serv">${esc(s.nombre)}</span>`}
  </button>`;
}

function columnaHoras(ctx) {
  let html = '';
  for (let m = ctx.q.abre; m < ctx.q.cierra; m += 60) html += `<span style="top:${(m - ctx.q.abre) * PXM}px">${F.horaCorta(m)}</span>`;
  return `<div class="ag-horas">${html}</div>`;
}

function lineaAhora(ctx, fechas) {
  const ahora = F.minutosAhora();
  if (!fechas.includes(ctx.hoy) || ahora < ctx.q.abre || ahora > ctx.q.cierra) return '';
  return `<div class="ag-ahora" style="top:${(ahora - ctx.q.abre) * PXM}px"><span>${F.hora12(F.aHora(ahora))}</span></div>`;
}

function desplazarAHora(el, ctx) {
  const marco = el.querySelector('.ag-marco');
  if (!marco) return;
  const ahora = F.minutosAhora();
  const objetivo = estado.fecha === ctx.hoy || estado.vista === 'semana' ? Math.max(ctx.q.abre, ahora - 60) : ctx.q.abre;
  marco.scrollTop = Math.max(0, (objetivo - ctx.q.abre) * PXM);
}

// ---------- Vista diaria ----------
function vistaDia(el, ctx, pintar) {
  const { q, config } = ctx;
  const fecha = estado.fecha;
  const citas = ctx.datos.citas.filter((c) => c.fecha === fecha);
  const abierto = q.abiertoEl(fecha);
  const personal = config.personal;
  const alto = (q.cierra - q.abre) * PXM;
  const titulo = F.capital(fecha === ctx.hoy ? `hoy, ${F.fechaLarga(fecha)}` : F.fechaLarga(fecha));

  el.innerHTML = `
    ${barra(ctx, titulo, resumenCitas(ctx, citas))}
    ${
      !abierto
        ? `<div class="vacio">${icono('calendario')}<p>El negocio no abre este día.</p><button class="btn btn-sec" data-nav="1">Ir al siguiente día hábil</button></div>`
        : `<div class="ag-marco" style="--cols:${personal.length}">
      <div class="ag-cab">
        <div class="ag-esquina"></div>
        ${personal
          .map((p) => {
            const n = citas.filter((c) => c.profesionalId === p.id && c.estado !== 'cancelada').length;
            const descansa = (p.descanso || []).includes(F.diaSemana(fecha));
            return `<div class="ag-cab-col">${avatar(p.nombre, p.color, 'avatar-chico')}<span><b>${esc(p.nombre.split(' ')[0])}</b><small>${descansa ? 'Descansa' : `${n} ${ctx.t('cita', n !== 1)}`}</small></span></div>`;
          })
          .join('')}
      </div>
      <div class="ag-cuerpo" style="height:${alto}px">
        ${columnaHoras(ctx)}
        ${personal
          .map((p) => {
            const descansa = (p.descanso || []).includes(F.diaSemana(fecha));
            return `<div class="ag-col${descansa ? ' descanso' : ''}" data-prof="${p.id}" data-fecha="${fecha}" style="height:${alto}px">
            ${citas.filter((c) => c.profesionalId === p.id).sort((a, b) => (a.estado === 'cancelada') - (b.estado === 'cancelada')).map((c) => bloqueCita(ctx, c)).join('')}
          </div>`;
          })
          .join('')}
        ${lineaAhora(ctx, [fecha])}
      </div>
    </div>
    <p class="ayuda ag-ayuda">${icono('info')} Toca un espacio libre para agendar. En computadora puedes arrastrar una ${ctx.t('cita')} para moverla.</p>`
    }`;
  desplazarAHora(el, ctx);
}

// ---------- Vista semanal ----------
function vistaSemana(el, ctx) {
  const { q, config } = ctx;
  const lunes = F.inicioSemana(estado.fecha);
  const fechas = [0, 1, 2, 3, 4, 5, 6].map((i) => F.sumarDias(lunes, i)).filter((d) => q.abiertoEl(d));
  const citasSemana = ctx.datos.citas.filter((c) => c.fecha >= lunes && c.fecha <= F.sumarDias(lunes, 6));
  const filtradas = citasSemana.filter((c) => estado.prof === 'todos' || c.profesionalId === estado.prof);
  const alto = (q.cierra - q.abre) * PXM;
  const titulo = `Semana del ${F.fechaCorta(lunes)} al ${F.fechaCorta(F.sumarDias(lunes, 6))}`;

  el.innerHTML = `
    ${barra(ctx, titulo, resumenCitas(ctx, filtradas))}
    <div class="filtros" role="group" aria-label="Filtrar por ${ctx.t('profesional')}">
      <button type="button" class="filtro ${estado.prof === 'todos' ? 'activo' : ''}" data-filtro-prof="todos">Todos</button>
      ${config.personal.map((p) => `<button type="button" class="filtro ${estado.prof === p.id ? 'activo' : ''}" data-filtro-prof="${p.id}"><span class="punto" style="--c:${p.color}"></span>${esc(p.nombre.split(' ')[0])}</button>`).join('')}
    </div>
    <div class="ag-marco ag-semana" style="--cols:${fechas.length}">
      <div class="ag-cab">
        <div class="ag-esquina"></div>
        ${fechas
          .map((d) => {
            const n = filtradas.filter((c) => c.fecha === d && c.estado !== 'cancelada').length;
            return `<button type="button" class="ag-cab-col ag-cab-dia ${d === ctx.hoy ? 'hoy' : ''}" data-ir-dia="${d}"><span><b>${F.capital(F.diaCorto(d))}</b><small>${n} ${ctx.t('cita', n !== 1)}</small></span></button>`;
          })
          .join('')}
      </div>
      <div class="ag-cuerpo" style="height:${alto}px">
        ${columnaHoras(ctx)}
        ${fechas
          .map((d) => {
            const delDia = filtradas.filter((c) => c.fecha === d && c.estado !== 'cancelada');
            return `<div class="ag-col" data-fecha="${d}" ${estado.prof !== 'todos' ? `data-prof="${estado.prof}"` : ''} style="height:${alto}px">${carriles(delDia)
              .map(({ cita, carril, total }) => bloqueCita(ctx, cita, `left:calc(${(carril / total) * 100}% + 2px);width:calc(${100 / total}% - 4px);right:auto;`))
              .join('')}</div>`;
          })
          .join('')}
        ${lineaAhora(ctx, fechas)}
      </div>
    </div>
    <p class="ayuda ag-ayuda">${icono('info')} Toca un día para verlo por ${ctx.t('profesional')}. Las ${ctx.t('cita', true)} canceladas no se muestran en la semana.</p>`;
  desplazarAHora(el, ctx);
}

/** Reparte en carriles las citas que se enciman (de distintos profesionales) en la vista semanal. */
function carriles(citas) {
  const ordenadas = [...citas].sort((a, b) => F.aMin(a.hora) - F.aMin(b.hora));
  const out = [];
  let grupo = [];
  let finGrupo = -1;
  const cerrar = () => {
    const finCarril = [];
    const asignadas = grupo.map((c) => {
      const ini = F.aMin(c.hora);
      let i = finCarril.findIndex((f) => f <= ini);
      if (i === -1) i = finCarril.length;
      finCarril[i] = ini + c.duracion;
      return { cita: c, carril: i };
    });
    asignadas.forEach((a) => out.push({ ...a, total: finCarril.length }));
    grupo = [];
  };
  for (const c of ordenadas) {
    const ini = F.aMin(c.hora);
    if (grupo.length && ini >= finGrupo) cerrar();
    grupo.push(c);
    finGrupo = Math.max(grupo.length === 1 ? 0 : finGrupo, ini + c.duracion);
  }
  if (grupo.length) cerrar();
  return out;
}

// ---------- Arrastrar para mover (mouse) ----------
function habilitarArrastre(el, ctx, pintar) {
  let d = null;
  const abajo = (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    const b = e.target.closest('.ag-cita[data-movible]');
    if (!b) return;
    e.preventDefault(); // evita seleccionar texto o iniciar un arrastre nativo del navegador
    d = { b, id: b.dataset.id, x0: e.clientX, y0: e.clientY, dy: e.clientY - b.getBoundingClientRect().top, activo: false };
  };
  const mover = (e) => {
    if (!d) return;
    if (!d.activo) {
      if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 6) return;
      d.activo = true;
      d.fantasma = d.b.cloneNode(true);
      d.fantasma.classList.add('fantasma');
      d.fantasma.style.left = '2px';
      d.fantasma.style.width = 'calc(100% - 4px)';
      d.b.classList.add('origen-arrastre');
      document.body.classList.add('arrastrando');
    }
    e.preventDefault();
    const col = [...el.querySelectorAll('.ag-col')].find((c) => {
      const r = c.getBoundingClientRect();
      return e.clientX >= r.left && e.clientX <= r.right;
    });
    if (!col) return;
    const r = col.getBoundingClientRect();
    const cita = ctx.q.cita(d.id);
    let min = ctx.q.abre + Math.round((e.clientY - d.dy - r.top) / PXM / 15) * 15;
    min = Math.max(ctx.q.abre, Math.min(ctx.q.cierra - cita.duracion, min));
    d.destino = { fecha: col.dataset.fecha, profesionalId: col.dataset.prof || cita.profesionalId, hora: F.aHora(min) };
    if (d.fantasma.parentElement !== col) col.appendChild(d.fantasma);
    d.fantasma.style.top = `${(min - ctx.q.abre) * PXM}px`;
    d.fantasma.querySelector('.ag-cita-hora').textContent = F.hora12(d.destino.hora);
    const conflicto = ctx.q.hayConflicto({ ...d.destino, duracion: cita.duracion, id: cita.id });
    const p = ctx.q.profesional(d.destino.profesionalId);
    d.fantasma.classList.toggle('invalida', !!conflicto || !profesionalOfrece(p, cita.servicioId));
  };
  const arriba = () => {
    if (!d) return;
    const info = d;
    d = null;
    document.body.classList.remove('arrastrando');
    if (!info.activo) return;
    ultimoArrastre = Date.now();
    info.fantasma?.remove();
    info.b.classList.remove('origen-arrastre');
    if (!info.destino) return;
    const cita = ctx.q.cita(info.id);
    const destino = info.destino;
    if (destino.fecha === cita.fecha && destino.hora === cita.hora && destino.profesionalId === cita.profesionalId) return;
    const p = ctx.q.profesional(destino.profesionalId);
    if (!profesionalOfrece(p, cita.servicioId)) return aviso(`${esc(p.nombre)} no ofrece ${esc(ctx.q.servicio(cita.servicioId).nombre)}.`, { tipo: 'error' });
    const choque = ctx.q.hayConflicto({ ...destino, duracion: cita.duracion, id: cita.id });
    if (choque) return aviso(`Ese horario se cruza con otra ${ctx.t('cita')} de ${esc(p.nombre)}.`, { tipo: 'error' });
    const antes = { fecha: cita.fecha, hora: cita.hora, profesionalId: cita.profesionalId };
    Object.assign(cita, destino);
    ctx.guardar();
    pintar();
    aviso(`${ctx.t.M('cita')} movida a ${F.relativo(cita.fecha, ctx.hoy)}, ${F.hora12(cita.hora)} con ${esc(p.nombre)}`, {
      accion: {
        texto: 'Deshacer',
        alHacer: () => {
          Object.assign(cita, antes);
          ctx.guardar();
          pintar();
        },
      },
    });
  };
  const cancelar = () => {
    if (!d) return;
    d.fantasma?.remove();
    d.b.classList.remove('origen-arrastre');
    document.body.classList.remove('arrastrando');
    d = null;
  };
  el.addEventListener('pointerdown', abajo);
  window.addEventListener('pointermove', mover);
  window.addEventListener('pointerup', arriba);
  window.addEventListener('pointercancel', cancelar);
  return () => {
    window.removeEventListener('pointermove', mover);
    window.removeEventListener('pointerup', arriba);
    window.removeEventListener('pointercancel', cancelar);
  };
}
