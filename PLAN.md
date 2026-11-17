# Plan: web personal de Gonzalo Colina

**Idea central: la web es la demo.** No describe lo que sé hacer, lo enseña funcionando.
Se puede jugar contra Optiline o una partida de Aquilae, ver a RoadSignAI detectando señales, y cada cifra
enlaza a la prueba que la respalda.

**Concepto visual: "medido, no prometido".** Optiline promociona sus redes con SPRT y guarda cada
experimento con su manifiesto. El TFG publica sus pruebas de carga. La web traslada esa forma de trabajar
al diseño: sobria, precisa, con cifras en fuente monoespaciada que enlazan a la prueba, y con los detalles cuidados.

## Estado (2026-11-17)

**Rediseño (2026-11-17).** La portada presenta a Gonzalo como desarrollador: titular y ficha de resumen, experiencia en
Xeridia, cinco proyectos al mismo nivel (el TFG destacado), formación, habilidades y contacto. El ajedrez ya no ocupa la
portada: Optiline es un proyecto más y `/jugar/` se enlaza desde su caso de estudio. Nueva paleta (neutros fríos y acento
índigo), botones redondeados, menos tipografía monoespaciada, portadas dibujadas para RoadSignAI y Optiline, y nuevos
favicon e imágenes Open Graph. Los datos personales salen del CV en PDF (Xeridia, fechas, inglés B2); se retiró lo que no
estaba confirmado (AZ-900, "disponible para prácticas").

**Pública de nuevo** desde el 2026-11-17: Pages solo funciona con repos públicos en el plan gratuito.
Publicada en https://gonzalocolina.github.io; el workflow la vuelve a publicar con cada push a `main`
(`node build.mjs --strict --publish`).

**Opcional:**
- Vídeo de RoadSignAI (`src/assets/video/roadsignai.mp4`).
- PDF del CV (la página `/cv/` ya se imprime bien como PDF).
- Llevar el build wasm al repo Optiline (`tools/engine/sync-search.patch` + `web_main.cpp`) y publicarlo con cada release.
- Enlazar la web en los CV, en LinkedIn y en el README del perfil de GitHub.

## Decisiones tomadas (2026-11-16)

| Tema | Decisión |
| --- | --- |
| RoadSignAI | Repo privado por ahora: vídeo en la web y "código disponible bajo petición". Sin demo en el navegador |
| Tecnología | Sin Astro ni framework. HTML, CSS y JS propios, con un script de build sin dependencias (sección 3) |
| Navegador para pruebas | El Chromium del sistema (`/usr/bin/chromium`); ningún proyecto descarga el suyo |
| Idiomas | Español e inglés desde el lanzamiento, con un botón ES/EN en la cabecera |
| AQUILAE | Desarrollo: Gonzalo. Diseño didáctico, preguntas y validación en el aula: Juan Pérez González (PID PhilHum-Games+). Se cita igual que en el README |
| Visibilidad | Repo público desde el lanzamiento (16/11/2026) |

---

## 1. Lo que hacen bien las mejores webs personales

| Web | Qué tiene | Qué se aprovecha |
| --- | --- | --- |
| brittanychiang.com | Dos columnas: nombre y navegación fijos a la izquierda, experiencia y proyectos a la derecha | La jerarquía y la claridad. **No copiar el diseño**: es la plantilla más clonada |
| karpathy.ai | Una página, "0 frameworks", mucha sustancia | El contenido manda |
| rauno.me, emilkowal.ski | Muy pocos elementos y mucho cuidado en tipografía, espaciado y microinteracciones | Lo bonito sale de los detalles |
| bruno-simon.com | Un mundo 3D en el que conduces un coche | Funciona porque su trabajo es justo eso, WebGL. Aquí lo equivalente es jugar contra Optiline |
| joshwcomeau.com, jalammar.github.io | Explicaciones técnicas interactivas | Mostrar cómo piensa Optiline en directo |
| eugeneyan.com | Textos como informes técnicos | Casos de estudio con problema, enfoque, resultados y límites |

**Lo que no tiene ninguna:** barras de habilidad, muros de logos, intros que no se pueden saltar
ni frases como "apasionado por la tecnología".

## 2. Diferenciarse

`villarrubi.github.io/personalWebsite` es de un perfil de Palencia que también tiene proyectos de ajedrez
y que incluye AQUILAE. Seguramente le lean los mismos reclutadores. Por eso no lleva escena 3D ni estética espacial:
la identidad aquí es de ingeniería medible. AQUILAE se acredita como en su README (ver Decisiones tomadas).
Conviene revisar que la ficha de Alejandro no lo contradiga.

## 3. Tecnología (sin framework)

Lo que recibe el visitante es lo mismo que con Astro: HTML estático, poco JS. No usar Astro no hace la web
más rápida, pero evita dependencias que mantener al día. Para no copiar a mano cabecera, pie y `<head>` en las
más de 14 páginas (2 idiomas × 7), habrá un script propio sin dependencias:

```
src/
├── layout.mjs               plantilla: <head>, cabecera (con botón ES/EN), pie
├── i18n.mjs                 textos compartidos (menú, botones, pie) en ES y EN
├── pages/
│   ├── es/index.html         contenido de cada página como fragmento HTML,
│   ├── es/proyectos/*.html   con una cabecera JSON (título, descripción,
│   ├── en/index.html         id de la página equivalente en el otro idioma)
│   └── en/projects/*.html
└── assets/                  css, js, img, video, fonts, cv (se copian tal cual)
build.mjs                    ~200 líneas, Node 24, sin npm install
_site/                       salida (no se versiona)
```

- `node build.mjs` genera `_site/`, y `node build.mjs --serve` lo sirve en local con recarga.
- **Publicación:** GitHub Actions con `actions/upload-pages-artifact` y `actions/deploy-pages`.
  No hay `npm install`, solo `node build.mjs`.
- **Comprobaciones del build:** que cada página tenga su equivalente en el otro idioma, que los enlaces
  internos existan, que todas las imágenes tengan `alt` y que se cumpla el presupuesto de peso.
- **Fuentes:** IBM Plex Sans (variable, 400–600) e IBM Plex Mono, recortadas con `tools/fonts/subset.sh` para incluir las flechas.
- **Analítica:** GoatCounter o ninguna. Sin cookies.

## 4. Idiomas

- Español en `/` e inglés en `/en/`, con las rutas traducidas (`/proyectos/optiline/` ↔ `/en/projects/optiline/`).
- **Botón ES/EN en la cabecera:** lleva a la misma página en el otro idioma, no a la portada.
- `<html lang>`, `<link rel="alternate" hreflang>` en las dos versiones y `x-default` apuntando a español.
- No se redirige según el idioma del navegador (complica la indexación y molesta). El idioma elegido se guarda
  en `localStorage` solo para la portada: si alguien eligió EN, al volver a `/` ve un aviso discreto "English version →".
- CV en PDF en los dos idiomas (IA y Backend). Hay que preparar las versiones en inglés.

## 5. Mapa del sitio

| ES | EN |
| --- | --- |
| `/` | `/en/` |
| `/proyectos/optiline/` | `/en/projects/optiline/` |
| `/proyectos/roadsignai/` | `/en/projects/roadsignai/` |
| `/proyectos/tfg-marvel-champions/` | `/en/projects/marvel-champions/` |
| `/proyectos/aquilae/` | `/en/projects/aquilae/` |
| `/proyectos/pasos-de-maria/` | `/en/projects/pasos-de-maria/` |
| `/jugar/` | `/en/play/` |
| `/cv/` | `/en/cv/` |
| `/404.html` (bilingüe) | |

**Cuidado:** Aquilae ya se publica en `gonzalocolina.github.io/Aquilae/` como sitio de proyecto.
El sitio de usuario no puede tener ninguna ruta `/Aquilae/`, o la tapará.

## 6. Portada

1. **Cabecera.** Nombre, una frase ("Construyo sistemas de IA y backend que se pueden medir"),
   "Valladolid / Palencia · Ingeniero informático (UVa) · Máster en IA (UNIR) · Disponible para prácticas".
   Botones: CV, GitHub, LinkedIn y correo con copia.
   **Elemento visual:** un tablero SVG que reproduce una partida de Optiline (menos de 10 KB) con el botón "Juega contra él".
2. **Destacados (grandes):**

   | Proyecto | Medio | Cifras con su prueba |
   | --- | --- | --- |
   | Optiline | Tablero que reproduce una partida o enlace a `/jugar/` | ~3100 ± 35 Elo (SF18 UCI_Elo, 100 ms) → informe del experimento · ~1 M posiciones/s en un hilo · más de 80 experimentos |
   | RoadSignAI | Vídeo de la detección | 73 FPS · mAP50 0,626 (con el método de medida explicado) |
   | TFG Marvel Champions | Capturas del escritorio y del móvil | 9,7/10 · 100 clientes a la vez, 0 errores, propagación p95 de 12 ms → arnés de carga |

3. **Más proyectos (tarjetas):**

   | Proyecto | Medio | Lo que se destaca | Enlace principal |
   | --- | --- | --- | --- |
   | Aquilae | Captura del mapa | Probado en 3 centros (ESO y Bachillerato) dentro de PhilHum-Games+ | **Jugar online** (`/Aquilae/`) |
   | Pasos de María | Capturas del móvil | 3.er premio OnAppExperience, Google Play, 4 idiomas | Google Play |

4. **Trayectoria.** Xeridia (cargo correcto), Grado en Ingeniería Informática (UVa, mención en Ingeniería de Software),
   Máster en IA (UNIR, en curso), AZ-900, idiomas y premios.
5. **Contacto.** El mismo correo que en el perfil de GitHub, LinkedIn y GitHub. Sin teléfono.

Todo coincide con el CV, LinkedIn y los READMEs de GitHub.

## 7. Casos de estudio

La misma estructura para todos:

1. **Resumen:** qué es, para qué sirve y mi papel (en los proyectos en equipo, qué hice yo).
2. **Demo:** vídeo, tablero, capturas o un enlace para jugar.
3. **Problema y restricciones.**
4. **Enfoque y arquitectura:** diagrama SVG propio que se adapta al tema claro y al oscuro.
5. **Resultados:** cifras con su método de medida y su enlace.
6. **Lo que no funcionó y lo que haría después.**
7. **Tecnologías, autoría y enlaces.**

## 8. Demos

### 8.1 Optiline jugable (`/jugar/`, en curso)

- El motor se compila a WebAssembly **en el repo Optiline**. La web solo copia `nsce.js`, `nsce.wasm` y la red
  `nsceper1_simple1024_test80.bin` (1,6 MB), junto con un `VERSION` que indica el commit de origen.
- **Contrato:** módulo `-sMODULARIZE -sENVIRONMENT=worker` de un solo hilo, en un Web Worker.
  Recibe órdenes UCI con `postMessage` y responde con las líneas de salida.
- **Pendiente en el motor:** `engine/src/nnue.cpp` usa AVX2. Hace falta una ruta escalar y otra con SIMD de wasm (`-msimd128`).
  Pages no permite COOP/COEP, así que no hay pthreads: se fija `Threads=1` y Hash de 16 MB.
- **Niveles:** se limita con `go nodes` o `movetime`, porque no hay `UCI_LimitStrength`.
- **Interfaz:** partir del tablero de `tools/play.py`. Las jugadas legales, el mate, las tablas y el PGN se calculan con chess.js
  (servido desde el repo). Panel del motor en directo: evaluación, profundidad, variante principal y nodos/s.
- **Fuerza:** "~3100 Elo medido en nativo". En wasm no se pone ningún número hasta medirlo.
- **Licencia:** GPL-3.0, con enlace al código fuente desde la página.
- **Mientras no esté listo:** la portada reproduce una partida y la tarjeta enlaza a la release.

### 8.2 RoadSignAI

- Vídeo corto (WebM/AV1 y MP4/H.264, menos de 3 MB) con póster. Se reproduce solo cuando está a la vista y sin sonido.
- El caso de estudio explica el modelo, el dataset, cómo se midió y en qué hardware salen los 73 FPS.
- "Código disponible bajo petición". No se enlaza al repo privado.

## 9. Diseño

- **Tipografía como base:** escala clara, medida de línea de 60-70 caracteres y cifras tabulares en mono.
- **Paleta:** neutros cálidos y **un** color de acento. Temas claro y oscuro con selector, y por defecto el del sistema.
- **Movimiento:** View Transitions entre páginas y aparición suave al hacer scroll, siempre respetando
  `prefers-reduced-motion`. Sin intro.
- **Detalles:** foco visible, copiar el correo con confirmación, enlaces externos marcados, estilos de impresión en
  `/cv/`, favicon SVG y `og-image` por página e idioma.
- **Proceso:** contenido, maqueta de la portada en móvil y escritorio, revisión, y después código.

## 10. Calidad (criterios de aceptación)

| Métrica | Objetivo |
| --- | --- |
| Lighthouse (las cuatro categorías) | 100 en la portada y los casos de estudio |
| LCP en móvil 4G | < 1,5 s |
| CLS | 0 |
| Peso de la portada sin vídeo | < 200 KB |
| JS en la portada | < 15 KB |
| Accesibilidad | WCAG 2.2 AA, teclado y lector de pantalla |
| Compatibilidad | Últimas 2 versiones de Chrome, Firefox y Safari, iOS y Android desde 360 px de ancho |

En CI: build con sus comprobaciones, enlaces rotos (lychee) y Lighthouse CI con presupuestos.

## 11. Repositorio

- Ahora el remoto es `gonzalocolina/GonzaloColinaWebPersonal`, **público** y vacío. Para cumplir "público al acabar":
  pasarlo a privado ya. Con el plan gratuito, Pages no publica desde repos privados, así que hasta entonces se revisa en local.
- Al terminar: renombrarlo a `gonzalocolina.github.io` (GitHub redirige el nombre antiguo), hacerlo público y activar Pages
  con origen "GitHub Actions". La URL será `https://gonzalocolina.github.io`.

## 12. Fases

| Fase | Qué incluye | Estimación |
| --- | --- | --- |
| 0. Contenido | Textos de la portada y de los 5 casos de estudio en ES y EN, vídeo de RoadSignAI, capturas (las de Aquilae, el TFG y Pasos de María ya están en sus repos) y CV en PDF en los dos idiomas | 2 días |
| 1. Diseño | Maqueta de la portada y de un caso de estudio, fuentes y paleta | 1 día |
| 2. Base | `build.mjs`, maquetación, temas, botón ES/EN, componentes, CI | 1 día |
| 3. Páginas | Portada, casos de estudio, `/cv/` y 404 en los dos idiomas, y metadatos | 2 días |
| 4. Pulido | Movimiento, detalles, auditoría de rendimiento y accesibilidad, prueba en móviles reales | 1 día |
| 5. Lanzamiento | Renombrar el repo y hacerlo público, activar Pages y enlazar la web en los CV, LinkedIn y el perfil de GitHub | 30 min |
| 6. Optiline jugable | wasm en el repo Optiline, `/jugar/` y panel del motor | en curso, aparte |
| 7. Extras | Dominio propio y una entrada técnica sobre Optiline | opcional |

Total para lanzar: **unos 7-9 días de trabajo**. Esto no debe retrasar las candidaturas: LinkedIn sigue siendo lo primero.
