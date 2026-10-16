# satoshi.study Web Slideshow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the "Who Was Satoshi?" deck as a full-screen web slideshow at https://satoshi.study, generated from the same `build/content.js` as the .pptx.

**Architecture:** A Node generator (`build/site.js`) reads `content.js`, collapses the three build sequences into stepped slides, and writes `site/index.html` (one `<section>` per slide, notes inline). Hand-written `site/style.css` and `site/app.js` provide the look and the navigation. GitHub Pages serves `site/` from the public repo `frkrueger/satoshi.study`.

**Tech Stack:** Node 22 (built-in `node:test`), plain HTML/CSS/JS, GitHub Pages via `gh`. No npm dependencies for the site.

**Spec:** `docs/superpowers/specs/2026-10-15-satoshi-study-site-design.md`

## Global Constraints

- Colours exactly as the deck: bg `#000000`, white `#FFFFFF`, soft `#AEAEB2`, grey `#8E8E93`, dim `#48484A`, hair `#2C2C2E`, orange `#F7931A`.
- Font stack: `"Helvetica Neue", Helvetica, Arial, system-ui, sans-serif`; mono `Menlo, "SF Mono", Consolas, monospace`.
- Timeline spans 1972 → 2014 along the bottom of every slide.
- `*text*` in content = orange `<em>`; `\n` = `<br>`.
- No runtime dependencies, no framework, no build step beyond `node build/site.js`.
- `site/` is committed (Pages serves it as-is). `site/CNAME` contains `satoshi.study`.
- Public repo `frkrueger/satoshi.study`, Pages source branch `main`, folder `/site`.
- Generator fails loudly on an unknown slide type or a missing image.

## Review Focus

1. Text containing `&`, `<`, `’` or an unmatched `*` must render literally, never as broken markup → test in Task 2 (`inline`).
2. A hash like `#999`, `#0`, `#abc`, or `#12/9` must land on a sane slide/step instead of a blank screen → test in Task 6 (`parseHash`).
3. A trackpad "wheel" burst must advance one slide, not five → wheel debounce in Task 6, verified in Task 8 by hand.
4. A slide whose scene has no entry in `original-notes.md` must fail the build, not emit "undefined" → test in Task 2 (`notesFor`).
5. Portrait phone: photo slides must not overflow horizontally and the text must stay readable → screenshot check in Task 8 at 390×844.

---

### Task 1: Extract the notes logic into a shared module

**Files:**
- Create: `build/notes.js`
- Modify: `build/build.js:56-85` (replace `parseOriginalNotes`/`notesFor` with a require)
- Test: `build/test/notes.test.js`

**Interfaces:**
- Produces: `module.exports = { notesFor(slide) → string, ORIGINAL: {sceneNumber: {narrative, source}} }`. `notesFor` throws `Error("no original notes for scene N")` when `slide.scene` has no entry.

- [ ] **Step 1: Write the failing test**

```js
// build/test/notes.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { notesFor, ORIGINAL } = require("../notes.js");

test("ORIGINAL has 58 scenes with narrative and source", () => {
  assert.equal(Object.keys(ORIGINAL).length, 58);
  assert.match(ORIGINAL[1].narrative, /Hal Finney was a mathematically gifted teenager/);
  assert.match(ORIGINAL[1].source, /Photo attribution/);
});

test("notesFor prefers explicit notes, then say, then the original narrative", () => {
  assert.equal(notesFor({ notes: "X" }), "X");
  assert.match(notesFor({ scene: 1, say: "Custom." }), /^Custom\.\n\nSource: /);
  assert.match(notesFor({ scene: 1 }), /^In 1972, Hal Finney/);
  assert.match(notesFor({ scene: 1 }), /\(Original scene 1\)$/);
  assert.equal(notesFor({}), "");
});

test("notesFor throws on a scene with no original notes", () => {
  assert.throws(() => notesFor({ scene: 999 }), /no original notes for scene 999/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd build && node --test test/`
Expected: FAIL with "Cannot find module '../notes.js'"

- [ ] **Step 3: Create `build/notes.js`**

```js
// The original deck's presenter notes, extracted verbatim to source/original-notes.md,
// and the rule for which text becomes a slide's notes. Shared by build.js and site.js.
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

function parseOriginalNotes() {
  const md = fs.readFileSync(path.join(ROOT, "source/original-notes.md"), "utf8");
  const scenes = {};
  for (const block of md.split(/\n## Slide /).slice(1)) {
    const n = parseInt(block, 10);
    const paras = block.split("\n").map((l) => l.trim()).filter(Boolean).slice(1);
    const iN = paras.indexOf("NARRATIVE");
    const iS = paras.indexOf("SOURCE AND INTERPRETATION");
    const narrative = paras.slice(iN + 1, iS).join("\n\n");
    const source = paras
      .slice(iS + 1)
      .filter((p) => !p.startsWith("The photograph/document") && !p.startsWith("PRESENTATION GUIDANCE"))
      .join(" ");
    scenes[n] = { narrative, source };
  }
  return scenes;
}
const ORIGINAL = parseOriginalNotes();

// notes > say + source > original narrative + source. Scenes without notes are an error.
function notesFor(s) {
  if (s.notes) return s.notes;
  if (!s.scene) return "";
  const o = ORIGINAL[s.scene];
  if (!o) throw new Error(`no original notes for scene ${s.scene}`);
  const say = s.say ?? o.narrative;
  return `${say}\n\nSource: ${o.source}\n\n(Original scene ${s.scene})`;
}

module.exports = { notesFor, ORIGINAL };
```

- [ ] **Step 4: Point `build.js` at it**

In `build/build.js`, delete the block from the comment `// ---------------------------------------------------------------- notes source` through the closing `}` of `notesFor` (lines 56–85) and put in its place:

```js
// ---------------------------------------------------------------- notes source
const { notesFor } = require("./notes.js");
```

- [ ] **Step 5: Run tests and the deck build to verify nothing broke**

Run: `cd build && node --test test/ && node build.js /tmp/check.pptx`
Expected: 3 tests pass; `wrote /tmp/check.pptx (87 slides)`.

- [ ] **Step 6: Commit**

```bash
git add build/notes.js build/build.js build/test/notes.test.js
git commit -m "build: share notes logic between deck and site"
```

---

### Task 2: Generator core — inline markup, slide grouping, page shell

**Files:**
- Create: `build/site.js`
- Test: `build/test/site.test.js`

**Interfaces:**
- Produces (exported from `build/site.js`):
  - `inline(text) → string` — HTML-escapes, `*x*` → `<em>x</em>`, `\n` → `<br>`.
  - `esc(text) → string` — HTML escape only.
  - `group(slides) → Slide[]` where each Slide is `{ ...firstEntry, steps: [entry, ...] }`. Consecutive entries of type `nonce`, `network` or `gap` collapse into one Slide; every other entry becomes a Slide with `steps: [entry]`.
  - `chapterOf(slides, i) → string` — the `section` of the nearest preceding entry that has one, with the chapter numeral stripped ("The Mathematician").
  - `render(slides) → string` — the whole `index.html`. Calls `renderSlide` from Task 3 for each slide.
  - `build(outDir)` — writes `index.html`, copies images; only runs when the file is executed directly.

- [ ] **Step 1: Write the failing tests**

```js
// build/test/site.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { inline, esc, group, chapterOf } = require("../site.js");

test("inline escapes HTML and marks highlights and breaks", () => {
  assert.equal(inline("A *B* C"), "A <em>B</em> C");
  assert.equal(inline("Who was\nSatoshi*?*"), "Who was<br>Satoshi<em>?</em>");
  assert.equal(inline("Tom & Jerry <3 ’quotes’"), "Tom &amp; Jerry &lt;3 ’quotes’");
  assert.equal(inline("5 * 3"), "5 * 3", "an unmatched star stays literal");
  assert.equal(inline(undefined), "");
});

test("esc only escapes", () => {
  assert.equal(esc("*a* & b"), "*a* &amp; b");
});

test("group collapses consecutive build sequences into stepped slides", () => {
  const slides = [
    { type: "statement", title: "a" },
    { type: "nonce", rows: 1 }, { type: "nonce", rows: 2 }, { type: "nonce", rows: 3 },
    { type: "person", title: "b" },
    { type: "network", full: false }, { type: "network", full: true },
    { type: "gap", step: 1 }, { type: "gap", step: 2 }, { type: "gap", step: 3 },
  ];
  const g = group(slides);
  assert.equal(g.length, 5);
  assert.equal(g[1].type, "nonce"); assert.equal(g[1].steps.length, 3);
  assert.equal(g[3].steps.length, 2);
  assert.equal(g[4].steps.length, 3);
  assert.equal(g[0].steps.length, 1);
});

test("group of the real deck yields 82 slides", () => {
  const content = require("../content.js");
  assert.equal(content.length, 87);
  assert.equal(group(content).length, 82);
});

test("chapterOf strips the numeral", () => {
  const slides = [{ section: "Opening" }, { section: "I · The Mathematician" }, {}, { section: "IV · RPOW" }, {}];
  assert.equal(chapterOf(slides, 0), "Opening");
  assert.equal(chapterOf(slides, 2), "The Mathematician");
  assert.equal(chapterOf(slides, 4), "RPOW");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd build && node --test test/site.test.js`
Expected: FAIL with "Cannot find module '../site.js'"

- [ ] **Step 3: Write `build/site.js` (core; `renderSlide` is added in Task 3)**

```js
// Generates ../site/index.html (the web slideshow) from content.js.
//
//   node site.js            → ../site/index.html + ../site/img/
//
// One <section class="slide"> per slide. Build sequences (nonce / network / gap)
// become one section with data-steps; elements inside carry data-step="k" and
// app.js reveals them as the viewer advances. Notes live inline in each section.

const fs = require("fs");
const path = require("path");
const { notesFor } = require("./notes.js");

const ROOT = path.resolve(__dirname, "..");
const TL = { from: 1972, to: 2014 };
const SEQUENCE_TYPES = new Set(["nonce", "network", "gap"]);

// ---------------------------------------------------------------- text
function esc(t) {
  return String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// *text* → <em>, \n → <br>. Pairs of stars only; a lone star stays.
function inline(t) {
  if (t == null) return "";
  return esc(t).replace(/\*([^*\n]+)\*/g, "<em>$1</em>").replace(/\n/g, "<br>");
}

// ---------------------------------------------------------------- structure
function group(slides) {
  const out = [];
  for (const s of slides) {
    const last = out[out.length - 1];
    if (last && SEQUENCE_TYPES.has(s.type) && last.type === s.type) last.steps.push(s);
    else out.push({ ...s, steps: [s] });
  }
  return out;
}

function chapterOf(slides, i) {
  for (let j = i; j >= 0; j--) {
    if (slides[j].section) return slides[j].section.replace(/^[IVX]+ · /, "");
  }
  return "";
}

const pct = (year) => (((year - TL.from) / (TL.to - TL.from)) * 100).toFixed(2);

// ---------------------------------------------------------------- shell
function timeline(slide) {
  const dots = slide.steps
    .map((st, k) => (st.t ? `<i class="dot" data-step="${k + 1}" style="left:${pct(st.t)}%"></i>` : ""))
    .join("");
  const range = slide.range
    ? `<i class="range" style="left:${pct(slide.range[0])}%;width:${(pct(slide.range[1]) - pct(slide.range[0])).toFixed(2)}%"></i>`
    : "";
  return `<div class="timeline"><span class="from">${TL.from}</span>${range}${dots}<span class="to">${TL.to}</span></div>`;
}

function notes(slide) {
  const parts = slide.steps.map((st, k) => {
    const n = notesFor(st);
    const paras = n.split(/\n\n+/).filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join("");
    return `<div data-step="${k + 1}">${paras || "<p class=\"none\">No notes for this slide.</p>"}</div>`;
  });
  return `<aside class="notes">${parts.join("")}</aside>`;
}

function section(slide, i, chapter, body) {
  return `<section class="slide slide-${slide.type}" id="s${i + 1}" data-steps="${slide.steps.length}" data-chapter="${esc(chapter)}">
<div class="stage">${body}</div>
${timeline(slide)}
${notes(slide)}
</section>`;
}

function render(content) {
  const slides = group(content);
  const sections = slides.map((slide, i) => section(slide, i, chapterOf(slides, i), renderSlide(slide)));
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Who Was Satoshi?</title>
<meta name="description" content="A historical investigation: the road to Bitcoin, 1972–2014.">
<meta property="og:title" content="Who Was Satoshi?">
<meta property="og:description" content="A historical investigation: the road to Bitcoin, 1972–2014.">
<meta name="theme-color" content="#000000">
<link rel="stylesheet" href="style.css">
</head>
<body>
<main id="deck" data-total="${slides.length}">
${sections.join("\n")}
</main>
<div id="hud">
  <span id="chapter"></span>
  <span id="counter"></span>
  <button id="notes-btn" type="button" title="Notes (N)">Notes</button>
  <button id="grid-btn" type="button" title="All slides (Esc)">⋮⋮</button>
</div>
<nav id="grid" hidden>
${slides.map((s, i) => `<a href="#${i + 1}"><b>${i + 1}</b> <span class="k">${esc(s.kicker || "")}</span><br>${inline((s.title || s.quote || "").replace(/\n/g, " "))}</a>`).join("\n")}
</nav>
<script src="app.js"></script>
</body>
</html>
`;
}

// ---------------------------------------------------------------- slide types (Task 3)
let renderSlide = () => "";

// ---------------------------------------------------------------- build
function build(outDir = path.join(ROOT, "site")) {
  const content = require("./content.js");
  const imgDir = path.join(outDir, "img");
  fs.mkdirSync(imgDir, { recursive: true });
  for (const s of content) {
    if (!s.image) continue;
    const src = path.join(ROOT, "assets", s.image);
    if (!fs.existsSync(src)) throw new Error(`missing image: assets/${s.image}`);
    fs.copyFileSync(src, path.join(imgDir, s.image));
  }
  const html = render(content);
  fs.writeFileSync(path.join(outDir, "index.html"), html);
  console.log(`wrote ${path.join(outDir, "index.html")} (${group(content).length} slides)`);
}

module.exports = { inline, esc, group, chapterOf, render, build, setRenderSlide: (f) => (renderSlide = f) };

if (require.main === module) build(process.argv[2] ? path.resolve(process.argv[2]) : undefined);
```

Note: `setRenderSlide` is a temporary seam; Task 3 replaces the `let renderSlide` line with the real function and removes `setRenderSlide` from the exports.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd build && node --test test/`
Expected: all pass (3 notes + 5 site).

- [ ] **Step 5: Commit**

```bash
git add build/site.js build/test/site.test.js
git commit -m "site: generator core — inline markup, sequence grouping, page shell"
```

---

### Task 3: Slide templates for all thirteen types

**Files:**
- Modify: `build/site.js` (replace the `let renderSlide` placeholder)
- Test: `build/test/site.test.js` (append)

**Interfaces:**
- Produces: `renderSlide(slide) → string` (HTML for the `.stage` contents). Throws `Error("unknown slide type: X")`.
- Markup contract consumed by Task 4 (CSS) and Task 6 (JS):
  - Every stage has `<p class="kicker">`; headlines are `<h1>`; supporting lines `<p class="sub">`.
  - Stepped elements carry `data-step="k"` (1-based). Elements without it are always visible.
  - Photo: `<figure class="photo"><img …></figure>` beside `<div class="text">`.
  - Person: `<div class="portrait">` containing `<img>` or `<span class="no-photo">`.

- [ ] **Step 1: Append failing tests**

```js
// append to build/test/site.test.js
const { render } = require("../site.js");
const content = require("../content.js");

test("render covers every slide and every image", () => {
  const html = render(content);
  assert.equal((html.match(/<section class="slide /g) || []).length, 82);
  for (const s of content) if (s.image) assert.ok(html.includes(`src="img/${s.image}"`), s.image);
  assert.ok(!html.includes("undefined"), "no 'undefined' leaked into the page");
  assert.ok(!html.includes("[object Object]"));
});

test("stepped slides expose each step", () => {
  const html = render(content);
  const nonce = html.match(/<section class="slide slide-nonce"[\s\S]*?<\/section>/)[0];
  assert.match(nonce, /data-steps="3"/);
  assert.match(nonce, /class="row" data-step="3"/);
  assert.match(nonce, /0000ab72/);
  const net = html.match(/<section class="slide slide-network"[\s\S]*?<\/section>/)[0];
  assert.match(net, /data-steps="2"/);
  assert.match(net, /Len Sassaman/);
  const gap = html.match(/<section class="slide slide-gap"[\s\S]*?<\/section>/)[0];
  assert.match(gap, /data-steps="3"/);
  assert.match(gap, /Oct 31 · The whitepaper/);
});

test("render throws on an unknown type", () => {
  assert.throws(() => render([{ type: "banana", kicker: "x" }]), /unknown slide type: banana/);
});

test("person without a photo gets the dashed placeholder", () => {
  const html = render([{ type: "person", kicker: "k", title: "Wei Dai", sub: "s" }]);
  assert.match(html, /class="no-photo"/);
  assert.match(html, /No verified<br>public photograph/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd build && node --test test/site.test.js`
Expected: the four new tests FAIL (sections render empty / no throw).

- [ ] **Step 3: Replace the placeholder with the templates**

Replace the line `let renderSlide = () => "";` in `build/site.js` with:

```js
const kicker = (t) => (t ? `<p class="kicker">${inline(t)}</p>` : "");
const h1 = (t, cls = "", style = "") => (t ? `<h1 class="${cls}"${style ? ` style="${style}"` : ""}>${inline(t)}</h1>` : "");
const sub = (t, cls = "sub") => (t ? `<p class="${cls}">${inline(t)}</p>` : "");

// Deck point sizes map to CSS via --u (1 deck pt). Custom sizes pass through as a style.
const fsize = (pt) => (pt ? `font-size:calc(${pt} * var(--u))` : "");

const TYPES = {
  title: (s) => kicker(s.kicker) + h1(s.title, "display") + sub(s.sub),
  chapter: (s) => kicker(s.kicker) + h1(s.title, "display") + sub(s.sub),
  figure: (s) => kicker(s.kicker) + h1(s.title, "figure", fsize(s.size)) + sub(s.sub),
  statement: (s) => kicker(s.kicker) + h1(s.title, "statement", fsize(s.size)) + sub(s.sub, "sub") ,
  photo: (s) =>
    `<div class="text">${kicker(s.kicker)}${h1(s.title)}${sub(s.sub)}</div>` +
    `<figure class="photo"><img src="img/${esc(s.image)}" alt="" loading="lazy"></figure>`,
  person: (s) =>
    `<div class="portrait">${
      s.image
        ? `<img src="img/${esc(s.image)}" alt="" loading="lazy">`
        : `<span class="no-photo">${inline(s.noImage || "No verified\npublic photograph")}</span>`
    }</div><div class="text">${kicker(s.kicker)}${h1(s.title)}${sub(s.sub)}</div>`,
  quote: (s) =>
    kicker(s.kicker) +
    `<blockquote${s.size ? ` style="${fsize(s.size)}"` : ""}>${inline(s.quote)}</blockquote>` +
    `<cite>${inline(s.by)}</cite>`,
  list: (s) => kicker(s.kicker) + `<ul>${s.items.map((t) => `<li>${inline(t)}</li>`).join("")}</ul>`,
  refs: (s) =>
    kicker(s.kicker) + h1(s.title) +
    `<table class="refs">${s.items
      .map(([n, who, what, yr]) => `<tr><td class="n">[${n}]</td><td class="who">${esc(who)}</td><td class="what">${esc(what)}</td><td class="yr">${esc(yr)}</td></tr>`)
      .join("")}</table>`,
  hypothesis: (s) =>
    kicker(s.kicker) +
    `<div class="hyp"><div class="lead">Hal Finney</div><div class="plus">+</div>` +
    `<div class="others"><p class="small-kicker">One or more of</p><div class="names">Len Sassaman<br>Nick Szabo<br>Wei Dai</div></div></div>` +
    sub(s.sub),

  // Hashcash: one row per step; the third row hits the target.
  nonce: (s) => {
    const rows = [["001", "a91e52f8…", false], ["002", "7b31ca09…", false], ["003", "0000ab72…", true]];
    const last = s.steps[s.steps.length - 1];
    return (
      kicker(s.kicker) + h1(s.title) +
      `<div class="rows">${rows
        .slice(0, s.steps.length)
        .map(([n, hash, hit], i) =>
          `<div class="row" data-step="${i + 1}"><span class="nonce">nonce ${n}</span><span class="fn">SHA-1 →</span>` +
          `<span class="hash${hit ? " hit" : ""}">${hash}</span><span class="mark${hit ? " hit" : ""}">${hit ? "✓" : "×"}</span></div>`)
        .join("")}</div>` +
      (last.sub ? `<p class="sub" data-step="${s.steps.length}">${inline(last.sub)}</p>` : "")
    );
  },

  // Hal at the centre; the five others appear on step 2. Drawn in a 960×540 viewBox.
  network: (s) => {
    const cx = 480, cy = 250, rx = 320, ry = 150;
    const people = [
      ["Wei Dai", "met and corresponded", -90],
      ["Nick Szabo", "met and corresponded", -18],
      ["Adam Back", "exchanged ideas", 54],
      ["Len Sassaman", "professional circle", 126],
      ["Phil Zimmermann", "professional circle", 198],
    ];
    const nodes = people.map(([name, rel, deg]) => {
      const a = (deg * Math.PI) / 180, nx = cx + rx * Math.cos(a), ny = cy + ry * Math.sin(a);
      // Shorten the spoke so it starts outside the hub label and ends outside the name.
      const dx = nx - cx, dy = ny - cy, len = Math.hypot(dx, dy);
      const x1 = cx + (dx / len) * 110, y1 = cy + (dy / len) * 40;
      const x2 = nx - (dx / len) * 90, y2 = ny - (dy / len) * (dy < 0 ? 45 : 30);
      return `<g data-step="2"><line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>` +
        `<text class="name" x="${nx.toFixed(1)}" y="${ny.toFixed(1)}">${esc(name)}</text>` +
        `<text class="rel" x="${nx.toFixed(1)}" y="${(ny + 26).toFixed(1)}">${esc(rel)}</text></g>`;
    });
    return kicker(s.kicker) +
      `<svg class="network" viewBox="0 0 960 540" aria-label="Hal Finney's circle">` +
      `<text class="hub" x="${cx}" y="${cy}">Hal Finney</text>${nodes.join("")}</svg>`;
  },

  // The Crypto++ commit gap as a bar from Feb 2 to Nov 21, 2008. Steps add the end, then Satoshi's dates.
  gap: (s) => {
    const day = (d) => (((d - 33) / (326 - 33)) * 100).toFixed(2); // day-of-year 2008
    const events = [[233, "Aug 20 · Satoshi writes to Adam Back"], [305, "Oct 31 · The whitepaper"]];
    return kicker(s.kicker) +
      `<div class="gapbar">` +
      `<i class="line" data-step="2"></i><i class="dot start"></i><i class="dot end" data-step="2"></i>` +
      `<div class="from"><b>Feb 2, 2008</b><span>last recorded commit</span></div>` +
      `<div class="len" data-step="2">9+ months</div>` +
      `<div class="to" data-step="2"><b>Nov 21, 2008</b><span>commits resume</span></div>` +
      events.map(([d, txt], i) =>
        `<div class="event e${i}" data-step="3" style="left:${day(d)}%"><span>${esc(txt)}</span><i></i></div>`).join("") +
      `</div>` +
      `<p class="caption">Reported by Ben Sigman. Individual SVN revisions require independent verification.</p>`;
  },
};

function renderSlide(slide) {
  const f = TYPES[slide.type];
  if (!f) throw new Error(`unknown slide type: ${slide.type}`);
  return f(slide);
}
```

Then change the exports line to:

```js
module.exports = { inline, esc, group, chapterOf, render, renderSlide, build };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd build && node --test test/`
Expected: all pass.

- [ ] **Step 5: Build the site and eyeball the HTML**

Run: `cd build && node site.js && ls -la ../site ../site/img | head -20 && grep -c '<section' ../site/index.html`
Expected: `wrote …/site/index.html (82 slides)`, 15 images in `site/img`, `82`.

- [ ] **Step 6: Commit**

```bash
git add build/site.js build/test/site.test.js site/index.html site/img
git commit -m "site: templates for all thirteen slide types"
```

---

### Task 4: Stylesheet

**Files:**
- Create: `site/style.css`

**Interfaces:**
- Consumes the markup contract from Task 3 and these class toggles set by Task 6's `app.js`: `.slide.current`, `[data-step].off` (hidden step), `body.show-notes`, `#grid[hidden]`.
- `--u` is one deck point: the 960×540 design box scaled to fit the viewport.

- [ ] **Step 1: Write `site/style.css`**

```css
/* Who Was Satoshi? — web slideshow. Black, Helvetica Neue, one orange. */
:root {
  --bg: #000; --white: #fff; --soft: #aeaeb2; --grey: #8e8e93; --dim: #48484a; --hair: #2c2c2e; --orange: #f7931a;
  --sans: "Helvetica Neue", Helvetica, Arial, system-ui, sans-serif;
  --mono: Menlo, "SF Mono", Consolas, monospace;
  /* 1 deck point. The deck is 960 × 540 pt; fit that box in the viewport. */
  --u: min(100vw / 960, 100dvh / 540);
  --mx: calc(72 * var(--u));   /* 1in side margin */
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; background: var(--bg); color: var(--white); font-family: var(--sans); overflow: hidden; }
em { font-style: normal; color: var(--orange); }
img { display: block; max-width: 100%; }

/* ---------------------------------------------------------------- deck */
#deck { position: relative; width: 100vw; height: 100dvh; }
.slide { position: absolute; inset: 0; display: none; }
.slide.current { display: block; animation: fade .25s ease-out; }
@keyframes fade { from { opacity: 0 } to { opacity: 1 } }
[data-step].off { visibility: hidden; }

.stage {
  position: absolute; left: var(--mx); right: var(--mx);
  top: calc(40 * var(--u)); bottom: calc(80 * var(--u));
  display: flex; flex-direction: column; justify-content: center;
}

/* ---------------------------------------------------------------- type */
.kicker { font-weight: 700; font-size: calc(18 * var(--u)); letter-spacing: .17em; text-transform: uppercase; color: var(--orange); }
h1 { font-weight: 700; line-height: .95; letter-spacing: -.01em; margin-top: calc(8 * var(--u)); font-size: calc(92 * var(--u)); }
h1.display { font-size: calc(132 * var(--u)); }
.slide-chapter h1.display { font-size: calc(116 * var(--u)); }
h1.figure { font-size: calc(200 * var(--u)); line-height: .9; }
.sub { font-weight: 300; color: var(--soft); line-height: 1.15; margin-top: calc(28 * var(--u)); font-size: calc(30 * var(--u)); max-width: 28em; }
.slide-statement .sub { font-size: calc(36 * var(--u)); }
.slide-title .sub, .slide-chapter .sub { font-size: calc(30 * var(--u)); }

/* photo: text left, image right */
.slide-photo .stage { flex-direction: row; align-items: center; gap: calc(40 * var(--u)); }
.slide-photo .text { flex: 1 1 55%; }
.slide-photo h1 { font-size: calc(60 * var(--u)); }
.slide-photo .sub { font-size: calc(26 * var(--u)); }
.slide-photo .photo { flex: 0 1 45%; max-height: 100%; display: flex; justify-content: flex-end; }
.slide-photo .photo img { max-height: calc(420 * var(--u)); object-fit: contain; }

/* person: circular portrait left */
.slide-person .stage { flex-direction: row; align-items: center; gap: calc(54 * var(--u)); }
.portrait { flex: 0 0 calc(238 * var(--u)); width: calc(238 * var(--u)); height: calc(238 * var(--u)); border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; }
.portrait img { width: 100%; height: 100%; object-fit: cover; }
.portrait .no-photo { width: 100%; height: 100%; border: calc(1.5 * var(--u)) dashed var(--dim); border-radius: 50%; display: flex; align-items: center; justify-content: center; text-align: center; font-size: calc(16 * var(--u)); color: var(--grey); }
.slide-person h1 { font-size: calc(96 * var(--u)); }

/* quote */
blockquote { font-weight: 300; font-size: calc(54 * var(--u)); line-height: 1.1; margin-top: calc(24 * var(--u)); max-width: 95%; }
blockquote em { font-weight: 500; }
cite { display: block; font-style: normal; font-weight: 300; color: var(--grey); font-size: calc(22 * var(--u)); margin-top: calc(30 * var(--u)); }

/* list */
.slide-list ul { list-style: none; margin-top: calc(26 * var(--u)); }
.slide-list li { font-weight: 300; font-size: calc(40 * var(--u)); line-height: 1.05; margin-top: calc(22 * var(--u)); }
.slide-list li em { font-weight: 500; }

/* refs */
.slide-refs h1 { font-size: calc(64 * var(--u)); }
table.refs { border-collapse: collapse; margin-top: calc(40 * var(--u)); font-size: calc(22 * var(--u)); line-height: 1.75; width: 100%; }
table.refs td { padding: 0 calc(16 * var(--u)) 0 0; vertical-align: top; white-space: nowrap; }
table.refs .n { color: var(--dim); }
table.refs .who { font-weight: 500; }
table.refs .what { color: var(--soft); white-space: normal; width: 100%; }
table.refs .yr { color: var(--grey); text-align: right; padding-right: 0; }

/* hypothesis */
.hyp { display: flex; align-items: center; gap: calc(40 * var(--u)); margin: calc(30 * var(--u)) 0; }
.hyp .lead { font-weight: 700; font-size: calc(80 * var(--u)); }
.hyp .plus { font-weight: 700; font-size: calc(110 * var(--u)); color: var(--orange); }
.hyp .small-kicker { font-weight: 700; font-size: calc(15 * var(--u)); letter-spacing: .2em; text-transform: uppercase; color: var(--grey); }
.hyp .names { font-weight: 700; font-size: calc(54 * var(--u)); color: var(--soft); line-height: 1; margin-top: calc(12 * var(--u)); }
.slide-hypothesis .sub { font-size: calc(32 * var(--u)); }

/* nonce */
.slide-nonce h1 { font-size: calc(64 * var(--u)); }
.rows { margin-top: calc(32 * var(--u)); font-family: var(--mono); font-size: calc(38 * var(--u)); }
.row { display: grid; grid-template-columns: 3.4fr 2.8fr 4.2fr 1fr; height: calc(61 * var(--u)); align-items: center; }
.row .nonce { color: var(--grey); }
.row .fn { color: var(--dim); }
.row .hash.hit { color: var(--orange); font-weight: 700; }
.row .mark { color: var(--dim); text-align: right; }
.row .mark.hit { color: var(--orange); }
.slide-nonce .sub { margin-top: calc(40 * var(--u)); }

/* network (SVG in deck points) */
svg.network { width: 100%; height: calc(440 * var(--u)); margin-top: calc(10 * var(--u)); font-family: var(--sans); }
svg.network line { stroke: var(--dim); stroke-width: 1.25; }
svg.network text { fill: var(--white); text-anchor: middle; dominant-baseline: middle; }
svg.network .hub { fill: var(--orange); font-size: 46px; font-weight: 700; }
svg.network .name { font-size: 32px; font-weight: 700; }
svg.network .rel { fill: var(--grey); font-size: 18px; }

/* commit gap */
.gapbar { position: relative; height: calc(150 * var(--u)); margin-top: calc(150 * var(--u)); }
.gapbar .line { position: absolute; left: 0; right: 0; top: 0; height: calc(3 * var(--u)); background: var(--orange); }
.gapbar .dot { position: absolute; top: 0; width: calc(16 * var(--u)); height: calc(16 * var(--u)); border-radius: 50%; background: var(--orange); transform: translate(-50%, -45%); }
.gapbar .dot.start { left: 0; } .gapbar .dot.end { left: 100%; }
.gapbar .from, .gapbar .to, .gapbar .len { position: absolute; top: calc(22 * var(--u)); font-weight: 700; font-size: calc(40 * var(--u)); line-height: 1.2; }
.gapbar .from { left: 0; } .gapbar .to { right: 0; text-align: right; }
.gapbar .len { left: 50%; transform: translateX(-50%); color: var(--orange); }
.gapbar .from span, .gapbar .to span { display: block; font-weight: 300; font-size: calc(20 * var(--u)); color: var(--grey); }
.gapbar .event { position: absolute; bottom: 100%; width: 0; }
.gapbar .event span { position: absolute; right: calc(10 * var(--u)); white-space: nowrap; font-size: calc(20 * var(--u)); }
.gapbar .event i { position: absolute; left: 0; width: 1px; background: var(--soft); }
.gapbar .event::after { content: ""; position: absolute; left: 0; bottom: calc(-8 * var(--u)); width: calc(12 * var(--u)); height: calc(12 * var(--u)); border-radius: 50%; background: var(--white); transform: translate(-50%, 0); }
.gapbar .e0 span { bottom: calc(60 * var(--u)); } .gapbar .e0 i { bottom: calc(6 * var(--u)); height: calc(50 * var(--u)); }
.gapbar .e1 span { bottom: calc(100 * var(--u)); } .gapbar .e1 i { bottom: calc(6 * var(--u)); height: calc(90 * var(--u)); }
.slide-gap .caption { margin-top: calc(40 * var(--u)); font-weight: 300; font-size: calc(16 * var(--u)); color: var(--grey); }

/* ---------------------------------------------------------------- timeline */
.timeline { position: absolute; left: var(--mx); right: var(--mx); bottom: calc(52 * var(--u)); height: 1px; background: var(--hair); }
.timeline .from, .timeline .to { position: absolute; top: calc(8 * var(--u)); font-size: calc(11 * var(--u)); color: var(--dim); }
.timeline .from { left: 0; } .timeline .to { right: 0; }
.timeline .range { position: absolute; top: -1px; height: calc(2.5 * var(--u)); background: var(--orange); min-width: 2px; }
.timeline .dot { position: absolute; top: 0; width: calc(10 * var(--u)); height: calc(10 * var(--u)); border-radius: 50%; background: var(--orange); transform: translate(-50%, -50%); }

/* ---------------------------------------------------------------- hud, notes, grid */
#hud { position: fixed; right: 16px; bottom: 10px; display: flex; gap: 14px; align-items: center; font-size: 12px; color: var(--dim); z-index: 5; }
#hud button { background: none; border: 1px solid var(--hair); color: var(--grey); font: inherit; padding: 3px 8px; border-radius: 4px; cursor: pointer; }
#hud button:hover { color: var(--white); border-color: var(--grey); }
.notes { display: none; position: fixed; left: 0; right: 0; bottom: 0; max-height: 40dvh; overflow: auto; background: #111; color: var(--soft); border-top: 1px solid var(--hair); padding: 18px var(--mx) 44px; font-size: 16px; line-height: 1.45; z-index: 4; }
.notes p + p { margin-top: .6em; }
.notes .none { color: var(--dim); }
body.show-notes .slide.current .notes { display: block; }
.notes [data-step].off { display: none; }
#grid { position: fixed; inset: 0; overflow: auto; background: rgba(0,0,0,.96); padding: 40px var(--mx) 60px; display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; z-index: 6; }
#grid[hidden] { display: none; }
#grid a { color: var(--white); text-decoration: none; font-size: 15px; line-height: 1.25; padding: 10px; border: 1px solid var(--hair); border-radius: 6px; }
#grid a:hover, #grid a.current { border-color: var(--orange); }
#grid a b { color: var(--orange); margin-right: 6px; }
#grid a .k { color: var(--grey); font-size: 11px; text-transform: uppercase; letter-spacing: .12em; }

/* ---------------------------------------------------------------- portrait phones */
@media (orientation: portrait) {
  :root { --u: calc(100vw / 480); --mx: calc(24 * var(--u)); }
  .stage { top: calc(60 * var(--u)); bottom: calc(70 * var(--u)); overflow-y: auto; justify-content: flex-start; padding-top: 8vh; }
  .slide-photo .stage, .slide-person .stage { flex-direction: column; align-items: flex-start; gap: calc(20 * var(--u)); }
  .slide-photo .photo { order: -1; width: 100%; justify-content: flex-start; }
  .slide-photo .photo img { max-height: 34dvh; }
  .portrait { flex-basis: auto; width: calc(160 * var(--u)); height: calc(160 * var(--u)); }
  h1.display { font-size: calc(96 * var(--u)); } h1 { font-size: calc(64 * var(--u)); }
  h1.figure { font-size: calc(140 * var(--u)); }
  .slide-person h1 { font-size: calc(64 * var(--u)); }
  blockquote { font-size: calc(40 * var(--u)); }
  .row { font-size: calc(24 * var(--u)); grid-template-columns: 2.6fr 2.2fr 3.6fr 1fr; }
  svg.network { height: calc(300 * var(--u)); }
  svg.network .hub { font-size: 60px; } svg.network .name { font-size: 40px; } svg.network .rel { font-size: 24px; }
  .gapbar { margin-top: calc(170 * var(--u)); }
  .gapbar .from, .gapbar .to, .gapbar .len { font-size: calc(24 * var(--u)); }
  .gapbar .event span { font-size: calc(14 * var(--u)); }
  table.refs { font-size: calc(16 * var(--u)); }
  table.refs .who, table.refs .n { white-space: normal; }
  .hyp { flex-direction: column; align-items: flex-start; gap: calc(10 * var(--u)); }
  .notes { max-height: 50dvh; font-size: 15px; }
}
```

- [ ] **Step 2: Serve the site and look at a few slides (steps hidden by default until Task 6, so just layout)**

Run: `cd site && python3 -m http.server 8787 >/dev/null 2>&1 & sleep 1; echo started`
Then temporarily append `?all` is not supported yet; instead add `.slide{display:block;position:relative;height:100dvh}` via the browser devtools, or just continue to Task 6 where navigation makes slides visible. Skip visual review here; Task 8 does it properly.

- [ ] **Step 3: Commit**

```bash
git add site/style.css
git commit -m "site: stylesheet"
```

---

### Task 5: Pages plumbing — CNAME, .nojekyll, README

**Files:**
- Create: `site/CNAME`, `site/.nojekyll`
- Modify: `README.md` (add a "Website" section)

- [ ] **Step 1: Create the files**

```bash
printf 'satoshi.study\n' > site/CNAME
touch site/.nojekyll
```

- [ ] **Step 2: Add to `README.md` after the "Rebuild" section**

```markdown
## Website

The same `content.js` also builds the web slideshow at https://satoshi.study:

```bash
cd build
node site.js        # writes ../site/index.html and copies ../site/img/
node --test test/   # generator tests
```

`site/` is committed and served by GitHub Pages (branch `main`, folder `/site`).
`site/style.css` and `site/app.js` are hand-written; only `index.html` and `img/`
are generated. Arrow keys, space, click/tap, swipe or wheel advance; N toggles the
narration; Esc shows every slide; the URL hash is the slide number.
```

- [ ] **Step 3: Commit**

```bash
git add site/CNAME site/.nojekyll README.md
git commit -m "site: Pages CNAME and docs"
```

---

### Task 6: Navigation script

**Files:**
- Create: `site/app.js`
- Test: `build/test/app.test.js`

**Interfaces:**
- Produces: `parseHash(hash, total, stepsOf) → {slide, step}` — pure, exported for Node when `module` exists. `stepsOf(slideIndex1Based) → number`.
- Hash format: `#12` = slide 12 step 1; `#12/2` = slide 12 step 2.
- Consumes the Task 3/4 contract: `.slide` sections with `data-steps`, `[data-step]` elements, `#hud`, `#grid`, `.notes`.

- [ ] **Step 1: Write the failing test**

```js
// build/test/app.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { parseHash } = require("../../site/app.js");

const stepsOf = (i) => (i === 12 ? 3 : 1);

test("parseHash clamps and defaults", () => {
  assert.deepEqual(parseHash("", 82, stepsOf), { slide: 1, step: 1 });
  assert.deepEqual(parseHash("#", 82, stepsOf), { slide: 1, step: 1 });
  assert.deepEqual(parseHash("#abc", 82, stepsOf), { slide: 1, step: 1 });
  assert.deepEqual(parseHash("#0", 82, stepsOf), { slide: 1, step: 1 });
  assert.deepEqual(parseHash("#999", 82, stepsOf), { slide: 82, step: 1 });
  assert.deepEqual(parseHash("#12", 82, stepsOf), { slide: 12, step: 1 });
  assert.deepEqual(parseHash("#12/2", 82, stepsOf), { slide: 12, step: 2 });
  assert.deepEqual(parseHash("#12/9", 82, stepsOf), { slide: 12, step: 3 });
  assert.deepEqual(parseHash("#5/2", 82, stepsOf), { slide: 5, step: 1 }, "no steps → step 1");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd build && node --test test/app.test.js`
Expected: FAIL, "Cannot find module '../../site/app.js'"

- [ ] **Step 3: Write `site/app.js`**

```js
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

  if (typeof module !== "undefined") { module.exports = { parseHash }; return; }

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
      if (on) el.querySelectorAll("[data-step]").forEach((n) => n.classList.toggle("off", parseInt(n.dataset.step, 10) > step));
    });
    const el = slides[slide - 1];
    hud.chapter.textContent = el.dataset.chapter;
    hud.counter.textContent = slide + " / " + total;
    document.title = (el.querySelector("h1, blockquote")?.textContent.replace(/\s+/g, " ").trim() || "Who Was Satoshi?") + " — Who Was Satoshi?";
    // Warm the neighbours' images.
    [slide, slide + 1, slide + 2].forEach((n) => slides[n - 1]?.querySelectorAll("img[loading=lazy]").forEach((img) => (img.loading = "eager")));
    grid.querySelectorAll("a").forEach((a, i) => a.classList.toggle("current", i + 1 === slide));
  }

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
  deck.addEventListener("click", (e) => {
    if (e.target.closest("a, button, .notes")) return;
    if (e.clientX > window.innerWidth / 2) next(); else prev();
  });

  // Swipe.
  let touch = null;
  deck.addEventListener("touchstart", (e) => { touch = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() }; }, { passive: true });
  deck.addEventListener("touchend", (e) => {
    if (!touch) return;
    const dx = e.changedTouches[0].clientX - touch.x, dy = e.changedTouches[0].clientY - touch.y;
    touch = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) { e.preventDefault(); dx < 0 ? next() : prev(); }
  });
  // A swipe is handled on touchend; stop the click the browser synthesises afterwards from also firing.
  deck.addEventListener("touchmove", () => { if (touch) touch.moved = true; }, { passive: true });
  deck.addEventListener("click", (e) => { if (touch?.moved) e.stopImmediatePropagation(); }, true);

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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd build && node --test test/`
Expected: all pass (notes 3, site 9, app 1).

- [ ] **Step 5: Commit**

```bash
git add site/app.js build/test/app.test.js
git commit -m "site: navigation, hash routing, notes panel, grid"
```

---

### Task 7: Browser verification and visual fixes

**Files:**
- Modify: `site/style.css`, `build/site.js` as the screenshots demand

- [ ] **Step 1: Serve the site**

Run: `cd site && (python3 -m http.server 8787 >/dev/null 2>&1 &) ; sleep 1; curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8787/`
Expected: `200`

- [ ] **Step 2: Screenshot every slide at 1600×900**

Use the Playwright MCP tools (`browser_navigate` to `http://localhost:8787/#1`, `browser_resize` 1600×900, then for each slide `browser_press_key ArrowRight` and `browser_take_screenshot` into `/private/tmp/claude-501/-Users-fredkrueger-satoshi/465d265d-dbb9-4c5e-bb5a-0fe18ae7e9e6/scratchpad/shots/desk-NN.png`). Walk all 82 slides and every step (nonce 3, network 2, gap 3). Compare each against `renders/renders.NNN.png` (note numbering differs after slide 17 because sequences are collapsed).

Fix anything that differs materially: overflowing headlines, wrong sizes, a timeline dot in the wrong place, hidden steps showing early. Edit `style.css` or `site.js`, rebuild with `node build/site.js`, reload.

- [ ] **Step 3: Screenshot the portrait phone at 390×844**

Resize to 390×844 and screenshot at least: 1 (title), 3 (photo), 10 (person), 18 (nonce, step 3), 25 (network, step 2), the gap slide at step 3, the refs slide, the hypothesis slide, a quote. Confirm no horizontal scroll (`browser_evaluate` → `document.documentElement.scrollWidth <= window.innerWidth`) and that text is readable.

- [ ] **Step 4: Exercise the controls**

In the browser: arrow keys, space, click right/left halves, N toggles notes and shows the step's narration, Esc opens the grid and clicking a tile jumps, `#999` lands on 82, `#18/2` shows two nonce rows, browser back returns to the previous slide, a trackpad scroll moves exactly one slide.

- [ ] **Step 5: Run the test suite once more, then commit the fixes**

Run: `cd build && node --test test/ && node site.js`
Expected: all pass, 82 slides.

```bash
git add -A site build
git commit -m "site: visual fixes from browser review"
```

---

### Task 8: Publish to GitHub Pages

**Files:** none new (all committed)

- [ ] **Step 1: Create the public repo and push**

```bash
cd /Users/fredkrueger/satoshi
git branch -M main
gh repo create frkrueger/satoshi.study --public --source=. --push --description "Who Was Satoshi? — a historical investigation, 1972–2014"
```

Expected: repo URL printed, `main` pushed.

- [ ] **Step 2: Enable Pages from `main` `/site` with the custom domain**

```bash
gh api -X POST repos/frkrueger/satoshi.study/pages \
  -f 'source[branch]=main' -f 'source[path]=/site' -f build_type=legacy
gh api -X PUT repos/frkrueger/satoshi.study/pages -f cname=satoshi.study
gh api repos/frkrueger/satoshi.study/pages --jq '{status, cname, html_url, https_enforced}'
```

Expected: `cname: satoshi.study`, `html_url: https://satoshi.study/` (or the github.io URL until DNS resolves).

- [ ] **Step 3: Confirm the github.io build serves**

```bash
sleep 60; curl -s -o /dev/null -w '%{http_code}\n' https://frkrueger.github.io/satoshi.study/
```
Expected: `200` (Pages redirects to the custom domain once DNS resolves; `301` to https://satoshi.study is also fine).

- [ ] **Step 4: Tell the user the Namecheap records**

Namecheap → Domain List → satoshi.study → Manage → Advanced DNS. Remove any existing parking A/CNAME/URL-redirect records for `@` and `www`, then add:

| Type | Host | Value | TTL |
| --- | --- | --- | --- |
| A | @ | 185.199.108.153 | Automatic |
| A | @ | 185.199.109.153 | Automatic |
| A | @ | 185.199.110.153 | Automatic |
| A | @ | 185.199.111.153 | Automatic |
| CNAME | www | frkrueger.github.io. | Automatic |

- [ ] **Step 5: After DNS resolves, enforce HTTPS**

```bash
dig +short satoshi.study          # expect the four 185.199.* addresses
gh api repos/frkrueger/satoshi.study/pages --jq '.https_certificate.state'   # wait for "approved"
gh api -X PUT repos/frkrueger/satoshi.study/pages -F https_enforced=true
curl -sI https://satoshi.study/ | head -3
```
Expected: `HTTP/2 200`.

---

## Self-review

- Spec coverage: generator from content.js (T2, T3), notes reuse (T1), 13 types incl. SVG/HTML sequences (T3), steps with timeline dot per step (T2 timeline + T6), hash routing (T6), notes panel N (T6), Esc grid (T6), hud (T2/T6), responsive portrait (T4), preload neighbours (T6), error handling for unknown type / missing image / missing notes (T1, T2, T3), Pages + CNAME + DNS (T5, T8), screenshots at both sizes and control checks (T7). Covered.
- Placeholders: none. Task 4 step 2 explicitly defers the visual check to Task 7.
- Type consistency: `group → steps[]` used by `timeline`, `notes`, `nonce` template and `app.js` `data-steps`; `parseHash(hash, total, stepsOf)` identical in test and source; class names `.off`, `.current`, `show-notes` match CSS.
- Review Focus: 1 → T2 inline test; 2 → T6 parseHash test; 3 → T6 wheel lock, checked in T7; 4 → T1 throws test; 5 → T7 portrait screenshots and scrollWidth check.
