// End-user walkthrough: drives the game the way a person actually would.
//
// Clicks the real .count-btn / .games-btn / start / roll / next-game / restart
// buttons parsed out of index.html, uses the R and Space keyboard shortcuts,
// abandons a tournament mid-run, and checks what the player would actually see
// on screen at each step.
//
//   osascript -l JavaScript tools/enduser_test.js
ObjC.import('Foundation');

var ENV = $.NSString.stringWithContentsOfFileEncodingError(
  "/Users/mac/Documents/Mini AI/game/tools/qa_env.js", $.NSUTF8StringEncoding, null).js;
var GAME_DIR = "/Users/mac/Documents/Mini AI/game";
var buildEnv = new Function("ObjC", "$", "__ENV_GAME_DIR__", ENV + "\n;return buildEnv;")(
  ObjC, $, GAME_DIR);

var checks = [], failures = [];
function check(name, cond, detail) {
  checks.push({ name: name, ok: !!cond, detail: detail || "" });
  if (!cond) failures.push(name + (detail ? " — " + detail : ""));
}
function section(t) { checks.push({ section: t }); }

var env = buildEnv({ params: { search: "", seed: 424242, withButtons: true } });
var G = env.G, el = env.el, pump = env.pump, flow = env.flow;

function visible(id) { return el(id).hidden === false; }
function btn(sel, attr, val) {
  var all = env.doc.body.querySelectorAll(sel);
  for (var i = 0; i < all.length; i++) {
    if (String(all[i].dataset[attr]) === String(val)) return all[i];
  }
  return null;
}
function pumpUntil(cond, max) {
  var i = 0;
  while (i < (max || 200000) && !cond()) { pump(1000); i++; }
  return cond();
}

// ---------------------------------------------------------------- scenario 1
section("1. Fresh page opens on the setup screen");
check("setup screen is visible on load", visible("player-modal"));
check("start button starts disabled", el("start-tournament-btn").disabled === true,
      "disabled=" + el("start-tournament-btn").disabled);
check("no game is running", G.state.playerCount === 0, "playerCount=" + G.state.playerCount);

// ---------------------------------------------------------------- scenario 2
section("2. Choosing players and games enables Start");
var c3 = btn(".count-btn", "count", 3);
var g5 = btn(".games-btn", "games", 5);
check("3-player button exists", !!c3);
check("5-game button exists", !!g5);
c3.dispatch("click");
check("Start still disabled with only players chosen",
      el("start-tournament-btn").disabled === true);
g5.dispatch("click");
check("Start enabled once both are chosen", el("start-tournament-btn").disabled === false);
check("chosen buttons show as selected",
      c3.classList.contains("selected") && g5.classList.contains("selected"));

// ---------------------------------------------------------------- scenario 3
section("3. Starting the tournament");
el("start-tournament-btn").dispatch("click");
pump(2000);
check("setup screen closed", visible("player-modal") === false);
check("3 players registered", G.getPLAYERS().length === 3,
      "got " + G.getPLAYERS().length);
check("5 games selected", G.state.totalGames === 5, "totalGames=" + G.state.totalGames);
check("starts on game 1", G.state.currentGame === 1);
check("tournament panel visible", visible("tournament-panel"));
check("side button says End Tournament during a tournament",
      /End Tournament/.test(el("reset-btn").textContent),
      "label=" + JSON.stringify(el("reset-btn").textContent));

// ---------------------------------------------------------------- scenario 4
section("4. Rolling with the Roll Dice button and the keyboard");
var roll = el("roll-btn");
check("roll button enabled at start", roll.disabled === false);
roll.dispatch("click");
pump(4000);
check("a move happened", G.getPLAYERS().some(function (p) { return p.pos > 0; }),
      "positions=" + JSON.stringify(G.state.positions));

// Keyboard: R and Space should both roll, like the button does.
var posOf = function () { return G.getPLAYERS().map(function (p) { return p.pos; }).join(","); };
var before = posOf();
var evR = env.pressKey("r");
pump(4000);
var afterR = posOf();
check("keyboard R rolls the dice", before !== afterR, before + " -> " + afterR);
check("keyboard R consumed the keypress", evR.defaultPrevented === true);

var beforeS = posOf();
env.pressKey(" ");
pump(4000);
check("keyboard Space rolls the dice", beforeS !== posOf(), beforeS + " -> " + posOf());

// ---------------------------------------------------------------- scenario 5
section("5. Playing the tournament through to the champion screen");
var guard = 0;
while (!visible("champion-modal") && guard < 500000) {
  if (visible("gameover-modal")) { el("next-game-btn").dispatch("click"); continue; }
  if (visible("player-modal")) { check("setup screen never appears mid-tournament", false); break; }
  if (G.state.winner === null && !G.state.moving) G.rollAndMove();
  pump(1000);
  guard++;
}
check("champion screen reached", visible("champion-modal"));
var inter = flow.filter(function (e) { return e === "interstitial"; }).length;
var champ = flow.filter(function (e) { return e === "champion"; }).length;
check("4 interstitials for a 5-game tournament", inter === 4, "saw " + inter);
check("exactly one champion screen", champ === 1, "saw " + champ);
check("champion line confirms all games played",
      /all 5 games played/.test(el("champion-stats").innerHTML),
      JSON.stringify(String(el("champion-stats").innerHTML).slice(0, 120)));
check("side button reverts to New Game after the tournament",
      /New Game/.test(el("reset-btn").textContent),
      "label=" + JSON.stringify(el("reset-btn").textContent));

// ---------------------------------------------------------------- scenario 6
section("6. Back to the selection page, ready to play again");
el("champion-restart-btn").dispatch("click");
pump(2000);
check("setup screen is back", visible("player-modal"));
check("champion screen closed", visible("champion-modal") === false);
check("no leftover timers", env.timers().length === 0, "left=" + env.timers().length);
check("autoplay stopped", G.getAutoplay().on === false);
check("Start button re-disabled", el("start-tournament-btn").disabled === true);
check("previous player choice cleared", !btn(".count-btn", "count", 3).classList.contains("selected"));

// ---------------------------------------------------------------- scenario 7
section("7. Playing again with FEWER players than last time (regression)");
btn(".count-btn", "count", 1).dispatch("click");
btn(".games-btn", "games", 1).dispatch("click");
el("start-tournament-btn").dispatch("click");
pump(2000);
check("solo game starts after a 3-player tournament", G.getPLAYERS().length === 1,
      "players=" + G.getPLAYERS().length);
check("turn index is valid for the new player count",
      G.getPLAYERS()[G.state.turn] !== undefined, "turn=" + G.state.turn);
check("status line rendered a real player",
      /Red/.test(el("status").innerHTML), JSON.stringify(el("status").innerHTML));

// ---------------------------------------------------------------- scenario 8
section("8. Abandoning a tournament mid-run returns to selection");
// Needs a multi-game tournament: a single-game one goes straight to the champion
// screen and correctly never shows an interstitial.
btn(".count-btn", "count", 2).dispatch("click");
btn(".games-btn", "games", 3).dispatch("click");
el("start-tournament-btn").dispatch("click");
pump(2000);
check("3-game tournament started for the abandon test", G.state.totalGames === 3,
      "totalGames=" + G.state.totalGames);
var g2 = 0;
while (!visible("gameover-modal") && g2 < 500000) {
  if (visible("champion-modal")) break;
  if (G.state.winner === null && !G.state.moving) G.rollAndMove();
  pump(1000);
  g2++;
}
check("interstitial appeared mid-tournament", visible("gameover-modal"));
check("champion screen not shown yet", visible("champion-modal") === false);
check("interstitial offers the next game",
      /Game 2 of 3/.test(el("next-game-btn").textContent),
      "label=" + JSON.stringify(el("next-game-btn").textContent));
check("interstitial names the games played so far",
      /after 1 of 3 games/.test(el("gameover-score").textContent),
      JSON.stringify(el("gameover-score").textContent));
el("reset-btn").dispatch("click");
pump(2000);
check("End Tournament returns to the setup screen", visible("player-modal"));
check("interstitial dismissed", visible("gameover-modal") === false);
check("no timers left after abandoning", env.timers().length === 0,
      "left=" + env.timers().length);
check("tournament state cleared", G.state.tournamentDone === false);
check("abandoning clears the player/game choice",
      !btn(".count-btn", "count", 2).classList.contains("selected") &&
      !btn(".games-btn", "games", 3).classList.contains("selected"));

// ---------------------------------------------------------------- scenario 9
section("9. Enter/Space advances the interstitial like the button does");
btn(".count-btn", "count", 2).dispatch("click");
btn(".games-btn", "games", 3).dispatch("click");
el("start-tournament-btn").dispatch("click");
pump(2000);
var g3 = 0;
while (!visible("gameover-modal") && g3 < 500000) {
  if (G.state.winner === null && !G.state.moving) G.rollAndMove();
  pump(1000);
  g3++;
}
check("interstitial up for the keyboard test", visible("gameover-modal"));
env.pressKey("Enter");
pump(2000);
check("Enter advanced to game 2", G.state.currentGame === 2,
      "currentGame=" + G.state.currentGame);
check("interstitial dismissed by Enter", visible("gameover-modal") === false);
check("roll button usable again on the new board", el("roll-btn").disabled === false);

// ---------------------------------------------------------------- report
var out = [];
out.push("=== END-USER WALKTHROUGH ===");
checks.forEach(function (c) {
  if (c.section) { out.push(""); out.push(c.section); return; }
  out.push("  " + (c.ok ? "PASS" : "FAIL") + "  " + c.name +
           (c.ok || !c.detail ? "" : "   [" + c.detail + "]"));
});
var passed = checks.filter(function (c) { return !c.section && c.ok; }).length;
var total = checks.filter(function (c) { return !c.section; }).length;
out.push("");
out.push("RESULT: " + (failures.length ? "FAIL — " + failures.length + " of " + total
                                      : "PASS — " + passed + " of " + total + " checks"));
out.join("\n");
