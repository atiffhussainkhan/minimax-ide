#!/usr/bin/env python3
"""Audit the game folder for anything unreferenced.

Reports assets on disk that no file loads, top-level functions/constants in
game.js that nothing calls, and CSS classes that no markup uses. Nothing is
deleted here — this only lists candidates so deletion stays a deliberate step.
"""
import os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CODE = ["game.js", "index.html", "style.css"]

text = {}
for f in CODE:
    p = os.path.join(ROOT, f)
    text[f] = open(p, encoding="utf-8").read()
blob = "\n".join(text.values())

print("=" * 62)
print("UNUSED ASSETS (present on disk, referenced by no code file)")
print("=" * 62)
assets = []
for dirpath, dirnames, filenames in os.walk(os.path.join(ROOT, "assets")):
    for fn in sorted(filenames):
        if fn == ".DS_Store":       # OS metadata, not a game asset
            continue
        full = os.path.join(dirpath, fn)
        rel = os.path.relpath(full, ROOT)
        assets.append((rel, os.path.getsize(full)))
unused_assets = []
for rel, size in assets:
    # Only a verbatim basename match counts as "used". A looser stem search
    # gives false negatives (snake3311 matched the word "snake" via other
    # filenames), which is exactly the bug this audit exists to catch.
    if os.path.basename(rel) in blob:
        continue
    unused_assets.append((rel, size))
for rel, size in sorted(unused_assets):
    print(f"  {size/1024:8.1f} KB  {rel}")
if not unused_assets:
    print("  (none)")
total = sum(s for _, s in unused_assets)
print(f"  --> {len(unused_assets)} files, {total/1024/1024:.2f} MB")

print()
print("=" * 62)
print("UNUSED TOP-LEVEL FUNCTIONS / CONSTANTS in game.js")
print("=" * 62)
js = text["game.js"]
funcs = re.findall(r'^function\s+(\w+)\s*\(', js, re.M)
consts = re.findall(r'^const\s+([A-Z_][A-Z0-9_]*)\s*=', js, re.M)
unused_f, unused_c = [], []
for name in funcs:
    # count references outside the definition line
    refs = len(re.findall(r'\b' + re.escape(name) + r'\b', js))
    if refs <= 1:
        unused_f.append(name)
for name in consts:
    refs = len(re.findall(r'\b' + re.escape(name) + r'\b', js))
    if refs <= 1:
        unused_c.append(name)
print("  functions:", ", ".join(unused_f) if unused_f else "(none)")
print("  constants:", ", ".join(unused_c) if unused_c else "(none)")

print()
print("=" * 62)
print("UNUSED CSS CLASSES in style.css")
print("=" * 62)
css = text["style.css"]
# Strip comments AND url(...) payloads first: url('assets/board.jpg') would
# otherwise make ".jpg" look like an unused CSS class.
css_clean = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
css_clean = re.sub(r"url\([^)]*\)", "url()", css_clean)
css_classes = set(re.findall(r'\.([a-zA-Z][\w-]*)', css_clean))
markup = text["index.html"] + js
unused_css = []
for c in sorted(css_classes):
    if re.search(r'["\s.]' + re.escape(c) + r'["\s\']', markup):
        continue
    if re.search(r'class="[^"]*\b' + re.escape(c) + r'\b', markup):
        continue
    if re.search(r'\b' + re.escape(c) + r'\b', js):
        continue
    unused_css.append(c)
print("  ", ", ".join(unused_css) if unused_css else "(none)")

print()
print("=" * 62)
print("SUSPICIOUS COMMENT MARKERS in game.js")
print("=" * 62)
for i, line in enumerate(js.splitlines(), 1):
    s = line.strip()
    if s.startswith("//") and ("sprite" in s.lower() or "v8" in s or "TODO" in s
                                or "XXX" in s or "FIXME" in s or "HACK" in s):
        print(f"  {i}: {s[:88]}")
