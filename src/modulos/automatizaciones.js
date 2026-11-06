// Mensajes automáticos (simulados): recordatorios, agradecimiento y reseña, promoción a inactivos,
// aviso de paquete por vencer y reporte semanal al dueño. Vista previa estilo WhatsApp.

import * as F from '../core/formato.js';
import { esc } from '../core/formato.js';
import { icono } from '../core/ui/iconos.js';
import { abrirModal, aviso, avatar, etiquetaPlan, telefonoWhatsApp, plantilla, vacio } from '../core/ui/ui.js';
import { logoHtml } from '../core/tema.js';
import { planPorId } from '../core/planes.js';

export const AUTOMATIZACIONES = [
  { id: 'recordatorio', titulo: 'Recordatorio de cita', cuando: '24 horas antes de cada cita', plan: 'presencia', icono: 'campana', beneficio: 'Menos faltas y cancelaciones de último minuto' },
  { id: 'agradecimiento', titulo: 'Agradecimiento y reseña', cuando: '2 horas después de la visita', plan: 'crecimiento', icono: 'estrella', beneficio: 'Más reseñas de 5 estrellas sin pedirlas en persona' },
  { id: 'inactivos', titulo: 'Promoción a inactivos', cuando: 'Sin visita en 45 días · martes 11:00 a. m.', plan: 'crecimiento', icono: 'corazon', beneficio: 'Recupera clientes que dejaron de venir' },
  { id: 'paquete', titulo: 'Paquete por vencer', cuando: '14 días antes del vencimiento', plan: 'crecimiento', icono: 'paquete', beneficio: 'Que nadie pierda sesiones pagadas' },
  { id: 'reporte', titulo: 'Reporte semanal al dueño', cuando: 'Cada lunes a las 8:00 a. m.', plan: 'control', icono: 'grafica', beneficio: 'Tus números clave sin abrir la computadora' },
];

const PLANTILLAS = {
  recordatorio:
    'Hola {nombre} 👋\nTe recordamos tu {cita} de *{servicio}* con {profesional} {cuando} a las *{hora}*.\n\n📍 {direccion}\n\nResponde *1* para confirmar o *2* si necesitas cambiarla.',
  agradecimiento:
    '¡Gracias por visitarnos hoy, {nombre}! 💚\nEsperamos que hayas disfrutado tu {servicio} con {profesional}.\n\n¿Nos regalas una reseña? Te toma 1 minuto y nos ayuda muchísimo ⭐⭐⭐⭐⭐\n👉 {enlaceResena}',
  inactivos:
    '¡Hola {nombre}! Te extrañamos en *{negocio}* 🌟\nYa pasaron {dias} días desde tu última visita. Esta semana tienes *{promo}* en tu próximo {servicio}.\n\nReserva aquí 👉 {enlace}',
  paquete:
    'Hola {nombre} 👋 Tu paquete *{paquete}* vence el *{vence}* y aún te quedan *{restantes} sesiones*.\n\n¡Agenda para aprovecharlas! 👉 {enlace}',
  reporte:
    '📊 *Reporte semanal · {negocio}*\n{rango}\n\n💰 Ingresos: *{ingresos}* ({delta} vs. semana anterior)\n📅 {citasTexto}: {citas}\n⭐ Lo más vendido: {top}\n🆕 {nuevosTexto}: {nuevos}\n❌ Cancelaciones y faltas: {cancelaciones}\n💳 Por cobrar: {porCobrar}\n\n{consejo}',
};

const estado = { filtro: 'todos', seleccion: null };

export default {
  id: 'mensajes',
  orden: 6,
  plan: 'presencia',
  grupo: 'marketing',
  icono: 'mensaje',
  enBarra: true,
  titulo: 'Mensajes',
  descripcion: 'Mensajes automáticos por WhatsApp.',

  render(el, ctx) {
    const { config, t } = ctx;
    const ajustes = (ctx.datos.ajustes ||= { automatizaciones: {} }).automatizaciones;
    const activa = (a) => ctx.incluye(a.plan) && ajustes[a.id] !== false;
    const todos = generarMensajes(ctx);
    const disponibles = AUTOMATIZACIONES.filter((a) => a.id !== 'paquete' || todos.some((m) => m.tipo === 'paquete') || ctx.extras.some((e) => e.hooks?.mensajesProgramados));
    const visibles = todos.filter((m) => activa(AUTOMATIZACIONES.find((a) => a.id === m.tipo)));
    const filtrados = visibles.filter((m) => estado.filtro === 'todos' || m.tipo === estado.filtro);
    if (!filtrados.some((m) => m.id === estado.seleccion)) estado.seleccion = filtrados[0]?.id || null;
    const recordatorios30 = ctx.datos.citas.filter((c) => c.fecha >= F.sumarDias(ctx.hoy, -30) && c.fecha <= ctx.hoy).length;

    el.innerHTML = `
      <div class="encabezado-vista">
        <div><p class="sobretitulo">Por WhatsApp, sin que tú hagas nada</p><h1>Mensajes automáticos</h1></div>
        <span class="chip chip-neutro">${icono('info')} Simulación: no se envía nada</span>
      </div>
      <div class="rejilla-auto">
        ${disponibles
          .map((a) => {
            const incluida = ctx.incluye(a.plan);
            const n = todos.filter((m) => m.tipo === a.id && m.estado === 'programado').length;
            return `<article class="tarjeta auto ${incluida ? '' : 'bloqueada'}">
              <div class="auto-cab"><span class="auto-ico">${icono(a.icono)}</span>
                ${incluida
                  ? `<label class="interruptor" title="Activar o pausar"><input type="checkbox" data-toggle="${a.id}" ${ajustes[a.id] !== false ? 'checked' : ''}><span></span></label>`
                  : etiquetaPlan(a.plan)}
              </div>
              <h2>${esc(a.titulo)}</h2>
              <p class="texto-sec">${esc(a.cuando)}</p>
              <p class="auto-beneficio">${esc(a.beneficio)}</p>
              ${incluida
                ? `<p class="auto-estado">${ajustes[a.id] === false ? 'En pausa' : `<b>${n}</b> programado${n === 1 ? '' : 's'}`}</p>`
                : `<button type="button" class="btn btn-sec btn-chico" data-cambiar-plan="${a.plan}">Ver con plan ${esc(planPorId(a.plan).nombre)}</button>`}
            </article>`;
          })
          .join('')}
      </div>
      ${ctx.incluye('presencia') ? `<p class="historia">${icono('campana')}<span>En los últimos 30 días se enviaron <b>${recordatorios30}</b> recordatorios de ${t('cita')} automáticamente.</span></p>` : ''}

      <div class="rejilla-mensajes">
        <section class="tarjeta">
          <div class="tarjeta-cab"><h2 class="tarjeta-titulo">Próximos y recientes</h2></div>
          <div class="filtros">
            <button type="button" class="filtro ${estado.filtro === 'todos' ? 'activo' : ''}" data-filtro="todos">Todos <small>${visibles.length}</small></button>
            ${disponibles
              .filter((a) => activa(a))
              .map((a) => `<button type="button" class="filtro ${estado.filtro === a.id ? 'activo' : ''}" data-filtro="${a.id}">${esc(a.titulo.split(' ')[0])} <small>${visibles.filter((m) => m.tipo === a.id).length}</small></button>`)
              .join('')}
          </div>
          <div class="lista-mensajes">
            ${
              filtrados.length
                ? filtrados
                    .map((m) => `<button type="button" class="fila-mensaje ${m.id === estado.seleccion ? 'activo' : ''}" data-msg="${m.id}">
                ${m.tipo === 'reporte' ? `<span class="avatar" style="--c:#1F2A37">${icono('grafica')}</span>` : avatar(m.para)}
                <span class="fila-principal"><b>${esc(m.para)}</b><small>${esc(AUTOMATIZACIONES.find((a) => a.id === m.tipo).titulo)} · ${esc(m.cuandoTexto)}</small>
                  <span class="msg-extracto">${esc(m.texto.replace(/[*_]/g, '').split('\n')[0])}</span></span>
                <span class="chip ${m.estado === 'enviado' ? 'chip-ok' : 'chip-info'}">${m.estado === 'enviado' ? 'Enviado' : 'Programado'}</span>
              </button>`)
                    .join('')
                : vacio('No hay mensajes con este filtro.', 'mensaje')
            }
          </div>
        </section>
        <aside class="vista-previa" data-preview></aside>
      </div>`;

    const pintarPrevia = () => {
      const m = visibles.find((x) => x.id === estado.seleccion);
      el.querySelector('[data-preview]').innerHTML = m ? previa(ctx, m) : '';
    };
    pintarPrevia();

    el.addEventListener('click', (e) => {
      const f = e.target.closest('[data-filtro]');
      if (f) {
        estado.filtro = f.dataset.filtro;
        return ctx.refrescar();
      }
      const fila = e.target.closest('[data-msg]');
      if (fila) {
        estado.seleccion = fila.dataset.msg;
        el.querySelectorAll('[data-msg]').forEach((b) => b.classList.toggle('activo', b === fila));
        if (matchMedia('(max-width: 959px)').matches) {
          const m = visibles.find((x) => x.id === estado.seleccion);
          abrirModal({ titulo: 'Vista previa', clase: 'modal-wa', cuerpo: previa(ctx, m) });
        } else pintarPrevia();
        return;
      }
      if (e.target.closest('[data-prueba]')) aviso('Simulación: en la versión real este mensaje llegaría por WhatsApp.', { tipo: 'info' });
    });
    el.addEventListener('change', (e) => {
      const tg = e.target.closest('[data-toggle]');
      if (!tg) return;
      ajustes[tg.dataset.toggle] = tg.checked;
      ctx.guardar();
      aviso(tg.checked ? 'Automatización activada' : 'Automatización en pausa', { tipo: 'info' });
      ctx.refrescar();
    });
  },
};

function previa(ctx, m) {
  const n = ctx.config.negocio;
  const esReporte = m.tipo === 'reporte';
  return `${telefonoWhatsApp({
    titulo: esReporte ? `Asistente · ${n.nombre}` : n.nombre,
    subtitulo: esReporte ? 'Reporte automático del negocio' : 'Cuenta de empresa',
    logo: logoHtml(ctx.config, 'logo-mini'),
    mensajes: [{ texto: m.texto, hora: m.horaTexto, mio: false }, ...(m.respuestas || [])],
  })}
  <div class="previa-pie"><span class="texto-sec">Para: <b>${esc(m.para)}</b> · ${esc(m.cuandoTexto)}</span>
  <button type="button" class="btn btn-sec btn-chico" data-prueba>${icono('enviar')} Enviar prueba</button></div>`;
}

/** Arma todos los mensajes a partir de los datos actuales. */
export function generarMensajes(ctx) {
  const { q, config, hoy, t } = ctx;
  const n = config.negocio;
  const ahora = F.minutosAhora();
  const textos = { ...PLANTILLAS, ...config.mensajes };
  const base = { negocio: n.nombre, direccion: n.direccion, enlace: 'reservas.tunegocio.mx', enlaceResena: 'enlace a tu perfil de reseñas', cita: t('cita') };
  const primerNombre = (nombre) => nombre.split(' ')[0];
  const out = [];

  // Recordatorios: citas de hoy (enviado ayer), mañana y pasado mañana
  for (const c of ctx.datos.citas) {
    if (c.estado !== 'programada' || c.fecha < hoy || c.fecha > F.sumarDias(hoy, 2)) continue;
    const cl = q.cliente(c.clienteId);
    const envio = F.sumarDias(c.fecha, -1);
    const enviado = envio < hoy || (envio === hoy && F.aMin(c.hora) <= ahora);
    out.push({
      id: `rec-${c.id}`,
      tipo: 'recordatorio',
      para: cl.nombre,
      orden: `${envio}${c.hora}`,
      estado: enviado ? 'enviado' : 'programado',
      cuandoTexto: `${F.capital(F.relativo(envio, hoy))}, ${F.hora12(c.hora)}`,
      horaTexto: F.hora12(c.hora),
      texto: plantilla(textos.recordatorio, {
        ...base,
        nombre: primerNombre(cl.nombre),
        servicio: q.servicio(c.servicioId).nombre,
        profesional: primerNombre(q.profesional(c.profesionalId).nombre),
        cuando: F.relativo(c.fecha, envio),
        hora: F.hora12(c.hora),
      }),
      respuestas: enviado && c.confirmada ? [{ texto: '1', hora: F.hora12(c.hora), mio: true }, { texto: '¡Gracias por confirmar! Te esperamos 🙌', hora: F.hora12(c.hora), mio: false }] : [],
    });
  }

  // Agradecimiento + reseña: visitas de hoy y ayer
  for (const c of ctx.datos.citas) {
    if (c.estado !== 'completada' || (c.fecha !== hoy && c.fecha !== F.sumarDias(hoy, -1))) continue;
    const cl = q.cliente(c.clienteId);
    if (cl.dePaso) continue;
    const envioMin = Math.min(F.aMin(c.hora) + c.duracion + 120, 21 * 60);
    const enviado = c.fecha < hoy || envioMin <= ahora;
    out.push({
      id: `agr-${c.id}`,
      tipo: 'agradecimiento',
      para: cl.nombre,
      orden: `${c.fecha}${F.aHora(envioMin)}`,
      estado: enviado ? 'enviado' : 'programado',
      cuandoTexto: `${F.capital(F.relativo(c.fecha, hoy))}, ${F.hora12(F.aHora(envioMin))}`,
      horaTexto: F.hora12(F.aHora(envioMin)),
      texto: plantilla(textos.agradecimiento, { ...base, nombre: primerNombre(cl.nombre), servicio: q.servicio(c.servicioId).nombre, profesional: primerNombre(q.profesional(c.profesionalId).nombre) }),
      respuestas: enviado && (c.id.charCodeAt(c.id.length - 1) % 3 === 0) ? [{ texto: '¡Me encantó! Ya dejé mi reseña ⭐', hora: F.hora12(F.aHora(Math.min(envioMin + 25, 23 * 60))), mio: true }] : [],
    });
  }

  // Promoción a inactivos: próximo martes a las 11:00
  const resumen = q.resumenClientes();
  let martes = hoy;
  while (F.diaSemana(martes) !== 2 || (martes === hoy && ahora >= 11 * 60)) martes = F.sumarDias(martes, 1);
  for (const cl of ctx.datos.clientes) {
    const r = resumen.get(cl.id);
    if (r.segmento !== 'inactivo' || !r.ultima) continue;
    out.push({
      id: `ina-${cl.id}`,
      tipo: 'inactivos',
      para: cl.nombre,
      orden: `${martes}11:00`,
      estado: 'programado',
      cuandoTexto: `${F.capital(F.relativo(martes, hoy))}, 11:00 a. m.`,
      horaTexto: '11:00 a. m.',
      texto: plantilla(textos.inactivos, {
        ...base,
        nombre: primerNombre(cl.nombre),
        dias: F.difDias(r.ultima, hoy),
        promo: config.mensajes.promoInactivos || '15% de descuento',
        servicio: r.servicioFavorito ? q.servicio(r.servicioFavorito).nombre.toLowerCase() : t('servicio'),
      }),
    });
  }

  // Paquetes por vencer (los aporta el extra correspondiente)
  for (const lista of ctx.hookSiempre('mensajesProgramados')) {
    for (const m of lista) {
      out.push({
        horaTexto: '10:00 a. m.',
        estado: 'programado',
        ...m,
        texto: plantilla(textos[m.tipo] || m.texto || '', { ...base, ...m.vars }),
      });
    }
  }

  // Reporte semanal al dueño (de la última semana completa)
  const lunes = F.inicioSemana(hoy);
  const desde = F.sumarDias(lunes, -7);
  const hasta = F.sumarDias(lunes, -1);
  const sem = q.resultado(desde, hasta);
  const semPrevia = q.resultado(F.sumarDias(desde, -7), F.sumarDias(hasta, -7));
  const rentab = q.rentabilidad(desde, hasta);
  const citasSemana = ctx.datos.citas.filter((c) => c.fecha >= desde && c.fecha <= hasta);
  const nuevos = ctx.datos.clientes.filter((c) => c.alta >= desde && c.alta <= hasta).length;
  const inactivos = [...resumen.values()].filter((r) => r.segmento === 'inactivo').length;
  const porCobrar = F.suma(q.cuentasPorCobrar(), (c) => c.saldo);
  const delta = F.variacion(sem.ingresos, semPrevia.ingresos);
  const consejo =
    inactivos >= 4
      ? `💡 Tienes ${inactivos} ${t('cliente', true)} que no vienen hace más de 45 días. La promoción automática les escribirá el martes.`
      : `💡 Tu ticket promedio fue de ${F.dinero(sem.ticket)}. Ofrecer un complemento al reservar puede subirlo.`;
  const envioReporte = F.diaSemana(hoy) === 1 && ahora < 8 * 60 ? 'programado' : 'enviado';
  out.push({
    id: `rep-${desde}`,
    tipo: 'reporte',
    para: n.dueno || 'Dueño del negocio',
    orden: `${lunes}08:00`,
    estado: envioReporte,
    cuandoTexto: `Lunes ${F.fechaCorta(lunes)}, 8:00 a. m.`,
    horaTexto: '8:00 a. m.',
    texto: plantilla(textos.reporte, {
      ...base,
      rango: `Del ${F.fechaCorta(desde)} al ${F.fechaCorta(hasta)}`,
      ingresos: F.dinero(sem.ingresos),
      delta: `${delta >= 0 ? '+' : '−'}${F.porcentaje(Math.abs(delta))}`,
      citasTexto: `${t.M('cita', true)} atendidas`,
      citas: sem.atendidas,
      top: rentab[0] ? `${rentab[0].servicio.nombre} (${rentab[0].cantidad})` : '—',
      nuevosTexto: `${t.M('cliente', true)} nuevos`,
      nuevos,
      cancelaciones: citasSemana.filter((c) => c.estado === 'cancelada' || c.estado === 'no-asistio').length,
      porCobrar: F.dinero(porCobrar),
      consejo,
    }),
  });

  // Primero lo programado más próximo, luego lo enviado más reciente
  return out.sort((a, b) => (a.estado === b.estado ? (a.estado === 'programado' ? a.orden.localeCompare(b.orden) : b.orden.localeCompare(a.orden)) : a.estado === 'programado' ? -1 : 1));
}
