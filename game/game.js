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

const PLAYERS = [
  { id: 0, name: "Red",    color: "#e85a4f", sprite: "assets/pawn_red_transparent.png",    pos: 0 },
  { id: 1, name: "Blue",   color: "#4f8fe8", sprite: "assets/pawn_blue_transparent.png",   pos: 0 },
  { id: 2, name: "Green",  color: "#5dd39e", sprite: "assets/pawn_green_transparent.png",  pos: 0 },
  { id: 3, name: "Yellow", color: "#ffd24c", sprite: "assets/pawn_yellow_transparent.png", pos: 0 },
];

const SNAKE_SPRITES = [
  "assets/snake_green_transparent.png",
  "assets/snake_yellow_transparent.png",
];
const LADDER_SPRITE = "assets/ladder_transparent.png";
const DICE_SPRITE   = "assets/dice_transparent.png";

const state = {
  turn: 0,
  rolled: null,
  moving: false,
  winner: null,
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

// Returns CSS-percent position for a square's center.
function squareCenter(square) {
  const pos = positionForSquare(square);
  if (!pos) return null;
  return {
    left:  `${(pos.col + 0.5) * 10}%`,
    top:   `${(pos.row + 0.5) * 10}%`,
  };
}

// ---------------------------------------------------------------------------
// DOM construction
// ---------------------------------------------------------------------------
function buildBoard() {
  const board = document.getElementById("board");
  board.innerHTML = "";

  // Cell overlay (numbers)
  const grid = document.createElement("div");
  grid.className = "board-grid";
  grid.style.cssText = "position:absolute;inset:0;display:grid;grid-template-columns:repeat(10,1fr);grid-template-rows:repeat(10,1fr);";
  for (let i = 1; i <= 100; i++) {
    const cell = document.createElement("div");
    const visualRow = Math.floor((i - 1) / COLS);
    const colInRow = (i - 1) % COLS;
    const visualCol = (visualRow % 2 === 0) ? colInRow : (COLS - 1 - colInRow);
    cell.className = "cell " + (((visualRow + visualCol) % 2 === 0) ? "light" : "dark");
    cell.style.cssText = `grid-row:${visualRow + 1};grid-column:${visualCol + 1};display:flex;align-items:center;justify-content:center;font-size:0.85rem;font-weight:600;`;
    cell.textContent = i;
    grid.appendChild(cell);
  }
  board.appendChild(grid);

  // SVG overlay for thin ladders & connecting lines
  const overlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  overlay.setAttribute("class", "snakes-ladders");
  overlay.setAttribute("viewBox", `0 0 ${COLS * 100} ${ROWS * 100}`);
  overlay.setAttribute("preserveAspectRatio", "none");
  overlay.style.cssText = "position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;";
  // Ladder rails
  Object.entries(LADDERS).forEach(([from, to]) => {
    const a = positionForSquare(Number(from));
    const b = positionForSquare(Number(to));
    if (!a || !b) return;
    const x1 = (a.col + 0.5) * 100;
    const y1 = (a.row + 0.5) * 100;
    const x2 = (b.col + 0.5) * 100;
    const y2 = (b.row + 0.5) * 100;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx*dx + dy*dy);
    const ux = -dy / len * 10;
    const uy = dx / len * 10;
    [[x1+ux, y1+uy, x2+ux, y2+uy], [x1-ux, y1-uy, x2-ux, y2-uy]].forEach(([x, y, xn, yn]) => {
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
      const x = x1 + dx * t + ux;
      const y = y1 + dy * t + uy;
      const xn = x1 + dx * t - ux;
      const yn = y1 + dy * t - uy;
      const rung = document.createElementNS("http://www.w3.org/2000/svg", "line");
      rung.setAttribute("x1", x); rung.setAttribute("y1", y);
      rung.setAttribute("x2", xn); rung.setAttribute("y2", yn);
      rung.setAttribute("stroke", "#a36931");
      rung.setAttribute("stroke-width", "3");
      rung.setAttribute("stroke-linecap", "round");
      overlay.appendChild(rung);
    }
  });
  board.appendChild(overlay);

  // Ladder decorations at ladder bases (the wooden ladder sprite)
  const decorLayer = document.createElement("div");
  decorLayer.className = "decor-layer";
  decorLayer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:2;";
  Object.keys(LADDERS).forEach((from, idx) => {
    const img = document.createElement("img");
    img.src = LADDER_SPRITE;
    img.className = "decor decor-ladder";
    const c = squareCenter(Number(from));
    if (c) {
      img.style.left = c.left;
      img.style.top  = c.top;
      img.style.transform = "translate(-50%, -50%)";
    }
    decorLayer.appendChild(img);
  });
  board.appendChild(decorLayer);

  // Snake decorations at snake heads
  const snakeLayer = document.createElement("div");
  snakeLayer.className = "snake-layer";
  snakeLayer.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:2;";
  Object.keys(SNAKES).forEach((from, idx) => {
    const img = document.createElement("img");
    img.src = SNAKE_SPRITES[idx % SNAKE_SPRITES.length];
    img.className = "decor decor-snake";
    const c = squareCenter(Number(from));
    if (c) {
      img.style.left = c.left;
      img.style.top  = c.top;
      img.style.transform = "translate(-50%, -50%)";
    }
    snakeLayer.appendChild(img);
  });
  board.appendChild(snakeLayer);

  // Pawns layer (on top)
  const pawns = document.createElement("div");
  pawns.className = "pawns";
  pawns.id = "pawns";
  pawns.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:3;";
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
    li.classList.toggle("active", p.id === state.turn && state.winner === null);
    if (state.winner !== null) {
      li.classList.toggle("winner", p.id === state.winner);
    }
    const sq = li.querySelector(".psquare");
    if (sq) sq.textContent = p.pos;
  });
  const status = document.getElementById("status");
  if (state.winner !== null) {
    const w = PLAYERS[state.winner];
    status.innerHTML = `<strong style="color:${w.color}">${w.name}</strong> wins! 🏆`;
  } else {
    const p = PLAYERS[state.turn];
    status.innerHTML = `It's <strong style="color:${p.color}">${p.name}</strong>'s turn.`;
  }
}

// ---------------------------------------------------------------------------
// Pawn positioning
// ---------------------------------------------------------------------------
function placePawn(player) {
  const el = document.getElementById(`pawn-${player.id}`);
  if (!el) return;
  if (player.pos === 0) {
    el.style.left = "10%";
    el.style.top  = "105%";
    return;
  }
  const pos = positionForSquare(player.pos);
  if (!pos) return;
  // Stack multiple players on the same square slightly offset.
  const here = PLAYERS.filter((p) => p.pos === player.pos);
  const idx = here.indexOf(player);
  const offset = (idx % 4) * 0.07 - 0.105;
  el.style.left = `${(pos.col + 0.5) * 10 + offset * 100}%`;
  el.style.top  = `${(pos.row + 0.5) * 10 - offset * 40}%`;
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
  if (state.moving || state.winner !== null) return;
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
  PLAYERS.forEach((p) => (p.pos = 0));
  state.turn = 0;
  state.rolled = null;
  state.moving = false;
  state.winner = null;
  placeAllPawns();
  buildPlayerList();
  document.getElementById("dice-value").textContent = "—";
  document.getElementById("status").innerHTML = "Press <strong>Roll Dice</strong> to start.";
  document.getElementById("roll-btn").disabled = false;
  toast("New game ready");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
window.addEventListener("DOMContentLoaded", () => {
  buildBoard();
  buildPlayerList();
  placeAllPawns();
  document.getElementById("roll-btn").addEventListener("click", rollAndMove);
  document.getElementById("reset-btn").addEventListener("click", resetGame);
});