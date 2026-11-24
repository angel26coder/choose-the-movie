/* Todo lo que toca el DOM fuera de la ruleta: formulario, lista y ventanas. */
(function (app) {
  'use strict';

  const POSTER_THUMB = 'w92';
  const POSTER_LARGE = 'w342';

  const byId = (id) => document.getElementById(id);

  function pluralize(count) {
    return count === 1 ? '1 película' : `${count} películas`;
  }

  function initial(title) {
    return Array.from(title)[0].toUpperCase();
  }

  function createUI(handlers) {
    const form = byId('addForm');
    const input = byId('movieInput');
    const message = byId('formMessage');
    const list = byId('movieList');
    const count = byId('movieCount');
    const emptyMessage = byId('emptyMessage');
    const clearButton = byId('clearButton');
    const spinButton = byId('spinButton');
    const lockableGroups = [byId('addFields'), byId('listFields')];

    const resultDialog = byId('resultDialog');
    const resultMain = byId('resultMain');
    const resultPoster = byId('resultPoster');
    const resultTitle = byId('resultTitle');
    const resultYear = byId('resultYear');
    const clearDialog = byId('clearDialog');
    const clearDescription = byId('clearDescription');

    let winner = null;

    const autocomplete = app.createAutocomplete({
      input,
      container: byId('suggestions'),
      list: byId('suggestionList'),
      status: byId('suggestionStatus'),
      search: handlers.search,
      isAvailable: handlers.searchAvailable,
      thumbnailUrl: (movie) => app.tmdb.posterUrl(movie.poster, POSTER_THUMB),
      onSelect: submitEntry,
    });

    /* La clave local se carga después que el resto, así que se vuelve a revisar al terminar la carga. */
    const updateCredit = () => { byId('tmdbCredit').hidden = !handlers.searchAvailable(); };
    updateCredit();
    window.addEventListener('load', updateCredit);

    function showFormError(text) {
      message.textContent = text;
      input.setAttribute('aria-invalid', 'true');
    }

    function clearFormError() {
      message.textContent = '';
      input.removeAttribute('aria-invalid');
    }

    function submitEntry(entry) {
      const result = handlers.onAdd(entry);
      if (result.ok) {
        input.value = '';
        clearFormError();
        autocomplete.close();
        scrollListToEnd();
      } else if (result.reason === 'empty') {
        input.value = '';
        showFormError('Escribí el nombre de una película.');
      } else {
        showFormError(`«${result.title}» ya está en la lista.`);
      }
      input.focus();
    }

    /* Póster si lo hay; si no, un recuadro del color del sector con la inicial. */
    function createThumb(movie, color) {
      const thumb = document.createElement('span');
      thumb.className = 'movie__thumb';
      thumb.style.setProperty('--swatch', color.fill);
      thumb.style.setProperty('--swatch-text', color.text);

      const showInitial = () => {
        thumb.classList.remove('has-poster');
        thumb.textContent = initial(movie.title);
      };

      if (!movie.poster) {
        showInitial();
        return thumb;
      }

      const image = document.createElement('img');
      image.className = 'movie__poster';
      image.src = app.tmdb.posterUrl(movie.poster, POSTER_THUMB);
      image.alt = '';
      image.loading = 'lazy';
      image.addEventListener('error', showInitial);
      thumb.classList.add('has-poster');
      thumb.append(image);
      return thumb;
    }

    function createMovieRow(movie, color) {
      const row = document.createElement('li');
      row.className = 'movie';

      const name = document.createElement('span');
      name.className = 'movie__name';
      name.textContent = movie.title;

      const text = document.createElement('span');
      text.className = 'movie__text';
      text.append(name);

      if (movie.year) {
        const year = document.createElement('span');
        year.className = 'movie__year';
        year.textContent = movie.year;
        text.append(year);
      }

      const remove = document.createElement('button');
      remove.className = 'movie__remove';
      remove.type = 'button';
      remove.textContent = '×';
      remove.setAttribute('aria-label', `Quitar ${movie.title}`);
      remove.title = 'Quitar';
      remove.addEventListener('click', () => removeFromRow(row, movie.title));

      row.append(createThumb(movie, color), text, remove);
      return row;
    }

    /* Mantiene el foco en la lista al borrar con teclado. */
    function removeFromRow(row, title) {
      const position = [...list.children].indexOf(row);
      handlers.onRemove(title);
      const neighbor = list.children[position] || list.children[position - 1];
      (neighbor ? neighbor.querySelector('button') : input).focus();
    }

    function renderMovies(movies) {
      const colors = app.sectorColors(movies.length);
      list.replaceChildren(...movies.map((movie, index) => createMovieRow(movie, colors[index])));

      count.textContent = pluralize(movies.length);
      emptyMessage.hidden = movies.length > 0;
      clearButton.hidden = movies.length === 0;
      spinButton.disabled = movies.length === 0;
    }

    function scrollListToEnd() {
      list.scrollTop = list.scrollHeight;
    }

    function setSpinning(spinning, hasMovies) {
      if (spinning) autocomplete.close();
      lockableGroups.forEach((group) => { group.disabled = spinning; });
      spinButton.disabled = spinning || !hasMovies;
    }

    function hideResultPoster() {
      resultPoster.hidden = true;
      resultPoster.removeAttribute('src');
      resultMain.classList.remove('has-poster');
    }

    function showResult(movie) {
      winner = movie;
      resultTitle.textContent = movie.title;
      resultYear.textContent = movie.year || '';
      resultYear.hidden = !movie.year;

      if (movie.poster) {
        resultPoster.src = app.tmdb.posterUrl(movie.poster, POSTER_LARGE);
        resultPoster.alt = `Póster de ${movie.title}`;
        resultPoster.hidden = false;
        resultMain.classList.add('has-poster');
      } else {
        hideResultPoster();
      }
      resultDialog.showModal();
    }

    function closeOnBackdropClick(dialog) {
      dialog.addEventListener('click', (event) => {
        if (event.target === dialog) dialog.close();
      });
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const suggestion = autocomplete.findExact(input.value);
      submitEntry(suggestion || input.value);
    });

    input.addEventListener('input', clearFormError);

    resultPoster.addEventListener('error', hideResultPoster);

    spinButton.addEventListener('click', handlers.onSpin);

    byId('resultClose').addEventListener('click', () => resultDialog.close());

    byId('spinAgainButton').addEventListener('click', () => {
      resultDialog.close();
      handlers.onSpin();
    });

    byId('removeWinnerButton').addEventListener('click', () => {
      resultDialog.close();
      if (winner) handlers.onRemove(winner.title);
    });

    clearButton.addEventListener('click', () => {
      clearDescription.textContent = `Se van a quitar ${pluralize(list.children.length)} de la cartelera.`;
      clearDialog.showModal();
    });

    byId('clearCancelButton').addEventListener('click', () => clearDialog.close());

    byId('clearConfirmButton').addEventListener('click', () => {
      clearDialog.close();
      handlers.onClear();
      input.focus();
    });

    closeOnBackdropClick(resultDialog);
    closeOnBackdropClick(clearDialog);

    return { renderMovies, setSpinning, showResult };
  }

  app.createUI = createUI;
})(window.MovieRoulette = window.MovieRoulette || {});
