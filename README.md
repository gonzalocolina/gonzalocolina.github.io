# gonzalocolina.github.io

Web personal de Gonzalo Colina, en español (`/`) e inglés (`/en/`). Se publicará en https://gonzalocolina.github.io.

HTML, CSS y JavaScript propios, sin framework ni dependencias de npm. `build.mjs` (Node 24) monta las páginas a partir de
`src/` y deja el resultado en `_site/`, que GitHub Actions publica en Pages. El plan y las decisiones están en [PLAN.md](PLAN.md).

## Uso

```bash
node build.mjs --serve      # http://127.0.0.1:4000, se recompila y recarga al guardar
node build.mjs              # compila en _site/ y muestra avisos
node build.mjs --strict     # igual, pero los avisos (TODO, presupuesto de peso) hacen fallar el build; es lo que ejecuta CI
```

El build comprueba que cada página exista en los dos idiomas, que no haya enlaces internos ni anclas rotas, que las imágenes
tengan `alt` y tamaño, que no haya `id` repetidos y que la portada no supere 200 KB transferidos (15 KB de JS).

## Estructura

```
src/
├── site.mjs                 datos del sitio y textos comunes en ES/EN (menú, pie, botones)
├── layout.mjs               plantilla: <head>, metadatos, hreflang, Open Graph, cabecera y pie
├── pages/es/…, pages/en/…   una página por archivo: front matter JSON + HTML
├── partials/                piezas de ajedrez (SVG) y gráficos generados
├── static/                  archivos que van a la raíz (favicon.ico)
└── assets/                  css, js, fuentes, imágenes, og, motor wasm y librerías (se copian tal cual)
tools/
├── charts.py                genera los gráficos SVG a partir de los datos medidos
├── og.py                    genera las imágenes Open Graph y el icono de iOS (requiere Pillow)
├── fonts/                   IBM Plex (OFL) y subset.sh para regenerar los WOFF2
└── engine/                  build.sh: compila Optiline a WebAssembly para /jugar/
```

### Atajos dentro de las páginas

| Escribes | Sale |
| --- | --- |
| `href="@optiline"` / `href="@home#proyectos"` | el enlace a esa página en el mismo idioma |
| `{{img nombre \| texto alternativo \| sizes=… \| eager \| class=…}}` | `<img>` WebP con `srcset`, `width` y `height` |
| `{{video nombre \| pie}}` | la figura con el vídeo si existe `src/assets/video/nombre.mp4`; si no, nada |
| `{{> nombre}}` | el contenido de `src/partials/nombre.svg` o `.html` |
| `{{data nombre}}` | `src/data/nombre.json` como `<script type="application/json">` |
| `{{hash /assets/…}}` | el hash del archivo, para versionar URLs |
| `{{TODO: texto}}` | un marcador amarillo visible; bloquea la publicación |

## Tareas habituales

- **Cambiar un texto:** edita la página en `src/pages/es/` y su pareja en `src/pages/en/`.
- **Añadir el vídeo de RoadSignAI:** deja `roadsignai.mp4` (y, si quieres, `roadsignai.webm` y un póster `roadsignai.webp`) en
  `src/assets/video/`. Aparecerá solo en el caso de estudio.
- **Nuevas imágenes:** WebP en `src/assets/img/` como `nombre-640.webp` y `nombre-1280.webp` (o un único `nombre.webp`).
- **Gráficos:** cambia los datos en `tools/charts.py` y ejecuta `python3 tools/charts.py`.
- **Imágenes para compartir:** `python3 tools/og.py` tras cambiar títulos o descripciones.
- **Motor de /jugar/:** `tools/engine/build.sh [ruta a Optiline] [commit]` (necesita `~/emsdk`). Deja `nsce.js`, `nsce.wasm` y
  `VERSION` en `src/assets/engine/`.

## Créditos

Tipografía IBM Plex (OFL 1.1). Piezas de ajedrez *cburnett*, de Colin M. L. Burnett (GPLv2+). chess.js (BSD-2).
`src/assets/engine/` contiene un build de [Optiline](https://github.com/gonzalocolina/Optiline) (GPL-3.0).
