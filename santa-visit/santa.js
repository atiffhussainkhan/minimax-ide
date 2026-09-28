/* Santa — a vector cartoon character, drawn entirely in code.
 *
 * Why code and not a generated image: the free image tiers are non-commercial
 * and 16+, which rules them out for a commercial child-facing product. Code is
 * free, permanently ours, ~6 KB instead of ~400 KB, crisp at any size, and
 * cannot be withdrawn by a third party. Same approach that fixed the snakes.
 *
 * The character is authored ONCE as a list of primitive shapes, in a local
 * space where the feet sit at y = 0 and the hat tip at y = -100 (y is
 * inverted so the maths reads like a person standing up). Two renderers —
 * SVG and Canvas — consume the same list, so the preview page and the
 * video-export pipeline can never drift apart.
 */
(function (global) {
  "use strict";

  const C = {
    suit: "#d32f2f", suitDark: "#a01f1f", suitLight: "#ef5350",
    trim: "#fbf7f0", trimShade: "#ddd6c8",
    skin: "#f2c6a0", skinShade: "#dcae86",
    beard: "#fbf7f0", beardShade: "#e2ddd2",
    hat: "#d32f2f", hatDark: "#a01f1f",
    boot: "#2f2a2a", belt: "#2f2a2a", buckle: "#f5c451",
    cheek: "#e88b7a", nose: "#e8a07c",
    eye: "#26201e", glass: "#eef4f7", milk: "#ffffff",
    cookie: "#d9a15b", cookieChip: "#6b4423",
  };

  /* ---------------------------------------------------------------- shapes --
   * Every entry is a plain object so it can be emitted as SVG or replayed on a
   * canvas. Paths are authored as SVG path data; Canvas consumes them natively
   * through Path2D, so there is no re-implementation of the artwork.
   */
  const S = [];
  const push = (o) => { S.push(o); return o; };
  const circle = (cx, cy, r, fill, extra) =>
    push(Object.assign({ t: "circle", cx, cy, r, fill }, extra));
  const ellipse = (cx, cy, rx, ry, fill, extra) =>
    push(Object.assign({ t: "ellipse", cx, cy, rx, ry, fill }, extra));
  const rect = (x, y, w, h, fill, extra) =>
    push(Object.assign({ t: "rect", x, y, w, h, fill }, extra));
  const path = (d, fill, extra) => push(Object.assign({ t: "path", d, fill }, extra));
  const line = (x1, y1, x2, y2, stroke, w, extra) =>
    push(Object.assign({ t: "line", x1, y1, x2, y2, stroke, sw: w, cap: "round" }, extra));

  /* Limb helper: a capsule from (x1,y1) to (x2,y2) with width w, drawn as a
   * thick round-capped stroke. Keeps the limbs smooth at any angle without
   * hand-authoring a path per pose. */
  function limb(x1, y1, x2, y2, w, colour) {
    line(x1, y1, x2, y2, colour, w);
  }

  /* ------------------------------------------------------------------ poses */
  const POSES = {
    // Neutral standing — the default silhouette.
    stand: { armL: 8, armR: -8, legs: 0, sit: 0, head: 0, hold: null, flip: false },
    // Mid-stride, arms counter-swinging so the walk reads as walking.
    walk: { armL: 22, armR: -22, legs: 1, sit: 0, head: 0, hold: null, flip: false },
    walk2: { armL: -16, armR: 16, legs: -1, sit: 0, head: 0, hold: null, flip: false },
    // Seated on the sofa: thighs forward, shins down.
    sit: { armL: 14, armR: -14, legs: 0, sit: 1, head: 0, hold: null, flip: false },
    // Leaning forward, arm out toward the table.
    reach: { armL: 10, armR: -62, legs: 0, sit: 1, head: 6, hold: null, flip: false },
    // Glass raised to the mouth.
    drink: { armL: 10, armR: -48, legs: 0, sit: 1, head: 8, hold: "glass", flip: false },
    // Cookie in hand, about to take a bite.
    eat: { armL: 10, armR: -40, legs: 0, sit: 1, head: 4, hold: "cookie", flip: false },
    // Arms up in celebration.
    cheer: { armL: 140, armR: 150, legs: 0, sit: 0, head: -4, hold: null, flip: false },
    // Waving on arrival.
    wave: { armL: 14, armR: 128, legs: 0, sit: 0, head: -2, hold: null, flip: false },
  };

  /* ------------------------------------------------------------- the build */
  function buildSanta(poseName) {
    S.length = 0;
    const p = POSES[poseName] || POSES.stand;
    const sitting = p.sit === 1;

    // ---- Ground reference ------------------------------------------------
    // When standing, feet at y=0. When seated, the hips sit at the seat line
    // and the shins drop below it, so the caller can align the seat, not the
    // feet, with the anchor point.
    const hipY = sitting ? 0 : -34;
    const shoulderY = hipY - 22;
    const neckY = shoulderY - 4;
    const headY = neckY - 9;

    // ---- Back leg / arm first so they sit behind the body ---------------
    const swing = p.legs * 7;

    if (sitting) {
      // Thighs forward, shins down, boots flat on the floor. y increases
      // downward here, so "down the shin" is +, not -.
      limb(-5, hipY, 13, hipY - 2, 9, C.suitDark);
      limb(13, hipY - 2, 15, hipY + 20, 8, C.suitDark);
      ellipse(16, hipY + 22, 9, 4.5, C.boot);
    } else {
      // Legs drop from the hips toward the floor: y must INCREASE.
      limb(-6, hipY, -6 + swing, hipY + 20, 9, C.suitDark);
      ellipse(-6 + swing, hipY + 22, 7.5, 4.2, C.boot);
    }

    // ---- Torso: the suit -------------------------------------------------
    // A rounded, slightly pear-shaped body. Wider at the shoulders than the
    // waist reads as a big friendly cartoon man.
    path(
      `M -13 ${shoulderY + 2}
       Q -17 ${hipY - 10} -12 ${hipY}
       L 12 ${hipY}
       Q 17 ${hipY - 10} 13 ${shoulderY + 2}
       Q 8 ${shoulderY - 4} 0 ${shoulderY - 4}
       Q -8 ${shoulderY - 4} -13 ${shoulderY + 2} Z`,
      C.suit
    );
    // Front highlight so the body has a rounded, 3D cartoon read.
    path(
      `M -10 ${shoulderY + 2} Q -12 ${hipY - 12} -7 ${hipY - 2}
       L -2 ${hipY - 2} Q -7 ${hipY - 14} -5 ${shoulderY + 1} Z`,
      C.suitLight, { opacity: "0.5" }
    );
    // White trim down the front edge.
    line(-1, shoulderY + 1, -1, hipY - 1, C.trim, 3.4);
    // Belt + buckle.
    rect(-13, hipY - 8, 26, 6, C.belt, { rx: 1 });
    rect(-4, hipY - 8.5, 8, 7, C.buckle, { rx: 1.5 });
    // Hem trim.
    line(-12, hipY - 1, 12, hipY - 1, C.trim, 3);

    // ---- Head ------------------------------------------------------------
    // Slight forward tilt reads as cheerful rather than severe.
    const tilt = p.head;
    circle(0, headY, 12, C.skin);
    circle(-4, headY - 2, 12, C.skinShade, { opacity: "0.25" });
    // Ears.
    circle(-12, headY + 1, 3, C.skin);
    circle(12, headY + 1, 3, C.skin);
    // Rosy cheeks.
    circle(-7, headY + 3, 3.2, C.cheek, { opacity: "0.55" });
    circle(7, headY + 3, 3.2, C.cheek, { opacity: "0.55" });
    // Eyes — deliberately simple dots; small cartoon eyes read at any scale.
    circle(-4.5, headY - 1.5, 1.9, C.eye);
    circle(4.5, headY - 1.5, 1.9, C.eye);
    // The nose.
    circle(0, headY + 2, 3.4, C.nose);

    // ---- Beard -----------------------------------------------------------
    // One shape, drawn over the jaw, with a scalloped lower edge so it reads
    // as hair rather than a beard-shaped blob.
    path(
      `M -11 ${headY - 1}
       Q -13 ${headY + 9} -7 ${headY + 13}
       Q -3 ${headY + 16} 0 ${headY + 13}
       Q 3 ${headY + 16} 7 ${headY + 13}
       Q 13 ${headY + 9} 11 ${headY - 1}
       Q 6 ${headY + 2} 0 ${headY + 2}
       Q -6 ${headY + 2} -11 ${headY - 1} Z`,
      C.beard
    );
    // Moustache over the nose, drawn after the beard so it sits on top.
    path(
      `M -7 ${headY + 1} Q 0 ${headY - 1  + 0} 7 ${headY + 1}
       Q 0 ${headY + 5} -7 ${headY + 1} Z`,
      C.beardShade, { opacity: "0.55" }
    );
    // Smile.
    path(`M -4 ${headY + 6} Q 0 ${headY + 8.5} 4 ${headY + 6}`,
         "none", { stroke: C.eye, sw: 1.4, fill: "none", cap: "round" });

    // ---- Hat -------------------------------------------------------------
    // Cone leaning back, with a pompom and a wide fur brim.
    path(
      `M -13 ${headY - 6} Q -10 ${headY - 22} 2 ${headY - 26}
       Q 12 ${headY - 25} 15 ${headY - 17}
       Q 4 ${headY - 22} -4 ${headY - 16} Z`,
      C.hat
    );
    path(`M -11 ${headY - 10} Q -6 ${headY - 20} 4 ${headY - 25}
          L 6 ${headY - 22} Q -4 ${headY - 18} -8 ${headY - 9} Z`,
         C.hatDark, { opacity: "0.35" });
    circle(15, headY - 17, 4.2, C.trim);          // pompom
    path(`M -14 ${headY - 8} Q 0 ${headY - 14} 14 ${headY - 8}
           Q 15 ${headY - 3} 0 ${headY - 4} Q -15 ${headY - 3} -14 ${headY - 8} Z`,
         C.trim);                                   // brim

    // ---- Arms ------------------------------------------------------------
    // Drawn as capsules from the shoulder. Angles are degrees measured from
    // straight-down, positive = forward, so a pose reads as a number.
    const arm = (side, deg) => {
      const rad = (deg * Math.PI) / 180;
      const sx = side * 12;
      const ex = sx + side * Math.sin(rad) * 22;
      const ey = shoulderY + 2 + Math.cos(rad) * 22;
      limb(sx, shoulderY + 2, ex, ey, 7.5, C.suitDark);
      circle(ex, ey, 4.4, C.trim);                  // white cuff at the wrist
      circle(ex + (ex - sx) * 0.22, ey + (ey - shoulderY) * 0.22, 3.4, C.trim);
      return { x: ex, y: ey };
    };
    const handL = arm(-1, p.armL);
    const handR = arm(1, p.armR);

    // ---- Front leg / arm, over the body ----------------------------------
    if (sitting) {
      limb(5, hipY, 20, hipY - 2, 9, C.suit);
      limb(20, hipY - 2, 21, hipY + 20, 8, C.suit);
      ellipse(22, hipY + 22, 9, 4.5, C.boot);
    } else {
      limb(6, hipY, 6 - swing, hipY + 20, 9, C.suit);
      ellipse(6 - swing, hipY + 22, 7.5, 4.2, C.boot);
    }

    // ---- Held props ------------------------------------------------------
    if (p.hold === "glass") {
      const gx = handR.x, gy = handR.y;
      path(`M ${gx - 4} ${gy - 4} L ${gx + 4} ${gy - 4}
             L ${gx + 3} ${gy + 5} L ${gx - 3} ${gy + 5} Z`, C.glass,
           { stroke: "#9fb3bd", sw: 0.8 });
      path(`M ${gx - 3.2} ${gy - 1.5} L ${gx + 3.2} ${gy - 1.5}
             L ${gx + 2.6} ${gy + 4.4} L ${gx - 2.6} ${gy + 4.4} Z`, C.milk);
    }
    if (p.hold === "cookie") {
      const gx = handR.x, gy = handR.y;
      circle(gx, gy, 5, C.cookie);
      circle(gx - 2, gy - 1.5, 1.1, C.cookieChip);
      circle(gx + 2, gy + 1, 1.1, C.cookieChip);
      circle(gx + 0.5, gy - 2.5, 0.9, C.cookieChip);
    }

    return S.slice();
  }

  /* -------------------------------------------------------------- renderers */
  function toSVG(shapes, { x = 0, y = 0, scale = 1, flip = false } = {}) {
    const body = shapes.map((s) => {
      if (s.t === "circle")
        return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" fill="${s.fill}"${s.opacity ? ` opacity="${s.opacity}"` : ""}/>`;
      if (s.t === "ellipse")
        return `<ellipse cx="${s.cx}" cy="${s.cy}" rx="${s.rx}" ry="${s.ry}" fill="${s.fill}"${s.opacity ? ` opacity="${s.opacity}"` : ""}/>`;
      if (s.t === "rect")
        return `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="${s.rx || 0}" fill="${s.fill}"/>`;
      if (s.t === "line")
        return `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="${s.stroke}" stroke-width="${s.sw}" stroke-linecap="${s.cap || "round"}"/>`;
      if (s.t === "path") {
        const fill = s.fill && s.fill !== "none" ? s.fill : "none";
        const stroke = s.stroke ? ` stroke="${s.stroke}" stroke-width="${s.sw || 1}" stroke-linecap="round"` : "";
        return `<path d="${s.d}" fill="${fill}"${stroke}${s.opacity ? ` opacity="${s.opacity}"` : ""}/>`;
      }
      return "";
    }).join("");
    // Flipping is handled by the negative scale on the group transform, so no
    // per-shape transform is needed here.
    return `<g transform="translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})">${body}</g>`;
  }

  /* Draw straight to a canvas — used by the video export pipeline, where SVG
   * markup would have to be round-tripped through an <img> first. */
  function toCanvas(ctx, shapes, { x = 0, y = 0, scale = 1, flip = false } = {}) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(flip ? -scale : scale, scale);
    for (const s of shapes) {
      ctx.globalAlpha = s.opacity ? parseFloat(s.opacity) : 1;
      if (s.t === "circle") {
        ctx.beginPath(); ctx.arc(s.cx, s.cy, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.fill; ctx.fill();
      } else if (s.t === "ellipse") {
        ctx.beginPath(); ctx.ellipse(s.cx, s.cy, s.rx, s.ry, 0, 0, Math.PI * 2);
        ctx.fillStyle = s.fill; ctx.fill();
      } else if (s.t === "rect") {
        const r = s.rx || 0;
        ctx.beginPath();
        if (r && ctx.roundRect) ctx.roundRect(s.x, s.y, s.w, s.h, r);
        else ctx.rect(s.x, s.y, s.w, s.h);
        ctx.fillStyle = s.fill; ctx.fill();
      } else if (s.t === "line") {
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2);
        ctx.strokeStyle = s.stroke; ctx.lineWidth = s.sw;
        ctx.lineCap = s.cap || "round"; ctx.stroke();
      } else if (s.t === "path") {
        const p = new Path2D(s.d);
        if (s.fill && s.fill !== "none") { ctx.fillStyle = s.fill; ctx.fill(p); }
        if (s.stroke) {
          ctx.strokeStyle = s.stroke; ctx.lineWidth = s.sw || 1;
          ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.stroke(p);
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  global.Santa = {
    colors: C,
    poses: POSES,
    build: buildSanta,
    toSVG, toCanvas,
    /** Nominal height of the character in local units (feet 0 → hat ~-56). */
    get height() {
      const shapes = buildSanta("stand");
      let min = 0, max = 0;
      for (const s of shapes) {
        if (s.t === "circle") { min = Math.min(min, s.cy - s.r); max = Math.max(max, s.cy + s.r); }
        if (s.t === "ellipse") { min = Math.min(min, s.cy - s.ry); max = Math.max(max, s.cy + s.ry); }
      }
      return max - min;
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
