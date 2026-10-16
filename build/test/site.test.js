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

test("a headline with explicit line breaks is marked keep so it shrinks instead of re-wrapping", () => {
  const html = render([{ type: "statement", kicker: "k", title: "Two names\nare *missing*." }, { type: "statement", kicker: "k", title: "One line" }]);
  assert.match(html, /<h1 class="statement keep">Two names<br>are <em>missing<\/em>\.<\/h1>/);
  assert.match(html, /<h1 class="statement">One line<\/h1>/);
});
