// Web pública del negocio: portada, servicios y precios, reserva en línea y WhatsApp simulado.

import * as F from '../core/formato.js';
import { esc } from '../core/formato.js';
import { icono } from '../core/ui/iconos.js';
import { abrirModal, aviso, avatar, telefonoWhatsApp, leerFormulario } from '../core/ui/ui.js';
import { logoHtml } from '../core/tema.js';
import { buscarOCrearCliente, crearCita } from '../core/citas.js';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function textoHorario(h) {
  const dias = [...h.dias].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  const rango = dias.length > 2 ? `${F.capital(DIAS[dias[0]])} a ${DIAS[dias.at(-1)]}` : dias.map((d) => F.capital(DIAS[d])).join(' y ');
  return `${rango}, ${F.hora12(h.abre)} – ${F.hora12(h.cierra)}`;
}

export default {
  id: 'web',
  orden: 1,
  plan: 'presencia',
  grupo: 'negocio',
  icono: 'globo',
  titulo: 'Web pública',
  descripcion: 'Tu página con servicios, precios y reservas en línea las 24 horas.',

  render(el, ctx) {
    const { config, t } = ctx;
    const n = config.negocio;
    const categorias = [...new Set(config.servicios.filter((s) => !s.soloVenta).map((s) => s.categoria || 'Servicios'))];
    const extrasWeb = ctx.hook('seccionWeb').join('');

    el.innerHTML = `
      <div class="encabezado-vista">
        <div><p class="sobretitulo">Lo que ven tus ${t('cliente', true)}</p><h1>Web pública</h1></div>
        <span class="chip chip-info">${icono('globo')} Lista para tu dominio</span>
      </div>
      <div class="navegador">
        <div class="navegador-barra" aria-hidden="true"><span class="puntos"><i></i><i></i><i></i></span><span class="url">${icono('candado')} vista previa de tu sitio</span></div>
        <div class="sitio">
          <section class="sitio-hero">
            ${logoHtml(config, 'logo-grande')}
            <h2>${esc(n.nombre)}</h2>
            <p class="sitio-tagline">${esc(n.tagline)}</p>
            <div class="sitio-ctas">
              <button type="button" class="btn btn-primario btn-grande" data-reservar>${icono('calendario')} Reservar ${t('cita')}</button>
              <button type="button" class="btn btn-whatsapp btn-grande" data-whatsapp>${icono('chat')} WhatsApp</button>
            </div>
            <ul class="sitio-datos">
              <li>${icono('reloj')} ${esc(textoHorario(n.horario))}</li>
              <li>${icono('ubicacion')} ${esc(n.direccion)}</li>
            </ul>
          </section>

          <section class="sitio-seccion">
            <h3>${t.M('servicio', true)} y precios</h3>
            ${categorias
              .map(
                (cat) => `
              ${categorias.length > 1 ? `<p class="sitio-categoria">${esc(cat)}</p>` : ''}
              <div class="sitio-servicios">
                ${config.servicios
                  .filter((s) => !s.soloVenta && (s.categoria || 'Servicios') === cat)
                  .map(
                    (s) => `
                  <article class="sitio-servicio">
                    <div><h4>${esc(s.nombre)}</h4>${s.descripcion ? `<p>${esc(s.descripcion)}</p>` : ''}<small>${icono('reloj')} ${s.duracion} min</small></div>
                    <div class="sitio-precio"><b>${F.dinero(s.precio)}</b><button type="button" class="btn btn-sec btn-chico" data-reservar="${s.id}">Reservar</button></div>
                  </article>`,
                  )
                  .join('')}
              </div>`,
              )
              .join('')}
          </section>

          ${extrasWeb}

          <section class="sitio-seccion">
            <h3>Nuestro equipo</h3>
            <div class="sitio-equipo">
              ${config.personal
                .map((p) => `<div class="sitio-persona">${avatar(p.nombre, p.color, 'avatar-grande')}<b>${esc(p.nombre)}</b><small>${esc(p.puesto || t.M('profesional'))}</small></div>`)
                .join('')}
            </div>
          </section>

          ${
            config.resenas.length
              ? `<section class="sitio-seccion">
            <h3>Lo que dicen nuestros ${t('cliente', true)}</h3>
            <div class="sitio-resenas">
              ${config.resenas
                .map((r) => `<blockquote><span class="estrellas" aria-label="${r.estrellas} de 5">${'★'.repeat(r.estrellas)}${'☆'.repeat(5 - r.estrellas)}</span><p>“${esc(r.texto)}”</p><cite>${esc(r.autor)}</cite></blockquote>`)
                .join('')}
            </div>
          </section>`
              : ''
          }

          <section class="sitio-seccion sitio-ubicacion">
            <div class="sitio-mapa" aria-hidden="true"><span class="pin">${icono('ubicacion')}</span></div>
            <div>
              <h3>Visítanos</h3>
              <p>${esc(n.direccion)}</p>
              <p>${esc(textoHorario(n.horario))}</p>
              <p class="texto-sec">WhatsApp: ${esc(n.whatsapp)} (número ficticio)</p>
            </div>
          </section>

          <footer class="sitio-pie">© ${new Date().getFullYear()} ${esc(n.nombre)} · Sitio de demostración con datos ficticios</footer>
        </div>
      </div>
      <button type="button" class="wa-flotante" data-whatsapp aria-label="Escribir por WhatsApp">${icono('chat')}</button>`;

    const alClic = (e) => {
      const r = e.target.closest('[data-reservar]');
      if (r) return reservar(ctx, r.dataset.reservar || null);
      if (e.target.closest('[data-whatsapp]')) return chatWhatsApp(ctx);
    };
    el.addEventListener('click', alClic);
  },
};

/** Reserva en línea en pasos simples: servicio → día → horario → datos. */
export function reservar(ctx, servicioId = null) {
  const { config, q, t } = ctx;
  const hoy = F.hoyIso();
  const dias = [];
  for (let d = hoy; dias.length < 10; d = F.sumarDias(d, 1)) if (q.abiertoEl(d)) dias.push(d);
  const servicios = config.servicios.filter((s) => !s.soloVenta);
  const sel = { servicioId: servicioId || servicios[0].id, profesionalId: '', fecha: dias[0], hora: '' };

  const m = abrirModal({
    titulo: `Reservar ${t('cita')}`,
    clase: 'modal-reserva',
    cuerpo: `
      <form class="form" id="form-reserva" autocomplete="off">
        <label class="campo"><span>${t.M('servicio')}</span>
          <select name="servicioId">${servicios.map((s) => `<option value="${s.id}" ${s.id === sel.servicioId ? 'selected' : ''}>${esc(s.nombre)} · ${F.dinero(s.precio)}</option>`).join('')}</select>
        </label>
        <label class="campo"><span>${t.M('profesional')}</span><select name="profesionalId"></select></label>
        <fieldset class="campo"><legend>Día</legend><div class="dias-reserva" data-dias></div></fieldset>
        <fieldset class="campo"><legend>Horario</legend><div class="horas-reserva" data-horas></div></fieldset>
        <div class="campos-2">
          <label class="campo"><span>Tu nombre</span><input name="nombre" required maxlength="60" placeholder="Nombre y apellido"></label>
          <label class="campo"><span>WhatsApp</span><input name="telefono" inputmode="tel" maxlength="20" placeholder="10 dígitos"></label>
        </div>
        <p class="ayuda">Demo: lo que escribas solo se guarda en este navegador.</p>
      </form>`,
    pie: `<button type="button" class="btn btn-sec" data-cerrar>Cancelar</button>
          <button type="submit" form="form-reserva" class="btn btn-primario">${icono('ok')} Confirmar reserva</button>`,
  });
  const form = m.$('#form-reserva');

  function pintarProfesionales() {
    const profs = q.profesionalesPara(form.servicioId.value);
    form.profesionalId.innerHTML = `<option value="">Sin preferencia</option>${profs.map((p) => `<option value="${p.id}">${esc(p.nombre)}</option>`).join('')}`;
  }
  function pintarDias() {
    m.$('[data-dias]').innerHTML = dias
      .map((d) => {
        const libres = q.horariosLibres({ fecha: d, servicioId: form.servicioId.value, profesionalId: form.profesionalId.value || null }).length;
        return `<button type="button" class="dia-btn ${d === sel.fecha ? 'activo' : ''}" data-fecha="${d}" ${libres ? '' : 'disabled'}>
          <small>${d === hoy ? 'Hoy' : F.capital(F.nombreDia(d).slice(0, 3))}</small><b>${Number(d.slice(8))}</b><small>${libres ? `${libres} libres` : 'Lleno'}</small></button>`;
      })
      .join('');
  }
  function pintarHoras() {
    const libres = q.horariosLibres({ fecha: sel.fecha, servicioId: form.servicioId.value, profesionalId: form.profesionalId.value || null });
    if (!libres.some((h) => h.hora === sel.hora)) sel.hora = '';
    m.$('[data-horas]').innerHTML = libres.length
      ? libres.map((h) => `<button type="button" class="hora-btn ${h.hora === sel.hora ? 'activo' : ''}" data-hora="${h.hora}">${F.hora12(h.hora)}</button>`).join('')
      : `<p class="texto-sec">No quedan horarios este día. Prueba otro.</p>`;
  }
  pintarProfesionales();
  // Si el primer día no tiene horarios, salta al siguiente con espacio
  sel.fecha = dias.find((d) => q.horariosLibres({ fecha: d, servicioId: form.servicioId.value }).length) || dias[0];
  pintarDias();
  pintarHoras();

  form.servicioId.addEventListener('change', () => (pintarProfesionales(), pintarDias(), pintarHoras()));
  form.profesionalId.addEventListener('change', () => (pintarDias(), pintarHoras()));
  m.el.addEventListener('click', (e) => {
    const d = e.target.closest('[data-fecha]');
    if (d) {
      sel.fecha = d.dataset.fecha;
      pintarDias();
      pintarHoras();
    }
    const h = e.target.closest('[data-hora]');
    if (h) {
      sel.hora = h.dataset.hora;
      m.$$('[data-hora]').forEach((b) => b.classList.toggle('activo', b === h));
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = leerFormulario(form);
    if (!sel.hora) return aviso('Elige un horario.', { tipo: 'error' });
    const opcion = q.horariosLibres({ fecha: sel.fecha, servicioId: v.servicioId, profesionalId: v.profesionalId || null }).find((h) => h.hora === sel.hora);
    if (!opcion) return aviso('Ese horario ya se ocupó, elige otro.', { tipo: 'error' });
    const profesionalId = v.profesionalId || opcion.profesionales[0];
    const cliente = buscarOCrearCliente(ctx, { nombre: v.nombre, telefono: v.telefono });
    const { cita } = crearCita(ctx, { clienteId: cliente.id, servicioId: v.servicioId, profesionalId, fecha: sel.fecha, hora: sel.hora, origen: 'web' });
    const s = q.servicio(cita.servicioId);
    m.el.querySelector('.modal-cuerpo').innerHTML = `
      <div class="reserva-lista">
        <div class="reserva-ok">${icono('ok')}</div>
        <h3>¡Listo, ${esc(cliente.nombre.split(' ')[0])}!</h3>
        <p>Tu ${t('cita')} de <b>${esc(s.nombre)}</b> con ${esc(q.profesional(profesionalId).nombre)} quedó para el <b>${esc(F.fechaLarga(cita.fecha))}</b> a las <b>${F.hora12(cita.hora)}</b></p>
        <p class="texto-sec">Te llegaría un recordatorio por WhatsApp un día antes (simulado).</p>
      </div>`;
    m.el.querySelector('.modal-pie').innerHTML = `
      <button type="button" class="btn btn-sec" data-cerrar>Cerrar</button>
      <a class="btn btn-primario" href="#/agenda/${cita.fecha}" data-cerrar>${icono('calendario')} Verla en la agenda</a>`;
  });
}

/** Conversación de WhatsApp simulada: nada se envía. */
function chatWhatsApp(ctx) {
  const n = ctx.config.negocio;
  const ahora = F.hora12(F.aHora(F.minutosAhora()));
  const mensajes = [];
  const m = abrirModal({
    titulo: 'WhatsApp (simulado)',
    clase: 'modal-wa',
    cuerpo: `<div data-tel></div>
      <form class="wa-entrada" id="form-wa"><input name="texto" value="Hola, quiero agendar una ${esc(ctx.t('cita'))} 🙂" maxlength="200" aria-label="Mensaje"><button class="btn btn-whatsapp" aria-label="Enviar">${icono('enviar')}</button></form>`,
  });
  const pintar = () => {
    m.$('[data-tel]').innerHTML = telefonoWhatsApp({ titulo: n.nombre, subtitulo: 'Cuenta de empresa · en línea', logo: logoHtml(ctx.config, 'logo-mini'), mensajes });
    const chat = m.$('.wa-chat');
    chat.scrollTop = chat.scrollHeight;
  };
  pintar();
  m.$('#form-wa').addEventListener('submit', (e) => {
    e.preventDefault();
    const texto = e.target.texto.value.trim();
    if (!texto) return;
    mensajes.push({ texto, hora: ahora, mio: true });
    e.target.texto.value = '';
    pintar();
    setTimeout(() => {
      mensajes.push({
        texto: `¡Hola! 👋 Gracias por escribir a *${n.nombre}*.\n\nPuedes reservar en línea en 1 minuto, eligiendo día, horario y ${ctx.t('profesional')}. Si prefieres, aquí te ayudamos.\n\n_Respuesta automática_`,
        hora: ahora,
        mio: false,
      });
      pintar();
    }, 700);
  });
}
