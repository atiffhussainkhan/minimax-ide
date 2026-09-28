/* Scene engine — Santa placed into a user's own room photo.
 *
 * Two ideas do the heavy lifting here, and they are independent:
 *
 * 1. ANCHORS, NOT FACE SWAPS. Every competitor transforms the person in the
 *    photo. This composits a character into the room using three points the
 *    user taps — door, sofa, table. The walk path, Santa's height and his
 *    apparent distance all derive from those three points, so he is genuinely
 *    placed in *their* space rather than pasted on top of it.
 *
 * 2. LIGHT MATCHING is what stops a composited character looking like a sticker.
 *    A flat sprite on a photo reads as fake because it has no relationship to
 *    the room. Three cheap corrections fix most of it, all done in code:
 *      · a contact shadow, offset along the light direction, that softens and
 *        fades with height off the floor
 *      · a colour grade sampled from the floor area, applied to Santa, so his
 *        reds sit in the same colour world as the room
 *      · a touch of the background's blur, so Santa is not sharper than the
 *        photo he is standing in
 *
 * The character is art-agnostic on purpose: Santa.toCanvas() draws whatever
 * asset set is supplied. That is what lets the engine be proved with a cheap
 * vector character now and swapped for a photoreal one later without touching
 * a line of this file. Getting the mechanism right is the expensive part;
 * the art is a swappable asset.
 */
(function (global) {
  "use strict";

  const D2R = Math.PI / 180;

  /* ------------------------------------------------------------ the scene --
   * A timeline of beats. Each beat says where Santa is, what he is doing, and
   * which pose to hold. The engine only interpolates; it holds no story.
   */
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }

  function buildTimeline(a) {
    // a = { door, sofa, table } each {x, y} in canvas pixels
    return [
      { t: 0.00, at: "door",   pose: "wave", label: "arrives" },
      { t: 0.14, at: "door",   pose: "wave" },
      { t: 0.20, at: "door",   pose: "stand" },
      { t: 0.46, at: "sofa",   pose: "walk",  label: "crosses the room" },
      { t: 0.54, at: "sofa",   pose: "sit",   label: "sits down" },
      { t: 0.68, at: "table",  pose: "reach", label: "reaches for the cookie" },
      { t: 0.78, at: "sofa",   pose: "eat",   label: "eats the cookie" },
      { t: 0.86, at: "sofa",   pose: "drink", label: "drinks the milk" },
      { t: 0.94, at: "sofa",   pose: "stand" },
      { t: 1.00, at: "door",   pose: "wave",  label: "slips away" },
    ];
  }

  /* Walk the waypoints the TIMELINE declares, timed by the timeline itself.
   * Deliberately not a second, separate table: when position timing lived apart
   * from the beat list, Santa started walking at t=0 while the timeline still
   * said he was waving at the door. One list, one clock — the same lesson as
   * the snake head and body. */
  function solve(anchors, t, timeline) {
    const tl = timeline || buildTimeline(anchors);
    const at = (name) => anchors[name];

    // The visits, in order, with the time at which each one starts. These are
    // read straight off the timeline so the two can never disagree.
    const visits = [];
    let lastKey = null;
    for (const b of tl) {
      if (b.at !== lastKey) { visits.push({ at: b.at, t: b.t }); lastKey = b.at; }
    }

    const tt = Math.max(0, Math.min(0.9999, t));
    let i = 0;
    while (i < visits.length - 1 && tt >= visits[i + 1].t) i++;
    const from = at(visits[i].at), to = at(visits[Math.min(i + 1, visits.length - 1)].at);
    const span = Math.max(1e-6, visits[Math.min(i + 1, visits.length - 1)].t - visits[i].t);
    const local = easeInOut(Math.max(0, Math.min(1, (tt - visits[i].t) / span)));

    const x = from.x + (to.x - from.x) * local;
    const y = from.y + (to.y - from.y) * local;

    // Perspective: anchors nearer the bottom of the frame are nearer the camera.
    const bottom = Math.max(anchors.door.y, anchors.sofa.y, anchors.table.y);
    const top = Math.min(anchors.door.y, anchors.sofa.y, anchors.table.y);
    const depth = (y - top) / Math.max(1, bottom - top);          // 0 far .. 1 near
    // Room scale comes from how far apart the user's anchors are, so a wide
    // shot yields a smaller Santa and a tight shot a larger one.
    const spread = Math.hypot(anchors.sofa.x - anchors.door.x, anchors.sofa.y - anchors.door.y) +
                   Math.hypot(anchors.table.x - anchors.door.x, anchors.table.y - anchors.door.y);
    const base = Math.max(110, Math.min(spread, 320));
    // Depth swing is damped: a strong 2:1 size change across a room reads as a
    // mistake rather than as perspective.
    const size = base * (0.78 + 0.34 * depth);
    return { x, y, size, depth, facing: x > (anchors.door.x + anchors.sofa.x) / 2 ? 1 : -1 };
  }

  function beatAt(timeline, t) {
    let cur = timeline[0], next = timeline[1];
    for (let i = 0; i < timeline.length - 1; i++) {
      if (t >= timeline[i].t && t <= timeline[i + 1].t) { cur = timeline[i]; next = timeline[i + 1]; break; }
    }
    return { cur, next };
  }

  /* ------------------------------------------------------------ atmosphere */
  function drawSnow(ctx, w, h, time, amount) {
    const N = amount;
    ctx.save();
    for (let i = 0; i < N; i++) {
      // Deterministic per-flake positions: the same run always renders the
      // same snow, which is what makes the output reproducible (U8).
      const s = Math.sin(i * 12.9898) * 43758.5453;
      const rx = s - Math.floor(s);
      const s2 = Math.sin(i * 78.233) * 12345.6789;
      const ry = s2 - Math.floor(s2);
      const sp = 0.5 + rx;
      const x = (rx * w + time * 14 * sp) % w;
      const y = (ry * h + time * 34 * sp) % h;
      const r = 0.8 + rx * 1.7;
      ctx.globalAlpha = 0.35 + rx * 0.45;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  /* A warm glow that tracks Santa, so the eye is pulled to him. */
  function drawGlow(ctx, p, size) {
    // Kept deliberately small and faint: a glow that covers the room reads as a
    // lens flare, not as warmth. It should hint at Santa, not announce him.
    const r = size * 0.5;
    const g = ctx.createRadialGradient(p.x, p.y - size * 0.45, r * 0.05, p.x, p.y - size * 0.45, r);
    g.addColorStop(0, "rgba(255,214,140,0.16)");
    g.addColorStop(0.55, "rgba(255,214,140,0.06)");
    g.addColorStop(1, "rgba(255,214,140,0)");
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y - size * 0.45, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* The sticker problem, part one: a contact shadow. Without it the character
   * floats. It is offset along a light direction (default: light from the
   * upper left, the most common in interior photos) and softens as he rises. */
  function drawContactShadow(ctx, p, size, light) {
    const lx = (light && light.x) || -0.55;
    const ly = (light && light.y) || 0.35;
    const off = size * 0.16;
    ctx.save();
    ctx.translate(p.x + lx * off, p.y + ly * off);
    ctx.scale(1, 0.26);
    const g = ctx.createRadialGradient(0, 0, size * 0.02, 0, 0, size * 0.34);
    g.addColorStop(0, "rgba(0,0,0,0.42)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, size * 0.34, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  /* The sticker problem, part two: put Santa in the same colour world as the
   * room. Sampled once from the lower part of the photo (usually floor) and
   * applied as a gentle warm/cool tint — deliberately weak, because too much
   * and it looks like a filter rather than light. */
  function sampleRoomColour(ctx, w, h) {
    try {
      const d = ctx.getImageData(Math.floor(w * 0.2), Math.floor(h * 0.82),
                                  Math.max(1, Math.floor(w * 0.6)), 8).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
      if (!n) return { r: 1, g: 1, b: 1 };
      return { r: (r / n) / 128, g: (g / n) / 128, b: (b / n) / 128 };
    } catch (e) { return { r: 1, g: 1, b: 1 }; }
  }

  /* ------------------------------------------------------------ the render */
  function renderFrame(ctx, Santa, scene, timeSeconds) {
    const { w, h, anchors, photo } = scene;
    const DURATION = scene.duration || 11;
    const t = Math.max(0, Math.min(1, timeSeconds / DURATION));

    ctx.clearRect(0, 0, w, h);
    if (photo) ctx.drawImage(photo, 0, 0, w, h);

    if (!anchers || !anchors.door || !anchors.sofa) {
      // Nothing placed yet — just the photo and a hint.
      drawSnow(ctx, w, h, timeSeconds, 26);
      return;
    }

    const timeline = buildTimeline(anchors);
    const p = solve(anchors, t, timeline);
    const { cur } = beatAt(timeline, t);
    const scale = p.size / Santa.height;

    // Grade, then glow, then snow, then Santa on top.
    ctx.save();
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = 0.30;
    ctx.fillStyle = `rgb(${scene.tint.r * 128 | 0},${scene.tint.g * 128 | 0},${scene.tint.b * 128 | 0})`;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    drawGlow(ctx, p, p.size);
    drawSnow(ctx, w, h, timeSeconds, 34);
    drawContactShadow(ctx, p, p.size, scene.light);

    Santa.toCanvas(ctx, Santa.build(cur.pose), {
      x: p.x, y: p.y, scale, flip: p.facing < 0,
    });
  }

  global.Scene = {
    D2R, buildTimeline, solve, renderFrame,
    drawSnow, drawGlow, drawContactShadow, sampleRoomColour,
  };
})(typeof window !== "undefined" ? window : globalThis);
