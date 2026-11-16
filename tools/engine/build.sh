#!/usr/bin/env bash
# Compila Optiline (NSCE) a WebAssembly para /jugar/ y deja nsce.js y nsce.wasm en src/assets/engine/.
#
# Es un build provisional mientras el build wasm oficial no esté en el repo Optiline. Parte de un commit
# fijo de Optiline y aplica dos parches:
#   1. experiments/20261116_wasm_speed_odds/wasm_simd128.patch (de Optiline): kernels NNUE con SIMD128.
#   2. tools/engine/sync-search.patch (de este repo): sin pthreads, `go` busca de forma síncrona y
#      Uci::command() es público para que web_main.cpp le pase una línea UCI por llamada.
#
# Uso: tools/engine/build.sh [ruta a Optiline] [commit]
set -euo pipefail

OPTILINE=${1:-$HOME/Optiline}
COMMIT=${2:-9cec21b}
NET=nets/nsceper1_simple1024_test80.bin
HERE=$(cd "$(dirname "$0")" && pwd)
OUT=$(cd "$HERE/../../src/assets/engine" && pwd)
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

# shellcheck disable=SC1091
source "${EMSDK:-$HOME/emsdk}/emsdk_env.sh" >/dev/null 2>&1

cd "$WORK"
git -C "$OPTILINE" archive "$COMMIT" engine | tar -x
git -C "$OPTILINE" show "$COMMIT:$NET" > net.bin 2>/dev/null || cp "$OPTILINE/$NET" net.bin
git apply "$OPTILINE/experiments/20261116_wasm_speed_odds/wasm_simd128.patch"
git apply "$HERE/sync-search.patch"
cp "$HERE/web_main.cpp" .

SRCS=$(ls engine/src/*.cpp | grep -v '/main.cpp$')
# shellcheck disable=SC2086
em++ -std=c++20 -O3 -flto -msimd128 -fwasm-exceptions -DNDEBUG '-DNSCE_VERSION="0.13.0-dev"' \
  -Iengine/include $SRCS web_main.cpp -o nsce.js \
  -sMODULARIZE=1 -sEXPORT_NAME=NSCE -sENVIRONMENT=worker,node \
  -sALLOW_MEMORY_GROWTH=1 -sINITIAL_MEMORY=67108864 -sSTACK_SIZE=4194304 \
  -sEXPORTED_FUNCTIONS=_main,_nsce_command -sEXPORTED_RUNTIME_METHODS=ccall -sEXIT_RUNTIME=0 \
  --embed-file net.bin@nets/nnue_trained.bin

cp nsce.js nsce.wasm "$OUT/"
{
  echo "optiline_commit=$(git -C "$OPTILINE" rev-parse "$COMMIT")"
  echo "net=$NET sha256=$(sha256sum net.bin | cut -d' ' -f1)"
  echo "patches=wasm_simd128.patch sync-search.patch"
  echo "emcc=$(em++ --version | head -1)"
  echo "wasm_sha256=$(sha256sum nsce.wasm | cut -d' ' -f1)"
  echo "built=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
} > "$OUT/VERSION"
cat "$OUT/VERSION"
