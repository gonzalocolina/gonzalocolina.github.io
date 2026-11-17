// Portada: fondo de red neuronal en canvas, titular letra a letra, texto que se escribe solo,
// contadores animados e inclinación 3D de la tarjeta del resumen. Todo respeta el movimiento reducido.

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fine = matchMedia("(pointer: fine)").matches;
const root = document.documentElement;
const css = (name) => getComputedStyle(root).getPropertyValue(name).trim();

// ---------------------------------------------------------------- titular letra a letra
const title = document.querySelector(".hero__title");
if (title && !reduced) {
  title.setAttribute("aria-label", title.textContent.replace(/\s+/g, " ").trim());
  let i = 0;
  for (const line of title.querySelectorAll(".line:not(.line--grad)")) {
    const text = line.textContent;
    line.textContent = "";
    line.setAttribute("aria-hidden", "true");
    for (const ch of text) {
      const s = document.createElement("span");
      s.className = "ch";
      s.textContent = ch;
      s.style.setProperty("--i", i++);
      line.append(s);
    }
  }
  title.classList.add("is-split");
}

// ---------------------------------------------------------------- texto que se escribe solo
const typer = document.querySelector(".typer");
if (typer && !reduced) {
  const words = JSON.parse(typer.dataset.words);
  let w = 0;
  let n = words[0].length;
  let deleting = true;
  const tick = () => {
    if (deleting) {
      n--;
      if (n <= 0) {
        deleting = false;
        w = (w + 1) % words.length;
      }
    } else n++;
    typer.textContent = words[w].slice(0, Math.max(n, 0));
    let delay = deleting ? 32 : 62;
    if (!deleting && n >= words[w].length) {
      deleting = true;
      delay = 2200;
    } else if (!deleting && n === 0) delay = 300;
    setTimeout(tick, delay);
  };
  // con intro, el texto empieza a cambiar cuando la portada ya está a la vista
  if (root.classList.contains("intro-on")) document.addEventListener("intro:done", () => setTimeout(tick, 2600), { once: true });
  else setTimeout(tick, 4200);
}

// ---------------------------------------------------------------- contadores
const fmtCache = new Map();
const fmt = (d) => {
  if (!fmtCache.has(d))
    fmtCache.set(d, new Intl.NumberFormat(root.lang, { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: false }));
  return fmtCache.get(d);
};
const counters = document.querySelectorAll("[data-count]");
if (counters.length && !reduced && "IntersectionObserver" in window) {
  const run = (el) => {
    const to = Number(el.dataset.count);
    const d = Number(el.dataset.decimals || 0);
    const t0 = performance.now();
    const dur = 1600;
    const step = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(d).format(to * e);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const cio = new IntersectionObserver(
    (entries) => {
      for (const e of entries)
        if (e.isIntersecting) {
          run(e.target);
          cio.unobserve(e.target);
        }
    },
    { threshold: 0.6 },
  );
  counters.forEach((el) => {
    el.textContent = fmt(Number(el.dataset.decimals || 0)).format(0);
    cio.observe(el);
  });
}

// ---------------------------------------------------------------- inclinación 3D y botones magnéticos
if (fine && !reduced) {
  for (const el of document.querySelectorAll("[data-tilt]")) {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty("--rx", `${(-y * 7).toFixed(2)}deg`);
      el.style.setProperty("--ry", `${(x * 9).toFixed(2)}deg`);
    });
    el.addEventListener("pointerleave", () => {
      el.style.removeProperty("--rx");
      el.style.removeProperty("--ry");
    });
  }
  for (const el of document.querySelectorAll("[data-magnetic]")) {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.translate = `${((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1)}px ${((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1)}px`;
    });
    el.addEventListener("pointerleave", () => (el.style.translate = ""));
  }
}

// ---------------------------------------------------------------- red neuronal de fondo
const canvas = document.querySelector(".hero__canvas");
const hero = canvas?.parentElement;
if (canvas && canvas.getContext) {
  const ctx = canvas.getContext("2d");
  const mouse = { x: -1e4, y: -1e4 };
  let W = 0;
  let H = 0;
  let dpr = 1;
  let nodes = [];
  let raf = 0;
  let visible = true;
  let colors = {};

  const readColors = () => {
    colors = { a: css("--accent"), b: css("--accent-2"), line: css("--net-line"), dot: css("--net-dot") };
  };

  const resize = () => {
    const r = hero.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = r.width;
    H = r.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(Math.round((W * H) / 15000), W < 640 ? 38 : 90);
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      r: Math.random() * 1.4 + 0.8,
      p: Math.random() * Math.PI * 2,
    }));
  };

  const LINK = 140;
  const draw = (t = 0) => {
    ctx.clearRect(0, 0, W, H);
    for (const n of nodes) {
      if (!reduced) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -20) n.x = W + 20;
        else if (n.x > W + 20) n.x = -20;
        if (n.y < -20) n.y = H + 20;
        else if (n.y > H + 20) n.y = -20;
        // el cursor atrae ligeramente a los nodos cercanos
        const dx = mouse.x - n.x;
        const dy = mouse.y - n.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 200 * 200) {
          n.x += dx * 0.004;
          n.y += dy * 0.004;
        }
      }
    }
    ctx.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > LINK * LINK) continue;
        const k = 1 - Math.sqrt(d2) / LINK;
        const mx = (a.x + b.x) / 2 - mouse.x;
        const my = (a.y + b.y) / 2 - mouse.y;
        const near = mx * mx + my * my < 180 * 180;
        ctx.strokeStyle = near ? colors.a : colors.line;
        ctx.globalAlpha = k * (near ? 0.75 : 0.5);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
    for (const n of nodes) {
      const dx = n.x - mouse.x;
      const dy = n.y - mouse.y;
      const near = dx * dx + dy * dy < 180 * 180;
      const pulse = 0.6 + 0.4 * Math.sin(t / 900 + n.p);
      ctx.globalAlpha = near ? 1 : 0.35 + 0.45 * pulse;
      ctx.fillStyle = near ? colors.b : colors.dot;
      ctx.beginPath();
      ctx.arc(n.x, n.y, near ? n.r + 1 : n.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (!reduced && visible) raf = requestAnimationFrame(draw);
  };

  const start = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(draw);
  };

  readColors();
  resize();
  start();

  let rt;
  addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      resize();
      if (reduced) draw();
    }, 150);
  });
  hero.addEventListener("pointermove", (e) => {
    const r = hero.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
    hero.style.setProperty("--mx", `${mouse.x}px`);
    hero.style.setProperty("--my", `${mouse.y}px`);
  });
  hero.addEventListener("pointerleave", () => {
    mouse.x = mouse.y = -1e4;
  });
  // se pausa fuera de la vista o con la pestaña oculta
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting && !document.hidden;
    if (visible && !reduced) start();
  }).observe(hero);
  document.addEventListener("visibilitychange", () => {
    visible = !document.hidden;
    if (visible && !reduced) start();
  });
  // el tema cambia los colores
  new MutationObserver(() => {
    readColors();
    if (reduced) draw();
  }).observe(root, { attributes: true, attributeFilter: ["data-theme"] });
}
