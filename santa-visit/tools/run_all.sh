#!/bin/bash
# Run every check for santa-visit.
#
#   bash tools/run_all.sh
#
# The privacy guard is in here on purpose. It is the control that makes the
# product's central claim true rather than aspirational, so it must run with
# everything else — a guard nobody executes is a comment, not a control.
set -u
cd "$(dirname "$0")/.."
rc=0

echo "=============================================================="
echo " 1  zero-upload guard"
echo "=============================================================="
python3 tools/check_privacy.py || rc=1

echo
echo "=============================================================="
echo " 2  file integrity"
echo "=============================================================="
python3 - <<'PY'
import os, sys
ROOT = os.path.dirname(os.path.abspath("tools"))
bad = 0
for f in ("santa.js", "engine.js", "postcards.js", "export.js", "index.html", "mobile_test.html"):
    p = os.path.join(".", f)
    if not os.path.exists(p):
        print(f"  MISSING  {f}"); bad += 1; continue
    s = open(p, encoding="utf-8").read()
    d = s.count("{") - s.count("}")
    if d:
        print(f"  UNBALANCED {f}  braces {d:+d}"); bad += 1
    else:
        print(f"  OK       {f:18s} {len(s)//1024:>3} KB")
sys.exit(1 if bad else 0)
PY
[ $? -ne 0 ] && rc=1

echo
echo "=============================================================="
echo " 3  requirements coverage"
echo "=============================================================="
python3 - <<'PY'
import re, sys
js = open("postcards.js", encoding="utf-8").read()
eng = open("engine.js", encoding="utf-8").read()
exp = open("export.js", encoding="utf-8").read()
doc = open("index.html", encoding="utf-8").read()
checks = [
    ("3 anchors (door/sofa/table)", all(k in js + eng for k in ("door", "sofa", "table"))),
    ("3 postcards",               all(k in js for k in ("evidence", "certificate", "routeLog"))),
    ("AI badge on every card",     js.count("badge(") >= 3),
    ("frame-paced export",         "captureStream(0)" in exp and "requestFrame" in exp),
    ("MP4 preferred over WebM",    "video/mp4;codecs" in exp and exp.index("mp4") < exp.index("webm")),
    ("9:16 vertical export",       "verticalCanvas" in exp and "vertical" in doc),
    ("child-friendly privacy text","under 18" in doc),
    ("rights / complaints route",  "atiff.khan@yahoo.com" in doc),
    ("kill switch",                "forget" in doc),
]
bad = 0
for name, ok in checks:
    print(f"  {'OK  ' if ok else 'MISS'}  {name}")
    if not ok: bad += 1
print(f"  {len(checks)-bad}/{len(checks)} present")
sys.exit(1 if bad else 0)
PY
[ $? -ne 0 ] && rc=1

echo
if [ "$rc" -eq 0 ]; then echo "SUITE: PASS"; else echo "SUITE: FAIL"; fi
exit $rc
