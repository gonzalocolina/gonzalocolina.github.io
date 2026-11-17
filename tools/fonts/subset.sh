#!/usr/bin/env bash
# Genera los subconjuntos WOFF2 de IBM Plex y Fraunces que usa la web (latín + flechas y signos usados en los textos).
# Requiere fonttools y brotli (pip install fonttools brotli).
set -euo pipefail
cd "$(dirname "$0")"
OUT=../../src/assets/fonts
U="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2190-2199,U+21B6,U+2212,U+2215,U+2248,U+2264-2265,U+2713,U+00D7"
python3 -m fontTools.varLib.instancer IBMPlexSans-Variable.ttf wght=400:600 wdth=100 -o /tmp/plex-sans-inst.$$.ttf
pyftsubset /tmp/plex-sans-inst.$$.ttf --unicodes="$U" --layout-features='kern,liga,calt,tnum,lnum,case' --flavor=woff2 --output-file=$OUT/plex-sans-var.woff2
rm /tmp/plex-sans-inst.$$.ttf
pyftsubset IBMPlexMono-Regular.ttf --unicodes="$U" --layout-features='kern,tnum' --flavor=woff2 --output-file=$OUT/plex-mono-400.woff2
pyftsubset IBMPlexMono-Medium.ttf --unicodes="$U" --layout-features='kern,tnum' --flavor=woff2 --output-file=$OUT/plex-mono-500.woff2
# Fraunces (titulares): tamaño óptico de cartel fijo (opsz 144), sin suavizado; la cursiva conserva sus formas "wonky".
for v in "Variable:fraunces-var:0" "Italic-Variable:fraunces-italic-var:1"; do
  IFS=: read -r src out wonk <<<"$v"
  python3 -m fontTools.varLib.instancer Fraunces-$src.ttf opsz=144 SOFT=0 WONK=$wonk wght=300:700 -o /tmp/fraunces.$$.ttf
  pyftsubset /tmp/fraunces.$$.ttf --unicodes="$U" --layout-features='kern,liga,calt,lnum,tnum' --flavor=woff2 --output-file=$OUT/$out.woff2
  rm /tmp/fraunces.$$.ttf
done
ls -la $OUT/*.woff2
