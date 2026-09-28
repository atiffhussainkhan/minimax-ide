#!/usr/bin/env python3
"""check_board_map: enforce the Snake & Ladder board invariants.

The hard rule, set by the player:
    every |ladder landing square - snake bite square| must be >= 2
A ladder must never land on a snake, nor on a square adjacent to one. The move
logic resolves ladders first and snakes second, so a landing square at distance
0 bites the player on arrival (a pure loss) and distance 1 is a near-miss trap.

Plus structural invariants: all squares in 1..100, snakes always go down,
ladders always go up, and no square is both a snake head and a ladder foot.

    python3 tools/check_board_map.py            # exit 0 = compliant
"""
import re, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, "game.js"), encoding="utf-8").read()

def grab(name):
    body = re.search(r"const\s+" + name + r"\s*=\s*\{(.*?)\}\s*;", src, re.S).group(1)
    return {int(k): int(v) for k, v in re.findall(r"(\d+)\s*:\s*(\d+)", body)}

SNAKES = grab("SNAKES")
LADDERS = grab("LADDERS")
MIN_CLEARANCE = 2

errors, warnings = [], []
bite = sorted(SNAKES)                      # where a snake bites (its start square)
landings = sorted(set(LADDERS.values()))    # where a ladder puts you down

# ---- THE RULE -------------------------------------------------------------
for land in landings:
    foot = [k for k, v in LADDERS.items() if v == land][0]
    for b in bite:
        gap = abs(land - b)
        if gap < MIN_CLEARANCE:
            errors.append(f"ladder {foot} lands on {land}, only {gap} square(s) from "
                          f"snake {b} — needs >= {MIN_CLEARANCE}")

# ---- structural invariants ------------------------------------------------
for s, e in SNAKES.items():
    if not (1 <= s <= 100): errors.append(f"snake head {s} out of range")
    if not (1 <= e <= 100): errors.append(f"snake tail {e} out of range")
    if e >= s: errors.append(f"snake {s} -> {e} does not go down")
for f, t in LADDERS.items():
    if not (1 <= f <= 100): errors.append(f"ladder foot {f} out of range")
    if not (1 <= t <= 100): errors.append(f"ladder top {t} out of range")
    if t <= f: errors.append(f"ladder {f} -> {t} does not go up")
both = set(SNAKES) & set(LADDERS)
if both:
    errors.append(f"square(s) {sorted(both)} are both a snake head and a ladder foot")

# ---- report ---------------------------------------------------------------
print("=== check_board_map ===")
print(f"  SNAKES  ({len(SNAKES)}): " + "  ".join(f"{s}->{e}" for s, e in sorted(SNAKES.items())))
print(f"  LADDERS ({len(LADDERS)}): " + "  ".join(f"{f}->{t}" for f, t in sorted(LADDERS.items())))
print()
print(f"  {'ladder lands':>13s}  {'vs snake':>9s}  {'gap':>4s}")
for land in landings:
    foot = [k for k, v in LADDERS.items() if v == land][0]
    near = min(bite, key=lambda b: abs(land - b))
    gap = abs(land - near)
    mark = "OK" if gap >= MIN_CLEARANCE else "FAIL"
    print(f"  {foot:>3d} -> {land:<7d}  {near:>7d}  {gap:>4d}  {mark}")
print()
if errors:
    print(f"  {len(errors)} ERROR(S):")
    for e in errors:
        print(f"    - {e}")
    print()
    print("  RESULT: FAIL — board map breaks the clearance rule")
else:
    tightest = min(abs(l - b) for l in landings for b in bite)
    print(f"  all invariants hold — tightest ladder/snake gap is {tightest} "
          f"(minimum required {MIN_CLEARANCE})")
    print()
    print("  RESULT: PASS — board map is compliant")
sys.exit(1 if errors else 0)
