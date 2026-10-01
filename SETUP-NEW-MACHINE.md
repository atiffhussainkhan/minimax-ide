# Setting up a new machine

Everything is on GitHub. Nothing needs to come off the old laptop.

    git clone https://github.com/atiffhussainkhan/crossroad-hopper.git    # this game
    git clone https://github.com/atiffhussainkhan/minimax-ide.git         # parent workspace
    git clone https://github.com/atiffhussainkhan/santas-visit.git        # christmas site
    git clone https://github.com/atiffhussainkhan/Snake-and-ladder.git    # unity game
    git clone https://github.com/mintvaultuk-byte/snakes-and-ladders-.git # separate repo

Then:

    cd crossroad-hopper && open index.html

## The game needs nothing installed

Static HTML/CSS/JS. No Node, no npm, no build step, no server. Open the file.

The Python tools under `tools/` are optional and are for generating art and
running the gates; they need Python 3 and Pillow only.

## Verify a clone is sound

    bash tools/run_all.sh

Five gates pass. `check_vertical_slice` fails on P-12, which is a difficulty
BALANCE target (campaign reachability against 90%), not a broken build. A
fresh clone reproducing the same result is the sign it is healthy.

## Notes

- `hopper-game/` is ignored by the parent repo on purpose: it is its own
  project with its own remote, and committing it into the parent is how the two
  drift apart.
- In the Unity project, `src/` is C# source and `Assets/` is the game. Both
  are tracked. `bin/` and `obj/` are build output and are ignored.
