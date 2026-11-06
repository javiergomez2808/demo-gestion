// Estructura de la app: banner de demo, selectores de rubro y plan, navegación y rutas (#/modulo).

import { RUBROS, RUBROS_VISIBLES, obtenerRubro } from './rubros.js';
import { PLANES, planPorId, incluye, esPlan } from './planes.js';
import { crearStore, leerPreferencia, guardarPreferencia, borrarTodo } from './store.js';
import { crearVocab } from './vocab.js';
import { crearConsultas } from './consultas.js';
import { aplicarTema, logoHtml } from './tema.js';
import { extrasDelRubro } from './extras.js';
import { icono } from './ui/iconos.js';
import { abrirModal, aviso, confirmar, pantallaBloqueada } from './ui/ui.js';
import * as F from './formato.js';
import { esc } from './formato.js';

const archivosModulos = import.meta.glob('../modulos/*.js', { eager: true });
const MODULOS_NUCLEO = Object.values(archivosModulos)
  .map((m) => m.default)
  .filter((m) => m && m.id)
  .sort((a, b) => a.orden - b.orden);

const GRUPOS = { negocio: 'Tu negocio', dinero: 'Dinero', marketing: 'Marketing', extras: 'Extras del rubro' };

let eventoInstalar = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  eventoInstalar = e;
  document.querySelectorAll('[data-instalar]').forEach((b) => (b.hidden = false));
});

const listaTexto = (arr) => (arr.length <= 1 ? arr.join('') : `${arr.slice(0, -1).join(', ')} y ${arr.at(-1)}`);

export function iniciarApp(raiz) {
  const params = new URLSearchParams(location.search);
  const valido = (id) => RUBROS.some((r) => r.id === id);
  const estado = {
    rubroId: valido(params.get('rubro')) ? params.get('rubro') : valido(leerPreferencia('rubro')) ? leerPreferencia('rubro') : RUBROS_VISIBLES[0].id,
    plan: esPlan(params.get('plan')) ? params.get('plan') : esPlan(leerPreferencia('plan')) ? leerPreferencia('plan') : 'crecimiento',
  };
  let config;
  let store;
  let t;
  let extras;
  let q;
  let limpiar = null;
  let rutaAnterior = null;

  // ---------- Rubro, extras y contexto ----------
  function cargarRubro() {
    config = obtenerRubro(estado.rubroId);
    store = crearStore(config);
    t = crearVocab(config);
    extras = extrasDelRubro(config);
    q = crearConsultas(config, () => store.datos, hookSiempre);
    aplicarTema(config);
  }

  function llamar(nombre, args, filtrarPorPlan) {
    const out = [];
    for (const e of extras) {
      const fn = e.hooks?.[nombre];
      if (!fn) continue;
      if (filtrarPorPlan && !incluye(estado.plan, e.plan || 'crecimiento')) continue;
      try {
        const r = fn(...args, contexto());
        if (r !== undefined && r !== null && r !== '') out.push(r);
      } catch (err) {
        console.error(`[demo] Error en el extra ${e.id}.${nombre}`, err);
      }
    }
    return out;
  }
  /** Ganchos de interfaz: solo los extras que incluye el plan actual. */
  const hook = (nombre, ...args) => llamar(nombre, args, true);
  /** Ganchos de datos (p. ej. comisiones por productos): siempre, para que los números no cambien con el plan. */
  const hookSiempre = (nombre, ...args) => llamar(nombre, args, false);

  function modulos() {
    const nucleo = MODULOS_NUCLEO.map((m) => ({ grupo: 'negocio', ...m, ruta: m.id }));
    const ext = extras
      .filter((e) => typeof e.render === 'function')
      .map((e, i) => ({ ...e, ruta: `extra/${e.id}`, grupo: 'extras', plan: e.plan || 'crecimiento', orden: 100 + i }));
    return [...nucleo, ...ext];
  }
  const tituloDe = (m) => (typeof m.titulo === 'function' ? m.titulo(t, config) : m.titulo);

  function contexto() {
    return {
      config,
      t,
      q,
      get datos() {
        return store.datos;
      },
      plan: estado.plan,
      hoy: F.hoyIso(),
      incluye: (req) => incluye(estado.plan, req),
      moduloAccesible: (id) => {
        const m = modulos().find((x) => x.id === id);
        return !!m && incluye(estado.plan, m.plan);
      },
      guardar: () => store.guardar(),
      ir: (ruta) => {
        location.hash = `#/${ruta}`;
      },
      refrescar: () => renderVista(),
      hook,
      hookSiempre,
      extras,
      cambiarPlan,
      logo: logoHtml(config, 'logo-chico'),
    };
  }

  // ---------- Estructura ----------
  function itemNav(m, clase) {
    const bloqueado = !incluye(estado.plan, m.plan);
    const p = planPorId(m.plan);
    return `<a href="#/${m.ruta}" class="${clase}${bloqueado ? ' bloqueado' : ''}" data-ruta="${m.ruta}" ${clase === 'mas-item' ? 'data-cerrar' : ''}>
      ${icono(m.icono)}<span class="nav-texto">${esc(tituloDe(m))}</span>
      ${bloqueado ? `<span class="nav-candado" title="Incluido en el plan ${esc(p.nombre)}">${icono('candado')}<small>${esc(p.nombre)}</small></span>` : ''}
    </a>`;
  }

  function navAgrupada(mods, clase) {
    const grupos = {};
    for (const m of mods) (grupos[m.grupo] ||= []).push(m);
    return Object.entries(grupos)
      .map(([g, lista]) => `<div class="nav-grupo"><p class="nav-titulo">${g === 'extras' ? `Extras de ${esc(config.rubro.split(' /')[0].toLowerCase())}` : GRUPOS[g] || g}</p>${lista.map((m) => itemNav(m, clase)).join('')}</div>`)
      .join('');
  }

  function renderShell() {
    const mods = modulos();
    const plan = planPorId(estado.plan);
    const enBarra = mods.filter((m) => m.enBarra);
    raiz.innerHTML = `
      <div class="banner-demo" role="note">${icono('info')}<span>${esc(config.aviso || 'Demo con datos ficticios')}</span></div>
      <div class="app">
        <aside class="lateral">
          <a class="lateral-marca" href="#/web">${logoHtml(config)}<span><b>${esc(config.negocio.nombre)}</b><small>${esc(config.negocio.tagline || '')}</small></span></a>
          <nav class="lateral-nav" aria-label="Módulos">${navAgrupada(mods, 'nav-item')}</nav>
          <div class="lateral-pie">
            <button type="button" class="btn btn-texto" data-compartir>${icono('enviar')} Compartir esta demo</button>
            <button type="button" class="btn btn-texto" data-instalar ${eventoInstalar ? '' : 'hidden'}>${icono('telefono')} Instalar como app</button>
            <button type="button" class="btn btn-texto" data-reiniciar>${icono('reiniciar')} Reiniciar demo</button>
          </div>
        </aside>
        <div class="principal">
          <header class="barra">
            <div class="barra-fila">
              <div class="barra-marca">
                ${logoHtml(config)}
                <div class="barra-titulos">
                  <b>${esc(config.negocio.nombre)}</b>
                  ${
                    config.oculto
                      ? `<span class="selector-rubro selector-fijo">${esc(config.etiqueta || 'Demo personalizada')}</span>`
                      : `<label class="selector-rubro">
                    <span class="sr">Rubro de la demo</span>
                    <select data-rubro aria-label="Rubro de la demo">${RUBROS_VISIBLES.map((r) => `<option value="${r.id}" ${r.id === config.id ? 'selected' : ''}>${esc(r.rubro)}</option>`).join('')}</select>
                    ${icono('abajo')}
                  </label>`
                  }
                </div>
              </div>
              <div class="barra-acciones">
                <a class="btn-icono solo-movil" href="#/web" aria-label="Ver la web pública" title="Web pública">${icono('globo')}</a>
                <button type="button" class="btn-icono" data-reiniciar aria-label="Reiniciar demo" title="Reiniciar demo">${icono('reiniciar')}</button>
              </div>
            </div>
            <div class="plan-zona">
              <div class="selector-plan" role="radiogroup" aria-label="Plan">
                ${PLANES.map((p) => `<button type="button" role="radio" aria-checked="${p.id === estado.plan}" data-cambiar-plan="${p.id}">${esc(p.nombre)}</button>`).join('')}
              </div>
              <p class="plan-lema"><b>Plan ${esc(plan.nombre)}:</b> ${esc(plan.lema)}</p>
            </div>
          </header>
          <main id="vista" class="vista" tabindex="-1"></main>
        </div>
        <nav class="pestanas" aria-label="Módulos">
          ${enBarra.map((m) => itemNav(m, 'pestana')).join('')}
          <button type="button" class="pestana" data-mas>${icono('mas')}<span class="nav-texto">Más</span></button>
        </nav>
      </div>`;
  }

  function marcarActivo(ruta) {
    raiz.querySelectorAll('[data-ruta]').forEach((a) => a.classList.toggle('activo', a.dataset.ruta === ruta));
    const enBarra = modulos().some((m) => m.enBarra && m.ruta === ruta);
    raiz.querySelector('[data-mas]')?.classList.toggle('activo', !enBarra);
  }

  function renderVista() {
    if (limpiar) {
      try {
        limpiar();
      } catch {
        /* nada */
      }
      limpiar = null;
    }
    const partes = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    let ruta = partes[0] || 'web';
    let resto = partes.slice(1);
    if (ruta === 'extra') {
      ruta = `extra/${resto[0] || ''}`;
      resto = resto.slice(1);
    }
    const mods = modulos();
    const mod = mods.find((m) => m.ruta === ruta) || mods[0];
    // Nodo nuevo en cada render: así los eventos del módulo anterior no se acumulan
    const previa = raiz.querySelector('#vista');
    const vista = previa.cloneNode(false);
    previa.replaceWith(vista);
    vista.className = `vista vista-${mod.id}`;
    marcarActivo(mod.ruta);
    if (!incluye(estado.plan, mod.plan)) {
      vista.innerHTML = pantallaBloqueada({ titulo: tituloDe(mod), descripcion: mod.descripcion, beneficios: mod.beneficios, plan: mod.plan });
    } else {
      vista.innerHTML = '';
      try {
        const r = mod.render(vista, contexto(), resto);
        if (typeof r === 'function') limpiar = r;
      } catch (err) {
        console.error(err);
        vista.innerHTML = `<div class="vacio">${icono('alerta')}<p>Algo salió mal al abrir este módulo. Prueba con "Reiniciar demo".</p></div>`;
      }
    }
    if (rutaAnterior !== mod.ruta) window.scrollTo(0, 0);
    rutaAnterior = mod.ruta;
  }

  // ---------- Acciones ----------
  function actualizarUrl() {
    const u = new URL(location.href);
    u.searchParams.set('rubro', estado.rubroId);
    u.searchParams.set('plan', estado.plan);
    history.replaceState(null, '', u);
  }

  function cambiarPlan(id) {
    if (!esPlan(id) || id === estado.plan) return;
    const antes = estado.plan;
    estado.plan = id;
    guardarPreferencia('plan', id);
    actualizarUrl();
    const ganados = modulos().filter((m) => !incluye(antes, m.plan) && incluye(id, m.plan)).map(tituloDe);
    renderShell();
    renderVista();
    const p = planPorId(id);
    if (ganados.length) aviso(`<b>Plan ${esc(p.nombre)}</b>: se desbloqueó ${esc(listaTexto(ganados))}`);
    else aviso(`<b>Plan ${esc(p.nombre)}</b>: los módulos de planes superiores aparecen con candado`, { tipo: 'info' });
  }

  function cambiarRubro(id) {
    if (!valido(id) || id === estado.rubroId) return;
    estado.rubroId = id;
    guardarPreferencia('rubro', id);
    cargarRubro();
    actualizarUrl();
    renderShell();
    renderVista();
    aviso(`Ahora ves la demo de <b>${esc(config.negocio.nombre)}</b> (${esc(config.rubro)})`, { tipo: 'info' });
  }

  async function reiniciar() {
    const ok = await confirmar(
      'Se borrarán las citas, gastos, notas y demás cambios que hayas hecho en la demo (en todos los rubros) y se restaurarán los datos originales.',
      { titulo: '¿Reiniciar la demo?', si: 'Sí, reiniciar' },
    );
    if (!ok) return;
    borrarTodo();
    store.reiniciar();
    renderVista();
    aviso('Listo: la demo volvió a sus datos originales');
  }

  async function compartir() {
    const u = new URL(location.href);
    u.searchParams.set('rubro', estado.rubroId);
    u.searchParams.set('plan', estado.plan);
    const url = u.toString();
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title: `${config.negocio.nombre} · Demo`, text: `Demo para ${config.rubro} (plan ${planPorId(estado.plan).nombre})`, url });
        return;
      } catch {
        /* el usuario cerró el menú de compartir */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      aviso(`Enlace copiado. Abre la demo en <b>${esc(config.rubro)}</b> con el plan <b>${esc(planPorId(estado.plan).nombre)}</b>.`);
    } catch {
      abrirModal({ titulo: 'Enlace de esta demo', cuerpo: `<p class="texto-sec">Copia este enlace para compartir la demo tal como la ves:</p><input class="input-enlace" readonly value="${esc(url)}" onclick="this.select()">` });
    }
  }

  async function instalar() {
    if (!eventoInstalar) return;
    eventoInstalar.prompt();
    await eventoInstalar.userChoice;
    eventoInstalar = null;
    document.querySelectorAll('[data-instalar]').forEach((b) => (b.hidden = true));
  }

  function abrirMas() {
    const mods = modulos();
    abrirModal({
      titulo: 'Todos los módulos',
      clase: 'modal-mas',
      cuerpo: `<nav class="mas-lista">${navAgrupada(mods, 'mas-item')}</nav>
        <div class="mas-acciones">
          <button type="button" class="btn btn-sec" data-compartir>${icono('enviar')} Compartir esta demo</button>
          <button type="button" class="btn btn-sec" data-instalar ${eventoInstalar ? '' : 'hidden'}>${icono('telefono')} Instalar como app</button>
          <button type="button" class="btn btn-sec" data-reiniciar data-cerrar>${icono('reiniciar')} Reiniciar demo</button>
        </div>`,
    });
  }

  // Delegación de eventos (también funciona dentro de ventanas abiertas en <body>)
  document.addEventListener('click', (e) => {
    const plan = e.target.closest('[data-cambiar-plan]');
    if (plan) {
      e.preventDefault();
      document.querySelector('.modal-fondo [data-cerrar]')?.click();
      cambiarPlan(plan.dataset.cambiarPlan);
      return;
    }
    if (e.target.closest('[data-reiniciar]')) return void reiniciar();
    if (e.target.closest('[data-mas]')) return void abrirMas();
    if (e.target.closest('[data-compartir]')) return void compartir();
    if (e.target.closest('[data-instalar]')) return void instalar();
  });
  raiz.addEventListener('change', (e) => {
    if (e.target.matches('[data-rubro]')) cambiarRubro(e.target.value);
  });
  window.addEventListener('hashchange', renderVista);

  cargarRubro();
  actualizarUrl();
  renderShell();
  renderVista();
}
