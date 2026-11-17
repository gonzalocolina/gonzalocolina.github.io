// /jugar/: partida contra Optiline en el navegador.
// chess.js lleva las reglas (jugadas legales, final de partida, PGN) y el motor corre en un Web Worker.

import { Chess } from "../vendor/chess.js";
import { Board } from "./board.js";

const lang = document.documentElement.lang === "en" ? "en" : "es";
const T = {
  es: {
    loading: "Cargando el motor…",
    loadError: "No se ha podido cargar el motor en este navegador.",
    yourTurn: "Te toca mover.",
    thinking: "Optiline está pensando…",
    youWin: "Jaque mate. Has ganado.",
    engineWins: "Jaque mate. Gana Optiline.",
    stalemate: "Tablas por ahogado.",
    repetition: "Tablas por triple repetición.",
    material: "Tablas por material insuficiente.",
    fifty: "Tablas por la regla de los 50 movimientos.",
    check: "Jaque.",
    copied: "PGN copiado",
    pieces: { K: "rey", Q: "dama", R: "torre", B: "alfil", N: "caballo", P: "peón" },
    colors: { w: "blanco", b: "negro" },
    empty: "vacía",
    you: "Tú",
    mate: (n) => `M${n}`,
    depth: "prof.",
    event: "Partida en gonzalocolina.github.io",
  },
  en: {
    loading: "Loading the engine…",
    loadError: "The engine could not be loaded in this browser.",
    yourTurn: "Your move.",
    thinking: "Optiline is thinking…",
    youWin: "Checkmate. You win.",
    engineWins: "Checkmate. Optiline wins.",
    stalemate: "Draw by stalemate.",
    repetition: "Draw by threefold repetition.",
    material: "Draw by insufficient material.",
    fifty: "Draw by the fifty-move rule.",
    check: "Check.",
    copied: "PGN copied",
    pieces: { K: "king", Q: "queen", R: "rook", B: "bishop", N: "knight", P: "pawn" },
    colors: { w: "white", b: "black" },
    empty: "empty",
    you: "You",
    mate: (n) => `M${n}`,
    depth: "depth",
    event: "Game on gonzalocolina.github.io",
  },
}[lang];

const LEVELS = {
  1: "go nodes 60",
  2: "go nodes 2000",
  3: "go movetime 500",
  4: "go movetime 2000",
};

const root = document.getElementById("play");
const $ = (sel) => root.querySelector(sel);
const statusEl = $(".play-status");
const evalText = $(".eval-score");
const infoDepth = $("[data-info=depth]");
const infoNps = $("[data-info=nps]");
const infoPv = $("[data-info=pv]");
const movesEl = $(".movelist");
const promo = $(".promo");
const btnUndo = $("[data-act=undo]");
const btnFlip = $("[data-act=flip]");
const btnCopy = $("[data-act=copy]");
const form = $(".play-setup");

const game = new Chess();
let userColor = "w";
let level = 3;
let selected = null;
let thinking = false;
let ready = false;
let worker = null;
let pendingEngineMove = false;

const store = {
  load() {
    try {
      return JSON.parse(localStorage.getItem("optiline-game") || "null");
    } catch {
      return null;
    }
  },
  save() {
    try {
      localStorage.setItem("optiline-game", JSON.stringify({ pgn: game.pgn(), userColor, level }));
    } catch {}
  },
};

// ------------------------------------------------------------ tablero

const board = new Board($(".board-host"), {
  interactive: true,
  onSquare: (sq, o) => onSquare(sq, o),
  canDrag: (sq) => canMoveNow() && game.get(sq)?.color === userColor,
  onDrop: (from, to) => tryMove(from, to),
});
board.el.setAttribute("aria-label", root.dataset.boardLabel || "");
board.relabel = () => {
  for (const [sq, el] of board.squares) {
    const p = game.get(sq);
    el.setAttribute("aria-label", p ? `${sq}, ${T.pieces[p.type.toUpperCase()]} ${T.colors[p.color]}` : `${sq}, ${T.empty}`);
  }
};

function kingSquare(color) {
  for (const row of game.board()) for (const p of row) if (p && p.type === "k" && p.color === color) return p.square;
  return null;
}

function render(lastMove, animate) {
  board.setPosition(game.fen(), animate ? lastMove : null, !animate);
  const targets = selected ? game.moves({ square: selected, verbose: true }) : [];
  board.highlight({
    last: lastMove ? [lastMove.from, lastMove.to] : undefined,
    check: game.isCheck() ? kingSquare(game.turn()) : undefined,
    selected: selected || undefined,
    targets: targets.filter((m) => !m.captured).map((m) => m.to),
    captures: targets.filter((m) => m.captured).map((m) => m.to),
  });
  renderMoves();
  btnUndo.disabled = thinking || game.history().length === 0;
}

function lastMove() {
  const h = game.history({ verbose: true });
  return h.length ? h[h.length - 1] : null;
}

function renderMoves() {
  const h = game.history();
  movesEl.innerHTML = "";
  for (let i = 0; i < h.length; i += 2) {
    const li = document.createElement("li");
    li.innerHTML = `<span class="w">${h[i]}</span>${h[i + 1] ? `<span class="b">${h[i + 1]}</span>` : ""}`;
    movesEl.append(li);
  }
  movesEl.scrollTop = movesEl.scrollHeight;
}

function setStatus(text) {
  statusEl.textContent = text;
}

function gameOverText() {
  if (game.isCheckmate()) return game.turn() === userColor ? T.engineWins : T.youWin;
  if (game.isStalemate()) return T.stalemate;
  if (game.isThreefoldRepetition()) return T.repetition;
  if (game.isInsufficientMaterial()) return T.material;
  if (game.isDrawByFiftyMoves()) return T.fifty;
  return null;
}

function updateStatus() {
  const over = gameOverText();
  if (over) return setStatus(over);
  if (!ready) return setStatus(T.loading);
  if (thinking) return setStatus(T.thinking);
  setStatus(game.isCheck() ? `${T.check} ${T.yourTurn}` : T.yourTurn);
}

const canMoveNow = () => ready && !thinking && !game.isGameOver() && game.turn() === userColor;

// ------------------------------------------------------------ jugadas del usuario

function onSquare(sq, opts = {}) {
  if (!canMoveNow()) return;
  const piece = game.get(sq);
  if (selected && !opts.dragStart && selected !== sq && tryMove(selected, sq)) return;
  if (piece && piece.color === userColor) selected = opts.dragStart || selected !== sq ? sq : null;
  else selected = null;
  render(lastMove(), false);
}

function tryMove(from, to) {
  if (!canMoveNow()) return false;
  const legal = game.moves({ square: from, verbose: true }).filter((m) => m.to === to);
  if (!legal.length) return false;
  if (legal.some((m) => m.promotion)) {
    askPromotion().then((p) => {
      if (p) commit({ from, to, promotion: p });
      else render(lastMove(), false);
    });
    return true;
  }
  commit({ from, to });
  return true;
}

function commit(move) {
  const m = game.move(move);
  selected = null;
  render(m, true);
  store.save();
  afterMove();
}

function askPromotion() {
  return new Promise((resolve) => {
    const done = (v) => {
      promo.close();
      resolve(v);
    };
    promo.querySelectorAll("button[data-p]").forEach((b) => {
      b.querySelector("use").setAttribute("href", `#p-${userColor}${b.dataset.p.toUpperCase()}`);
      b.onclick = () => done(b.dataset.p);
    });
    promo.oncancel = () => done(null);
    promo.showModal();
  });
}

function afterMove() {
  updateStatus();
  if (!game.isGameOver() && game.turn() !== userColor) engineMove();
}

// ------------------------------------------------------------ motor

function startWorker() {
  worker?.terminate();
  ready = false;
  thinking = false;
  updateStatus();
  worker = new Worker(root.dataset.worker);
  worker.onmessage = (e) => onEngine(String(e.data));
  worker.onerror = () => {
    setStatus(T.loadError);
    root.classList.add("is-error");
  };
  for (const cmd of ["uci", "setoption name Hash value 16", "setoption name UseExtras value false", "isready"]) worker.postMessage(cmd);
}

function engineMove() {
  if (!ready) {
    pendingEngineMove = true;
    return;
  }
  thinking = true;
  updateStatus();
  render(lastMove(), false);
  const moves = game.history({ verbose: true }).map((m) => m.lan);
  worker.postMessage(`position startpos${moves.length ? " moves " + moves.join(" ") : ""}`);
  worker.postMessage(LEVELS[level]);
}

function onEngine(line) {
  if (line.startsWith("__error")) {
    setStatus(T.loadError);
    root.classList.add("is-error");
    return;
  }
  if (line === "readyok") {
    ready = true;
    root.classList.add("is-ready");
    updateStatus();
    if (pendingEngineMove || (!game.isGameOver() && game.turn() !== userColor)) {
      pendingEngineMove = false;
      engineMove();
    }
    return;
  }
  if (line.startsWith("info ") && line.includes(" pv ")) return showInfo(line);
  if (line.startsWith("bestmove")) {
    const uci = line.split(" ")[1];
    thinking = false;
    if (uci && uci !== "0000") {
      const m = game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      render(m, true);
      store.save();
    }
    updateStatus();
    render(lastMove(), false);
  }
}

function showInfo(line) {
  const tok = line.split(" ");
  const get = (k) => tok[tok.indexOf(k) + 1];
  const engineColor = game.turn(); // el motor busca para el bando que mueve
  const sign = engineColor === "w" ? 1 : -1;
  if (tok.includes("depth")) infoDepth.textContent = get("depth");
  if (tok.includes("nps")) infoNps.textContent = Number(get("nps")).toLocaleString(lang);
  if (tok.includes("score")) {
    const kind = get("score");
    const val = Number(tok[tok.indexOf("score") + 2]);
    let text;
    if (kind === "mate") {
      const m = val * sign;
      text = (m > 0 ? "+" : "−") + T.mate(Math.abs(m));
    } else {
      const cp = val * sign;
      text = (cp > 0 ? "+" : cp < 0 ? "−" : "") + Math.abs(cp / 100).toFixed(2);
    }
    evalText.textContent = text;
  }
  const pv = tok.slice(tok.indexOf("pv") + 1, tok.indexOf("pv") + 9);
  const c = new Chess(game.fen());
  const san = [];
  for (const u of pv) {
    try {
      san.push(c.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u[4] }).san);
    } catch {
      break;
    }
  }
  infoPv.textContent = san.join(" ");
}

// ------------------------------------------------------------ controles

function newGame(color) {
  if (thinking) startWorker();
  game.reset();
  selected = null;
  userColor = color === "random" ? (Math.random() < 0.5 ? "w" : "b") : color;
  if ((board.orientation === "white") !== (userColor === "w")) board.flip();
  evalText.textContent = "0.00";
  infoDepth.textContent = infoNps.textContent = infoPv.textContent = "–";
  render(null, false);
  store.save();
  worker?.postMessage("ucinewgame");
  afterMove();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  level = Number(form.elements.level.value);
  newGame(form.elements.color.value);
});
form.elements.level.addEventListener("change", () => {
  level = Number(form.elements.level.value);
  store.save();
});

btnUndo.addEventListener("click", () => {
  if (thinking) return;
  game.undo();
  if (game.turn() !== userColor && game.history().length) game.undo();
  selected = null;
  render(lastMove(), false);
  store.save();
  updateStatus();
});
btnFlip.addEventListener("click", () => board.flip());
btnCopy.addEventListener("click", async () => {
  const c = new Chess();
  c.loadPgn(game.pgn());
  c.setHeader("Event", T.event);
  c.setHeader("Date", new Date().toISOString().slice(0, 10).replace(/-/g, "."));
  c.setHeader("White", userColor === "w" ? T.you : "Optiline");
  c.setHeader("Black", userColor === "b" ? T.you : "Optiline");
  try {
    await navigator.clipboard.writeText(c.pgn());
    btnCopy.dataset.done = T.copied;
    setTimeout(() => delete btnCopy.dataset.done, 2000);
  } catch {}
});

// ------------------------------------------------------------ arranque

const saved = store.load();
if (saved?.pgn) {
  try {
    game.loadPgn(saved.pgn);
    userColor = saved.userColor === "b" ? "b" : "w";
    level = LEVELS[saved.level] ? saved.level : 3;
  } catch {
    game.reset();
  }
}
form.elements.level.value = String(level);
form.elements.color.value = userColor === "w" ? "w" : "b";
if (userColor === "b") board.flip();
render(lastMove(), false);
updateStatus();
startWorker();
