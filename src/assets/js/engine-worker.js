// Web Worker con Optiline (NSCE) compilado a WebAssembly.
// Recibe una orden UCI por mensaje y devuelve cada línea de salida del motor como un mensaje.
// `go` es síncrono dentro del worker (no hay pthreads en GitHub Pages), así que las órdenes que lleguen
// durante una búsqueda esperan en la cola; las líneas `info` sí llegan a la página en directo.

/* global NSCE, importScripts */
const params = new URL(self.location.href).searchParams;
const version = params.get("v") || "";
importScripts(`/assets/engine/nsce.js?v=${version}`);

let mod = null;
const queue = [];
const run = (cmd) => mod.ccall("nsce_command", null, ["string"], [cmd]);

NSCE({
  locateFile: (file) => `/assets/engine/${file}?v=${version}`,
  print: (line) => postMessage(line),
  printErr: () => {},
})
  .then((m) => {
    mod = m;
    postMessage("__ready");
    for (const cmd of queue.splice(0)) run(cmd);
  })
  .catch((err) => postMessage(`__error ${err && err.message ? err.message : err}`));

self.onmessage = (e) => (mod ? run(e.data) : queue.push(e.data));
