# Atif's Arcade — the portal

A single static page that showcases your games. Visitors click a card and the
game loads **right there on the page** — nothing to download, no app store, no
account.

## Run it

```bash
# from the repository root
python3 -m http.server 8000
# then open http://localhost:8000/site/
```

## How the embedding works

Each game is a self-contained page loaded into an `<iframe>`. That is deliberate:

- **No coupling.** The game never talks to the portal — no `window.parent`, no
  shared storage, no API. It cannot break the site, and the site cannot break it.
- **Modals work.** The game's dialogs use `position: fixed`, which resolves
  against the *iframe's* viewport, so they fill the frame correctly instead of
  covering your whole page.
- **Responsive.** The board sizes itself from the frame's width, not the parent
  page's, so it scales down properly on phones.
- **Clean teardown.** `Arcade.stop()` removes the iframe's `src`, which destroys
  the game completely — no leaked timers or state when switching games.

## Adding another game

1. Put the game in its own folder next to `game/`, self-contained.
2. Copy a card in `index.html` and point it at your folder:

```html
<li class="game-card">
  <div class="card-art art-snake"><span>🎯</span></div>
  <div class="card-body">
    <h3 class="card-title">Your Game</h3>
    <p class="card-desc">One line about it.</p>
    <p class="card-meta">Genre · Players · No download</p>
  </div>
  <button class="card-play" type="button"
          data-target="../your-game/index.html"
          data-label="Your Game">▶ Play now</button>
</li>
```

That is the whole integration. `app.js` needs no changes.

You can also open a game directly from JavaScript:

```js
Arcade.play("../your-game/index.html", "Your Game");
```

## Deploying

The `site/` folder is a plain static site — upload it anywhere:

- **Cloudflare Pages** — drag the folder in (free, unlimited bandwidth)
- **EdgeOne Pages** — same, and it reaches China well
- **GitHub Pages** — free for a public repo
- **Netlify / Vercel** — also fine

Remember: the iframe path is relative (`../game/index.html`), so deploy
`site/` and `game/` **together in the same project** so the relative path
resolves.
