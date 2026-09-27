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

// Color palette for each snake — body color + matching head sprite
// (we only have green + yellow snake head PNGs, so we cycle).
const SNAKE_HEAD_SPRITES = [
  "assets/snake_green_transparent.png",
  "assets/snake_yellow_transparent.png",
];
const SNAKE_PALETTE = [
  { outline: "#1a4d2e", body: "#4caf50", belly: "#a5d6a7" }, // emerald
  { outline: "#8a5a1c", body: "#e8a83a", belly: "#ffe082" }, // gold
  { outline: "#7a1f2c", body: "#e85a4f", belly: "#ffab91" }, // coral
  { outline: "#3a1f5a", body: "#9c6fd1", belly: "#d1b3f0" }, // purple
  { outline: "#1c3d6a", body: "#4f8fe8", belly: "#90caf9" }, // azure
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
  const row = Math.floor(zeroBased / COLS);
  const colInRow = zeroBased % COLS;
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
    const visualRow = Math.floor((i - 1) / COLS);
    const colInRow = (i - 1) % COLS;
    const visualCol = (visualRow % 2 === 0) ? colInRow : (COLS - 1 - colInRow);
    cell.className = "cell " + (((visualRow + visualCol) % 2 === 0) ? "light" : "dark");
    cell.style.gridRow = visualRow + 1;
    cell.style.gridColumn = visualCol + 1;
    cell.textContent = i;
    grid.appendChild(cell);
  }
  board.appendChild(grid);

  // ---- SVG overlay for snake bodies + ladder rails ----
  const overlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
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
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
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
      const rung = document.createElementNS("http://www.w3.org/2000/svg", "line");
      rung.setAttribute("x1", x); rung.setAttribute("y1", y);
      rung.setAttribute("x2", xn); rung.setAttribute("y2", yn);
      rung.setAttribute("stroke", "#a36931");
      rung.setAttribute("stroke-width", "3");
      rung.setAttribute("stroke-linecap", "round");
      overlay.appendChild(rung);
    }
  });

  // Long snake bodies.
  Object.entries(SNAKES).forEach(([from, to], idx) => {
    const palette = SNAKE_PALETTE[idx % SNAKE_PALETTE.length];
    drawSnakeBody(overlay, Number(from), Number(to), palette);
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

  // ---- Snake heads (cute snake sprite at the bite square) + tail coils ----
  const snakeLayer = document.createElement("div");
  snakeLayer.className = "snake-layer";
  Object.entries(SNAKES).forEach(([from], idx) => {
    const palette = SNAKE_PALETTE[idx % SNAKE_PALETTE.length];
    // Head: cycle between the two available cute cartoon snake PNGs.
    const headSprite = SNAKE_HEAD_SPRITES[idx % SNAKE_HEAD_SPRITES.length];
    // Head: use the cute cartoon snake PNG (with eyes + smile).
    const headImg = document.createElement("img");
    headImg.src = headSprite;
    headImg.className = "decor decor-snake-head";
    headImg.alt = "snake head";
    const c = squareCenter(Number(from));
    if (c) {
      headImg.style.left = c.left;
      headImg.style.top  = c.top;
      headImg.style.transform = "translate(-50%, -50%)";
    }
    snakeLayer.appendChild(headImg);

    // Tail: draw an SVG coil on top of the destination square.
    const tailSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    tailSvg.setAttribute("viewBox", "0 0 100 100");
    tailSvg.classList.add("decor-snake-tail-svg");
    tailSvg.style.cssText = `position:absolute;left:${squareCenter(SNAKES[from]).left};top:${squareCenter(SNAKES[from]).top};transform:translate(-50%,-50%);width:8%;height:8%;pointer-events:none;`;
    // Coiled spiral tail (SVG path).
    const tailPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    tailPath.setAttribute("d", "M 50 50 m -22 0 a 22 22 0 1 1 44 0 a 16 16 0 1 1 -32 0 a 10 10 0 1 1 20 0");
    tailPath.setAttribute("stroke", palette.outline);
    tailPath.setAttribute("stroke-width", "6");
    tailPath.setAttribute("fill", "none");
    tailPath.setAttribute("stroke-linecap", "round");
    tailSvg.appendChild(tailPath);
    const tailFill = document.createElementNS("http://www.w3.org/2000/svg", "path");
    tailFill.setAttribute("d", "M 50 50 m -22 0 a 22 22 0 1 1 44 0 a 16 16 0 1 1 -32 0 a 10 10 0 1 1 20 0");
    tailFill.setAttribute("stroke", palette.body);
    tailFill.setAttribute("stroke-width", "3");
    tailFill.setAttribute("fill", "none");
    tailFill.setAttribute("stroke-linecap", "round");
    tailFill.setAttribute("opacity", "0.85");
    tailSvg.appendChild(tailFill);
    snakeLayer.appendChild(tailSvg);
  });
  board.appendChild(snakeLayer);

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
// Long snake body rendering
// ---------------------------------------------------------------------------
// Draws a thick, curving, scale-dotted snake body from start square to end
// square using SVG cubic beziers. The result is a cartoon "S"-shaped body
// with darker outline + main color + lighter belly highlight.
function drawSnakeBody(svg, fromSquare, toSquare, palette) {
  const a = squareSvg(fromSquare);
  const b = squareSvg(toSquare);
  if (!a || !b) return;

  // Compute an S-curve with two cubic-bezier segments so the body weaves
  // through the squares it crosses.
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx*dx + dy*dy);
  // Perpendicular unit vector (rotate the snake-line by 90°).
  const perpX = -dy / len;
  const perpY =  dx / len;
  // Offset magnitude proportional to distance — gives a nice big S-bend.
  const offset = Math.min(len * 0.45, 220);
  // Mid-point of the snake.
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  // Bend control points, alternating sides to weave.
  const c1x = a.x + dx * 0.33 + perpX * offset;
  const c1y = a.y + dy * 0.33 + perpY * offset;
  const c2x = a.x + dx * 0.66 - perpX * offset;
  const c2y = a.y + dy * 0.66 - perpY * offset;
  // Tangent at the start (for orienting the head sprite).
  const startTangent = Math.atan2(c1y - a.y, c1x - a.x);

  // SVG path string: M start C ctrl1 ctrl2 end.
  const pathData = `M ${a.x},${a.y} C ${c1x},${c1y} ${c2x},${c2y} ${b.x},${b.y}`;

  const NS = "http://www.w3.org/2000/svg";
  const p1 = document.createElementNS(NS, "path");
  p1.setAttribute("d", pathData);
  p1.setAttribute("stroke", palette.outline);
  p1.setAttribute("stroke-width", "22");
  p1.setAttribute("stroke-linecap", "round");
  p1.setAttribute("stroke-linejoin", "round");
  p1.setAttribute("fill", "none");
  svg.appendChild(p1);

  const p2 = document.createElementNS(NS, "path");
  p2.setAttribute("d", pathData);
  p2.setAttribute("stroke", palette.body);
  p2.setAttribute("stroke-width", "16");
  p2.setAttribute("stroke-linecap", "round");
  p2.setAttribute("stroke-linejoin", "round");
  p2.setAttribute("fill", "none");
  svg.appendChild(p2);

  // Belly highlight: thinner, offset along the perpendicular slightly so it
  // sits on the inside of each curve, like the lighter underside of a snake.
  // We approximate by drawing a stroke that's slightly translated by an
  // affine matrix — good enough visually.
  const p3 = document.createElementNS(NS, "path");
  p3.setAttribute("d", pathData);
  p3.setAttribute("stroke", palette.belly);
  p3.setAttribute("stroke-width", "6");
  p3.setAttribute("stroke-linecap", "round");
  p3.setAttribute("stroke-linejoin", "round");
  p3.setAttribute("fill", "none");
  p3.setAttribute("opacity", "0.85");
  // Translate the highlight path so it sits on one side of the body.
  p3.setAttribute("transform", `translate(${perpX * -4}, ${perpY * -4})`);
  svg.appendChild(p3);

  // Scale bands: small darker ovals along the path using <use> + dash trick.
  // Achieved by stroking a copy of the path with a dotted pattern in the
  // outline color, narrower than the body itself.
  const p4 = document.createElementNS(NS, "path");
  p4.setAttribute("d", pathData);
  p4.setAttribute("stroke", palette.outline);
  p4.setAttribute("stroke-width", "3");
  p4.setAttribute("stroke-linecap", "round");
  p4.setAttribute("fill", "none");
  p4.setAttribute("stroke-dasharray", "2 14");
  p4.setAttribute("opacity", "0.55");
  svg.appendChild(p4);

  // Stash the start tangent on the head element via a class so the CSS
  // animation rotates the head to look down the body.
  svg.dataset.lastStartTangent = String(startTangent);
}

// ---------------------------------------------------------------------------
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
  // Show modal immediately; game builds once user picks a player count.
  document.querySelectorAll(".count-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const n = parseInt(btn.dataset.count, 10) || 2;
      selectPlayerCount(n);
    });
  });
  document.getElementById("roll-btn").addEventListener("click", rollAndMove);
  document.getElementById("reset-btn").addEventListener("click", resetGame);
  // Hide modal by default until JS wires it up.
  document.getElementById("player-modal").hidden = false;
});
