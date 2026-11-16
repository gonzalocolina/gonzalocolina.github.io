// Tablero de ajedrez en HTML: 64 casillas en una rejilla y piezas posicionadas encima.
// Lo usan la partida de la portada (solo lectura) y /jugar/ (clic, arrastre y teclado).
// Las piezas son <use> de los símbolos #p-wK… que la página incluye en línea.

const FILES = "abcdefgh";

export function parsePlacement(fen) {
  const map = new Map();
  const rows = fen.split(" ")[0].split("/");
  rows.forEach((row, i) => {
    let f = 0;
    for (const ch of row) {
      if (/\d/.test(ch)) f += Number(ch);
      else {
        const color = ch === ch.toUpperCase() ? "w" : "b";
        map.set(FILES[f] + (8 - i), color + ch.toUpperCase());
        f++;
      }
    }
  });
  return map;
}

export class Board {
  constructor(el, opts = {}) {
    this.el = el;
    this.opts = opts;
    this.orientation = opts.orientation || "white";
    this.pieces = new Map(); // casilla -> { el, code }
    this.squares = new Map(); // casilla -> elemento
    this.el.classList.add("board");
    this.buildSquares();
    if (opts.interactive) this.bindInteraction();
  }

  coords(sq) {
    const f = FILES.indexOf(sq[0]);
    const r = Number(sq[1]) - 1;
    return this.orientation === "white" ? { col: f, row: 7 - r } : { col: 7 - f, row: r };
  }

  squareAt(col, row) {
    if (col < 0 || col > 7 || row < 0 || row > 7) return null;
    return this.orientation === "white" ? FILES[col] + (8 - row) : FILES[7 - col] + (row + 1);
  }

  buildSquares() {
    for (const s of this.squares.values()) s.remove();
    for (const c of this.el.querySelectorAll(".coord")) c.remove();
    this.squares.clear();
    const tag = this.opts.interactive ? "button" : "div";
    for (let row = 0; row < 8; row++)
      for (let col = 0; col < 8; col++) {
        const sq = this.squareAt(col, row);
        const s = document.createElement(tag);
        if (tag === "button") {
          s.type = "button";
          s.tabIndex = -1;
        }
        s.className = "sq" + ((FILES.indexOf(sq[0]) + Number(sq[1])) % 2 === 0 ? " dark" : "");
        s.dataset.sq = sq;
        s.style.gridArea = `${row + 1} / ${col + 1}`;
        this.el.append(s);
        this.squares.set(sq, s);
        // Las coordenadas van fuera de las casillas para que no formen parte de su nombre accesible.
        if (this.opts.coords !== false) {
          const dark = s.classList.contains("dark") ? " on-dark" : "";
          if (row === 7) this.addCoord(sq[0], "file" + dark, row, col);
          if (col === 0) this.addCoord(sq[1], "rank" + dark, row, col);
        }
      }
    if (this.opts.interactive) {
      const first = this.squares.get(this.orientation === "white" ? "e2" : "e7");
      first.tabIndex = 0;
      this.focusSq = first.dataset.sq;
    }
  }

  addCoord(text, kind, row, col) {
    const c = document.createElement("span");
    c.className = `coord coord--${kind}`;
    c.setAttribute("aria-hidden", "true");
    c.textContent = text;
    c.style.gridArea = `${row + 1} / ${col + 1}`;
    this.el.append(c);
  }

  flip() {
    this.orientation = this.orientation === "white" ? "black" : "white";
    const keep = this.highlights;
    this.buildSquares();
    for (const [sq, p] of this.pieces) this.place(p.el, sq, true);
    if (keep) this.highlight(keep);
    this.relabel?.();
  }

  makePiece(code) {
    const el = document.createElement("div");
    el.className = "piece no-anim";
    el.innerHTML = `<svg viewBox="0 0 45 45" aria-hidden="true"><use href="#p-${code}"></use></svg>`;
    this.el.append(el);
    return { el, code };
  }

  place(el, sq, instant) {
    const { col, row } = this.coords(sq);
    if (instant) el.classList.add("no-anim");
    el.style.transform = `translate(${col * 100}%, ${row * 100}%)`;
    if (instant) {
      void el.offsetWidth;
      el.classList.remove("no-anim");
    }
  }

  // Coloca la posición `fen`. Si se pasa `move` ({from, to}), esa pieza (y la torre en un enroque) se desliza.
  setPosition(fen, move, instant = false) {
    const next = parsePlacement(fen);
    const cur = this.pieces;
    const slides = [];
    if (move && cur.has(move.from)) {
      const moves = [[move.from, move.to]];
      const p = cur.get(move.from);
      if (p.code[1] === "K" && Math.abs(FILES.indexOf(move.from[0]) - FILES.indexOf(move.to[0])) === 2) {
        const rank = move.from[1];
        moves.push(move.to[0] === "g" ? ["h" + rank, "f" + rank] : ["a" + rank, "d" + rank]);
      }
      for (const [from, to] of moves) {
        const piece = cur.get(from);
        if (!piece) continue;
        cur.delete(from);
        const victim = cur.get(to);
        if (victim) victim.el.remove();
        cur.set(to, piece);
        slides.push(to);
      }
    }
    for (const [sq, p] of [...cur]) {
      const want = next.get(sq);
      if (want === p.code) continue;
      if (want && slides.includes(sq)) {
        p.code = want; // coronación
        p.el.querySelector("use").setAttribute("href", `#p-${want}`);
        continue;
      }
      p.el.remove();
      cur.delete(sq);
    }
    for (const [sq, code] of next) if (!cur.has(sq)) cur.set(sq, this.makePiece(code));
    for (const [sq, p] of cur) this.place(p.el, sq, instant || !slides.includes(sq));
    this.relabel?.();
  }

  // { last: [from, to], check: sq, selected: sq, targets: [sq…], captures: [sq…] }
  highlight(h = {}) {
    this.highlights = h;
    for (const [sq, s] of this.squares) {
      s.classList.toggle("last", !!h.last?.includes(sq));
      s.classList.toggle("check", h.check === sq);
      s.classList.toggle("sel", h.selected === sq);
      s.classList.toggle("target", !!h.targets?.includes(sq));
      s.classList.toggle("capture", !!h.captures?.includes(sq));
    }
  }

  // ------------------------------------------------------------ interacción (/jugar/)

  bindInteraction() {
    const { onSquare, canDrag, onDrop } = this.opts;
    this.el.setAttribute("role", "group");
    this.el.addEventListener("click", (e) => {
      if (this.justDragged) return;
      const s = e.target.closest(".sq");
      if (s) {
        this.setFocus(s.dataset.sq, false);
        onSquare?.(s.dataset.sq);
      }
    });
    this.el.addEventListener("keydown", (e) => {
      const d = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
      if (!d) return;
      e.preventDefault();
      const { col, row } = this.coords(this.focusSq);
      const sq = this.squareAt(col + d[0], row + d[1]);
      if (sq) this.setFocus(sq, true);
    });

    let drag = null;
    this.el.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      const s = e.target.closest(".sq");
      if (!s || !canDrag?.(s.dataset.sq)) return;
      const p = this.pieces.get(s.dataset.sq);
      if (!p) return;
      drag = { from: s.dataset.sq, p, x: e.clientX, y: e.clientY, moved: false, id: e.pointerId };
    });
    addEventListener("pointermove", (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
      if (!drag.moved) {
        drag.moved = true;
        onSquare?.(drag.from, { dragStart: true });
        drag.p.el.classList.add("no-anim", "dragging");
      }
      const r = this.el.getBoundingClientRect();
      const size = r.width / 8;
      drag.p.el.style.transform = `translate(${e.clientX - r.left - size / 2}px, ${e.clientY - r.top - size / 2}px)`;
    });
    addEventListener("pointerup", (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag;
      drag = null;
      if (!d.moved) return;
      d.p.el.classList.remove("dragging");
      const r = this.el.getBoundingClientRect();
      const col = Math.floor(((e.clientX - r.left) / r.width) * 8);
      const row = Math.floor(((e.clientY - r.top) / r.height) * 8);
      const to = this.squareAt(col, row);
      this.justDragged = true;
      setTimeout(() => (this.justDragged = false), 0);
      if (!to || to === d.from || !onDrop?.(d.from, to)) this.place(d.p.el, d.from, true);
    });
  }

  setFocus(sq, move) {
    const prev = this.squares.get(this.focusSq);
    if (prev) prev.tabIndex = -1;
    const s = this.squares.get(sq);
    s.tabIndex = 0;
    this.focusSq = sq;
    if (move) s.focus();
  }
}
