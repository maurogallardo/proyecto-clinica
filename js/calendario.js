// Calendario de rango de fechas para los filtros del dashboard (T052).
// Hecho acá (sin librería): exacto a lo pedido, con nuestros colores (tokens) en
// claro y oscuro, en castellano y con la semana desde el lunes.
//
// Cómo se usa: se toca el día de inicio y después el de fin; los días del medio se
// pintan. Con un solo día tocado, ya filtra ese día (y se puede tocar el de fin).
// Teclado: flechas (día / semana), Re Pág y Av Pág (mes), Inicio y Fin (semana),
// Enter o espacio (elegir), Esc (cerrar).

const Calendario = (() => {
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto',
    'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const DIAS_CORTOS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
  const DIAS_LARGOS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

  const soloFecha = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const mismoDia = (a, b) => !!a && !!b && a.getTime() === b.getTime();
  const sumarDias = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  const dos = (n) => String(n).padStart(2, '0');
  const corto = (d) => `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()}`;
  const largo = (d) => `${DIAS_LARGOS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;

  function sumarMeses(d, n) {
    const destino = new Date(d.getFullYear(), d.getMonth() + n, 1);
    const ultimo = new Date(destino.getFullYear(), destino.getMonth() + 1, 0).getDate();
    return new Date(destino.getFullYear(), destino.getMonth(), Math.min(d.getDate(), ultimo));
  }

  // boton: el que abre el calendario; texto: dónde se escribe el rango elegido;
  // panel: la caja que se despliega; alCambiar(rango): avisa el rango nuevo
  function crear({ boton, texto, panel, alCambiar }) {
    let inicio = null;
    let fin = null;
    let mes = soloFecha(new Date());      // cualquier día del mes que se ve
    let foco = soloFecha(new Date());     // el día que tiene el foco del teclado
    let provisorio = null;                // día bajo el mouse mientras falta el fin

    // --- Lo que se ve en el botón ---
    function escribirTexto() {
      if (!inicio) texto.textContent = 'Todas las fechas';
      else if (!fin || mismoDia(inicio, fin)) texto.textContent = corto(inicio);
      else texto.textContent = `${corto(inicio)} – ${corto(fin)}`;
      boton.classList.toggle('esta-activo', !!inicio);
    }

    // --- El rango que usa el filtro: comienzo y fin de día, en hora local ---
    function rango() {
      if (!inicio) return null;
      const hasta = fin || inicio;
      return {
        desde: new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate()),
        hasta: new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate(), 23, 59, 59, 999),
      };
    }

    // --- Dibujar el mes ---
    function dibujar() {
      const primero = new Date(mes.getFullYear(), mes.getMonth(), 1);
      const desplazamiento = (primero.getDay() + 6) % 7;   // lunes = 0
      const comienzo = sumarDias(primero, -desplazamiento);
      const hoy = soloFecha(new Date());

      const cabecera = document.createElement('div');
      cabecera.className = 'calendario__cabecera';
      const anterior = botonMes('‹', 'Mes anterior', -1);
      const titulo = document.createElement('span');
      titulo.className = 'calendario__mes';
      titulo.id = `${panel.id}-mes`;
      titulo.setAttribute('aria-live', 'polite');
      titulo.textContent = `${MESES[mes.getMonth()]} ${mes.getFullYear()}`;
      const siguiente = botonMes('›', 'Mes siguiente', 1);
      cabecera.append(anterior, titulo, siguiente);

      const grilla = document.createElement('div');
      grilla.className = 'calendario__grilla';
      grilla.setAttribute('role', 'grid');
      grilla.setAttribute('aria-labelledby', titulo.id);
      const filaNombres = document.createElement('div');
      filaNombres.className = 'calendario__fila';
      filaNombres.setAttribute('role', 'row');
      DIAS_CORTOS.forEach((d) => {
        const n = document.createElement('span');
        n.className = 'calendario__nombre-dia';
        n.setAttribute('role', 'columnheader');
        n.textContent = d;
        filaNombres.appendChild(n);
      });
      grilla.appendChild(filaNombres);

      for (let semana = 0; semana < 6; semana++) {
        const fila = document.createElement('div');
        fila.className = 'calendario__fila';
        fila.setAttribute('role', 'row');
        for (let dia = 0; dia < 7; dia++) {
          const fecha = sumarDias(comienzo, semana * 7 + dia);
          const celda = document.createElement('span');
          celda.setAttribute('role', 'gridcell');
          const b2 = document.createElement('button');
          b2.type = 'button';
          b2.className = 'calendario__dia';
          b2.textContent = String(fecha.getDate());
          b2.dataset.fecha = String(fecha.getTime());
          b2.setAttribute('aria-label', largo(fecha));
          b2.tabIndex = mismoDia(fecha, foco) ? 0 : -1;
          if (fecha.getMonth() !== mes.getMonth()) b2.classList.add('es-de-otro-mes');
          if (mismoDia(fecha, hoy)) { b2.classList.add('es-hoy'); b2.setAttribute('aria-current', 'date'); }
          celda.appendChild(b2);
          fila.appendChild(celda);
        }
        grilla.appendChild(fila);
      }

      const pie = document.createElement('p');
      pie.className = 'calendario__pie';

      panel.replaceChildren(cabecera, grilla, pie);
      pintar();
    }

    // Pinta el rango sobre los días que ya están dibujados (sin volver a armarlos:
    // así pasar el mouse no hace perder un clic)
    function pintar() {
      const finProvisorio = fin || provisorio;
      const [a, b] = inicio && finProvisorio && finProvisorio < inicio ? [finProvisorio, inicio] : [inicio, finProvisorio];
      panel.querySelectorAll('.calendario__dia').forEach((dia) => {
        const fecha = new Date(Number(dia.dataset.fecha));
        const esExtremo = mismoDia(fecha, a) || mismoDia(fecha, b);
        const enRango = !!a && !!b && fecha > a && fecha < b;
        dia.classList.toggle('es-extremo', esExtremo);
        dia.classList.toggle('esta-en-rango', enRango);
        dia.classList.toggle('es-inicio', mismoDia(fecha, a) && !!b && !mismoDia(a, b));
        dia.classList.toggle('es-fin', mismoDia(fecha, b) && !!a && !mismoDia(a, b));
        dia.setAttribute('aria-selected', String(esExtremo || enRango));
      });
      const pie = panel.querySelector('.calendario__pie');
      if (pie) {
        pie.textContent = !inicio ? 'Tocá el día de inicio.'
          : !fin ? `Filtra solo el ${corto(inicio)}. Tocá el día de fin para elegir un rango.`
            : `Del ${corto(inicio)} al ${corto(fin)}.`;
      }
    }

    function botonMes(simbolo, nombre, n) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'calendario__flecha';
      b.textContent = simbolo;
      b.setAttribute('aria-label', nombre);
      b.addEventListener('click', () => { mes = sumarMeses(mes, n); foco = sumarMeses(foco, n); dibujar(); });
      return b;
    }

    // --- Elegir un día ---
    function elegir(fecha) {
      if (!inicio || fin) {          // empieza un rango nuevo: filtra ese día solo
        inicio = fecha;
        fin = null;
      } else if (mismoDia(fecha, inicio)) {
        fin = fecha;                 // el mismo día dos veces: rango de un día
      } else if (fecha < inicio) {
        fin = inicio;                // se tocó uno anterior: se dan vuelta
        inicio = fecha;
      } else {
        fin = fecha;
      }
      provisorio = null;
      foco = fecha;
      escribirTexto();
      alCambiar(rango());
      dibujar();
      if (fin) cerrar();             // con el rango completo, se cierra
      else enfocar();
    }

    function enfocar() {
      const dia = panel.querySelector(`.calendario__dia[data-fecha="${foco.getTime()}"]`);
      if (dia) dia.focus();
    }

    function moverFoco(nuevo) {
      foco = nuevo;
      if (nuevo.getMonth() !== mes.getMonth() || nuevo.getFullYear() !== mes.getFullYear()) mes = soloFecha(nuevo);
      dibujar();
      enfocar();
    }

    // --- Abrir y cerrar ---
    function abrir() {
      if (!panel.hidden) return;
      foco = inicio || soloFecha(new Date());
      mes = soloFecha(foco);
      dibujar();
      panel.hidden = false;
      boton.setAttribute('aria-expanded', 'true');
      enfocar();
    }

    function cerrar({ devolverFoco = true } = {}) {
      if (panel.hidden) return;
      panel.hidden = true;
      provisorio = null;
      boton.setAttribute('aria-expanded', 'false');
      if (devolverFoco) boton.focus();
    }

    boton.addEventListener('click', () => (panel.hidden ? abrir() : cerrar()));

    panel.addEventListener('click', (evento) => {
      const dia = evento.target.closest('.calendario__dia');
      if (dia) elegir(new Date(Number(dia.dataset.fecha)));
    });

    // Mientras falta el día de fin, el rango se ve "de prueba" al pasar el mouse
    panel.addEventListener('mouseover', (evento) => {
      const dia = evento.target.closest('.calendario__dia');
      if (!dia || !inicio || fin) return;
      const fecha = new Date(Number(dia.dataset.fecha));
      if (mismoDia(fecha, provisorio)) return;
      provisorio = fecha;
      pintar();
    });

    panel.addEventListener('keydown', (evento) => {
      const tecla = evento.key;
      if (tecla === 'Escape') { evento.preventDefault(); cerrar(); return; }
      if (!evento.target.closest('.calendario__dia')) return;
      const lunes = sumarDias(foco, -((foco.getDay() + 6) % 7));
      const movimientos = {
        ArrowLeft: () => sumarDias(foco, -1),
        ArrowRight: () => sumarDias(foco, 1),
        ArrowUp: () => sumarDias(foco, -7),
        ArrowDown: () => sumarDias(foco, 7),
        PageUp: () => sumarMeses(foco, -1),
        PageDown: () => sumarMeses(foco, 1),
        Home: () => lunes,
        End: () => sumarDias(lunes, 6),
      };
      if (movimientos[tecla]) {
        evento.preventDefault();
        moverFoco(movimientos[tecla]());
      }
    });

    // Tocar afuera del calendario lo cierra (sin robar el foco a lo que se tocó)
    document.addEventListener('mousedown', (evento) => {
      if (!panel.hidden && !panel.contains(evento.target) && !boton.contains(evento.target)) cerrar({ devolverFoco: false });
    });

    function limpiar() {
      inicio = null;
      fin = null;
      provisorio = null;
      escribirTexto();
      if (!panel.hidden) dibujar();
    }

    escribirTexto();
    return { rango, limpiar, cerrar: () => cerrar({ devolverFoco: false }) };
  }

  return { crear };
})();
