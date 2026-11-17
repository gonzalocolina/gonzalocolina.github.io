#!/usr/bin/env node
// Build of gonzalocolina.github.io. No dependencies: Node 24 and nothing else.
//
//   node build.mjs              build into _site/
//   node build.mjs --strict     same, but warnings (TODOs, missing media, budgets) fail the build
//   node build.mjs --serve      build, serve on http://127.0.0.1:4000 and rebuild on changes
//   node build.mjs --publish    production build: blocks with pending TODOs are left out instead of highlighted
//
// Pages live in src/pages/{es,en}/**.html. Each starts with a JSON front matter between `---` lines.
// Shortcodes inside pages:
//   href="@id" / href="@id#hash"      link to the page with that id in the same language
//   {{img name | alt | sizes=… | eager | class=…}}   responsive WebP from src/assets/img
//   {{video name | caption}}          <figure> with the video if src/assets/video/name.mp4 exists, else nothing
//   {{data name}}                     src/data/name.json as an inline JSON script
//   {{> name}}                        src/partials/name.(svg|html)
//   {{hash /assets/…}}                content hash of an asset (for cache-busting URLs built in pages)
//   {{icon name}}                     inline SVG icon from `icons` in src/layout.mjs
//   {{TODO: text}}                    highlighted placeholder; a warning (an error with --strict)

import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { existsSync, readFileSync, readdirSync, statSync, watch } from "node:fs";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "_site");
const args = process.argv.slice(2);
const STRICT = args.includes("--strict");
const SERVE = args.includes("--serve");
// --publish: lo que aún tiene {{TODO}} no se publica. Los bloques <!--todo-block-->…<!--/todo-block--> que contienen
// un TODO se eliminan enteros y los TODO sueltos se quedan vacíos. Sin --publish se ven marcados en amarillo.
const PUBLISH = args.includes("--publish");
const PORT = Number(args[args.indexOf("--port") + 1]) || 4000;

// Presupuestos de la portada en bytes transferidos (GitHub Pages sirve HTML, CSS y JS con gzip).
const BUDGET = { homeBytes: 200 * 1024, homeJsBytes: 15 * 1024 };

// ---------------------------------------------------------------- helpers

const read = (p) => readFileSync(p, "utf8");
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const hashOf = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 10);

function webpSize(file) {
  const b = readFileSync(file);
  if (b.toString("ascii", 0, 4) !== "RIFF" || b.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = b.toString("ascii", 12, 16);
  if (chunk === "VP8X") return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  if (chunk === "VP8 ") return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  if (chunk === "VP8L") {
    const [b0, b1, b2, b3] = [b[21], b[22], b[23], b[24]];
    return { w: 1 + (((b1 & 0x3f) << 8) | b0), h: 1 + (((b3 & 0xf) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)) };
  }
  return null;
}

// ---------------------------------------------------------------- build

async function build() {
  const t0 = performance.now();
  const warnings = [];
  const errors = [];
  const warn = (m) => warnings.push(m);
  const notes = new Set();
  const fail = (m) => errors.push(m);

  // Fresh imports so --serve picks up edits to site.mjs / layout.mjs.
  const bust = `?t=${Date.now()}`;
  const { site } = await import(join(SRC, "site.mjs") + bust);
  const { renderPage, icons } = await import(join(SRC, "layout.mjs") + bust);

  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  if (existsSync(join(SRC, "static"))) await cp(join(SRC, "static"), OUT, { recursive: true });
  await cp(join(SRC, "assets"), join(OUT, "assets"), {
    recursive: true,
    filter: (p) => !p.endsWith(".gitkeep"),
  });

  // Cache-busting query for an asset path such as /assets/css/style.css.
  const assetCache = new Map();
  const asset = (p) => {
    if (!assetCache.has(p)) {
      const f = join(SRC, p.replace(/^\/assets\//, "assets/"));
      if (!existsSync(f)) fail(`asset inexistente: ${p}`);
      assetCache.set(p, existsSync(f) ? `${p}?v=${hashOf(readFileSync(f))}` : p);
    }
    return assetCache.get(p);
  };

  // 1. Read pages.
  const pagesDir = join(SRC, "pages");
  const pages = walk(pagesDir)
    .filter((f) => f.endsWith(".html"))
    .map((file) => {
      const rel = relative(pagesDir, file).replace(/\\/g, "/");
      const raw = read(file);
      const m = raw.match(/^---\n([\s\S]*?)\n---\n/);
      if (!m) throw new Error(`${rel}: falta el front matter JSON`);
      let meta;
      try {
        meta = JSON.parse(m[1]);
      } catch (e) {
        throw new Error(`${rel}: front matter no es JSON válido (${e.message})`);
      }
      const body = raw.slice(m[0].length);
      let lang, url;
      if (rel === "404.html") {
        lang = meta.lang || "es";
        url = "/404.html";
      } else {
        [lang] = rel.split("/");
        const inner = rel.slice(lang.length + 1).replace(/\.html$/, "");
        const path = inner === "index" ? "" : inner.replace(/\/index$/, "") + "/";
        url = (lang === site.defaultLang ? "/" : `/${lang}/`) + path;
      }
      return { file: rel, meta, body, lang, url, id: meta.id };
    });

  const byLangId = new Map(pages.map((p) => [`${p.lang}:${p.id}`, p]));
  for (const p of pages) {
    if (!p.id) fail(`${p.file}: falta "id" en el front matter`);
    if (!p.meta.title) fail(`${p.file}: falta "title"`);
    if (!p.meta.description) fail(`${p.file}: falta "description"`);
    if (p.url === "/404.html") continue;
    for (const l of site.langs) {
      if (!byLangId.has(`${l}:${p.id}`)) fail(`${p.file}: no hay versión "${l}" de la página "${p.id}"`);
    }
  }
  const dup = new Set();
  for (const p of pages) {
    const k = `${p.lang}:${p.id}`;
    if (dup.has(k)) fail(`id repetido: ${k}`);
    dup.add(k);
  }

  // 2. Shortcodes.
  const imgDir = join(SRC, "assets", "img");
  function imgTag(spec, file) {
    const [name, alt, ...opts] = spec.split("|").map((s) => s.trim());
    const o = Object.fromEntries(
      opts.map((x) => {
        const i = x.indexOf("=");
        return i < 0 ? [x, true] : [x.slice(0, i), x.slice(i + 1)];
      }),
    );
    if (alt === undefined) fail(`${file}: {{img ${name}}} sin texto alternativo`);
    const variants = [640, 1280].filter((w) => existsSync(join(imgDir, `${name}-${w}.webp`)));
    let src, srcset, size;
    if (variants.length) {
      const big = `${name}-${variants.at(-1)}.webp`;
      src = `/assets/img/${big}`;
      srcset = variants.map((w) => `/assets/img/${name}-${w}.webp ${w}w`).join(", ");
      size = webpSize(join(imgDir, big));
    } else if (existsSync(join(imgDir, `${name}.webp`))) {
      src = `/assets/img/${name}.webp`;
      size = webpSize(join(imgDir, `${name}.webp`));
    } else {
      fail(`${file}: no existe la imagen ${name}`);
      return "";
    }
    const attrs = [
      `src="${src}"`,
      srcset && `srcset="${srcset}"`,
      srcset && `sizes="${esc(o.sizes || "(min-width: 72rem) 40rem, 100vw")}"`,
      size && `width="${size.w}" height="${size.h}"`,
      `alt="${esc(alt || "")}"`,
      o.eager ? `fetchpriority="high"` : `loading="lazy"`,
      `decoding="async"`,
      o.class && `class="${esc(o.class)}"`,
    ];
    return `<img ${attrs.filter(Boolean).join(" ")}>`;
  }

  function videoTag(spec, file) {
    const [name, caption] = spec.split("|").map((s) => s.trim());
    const dir = join(SRC, "assets", "video");
    const mp4 = join(dir, `${name}.mp4`);
    if (!existsSync(mp4)) {
      notes.add(`vídeo opcional sin añadir: src/assets/video/${name}.mp4`);
      return "";
    }
    const webm = existsSync(join(dir, `${name}.webm`));
    const poster = existsSync(join(dir, `${name}.webp`)) ? ` poster="/assets/video/${name}.webp"` : "";
    return `<figure class="media media--video"><video muted playsinline loop preload="none" data-autoplay${poster} aria-label="${esc(caption || "")}">${
      webm ? `<source src="/assets/video/${name}.webm" type="video/webm">` : ""
    }<source src="/assets/video/${name}.mp4" type="video/mp4"></video>${
      caption ? `<figcaption>${caption}</figcaption>` : ""
    }</figure>`;
  }

  function expand(page) {
    let html = page.body;
    let todos = 0;
    let omitted = 0;
    html = html.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, name) => {
      for (const ext of ["svg", "html"]) {
        const f = join(SRC, "partials", `${name}.${ext}`);
        if (existsSync(f)) return read(f);
      }
      fail(`${page.file}: no existe el parcial ${name}`);
      return "";
    });
    html = html.replace(/\{\{data\s+([\w-]+)\s*\}\}/g, (_, name) => {
      const f = join(SRC, "data", `${name}.json`);
      if (!existsSync(f)) {
        fail(`${page.file}: no existe src/data/${name}.json`);
        return "";
      }
      const json = JSON.stringify(JSON.parse(read(f))).replace(/</g, "\\u003c");
      return `<script type="application/json" id="data-${name}">${json}</script>`;
    });
    html = html.replace(/\{\{hash\s+(\/[^\s}]+)\s*\}\}/g, (_, p) => asset(p).split("?v=")[1] || "");
    html = html.replace(/\{\{icon\s+([\w-]+)\s*\}\}/g, (_, name) => {
      if (!icons[name]) fail(`${page.file}: no existe el icono ${name}`);
      return icons[name] || "";
    });
    html = html.replace(/\{\{img\s+([^}]+)\}\}/g, (_, spec) => imgTag(spec, page.file));
    html = html.replace(/\{\{video\s+([^}]+)\}\}/g, (_, spec) => videoTag(spec, page.file));
    if (PUBLISH) {
      html = html.replace(/<!--todo-block-->([\s\S]*?)<!--\/todo-block-->/g, (_, block) => {
        if (!/\{\{TODO:/.test(block)) return block;
        omitted++;
        return "";
      });
      html = html.replace(/\{\{TODO:\s*([^}]+)\}\}/g, () => {
        omitted++;
        return "";
      });
      if (omitted) notes.add(`${page.file}: ${omitted} dato(s) pendiente(s) omitido(s) en la versión publicada`);
    } else html = html.replace(/<!--\/?todo-block-->/g, "");
    html = html.replace(/\{\{TODO:\s*([^}]+)\}\}/g, (_, text) => {
      todos++;
      return `<mark class="todo" title="Pendiente">${esc(text.trim())}</mark>`;
    });
    if (todos) warn(`${page.file}: ${todos} TODO pendiente(s)`);
    return html;
  }

  // 3. Render.
  for (const page of pages) {
    const body = expand(page);
    const alternates = Object.fromEntries(
      site.langs.map((l) => [l, byLangId.get(`${l}:${page.id}`)]).filter(([, p]) => p),
    );
    const ogFile = `/assets/og/${page.lang}-${page.id}.png`;
    const og = existsSync(join(SRC, ogFile.slice(1).replace(/^assets/, "assets"))) ? ogFile : site.ogDefault;
    if (og === site.ogDefault && page.url !== "/404.html") warn(`${page.file}: sin imagen Open Graph propia (${ogFile})`);
    let html = renderPage({ site, page, body, alternates, asset, og, serve: SERVE });
    html = html.replace(/href="@([\w-]+)(#[\w-]+)?"/g, (_, id, hash = "") => {
      const target = byLangId.get(`${page.lang}:${id}`);
      if (!target) {
        fail(`${page.file}: enlace a una página inexistente @${id}`);
        return `href="#"`;
      }
      return `href="${target.url}${hash}"`;
    });
    if (SERVE) {
      html = html.replace(
        "</body>",
        `<script>new EventSource("/__reload").onmessage=()=>location.reload()</script></body>`,
      );
    }
    const outFile = page.url.endsWith("/") ? join(OUT, page.url, "index.html") : join(OUT, page.url);
    await mkdir(dirname(outFile), { recursive: true });
    await writeFile(outFile, html);
    page.outFile = outFile;
    page.html = html;
  }

  // 4. sitemap.xml, robots.txt, .nojekyll
  const indexable = pages.filter((p) => p.url !== "/404.html" && !p.meta.noindex);
  const sitemap = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
    ...indexable.map((p) => {
      const alts = site.langs
        .map((l) => byLangId.get(`${l}:${p.id}`))
        .filter(Boolean)
        .map((a) => `<xhtml:link rel="alternate" hreflang="${a.lang}" href="${site.url}${a.url}"/>`)
        .join("");
      return `<url><loc>${site.url}${p.url}</loc>${alts}</url>`;
    }),
    `</urlset>`,
  ].join("\n");
  await writeFile(join(OUT, "sitemap.xml"), sitemap);
  await writeFile(join(OUT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${site.url}/sitemap.xml\n`);
  await writeFile(join(OUT, ".nojekyll"), "");

  // 5. Checks on the output.
  const exists = (urlPath) => {
    const clean = decodeURI(urlPath.split("#")[0].split("?")[0]);
    if (!clean) return true;
    const f = join(OUT, clean);
    if (clean.endsWith("/")) return existsSync(join(f, "index.html"));
    return existsSync(f) && statSync(f).isFile();
  };
  for (const page of pages) {
    const refs = new Set();
    for (const m of page.html.matchAll(/\s(?:href|src|poster)="(\/[^"]*)"/g)) refs.add(m[1]);
    for (const m of page.html.matchAll(/\ssrcset="([^"]*)"/g))
      for (const part of m[1].split(",")) refs.add(part.trim().split(/\s+/)[0]);
    for (const r of refs) if (r.startsWith("/") && !r.startsWith("//") && !exists(r)) fail(`${page.file}: enlace roto ${r}`);
    for (const m of page.html.matchAll(/<img\b[^>]*>/g)) {
      if (!/\salt="/.test(m[0])) fail(`${page.file}: <img> sin alt`);
      if (!/\swidth="/.test(m[0])) warn(`${page.file}: <img> sin width/height`);
    }
    for (const m of page.html.matchAll(/\sid="([^"]+)"/g)) {
      const n = page.html.split(`id="${m[1]}"`).length - 1;
      if (n > 1) fail(`${page.file}: id repetido "${m[1]}"`);
    }
    for (const m of page.html.matchAll(/href="#([\w-]+)"/g)) {
      if (!page.html.includes(`id="${m[1]}"`)) fail(`${page.file}: ancla inexistente #${m[1]}`);
    }
  }

  // 6. Weight budget of the home pages (HTML + CSS + JS + preloaded fonts; lazy images excluded).
  const gz = (buf) => (/\.(woff2|webp|png|wasm)$/.test(buf.name) ? buf.data.length : gzipSync(buf.data, { level: 9 }).length);
  const sizeOf = (p) => {
    const f = join(OUT, p.split("?")[0]);
    return existsSync(f) ? gz({ name: f, data: readFileSync(f) }) : 0;
  };
  const moduleGraph = (p, seen = new Set()) => {
    const clean = p.split("?")[0];
    if (seen.has(clean)) return seen;
    seen.add(clean);
    const f = join(OUT, clean);
    if (!existsSync(f)) return seen;
    for (const m of read(f).matchAll(/^\s*import\s[^'"]*["'](\.{1,2}\/[^"']+)["']/gm)) {
      moduleGraph(join(dirname(clean), m[1]).replace(/\\/g, "/"), seen);
    }
    return seen;
  };
  const report = [];
  for (const page of pages.filter((p) => p.id === "home")) {
    const css = [...page.html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
    const fonts = [...page.html.matchAll(/<link rel="preload" href="([^"]+)" as="font"/g)].map((m) => m[1]);
    const js = new Set();
    for (const m of page.html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)) moduleGraph(m[1], js);
    const jsBytes = [...js].reduce((a, p) => a + sizeOf(p), 0);
    const total =
      gz({ name: "x.html", data: Buffer.from(page.html) }) + css.reduce((a, p) => a + sizeOf(p), 0) + fonts.reduce((a, p) => a + sizeOf(p), 0) + jsBytes;
    report.push(`${page.url}: ${(total / 1024).toFixed(1)} KB transferidos (JS ${(jsBytes / 1024).toFixed(1)} KB)`);
    if (total > BUDGET.homeBytes) warn(`${page.url}: ${(total / 1024).toFixed(1)} KB supera el presupuesto de 200 KB`);
    if (jsBytes > BUDGET.homeJsBytes) warn(`${page.url}: JS ${(jsBytes / 1024).toFixed(1)} KB supera el presupuesto de 15 KB`);
  }

  const ms = (performance.now() - t0).toFixed(0);
  for (const n of notes) console.log(`  nota: ${n}`);
  for (const w of warnings) console.warn(`  aviso: ${w}`);
  for (const e of errors) console.error(`  error: ${e}`);
  console.log(`${pages.length} páginas en ${ms} ms · ${report.join(" · ")}`);
  if (errors.length || (STRICT && warnings.length)) {
    console.error(`Build fallido: ${errors.length} error(es), ${warnings.length} aviso(s)${STRICT ? " (--strict)" : ""}`);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------- serve

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".pdf": "application/pdf",
};

function serve() {
  const clients = new Set();
  const server = createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    if (url.pathname === "/__reload") {
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }
    let p = join(OUT, decodeURIComponent(url.pathname));
    if (!p.startsWith(OUT)) return res.writeHead(403).end();
    if (existsSync(p) && statSync(p).isDirectory()) {
      if (!url.pathname.endsWith("/")) return res.writeHead(301, { Location: url.pathname + "/" }).end();
      p = join(p, "index.html");
    }
    const status = existsSync(p) ? 200 : 404;
    if (status === 404) p = join(OUT, "404.html");
    res.writeHead(status, { "Content-Type": MIME[extname(p)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(readFileSync(p));
  });
  server.listen(PORT, "127.0.0.1", () => console.log(`http://127.0.0.1:${PORT}/`));
  let timer;
  watch(SRC, { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        await build();
        for (const c of clients) c.write("data: reload\n\n");
      } catch (e) {
        console.error(e.message);
      }
    }, 120);
  });
}

const ok = await build().catch((e) => {
  console.error(e.message);
  return false;
});
if (SERVE) serve();
else if (!ok) process.exit(1);
