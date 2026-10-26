// generates generated/ from the official vectors. the official folders (laaabs/, baaar/, ...) are never written.
//
//   npm run brand             everything
//   npm run brand -- laaabs   one product
//
// rasterising uses inkscape (brew install inkscape). the studio wordmark keeps its own path order and
// fill rules as drawn; the dot is the rightmost path and is tinted cyan where the rules say so.
import { mkdir, readFile, writeFile, rm, readdir, stat, access } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const gen = join(root, 'generated')
const black = '#0a0a0a'
const white = '#ffffff'
const cyan = '#00b5e2'
const products = ['laaabs', 'baaar', 'haaarness', 'speaaak', 'islaaand', 'clipboaaard', 'terminaaal', 'taaab', 'caaapture', 'finaaance', 'swaaap']
/** the official vector, or the draft while ángel has not drawn it yet (drafts/README.md) */
const source = async (product) => {
  const official = join(root, product, 'vector', `${product}.svg`)
  try {
    await access(official)
    return { path: official, draft: false }
  } catch {
    return { path: join(root, 'drafts', `${product}.svg`), draft: true }
  }
}
const only = process.argv[2]

/** the svg's paths as [{ d, rule }], sorted left to right, plus its viewBox */
async function vector(file) {
  const svg = await readFile(file, 'utf8')
  const vb = /viewBox="([\d. ]+)"/.exec(svg)[1].split(' ').map(Number)
  const paths = [...svg.matchAll(/<path([^>]*?) d="([^"]+)"([^>]*)\/>/g)].map((m) => ({
    d: m[2],
    rule: /evenodd/.test(m[1] + m[3]) ? 'evenodd' : 'nonzero',
    x: parseFloat(/M([\d.]+)/.exec(m[2])[1]),
  }))
  paths.sort((a, b) => a.x - b.x)
  return { vb, paths }
}

const attr = (rule) => (rule === 'evenodd' ? ' fill-rule="evenodd" clip-rule="evenodd"' : '')
/** the paths as svg markup, ink for the letters, the last (rightmost) path as the dot when `dot` is set */
const markup = (v, ink, dot) => v.paths.map((p, i) => `<path${attr(p.rule)} d="${p.d}" fill="${dot && i === v.paths.length - 1 ? dot : ink}"/>`).join('\n')
const doc = (v, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${v.vb[2]}" height="${v.vb[3]}" viewBox="${v.vb.join(' ')}" fill="none">\n${body}\n</svg>\n`

function png(svgPath, pngPath, width, height) {
  const args = [svgPath, '--export-type=png', `--export-filename=${pngPath}`, `--export-width=${width}`, '--export-background-opacity=0']
  if (height) args.push(`--export-height=${height}`)
  execFileSync('inkscape', args, { stdio: 'ignore' })
}
async function out(dir) {
  await mkdir(dir, { recursive: true })
  return dir
}

/** a w x h canvas with the mark centred at `share` of the width (or height when tighter); optical shifts it right by half the dot's width */
function compose(v, { w, h, bg = black, ink = white, dot = null, share = 0.6, radius = 0, optical = false, ghost = null }) {
  const [, , vw, vh] = v.vb
  let mw = w * share
  let mh = (mw * vh) / vw
  if (mh > h * share) {
    mh = h * share
    mw = (mh * vw) / vh
  }
  const last = v.paths[v.paths.length - 1]
  const dotShare = (vw - (last.x - 0.04 * vw)) / vw
  const x = (w - mw) / 2 + (optical ? (mw * dotShare) / 2 : 0)
  const y = (h - mh) / 2
  const rect = bg === 'none' ? '' : `<rect width="${w}" height="${h}" rx="${radius}" fill="${bg}"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${rect}${ghost ?? ''}<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${(mw / vw).toFixed(6)})">${markup(v, ink, dot)}</g></svg>\n`
}

async function emit(dir, name, svg, sizes = []) {
  const p = join(dir, `${name}.svg`)
  await writeFile(p, svg)
  for (const s of sizes) {
    const [w, h] = Array.isArray(s) ? s : [s, s]
    png(p, join(dir, `${name}-${w}${Array.isArray(s) ? `x${h}` : ''}.png`), w, h)
  }
}

const wordmarksTs = []
/** the same marks for swift: name, viewBox, letter height, draft, and each path with its fill rule and whether it is the dot */
const marks = []

for (const product of products) {
  if (only && only !== product) continue
  const { path: src, draft } = await source(product)
  if (draft) console.log(`${product}: no vector in ${product}/vector yet, using drafts/${product}.svg`)
  const v = await vector(src)
  const isStudio = product === 'laaabs'
  // every wordmark ends in the dot now, and the dot is always cyan
  const dot = cyan
  const G = join(gen, product)
  const c = (o) => compose(v, { ...o, dot })
  await rm(G, { recursive: true, force: true })

  // wordmark: white and black, svg and png, plus all white for the studio (no cyan)
  const wm = await out(join(G, 'wordmark'))
  await emit(wm, `${product}-white`, doc(v, markup(v, white, dot)), [[2000, Math.round((2000 * v.vb[3]) / v.vb[2])]])
  await emit(wm, `${product}-black`, doc(v, markup(v, black, dot)), [[2000, Math.round((2000 * v.vb[3]) / v.vb[2])]])
  await emit(wm, `${product}-all-white`, doc(v, markup(v, white, null)))
  if (isStudio) {
    const tb = await vector(join(root, product, 'vector', 'things-by-laaabs.svg'))
    await emit(wm, 'things-by-laaabs', doc(tb, markup(tb, white, cyan)), [[2400, Math.round((2400 * tb.vb[3]) / tb.vb[2])]])
    await emit(wm, 'things-by-laaabs-all-white', doc(tb, markup(tb, white, null)))
  }

  // favicon and touch icon (every product has a site)
  const fav = await out(join(G, 'favicon'))
  await emit(fav, 'favicon', c({ w: 64, h: 64, share: 0.8, radius: 12, optical: true }), [64, 32, 16])
  await emit(fav, 'apple-touch-icon', c({ w: 180, h: 180, share: 0.76, optical: true }), [180])

  // icon: every size from the wordmark, square (the os rounds it), plus a native <product>.ico
  // (every product ships a desktop app sooner or later, not just the studio)
  const ic = await out(join(G, 'icon'))
  await emit(ic, 'app-icon', c({ w: 1024, h: 1024, share: 0.72, optical: true }), [1024, 512, 256, 128, 64, 32, 16])
  const icoSizes = [16, 32, 64, 128, 256]
  const icoImgs = await Promise.all(icoSizes.map((s) => readFile(join(ic, `app-icon-${s}.png`))))
  const icoHead = Buffer.alloc(6)
  icoHead.writeUInt16LE(1, 2)
  icoHead.writeUInt16LE(icoImgs.length, 4)
  let icoOff = 6 + 16 * icoImgs.length
  const icoEntries = icoImgs.map((img, i) => {
    const e = Buffer.alloc(16)
    e.writeUInt8(icoSizes[i] === 256 ? 0 : icoSizes[i], 0)
    e.writeUInt8(icoSizes[i] === 256 ? 0 : icoSizes[i], 1)
    e.writeUInt16LE(1, 4)
    e.writeUInt16LE(32, 6)
    e.writeUInt32LE(img.length, 8)
    e.writeUInt32LE(icoOff, 12)
    icoOff += img.length
    return e
  })
  await writeFile(join(ic, `${product}.ico`), Buffer.concat([icoHead, ...icoEntries, ...icoImgs]))

  // og image: the wordmark on black, 1200 x 630
  const og = await out(join(G, 'og'))
  await emit(og, `${isStudio ? 'laaabs.com' : `${product}.app`}`, c({ w: 1200, h: 630, share: 0.42 }), [[1200, 630]])

  if (isStudio) {
    for (const site of ['blog', 'jobs', 'brand', 'handbook', 'status', 'updates']) {
      const base = c({ w: 1200, h: 630, share: 0.42 }).replace('</svg>', `<text x="600" y="480" text-anchor="middle" font-family="Outfit, system-ui, sans-serif" font-size="44" font-weight="500" fill="${white}" fill-opacity="0.55">${site}</text></svg>`)
      await emit(og, site, base, [[1200, 630]])
    }
    // app-icon-rounded and the android adaptive icon are studio-only for now
    await emit(ic, 'app-icon-rounded', c({ w: 1024, h: 1024, share: 0.72, optical: true, radius: 229 }), [1024, 512, 256, 180, 120])
    await emit(ic, 'android-foreground', c({ w: 1080, h: 1080, bg: 'none', share: 0.5, optical: true }), [1080, 432, 324, 216, 162, 108])
    await writeFile(join(ic, 'android-background.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080"><rect width="1080" height="1080" fill="${black}"/></svg>\n`)
    png(join(ic, 'android-background.svg'), join(ic, 'android-background-1080.png'), 1080)
    await writeFile(join(fav, 'favicon.ico'), Buffer.concat([icoHead, ...icoEntries, ...icoImgs]))

    // avatars: circle-safe, on black and on white
    const av = await out(join(G, 'avatar'))
    await emit(av, 'black', c({ w: 2000, h: 2000, share: 0.6, optical: true }), [2000, 800])
    await emit(av, 'white', c({ w: 2000, h: 2000, bg: white, ink: black, share: 0.6, optical: true }), [2000, 800])

    // banner drafts: things by laaabs. large in the free zone, the ghost wordmark 5 % bottom-right, clear of the avatar zone
    const bn = await out(join(G, 'banner'))
    const tb = await vector(join(root, product, 'vector', 'things-by-laaabs.svg'))
    const banners = [
      ['linkedin-company', 1128, 191, 330],
      ['linkedin-personal', 1584, 396, 480],
      ['x-header', 1500, 500, 460],
      ['github-social', 1280, 640, 0],
      ['youtube-channel', 2560, 1440, 507, 508, 931],
      ['readme-banner', 1280, 320, 0],
      ['press-card', 1600, 900, 0],
    ]
    for (const [name, w, h, x0, y0 = 0, y1 = h] of banners) {
      const zw = w - x0 - Math.round(w * 0.05)
      const zh = y1 - y0
      let tw = zw * 0.78
      let th = (tw * tb.vb[3]) / tb.vb[2]
      if (th > zh * 0.5) {
        th = zh * 0.5
        tw = (th * tb.vb[2]) / tb.vb[3]
      }
      let gh = h * 0.62
      let gw = (gh * v.vb[2]) / v.vb[3]
      if (w - gw < x0) {
        gw = w - x0
        gh = (gw * v.vb[3]) / v.vb[2]
      }
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${black}"/><g id="ghost" opacity="0.05" transform="translate(${(w - gw).toFixed(2)} ${(h - gh).toFixed(2)}) scale(${(gh / v.vb[3]).toFixed(6)})">${markup(v, white, cyan)}</g><g id="things by laaabs." transform="translate(${(x0 + (zw - tw) / 2).toFixed(2)} ${(y0 + (zh - th) / 2).toFixed(2)}) scale(${(tw / tb.vb[2]).toFixed(6)})">${markup(tb, white, cyan)}</g></svg>\n`
      await emit(bn, `${name}-${w}x${h}`, svg, [[w * 2, h * 2]])
    }
  } else {
    // products: readme banner and press card with the product wordmark, "by laaabs." small
    const bn = await out(join(G, 'banner'))
    const studio = await vector(join(root, 'laaabs', 'vector', 'laaabs.svg'))
    for (const [name, w, h] of [['readme-banner', 1280, 320], ['press-card', 1600, 900]]) {
      const mw = w * 0.36
      const mh = (mw * v.vb[3]) / v.vb[2]
      const sh = h * 0.06
      const sw = (sh * studio.vb[2]) / studio.vb[3]
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${black}"/><g transform="translate(${(w * 0.08).toFixed(2)} ${((h - mh) / 2).toFixed(2)}) scale(${(mw / v.vb[2]).toFixed(6)})">${markup(v, white, null)}</g><text x="${w - sw - w * 0.08 - 12}" y="${h - h * 0.1}" text-anchor="end" font-family="Outfit, system-ui, sans-serif" font-size="${Math.round(sh * 0.9)}" font-weight="500" fill="${white}" fill-opacity="0.55">by</text><g transform="translate(${(w - sw - w * 0.08).toFixed(2)} ${(h - h * 0.1 - sh * 0.9).toFixed(2)}) scale(${(sw / studio.vb[2]).toFixed(6)})">${markup(studio, white, cyan)}</g></svg>\n`
      await emit(bn, `${name}-${w}x${h}`, svg, [[w * 2, h * 2]])
    }
  }

  marks.push({ name: product, vb: v.vb, letterHeight: 1452, draft, paths: v.paths.map((p, i) => ({ d: p.d, nonzero: p.rule === 'nonzero', dot: i === v.paths.length - 1 })) })
  wordmarksTs.push(`  ${product}: { viewBox: [${v.vb.join(', ')}], letterHeight: 1452,${draft ? ' draft: true,' : ''} paths: [\n${v.paths.map((p, i) => `    { d: "${p.d}"${p.rule === 'nonzero' ? ', rule: "nonzero"' : ''}${i === v.paths.length - 1 ? ', dot: true' : ''} },`).join('\n')}\n  ] },`)
}

if (!only) {
  // the tagline and the inline variants of the name (500 for prose, 600 for semibold text, and without the dot for domains and addresses)
  const extra = [
    ['things-by-laaabs', 'things-by-laaabs.svg', true, 145.2],
    ['laaabs-500', 'laaabs-500.svg', true, 1452],
    ['laaabs-600', 'laaabs-600.svg', true, 1452],
    ['laaabs-nodot', 'laaabs-nodot.svg', false, 1452],
    ['laaabs-500-nodot', 'laaabs-500-nodot.svg', false, 1452],
    ['laaabs-600-nodot', 'laaabs-600-nodot.svg', false, 1452],
  ]
  for (const [name, file, hasDot, letterHeight] of extra) {
    const v = await vector(join(root, 'laaabs', 'vector', file))
    marks.push({ name, vb: v.vb, letterHeight, draft: false, paths: v.paths.map((p, i) => ({ d: p.d, nonzero: p.rule === 'nonzero', dot: hasDot && i === v.paths.length - 1 })) })
    wordmarksTs.push(`  '${name}': { viewBox: [${v.vb.join(', ')}], letterHeight: ${letterHeight}, paths: [\n${v.paths.map((p, i) => `    { d: "${p.d}"${p.rule === 'nonzero' ? ', rule: "nonzero"' : ''}${hasDot && i === v.paths.length - 1 ? ', dot: true' : ''} },`).join('\n')}\n  ] },`)
  }
  await writeFile(
    join(gen, 'wordmarks.ts'),
    `// generated by scripts/generate.mjs from <product>/vector/<product>.svg. do not edit by hand.\nexport type WordmarkName = ${[...products, 'things-by-laaabs', 'laaabs-500', 'laaabs-600', 'laaabs-nodot', 'laaabs-500-nodot', 'laaabs-600-nodot'].map((p) => `'${p}'`).join(' | ')}\n\nexport interface WordmarkData { viewBox: [number, number, number, number]; letterHeight: number; draft?: boolean; paths: { d: string; dot?: boolean; rule?: 'nonzero' }[] }\n\nexport const wordmarks: Record<WordmarkName, WordmarkData> = {\n${wordmarksTs.join('\n')}\n}\n`,
  )
  // swift: one file the kit compiles as it is (bylaaabs/ui-swift reads brand/generated/swift)
  const swiftCase = (n) => n.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase()).replace(/^things/, 'things')
  const lit = (x) => (Number.isInteger(x) ? `${x}` : `${+x.toFixed(2)}`)
  await mkdir(join(gen, 'swift'), { recursive: true })
  await writeFile(
    join(gen, 'swift', 'Wordmarks.swift'),
    `// generated by brand/scripts/generate.mjs from <product>/vector/<product>.svg. do not edit by hand.
// the same marks as wordmarks.ts, for the swift kit (bylaaabs/ui-swift).

/// every mark there is: the studio, the products, the lema, and the inline weights of the name
public enum WordmarkName: String, CaseIterable, Sendable {
${marks.map((m) => `    case ${swiftCase(m.name)} = "${m.name}"`).join('\n')}
}

/// one shape of a mark: absolute svg path data (M L H V C Z), its fill rule, and whether it is the dot
public struct WordmarkPath: Sendable {
    public let d: String
    public let nonzero: Bool
    public let isDot: Bool
}

/// a mark: the box it is drawn in, how tall its letters are in that box (the ascender, 1452 on a 2000 em),
/// whether it is still a draft, and its shapes from left to right
public struct WordmarkData: Sendable {
    public let viewBox: (x: Double, y: Double, width: Double, height: Double)
    public let letterHeight: Double
    public let draft: Bool
    public let paths: [WordmarkPath]
}

public enum Wordmarks {
    public static func data(_ name: WordmarkName) -> WordmarkData {
        switch name {
${marks.map((m) => `        case .${swiftCase(m.name)}:
            return WordmarkData(viewBox: (${m.vb.map(lit).join(', ')}), letterHeight: ${lit(m.letterHeight)}, draft: ${m.draft}, paths: [
${m.paths.map((p) => `                WordmarkPath(d: "${p.d}", nonzero: ${p.nonzero}, isDot: ${p.dot}),`).join('\n')}
            ])`).join('\n')}
        }
    }
}
`,
  )
  execFileSync('zip', ['-qr', join(gen, 'laaabs', 'laaabs-brand-kit.zip'), 'laaabs', 'generated/laaabs'], { cwd: root })
}
console.log(`generated${only ? ` (${only})` : ''}`)
