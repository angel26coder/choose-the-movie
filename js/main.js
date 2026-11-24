/* Punto de entrada: conecta la lista, el guardado, la búsqueda, la ruleta y la interfaz. */
(function (app) {
  'use strict';

  const movies = app.createMovieList(app.storage.load());

  const wheel = app.createWheel({
    container: document.getElementById('wheel'),
    rotor: document.getElementById('wheelRotor'),
    frame: document.getElementById('wheelFrame'),
  });

  const ui = app.createUI({
    onAdd(entry) {
      const result = movies.add(entry);
      if (result.ok) refresh();
      return result;
    },
    onRemove(title) {
      movies.remove(title);
      refresh();
    },
    onClear() {
      movies.clear();
      refresh();
    },
    onSpin: spin,
    search: app.tmdb.searchMovies,
    searchAvailable: app.tmdb.isAvailable,
  });

  function refresh() {
    app.storage.save(movies.items);
    wheel.render(movies.items.map((movie) => movie.title));
    ui.renderMovies(movies.items);
  }

  async function spin() {
    if (wheel.isSpinning || movies.items.length === 0) return;

    ui.setSpinning(true, true);
    const winnerIndex = await wheel.spin();
    ui.setSpinning(false, true);
    ui.showResult(movies.items[winnerIndex]);
  }

  refresh();
})(window.MovieRoulette = window.MovieRoulette || {});
