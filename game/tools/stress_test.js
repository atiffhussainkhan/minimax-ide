// 1000-run randomised stress test.
//
// Plays complete tournaments with randomised player counts, game counts and RNG
// seeds, asserting the invariants that must hold every single time. Any failure
// prints the exact seed + configuration so it can be replayed.
//
//   osascript -l JavaScript tools/stress_test.js
ObjC.import('Foundation');

// Resolve the game directory instead of hardcoding an absolute path, so this
// suite runs correctly from ANY checkout. tools/run_all.sh cds into this folder,
// so the current working directory is the game root. GAME_DIR overrides it.
function _envDir() {
  var v = $.NSProcessInfo.processInfo.environment.objectForKey("GAME_DIR");
  if (v === null || v === undefined) return "";
  var s = String(v);
  return (s === "[id nil]" || s === "<null>" || s === "") ? "" : s;   // JXA nil is truthy
}
var GAME_DIR = _envDir() || ObjC.unwrap($.NSFileManager.defaultManager.currentDirectoryPath);
var ENV = $.NSString.stringWithContentsOfFileEncodingError(
  GAME_DIR + "/tools/qa_env.js", $.NSUTF8StringEncoding, null).js;
var PARAMS_PATH = $.NSProcessInfo.processInfo.environment.objectForKey("HARNESS_PARAMS") || "/tmp/qa_params.json";
var P = JSON.parse($.NSString.stringWithContentsOfFileEncodingError(
  PARAMS_PATH, $.NSUTF8StringEncoding, null).js);

var RUNS = P.runs || 1000;

var buildEnv = new Function("ObjC", "$", "__ENV_GAME_DIR__", ENV + "\n;return buildEnv;")(
  ObjC, $, GAME_DIR);

var env = buildEnv({ params: { search: "" } });
var G = env.G, el = env.el, flow = env.flow, pump = env.pump;

var failures = [];
var tally = { interstitials: 0, champions: 0, turns: 0 };
var worst = { turns: 0 };

function lcgNext(s) { return (s * 1103515245 + 12345) & 0x7fffffff; }

for (var run = 0; run < RUNS; run++) {
  var seed = (run * 2654435761 % 2147483647) + 1;
  var n = 1 + (run % 4);                       // 1..4 players
  var gsel = [1, 3, 5, 7, 9];
  var g = gsel[run % gsel.length];

  env.setSeed(seed);
  flow.length = 0;
  env.resetTimers();

  var rec = { run: run, seed: seed, n: n, g: g, errs: [] };

  try {
    G.startTournament(n, g);

    // Play it out exactly like a person: roll, then click whatever is showing.
    var turns = 0, guard = 0;
    for (; guard < 500000; guard++) {
      if (!el("champion-modal").hidden) break;
      if (!el("gameover-modal").hidden) { el("next-game-btn").dispatch("click"); continue; }
      if (el("player-modal").hidden === false) { rec.errs.push("setup screen reappeared mid-tournament"); break; }
      if (G.state.winner === null && !G.state.moving) {
        G.rollAndMove();
        turns++;
      }
      pump(1000);
    }
    if (guard >= 500000) rec.errs.push("game did not terminate (guard limit)");

    tally.turns += turns;
    if (turns > worst.turns) { worst.turns = turns; worst.run = run; }

    // ---- invariants -------------------------------------------------------
    var inter = 0, champ = 0;
    for (var i = 0; i < flow.length; i++) {
      if (flow[i] === "interstitial") inter++;
      if (flow[i] === "champion") champ++;
    }
    tally.interstitials += inter; tally.champions += champ;

    if (inter !== g - 1) rec.errs.push("interstitials=" + inter + " expected " + (g - 1));
    if (champ !== 1) rec.errs.push("champion screens=" + champ + " expected 1");
    if (el("champion-modal").hidden !== false) rec.errs.push("champion modal not visible at end");

    var sum = 0, k;
    for (k in G.state.wins) sum += G.state.wins[k];
    if (sum !== g) rec.errs.push("wins sum=" + sum + " expected " + g);
    if (G.state.history.length !== g) rec.errs.push("history=" + G.state.history.length + " expected " + g);
    if (G.state.currentGame !== g) rec.errs.push("currentGame=" + G.state.currentGame + " expected " + g);
    if (G.state.tournamentDone !== true) rec.errs.push("tournamentDone not set");
    if (G.state.moving !== false) rec.errs.push("state.moving stuck true");
    if (G.state.winner === null || G.state.winner === undefined) rec.errs.push("state.winner not set");
    if (G.state.winner >= n) rec.errs.push("winner id " + G.state.winner + " out of range");

    // Pawn squares must be legal and must agree with the position mirror.
    var pl = G.getPLAYERS();
    for (i = 0; i < pl.length; i++) {
      var pos = pl[i].pos;
      if (!(pos >= 1 && pos <= 100)) rec.errs.push(pl[i].name + " pos=" + pos + " out of 1..100");
      if (G.state.positions[pl[i].id] !== pos) {
        rec.errs.push(pl[i].name + " mirror desync: pos=" + pos +
          " state.positions=" + G.state.positions[pl[i].id]);
      }
    }

    // Reset must fully unwind: no leftover timers, no autoplay, setup screen back.
    var pendBefore = env.timers().length;
    el("champion-restart-btn").dispatch("click");
    if (el("player-modal").hidden !== false) rec.errs.push("setup screen not shown after champion");
    if (el("champion-modal").hidden !== true) rec.errs.push("champion modal still visible");
    if (el("gameover-modal").hidden !== true) rec.errs.push("gameover modal still visible");
    if (env.timers().length !== 0) {
      rec.errs.push("timers leaked after reset: " + env.timers().length + " (was " + pendBefore + ")");
    }
    if (G.getAutoplay().on !== false) rec.errs.push("autoplay still on after reset");
    if (G.state.tournamentDone !== false) rec.errs.push("tournamentDone not cleared");
    env.resetTimers();
  } catch (e) {
    rec.errs.push("EXCEPTION: " + (e && e.message ? e.message : String(e)));
  }

  if (rec.errs.length) {
    failures.push(rec);
    if (failures.length <= 8) {
      "RUN " + rec.run + " seed=" + rec.seed + " " + rec.n + "p/" + rec.g + "g";
      rec.errs.forEach(function (e) { "    - " + e; });
    }
  }
}

var out = [];
out.push("=== STRESS: " + RUNS + " full tournaments ===");
out.push("config sweep: 1-4 players x games {1,3,5,7,9}, unique RNG seed per run");
out.push("turns played: " + tally.turns + "   (longest run: " + worst.turns +
         " turns, run " + worst.run + ")");
out.push("interstitials seen: " + tally.interstitials + "   champion screens: " + tally.champions);
out.push("");
if (failures.length) {
  out.push("RESULT: FAIL — " + failures.length + " of " + RUNS + " runs failed");
  failures.slice(0, 8).forEach(function (r) {
    out.push("  run " + r.run + " seed=" + r.seed + " " + r.n + "p/" + r.g + "g");
    r.errs.forEach(function (e) { out.push("      - " + e); });
  });
} else {
  out.push("RESULT: PASS — all " + RUNS + " runs clean");
}

// ---- the ?fast=1 autoplay hook, driven by its own timer chain --------------
// Every run above is played by hand (roll + click). This one proves the headless
// autoplay hook also drives a whole tournament to the champion screen, since
// that loop is separate code with its own stop conditions.
out.push("");
out.push("--- autoplay hook (?fast=1), no manual input ---");
var autoFail = [];
[1, 3, 5, 7, 9].forEach(function (games) {
  var aenv = buildEnv({ params: { search: "test=1&fast=1&n=3&g=" + games, seed: 777 } });
  var aG = aenv.G, aEl = aenv.el;
  var steps = 0;
  while (aEl("champion-modal").hidden !== false && steps < 4000000) {
    aenv.pump(5000);
    steps++;
  }
  var got = aEl("champion-modal").hidden === false;
  var autosOff = aG.getAutoplay().on === false;
  var sum = 0, k;
  for (k in aG.state.wins) sum += aG.state.wins[k];
  if (!got) autoFail.push(games + " games: never reached the champion screen");
  if (!autosOff) autoFail.push(games + " games: autoplay left running after the tournament");
  if (sum !== games) autoFail.push(games + " games: wins sum " + sum);
  out.push("  " + (got && autosOff && sum === games ? "PASS" : "FAIL") +
           "  3 players / " + games + " games  (wins=" + sum +
           ", autoplay stopped=" + autosOff + ")");
});
out.push("");
if (autoFail.length) {
  out.push("RESULT: FAIL — autoplay hook");
  autoFail.forEach(function (e) { out.push("  - " + e); });
} else {
  out.push("RESULT: PASS — autoplay hook drives all 5 competition lengths");
}
out.join("\n");
