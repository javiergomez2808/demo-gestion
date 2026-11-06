// Chart.js con solo las piezas que usamos y un estilo sobrio común a todas las gráficas.

import { Chart, BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler } from 'chart.js';
import { dinero, dineroEje } from './formato.js';

Chart.register(BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler);

// Paleta categórica validada (orden fijo: nunca se reasigna por posición).
export const SERIES = { ingresos: '#2a78d6', gastos: '#eb6834', tercera: '#1baf7a' };
export const TINTA = { primaria: '#0b0b0b', secundaria: '#52514e', muda: '#898781', rejilla: '#e1e0d9', base: '#c3c2b7', superficie: '#ffffff' };

Chart.defaults.font.family = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
Chart.defaults.font.size = 12;
Chart.defaults.color = TINTA.muda;
Chart.defaults.animation.duration = 450;

const tooltip = {
  backgroundColor: '#ffffff',
  titleColor: TINTA.primaria,
  bodyColor: TINTA.secundaria,
  borderColor: 'rgba(11,11,11,0.12)',
  borderWidth: 1,
  padding: 10,
  cornerRadius: 8,
  boxPadding: 4,
  usePointStyle: true,
  titleFont: { weight: '600' },
  callbacks: { label: (c) => ` ${c.dataset.label ? `${c.dataset.label}: ` : ''}${dinero(c.parsed[c.chart.options.indexAxis === 'y' ? 'x' : 'y'])}` },
};

const ejeDinero = {
  border: { display: false },
  grid: { color: TINTA.rejilla, lineWidth: 1, drawTicks: false },
  ticks: { padding: 8, maxTicksLimit: 5, callback: (v) => dineroEje(v) },
};
const ejeCategoria = { border: { color: TINTA.base }, grid: { display: false }, ticks: { padding: 6 } };

/** Línea vertical que sigue al cursor en gráficas de línea. */
const cruz = {
  id: 'cruz',
  afterDatasetsDraw(chart) {
    const activos = chart.tooltip?.getActiveElements?.() || [];
    if (!activos.length || chart.config.type !== 'line') return;
    const { ctx, chartArea } = chart;
    const x = activos[0].element.x;
    ctx.save();
    ctx.strokeStyle = TINTA.base;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, chartArea.top);
    ctx.lineTo(x, chartArea.bottom);
    ctx.stroke();
    ctx.restore();
  },
};

/** Valor al final de cada barra horizontal. */
const etiquetasPunta = {
  id: 'etiquetasPunta',
  afterDatasetsDraw(chart, _args, opciones) {
    if (!opciones?.formato) return;
    const { ctx } = chart;
    chart.getDatasetMeta(0).data.forEach((barra, i) => {
      const v = chart.data.datasets[0].data[i];
      ctx.save();
      ctx.fillStyle = TINTA.secundaria;
      ctx.font = `600 12px ${Chart.defaults.font.family}`;
      ctx.textBaseline = 'middle';
      ctx.fillText(opciones.formato(v, i), barra.x + 6, barra.y);
      ctx.restore();
    });
  },
};
Chart.register(cruz, etiquetasPunta);

export function columnasAgrupadas(canvas, { etiquetas, series }) {
  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: etiquetas,
      datasets: series.map((s) => ({
        label: s.nombre,
        data: s.datos,
        backgroundColor: s.color,
        hoverBackgroundColor: s.color,
        borderRadius: { topLeft: 4, topRight: 4 },
        borderSkipped: 'bottom',
        maxBarThickness: 24,
        barPercentage: 0.82,
        categoryPercentage: 0.6,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false }, tooltip },
      scales: { x: ejeCategoria, y: { ...ejeDinero, beginAtZero: true } },
    },
  });
}

export function lineaArea(canvas, { etiquetas, datos, color = SERIES.ingresos, nombre = '' }) {
  return new Chart(canvas, {
    type: 'line',
    data: {
      labels: etiquetas,
      datasets: [
        {
          label: nombre,
          data: datos,
          borderColor: color,
          borderWidth: 2,
          backgroundColor: `${color}1a`,
          fill: 'origin',
          tension: 0.25,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBorderWidth: 2,
          pointHoverBorderColor: TINTA.superficie,
          pointHoverBackgroundColor: color,
          borderCapStyle: 'round',
          borderJoinStyle: 'round',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false }, tooltip },
      scales: {
        x: { ...ejeCategoria, ticks: { ...ejeCategoria.ticks, maxTicksLimit: 6, maxRotation: 0, autoSkip: true } },
        y: { ...ejeDinero, beginAtZero: false },
      },
    },
  });
}

export function barrasHorizontales(canvas, { etiquetas, datos, color = SERIES.ingresos, formato }) {
  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels: etiquetas,
      datasets: [
        {
          label: 'Ganancia',
          data: datos,
          backgroundColor: color,
          hoverBackgroundColor: color,
          borderRadius: { topRight: 4, bottomRight: 4 },
          borderSkipped: 'left',
          maxBarThickness: 20,
          barPercentage: 0.8,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: { right: 72 } },
      plugins: { legend: { display: false }, tooltip, etiquetasPunta: { formato } },
      scales: {
        x: { ...ejeDinero, beginAtZero: true, ticks: { ...ejeDinero.ticks, maxTicksLimit: 4 } },
        y: { border: { color: TINTA.base }, grid: { display: false }, ticks: { color: TINTA.secundaria, padding: 6 } },
      },
    },
  });
}
