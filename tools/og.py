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

BG = (246, 244, 239)
TEXT = (27, 26, 23)
MUTED = (94, 90, 82)
FAINT = (138, 133, 123)
LINE = (224, 219, 208)
ACCENT = (194, 65, 12)

KICKER = {
    "es": {
        "home": "Ingeniero informático · IA y backend",
        "optiline": "Caso de estudio · Motor de ajedrez",
        "roadsignai": "Caso de estudio · Visión por computador",
        "tfg": "Caso de estudio · Trabajo Fin de Grado",
        "aquilae": "Caso de estudio · Juego educativo",
        "pasos": "Caso de estudio · App Android",
        "play": "Ajedrez en el navegador",
        "cv": "Currículum",
    },
    "en": {
        "home": "Software engineer · AI and backend",
        "optiline": "Case study · Chess engine",
        "roadsignai": "Case study · Computer vision",
        "tfg": "Case study · Bachelor’s thesis",
        "aquilae": "Case study · Educational game",
        "pasos": "Case study · Android app",
        "play": "Chess in the browser",
        "cv": "CV",
    },
}


def sans(size, weight="Regular"):
    f = ImageFont.truetype(str(FONTS / "IBMPlexSans-Variable.ttf"), size)
    f.set_variation_by_name(weight)
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
    draw.rounded_rectangle((x, y, x + size, y + size), radius=size * 0.22, fill=TEXT)
    f = mono(int(size * 0.38))
    draw.text((x + size / 2, y + size / 2 + 1), "GC", font=f, fill=BG, anchor="mm")


def card(title, kicker, description, path):
    W, H, P = 1200, 630, 80
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 14, H), fill=ACCENT)
    mark(d, P, P - 10, 64)
    d.text((P + 88, P + 22), "Gonzalo Colina", font=sans(30, "SemiBold"), fill=TEXT, anchor="lm")
    d.text((P, 205), kicker.upper(), font=mono(24), fill=ACCENT)
    size = 76
    while True:
        tf = sans(size, "SemiBold")
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
    card("Gonzalo Colina", KICKER["es"]["home"], "Proyectos de IA y backend con cada cifra enlazada a su prueba.", OUT / "default.png")

    # Icono para iOS (180×180)
    icon = Image.new("RGB", (180, 180), TEXT)
    d = ImageDraw.Draw(icon)
    d.text((90, 92), "GC", font=mono(70), fill=BG, anchor="mm")
    icon.save(IMG / "apple-touch-icon.png", "PNG", optimize=True)
    print("ok")


if __name__ == "__main__":
    main()
