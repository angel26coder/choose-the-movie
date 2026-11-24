/*
 * Reglas de la lista de películas: sin vacíos ni duplicados.
 * Cada película es { title, year?, poster?, tmdbId? }; las que se escriben
 * a mano solo tienen title.
 */
(function (app) {
  'use strict';

  const POSTER_PATH = /^\/[\w.-]+$/;

  function cleanTitle(raw) {
    return raw.trim().replace(/\s+/g, ' ');
  }

  /* "Amélie", "amelie" y "AMELIE  " cuentan como la misma película. */
  function comparisonKey(title) {
    return cleanTitle(title)
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase();
  }

  /* Acepta texto (lo que escribe el usuario o datos guardados por versiones anteriores) u objetos. */
  function toEntry(value) {
    if (typeof value === 'string') return { title: cleanTitle(value) };
    if (!value || typeof value !== 'object' || typeof value.title !== 'string') return null;

    const entry = { title: cleanTitle(value.title) };
    if (typeof value.year === 'string' && /^\d{4}$/.test(value.year)) entry.year = value.year;
    if (typeof value.poster === 'string' && POSTER_PATH.test(value.poster)) entry.poster = value.poster;
    if (Number.isInteger(value.tmdbId)) entry.tmdbId = value.tmdbId;
    return entry;
  }

  function createMovieList(initialMovies) {
    let movies = [];

    function add(value) {
      const entry = toEntry(value);
      if (!entry || !entry.title) return { ok: false, reason: 'empty' };

      const key = comparisonKey(entry.title);
      const existing = movies.find((movie) => comparisonKey(movie.title) === key
        || (entry.tmdbId !== undefined && movie.tmdbId === entry.tmdbId));

      /* Una película escrita a mano se completa con los datos de TMDB al elegirla de las sugerencias. */
      if (existing && existing.tmdbId === undefined && entry.tmdbId !== undefined) {
        movies = movies.map((movie) => (movie === existing ? entry : movie));
        return { ok: true, movie: entry, updated: true };
      }
      if (existing) return { ok: false, reason: 'duplicate', title: existing.title };

      movies = [...movies, entry];
      return { ok: true, movie: entry };
    }

    function remove(title) {
      movies = movies.filter((movie) => movie.title !== title);
    }

    function clear() {
      movies = [];
    }

    initialMovies.forEach(add);

    return {
      get items() { return movies; },
      add,
      remove,
      clear,
    };
  }

  app.comparisonKey = comparisonKey;
  app.createMovieList = createMovieList;
})(window.MovieRoulette = window.MovieRoulette || {});
