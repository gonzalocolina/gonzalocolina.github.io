// Plantilla común: <head>, cabecera, pie. Cada página aporta su <main>.

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const icons = {
  github:
    '<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>',
  linkedin:
    '<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M13.6 0H2.4A2.4 2.4 0 000 2.4v11.2A2.4 2.4 0 002.4 16h11.2a2.4 2.4 0 002.4-2.4V2.4A2.4 2.4 0 0013.6 0zM4.9 13.3H2.6V6h2.3v7.3zM3.75 5a1.33 1.33 0 110-2.66 1.33 1.33 0 010 2.66zm9.6 8.3h-2.3V9.75c0-.85-.02-1.94-1.18-1.94-1.18 0-1.36.92-1.36 1.88v3.61H6.2V6h2.2v1h.03c.31-.58 1.06-1.19 2.18-1.19 2.33 0 2.76 1.53 2.76 3.53v3.96z"/></svg>',
  mail:
    '<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.4" d="M1.5 3.5h13v9h-13zM1.8 3.8 8 8.6l6.2-4.8"/></svg>',
  theme:
    '<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" stroke-width="1.4"/><path fill="currentColor" d="M8 1.75a6.25 6.25 0 010 12.5z"/></svg>',
  arrow: '<span class="arrow" aria-hidden="true">→</span>',
};

export function renderPage({ site, page, body, alternates, asset, og }) {
  const { meta, lang, url } = page;
  const t = site.t[lang];
  const other = site.langs.find((l) => l !== lang);
  const otherPage = alternates[other];
  const isHome = page.id === "home";
  const title = isHome ? meta.title : `${meta.title} · ${site.name}`;
  const canonical = site.url + url;

  const hreflang = Object.entries(alternates)
    .map(([l, p]) => `<link rel="alternate" hreflang="${l}" href="${site.url}${p.url}">`)
    .concat(alternates[site.defaultLang] ? [`<link rel="alternate" hreflang="x-default" href="${site.url}${alternates[site.defaultLang].url}">`] : [])
    .join("\n");

  const styles = ["/assets/css/style.css", ...(meta.styles || [])]
    .map((s) => `<link rel="stylesheet" href="${asset(s)}">`)
    .join("\n");
  const scripts = ["/assets/js/main.js", ...(meta.scripts || [])]
    .map((s) => `<script type="module" src="${asset(s)}"></script>`)
    .join("\n");

  const jsonld = isHome
    ? `<script type="application/ld+json">${JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Person",
        name: site.fullName,
        alternateName: site.name,
        url: site.url + url,
        email: `mailto:${site.email}`,
        jobTitle: lang === "es" ? "Ingeniero informático" : "Software engineer",
        alumniOf: { "@type": "CollegeOrUniversity", name: "Universidad de Valladolid" },
        address: { "@type": "PostalAddress", addressLocality: "Valladolid", addressCountry: "ES" },
        sameAs: [site.github, site.linkedin],
      })}</script>`
    : "";

  const nav = t.nav.map(([href, label]) => `<li><a href="${href}">${label}</a></li>`).join("");
  const langLink = otherPage
    ? `<a class="lang" href="${otherPage.url}" hreflang="${other}" lang="${other}" title="${esc(t.langSwitchLabel)}" data-lang="${other}">${t.langSwitch}<span class="visually-hidden"> · ${esc(t.langSwitchLabel)}</span></a>`
    : "";

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(meta.description)}">
<meta name="author" content="${esc(site.name)}">
${meta.noindex || url === "/404.html" ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${canonical}">`}
${url === "/404.html" ? "" : hreflang}
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#f6f4ef" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#131211" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="${isHome ? "profile" : "article"}">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(meta.ogTitle || meta.title)}">
<meta property="og:description" content="${esc(meta.description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${site.url}${og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="${site.locale[lang]}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/plex-sans-var.woff2" as="font" type="font/woff2" crossorigin>
${styles}
<script>try{var t=localStorage.getItem("theme");if(t)document.documentElement.dataset.theme=t}catch(e){}document.documentElement.classList.add("js")</script>
${scripts}
${jsonld}
</head>
<body class="${esc(meta.bodyClass || "")}">
<a class="skip" href="#main">${t.skip}</a>
<header class="site-header">
  <div class="wrap site-header__inner">
    <a class="brand" href="@home"${isHome ? ' aria-current="page"' : ""}><span class="brand__mark" aria-hidden="true">GC</span><span class="brand__name">${esc(site.name)}</span></a>
    <nav class="nav" aria-label="${esc(t.navLabel)}">
      <button class="nav__toggle" type="button" aria-expanded="false" aria-controls="nav-list">${t.menu}</button>
      <ul class="nav__list" id="nav-list">${nav}<li><a class="nav__play" href="@play"${page.id === "play" ? ' aria-current="page"' : ""}>${t.play}</a></li></ul>
    </nav>
    <div class="header-tools">
      ${langLink}
      <button class="theme-toggle" type="button" aria-label="${esc(t.theme)}" title="${esc(t.theme)}">${icons.theme}</button>
    </div>
  </div>
</header>
${lang === site.defaultLang && isHome && t.langHint ? `<p class="lang-hint" hidden><span>${t.langHint}</span> <a href="${otherPage.url}" hreflang="${other}" lang="${other}">${t.langHintLink}</a></p>` : ""}
<main id="main" tabindex="-1">
${body}
</main>
<footer class="site-footer">
  <div class="wrap site-footer__inner">
    <div>
      <p class="site-footer__name">${esc(site.name)} · ${new Date().getFullYear()}</p>
      <p class="muted">${t.footerMade}</p>
    </div>
    <ul class="site-footer__links">
      <li><a href="mailto:${site.email}">${icons.mail}<span>${site.email}</span></a></li>
      <li><a href="${site.github}">${icons.github}<span>GitHub</span></a></li>
      <li><a href="${site.linkedin}">${icons.linkedin}<span>LinkedIn</span></a></li>
    </ul>
    <details class="credits"><summary>${t.footerCredits}</summary><p>${t.credits}</p></details>
  </div>
</footer>
</body>
</html>
`;
}
