# Next steps — Santa's Visit

**What this is:** the shortest honest path from the finished requirements
document to something you can launch. Ordered by what unblocks the rest.

---

## Where you actually are

| ✅ Done | |
|---|---|
| Market analysis | 10 competitors reviewed, 20 features extracted |
| Requirements document | 573 lines, 48 functional + 20 privacy + 14 non-functional requirements |
| Two independent 10-agent reviews | 3 corrections, 47 new requirements, 10 risks |
| Legal analysis | UK GDPR, Children's code, PECR, EAA, consumer protection, licensing |

| 🔴 Blocking you | |
|---|---|
| **B1** | Free-tier art cannot be used commercially (or by a child-facing product) |
| **B2** | A DPIA is required — Children's code standard 2 |
| **B3** | The zero-upload promise needs a CI check, not a promise |

---

## Phase 0 — Decisions only you can make *(do this first, ~1 hour)*

Everything below depends on these. Don't start building yet.

### Decision 1 — how do we get the Santa character? *(B1)*

| | Cost | Upside | Downside |
|---|---|---|---|
| **A. Draw Santa in code (SVG/Canvas)** | **$0** | Yours forever, ~50 KB, scales infinitely, no licence risk, no dependency | Less photorealistic |
| B. Commission an illustrator | One-off | Best quality | Costs money, takes weeks |
| C. Buy a commercial stock character | Varies | Fast, good quality | Licence terms, ongoing cost |
| D. Subscribe to a commercial AI tier | Pay-per-use | Fast, photoreal | Breaks the $0-per-user promise, and the model licence still needs checking |

**Recommendation: start with A.** If the concept proves itself, upgrade to B
using the revenue. A is the same technical pattern you already used for the
snake sprites, and it is the only option that cannot be withdrawn from under
you.

### Decision 2 — Christmas only, or all year? *(the biggest question)*

This changes hosting, SEO, content, and how much you invest.

- **Christmas only** — roughly 8 weeks of demand a year. Cheap, focused, but
  the site goes quiet for 10 months.
- **Year-round novelty** — Santa in November, Halloween in October, "visit me"
  at other times. More work, but the site earns its keep.

*Recommendation: build the engine year-round, launch it for Christmas, and add
the next character in October.* The engine is the same either way; only the
content changes. That's why FR-47 requires all copy to be externalised.

### Decision 3 — is this a business or a hobby for now?

Determines how much of the legal work is urgent. B2 (DPIA) is required either
way, but only takes an afternoon.

---

## Phase 1 — The three blockers *(1 day)*

| Task | Output |
|---|---|
| B1: decide the character route, generate/obtain assets, write `docs/asset-provenance.md` | Legitimate assets, documented |
| B2: write the DPIA. It is short — the whole point is that you collect nothing | A signed-off risk assessment |
| B3: add the "no external script" CI check to your existing audit | A build that cannot be broken by accident |

B3 fits neatly into the audit tool you already have from the game project.

---

## Phase 2 — Proof of concept *(2–4 days)*

Build the smallest thing that proves the two things nobody else does:

1. **U2 — Santa placed in their actual room.** Photo → tap door, sofa, table →
   Santa walks door-to-sofa and sits.
2. **U3 — the placement preview** before generating.

Also resolve **RISK-2** early, because it could change the whole design:

> Test video export on a real iPhone *in Phase 2, not Phase 4*. The known iOS
> `MediaRecorder` keyframe bug produces a clip that plays for 0.1 s then freezes.
> If WebCodecs solves it, use WebCodecs. Find out before you've built everything.

**Exit criteria:** someone who has never seen it can complete a run and says
"that's clever" — not "that's a filter."

---

## Phase 3 — Complete the experience *(1–2 weeks)*

Table, cookie, milk, two modes, scene picker, share card, kill switch,
reduced-motion, captions, keyboard placement. This is FR-01…FR-22 and
FR-35…FR-42 in the requirements document.

---

## Phase 4 — Prove the differentiator *(3–5 days)*

- Publish the **verifiable claim page** (PR-12) — how to check zero uploads in DevTools
- Build the **share card** and test the share loop
- Accessibility pass against WCAG 2.1 AA
- Real-device testing: iPhone, Android, old laptop

---

## Phase 5 — Launch *(1 week)*

- [ ] DPIA complete and retained
- [ ] Child-appropriate privacy wording published (PR-14)
- [ ] Children's code standard 15 — rights/reporting surface live
- [ ] No external script on the tool page — CI green
- [ ] Hosted, HTTPS, `no-store` headers on the tool page
- [ ] Legal caveat present on the site
- [ ] ICO fee position confirmed

---

## Do not do these

- ❌ Add analytics. Ever. It is the one thing that breaks the whole product.
- ❌ Require sign-up before showing the result. MyHeritage does this; it's why
  their privacy story is weak and yours can be strong.
- ❌ Build photoreal-first. Ship cartoon, prove the idea, raise fidelity later.
- ❌ Start with a character other than Santa without checking the Children's
  code angle again.
- ❌ Skip the DPIA because "we don't collect anything". The requirement comes
  from the service being child-facing, not from the data volume.

---

## If you want help

I can build Phase 2's proof of concept directly, set up the CI check from B3,
and draft the DPIA skeleton for you to review. Say the word and tell me which
character route you want.
