# brand

the brand of laaabs. and of every product, in one place. by laaabs.

## the rules

- the icon is the wordmark. there is no symbol, no monogram, never the dot alone.
- everything lowercase. `laaabs.` with the dot when it stands alone; product names never typed, always the wordmark.
- black `#0a0a0a`, white `#ffffff`, cyan `#00b5e2` only as a signal: the dot, leds, focus. never a cyan background. never the wordmark on cyan.
- the status colours (`success`, `danger`, `attention`, `important`) only for a status, never decoration, always with a word or an icon.
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
  swift/       the same marks for ui-swift
  tokens/      the design tokens, one file per kit (below)
```

## the tokens

`tokens/tokens.json` is the one source of the design tokens of every kit: the solid colours (black, white, cyan and its text and deep, the surfaces, the solid lines, the status colours) and the font families. w3c design tokens format. the key is the name in ui-web; `$extensions.com.laaabs.swift` is the name in ui-swift where it differs, and `platforms` lists the kits that carry a token when not all of them do (the web's surface ladder, the apps' solid lines). tints and the white-opacity ladder are not here: each kit derives them (cyan at 12 %, white at 55 %).

`scripts/tokens.mjs` (plain node, no dependencies) writes `generated/tokens/`:

| file | kit | what |
| --- | --- | --- |
| `tokens.css` | ui-web | a tailwind `@theme`: `--color-<name>`, `--font-<name>`, the names the webs already use |
| `swift/BrandTokens.swift` | ui-swift | `BrandTokens.Colors.<name>` as hex literals and `BrandTokens.Fonts`; `BrandColors` is built from them |
| `android/BrandTokens.kt` | ui-android | argb longs and font families, a stub until the kit reads it |
| `winui/BrandTokens.xaml` | ui-winui | a resource dictionary, `Laaabs<Name>Color` / `Brush` / `Font`, a stub too |

### how it flows

1. a value changes in the pencil canvas or figma. change it in `tokens/tokens.json`, nowhere else.
2. `npm run tokens` (or `npm run brand`, which runs it first). `generated/tokens/` is rewritten; commit it with the json.
3. pull request here. after it merges, each kit moves its `brand` submodule pointer: ui-web imports `brand/generated/tokens/tokens.css` from its `src/tokens.css`, ui-swift compiles `brand/generated/tokens/swift` as the `LaaabsTokens` target. every web then moves its `ui` submodule, every app its kit.
4. a new token: add it to the json with the name each kit will use, rerun, and use it in the kits. never type a hex value in a kit.

## how the marks flow

1. a vector changes in figma. export it to `<product>/vector/`.
2. `npm run brand` (needs inkscape: `brew install inkscape`). `generated/` is rewritten.
3. pull request. every consumer imports this repo as a git submodule and moves its pointer when it wants: `ui-web` (and every web through it), `brand.laaabs.com`, each app, the native kits when they exist.

`scripts/render-wordmark.swift` sets a new product wordmark from outfit's outlines, tight, the way every one here was made.
