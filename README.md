# Movie Roulette

Ruleta interactiva para elegir qué película mirar. Agregás películas a una lista, girás la ruleta y te dice cuál ver.

- Autocompletado de títulos en español con póster y año, gracias a [TMDB](https://www.themoviedb.org/).
- La lista se guarda en el navegador y se recupera al volver a abrir la app.
- Diseño responsive para computadora y celular.
- HTML, CSS y JavaScript puro, sin dependencias ni compilación.

## Publicarla en Vercel

Vercel publica la app gratis y guarda la clave de TMDB en secreto: el navegador busca películas a través de la función `api/search.js`, que agrega la clave del lado del servidor. La clave nunca aparece en el código ni en la página.

1. Conseguí una clave gratuita de TMDB en <https://www.themoviedb.org/settings/api>.
2. Entrá a <https://vercel.com> con tu cuenta de GitHub e importá este repositorio (**Add New → Project**).
3. En **Framework Preset** elegí **Other** y dejá vacíos los comandos de compilación.
4. En **Environment Variables** agregá `TMDB_API_KEY` con tu clave.
5. Hacé clic en **Deploy**.

Cada vez que subas cambios a GitHub, Vercel actualiza la página sola.

## Usarla desde la computadora

Abrí `index.html` con doble clic. Para tener autocompletado así, creá el archivo `js/config.local.js` con este contenido:

```js
window.MovieRoulette.config.tmdbApiKey = 'TU_CLAVE_DE_TMDB';
```

Ese archivo está en `.gitignore`, así que tu clave nunca se sube a GitHub. Sin él, la app funciona igual pero sin sugerencias.

## Estructura

| Archivo | Responsabilidad |
| --- | --- |
| `index.html` | Estructura de la página y ventanas emergentes |
| `css/styles.css` | Estilos, tema y diseño responsive |
| `api/search.js` | Función de servidor (Vercel): busca en TMDB con la clave secreta |
| `js/config.js` | Configuración de la búsqueda (sin clave) |
| `js/storage.js` | Lectura y escritura en `localStorage` |
| `js/movies.js` | Reglas de la lista: sin vacíos ni duplicados |
| `js/tmdb.js` | Búsqueda de películas (directa o por la función) y pósters |
| `js/wheel.js` | Dibujo de la ruleta (SVG) y animación del giro |
| `js/autocomplete.js` | Desplegable de sugerencias (mouse, toque y teclado) |
| `js/ui.js` | Formulario, lista y ventanas emergentes |
| `js/main.js` | Punto de entrada: conecta todo lo anterior |

Los scripts son clásicos (no módulos ES) porque los navegadores bloquean los módulos al abrir un archivo con doble clic.

## Cómo se decide el resultado

`wheel.js` sortea el sector ganador y calcula el ángulo final para que el indicador caiga dentro de ese sector, lejos de los bordes. Al terminar el giro lee el ángulo real de la ruleta en pantalla y obtiene de ahí la película que se muestra, así que el resultado siempre es lo que señala el indicador.

## Créditos

Búsqueda e imágenes de [TMDB](https://www.themoviedb.org/). Esta app usa la API de TMDB pero no está avalada ni certificada por TMDB.
