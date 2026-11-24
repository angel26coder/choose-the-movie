/*
 * Desplegable de sugerencias bajo el campo de texto (patrón "combobox" de ARIA).
 * Teclado: ↑ ↓ para moverse, Enter para elegir, Esc para cerrar.
 */
(function (app) {
  'use strict';

  const MIN_QUERY_LENGTH = 2;
  const DEBOUNCE_MS = 250;

  function createAutocomplete({ input, container, list, status, search, isAvailable, thumbnailUrl, onSelect }) {
    const cache = new Map();
    let items = [];
    let activeIndex = -1;
    let timer = 0;
    let controller = null;

    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', list.id);

    function isOpen() {
      return !container.hidden;
    }

    /* Justo debajo del campo y sin pasarse del borde inferior de la pantalla. */
    function position() {
      container.style.top = `${input.offsetTop + input.offsetHeight + 6}px`;
      const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      const space = viewportHeight - input.getBoundingClientRect().bottom - 16;
      container.style.maxHeight = `${Math.max(200, Math.min(380, space))}px`;
    }

    function open() {
      container.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      position();
    }

    function cancelPending() {
      clearTimeout(timer);
      if (controller) controller.abort();
      controller = null;
      container.removeAttribute('aria-busy');
    }

    function close() {
      cancelPending();
      container.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      setActive(-1);
    }

    function setActive(index) {
      activeIndex = index;
      [...list.children].forEach((option, optionIndex) => {
        option.setAttribute('aria-selected', String(optionIndex === index));
      });
      if (index < 0) {
        input.removeAttribute('aria-activedescendant');
        return;
      }
      const option = list.children[index];
      input.setAttribute('aria-activedescendant', option.id);
      option.scrollIntoView({ block: 'nearest' });
    }

    function placeholderThumb(movie) {
      const placeholder = document.createElement('span');
      placeholder.className = 'suggestion__poster suggestion__poster--empty';
      placeholder.textContent = Array.from(movie.title)[0].toUpperCase();
      return placeholder;
    }

    function createThumb(movie) {
      if (!movie.poster) return placeholderThumb(movie);
      const image = document.createElement('img');
      image.className = 'suggestion__poster';
      image.src = thumbnailUrl(movie);
      image.alt = '';
      image.loading = 'lazy';
      image.addEventListener('error', () => image.replaceWith(placeholderThumb(movie)));
      return image;
    }

    function createOption(movie, index) {
      const option = document.createElement('li');
      option.id = `${list.id}-${index}`;
      option.className = 'suggestion';
      option.setAttribute('role', 'option');
      option.setAttribute('aria-selected', 'false');

      const title = document.createElement('span');
      title.className = 'suggestion__title';
      title.textContent = movie.title;

      const meta = document.createElement('span');
      meta.className = 'suggestion__meta';
      meta.textContent = movie.year || 'Sin fecha';

      const text = document.createElement('span');
      text.className = 'suggestion__text';
      text.append(title, meta);

      option.append(createThumb(movie), text);
      option.addEventListener('mousemove', () => { if (activeIndex !== index) setActive(index); });
      option.addEventListener('click', () => choose(index));
      return option;
    }

    function render(results) {
      items = results;
      list.replaceChildren(...results.map(createOption));
      status.textContent = results.length ? '' : 'Sin coincidencias. Podés agregarla igual con Enter.';
      setActive(-1);
      open();
    }

    function showMessage(text) {
      items = [];
      list.replaceChildren();
      status.textContent = text;
      setActive(-1);
      open();
    }

    function choose(index) {
      const movie = items[index];
      if (!movie) return;
      close();
      onSelect(movie);
    }

    async function fetchResults(query, key) {
      controller = new AbortController();
      const { signal } = controller;
      try {
        const results = await search(query, signal);
        cache.set(key, results);
        if (!signal.aborted) render(results);
      } catch (error) {
        if (signal.aborted) return;
        showMessage(error.message === 'auth'
          ? 'La búsqueda no está disponible: la clave de TMDB falta o no es válida.'
          : 'No se pudo buscar películas. Revisá la conexión.');
      } finally {
        if (!signal.aborted) {
          controller = null;
          container.removeAttribute('aria-busy');
        }
      }
    }

    function onInput() {
      cancelPending();
      const query = input.value.trim();
      if (query.length < MIN_QUERY_LENGTH || !isAvailable()) {
        items = [];
        close();
        return;
      }

      const key = app.comparisonKey(query);
      if (cache.has(key)) {
        render(cache.get(key));
        return;
      }

      if (!isOpen() || items.length === 0) showMessage('Buscando…');
      container.setAttribute('aria-busy', 'true');
      timer = setTimeout(() => fetchResults(query, key), DEBOUNCE_MS);
    }

    function onKeydown(event) {
      if (event.isComposing) return;

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (items.length === 0) return;
        event.preventDefault();
        if (!isOpen()) open();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        const next = activeIndex < 0
          ? (step > 0 ? 0 : items.length - 1)
          : (activeIndex + step + items.length) % items.length;
        setActive(next);
      } else if (event.key === 'Enter' && isOpen() && activeIndex >= 0) {
        event.preventDefault();
        choose(activeIndex);
      } else if (event.key === 'Escape' && isOpen()) {
        event.preventDefault();
        close();
      }
    }

    /* Si el texto escrito coincide con una sugerencia, se usa esa (con póster y año). */
    function findExact(text) {
      const key = app.comparisonKey(text);
      const pool = cache.get(key) || items;
      return pool.find((movie) => app.comparisonKey(movie.title) === key) || null;
    }

    input.addEventListener('input', onInput);
    input.addEventListener('keydown', onKeydown);
    input.addEventListener('blur', close);
    input.addEventListener('focus', () => {
      if (input.value.trim().length >= MIN_QUERY_LENGTH) onInput();
    });
    /* Evita que el campo pierda el foco al tocar una sugerencia o la barra de desplazamiento. */
    container.addEventListener('mousedown', (event) => event.preventDefault());
    window.addEventListener('resize', () => { if (isOpen()) position(); });

    return { close, findExact };
  }

  app.createAutocomplete = createAutocomplete;
})(window.MovieRoulette = window.MovieRoulette || {});
