/* Postcards — three shareable keepsakes built from the user's own room.
 *
 * The scene is the payload, so a postcard is not a filter with a border; each
 * one earns its share by giving the viewer something the video cannot:
 *
 *   1. THE EVIDENCE  — the visit as a captured moment, no framing tricks, with
 *                      the honest-AI badge. The share people actually want.
 *   2. CERTIFICATE   — the fun keepsake. Names the visitor, the date, and what
 *                      Santa thought of the house. This is the one a parent
 *                      prints and the one a child keeps.
 *   3. ROUTE LOG     — Santa's walk across the room as a map, with the three
 *                      anchors the user placed. Nobody else can make this,
 *                      because nobody else has their anchors.
 *
 * Drawn on canvas so they export as PNG with no server, no upload, and no
 * dependency on the character art — a photoreal Santa drops in unchanged.
 */
(function (global) {
  "use strict";

  const INK = {
    paper: "#fdfbf4", edge: "#e2d9c4", deep: "#2a2118", mute: "#7d6a52",
    red: "#c1272d", gold: "#d9a441", green: "#2f6b4f",
  };
  const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif';

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else {
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y, x, y, r);
      ctx.arcTo(x, y + h, x + w, y, r); ctx.closePath();
    }
  }
  function centerText(ctx, text, cx, y, size, colour, weight) {
    ctx.fillStyle = colour; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = (weight || 600) + " " + size + "px " + FONT;
    ctx.fillText(text, cx, y);
  }
  function wrap(ctx, text, cx, y, maxW, lh, size, colour, align) {
    ctx.fillStyle = colour; ctx.font = "400 " + size + "px " + FONT;
    ctx.textAlign = align || "center"; ctx.textBaseline = "middle";
    const words = String(text).split(" ");
    let line = "", yy = y;
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, cx, yy); yy += lh; line = w;
      } else line = test;
    }
    ctx.fillText(line, cx, yy);
    return yy + lh;
  }

  /* The AI-disclosure mark. Not decoration: the Children's code standard on
   * transparency and MyHeritage's own practice both point the same way. Shown
   * on every export, small, once. */
  const BADGE_TEXT = "✦ AI-generated — Santa is not real";
  function badge(ctx, x, y, s) {
    ctx.save();
    ctx.globalAlpha = 0.86;
    ctx.font = "600 " + (s * 1.05) + "px " + FONT;
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    // Size the pill to the text. A fixed width looked right at one card size
    // and silently clipped the disclosure on another — and a clipped
    // disclosure is a compliance failure, not a cosmetic one.
    const tw = ctx.measureText(BADGE_TEXT).width;
    const padX = s * 0.85, pillW = tw + padX * 2, pillH = s * 1.9;
    roundRect(ctx, x, y, pillW, pillH, pillH / 2);
    ctx.fillStyle = "rgba(18,20,28,0.72)"; ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.fillText(BADGE_TEXT, x + padX, y + pillH / 2);
    ctx.restore();
    return pillW;
  }

  /* ---------------------------------------------------------------- 1. The
   * Evidence — the visit as a still, framed like a photograph, nothing faked. */
  function evidence(ctx, opts) {
    const { w, h, room, santa, anchors, tint } = opts;
    ctx.fillStyle = INK.paper; ctx.fillRect(0, 0, w, h);
    const m = w * 0.055, foot = h * 0.19;
    const px = m, py = m, pw = w - m * 2, ph = h - m - foot;

    // The captured frame
    ctx.save();
    roundRect(ctx, px, py, pw, ph, w * 0.012); ctx.clip();
    ctx.drawImage(room, px, py, pw, ph);
    if (tint) { ctx.globalCompositeOperation = "overlay"; ctx.globalAlpha = 0.22;
                ctx.fillStyle = tint; ctx.fillRect(px, py, pw, ph); ctx.globalAlpha = 1; }
    // snow
    ctx.fillStyle = "rgba(255,255,255,.75)";
    for (let i = 0; i < 40; i++) {
      const x = px + ((i * 97.13) % 1) * 0; // deterministic
      const rx = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      const ry = (Math.sin(i * 78.233) * 12345.6789) % 1;
      ctx.globalAlpha = 0.3 + Math.abs(rx) * 0.5;
      ctx.beginPath();
      ctx.arc(px + Math.abs(rx) * pw, py + Math.abs(ry) * ph, 1.2 + Math.abs(ry) * 1.8, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (santa) santa(ctx, px, py, pw, ph);
    ctx.restore();

    // A hairline frame, like a mounted print
    ctx.strokeStyle = INK.edge; ctx.lineWidth = Math.max(1, w * 0.002);
    roundRect(ctx, px, py, pw, ph, w * 0.012); ctx.stroke();
    badge(ctx, px + w * 0.022, py + ph - h * 0.055, w * 0.0072);
  }

  /* ---------------------------------------------------------------- 2. The
   * Certificate — the keepsake. This is the one that gets printed. */
  function certificate(ctx, opts) {
    const { w, h, room, santa, name, date, wish } = opts;
    ctx.fillStyle = INK.paper; ctx.fillRect(0, 0, w, h);

    // Double border, like a certificate
    const b = w * 0.045;
    ctx.strokeStyle = INK.gold; ctx.lineWidth = w * 0.009;
    roundRect(ctx, b, b, w - b * 2, h - b * 2, w * 0.02); ctx.stroke();
    ctx.strokeStyle = INK.edge; ctx.lineWidth = w * 0.0025;
    roundRect(ctx, b * 1.5, b * 1.5, w - b * 3, h - b * 3, w * 0.014); ctx.stroke();

    // A strip of the room across the top — their actual house, in the frame
    const sh = h * 0.30;
    ctx.save();
    roundRect(ctx, b * 1.9, b * 1.9, w - b * 3.8, sh, w * 0.012); ctx.clip();
    ctx.drawImage(room, b * 1.9, b * 1.9, w - b * 3.8, sh);
    if (santa) santa(ctx, b * 1.9, b * 1.9, w - b * 3.8, sh);
    ctx.restore();

    let y = b * 1.9 + sh + h * 0.075;
    centerText(ctx, "CERTIFICATE OF GOOD BEHAVIOUR", w / 2, y, w * 0.052, INK.deep, 700);
    y += h * 0.045;
    centerText(ctx, "awarded to", w / 2, y, w * 0.030, INK.mute, 400);
    y += h * 0.062;

    const who = (name || "a very good child").slice(0, 26);
    ctx.save();
    ctx.fillStyle = INK.red; ctx.font = "italic 700 " + (w * 0.072) + "px " + FONT;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(who, w / 2, y);
    const tw = ctx.measureText(who).width;
    ctx.strokeStyle = INK.gold; ctx.lineWidth = w * 0.0035;
    ctx.beginPath();
    ctx.moveTo(w / 2 - tw / 2 - w * 0.02, y + w * 0.042);
    ctx.lineTo(w / 2 + tw / 2 + w * 0.02, y + w * 0.042);
    ctx.stroke();
    ctx.restore();
    y += h * 0.085;

    y = wrap(ctx, wish || "for a very good house indeed — Santa approved.",
             w / 2, y, w * 0.66, h * 0.045, w * 0.036, INK.deep);
    y += h * 0.02;

    // Signature block
    const sy = h - b * 3.4;
    ctx.strokeStyle = INK.edge; ctx.lineWidth = w * 0.002;
    ctx.beginPath();
    ctx.moveTo(w * 0.18, sy); ctx.lineTo(w * 0.44, sy);
    ctx.moveTo(w * 0.56, sy); ctx.lineTo(w * 0.82, sy);
    ctx.stroke();
    centerText(ctx, "Santa Claus", w * 0.31, sy + h * 0.035, w * 0.030, INK.deep, 500);
    centerText(ctx, date || "", w * 0.69, sy + h * 0.035, w * 0.030, INK.mute, 400);
    centerText(ctx, "North Pole", w * 0.31, sy + h * 0.072, w * 0.024, INK.mute, 400);
    badge(ctx, b * 1.5, h - b * 2.6, w * 0.0068);
  }

  /* ---------------------------------------------------------------- 3. The
   * Route Log — the map only this product can make, because only this product
   * has the user's own anchors. */
  function routeLog(ctx, opts) {
    const { w, h, room, santa, anchors, tint } = opts;
    ctx.fillStyle = INK.paper; ctx.fillRect(0, 0, w, h);
    const m = w * 0.05;
    const ph = h * 0.56;
    const px = m, py = m * 1.2, pw = w - m * 2;

    // The room, dimmed, as the map
    ctx.save();
    roundRect(ctx, px, py, pw, ph, w * 0.014); ctx.clip();
    ctx.globalAlpha = 0.82;
    ctx.drawImage(room, px, py, pw, ph);
    if (santa) santa(ctx, px, py, pw, ph);
    ctx.globalAlpha = 1;

    // The walk path between the three anchors, dashed like a route
    if (anchors) {
      const pts = [anchors.door, anchors.sofa, anchors.table, anchors.sofa, anchors.door];
      const map = (p) => ({ x: px + (p.x / (opts.roomW || w)) * pw, y: py + (p.y / (opts.roomH || h)) * ph });
      ctx.save();
      ctx.strokeStyle = "rgba(193,39,45,.85)";
      ctx.lineWidth = w * 0.006; ctx.setLineDash([w * 0.022, w * 0.016]); ctx.lineCap = "round";
      ctx.beginPath();
      pts.forEach(function (p, i) { const q = map(p); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); });
      ctx.stroke();
      ctx.setLineDash([]);

      const marks = [["door", "🚪", "Door"], ["sofa", "🛋️", "Sofa"], ["table", "🍪", "Table"]];
      marks.forEach(function (m2) {
        const a = anchors[m2[0]]; if (!a) return;
        const q = map(a);
        ctx.beginPath(); ctx.arc(q.x, q.y, w * 0.030, 0, 7);
        ctx.fillStyle = "rgba(253,251,244,.95)"; ctx.fill();
        ctx.strokeStyle = INK.red; ctx.lineWidth = w * 0.005; ctx.stroke();
        centerText(ctx, m2[1], q.x, q.y + w * 0.002, w * 0.028, INK.deep, 400);
        centerText(ctx, m2[2], q.x, q.y + w * 0.056, w * 0.024, INK.mute, 600);
      });
      ctx.restore();
    }
    ctx.restore();
    ctx.strokeStyle = INK.edge; ctx.lineWidth = Math.max(1, w * 0.002);
    roundRect(ctx, px, py, pw, ph, w * 0.014); ctx.stroke();

    let y = py + ph + h * 0.075;
    centerText(ctx, "SANTA'S ROUTE LOG", w / 2, y, w * 0.050, INK.deep, 700);
    y += h * 0.048;
    centerText(ctx, "One door · one sofa · one cookie · one glass of milk", w / 2, y, w * 0.028, INK.mute, 400);
    y += h * 0.038;
    centerText(ctx, "Entered by the door, sat where you sit, left the way he came.",
               w / 2, y, w * 0.026, INK.mute, 400);
    badge(ctx, m, h - m * 1.5, w * 0.0072);
  }

  const TEMPLATES = {
    evidence: { label: "The Evidence", draw: evidence },
    certificate: { label: "Certificate of Good Behaviour", draw: certificate },
    route: { label: "Santa's Route Log", draw: routeLog },
  };

  function render(ctx, key, opts) {
    const t = TEMPLATES[key];
    if (!t) throw new Error("unknown postcard: " + key);
    ctx.clearRect(0, 0, opts.w, opts.h);
    t.draw(ctx, opts);
    return t.label;
  }

  global.Postcards = { TEMPLATES, render, INK, FONT };
})(typeof window !== "undefined" ? window : globalThis);
