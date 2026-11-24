/*
 * Configuración de la búsqueda de películas (TMDB).
 *
 * La clave de TMDB nunca se escribe en este archivo, porque se sube a GitHub:
 * - Publicada (por ejemplo en Vercel), la app busca a través de la función
 *   api/search.js, que lee la clave de una variable secreta del servidor.
 * - Abierta con doble clic desde la computadora, la clave va en
 *   js/config.local.js, que git no sube (ver README).
 */
(function (app) {
  'use strict';

  app.config = {
    tmdbApiKey: '',
    searchProxyUrl: '/api/search',
    tmdbLanguage: 'es-MX',
  };

  /* Con doble clic no hay servidor: se carga la clave local si existe. */
  if (window.location.protocol === 'file:') {
    const script = document.createElement('script');
    script.src = 'js/config.local.js';
    document.head.append(script);
  }
})(window.MovieRoulette = window.MovieRoulette || {});
