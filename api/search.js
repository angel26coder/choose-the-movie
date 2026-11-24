/*
 * Función de servidor (Vercel) que busca películas en TMDB sin exponer la clave.
 *
 * El navegador llama a /api/search?query=...; esta función agrega la clave,
 * guardada en la variable de entorno secreta TMDB_API_KEY, y devuelve solo
 * los datos que usa la app. La clave nunca llega al navegador.
 */
const TMDB_SEARCH_URL = 'https://api.themoviedb.org/3/search/movie';
const MAX_RESULTS = 10;
const MAX_QUERY_LENGTH = 100;

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return send(res, 405, { error: 'method_not_allowed' });
  }

  const url = new URL(req.url, 'http://localhost');
  const query = (url.searchParams.get('query') || '').trim().slice(0, MAX_QUERY_LENGTH);
  const requestedLanguage = url.searchParams.get('language') || '';
  const language = /^[a-z]{2}-[A-Z]{2}$/.test(requestedLanguage) ? requestedLanguage : 'es-MX';

  if (query.length < 2) return send(res, 400, { error: 'query_too_short' });

  const key = (process.env.TMDB_API_KEY || '').trim();
  if (!key) return send(res, 503, { error: 'missing_api_key' });

  const params = new URLSearchParams({ query, language, include_adult: 'false', page: '1' });
  const headers = { Accept: 'application/json' };
  if (key.startsWith('eyJ')) {
    headers.Authorization = `Bearer ${key}`;
  } else {
    params.set('api_key', key);
  }

  try {
    const response = await fetch(`${TMDB_SEARCH_URL}?${params}`, { headers });
    if (response.status === 401) return send(res, 503, { error: 'invalid_api_key' });
    if (!response.ok) return send(res, 502, { error: 'tmdb_error' });

    const data = await response.json();
    const results = (data.results || []).slice(0, MAX_RESULTS).map((movie) => ({
      id: movie.id,
      title: movie.title,
      original_title: movie.original_title,
      release_date: movie.release_date,
      poster_path: movie.poster_path,
    }));

    /* La CDN de Vercel guarda cada búsqueda un día: menos consultas a TMDB. */
    res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
    return send(res, 200, { results });
  } catch {
    return send(res, 502, { error: 'tmdb_unreachable' });
  }
};
