#!/usr/bin/env swift
// Renders the "baaar." wordmark as a vector SVG from Outfit's glyph outlines (weight 700),
// set tight like terminaaal's wordmark: letters close up until they touch, and where a
// round side meets its neighbour the earlier letter is carved back to leave an even gap.
//
//   swift scripts/render-wordmark.swift [font.ttf] [preview.png] [text] [weight] [output.svg]
//
// Writes baaar/Assets.xcassets/Wordmark.imageset/wordmark.svg (letters white, the dot
// #00B5E2). The asset renders as a template, so views tint it as one colour; drawn with
// `.renderingMode(.original)` the dot keeps its cyan. Needs macOS 14 for CGPath booleans.

import CoreGraphics
import CoreText
import Foundation
import ImageIO
import UniformTypeIdentifiers

let arguments = CommandLine.arguments
let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
let fontPath = arguments.count > 1
    ? arguments[1]
    : root.appending(path: "baaar/Resources/Fonts/Outfit-Variable.ttf").path
let previewPath = arguments.count > 2 ? arguments[2] : nil

let text = CommandLine.arguments.count > 3 ? CommandLine.arguments[3] : "baaar."
let weight: CGFloat = CommandLine.arguments.count > 4 ? CGFloat(Double(CommandLine.arguments[4]) ?? 700) : 700
let size: CGFloat = 2000
/// The gap left where letters meet, as a share of the x-height (terminaaal: 100 on a ~1000 x-height).
let gapRatio: CGFloat = 0.1
let white = "#FFFFFF"
let cyan = "#00B5E2"

// MARK: - Font

guard let data = try? Data(contentsOf: URL(fileURLWithPath: fontPath)),
      let descriptor = CTFontManagerCreateFontDescriptorFromData(data as CFData)
else { fatalError("can't read \(fontPath)") }
let wghtTag = 0x7767_6874 // 'wght'
let variation = CTFontDescriptorCreateCopyWithAttributes(
    descriptor, [kCTFontVariationAttribute: [wghtTag: weight]] as CFDictionary
)
let font = CTFontCreateWithFontDescriptor(variation, size, nil)
let xHeight = CTFontGetXHeight(font)
let gap = xHeight * gapRatio

// MARK: - Outlines

struct Letter {
    var path: CGPath
    let isDot: Bool
    let isA: Bool
}

/// what a letter leaves around itself: its outline grown by the gap.
func halo(_ path: CGPath) -> CGPath {
    path.union(path.copy(strokingWithWidth: gap * 2, lineCap: .round, lineJoin: .round, miterLimit: 10))
}

var characters = Array(text.utf16)
var glyphs = [CGGlyph](repeating: 0, count: characters.count)
guard CTFontGetGlyphsForCharacters(font, &characters, &glyphs, characters.count) else { fatalError("missing glyphs") }

var letters: [Letter] = []
var penX: CGFloat = 0
// the dot is not set tight: it sits where outfit puts it, the advance of the letter before it
// minus the wordmarks' tracking (-5 % of the em), as in the official vectors drawn in figma
var advances = [CGSize](repeating: .zero, count: glyphs.count)
CTFontGetAdvancesForGlyphs(font, .horizontal, glyphs, &advances, glyphs.count)
var pens: [CGFloat] = []
for (index, glyph) in glyphs.enumerated() {
    guard let outline = CTFontCreatePathForGlyph(font, glyph, nil)?.normalized(using: .winding) else { continue }
    let character = Character(UnicodeScalar(characters[index])!)
    let bounds = outline.boundingBoxOfPath
    // A straight stem (b, r) or the dot keeps a gap; a bowl (a) closes up until it touches, then carves.
    let straightLeft = character == "b"
    if character == ".", let previousPen = pens.last {
        // where outfit puts the dot after this letter, kerning included: lay out the pair and read the offset
        let pair = String([Character(UnicodeScalar(characters[index - 1])!), "."])
        let line = CTLineCreateWithAttributedString(NSAttributedString(string: pair, attributes: [NSAttributedString.Key(kCTFontAttributeName as String): font]))
        let dotOffset = CTLineGetOffsetForStringIndex(line, 1, nil)
        penX = previousPen + dotOffset - size * 0.03
    } else if let previousPen = pens.last, character != "a", characters[index - 1] != UInt16(("a" as Character).asciiValue!) {
        // only the a's close up (to each other and to their neighbours); every other pair keeps outfit's
        // spacing, kerning included, with the wordmarks' tracking (-5 % of the em)
        let pair = String([Character(UnicodeScalar(characters[index - 1])!), character])
        let line = CTLineCreateWithAttributedString(NSAttributedString(string: pair, attributes: [NSAttributedString.Key(kCTFontAttributeName as String): font]))
        penX = previousPen + CTLineGetOffsetForStringIndex(line, 1, nil) - size * 0.03
    } else if let previous = letters.last {
        // The previous letter's right edge within this letter's height, so the dot tucks under the r's arm.
        let band = CGPath(rect: CGRect(x: -1e6, y: bounds.minY, width: 2e6, height: bounds.height), transform: nil)
        let previousRight = previous.path.intersection(band).boundingBoxOfPath.maxX
        penX = previousRight + (straightLeft || character == "." ? gap : 0) - bounds.minX
    } else {
        penX = -bounds.minX
    }
    var transform = CGAffineTransform(translationX: penX, y: 0)
    var placed = outline.copy(using: &transform)!
    // a pair with no a is never carved: when the tracking brings it closer than the gap (finaaance's
    // f and i, n and c), the later letter moves right until the gap is even, and both stay whole.
    if let previous = letters.last, !previous.isA, character != "a", character != "." {
        while previous.path.intersects(halo(placed)) {
            penX += 2
            transform = CGAffineTransform(translationX: penX, y: 0)
            placed = outline.copy(using: &transform)!
        }
    }
    pens.append(penX)
    letters.append(Letter(path: placed, isDot: character == ".", isA: character == "a"))
}

// Carve each letter back from the one after it, so touching shapes keep an even gap.
for index in letters.indices.dropLast() {
    // the dot keeps its own distance, so it never carves the letter before it (the r's arm stays whole)
    if letters[index + 1].isDot { continue }
    // only the a's carve and are carved: every other pair was set apart above.
    guard letters[index].isA || letters[index + 1].isA else { continue }
    letters[index].path = letters[index].path.subtracting(halo(letters[index + 1].path))
}

// MARK: - SVG

let bounds = letters.reduce(CGRect.null) { $0.union($1.path.boundingBoxOfPath) }
let width = bounds.width, height = bounds.height

func number(_ value: CGFloat) -> String {
    let rounded = (value * 100).rounded() / 100
    return rounded == rounded.rounded() ? String(Int(rounded)) : String(format: "%.2f", rounded)
}

/// SVG path data, moved to the origin with y pointing down.
func svgData(_ path: CGPath) -> String {
    var parts: [String] = []
    func point(_ p: CGPoint) -> String { "\(number(p.x - bounds.minX)) \(number(bounds.maxY - p.y))" }
    path.applyWithBlock { element in
        let points = element.pointee.points
        switch element.pointee.type {
        case .moveToPoint: parts.append("M\(point(points[0]))")
        case .addLineToPoint: parts.append("L\(point(points[0]))")
        case .addQuadCurveToPoint: parts.append("Q\(point(points[0])) \(point(points[1]))")
        case .addCurveToPoint: parts.append("C\(point(points[0])) \(point(points[1])) \(point(points[2]))")
        case .closeSubpath: parts.append("Z")
        @unknown default: break
        }
    }
    return parts.joined()
}

var svg = "<svg width=\"\(number(width))\" height=\"\(number(height))\" viewBox=\"0 0 \(number(width)) \(number(height))\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\">\n"
for letter in letters {
    svg += "<path fill-rule=\"evenodd\" clip-rule=\"evenodd\" d=\"\(svgData(letter.path))\" fill=\"\(letter.isDot ? cyan : white)\"/>\n"
}
svg += "</svg>\n"

let output = CommandLine.arguments.count > 5 ? URL(fileURLWithPath: CommandLine.arguments[5]) : root.appending(path: "baaar/Assets.xcassets/Wordmark.imageset/wordmark.svg")
try FileManager.default.createDirectory(at: output.deletingLastPathComponent(), withIntermediateDirectories: true)
try svg.write(to: output, atomically: true, encoding: .utf8)
print("wrote \(output.path) (\(number(width)) x \(number(height)))")

// MARK: - Preview

if let previewPath {
    let scale: CGFloat = 0.2, margin: CGFloat = 40
    let pixelWidth = Int(width * scale + margin * 2), pixelHeight = Int(height * scale + margin * 2)
    let context = CGContext(
        data: nil, width: pixelWidth, height: pixelHeight, bitsPerComponent: 8, bytesPerRow: 0,
        space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
    )!
    context.setFillColor(CGColor(srgbRed: 0.04, green: 0.04, blue: 0.04, alpha: 1))
    context.fill(CGRect(x: 0, y: 0, width: pixelWidth, height: pixelHeight))
    context.translateBy(x: margin, y: margin)
    context.scaleBy(x: scale, y: scale)
    context.translateBy(x: -bounds.minX, y: -bounds.minY)
    for letter in letters {
        context.setFillColor(letter.isDot
            ? CGColor(srgbRed: 0, green: 0xB5 / 255.0, blue: 0xE2 / 255.0, alpha: 1)
            : CGColor(srgbRed: 1, green: 1, blue: 1, alpha: 1))
        context.addPath(letter.path)
        context.fillPath(using: .evenOdd)
    }
    let destination = CGImageDestinationCreateWithURL(URL(fileURLWithPath: previewPath) as CFURL, UTType.png.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(destination, context.makeImage()!, nil)
    CGImageDestinationFinalize(destination)
    print("wrote \(previewPath)")
}
