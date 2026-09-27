# Snake & Ladder — 3D Cartoon Edition

A complete snake-and-ladder board game you can run in any browser, built with **only free assets** generated via Pollinations FLUX (free tier) and stripped of watermarks.

## Run it

Open `index.html` in any modern browser:

```bash
open game/index.html           # macOS
xdg-open game/index.html       # Linux
start game/index.html          # Windows
```

…or serve it locally for cleaner dev tools:

```bash
cd game && python3 -m http.server 8000
# then visit http://localhost:8000
```

## What's in the box

| Path | Purpose |
|---|---|
| `index.html` | Markup + asset references |
| `style.css` | All styling — board grid, dice, sidebar |
| `game.js` | Game logic: turns, dice, snakes/ladders, win detection |
| `assets/board.png` | Wooden checkerboard background (FLUX-generated, watermark-stripped) |
| `assets/pawn_{red,blue,green,yellow}.png` | 3D cartoon character pawns (4 players) |
| `assets/snake_{green,yellow}.png` | 3D cartoon snake decorations |
| `assets/dice.png` | 3D cartoon single die |
| `assets/ladder.png` | Wooden ladder prop |

## Rules

- 4 players take turns rolling a 6-sided die.
- Roll to advance that many squares (snaking row pattern: 1-10 bottom-left, 100 top-left).
- 🪜 **Ladders** climb up: 6→25, 11→40, 20→59, 27→74, 36→57, 51→67, 63→81, 71→91, 80→99.
- 🐍 **Snakes** slide down: 25→2, 52→42, 70→55, 95→72, 99→54.
- Roll exactly 100 to win. If you roll higher than 100, you bounce back.

## How the assets were made

All graphics were generated with the **Pollinations FLUX API** using this recipe:

```
https://image.pollinations.ai/prompt/<your-prompt>
  ?width=512&height=512
  &nologo=true&private=true&model=flux
```

The `private=true&nologo=true&model=flux` combo is what unlocks Pollinations' higher-quality rendering path on the free tier. Each PNG had the bottom-right watermark removed via `/tmp/wmstrip/strip.py` (see `scripts/strip-watermark.py` in the parent repo) and saved as PNG.

## Free, no accounts, no popups

- ✅ Pollinations FLUX free tier (no signup, no API key, no payment)
- ✅ No OAuth popups
- ✅ No advertisements baked into the assets
- ✅ Open source — fork it, modify it, ship your own version

## Reset the game

Click "↺ New Game" in the sidebar.