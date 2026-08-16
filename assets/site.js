/* hexide.io — progressive enhancement only.
   Every page reads completely with this file absent: tab strips stay hidden
   until wired, and the first panel of each is the one served in the markup. */
(function () {
  "use strict";

  /* Generic roving-tabindex tablist. Used by the hero carousel and the
     properties panel — same behaviour, because they are the same control. */
  function wireTabs(list) {
    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
    if (tabs.length < 2) return;
    list.hidden = false;

    function select(next) {
      tabs.forEach(function (t) {
        var on = t === next;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { select(tab); });
      tab.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (d) {
          e.preventDefault();
          var n = tabs[(i + d + tabs.length) % tabs.length];
          n.focus(); select(n);
        } else if (e.key === "Home" || e.key === "End") {
          e.preventDefault();
          var m = tabs[e.key === "Home" ? 0 : tabs.length - 1];
          m.focus(); select(m);
        }
      });
    });
  }

  document.querySelectorAll('[role="tablist"]').forEach(wireTabs);

  /* The description pane, as VB6 does it: it follows the selected row. The text
     is read out of the DOM rather than duplicated here, so the accessible
     description and the visible pane can never disagree. */
  var dt = document.getElementById("desc-t");
  var db = document.getElementById("desc-b");

  function describe(row) {
    if (!dt || !db) return;
    var k = row.dataset.k;
    var source = document.getElementById("d-" + k);
    if (!source) return;
    dt.textContent = row.querySelector(".row__k").textContent;
    db.textContent = source.textContent;
    /* Both grids list the same properties, so keep them in step — otherwise
       switching Alphabetic <-> Categorized silently drops the selection. */
    document.querySelectorAll(".row").forEach(function (r) {
      r.setAttribute("aria-pressed", r.dataset.k === k ? "true" : "false");
    });
  }

  /* Hover is a visual affordance only (.row:hover in CSS). Mutating selection
     state on mouseenter would desynchronise it from focus. */
  document.querySelectorAll(".row").forEach(function (row) {
    row.addEventListener("click", function (e) { e.preventDefault(); describe(row); });
    row.addEventListener("focus", function () { describe(row); });
  });
})();
