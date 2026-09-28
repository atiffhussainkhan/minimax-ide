#!/usr/bin/env python3
"""Generate the favicon set: an SVG icon plus a 180x180 apple-touch-icon PNG.

Kept in the repo so the icons are reproducible rather than mystery binaries.
    python3 tools/make_icons.py
"""
import zlib, struct, os, math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# ---- SVG favicon: a green snake head with an eye, on a rounded amber tile ----
svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="14" fill="#4a2a14"/>
  <path d="M14 44c0-9 7-16 16-16h10" fill="none" stroke="#1b5e20" stroke-width="11" stroke-linecap="round"/>
  <path d="M14 44c0-9 7-16 16-16h10" fill="none" stroke="#4caf50" stroke-width="7" stroke-linecap="round"/>
  <ellipse cx="42" cy="26" rx="13" ry="11" fill="#4caf50" stroke="#1b5e20" stroke-width="2.5"/>
  <circle cx="39" cy="23" r="4.2" fill="#fff"/>
  <circle cx="40" cy="23" r="2" fill="#1a1a1a"/>
  <path d="M53 30l7-3M53 32l7 3" stroke="#e53935" stroke-width="2.5" stroke-linecap="round"/>
</svg>
'''
open(os.path.join(ROOT, "assets", "favicon.svg"), "w").write(svg)


# ---- apple-touch-icon: same idea, rasterised by hand at 180x180 -------------
def write_png(path, w, h, rgb):
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        raw += rgb[y * w * 3:(y + 1) * w * 3]
    comp = zlib.compress(bytes(raw), 9)
    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n")
        f.write(chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)))
        f.write(chunk(b"IDAT", comp))
        f.write(chunk(b"IEND", b""))


S = 180
buf = bytearray(b"\x4a\x2a\x14" * (S * S))   # dark wood tile


def put(x, y, c):
    if 0 <= x < S and 0 <= y < S:
        i = (y * S + x) * 3
        buf[i], buf[i + 1], buf[i + 2] = c


def disc(cx, cy, r, c, soft=True):
    for y in range(int(cy - r - 1), int(cy + r + 2)):
        for x in range(int(cx - r - 1), int(cx + r + 2)):
            d = math.hypot(x - cx, y - cy)
            if d <= r:
                put(x, y, c)
            elif soft and d <= r + 1:
                k = (r + 1 - d)
                for ch in range(3):
                    i = (y * S + x) * 3
                    buf[i + ch] = int(buf[i + ch] + (c[ch] - buf[i + ch]) * k)


# body: a thick arc from lower-left up to the head
for t in range(0, 100):
    a = t / 99 * (math.pi * 0.62)
    cx = 40 + math.cos(a) * 46
    cy = 132 - math.sin(a) * 52
    disc(cx, cy, 13, (27, 94, 32))     # outline
    disc(cx, cy, 9, (76, 175, 80))     # body

# head
disc(112, 72, 40, (27, 94, 32))
disc(112, 72, 35, (76, 175, 80))
disc(100, 62, 13, (255, 255, 255))    # eye
disc(102, 62, 6, (26, 26, 26))        # pupil
# tongue
for t in range(0, 14):
    put(140 + t, 78 + (0 if t < 8 else (t - 8) * 2), (229, 57, 53))
    put(140 + t, 84 - (0 if t < 8 else (t - 8) * 2), (229, 57, 53))

write_png(os.path.join(ROOT, "assets", "apple-touch-icon.png"), S, S, buf)
print("wrote assets/favicon.svg and assets/apple-touch-icon.png (180x180)")
