#!/usr/bin/env python3
"""Postcard design review — 10 independent lenses.

A single reviewer has one taste. Ten named lenses, each with its own objective
criteria, is a closer approximation to a real panel and — more usefully — it is
re-runnable, so the next revision can be scored the same way.

Lenses marked [auto] are computed from the rendered PNG. The rest are reviewed
against the rendered card and the source in postcards.js, and their reasoning is
recorded so it can be argued with.

    python3 tools/review_postcards.py card1.svg.png card2.svg.png card3.svg.png
"""
import sys, os, zlib, struct, json

HERE = os.path.dirname(os.path.abspath(__file__))
CARD_W, CARD_H = 900, 640


# --------------------------------------------------------------------- PNG ---
def read_png(path):
    d = open(path, "rb").read()
    pos, idat, ct = 8, b"", None
    w = h = None
    while pos < len(d):
        ln = struct.unpack(">I", d[pos:pos+4])[0]
        typ = d[pos+4:pos+8]
        data = d[pos+8:pos+8+ln]
        if typ == b"IHDR":
            w, h, bd, ct, _, _, _ = struct.unpack(">IIBBBBB", data)
        elif typ == b"IDAT":
            idat += data
        elif typ == b"IEND":
            break
        pos += 12 + ln
    nch = {0: 1, 2: 3, 4: 2, 6: 4}[ct]
    raw = zlib.decompress(idat)
    stride = w * nch
    out = bytearray(h * stride)
    prev = bytearray(stride)
    p = 0
    for y in range(h):
        f = raw[p]; p += 1
        line = bytearray(raw[p:p+stride]); p += stride
        if f == 1:
            for i in range(nch, stride):
                line[i] = (line[i] + line[i-nch]) & 255
        elif f == 2:
            for i in range(stride):
                line[i] = (line[i] + prev[i]) & 255
        elif f == 3:
            for i in range(stride):
                a = line[i-nch] if i >= nch else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 255
        elif f == 4:
            for i in range(stride):
                a = line[i-nch] if i >= nch else 0
                b = prev[i]
                c = prev[i-nch] if i >= nch else 0
                pp = a + b - c
                pa, pb, pc = abs(pp-a), abs(pp-b), abs(pp-c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pr) & 255
        out[y*stride:(y+1)*stride] = line
        prev = line
    return w, h, nch, out


def downscale(w, h, nch, px, tw, th):
    """Box-filter downscale — enough for contrast and layout checks."""
    out = bytearray(tw * th * 3)
    for y in range(th):
        sy0, sy1 = y * h // th, max(y * h // th + 1, (y + 1) * h // th)
        for x in range(tw):
            sx0, sx1 = x * w // tw, max(x * w // tw + 1, (x + 1) * w // tw)
            r = g = b = n = 0
            for sy in range(sy0, min(sy1, h)):
                base = sy * w * nch
                for sx in range(sx0, min(sx1, w)):
                    i = base + sx * nch
                    r += px[i]; g += px[i+1]; b += px[i+2]; n += 1
            if n:
                o = (y * tw + x) * 3
                out[o] = r//n; out[o+1] = g//n; out[o+2] = b//n
    return out


def luma(r, g, b):
    return 0.2126*r + 0.7152*g + 0.0722*b


# ------------------------------------------------------------------- lenses --
def lens_thumbnail(path, tw=110):
    """[auto] Can it still be read at WhatsApp preview size?"""
    w, h, nch, px = read_png(path)
    small = downscale(w, h, nch, px, tw, max(1, int(tw * h / w)))
    sh = len(small) // (tw * 3)
    # Contrast range: a card that collapses to one tone cannot be read small.
    vals = [luma(*small[(y*tw+x)*3:(y*tw+x)*3+3]) for y in range(sh) for x in range(tw)]
    lo, hi = min(vals), max(vals)
    return min(10, int((hi - lo) / 26)), f"luma range {int(lo)}-{int(hi)} at {tw}px wide"


def lens_contrast(path):
    """[auto] Darkest text against its immediate background."""
    w, h, nch, px = read_png(path)
    best, worst = 21, 0
    step = 3
    for y in range(0, h, step):
        for x in range(0, w, step):
            i = (y*w + x) * nch
            c = luma(px[i], px[i+1], px[i+2])
            for dx, dy in ((4,0), (-4,0), (0,4), (0,-4)):
                j = ((min(max(y+dy,0),h-1))*w + min(max(x+dx,0),w-1)) * nch
                d = luma(px[j], px[j+1], px[j+2])
                ratio = (max(c,d)+12)/(min(c,d)+12)
                best = max(best, ratio); worst = max(worst, ratio)
    return min(10, int(best/2.2)), f"max local contrast ratio ~{best:.1f}:1"


def lens_badge(path):
    """[auto] Is the honest-AI disclosure present AND legible?

    Looks for the signature pattern: a run of dark pill pixels containing a
    cluster of near-white text pixels. Sampling every 2px in x missed the thin
    strokes of small type and reported a visible badge as missing, so step 1px.
    """
    w, h, nch, px = read_png(path)
    best = 0
    for y in range(int(h * 0.50), h - 3):
        for x in range(0, int(w * 0.45)):
            i = (y * w + x) * nch
            if luma(px[i], px[i+1], px[i+2]) > 225:
                # Bright pixel: is it sitting on a dark pill? Count a local run.
                dark = bright = 0
                for dx in range(0, 26):
                    j = (y * w + min(x + dx, w - 1)) * nch
                    L = luma(px[j], px[j+1], px[j+2])
                    if L < 75: dark += 1
                    elif L > 200: bright += 1
                best = max(best, bright if dark > 8 else 0)
    if best >= 6:
        return 10, f"disclosure text detected ({best} bright px on a dark pill)"
    if best:
        return 5, f"disclosure pill present but text is faint ({best} px)"
    return 0, "no disclosure detected"


def lens_photo_area(path):
    """[auto] How much of the card is the user's own room?"""
    w, h, nch, px = read_png(path)
    mid = downscale(w, h, nch, px, 90, 64)
    paperish = 0
    total = 64*90
    for i in range(0, len(mid), 3):
        r, g, b = mid[i], mid[i+1], mid[i+2]
        if r > 225 and g > 215 and b > 195 and abs(r-g) < 30:
            paperish += 1
    photo = 1 - paperish/total
    return min(10, int(photo*22)), f"~{int(photo*100)}% of the card is their photo"


LENSES = [
    ("Thumbnail legibility", lens_thumbnail, 9,
     "WhatsApp and Instagram strip the image down. If it dies at 110px it will not be shared."),
    ("Text contrast", lens_contrast, 8,
     "Names and captions must survive a dim phone screen."),
    ("Honest-AI disclosure", lens_badge, 8,
     "Children's code standard 4, and MyHeritage's own precedent. Not optional."),
    ("Room prominence", lens_photo_area, 9,
     "The product's whole claim is THEIR room. If the photo is a small window, the claim is weak."),
    ("Share-through rate", None, 10,
     "Which card would a person actually send? The certificate and the evidence are the candidates; the route log is the odd one out."),
    ("Keepsake / print value", None, 8,
     "Does it survive being printed at A6 and pinned to a fridge?"),
    ("Uniqueness vs the market", None, 10,
     "Ten competitors offer filters. Only the route log uses anything they do not have — the user's anchors."),
    ("Trust and warmth", None, 7,
     "A children's Christmas keepsake. Does it feel like a moment, or like a utility screen?"),
    ("Layout integrity", None, 9,
     "No overlapping text, nothing clipped, nothing running off the card."),
    ("Production cost", None, 6,
     "All three are drawn on canvas, cost nothing to generate, and are unaffected by the character swap."),
]

JUDGEMENT = {
    "Share-through rate": {
        "card1": 8, "card2": 9, "card3": 4,
        "why": "Certificate is the one people send to a grandparent. The Evidence is a close second. The route log reads as a diagram, not a greeting.",
    },
    "Keepsake / print value": {
        "card1": 6, "card2": 10, "card3": 7,
        "why": "The certificate is the only one designed to be printed and kept. The evidence is a photo. The route log is a keepsake for an adult, not a child.",
    },
    "Uniqueness vs the market": {
        "card1": 3, "card2": 5, "card3": 10,
        "why": "A framed photo is exactly what every competitor already gives you. The certificate is a nice wrapper. Only the route log needs the user's own anchors, which no competitor has.",
    },
    "Trust and warmth": {
        "card1": 7, "card2": 9, "card3": 5,
        "why": "The certificate is the warmest and the most human. The evidence is neutral. The route log is functional.",
    },
    "Layout integrity": {
        "card1": 9, "card2": 9, "card3": 7,
        "why": "Evidence and certificate are clean after the fixes. The route log still crowds when an anchor sits low in the photo — the labels are above the markers now, but a bottom-edge anchor still sits close to the caption.",
    },
    "Production cost": {
        "card1": 10, "card2": 10, "card3": 10,
        "why": "Identical cost. Canvas-drawn, no server, no dependence on the character art.",
    },
}

NAMES = {"card1": "The Evidence", "card2": "Certificate", "card3": "Route Log"}


def main(paths):
    auto = {}
    for name, fn, _, _ in LENSES:
        if fn:
            auto[name] = [fn(p) for p in paths]

    totals = {k: 0.0 for k in NAMES}
    for k in NAMES:
        totals[k] = 0.0

    print("=" * 74)
    print("  POSTCARD REVIEW — 10 lenses")
    print("=" * 74)
    print(f"  {'lens':26s} {'weight':>6s}  " + "".join(f"{NAMES[k][:12]:>14s}" for k in NAMES))
    print("  " + "-" * 72)

    for name, fn, weight, why in LENSES:
        cells = []
        for i, k in enumerate(NAMES):
            if fn:
                score, note = auto[name][i]
            else:
                score = JUDGEMENT[name][k]
                note = ""
            cells.append(score)
            totals[k] += score * weight / 10.0
        best = max(cells)
        row = "".join(
            (f"{c:>12d}" + ("*" if c == best else " ")) for c in cells)
        print(f"  {name:26s} {weight:>6d}  {row}")

    print("  " + "-" * 72)
    print(f"  {'WEIGHTED TOTAL (of 100)':26s} {'':6s}  " +
          "".join(f"{totals[k]:>13.1f}" for k in NAMES))
    print()
    for name, fn, _, why in LENSES:
        if not fn:
            print(f"  · {name}")
            for k in NAMES:
                print(f"      {NAMES[k]:14s} {JUDGEMENT[name][k]:>2d}/10")
            print(f"      -> {JUDGEMENT[name]['why']}")
            print()

    order = sorted(NAMES, key=lambda k: -totals[k])
    print("  RANKING")
    for i, k in enumerate(order, 1):
        print(f"    {i}. {NAMES[k]:14s} {totals[k]:.1f}/100")
    print()
    print(f"  WINNER: {NAMES[order[0]]}")
    return order[0]


if __name__ == "__main__":
    files = sys.argv[1:]
    if not files:
        print(__doc__)
        sys.exit(1)
    main(files)
