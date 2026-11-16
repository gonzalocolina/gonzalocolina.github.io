#!/usr/bin/env python3
"""Genera los gráficos SVG de la web (src/partials/chart-*.html) a partir de datos medidos.

Datos:
  - Optiline: experiments/20261114_simple1024_test80_elo/report.md (200 partidas por escalón, 100 ms/jugada).
  - RoadSignAI: docs/results.md (test oficial GTSDB, GTX 1650 Laptop, FPS en PyTorch FP32).

Uso: python3 tools/charts.py
"""
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "src" / "partials"

LADDER = [  # (etiqueta es, etiqueta en, elo, error, partidas)
    ("SF18 · 2600", "SF18 · 2600", 603.9, 155.7, "192-4-4"),
    ("SF18 · 2900", "SF18 · 2900", 125.0, 42.9, "109-51-40"),
    ("SF18 · 3190 (máx.)", "SF18 · 3190 (max)", -40.1, 37.3, "52-73-75"),
    ("SF18 sin límite", "SF18 unlimited", -322.7, 64.4, "1-25-74"),
]

DETECTORS = [  # (nombre, fps, mAP50, mejor)
    ("YOLO11s · 640", 73, 0.626, True),
    ("YOLO11n · 640", 117, 0.417, False),
    ("YOLO26n · 640", 110, 0.406, False),
    ("YOLO11n · 960", 81, 0.454, False),
]


def num(v, lang, digits=0):
    s = f"{v:.{digits}f}"
    return s.replace(".", ",") if lang == "es" else s


def ladder(lang):
    W, left, right = 480, 132, 470
    lo, hi = -450, 1000
    x = lambda v: left + (v - lo) / (hi - lo) * (right - left)
    row_h, top = 40, 18
    out = [
        f'<svg viewBox="0 0 {W} {top + row_h * len(LADDER) + 34}" role="img" aria-labelledby="ladder-t-{lang}">',
        f'<title id="ladder-t-{lang}">'
        + ("Diferencia de Elo de Optiline contra cada escalón de Stockfish 18" if lang == "es" else "Optiline's Elo difference against each Stockfish 18 rung")
        + "</title>",
        '<g class="grid">',
    ]
    for v in (-400, 0, 400, 800):
        out.append(f'<line x1="{x(v):.1f}" x2="{x(v):.1f}" y1="{top - 8}" y2="{top + row_h * len(LADDER) - 6}"' + (' style="stroke:var(--line-strong)"' if v == 0 else "") + "/>")
    out.append("</g><g class=\"axis\">")
    for v in (-400, 0, 400, 800):
        label = ("+" if v > 0 else "−" if v < 0 else "") + num(abs(v), lang)
        out.append(f'<text x="{x(v):.1f}" y="{top + row_h * len(LADDER) + 10}" text-anchor="middle">{label}</text>')
    out.append(
        f'<text class="axis-title" x="{x(0):.1f}" y="{top + row_h * len(LADDER) + 28}" text-anchor="middle">'
        + ("Elo de Optiline respecto al rival (± IC 95 %)" if lang == "es" else "Optiline's Elo vs. the opponent (± 95% CI)")
        + "</text></g>"
    )
    for i, (es, en, elo, err, wdl) in enumerate(LADDER):
        cy = top + i * row_h + 12
        name = es if lang == "es" else en
        x0, x1 = sorted((x(0), x(elo)))
        cls = "bar--pos" if elo > 0 else "bar--neg"
        sign = "+" if elo > 0 else "−"
        val = f"{sign}{num(abs(elo), lang)} ± {num(err, lang)}"
        tip = f"{name}: {val} Elo · {wdl} ({'V-T-D' if lang == 'es' else 'W-D-L'})"
        out.append(f'<g class="pt" tabindex="0"><title>{tip}</title>')
        out.append(f'<text class="label" x="{left - 12}" y="{cy + 4}" text-anchor="end">{name}</text>')
        out.append(f'<rect class="bar {cls}" x="{x0:.1f}" y="{cy - 9}" width="{max(x1 - x0, 2):.1f}" height="18" rx="3"/>')
        a, b = x(elo - err), x(elo + err)
        out.append(f'<path class="whisker" d="M{a:.1f} {cy}H{b:.1f}M{a:.1f} {cy - 5}V{cy + 5}M{b:.1f} {cy - 5}V{cy + 5}"/>')
        # Positivos: a la derecha del bigote. Negativos: a la derecha del cero, donde no hay barra.
        tx = b + 6 if elo > 0 else x(0) + 6
        anchor = "start"
        out.append(f'<text class="value" x="{tx:.1f}" y="{cy + 4}" text-anchor="{anchor}">{val}</text></g>')
    out.append("</svg>")
    return "\n".join(out)


def scatter(lang):
    W, H = 560, 330
    L, R, T, B = 52, 540, 18, 272
    fx = lambda f: L + (f - 60) / (125 - 60) * (R - L)
    fy = lambda m: T + (0.66 - m) / (0.66 - 0.36) * (B - T)
    out = [
        f'<svg viewBox="0 0 {W} {H}" role="img" aria-labelledby="sc-t-{lang}">',
        f'<title id="sc-t-{lang}">'
        + ("Precisión (mAP50) frente a velocidad (FPS) de cuatro detectores" if lang == "es" else "Accuracy (mAP50) versus speed (FPS) of four detectors")
        + "</title>",
        '<g class="grid">',
    ]
    for m in (0.40, 0.45, 0.50, 0.55, 0.60, 0.65):
        out.append(f'<line x1="{L}" x2="{R}" y1="{fy(m):.1f}" y2="{fy(m):.1f}"/>')
    out.append('</g><g class="axis">')
    for m in (0.40, 0.45, 0.50, 0.55, 0.60, 0.65):
        out.append(f'<text x="{L - 8}" y="{fy(m) + 4:.1f}" text-anchor="end">{num(m, lang, 2)}</text>')
    for f in (60, 70, 80, 90, 100, 110, 120):
        out.append(f'<text x="{fx(f):.1f}" y="{B + 18}" text-anchor="middle">{f}</text>')
    out.append(
        f'<text class="axis-title" x="{(L + R) / 2:.1f}" y="{B + 40}" text-anchor="middle">'
        + ("FPS en GTX 1650 de portátil (más es mejor)" if lang == "es" else "FPS on a laptop GTX 1650 (higher is better)")
        + "</text>"
    )
    out.append(
        f'<text class="axis-title" x="{L - 44}" y="{T - 2}" text-anchor="start">'
        + ("mAP50 en test GTSDB ↑" if lang == "es" else "mAP50 on GTSDB test ↑")
        + "</text></g>"
    )
    place = {
        "YOLO11s · 640": (14, 4, "start"),
        "YOLO11n · 640": (0, -30, "middle"),
        "YOLO26n · 640": (0, 26, "middle"),
        "YOLO11n · 960": (14, 4, "start"),
    }
    for name, fps, m, best in DETECTORS:
        cx, cy = fx(fps), fy(m)
        dx, dy, anchor = place[name]
        tip = f"{name}: mAP50 {num(m, lang, 3)} · {fps} FPS"
        out.append(f'<g class="pt" tabindex="0"><title>{tip}</title>')
        out.append(f'<circle class="dot{" dot--best" if best else ""}" cx="{cx:.1f}" cy="{cy:.1f}" r="6.5"/>')
        out.append(f'<text class="label" x="{cx + dx:.1f}" y="{cy + dy:.1f}" text-anchor="{anchor}">{name}</text>')
        sub = f"{num(m, lang, 3)} · {fps} FPS"
        out.append(f'<text class="sub" x="{cx + dx:.1f}" y="{cy + dy + 14:.1f}" text-anchor="{anchor}">{sub}</text></g>')
    out.append("</svg>")
    return "\n".join(out)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for lang in ("es", "en"):
        (OUT / f"chart-ladder-{lang}.html").write_text(ladder(lang) + "\n", encoding="utf-8")
        (OUT / f"chart-roadsignai-{lang}.html").write_text(scatter(lang) + "\n", encoding="utf-8")
    print("ok")
