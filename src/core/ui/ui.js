// Piezas de interfaz compartidas: ventanas, avisos, tarjetas de indicadores, candado de plan y vista de WhatsApp.

import { esc, iniciales, porcentaje } from '../formato.js';
import { icono } from './iconos.js';
import { hashTexto } from '../datos/semilla.js';
import { planPorId } from '../planes.js';

// ---------- Ventana (en celular se abre como hoja inferior) ----------
export function abrirModal({ titulo, cuerpo, pie = '', clase = '', alAbrir, alCerrar }) {
  const fondo = document.createElement('div');
  fondo.className = 'modal-fondo';
  fondo.innerHTML = `
    <div class="modal ${clase}" role="dialog" aria-modal="true" aria-label="${esc(titulo)}" tabindex="-1">
      <header class="modal-cab">
        <h2>${esc(titulo)}</h2>
        <button type="button" class="btn-icono" data-cerrar aria-label="Cerrar">${icono('cerrar')}</button>
      </header>
      <div class="modal-cuerpo">${cuerpo}</div>
      ${pie ? `<footer class="modal-pie">${pie}</footer>` : ''}
    </div>`;
  document.body.appendChild(fondo);
  document.body.classList.add('con-modal');
  const modal = fondo.querySelector('.modal');

  let cerrado = false;
  const tecla = (e) => e.key === 'Escape' && cerrar();
  function cerrar() {
    if (cerrado) return;
    cerrado = true;
    fondo.classList.remove('visible');
    document.removeEventListener('keydown', tecla);
    setTimeout(() => {
      fondo.remove();
      if (!document.querySelector('.modal-fondo')) document.body.classList.remove('con-modal');
    }, 180);
    alCerrar?.();
  }
  document.addEventListener('keydown', tecla);
  fondo.addEventListener('click', (e) => {
    if (e.target === fondo || e.target.closest('[data-cerrar]')) cerrar();
  });
  requestAnimationFrame(() => fondo.classList.add('visible'));
  modal.focus({ preventScroll: true });

  const api = { el: modal, cerrar, $: (s) => modal.querySelector(s), $$: (s) => [...modal.querySelectorAll(s)] };
  alAbrir?.(api);
  return api;
}

export function confirmar(texto, { titulo = '¿Confirmas?', si = 'Sí, continuar', no = 'Cancelar', peligro = false } = {}) {
  return new Promise((resolver) => {
    let respuesta = false;
    const m = abrirModal({
      titulo,
      clase: 'modal-chico',
      cuerpo: `<p>${texto}</p>`,
      pie: `<button class="btn btn-sec" data-cerrar>${esc(no)}</button>
            <button class="btn ${peligro ? 'btn-peligro' : 'btn-primario'}" data-si>${esc(si)}</button>`,
      alCerrar: () => resolver(respuesta),
    });
    m.$('[data-si]').addEventListener('click', () => {
      respuesta = true;
      m.cerrar();
    });
  });
}

// ---------- Avisos breves ----------
export function aviso(html, { tipo = 'ok', accion, duracion = 4200 } = {}) {
  let cont = document.querySelector('.avisos');
  if (!cont) {
    cont = document.createElement('div');
    cont.className = 'avisos';
    cont.setAttribute('role', 'status');
    cont.setAttribute('aria-live', 'polite');
    document.body.appendChild(cont);
  }
  const el = document.createElement('div');
  el.className = `aviso aviso-${tipo}`;
  el.innerHTML = `${icono(tipo === 'error' ? 'alerta' : tipo === 'info' ? 'info' : 'ok')}<span>${html}</span>${
    accion ? `<button type="button">${esc(accion.texto)}</button>` : ''
  }`;
  cont.appendChild(el);
  requestAnimationFrame(() => el.classList.add('visible'));
  const quitar = () => {
    el.classList.remove('visible');
    setTimeout(() => el.remove(), 250);
  };
  el.querySelector('button')?.addEventListener('click', () => {
    accion.alHacer();
    quitar();
  });
  setTimeout(quitar, duracion);
}

// ---------- Piezas pequeñas ----------
const COLORES_AVATAR = ['#2a78d6', '#1baf7a', '#eb6834', '#6250d6', '#e87ba4', '#008300', '#c98500', '#e34948'];

export function avatar(nombre, color, clase = '') {
  const c = color || COLORES_AVATAR[hashTexto(nombre || '') % COLORES_AVATAR.length];
  return `<span class="avatar ${clase}" style="--c:${c}" aria-hidden="true">${esc(iniciales(nombre))}</span>`;
}

/** Indicador: etiqueta, valor y variación vs. un periodo con nombre. */
export function kpi({ etiqueta, valor, delta = null, vs = 'vs. mes anterior', subirEsBueno = true, nota = '', destacado = false }) {
  let d = '';
  if (delta !== null && Number.isFinite(delta)) {
    const sube = delta >= 0;
    const bueno = sube === subirEsBueno;
    d = `<span class="kpi-delta ${bueno ? 'bueno' : 'malo'}">${sube ? '▲' : '▼'} ${porcentaje(Math.abs(delta))} <span class="kpi-vs">${esc(vs)}</span></span>`;
  }
  return `<div class="kpi ${destacado ? 'kpi-destacado' : ''}">
    <span class="kpi-etiqueta">${esc(etiqueta)}</span>
    <span class="kpi-valor">${valor}</span>
    ${d}${nota ? `<span class="kpi-nota">${nota}</span>` : ''}
  </div>`;
}

export function vacio(texto, iconoNombre = 'info') {
  return `<div class="vacio">${icono(iconoNombre)}<p>${texto}</p></div>`;
}

const ESTADOS = {
  completada: ['Atendida', 'ok'],
  programada: ['Programada', 'info'],
  cancelada: ['Cancelada', 'neutro'],
  'no-asistio': ['No asistió', 'alerta'],
  'en-curso': ['En curso', 'activo'],
};
export function chipEstado(estado) {
  const [texto, clase] = ESTADOS[estado] || [estado, 'neutro'];
  return `<span class="chip chip-${clase}">${texto}</span>`;
}

export function etiquetaPlan(planId) {
  return `<span class="tag-plan">${icono('candado')} ${esc(planPorId(planId).nombre)}</span>`;
}

/** Pantalla que se muestra cuando el plan actual no incluye el módulo. */
export function pantallaBloqueada({ titulo, descripcion, beneficios = [], plan }) {
  const p = planPorId(plan);
  return `
  <section class="bloqueo">
    <div class="bloqueo-fondo" aria-hidden="true">
      <div class="esq esq-1"></div><div class="esq esq-2"></div><div class="esq esq-3"></div>
      <div class="esq esq-4"></div><div class="esq esq-5"></div><div class="esq esq-6"></div>
    </div>
    <div class="bloqueo-tarjeta">
      <div class="bloqueo-ico">${icono('candado')}</div>
      <p class="sobretitulo">Incluido en el plan ${esc(p.nombre)}</p>
      <h2>${esc(titulo)}</h2>
      <p class="texto-sec">${esc(descripcion || '')}</p>
      ${beneficios.length ? `<ul class="lista-check">${beneficios.map((b) => `<li>${icono('ok')}${esc(b)}</li>`).join('')}</ul>` : ''}
      <button type="button" class="btn btn-primario" data-cambiar-plan="${p.id}">Ver con el plan ${esc(p.nombre)}</button>
    </div>
  </section>`;
}

// ---------- Vista previa estilo WhatsApp ----------
/** Convierte el formato de WhatsApp (*negrita*, _cursiva_, saltos de línea) a HTML seguro. */
export function formatoWhatsApp(texto) {
  return esc(texto)
    .replace(/\*([^*\n]+)\*/g, '<b>$1</b>')
    .replace(/(^|\s)_([^_\n]+)_/g, '$1<i>$2</i>')
    .replace(/\n/g, '<br>');
}

/**
 * Teléfono con conversación simulada.
 * mensajes: [{ texto, hora, mio }]  (mio = enviado desde este teléfono; va a la derecha)
 */
export function telefonoWhatsApp({ titulo, subtitulo = 'Mensaje automático', logo = '', mensajes = [], pie = '' }) {
  return `
  <div class="wa-telefono" role="img" aria-label="Vista previa del mensaje">
    <div class="wa-cab">
      <span class="wa-logo">${logo}</span>
      <span class="wa-titulos"><b>${esc(titulo)}</b><small>${esc(subtitulo)}</small></span>
    </div>
    <div class="wa-chat">
      <div class="wa-aviso">Simulación · no se envía ningún mensaje real</div>
      ${mensajes
        .map(
          (m) => `<div class="wa-burbuja ${m.mio ? 'mia' : ''}">${formatoWhatsApp(m.texto)}<span class="wa-hora">${esc(m.hora || '')}${
            m.mio ? ' <span class="wa-check">✓✓</span>' : ''
          }</span></div>`,
        )
        .join('')}
    </div>
    ${pie}
  </div>`;
}

/** Rellena una plantilla con {variables}. */
export function plantilla(texto, vars) {
  return String(texto).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
}

export function leerFormulario(form) {
  return Object.fromEntries(new FormData(form).entries());
}
