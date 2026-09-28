# Data Protection Impact Assessment — Santa's Visit

**Service:** Santa's Visit (room-photo visit and postcards)
**Controller:** Atif Hussain
**Version:** 1.0 draft — 2026-09-28
**Required by:** Children's code standard 2 (Age Appropriate Design Code, s.125
DPA 2018), because this is an online service likely to be accessed by children
in the UK.

> **Draft for review — not legal advice.** This is the engineering record of
> what the service does with data and why that is safe. Have it reviewed with a
> data protection adviser or the ICO before launch. If any statement here stops
> being true, this assessment is void and must be redone.

---

## 1. What the service does

A user opens a web page, chooses a photo of their own home, taps three points in
it (door, sofa, table), watches a short animation, and saves a video and some
postcards. Everything happens in the browser.

## 2. What data the service processes

| Data | Processed? | Where |
|---|---|---|
| The user's photo of their home | Yes, to draw the scene | **Device memory only.** Decoded to an `ImageBitmap`; never transmitted, never stored |
| Anchors (three coordinates) | Yes | **Device memory only.** Never transmitted, never stored |
| Generated video / postcards | Yes, to download | **Device memory only**, released on tab close |
| Optional face-detection boxes | Only if the user opts in, and only to place anchors | **Device memory only.** Coordinates never leave the tab |
| Names typed into a certificate | Yes, rendered onto the card | **Device memory only** |
| IP address, cookies, analytics | **No** | — |

**The service's operating model makes this section short, and that is the entire
point of the design.** There is no account, no login, no server database, no
analytics and no third-party script on the tool page. A build check
(`tools/check_privacy.py`) fails the release if any external `<script>`, remote
stylesheet, or `sendBeacon` appears, so the property is enforced rather than
merely intended.

## 3. Lawful basis

The operator **does not receive** the user's photo, anchors, output or typed
name. There is therefore no processing of that personal data *by the operator*
for which a lawful basis under Art. 6 UK GDPR is required.

The person doing the editing is the user, on their own device, for their own
household purpose. The ICO's position is that processing carried out for *"purely
personal or household activity"* falls outside the scope of the UK GDPR and
carries no controllership obligation. That is exactly the activity here.

**If a hosted feature is ever added that receives a photo — shared links, cloud
saves, a server-side render — this assessment is void** and must be redone with
an Art. 6 basis, a retention period and a processor agreement.

## 4. Children's code standards

| # | Standard | Status | How |
|---|---|---|---|
| 1 | Appropriate application | Met | Nothing here is age-inappropriate |
| 2 | **DPIA** | **This document** | — |
| 3 | Age appropriate application | **Action** | Document the age assessment in §7; the service is suitable for all ages and reads no content at all |
| 4 | Transparency | **Action** | Child-friendly privacy wording in addition to the adult version — see §6 |
| 5 | Detrimental use of profiling | Met | No profiling exists |
| 6 | Parental consent | Met | Nothing requiring consent is collected |
| 7 | Default settings | Met | Nothing is off-by-default because nothing is collected; face detection is **opt-in** |
| 8 | Data minimisation | Met | Zero data is collected |
| 9 | Data sharing | Met | No sharing is technically possible |
| 10 | Geolocation | Met | Not used |
| 11 | Parental controls | Not applicable | No account, no persistent state, nothing for a parent to control |
| 12 | Profiling | Met | None |
| 13 | Nudge techniques | **Action** | The optional name field must not be presented in a way that pushes a child to enter their own details; it reads "who is this visit for" |
| 14 | Connected toys/devices | Not applicable | — |
| 15 | **Online tools** | **Action** | A plain-English "how to complain / ask for your data to be removed" route must be published, reachable from the tool |

Standards 5–12 are met *vacuously*: they govern processing that does not happen.
That is a stronger position than compliance-by-control, but it is not a reason to
skip 3, 4, 13 and 15.

## 5. Special category data

On-device face detection, if the user enables it, is **biometric data** and
therefore special category data under Art. 9.

Mitigations, applied together:
1. It runs **on the user's device** as part of their own household activity.
2. It is **opt-in**, and the tool is fully usable by tapping three points instead.
3. **No biometric template is derived, stored or transmitted.** Only bounding-box
   coordinates exist, in memory, for the life of the tab.
4. Moving detection to a server would change this completely and would require
   explicit consent and a fresh DPIA. It is out of scope.

## 6. Transparency

Two versions are required:

- **Adult version** — the privacy notice shipped with the service.
- **Child version** — standard 4 requires information *"in clear language suited
  to the age of the child"*. In practice: *"Your photo stays on your phone. We
  never see it."* with no legal vocabulary, no cookies mention (there are none),
  and no reference to data that does not exist.

## 7. Age assessment

The service presents a non-interactive animation and accepts no text input that
is transmitted. It is therefore suitable for all ages, and the risk is assessed
as **low**: the worst outcome is a child viewing their own family home
animated, with no data leaving the device and no account to compromise.

## 8. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| A third-party script is added later and observes the canvas | Medium | **Severe** | `tools/check_privacy.py` fails the build. This is the single most important control in the project |
| A future feature uploads photos | Medium | **Severe** | Same build check; this DPIA becomes void and must be redone |
| A face-detection model is fetched from a CDN | Low | High | The model, if used, must be bundled locally; the build check rejects remote resources |
| Device is lost with a cached page | Low | Medium | The page is served `no-store`; nothing is written to persistent storage |
| A user uploads a photo they do not own | Medium | Low | Terms state the uploader must have the right to use their photo; no liability for content we never hold or distribute |

## 9. Controls to maintain

- [x] No third-party script, font or stylesheet on any page that handles a photo
- [x] No analytics, pixels or fingerprinting
- [x] No cookies on the tool page
- [x] `Cache-Control: no-store` on the tool page
- [x] A visible one-click control that discards the photo, the output and every
      derived object
- [x] No persistent storage of the photo, the output, or anything derived
- [ ] Child-friendly privacy wording published
- [ ] Rights/complaints route published (standard 15)
- [ ] Age assessment in §7 signed off
- [ ] Build check wired into CI so it cannot be skipped
- [ ] ICO fee position confirmed (likely not payable — confirm, do not assume)

## 10. Review

| | |
|---|---|
| Prepared by | Atif Hussain (via automated analysis) |
| Technical reviewer | *pending* |
| Data protection adviser | *pending — required before launch* |
| Next review | On any change to what data the service touches |
