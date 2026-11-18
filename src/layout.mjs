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
  pin: '<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.4" d="M8 14.5s4.75-4.2 4.75-8A4.75 4.75 0 003.25 6.5c0 3.8 4.75 8 4.75 8z"/><circle cx="8" cy="6.5" r="1.6" fill="currentColor"/></svg>',
  work: '<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.4" d="M1.75 5.25h12.5v8H1.75zM5.75 5.25V3.5a1 1 0 011-1h2.5a1 1 0 011 1v1.75M1.75 8.75h12.5"/></svg>',
  cap: '<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" d="M8 2.75 1 6.25l7 3.5 7-3.5zM3.75 7.6v3.4c1 1 2.5 1.75 4.25 1.75s3.25-.75 4.25-1.75V7.6M15 6.25v4"/></svg>',
  spark: '<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" d="M8 1.5l1.6 4.4 4.4 1.6-4.4 1.6L8 13.5l-1.6-4.4L2 7.5l4.4-1.6z"/></svg>',
  globe: '<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" stroke-width="1.4"/><path fill="none" stroke="currentColor" stroke-width="1.4" d="M1.75 8h12.5M8 1.75c1.8 1.9 2.6 3.9 2.6 6.25S9.8 12.35 8 14.25C6.2 12.35 5.4 10.35 5.4 8S6.2 3.65 8 1.75z"/></svg>',
  badge: '<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="6.25" r="4.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" d="M5.4 9.9 4.5 14.5 8 12.75l3.5 1.75-.9-4.6M6.25 6.25l1.25 1.25 2.25-2.5"/></svg>',
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
        jobTitle: lang === "es" ? "Desarrollador de software" : "Software developer",
        alumniOf: { "@type": "CollegeOrUniversity", name: "Universidad de Valladolid" },
        hasCredential: {
          "@type": "EducationalOccupationalCredential",
          name: "Microsoft Certified: Azure Fundamentals (AZ-900)",
          credentialCategory: "certification",
          recognizedBy: { "@type": "Organization", name: "Microsoft" },
        },
        knowsLanguage: ["es", "en"],
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
<meta name="color-scheme" content="dark light">
<meta name="theme-color" content="#0c0a09">
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
<link rel="preload" href="/assets/fonts/fraunces-var.woff2" as="font" type="font/woff2" crossorigin>
${isHome ? '<link rel="preload" href="/assets/fonts/fraunces-italic-var.woff2" as="font" type="font/woff2" crossorigin>' : ""}
${styles}
<script>var d=document.documentElement;d.dataset.theme="dark";try{var t=localStorage.getItem("theme");if(t)d.dataset.theme=t}catch(e){}d.classList.add("js");try{if(/[?&]motion=off/.test(location.search))sessionStorage.setItem("motion","off");if(/[?&]motion=on/.test(location.search))sessionStorage.removeItem("motion");if(sessionStorage.getItem("motion")==="off")d.classList.add("motion-off")${isHome ? "" : ';sessionStorage.setItem("intro","1")'}}catch(e){}</script>
${isHome ? '<script>(function(d,q){try{if(/[?&]intro=off/.test(q)||d.classList.contains("motion-off"))return;if(!/[?&]intro=on/.test(q)&&(sessionStorage.getItem("intro")||location.hash))return;sessionStorage.setItem("intro","1")}catch(e){return}d.classList.add("intro-on");window.__introFailsafe=setTimeout(function(){d.classList.remove("intro-on")},6000)})(document.documentElement,location.search)</script>' : ""}
${scripts}
${jsonld}
</head>
<body class="${esc(meta.bodyClass || "")}">
<a class="skip" href="#main">${t.skip}</a>
<header class="site-header">
  <span class="site-header__progress" aria-hidden="true"></span>
  <div class="wrap site-header__inner">
    <a class="brand" href="@home"${isHome ? ' aria-current="page"' : ""}><span class="brand__mark" aria-hidden="true">g</span><span class="brand__name">${esc(site.name)}</span></a>
    <nav class="nav" aria-label="${esc(t.navLabel)}">
      <button class="nav__toggle" type="button" aria-expanded="false" aria-controls="nav-list">${t.menu}</button>
      <ul class="nav__list" id="nav-list">${nav}</ul>
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
      <a class="to-top" href="#main">${t.top} <span aria-hidden="true">↑</span></a>
    </div>
    <ul class="site-footer__links">
      <li><a href="mailto:${site.email}">${icons.mail}<span>${site.email}</span></a></li>
      <li><a href="${site.github}">${icons.github}<span>GitHub</span></a></li>
      <li><a href="${site.linkedin}">${icons.linkedin}<span>LinkedIn</span></a></li>
    </ul>
    <details class="credits"><summary>${t.footerCredits}</summary><p>${t.credits}</p></details>
  </div>
  <p class="site-footer__mark" aria-hidden="true">${esc(site.name)}</p>
</footer>
</body>
</html>
`;
}
