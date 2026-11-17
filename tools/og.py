#!/usr/bin/env python3
"""Genera las imágenes Open Graph (1200×630) de cada página, el icono para iOS y la imagen por defecto.

Lee el título y la descripción del front matter de src/pages/{es,en}/**.html.
Requiere Pillow (solo para generar las imágenes; la web no lo necesita).

Uso: python3 tools/og.py
"""
import json
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PAGES = ROOT / "src" / "pages"
OUT = ROOT / "src" / "assets" / "og"
IMG = ROOT / "src" / "assets" / "img"
FONTS = Path(__file__).resolve().parent / "fonts"

BG = (12, 10, 9)
TEXT = (245, 242, 236)
MUTED = (170, 164, 155)
FAINT = (141, 135, 126)
LINE = (39, 35, 31)
ACCENT = (255, 122, 47)
# degradado de la marca: ámbar → naranja → coral
GRAD = [(255, 194, 75), (255, 122, 47), (255, 79, 94)]


def grad_at(t):
    t = max(0.0, min(1.0, t))
    i = 0 if t < 0.5 else 1
    u = t * 2 - i
    a, b = GRAD[i], GRAD[i + 1]
    return tuple(round(a[k] + (b[k] - a[k]) * u) for k in range(3))


def glow(im, cx, cy, r, color, strength):
    """Brillo radial suave mezclado sobre la imagen."""
    from PIL import ImageFilter

    layer = Image.new("RGB", im.size, (0, 0, 0))
    ImageDraw.Draw(layer).ellipse((cx - r, cy - r, cx + r, cy + r), fill=tuple(int(c * strength) for c in color))
    layer = layer.filter(ImageFilter.GaussianBlur(r * 0.45))
    from PIL import ImageChops

    return ImageChops.add(im, layer)

KICKER = {
    "es": {
        "home": "Desarrollador de software · Fullstack e IA",
        "optiline": "Caso de estudio · Motor de ajedrez",
        "roadsignai": "Caso de estudio · Visión por computador",
        "tfg": "Caso de estudio · Trabajo Fin de Grado",
        "aquilae": "Caso de estudio · Juego educativo",
        "pasos": "Caso de estudio · App Android",
        "play": "Ajedrez en el navegador",
        "cv": "Currículum",
    },
    "en": {
        "home": "Software developer · Full-stack and AI",
        "optiline": "Case study · Chess engine",
        "roadsignai": "Case study · Computer vision",
        "tfg": "Case study · Bachelor’s thesis",
        "aquilae": "Case study · Educational game",
        "pasos": "Case study · Android app",
        "play": "Chess in the browser",
        "cv": "Résumé",
    },
}


def sans(size, weight="Regular"):
    f = ImageFont.truetype(str(FONTS / "IBMPlexSans-Variable.ttf"), size)
    f.set_variation_by_name(weight)
    return f


def display(size):
    """Fraunces de cartel (opsz 144), como los titulares de la web."""
    f = ImageFont.truetype(str(FONTS / "Fraunces-Variable.ttf"), size)
    axes = {a["name"]: a for a in f.get_variation_axes()}
    want = {b"Optical Size": 144, b"Weight": 400, b"Softness": 0, b"Wonky": 0}
    f.set_variation_by_axes([want.get(name, a["default"]) for name, a in axes.items()])
    return f


def mono(size):
    return ImageFont.truetype(str(FONTS / "IBMPlexMono-Medium.ttf"), size)


def wrap(draw, text, font, width):
    lines, line = [], ""
    for word in text.split():
        test = f"{line} {word}".strip()
        if draw.textlength(test, font=font) <= width:
            line = test
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def mark(draw, x, y, size):
    draw.rounded_rectangle((x, y, x + size, y + size), radius=int(size * 0.26), fill=(21, 19, 17), outline=ACCENT, width=3)
    f = sans(int(size * 0.38), "Bold")
    draw.text((x + size / 2, y + size / 2 + 1), "GC", font=f, fill=ACCENT, anchor="mm")


def card(title, kicker, description, path):
    W, H, P = 1200, 630, 80
    im = Image.new("RGB", (W, H), BG)
    im = glow(im, W - 60, 40, 420, ACCENT, 0.22)
    im = glow(im, 80, H + 60, 300, GRAD[2], 0.12)
    d = ImageDraw.Draw(im)
    # retícula tenue
    for gx in range(0, W, 60):
        d.line((gx, 0, gx, H), fill=(22, 19, 17))
    for gy in range(0, H, 60):
        d.line((0, gy, W, gy), fill=(22, 19, 17))
    for yy in range(H):
        d.line((0, yy, 10, yy), fill=grad_at(yy / H))
    mark(d, P, P - 10, 64)
    d.text((P + 88, P + 22), "Gonzalo Colina", font=sans(30, "SemiBold"), fill=TEXT, anchor="lm")
    d.text((P, 205), kicker.upper(), font=mono(24), fill=(255, 157, 92))
    size = 76
    while True:
        tf = display(size + 8)
        lines = wrap(d, title, tf, W - 2 * P)
        if len(lines) <= 2 or size <= 52:
            break
        size -= 6
    y = 250
    for line in lines[:2]:
        d.text((P, y), line, font=tf, fill=TEXT)
        y += int(size * 1.12)
    df = sans(30)
    dl = wrap(d, description, df, W - 2 * P)
    y += 30
    for i, line in enumerate(dl[:2]):
        if i == 1 and len(dl) > 2:
            while d.textlength(line + "…", font=df) > W - 2 * P:
                line = line.rsplit(" ", 1)[0]
            line += "…"
        d.text((P, y), line, font=df, fill=MUTED)
        y += 42
    d.line((P, H - 88, W - P, H - 88), fill=LINE, width=2)
    d.text((P, H - 52), "gonzalocolina.github.io", font=mono(24), fill=FAINT, anchor="lm")
    im.save(path, "PNG", optimize=True)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for f in sorted(PAGES.rglob("*.html")):
        rel = f.relative_to(PAGES)
        if rel.name == "404.html":
            continue
        lang = rel.parts[0]
        m = re.match(r"^---\n(.*?)\n---\n", f.read_text(encoding="utf-8"), re.S)
        meta = json.loads(m.group(1))
        pid = meta["id"]
        title = meta.get("ogTitle") or meta["title"]
        if pid == "home":
            title = "Gonzalo Colina"
        card(title, KICKER[lang].get(pid, ""), meta["description"], OUT / f"{lang}-{pid}.png")
    card("Gonzalo Colina", KICKER["es"]["home"], "Ingeniero informático (UVa) y estudiante del Máster en IA. Aplicaciones con Java, Spring Boot, Vue y Python.", OUT / "default.png")

    # Icono para iOS (180×180)
    icon = Image.new("RGB", (180, 180), BG)
    icon = glow(icon, 150, 20, 120, ACCENT, 0.35)
    d = ImageDraw.Draw(icon)
    d.text((90, 92), "GC", font=sans(72, "Bold"), fill=ACCENT, anchor="mm")
    icon.save(IMG / "apple-touch-icon.png", "PNG", optimize=True)
    print("ok")


if __name__ == "__main__":
    main()
