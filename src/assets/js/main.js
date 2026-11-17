// Comportamiento común: tema, menú móvil, copiar correo, aviso de idioma, aparición al hacer scroll,
// vídeos que solo se reproducen a la vista e índice activo en los casos de estudio.

const root = document.documentElement;
// Las animaciones se ven siempre; solo se apagan a propósito con ?motion=off (lo pone el <head>).
const reduced = document.documentElement.classList.contains("motion-off");
const store = {
  get(k) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch {}
  },
};

// Tema claro / oscuro
document.querySelector(".theme-toggle")?.addEventListener("click", () => {
  const current = root.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const next = current === "dark" ? "light" : "dark";
  root.dataset.theme = next;
  store.set("theme", next);
});

// Menú móvil
const nav = document.querySelector(".nav");
const toggle = nav?.querySelector(".nav__toggle");
const setOpen = (open) => {
  nav.toggleAttribute("data-open", open);
  toggle.setAttribute("aria-expanded", String(open));
};
toggle?.addEventListener("click", () => setOpen(!nav.hasAttribute("data-open")));
nav?.addEventListener("click", (e) => e.target.closest("a") && setOpen(false));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && nav?.hasAttribute("data-open")) {
    setOpen(false);
    toggle.focus();
  }
});

// Borde de la cabecera al desplazarse
const header = document.querySelector(".site-header");
const onScroll = () => header?.classList.toggle("is-scrolled", scrollY > 8);
addEventListener("scroll", onScroll, { passive: true });
onScroll();

// Copiar al portapapeles
for (const btn of document.querySelectorAll("[data-copy]")) {
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      btn.dataset.done = btn.dataset.copied || "✓";
      setTimeout(() => delete btn.dataset.done, 2000);
    } catch {
      location.href = `mailto:${btn.dataset.copy}`;
    }
  });
}

// Idioma: se recuerda la elección y la portada en español avisa si alguien eligió inglés
for (const a of document.querySelectorAll("a.lang")) a.addEventListener("click", () => store.set("lang", a.dataset.lang));
const hint = document.querySelector(".lang-hint");
if (hint && store.get("lang") === "en") hint.hidden = false;

// Aparición al hacer scroll, una sola vez por elemento:
// - los bloques suben y aparecen; los que entran a la vez lo hacen escalonados;
// - los titulares suben palabra a palabra desde detrás de una máscara;
// - la raya de las etiquetas de sección se dibuja y las portadas de los proyectos se destapan.
// En la portada con intro no empieza hasta que la intro deja ver la página.
const mark = (sel, kind = "") => document.querySelectorAll(sel).forEach((el) => el.setAttribute("data-reveal", kind));
if (!reduced) {
  // los grupos se revelan por partes en vez de en bloque
  for (const group of document.querySelectorAll(".split > [data-reveal]")) group.removeAttribute("data-reveal");
  mark(".section .eyebrow");
  mark(".section__head p, .xp .points li, .edu li, .skills > div, .site-footer__mark");
  for (const h of document.querySelectorAll(".section h2, .contact h2, .case-body section > h2")) {
    splitWords(h);
    h.setAttribute("data-reveal", "words");
  }
}
function splitWords(h) {
  let i = 0;
  const wrap = (inner) => {
    const w = document.createElement("span");
    w.className = "w";
    w.style.setProperty("--wi", i++);
    w.append(inner);
    return w;
  };
  for (const node of [...h.childNodes]) {
    if (node.nodeType === Node.TEXT_NODE) {
      const frag = document.createDocumentFragment();
      for (const part of node.textContent.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) frag.append(part);
        else {
          const s = document.createElement("span");
          s.textContent = part;
          frag.append(wrap(s));
        }
      }
      node.replaceWith(frag);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const holder = document.createElement("span");
      node.replaceWith(holder);
      holder.replaceWith(wrap(node));
    }
  }
}
const revealables = document.querySelectorAll("[data-reveal]");
const startReveal = () => {
  if (reduced || !("IntersectionObserver" in window)) {
    revealables.forEach((el) => el.classList.add("is-in"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      let k = 0;
      for (const e of entries)
        if (e.isIntersecting) {
          const el = e.target;
          const d = k++ * 110;
          el.style.setProperty("--d", `${d}ms`);
          el.classList.add("is-in");
          io.unobserve(el);
          // sin retardo después, para que el hover responda al momento
          setTimeout(() => el.style.removeProperty("--d"), d + 1600);
        }
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
  );
  revealables.forEach((el) => io.observe(el));
};
if (root.classList.contains("intro-on")) {
  // la intro quita esta clase al empezar a desvanecerse (o el <head> si algo falla)
  const mo = new MutationObserver(() => {
    if (root.classList.contains("intro-on")) return;
    mo.disconnect();
    startReveal();
  });
  mo.observe(root, { attributes: true, attributeFilter: ["class"] });
} else startReveal();

// Vídeos: solo se reproducen mientras están a la vista (y nunca solos con movimiento reducido)
const videos = document.querySelectorAll("video[data-autoplay]");
if (videos.length && "IntersectionObserver" in window) {
  const vio = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const v = e.target;
      if (e.isIntersecting && !reduced) v.play().catch(() => {});
      else v.pause();
    }
  });
  videos.forEach((v) => {
    if (reduced) v.controls = true;
    vio.observe(v);
  });
}

// Índice de los casos de estudio: marca la sección visible
const tocLinks = [...document.querySelectorAll(".toc a")];
if (tocLinks.length && "IntersectionObserver" in window) {
  const map = new Map(tocLinks.map((a) => [a.getAttribute("href").slice(1), a]));
  const tio = new IntersectionObserver(
    (entries) => {
      for (const e of entries)
        if (e.isIntersecting) {
          tocLinks.forEach((a) => a.classList.remove("is-active"));
          map.get(e.target.id)?.classList.add("is-active");
        }
    },
    { rootMargin: "-20% 0px -70% 0px" },
  );
  map.forEach((_, id) => {
    const s = document.getElementById(id);
    if (s) tio.observe(s);
  });
}

// CV: imprimir / guardar como PDF
document.querySelector("[data-print]")?.addEventListener("click", () => print());

// Foco de luz que sigue al cursor en las tarjetas
if (matchMedia("(pointer: fine)").matches)
  for (const el of document.querySelectorAll(".project, .xp, .stat, .facts, .metric, .media-panel")) {
    el.classList.add("spot");
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  }

// Portada: el menú marca la sección que se está leyendo
const navLinks = [...document.querySelectorAll('.nav__list a[href*="#"]')].filter((a) => a.pathname === location.pathname);
if (navLinks.length && "IntersectionObserver" in window) {
  const byId = new Map(navLinks.map((a) => [a.hash.slice(1), a]));
  const nio = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const a = byId.get(e.target.id);
        if (a) a.classList.toggle("is-active", e.isIntersecting);
      }
    },
    { rootMargin: "-45% 0px -50% 0px" },
  );
  byId.forEach((_, id) => {
    const s = document.getElementById(id);
    if (s) nio.observe(s);
  });
}
