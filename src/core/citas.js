// Crear, editar, mover, cobrar y cancelar citas. Lo usan la agenda, la web pública y la ficha del cliente.

import * as F from './formato.js';
import { esc } from './formato.js';
import { abrirModal, aviso, chipEstado, leerFormulario, confirmar } from './ui/ui.js';
import { icono } from './ui/iconos.js';

const METODOS = [
  ['efectivo', 'Efectivo'],
  ['tarjeta', 'Tarjeta'],
  ['transferencia', 'Transferencia'],
];

function ordenar(datos) {
  datos.citas.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
}

export function buscarOCrearCliente(ctx, { nombre, telefono = '' }) {
  const limpio = String(nombre || '').trim().replace(/\s+/g, ' ');
  if (!limpio) return null;
  const tel = String(telefono).replace(/\D/g, '');
  const existente = ctx.datos.clientes.find(
    (c) => c.nombre.toLowerCase() === limpio.toLowerCase() || (tel.length >= 8 && c.telefono.replace(/\D/g, '') === tel),
  );
  if (existente) return existente;
  const nuevo = { id: F.uid('cl'), nombre: limpio, telefono: telefono || '', alta: F.hoyIso(), notas: '' };
  ctx.datos.clientes.push(nuevo);
  return nuevo;
}

export function crearCita(ctx, { clienteId, servicioId, profesionalId, fecha, hora, origen = 'recepcion', notas = '' }) {
  const s = ctx.q.servicio(servicioId);
  const cita = {
    id: F.uid('ci'),
    fecha,
    hora,
    duracion: s.duracion,
    clienteId,
    servicioId,
    profesionalId,
    estado: 'programada',
    precio: s.precio,
    cobrado: s.precio,
    pagado: false,
    metodo: null,
    origen,
    confirmada: false,
    notas,
  };
  const mensajes = ctx.hook('alGuardarCita', cita).flat().filter(Boolean);
  ctx.datos.citas.push(cita);
  ordenar(ctx.datos);
  ctx.guardar();
  return { cita, mensajes };
}

/** Ventana para crear o editar (mover) una cita. */
export function formularioCita(ctx, { cita = null, fecha, hora, profesionalId, clienteId, servicioId, alGuardar } = {}) {
  const { q, t, config } = ctx;
  const editando = !!cita;
  const base = {
    fecha: cita?.fecha || fecha || F.hoyIso(),
    hora: cita?.hora || hora || '',
    profesionalId: cita?.profesionalId || profesionalId || '',
    servicioId: cita?.servicioId || servicioId || config.servicios.find((s) => !s.soloVenta)?.id,
    clienteNombre: cita ? q.cliente(cita.clienteId).nombre : clienteId ? q.cliente(clienteId).nombre : '',
  };
  const opcionesServicio = config.servicios
    .filter((s) => !s.soloVenta)
    .map((s) => `<option value="${s.id}" ${s.id === base.servicioId ? 'selected' : ''}>${esc(s.nombre)} · ${s.duracion} min · ${F.dinero(s.precio)}</option>`)
    .join('');

  const m = abrirModal({
    titulo: editando ? `Mover o editar ${t('cita')}` : `Nueva ${t('cita')}`,
    cuerpo: `
      <form class="form" id="form-cita" autocomplete="off">
        <label class="campo"><span>${t.M('cliente')}</span>
          <input name="cliente" list="dl-clientes" required placeholder="Escribe un nombre" value="${esc(base.clienteNombre)}" ${editando ? 'readonly' : ''}>
          <datalist id="dl-clientes">${ctx.datos.clientes.map((c) => `<option value="${esc(c.nombre)}">`).join('')}</datalist>
          <small class="ayuda" data-ayuda-cliente></small>
        </label>
        <label class="campo"><span>${t.M('servicio')}</span><select name="servicioId" required>${opcionesServicio}</select></label>
        <div class="campos-2">
          <label class="campo"><span>${t.M('profesional')}</span><select name="profesionalId" required></select></label>
          <label class="campo"><span>Fecha</span><input type="date" name="fecha" required value="${base.fecha}" min="${F.sumarDias(F.hoyIso(), -60)}"></label>
        </div>
        <label class="campo"><span>Hora</span><select name="hora" required></select><small class="ayuda" data-ayuda-hora></small></label>
        <label class="campo"><span>Notas (opcional)</span><input name="notas" maxlength="140" value="${esc(cita?.notas || '')}" placeholder="Ej. prefiere cabina 2"></label>
      </form>`,
    pie: `<button type="button" class="btn btn-sec" data-cerrar>Cancelar</button>
          <button type="submit" form="form-cita" class="btn btn-primario">${editando ? 'Guardar cambios' : `Agendar ${t('cita')}`}</button>`,
  });

  const form = m.$('#form-cita');
  const selServ = form.servicioId;
  const selProf = form.profesionalId;
  const selHora = form.hora;

  function llenarProfesionales() {
    const fechaSel = form.fecha.value;
    const profs = q.profesionalesPara(selServ.value, fechaSel);
    const actual = selProf.value || base.profesionalId;
    selProf.innerHTML = profs.length
      ? profs.map((p) => `<option value="${p.id}" ${p.id === actual ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')
      : `<option value="">Nadie disponible ese día</option>`;
  }
  function llenarHoras() {
    const libres = form.fecha.value && selProf.value
      ? q.horariosLibres({ fecha: form.fecha.value, servicioId: selServ.value, profesionalId: selProf.value, ignorarId: cita?.id, paso: 15 })
      : [];
    const deseada = selHora.value || base.hora;
    let opciones = libres.map((h) => h.hora);
    // Al editar una cita pasada se conserva su hora original
    if (editando && form.fecha.value === cita.fecha && selProf.value === cita.profesionalId && !opciones.includes(cita.hora)) {
      opciones = [cita.hora, ...opciones].sort();
    }
    selHora.innerHTML = opciones.length
      ? opciones.map((h) => `<option value="${h}" ${h === deseada ? 'selected' : ''}>${F.hora12(h)}</option>`).join('')
      : `<option value="">Sin horarios libres</option>`;
    if (deseada && !opciones.includes(deseada) && opciones.length) {
      // Elige el horario libre más cercano al solicitado
      const objetivo = F.aMin(deseada);
      const cercana = opciones.reduce((a, b) => (Math.abs(F.aMin(b) - objetivo) < Math.abs(F.aMin(a) - objetivo) ? b : a));
      selHora.value = cercana;
    }
    const cerrado = !q.abiertoEl(form.fecha.value);
    m.$('[data-ayuda-hora]').textContent = cerrado ? 'El negocio no abre ese día.' : opciones.length ? `${opciones.length} horarios libres` : '';
  }
  function ayudaCliente() {
    const nombre = form.cliente.value.trim().toLowerCase();
    const existe = ctx.datos.clientes.some((c) => c.nombre.toLowerCase() === nombre);
    m.$('[data-ayuda-cliente]').textContent = nombre && !existe ? `Se registrará como ${t('cliente')} nuevo.` : '';
  }
  llenarProfesionales();
  llenarHoras();
  selServ.addEventListener('change', () => (llenarProfesionales(), llenarHoras()));
  selProf.addEventListener('change', llenarHoras);
  form.fecha.addEventListener('change', () => (llenarProfesionales(), llenarHoras()));
  form.cliente.addEventListener('input', ayudaCliente);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = leerFormulario(form);
    if (!v.hora || !v.profesionalId) return aviso('Elige un horario disponible.', { tipo: 'error' });
    const s = q.servicio(v.servicioId);
    if (editando) {
      const antes = { fecha: cita.fecha, hora: cita.hora, profesionalId: cita.profesionalId };
      Object.assign(cita, { fecha: v.fecha, hora: v.hora, profesionalId: v.profesionalId, notas: v.notas });
      if (cita.servicioId !== v.servicioId) {
        Object.assign(cita, { servicioId: v.servicioId, duracion: s.duracion, precio: s.precio, cobrado: cita.paqueteId ? 0 : s.precio });
      }
      ordenar(ctx.datos);
      ctx.guardar();
      m.cerrar();
      const movida = antes.fecha !== cita.fecha || antes.hora !== cita.hora || antes.profesionalId !== cita.profesionalId;
      aviso(movida ? `${t.M('cita')} movida al ${F.fechaCorta(cita.fecha)}, ${F.hora12(cita.hora)} con ${esc(q.profesional(cita.profesionalId).nombre)}` : 'Cambios guardados');
    } else {
      const cliente = buscarOCrearCliente(ctx, { nombre: v.cliente });
      if (!cliente) return aviso(`Escribe el nombre del ${t('cliente')}.`, { tipo: 'error' });
      const { cita: nueva, mensajes } = crearCita(ctx, { clienteId: cliente.id, servicioId: v.servicioId, profesionalId: v.profesionalId, fecha: v.fecha, hora: v.hora, notas: v.notas });
      m.cerrar();
      aviso(`${t.M('cita')} agendada: ${esc(cliente.nombre)}, ${F.relativo(nueva.fecha, F.hoyIso())} a las ${F.hora12(nueva.hora)}${mensajes.length ? `<br><small>${mensajes.join(' · ')}</small>` : ''}`);
    }
    alGuardar?.();
  });
}

/** Ventana de detalle de una cita con sus acciones. */
export function detalleCita(ctx, cita, { alCambiar } = {}) {
  const { q, t } = ctx;
  const hoy = F.hoyIso();
  const s = q.servicio(cita.servicioId);
  const p = q.profesional(cita.profesionalId);
  const cl = q.cliente(cita.clienteId);
  const ahora = F.minutosAhora();
  const enCurso = cita.estado === 'programada' && cita.fecha === hoy && F.aMin(cita.hora) <= ahora && ahora < F.aMin(cita.hora) + cita.duracion;
  const verCliente = ctx.moduloAccesible('clientes') && !cl.dePaso;
  const origen = { web: 'Reserva en la web', whatsapp: 'Por WhatsApp', recepcion: 'En recepción', fila: 'Llegó sin cita' }[cita.origen] || 'Recepción';
  const extrasHtml = ctx.hook('detalleCita', cita).join('');

  let recordatorio = '';
  if (cita.estado === 'programada') {
    const envio = F.sumarDias(cita.fecha, -1);
    const enviado = envio < hoy || (envio === hoy && F.aMin(cita.hora) <= ahora);
    recordatorio = `<div class="nota-linea">${icono('campana')}<span>Recordatorio por WhatsApp ${enviado ? `enviado ${F.relativo(envio, hoy)}` : `programado para ${F.relativo(envio, hoy)} a las ${F.hora12(cita.hora)}`}${cita.confirmada ? ' · <b>Confirmó asistencia</b>' : ''}</span></div>`;
  }

  const acciones = [];
  if (cita.estado === 'programada') {
    acciones.push(`<button class="btn btn-primario" data-accion="cobrar">${icono('ok')} Atender y cobrar</button>`);
    acciones.push(`<button class="btn btn-sec" data-accion="mover">${icono('mover')} Mover o editar</button>`);
    if (cita.fecha <= hoy) acciones.push(`<button class="btn btn-sec" data-accion="noasistio">No asistió</button>`);
    acciones.push(`<button class="btn btn-texto peligro" data-accion="cancelar">Cancelar ${t('cita')}</button>`);
  } else if (cita.estado === 'completada' && !cita.pagado && cita.cobrado > 0) {
    acciones.push(`<button class="btn btn-primario" data-accion="pagar">${icono('dinero')} Registrar pago</button>`);
  }

  const m = abrirModal({
    titulo: s.nombre,
    cuerpo: `
      <div class="detalle-cita">
        <div class="detalle-cab">
          ${chipEstado(enCurso ? 'en-curso' : cita.estado)}
          ${cita.origen === 'web' ? `<span class="chip chip-web">${icono('globo')} Web</span>` : ''}
        </div>
        <dl class="lista-datos">
          <div><dt>${t.M('cliente')}</dt><dd>${verCliente ? `<a href="#/clientes/${cl.id}" data-cerrar>${esc(cl.nombre)}</a>` : esc(cl.nombre)}</dd></div>
          <div><dt>Cuándo</dt><dd>${F.capital(F.fechaLarga(cita.fecha))}, ${F.hora12(cita.hora)} · ${cita.duracion} min</dd></div>
          <div><dt>${t.M('profesional')}</dt><dd><span class="punto" style="--c:${p.color}"></span>${esc(p.nombre)}</dd></div>
          <div><dt>Precio</dt><dd>${cita.paqueteId ? `Sesión de paquete <small class="texto-sec">(${F.dinero(cita.precio)} c/u)</small>` : F.dinero(cita.cobrado)}${
            cita.estado === 'completada' ? (cita.pagado || !cita.cobrado ? ` · <span class="texto-ok">Pagado${cita.metodo ? ` con ${cita.metodo}` : ''}</span>` : ' · <span class="texto-alerta">Pendiente de pago</span>') : ''
          }</dd></div>
          <div><dt>Origen</dt><dd>${origen}</dd></div>
          ${cita.notas ? `<div><dt>Notas</dt><dd>${esc(cita.notas)}</dd></div>` : ''}
        </dl>
        ${extrasHtml}
        ${recordatorio}
      </div>`,
    pie: acciones.length ? `<div class="acciones-cita">${acciones.join('')}</div>` : '',
  });

  m.el.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-accion]');
    if (!b) return;
    const accion = b.dataset.accion;
    if (accion === 'mover') {
      m.cerrar();
      formularioCita(ctx, { cita, alGuardar: alCambiar });
    } else if (accion === 'cobrar' || accion === 'pagar') {
      m.cerrar();
      cobrarCita(ctx, cita, alCambiar);
    } else if (accion === 'cancelar') {
      if (!(await confirmar(`Se liberará el horario de ${esc(p.nombre)}.`, { titulo: `¿Cancelar la ${t('cita')}?`, si: 'Sí, cancelar', peligro: true }))) return;
      cita.estado = 'cancelada';
      ctx.guardar();
      m.cerrar();
      aviso(`${t.M('cita')} cancelada`);
      alCambiar?.();
    } else if (accion === 'noasistio') {
      cita.estado = 'no-asistio';
      ctx.guardar();
      m.cerrar();
      aviso('Marcada como "No asistió"');
      alCambiar?.();
    }
  });
}

/** Cerrar la cita: método de pago y lo que agreguen los extras (p. ej. propina). */
export function cobrarCita(ctx, cita, alListo) {
  const s = ctx.q.servicio(cita.servicioId);
  const camposExtra = ctx.hook('camposCobro', cita).join('');
  const total = cita.cobrado || 0;
  const m = abrirModal({
    titulo: cita.estado === 'completada' ? 'Registrar pago' : 'Atender y cobrar',
    clase: 'modal-chico',
    cuerpo: `
      <form class="form" id="form-cobro">
        <div class="total-cobro"><span>${esc(s.nombre)}</span><b>${cita.paqueteId ? 'Cubierto por paquete' : F.dinero(total)}</b></div>
        ${total > 0 ? `<fieldset class="campo"><legend>Método de pago</legend><div class="opciones">${METODOS.map(
          ([v, txt], i) => `<label class="opcion"><input type="radio" name="metodo" value="${v}" ${i === 1 ? 'checked' : ''}><span>${txt}</span></label>`,
        ).join('')}</div></fieldset>` : ''}
        ${camposExtra}
      </form>`,
    pie: `<button type="button" class="btn btn-sec" data-cerrar>Cancelar</button>
          <button type="submit" form="form-cobro" class="btn btn-primario">${icono('ok')} Confirmar</button>`,
  });
  m.$('#form-cobro').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = leerFormulario(e.target);
    cita.estado = 'completada';
    cita.pagado = true;
    cita.metodo = total > 0 ? v.metodo : null;
    ctx.hook('alCobrar', cita, v);
    ctx.guardar();
    m.cerrar();
    aviso(total > 0 ? `Cobrado ${F.dinero(total)} con ${v.metodo}` : 'Sesión registrada');
    alListo?.();
  });
}
