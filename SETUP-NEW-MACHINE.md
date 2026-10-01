# Setting up a new machine

Everything is on GitHub. Nothing needs to come off the old laptop, and there is
no environment to copy or image.

    git clone https://github.com/atiffhussainkhan/crossroad-hopper.git    # the game
    git clone https://github.com/atiffhussainkhan/minimax-ide.git         # parent workspace
    git clone https://github.com/atiffhussainkhan/santas-visit.git        # christmas site
    git clone https://github.com/atiffhussainkhan/Snake-and-ladder.git    # unity game
    git clone https://github.com/mintvaultuk-byte/snakes-and-ladders-.git # separate repo

## Playing the game: nothing to install

    open crossroad-hopper/index.html

That is the whole setup. The game is static HTML, CSS and JavaScript:

- **No Node, no npm, no bundler, no build step, no server.**
- **No network access.** Every script is a local file; there is not one CDN
  link or font URL in the shipped code.
- **No image files to copy.** Every character, vehicle and tree is drawn in
  code from the stage palettes, so the art travels inside the source files
  rather than as assets that can go missing.

Ten plain `<script>` tags, loaded in a fixed order that is the same order every
gate and test uses.

## Running the gates: Python 3 only

    cd crossroad-hopper && bash tools/run_all.sh

macOS ships Python 3, so this usually just works. **Pillow is NOT required.**
It is verified to be unnecessary: the whole suite passes with Pillow
deliberately made unimportable.

Five gates pass. `check_vertical_slice` fails on P-12, which is a difficulty
BALANCE target (campaign reachability against 90%), not a broken build. A
fresh clone reproducing the same result is the sign it is healthy.

## Only if you want to regenerate the art sheets

    python3 -m pip install --user Pillow
    python3 tools/render_art.py

`tools/iso.py` and `tools/render_art.py` are the only files that import Pillow,
and they only produce the offline preview PNGs under `art/`. Nothing in the
game and nothing in the gates depends on them.

## Nothing machine-specific is baked in

- No absolute paths to any particular machine.
- No environment variables, no secrets, no `.env` needed.
- System fonts only, so the new Mac already has them.

## Layout notes

- `hopper-game/` is ignored by the parent repo on purpose: it is its own
  project with its own remote, and committing it into the parent is how the two
  drift apart.
- In the Unity project, `src/` is C# source and `Assets/` is the game. Both are
  tracked. `bin/` and `obj/` are build output and are ignored.
- `Snake-and-ladder` also has a `wip-stash-readme` branch holding a stash that
  was rescued before the old machine was retired. It is not merged into main.

## Editor and agent settings (VS Code, MiniMax, Codex)

A sanitised bundle sits in `machine-setup/` in this folder. It is **gitignored
on purpose** — the repository is public, and even with secrets stripped a
machine's settings do not belong in a public repo. Move it across however you
prefer (AirDrop, USB, iCloud Drive, or a private repo of your own), then on the
new machine:

    ./machine-setup/restore-settings.sh --dry-run    # preview
    ./machine-setup/restore-settings.sh              # apply

It restores VS Code preferences, snippets and chat-model choices, plus the
MiniMax and Codex configuration files. Anything already there is backed up as
`*.machine-setup-backup` first.

### Two things it cannot restore, by design

**GitHub sign-in.** The credential was in the macOS keychain, which is bound to
the machine. Clone anything over HTTPS and let git prompt you, or turn on
VS Code's "Always use GitHub for all repositories".

**The MiniMax API key.** It was stripped out of the bundle and has to be
pasted back into `~/.minimax/config.yaml` under `apiKey`. It is a live secret
and a bundle like this is exactly how credentials end up in a git history.

Also install your VS Code extensions: the settings travel, the extensions are
installed per machine.
