// Atif's Arcade — portal behaviour.
//
// Deliberately tiny and dependency-free: the portal is a static page, so this
// only has to reveal the player, point an iframe at a game, and get out of the
// way. Adding another game means adding a card in index.html; nothing here.
(function () {
  "use strict";

  var playerSection = document.getElementById("player-section");
  var playerTitle = document.getElementById("player-title");
  var frame = document.getElementById("player");
  var closeBtn = document.getElementById("player-close");

  function play(src, title) {
    if (!frame) return;
    // The src carries no query string, so this is a fresh load every time and a
    // game can never inherit stale state from the last one played.
    frame.setAttribute("src", src);
    if (playerTitle) playerTitle.textContent = "Playing — " + title;
    if (playerSection) {
      playerSection.hidden = false;
      playerSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function stop() {
    if (frame) frame.removeAttribute("src");   // actually tears the game down
    if (playerSection) playerSection.hidden = true;
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest("[data-target]") : null;
    if (btn && !btn.disabled) play(btn.getAttribute("data-target"), btn.getAttribute("data-label"));
  });

  if (closeBtn) closeBtn.addEventListener("click", stop);

  // Expose a tiny API so a future portal (or a deep link) can drive it.
  window.Arcade = { play: play, stop: stop };
})();
