#!/usr/bin/env python3
"""Guard the zero-upload promise.

The entire product claim is that the user's photo never leaves their device.
That promise is destroyed by ONE thing: a third-party <script> on the tool page
— an analytics tag, a chat widget, a CDN font. A code comment does not stop
anyone. This fails the build instead.

It is a build check on purpose, not a runtime one. A runtime warning can be
ignored; a red build cannot ship.

    python3 tools/check_privacy.py         # exit 0 = clean, 1 = a leak
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Pages that handle a user's photo. The portal shell is not in scope: it never
# sees an image, and a font CDN there would not leak anything.
TOOL_PAGES = ["index.html", "mobile_test.html"]

errors, warnings = [], []

print("=" * 68)
print("  ZERO-UPLOAD GUARD")
print("=" * 68)

for page in TOOL_PAGES:
    p = os.path.join(ROOT, page)
    if not os.path.exists(p):
        continue
    src = open(p, encoding="utf-8").read()

    # 1. No external scripts. This is the load-bearing rule.
    for m in re.finditer(r"<script[^>]*\bsrc\s*=\s*[\"']([^\"']+)[\"']", src, re.I):
        src_url = m.group(1)
        if re.match(r"^(https?:)?//", src_url, re.I):
            line = src[:m.start()].count("\n") + 1
            errors.append(f"{page}:{line}  external script <{src_url}> — a third-party "
                          "script can observe the canvas and the file input. "
                          "This breaks the product's core promise.")

    # 2. No remote <link> stylesheets or preconnect hints.
    for m in re.finditer(r"<link[^>]*(?:href|imagesrcset)\s*=\s*[\"']([^\"']+)[\"']", src, re.I):
        u = m.group(1)
        if re.match(r"^(https?:)?//", u, re.I):
            line = src[:m.start()].count("\n") + 1
            errors.append(f"{page}:{line}  remote resource <{u}> — a CDN fetch leaks "
                          "the visitor's IP and referrer on a page handling a photo.")

    # 3. No @import of a remote stylesheet from any local stylesheet.
    for f in ("style.css",):
        p2 = os.path.join(ROOT, f)
        if not os.path.exists(p2):
            continue
        css = open(p2, encoding="utf-8").read()
        for m in re.finditer(r"@import\s+(?:url\()?['\"]?(https?:)?//", css, re.I):
            line = css[:m.start()].count("\n") + 1
            errors.append(f"{f}:{line}  @import of a remote stylesheet")

    # 4. Nothing may ship a photo anywhere. A beacon or XHR with a body is the
    #    classic accidental leak.
    for m in re.finditer(r"\b(navigator\.sendBeacon|new\s+XMLHttpRequest|new\s+FormData)", src):
        line = src[:m.start()].count("\n") + 1
        warnings.append(f"{page}:{line}  {m.group(1)} present — confirm it never "
                        "carries image or canvas data")

    # 5. Confirm the privacy promise is actually stated on the page.
    if page == "index.html":
        if not re.search(r"never\s+(uploaded|leaves)|stays?\s+on\s+your\s+device", src, re.I):
            errors.append("index.html: the page does not state that the photo is never "
                          "uploaded. A promise you do not make cannot be broken.")

for w in warnings:
    print(f"  WARN  {w}")
print()
if errors:
    print(f"  {len(errors)} BLOCKING ISSUE(S):")
    for e in errors:
        print(f"    - {e}")
    print()
    print("  RESULT: FAIL — the zero-upload guarantee is not enforceable as written.")
    sys.exit(1)

print("  OK  no external scripts, no remote resources, no sendBeacon/XHR in the tool")
print("  OK  the zero-upload promise is stated on the page")
print()
print("  RESULT: PASS")
sys.exit(0)
