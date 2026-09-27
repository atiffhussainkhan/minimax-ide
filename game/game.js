// Snake & Ladder — 3D Cartoon Edition
// All assets are 3D cartoon characters generated free via Pollinations.
// No accounts, no OAuth, no payment.

const BOARD_SIZE = 100;
const ROWS = 10;
const COLS = 10;

// Classic snake & ladder mappings (start -> end)
const SNAKES = {
  99: 54, 70: 55, 52: 42, 25: 2, 95: 72,
};
const LADDERS = {
  6: 25, 11: 40, 20: 59, 27: 74, 36: 57,
  51: 67, 63: 81, 71: 91, 80: 99,
};

// Each snake's tint family. Body / dark / light are used by the SVG-based
// 3D cartoon snake renderer so the gradient shading reads as 3D.
const SNAKE_PALETTE = [
  { hue: "0deg",   body: "#4caf50", dark: "#1b5e20", light: "#a5d6a7", tint: "#4caf50" }, // emerald
  { hue: "330deg", body: "#ffb74d", dark: "#bf6f1c", light: "#ffe082", tint: "#ffb74d" }, // gold-rose
  { hue: "200deg", body: "#42a5f5", dark: "#0d47a1", light: "#90caf9", tint: "#42a5f5" }, // sky-blue
  { hue: "270deg", body: "#ba68c8", dark: "#4a148c", light: "#d1b3f0", tint: "#ba68c8" }, // purple
  { hue: "160deg", body: "#26a69a", dark: "#004d40", light: "#80cbc4", tint: "#26a69a" }, // teal
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

const LADDER_SPRITE = "assets/ladder_transparent.png";

const state = {
  turn: 0,
  rolled: null,
  moving: false,
  winner: null,
  playerCount: 0,
};

// ---------------------------------------------------------------------------
// Board geometry
// ---------------------------------------------------------------------------
// Snake-style numbering: row 0 has squares 100..91 (left to right),
// row 1 has 81..90 (right to left), etc.
function positionForSquare(square) {
  if (square < 1 || square > 100) return null;
  const zeroBased = square - 1;
  // Board orientation is bottom-to-top: square 1 at bottom-left, square 100
  // at top-right. The bottom row (row 0) goes left-to-right, the next row
  // goes right-to-left, in classic zig-zag fashion.
  const oldRow = Math.floor(zeroBased / COLS);
  const colInRow = zeroBased % COLS;
  const row = (ROWS - 1) - oldRow;  // flip vertically so 1 is at bottom
  const visualCol = (row % 2 === 0) ? colInRow : (COLS - 1 - colInRow);
  return { row, col: visualCol };
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
  if (state.winner !== null) {
    const w = PLAYERS[state.winner];
    status.innerHTML = `<strong style="color:${w.color}">${w.name}</strong> wins! 🏆`;
  } else if (PLAYERS.length > 0) {
    const p = PLAYERS[state.turn];
    status.innerHTML = `It's <strong style="color:${p.color}">${p.name}</strong>'s turn.`;
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
    // Use positionForSquare() so cell layout matches the snake/ladder
    // sprite positions. orientation is bottom-up: square 1 at bottom-left,
    // square 100 at top-right.
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
  Object.entries(LADDERS).forEach(([from, to]) => {
    const a = squareSvg(Number(from));
    const b = squareSvg(Number(to));
    if (!a || !b) return;
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.sqrt(dx*dx + dy*dy);
    const ux = -dy / len * 10;
    const uy = dx / len * 10;
    [[a.x+ux, a.y+uy, b.x+ux, b.y+uy], [a.x-ux, a.y-uy, b.x-ux, b.y-uy]].forEach(([x, y, xn, yn]) => {
      const line = document.createElementNS(NS, "line");
      line.setAttribute("x1", x); line.setAttribute("y1", y);
      line.setAttribute("x2", xn); line.setAttribute("y2", yn);
      line.setAttribute("stroke", "#7c4a1c");
      line.setAttribute("stroke-width", "5");
      line.setAttribute("stroke-linecap", "round");
      overlay.appendChild(line);
    });
    const steps = 5;
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const x = a.x + dx * t + ux;
      const y = a.y + dy * t + uy;
      const xn = a.x + dx * t - ux;
      const yn = a.y + dy * t - uy;
      const rung = document.createElementNS(NS, "line");
      rung.setAttribute("x1", x); rung.setAttribute("y1", y);
      rung.setAttribute("x2", xn); rung.setAttribute("y2", yn);
      rung.setAttribute("stroke", "#a36931");
      rung.setAttribute("stroke-width", "3");
      rung.setAttribute("stroke-linecap", "round");
      overlay.appendChild(rung);
    }
  });

  // 3D cartoon snake bodies — drawn as SVG groups with gradients +
  // cartoon face at the head + tail curl at the end.
  Object.entries(SNAKES).forEach(([from, to], idx) => {
    const palette = SNAKE_PALETTE[idx % SNAKE_PALETTE.length];
    const g = document.createElementNS(NS, "g");
    g.setAttribute("class", "snake-3d");
    g.setAttribute("opacity", "0.75");
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
// 3D cartoon snake — uses a real raster sprite generated by Pollinations
// (3D cartoon real-life snake, transparent background). The sprite is
// hue-rotated per palette and rendered as an SVG <image> rotated to match
// the snake's path direction. Two copies are placed: a large primary at the
// midpoint of the path, and a smaller tail copy at the destination square.
// ---------------------------------------------------------------------------
const SNAKE_SPRITE_HREF = "assets/snake_real2/snake_main.png";
const SNAKE_SPRITE_W = 1280;  // raw sprite width (px) — long slender sprite
const SNAKE_SPRITE_H = 300;   // raw sprite height (px) — thin body

function draw3DSnake(svg, fromSquare, toSquare, palette, idx) {
  const a = squareSvg(fromSquare);
  const b = squareSvg(toSquare);
  if (!a || !b) return;

  const NS = "http://www.w3.org/2000/svg";

  // Path geometry: from start square to end square
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  // Path angle in degrees, with 0 = pointing right. Sprite has the head on
  // the right side, tail on the left.
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;

  // Build a per-snake hue-rotate filter so each of the 5 snakes gets a
  // distinct color from the same source sprite.
  const gid = `snake-img-${idx}`;
  const defs = document.createElementNS(NS, "defs");
  svg.appendChild(defs);
  const filter = document.createElementNS(NS, "filter");
  filter.setAttribute("id", gid);
  filter.setAttribute("color-interpolation-filters", "sRGB");
  filter.innerHTML = `
    <feColorMatrix type="hueRotate" values="${parseHue(palette.hue)}" />
    <feComponentTransfer>
      <feFuncA type="linear" slope="0.95" />
    </feComponentTransfer>
  `;
  defs.appendChild(filter);

  // Place one big sprite spanning the path from start (head) to end (tail),
  // rotated so the snake's body axis matches the path direction. The sprite
  // already has the snake in a C-curve shape, so a straight stretch reads as
  // a friendly 3D cartoon snake bridging the two squares.

  // Mid-point between a and b is the center of the sprite
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2;

  // Sprite aspect ratio = 962/383 ≈ 2.51
  const aspect = SNAKE_SPRITE_W / SNAKE_SPRITE_H;
  // Snake sprite width = 1.0x path length so the snake just spans from
  // start square to end square. Clamped 180–360 SVG units so:
  //   - short snakes (e.g. 52→42) don't blow past their squares
  //   - long snakes (e.g. 99→54) stay inside the board and don't overlap
  //     with neighboring snakes/ladders
  const targetW = Math.min(Math.max(len * 1.0, 180), 360);
  const targetH = targetW / aspect;

  const img = document.createElementNS(NS, "image");
  img.setAttributeNS("http://www.w3.org/1999/xlink", "href", SNAKE_SPRITE_HREF);
  img.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", SNAKE_SPRITE_HREF);
  img.setAttribute("href", SNAKE_SPRITE_HREF);
  img.setAttribute("width", SNAKE_SPRITE_W);
  img.setAttribute("height", SNAKE_SPRITE_H);
  img.setAttribute("preserveAspectRatio", "xMidYMid meet");
  img.setAttribute("filter", `url(#${gid})`);
  // Place the sprite: x/y is top-left corner before transform.
  // SVG image y-axis grows downward, and the sprite's head is on the RIGHT
  // side of the image. We rotate by the path angle so the snake's body axis
  // matches A→B. The sprite's head naturally ends up in the +angle
  // direction (= toward B = end square). Since the snake should BITE at the
  // start square (A) and tail-slide to the end (B), we flip horizontally
  // so the head points back toward A.
  const flip = -1;
  img.setAttribute(
    "transform",
    `translate(${cx} ${cy}) rotate(${angle}) scale(${flip * targetW / SNAKE_SPRITE_W} ${targetH / SNAKE_SPRITE_H}) translate(${-SNAKE_SPRITE_W / 2} ${-SNAKE_SPRITE_H / 2})`
  );
  svg.appendChild(img);
}

// Helper — convert "330deg" → 330 (number). feColorMatrix hueRotate wants a
// degree value as a number.
function parseHue(h) {
  if (typeof h === "number") return h;
  return parseFloat(String(h).replace("deg", "")) || 0;
}
// Pawn positioning — recentered, smaller offsets
// ---------------------------------------------------------------------------
function placePawn(player) {
  const el = document.getElementById(`pawn-${player.id}`);
  if (!el) return;
  if (player.pos === 0) {
    // Off-board "home" position: park pawns under square 1 in a fan.
    const off = PAWN_OFFSETS[player.id] || { dx: 0, dy: 0 };
    el.style.left = `${(0.5) * 10 + off.dx}%`;
    el.style.top  = `${(0.5) * 10 + 6 + off.dy}%`;
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
  if (state.moving || state.winner !== null || PLAYERS.length === 0) return;
  state.moving = true;
  const rollBtn = document.getElementById("roll-btn");
  rollBtn.disabled = true;

  const player = PLAYERS[state.turn];
  const value = rollDie();
  showDice(value);

  await sleep(550);

  const from = player.pos;
  let to = from + value;

  if (to > 100) {
    toast(`${player.name} rolled ${value} — bounce! Stay on ${from}`);
  } else {
    player.pos = to;
    placePawn(player);
    updateActivePlayer();
    toast(`${player.name} rolled ${value} → ${to}`);
  }

  await sleep(700);
  if (LADDERS[player.pos]) {
    const dest = LADDERS[player.pos];
    toast(`🪜 Ladder! ${player.name} climbs ${player.pos} → ${dest}`);
    await sleep(700);
    player.pos = dest;
    placePawn(player);
    updateActivePlayer();
  } else if (SNAKES[player.pos]) {
    const dest = SNAKES[player.pos];
    toast(`🐍 Snake! ${player.name} slides ${player.pos} → ${dest}`);
    await sleep(700);
    player.pos = dest;
    placePawn(player);
    updateActivePlayer();
  }

  if (player.pos === 100) {
    state.winner = player.id;
    toast(`🏆 ${player.name} wins!`);
    updateActivePlayer();
    state.moving = false;
    return;
  }

  state.turn = (state.turn + 1) % PLAYERS.length;
  updateActivePlayer();
  state.moving = false;
  rollBtn.disabled = false;
}

function resetGame() {
  // Re-show the player-count selector.
  showPlayerModal();
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
  n = Math.max(1, Math.min(4, n | 0));
  state.playerCount = n;
  // Slice the canonical player list to the chosen count and reset positions.
  PLAYERS = ALL_PLAYERS.slice(0, n).map((p) => ({ ...p, pos: 0 }));
  state.turn = 0;
  state.rolled = null;
  state.moving = false;
  state.winner = null;
  hidePlayerModal();
  buildBoard();
  buildPlayerList();
  placeAllPawns();
  document.getElementById("dice-value").textContent = "—";
  document.getElementById("status").innerHTML = `Game on! <strong style="color:${PLAYERS[0].color}">${PLAYERS[0].name}</strong> rolls first.`;
  toast(`${n}-player game ready`);
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  // Wire player-count buttons — these re-show the modal when clicked.
  document.querySelectorAll(".count-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const n = parseInt(btn.dataset.count, 10) || 2;
      selectPlayerCount(n);
    });
  });
  document.getElementById("roll-btn").addEventListener("click", rollAndMove);
  document.getElementById("reset-btn").addEventListener("click", resetGame);
  // Hide modal by default; game boots directly with default 2 players
  // so the player can start rolling dice immediately. The "New Game"
  // button re-shows the modal for changing player count.
  document.getElementById("player-modal").hidden = true;
  selectPlayerCount(2);
  // Keyboard shortcut: press R (or Space) to roll the dice, just like the
  // Roll Dice button. Great for keyboard-driven play.
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    if (e.key === "r" || e.key === "R" || e.key === " ") {
      e.preventDefault();
      rollAndMove();
    }
  });
});
