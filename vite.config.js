import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import plataforma from './src/plataforma.js';

export default defineConfig({
  // Rutas relativas: funciona igual en Netlify, en GitHub Pages (usuario.github.io/repo/) o en una subcarpeta.
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: `${plataforma.nombre} · Demo`,
        short_name: plataforma.nombreCorto,
        description: plataforma.descripcion,
        lang: 'es-MX',
        dir: 'ltr',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: plataforma.colorTema,
        background_color: plataforma.colorFondo,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,webmanifest}'],
        // Los enlaces compartidos llevan ?rubro=…&plan=…; se ignoran para servir la app desde caché sin conexión.
        ignoreURLParametersMatching: [/.*/],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
