#!/bin/bash
# Run the whole QA suite for the game.
#
#   tools/run_all.sh [stress_runs]      (default 1000)
#
# Everything runs headlessly in JavaScriptCore against the REAL game.js, so no
# browser, no display and no network are needed.
set -u
cd "$(dirname "$0")/.."
RUNS="${1:-1000}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
export HARNESS_PARAMS="$TMP/params.json"

rc=0
passes=0

# A step passes only if it prints RESULT: PASS. Anything else — including a
# crash that prints no result at all — is a failure.
run_step() {
  local name="$1" out="$2"
  if echo "$out" | grep -q "RESULT: PASS"; then
    passes=$((passes + 1))
  else
    rc=1
    echo "!!! $name DID NOT PASS"
  fi
}

echo "############################################################"
echo "# 1/5  end-user walkthrough (real buttons, real keyboard)"
echo "############################################################"
out=$(osascript -l JavaScript tools/enduser_test.js 2>&1) || true
echo "$out"
run_step "end-user walkthrough" "$out"

echo
echo "############################################################"
echo "# 2/5  board map invariants (>= 2 squares ladder/snake clearance)"
echo "############################################################"
out=$(python3 tools/check_board_map.py 2>&1) || true
echo "$out"
run_step "board map invariants" "$out"

echo
echo "############################################################"
echo "# 3/5  stress: $RUNS randomised tournaments + autoplay hook"
echo "############################################################"
echo "{\"runs\":$RUNS}" > "$HARNESS_PARAMS"
out=$(osascript -l JavaScript tools/stress_test.js 2>&1) || true
echo "$out"
run_step "stress" "$out"

echo
echo "############################################################"
echo "# 4/5  dead-code / unused-asset audit"
echo "############################################################"
python3 tools/audit_unused.py
if python3 tools/audit_unused.py 2>/dev/null | grep -qE '^ +[0-9.]+ KB +assets/'; then
  echo "  WARNING: unused assets present"; rc=1
else
  passes=$((passes + 1))
  echo "  OK: every asset on disk is referenced by code"
fi

echo
echo "############################################################"
echo "# 5/5  board render (snake legibility check)"
echo "############################################################"
osascript -l JavaScript tools/render_board.js >/dev/null 2>&1
rm -f "$TMP"/_render.html.png
# qlmanage can hang when the display is locked/asleep, so bound it: a visual
# check must never be able to wedge the whole gate.
qlmanage -t -s 1500 -o "$TMP" _render.html >/dev/null 2>&1 &
ql_pid=$!
for _ in $(seq 1 30); do
  kill -0 "$ql_pid" 2>/dev/null || break
  sleep 1
done
if kill -0 "$ql_pid" 2>/dev/null; then
  kill -9 "$ql_pid" 2>/dev/null
  echo "  SKIPPED: qlmanage timed out (display likely locked)."
  echo "           Visual preview only — it proves nothing about correctness, so it does"
  echo "           not fail the suite. Run it on a machine with an unlocked display."
fi
if [ -f "$TMP/_render.html.png" ]; then
  cp "$TMP/_render.html.png" /tmp/board_preview.png
  passes=$((passes + 1))
  echo "  OK: wrote /tmp/board_preview.png"
else
  echo "  WARNING: render failed"; rc=1
fi
rm -f _render.html

echo
if [ "$rc" -eq 0 ]; then
  echo "SUITE: PASS ($passes/5 checks passed)"
else
  echo "SUITE: FAIL"
fi
exit $rc
