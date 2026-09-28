# Requirements review — 10 independent specialist agents

**Target:** `docs/santa-visit-requirements.md`
**Method:** each agent reviewed the document through one lens only, and was
required to produce *additions*, not praise. Every finding is traceable to a
named source (a competitor site, an ICO standard, or a browser behaviour).
**Outcome:** 3 corrections, 41 new requirements, 2 new risks, 1 scope decision.

---

## Summary of what changed

| Severity | Count | Highlights |
|---|---|---|
| 🔴 **Critical** | 3 | Children's Code applies and a DPIA *is* required (contradicts the doc); video export is a genuine blocker on shared hosting; seasonal scope undecided |
| 🟠 **Major** | 9 | WhatsApp can't take WebM; iOS recording trap; iOS canvas size ceiling; determinism vs realtime capture; credits model missing; captions missing |
| 🟡 **Minor** | 31 | Undo, EXIF orientation, colour space, sprite licensing, SEO, tone of voice, test matrix, traceability |

---

## Agent 1 — Privacy & Compliance Auditor
*Lens: UK GDPR, ICO Children's code, PECR. No praise.*

### 🔴 C1 — The Children's Code applies, and a DPIA is required
The document says *"No DPIA required."* **That is wrong for this product.**

A Santa app is the clearest possible case of an online service *"likely to be
accessed by children in the UK"*. The ICO is explicit that the code applies
**even if the service is not aimed at children**. It covers apps, games and
websites. Its 15 standards are a statutory code under s.125 DPA 2018, and the
ICO **must** take it into account when deciding whether a service complied
(per s.127).

**Standard 2 requires a DPIA.** The document's claim that zero transmission
avoids the DPIA requirement does not hold for a child-facing service.

**Correction:** the architecture still substantially discharges the standards —
if no personal data is transmitted, standards 7–10 (default settings,
minimisation, sharing, geolocation) are satisfied *vacuously*. But that must be
**documented in a DPIA**, not asserted in a footnote.

→ **New: PR-13, PR-14, PR-15, RISK-1**

### 🟠 M1 — Four code standards need explicit answers
- **Standard 3, age appropriate application.** The service must take a
  risk-based approach to age. Low risk here, but it must be *documented*.
- **Standard 4, transparency.** Privacy information must be *"concise, prominent
  and in clear language suited to the age of the child"*. Plain-English for
  adults is not sufficient — the child-facing version must be simpler still.
- **Standard 13, nudge techniques.** Nothing may encourage a child to hand over
  personal data. The "personal fields" (name, wish) must not be framed or nudged
  toward a child entering their own details.
- **Standard 15, online tools.** Children must have prominent, accessible tools
  to exercise data rights and report concerns. The doc has no such surface.

### 🟡 m1 — ICO fee position
The document says "likely no fee". Make that a *question to confirm*, not a
conclusion. The ICO fee (£52/£78 for small organisations) attaches to being a
controller; confirm the position rather than asserting it.

---

## Agent 2 — Technical Architect
*Lens: will this actually build, and will it work on the target host?*

### 🔴 C2 — Video export is a genuine blocker on shared hosting
The document assumes `MediaRecorder` and an `ffmpeg.wasm` MP4 fallback. The
fallback **does not work on the hosting the user is about to buy**:

- `ffmpeg.wasm` requires `SharedArrayBuffer`
- `SharedArrayBuffer` requires the headers
  `Cross-Origin-Opener-Policy: same-origin` and
  `Cross-Origin-Embedder-Policy: require-corp`
- **Shared hosting cannot set those headers.** iOS Safari additionally has
  limited `SharedArrayBuffer` support.

So on the chosen host there is **no transcoding path at all**. The output format
is whatever the browser's `MediaRecorder` natively produces.

### 🟠 M2 — The format matrix is hostile
| Browser | Native MediaRecorder output |
|---|---|
| Chrome / Edge / Firefox | **WebM** (VP8/VP9) |
| Safari 14.1–18.3 (macOS) | **MP4 only** (H.264/AAC) — no WebM at all |
| Safari 18.4+ | MP4 **and** WebM |
| Chrome on a platform with an OS encoder | MP4 possible — must feature-detect |

There is no single format that works everywhere, and it must be discovered at
runtime with `MediaRecorder.isTypeSupported()`.

### 🟠 M3 — iOS recording trap
A widely-reported failure: on iOS Safari, `MediaRecorder` output can contain
keyframes only in the first chunk, producing a clip that **plays for ~0.1 s and
then freezes** as a still image. This affects `video.captureStream()` and
`canvas.captureStream()` alike. It must be tested explicitly, not assumed.

→ **New: FR-30…FR-34, NFR-10…NFR-13, RISK-2**

### 🟡 m2 — Deterministic export should not use realtime capture
FR-26 requires deterministic, identical output every run. `MediaRecorder`
captures *realtime* — frame timing will vary run to run. To hit U8 properly,
render **frame-by-frame** and encode with **WebCodecs `VideoEncoder`**, which
accepts explicit timestamps. Where WebCodecs is unavailable, fall back to
`MediaRecorder` and accept (and document) that output is not bit-identical.

### 🟡 m3 — Offscreen rendering
30 fps compositing (NFR-02) will drop frames on the main thread while the photo
decodes. Render in a `Worker` with `OffscreenCanvas`.

---

## Agent 3 — Interaction Design Lead
*Lens: can a first-time user actually complete this?*

### 🟡 m4 — The 3-anchor flow has no recovery
If a user misplaces the sofa they have no way back. Anchors need drag-adjust,
undo, and a "start over" that does not lose the photo.

### 🟡 m5 — No quality guidance (adopted from InsMind, not specified)
InsMind tells users *"use a clear, front-facing portrait; avoid sunglasses or
blur"* **before** they try. FR-03 validates and rejects but never coaches.
The document cites InsMind as a source and then drops the idea.

### 🟡 m6 — Orientation and framing
No requirement handles a portrait photo of a room, a photo taken at a steep
angle, or a photo where the sofa is cropped out. A photo with no room visible
should be detected early with a helpful message, not discovered at render time.

→ **New: FR-35…FR-38**

---

## Agent 4 — Competitive Intelligence Analyst
*Lens: what do the ten sites have that the document missed?*

### 🟠 M4 — The credits model is missing
Media.io offers *"free daily credits"*. Every serious player in this category
metered or credits usage. The document has no commercial model at all beyond
"optional paid mode" — for a client-facing document that is a real gap.

### 🟡 m7 — Batch / multi-output
Flyne.ai offers unified Christmas video content from multiple photos in one
run. Noted, not specified.

### 🟡 m8 — Captions
Filmora applies a captioning pass. For a *video* product aimed at sharing, and
for accessibility, this is a standard expectation.

### 🟡 m9 — Progress/queue feedback
Wondercraft and Flyne both show generation progress. A 10 s render with a frozen
spinner is a churn point.

---

## Agent 5 — Accessibility Specialist
*Lens: WCAG 2.1 AA and motor/cognitive access.*

### 🟠 M5 — Reduced-motion must disable the snow
FR-13 mandates falling snow. The ICO's Children's code aside, continuous
falling motion is a genuine vestibular trigger, and the document lists
`prefers-reduced-motion` compliance in NFR-05 **without reconciling it with
FR-13**. These two requirements contradict each other. Resolved in R2.

### 🟡 m10 — Anchors must be keyboard-placeable
Dropping three points is a drag-only interaction. Needs keyboard and
alternative input paths to satisfy NFR-05.

### 🟡 m11 — Screen reader description of the output
A video that is entirely visual needs a text alternative describing what
happened, for screen reader users.

### 🟡 m12 — The scene needs captions (see M8) and a reduced-flash mode.

---

## Agent 6 — Growth & Monetisation Strategist
*Lens: how does anyone find this, and how does it make money?*

### 🔴 C3 — Seasonality is undecided and it changes everything
The document never asks whether this is a **Christmas-only** product or a
year-round novelty engine. This determines hosting strategy, SEO strategy,
whether the portal is rebuilt each December, whether the "gift" framing
(FR-17) is permanent or seasonal, and whether effort should go into a
second character for summer/halloween.

The document's own open questions do not include this. **It is the single
biggest missing decision.**

### 🟡 m13 — Discoverability is unplanned
A free, private, zero-cost novelty tool is extremely shareable but has no
inbound funnel. The document has no SEO, no social-proof loop, no watermark-on-
share strategy.

### 🟡 m14 — Attribution / share loop
If a shared video carries no link back, the growth loop doesn't exist. Needs a
requirement, and it must be opt-out given the privacy stance.

---

## Agent 7 — Brand & Content Lead
*Lens: voice, framing, what the copy actually says.*

### 🟡 m15 — The "gift" framing has no copy
U4 is the strongest differentiator and FR-17 is the only requirement carrying
it. There is no tone of voice, no headline, no share-card copy, no
child-appropriate wording. For a client-facing document this is a visible gap.

### 🟡 m16 — Naming
"Santa's Visit" is a working title and is marked as such. Fine, but the
document should say so at the top.

### 🟡 m17 — Seasonal copy expiry
All copy is Christmas-specific. If C3 resolves to year-round, every string
needs to be externalised — not hard-coded in the markup.

---

## Agent 8 — Mobile & Performance Engineer
*Lens: real devices, real ceilings.*

### 🟠 M6 — iOS canvas size ceiling
Safari limits canvas dimensions — roughly 4096×4096 and a total area around
16.7 million pixels. A modern phone photo (e.g. 4032×3024 ≈ 12.2 MP) is close to
that limit; a 108 MP image will **silently fail** to draw. The document has no
downscale requirement and NFR-03's 3 MB budget implies small inputs, but
modern phone photos are routinely 3–8 MB.

**Required:** downscale any input to a working ceiling before drawing.

### 🟠 M7 — EXIF orientation
Phone photos store orientation in EXIF, not in the pixel data. Drawn naively,
portrait photos render **sideways**. `createImageBitmap` with
`imageOrientation: "from-image"` is the fix, and the requirement is missing.

### 🟡 m18 — Colour space
Wide-gamut (P3) phone photos render differently across browsers. A colour
profile normalisation step prevents "it looks different on my phone".

### 🟡 m19 — Memory ceiling
Decoding a 12 MP image plus two canvases plus a sprite sheet is a lot. An
explicit budget and a graceful failure path is needed.

### 🟡 m20 — Battery
A 10 s render at 30 fps with a compositing loop is fine; but the tool must not
hold the screen awake or spin when idle.

---

## Agent 9 — QA & Test Strategist
*Lens: how do we know it works?*

### 🟡 m21 — No test matrix
Acceptance criteria exist (9 items) but there is no matrix across
browser × device × input size × scene length, and no stated pass threshold.

### 🟡 m22 — No visual regression for placement
U2/U3 are fundamentally about *where Santa lands*. A one-pixel regression in
anchor maths is invisible in a logic test and obvious to a user. Needs
golden-image comparison.

### 🟡 m23 — Determinism is untested
U8 is a headline differentiator and has no test asserting byte-identical or
frame-identical output across runs.

### 🟡 m24 — The zero-upload guarantee is untested
PR-01 says "enforceable in CI" but no such check exists. It should be a
test that fails the build.

---

## Agent 10 — Client-Facing Document Reviewer
*Lens: would a client read this and know what they're getting?*

### 🟡 m25 — No traceability
No requirement references a source. For a client-facing document, being able
to show "this came from MyHeritage, this from Article 25" is what makes a spec
credible.

### 🟡 m26 — Open questions lack owners and dates
Section 14 lists 5 questions with no owner, no deadline, and no stated impact
if unanswered.

### 🟡 m27 — No glossary
SCROLL, SOBR, SPI, H.264, WebM, COOP/COEP, WebCodecs, DPIA, ISS. A client
reader will not know these.

### 🟡 m28 — Effort not estimated
No sizing, no team, no phasing duration. Phases exist but have no estimates.

### 🟡 m29 — Risks are absent entirely
There is no risk register. Three critical risks were found in this review that
the document does not mention at all.

### 🟡 m30 — Assumptions are unstated
Assumes: modern browsers only, English only, one photo per visit, no accounts,
static hosting, no offline requirement in v1. Several of these are load-bearing
and unconfirmed.

---

## What did **not** survive scrutiny

| Original claim | Verdict |
|---|---|
| "No DPIA required" | **Wrong** — Children's Code standard 2 requires one. See C1. |
| "`ffmpeg.wasm` for MP4 fallback" | **Not viable** on shared hosting. See C2. |
| "Unique: nothing is uploaded" | **Weakened** — Media.io advertises in-browser editing and Wondercraft claims deletion. The *provable, hard-guaranteed* version is still unique, but the document must not imply competitors don't claim it. |
| "Nobody previews placement" | **Unverified** — a negative claim about a market. Should be softened to "no competitor reviewed offers this". |
