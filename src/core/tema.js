import { esc } from './formato.js';

/** Aplica los colores del rubro como variables CSS. */
export function aplicarTema(config) {
  const raiz = document.documentElement.style;
  const { primario, acento, fondo } = config.tema;
  raiz.setProperty('--primario', primario);
  raiz.setProperty('--acento', acento);
  raiz.setProperty('--fondo', fondo);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', primario);
  document.title = `${config.negocio.nombre} · Demo`;
}

/** Logo del negocio: SVG propio o emoji, dentro de un cuadro con el color del rubro. */
export function logoHtml(config, clase = '') {
  const logo = config.negocio.logo || {};
  const contenido = logo.svg ? logo.svg : `<span class="logo-emoji">${esc(logo.emoji || '★')}</span>`;
  return `<span class="logo ${clase}" aria-hidden="true">${contenido}</span>`;
}
