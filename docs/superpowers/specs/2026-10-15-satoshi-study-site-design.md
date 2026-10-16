# satoshi.study — web slideshow design

Date: 2026-10-15. Approved in conversation.

## Goal

Publish the "Who Was Satoshi?" deck as a website at https://satoshi.study. The site
is a full-screen web slideshow generated from the same `build/content.js` that
generates the .pptx, so the words are edited once.

## Constraints

- Static files only, hosted on GitHub Pages from a public repo `frkrueger/satoshi.study`.
- Domain is registered at Namecheap; DNS records are added there by the owner.
- No framework, no runtime dependencies. Build step is one Node script.
- Visual parity with the deck: black, Helvetica Neue (Bold/Light) with system
  fallback, Bitcoin orange `#F7931A`, timeline 1972–2014 along the bottom.

## Architecture

```
site/                 generated output, served by Pages (committed)
  index.html          all 87 slides as <section> elements
  style.css
  app.js              navigation, hash routing, notes panel, grid, build steps
  img/                photos copied from assets/
  CNAME               satoshi.study
build/site.js         generator: content.js -> site/index.html
```

`build/site.js` requires `content.js`, reuses the notes logic from `build.js`
(narration + source per scene from `source/original-notes.md`), and renders
each slide type to an HTML template. `*text*` becomes `<em>` (orange); `\n`
becomes `<br>`.

## Slide types → templates

title, chapter, photo, person, figure, statement, quote, list, refs,
hypothesis, nonce, network, gap. Nonce rows, the small-world network, and the
commit-gap bar are HTML/SVG, not images.

Build sequences (nonce rows 1–3, network partial/full, gap steps 1–3) collapse
into one slide each with internal steps; next/previous first steps through
the sequence, then leaves the slide. The timeline dot and `t` update per step.

## Behaviour

- Navigation: ArrowRight/Space/PageDown/click or tap right half/swipe left/
  wheel down = next; mirrored for previous. Home/End jump to first/last.
- URL hash `#n` (1-based slide number) is the state; back button works; a
  shared link opens on that slide.
- Key N (or a small button) toggles a notes panel with narration + source.
- Escape toggles a grid overview of all slides; clicking one jumps to it.
- Corner shows slide number / total and current chapter.
- Timeline: thin line, year labels, orange dot at `t`, chapter range lit on
  chapter slides.
- Responsive: type in viewport units (`clamp`), portrait phones stack photo
  above text. No horizontal scroll.
- Preloads neighbouring images; photos lazy-load otherwise.

## Error handling

- Unknown hash → slide 1. Hash out of range → clamp.
- Missing image file at build time → build fails with the file name.
- Unknown slide type at build time → build fails naming the slide.

## Deployment

1. `git init`, commit whole project, create public repo `frkrueger/satoshi.study`, push `main`.
2. Enable Pages: branch `main`, folder `/site`; custom domain satoshi.study; enforce HTTPS.
3. Namecheap DNS: A @ → 185.199.108.153, 185.199.109.153, 185.199.110.153,
   185.199.111.153; CNAME www → frkrueger.github.io.

## Testing

- Build runs clean; `site/index.html` contains 87 sections (counting
  sequences collapsed, fewer; assert the expected count from content.js).
- Headless-browser screenshots of every slide at 1600×900 and 390×844,
  compared by eye against `renders/`.
- Keyboard/touch navigation and hash routing verified in the browser.
- After push: `curl` the Pages URL and, once DNS resolves, https://satoshi.study.
