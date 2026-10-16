// Navigation for the slideshow. State lives in the URL hash: #n or #n/step.
(function () {
  "use strict";

  function parseHash(hash, total, stepsOf) {
    const m = /^#?(\d+)(?:\/(\d+))?$/.exec(hash || "");
    if (!m) return { slide: 1, step: 1 };
    const slide = Math.min(Math.max(parseInt(m[1], 10) || 1, 1), total);
    const step = Math.min(Math.max(parseInt(m[2] || "1", 10) || 1, 1), stepsOf(slide));
    return { slide, step };
  }

  // Keys belong to a focused link, button or field, not to the deck.
  function isControlTarget(el) {
    return !!(el && el.closest && el.closest("a, button, input, textarea, select"));
  }

  // Browsers do not synthesise a click after a pan, but a quick tap right after a swipe is noise.
  function clickFollowsSwipe(now, lastSwipe) {
    return lastSwipe > 0 && now - lastSwipe < 400;
  }

  if (typeof module !== "undefined") { module.exports = { parseHash, isControlTarget, clickFollowsSwipe }; return; }

  const deck = document.getElementById("deck");
  const slides = Array.from(deck.querySelectorAll(".slide"));
  const total = slides.length;
  const stepsOf = (i) => parseInt(slides[i - 1].dataset.steps, 10) || 1;
  const hud = { chapter: document.getElementById("chapter"), counter: document.getElementById("counter") };
  const grid = document.getElementById("grid");
  let cur = { slide: 1, step: 1 };

  function show({ slide, step }) {
    cur = { slide, step };
    slides.forEach((el, i) => {
      const on = i + 1 === slide;
      el.classList.toggle("current", on);
      if (!on) return;
      // Build steps accumulate; the timeline dot and the notes belong to exactly one step.
      el.querySelectorAll("[data-step]").forEach((n) => {
        const k = parseInt(n.dataset.step, 10);
        const exact = n.closest(".timeline, .notes");
        n.classList.toggle("off", exact ? k !== step : k > step);
      });
    });
    const el = slides[slide - 1];
    fitHeadlines(el);
    hud.chapter.textContent = el.dataset.chapter;
    hud.counter.textContent = slide + " / " + total;
    const head = el.querySelector("h1, blockquote");
    const headText = head ? Array.from(head.childNodes).map((n) => (n.nodeName === "BR" ? " " : n.textContent)).join("").replace(/\s+/g, " ").trim() : "";
    document.title = (headText || "Who Was Satoshi?") + " — Who Was Satoshi?";
    // Warm the neighbours' images.
    [slide, slide + 1, slide + 2].forEach((n) => slides[n - 1]?.querySelectorAll("img[loading=lazy]").forEach((img) => (img.loading = "eager")));
    grid.querySelectorAll("a").forEach((a, i) => a.classList.toggle("current", i + 1 === slide));
  }

  // Headlines shrink until they fit the stage width: fixed-break and nowrap ones as a whole,
  // wrapping ones when a single word is wider than the column (scrollWidth still reports it).
  function fitHeadlines(el) {
    el.querySelectorAll("h1, blockquote").forEach((h) => {
      h.style.fontSize = "";
      const max = parseFloat(getComputedStyle(h).fontSize);
      let size = max;
      while (h.scrollWidth > h.clientWidth + 1 && size > max * 0.4) {
        size -= max * 0.03;
        h.style.fontSize = size + "px";
      }
    });
  }
  window.addEventListener("resize", () => fitHeadlines(slides[cur.slide - 1]));

  function go(slide, step = 1, replace = false) {
    const h = "#" + slide + (step > 1 ? "/" + step : "");
    if (replace) history.replaceState(null, "", h); else location.hash = h;
    show(parseHash(h, total, stepsOf));
  }

  function next() {
    if (cur.step < stepsOf(cur.slide)) return go(cur.slide, cur.step + 1);
    if (cur.slide < total) go(cur.slide + 1);
  }
  function prev() {
    if (cur.step > 1) return go(cur.slide, cur.step - 1);
    if (cur.slide > 1) go(cur.slide - 1, stepsOf(cur.slide - 1));
  }

  window.addEventListener("hashchange", () => show(parseHash(location.hash, total, stepsOf)));
  show(parseHash(location.hash, total, stepsOf));
  if (!/^#\d/.test(location.hash)) history.replaceState(null, "", "#1");

  // Keyboard.
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if ((e.key === "Enter" || e.key === " ") && isControlTarget(e.target)) return; // activate the control instead
    switch (e.key) {
      case "ArrowRight": case "ArrowDown": case " ": case "PageDown": case "Enter": e.preventDefault(); if (grid.hidden) next(); break;
      case "ArrowLeft": case "ArrowUp": case "PageUp": case "Backspace": e.preventDefault(); if (grid.hidden) prev(); break;
      case "Home": e.preventDefault(); go(1); break;
      case "End": e.preventDefault(); go(total); break;
      case "n": case "N": document.body.classList.toggle("show-notes"); break;
      case "Escape": toggleGrid(); break;
    }
  });

  // Click / tap: right half forward, left half back. Ignore the hud, notes, links.
  let lastSwipe = 0;
  deck.addEventListener("click", (e) => {
    if (e.target.closest("a, button, .notes") || clickFollowsSwipe(Date.now(), lastSwipe)) return;
    if (e.clientX > window.innerWidth / 2) next(); else prev();
  });

  // Swipe.
  let touch = null;
  deck.addEventListener("touchstart", (e) => { touch = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
  deck.addEventListener("touchend", (e) => {
    if (!touch) return;
    const dx = e.changedTouches[0].clientX - touch.x, dy = e.changedTouches[0].clientY - touch.y;
    touch = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { lastSwipe = Date.now(); dx < 0 ? next() : prev(); }
  });

  // Wheel: one slide per gesture. Trackpads emit bursts; ignore events for 700ms after one fires.
  let wheelLock = 0;
  window.addEventListener("wheel", (e) => {
    if (e.target.closest(".notes, #grid")) return;
    const now = Date.now();
    if (now < wheelLock || Math.abs(e.deltaY) < 8) return;
    wheelLock = now + 700;
    e.deltaY > 0 ? next() : prev();
  }, { passive: true });

  // Hud buttons and grid.
  document.getElementById("notes-btn").addEventListener("click", () => document.body.classList.toggle("show-notes"));
  document.getElementById("grid-btn").addEventListener("click", toggleGrid);
  function toggleGrid() { grid.hidden = !grid.hidden; if (!grid.hidden) grid.querySelector("a.current")?.scrollIntoView({ block: "center" }); }
  grid.addEventListener("click", (e) => { if (e.target.closest("a")) grid.hidden = true; });
})();
