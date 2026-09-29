/* Photoreal Santa — the drop-in replacement for the vector character.
 *
 * The engine is art-agnostic: it asks for `build(pose)` and then draws whatever
 * comes back through `toCanvas` / `toSVG`. This module satisfies that same
 * interface using photographic poses, so commissioned art swaps in without a
 * single change to engine.js, postcards.js or export.js.
 *
 * WHY THIS EXISTS. The vector Santa proved the mechanism — placement, walk path,
 * perspective, light matching — but a flat cartoon on a photograph reads as a
 * sticker. A photographed Santa, graded into the room's light, is the product.
 * The integration point is built now so that when the art arrives it is a file
 * drop, not a refactor.
 *
 * EXPECTED ART (see docs/commission-brief.md for the full brief):
 *   assets/santa/stand.png, walk.png, walk2.png, sit.png, reach.png,
 *   drink.png, eat.png, wave.png, cheer.png
 * Each is a transparent PNG of the same person at the same scale, feet on a
 * common baseline, front-lit and neutral so the grade can place him in any room.
 *
 * This module degrades honestly: with no art present it reports exactly what is
 * missing rather than rendering a broken figure.
 */
(function (global) {
  "use strict";

  // Must match Santa.poses in santa.js, or the timeline's pose names will not
  // resolve. The engine asks for a pose by name; this is the translation table.
  const REQUIRED = ["stand", "walk", "walk2", "sit", "reach", "drink", "eat", "wave", "cheer"];

  const state = {
    images: {},        // pose -> HTMLImageElement
    loaded: false,
    missing: [],
    // Feet-anchored: the source is drawn with its baseline at y=0, so the
    // composer can scale him by height and place his feet on the floor line.
    sourceHeight: 0,   // px tall in the source image
    anchorRatio: 1,    // fraction of sourceHeight from the TOP to the feet
  };

  function base() {
    return new URL("assets/santa/", location.href).href;
  }

  /* Load the set. Returns a report rather than throwing, so the UI can tell the
   * user precisely which pose is missing rather than failing opaquely. */
  function load(onProgress) {
    const names = REQUIRED.slice();
    let done = 0;
    state.missing = [];
    state.images = {};

    return new Promise((resolve) => {
      names.forEach((pose) => {
        const img = new Image();
        img.onload = () => {
          if (!state.sourceHeight) {
            state.sourceHeight = img.naturalHeight;
            // The feet sit on the bottom edge of the frame by convention, but a
            // delivered sprite often has a few px of margin; the brief asks for
            // feet exactly on the bottom row, so the default is 1.0.
            state.anchorRatio = 1;
          }
          state.images[pose] = img;
          done++;
          if (onProgress) onProgress(done / names.length, pose);
          if (done === names.length) {
            state.loaded = true;
            resolve(report());
          }
        };
        img.onerror = () => {
          state.missing.push(pose);
          done++;
          if (onProgress) onProgress(done / names.length, pose);
          if (done === names.length) {
            state.loaded = state.missing.length === 0;
            resolve(report());
          }
        };
        img.src = base() + pose + ".png";
      });
    });
  }

  function report() {
    return {
      loaded: state.loaded,
      required: REQUIRED,
      present: REQUIRED.filter((p) => state.images[p]),
      missing: state.missing.slice(),
      sourceHeight: state.sourceHeight,
    };
  }

  /* Interface-compatible with Santa.build(): returns shape objects, but each is
   * a single image blit with the destination computed at draw time. */
  function build(poseName) {
    const pose = state.images[poseName] ? poseName
              : state.images[Object.keys(state.images)[0]] ? Object.keys(state.images)[0]
              : null;
    if (!pose) return [];
    return [{ t: "santaImage", pose }];
  }

  function draw(ctx, shapes, opts) {
    const o = opts || {};
    const scale = o.scale === undefined ? 1 : o.scale;
    ctx.save();
    ctx.translate(o.x || 0, o.y || 0);
    ctx.scale(o.flip ? -scale : scale, scale);
    for (const s of shapes) {
      if (s.t !== "santaImage") continue;
      const img = state.images[s.pose];
      if (!img) continue;
      const h = state.sourceHeight || img.naturalHeight;
      // Same convention as the vector character: local y = 0 is the feet, and
      // the caller passes a height. So draw the image with its bottom edge on
      // the origin and its top at -h.
      const w = img.naturalWidth;
      ctx.drawImage(img, -w / 2, -h, w, h);
    }
    ctx.restore();
  }

  function toCanvas(ctx, shapes, opts) { draw(ctx, shapes, opts); }

  function toSVG(shapes, opts) {
    const o = opts || {};
    const scale = o.scale === undefined ? 1 : o.scale;
    let out = "";
    for (const s of shapes) {
      if (s.t !== "santaImage") continue;
      const img = state.images[s.pose];
      if (!img) continue;
      const h = state.sourceHeight || img.naturalHeight;
      const w = img.naturalWidth;
      const href = img.src;
      const flip = o.flip ? -scale : scale;
      out += `<image href="${href}" x="${-w / 2}" y="${-h}" width="${w}" height="${h}" `
           + `transform="translate(${o.x || 0} ${o.y || 0}) scale(${flip} ${scale})" `
           + `preserveAspectRatio="none"/>`;
    }
    return out;
  }

  global.PhotorealSanta = {
    REQUIRED, load, report, build, toCanvas, toSVG,
    get ready() { return state.loaded; },
  };
})(typeof window !== "undefined" ? window : globalThis);
