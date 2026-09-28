// Render the real board to a PNG so it can be eyeballed without a browser.
//
// Loads the REAL game.js into a recording DOM stub, calls the real buildBoard(),
// serialises the result into a standalone HTML page that links the game's own
// style.css + board.png, and lets `qlmanage` rasterise it.
//
//   osascript -l JavaScript tools/render_board.js
//   qlmanage -t -s 1500 -o /tmp game/_render.html
//   mv /tmp/_render.html.png /tmp/board.png
ObjC.import('Foundation');

// Resolve the game directory instead of hardcoding an absolute path, so the
// suite runs correctly from ANY checkout. tools/run_all.sh cds into this
// folder, so the current directory is the game root.
var GAME_DIR = $.NSProcessInfo.processInfo.environment.objectForKey("GAME_DIR")
  || ObjC.unwrap($.NSFileManager.defaultManager.currentDirectoryPath);

function El(tag) {
  this.tagName = (tag || "div").toUpperCase();
  this.children = []; this.attrs = {}; this.style = {};
  this._html = ""; this._text = ""; this.hidden = false;
  this.disabled = false; this.listeners = {}; this.dataset = {};
  var self = this;
  this.classList = {
    _s: {},
    add: function () { for (var i = 0; i < arguments.length; i++) if (arguments[i]) self.classList._s[arguments[i]] = 1; },
    remove: function () { for (var i = 0; i < arguments.length; i++) delete self.classList._s[arguments[i]]; },
    contains: function (c) { return !!self.classList._s[c]; },
    toggle: function () {},
  };
}
Object.defineProperty(El.prototype, "hidden", {
  get: function () { return this._hidden; },
  set: function (v) { this._hidden = !!v; },
});
Object.defineProperty(El.prototype, "className", {
  get: function () { return this.attrs["class"] || ""; },
  set: function (v) {
    this.attrs["class"] = String(v);
    var s = this.classList._s = {};
    String(v).split(/\s+/).forEach(function (c) { if (c) s[c] = 1; });
  },
});
Object.defineProperty(El.prototype, "innerHTML", {
  get: function () { return this._html; }, set: function (v) { this._html = String(v); this.children = []; },
});
Object.defineProperty(El.prototype, "textContent", {
  get: function () { return this._text; }, set: function (v) { this._text = String(v); },
});
El.prototype.appendChild = function (c) { this.children.push(c); return c; };
El.prototype.removeChild = function (c) { return c; };
El.prototype.setAttribute = function (k, v) { this.attrs[k] = String(v); };
El.prototype.getAttribute = function (k) { return this.attrs[k]; };
El.prototype.setAttributeNS = function (ns, k, v) { this.attrs[k] = String(v); };
El.prototype.addEventListener = function () {};
El.prototype.focus = function () {};
El.prototype.querySelector = function () { return null; };
El.prototype.querySelectorAll = function () { return []; };

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
// Style keys come off the stub camelCased (gridRow). A style ATTRIBUTE needs
// kebab-case or the browser drops the declaration and every cell auto-flows in
// DOM order — which would fake a flipped board.
function kebab(k) { return k.replace(/[A-Z]/g, function (c) { return "-" + c.toLowerCase(); }); }

function markup(el) {
  var a = "", st = "";
  if (el.style) {
    if (el.style.cssText) st += el.style.cssText;
    for (var k in el.style) if (k !== "cssText") st += kebab(k) + ":" + el.style[k] + ";";
  }
  if (st) a += ' style="' + esc(st) + '"';
  for (var k2 in el.attrs) a += " " + k2 + '="' + esc(el.attrs[k2]) + '"';
  if (el.hidden) a += ' hidden="hidden"';
  var inner = el._html + el._text + el.children.map(markup).join("");
  if (!inner) return "<" + el.tagName.toLowerCase() + a + "/>";
  return "<" + el.tagName.toLowerCase() + a + ">" + inner + "</" + el.tagName.toLowerCase() + ">";
}

var byId = {};
function getEl(id) { if (!byId[id]) { byId[id] = new El("div"); byId[id].id = id; } return byId[id]; }
var doc = {
  body: new El("body"), documentElement: new El("html"),
  getElementById: getEl, createElement: function (t) { return new El(t); },
  createElementNS: function (ns, t) { return new El(t); },
  querySelector: function () { return null; }, querySelectorAll: function () { return []; },
  addEventListener: function () {}, createTextNode: function () { return new El("#text"); },
};
var win = { location: { search: "" }, Math: Math, console: console,
            addEventListener: function () {}, setTimeout: function () {}, clearTimeout: function () {},
            fetch: function () { return { catch: function () {} }; } };
win.window = win;
function USP() { this._m = {}; }
USP.prototype.get = function () { return null; };

var SRC = $.NSString.stringWithContentsOfFileEncodingError(
  GAME_DIR + "/game.js", $.NSUTF8StringEncoding, null).js;
var G = Function("document", "window", "location", "fetch", "setTimeout", "clearTimeout",
  "Math", "console", "URLSearchParams", "windowObj",
  SRC + "\n;return {startTournament:startTournament, placeAllPawns:placeAllPawns};"
)(doc, win, win.location, win.fetch, win.setTimeout, win.clearTimeout, Math, console, USP, win);

G.startTournament(2, 1);
G.placeAllPawns();

var page = '<!DOCTYPE html><html><head><meta charset="utf-8">' +
  '<link rel="stylesheet" href="style.css"></head><body>' +
  '<div class="board-wrap"><div id="board" class="board">' + markup(getEl("board")) +
  '</div></div></body></html>';

var dest = GAME_DIR + "/_render.html";
$.NSString.stringWithString(page).writeToFileAtomicallyEncodingError(dest, true, $.NSUTF8StringEncoding, null);
"wrote " + dest;
