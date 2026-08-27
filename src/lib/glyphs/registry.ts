/**
 * The single source of truth for glyph and stave geometry.
 *
 * Before this module the numbers lived in three places at once: module-level
 * constants inside each renderer (`NH_WIDTH`, `BEAM_THICKNESS`,
 * `ACCIDENTAL_FONT_RATIO`, …), a partial copy in `layout/constants.ts`, and
 * nothing at all in CSS. Values drifted — `18` was spelled out in three files
 * and the rehearsal size disagreed with itself.
 *
 * Everything now resolves from METRIC_DEFS below. Each entry declares where
 * its default comes from:
 *
 *   source: "smufl"   → read from the font's own engravingDefaults, so the
 *                       geometry matches the typeface being rendered
 *   source: "chordee" → chordee's own layout choice, which SMuFL does not
 *                       specify (slash-notation sizing, base type sizes)
 *
 * METRIC_DEFS also carries the label/unit/range for each metric, so the
 * settings UI is generated from this table rather than hand-listing fields.
 */
import {
  SMUFL_FONTS,
  type SmuflEngravingDefaults,
  type SmuflFontName,
} from "./smuflData"

export { SMUFL_CODEPOINTS, SMUFL_FONTS, smuflChar } from "./smuflData"
export type { SmuflFontName, SmuflGlyphName } from "./smuflData"

// ── Staff space ────────────────────────────────────────────────────────
//
// SMuFL publishes every engraving value in staff spaces. A 5-line stave
// spans 4 spaces, so one space is a quarter of the stave height. This is the
// conversion factor between font units and our pixel coordinates.

/** Stave height in px. Fixed — the stave does not scale with type size. */
export const STAVE_HEIGHT = 32
/** A 5-line stave spans 4 spaces. */
export const STAVE_SPACES = 4
/** One staff space, in px. */
export const STAFF_SPACE_PX = STAVE_HEIGHT / STAVE_SPACES

/** Convert a staff-space measurement to px. */
export function spacesToPx(spaces: number): number {
  return spaces * STAFF_SPACE_PX
}

// ── Metric definitions ─────────────────────────────────────────────────

export type MetricUnit = "spaces" | "px" | "ratio"
export type MetricGroup = "engraving" | "slash" | "type"

export interface MetricDef {
  key: GlyphMetricKey
  label: string
  group: MetricGroup
  unit: MetricUnit
  min: number
  max: number
  step: number
  description: string
  /** "smufl" defaults come from the font; "chordee" from `fallback`. */
  source: "smufl" | "chordee"
  smuflKey?: keyof SmuflEngravingDefaults
  fallback?: number
}

export const METRIC_DEFS = [
  // ── Engraving ratios, published by the font ──────────────────────────
  {
    key: "staffLineThickness",
    label: "Staff line",
    group: "engraving",
    unit: "spaces",
    min: 0.05,
    max: 0.4,
    step: 0.01,
    description: "Thickness of each stave line.",
    source: "smufl",
    smuflKey: "staffLineThickness",
  },
  {
    key: "stemThickness",
    label: "Stem",
    group: "engraving",
    unit: "spaces",
    min: 0.05,
    max: 0.4,
    step: 0.01,
    description: "Thickness of note stems.",
    source: "smufl",
    smuflKey: "stemThickness",
  },
  {
    key: "beamThickness",
    label: "Beam",
    group: "engraving",
    unit: "spaces",
    min: 0.2,
    max: 1,
    step: 0.01,
    description: "Thickness of each beam.",
    source: "smufl",
    smuflKey: "beamThickness",
  },
  {
    key: "beamSpacing",
    label: "Beam gap",
    group: "engraving",
    unit: "spaces",
    min: 0.05,
    max: 0.8,
    step: 0.01,
    description: "Gap between stacked beams.",
    source: "smufl",
    smuflKey: "beamSpacing",
  },
  {
    key: "thinBarlineThickness",
    label: "Thin barline",
    group: "engraving",
    unit: "spaces",
    min: 0.05,
    max: 0.5,
    step: 0.01,
    description: "Ordinary barline thickness.",
    source: "smufl",
    smuflKey: "thinBarlineThickness",
  },
  {
    key: "thickBarlineThickness",
    label: "Thick barline",
    group: "engraving",
    unit: "spaces",
    min: 0.2,
    max: 1.2,
    step: 0.01,
    description: "Final and repeat barline thickness.",
    source: "smufl",
    smuflKey: "thickBarlineThickness",
  },
  {
    key: "barlineSeparation",
    label: "Barline gap",
    group: "engraving",
    unit: "spaces",
    min: 0.1,
    max: 1.2,
    step: 0.01,
    description: "Gap between paired barlines.",
    source: "smufl",
    smuflKey: "barlineSeparation",
  },
  {
    key: "repeatBarlineDotSeparation",
    label: "Repeat dot gap",
    group: "engraving",
    unit: "spaces",
    min: 0.05,
    max: 1,
    step: 0.01,
    description: "Gap between repeat dots and their barline.",
    source: "smufl",
    smuflKey: "repeatBarlineDotSeparation",
  },
  {
    key: "tupletBracketThickness",
    label: "Tuplet bracket",
    group: "engraving",
    unit: "spaces",
    min: 0.05,
    max: 0.5,
    step: 0.01,
    description: "Thickness of tuplet brackets.",
    source: "smufl",
    smuflKey: "tupletBracketThickness",
  },
  {
    key: "tieEndpointThickness",
    label: "Tie endpoint",
    group: "engraving",
    unit: "spaces",
    min: 0.02,
    max: 0.4,
    step: 0.01,
    description: "Tie thickness where it meets a notehead.",
    source: "smufl",
    smuflKey: "tieEndpointThickness",
  },
  {
    key: "tieMidpointThickness",
    label: "Tie midpoint",
    group: "engraving",
    unit: "spaces",
    min: 0.05,
    max: 0.6,
    step: 0.01,
    description: "Tie thickness at its thickest point.",
    source: "smufl",
    smuflKey: "tieMidpointThickness",
  },

  // ── Slash notation — chordee's own, not covered by SMuFL ─────────────
  {
    key: "slashNoteheadWidth",
    label: "Slash width",
    group: "slash",
    unit: "spaces",
    min: 0.4,
    max: 2.5,
    step: 0.05,
    description: "Horizontal reach of a slash notehead.",
    source: "chordee",
    fallback: 1,
  },
  {
    key: "slashNoteheadHeight",
    label: "Slash height",
    group: "slash",
    unit: "spaces",
    min: 0.5,
    max: 3,
    step: 0.05,
    description: "Vertical reach of a slash notehead.",
    source: "chordee",
    fallback: 1.5,
  },
  {
    key: "slashNoteheadThickness",
    label: "Slash stroke",
    group: "slash",
    unit: "spaces",
    min: 0.05,
    max: 0.8,
    step: 0.01,
    description: "Stroke weight of the slash itself.",
    source: "chordee",
    fallback: 0.25,
  },
  {
    key: "stemLength",
    label: "Stem length",
    group: "slash",
    unit: "spaces",
    min: 1,
    max: 5,
    step: 0.05,
    description: "Stem length from notehead to beam.",
    source: "chordee",
    fallback: 2.5,
  },
  {
    key: "articulationOffset",
    label: "Articulation gap",
    group: "slash",
    unit: "spaces",
    min: 0.1,
    max: 2,
    step: 0.05,
    description: "Gap between a notehead and its articulation mark.",
    source: "chordee",
    fallback: 0.75,
  },

  // ── Type sizes ───────────────────────────────────────────────────────
  {
    key: "chordFontSize",
    label: "Chord",
    group: "type",
    unit: "px",
    min: 8,
    max: 48,
    step: 1,
    description: "Base chord symbol size before user scaling.",
    source: "chordee",
    fallback: 18,
  },
  {
    key: "lyricFontSize",
    label: "Lyric",
    group: "type",
    unit: "px",
    min: 6,
    max: 36,
    step: 1,
    description: "Base lyric size before user scaling.",
    source: "chordee",
    fallback: 13,
  },
  {
    key: "sectionFontSize",
    label: "Section",
    group: "type",
    unit: "px",
    min: 8,
    max: 40,
    step: 1,
    description: "Base section heading size.",
    source: "chordee",
    fallback: 15,
  },
  {
    key: "rehearsalFontSize",
    label: "Rehearsal mark",
    group: "type",
    unit: "px",
    min: 8,
    max: 40,
    step: 1,
    description: "Base rehearsal mark size.",
    source: "chordee",
    fallback: 13,
  },
  {
    key: "dynamicFontSize",
    label: "Dynamic",
    group: "type",
    unit: "px",
    min: 6,
    max: 36,
    step: 1,
    description: "Base dynamic marking size.",
    source: "chordee",
    fallback: 13,
  },
  {
    key: "clefFontSize",
    label: "Clef",
    group: "type",
    unit: "px",
    min: 12,
    max: 72,
    step: 1,
    description: "Clef glyph size.",
    source: "chordee",
    fallback: 32,
  },
  {
    key: "timeSigFontSize",
    label: "Time signature",
    group: "type",
    unit: "px",
    min: 10,
    max: 64,
    step: 1,
    description: "Time signature digit size.",
    source: "chordee",
    fallback: 28,
  },
  {
    key: "accidentalFontRatio",
    label: "Accidental ratio",
    group: "type",
    unit: "ratio",
    min: 0.2,
    max: 1.5,
    step: 0.05,
    description: "Key signature accidental size, relative to the clef.",
    source: "chordee",
    fallback: 0.5,
  },
] as const satisfies readonly MetricDefShape[]

/** Structural constraint for METRIC_DEFS entries (pre-key-inference). */
interface MetricDefShape {
  key: string
  label: string
  group: MetricGroup
  unit: MetricUnit
  min: number
  max: number
  step: number
  description: string
  source: "smufl" | "chordee"
  smuflKey?: keyof SmuflEngravingDefaults
  fallback?: number
}

export type GlyphMetricKey = (typeof METRIC_DEFS)[number]["key"]

/** User edits: any subset of metrics, in each metric's declared unit. */
export type GlyphMetricOverrides = Partial<Record<GlyphMetricKey, number>>

/** Every metric resolved to its declared unit (spaces / px / ratio). */
export type GlyphMetricValues = Record<GlyphMetricKey, number>

export const METRIC_GROUP_LABELS: Record<MetricGroup, string> = {
  engraving: "Engraving",
  slash: "Slash notation",
  type: "Type sizes",
}

// ── Resolution ─────────────────────────────────────────────────────────

/**
 * Font-default value for a metric, before any user override.
 * SMuFL-sourced metrics follow the selected font; the rest are chordee's.
 */
export function metricDefault(
  def: MetricDef,
  font: SmuflFontName,
): number {
  if (def.source === "smufl" && def.smuflKey) {
    return SMUFL_FONTS[font].engravingDefaults[def.smuflKey]
  }
  return def.fallback ?? 0
}

/** All defaults for a font, with no overrides applied. */
export function defaultMetrics(font: SmuflFontName): GlyphMetricValues {
  const out = {} as GlyphMetricValues
  for (const def of METRIC_DEFS as readonly MetricDef[]) {
    out[def.key] = metricDefault(def, font)
  }
  return out
}

/**
 * Font defaults with user overrides applied. Out-of-range and non-finite
 * overrides are dropped rather than clamped — a nonsensical stored value
 * should fall back to the font's own number, not to an arbitrary edge.
 */
export function resolveMetrics(
  font: SmuflFontName,
  overrides?: GlyphMetricOverrides,
): GlyphMetricValues {
  const out = defaultMetrics(font)
  if (!overrides) return out
  for (const def of METRIC_DEFS as readonly MetricDef[]) {
    const value = overrides[def.key]
    if (typeof value !== "number" || !Number.isFinite(value)) continue
    if (value < def.min || value > def.max) continue
    out[def.key] = value
  }
  return out
}

/**
 * Resolved metrics converted to px, ready for a renderer to consume.
 * "spaces" metrics are multiplied out; "px" and "ratio" pass through.
 */
export type GlyphMetricsPx = Record<GlyphMetricKey, number>

export function resolveMetricsPx(
  font: SmuflFontName,
  overrides?: GlyphMetricOverrides,
): GlyphMetricsPx {
  const values = resolveMetrics(font, overrides)
  const out = {} as GlyphMetricsPx
  for (const def of METRIC_DEFS as readonly MetricDef[]) {
    out[def.key] = def.unit === "spaces" ? spacesToPx(values[def.key]) : values[def.key]
  }
  return out
}

/** Which SMuFL font backs a configured font-family string. */
export function smuflFontFor(fontFamily: string | undefined): SmuflFontName {
  return fontFamily && fontFamily.toLowerCase().includes("bravura")
    ? "Bravura"
    : "Petaluma"
}

export const DEFAULT_SMUFL_FONT: SmuflFontName = "Petaluma"
