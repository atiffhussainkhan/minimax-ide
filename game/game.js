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
// 3D cartoon snake — built from many overlapping gradient circles along a
// bezier curve (true 3D tube look) with a detailed cartoon face at the
// head and a tail coil at the destination.
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

  const gid = `snake3d-${idx}`;
  const defs = document.createElementNS(NS, "defs");
  svg.appendChild(defs);

  // ----- Helpers for cubic-bezier sampling -----
  function bezier(t) {
    const omt = 1 - t;
    return {
      x: omt*omt*omt * a.x + 3*omt*omt*t * c1x + 3*omt*t*t * c2x + t*t*t * b.x,
      y: omt*omt*omt * a.y + 3*omt*omt*t * c1y + 3*omt*t*t * c2y + t*t*t * b.y,
      tx: 3*omt*omt * (c1x - a.x) + 6*omt*t * (c2x - c1x) + 3*t*t * (b.x - c2x),
      ty: 3*omt*omt * (c1y - a.y) + 6*omt*t * (c2y - c1y) + 3*t*t * (b.y - c2y),
    };
  }
  function gradId(name) { return `${gid}-${name}`; }

  // ====== 1. CAST SHADOW under the snake ======
  // A blurred dark shape offset slightly down/right, beneath the body.
  const shadowGrad = document.createElementNS(NS, "radialGradient");
  shadowGrad.setAttribute("id", gradId("shadow"));
  shadowGrad.setAttribute("cx", "50%");
  shadowGrad.setAttribute("cy", "50%");
  shadowGrad.setAttribute("r", "60%");
  shadowGrad.innerHTML = `
    <stop offset="0%"   stop-color="rgba(0,0,0,0.45)" />
    <stop offset="100%" stop-color="rgba(0,0,0,0)" />
  `;
  defs.appendChild(shadowGrad);
  const shadowSamples = Math.max(20, Math.floor(len / 8));
  for (let i = 1; i < shadowSamples - 1; i++) {
    const t = i / shadowSamples;
    const p = bezier(t);
    const sR = 14 - t * 3; // shadow slightly smaller than body
    const sc = document.createElementNS(NS, "circle");
    sc.setAttribute("cx", p.x + 3);
    sc.setAttribute("cy", p.y + 5);
    sc.setAttribute("r", sR);
    sc.setAttribute("fill", `url(#${gradId("shadow")})`);
    svg.appendChild(sc);
  }

  // ====== 2. BODY — drawn as overlapping gradient spheres ======
  // Each sphere is a circle with a radial gradient that mimics 3D shading.
  // This gives the snake a true rounded, segmented body — not just a line.
  const samples = Math.max(20, Math.floor(len / 9));
  const bodyGrad = document.createElementNS(NS, "radialGradient");
  bodyGrad.setAttribute("id", gradId("body"));
  bodyGrad.setAttribute("cx", "35%");
  bodyGrad.setAttribute("cy", "25%");
  bodyGrad.setAttribute("r", "75%");
  bodyGrad.innerHTML = `
    <stop offset="0%"   stop-color="${palette.light}" />
    <stop offset="45%"  stop-color="${palette.body}" />
    <stop offset="100%" stop-color="${palette.dark}" />
  `;
  defs.appendChild(bodyGrad);

  // Body outline (single dark path) — drawn first as a base.
  // We use a wide stroke that follows the bezier.
  const NSpath = (d, fill) => {
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", d);
    if (fill) p.setAttribute("fill", fill);
    return p;
  };
  const pathData = `M ${a.x},${a.y} C ${c1x},${c1y} ${c2x},${c2y} ${b.x},${b.y}`;
  const outline = NSpath(pathData);
  outline.setAttribute("stroke", palette.dark);
  outline.setAttribute("stroke-width", "26");
  outline.setAttribute("stroke-linecap", "round");
  outline.setAttribute("stroke-linejoin", "round");
  outline.setAttribute("fill", "none");
  svg.appendChild(outline);

  // Draw the body as overlapping radial-gradient circles along the path.
  // Sphere radius tapers from large near the head to small at the tail.
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const p = bezier(t);
    // Skip the first segment (the head sphere is drawn separately below).
    if (t < 0.06) continue;
    // Tapering: big at head (t=0.06), small at tail (t=1).
    const r = 11.5 - t * 3;
    const sphere = document.createElementNS(NS, "circle");
    sphere.setAttribute("cx", p.x);
    sphere.setAttribute("cy", p.y);
    sphere.setAttribute("r", r);
    sphere.setAttribute("fill", `url(#${gradId("body")})`);
    svg.appendChild(sphere);
  }

  // ====== 3. BELLY STRIPE — lighter band on one side of the body ======
  // Sample points again, this time offset along the perpendicular to
  // create a visible belly line.
  const bellyGrad = document.createElementNS(NS, "linearGradient");
  bellyGrad.setAttribute("id", gradId("belly"));
  bellyGrad.setAttribute("x1", "0%");
  bellyGrad.setAttribute("y1", "0%");
  bellyGrad.setAttribute("x2", "100%");
  bellyGrad.setAttribute("y2", "0%");
  bellyGrad.innerHTML = `
    <stop offset="0%"   stop-color="${palette.light}" stop-opacity="0" />
    <stop offset="50%"  stop-color="${palette.light}" stop-opacity="0.85" />
    <stop offset="100%" stop-color="${palette.light}" stop-opacity="0" />
  `;
  defs.appendChild(bellyGrad);
  for (let i = 1; i < samples; i++) {
    const t = i / samples;
    const p = bezier(t);
    // Belly offset on one side.
    const offsetAmt = 4;
    const bx = p.x + perpX * offsetAmt;
    const by = p.y + perpY * offsetAmt;
    const r = 3;
    const belly = document.createElementNS(NS, "circle");
    belly.setAttribute("cx", bx);
    belly.setAttribute("cy", by);
    belly.setAttribute("r", r);
    belly.setAttribute("fill", `url(#${gradId("belly")})`);
    belly.setAttribute("opacity", "0.8");
    svg.appendChild(belly);
  }

  // ====== 4. SCALE BANDS — perpendicular cross-stripes along the body ======
  // Every ~14 svg units, draw a short darker arc perpendicular to the
  // tangent — gives the snake a clear "scales" look.
  const bandEvery = Math.max(3, Math.floor(samples / 8));
  for (let i = bandEvery; i < samples - 1; i += bandEvery) {
    const t = i / samples;
    const p = bezier(t);
    const tlen = Math.sqrt(p.tx * p.tx + p.ty * p.ty) || 1;
    const nx = -p.ty / tlen;
    const ny =  p.tx / tlen;
    const halfW = 9;
    const band = document.createElementNS(NS, "line");
    band.setAttribute("x1", p.x + nx * halfW);
    band.setAttribute("y1", p.y + ny * halfW);
    band.setAttribute("x2", p.x - nx * halfW);
    band.setAttribute("y2", p.y - ny * halfW);
    band.setAttribute("stroke", palette.dark);
    band.setAttribute("stroke-width", "2");
    band.setAttribute("stroke-linecap", "round");
    band.setAttribute("opacity", "0.55");
    svg.appendChild(band);
  }

  // ====== 5. HEAD — detailed cartoon head with eyes, smile, nostrils ======
  // Tangent at the head — the snake "looks" along this direction.
  const headTangent = Math.atan2(c1y - a.y, c1x - a.x);
  // Perpendicular to head tangent (used for placing features side-to-side).
  const hpX = -Math.sin(headTangent);
  const hpY =  Math.cos(headTangent);
  const headR = 20;
  const headCx = a.x;
  const headCy = a.y;

  // Head sphere (3D ball with bright highlight at 35%/30%).
  const headGrad = document.createElementNS(NS, "radialGradient");
  headGrad.setAttribute("id", gradId("head"));
  headGrad.setAttribute("cx", "32%");
  headGrad.setAttribute("cy", "28%");
  headGrad.setAttribute("r", "75%");
  headGrad.innerHTML = `
    <stop offset="0%"   stop-color="${palette.light}" />
    <stop offset="35%"  stop-color="${palette.body}" />
    <stop offset="85%"  stop-color="${palette.dark}" />
  `;
  defs.appendChild(headGrad);

  const headG = document.createElementNS(NS, "circle");
  headG.setAttribute("cx", headCx);
  headG.setAttribute("cy", headCy);
  headG.setAttribute("r", headR);
  headG.setAttribute("fill", `url(#${gradId("head")})`);
  headG.setAttribute("stroke", palette.dark);
  headG.setAttribute("stroke-width", "2.5");
  svg.appendChild(headG);

  // === Head 3D details: brow ridges, snout shading ===
  // Slight darker shading on the underside of the head.
  const headShade = document.createElementNS(NS, "ellipse");
  headShade.setAttribute("cx", headCx);
  headShade.setAttribute("cy", headCy + headR * 0.4);
  headShade.setAttribute("rx", headR * 0.85);
  headShade.setAttribute("ry", headR * 0.35);
  headShade.setAttribute("fill", palette.dark);
  headShade.setAttribute("opacity", "0.25");
  svg.appendChild(headShade);

  // === Two big cartoon eyes with white sclera, dark pupil, sparkle ===
  const eyeFwd = 4;
  const eyeSide = 6.5;
  const eyeR = 6.5;
  const pupilR = 3.2;
  for (const side of [-1, 1]) {
    const ex = headCx + Math.cos(headTangent) * eyeFwd + hpX * eyeSide * side;
    const ey = headCy + Math.sin(headTangent) * eyeFwd + hpY * eyeSide * side;
    // Eye socket (slight dark ring under sclera).
    const socket = document.createElementNS(NS, "circle");
    socket.setAttribute("cx", ex);
    socket.setAttribute("cy", ey);
    socket.setAttribute("r", eyeR + 0.8);
    socket.setAttribute("fill", palette.dark);
    socket.setAttribute("opacity", "0.6");
    svg.appendChild(socket);
    // White sclera.
    const white = document.createElementNS(NS, "circle");
    white.setAttribute("cx", ex);
    white.setAttribute("cy", ey);
    white.setAttribute("r", eyeR);
    white.setAttribute("fill", "#ffffff");
    white.setAttribute("stroke", palette.dark);
    white.setAttribute("stroke-width", "0.8");
    svg.appendChild(white);
    // Pupil — positioned slightly forward (snake looks along body).
    const pupil = document.createElementNS(NS, "circle");
    pupil.setAttribute("cx", ex + Math.cos(headTangent) * 1.5);
    pupil.setAttribute("cy", ey + Math.sin(headTangent) * 1.5);
    pupil.setAttribute("r", pupilR);
    pupil.setAttribute("fill", "#0a0a0a");
    svg.appendChild(pupil);
    // Sparkle highlight — top-left of pupil.
    const sparkle = document.createElementNS(NS, "circle");
    sparkle.setAttribute("cx", ex + Math.cos(headTangent) * 1.2 + hpX * (-2));
    sparkle.setAttribute("cy", ey + Math.sin(headTangent) * 1.2 + hpY * (-2));
    sparkle.setAttribute("r", 1.4);
    sparkle.setAttribute("fill", "#ffffff");
    svg.appendChild(sparkle);
  }

  // === Smiling mouth — a curved arc on the front of the head ===
  const mouthY = headCy + Math.sin(headTangent) * 7 + hpY * 4;
  const mouthCx = headCx + Math.cos(headTangent) * 8;
  const mouthW = 5;
  const mouthL = `${mouthCx - mouthW},${mouthY}`;
  const mouthR = `${mouthCx + mouthW},${mouthY}`;
  const mouthD = `M ${mouthL} Q ${mouthCx},${mouthY + 4} ${mouthR}`;
  const mouth = document.createElementNS(NS, "path");
  mouth.setAttribute("d", mouthD);
  mouth.setAttribute("stroke", palette.dark);
  mouth.setAttribute("stroke-width", "2.4");
  mouth.setAttribute("stroke-linecap", "round");
  mouth.setAttribute("fill", "none");
  svg.appendChild(mouth);

  // === Two tiny nostrils on the front of the head ===
  for (const side of [-1, 1]) {
    const nx = headCx + Math.cos(headTangent) * (headR * 0.7) + hpX * 3.5 * side;
    const ny = headCy + Math.sin(headTangent) * (headR * 0.7) + hpY * 3.5 * side;
    const nostril = document.createElementNS(NS, "circle");
    nostril.setAttribute("cx", nx);
    nostril.setAttribute("cy", ny);
    nostril.setAttribute("r", 1);
    nostril.setAttribute("fill", palette.dark);
    svg.appendChild(nostril);
  }

  // ====== 6. TAIL — coiled spiral curl at the destination ======
  const tailCx = b.x;
  const tailCy = b.y;
  const tailR = 14;
  // Outer ball (gradient-shaded).
  const tailGrad = document.createElementNS(NS, "radialGradient");
  tailGrad.setAttribute("id", gradId("tail"));
  tailGrad.setAttribute("cx", "32%");
  tailGrad.setAttribute("cy", "28%");
  tailGrad.setAttribute("r", "75%");
  tailGrad.innerHTML = `
    <stop offset="0%"   stop-color="${palette.light}" />
    <stop offset="35%"  stop-color="${palette.body}" />
    <stop offset="85%"  stop-color="${palette.dark}" />
  `;
  defs.appendChild(tailGrad);
  const tailBall = document.createElementNS(NS, "circle");
  tailBall.setAttribute("cx", tailCx);
  tailBall.setAttribute("cy", tailCy);
  tailBall.setAttribute("r", tailR);
  tailBall.setAttribute("fill", `url(#${gradId("tail")})`);
  tailBall.setAttribute("stroke", palette.dark);
  tailBall.setAttribute("stroke-width", "2.5");
  svg.appendChild(tailBall);
  // Spiral rings inside (coil marks).
  for (let k = 1; k <= 2; k++) {
    const innerR = tailR * (0.65 - k * 0.22);
    const ring = document.createElementNS(NS, "circle");
    ring.setAttribute("cx", tailCx);
    ring.setAttribute("cy", tailCy);
    ring.setAttribute("r", innerR);
    ring.setAttribute("fill", "none");
    ring.setAttribute("stroke", palette.dark);
    ring.setAttribute("stroke-width", "1.8");
    ring.setAttribute("opacity", "0.8");
    svg.appendChild(ring);
  }
  // Center dot.
  const center = document.createElementNS(NS, "circle");
  center.setAttribute("cx", tailCx);
  center.setAttribute("cy", tailCy);
  center.setAttribute("r", 2.5);
  center.setAttribute("fill", palette.dark);
  svg.appendChild(center);
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
