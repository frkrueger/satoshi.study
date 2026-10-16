# Who Was Satoshi? — Keynote-style deck

`who-was-satoshi.pptx` — 87 slides, 16:9. Open it in Keynote (File → Open); every
slide's narration and source are in the presenter notes.

## Layout

| Path | What |
| --- | --- |
| `who-was-satoshi.pptx` | the deck |
| `renders/` | every slide as rendered by Keynote, plus `_overview.jpg` |
| `source/` | the original 58-scene deck, its images, and its notes (`original-notes.md`) |
| `assets/` | the photos, cut from the original slides and given one treatment |
| `build/content.js` | **the words** — one entry per slide; edit this to change text |
| `build/build.js` | the design — type sizes, colours, slide layouts |
| `build/images.sh` | which photo is cut from where (calls `treat-images.sh`) |

## Rebuild

```bash
cd build
./images.sh        # only if the photos change
node build.js      # writes ../who-was-satoshi.pptx
./render.sh        # optional: re-render renders/ through Keynote
```

`build.js` measures every word with the real Helvetica Neue metrics and sets the line
breaks itself, so Keynote never re-wraps a headline. In `content.js`, `*word*` is the
orange highlight and `\n` is a line break the layout keeps.

## Design

Black, white Helvetica Neue (Bold / Light), one highlight colour — Bitcoin orange
`#F7931A`. A thin 1972 → 2014 timeline runs along the bottom; the orange dot marks
the year on screen, and chapter dividers light up their span.

Build sequences (the nonce search, the small world, the commit gap) keep their
shared objects in identical positions: select those slides in Keynote and set the
transition to **Magic Move** to animate them.
