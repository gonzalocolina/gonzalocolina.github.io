// Datos del sitio y textos compartidos (cabecera, pie, botones) en los dos idiomas.

export const site = {
  url: "https://gonzalocolina.github.io",
  name: "Gonzalo Colina",
  fullName: "Gonzalo José Colina Báscones",
  email: "gonzalocolinab@gmail.com",
  github: "https://github.com/gonzalocolina",
  linkedin: "https://www.linkedin.com/in/gonzalo-colina-b%C3%A1scones-965361330/",
  langs: ["es", "en"],
  defaultLang: "es",
  ogDefault: "/assets/og/default.png",
  locale: { es: "es_ES", en: "en_GB" },

  t: {
    es: {
      skip: "Saltar al contenido",
      home: "Inicio",
      nav: [
        ["@home#experiencia", "Experiencia"],
        ["@home#proyectos", "Proyectos"],
        ["@cv", "CV"],
        ["@home#contacto", "Contacto"],
      ],
      play: "Jugar",
      menu: "Menú",
      navLabel: "Principal",
      theme: "Cambiar tema claro u oscuro",
      langSwitch: "EN",
      langSwitchLabel: "Read this page in English",
      langHint: "Hay una versión en inglés de esta web.",
      langHintLink: "English version →",
      footerCredits: "Créditos",
      credits:
        'Tipografías <a href="https://github.com/undercasetype/Fraunces">Fraunces</a> e <a href="https://github.com/IBM/plex">IBM Plex</a> (OFL 1.1). Piezas de ajedrez <em>cburnett</em> de Colin M. L. Burnett (GPLv2+). Reglas del ajedrez con <a href="https://github.com/jhlywa/chess.js">chess.js</a> (BSD-2). Motor <a href="https://github.com/gonzalocolina/Optiline">Optiline</a> (GPL-3.0).',
      top: "Volver arriba",
    },
    en: {
      skip: "Skip to content",
      home: "Home",
      nav: [
        ["@home#experience", "Experience"],
        ["@home#projects", "Projects"],
        ["@cv", "CV"],
        ["@home#contact", "Contact"],
      ],
      play: "Play",
      menu: "Menu",
      navLabel: "Main",
      theme: "Toggle light or dark theme",
      langSwitch: "ES",
      langSwitchLabel: "Leer esta página en español",
      langHint: "",
      langHintLink: "",
      footerCredits: "Credits",
      credits:
        'Typefaces <a href="https://github.com/undercasetype/Fraunces">Fraunces</a> and <a href="https://github.com/IBM/plex">IBM Plex</a> (OFL 1.1). <em>cburnett</em> chess pieces by Colin M. L. Burnett (GPLv2+). Chess rules by <a href="https://github.com/jhlywa/chess.js">chess.js</a> (BSD-2). <a href="https://github.com/gonzalocolina/Optiline">Optiline</a> engine (GPL-3.0).',
      top: "Back to top",
    },
  },
};
