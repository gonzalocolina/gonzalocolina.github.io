// Comportamiento común: tema, menú móvil, copiar correo, aviso de idioma, aparición al hacer scroll,
// vídeos que solo se reproducen a la vista e índice activo en los casos de estudio.

const root = document.documentElement;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
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

// Aparición suave al entrar en pantalla; los que entran a la vez lo hacen escalonados
const revealables = document.querySelectorAll("[data-reveal]");
if (!reduced && "IntersectionObserver" in window) {
  const io = new IntersectionObserver(
    (entries) => {
      let k = 0;
      for (const e of entries)
        if (e.isIntersecting) {
          e.target.style.transitionDelay = `${k++ * 90}ms`;
          e.target.classList.add("is-in");
          e.target.addEventListener("transitionend", () => (e.target.style.transitionDelay = ""), { once: true });
          io.unobserve(e.target);
        }
    },
    { rootMargin: "0px 0px -8% 0px" },
  );
  revealables.forEach((el) => io.observe(el));
} else revealables.forEach((el) => el.classList.add("is-in"));

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
