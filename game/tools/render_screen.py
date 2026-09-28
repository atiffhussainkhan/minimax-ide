#!/usr/bin/env python3
"""Render individual game screens to PNG using the real index.html markup + style.css.

Extracts the relevant section of index.html verbatim (so it is exactly what the
player gets) and wraps it in a minimal page. Used to eyeball screens that are
hard to catch in a live browser (the selection page appears once, the champion
page appears once per tournament).

    python3 tools/render_screen.py selection
"""
import os, re, sys, subprocess, tempfile, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCREEN = sys.argv[1] if len(sys.argv) > 1 else "selection"
html = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()


def block(el_id):
    """Extract the element with this id, matching nested tags by depth."""
    m = re.search(r'<(div|section)\b[^>]*\bid="' + re.escape(el_id) + r'"[^>]*>', html)
    if not m:
        raise SystemExit("could not find #" + el_id)
    start = m.start()
    tag = m.group(1)
    depth = 0
    i = m.start()
    for t in re.finditer(r'<(/?)' + tag + r'\b[^>]*?(/?)>', html[m.start():]):
        if t.group(2) == "/":          # self-closing
            continue
        depth += -1 if t.group(1) else 1
        if depth == 0:
            return html[start:m.start() + t.end()]
    return html[start:]


def unhidden(section):
    """Modals carry a BARE `hidden` attribute in index.html; reveal this one."""
    return re.sub(r'\shidden(?=[\s>])', "", section, count=1)


def fill(section, el_id, content):
    """Replace the inner text of the element with this id, keeping its tag."""
    pat = re.compile(r'(<[a-z]+[^>]*\bid="' + re.escape(el_id) + r'"[^>]*>)([\s\S]*?)(</[a-z]+>)')
    return pat.sub(lambda m: m.group(1) + content + m.group(3), section, count=1)


def dot(color):
    return f'<span class="t-dot" style="background:{color}"></span>'


if SCREEN == "selection":
    body = block("player-modal")
    title = "Select players and games"

elif SCREEN == "interstitial":
    body = unhidden(block("gameover-modal"))
    body = fill(body, "gameover-winner",
                '<span style="color:#e85a4f">Red</span> wins game 1!')
    body = fill(body, "gameover-line", "🔥 Red takes game 1 with style!")
    body = fill(body, "gameover-score", "Tournament tally after 1 of 3 games")
    body = fill(body, "gameover-standings",
                '<li class="leader">' + dot("#e85a4f") +
                '<span class="t-name">Red</span><span class="t-score">1</span></li>'
                '<li>' + dot("#4f8fe8") +
                '<span class="t-name">Blue</span><span class="t-score">0</span></li>'
                '<li>' + dot("#5dd39e") +
                '<span class="t-name">Green</span><span class="t-score">0</span></li>')
    body = fill(body, "gameover-progress", "2 games left in this tournament")
    body = fill(body, "next-game-btn", "▶ Game 2 of 3")
    title = "Between games"

elif SCREEN == "champion":
    body = unhidden(block("champion-modal"))
    body = fill(body, "champion-name", "Blue")
    body = fill(body, "champion-subtitle",
                "Blue edges it out with 2 wins in a thriller of a tournament!")
    body = fill(body, "champion-stats",
                "Final standings: Blue 2 &nbsp;&middot;&nbsp; Red 1 "
                "&nbsp;&middot;&nbsp; Green 0<br>"
                '<span class="champion-games">Tournament complete — all 3 games '
                "played. Start a new tournament to play again.</span>")
    title = "Champion"

else:
    raise SystemExit("unknown screen: " + SCREEN)

page = ('<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">'
        '<link rel="stylesheet" href="style.css">'
        # Modals fade in from opacity:0; a static rasteriser captures at t=0 and
        # would photograph them invisible. Freeze every animation to its end state.
        '<style>*,*::before,*::after{animation:none !important;'
        'transition:none !important;}</style>'
        f'<title>{title}</title></head><body>{body}</body></html>')

tmp = os.path.join(ROOT, "_shot_%s.html" % SCREEN)
open(tmp, "w", encoding="utf-8").write(page)
out = subprocess.run(["qlmanage", "-t", "-s", "1300", "-o", "/tmp", tmp],
                     capture_output=True)
src = "/tmp/_shot_%s.html.png" % SCREEN
dst = "/tmp/screen_%s.png" % SCREEN
if os.path.exists(src):
    shutil.copy(src, dst)
    print("wrote", dst)
else:
    print("render failed", out.stderr.decode()[:200])
os.remove(tmp)
