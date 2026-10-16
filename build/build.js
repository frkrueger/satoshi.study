// Generates who-was-satoshi.pptx from content.js.
//
// Design: true black, white Helvetica Neue, one highlight colour (Bitcoin orange),
// a fixed left-aligned grid, and a thin 1972→2014 timeline along the bottom of
// every slide. Built to be opened in Keynote:
//   - images carry their treatment baked in (assets/, see treat-images.sh);
//   - line breaks are computed here from the real font metrics (measure.py), so
//     Keynote never re-wraps a line or splits a word, and headline sizes shrink
//     only when a line would not otherwise fit;
//   - each slide's text stack (kicker, headline, supporting line) is ONE text box,
//     so the blocks can never overlap whatever line height Keynote uses;
//   - slides that form a build keep their shared objects in identical positions,
//     so Keynote's Magic Move can animate between them.
//
//   node build.js            → ../who-was-satoshi.pptx
//   node build.js out.pptx   → a different output file

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const pptxgen = require("pptxgenjs");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.resolve(ROOT, process.argv[2] || "who-was-satoshi.pptx");
const SLIDES = require("./content.js");

// ---------------------------------------------------------------- design tokens
const W = 13.333;
const H = 7.5;
const MX = 1.0; // left/right margin; every text block starts here
const F = {
  bold: "Helvetica Neue",
  light: "Helvetica Neue Light",
  medium: "Helvetica Neue Medium",
  mono: "Menlo",
};
const FONT_FILES = {
  [F.bold]: ["/System/Library/Fonts/HelveticaNeue.ttc", 1],
  [F.light]: ["/System/Library/Fonts/HelveticaNeue.ttc", 7],
  [F.medium]: ["/System/Library/Fonts/HelveticaNeue.ttc", 10],
  [F.mono]: ["/System/Library/Fonts/Menlo.ttc", 0],
};
const COL = {
  bg: "000000",
  white: "FFFFFF",
  soft: "AEAEB2", // supporting lines
  grey: "8E8E93", // attributions
  dim: "48484A", // timeline labels, secondary marks
  hair: "2C2C2E", // timeline rule
  orange: "F7931A",
};
const TL = { y: 6.78, x0: MX, x1: W - MX, from: 1972, to: 2014 };
const LINE_HEIGHT = 1.2; // Helvetica Neue's natural line height, in em
const SIZE = { kicker: 18, sub: 30 };

// ---------------------------------------------------------------- notes source
const { notesFor } = require("./notes.js");

// ---------------------------------------------------------------- text metrics
// Every word that appears anywhere in content.js, measured once in every face.
function collectWords(value, into) {
  if (typeof value === "string") {
    // Highlight marks split a word into separately-styled segments; measure each.
    for (const token of value.split(/\s+/)) {
      for (const w of [token.replace(/\*/g, ""), ...token.split("*")]) if (w) { into.add(w); into.add(w.toUpperCase()); }
    }
  } else if (Array.isArray(value)) value.forEach((v) => collectWords(v, into));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => collectWords(v, into));
  return into;
}
// (build.js itself is scanned too, for the few labels its diagrams set in measured stacks.)
const WORDS = collectWords([SLIDES, fs.readFileSync(__filename, "utf8")], new Set([" "]));
const EM = JSON.parse(
  execFileSync(path.join(__dirname, ".venv/bin/python"), ["-I", path.join(__dirname, "measure.py")], {
    input: JSON.stringify({ faces: FONT_FILES, words: [...WORDS] }),
  }).toString(),
);

// Width in inches of a string in a face at a size (pt), with letter-spacing (pt).
function widthOf(str, face, size, charSpacing = 0) {
  const table = EM[face];
  let em = 0;
  for (const piece of str.split(/( )/)) {
    if (!piece) continue;
    const w = table[piece];
    if (w === undefined) throw new Error(`unmeasured word "${piece}" in ${face}`);
    em += w;
  }
  return (em * size + charSpacing * str.length) / 72;
}

// ---------------------------------------------------------------- line breaking
// A block's text: "*…*" marks the highlight, "\n" forces a line break.
// Returns hard lines, each a list of words, each word a list of {text, hi} segments.
function parseBlock(str) {
  const lines = [];
  for (const hard of String(str).split("\n")) {
    const words = [];
    let hi = false, word = [], seg = "";
    const flushSeg = () => { if (seg) word.push({ text: seg, hi }); seg = ""; };
    const flushWord = () => { flushSeg(); if (word.length) words.push(word); word = []; };
    for (const ch of hard) {
      if (ch === "*") { flushSeg(); hi = !hi; }
      else if (ch === " ") flushWord();
      else seg += ch;
    }
    flushWord();
    lines.push(words);
  }
  return lines;
}

function wordWidth(word, b, size) {
  return word.reduce((sum, seg) => sum + widthOf(seg.text, seg.hi && b.hiFace ? b.hiFace : b.face, size, b.charSpacing || 0), 0);
}

// Greedy wrap at maxW. Returns null when a single word is wider than maxW.
function wrap(b, size, maxW) {
  const out = [];
  const space = widthOf(" ", b.face, size, b.charSpacing || 0);
  for (const words of parseBlock(b.upper ? b.text.toUpperCase() : b.text)) {
    let line = [], lineW = 0;
    for (const w of words) {
      const ww = wordWidth(w, b, size);
      if (ww > maxW) return null;
      if (line.length && lineW + space + ww > maxW) { out.push(line); line = [w]; lineW = ww; }
      else { lineW += (line.length ? space : 0) + ww; line.push(w); }
    }
    out.push(line);
  }
  return out;
}

// Balanced breaks: the narrowest width that still gives the same number of lines,
// so a wrapped headline never strands one short word on its last line.
function balance(b, size, maxW, lines) {
  if (!lines || lines.length < 2) return lines;
  let lo = maxW * 0.4, hi = maxW, best = lines;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2, trial = wrap(b, size, mid);
    if (trial && trial.length === lines.length) { best = trial; hi = mid; } else lo = mid;
  }
  return best;
}

// Lays out a stack of blocks inside a box. Blocks marked flex shrink together
// (in 2pt steps) until every line fits the width, every block fits its maxLines,
// and the whole stack fits the box height.
function layoutStack(blocks, box) {
  for (let scale = 1; scale >= 0.45; scale -= 0.02) {
    let ok = true, height = 0;
    const laid = blocks.map((b, i) => {
      if (!ok) return null;
      const size = b.flex ? Math.floor((b.size * scale) / 2) * 2 : b.size;
      const lines = balance(b, size, box.w, wrap(b, size, box.w));
      if (!lines || (b.maxLines && lines.length > b.maxLines)) { ok = false; return null; }
      height += (i ? (b.before ?? 0.35 * size) : 0) / 72 + (lines.length * size * LINE_HEIGHT * (b.leading || 1)) / 72;
      return { ...b, size, lines };
    });
    if (ok && height <= box.h) return laid;
  }
  throw new Error(`text does not fit: ${blocks.map((b) => b.text).join(" / ")}`);
}

// Emits a laid-out stack as one text box, one paragraph per line.
function emitStack(slide, laid, box, name) {
  const runs = [];
  laid.forEach((b, bi) => {
    b.lines.forEach((line, li) => {
      const para = {
        lineSpacingMultiple: b.leading || 1,
        paraSpaceBefore: bi && !li ? (b.before ?? 0.35 * b.size) : 0,
        align: box.align || "left",
      };
      const segs = [];
      line.forEach((word, wi) => {
        word.forEach((seg, si) => {
          const text = (wi && !si ? " " : "") + seg.text;
          const last = segs[segs.length - 1];
          if (last && last.hi === seg.hi) last.text += text;
          else segs.push({ text, hi: seg.hi });
        });
      });
      if (!segs.length) segs.push({ text: " ", hi: false });
      segs.forEach((seg, si) => {
        const face = seg.hi && b.hiFace ? b.hiFace : b.face;
        runs.push({
          text: seg.text,
          options: {
            ...(si === 0 ? para : {}),
            fontFace: face,
            fontSize: b.size,
            bold: face === F.bold,
            color: seg.hi ? b.hiColor || COL.orange : b.color || COL.white,
            charSpacing: b.charSpacing,
            breakLine: si === segs.length - 1,
          },
        });
      });
    });
  });
  runs[runs.length - 1].options.breakLine = false;
  slide.addText(runs, {
    x: box.x, y: box.y, w: box.w + 0.6, h: box.h, // +0.6": slack so Keynote never re-wraps a measured line
    valign: box.valign || "middle", margin: 0, fit: "none", isTextBox: true, objectName: name,
  });
}

function stack(slide, box, blocks, name = "text") {
  const present = blocks.filter((b) => b && b.text);
  emitStack(slide, layoutStack(present, box), box, name);
}

// Block constructors.
const kickerB = (t) => t && { text: t, upper: true, face: F.bold, size: SIZE.kicker, charSpacing: 3, color: COL.orange };
// A headline written with explicit "\n" breaks keeps exactly those lines: it shrinks rather than re-wraps.
const headB = (t, size, o = {}) => t && {
  text: t, face: F.bold, size, flex: true, leading: 0.92, before: 0.45 * SIZE.kicker,
  ...(t.includes("\n") ? { maxLines: t.split("\n").length } : {}), ...o,
};
const subB = (t, o = {}) => t && { text: t, face: F.light, size: SIZE.sub, color: COL.soft, leading: 1.1, maxLines: 4, ...o };

// ---------------------------------------------------------------- primitives
const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.title = "Who Was Satoshi?";
pres.theme = { headFontFace: F.bold, bodyFontFace: F.bold };
pres.defineSlideMaster({ title: "Black", background: { color: COL.bg } });

function label(slide, str, o) {
  slide.addText(str, {
    x: o.x, y: o.y, w: o.w, h: o.h, fontFace: o.font || F.light, fontSize: o.size, color: o.color || COL.white,
    bold: (o.font || F.light) === F.bold || !!o.bold, align: o.align || "left", valign: o.valign || "top", charSpacing: o.charSpacing,
    margin: 0, fit: "none", isTextBox: true, objectName: o.name,
  });
}

function yearX(year) {
  return TL.x0 + ((year - TL.from) / (TL.to - TL.from)) * (TL.x1 - TL.x0);
}

function timeline(slide, s) {
  slide.addShape(pres.shapes.LINE, {
    x: TL.x0, y: TL.y, w: TL.x1 - TL.x0, h: 0, line: { color: COL.hair, width: 1 }, objectName: "timeline",
  });
  label(slide, String(TL.from), { x: TL.x0, y: TL.y + 0.1, w: 1, h: 0.25, size: 11, color: COL.dim, name: "timeline-from" });
  label(slide, String(TL.to), { x: TL.x1 - 1, y: TL.y + 0.1, w: 1, h: 0.25, size: 11, color: COL.dim, align: "right", name: "timeline-to" });
  if (s.range) {
    const [a, b] = s.range;
    slide.addShape(pres.shapes.LINE, {
      x: yearX(a), y: TL.y, w: Math.max(yearX(b) - yearX(a), 0.02), h: 0, line: { color: COL.orange, width: 2.5 }, objectName: "timeline-range",
    });
  }
  if (s.t) {
    const d = 0.13;
    slide.addShape(pres.shapes.OVAL, {
      x: yearX(s.t) - d / 2, y: TL.y - d / 2, w: d, h: d, fill: { color: COL.orange }, line: { type: "none" }, objectName: "timeline-now",
    });
  }
}

function imageSize(file) {
  const out = execFileSync("magick", ["identify", "-format", "%w %h", file]).toString().trim().split(" ");
  return { w: +out[0], h: +out[1] };
}

// Fit an image inside a box, preserving aspect; align "center" or "right".
function placeImage(slide, file, box, name, align = "center") {
  const p = path.join(ROOT, "assets", file);
  const { w, h } = imageSize(p);
  const scale = Math.min(box.w / w, box.h / h);
  const iw = w * scale, ih = h * scale;
  const x = align === "right" ? box.x + box.w - iw : box.x + (box.w - iw) / 2;
  slide.addImage({ path: p, x, y: box.y + (box.h - ih) / 2, w: iw, h: ih, objectName: name });
  return { x, w: iw };
}

// The area above the timeline where content lives.
const STAGE = { x: MX, y: 0.55, w: W - 2 * MX, h: 5.85 };

// ---------------------------------------------------------------- slide types
const TYPES = {
  // Opening slide.
  title(slide, s) {
    stack(slide, STAGE, [kickerB(s.kicker), headB(s.title, 132), subB(s.sub, { before: 26 })]);
  },

  // Chapter divider: chapter number, name, years.
  chapter(slide, s) {
    stack(slide, STAGE, [kickerB(s.kicker), headB(s.title, 116), subB(s.sub, { before: 20 })]);
  },

  // Photo on the right, type on the left.
  photo(slide, s) {
    // The photo hugs the right edge; the type takes whatever width it leaves.
    const placed = placeImage(slide, s.image, { x: 7.3, y: 0.5, w: W - 7.3 - 0.45, h: 5.9 }, "photo", "right");
    const textW = Math.min(placed.x - MX - 0.5, 6.6);
    // Up to ~15% smaller when that saves the headline a line ("The / programmer").
    const head = headB(s.title, 60, { maxLines: 3 });
    const lineCount = (size) => (wrap(head, size, textW) || { length: 99 }).length;
    for (let size = 60; size >= 52; size -= 2) if (lineCount(size) < lineCount(60)) { head.size = size; break; }
    stack(slide, { x: MX, y: STAGE.y, w: textW, h: STAGE.h }, [kickerB(s.kicker), head, subB(s.sub, { size: 26, before: 22 })]);
  },

  // A giant figure or year with one supporting line.
  figure(slide, s) {
    stack(slide, STAGE, [kickerB(s.kicker), headB(s.title, s.size || 200, { maxLines: 1, leading: 0.86 }), subB(s.sub, { before: 16 })]);
  },

  // One sentence, very large.
  statement(slide, s) {
    stack(slide, STAGE, [kickerB(s.kicker), headB(s.title, s.size || 92), subB(s.sub, { size: s.subSize || 36, before: 30 })]);
  },

  // A person introduced with a circular portrait (or an empty circle when none exists).
  person(slide, s) {
    const d = 3.3, cx = MX, cy = STAGE.y + (STAGE.h - d) / 2;
    if (s.image) {
      slide.addImage({ path: path.join(ROOT, "assets", s.image), x: cx, y: cy, w: d, h: d, objectName: "portrait" });
    } else {
      slide.addShape(pres.shapes.OVAL, {
        x: cx, y: cy, w: d, h: d, fill: { type: "none" }, line: { color: COL.dim, width: 1.5, dashType: "dash" }, objectName: "portrait",
      });
      label(slide, s.noImage || "No verified\npublic photograph", {
        x: cx, y: cy, w: d, h: d, size: 16, color: COL.grey, align: "center", valign: "middle", name: "portrait-note",
      });
    }
    const tx = cx + d + 0.75;
    stack(slide, { x: tx, y: cy, w: W - MX - tx - 0.3, h: d }, [kickerB(s.kicker), headB(s.title, 96, { maxLines: 2 }), subB(s.sub, { before: 18 })]);
  },

  // A quotation from an email or mailing list, the key phrase highlighted.
  quote(slide, s) {
    stack(slide, { ...STAGE, w: STAGE.w - 0.5 }, [
      kickerB(s.kicker),
      { text: s.quote, face: F.light, hiFace: F.medium, size: s.size || 54, flex: true, leading: 1.08, before: 24, maxLines: s.maxLines },
      { text: s.by, face: F.light, size: 22, color: COL.grey, before: 30 },
    ]);
  },

  // Hashcash: hash attempts revealed one row per slide (Magic Move friendly).
  nonce(slide, s) {
    label(slide, s.kicker.toUpperCase(), { x: MX, y: 1.25, w: 8, h: 0.35, size: SIZE.kicker, font: F.bold, color: COL.orange, charSpacing: 3, name: "kicker" });
    label(slide, s.title, { x: MX, y: 1.7, w: W - 2 * MX, h: 1.0, size: 64, font: F.bold, name: "title" });
    const rows = [
      ["001", "a91e52f8…", false],
      ["002", "7b31ca09…", false],
      ["003", "0000ab72…", true],
    ].slice(0, s.rows);
    rows.forEach(([n, hash, hit], i) => {
      const y = 3.15 + i * 0.85;
      label(slide, `nonce ${n}`, { x: MX, y, w: 3.4, h: 0.6, size: 38, font: F.mono, color: COL.grey, name: `row${i}-nonce` });
      label(slide, "SHA-1 →", { x: 4.55, y, w: 2.6, h: 0.6, size: 38, font: F.mono, color: COL.dim, name: `row${i}-fn` });
      label(slide, hash, { x: 7.35, y, w: 3.6, h: 0.6, size: 38, font: F.mono, bold: hit, color: hit ? COL.orange : COL.white, name: `row${i}-hash` });
      label(slide, hit ? "✓" : "×", { x: 11.5, y, w: 0.8, h: 0.6, size: 38, font: F.mono, color: hit ? COL.orange : COL.dim, align: "right", name: `row${i}-mark` });
    });
    if (s.sub) stack(slide, { x: MX, y: 5.75, w: W - 2 * MX, h: 0.6, valign: "top" }, [subB(s.sub)], "sub");
  },

  // The whitepaper's bibliography, set as type in four columns.
  refs(slide, s) {
    label(slide, s.kicker.toUpperCase(), { x: MX, y: 0.75, w: 10, h: 0.35, size: SIZE.kicker, font: F.bold, color: COL.orange, charSpacing: 3, name: "kicker" });
    label(slide, s.title, { x: MX, y: 1.15, w: W - 2 * MX, h: 1.0, size: 64, font: F.bold, name: "title" });
    // Largest size at which every row fits on one line.
    let size = 24, cols;
    for (; size >= 14; size -= 1) {
      const nW = 0.7, yrW = 0.9;
      const whoW = Math.max(...s.items.map((r) => widthOf(r[1], F.medium, size))) + 0.35;
      const whatW = Math.max(...s.items.map((r) => widthOf(r[2], F.light, size)));
      if (nW + whoW + whatW + 0.3 + yrW <= W - 2 * MX) { cols = { nW, whoW, yrW }; break; }
    }
    const rowH = (size * 1.75) / 72;
    s.items.forEach(([n, who, what, yr], i) => {
      const y = 2.55 + i * rowH;
      const dim = s.dimExcept && !s.dimExcept.includes(n);
      label(slide, `[${n}]`, { x: MX, y, w: cols.nW, h: 0.4, size, color: COL.dim, name: `ref${n}-n` });
      label(slide, who, { x: MX + cols.nW, y, w: cols.whoW, h: 0.4, size, font: F.medium, color: dim ? COL.dim : COL.white, name: `ref${n}-who` });
      label(slide, what, { x: MX + cols.nW + cols.whoW, y, w: 8, h: 0.4, size, color: dim ? COL.dim : COL.soft, name: `ref${n}-what` });
      label(slide, yr, { x: W - MX - cols.yrW, y, w: cols.yrW, h: 0.4, size, color: COL.grey, align: "right", name: `ref${n}-yr` });
    });
  },
};

// A straight line from (x1,y1) to (x2,y2).
function line(slide, x1, y1, x2, y2, o) {
  slide.addShape(pres.shapes.LINE, {
    x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.max(Math.abs(x2 - x1), 0.001), h: Math.abs(y2 - y1),
    flipV: (x2 - x1) * (y2 - y1) < 0, line: { color: o.color, width: o.width || 1 }, objectName: o.name,
  });
}

function dot(slide, x, y, d, color, name) {
  slide.addShape(pres.shapes.OVAL, { x: x - d / 2, y: y - d / 2, w: d, h: d, fill: { color }, line: { type: "none" }, objectName: name });
}

Object.assign(TYPES, {
  // Hal at the centre of the people he knew. rows: false = Hal alone (build step one).
  network(slide, s) {
    label(slide, s.kicker.toUpperCase(), { x: MX, y: 0.75, w: 6, h: 0.35, size: SIZE.kicker, font: F.bold, color: COL.orange, charSpacing: 3, name: "kicker" });
    const cx = W / 2, cy = 3.55, rx = 4.3, ry = 2.1;
    const hub = { size: 46, name: "Hal Finney" };
    const hubHalfW = widthOf(hub.name, F.bold, hub.size) / 2 + 0.2;
    label(slide, hub.name, { x: cx - 2.5, y: cy - 0.4, w: 5, h: 0.8, size: hub.size, font: F.bold, color: COL.orange, align: "center", valign: "middle", name: "hub" });
    if (!s.full) return;
    const people = [
      ["Wei Dai", "met and corresponded", -90],
      ["Nick Szabo", "met and corresponded", -18],
      ["Adam Back", "exchanged ideas", 54],
      ["Len Sassaman", "professional circle", 126],
      ["Phil Zimmermann", "professional circle", 198],
    ];
    // Fraction of the way along (dx,dy) at which a ray leaves a box of half-size (hw,hh).
    const exitAt = (dx, dy, hw, hh) => Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
    people.forEach(([name, rel, deg], i) => {
      const a = (deg * Math.PI) / 180, nx = cx + rx * Math.cos(a), ny = cy + ry * Math.sin(a);
      const dx = nx - cx, dy = ny - cy;
      const t0 = exitAt(dx, dy, hubHalfW, 0.45);
      // A line arriving from below must also clear the relation label under the name.
      const t1 = 1 - exitAt(dx, dy, widthOf(name, F.bold, 32) / 2 + 0.2, dy < 0 ? 0.85 : 0.45);
      if (t1 > t0) line(slide, cx + dx * t0, cy + dy * t0, cx + dx * t1, cy + dy * t1, { color: COL.dim, width: 1.25, name: `link${i}` });
      label(slide, name, { x: nx - 2, y: ny - 0.32, w: 4, h: 0.55, size: 32, font: F.bold, align: "center", valign: "middle", name: `person${i}` });
      label(slide, rel, { x: nx - 2, y: ny + 0.26, w: 4, h: 0.35, size: 18, color: COL.grey, align: "center", name: `relation${i}` });
    });
  },

  // The reported Crypto++ commit gap. step 1: the last commit; 2: the gap; 3: Satoshi's dates on it.
  gap(slide, s) {
    label(slide, s.kicker.toUpperCase(), { x: MX, y: 1.0, w: 10, h: 0.35, size: SIZE.kicker, font: F.bold, color: COL.orange, charSpacing: 3, name: "kicker" });
    const x0 = MX + 0.1, x1 = W - MX - 0.1, y = 3.45;
    const day = (d) => x0 + ((d - 33) / (326 - 33)) * (x1 - x0); // day-of-year 2008: Feb 2 = 33, Nov 21 = 326
    line(slide, x0, y, s.step > 1 ? x1 : x0 + 0.01, y, { color: COL.orange, width: 3, name: "gap-line" });
    dot(slide, x0, y, 0.22, COL.orange, "gap-start");
    label(slide, "Feb 2, 2008", { x: x0, y: y + 0.3, w: 4, h: 0.7, size: 40, font: F.bold, name: "gap-from" });
    label(slide, "last recorded commit", { x: x0, y: y + 1.0, w: 4, h: 0.4, size: 20, color: COL.grey, name: "gap-from-note" });
    if (s.step > 1) {
      dot(slide, x1, y, 0.22, COL.orange, "gap-end");
      label(slide, "Nov 21, 2008", { x: x1 - 4, y: y + 0.3, w: 4, h: 0.7, size: 40, font: F.bold, align: "right", name: "gap-to" });
      label(slide, "commits resume", { x: x1 - 4, y: y + 1.0, w: 4, h: 0.4, size: 20, color: COL.grey, align: "right", name: "gap-to-note" });
      label(slide, "9+ months", { x: W / 2 - 2, y: y + 0.3, w: 4, h: 0.7, size: 40, font: F.bold, color: COL.orange, align: "center", name: "gap-length" });
    }
    if (s.step > 2) {
      [[233, "Aug 20 · Satoshi writes to Adam Back", 2.55], [305, "Oct 31 · The whitepaper", 1.95]].forEach(([d, txt, ly], i) => {
        const x = day(d);
        line(slide, x, ly + 0.45, x, y - 0.12, { color: COL.soft, width: 1, name: `event${i}-leader` });
        dot(slide, x, y, 0.16, COL.white, `event${i}-dot`);
        label(slide, txt, { x: x - 5, y: ly, w: 5, h: 0.4, size: 20, color: COL.white, align: "right", name: `event${i}` });
      });
    }
    label(slide, "Reported by Ben Sigman. Individual SVN revisions require independent verification.", {
      x: MX, y: 5.75, w: W - 2 * MX, h: 0.35, size: 16, color: COL.grey, name: "caption",
    });
  },

  // The deck's hypothesis: Hal plus one or more of three others.
  hypothesis(slide, s) {
    label(slide, s.kicker.toUpperCase(), { x: MX, y: 0.9, w: 6, h: 0.35, size: SIZE.kicker, font: F.bold, color: COL.orange, charSpacing: 3, name: "kicker" });
    stack(slide, { x: MX, y: 1.5, w: 4.5, h: 3.9 }, [headB("Hal Finney", 80, { maxLines: 1 })], "lead");
    label(slide, "+", { x: 5.95, y: 1.5, w: 1.0, h: 3.9, size: 110, font: F.bold, color: COL.orange, align: "center", valign: "middle", name: "plus" });
    stack(slide, { x: 7.25, y: 1.5, w: W - MX - 7.25 - 0.3, h: 3.9 }, [
      { text: "one or more of", upper: true, face: F.bold, size: 15, charSpacing: 3, color: COL.grey },
      headB("Len Sassaman\nNick Szabo\nWei Dai", 54, { color: COL.soft, leading: 1.0, before: 12 }),
    ], "others");
    stack(slide, { x: MX, y: 5.45, w: W - 2 * MX, h: 0.8 }, [subB(s.sub, { size: 32 })], "sub");
  },

  // A short list of plain statements.
  list(slide, s) {
    stack(slide, STAGE, [
      kickerB(s.kicker),
      ...s.items.map((t, i) => ({ text: t, face: F.light, hiFace: F.medium, size: 40, flex: true, leading: 1.05, before: i ? 22 : 26 })),
    ]);
  },
});

// ---------------------------------------------------------------- build
let currentSection = null;
for (const s of SLIDES) {
  if (s.section && s.section !== currentSection) {
    pres.addSection({ title: s.section });
    currentSection = s.section;
  }
  const slide = pres.addSlide({ masterName: "Black", sectionTitle: currentSection || undefined });
  const render = TYPES[s.type];
  if (!render) throw new Error(`unknown slide type: ${s.type}`);
  render(slide, s);
  timeline(slide, s);
  const notes = notesFor(s);
  if (notes) slide.addNotes(notes);
}

// pptxgenjs writes each slide's notes as one run with raw newlines inside it, which
// Keynote may run together; rewrite them as one paragraph per line.
async function splitNotesParagraphs(file) {
  const JSZip = require("jszip");
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const para = /<a:p><a:r><a:rPr lang="en-US" dirty="0"\/><a:t>([\s\S]*?)<\/a:t><\/a:r><a:endParaRPr lang="en-US" dirty="0"\/><\/a:p>/;
  for (const name of Object.keys(zip.files).filter((n) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(n))) {
    const xml = await zip.file(name).async("string");
    const fixed = xml.replace(para, (_, body) =>
      body.split(/\r?\n/).map((line) =>
        line ? `<a:p><a:r><a:rPr lang="en-US" dirty="0"/><a:t>${line}</a:t></a:r></a:p>` : `<a:p><a:endParaRPr lang="en-US" dirty="0"/></a:p>`,
      ).join(""));
    zip.file(name, fixed);
  }
  fs.writeFileSync(file, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
}

pres.writeFile({ fileName: OUT })
  .then(() => splitNotesParagraphs(OUT))
  .then(() => console.log(`wrote ${OUT} (${SLIDES.length} slides)`));
