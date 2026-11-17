// /jugar/: partida contra Optiline en el navegador.
// chess.js lleva las reglas (jugadas legales, final de partida, PGN) y el motor corre en un Web Worker.

import { Chess } from "../vendor/chess.js";
import { Board } from "./board.js";

const lang = document.documentElement.lang === "en" ? "en" : "es";
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const T = {
  es: {
    loading: "Cargando el motor…",
    loadError: "No se ha podido cargar el motor en este navegador.",
    yourTurn: "Te toca mover.",
    thinking: "Optiline está pensando…",
    thinkingShort: "pensando",
    youWin: "Jaque mate. Has ganado.",
    engineWins: "Jaque mate. Gana Optiline.",
    stalemate: "Tablas por ahogado.",
    repetition: "Tablas por triple repetición.",
    material: "Tablas por material insuficiente.",
    fifty: "Tablas por la regla de los 50 movimientos.",
    check: "Jaque.",
    reviewing: (n, total) => `Viendo la jugada ${n} de ${total}. Pulsa el tablero para volver a la posición actual.`,
    copied: "PGN copiado",
    pieces: { K: "rey", Q: "dama", R: "torre", B: "alfil", N: "caballo", P: "peón" },
    colors: { w: "blanco", b: "negro" },
    empty: "vacía",
    you: "Tú",
    level: (n) => `nivel ${n}`,
    mate: (n) => `M${n}`,
    event: "Partida en gonzalocolina.github.io",
    result: {
      win: "Has ganado",
      loss: "Gana Optiline",
      draw: "Tablas",
      winText: (n) => `Has dado jaque mate a Optiline en ${plural(n, "jugada", "jugadas")}.`,
      lossText: (n) => `Optiline te ha dado jaque mate en ${plural(n, "jugada", "jugadas")}.`,
      stalemate: "Ahogado: al bando que mueve no le queda ninguna jugada legal, pero su rey no está en jaque.",
      repetition: "La misma posición se ha repetido tres veces.",
      material: "No queda material suficiente para dar jaque mate.",
      fifty: "Cincuenta jugadas seguidas sin capturas ni movimientos de peón.",
    },
    reason: {
      mate: "Jaque mate",
      stalemate: "Ahogado",
      repetition: "Triple repetición",
      material: "Material insuficiente",
      fifty: "Regla de los 50 movimientos",
    },
  },
  en: {
    loading: "Loading the engine…",
    loadError: "The engine could not be loaded in this browser.",
    yourTurn: "Your move.",
    thinking: "Optiline is thinking…",
    thinkingShort: "thinking",
    youWin: "Checkmate. You win.",
    engineWins: "Checkmate. Optiline wins.",
    stalemate: "Draw by stalemate.",
    repetition: "Draw by threefold repetition.",
    material: "Draw by insufficient material.",
    fifty: "Draw by the fifty-move rule.",
    check: "Check.",
    reviewing: (n, total) => `Viewing move ${n} of ${total}. Tap the board to return to the current position.`,
    copied: "PGN copied",
    pieces: { K: "king", Q: "queen", R: "rook", B: "bishop", N: "knight", P: "pawn" },
    colors: { w: "white", b: "black" },
    empty: "empty",
    you: "You",
    level: (n) => `level ${n}`,
    mate: (n) => `M${n}`,
    event: "Game on gonzalocolina.github.io",
    result: {
      win: "You win",
      loss: "Optiline wins",
      draw: "Draw",
      winText: (n) => `You checkmated Optiline in ${plural(n, "move", "moves")}.`,
      lossText: (n) => `Optiline checkmated you in ${plural(n, "move", "moves")}.`,
      stalemate: "Stalemate: the side to move has no legal moves, but its king is not in check.",
      repetition: "The same position has occurred three times.",
      material: "Neither side has enough material left to checkmate.",
      fifty: "Fifty moves in a row without a capture or a pawn move.",
    },
    reason: {
      mate: "Checkmate",
      stalemate: "Stalemate",
      repetition: "Threefold repetition",
      material: "Insufficient material",
      fifty: "Fifty-move rule",
    },
  },
}[lang];

const LEVELS = {
  1: "go nodes 60",
  2: "go nodes 2000",
  3: "go movetime 500",
  4: "go movetime 2000",
};
const VALUE = { q: 9, r: 5, b: 3, n: 3, p: 1 };

const root = document.getElementById("play");
const $ = (sel) => root.querySelector(sel);
const statusEl = $(".play-status");
const evalText = $(".eval-score");
const infoDepth = $("[data-info=depth]");
const infoNps = $("[data-info=nps]");
const infoPv = $("[data-info=pv]");
const movesEl = $(".movelist");
const promo = $(".promo");
const resultEl = $(".result");
const players = { top: $(".player[data-side=top]"), bottom: $(".player[data-side=bottom]") };
const btnUndo = $("[data-act=undo]");
const btnFlip = $("[data-act=flip]");
const btnCopy = $("[data-act=copy]");
const nav = {
  first: $("[data-nav=first]"),
  prev: $("[data-nav=prev]"),
  next: $("[data-nav=next]"),
  last: $("[data-nav=last]"),
};
const form = $(".play-setup");

const game = new Chess();
let userColor = "w";
let level = 3;
let selected = null;
let thinking = false;
let ready = false;
let worker = null;
let pendingEngineMove = false;
let viewPly = null; // null = posición actual; un número = revisando la partida en esa media jugada
let resultHidden = false; // el usuario ha cerrado el aviso de final para ver el tablero

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
  onDrop: (from, to) => {
    const ok = tryMove(from, to);
    if (!ok && game.isCheck()) board.flash(kingSquare(game, userColor));
    return ok;
  },
});
board.el.setAttribute("aria-label", root.dataset.boardLabel || "");
let shown = game; // posición que se ve (la actual o una anterior al revisar)
board.relabel = () => {
  for (const [sq, el] of board.squares) {
    const p = shown.get(sq);
    el.setAttribute("aria-label", p ? `${sq}, ${T.pieces[p.type.toUpperCase()]} ${T.colors[p.color]}` : `${sq}, ${T.empty}`);
  }
};

function kingSquare(pos, color) {
  for (const row of pos.board()) for (const p of row) if (p && p.type === "k" && p.color === color) return p.square;
  return null;
}

// Cómo ha terminado la partida, o null si sigue.
function outcome() {
  if (!game.isGameOver()) return null;
  if (game.isCheckmate()) return { winner: game.turn() === "w" ? "b" : "w", reason: "mate" };
  if (game.isStalemate()) return { winner: null, reason: "stalemate" };
  if (game.isThreefoldRepetition()) return { winner: null, reason: "repetition" };
  if (game.isInsufficientMaterial()) return { winner: null, reason: "material" };
  return { winner: null, reason: "fifty" };
}
const scoreText = (o) => (o.winner === "w" ? "1–0" : o.winner === "b" ? "0–1" : "½–½");

function render(anim = null) {
  const hist = game.history({ verbose: true });
  const live = viewPly === null;
  const ply = live ? hist.length : viewPly;
  const fen = ply ? hist[ply - 1].after : hist.length ? hist[0].before : game.fen();
  const last = ply ? hist[ply - 1] : null;
  shown = live ? game : new Chess(fen);
  board.setPosition(fen, anim, !anim);

  const over = live ? outcome() : null;
  const targets = live && selected ? game.moves({ square: selected, verbose: true }) : [];
  const toMove = shown.turn();
  const badges = {};
  if (over) {
    const wk = kingSquare(game, "w");
    const bk = kingSquare(game, "b");
    if (over.winner) {
      badges[over.winner === "w" ? wk : bk] = "win";
      badges[over.winner === "w" ? bk : wk] = "mate";
    } else badges[wk] = badges[bk] = "draw";
  }
  board.highlight({
    last: last ? [last.from, last.to] : undefined,
    check: shown.isCheck() ? kingSquare(shown, toMove) : undefined,
    mate: over?.reason === "mate" ? kingSquare(game, toMove) : undefined,
    selected: selected || undefined,
    targets: targets.filter((m) => !m.captured).map((m) => m.to),
    captures: targets.filter((m) => m.captured).map((m) => m.to),
    badges,
  });

  renderMoves(hist, ply);
  renderPlayers(fen);
  renderResult();
  for (const [k, b] of Object.entries(nav)) b.disabled = k === "first" || k === "prev" ? ply === 0 : ply === hist.length;
  btnUndo.disabled = thinking || hist.length === 0;
  root.classList.toggle("is-reviewing", !live);
  const final = outcome();
  root.classList.toggle("is-over", !!final);
  if (final) evalText.textContent = scoreText(final);
}

function lastMove() {
  const h = game.history({ verbose: true });
  return h.length ? h[h.length - 1] : null;
}

function renderMoves(hist, ply) {
  movesEl.innerHTML = "";
  for (let i = 0; i < hist.length; i += 2) {
    const li = document.createElement("li");
    li.innerHTML = `<span class="n">${i / 2 + 1}.</span>`;
    for (const j of [i, i + 1]) {
      if (!hist[j]) break;
      const b = document.createElement("button");
      b.type = "button";
      b.tabIndex = -1;
      b.className = "mv" + (j + 1 === ply ? " is-current" : "");
      b.dataset.ply = String(j + 1);
      b.textContent = hist[j].san;
      if (j + 1 === ply) b.setAttribute("aria-current", "true");
      li.append(b);
    }
    movesEl.append(li);
  }
  const over = outcome();
  if (over) {
    const li = document.createElement("li");
    li.className = "movelist__result";
    li.innerHTML = `<b>${scoreText(over)}</b><span>${T.reason[over.reason]}</span>`;
    movesEl.append(li);
  }
  const cur = movesEl.querySelector(".is-current");
  if (viewPly === null || !cur) movesEl.scrollTop = movesEl.scrollHeight;
  else cur.scrollIntoView({ block: "nearest" });
}

// Barras de jugador encima y debajo del tablero: quién es, a quién le toca y la ventaja de material.
function renderPlayers(fen) {
  const count = { w: { q: 0, r: 0, b: 0, n: 0, p: 0 }, b: { q: 0, r: 0, b: 0, n: 0, p: 0 } };
  for (const ch of fen.split(" ")[0]) {
    const t = ch.toLowerCase();
    if (t in VALUE) count[ch === t ? "b" : "w"][t]++;
  }
  let diff = 0;
  for (const t in VALUE) diff += (count.w[t] - count.b[t]) * VALUE[t];
  const over = outcome();
  const bottom = board.orientation === "white" ? "w" : "b";
  for (const [side, el] of Object.entries(players)) {
    const color = side === "bottom" ? bottom : bottom === "w" ? "b" : "w";
    const opp = color === "w" ? "b" : "w";
    const isUser = color === userColor;
    let caps = "";
    for (const t in VALUE) {
      const n = count[color][t] - count[opp][t];
      if (n <= 0) continue;
      caps += `<span class="cap">${`<svg viewBox="0 0 45 45"><use href="#p-${opp}${t.toUpperCase()}"></use></svg>`.repeat(n)}</span>`;
    }
    const adv = color === "w" ? diff : -diff;
    let tag = "";
    if (over) tag = `<b class="player__score">${over.winner ? (over.winner === color ? "1" : "0") : "½"}</b>`;
    else if (thinking && !isUser) tag = `<span class="player__thinking">${T.thinkingShort}<i></i><i></i><i></i></span>`;
    el.innerHTML =
      `<span class="player__icon" aria-hidden="true"><svg viewBox="0 0 45 45"><use href="#p-${color}K"></use></svg></span>` +
      `<span class="player__name">${isUser ? T.you : "Optiline"}${isUser ? "" : `<small>${T.level(level)}</small>`}</span>` +
      `<span class="player__caps" aria-hidden="true">${caps}${adv > 0 ? `<span class="player__adv">+${adv}</span>` : ""}</span>` +
      tag;
    el.classList.toggle("is-turn", !over && ready && game.turn() === color);
    el.classList.toggle("is-winner", !!over && over.winner === color);
    el.classList.toggle("is-loser", !!over && !!over.winner && over.winner !== color);
  }
}

// Aviso sobre el tablero cuando la partida termina.
function renderResult() {
  const over = viewPly === null ? outcome() : null;
  const show = !!over && !resultHidden;
  if (!show) {
    resultEl.hidden = true;
    return;
  }
  const n = Math.ceil(game.history().length / 2);
  const userWon = over.winner === userColor;
  resultEl.dataset.outcome = over.winner ? (userWon ? "win" : "loss") : "draw";
  const king = (c, down) => `<span${down ? ' class="is-down"' : ""}><svg viewBox="0 0 45 45"><use href="#p-${c}K"></use></svg></span>`;
  $(".result__kings").innerHTML = king("w", over.winner === "b") + king("b", over.winner === "w");
  $(".result__score").textContent = scoreText(over);
  $(".result__title").textContent = over.winner ? (userWon ? T.result.win : T.result.loss) : T.result.draw;
  $(".result__text").textContent = over.winner ? (userWon ? T.result.winText(n) : T.result.lossText(n)) : T.result[over.reason];
  resultEl.hidden = false;
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
  if (viewPly !== null) return setStatus(T.reviewing(viewPly, game.history().length));
  const over = gameOverText();
  if (over) return setStatus(over);
  if (!ready) return setStatus(T.loading);
  if (thinking) return setStatus(T.thinking);
  setStatus(game.isCheck() ? `${T.check} ${T.yourTurn}` : T.yourTurn);
}

const canMoveNow = () => ready && !thinking && viewPly === null && !game.isGameOver() && game.turn() === userColor;

// ------------------------------------------------------------ revisar la partida

function goTo(ply) {
  const total = game.history().length;
  ply = Math.max(0, Math.min(total, ply));
  const cur = viewPly ?? total;
  if (ply === cur) return;
  const hist = game.history({ verbose: true });
  viewPly = ply === total ? null : ply;
  selected = null;
  render(ply === cur + 1 ? hist[ply - 1] : null);
  updateStatus();
}

nav.first.addEventListener("click", () => goTo(0));
nav.prev.addEventListener("click", () => goTo((viewPly ?? game.history().length) - 1));
nav.next.addEventListener("click", () => goTo((viewPly ?? game.history().length) + 1));
nav.last.addEventListener("click", () => goTo(Infinity));
movesEl.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-ply]");
  if (b) goTo(Number(b.dataset.ply));
});
// Flechas izquierda/derecha para recorrer la partida, salvo cuando el foco está en el tablero o en un control.
document.addEventListener("keydown", (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey || promo.open) return;
  if (e.key === "Escape" && !resultEl.hidden) return hideResult();
  if (e.target.closest?.(".board, input, select, textarea")) return;
  const step = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
  if (!step) return;
  e.preventDefault();
  goTo((viewPly ?? game.history().length) + step);
});

function hideResult() {
  resultHidden = true;
  renderResult();
}

// ------------------------------------------------------------ jugadas del usuario

function onSquare(sq, opts = {}) {
  if (viewPly !== null) return goTo(Infinity);
  if (!canMoveNow()) return;
  const piece = game.get(sq);
  if (selected && !opts.dragStart && selected !== sq && tryMove(selected, sq)) return;
  if (piece && piece.color === userColor) {
    selected = opts.dragStart || selected !== sq ? sq : null;
    // En jaque, una pieza que no puede resolverlo no tiene jugadas: se señala el rey para que se entienda por qué.
    if (selected && game.isCheck() && !game.moves({ square: sq }).length) board.flash(kingSquare(game, userColor));
  } else {
    if (selected && game.isCheck()) board.flash(kingSquare(game, userColor));
    selected = null;
  }
  render();
}

function tryMove(from, to) {
  if (!canMoveNow()) return false;
  const moves = game.moves({ square: from, verbose: true });
  let legal = moves.filter((m) => m.to === to);
  // Enroque pulsando el rey y luego su torre.
  const p = game.get(from);
  const q = game.get(to);
  if (!legal.length && p?.type === "k" && q?.type === "r" && q.color === p.color)
    legal = moves.filter((m) => m.flags.includes(to[0] > from[0] ? "k" : "q"));
  if (!legal.length) return false;
  const dest = legal[0].to;
  if (legal.some((m) => m.promotion)) {
    askPromotion().then((piece) => {
      if (piece) commit({ from, to: dest, promotion: piece });
      else render();
    });
    return true;
  }
  commit({ from, to: dest });
  return true;
}

function commit(move) {
  const m = game.move(move);
  selected = null;
  render(m);
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
  render();
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
    render();
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
    let m = null;
    if (uci && uci !== "0000" && uci !== "(none)") {
      try {
        m = game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      } catch {}
    }
    viewPly = null;
    render(m);
    if (m) store.save();
    updateStatus();
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
  viewPly = null;
  resultHidden = false;
  userColor = color === "random" ? (Math.random() < 0.5 ? "w" : "b") : color;
  if ((board.orientation === "white") !== (userColor === "w")) board.flip();
  evalText.textContent = "0.00";
  infoDepth.textContent = infoNps.textContent = infoPv.textContent = "–";
  render();
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
  render();
});

btnUndo.addEventListener("click", () => {
  if (thinking) return;
  if (game.isGameOver()) evalText.textContent = "–";
  game.undo();
  if (game.turn() !== userColor && game.history().length) game.undo();
  selected = null;
  viewPly = null;
  resultHidden = false;
  render();
  store.save();
  updateStatus();
});
btnFlip.addEventListener("click", () => {
  board.flip();
  render();
});
btnCopy.addEventListener("click", async () => {
  const c = new Chess();
  c.loadPgn(game.pgn());
  c.setHeader("Event", T.event);
  c.setHeader("Date", new Date().toISOString().slice(0, 10).replace(/-/g, "."));
  c.setHeader("White", userColor === "w" ? T.you : "Optiline");
  c.setHeader("Black", userColor === "b" ? T.you : "Optiline");
  const over = outcome();
  c.setHeader("Result", over ? scoreText(over).replace(/–/g, "-").replace(/½/g, "1/2") : "*");
  try {
    await navigator.clipboard.writeText(c.pgn());
    btnCopy.dataset.done = T.copied;
    setTimeout(() => delete btnCopy.dataset.done, 2000);
  } catch {}
});
$("[data-act=again]").addEventListener("click", () => form.requestSubmit());
$("[data-act=review]").addEventListener("click", hideResult);
resultEl.addEventListener("click", (e) => {
  if (e.target === resultEl) hideResult();
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
render();
updateStatus();
startWorker();
