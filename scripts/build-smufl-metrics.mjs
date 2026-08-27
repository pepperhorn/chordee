/**
 * Extracts the slice of SMuFL font metadata that chordee actually renders
 * with, and emits it as a compact TypeScript module.
 *
 * The upstream metadata files are large (Petaluma ~370 KB, Bravura ~1.2 MB)
 * and mostly describe glyphs we never draw. Shipping them whole would bloat
 * an installable PWA, so this script keeps only:
 *
 *   - engravingDefaults — the engraving ratios (stem/beam/barline thickness,
 *     etc.), expressed in staff spaces
 *   - glyphBBoxes for GLYPHS below — needed to place glyphs by their real
 *     ink extents rather than by guessed offsets
 *
 * Usage:
 *   node scripts/build-smufl-metrics.mjs <petaluma.json> <bravura.json>
 *
 * Sources (SIL OFL):
 *   https://github.com/steinbergmedia/petaluma  redist/petaluma_metadata.json
 *   https://github.com/steinbergmedia/bravura   redist/Bravura.json
 */
import { readFileSync, writeFileSync } from "node:fs"

/** SMuFL canonical name → codepoint. Only glyphs chordee renders. */
const GLYPHS = {
  // Clefs
  gClef: "E050",
  cClef: "E05C",
  fClef: "E062",
  unpitchedPercussionClef1: "E069",
  // Accidentals
  accidentalFlat: "E260",
  accidentalNatural: "E261",
  accidentalSharp: "E262",
  // Rests
  restWhole: "E4E3",
  restHalf: "E4E4",
  restQuarter: "E4E5",
  rest8th: "E4E6",
  rest16th: "E4E7",
  rest32nd: "E4E8",
  // Slash noteheads (rhythm notation)
  noteheadSlashVerticalEnds: "E100",
  noteheadSlashHorizontalEnds: "E101",
  noteheadSlashWhiteWhole: "E102",
  noteheadSlashWhiteHalf: "E103",
  // Time signature digits
  timeSig0: "E080",
  timeSig1: "E081",
  timeSig2: "E082",
  timeSig3: "E083",
  timeSig4: "E084",
  timeSig5: "E085",
  timeSig6: "E086",
  timeSig7: "E087",
  timeSig8: "E088",
  timeSig9: "E089",
  // Repeat dots
  repeatDot: "E044",
}

/**
 * engravingDefaults keys to carry across. Restricted to the ones present in
 * BOTH fonts so the emitted type is total — Bravura additionally publishes
 * hBarThickness, thinThickBarlineSeparation and textFontFamily, which
 * chordee does not use.
 */
const DEFAULT_KEYS = [
  "arrowShaftThickness",
  "barlineSeparation",
  "beamSpacing",
  "beamThickness",
  "bracketThickness",
  "dashedBarlineDashLength",
  "dashedBarlineGapLength",
  "dashedBarlineThickness",
  "hairpinThickness",
  "legerLineExtension",
  "legerLineThickness",
  "lyricLineThickness",
  "octaveLineThickness",
  "pedalLineThickness",
  "repeatBarlineDotSeparation",
  "repeatEndingLineThickness",
  "slurEndpointThickness",
  "slurMidpointThickness",
  "staffLineThickness",
  "stemThickness",
  "subBracketThickness",
  "textEnclosureThickness",
  "thickBarlineThickness",
  "thinBarlineThickness",
  "tieEndpointThickness",
  "tieMidpointThickness",
  "tupletBracketThickness",
]

const round = (n) => Math.round(n * 10000) / 10000

function extract(path) {
  const meta = JSON.parse(readFileSync(path, "utf8"))
  const defaults = {}
  for (const key of DEFAULT_KEYS) {
    const value = meta.engravingDefaults?.[key]
    if (typeof value !== "number") {
      throw new Error(`${meta.fontName}: missing engravingDefaults.${key}`)
    }
    defaults[key] = round(value)
  }

  const boxes = {}
  const missing = []
  for (const name of Object.keys(GLYPHS)) {
    const box = meta.glyphBBoxes?.[name]
    if (!box) {
      missing.push(name)
      continue
    }
    boxes[name] = {
      bBoxNE: box.bBoxNE.map(round),
      bBoxSW: box.bBoxSW.map(round),
    }
  }

  return {
    fontName: meta.fontName,
    fontVersion: String(meta.fontVersion),
    engravingDefaults: defaults,
    glyphBBoxes: boxes,
    missing,
  }
}

const [, , petalumaPath, bravuraPath] = process.argv
if (!petalumaPath || !bravuraPath) {
  console.error("usage: node scripts/build-smufl-metrics.mjs <petaluma.json> <bravura.json>")
  process.exit(1)
}

const fonts = {
  Petaluma: extract(petalumaPath),
  Bravura: extract(bravuraPath),
}

for (const [name, data] of Object.entries(fonts)) {
  if (data.missing.length) {
    console.warn(`  ${name}: ${data.missing.length} glyph(s) absent — ${data.missing.join(", ")}`)
  }
  delete data.missing
}

const body = `// GENERATED FILE — DO NOT EDIT BY HAND.
// Regenerate with: node scripts/build-smufl-metrics.mjs <petaluma.json> <bravura.json>
//
// Extracted from the upstream SMuFL metadata published by Steinberg (SIL OFL):
//   Petaluma ${fonts.Petaluma.fontVersion} — steinbergmedia/petaluma, redist/petaluma_metadata.json
//   Bravura  ${fonts.Bravura.fontVersion} — steinbergmedia/bravura,  redist/Bravura.json
//
// All engraving values are in STAFF SPACES, the unit SMuFL publishes them in.
// Multiply by the pixel size of one staff space to get device units.

/** Codepoint for each SMuFL glyph chordee renders. */
export const SMUFL_CODEPOINTS = ${JSON.stringify(GLYPHS, null, 2)} as const

export type SmuflGlyphName = keyof typeof SMUFL_CODEPOINTS

/** Glyph ink extents, in staff spaces, relative to the glyph origin. */
export interface SmuflGlyphBBox {
  /** North-east corner: [x, y] */
  bBoxNE: [number, number]
  /** South-west corner: [x, y] */
  bBoxSW: [number, number]
}

/** Engraving ratios published by the font, in staff spaces. */
export interface SmuflEngravingDefaults {
${DEFAULT_KEYS.map((k) => `  ${k}: number`).join("\n")}
}

export interface SmuflFontData {
  fontName: string
  fontVersion: string
  engravingDefaults: SmuflEngravingDefaults
  glyphBBoxes: Partial<Record<SmuflGlyphName, SmuflGlyphBBox>>
}

export type SmuflFontName = "Petaluma" | "Bravura"

export const SMUFL_FONTS: Record<SmuflFontName, SmuflFontData> = ${JSON.stringify(fonts, null, 2)}

/** Resolve a glyph's character, or undefined when the font lacks it. */
export function smuflChar(name: SmuflGlyphName): string {
  return String.fromCodePoint(parseInt(SMUFL_CODEPOINTS[name], 16))
}
`

writeFileSync("src/lib/glyphs/smuflData.ts", body)
console.log(`wrote src/lib/glyphs/smuflData.ts (${(body.length / 1024).toFixed(1)} KB)`)
