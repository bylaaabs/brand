# brand

the brand of laaabs. and of every product, in one place. by laaabs.

## the rules

- the icon is the wordmark. there is no symbol, no monogram, never the dot alone.
- everything lowercase. `laaabs.` with the dot when it stands alone; product names never typed, always the wordmark.
- black `#0a0a0a`, white `#ffffff`, cyan `#00b5e2` only as a signal: the dot, leds, focus. never a cyan background. never the wordmark on cyan.
- outfit 700, tight-set. the wordmark is a drawing, not text: never retype it.
- clear space around the wordmark: the height of the a on every side. minimum width 96 px; below that, the favicon.
- on square formats (icons, avatars, favicons) the mark is optically centred: shifted right by half the dot's width, so the letters sit on the centre.

## the tree

one folder per product. inside, what ángel exports from figma by hand: that is the brand.

```
laaabs/
  vector/    laaabs.svg, things-by-laaabs.svg     the source of everything
  wordmark/  the wordmark as png
  logo/      logo.png (2000)
  icon/      icon.png (1024, the app icon)
  banner/    linkedin, x, github, ... as exported
baaar/  haaarness/  speaaak/  islaaand/  clipboaaard/  terminaaal/
  the same folders, with what exists for each
```

`generated/` holds what `scripts/generate.mjs` derives from the vectors: never edit it, it is rewritten on every run.

```
generated/
  laaabs/      wordmark/ (white, black, all white, things by), icon/ (1024 to 16, .ico, android adaptive),
               favicon/, avatar/ (circle-safe), og/ (one per site), banner/ (drafts and svgs for figma), laaabs-brand-kit.zip
  <product>/   wordmark/, favicon/, og/, banner/ (readme banner, press card)
  wordmarks.ts the paths of every wordmark, for ui-web
```

## how it flows

1. a vector changes in figma. export it to `<product>/vector/`.
2. `npm run brand` (needs inkscape: `brew install inkscape`). `generated/` is rewritten.
3. pull request. every consumer imports this repo as a git submodule and moves its pointer when it wants: `ui-web` (and every web through it), `brand.laaabs.com`, each app, the native kits when they exist.

`scripts/render-wordmark.swift` sets a new product wordmark from outfit's outlines, tight, the way every one here was made.
