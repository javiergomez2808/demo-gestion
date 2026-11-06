# Demo · Plataforma de gestión para negocios de servicios

Demo compartible (PWA) para enseñar a posibles clientes lo que obtendría su negocio en cada plan.
**Todos los datos son ficticios**: negocios, personas, teléfonos y montos. Nada se envía a ningún lado: las
citas, gastos y notas que agregue quien la pruebe se guardan solo en su navegador.

- Tres rubros listos: **Spa / Estética**, **Barbería / Salón** y **Consultorio (nutrición / fisioterapia)**.
- Tres planes: **Presencia**, **Control** y **Crecimiento**. Lo que no incluye un plan aparece con candado.
- Funciona en celular, se instala como app y abre sin internet después de la primera visita.
- Textos en español de México y montos en pesos (MXN).

---

## 1. Probarla en tu computadora

Necesitas [Node.js](https://nodejs.org) 20.19 o más reciente.

```bash
npm install
npm run dev
```

Abre la dirección que aparece (normalmente `http://localhost:5173`). Para verla desde tu celular en la misma
red wifi, usa la dirección "Network" que muestra la terminal.

Para revisar la versión final (la que se publica, con modo sin conexión):

```bash
npm run build
npm run preview
```

## 2. Cómo usar la demo con un cliente

| Qué | Dónde |
|---|---|
| Cambiar de rubro | Selector bajo el nombre del negocio (en computadora: "Rubro:") |
| Cambiar de plan | Interruptor **Presencia / Control / Crecimiento** |
| Ver la web que verían sus clientes | Ícono de globo o **Web pública** |
| Volver a los datos originales | Botón **Reiniciar demo** (↺) |
| Mandar un enlace ya configurado | **Compartir esta demo** (en "Más" o en el menú lateral) |

Los enlaces aceptan el rubro y el plan, para mandarle a cada prospecto su versión:

```
https://TU-SITIO/?rubro=barberia&plan=control
https://TU-SITIO/?rubro=consultorio&plan=crecimiento#/finanzas
```

Rubros: `spa`, `barberia`, `consultorio`. Planes: `presencia`, `control`, `crecimiento`.

**Recorrido sugerido:** Web pública → reservar una cita → verla en la Agenda → cambiar a plan Control y abrir
Finanzas → cambiar a Crecimiento y abrir Mensajes y los extras del rubro.

### Qué incluye cada plan

| Módulo | Presencia | Control | Crecimiento |
|---|:---:|:---:|:---:|
| Web pública con reservas y WhatsApp (simulado) | ✅ | ✅ | ✅ |
| Agenda diaria y semanal por profesional | ✅ | ✅ | ✅ |
| Recordatorio automático de cita | ✅ | ✅ | ✅ |
| Clientes (historial, gasto total y notas) | 🔒 | ✅ | ✅ |
| Finanzas (ingresos, gastos, flujo, rentabilidad, por cobrar) | 🔒 | ✅ | ✅ |
| Comisiones por profesional | 🔒 | ✅ | ✅ |
| Reporte semanal al dueño | 🔒 | ✅ | ✅ |
| Agradecimiento y reseña, promoción a inactivos, paquete por vencer | 🔒 | 🔒 | ✅ |
| Módulos extra del rubro | 🔒 | 🔒 | ✅ |

Los planes se definen en `src/core/planes.js`, y cada módulo declara su plan mínimo con `plan: '…'`.

---

## 3. Estructura

```
src/
├── plataforma.js        ← nombre de TU plataforma (título de la app y del ícono instalado)
├── core/                ← núcleo: igual para todos los rubros (no hace falta tocarlo)
│   ├── app.js           estructura, selectores, navegación y rutas
│   ├── planes.js        los tres planes
│   ├── rubros.js        descubre solo los archivos de src/rubros/
│   ├── extras.js        descubre solo los archivos de src/extras/
│   ├── store.js         guardado en el navegador + "Reiniciar demo"
│   ├── consultas.js     cálculos: disponibilidad, finanzas, comisiones…
│   ├── citas.js         crear, mover, cobrar y cancelar citas
│   ├── graficas.js      gráficas (Chart.js)
│   ├── datos/           generador de datos ficticios (con semilla)
│   └── ui/              ventanas, avisos, íconos, vista de WhatsApp
├── modulos/             módulos del núcleo: web, agenda, clientes, finanzas, comisiones, mensajes
├── extras/              módulos extra reutilizables: paquetes, insumos, turnos, propinas, mostrador, seguimiento
├── rubros/              ← UN archivo por rubro
└── estilos/
```

## 4. Agregar un rubro nuevo

**Solo creas un archivo en `src/rubros/`.** El selector lo muestra solo; no se toca el núcleo.

1. Copia `src/rubros/spa.js` con otro nombre, por ejemplo `src/rubros/unas.js`.
2. Cambia el `id` (sin espacios ni acentos; es el que va en el enlace `?rubro=unas`) y el `orden`.
3. Ajusta cada sección:

| Campo | Para qué sirve |
|---|---|
| `rubro` | Nombre en el selector, p. ej. `'Uñas / Manicure'` |
| `negocio` | Nombre ficticio, `tagline`, `logo` (`{ emoji: '💅' }`, `{ svg: '<svg…>' }` o `{ img: 'ruta.webp' }`), dirección, WhatsApp, nombre del dueño y `horario` (`dias`: 0 = domingo … 6 = sábado; `porDia: { 6: { cierra: '14:00' } }` para un día con otro horario). Opcional: `portada` (foto de la web pública) |
| `tema` | Colores: `primario`, `acento`, `fondo` |
| `vocabulario` | Palabras del rubro en singular y plural: `profesional`, `cliente`, `cita`, `servicio` |
| `servicios` | `id`, `nombre`, `categoria`, `precio`, `duracion` (min), `insumos` (costo por servicio), `demanda` (1–5) |
| `personal` | `nombre`, `puesto`, `comision` (0.35 = 35%), `color`; opcional `servicios` (lista de ids), `descanso` (días) y `peso` (qué tan ocupado está) |
| `gastos` | `fijos` (monto y día del mes) y `variables` (cada cuántos días y rango de monto) |
| `extras` | Módulos extra que se activan, con sus datos (ver abajo) |
| `resenas` | Reseñas ficticias para la web pública |
| `mensajes` | Opcional: tu propio texto para los mensajes automáticos |
| `recursos` | Opcional: equipos compartidos, p. ej. `[{ id: 'laser', nombre: 'el láser', cantidad: 1 }]`; el servicio que lo usa lleva `recurso: 'laser'` y nunca se agendan dos a la vez |
| `simulacion` | La "historia" de los números: semilla, número de clientes, citas por día, mes flojo, tendencia… Opcional: `afinidad` (0–1, cada cliente repite su servicio favorito) y `respetarIntervalos: true` (nadie repite un servicio con `seguimientoDias` antes de tiempo) |

En `servicios`, el precio público puede mostrarse como `desde: true` ("Desde $600") o con `precioTexto: 'Según valoración'`;
`precio` sigue alimentando los números de ejemplo.

> **Cuida el vocabulario:** los textos usan frases como "Nueva {cita}" o "Nuevo {cliente}". Elige palabras que
> concuerden (cita/consulta son femeninas; cliente/paciente, masculinas).

**Cómo contar una historia con los números:**

- Un servicio **muy rentable**: buen precio, poco costo de insumos, duración corta y `demanda` alta.
- Un servicio **poco rentable**: insumos caros, duración larga y `demanda` baja.
- Un **mes flojo**: `mesFlojo: { haceMeses: 2, factor: 0.7 }` (vende 30% menos ese mes).
- Usa otra `semilla` para obtener otros clientes y otras citas.

Las fechas se calculan a partir de hoy, así la demo siempre muestra 3 meses de historia y 2 semanas de citas
próximas. Si editas el archivo de un rubro, sus datos se vuelven a generar solos.

### Extras disponibles

Se activan agregando su clave dentro de `extras`:

| Extra | Qué hace | Ejemplo de configuración |
|---|---|---|
| `paquetes` | Paquetes de sesiones, vencimientos y abonos | `paquetes: [{ id, nombre, servicio, sesiones, precio, vigenciaDias }]` |
| `insumos` | Inventario con consumo por servicio | `insumos: [{ id, nombre, unidad, stock, minimo, costo, consumo: { servicioId: cantidad } }]` |
| `turnos` | Fila para quien llega sin cita, con tiempo de espera | `turnos: { enFilaDemo: 4 }` |
| `propinas` | Propinas al cobrar y por profesional | `propinas: { probabilidad: 0.6, rango: [0.08, 0.2] }` |
| `mostrador` | Venta de productos con inventario y comisión | `mostrador: { comision: 0.1, ventasPorDia: [1, 4], productos: [{ id, nombre, precio, costo, stock, minimo }] }` |
| `seguimiento` | Ficha por sesión y próxima cita sugerida | `seguimiento: { plantillas: { tipo: [campos] }, notas: { tipo: [textos] } }` y en cada servicio `ficha: 'tipo'`, `seguimientoDias: 14` |
| `cursos` | Cursos con cupo, inscritas, anticipos y saldos (y sección en la web pública) | `cursos: [{ id, nombre, cuando, enDias, diaSemana, precio, anticipo, cupo, imparte, inscritasDemo }]` |

Revisa `barberia.js` y `consultorio.js` para ver ejemplos completos.

### Demo personalizada para un cliente (p. ej. `lifeskin.js`)

Para enseñarle a un negocio real su propia demo, con sus servicios, precios y logotipo:

- `oculto: true`: no aparece en el selector de rubros; solo se abre con su enlace
  (`https://demo.angelgomezp.dev/?rubro=lifeskin&plan=crecimiento`).
- `aviso` (texto del banner superior) y `etiqueta` (en lugar del selector de rubros).
- En `negocio`: `datosReales: true` (quita "número ficticio") y `pie` (texto al pie de la web pública).
- Guarda sus imágenes en `public/clientes/<id>/`.

Pide permiso al negocio antes de publicar su nombre y su logotipo. Los clientes, citas y cifras siguen siendo ficticios.

### ¿Y si el rubro necesita un módulo que no existe?

Crea un archivo en `src/extras/` (también se descubre solo) con esta forma y actívalo desde la configuración:

```js
export default {
  id: 'mi-extra',            // la clave que se usa en `extras` del rubro
  titulo: 'Mi módulo',
  icono: 'paquete',          // nombre de un ícono de src/core/ui/iconos.js
  plan: 'crecimiento',
  descripcion: 'Texto que aparece en la pantalla con candado.',
  beneficios: ['…'],
  generar({ datos, config, azar, hoy }) { return { /* datos ficticios propios */ }; },
  render(el, ctx) { el.innerHTML = '…'; },
  hooks: { /* opcional: fichaCliente, detalleCita, camposCobro, alCobrar, alGuardarCita, comisiones, mensajesProgramados, seccionWeb */ },
};
```

---

## 5. Publicarla gratis

### Opción A: Netlify (la más rápida)

**Sin cuenta de GitHub, arrastrando una carpeta:**

1. En tu computadora: `npm install` y luego `npm run build`.
2. Entra a <https://app.netlify.com/drop> e inicia sesión.
3. Arrastra la carpeta **`dist`** a la página. En segundos tendrás un enlace `https://algo.netlify.app`.
4. Para actualizarla, vuelve a construir y arrastra `dist` de nuevo en la sección *Deploys* de tu sitio.

**Conectada a un repositorio (se actualiza sola):** en Netlify elige *Add new site → Import an existing project*,
conecta tu repositorio y listo. El archivo `netlify.toml` ya indica el comando (`npm run build`) y la carpeta (`dist`).

Puedes cambiar el nombre del enlace en *Site configuration → Change site name*.

### Opción B: GitHub Pages

1. Crea un repositorio en GitHub y sube este proyecto a la rama `main`:
   ```bash
   git init
   git add .
   git commit -m "Demo de gestión"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/TU-REPO.git
   git push -u origin main
   ```
2. En GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. El flujo `.github/workflows/deploy.yml` construye y publica la demo en cada `push`. Verás el avance en la
   pestaña **Actions**.
4. Tu enlace será `https://TU-USUARIO.github.io/TU-REPO/`.

La app usa rutas relativas y rutas con `#`, así que funciona igual en la raíz de un dominio o dentro de una
subcarpeta, sin configurar nada más.

### Instalarla como app

- **Android (Chrome):** menú ⋮ → *Instalar app* (o el botón **Instalar como app** dentro de la demo).
- **iPhone (Safari):** botón Compartir → *Agregar a pantalla de inicio*.

Después de abrirla una vez, funciona sin conexión.

---

## 6. Personalizar tu marca

- Nombre de tu plataforma y colores del ícono instalado: `src/plataforma.js`.
- Íconos de la app: `public/icons/` (192 × 192, 512 × 512 y una versión "maskable" con margen) y `public/favicon.svg`.
- Textos de los planes: `src/core/planes.js`.
- Textos base de los mensajes automáticos: `src/modulos/automatizaciones.js` (cada rubro puede cambiarlos en `mensajes`).

## Notas

- Es una demostración: no hay servidor, base de datos ni inicio de sesión.
- El botón de WhatsApp y los mensajes automáticos son simulaciones; no se envía nada.
- Los teléfonos de ejemplo empiezan con `55 0…`, un formato que no corresponde a números reales en México.
