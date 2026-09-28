// Shared QA environment for game.js.
//
// Builds a minimal DOM + timer queue, loads the REAL game.js into it, and hands
// back the game plus instrumentation. Used by both the 1000-run stress test and
// the end-user walkthrough.
//
//   osascript -l JavaScript tools/qa_env.js   → not run directly; loaded by the
//                                               test scripts via Function().
ObjC.import('Foundation');

var GAME_DIR = __ENV_GAME_DIR__;

function buildEnv(opts) {
  opts = opts || {};
  var params = opts.params || {};

  // ---- DOM stub ------------------------------------------------------------
  function El(tag) {
    this.tagName = (tag || "div").toUpperCase();
    this.children = []; this.attrs = {}; this.style = {};
    this._html = ""; this._text = "";
    this.disabled = false; this.listeners = {}; this.dataset = {};
    this._hidden = false;
    var self = this;
    this.classList = {
      _s: {},
      add: function () {
        for (var i = 0; i < arguments.length; i++) {
          if (arguments[i]) self.classList._s[arguments[i]] = 1;
        }
      },
      remove: function () {
        for (var i = 0; i < arguments.length; i++) delete self.classList._s[arguments[i]];
      },
      contains: function (c) { return !!self.classList._s[c]; },
      toggle: function (c, on) {
        var want = (on === undefined) ? !self.classList._s[c] : !!on;
        if (want) self.classList._s[c] = 1; else delete self.classList._s[c];
        return want;
      },
    };
  }
  // `hidden` is load-bearing: the game branches on it to decide which screen is
  // showing. Track transitions so tests can assert the exact flow order without
  // paying for a trace() call on every move.
  Object.defineProperty(El.prototype, "hidden", {
    get: function () { return this._hidden; },
    set: function (v) {
      var nv = !!v;
      if (nv !== this._hidden) {
        this._hidden = nv;
        if (this._onHidden) this._onHidden(this.id, nv);
      }
      this._hidden = nv;
    },
  });
  // In a real DOM className and classList are the same store, so keep them in
  // sync — otherwise querySelector(".count-btn") never matches.
  Object.defineProperty(El.prototype, "className", {
    get: function () { return this.attrs["class"] || ""; },
    set: function (v) {
      this.attrs["class"] = String(v);
      var s = this.classList._s = {};
      String(v).split(/\s+/).forEach(function (c) { if (c) s[c] = 1; });
    },
  });
  Object.defineProperty(El.prototype, "innerHTML", {
    get: function () { return this._html; },
    set: function (v) { this._html = String(v); this.children = []; },
  });
  Object.defineProperty(El.prototype, "textContent", {
    get: function () { return this._text; },
    set: function (v) { this._text = String(v); },
  });
  El.prototype.appendChild = function (c) { this.children.push(c); c.parentNode = this; return c; };
  El.prototype.removeChild = function (c) {
    var i = this.children.indexOf(c);
    if (i >= 0) this.children.splice(i, 1);
    return c;
  };
  El.prototype.setAttribute = function (k, v) { this.attrs[k] = String(v); };
  El.prototype.getAttribute = function (k) { return this.attrs[k]; };
  El.prototype.setAttributeNS = function (ns, k, v) { this.attrs[k] = String(v); };
  El.prototype.addEventListener = function (ev, fn) {
    (this.listeners[ev] = this.listeners[ev] || []).push(fn);
  };
  El.prototype.removeEventListener = function () {};
  El.prototype.focus = function () {};
  El.prototype.blur = function () {};
  El.prototype.cloneNode = function () { return new El(this.tagName); };
  El.prototype.dispatch = function (ev) {
    var l = this.listeners[ev] || [];
    for (var i = 0; i < l.length; i++) l[i].dispatch ? l[i].dispatch({ type: ev }) : l[i]({ type: ev });
  };
  // Selector matching good enough for what the game actually queries:
  // a tag name, or a class list like ".count-btn.selected" (compound), which
  // fullReset relies on to clear the player's earlier choices.
  function matches(el, sel) {
    sel = String(sel).trim();
    if (sel.charAt(0) === ".") {
      return sel.slice(1).split(".").every(function (c) {
        return c && el.classList && el.classList.contains(c);
      });
    }
    return el.tagName === sel.toUpperCase();
  }
  function find(root, sel, all) {
    var out = [], stack = (root.children || []).slice();
    while (stack.length) {
      var n = stack.shift();
      if (matches(n, sel)) {
        if (!all) return n;
        out.push(n);
      }
      stack = stack.concat(n.children || []);
    }
    return all ? out : null;
  }
  El.prototype.querySelector = function (sel) { return find(this, sel, false); };
  El.prototype.querySelectorAll = function (sel) { return find(this, sel, true); };

  var byId = {};
  function getEl(id) {
    if (!byId[id]) { byId[id] = new El("div"); byId[id].id = id; }
    return byId[id];
  }
  // Mirror the real page's starting visibility.
  ["player-modal", "gameover-modal", "champion-modal", "tournament-panel"].forEach(function (id) {
    getEl(id);
  });

  // Build the real selection buttons out of index.html so the end-user test
  // drives the same markup the browser would, including initial state such as
  // <button id="start-tournament-btn" ... disabled> and the [hidden] modals.
  function buildFromIndexHtml() {
    var html = $.NSString.stringWithContentsOfFileEncodingError(
      GAME_DIR + "/index.html", $.NSUTF8StringEncoding, null).js;
    if (!html) throw new Error("could not read index.html");

    // Seed each id's starting disabled/hidden flags from its opening tag.
    var tagRe = /<(button|div|section)[^>]*\bid="([\w-]+)"[^>]*>/g;
    var m;
    while ((m = tagRe.exec(html))) {
      var el = getEl(m[2]);
      if (/\sdisabled(\s|>|=)/.test(m[0])) el.disabled = true;
      if (/\shidden(\s|>|=)/.test(m[0])) el.hidden = true;
    }

    // Synthesise the selectable player-count / games buttons.
    var wrap = new El("div");
    var re = /<button[^>]*class="(count-btn|games-btn)"[^>]*data-(count|games)="(\d+)"[^>]*>/g;
    while ((m = re.exec(html))) {
      var b = new El("button");
      b.className = m[1];
      b.dataset[m[2]] = m[3];
      wrap.appendChild(b);
    }
    documentStub.body.appendChild(wrap);
  }

  var docListeners = {};
  var documentStub = {
    body: new El("body"),
    documentElement: new El("html"),
    getElementById: getEl,
    createElement: function (t) { return new El(t); },
    createElementNS: function (ns, t) { return new El(t); },
    querySelector: function (s) { return documentStub.body.querySelector(s); },
    querySelectorAll: function (s) { return documentStub.body.querySelectorAll(s); },
    addEventListener: function (ev, fn) {
      (docListeners[ev] = docListeners[ev] || []).push(fn);
    },
    createTextNode: function () { return new El("#text"); },
  };
  // Press a key the way a person would: synthesise the event the document
  // listener receives, including target and preventDefault.
  function pressKey(key) {
    var ev = {
      type: "keydown", key: key, target: { tagName: "BODY" },
      preventDefault: function () { ev.defaultPrevented = true; },
      defaultPrevented: false,
    };
    (docListeners.keydown || []).forEach(function (fn) { fn(ev); });
    return ev;
  }

  // ---- fake timer queue ----------------------------------------------------
  var timers = [], timerId = 0, clock = 0;
  function setTimeoutStub(fn, ms) {
    var t = { id: ++timerId, at: clock + (ms || 0), fn: fn, seq: timerId };
    timers.push(t);
    return t.id;
  }
  function clearTimeoutStub(id) { timers = timers.filter(function (t) { return t.id !== id; }); }
  function pump(maxSteps) {
    var steps = 0;
    while (timers.length && steps < (maxSteps || 200000)) {
      timers.sort(function (a, b) { return a.at - b.at || a.seq - b.seq; });
      var t = timers.shift();
      clock = t.at;
      t.fn();
      steps++;
    }
    return steps;
  }

  // ---- seedable RNG --------------------------------------------------------
  // Math.random is the game's dice source, so proxying it is what makes a
  // failing stress iteration reproducible from its seed.
  var seed = params.seed || 12345;
  function lcg() {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  }
  var MathProxy = Object.create(Math);
  MathProxy.random = lcg;

  function USP(qs) {
    this._m = {};
    String(qs || "").replace(/^\?/, "").split("&").forEach(function (kv) {
      if (!kv) return;
      var i = kv.indexOf("=");
      var k = i < 0 ? kv : kv.slice(0, i);
      var v = i < 0 ? "" : kv.slice(i + 1);
      this._m[k] = v;
    }, this);
  }
  USP.prototype.get = function (k) {
    return Object.prototype.hasOwnProperty.call(this._m, k) ? this._m[k] : null;
  };

  // ---- globals the game expects -------------------------------------------
  var search = params.search || "";
  var win = {
    location: { search: search, href: "http://x/?" + search },
    Math: MathProxy, addEventListener: function (ev, fn) {
      if (ev === "DOMContentLoaded") win.__domready = fn;
      if (ev === "error" || ev === "unhandledrejection") win.__onerr = fn;
    },
    setTimeout: setTimeoutStub, clearTimeout: clearTimeoutStub,
    fetch: function () { return { catch: function () {} }; },
  };
  win.window = win;

  // ---- load the real game --------------------------------------------------
  var SRC = $.NSString.stringWithContentsOfFileEncodingError(
    GAME_DIR + "/game.js", $.NSUTF8StringEncoding, null).js;
  if (!SRC) throw new Error("could not read game.js");

  // JXA never drains the microtask queue from a synchronous script, so a real
  // `await sleep(...)` would suspend forever. Strip async/await and stub sleep():
  // that removes animation TIMING only — every branch, the ladder/snake lookup,
  // the win check and the tournament counter are untouched.
  var CODE = SRC
    .replace(/\basync\s+function\s+(\w+)/g, "function $1")
    .replace(/\bawait\s+/g, "");
  CODE = CODE.replace(/function\s+sleep\s*\([^)]*\)\s*\{[^}]*\}/,
    "function sleep(){ return; }");
  if (/\bawait\b|\basync\s+function\b/.test(CODE)) {
    throw new Error("failed to strip async/await — tests would hang");
  }

  var G = Function("document", "window", "location", "fetch", "setTimeout", "clearTimeout",
    "Math", "console", "URLSearchParams", "windowObj",
    CODE + "\n;return {state:state,startTournament:startTournament,startNextGame:startNextGame," +
    "showGameOverModal:showGameOverModal,hideGameOverModal:hideGameOverModal," +
    "showChampionModal:showChampionModal,fullReset:fullReset,rollAndMove:rollAndMove," +
    "showPlayerModal:showPlayerModal,hidePlayerModal:hidePlayerModal,setPos:setPos," +
    "getPLAYERS:function(){return PLAYERS;},getAutoplay:function(){return autoplay;}," +
    "SNAKES:SNAKES,LADDERS:LADDERS,SNAKE_PALETTE:SNAKE_PALETTE,draw3DSnake:draw3DSnake," +
    "squareSvg:squareSvg,positionForSquare:positionForSquare,COLS:COLS,ROWS:ROWS,"
    + "updateTournamentPanel:updateTournamentPanel,updateResetButton:updateResetButton};"
  )(documentStub, win, win.location, win.fetch, setTimeoutStub, clearTimeoutStub,
    MathProxy, console, USP, win);

  // ---- flow instrumentation ----------------------------------------------
  var flow = [];
  function watch(id) {
    var el = getEl(id);
    el._onHidden = function (name, isHidden) {
      if (name === "gameover-modal" && !isHidden) flow.push("interstitial");
      if (name === "champion-modal" && !isHidden) flow.push("champion");
    };
  }
  ["gameover-modal", "champion-modal"].forEach(watch);

  if (typeof win.__domready === "function") {
    // Buttons must exist BEFORE DOMContentLoaded, because that is where the
    // game attaches its .count-btn / .games-btn click handlers.
    if (params.withButtons) buildFromIndexHtml();
    win.__domready();
  } else {
    throw new Error("game.js never registered DOMContentLoaded");
  }

  return {
    G: G, doc: documentStub, win: win, el: getEl, flow: flow,
    pump: pump, pressKey: pressKey, timers: function () { return timers; },
    resetTimers: function () { timers = []; },
    setSeed: function (s) { seed = s; },
    getSeed: function () { return seed; },
    rollDie: function () { return 1 + Math.floor(lcg() * 6); },
  };
}
