# Commission brief — photoreal Santa

**Ready to send.** Send this whole file to a photographer, 3D artist, or stock
provider. Everything they need to quote accurately and deliver usable art is
here. It is written to be sent unedited.

---

## 1. What we are building

A novelty web product. A visitor uploads a photo of their own living room, taps
where the door, sofa and table are, and watches a short animation of Santa
walking in, sitting on their sofa, eating a cookie and leaving. We then composite
him into their photo.

**The character is the product.** Nothing else differentiates us. Please treat
this as the priority of the shoot.

## 2. What we need

**Nine images of the same Santa**, as transparent PNGs:

| File | Pose | Used for |
|---|---|---|
| `stand.png` | Standing, facing right, arms relaxed | Idle / the moment he arrives |
| `walk.png` | Mid-stride, right leg forward | Walking cycle, frame A |
| `walk2.png` | Mid-stride, left leg forward, same size | Walking cycle, frame B |
| `sit.png` | Seated on an invisible stool, knees forward, hands on lap | Sitting on the sofa |
| `reach.png` | Seated, leaning forward, right arm extended | Reaching the table |
| `drink.png` | Seated, glass of milk raised to the mouth | Drinking |
| `eat.png` | Seated, holding a cookie | Eating |
| `wave.png` | Standing, right arm raised, open hand | Arrival / leaving |
| `cheer.png` | Standing, both arms up | Celebration |

**The two walk frames must be the same height and the same stride length apart.**
They are cross-faded, so any difference in scale or baseline will be visible as
a jump.

## 3. Non-negotiable technical specification

- **Format** — transparent PNG, RGBA. No white box, no shadow baked in, no
  background at all.
- **Framing** — **full figure, head to toe, nothing cropped.** A cropped hand or
  foot is an unusable file.
- **Feet on the baseline** — the very bottom row of pixels touches the bottom
  edge of the image. We position him by his feet, so any transparent margin
  under the boots will float him above the floor.
- **Consistent height across all nine** — within ±2% of each other. We scale him
  by size, and a mismatch shows immediately.
- **Same Santa in every image** — same face, same beard, same suit, same colour
  of red, same colour of trim. This is the single most important requirement.
  These will be swapped frame by frame, so any variation is very visible.
- **Source resolution** — 1024 px tall minimum, 2048 px preferred. He is
  displayed anywhere from 40 px to 400 px, so detail matters more than size.
- **Front lighting, neutral** — soft, even, from the front, **no strong cast
  shadows**. We match his lighting to each user's room at runtime, which only
  works if his own lighting is neutral to begin with.
- **Colour** — normal saturation. We grade him into the room. Over-saturated
  art cannot be corrected and will look pasted on.
- **Generic Santa** — no resemblance to any real person, and specifically not to
  any well-known Santa performer, actor or celebrity.

## 4. What we must avoid

- ❌ Photographs of identifiable people. See §6.
- ❌ Logos, text, or brand marks on the suit.
- ❌ Visible stands, chairs, tables or sets. Nothing but Santa.
- ❌ Props baked in — we add the cookie and the glass separately, so they must
  not appear attached to the hand. (`eat` and `drink` may hold the item, but
  please supply a plain-hands version of those two as well if you can.)
- ❌ Heavy motion blur, which is unrecoverable in a still.

## 5. Budget and timeline

- **This is a commercial product**, so we need rights we can actually use. See §6.
- Please quote: a **fixed price for all nine**, and separately the cost of the
  model release if the Santa is a real performer.
- **Timeline target: 1–2 weeks.** We are building around this.
- If you only shoot a standing pose, say so — we can ship with a stand-only set
  and animate movement, but the seated poses are what make the scene work.

## 6. Rights — this is not optional

We will be showing this to children in the UK, so the paperwork matters as much
as the pictures.

- **Copyright must be assigned to us outright**, or we buy an unlimited
  perpetual worldwide commercial licence. State which you are offering.
- **If a real person plays Santa, we need a signed model release** granting
  commercial use of their likeness in this product and its marketing.
  A template is attached (`model-release-template.md`) — send it back signed.
  **We cannot use a photographed person without this.**
- **No exclusivity** needed, but please say if you require attribution.

## 7. Alternatives, if a shoot is not practical

We would also consider, in rough order of preference:

1. **An existing photoreal Santa 3D render pack** licensed for commercial use
   and modification. Please quote the licence explicitly — "editorial only" is
   useless to us.
2. **A stock-photo sequence** of one Santa, licensed for commercial use, with
   the model release included in the licence.

## 8. How to test your work before sending

Drop your nine PNGs into `assets/santa/` in our project and run:

```bash
python3 tools/check_art.py
```

It will tell you exactly what is wrong — missing poses, transparent margin
under the feet, inconsistent heights, no alpha channel, wrong size. It takes
seconds, so please run it rather than us bouncing your delivery.

## 9. Contact

**Atif Hussain** — atiff.khan@yahoo.com
