/*
 * Búsqueda de películas y pósters en The Movie Database (TMDB).
 *
 * - Con clave local (js/config.local.js) consulta TMDB directamente.
 * - Sin clave pero servida por un servidor (Vercel), usa el proxy api/search.js,
 *   que agrega la clave del lado del servidor.
 */
(function (app) {
  'use strict';

  const SEARCH_URL = 'https://api.themoviedb.org/3/search/movie';
  const IMAGE_URL = 'https://image.tmdb.org/t/p/';
  const MAX_RESULTS = 7;

  function apiKey() {
    return String((app.config && app.config.tmdbApiKey) || '').trim();
  }

  function usesProxy() {
    return !apiKey()
      && /^https?:$/.test(window.location.protocol)
      && Boolean(app.config && app.config.searchProxyUrl);
  }

  function isAvailable() {
    return apiKey() !== '' || usesProxy();
  }

  function toMovie(result) {
    return {
      title: String(result.title || result.original_title || '').trim(),
      year: /^\d{4}/.test(result.release_date || '') ? result.release_date.slice(0, 4) : '',
      poster: result.poster_path || '',
      tmdbId: result.id,
    };
  }

  /* Acepta la "API Key" (v3) o el "API Read Access Token" (empieza con eyJ). */
  function directRequest(key, params) {
    params.set('include_adult', 'false');
    params.set('page', '1');
    const headers = { Accept: 'application/json' };
    if (key.startsWith('eyJ')) {
      headers.Authorization = `Bearer ${key}`;
    } else {
      params.set('api_key', key);
    }
    return { url: `${SEARCH_URL}?${params}`, headers };
  }

  async function searchMovies(query, signal) {
    const key = apiKey();
    const params = new URLSearchParams({ query, language: app.config.tmdbLanguage || 'es-MX' });

    let request;
    if (key) {
      request = directRequest(key, params);
    } else if (usesProxy()) {
      request = { url: `${app.config.searchProxyUrl}?${params}`, headers: { Accept: 'application/json' } };
    } else {
      throw new Error('auth');
    }

    const response = await fetch(request.url, { headers: request.headers, signal });
    /* 401: clave inválida (directo). 503: el proxy no tiene una clave válida. */
    if (response.status === 401 || response.status === 503) throw new Error('auth');
    if (!response.ok) throw new Error('http');

    const data = await response.json();
    return (data.results || [])
      .map(toMovie)
      .filter((movie) => movie.title)
      .slice(0, MAX_RESULTS);
  }

  /* Tamaños disponibles en TMDB: w92, w154, w185, w342, w500, w780. */
  function posterUrl(path, size) {
    return path ? `${IMAGE_URL}${size}${path}` : '';
  }

  app.tmdb = { isAvailable, searchMovies, posterUrl };
})(window.MovieRoulette = window.MovieRoulette || {});
