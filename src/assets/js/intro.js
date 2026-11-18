// Entrada de la portada (solo la primera visita de la sesión; ?intro=on la repite, ?intro=off la salta).
// 1. Una red neuronal se dibuja capa a capa y una señal la recorre.
// 2. El nombre se traza con glifos de una sola línea, como un plóter.
// 3. Una caja de detección, al estilo de RoadSignAI, encuadra el nombre con su etiqueta y confianza.
// 4. La pantalla se deshace en píxeles desde el nombre hacia fuera y deja ver la portada, que empieza su entrada.
// El <head> decide si hay intro (clase .intro-on) y tapa la página hasta que este módulo toma el control.
// Los tiempos de abajo están escritos para una entrada de ≈4,3 s; K la acelera para que todo aparezca en ≈1,3 s
// y HOLD lo deja quieto en pantalla para leerlo antes de la salida.

const root = document.documentElement;
const SVG = "http://www.w3.org/2000/svg";
const BG = "#0c0a09";
const ACCENT = "#ff7a2f";
const K = 0.3;
const HOLD = 3000;
const at = (delay, duration) => ({ delay: delay * K, duration: duration * K });

const T = {
  es: {
    skip: "Saltar intro",
    cmd: "~/gonzalo-colina $ ./presentacion --es",
    place: "VALLADOLID · PALENCIA — 2026",
    tag: "desarrollador_software 0.99",
    sub: "fullstack · inteligencia artificial",
    log: [
      ["cargando experiencia", "ok"],
      ["compilando 5 proyectos", "ok"],
      ["entrenando red neuronal", "ok"],
      ["ejecutando inferencia", "ok"],
      ["candidato detectado", "0.99"],
    ],
  },
  en: {
    skip: "Skip intro",
    cmd: "~/gonzalo-colina $ ./introduction --en",
    place: "VALLADOLID · PALENCIA — 2026",
    tag: "software_developer 0.99",
    sub: "full-stack · artificial intelligence",
    log: [
      ["loading experience", "ok"],
      ["compiling 5 projects", "ok"],
      ["training neural network", "ok"],
      ["running inference", "ok"],
      ["candidate detected", "0.99"],
    ],
  },
}[root.lang] || null;

// Glifos de trazo único en una rejilla de 60 de alto (línea base y=60, altura de x y=24): [avance, trazo].
const GLYPHS = {
  G: [40, "M35 10.7A19 30 0 1 0 35 49.3V33H22"],
  C: [38, "M35 10.7A19 30 0 1 0 35 49.3"],
  o: [30, "M15 24A14 18 0 1 0 15 60A14 18 0 1 0 15 24"],
  n: [28, "M1 24V60M1 38C3 28 9 24 15 24S27 28 27 38V60"],
  z: [27, "M2 24H25L2 60H26"],
  a: [29, "M27 42A13 18 0 0 0 1 42A13 18 0 0 0 27 42M27 24V60"],
  l: [6, "M3 0V60"],
  i: [6, "M3 24V60M3 8V9"],
  B: [38, "M3 0V60H20C30 60 36 54 36 45C36 36 30 29 20 29H3M20 29C28 29 33 23 33 14.5C33 6 28 0 20 0H3"],
  c: [26, "M22.4 28.2A13 18 0 1 0 22.4 55.8"],
  e: [29, "M1 42H27A13 18 0 1 0 22.4 55.8"],
  s: [26, "M23 28.5C20.5 25.5 17 24 13 24C7 24 3 27 3 32.5C3 38.5 10 40 14 42C19 44 24 46 24 52C24 57 20 60 13.5 60C8.5 60 4.5 58 2 55"],
  á: [29, "M27 42A13 18 0 0 0 1 42A13 18 0 0 0 27 42M27 24V60M12 16L19 6"],

  " ": [22, ""],
};
const NAME = "Gonzalo Colina Báscones";
const SPACING = 9;

const el = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(SVG, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  parent?.append(n);
  return n;
};
const draw = (path, delay, duration, easing = "ease-in-out") => {
  const len = path.getTotalLength();
  path.style.strokeDasharray = `${len} ${len}`;
  path.style.strokeDashoffset = len;
  return path.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { ...at(delay, duration), easing, fill: "forwards" });
};

if (T && root.classList.contains("intro-on")) {
  clearTimeout(window.__introFailsafe);
  run();
}

function run() {
  const W = innerWidth;
  const H = innerHeight;
  const small = W < 640;
  const timers = [];
  const anims = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms * K));
  const page = [...document.querySelectorAll("body > :not(script)")];
  page.forEach((n) => (n.inert = true));
  scrollTo(0, 0);

  // ------------------------------------------------------------ estructura
  const intro = document.createElement("div");
  intro.className = "intro";
  intro.setAttribute("aria-hidden", "true");
  intro.innerHTML = `
    <p class="intro__corner intro__corner--tl">${T.cmd}</p>
    <p class="intro__corner intro__corner--tr">${T.place}</p>
    <ol class="intro__log"></ol>
    <div class="intro__progress"><i></i><span>000</span></div>
    <p class="intro__sub"></p>`;
  const svg = el("svg", { class: "intro__svg", viewBox: `0 0 ${W} ${H}`, width: W, height: H });
  intro.prepend(svg);
  const skip = document.createElement("button");
  skip.type = "button";
  skip.className = "intro__skip";
  skip.innerHTML = `${T.skip} <span aria-hidden="true">↗</span>`;
  document.body.append(intro, skip);
  root.classList.add("intro-built");

  // ------------------------------------------------------------ red neuronal
  const net = el("g", { class: "intro__net" }, svg);
  const layersX = small ? [0.1, 0.5, 0.9] : [0.07, 0.27, 0.5, 0.73, 0.93];
  const counts = small ? [4, 6, 3] : [4, 6, 7, 6, 3];
  const layers = layersX.map((fx, li) => {
    const n = counts[li];
    const top = H * 0.16;
    const span = H * 0.68;
    return Array.from({ length: n }, (_, i) => ({ x: W * fx, y: top + (span * (i + 0.5)) / n }));
  });
  const edges = el("g", { class: "intro__edges" }, net);
  layers.forEach((layer, li) => {
    if (li === layers.length - 1) return;
    for (const a of layer)
      for (const b of layers[li + 1]) {
        const p = el("path", { d: `M${a.x} ${a.y}L${b.x} ${b.y}` }, edges);
        anims.push(draw(p, 80 + li * 170 + Math.random() * 120, 520));
      }
  });
  // la señal: un camino por capas que se ilumina en naranja
  const route = layers.map((layer, li) => layer[Math.min(layer.length - 1, Math.floor(layer.length / 2) - (li % 2))]);
  const signal = el("g", { class: "intro__signal" }, net);
  route.forEach((a, i) => {
    if (i === route.length - 1) return;
    const b = route[i + 1];
    anims.push(draw(el("path", { d: `M${a.x} ${a.y}L${b.x} ${b.y}` }, signal), 900 + i * 180, 220, "linear"));
  });
  const nodes = el("g", { class: "intro__nodes" }, net);
  layers.forEach((layer, li) =>
    layer.forEach((n) => {
      const on = route[li] === n;
      const c = el("circle", { cx: n.x, cy: n.y, r: on ? 5 : 3.5, class: on ? "is-on" : "" }, nodes);
      anims.push(
        c.animate([{ opacity: 0, transform: "scale(0)" }, { opacity: 1, transform: "scale(1)" }], {
          ...at(60 + li * 170, 420),
          easing: "cubic-bezier(.2,1.4,.4,1)",
          fill: "both",
        }),
      );
      c.style.transformOrigin = `${n.x}px ${n.y}px`;
      if (on)
        anims.push(
          c.animate([{ fill: "#1d1a17" }, { fill: ACCENT }], { ...at(900 + li * 180, 160), fill: "forwards" }),
        );
    }),
  );

  // ------------------------------------------------------------ nombre trazado
  const units = [...NAME].reduce((s, ch) => s + GLYPHS[ch][0] + SPACING, -SPACING);
  const scale = Math.min((W * (small ? 0.86 : 0.7)) / units, (H * 0.22) / 60);
  const nameW = units * scale;
  const nameH = 60 * scale;
  const nx = (W - nameW) / 2;
  const ny = H * 0.47 - nameH / 2;
  // placa oscura para que la red no compita con el nombre
  el("rect", { x: nx - 40 * scale, y: ny - 24 * scale, width: nameW + 80 * scale, height: nameH + 48 * scale, class: "intro__plate" }, svg);
  const name = el("g", { class: "intro__name", transform: `translate(${nx} ${ny}) scale(${scale})`, "stroke-width": (small ? 2 : 2.6) / scale }, svg);
  let x = 0;
  const strokes = [...NAME].filter((c) => c !== " ").length;
  let k = 0;
  for (const ch of NAME) {
    const [adv, d] = GLYPHS[ch];
    if (d) {
      const p = el("path", { d, transform: `translate(${x} 0)` }, name);
      anims.push(draw(p, 950 + (k * 1500) / strokes, 520));
      k++;
    }
    x += adv + SPACING;
  }

  // ------------------------------------------------------------ detección
  const pad = 14 * Math.max(scale, 1);
  const bx = nx - pad;
  const by = ny - pad;
  const bw = nameW + pad * 2;
  const bh = nameH + pad * 2;
  const det = el("g", { class: "intro__det" }, svg);
  const scan = el("line", { x1: bx, y1: by - 10, x2: bx, y2: by + bh + 10, class: "intro__scan" }, det);
  anims.push(
    scan.animate(
      [
        { transform: "translateX(0)", opacity: 0 },
        { opacity: 1, offset: 0.1 },
        { opacity: 1, offset: 0.9 },
        { transform: `translateX(${bw}px)`, opacity: 0 },
      ],
      { ...at(2350, 650), easing: "cubic-bezier(.6,0,.4,1)", fill: "both" },
    ),
  );
  const box = el("rect", { x: bx, y: by, width: bw, height: bh, class: "intro__box" }, det);
  anims.push(draw(box, 2900, 420, "cubic-bezier(.7,0,.3,1)"));
  const tick = 16;
  const corners = el("g", { class: "intro__ticks" }, det);
  for (const [cx, cy, sx, sy] of [
    [bx, by, 1, 1],
    [bx + bw, by, -1, 1],
    [bx, by + bh, 1, -1],
    [bx + bw, by + bh, -1, -1],
  ])
    el("path", { d: `M${cx} ${cy + sy * tick}V${cy}H${cx + sx * tick}` }, corners);
  anims.push(
    corners.animate([{ opacity: 0, transform: "scale(1.06)" }, { opacity: 1, transform: "scale(1)" }], {
      ...at(3150, 260),
      fill: "both",
    }),
  );
  corners.style.transformOrigin = `${bx + bw / 2}px ${by + bh / 2}px`;
  const tagH = small ? 20 : 24;
  const tagG = el("g", { class: "intro__tag" }, det);
  const tagText = el("text", { x: bx + 8, y: by - tagH / 2 + 1, "dominant-baseline": "middle" }, tagG);
  tagText.textContent = T.tag;
  const tagRect = el("rect", { x: bx - 1, y: by - tagH, width: tagText.getComputedTextLength() + 16, height: tagH });
  tagG.insertBefore(tagRect, tagText);
  tagRect.style.transformOrigin = `${bx}px ${by}px`;
  anims.push(
    tagRect.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], {
      ...at(3250, 360),
      easing: "cubic-bezier(.7,0,.3,1)",
      fill: "both",
    }),
    tagText.animate([{ opacity: 0 }, { opacity: 1 }], { ...at(3500, 200), fill: "both" }),
  );
  const sub = intro.querySelector(".intro__sub");
  sub.style.top = `${by + bh + 22}px`;
  later(() => type(sub, T.sub, 14 * K), 3450);

  // ------------------------------------------------------------ registro y progreso
  const log = intro.querySelector(".intro__log");
  T.log.forEach(([label, res], i) =>
    later(() => {
      const li = document.createElement("li");
      li.innerHTML = `<span>›</span> ${label} <b></b>`;
      log.append(li);
      later(() => (li.querySelector("b").textContent = res), 260);
    }, 250 + i * 720),
  );
  const DUR = 4300; // entrada sin acelerar
  const TOTAL = DUR * K + HOLD; // la barra de progreso cubre también la pausa
  const bar = intro.querySelector(".intro__progress i");
  const pct = intro.querySelector(".intro__progress span");
  const t0 = performance.now();
  let raf = 0;
  let shown = "000";
  const progress = (t) => {
    const p = Math.min((t - t0) / TOTAL, 1);
    const e = 1 - Math.pow(1 - p, 2);
    bar.style.transform = `scaleX(${e})`;
    // el número solo se reescribe cuando cambia (cada cambio de texto vuelve a maquetar)
    const n = String(Math.round(e * 100)).padStart(3, "0");
    if (n !== shown) pct.textContent = shown = n;
    if (p < 1) raf = requestAnimationFrame(progress);
  };
  raf = requestAnimationFrame(progress);

  // ------------------------------------------------------------ salida
  let leaving = false;
  const finish = () => {
    if (leaving) return;
    leaving = true;
    timers.forEach(clearTimeout);
    cancelAnimationFrame(raf);
    removeEventListener("keydown", onKey);
    skip.remove();
    // la portada empieza su entrada mientras la intro se deshace
    page.forEach((n) => (n.inert = false));
    root.classList.remove("intro-on");
    dissolve(intro, { x: bx + bw / 2, y: by + bh / 2 }, () => {
      anims.forEach((a) => a.cancel());
      intro.remove();
      root.classList.remove("intro-built");
      document.dispatchEvent(new Event("intro:done"));
    });
  };
  const onKey = (e) => {
    if (e.key === "Escape" || e.key === "Enter") finish();
  };
  addEventListener("keydown", onKey);
  skip.addEventListener("click", finish);
  timers.push(setTimeout(finish, TOTAL + 150));
}

function type(node, text, speed) {
  let i = 0;
  const step = () => {
    node.textContent = text.slice(0, ++i);
    if (i < text.length) setTimeout(step, speed);
  };
  step();
}

// Disolución en píxeles: cada casilla se encoge con un retardo según su distancia al nombre,
// con un destello naranja en el frente de la onda.
function dissolve(intro, center, done) {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const W = innerWidth;
  const H = innerHeight;
  const c = document.createElement("canvas");
  c.className = "intro__tiles";
  c.width = W * dpr;
  c.height = H * dpr;
  const ctx = c.getContext("2d");
  ctx.scale(dpr, dpr);
  const S = W < 640 ? 28 : 44;
  const cols = Math.ceil(W / S);
  const rows = Math.ceil(H / S);
  const maxD = Math.hypot(Math.max(center.x, W - center.x), Math.max(center.y, H - center.y));
  const tiles = [];
  for (let r = 0; r < rows; r++)
    for (let q = 0; q < cols; q++) {
      const x = q * S;
      const y = r * S;
      const d = Math.hypot(x + S / 2 - center.x, (y + S / 2 - center.y) * 1.25) / maxD;
      tiles.push({ x, y, delay: d * 620 + Math.random() * 140 });
    }
  const LIFE = 360;
  // Mismo orden de dibujo que siempre; solo se evita reasignar el color cuando no cambia
  // (cada asignación obliga al lienzo a interpretar el color de nuevo).
  const paint = (t) => {
    ctx.clearRect(0, 0, W, H);
    let alive = false;
    let fill = null;
    const use = (c) => {
      if (c !== fill) ctx.fillStyle = fill = c;
    };
    for (const tile of tiles) {
      const p = (t - tile.delay) / LIFE;
      if (p >= 1) continue;
      alive = true;
      if (p <= 0) {
        use(BG);
        ctx.fillRect(tile.x, tile.y, S + 0.5, S + 0.5);
        continue;
      }
      const e = p * p;
      const s = S * (1 - e);
      const o = (S - s) / 2;
      use(BG);
      ctx.fillRect(tile.x + o, tile.y + o, s, s);
      const glow = Math.sin(Math.PI * Math.min(p * 1.6, 1));
      if (glow > 0.02) {
        ctx.globalAlpha = glow * 0.85;
        use(ACCENT);
        ctx.fillRect(tile.x + o, tile.y + o, s, s);
        ctx.globalAlpha = 1;
      }
    }
    return alive;
  };
  paint(0);
  intro.append(c);
  intro.classList.add("is-leaving");
  const t0 = performance.now();
  const frame = (now) => {
    if (paint(now - t0)) requestAnimationFrame(frame);
    else done();
  };
  requestAnimationFrame(frame);
}

