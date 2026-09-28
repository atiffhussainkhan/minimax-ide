# Requirements — "Santa's Visit" (working title)

**Project:** Personalised Santa-visit experience for a user's own home photo
**Status:** Requirements, pre-build
**Author:** prepared for Atif Hussain
**Date:** 2026-09-28

---

## 1. Executive summary

A website where someone uploads a photo of their own living room, taps where
their **door**, **sofa** and **table** are, and watches a short looping video of
Santa Claus walk in through their door, sit on their sofa, drink the milk, eat
the cookie, and leave — placed and scaled to *their* actual room.

### The three decisions that define this project

| Decision | Consequence |
|---|---|
| **100% client-side processing** | The photo never leaves the user's device. No upload, no storage, no server sees it. |
| **Pre-generated character assets** | Zero generation cost at runtime → **$0 per user, forever**, at any scale. |
| **Furniture-anchored, not face-swapped** | Nobody in the market does this. It's the differentiator. |

Cost to serve: **$0** (static hosting, no API calls at runtime). Cost to the
user: **$0**.

---

## 2. Market analysis — 10 comparable sites

Each entry lists what that site does that a competitor could **not** simply copy
without also copying the user's idea. These are the raw materials for §4.

### 2.1 Christmas / Santa novelty generators

| # | Site | Unique feature worth taking |
|---|---|---|
| 1 | **Fotor** — *Photo to Santa* (fotor.com/features/convert-photo-to-santa-claus/) | Curated **preset prompt library** with one-click templates; pairs a still filter with a Veo 3.1 image-to-video mode. |
| 2 | **Media.io** (media.io/christmas-templates-effects.html) | **"Sit on Santa's lap"** pose template. Explicitly states *"the AI handles all the editing automatically in your browser"* — closest anyone gets to local processing. Free daily credits. |
| 3 | **Wondercraft** (wondercraft.ai/tools/free-ai-santa-generator) | **Three personalisation fields** — *name, gift wish, inside joke*. Three output formats: image, **audio voice message**, video. One-line privacy claim: *"all uploads are processed securely and automatically deleted."* |
| 4 | **ElevenLabs** — *Santa AI Video with Voice* | **Lip-synced spoken greeting** — Santa actually says the user's message. |
| 5 | **SantaStudio** (App Store) | **Personal Library** — every creation saved, browsable, re-downloadable, re-shareable. |
| 6 | **Filmora / Wondershare** | Direct **export to TikTok, Instagram and YouTube Shorts**, plus a captioning pass for accessibility. |
| 7 | **InsMind** (insmind.com/video-effects/ai-santa-transformation) | Publishes **quality guidance in-product** ("use a clear, front-facing portrait; avoid sunglasses or blur") — reduces failed generations. |
| 8 | **Flyne.ai** — Christmas Video Generator | **Theme grid** — Santa transformation, gift-giving, toasting, hugs, as separate one-tap scenes. |
| 9 | **AI Christmas Photo-Video XMAS** (App Store) | Accepts **pets as subjects**, not just people. |
| 10 | **"Meet Your AI Santa"** (Google Play) | **Multi-character scenes** — "pose with Santa *or join the elves*". |

### 2.2 Photo-animation incumbents (the interaction design to learn from)

| # | Site | Unique feature worth taking |
|---|---|---|
| 11 | **MyHeritage Deep Nostalgia** | **Driver videos** — pre-recorded gesture sequences applied to a photo. This is the technique that keeps a character *identical* across every frame. |
| 12 | MyHeritage Deep Nostalgia | **Ethical disclosure icons** — an embossed motion icon, a magic-wand icon and a palette icon stamped on the corner so an AI-altered photo is never mistaken for the original. |
| 13 | MyHeritage LiveMemory | **"Relive the memory" vs "Have fun"** — two modes: realistic reenactment *or* a chosen comic gesture. |
| 14 | MyHeritage Deep Nostalgia | **Face selection UI** — detect all faces, let the user pick which one to animate. |
| 15 | MyHeritage Deep Nostalgia | **Abandoned-upload auto-deletion** — photos uploaded without completing signup are deleted automatically "to protect your privacy". |

### 2.3 What *nobody* does

| Gap | Evidence |
|---|---|
| **Truly zero server contact** | Media.io says browser-based; Wondercraft says "securely processed then deleted". MyHeritage explicitly *stores uploads on your account*. All of them still involve a server. |
| **Furniture-anchored placement** | Every site above transforms *people*. None composes a character relative to the user's **own door, sofa and table**. |
| **Placement preview before generating** | No site shows "here's where Santa will sit" before committing. |
| **A shareable keepsake/gift framing** | Every site sells a filter. None offers *"this is a present for someone else"*. |
| **A child-redeemable pass** | No site lets the recipient open the experience on their own device. |

---

## 3. The privacy architecture (this is the foundation)

> **Non-negotiable design constraint:** the user's photo is read into memory in
> the browser and **never transmitted**. There is no upload endpoint, no object
> storage, no analytics on the image, no third-party script that can see it.

### 3.1 Why this is legally the strongest possible position

Verified against current ICO guidance:

- **UK GDPR Art. 25 — data protection by design and default.** The ICO requires
  technical and organisational measures considered *at design stage*. This
  architecture *is* that measure. It is the textbook implementation of Art. 25.
- **Household exemption.** The ICO states that an individual processing personal
  data for *"purely personal or household activity"* is not subject to the UK
  GDPR and has no controllership obligations. The user editing their own photo on
  their own device falls squarely here.
- **If no data reaches you, you are not a controller of it.** The strongest
  privacy position available is not "we delete it" — it is "we never had it".
  This project takes the second option.
- **No DPIA required.** A DPIA is required where processing is likely to result
  in high risk to people's rights. Because no personal data is transmitted
  anywhere, the risk profile is materially reduced. (Re-evaluate if any
  server-side processing is ever introduced — see §3.4.)
- **ICO data protection fee.** If you are not a controller of user photos you
  likely have no fee to pay. Confirm your own position; the fee for a small
  organisation is £52/£78 per year if you are.

### 3.2 What still has to be done

Privacy-by-design is not an excuse for no privacy information. Even with zero
collection you must:

- Publish a plain-English **privacy notice** stating that nothing is uploaded.
- State clearly what the tool *does* do (all processing on device).
- Provide a **kill switch** — see FR-19.
- Never add a third-party script (analytics, ads, chat widgets, CDNs beyond
  static file serving) that could observe the canvas or file input. This is a
  hard architectural rule, because a single analytics tag would break the
  entire guarantee.

### 3.3 Special-category data — face detection

If the app detects faces to help place Santa, that is **biometric data** and
therefore **special category data** under Art. 9 UK GDPR.

Mitigation, applied together:

1. **Detection runs on-device only.** The user is the one doing it, on their own
   photo, for their own household use → household exemption applies.
2. **Detection is opt-in and toggleable.** The user can place points manually
   with no detection at all.
3. **No face image, template or embedding is ever derived, transmitted or
   stored.** Only bounding-box coordinates exist, in memory, for the life of the
   tab.
4. If detection is ever moved to a server, this changes completely and needs
   explicit consent plus a DPIA. **Out of scope — see §8.**

### 3.4 Hard rules for future maintainers

- [ ] No `fetch`/`XMLHttpRequest`/`sendBeacon` of image data, ever
- [ ] No `localStorage`/`sessionStorage`/`IndexedDB` persistence of the photo,
      the output, or anything derived from them
- [ ] No third-party script tags on the tool page
- [ ] `Cache-Control: no-store` on the tool page
- [ ] Photo held in a JS variable, released on tab close or explicit reset

---

## 4. Differentiation strategy

Taking the best of the market, then adding what nobody has.

### 4.1 Adopted from the market

| From | Feature | Ref |
|---|---|---|
| MyHeritage | Pre-recorded "driver" motion sequences → Santa is pixel-identical every frame | #11 |
| MyHeritage | Honest AI disclosure badge on the output | #12 |
| MyHeritage | Two modes: **Relive the night** (realistic) / **Have some fun** (cartoon) | #13 |
| MyHeritage | Click-to-place point selection, no auto-detection required | #14 |
| Wondercraft | Personal fields: **name, who's visiting, their wish, an inside joke** | #3 |
| Wondercraft | Output choice: video, still, or a **voice greeting** | #3 |
| ElevenLabs | Spoken, lip-synced Santa greeting | #4 |
| SantaStudio | **Keepsake library** — but in `localStorage` as *user-owned* files, clearly labelled "on this device" | #5 |
| Filmora | One-tap **vertical (9:16) export** for Stories/TikTok/Shorts | #6 |
| InsMind | In-product **photo quality guidance** before they try | #7 |
| Flyne.ai | Scene grid: Classic / Cartoon / Spooky / Grinch | #8 |
| Media.io | **Furniture-aware** placement (they place a person on a lap; we place a character in a room) | #2 |
| All | "Nothing is uploaded" as the *headline* differentiator | — |

### 4.2 New — nobody does this

| # | Unique feature | Why it wins |
|---|---|---|
| **U1** | **Zero server contact — a hard, provable guarantee** | Every competitor processes on a server. We can state it, prove it, and let users verify with DevTools. This is the headline. |
| **U2** | **Santa placed in *your* actual room** — anchored to your door, sofa and table, scaled to perspective | Everyone transforms faces. Nobody composes a character into the viewer's own space. |
| **U3** | **"Where will Santa sit?" preview** before generating anything | Removes the fear of wasting effort. No competitor has it. |
| **U4** | **A present, not a filter** — the experience is framed as a gift, with a share card and a recipient-facing "open your visit" pass | Changes the intent from self-entertainment to gifting — the actual reason people share these. |
| **U5** | **Child-redeemable pass code** — the sender generates a short code and frames it as a Christmas-morning surprise for a specific person | Emotional payload no filter has. Generated locally; the code carries no personal data. |
| **U6** | **Works without faces** — a photo of a room with nobody in it is a first-class input, not an error | Widens the audience, and is a genuine accessibility win. |
| **U7** | **House rules mode** — "we don't have a fireplace", "no kids, keep it classy", "he's terrified of the dog" | Playful control that changes the scene, not just the filter. |
| **U8** | **Deterministic replay** — same photo + same taps always produce the same video | AI video is non-deterministic; ours is not. Means it can be re-shared, printed, kept. |

---

## 5. Functional requirements

### 5.1 Core flow

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | User lands on a page that states, in plain English, that the photo never leaves their device | Must |
| FR-02 | User supplies a photo via file picker, drag-and-drop, clipboard paste, or device camera | Must |
| FR-03 | Photo is validated client-side (type, decodable, dimensions, file size) with a clear error | Must |
| FR-04 | **Preview of the photo with 3 placeable markers**: 🚪 Door, 🛋️ Sofa, 🍪 Table | Must |
| FR-05 | Markers placed by **tap/drag**, always; auto-detection is an optional assist, never required | Must |
| FR-06 | **U3 Preview step** — a static "plan view" showing Santa's walk path and where he will sit, before generation | Must |
| FR-07 | Scene picker: Classic / Cartoon / Grinch / Spooky | Must |
| FR-08 | Two animation modes: **Relive the night** (realistic) and **Have some fun** (comic) | Must |
| FR-09 | Personal fields, all optional: display name, who's visiting, a wish, an inside joke | Must |
| FR-10 | **U7 House rules** toggles: no fireplace, keep it classy, he's scared of the dog | Should |
| FR-11 | **U6 Face-free mode** — a room with no people is fully supported | Must |
| FR-12 | The scene plays: enters at the door → walks to the sofa → sits → reaches the table → eats the cookie → drinks the milk → leaves | Must |
| FR-13 | Ambient layer: falling snow + a warm glow that tracks Santa + sparkle trail on his path | Must |
| FR-14 | **Honest-AI badge** baked into the output (see §6, PR-06) | Must |
| FR-15 | Export video (WebM, then MP4 where supported) | Must |
| FR-16 | Export 9:16 vertical variant for Stories/TikTok/Shorts | Should |
| FR-17 | **U4 Share card** — a still frame with the personal message, designed for WhatsApp | Must |
| FR-18 | **U5 Pass code** — a short code the recipient enters on their own device to "open their visit" | Should |
| FR-19 | **Privacy kill switch** — one control that wipes photo, all derived assets and the plan, and reloads | Must |
| FR-20 | Nothing persists across a page reload | Must |

### 5.2 The scene (the actual product)

| ID | Requirement |
|---|---|
| FR-21 | Santa is a **single fixed sprite set**, generated once at build time. He must be pixel-identical in every frame of every video |
| FR-22 | Santa is placed by the user's three anchors, positioned and **scaled by perspective** — nearer anchors render him larger |
| FR-23 | Movement between anchors follows a smooth path with natural easing, not straight lines |
| FR-24 | A gentle **2.5D parallax** shift on the background sells depth without needing depth estimation |
| FR-25 | Contact shadow under Santa, scaled with his distance |
| FR-26 | Timing is scripted and identical every run (U8) |

### 5.3 Personalisation (all local)

| ID | Requirement |
|---|---|
| FR-27 | Display name rendered on the share card and inside the scene if the user opted in |
| FR-28 | If audio is enabled (see §7), the greeting is spoken and lip-synced to Santa's sprite |
| FR-29 | Text must never be baked into the video via a font that requires a network fetch — fonts ship locally |

---

## 6. Privacy requirements

| ID | Requirement | Basis |
|---|---|---|
| PR-01 | **No network transmission of image or derived data.** Enforceable in CI: fail the build if any `fetch`/XHR/beacon call is made with image data | Art. 25 UK GDPR |
| PR-02 | **No third-party scripts** of any kind on the tool page | Art. 25 |
| PR-03 | Photo lives only in JS memory; released on navigation, reload, or kill switch | Art. 5(1)(e) storage limitation |
| PR-04 | No analytics, no pixels, no fingerprinting, no A/B testing | Art. 5(1)(c) data minimisation |
| PR-05 | If the user's device is capable, **no cookies are set at all** | ePrivacy |
| PR-06 | **Honest-AI disclosure**: every exported image/video carries a visible marker, plus a one-line caption *"AI-generated. Santa is not real."* | MyHeritage #12 precedent; responsible-AI practice |
| PR-07 | Plain-English **privacy notice** published on the site, stating nothing is uploaded | Art. 13 transparency |
| PR-08 | No age gate or sign-up. **No login, ever** — MyHeritage requires sign-up before showing the result; that is a design failure we invert | Art. 6 — avoids consent entirely |
| PR-09 | Photos containing identifiable people must be the user's own or one they have permission to use; the site states this plainly and accepts no liability for misuse | Art. 5(1)(d) integrity |
| PR-10 | No facial-recognition identity matching, no celebrity/public-figure matching | Art. 9 |
| PR-11 | `Cache-Control: no-store` on the tool page and any endpoint it uses | Art. 32 |
| PR-12 | A **verifiable claim page** — instructions showing how a technical visitor can confirm zero network requests in DevTools | Turns a claim into a proof |

> **Not legal advice.** Confirm your position with the ICO or an adviser before
> launch, particularly on ICO fee registration and whether any feature tips you
> into controllership.

---

## 7. Optional / later

| ID | Feature | Notes |
|---|---|---|
| OP-01 | Santa voice greeting | Needs local TTS or a paid API — would break U1 unless done in-browser |
| OP-02 | Multiple characters (elf, reindeer) | Extends FR-21 |
| OP-03 | Pets reacting | Builds on #9 |
| OP-04 | Photorealistic mode (paid, server-side) | Would break U1 — only as an explicit opt-in with clear disclosure |
| OP-05 | Photo-based "wrapping paper" generation | Reuses the render pipeline |

---

## 8. Out of scope

- Any server-side image or video processing, now or later, unless the whole
  privacy model is revisited and re-approved
- Accounts, logins, cloud saves, sharing via our servers
- Native app store releases (agreed as a later phase)
- Uploading finished videos to a server on the user's behalf

---

## 9. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-01 | First meaningful paint < 1.5 s on a mid-range phone |
| NFR-02 | Scene renders at 30 fps on a 2019-class phone; degrade gracefully to 24 fps |
| NFR-03 | Total download < 3 MB including Santa sprite set |
| NFR-04 | Works offline once loaded (service worker) — a further privacy guarantee, since it proves no network dependency |
| NFR-05 | WCAG 2.1 AA: keyboard operable, focus visible, screen-reader labelled, honours `prefers-reduced-motion` |
| NFR-06 | No console errors; no mixed content |
| NFR-07 | Runs on Safari 15+, Chrome 110+, Firefox 110+, iOS Safari 15+ |
| NFR-08 | Graceful message when `MediaRecorder`, `OffscreenCanvas` or WebCodecs are unavailable |
| NFR-09 | Memory freed on reset; verified with no unbounded growth over 50 consecutive renders |

---

## 10. Architecture

```
┌──────────────────────── Browser (the user's device) ────────────────────────┐
│                                                                             │
│  File / camera  ──►  ImageBitmap (in memory only)                           │
│                            │                                                │
│                            ├──► Anchor placement UI (FR-04/05)              │
│                            ├──► Plan preview (FR-06)                         │
│                            │                                                │
│                            ▼                                                │
│                   Canvas compositor                                        │
│         background  + parallax + Santa sprite set + snow + glow             │
│                            │                                                │
│                            ├──► MediaRecorder ──► video file ──► download   │
│                            └──► Share card canvas ──► PNG ──► download     │
│                                                                             │
│  Everything above runs here. Nothing crosses the network boundary.          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ✂  (no network)
                                    ✂
                      ┌─────────────────────────┐
                      │  Static host (files +   │
                      │  CDN only)              │
                      └─────────────────────────┘
```

**Technology notes**
- `Canvas 2D` for composition; `OffscreenCanvas` + `WebCodecs` where available
- `MediaRecorder` with `canvas.captureStream()` for capture; fall back to
  `ffmpeg.wasm` for MP4
- Santa sprite set: one sprite sheet, delivered as a static asset, ~200–400 KB
- Snow, glow and sparkle: procedural, drawn per frame — **no assets, no cost**
- Optional on-device face detection via a WASM COCO-SSD build, lazily loaded,
  never a remote model

---

## 11. Acceptance criteria

The build is done when a user who has never seen it can:

1. Land on the page and understand within 5 seconds that nothing is uploaded
2. Open DevTools → Network, use the tool fully, and see **zero requests
   containing image data** (PR-12)
3. Add a photo of a room with **no people** and complete the scene (FR-11)
4. Place all three anchors purely by tapping, with detection disabled (FR-05)
5. See a plan preview that matches the final result (FR-06)
6. Export a video that plays, loops, and carries the AI badge (FR-15, PR-06)
7. Export a 9:16 variant (FR-16)
8. Hit the kill switch and have every trace of the photo gone (FR-19)
9. Reload and find the photo is not back (FR-20)

---

## 12. Competitive positioning

**One sentence:** *Every other Santa app changes your face. This one puts Santa
in your actual living room — and it never uploads your photo, not even for a
second.*

| | Face transform | Scene composition | **Zero upload** | Furniture-aware | Gifting frame |
|---|---|---|---|---|---|
| Fotor | ✅ | ❌ | ❌ | ❌ | ❌ |
| Media.io | ✅ | ❌ | ~browser | ❌ | ❌ |
| Wondercraft | ✅ | ❌ | ~deleted | ❌ | Partial |
| ElevenLabs | ✅ | ❌ | ❌ | ❌ | ❌ |
| SantaStudio | ✅ | ❌ | ❌ | ❌ | ❌ |
| Filmora | ✅ | ❌ | ❌ | ❌ | ❌ |
| InsMind | ✅ | ❌ | ❌ | ❌ | ❌ |
| Flyne.ai | ✅ | ❌ | ❌ | ❌ | ❌ |
| Xmas Photo-Video | ✅ | ❌ | ❌ | ❌ | ❌ |
| Meet Your AI Santa | ✅ | ❌ | ❌ | ❌ | ❌ |
| MyHeritage | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Ours** | ❌ | ✅ | ✅ **provable** | ✅ | ✅ |

The two columns nobody else can honestly tick are the ones the product leads on.

---

## 13. Phasing

| Phase | Scope | Value |
|---|---|---|
| **1 — Proof** | Photo → 3 anchors → Santa walks door-to-sofa, sits, exits. Snow + glow. Video export. | Proves U2 and U3, the core novelty |
| **2 — Complete** | Table + cookie + milk, two modes, scene picker, share card, kill switch | The full described experience |
| **3 — Differentiate** | Voice greeting, pass codes, house rules, face-free polish | U4–U7 |
| **4 — Prove** | Verify page, share assets, SEO | Makes U1 credible and drives traffic |
| **5 — Commercialise** | Optional paid photorealistic mode (opt-in, disclosed) | Only after the free product proves demand |

---

## 14. Open questions

1. **Sprites vs. generated video** — is the 2.5D cartoon look acceptable as the
   default, or is photorealism essential to the appeal? This changes Phase 1
   scope materially. *Recommendation: ship 2.5D first; the fidelity can rise later
   without changing the architecture.*
2. **How long should the scene be?** 8–12 s covers the brief in one loop.
3. **Do we need a real fireplace anchor?** It would improve composition if
   present, but adds a required tap. *Recommendation: optional.*
4. **Pass codes (U5) with zero server** — a code can only carry a URL fragment.
   Is a link-based pass acceptable, or is a short memorable code required? The
   latter needs a server, which costs the U1 guarantee. *Recommendation: link
   only, and say so honestly.*
5. **Does the gifting framing need a name?** U5 gets much stronger if the
   recipient's name can appear on the share card — but that name never leaves
   the sender's device.

---

## 15. Sources

Market analysis drawn from the sites listed in §2, reviewed September 2026.
Privacy requirements derived from current ICO guidance on the UK GDPR, in
particular *Data protection by design and default* (Art. 25) and the ICO's
position that purely personal or household activity falls outside the UK GDPR's
scope.

**This document is a requirements specification and engineering analysis, not
legal advice.** Have the privacy position confirmed with the ICO or a qualified
adviser before launch.
