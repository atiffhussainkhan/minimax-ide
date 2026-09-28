#!/usr/bin/env python3
"""Build an upload-ready copy of the site for ordinary web hosting.

The repository is laid out for development (site/, game/, tools/, docs/ ...).
Most shared hosts — cPanel, Plesk, Hostinger, FileManager drag-and-drop — want
just the public files, with the portal at the web root.

This produces dist/ containing exactly what goes on the server:

    dist/
      index.html      the portal, at the root
      style.css
      app.js
      favicon.ico?    (svg favicon, see below)
      game/           the whole game, self-contained
        index.html  game.js  style.css  manifest.webmanifest  assets/  tools/

The one change made is path rewriting: in the repo the portal refers to the
game as "../game/index.html", but once the portal sits at the web root that
becomes "game/index.html". Development keeps the relative sibling layout;
the build output is what you upload.

    python3 tools/build_site.py
    # -> uploads dist/* into your host's public_html / www / htdocs
"""
import os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIST = os.path.join(ROOT, "dist")

# Ship only what the browser needs. tools/ is a dev-only QA suite and is
# deliberately excluded — it is ~60 KB of test harness nobody should host.
GAME_COPY = ("index.html", "game.js", "style.css", "manifest.webmanifest", "assets")
PORTAL = ("index.html", "style.css", "app.js")

# Portal -> game, before and after the move to the web root.
REWRITE = [
    ("../game/", "game/"),
    ('"../game', '"game'),
    ("'../game", "'game"),
]


def copy_tree(src, dst):
    os.makedirs(dst, exist_ok=True)
    for name in os.listdir(src):
        s = os.path.join(src, name)
        if os.path.isdir(s):
            shutil.copytree(s, os.path.join(dst, name), dirs_exist_ok=True)
        else:
            shutil.copy2(s, os.path.join(dst, name))


def main():
    if os.path.isdir(DIST):
        shutil.rmtree(DIST)
    os.makedirs(DIST)

    # --- the game, copied verbatim (it is already self-contained) -----------
    copy_tree(os.path.join(ROOT, "game"), os.path.join(DIST, "game"))
    for junk in ("tools", ".DS_Store", "__pycache__"):
        p = os.path.join(DIST, "game", junk)
        if os.path.isdir(p):
            shutil.rmtree(p)
        elif os.path.exists(p):
            os.remove(p)

    # --- the portal, with its game paths rewritten for the web root ---------
    for name in PORTAL:
        src = os.path.join(ROOT, "site", name)
        text = open(src, encoding="utf-8").read()
        for a, b in REWRITE:
            text = text.replace(a, b)
        open(os.path.join(DIST, name), "w", encoding="utf-8").write(text)

    # favicon lives with the game, but the portal is now at the root
    shutil.copy2(os.path.join(ROOT, "game/assets/favicon.svg"),
                 os.path.join(DIST, "favicon.svg"))

    # --- report ------------------------------------------------------------
    total = 0
    count = 0
    for dirpath, _, files in os.walk(DIST):
        for f in files:
            total += os.path.getsize(os.path.join(dirpath, f))
            count += 1
    print(f"built {os.path.relpath(DIST, ROOT)}/  —  {count} files, {total/1024:.0f} KB")
    print()
    print("Upload the CONTENTS of dist/ to your web root:")
    print("    public_html/   (cPanel, Plesk, most shared hosts)")
    print("    www/  or  htdocs/")
    print()
    print("Then your site is live at:")
    print("    https://yourdomain.com/            <- the portal")
    print("    https://yourdomain.com/game/      <- the game on its own")

    # sanity: no leftover parent-relative paths
    bad = []
    for dirpath, _, files in os.walk(DIST):
        for f in files:
            if not f.endswith((".html", ".css", ".js")):
                continue
            p = os.path.join(dirpath, f)
            txt = open(p, encoding="utf-8", errors="replace").read()
            for m in re.finditer(r'(?:href|src)="(\.\./[^"]+)"', txt):
                bad.append(f"{os.path.relpath(p, DIST)} -> {m.group(1)}")
    if bad:
        print("\nWARNING: parent-relative paths survived the rewrite:")
        for b in bad:
            print("   ", b)
        return 1
    print("\nOK: no parent-relative paths left in the build.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
