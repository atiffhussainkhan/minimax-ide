# Santa's Visit

Put Santa in someone's actual living room, from their own photo.

## Why the character is drawn in code

The free image tiers are **non-commercial and 16+** (see
`../docs/uk-law-privacy-review.md`), so a commercial child-facing product cannot
use them. Code is free, permanently ours, ~13 KB instead of ~400 KB, crisp at any
size, and cannot be withdrawn by a third party. Same approach that fixed the
snake sprites in the game.

## santa.js

`Santa.build(pose)` returns a list of primitive shapes in a local space where
the **feet sit at y = 0** and up is negative. Two renderers consume the same
list:

```js
Santa.toSVG(shapes, { x, y, scale, flip })   // for the live DOM
Santa.toCanvas(ctx, shapes, { x, y, scale, flip })  // for video export
```

Because both read one source of truth, the preview and the exported video can
never drift apart.

## Poses

`stand` · `walk` · `walk2` · `sit` · `reach` · `drink` · `eat` · `cheer` · `wave`

These cover the scene in FR-12: enter at the door (`wave`), walk to the sofa
(`walk`/`walk2`), sit (`sit`), reach the table (`reach`), eat the cookie
(`eat`), drink the milk (`drink`), leave.

## Preview

Open `_poses.html` in a browser to see every pose and check how he reads at
40–150 px, which is the range that matters inside a room photo.

## engine.js

`Scene.renderFrame()` composites the character into a photo using three anchors
the user places — **door, sofa, table** — rather than transforming anyone in the
picture. Santa's position, height, facing and walk path are all derived from
those three points, so he is placed *in their room*, not pasted on top of it.

The engine is deliberately **art-agnostic**: it calls `Santa.toCanvas()` and
does not know or care whether the character is a vector or a photograph. Proving
the mechanism with a cheap vector character now, then swapping in a photoreal
one later, costs nothing — which is why the mechanism was built first.

### Why it stops looking like a sticker

A flat sprite on a photo reads as fake because it has no relationship to the
room. Three corrections, all in code:

- **Contact shadow** offset along the light direction, softening with distance
- **Colour grade** sampled from the floor, so Santa sits in the room's colour world
- **Depth scaling** from the anchors, so he is the right size for where he stands

## Status

- **Character** — 9 poses, complete and visually verified
- **Engine** — anchors, walk path, perspective, snow, glow, shadow, grade. Verified
- **Not built** — video export (RISK-2, the iOS codec trap is unresolved), the
  photoreal character swap, and the audio greeting

Open `index.html` to try it: use the sample room, or choose a photo, then drag
the three markers.
