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

## Status

Character complete and visually verified. The scene compositor (anchors,
animation, video export) is not built yet — that is Phase 2 in
`../docs/santa-visit-next-steps.md`.
