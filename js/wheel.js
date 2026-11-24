/*
 * Dibuja la ruleta y la hace girar.
 *
 * Convención de ángulos: 0° es las 12 en punto, donde está el indicador, y
 * crecen en sentido horario. El sector i ocupa [i * paso, (i + 1) * paso).
 * Si la ruleta rotó R grados, bajo el indicador queda el ángulo (-R mod 360).
 */
(function (app) {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';

  const CENTER = 500;
  const RADIUS = 445;

  const LABEL_OUTER = 408;
  const LABEL_WIDTH = 282;
  const LABEL_SIZING_RADIUS = 190;
  const LABEL_MAX_FONT = 42;
  const LABEL_MIN_FONT = 26;
  const LABEL_LINE_HEIGHT = 1.14;

  const BULB_COUNT = 28;
  const BULB_RADIUS = 472;

  const SPIN = {
    durationMs: [6000, 7500],
    turns: [6, 9],
    easing: 'cubic-bezier(0.13, 0.62, 0.08, 1)',
  };
  const SPIN_REDUCED = {
    durationMs: [1200, 1200],
    turns: [1, 2],
    easing: 'ease-out',
  };

  /* El resultado nunca cae a menos de este margen del borde de un sector. */
  const SECTOR_SAFE_MARGIN = 0.1;

  const PALETTE = [
    { fill: '#a5162d', text: '#f8eedc' },
    { fill: '#e3b04b', text: '#24130a' },
    { fill: '#14465f', text: '#f8eedc' },
    { fill: '#efe3cc', text: '#3a0d14' },
    { fill: '#6b2a5e', text: '#f8eedc' },
    { fill: '#d2622a', text: '#1e0e06' },
    { fill: '#1d6b5a', text: '#f8eedc' },
    { fill: '#2b2540', text: '#f5dc9f' },
  ];

  function mod(value, divisor) {
    return ((value % divisor) + divisor) % divisor;
  }

  function randomUnit() {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return buffer[0] / 2 ** 32;
  }

  function randomBetween(min, max) {
    return min + randomUnit() * (max - min);
  }

  function svgElement(name, attributes) {
    const element = document.createElementNS(SVG_NS, name);
    Object.entries(attributes || {}).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
  }

  function polarPoint(degrees, radius) {
    const radians = (degrees * Math.PI) / 180;
    return {
      x: CENTER + radius * Math.sin(radians),
      y: CENTER - radius * Math.cos(radians),
    };
  }

  /* Colores por sector, evitando que el último repita el del primero. */
  function sectorColors(count) {
    return Array.from({ length: count }, (_, index) => {
      const closesOnFirstColor = index === count - 1 && count > 1 && index % PALETTE.length === 0;
      return closesOnFirstColor ? PALETTE[PALETTE.length / 2] : PALETTE[index % PALETTE.length];
    });
  }

  function createLabelFitter(fontFamily) {
    const context = document.createElement('canvas').getContext('2d');

    function width(text, size) {
      context.font = `700 ${size}px ${fontFamily}`;
      return context.measureText(text).width;
    }

    function wrap(title, size) {
      const lines = [];
      let line = '';
      title.split(' ').forEach((word) => {
        const candidate = line ? `${line} ${word}` : word;
        if (line && width(candidate, size) > LABEL_WIDTH) {
          lines.push(line);
          line = word;
        } else {
          line = candidate;
        }
      });
      lines.push(line);
      return lines;
    }

    function truncate(text, size) {
      if (width(text, size) <= LABEL_WIDTH) return text;
      let shortened = text;
      while (shortened.length > 1 && width(`${shortened}…`, size) > LABEL_WIDTH) {
        shortened = shortened.slice(0, -1);
      }
      return `${shortened.trimEnd()}…`;
    }

    function linesAllowed(arc, size) {
      return Math.max(1, Math.min(2, Math.floor(arc / (size * LABEL_LINE_HEIGHT))));
    }

    /* Prueba tamaños de mayor a menor; si no entra, recorta con puntos suspensivos. */
    return function fit(title, sectorCount) {
      const arc = (2 * Math.PI * LABEL_SIZING_RADIUS) / sectorCount;
      const maxSize = Math.min(LABEL_MAX_FONT, arc * 0.6);
      const minSize = Math.min(LABEL_MIN_FONT, maxSize);

      for (let size = maxSize; size >= minSize; size -= 2) {
        const lines = wrap(title, size);
        const fits = lines.length <= linesAllowed(arc, size)
          && lines.every((line) => width(line, size) <= LABEL_WIDTH);
        if (fits) return { size, lines };
      }

      const allowed = linesAllowed(arc, minSize);
      const lines = wrap(title, minSize);
      const kept = lines.slice(0, allowed - 1).map((line) => truncate(line, minSize));
      const rest = lines.slice(allowed - 1).join(' ');
      return { size: minSize, lines: [...kept, truncate(rest, minSize)] };
    };
  }

  function sectorShape(index, step, color) {
    if (step === 360) {
      return svgElement('circle', { cx: CENTER, cy: CENTER, r: RADIUS, fill: color.fill });
    }
    const start = polarPoint(index * step, RADIUS);
    const end = polarPoint((index + 1) * step, RADIUS);
    const largeArc = step > 180 ? 1 : 0;
    return svgElement('path', {
      d: `M${CENTER} ${CENTER} L${start.x} ${start.y} A${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y} Z`,
      fill: color.fill,
      stroke: 'rgba(12, 7, 9, 0.55)',
      'stroke-width': 2,
    });
  }

  function sectorLabel(index, step, color, label) {
    const middle = (index + 0.5) * step;
    const group = svgElement('g', { transform: `rotate(${middle - 90} ${CENTER} ${CENTER})` });
    const lineHeight = label.size * LABEL_LINE_HEIGHT;

    label.lines.forEach((line, lineIndex) => {
      const offset = (lineIndex - (label.lines.length - 1) / 2) * lineHeight;
      const text = svgElement('text', {
        x: CENTER + LABEL_OUTER,
        y: CENTER + offset + label.size * 0.35,
        'text-anchor': 'end',
        'font-size': label.size,
        fill: color.text,
      });
      text.textContent = line;
      group.append(text);
    });
    return group;
  }

  function drawFrame(frame) {
    const defs = svgElement('defs');
    const rim = svgElement('linearGradient', { id: 'rimGradient', x1: 0, y1: 0, x2: 1, y2: 1 });
    [['0', '#f5dc9f'], ['0.45', '#a8761f'], ['0.7', '#6d4a10'], ['1', '#d9a441']].forEach(([offset, color]) => {
      rim.append(svgElement('stop', { offset, 'stop-color': color }));
    });
    const halo = svgElement('radialGradient', { id: 'bulbHalo' });
    [['0.3', 'rgba(255, 226, 160, 0.75)'], ['1', 'rgba(255, 200, 100, 0)']].forEach(([offset, color]) => {
      halo.append(svgElement('stop', { offset, 'stop-color': color }));
    });
    const pointerFill = svgElement('linearGradient', { id: 'pointerGradient', x1: 0, y1: 0, x2: 1, y2: 0 });
    [['0', '#f5dc9f'], ['0.5', '#fff3cf'], ['0.51', '#c08d2e'], ['1', '#8d6318']].forEach(([offset, color]) => {
      pointerFill.append(svgElement('stop', { offset, 'stop-color': color }));
    });
    defs.append(rim, halo, pointerFill);

    const ring = [
      svgElement('circle', { cx: CENTER, cy: CENTER, r: 472, fill: 'none', stroke: '#1a0d10', 'stroke-width': 54 }),
      svgElement('circle', { cx: CENTER, cy: CENTER, r: 497, fill: 'none', stroke: 'url(#rimGradient)', 'stroke-width': 6 }),
      svgElement('circle', { cx: CENTER, cy: CENTER, r: 447, fill: 'none', stroke: 'url(#rimGradient)', 'stroke-width': 6 }),
      svgElement('circle', { cx: CENTER, cy: CENTER, r: 436, fill: 'none', stroke: 'rgba(0, 0, 0, 0.28)', 'stroke-width': 16 }),
    ];

    const bulbs = Array.from({ length: BULB_COUNT }, (_, index) => {
      const point = polarPoint(((index + 0.5) * 360) / BULB_COUNT, BULB_RADIUS);
      const bulb = svgElement('g', {
        class: 'bulb',
        style: `--parity:${index % 2};--group:${index % 3}`,
      });
      bulb.append(
        svgElement('circle', { cx: point.x, cy: point.y, r: 24, fill: 'url(#bulbHalo)' }),
        svgElement('circle', { cx: point.x, cy: point.y, r: 9, fill: '#ffeec2' }),
      );
      return bulb;
    });

    const pointer = svgElement('g', { class: 'wheel__pointer' });
    pointer.append(
      svgElement('path', {
        d: 'M452 6 H548 V34 L500 90 L452 34 Z',
        fill: 'url(#pointerGradient)',
        stroke: '#2a1405',
        'stroke-width': 4,
        'stroke-linejoin': 'round',
      }),
      svgElement('circle', { cx: 500, cy: 34, r: 11, fill: '#7d1428', stroke: '#2a1405', 'stroke-width': 3 }),
    );

    frame.replaceChildren(defs, ...ring, ...bulbs, pointer);
    return pointer;
  }

  function createWheel({ container, rotor, frame }) {
    const pointer = drawFrame(frame);
    const fitLabel = createLabelFitter(getComputedStyle(rotor).fontFamily);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    let titles = [];
    let rotation = 0;
    let spinning = false;
    let pointerKick = null;

    function applyRotation() {
      rotor.style.transform = `rotate(${rotation}deg)`;
    }

    function drawEmptyWheel() {
      const placeholder = { fill: '#21141a' };
      const alternate = { fill: '#2c1a20' };
      const step = 360 / 12;
      const shapes = Array.from({ length: 12 }, (_, index) =>
        sectorShape(index, step, index % 2 ? alternate : placeholder));

      const message = svgElement('text', {
        x: CENTER,
        y: 262,
        'text-anchor': 'middle',
        'font-size': 36,
        fill: '#b9a999',
      });
      message.textContent = 'Agregá películas';
      rotor.replaceChildren(...shapes, message);
      rotor.setAttribute('aria-label', 'Ruleta vacía');
    }

    function render(movies) {
      titles = movies;
      if (titles.length === 0) {
        rotation = 0;
        applyRotation();
        drawEmptyWheel();
        return;
      }

      const step = 360 / titles.length;
      const colors = sectorColors(titles.length);
      const sectors = titles.map((title, index) => {
        const group = svgElement('g', { 'data-index': index });
        const tooltip = svgElement('title');
        tooltip.textContent = title;
        group.append(
          tooltip,
          sectorShape(index, step, colors[index]),
          sectorLabel(index, step, colors[index], fitLabel(title, titles.length)),
        );
        return group;
      });

      rotor.replaceChildren(...sectors);
      const noun = titles.length === 1 ? 'película' : 'películas';
      rotor.setAttribute('aria-label', `Ruleta con ${titles.length} ${noun}`);
    }

    /* Ángulo real en pantalla, leído del navegador (también en plena animación). */
    function currentRotation() {
      const matrix = new DOMMatrixReadOnly(getComputedStyle(rotor).transform);
      return mod((Math.atan2(matrix.b, matrix.a) * 180) / Math.PI, 360);
    }

    function sectorAtPointer(degrees) {
      const step = 360 / titles.length;
      return Math.floor(mod(-degrees, 360) / step) % titles.length;
    }

    function kickPointer() {
      if (pointerKick) pointerKick.cancel();
      pointerKick = pointer.animate(
        [{ transform: 'rotate(-13deg)' }, { transform: 'rotate(0deg)' }],
        { duration: 130, easing: 'ease-out' },
      );
    }

    function followPointer() {
      let lastSector = sectorAtPointer(currentRotation());
      const onFrame = () => {
        if (!spinning) return;
        const sector = sectorAtPointer(currentRotation());
        if (sector !== lastSector) {
          lastSector = sector;
          kickPointer();
        }
        requestAnimationFrame(onFrame);
      };
      requestAnimationFrame(onFrame);
    }

    /* Resuelve con el índice del sector que quedó bajo el indicador. */
    async function spin() {
      const settings = reducedMotion.matches ? SPIN_REDUCED : SPIN;
      const step = 360 / titles.length;
      const target = Math.floor(randomUnit() * titles.length);
      const landing = (target + randomBetween(SECTOR_SAFE_MARGIN, 1 - SECTOR_SAFE_MARGIN)) * step;
      const turns = Math.round(randomBetween(...settings.turns));
      const finalRotation = rotation + turns * 360 + mod(-landing - rotation, 360);

      spinning = true;
      container.classList.add('is-spinning');
      followPointer();

      const animation = rotor.animate(
        [{ transform: `rotate(${rotation}deg)` }, { transform: `rotate(${finalRotation}deg)` }],
        {
          duration: randomBetween(...settings.durationMs),
          easing: settings.easing,
          fill: 'forwards',
        },
      );
      await animation.finished;

      rotation = currentRotation();
      applyRotation();
      animation.cancel();

      spinning = false;
      container.classList.remove('is-spinning');
      return sectorAtPointer(rotation);
    }

    render([]);

    return {
      render,
      spin,
      get isSpinning() { return spinning; },
    };
  }

  app.createWheel = createWheel;
  app.sectorColors = sectorColors;
})(window.MovieRoulette = window.MovieRoulette || {});
