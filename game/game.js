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
  { id: 0, name: "Red",    color: "#e85a4f", sprite: "assets/pawn_red.png",    pos: 0 },
  { id: 1, name: "Blue",   color: "#4f8fe8", sprite: "assets/pawn_blue.png",   pos: 0 },
  { id: 2, name: "Green",  color: "#5dd39e", sprite: "assets/pawn_green.png",  pos: 0 },
  { id: 3, name: "Yellow", color: "#ffd24c", sprite: "assets/pawn_yellow.png", pos: 0 },
];

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
  const row = Math.floor(zeroBased / COLS); // 0 = top row = 100..91
  const colInRow = zeroBased % COLS;
  // Even rows (0, 2, ...) go left-to-right; odd rows right-to-left
  const visualCol = (row % 2 === 0) ? colInRow : (COLS - 1 - colInRow);
  return {
    row,
    col: visualCol,
  };
}

// Convert square number to (row, col) in the rendered grid (top-left = square 100)
function cellOrderIndex(square) {
  if (square < 1 || square > 100) return null;
  const zeroBased = square - 1;
  const row = Math.floor(zeroBased / COLS);
  const colInRow = zeroBased % COLS;
  const visualCol = (row % 2 === 0) ? colInRow : (COLS - 1 - colInRow);
  // Render index: row 0 first, col 0 first
  return row * COLS + visualCol;
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
  grid.style.position = "absolute";
  grid.style.inset = "0";
  for (let i = 1; i <= 100; i++) {
    const cell = document.createElement("div");
    const visualRow = Math.floor((i - 1) / COLS);
    const colInRow = (i - 1) % COLS;
    const visualCol = (visualRow % 2 === 0) ? colInRow : (COLS - 1 - colInRow);
    cell.className = "cell " + (((visualRow + visualCol) % 2 === 0) ? "light" : "dark");
    cell.style.gridRow = (visualRow + 1);
    cell.style.gridColumn = (visualCol + 1);
    cell.style.display = "flex";
    cell.style.alignItems = "center";
    cell.style.justifyContent = "center";
    cell.style.fontSize = "0.85rem";
    cell.style.fontWeight = "600";
    cell.textContent = i;
    grid.appendChild(cell);
  }
  board.appendChild(grid);

  // Snakes/ladders SVG overlay
  const overlay = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  overlay.setAttribute("class", "snakes-ladders");
  overlay.setAttribute("viewBox", `0 0 ${COLS * 100} ${ROWS * 100}`);
  overlay.setAttribute("preserveAspectRatio", "none");
  overlay.style.position = "absolute";
  overlay.style.inset = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.zIndex = "1";

  // Ladders (green lines + rungs)
  Object.entries(LADDERS).forEach(([from, to]) => {
    const a = positionForSquare(Number(from));
    const b = positionForSquare(Number(to));
    if (!a || !b) return;
    const x1 = (a.col + 0.5) * 100;
    const y1 = (a.row + 0.5) * 100;
    const x2 = (b.col + 0.5) * 100;
    const y2 = (b.row + 0.5) * 100;
    // rails
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx*dx + dy*dy);
    const ux = -dy / len * 12; // perpendicular offset
    const uy = dx / len * 12;
    [[x1+ux, y1+uy, x2+ux, y2+uy], [x1-ux, y1-uy, x2-ux, y2-uy]].forEach(([x, y, xn, yn]) => {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", x); line.setAttribute("y1", y);
      line.setAttribute("x2", xn); line.setAttribute("y2", yn);
      line.setAttribute("stroke", "#7c4a1c");
      line.setAttribute("stroke-width", "6");
      line.setAttribute("stroke-linecap", "round");
      overlay.appendChild(line);
    });
    // rungs
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
      rung.setAttribute("stroke-width", "4");
      rung.setAttribute("stroke-linecap", "round");
      overlay.appendChild(rung);
    }
  });

  // Snakes (red curves)
  Object.entries(SNAKES).forEach(([from, to]) => {
    const a = positionForSquare(Number(from));
    const b = positionForSquare(Number(to));
    if (!a || !b) return;
    const x1 = (a.col + 0.5) * 100;
    const y1 = (a.row + 0.5) * 100;
    const x2 = (b.col + 0.5) * 100;
    const y2 = (b.row + 0.5) * 100;
    // Bezier with control points offset sideways
    const cx1 = x1 + (x2 - x1) * 0.25 + (Math.random() - 0.5) * 30;
    const cy1 = y1 - 30;
    const cx2 = x2 - (x2 - x1) * 0.25 + (Math.random() - 0.5) * 30;
    const cy2 = y2 + 30;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`);
    path.setAttribute("stroke", "#d8323a");
    path.setAttribute("stroke-width", "8");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("opacity", "0.85");
    overlay.appendChild(path);
  });

  board.appendChild(overlay);

  // Pawns layer
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
// Player list sidebar
// ---------------------------------------------------------------------------
function buildPlayerList() {
  const ol = document.getElementById("player-list");
  ol.innerHTML = "";
  PLAYERS.forEach((p, i) => {
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
  // Off-board (start): stack at "0" position (just before square 1, bottom-left)
  let pos = positionForSquare(Math.max(1, player.pos));
  if (player.pos === 0) {
    // place just below the board at the start
    el.style.left = "10%";
    el.style.top  = "105%";
  } else if (pos) {
    // Stack multiple players on the same square slightly offset
    const hereCount = PLAYERS.filter((p) => p.pos === player.pos).indexOf(player);
    const offset = (hereCount % 4) * 0.08 - 0.12;
    el.style.left = `${(pos.col + 0.5) * 10 + offset * 100}%`;
    el.style.top  = `${(pos.row + 0.5) * 10 - offset * 40}%`;
  }
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

  // Check snake / ladder
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

  // Win check
  if (player.pos === 100) {
    state.winner = player.id;
    toast(`🏆 ${player.name} wins!`);
    updateActivePlayer();
    state.moving = false;
    return;
  }

  // Next turn
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