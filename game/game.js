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
// 3D cartoon snake — drawn entirely in SVG with gradients for 3D shading.
// Friendly cartoon face at the head square, long curving body, tail curl
// at the destination square. The full snake reads as one cartoon creature.
// ---------------------------------------------------------------------------
function draw3DSnake(svg, fromSquare, toSquare, palette, idx) {
  const a = squareSvg(fromSquare);
  const b = squareSvg(toSquare);
  if (!a || !b) return;

  const NS = "http://www.w3.org/2000/svg";

  // S-curve geometry: cubic bezier from head to tail with two control
  // points that weave the body through the squares it crosses.
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const perpX = -dy / len;
  const perpY =  dx / len;
  const offset = Math.min(len * 0.42, 220);
  const c1x = a.x + dx * 0.33 + perpX * offset;
  const c1y = a.y + dy * 0.33 + perpY * offset;
  const c2x = a.x + dx * 0.66 - perpX * offset;
  const c2y = a.y + dy * 0.66 - perpY * offset;
  const pathData = `M ${a.x},${a.y} C ${c1x},${c1y} ${c2x},${c2y} ${b.x},${b.y}`;

  // Unique gradient IDs so the 5 snakes don't share gradient definitions.
  const gid = `snake3d-${idx}`;

  // ---- 1. Define gradients (3D shading) ----
  const defs = document.createElementNS(NS, "defs");

  // Body radial gradient — light highlight on top, darker on the sides.
  const bodyGrad = document.createElementNS(NS, "linearGradient");
  bodyGrad.setAttribute("id", `${gid}-body`);
  bodyGrad.setAttribute("gradientUnits", "userSpaceOnUse");
  bodyGrad.setAttribute("x1", a.x - perpX * 18);
  bodyGrad.setAttribute("y1", a.y - perpY * 18);
  bodyGrad.setAttribute("x2", a.x + perpX * 18);
  bodyGrad.setAttribute("y2", a.y + perpY * 18);
  bodyGrad.innerHTML = `
    <stop offset="0%"   stop-color="${palette.light}" />
    <stop offset="40%"  stop-color="${palette.body}" />
    <stop offset="100%" stop-color="${palette.dark}" />
  `;
  defs.appendChild(bodyGrad);

  // Belly highlight (offset).
  const bellyGrad = document.createElementNS(NS, "linearGradient");
  bellyGrad.setAttribute("id", `${gid}-belly`);
  bellyGrad.setAttribute("gradientUnits", "userSpaceOnUse");
  bellyGrad.setAttribute("x1", "0");
  bellyGrad.setAttribute("y1", "0");
  bellyGrad.setAttribute("x2", "0");
  bellyGrad.setAttribute("y2", "1");
  bellyGrad.innerHTML = `
    <stop offset="0%"   stop-color="${palette.light}" stop-opacity="0" />
    <stop offset="100%" stop-color="${palette.light}" stop-opacity="0.9" />
  `;
  defs.appendChild(bellyGrad);

  // Head radial gradient — bright glossy cartoon look.
  const headGrad = document.createElementNS(NS, "radialGradient");
  headGrad.setAttribute("id", `${gid}-head`);
  headGrad.setAttribute("cx", "35%");
  headGrad.setAttribute("cy", "30%");
  headGrad.setAttribute("r", "70%");
  headGrad.innerHTML = `
    <stop offset="0%"   stop-color="${palette.light}" />
    <stop offset="55%"  stop-color="${palette.body}" />
    <stop offset="100%" stop-color="${palette.dark}" />
  `;
  defs.appendChild(headGrad);

  svg.appendChild(defs);

  // ---- 2. Body shadow (a darker, slightly offset duplicate for depth) ----
  const shadow = document.createElementNS(NS, "path");
  shadow.setAttribute("d", pathData);
  shadow.setAttribute("stroke", "rgba(0,0,0,0.35)");
  shadow.setAttribute("stroke-width", "30");
  shadow.setAttribute("stroke-linecap", "round");
  shadow.setAttribute("stroke-linejoin", "round");
  shadow.setAttribute("fill", "none");
  shadow.setAttribute("transform", `translate(2, 3)`);
  svg.appendChild(shadow);

  // ---- 3. Body outline (dark border) ----
  const outline = document.createElementNS(NS, "path");
  outline.setAttribute("d", pathData);
  outline.setAttribute("stroke", palette.dark);
  outline.setAttribute("stroke-width", "26");
  outline.setAttribute("stroke-linecap", "round");
  outline.setAttribute("stroke-linejoin", "round");
  outline.setAttribute("fill", "none");
  svg.appendChild(outline);

  // ---- 4. Body fill (3D gradient) ----
  const body = document.createElementNS(NS, "path");
  body.setAttribute("d", pathData);
  body.setAttribute("stroke", `url(#${gid}-body)`);
  body.setAttribute("stroke-width", "20");
  body.setAttribute("stroke-linecap", "round");
  body.setAttribute("stroke-linejoin", "round");
  body.setAttribute("fill", "none");
  svg.appendChild(body);

  // ---- 5. Glossy top highlight along the body (thin bright stroke) ----
  const gloss = document.createElementNS(NS, "path");
  gloss.setAttribute("d", pathData);
  gloss.setAttribute("stroke", "rgba(255,255,255,0.55)");
  gloss.setAttribute("stroke-width", "5");
  gloss.setAttribute("stroke-linecap", "round");
  gloss.setAttribute("stroke-linejoin", "round");
  gloss.setAttribute("fill", "none");
  gloss.setAttribute("transform", `translate(${perpX * -5}, ${perpY * -5})`);
  svg.appendChild(gloss);

  // ---- 6. Belly underglow (lighter, on the inside of the curve) ----
  const belly = document.createElementNS(NS, "path");
  belly.setAttribute("d", pathData);
  belly.setAttribute("stroke", palette.light);
  belly.setAttribute("stroke-width", "6");
  belly.setAttribute("stroke-linecap", "round");
  belly.setAttribute("stroke-linejoin", "round");
  belly.setAttribute("fill", "none");
  belly.setAttribute("opacity", "0.7");
  belly.setAttribute("transform", `translate(${perpX * 7}, ${perpY * 7})`);
  svg.appendChild(belly);

  // ---- 7. Cartoon face at the head (along the start tangent) ----
  // Tangent at the head (direction the snake is "looking" along the path).
  const headTangent = Math.atan2(c1y - a.y, c1x - a.x);
  const headR = 22;
  const headCx = a.x;
  const headCy = a.y;
  // Head sphere.
  const head = document.createElementNS(NS, "circle");
  head.setAttribute("cx", headCx);
  head.setAttribute("cy", headCy);
  head.setAttribute("r", headR);
  head.setAttribute("fill", `url(#${gid}-head)`);
  head.setAttribute("stroke", palette.dark);
  head.setAttribute("stroke-width", "3");
  svg.appendChild(head);
  // Two big cartoon eyes — white circles with dark pupils + tiny highlight.
  // Eye centers are positioned slightly forward of the head center, along
  // the tangent direction (so the snake "looks" along its body).
  const eyeFwd = 6;
  const eyeSide = 8;
  const eyeR = 5;
  for (const side of [-1, 1]) {
    const ex = headCx + Math.cos(headTangent) * eyeFwd + Math.cos(headTangent + Math.PI/2) * eyeSide * side;
    const ey = headCy + Math.sin(headTangent) * eyeFwd + Math.sin(headTangent + Math.PI/2) * eyeSide * side;
    // White eye.
    const eyeWhite = document.createElementNS(NS, "circle");
    eyeWhite.setAttribute("cx", ex);
    eyeWhite.setAttribute("cy", ey);
    eyeWhite.setAttribute("r", eyeR);
    eyeWhite.setAttribute("fill", "#ffffff");
    eyeWhite.setAttribute("stroke", palette.dark);
    eyeWhite.setAttribute("stroke-width", "1");
    svg.appendChild(eyeWhite);
    // Black pupil.
    const pupil = document.createElementNS(NS, "circle");
    pupil.setAttribute("cx", ex + Math.cos(headTangent) * 1.2);
    pupil.setAttribute("cy", ey + Math.sin(headTangent) * 1.2);
    pupil.setAttribute("r", eyeR * 0.55);
    pupil.setAttribute("fill", "#0a0a0a");
    svg.appendChild(pupil);
    // Tiny highlight dot.
    const sparkle = document.createElementNS(NS, "circle");
    sparkle.setAttribute("cx", ex + Math.cos(headTangent) * 1.8 + Math.cos(headTangent - Math.PI/2) * 1.2);
    sparkle.setAttribute("cy", ey + Math.sin(headTangent) * 1.8 + Math.sin(headTangent - Math.PI/2) * 1.2);
    sparkle.setAttribute("r", 1.2);
    sparkle.setAttribute("fill", "#ffffff");
    svg.appendChild(sparkle);
  }
  // Friendly smile — small curved arc on the head, oriented forward.
  const smileR = 6;
  const smileCx = headCx + Math.cos(headTangent) * 12;
  const smileCy = headCy + Math.sin(headTangent) * 12 + Math.sin(headTangent + Math.PI/2) * 4;
  const smile = document.createElementNS(NS, "path");
  // Half-circle smile.
  const smilePath = `M ${smileCx - smileR},${smileCy} A ${smileR} ${smileR} 0 0 0 ${smileCx + smileR},${smileCy}`;
  smile.setAttribute("d", smilePath);
  smile.setAttribute("stroke", palette.dark);
  smile.setAttribute("stroke-width", "2.2");
  smile.setAttribute("stroke-linecap", "round");
  smile.setAttribute("fill", "none");
  svg.appendChild(smile);

  // ---- 8. Tail-end curl at the destination ----
  // A small spiral curl that shows where the snake drops the player.
  const tailCx = b.x;
  const tailCy = b.y;
  const tailR = 14;
  // Outer spiral ring.
  const tailRing = document.createElementNS(NS, "circle");
  tailRing.setAttribute("cx", tailCx);
  tailRing.setAttribute("cy", tailCy);
  tailRing.setAttribute("r", tailR);
  tailRing.setAttribute("fill", `url(#${gid}-head)`);
  tailRing.setAttribute("stroke", palette.dark);
  tailRing.setAttribute("stroke-width", "3");
  svg.appendChild(tailRing);
  // Inner spiral mark.
  const tailInner = document.createElementNS(NS, "circle");
  tailInner.setAttribute("cx", tailCx);
  tailInner.setAttribute("cy", tailCy);
  tailInner.setAttribute("r", tailR * 0.5);
  tailInner.setAttribute("fill", "none");
  tailInner.setAttribute("stroke", palette.dark);
  tailInner.setAttribute("stroke-width", "2.5");
  tailInner.setAttribute("opacity", "0.8");
  svg.appendChild(tailInner);
  // Center dot.
  const tailCenter = document.createElementNS(NS, "circle");
  tailCenter.setAttribute("cx", tailCx);
  tailCenter.setAttribute("cy", tailCy);
  tailCenter.setAttribute("r", tailR * 0.18);
  tailCenter.setAttribute("fill", palette.dark);
  svg.appendChild(tailCenter);
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
