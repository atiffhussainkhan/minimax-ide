# Asset provenance

Every asset that ships, where it came from, and whether it is safe to use
commercially. Requirement REQ-LIC-02 exists because the free image tiers are
**non-commercial and 16+**, which is exactly wrong for a commercial, child-facing
product.

## Product assets

| Asset | Source | Licence | Commercial use | Notes |
|---|---|---|---|---|
| `santa.js` | **Written in code** | Ours | ✅ Yes | No image at all. This is deliberate — see below. |
| `engine.js`, `postcards.js`, `export.js` | Written in code | Ours | ✅ Yes | |
| `mobile_test.html`, `index.html`, `tools/*` | Written in code | Ours | ✅ Yes | |
| Icons (if any added) | `tools/make_icons.py` | Ours | ✅ Yes | Generated in code, not from an image service. |

**There are currently no third-party image assets in this product.** Everything
is drawn in code, so there is nothing to license and nothing that can be
withdrawn.

## Why the character is code, not a generated image

Pollinations' published terms state that community tools are **non-commercial**,
that community features are **"intended for users 16+"**, that **"each model has
its own license"** which must be checked before use, and that **paid services
are governed by separate terms the free tier does not cover**.

A commercial children's product fails all three tests. Code has none of them:
it is free, permanently ours, ~13 KB rather than ~400 KB, crisp at any size, and
cannot be withdrawn by a third party.

## The intended production character

**Photoreal Santa, commissioned.** The engine is art-agnostic — it calls
`Santa.toCanvas()` and does not know whether the character is a photograph or
vector art — so swapping the asset requires no engine change.

When that art exists, record it here before shipping:

| Field | Value |
|---|---|
| Artist / studio | *pending* |
| Commission date | *pending* |
| Poses delivered | standing, 2 walk frames, sitting, reaching, eating, drinking, waving, cheering |
| Format | RGBA PNG, front-lit, neutral background, matched perspective |
| **Model release** | *required — the brief must state it* |
| Copyright assignment | *required in writing* |
| Commercial rights | *owned outright* |

## Rule for anything added later

Before an asset ships, this file gets a row saying who made it and that it is
safe to redistribute commercially. No row, no ship. The build check
(`tools/check_privacy.py`) covers the network side of the same promise.
