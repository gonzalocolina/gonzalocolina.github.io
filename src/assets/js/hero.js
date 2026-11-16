// Portada: reproduce la victoria de Optiline contra Stockfish 18 sin límite.

import { Board } from "./board.js";

const fig = document.querySelector(".hero-game");
const data = JSON.parse(document.getElementById("data-hero-game")?.textContent || "null");

if (fig && data) {
  const board = new Board(fig.querySelector(".board-host"), { coords: false });
  const label = fig.querySelector(".hero-game__move");
  const playBtn = fig.querySelector("[data-act=play]");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const startMove = Number(data.startFen.split(" ")[5]);
  const startWhite = data.startFen.split(" ")[1] === "w";
  const [txtPlay, txtPause] = [playBtn.dataset.play, playBtn.dataset.pause];
  const icon = (d) => `<svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="${d}"/></svg>`;
  const ICON_PLAY = icon("M4 2.5v11l9-5.5z");
  const ICON_PAUSE = icon("M4 2.5h3v11H4zM9 2.5h3v11H9z");

  let ply = 0;
  let timer = null;
  let visible = true;
  let wanted = !reduced;

  const moveText = (i) => {
    if (i === 0) return "—";
    const idx = i - 1 + (startWhite ? 0 : 1);
    const n = startMove + Math.floor(idx / 2);
    return idx % 2 === 0 ? `${n}. ${data.san[i - 1]}` : `${n}… ${data.san[i - 1]}`;
  };

  const show = (i, animate) => {
    const prev = ply;
    ply = i;
    const uci = data.uci[i - 1];
    const move = animate && i === prev + 1 && uci ? { from: uci.slice(0, 2), to: uci.slice(2, 4) } : null;
    board.setPosition(data.frames[i], move, !move);
    board.highlight(uci ? { last: [uci.slice(0, 2), uci.slice(2, 4)] } : {});
    label.textContent = i === data.frames.length - 1 ? `${moveText(i)}  ${data.result}` : moveText(i);
  };

  const tick = () => {
    if (ply < data.frames.length - 1) {
      show(ply + 1, true);
      timer = setTimeout(tick, ply === data.frames.length - 1 ? 4000 : 950);
    } else {
      show(0, false);
      timer = setTimeout(tick, 900);
    }
  };
  const sync = () => {
    clearTimeout(timer);
    timer = null;
    const run = wanted && visible && !document.hidden;
    if (run) timer = setTimeout(tick, 700);
    playBtn.innerHTML = wanted ? ICON_PAUSE : ICON_PLAY;
    playBtn.setAttribute("aria-label", wanted ? txtPause : txtPlay);
    playBtn.setAttribute("aria-pressed", String(wanted));
  };

  fig.querySelector("[data-act=prev]").addEventListener("click", () => {
    wanted = false;
    sync();
    show(Math.max(0, ply - 1), false);
  });
  fig.querySelector("[data-act=next]").addEventListener("click", () => {
    wanted = false;
    sync();
    show(Math.min(data.frames.length - 1, ply + 1), true);
  });
  playBtn.addEventListener("click", () => {
    wanted = !wanted;
    sync();
  });
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    sync();
  }).observe(fig);
  document.addEventListener("visibilitychange", sync);

  show(reduced ? data.frames.length - 1 : 0, false);
  sync();
}
