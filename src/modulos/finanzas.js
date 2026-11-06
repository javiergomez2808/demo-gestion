// Finanzas: ingresos vs. gastos del mes, flujo de caja de 3 meses, rentabilidad por servicio,
// comisiones por profesional y cuentas por cobrar.

import * as F from '../core/formato.js';
import { esc } from '../core/formato.js';
import { icono } from '../core/ui/iconos.js';
import { abrirModal, aviso, avatar, kpi, vacio, leerFormulario, confirmar } from '../core/ui/ui.js';
import { columnasAgrupadas, lineaArea, barrasHorizontales, SERIES } from '../core/graficas.js';

let mesElegido = null;

export default {
  id: 'finanzas',
  orden: 4,
  plan: 'control',
  grupo: 'dinero',
  icono: 'grafica',
  enBarra: true,
  titulo: 'Finanzas',
  descripcion: 'Tablero con ingresos, gastos, flujo de caja, rentabilidad por servicio y cuentas por cobrar.',
  beneficios: ['Ingresos vs. gastos de cada mes', 'Qué servicio deja más ganancia', 'Flujo de caja de 3 meses', 'Quién te debe y cuánto'],

  render(el, ctx) {
    const { q, t, hoy } = ctx;
    const meses = [-3, -2, -1, 0].map((n) => F.claveMes(F.sumarMeses(hoy, n)));
    const mesActual = meses[3];
    const diaHoy = Number(hoy.slice(8));
    if (!mesElegido || !meses.includes(mesElegido)) mesElegido = diaHoy < 12 ? meses[2] : mesActual;
    const enCurso = mesElegido === mesActual;

    const rango = (clave) => [`${clave}-01`, clave === mesActual ? hoy : F.ultimoDiaMes(clave)];
    const porMes = meses.map((m) => ({ clave: m, ...q.resultado(...rango(m)) }));
    const idx = meses.indexOf(mesElegido);
    const actual = porMes[idx];
    // Comparación justa: si el mes va en curso, contra los mismos días del mes anterior
    let anterior = null;
    if (idx > 0) {
      const previo = meses[idx - 1];
      anterior = enCurso ? q.resultado(`${previo}-01`, `${previo}-${String(Math.min(diaHoy, F.diasEnMes(previo))).padStart(2, '0')}`) : porMes[idx - 1];
    }
    const vs = enCurso ? 'vs. mismos días del mes pasado' : `vs. ${F.mesSolo(meses[idx - 1] || mesElegido)}`;
    const porCobrar = q.cuentasPorCobrar();
    const rentab = q.rentabilidad(...rango(mesElegido));
    const comisiones = q.comisiones(...rango(mesElegido)).sort((a, b) => b.comision - a.comision);
    const gastosMes = q.gastosRegistrados(...rango(mesElegido)).sort((a, b) => b.fecha.localeCompare(a.fecha));

    // Historia de los números
    const completos = porMes.slice(0, 3);
    const flojo = completos.reduce((a, b) => (b.ingresos < a.ingresos ? b : a));
    const iFlojo = porMes.indexOf(flojo);
    const historia = [];
    const nombreFlojo = `<b>${F.capital(F.mesSolo(flojo.clave))}</b>`;
    if (iFlojo > 0 && porMes[iFlojo - 1].ingresos) {
      historia.push(`${nombreFlojo} fue el mes más flojo (${F.porcentaje(F.variacion(flojo.ingresos, porMes[iFlojo - 1].ingresos))} en ingresos).`);
    } else {
      historia.push(`${nombreFlojo} fue el mes más flojo.`);
    }
    if (iFlojo < 2) historia.push(`${F.capital(F.mesSolo(porMes[iFlojo + 1].clave))} se recuperó ${F.porcentaje(F.variacion(porMes[iFlojo + 1].ingresos, flojo.ingresos))}.`);
    const porHora = [...rentab].filter((r) => r.cantidad >= 3).sort((a, b) => b.porHora - a.porHora);
    if (porHora.length >= 2) {
      historia.push(`<b>${esc(porHora[0].servicio.nombre)}</b> deja ${F.dinero(porHora[0].porHora)} por hora; <b>${esc(porHora.at(-1).servicio.nombre)}</b> solo ${F.dinero(porHora.at(-1).porHora)}.`);
    }

    const flujo = q.flujoDiario(`${meses[0]}-01`, hoy);
    const flujoMeses = meses.map((m) => {
      const dias = flujo.filter((d) => d.fecha.startsWith(m));
      return { clave: m, entradas: F.suma(dias, (d) => d.entradas), salidas: F.suma(dias, (d) => d.salidas), saldo: dias.at(-1)?.saldo ?? 0 };
    });
    const maxCat = Math.max(1, ...Object.values(actual.porCategoria));

    el.innerHTML = `
      <div class="encabezado-vista">
        <div><p class="sobretitulo">Montos en pesos (MXN)</p><h1>Finanzas</h1></div>
        <button type="button" class="btn btn-primario" data-gasto>${icono('agregar')} Registrar gasto</button>
      </div>
      <div class="filtros" role="tablist" aria-label="Mes">
        ${meses.map((m) => `<button type="button" role="tab" class="filtro ${m === mesElegido ? 'activo' : ''}" data-mes="${m}">${F.capital(F.mesSolo(m))}${m === mesActual ? ' <small>en curso</small>' : ''}</button>`).join('')}
      </div>
      ${historia.length ? `<p class="historia">${icono('tendencia')}<span>${historia.join(' ')}</span></p>` : ''}

      <div class="kpis kpis-4">
        ${kpi({ etiqueta: enCurso ? `Ingresos al día ${diaHoy}` : 'Ingresos del mes', valor: F.dinero(actual.ingresos), delta: anterior ? F.variacion(actual.ingresos, anterior.ingresos) : null, vs, destacado: true })}
        ${kpi({ etiqueta: 'Gastos (con comisiones)', valor: F.dinero(actual.gastos), delta: anterior ? F.variacion(actual.gastos, anterior.gastos) : null, vs, subirEsBueno: false })}
        ${kpi({ etiqueta: 'Utilidad', valor: F.dinero(actual.utilidad), nota: `Margen ${F.porcentaje(actual.margen)}` })}
        ${kpi({ etiqueta: 'Por cobrar', valor: F.dinero(F.suma(porCobrar, (c) => c.saldo)), nota: `${porCobrar.length} pendientes` })}
      </div>

      <div class="rejilla-2">
        <section class="tarjeta">
          <div class="tarjeta-cab"><h2 class="tarjeta-titulo">Ingresos vs. gastos</h2>
            <div class="leyenda"><span><i style="--c:${SERIES.ingresos}"></i>Ingresos</span><span><i style="--c:${SERIES.gastos}"></i>Gastos</span></div></div>
          <div class="grafica"><canvas data-g="mensual" aria-label="Ingresos y gastos por mes"></canvas></div>
          <table class="tabla tabla-compacta">
            <thead><tr><th>Mes</th><th>Ingresos</th><th>Gastos</th><th>Utilidad</th></tr></thead>
            <tbody>${porMes.map((m) => `<tr class="${m.clave === mesElegido ? 'resaltada' : ''}"><td>${F.mesCorto(m.clave)}${m.clave === mesActual ? '*' : ''}</td><td>${F.dinero(m.ingresos)}</td><td>${F.dinero(m.gastos)}</td><td class="${m.utilidad < 0 ? 'texto-alerta' : ''}">${F.dinero(m.utilidad)}</td></tr>`).join('')}</tbody>
          </table>
          <p class="ayuda">* Mes en curso, hasta hoy.</p>
        </section>

        <section class="tarjeta">
          <div class="tarjeta-cab"><h2 class="tarjeta-titulo">Flujo de caja · últimos 3 meses</h2><span class="texto-sec">Saldo de hoy: <b>${F.dinero(flujo.at(-1)?.saldo)}</b></span></div>
          <div class="grafica"><canvas data-g="flujo" aria-label="Saldo de caja por día"></canvas></div>
          <table class="tabla tabla-compacta">
            <thead><tr><th>Mes</th><th>Entradas</th><th>Salidas</th><th>Saldo final</th></tr></thead>
            <tbody>${flujoMeses.map((m) => `<tr><td>${F.mesCorto(m.clave)}</td><td>${F.dinero(m.entradas)}</td><td>${F.dinero(m.salidas)}</td><td>${F.dinero(m.saldo)}</td></tr>`).join('')}</tbody>
          </table>
          <p class="ayuda">Entradas = cobros reales. Salidas = gastos y comisiones (se pagan el 15 y fin de mes).</p>
        </section>
      </div>

      <section class="tarjeta">
        <div class="tarjeta-cab"><h2 class="tarjeta-titulo">Rentabilidad por ${t('servicio')} · ${F.mesSolo(mesElegido)}</h2><span class="texto-sec">Ganancia = precio − comisión − insumos</span></div>
        ${rentab.length ? `<div class="grafica" style="height:${Math.max(160, rentab.length * 38 + 30)}px"><canvas data-g="rentab" aria-label="Ganancia por servicio"></canvas></div>` : vacio('Sin servicios atendidos en este periodo.')}
        <div class="tabla-scroll"><table class="tabla">
          <thead><tr><th>${t.M('servicio')}</th><th>Veces</th><th>Ingresos</th><th>Ganancia</th><th>Margen</th><th>Por hora</th></tr></thead>
          <tbody>${rentab
            .map((r) => {
              const mejor = porHora[0] && r.servicio.id === porHora[0].servicio.id;
              const peor = porHora.length > 1 && r.servicio.id === porHora.at(-1).servicio.id;
              return `<tr><td>${esc(r.servicio.nombre)} ${mejor ? `<span class="chip chip-ok">${icono('estrella')} Más rentable</span>` : ''}${peor ? `<span class="chip chip-alerta">${icono('alerta')} Poco rentable</span>` : ''}</td>
              <td>${r.cantidad}</td><td>${F.dinero(r.ingresos)}</td><td><b>${F.dinero(r.ganancia)}</b></td><td>${F.porcentaje(r.margen)}</td><td>${F.dinero(r.porHora)}</td></tr>`;
            })
            .join('')}</tbody>
        </table></div>
      </section>

      <div class="rejilla-2">
        <section class="tarjeta">
          <div class="tarjeta-cab"><h2 class="tarjeta-titulo">Comisiones por ${t('profesional')}</h2>${ctx.moduloAccesible('comisiones') ? `<a class="enlace" href="#/comisiones">Ver detalle ${icono('der')}</a>` : ''}</div>
          ${comisiones
            .map((c) => {
              const max = Math.max(1, comisiones[0].comision);
              return `<div class="fila-barra">${avatar(c.profesional.nombre, c.profesional.color, 'avatar-chico')}
                <span class="fila-principal"><b>${esc(c.profesional.nombre)}</b><small>${c.citas} ${t('cita', c.citas !== 1)} · ${F.porcentaje(c.profesional.comision)} de comisión</small>
                <span class="barra-fina"><i style="width:${(c.comision / max) * 100}%;--c:${c.profesional.color}"></i></span></span>
                <b>${F.dinero(c.comision)}</b></div>`;
            })
            .join('')}
        </section>

        <section class="tarjeta">
          <div class="tarjeta-cab"><h2 class="tarjeta-titulo">Cuentas por cobrar</h2><b>${F.dinero(F.suma(porCobrar, (c) => c.saldo))}</b></div>
          ${
            porCobrar.length
              ? porCobrar
                  .slice(0, 8)
                  .map((c) => `<div class="fila-historial"><span class="fila-principal"><b>${esc(ctx.q.cliente(c.clienteId).nombre)}</b><small>${esc(c.concepto)} · ${F.relativo(c.fecha, ctx.hoy)}</small></span>
                    <span class="fila-lado"><b>${F.dinero(c.saldo)}</b><button type="button" class="btn btn-sec btn-chico" data-cobrar="${c.tipo}:${c.id}">Cobrar</button></span></div>`)
                  .join('')
              : vacio('¡Nadie te debe! Todo está cobrado.', 'ok')
          }
        </section>
      </div>

      <section class="tarjeta">
        <div class="tarjeta-cab"><h2 class="tarjeta-titulo">Gastos de ${F.mesSolo(mesElegido)}</h2><b>${F.dinero(actual.gastos)}</b></div>
        <div class="lista-barras">
          ${Object.entries(actual.porCategoria)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, monto]) => `<div class="fila-cat"><span>${esc(cat)}</span><span class="barra-fina"><i style="width:${(monto / maxCat) * 100}%;--c:${SERIES.gastos}"></i></span><b>${F.dinero(monto)}</b><small>${F.porcentaje(monto / actual.gastos)}</small></div>`)
            .join('')}
        </div>
        <details class="desplegable"><summary>Ver movimientos (${gastosMes.length})</summary>
          <div class="tabla-scroll"><table class="tabla">
            <thead><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th>Monto</th><th></th></tr></thead>
            <tbody>${gastosMes
              .map((g) => `<tr><td>${F.fechaCorta(g.fecha)}</td><td>${esc(g.concepto)}</td><td>${esc(g.categoria)}</td><td>${F.dinero(g.monto)}</td><td>${g.propio ? `<button type="button" class="btn-icono" data-borrar-gasto="${g.id}" aria-label="Borrar gasto">${icono('basura')}</button>` : ''}</td></tr>`)
              .join('')}</tbody>
          </table></div>
        </details>
      </section>`;

    // ---------- Gráficas ----------
    const graficas = [];
    graficas.push(
      columnasAgrupadas(el.querySelector('[data-g="mensual"]'), {
        etiquetas: porMes.map((m) => F.mesCorto(m.clave) + (m.clave === mesActual ? '*' : '')),
        series: [
          { nombre: 'Ingresos', datos: porMes.map((m) => Math.round(m.ingresos)), color: SERIES.ingresos },
          { nombre: 'Gastos', datos: porMes.map((m) => Math.round(m.gastos)), color: SERIES.gastos },
        ],
      }),
    );
    graficas.push(
      lineaArea(el.querySelector('[data-g="flujo"]'), {
        etiquetas: flujo.map((d) => F.fechaCorta(d.fecha)),
        datos: flujo.map((d) => Math.round(d.saldo)),
        nombre: 'Saldo',
      }),
    );
    const cRentab = el.querySelector('[data-g="rentab"]');
    if (cRentab) {
      graficas.push(
        barrasHorizontales(cRentab, {
          etiquetas: rentab.map((r) => r.servicio.nombre),
          datos: rentab.map((r) => Math.round(r.ganancia)),
          formato: (v) => F.dineroEje(v),
        }),
      );
    }

    // ---------- Acciones ----------
    el.addEventListener('click', async (e) => {
      const m = e.target.closest('[data-mes]');
      if (m) {
        mesElegido = m.dataset.mes;
        return ctx.refrescar();
      }
      if (e.target.closest('[data-gasto]')) return registrarGasto(ctx);
      const c = e.target.closest('[data-cobrar]');
      if (c) {
        const [tipo, id] = c.dataset.cobrar.split(':');
        if (tipo === 'cita') {
          const cita = ctx.q.cita(id);
          cita.pagado = true;
          cita.metodo = 'transferencia';
        } else {
          const v = ctx.datos.ventas.find((x) => x.id === id);
          v.pagado = v.monto;
        }
        ctx.guardar();
        aviso('Pago registrado');
        return ctx.refrescar();
      }
      const b = e.target.closest('[data-borrar-gasto]');
      if (b && (await confirmar('Se quitará este gasto de la demo.', { titulo: '¿Borrar gasto?', si: 'Borrar', peligro: true }))) {
        ctx.datos.gastos = ctx.datos.gastos.filter((g) => g.id !== b.dataset.borrarGasto);
        ctx.guardar();
        ctx.refrescar();
      }
    });

    return () => graficas.forEach((g) => g.destroy());
  },
};

function registrarGasto(ctx) {
  const { config } = ctx;
  const categorias = [...new Set([...(config.gastos.fijos || []), ...(config.gastos.variables || [])].map((g) => g.categoria)), 'Otros'];
  const m = abrirModal({
    titulo: 'Registrar gasto',
    clase: 'modal-chico',
    cuerpo: `<form class="form" id="form-gasto" autocomplete="off">
      <label class="campo"><span>Concepto</span><input name="concepto" required maxlength="60" placeholder="Ej. Compra de toallas"></label>
      <div class="campos-2">
        <label class="campo"><span>Categoría</span><select name="categoria">${categorias.map((c) => `<option>${esc(c)}</option>`).join('')}</select></label>
        <label class="campo"><span>Monto (MXN)</span><input name="monto" type="number" inputmode="decimal" min="1" step="1" required placeholder="0"></label>
      </div>
      <label class="campo"><span>Fecha</span><input name="fecha" type="date" required value="${ctx.hoy}" max="${ctx.hoy}"></label>
    </form>`,
    pie: `<button type="button" class="btn btn-sec" data-cerrar>Cancelar</button><button type="submit" form="form-gasto" class="btn btn-primario">Guardar gasto</button>`,
  });
  m.$('#form-gasto').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = leerFormulario(e.target);
    ctx.datos.gastos.push({ id: F.uid('ga'), fecha: v.fecha, concepto: v.concepto.trim(), categoria: v.categoria, monto: Math.round(Number(v.monto)), tipo: 'variable', propio: true });
    ctx.datos.gastos.sort((a, b) => a.fecha.localeCompare(b.fecha));
    ctx.guardar();
    m.cerrar();
    mesElegido = F.claveMes(v.fecha);
    aviso(`Gasto de ${F.dinero(v.monto)} registrado`);
    ctx.refrescar();
  });
}
