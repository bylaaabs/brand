# drafts

wordmarks that do not exist in figma yet, rendered from outfit 700 by `scripts/render-draft.swift` so the web and the apps can use them. **not the brand**: each one is replaced by the vector ángel draws, and the generator switches to it on its own.

- `taaab.svg`, `caaapture.svg`, `finaaance.svg` - 2026-09-30, for bylaaabs/laaabs.com#36. the real ones: bylaaabs/brand#13.

how they are set, checked against the seven official marks (`laaabs.`, `terminaaal.` and `baaar.` come out within 4 units of the figma width, the widest miss is `clipboaaard.` at 0.9 %):

- the a's close up to each other and to their neighbours, and a round side that touches is carved back to an even gap (a tenth of the x-height)
- every other pair keeps outfit's spacing with its kerning, tracked -3 % of the em
- the dot sits where outfit's kerning puts it after the last letter, with the same tracking, and never carves that letter

```sh
swift scripts/render-draft.swift <Outfit-Variable.ttf> <preview.png> "taaab." 700 drafts/taaab.svg
```

when the real vector lands in `<product>/vector/`, delete the draft here.
