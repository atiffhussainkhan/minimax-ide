// Snake & Ladder — 3D Cartoon Edition
// All assets are 3D cartoon characters generated free via Pollinations.
// No accounts, no OAuth, no payment.

const ROWS = 10;
const COLS = 10;

// Classic snake & ladder mappings (start -> end).
//
// THE CLEARANCE RULE: a ladder may never land on, or within ONE square of, a
// snake's bite square — every |ladder landing - snake bite| must be >= 2.
// The move logic resolves the ladder first and the snake second, so a landing
// square near a snake either bites you on arrival (ladder 80 ending on 99 slid
// the player 80 -> 54, a net LOSS of 26) or makes the ladder a trap. Two squares
// of clearance means a player who climbs always gets to stand on solid ground.
//
// tools/check_board_map.py enforces this automatically — do not edit either map
// without re-running it.
const SNAKES = {
  99: 54, 95: 72, 67: 55, 52: 42, 25: 2,
};
const LADDERS = {
  6: 30, 11: 33, 20: 59, 27: 74, 36: 57,
  51: 69, 63: 81, 71: 91, 80: 93,
};

// Each snake's colours. The renderer is pure vector now, so these are used
// directly as fills — no hue-rotate filter is needed and every snake gets its
// exact intended colour instead of an approximation of it.
//   body  = main colour, dark = outline/shadow, light = top-down sheen,
//   tint  = the soft pool drawn under the head and inside the end ring.
const SNAKE_PALETTE = [
  { body: "#4caf50", dark: "#1b5e20", light: "#a5d6a7", tint: "#4caf50" }, // emerald
  { body: "#ffb74d", dark: "#bf6f1c", light: "#ffe082", tint: "#ffb74d" }, // amber
  { body: "#42a5f5", dark: "#0d47a1", light: "#90caf9", tint: "#42a5f5" }, // sky-blue
  { body: "#ba68c8", dark: "#4a148c", light: "#d1b3f0", tint: "#ba68c8" }, // purple
  { body: "#26a69a", dark: "#004d40", light: "#80cbc4", tint: "#26a69a" }, // teal
];

const ALL_PLAYERS = [
  { id: 0, name: "Red",    color: "#e85a4f", sprite: "assets/pawn_red_transparent.png" },
  { id: 1, name: "Blue",   color: "#4f8fe8", sprite: "assets/pawn_blue_transparent.png" },
  { id: 2, name: "Green",  color: "#5dd39e", sprite: "assets/pawn_green_transparent.png" },
  { id: 3, name: "Yellow", color: "#ffd24c", sprite: "assets/pawn_yellow_transparent.png" },
];

// Active player list — set by selectPlayerCount().
let PLAYERS = [];

// Stable square-relative offset for each player ID. Player 0 is always exactly
// centered; players 1-3 fan out around it but stay inside the 10% square.
const PAWN_OFFSETS = [
  { dx:  0.0, dy:  0.0 },  // P0: dead center (primary)
  { dx:  2.2, dy:  1.8 },  // P1: bottom-right
  { dx: -2.2, dy:  1.8 },  // P2: bottom-left
  { dx:  0.0, dy: -2.0 },  // P3: top-center
];

// Headless-test autoplay controller (only ever used by the ?fast=1 hook).
// Kept deliberately tiny and cancellable so no timer chain outlives the test.
const autoplay = { on: false, timer: null };
function stopAutoplay() {
  autoplay.on = false;
  clearTimeout(autoplay.timer);
  autoplay.timer = null;
}

const LADDER_SPRITE = "assets/ladder_transparent.png";

const state = {
  turn: 0,
  rolled: null,
  moving: false,
  winner: null,
  playerCount: 0,
  // Tournament state
  totalGames: 1,        // 1, 3, 5, 7, or 9
  currentGame: 1,
  wins: {},             // { playerId: count }
  // Per-game history so the running tally can show who took each game.
  // Each entry: { game: <1-based index>, winnerId: <player id> }
  history: [],
  // True once the last game has been played — only then does the champion
  // modal appear and the setup screen come back.
  tournamentDone: false,
  // Mirror of each player's square, kept in sync as the game runs. If PLAYERS
  // ever needs rebuilding (stale cache / partial init) we restore the real
  // positions from here instead of resetting everyone back to square 0.
  positions: {},
  // Handle for the pending "game finished" timer so it can be cancelled if the
  // player resets mid-countdown — otherwise a stale modal would pop up later
  // on top of the setup screen.
  winTimer: null,
};

// Amazing per-game and champion messages — picked randomly so each win feels
// fresh. Personalise by swapping names in here if you want.
const GAME_WIN_LINES = [
  (n) => `🔥 ${n} takes game ${state.currentGame} with style!`,
  (n) => `⚡ ${n} dominates game ${state.currentGame}!`,
  (n) => `👑 ${n} claims game ${state.currentGame} — beautiful!`,
  (n) => `🐍 ${n} bites through game ${state.currentGame}!`,
  (n) => `🏆 ${n} wins game ${state.currentGame} — pure class!`,
  (n) => `✨ ${n} shines through game ${state.currentGame}!`,
  (n) => `🎯 ${n} nails game ${state.currentGame} with perfect rolls!`,
];

const CHAMPION_LINES = {
  default: [
    (n, w) => `${n} is the ULTIMATE Snake & Ladder champion with ${w} glorious victories! 🐍👑`,
    (n, w) => `Bow down — ${n} REIGNS SUPREME with ${w} wins! Unstoppable! 🌟`,
    (n, w) => `${n} is the King/Queen of the board — ${w} wins, ZERO doubt! 👑`,
    (n, w) => `LEGENDARY ${n}! ${w} wins in a row of domination! 🔥`,
    (n, w) => `${n} conquered the board ${w} times — HALL OF FAME! 🏛️`,
    (n, w) => `From start to finish, ${n} is the maestro with ${w} wins! 🎩`,
  ],
  close: [
    (n, w) => `${n} edges it out with ${w} wins in a thriller of a tournament!`,
    (n, w) => `${n} takes the crown by a hair — ${w} wins to glory!`,
    (n, w) => `${n} wins the close battle with ${w} victories — breathtaking!`,
  ],
  dominant: [
    (n, w) => `${n} DESTROYS the competition with ${w} massive wins! Total domination! 💥`,
    (n, w) => `${n} was UNSTOPPABLE — ${w} wins, ${state.totalGames - w} for everyone else!`,
  ],
};

// ---------------------------------------------------------------------------
// Board geometry
// ---------------------------------------------------------------------------
// Classic snake-and-ladder zig-zag numbering, bottom row first:
//   row 0 (bottom):  1 → 10   left to right
//   row 1:          11 → 20   right to left  (so 11 sits directly above 10)
//   row 2:          21 → 30   left to right  (so 21 sits directly above 20)
//   …alternating up to row 9, ending with 100 in the top-left corner.
function positionForSquare(square) {
  if (square < 1 || square > 100) return null;
  const zeroBased = square - 1;
  const band = Math.floor(zeroBased / COLS);  // 0-based row counted from the bottom
  const offset = zeroBased % COLS;           // 0..9 position within that row
  // Flip vertically so the numbering starts at the bottom of the board.
  const row = (ROWS - 1) - band;
  // Even bands read left→right, odd bands right→left.
  const col = (band % 2 === 0) ? offset : (COLS - 1 - offset);
  return { row, col };
}

// Returns square center as {left, top} percentages of board.
function squareCenter(square) {
  const pos = positionForSquare(square);
  if (!pos) return null;
  return {
    left: `${(pos.col + 0.5) * 10}%`,
    top:  `${(pos.row + 0.5) * 10}%`,
  };
}

// SVG-space coords (viewBox 0 0 1000 1000).
function squareSvg(square) {
  const pos = positionForSquare(square);
  if (!pos) return null;
  return { x: (pos.col + 0.5) * 100, y: (pos.row + 0.5) * 100 };
}

// ---------------------------------------------------------------------------
// Player list sidebar
// ---------------------------------------------------------------------------
function buildPlayerList() {
  const ol = document.getElementById("player-list");
  ol.innerHTML = "";
  PLAYERS.forEach((p) => {
    const li = document.createElement("li");
    li.id = `plist-${p.id}`;
    li.innerHTML = `
      <span class="swatch" style="background:${p.color}"></span>
      <span class="pname">${p.name}</span>
      <span class="psquare">${p.pos}</span>
    `;
    ol.appendChild(li);
  });
  updateActivePlayer();
}

function updateActivePlayer() {
  PLAYERS.forEach((p) => {
    const li = document.getElementById(`plist-${p.id}`);
    if (!li) return;
    li.classList.toggle("active", p.id === state.turn && state.winner === null);
    if (state.winner !== null) {
      li.classList.toggle("winner", p.id === state.winner);
    } else {
      li.classList.remove("winner");
    }
    const sq = li.querySelector(".psquare");
    if (sq) sq.textContent = p.pos;
  });
  // Toggle active class on pawn DOM nodes.
  PLAYERS.forEach((p) => {
    const el = document.getElementById(`pawn-${p.id}`);
    if (!el) return;
    el.classList.toggle("active", p.id === state.turn && state.winner === null);
  });
  const status = document.getElementById("status");
  // `turn` and `winner` are indexes into PLAYERS, so look the player up rather
  // than trusting the index — a stale one must degrade to a plain message, not
  // throw and freeze the board.
  const winner = PLAYERS[state.winner];
  const current = PLAYERS[state.turn];
  if (state.winner !== null && winner) {
    status.innerHTML = `<strong style="color:${winner.color}">${winner.name}</strong> wins! 🏆`;
  } else if (current) {
    status.innerHTML = `It's <strong style="color:${current.color}">${current.name}</strong>'s turn.`;
  } else {
    status.innerHTML = `Press <strong>Roll Dice</strong> to start.`;
  }
}

// ---------------------------------------------------------------------------
// DOM construction
// ---------------------------------------------------------------------------
function buildBoard() {
  const board = document.getElementById("board");
  board.innerHTML = "";

  // ---- Square numbers ----
  const grid = document.createElement("div");
  grid.className = "board-grid";
  for (let i = 1; i <= 100; i++) {
    const cell = document.createElement("div");
    // Use positionForSquare() so cell layout matches where the snakes and
    // ladders are drawn. Zig-zag, bottom-up: square 1 at bottom-left,
    // square 100 at top-left.
    const pos = positionForSquare(i);
    const checker = (pos.row + pos.col) % 2 === 0;
    cell.className = "cell " + (checker ? "light" : "dark");
    cell.style.gridRow = pos.row + 1;
    cell.style.gridColumn = pos.col + 1;
    cell.textContent = i;
    grid.appendChild(cell);
  }
  board.appendChild(grid);

  // ---- SVG overlay for snake bodies + ladder rails ----
  const NS = "http://www.w3.org/2000/svg";
  const overlay = document.createElementNS(NS, "svg");
  overlay.setAttribute("class", "snakes-ladders");
  overlay.setAttribute("viewBox", `0 0 ${COLS * 100} ${ROWS * 100}`);
  overlay.setAttribute("preserveAspectRatio", "none");
  overlay.style.cssText = "position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;";

  // Ladder rails (drawn first so snakes layer above).
  // Brighter golden wood, thicker strokes, dark outline so each ladder
  // pops against the busy 3D cartoon board.
  Object.entries(LADDERS).forEach(([from, to]) => {
    const a = squareSvg(Number(from));
    const b = squareSvg(Number(to));
    if (!a || !b) return;
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.sqrt(dx*dx + dy*dy);
    const railOffset = 14;  // wider so ladder reads as a real ladder
    const ux = -dy / len * railOffset;
    const uy = dx / len * railOffset;

    // 1. Dark outline pass — drawn first behind each rail for contrast.
    [[a.x+ux, a.y+uy, b.x+ux, b.y+uy], [a.x-ux, a.y-uy, b.x-ux, b.y-uy]].forEach(([x, y, xn, yn]) => {
      const shadow = document.createElementNS(NS, "line");
      shadow.setAttribute("x1", x); shadow.setAttribute("y1", y);
      shadow.setAttribute("x2", xn); shadow.setAttribute("y2", yn);
      shadow.setAttribute("stroke", "#1a0c04");
      shadow.setAttribute("stroke-width", "11");
      shadow.setAttribute("stroke-linecap", "round");
      overlay.appendChild(shadow);
    });

    // 2. Bright wooden rails on top of the outline.
    [[a.x+ux, a.y+uy, b.x+ux, b.y+uy], [a.x-ux, a.y-uy, b.x-ux, b.y-uy]].forEach(([x, y, xn, yn]) => {
      const line = document.createElementNS(NS, "line");
      line.setAttribute("x1", x); line.setAttribute("y1", y);
      line.setAttribute("x2", xn); line.setAttribute("y2", yn);
      line.setAttribute("stroke", "#e8b260");
      line.setAttribute("stroke-width", "7");
      line.setAttribute("stroke-linecap", "round");
      overlay.appendChild(line);
    });

    // 3. Rungs — light golden with dark outline.
    const steps = 5;
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const x = a.x + dx * t + ux;
      const y = a.y + dy * t + uy;
      const xn = a.x + dx * t - ux;
      const yn = a.y + dy * t - uy;
      // Dark outline behind rung
      const rungShadow = document.createElementNS(NS, "line");
      rungShadow.setAttribute("x1", x); rungShadow.setAttribute("y1", y);
      rungShadow.setAttribute("x2", xn); rungShadow.setAttribute("y2", yn);
      rungShadow.setAttribute("stroke", "#1a0c04");
      rungShadow.setAttribute("stroke-width", "7");
      rungShadow.setAttribute("stroke-linecap", "round");
      overlay.appendChild(rungShadow);
      // Bright rung on top
      const rung = document.createElementNS(NS, "line");
      rung.setAttribute("x1", x); rung.setAttribute("y1", y);
      rung.setAttribute("x2", xn); rung.setAttribute("y2", yn);
      rung.setAttribute("stroke", "#f4cf7a");
      rung.setAttribute("stroke-width", "4");
      rung.setAttribute("stroke-linecap", "round");
      overlay.appendChild(rung);
    }
  });

  // 3D cartoon snakes — pure vector: a fat headed face at the start square,
  // tapering to one thin tail on the end square, both ends explicitly marked.
  Object.entries(SNAKES).forEach(([from, to], idx) => {
    const palette = SNAKE_PALETTE[idx % SNAKE_PALETTE.length];
    const g = document.createElementNS(NS, "g");
    g.setAttribute("class", "snake-3d");
    g.setAttribute("opacity", "1");
    draw3DSnake(g, Number(from), Number(to), palette, idx);
    overlay.appendChild(g);
  });

  board.appendChild(overlay);

  // ---- Ladder decorations (small wooden ladder sprite at the base of each ladder) ----
  const decorLayer = document.createElement("div");
  decorLayer.className = "decor-layer";
  Object.keys(LADDERS).forEach((from) => {
    const img = document.createElement("img");
    img.src = LADDER_SPRITE;
    img.className = "decor decor-ladder";
    const c = squareCenter(Number(from));
    if (c) {
      img.style.left = c.left;
      img.style.top  = c.top;
      img.style.transform = "translate(-50%, -50%) rotate(-12deg)";
    }
    decorLayer.appendChild(img);
  });
  board.appendChild(decorLayer);

  // ---- Pawns layer ----
  const pawns = document.createElement("div");
  pawns.className = "pawns";
  pawns.id = "pawns";
  board.appendChild(pawns);

  PLAYERS.forEach((p) => {
    const el = document.createElement("div");
    el.className = "pawn";
    el.id = `pawn-${p.id}`;
    el.innerHTML = `<img src="${p.sprite}" alt="${p.name}">`;
    pawns.appendChild(el);
  });
}

// ---------------------------------------------------------------------------
// 3D cartoon snake — drawn as pure vector SVG.
//
// This deliberately does NOT use a raster sprite any more. A single stretched
// bitmap is tapered at BOTH ends by construction, so it always read as "two
// tails" with no head, which is the one thing a snake must communicate. Drawing
// the snake ourselves fixes that at the source:
//
//   • HEAD  — a fat rounded head with two eyes and a forked red tongue, sitting
//             on the START square. Impossible to mistake for a tail.
//   • BODY  — a gently curving chain that tapers smoothly from the head down to
//             a single thin tail tip, drawn over a darker outline chain so it
//             reads clearly against the busy 3D board.
//   • START — a soft tinted pool under the head.
//   • END   — a ring around the tail square.
//
// One head, one tail, both ends obvious. Pure vector also means no image to
// download, no decode, and it stays crisp at any board size.
// ---------------------------------------------------------------------------
const SNAKE_CELL = 100;            // viewBox units per board square
const SNAKE_NECK_R = 17;           // body radius just behind the head
const SNAKE_HEAD_WID = 19;         // head half-width — MATCHES the body at the
                                   // neck (see the radius profile below), so the
                                   // head and body are flush, not a lollipop
const SNAKE_HEAD_LEN = 27;         // head half-length along the body axis
const SNAKE_OUTLINE = 5;           // outline thickness around the body
const SNAKE_BOARD_MIN = 4;         // keep art this far inside the board edge
const SNAKE_BOARD_MAX = COLS * SNAKE_CELL - SNAKE_BOARD_MIN;

// Build a smooth tapered "ribbon" along a centreline: walk the points, offset
// each one by its half-width along the local normal, then close the two edges
// into one shape. A ribbon (rather than a chain of circles) is what stops the
// body looking beaded/caterpillar-like, and it tapers to a clean point.
function snakeRibbonPath(pts, grow, offsetFrac, widthFrac) {
  const n = pts.length;
  if (n < 2) return "";
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    let tx = b.x - a.x, ty = b.y - a.y;
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl; ty /= tl;
    const nx = -ty, ny = tx;                       // local normal
    const r = (p.r + grow) * (widthFrac === undefined ? 1 : widthFrac);
    const off = (p.r + grow) * (offsetFrac || 0);
    L.push([p.x + nx * (off + r), p.y + ny * (off + r)]);
    R.push([p.x + nx * (off - r), p.y + ny * (off - r)]);
  }
  let d = `M${L[0][0].toFixed(2)} ${L[0][1].toFixed(2)}`;
  for (let i = 1; i < n; i++) d += `L${L[i][0].toFixed(2)} ${L[i][1].toFixed(2)}`;
  for (let i = n - 1; i >= 0; i--) d += `L${R[i][0].toFixed(2)} ${R[i][1].toFixed(2)}`;
  return d + "Z";
}

function draw3DSnake(svg, fromSquare, toSquare, palette, idx) {
  const a = squareSvg(fromSquare);   // head square (where a player lands)
  const b = squareSvg(toSquare);     // tail square
  if (!a || !b) return;

  const NS = "http://www.w3.org/2000/svg";
  const add = (tag, attrs) => {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    svg.appendChild(el);
    return el;
  };

  const dx = b.x - a.x, dy = b.y - a.y;
  const chord = Math.hypot(dx, dy) || 1;
  const ux = dx / chord, uy = dy / chord;   // unit vector: head → tail
  const px = -uy, py = ux;                  // perpendicular to the body

  // Pull the head slightly toward the board centre so it never hangs over the
  // edge on a border square (1, 10, 91, 100 …) and never gets clipped.
  const bx = COLS * SNAKE_CELL / 2, by = ROWS * SNAKE_CELL / 2;
  const hlen = Math.hypot(bx - a.x, by - a.y) || 1;
  const INSET = 26;
  const hx = a.x + ((bx - a.x) / hlen) * INSET;
  const hy = a.y + ((by - a.y) / hlen) * INSET;

  // One gentle bend, stable per snake, so the five don't all look stamped from
  // the same ruler. Capped by length so short snakes (52→42) stay nearly straight.
  const bowSign = ((idx * 7) % 2) ? 1 : -1;
  const bow = bowSign * Math.min(chord * 0.11, 45);
  const cx = (hx + b.x) / 2 + px * bow;
  const cy = (hy + b.y) / 2 + py * bow;

  // Sample a quadratic Bézier along head → tail.
  const steps = Math.max(Math.round(chord / 8), 28);
  const body = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    let x = mt * mt * hx + 2 * mt * t * cx + t * t * b.x;
    let y = mt * mt * hy + 2 * mt * t * cy + t * t * b.y;
    // Never let the body spill past the board edge.
    x = Math.min(Math.max(x, SNAKE_BOARD_MIN), SNAKE_BOARD_MAX);
    y = Math.min(Math.max(y, SNAKE_BOARD_MIN), SNAKE_BOARD_MAX);
    // Radius profile: thick at the neck, a smooth taper along the body, then a
    // circular shoulder over the last 14% so the tail finishes in a rounded
    // point instead of a flat, cut-off tube.
    let r = SNAKE_NECK_R * Math.pow(1 - t, 1.7) + 2;
    if (t > 0.86) {
      const u = (t - 0.86) / 0.14;
      r *= Math.sqrt(Math.max(0, 1 - u * u));
    }
    body.push({ x, y, r });
  }

  // START square: a soft tinted pool under the head, so the head always sits on
  // a visibly marked square.
  add("circle", {
    cx: hx.toFixed(2), cy: hy.toFixed(2), r: (SNAKE_HEAD_WID + 15).toFixed(2),
    fill: palette.tint || palette.body, opacity: "0.20",
  });

  // Body. The dark edge is a STROKE on the body outline rather than a second
  // ribbon behind it: the stroke follows the exact silhouette and its round
  // caps/joins finish the tail tip cleanly, which a stacked ribbon cannot do.
  add("path", {
    d: snakeRibbonPath(body, 0),
    fill: palette.body, stroke: palette.dark,
    "stroke-width": SNAKE_OUTLINE * 2, "stroke-linejoin": "round",
    "stroke-linecap": "round",
  });
  // A slim light stripe along the back gives the body a rounded, 3D look.
  add("path", {
    d: snakeRibbonPath(body, 0, -0.30, 0.22),
    fill: palette.light, stroke: "none", opacity: "0.5",
  });

  // ---- HEAD -------------------------------------------------------------
  // Built in the BODY's own coordinate frame, so it is genuinely synchronised
  // with the body rather than a circle parked on top of it:
  //   • local +x points down the body toward the tail, so the snout faces -x
  //   • the head is an ellipse whose half-WIDTH equals the body's width at the
  //     neck, so head and body are flush where they meet — not a lollipop
  //   • its rear tapers to a point that tucks under the body, so there is no
  //     step where the two shapes join
  //   • it carries the same light stripe, on the same side, at the same
  //     offset/width fraction as the body, so shading runs continuously
  const HX = (lx, ly) => hx + ux * lx + px * ly;
  const HY = (lx, ly) => hy + uy * lx + py * ly;
  const deg = Math.atan2(uy, ux) * 180 / Math.PI;
  const ell = (lx, ly, rx, ry, attrs) => {
    const cx = HX(lx, ly), cy = HY(lx, ly);
    return add("ellipse", Object.assign({
      cx: cx.toFixed(2), cy: cy.toFixed(2),
      rx: rx.toFixed(2), ry: ry.toFixed(2),
      transform: `rotate(${deg.toFixed(2)} ${cx.toFixed(2)} ${cy.toFixed(2)})`,
    }, attrs));
  };

  // Scale the head down a little on short snakes (52→42 is only ~1.4 cells
  // long) so the face never dwarfs the body it belongs to.
  const headK = Math.max(0.74, Math.min(1, chord / 240));
  const hw = SNAKE_HEAD_WID * headK;   // half-width, == body half-width at the neck
  const hl = SNAKE_HEAD_LEN * headK;   // half-length along the body

  ell(0, 0, hl, hw, {
    fill: palette.body, stroke: palette.dark,
    "stroke-width": SNAKE_OUTLINE * 2,
  });
  // A slim rim highlight along the upper edge of the head, matching the body's
  // stripe side but pushed further out so it reads as a sheen on the skull
  // rather than a band drawn across the face.
  ell(-hl * 0.02, -hw * 0.42, hl * 0.78, hw * 0.17, {
    fill: palette.light, stroke: "none", opacity: "0.45",
  });

  // Eyes on the wide front half of the head, one each side. A cartoon eye is an
  // outlined white oval with a pupil and a catchlight — a plain white dot reads
  // as a bead stuck on rather than an eye.
  const eX = -hl * 0.26, eY = hw * 0.50;
  for (const s of [1, -1]) {
    ell(eX, eY * s, hw * 0.38, hw * 0.44, {
      fill: "#ffffff", stroke: palette.dark, "stroke-width": "2.5",
    });
    ell(eX + hw * 0.06, eY * s, hw * 0.20, hw * 0.24, { fill: "#1a1a1a" });
    // catchlight — the detail that makes an eye look alive
    ell(eX - hw * 0.07, eY * s + hw * 0.13, hw * 0.07, hw * 0.08, { fill: "#ffffff" });
  }

  // Nostrils, well forward of the eyes near the snout tip.
  for (const s of [1, -1]) {
    ell(-hl * 0.74, hw * 0.16 * s, hw * 0.05, hw * 0.05, {
      fill: palette.dark, opacity: "0.6",
    });
  }

  // Forked tongue, flicking out from the mouth at the snout tip.
  const mX = -hl * 0.94, tipX = mX - 15 * headK;
  add("path", {
    d: `M${HX(mX, 0).toFixed(2)} ${HY(mX, 0).toFixed(2)}L${HX(tipX, 0).toFixed(2)} ${HY(tipX, 0).toFixed(2)}` +
       `M${HX(tipX, 0).toFixed(2)} ${HY(tipX, 0).toFixed(2)}L${HX(tipX - 3, 6 * headK).toFixed(2)} ${HY(tipX - 3, 6 * headK).toFixed(2)}` +
       `M${HX(tipX, 0).toFixed(2)} ${HY(tipX, 0).toFixed(2)}L${HX(tipX - 3, -6 * headK).toFixed(2)} ${HY(tipX - 3, -6 * headK).toFixed(2)}`,
    stroke: "#e53935", "stroke-width": (4 * headK).toFixed(2), fill: "none",
    "stroke-linecap": "round", "stroke-linejoin": "round",
  });

  // ---- END square -------------------------------------------------------
  // A ring, clearly different from the head, marks where the snake slides to.
  add("circle", {
    cx: b.x.toFixed(2), cy: b.y.toFixed(2), r: "24",
    fill: "none", stroke: palette.dark, "stroke-width": "5", opacity: "0.65",
  });
  add("circle", {
    cx: b.x.toFixed(2), cy: b.y.toFixed(2), r: "24",
    fill: palette.tint || palette.body, opacity: "0.14",
  });
}
// Move a pawn and keep state.positions in sync. Every position change goes
// through here so the mirror used by the self-heal can never drift.
function setPos(player, square) {
  player.pos = square;
  state.positions[player.id] = square;
}

// Pawn positioning — recentered, smaller offsets
// ---------------------------------------------------------------------------
function placePawn(player) {
  const el = document.getElementById(`pawn-${player.id}`);
  if (!el) return;
  if (player.pos === 0) {
    // Off-board "home" position: park the pawns in a fan along the BOTTOM edge
    // of the board, just below square 1, so everyone starts down at the start
    // line rather than up near the top rows.
    const off = PAWN_OFFSETS[player.id] || { dx: 0, dy: 0 };
    el.style.left = `${(0.5) * 10 + 1.5 + off.dx * 1.4}%`;
    el.style.top  = `${96 + off.dy * 0.5}%`;
    return;
  }
  const pos = positionForSquare(player.pos);
  if (!pos) return;
  const off = PAWN_OFFSETS[player.id] || { dx: 0, dy: 0 };
  el.style.left = `${(pos.col + 0.5) * 10 + off.dx}%`;
  el.style.top  = `${(pos.row + 0.5) * 10 + off.dy}%`;
}

function placeAllPawns() {
  PLAYERS.forEach(placePawn);
}

// ---------------------------------------------------------------------------
// Dice
// ---------------------------------------------------------------------------
function rollDie() {
  return 1 + Math.floor(Math.random() * 6);
}

function showDice(value) {
  const display = document.getElementById("dice-display");
  const valEl = document.getElementById("dice-value");
  valEl.textContent = value;
  display.classList.add("rolling");
  setTimeout(() => display.classList.remove("rolling"), 500);
}

function toast(message, ms = 1800) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (el.hidden = true), ms);
}

// ---------------------------------------------------------------------------
// Game flow
// ---------------------------------------------------------------------------
async function rollAndMove() {
  // Self-heal: if PLAYERS is empty (e.g., stale cache, partial init), rebuild
  // it from ALL_PLAYERS. Crucially we restore each pawn's real square from
  // state.positions — resetting everyone to 0 here would silently wipe a game
  // that was already in progress.
  if (PLAYERS.length === 0 && state.playerCount > 0) {
    PLAYERS = ALL_PLAYERS.slice(0, state.playerCount).map((p) => ({
      ...p,
      pos: state.positions[p.id] || 0,
    }));
    buildPlayerList();
    placeAllPawns();
  }
  if (state.moving || state.winner !== null || PLAYERS.length === 0) return;
  state.moving = true;
  const rollBtn = document.getElementById("roll-btn");
  rollBtn.disabled = true;

  const player = PLAYERS[state.turn];
  if (!player) { state.moving = false; rollBtn.disabled = false; return; }
  const value = rollDie();
  showDice(value);

  await sleep(550);

  const from = player.pos;
  let to = from + value;

  if (to > 100) {
    toast(`${player.name} rolled ${value} — bounce! Stay on ${from}`);
  } else {
    setPos(player, to);
    placePawn(player);
    updateActivePlayer();
    toast(`${player.name} rolled ${value} → ${to}`);
  }

  await sleep(700);
  if (LADDERS[player.pos]) {
    const dest = LADDERS[player.pos];
    toast(`🪜 Ladder! ${player.name} climbs ${player.pos} → ${dest}`);
    await sleep(700);
    setPos(player, dest);
    placePawn(player);
    updateActivePlayer();
  } else if (SNAKES[player.pos]) {
    const dest = SNAKES[player.pos];
    toast(`🐍 Snake! ${player.name} slides ${player.pos} → ${dest}`);
    await sleep(700);
    setPos(player, dest);
    placePawn(player);
    updateActivePlayer();
  }

  if (player.pos === 100) {
    state.winner = player.id;
    // Tournament win tracking — increment this player's win count and record
    // this game in the history so the running tally can show who took what.
    state.wins[player.id] = (state.wins[player.id] || 0) + 1;
    state.history.push({ game: state.currentGame, winnerId: player.id });
    const winLine = GAME_WIN_LINES[Math.floor(Math.random() * GAME_WIN_LINES.length)](player.name);
    toast(`🏆 ${winLine}`);
    updateActivePlayer();
    updateTournamentPanel();
    state.moving = false;
    rollBtn.disabled = true;
    // Let the win toast be read, then move on. Finishing a single game never
    // ends the tournament — it only ends once the selected number of games has
    // been played in total. The timer is stored so a reset mid-countdown can
    // cancel it and stop a stale modal appearing over the setup screen.
    clearTimeout(state.winTimer);
    state.winTimer = setTimeout(() => {
      state.winTimer = null;
      if (state.currentGame < state.totalGames) {
        showGameOverModal(player, winLine);
      } else {
        state.tournamentDone = true;
        showChampionModal();
      }
    }, 2400);
    return;
  }

  state.turn = (state.turn + 1) % PLAYERS.length;
  updateActivePlayer();
  state.moving = false;
  rollBtn.disabled = false;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Player-count selector
// ---------------------------------------------------------------------------
function showPlayerModal() {
  const modal = document.getElementById("player-modal");
  modal.hidden = false;
  document.body.classList.add("locked");
  // Disable Roll while modal is open.
  document.getElementById("roll-btn").disabled = true;
}

function hidePlayerModal() {
  const modal = document.getElementById("player-modal");
  modal.hidden = true;
  document.body.classList.remove("locked");
  document.getElementById("roll-btn").disabled = false;
}

function selectPlayerCount(n) {
  // Legacy single-game flow (used if n is passed without games).
  startTournament(n, 1);
}

function startTournament(n, totalGames) {
  n = Math.max(1, Math.min(4, n | 0));
  totalGames = Math.max(1, totalGames | 0);
  state.playerCount = n;
  state.totalGames = totalGames;
  state.currentGame = 1;
  state.wins = {};
  state.history = [];
  state.tournamentDone = false;
  // A new tournament always starts from scratch. Without this, `turn` keeps
  // whatever index the PREVIOUS tournament ended on: play 4 players, hit New
  // Game, pick 1 player, and state.turn (say 3) indexes past the end of the new
  // one-player PLAYERS array, which crashes the status line.
  state.turn = 0;
  state.rolled = null;
  state.moving = false;
  state.winner = null;
  hideGameOverModal();
  // Populate PLAYERS from the canonical ALL_PLAYERS list (slice to n).
  PLAYERS = ALL_PLAYERS.slice(0, n).map((p) => ({ ...p, pos: 0 }));
  state.positions = {};
  PLAYERS.forEach((p) => { state.wins[p.id] = 0; state.positions[p.id] = 0; });
  hidePlayerModal();
  hideChampionModal();
  buildBoard();
  buildPlayerList();
  placeAllPawns();
  updateTournamentPanel();
  document.getElementById("dice-value").textContent = "—";
  const headerMsg = totalGames === 1
    ? `Game on! <strong style="color:${PLAYERS[0].color}">${PLAYERS[0].name}</strong> rolls first.`
    : `Tournament: ${totalGames} games. <strong style="color:${PLAYERS[0].color}">${PLAYERS[0].name}</strong> rolls first.`;
  document.getElementById("status").innerHTML = headerMsg;
  toast(totalGames === 1
    ? `${n}-player game ready`
    : `${n}-player tournament · ${totalGames} games`);
}

// Start the next game in a tournament — same players, fresh board. Only ever
// called from the between-games interstitial, so the tournament stays alive.
function startNextGame() {
  PLAYERS = PLAYERS.map((p) => ({ ...p, pos: 0 }));
  state.positions = {};
  PLAYERS.forEach((p) => { state.positions[p.id] = 0; });
  state.turn = 0;
  state.rolled = null;
  state.moving = false;
  state.winner = null;
  state.currentGame++;
  buildBoard();
  buildPlayerList();
  placeAllPawns();
  updateTournamentPanel();
  document.getElementById("dice-value").textContent = "—";
  const p0 = PLAYERS[0];
  document.getElementById("status").innerHTML =
    `Game ${state.currentGame} / ${state.totalGames} · <strong style="color:${p0.color}">${p0.name}</strong> rolls first.`;
  document.getElementById("roll-btn").disabled = false;
  toast(`Game ${state.currentGame} of ${state.totalGames} — fresh board!`);
}

// Keep the rules-panel button honest about what it will do. During a
// multi-game tournament it abandons the run and returns to the setup screen,
// so it says so explicitly rather than reading like a harmless "New Game"
// that could dump the player out mid-tournament by accident.
function updateResetButton() {
  const btn = document.getElementById("reset-btn");
  if (!btn) return;
  const inTournament = state.totalGames > 1 && !state.tournamentDone;
  btn.textContent = inTournament ? "⏹ End Tournament" : "↺ New Game";
  btn.title = inTournament
    ? "Abandon this tournament and go back to player / game selection"
    : "Start over";
}

// Render the tournament sidebar panel (wins so far).
function updateTournamentPanel() {
  const panel = document.getElementById("tournament-panel");
  updateResetButton();
  if (state.totalGames <= 1) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  document.getElementById("t-game-current").textContent = state.currentGame;
  document.getElementById("t-game-total").textContent = state.totalGames;
  const list = document.getElementById("t-wins-list");
  list.innerHTML = "";
  // Find the current leader (most wins) for highlight.
  let maxWins = 0;
  PLAYERS.forEach((p) => {
    if ((state.wins[p.id] || 0) > maxWins) maxWins = state.wins[p.id];
  });
  // Sort players by wins descending for a clear leaderboard.
  const sorted = PLAYERS.slice().sort(
    (a, b) => (state.wins[b.id] || 0) - (state.wins[a.id] || 0)
  );
  sorted.forEach((p) => {
    const w = state.wins[p.id] || 0;
    const li = document.createElement("li");
    if (w === maxWins && maxWins > 0) li.classList.add("leader");
    li.innerHTML = `
      <span class="t-dot" style="background:${p.color}"></span>
      <span class="t-name">${p.name}</span>
      <span class="t-score">${w}</span>
    `;
    list.appendChild(li);
  });
}

// Show the between-games interstitial: reports who won the game that just
// finished and the running tally, then waits for the player to start the next
// game. Crucially this does NOT go back to the setup screen — the tournament
// is still running.
function showGameOverModal(winner, winLine) {
  const modal = document.getElementById("gameover-modal");
  document.getElementById("gameover-winner").innerHTML =
    `<span style="color:${winner.color}">${winner.name}</span> wins game ${state.currentGame}!`;
  document.getElementById("gameover-line").textContent = winLine;

  // Running tally across the whole tournament so far.
  const gamesSoFar = state.history.length;
  document.getElementById("gameover-score").textContent =
    `Tournament tally after ${gamesSoFar} of ${state.totalGames} games`;

  // Standings, leader highlighted, same ordering as the sidebar.
  const maxWins = PLAYERS.reduce((m, p) => Math.max(m, state.wins[p.id] || 0), 0);
  const sorted = PLAYERS.slice().sort(
    (a, b) => (state.wins[b.id] || 0) - (state.wins[a.id] || 0)
  );
  const list = document.getElementById("gameover-standings");
  list.innerHTML = "";
  sorted.forEach((p) => {
    const w = state.wins[p.id] || 0;
    const li = document.createElement("li");
    if (w === maxWins && maxWins > 0) li.classList.add("leader");
    li.innerHTML = `
      <span class="t-dot" style="background:${p.color}"></span>
      <span class="t-name">${p.name}</span>
      <span class="t-score">${w}</span>
    `;
    list.appendChild(li);
  });

  document.getElementById("gameover-progress").textContent =
    `${state.totalGames - gamesSoFar} game${state.totalGames - gamesSoFar === 1 ? "" : "s"} left in this tournament`;

  modal.hidden = false;
  document.body.classList.add("locked");
  // Put focus on the button so Enter/Space advances.
  const btn = document.getElementById("next-game-btn");
  btn.textContent = `▶ Game ${state.currentGame + 1} of ${state.totalGames}`;
  btn.focus();
}

function hideGameOverModal() {
  const modal = document.getElementById("gameover-modal");
  if (modal) modal.hidden = true;
  document.body.classList.remove("locked");
}

// Show the champion modal — picked the overall winner and pick a message
// from the amazing-message pool based on how close/dominant the win was.
function showChampionModal() {
  // Find the champion (player with most wins).
  let champ = PLAYERS[0];
  let champWins = state.wins[champ.id] || 0;
  PLAYERS.forEach((p) => {
    const w = state.wins[p.id] || 0;
    if (w > champWins) { champ = p; champWins = w; }
  });
  const totalOther = state.totalGames - champWins;
  const pool = (totalOther === 0)
    ? CHAMPION_LINES.dominant
    : (totalOther <= 1)
      ? CHAMPION_LINES.close
      : CHAMPION_LINES.default;
  const line = pool[Math.floor(Math.random() * pool.length)](champ.name, champWins);
  document.getElementById("champion-name").textContent = champ.name;
  document.getElementById("champion-subtitle").textContent = line;
  // Build stats line — final standings
  const sorted = PLAYERS.slice().sort(
    (a, b) => (state.wins[b.id] || 0) - (state.wins[a.id] || 0)
  );
  const stats = sorted.map((p) => `${p.name} ${state.wins[p.id] || 0}`)
                     .join("  ·  ");
  document.getElementById("champion-stats").innerHTML =
    `Final standings: ${stats}<br><span class="champion-games">` +
    `Tournament complete — all ${state.totalGames} game${state.totalGames === 1 ? "" : "s"} played. ` +
    `Start a new tournament to play again.</span>`;
  // Past the tournament now, so the side button reverts to "New Game".
  updateResetButton();
  // Spawn confetti
  spawnConfetti();
  document.getElementById("champion-modal").hidden = false;
  document.body.classList.add("locked");
}

function hideChampionModal() {
  document.getElementById("champion-modal").hidden = true;
  document.body.classList.remove("locked");
}

// Spawn confetti pieces behind the champion text.
function spawnConfetti() {
  const box = document.getElementById("champion-confetti");
  if (!box) return;
  box.innerHTML = "";
  const emojis = ["🎉", "✨", "🏆", "⭐", "💫", "🌟", "🎊", "💥"];
  for (let i = 0; i < 28; i++) {
    const s = document.createElement("span");
    s.textContent = emojis[Math.floor(Math.random() * emojis.length)];
    s.style.left = `${Math.random() * 100}%`;
    s.style.fontSize = `${1 + Math.random() * 1.2}rem`;
    s.style.animationDuration = `${2.4 + Math.random() * 2.6}s`;
    s.style.animationDelay = `${Math.random() * 1.2}s`;
    s.style.opacity = (0.7 + Math.random() * 0.3).toFixed(2);
    box.appendChild(s);
  }
}

// Reset the whole tournament — back to the first page (modal). Only reachable
// once the tournament is actually over (champion screen) or via "New Game".
function fullReset() {
  hideChampionModal();
  hideGameOverModal();
  // Cancel any pending post-win timer so it cannot fire later and pop a stale
  // modal on top of the setup screen.
  clearTimeout(state.winTimer);
  state.winTimer = null;
  stopAutoplay();
  state.tournamentDone = false;
  state.history = [];
  state.moving = false;
  state.winner = null;
  // Clear all selections in the modal
  document.querySelectorAll(".count-btn.selected").forEach((b) => b.classList.remove("selected"));
  document.querySelectorAll(".games-btn.selected").forEach((b) => b.classList.remove("selected"));
  document.getElementById("start-tournament-btn").disabled = true;
  showPlayerModal();
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  // Optional URL params for headless testing:
  //   ?n=2&g=3   → auto-select 2 players + 3 games and start the tournament
  //   ?test=1    → also skip the modal for quick local checks
  const urlParams = new URLSearchParams(location.search);
  const testPlayers = parseInt(urlParams.get("n"), 10);
  const testGames = parseInt(urlParams.get("g"), 10);
  const isTest = urlParams.get("test") === "1";

  // Pre-game modal: pick both players and games, then click the Start button.
  // The Start button stays disabled until both selections are made.
  let selectedPlayers = null;
  let selectedGames = null;
  document.querySelectorAll(".count-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedPlayers = parseInt(btn.dataset.count, 10) || 2;
      document.querySelectorAll(".count-btn").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      const startBtn = document.getElementById("start-tournament-btn");
      startBtn.disabled = !(selectedPlayers && selectedGames);
    });
  });
  document.querySelectorAll(".games-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedGames = parseInt(btn.dataset.games, 10) || 1;
      document.querySelectorAll(".games-btn").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      const startBtn = document.getElementById("start-tournament-btn");
      startBtn.disabled = !(selectedPlayers && selectedGames);
    });
  });
  document.getElementById("start-tournament-btn").addEventListener("click", () => {
    if (selectedPlayers && selectedGames) {
      startTournament(selectedPlayers, selectedGames);
    }
  });

  document.getElementById("roll-btn").addEventListener("click", rollAndMove);
  document.getElementById("reset-btn").addEventListener("click", () => {
    // "New Game" inside an active tournament — go back to the first page so
    // the player can pick a new player count + games count.
    fullReset();
  });
  document.getElementById("champion-restart-btn").addEventListener("click", () => {
    fullReset();
  });
  // Between-games interstitial: advance to the next game in the tournament.
  // The setup screen is deliberately NOT shown here — the tournament is still
  // running, so we just rebuild the board and carry on. The interstitial is
  // only ever shown when more games remain, so this always advances; there is
  // deliberately no early-out here, because a guard that could block would
  // strand the tournament and never deliver a final result.
  document.getElementById("next-game-btn").addEventListener("click", () => {
    hideGameOverModal();
    startNextGame();
  });

  // Open the first-page modal on load so the user picks players + games.
  if (testPlayers >= 1 && testPlayers <= 4 && testGames >= 1 && testGames <= 9) {
    startTournament(testPlayers, testGames);
  } else if (isTest) {
    // ?test=1 with no other params → quick 2-player single game
    startTournament(2, 1);
  } else {
    showPlayerModal();
  }
  // Keyboard shortcut: press R (or Space) to roll the dice, just like the
  // Roll Dice button. Ignored when any modal is open.
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    if (!document.getElementById("player-modal").hidden) return;
    if (!document.getElementById("champion-modal").hidden) return;
    // Between-games interstitial: let Enter/Space press "Next Game" instead of
    // rolling dice on a board that is already finished.
    const over = document.getElementById("gameover-modal");
    if (over && !over.hidden) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        hideGameOverModal();
        startNextGame();
      }
      return;
    }
    if (e.key === "r" || e.key === "R" || e.key === " ") {
      e.preventDefault();
      rollAndMove();
    }
  });

  // Headless test hook: ?test=1&fast=1 auto-plays whole games so the
  // multi-game tournament flow can be verified without 100s of manual rolls.
  // Only active when the explicit `test` param is present. The loop keeps a
  // single timer handle and a stop switch, so it is torn down the moment the
  // tournament is reset or finishes instead of leaving a timer chain running
  // (and the tab awake) for no reason.
  if (isTest && urlParams.get("fast") === "1") {
    const holdAtGameOver = urlParams.get("hold") === "1";
    const autoRoll = () => {
      if (!autoplay.on) return;
      autoplay.timer = setTimeout(autoRoll, 120);
      const over = document.getElementById("gameover-modal");
      if (over && !over.hidden) {
        // Tournament still running — take the interstitial's Next Game path.
        if (holdAtGameOver) return;  // leave it up so it can be screenshotted
        hideGameOverModal();
        startNextGame();
        return;
      }
      if (!document.getElementById("champion-modal").hidden) {
        stopAutoplay();               // tournament finished
        return;
      }
      if (state.winner !== null || state.moving) return;
      rollAndMove();
    };
    autoplay.on = true;
    autoRoll();
  }
});
