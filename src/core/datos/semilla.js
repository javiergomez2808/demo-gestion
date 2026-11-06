// Números aleatorios reproducibles: la misma semilla produce siempre los mismos datos.

export function hashTexto(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function crearAzar(semilla) {
  let a = semilla >>> 0 || 1;
  const num = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const azar = {
    num,
    entre: (min, max) => min + num() * (max - min),
    entero: (min, max) => Math.floor(min + num() * (max - min + 1)),
    prob: (p) => num() < p,
    elegir: (arr) => arr[Math.floor(num() * arr.length)],
    ponderado(arr, peso) {
      const pesos = arr.map(peso);
      const total = pesos.reduce((s, x) => s + x, 0);
      let r = num() * total;
      for (let i = 0; i < arr.length; i++) {
        r -= pesos[i];
        if (r <= 0) return arr[i];
      }
      return arr[arr.length - 1];
    },
    mezclar(arr) {
      const copia = [...arr];
      for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(num() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
      }
      return copia;
    },
    /** Redondea a múltiplos (p. ej. montos de gasto a $10). */
    redondear: (n, multiplo = 10) => Math.round(n / multiplo) * multiplo,
    /** Crea un generador derivado e independiente (para que cada extra no altere los datos del núcleo). */
    derivar: (texto) => crearAzar((semilla ^ hashTexto(texto)) >>> 0),
  };
  return azar;
}
