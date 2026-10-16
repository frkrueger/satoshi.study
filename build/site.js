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
