#!/usr/bin/env python3
"""Validate a delivered Santa art set before it is wired in.

Answers the question that otherwise costs a round trip of emails: "is this
delivery actually usable?" Checks each pose exists, is a real transparent PNG,
is big enough, has the feet on the bottom edge (we position him by his feet,
so transparent margin under the boots floats him above the floor), and matches
the others in height.

    python3 tools/check_art.py [assets/santa]
    exit 0 = usable, 1 = must fix
"""
import os, re, sys, zlib, struct

REQUIRED = ["stand", "walk", "walk2", "sit", "reach", "drink", "eat", "wave", "cheer"]
MIN_HEIGHT = 1024
HEIGHT_TOLERANCE = 0.03     # ±3% across the set
MAX_FOOT_MARGIN = 0.02      # transparent rows below the boots, as a fraction


def read_png(path):
    d = open(path, "rb").read()
    if d[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("not a PNG")
    pos, idat = 8, b""
    w = h = bd = ct = None
    while pos < len(d):
        ln = struct.unpack(">I", d[pos:pos+4])[0]
        typ = d[pos+4:pos+8]
        data = d[pos+8:pos+8+ln]
        if typ == b"IHDR":
            w, h, bd, ct, _, _, interlace = struct.unpack(">IIBBBBB", data)
            if interlace:
                raise ValueError("interlaced PNG not supported")
        elif typ == b"IENT":  # typo guard
            pass
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
            for i in range(nch, stride): line[i] = (line[i] + line[i-nch]) & 255
        elif f == 2:
            for i in range(stride): line[i] = (line[i] + prev[i]) & 255
        elif f == 3:
            for i in range(stride):
                a = line[i-nch] if i >= nch else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 255
        elif f == 4:
            for i in range(stride):
                a = line[i-nch] if i >= nch else 0
                b = prev[i]; c = prev[i-nch] if i >= nch else 0
                pp = a + b - c
                pa, pb, pc = abs(pp-a), abs(pp-b), abs(pp-c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pr) & 255
        out[y*stride:(y+1)*stride] = line
        prev = line
    return w, h, ct, nch, out


def analyse(path):
    w, h, ct, nch, px = read_png(path)
    has_alpha = ct in (4, 6)
    stride = w * nch
    # Bounding box of non-transparent content, if any alpha at all.
    if has_alpha:
        top, bottom, left, right = h, -1, w, -1
        for y in range(h):
            base = y * stride
            row_used = False
            for x in range(w):
                if px[base + x * nch + 3] > 8:
                    if not row_used:
                        row_used = True
                        if y < top: top = y
                        if y > bottom: bottom = y
                    if x < left: left = x
                    if x > right: right = x
        if bottom < 0:
            return dict(ok=False, why="image is fully transparent", w=w, h=h, has_alpha=has_alpha)
        foot_margin = (h - 1 - bottom) / h
        head_margin = top / h
        content_h = bottom - top + 1
        # Crop: is it head-to-toe, or cut off at the sides?
        cropped = (left == 0 or right == w - 1)
    else:
        foot_margin = head_margin = 0.0
        content_h = h
        cropped = True
    return dict(ok=True, w=w, h=h, has_alpha=has_alpha, content_h=content_h,
                foot_margin=foot_margin, head_margin=head_margin,
                cropped=cropped, nch=nch)


def main(folder):
    print("=" * 68)
    print("  ART INTAKE CHECK")
    print("=" * 68)
    if not os.path.isdir(folder):
        print(f"  No art folder at {folder}")
        print("\n  RESULT: NO ART YET — nothing to check.")
        print("  Send docs/commission-brief.md to an artist, then re-run.")
        return 0

    present, missing, rows = [], [], []
    for pose in REQUIRED:
        p = os.path.join(folder, pose + ".png")
        if not os.path.exists(p):
            missing.append(pose)
            continue
        try:
            info = analyse(p)
        except Exception as e:
            rows.append((pose, f"UNREADABLE — {e}", "no"))
            continue
        present.append(pose)
        notes = []
        if not info.get("ok"):
            notes.append(info.get("why", "unreadable"))
        if info.get("has_alpha") is False:
            notes.append("NO ALPHA CHANNEL — a box will show behind him")
        if info.get("h", 0) < MIN_HEIGHT:
            notes.append(f"only {info.get('h')}px tall, need {MIN_HEIGHT}+")
        if info.get("foot_margin", 0) > MAX_FOOT_MARGIN:
            notes.append(f"{info['foot_margin']*100:.1f}% transparent space under the "
                         "feet — he will float above the floor")
        if info.get("cropped"):
            notes.append("touches a side edge — check nothing is cropped off")
        rows.append((pose, f"{info.get('w')}x{info.get('h')}  " +
                     ("; ".join(notes) if notes else "looks good"),
                     "no" if notes else "ok"))

    for pose, note, cls in rows:
        print(f"  {cls.upper():4s} {pose:8s} {note}")
    if missing:
        print(f"\n  MISSING {len(missing)} pose(s): {', '.join(missing)}")

    # Height consistency across the usable ones.
    ok_heights = []
    for pose in present:
        try:
            ok_heights.append(analyse(os.path.join(folder, pose + ".png")).get("h"))
        except Exception:
            pass
    if len(ok_heights) > 1:
        lo, hi = min(ok_heights), max(ok_heights)
        spread = (hi - lo) / lo
        if spread > HEIGHT_TOLERANCE:
            print(f"  WARN height spread {spread*100:.1f}% across the set "
                  f"({lo}-{hi}px), limit {HEIGHT_TOLERANCE*100:.0f}% — he will visibly resize")
        else:
            print(f"  OK   heights consistent within {spread*100:.1f}%")

    print()
    if missing or not present:
        print(f"  RESULT: INCOMPLETE — {len(present)}/{len(REQUIRED)} poses delivered")
        return 1
    bad = [r for r in rows if r[2] == "no"]
    if bad:
        print(f"  RESULT: NEEDS FIXING — {len(bad)} file(s) have issues listed above")
        return 1
    print("  RESULT: USABLE — drop these in and the photoreal swap is a no-op")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else "assets/santa"))
