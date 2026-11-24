/* Guarda y recupera la lista de películas en localStorage. movies.js valida cada elemento. */
(function (app) {
  'use strict';

  const STORAGE_KEY = 'movie-roulette.movies';

  function load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function save(movies) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(movies));
    } catch {
      // Sin acceso al almacenamiento la app sigue funcionando durante la sesión.
    }
  }

  app.storage = { load, save };
})(window.MovieRoulette = window.MovieRoulette || {});
