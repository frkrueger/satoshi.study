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
    return `<div data-step="${k + 1}">${paras || '<p class="none">No notes for this slide.</p>'}</div>`;
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
const kicker = (t) => (t ? `<p class="kicker">${inline(t)}</p>` : "");
// A headline written with explicit "\n" breaks keeps exactly those lines: it shrinks rather than re-wraps.
const h1 = (t, cls = "", style = "") => {
  if (!t) return "";
  const classes = [cls, t.includes("\n") ? "keep" : ""].filter(Boolean).join(" ");
  return `<h1 class="${classes}"${style ? ` style="${style}"` : ""}>${inline(t)}</h1>`;
};
const sub = (t, cls = "sub") => (t ? `<p class="${cls}">${inline(t)}</p>` : "");

// Deck point sizes map to CSS via --u (1 deck pt). Custom sizes pass through as a style.
const fsize = (pt) => (pt ? `font-size:calc(${pt} * var(--u))` : "");

const TYPES = {
  title: (s) => kicker(s.kicker) + h1(s.title, "display") + sub(s.sub),
  chapter: (s) => kicker(s.kicker) + h1(s.title, "display") + sub(s.sub),
  figure: (s) => kicker(s.kicker) + h1(s.title, "figure", fsize(s.size)) + sub(s.sub),
  statement: (s) => kicker(s.kicker) + h1(s.title, "statement", fsize(s.size)) + sub(s.sub),
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

module.exports = { inline, esc, group, chapterOf, render, renderSlide, build };

if (require.main === module) build(process.argv[2] ? path.resolve(process.argv[2]) : undefined);
