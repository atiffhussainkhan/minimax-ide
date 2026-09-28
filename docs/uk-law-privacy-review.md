# UK law, privacy & commercial review — 10 specialist agents

**Target:** `docs/santa-visit-requirements.md`
**Scope:** UK data protection law, children's regulation, consumer protection,
intellectual property, accessibility law, and the commercial terms of the free
tier this project plans to build on.
**Verdict:** 🔴 **Not ready to build commercially until 3 blockers are resolved.**

> **This is an engineering and compliance analysis, not legal advice.** Every
> finding names its source so a solicitor or the ICO can confirm it. Nothing
> here should be relied on as a legal opinion.

---

## Headline

The privacy *architecture* is sound and genuinely strong. The **legal wrapper
around it is not yet complete**, and there is one issue that could stop the
project commercially altogether:

> 🔴 **The free tier you plan to generate the Santa assets with is
> non-commercial and 16+.** Building a commercial, child-facing product on its
> output is not permitted by its terms.

Everything else is fixable with a week of work. This one changes the plan.

---

## Agent 1 — UK GDPR & Data Protection Act 2018 Auditor

### Verdict: architecture sound; documentation incomplete

The zero-transmission design is the strongest available position and is a
genuine implementation of **Art. 25 (data protection by design and default)**.
Confirmed strengths:

- No data transmitted → controllership of user photos does not arise
- No storage → Art. 5(1)(e) storage limitation cannot be breached
- No analytics → Art. 5(1)(c) data minimisation is trivially satisfied
- No third-party scripts → no covert collection vector

### 🟠 M1 — A lawful basis question is unanswered
If *any* personal data is processed by you — even transiently, even on-device —
Art. 6 requires a lawful basis. The document asserts controllership does not
arise, which is a defensible position for the **user's** own processing, but
your own processing of anything (e.g. an email address if you ever add a
newsletter) needs one. **If you never collect anything, you never need a
lawful basis — which is another reason to keep it that way.**

### 🟠 M2 — The ICO fee position must be confirmed, not assumed
Attaches to being a controller. Your architecture likely puts you outside it.
Confirm rather than assert. Fee for a small organisation: **£52/£78 per year**.

---

## Agent 2 — Children's Code Specialist

### Verdict: 🔴 in scope, and it will be the main regulatory relationship

A Santa novelty service is the paradigm case of an online service *"likely to be
accessed by children"* in the UK. The ICO applies the code **regardless of
whether you target children**.

**All 15 standards, mapped to this project:**

| # | Standard | Status here | Action |
|---|---|---|---|
| 1 | Appropriate application | — | Met by design |
| 2 | Data protection impact assessment | 🔴 **REQUIRED** | Produce a DPIA; cite the zero-transmission design as the mitigation |
| 3 | Age appropriate application | 🟠 | Document a risk-based age assessment |
| 4 | Transparency | 🟠 | Privacy info must be *"in clear language suited to the age of the child"* — adult wording is not enough |
| 5 | detrimental use of profiling | ✅ | No profiling exists |
| 6 | parental consent | ✅ | Nothing requiring consent |
| 7 | default settings | ✅ | Nothing off by default that tracks |
| 8 | data minimisation | ✅ | No data collected |
| 9 | data sharing | ✅ | No sharing possible |
| 10 | geolocation | ✅ | Not used |
| 11 | parental controls | 🟠 | Consider a light-touch age gate or content note |
| 12 | profiling | ✅ | None |
| 13 | nudge techniques | 🟠 | Ensure the personal-fields UI does not push a child toward entering their own details |
| 14 | connected toys/devices | ✅ | Not applicable |
| 15 | **online tools** | 🟠 | Must give children an accessible route to exercise rights and report concerns |

**Nine standards are met vacuously** because the underlying processing never
happens. **Three need positive action** (3, 4, 13) and **one is a hard
obligation you cannot design away** (2 — the DPIA).

---

## Agent 3 — PECR & Device Storage Specialist

### 🟠 M3 — The "keepsake library" needs care
FR-12 adopted SantaStudio's personal library, scoped as user-owned files in
`localStorage`. Note:

- Storing **only** a locally-generated output, with the user in control, is
  generally outside PECR's cookie rules (PECR governs information stored for
  terminal equipment access, and it is about *reading back*, with consent)
- But **localStorage is persistent device storage** of user-generated content.
  Under the Children's code standards 8 and 12 this must be justified and
  **erasable by the user**, not automatic.
- **Do not** persist the *source photo*. The output is a derived image of
  someone's home; persisting it silently is exactly the behaviour the whole
  project promises not to do.

→ **Recommended:** persist nothing at all in v1. Make the keepsake library an
explicit, clearly-labelled, user-initiated action.

---

## Agent 4 — Intellectual Property & Licensing Auditor

### 🔴 C1 — THE FREE TIER IS NON-COMMERCIAL AND 16+ (blocker)

Pollinations' own published terms state:

- Community tools and demos are **"non-commercial"**, with no uptime commitment
- Community features are **"intended for users 16+"**
- **"AI Model Licenses: Each model has its own license. Some allow commercial
  use, some don't. Always check the specific model's license before use"**
- **"Paid services are governed by the Myceli.AI Terms"** — the free tier's
  terms explicitly do *not* cover commercial services

**What this means for you:**
1. You cannot build a **commercial** product on free-tier output.
2. You cannot build a product **aimed at children** on a 16+ service.
3. Even the art you generate at build time and then ship counts — the asset
   would be derived from a non-commercial use, and the model licence may not
   permit commercial redistribution at all.
4. The free tier is explicitly offered **without uptime commitments** — it can
   be withdrawn or changed without notice.

**Resolution options, in order of preference:**

| Option | Cost | Notes |
|---|---|---|
| **Commission the Santa assets as original work** | Paid, one-off | **Cleanest.** An illustrator or 3D artist produces the sprite set; you own it outright, no licence questions, no dependency. |
| **Subscribe to Pollinations' commercial tier (Myceli.AI)** | Pay-as-you-go / plan | Legitimate commercial use, but check the specific model's licence still |
| **Use an explicitly commercially-licensed model** | Varies | Verify the licence per model, not per platform |
| **Build the character in code (SVG/Canvas)** | **$0** | Most robust. A Santa built as vector is fully yours, infinitely scalable, tiny, and has no dependency. Consistent with how you already solved the snake sprite problem. |

**Recommendation: option 4, with option 1 as a quality upgrade.** Vector
character art removes every licensing question and the runtime dependency at
once. This is exactly the call you already made for the snakes.

### 🟡 m1 — Document asset provenance
Whichever route you take, record for every asset: who made it, under what
licence, and that it is safe for commercial redistribution. A
`docs/asset-provenance.md` costs an hour and saves an argument later.

---

## Agent 5 — Consumer Protection Specialist

### 🟠 M4 — "Free" claims must be true
If you advertise the service as free, no payment, no account, or free forever,
**Consumer Protection from Unfair Trading Regulations 2008** requires that to be
accurate as at the time it is seen. If you later add a paid tier, the original
claim must not mislead. Do not advertise "free" for something that will
eventually require payment without qualifying it.

### 🟡 m2 — CAP/ASA rules apply to paid advertising
If you later buy ads, they fall under the **CAP Code** and the **BCAP Code**
(ASA). Children's targeting is especially tightly policed. No claim of "your
child's face" or similar emotional manipulation in ad copy.

### 🟡 m3 — Price transparency
If credits or a paid tier is introduced (FR-44), prices must be clear including
VAT, and no dark patterns in the purchase flow.

---

## Agent 6 — Defamation, Likeness & Reputation

### 🟡 m4 — User-entered names on share cards
FR-09 and FR-27 let a user put a **name** on a share card. If a user puts
someone else's name on it in a degrading context, you are the publisher.

**Mitigations:** a clear statement that the card is user-generated; a
complaints route; no publication of user content on your servers (which you
already avoid); a takedown process. Because nothing is hosted, exposure is
minimal — but the complaints route must actually exist.

### 🟡 m5 — Likeness rights
Do not build a likeness of a real person. Santa must be generic. Never
implement "put your favourite celebrity in the room" — that engages the
**Protection from Harassment, Crime and Victims Act 2017** and personality
rights.

---

## Agent 7 — Accessibility Law

### 🟠 M5 — The EAA does not become UK law — but it reaches you
Verified position:

- The **European Accessibility Act** became law across the EU on **28 June 2025**
- **It is not UK law.** The UK government has given no indication of
  equivalent legislation
- **But it has extraterritorial reach**: a UK business providing e-commerce
  services to **EU consumers** must comply
- **Microenterprises are exempt from the service requirements** — fewer than
  **10 staff** and under **€2M** turnover or balance sheet total
- The exemption is **narrower than most assume**: it covers *services*, not
  *products*, and it ceases the moment you cross either threshold
- In the UK, the **Equality Act 2010** applies instead — most importantly
  **s.20 (reasonable adjustments for disabled users)** and the duty not to
  discriminate

**Assessment for you:** as a sole trader you are almost certainly a
microenterprise and exempt from the EAA. **But** WCAG 2.1 AA remains the right
target under the Equality Act, and NFR-05 already commits to it — that is
correct and sufficient. Re-visit if you grow past 10 staff or €2M, or begin
selling to EU consumers.

---

## Agent 8 — Information Security & Breach

### 🟡 m6 — Define what a "breach" means here
If no data is transmitted, most breach-notification duties are moot. But state
this positively in the privacy notice rather than leaving it implied — a user
who uploads their home photo is anxious, and *"we have nothing to lose because
we hold nothing"* is a strong reassurance.

### 🟡 m7 — Client-side is not automatically safe
The photo is in memory on a device that may be compromised. Say so plainly.
Security-by-design means minimising exposure, not claiming immunity.

### 🟡 m8 — Kill switch must be tested
FR-19 requires it. It must clear the image, the sprite, the output blob, and any
object URLs, and it must be verified in acceptance testing.

---

## Agent 9 — Third-Party Script Auditor

### 🔴 C2 — One stray `<script>` destroys the entire product promise

This is the highest-severity *operational* risk in the project. The entire
differentiator (U1) is the claim that nothing leaves the device. A single
analytics tag, chat widget, font CDN, or A/B testing snippet — added by
anyone, at any time, for any reason — would falsify it publicly.

**Recommendation, and this is not optional:**
- Treat "no external `<script src>` on the tool page" as a **build-time check
  that fails CI**, not a comment in the code
- Add the same check to the audit that already runs in your game repo
- Document it in `CONTRIBUTING` so a future maintainer cannot undo it by accident

→ **This single control is what makes U1 true. Without it, U1 is a marketing
claim rather than a guarantee.**

---

## Agent 10 — Document Quality Auditor

### 🟡 m9 — The document is not yet client-ready
For a client conversation it still lacks: a traceability matrix (requirement →
source), a glossary, effort estimates, and a risk register. All four were added
in the first review pass, but the *final* document must carry a version and a
date so a client can be certain which revision they are reading.

### 🟡 m10 — "Not legal advice" must survive every copy
The caveat appears once. It must be restated wherever the compliance position
is summarised, because that is the section a client will quote.

---

## Blockers — what must be resolved

| # | Blocker | Owner decision needed |
|---|---|---|
| **B1** | **Free-tier output cannot be used commercially** | Choose: vector/code-built character, commission original art, or subscribe to a commercial tier with a commercially-licensed model |
| **B2** | **A DPIA is required** (Children's code standard 2) | Produce it; cite the zero-transmission design as the mitigation |
| **B3** | **No third-party script may be added** | Add a CI check that fails the build; document for maintainers |

## Major items

| # | Item | Action |
|---|---|---|
| M1 | Art. 6 lawful basis if anything is ever collected | Keep collecting nothing; revisit if that changes |
| M2 | ICO fee position | Confirm with the ICO/adviser |
| M3 | Keepsake library persistence | Persist nothing in v1 |
| M4 | "Free" advertising claims | Keep claims accurate as made |
| M5 | EAA | Not UK law; microenterprise-exempt; revisit at 10 staff / €2M |

---

## What the privacy position actually is — plainly

**You will have a genuinely strong story.** No competitor reviewed offers a
verifiable zero-upload guarantee; the strongest thing any of them does is
*"processed in your browser"* or *"automatically deleted"*. You can prove
yours.

But the strength is **entirely dependent on three things** you must actually
do, not just write down:

1. Never add a third-party script to that page
2. Never add a server that receives the image
3. Tell users plainly what is and isn't protected

Do those, and the privacy claim is real, defensible, and genuinely
differentiated. Skip any one and it becomes a claim you cannot keep.
