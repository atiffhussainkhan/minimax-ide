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

// Color palette for each scary snake — dark, menacing, monster-themed.
const SNAKE_HEAD_SPRITES = [
  "assets/scary/scary_snake_emerald.png",
  "assets/scary/scary_snake_gold.png",
  "assets/scary/scary_snake_crimson.png",
  "assets/scary/scary_snake_purple.png",
  "assets/scary/scary_snake_azure.png",
];
const SNAKE_PALETTE = [
  // Darker, more menacing shades — these are monster snakes now.
  { outline: "#0a1f12", body: "#2e7d32", belly: "#81c784", spine: "#a5d6a7" }, // venomous emerald
  { outline: "#3a2510", body: "#bf6f1c", belly: "#ffb74d", spine: "#ffe082" }, // desert viper
  { outline: "#2a0a0e", body: "#b71c1c", belly: "#ef5350", spine: "#ff8a80" }, // crimson pit viper
  { outline: "#1a0a2a", body: "#6a1b9a", belly: "#ba68c8", spine: "#ea80fc" }, // shadow cobra
  { outline: "#0a1929", body: "#1565c0", belly: "#42a5f5", spine: "#80d8ff" }, // abyssal mamba
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

  // Long snake bodies — each wrapped in a <g opacity="0.8"> so the WHOLE
  // snake (body + head + tongue + tail) reads as 20%-transparent.
  Object.entries(SNAKES).forEach(([from, to], idx) => {
    const palette = SNAKE_PALETTE[idx % SNAKE_PALETTE.length];
    const snakeGroup = document.createElementNS(NS, "g");
    snakeGroup.setAttribute("class", "snake-svg");
    snakeGroup.setAttribute("opacity", "0.8");
    drawSnakeBody(snakeGroup, Number(from), Number(to), palette);
    overlay.appendChild(snakeGroup);
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
  // Each snake's head + tail is wrapped in a div with opacity 0.8 so the
  // whole snake reads as 20%-transparent (matches the SVG body group).
  const snakeLayer = document.createElement("div");
  snakeLayer.className = "snake-layer";
  Object.entries(SNAKES).forEach(([from], idx) => {
    const palette = SNAKE_PALETTE[idx % SNAKE_PALETTE.length];
    const headSprite = SNAKE_HEAD_SPRITES[idx % SNAKE_HEAD_SPRITES.length];

    // Wrapper so opacity applies to head + tail together.
    const snakeWrap = document.createElement("div");
    snakeWrap.className = "snake-piece";
    snakeWrap.style.cssText = "opacity:0.8;";

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
    snakeWrap.appendChild(headImg);

    // Tail: draw an SVG coil on top of the destination square.
    const tailSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    tailSvg.setAttribute("viewBox", "0 0 100 100");
    tailSvg.classList.add("decor-snake-tail-svg");
    const t = squareCenter(SNAKES[from]);
    tailSvg.style.cssText = `position:absolute;left:${t.left};top:${t.top};transform:translate(-50%,-50%);width:9%;height:9%;pointer-events:none;`;
    // Coiled spiral tail (SVG path) — bigger, scarier.
    const tailPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    tailPath.setAttribute("d", "M 50 50 m -26 0 a 26 26 0 1 1 52 0 a 19 19 0 1 1 -38 0 a 12 12 0 1 1 24 0 a 6 6 0 1 1 -12 0");
    tailPath.setAttribute("stroke", palette.outline);
    tailPath.setAttribute("stroke-width", "8");
    tailPath.setAttribute("fill", "none");
    tailPath.setAttribute("stroke-linecap", "round");
    tailSvg.appendChild(tailPath);
    const tailFill = document.createElementNS("http://www.w3.org/2000/svg", "path");
    tailFill.setAttribute("d", "M 50 50 m -26 0 a 26 26 0 1 1 52 0 a 19 19 0 1 1 -38 0 a 12 12 0 1 1 24 0 a 6 6 0 1 1 -12 0");
    tailFill.setAttribute("stroke", palette.body);
    tailFill.setAttribute("stroke-width", "4");
    tailFill.setAttribute("fill", "none");
    tailFill.setAttribute("stroke-linecap", "round");
    tailSvg.appendChild(tailFill);
    snakeWrap.appendChild(tailSvg);
    snakeLayer.appendChild(snakeWrap);
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
// Long snake body rendering — scary monster snake edition (full-body sync)
// ---------------------------------------------------------------------------
// Draws a thick, curving, scale-spiked snake body from start square to end
// square using SVG cubic beziers. Each snake gets:
//   - dark thick outline (heavy menace)
//   - main venomous body color
//   - belly highlight stripe (offset)
//   - dorsal scale-band stripes (perpendicular cross-stripes like a banded
//     venomous snake — coral-snake style menace)
//   - dense triangular spine spikes along its back
//   - a venomous fanged mouth at the head
//   - a forked tongue flicking out from the head along startTangent
//
// Caller is expected to wrap the returned group in opacity=0.8 for the
// 20%-transparent overall snake look.
function drawSnakeBody(svg, fromSquare, toSquare, palette) {
  const a = squareSvg(fromSquare);
  const b = squareSvg(toSquare);
  if (!a || !b) return;

  // S-curve geometry.
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx*dx + dy*dy);
  const perpX = -dy / len;
  const perpY =  dx / len;
  const offset = Math.min(len * 0.45, 220);
  const c1x = a.x + dx * 0.33 + perpX * offset;
  const c1y = a.y + dy * 0.33 + perpY * offset;
  const c2x = a.x + dx * 0.66 - perpX * offset;
  const c2y = a.y + dy * 0.66 - perpY * offset;
  const startTangent = Math.atan2(c1y - a.y, c1x - a.x);

  const pathData = `M ${a.x},${a.y} C ${c1x},${c1y} ${c2x},${c2y} ${b.x},${b.y}`;
  const NS = "http://www.w3.org/2000/svg";

  // ----- 1. Body outline — extra thick menacing border. -----
  const p1 = document.createElementNS(NS, "path");
  p1.setAttribute("d", pathData);
  p1.setAttribute("stroke", palette.outline);
  p1.setAttribute("stroke-width", "32");
  p1.setAttribute("stroke-linecap", "round");
  p1.setAttribute("stroke-linejoin", "round");
  p1.setAttribute("fill", "none");
  svg.appendChild(p1);

  // ----- 2. Main venomous body color (thicker). -----
  const p2 = document.createElementNS(NS, "path");
  p2.setAttribute("d", pathData);
  p2.setAttribute("stroke", palette.body);
  p2.setAttribute("stroke-width", "24");
  p2.setAttribute("stroke-linecap", "round");
  p2.setAttribute("stroke-linejoin", "round");
  p2.setAttribute("fill", "none");
  svg.appendChild(p2);

  // ----- 3. Dorsal ridge: thin dark stripe along the TOP of the body.
  //         (translated along the perpendicular vector). Makes the body
  //         look like it has a "spine" running along its back. -----
  const dorsal = document.createElementNS(NS, "path");
  dorsal.setAttribute("d", pathData);
  dorsal.setAttribute("stroke", palette.outline);
  dorsal.setAttribute("stroke-width", "10");
  dorsal.setAttribute("stroke-linecap", "round");
  dorsal.setAttribute("stroke-linejoin", "round");
  dorsal.setAttribute("fill", "none");
  dorsal.setAttribute("transform", `translate(${perpX * 6}, ${perpY * 6})`);
  dorsal.setAttribute("opacity", "0.85");
  svg.appendChild(dorsal);

  // ----- 4. Belly highlight stripe (offset to the other side). -----
  const belly = document.createElementNS(NS, "path");
  belly.setAttribute("d", pathData);
  belly.setAttribute("stroke", palette.belly);
  belly.setAttribute("stroke-width", "8");
  belly.setAttribute("stroke-linecap", "round");
  belly.setAttribute("stroke-linejoin", "round");
  belly.setAttribute("fill", "none");
  belly.setAttribute("transform", `translate(${perpX * -6}, ${perpY * -6})`);
  belly.setAttribute("opacity", "0.85");
  svg.appendChild(belly);

  // ----- 5. Belly band stripes (perpendicular cross-stripes, coral-snake
  //         style menace). Sample the bezier at regular intervals and draw
  //         short dark bars perpendicular to the tangent. -----
  const bandSamples = Math.max(8, Math.floor(len / 14));
  for (let s = 1; s < bandSamples; s++) {
    const t = s / bandSamples;
    const omt = 1 - t;
    const px = omt*omt*omt * a.x + 3*omt*omt*t * c1x + 3*omt*t*t * c2x + t*t*t * b.x;
    const py = omt*omt*omt * a.y + 3*omt*omt*t * c1y + 3*omt*t*t * c2y + t*t*t * b.y;
    const tx = 3*omt*omt * (c1x - a.x) + 6*omt*t * (c2x - c1x) + 3*t*t * (b.x - c2x);
    const ty = 3*omt*omt * (c1y - a.y) + 6*omt*t * (c2y - c1y) + 3*t*t * (b.y - c2y);
    const tlen = Math.sqrt(tx*tx + ty*ty) || 1;
    const ux = tx / tlen;
    const uy = ty / tlen;
    const nx = -uy;
    const ny =  ux;
    // Band perpendicular to body, full width across the body.
    const bandHalf = 11;
    const band = document.createElementNS(NS, "line");
    band.setAttribute("x1", px + nx * bandHalf);
    band.setAttribute("y1", py + ny * bandHalf);
    band.setAttribute("x2", px - nx * bandHalf);
    band.setAttribute("y2", py - ny * bandHalf);
    band.setAttribute("stroke", palette.outline);
    band.setAttribute("stroke-width", "2.5");
    band.setAttribute("stroke-linecap", "round");
    band.setAttribute("opacity", "0.7");
    svg.appendChild(band);
  }

  // ----- 6. Dense spine spikes along the back. -----
  const samples = Math.max(8, Math.floor(len / 14));
  for (let s = 1; s < samples; s++) {
    const t = s / samples;
    const omt = 1 - t;
    const px = omt*omt*omt * a.x + 3*omt*omt*t * c1x + 3*omt*t*t * c2x + t*t*t * b.x;
    const py = omt*omt*omt * a.y + 3*omt*omt*t * c1y + 3*omt*t*t * c2y + t*t*t * b.y;
    const tx = 3*omt*omt * (c1x - a.x) + 6*omt*t * (c2x - c1x) + 3*t*t * (b.x - c2x);
    const ty = 3*omt*omt * (c1y - a.y) + 6*omt*t * (c2y - c1y) + 3*t*t * (b.y - c2y);
    const tlen = Math.sqrt(tx*tx + ty*ty) || 1;
    const ux = tx / tlen;
    const uy = ty / tlen;
    const nx = -uy;
    const ny =  ux;
    // Bigger, sharper spikes.
    const baseW = 6;
    const tipLen = 14;
    const bx = px + nx * baseW;
    const by = py + ny * baseW;
    const tx2 = px - nx * baseW;
    const ty2 = py - ny * baseW;
    const tipx = px + nx * (baseW + tipLen);
    const tipy = py + ny * (baseW + tipLen);
    const tri = document.createElementNS(NS, "polygon");
    tri.setAttribute("points", `${bx},${by} ${tx2},${ty2} ${tipx},${tipy}`);
    tri.setAttribute("fill", palette.outline);
    tri.setAttribute("stroke", palette.spine);
    tri.setAttribute("stroke-width", "1.5");
    tri.setAttribute("stroke-linejoin", "round");
    svg.appendChild(tri);
  }

  // ----- 7. Fanged mouth decoration just past the head, pointing along
  //         the start tangent. Two white fangs + a black maw — adds menace
  //         in case the head sprite doesn't show the mouth clearly. -----
  const mouthR = 16;
  const mx = a.x + Math.cos(startTangent) * mouthR;
  const my = a.y + Math.sin(startTangent) * mouthR;
  // Maw (dark ellipse).
  const maw = document.createElementNS(NS, "ellipse");
  maw.setAttribute("cx", mx);
  maw.setAttribute("cy", my);
  maw.setAttribute("rx", "9");
  maw.setAttribute("ry", "5");
  maw.setAttribute("fill", "#0a0a0a");
  maw.setAttribute("transform", `rotate(${startTangent * 180 / Math.PI}, ${mx}, ${my})`);
  svg.appendChild(maw);
  // Two fangs (white triangles).
  for (const fySign of [1, -1]) {
    const fx1 = mx + Math.cos(startTangent) * 8;
    const fy1 = my + Math.sin(startTangent) * 8;
    const fperpX = -Math.sin(startTangent);
    const fperpY =  Math.cos(startTangent);
    const fxL = fx1 + fperpX * 5 * fySign;
    const fyL = fy1 + fperpY * 5 * fySign;
    const fxR = fx1 - fperpX * 5 * fySign;
    const fyR = fy1 - fperpY * 5 * fySign;
    const fangTipX = mx + Math.cos(startTangent) * 14;
    const fangTipY = my + Math.sin(startTangent) * 14;
    const fang = document.createElementNS(NS, "polygon");
    fang.setAttribute("points", `${fxL},${fyL} ${fxR},${fyR} ${fangTipX},${fangTipY}`);
    fang.setAttribute("fill", "#f5f5f5");
    fang.setAttribute("stroke", "#bdbdbd");
    fang.setAttribute("stroke-width", "0.6");
    svg.appendChild(fang);
  }

  // ----- 8. Forked tongue at the snake's head, flicking out along
  //         startTangent past the head sprite. -----
  const tongueStartR = 14;
  const tsx = a.x + Math.cos(startTangent) * tongueStartR;
  const tsy = a.y + Math.sin(startTangent) * tongueStartR;
  const tipR = 36;
  const tipx3 = a.x + Math.cos(startTangent) * tipR;
  const tipy3 = a.y + Math.sin(startTangent) * tipR;
  const forkR = 10;
  const fx1 = tipx3 + Math.cos(startTangent + 2.5) * forkR;
  const fy1 = tipy3 + Math.sin(startTangent + 2.5) * forkR;
  const fx2 = tipx3 + Math.cos(startTangent - 2.5) * forkR;
  const fy2 = tipy3 + Math.sin(startTangent - 2.5) * forkR;
  const tongue = document.createElementNS(NS, "path");
  tongue.setAttribute("d", `M ${tsx},${tsy} L ${tipx3},${tipy3} M ${tipx3},${tipy3} L ${fx1},${fy1} M ${tipx3},${tipy3} L ${fx2},${fy2}`);
  tongue.setAttribute("stroke", "#c2185b");
  tongue.setAttribute("stroke-width", "3.5");
  tongue.setAttribute("stroke-linecap", "round");
  tongue.setAttribute("fill", "none");
  svg.appendChild(tongue);

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
