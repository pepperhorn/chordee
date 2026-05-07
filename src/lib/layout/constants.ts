export const DEFAULT_SPACING = {
  beatPaddingX: 8,
  barPaddingX: 12,
  barGap: 4,
  sectionGap: 24,
  lineHeight: 24,
  lyricLineHeight: 18,
  staveHeight: 32,
  headerHeight: 28,
  chartPaddingX: 40,
  chartPaddingY: 40,
  clefKeySigWidth: 0,
}

export const DEFAULT_FONT_SIZES = {
  chord: 18,
  lyric: 13,
  section: 15,
  rehearsal: 16,
  dynamic: 13,
}

export const DIVISION_MULTIPLIERS: Record<string, number> = {
  quarter: 1.0,
  eighth: 1.2,
  eighthTriplet: 1.5,
  sixteenth: 1.8,
  sixteenthTriplet: 2.0,
  thirtySecond: 2.2,
  half: 0.8,
  whole: 0.6,
  quarterTriplet: 1.3,
}

export const MIN_BEAT_WIDTH = 40
export const MIN_BAR_WIDTH = 80

export const BARLINE_WIDTHS: Record<string, number> = {
  single: 1,
  double: 3,
  final: 4,
  repeatStart: 12,
  repeatEnd: 12,
}

/** Resolve a measure's start/end barline widths in one place so engine
 *  passes (compute + build) can't drift. */
export function getMeasureBarlineWidths(measure: {
  barlineStart?: string
  barlineEnd?: string
}): { start: number; end: number } {
  return {
    start: BARLINE_WIDTHS[measure.barlineStart ?? "single"] ?? 1,
    end: BARLINE_WIDTHS[measure.barlineEnd ?? "single"] ?? 1,
  }
}

// ── Stave geometry ─────────────────────────────────────────────────────
//
// Vertical positions for stave-related elements all scale with the chord
// font size. Centralizing them here keeps BarGroup, BeatSlotGroup, and
// any future stave-touching renderer in lockstep — previously the
// constants were duplicated across components and easy to drift.

/** Chord baseline → distance above the stave the chord text sits at. */
export const STAVE_CHORD_BASELINE_FACTOR = -2
/** Top edge of the stave below the chord row. */
export const STAVE_TOP_FACTOR = 14
/** Stave height in px (constant — does not scale). */
export const STAVE_HEIGHT = 32
/** Padding between the chord row and the stave's top edge. */
export const STAVE_TOP_PADDING = 6
/** Vertical offset of barline-side hint text above the stave. */
export const HINT_TEXT_OFFSET_FACTOR = 24
/** Vertical offset of the volta bracket above the stave. */
export const VOLTA_BRACKET_OFFSET_FACTOR = 28

export interface StaveMetrics {
  chordBaseline: number
  staveTop: number
  staveY: number
  slashY: number
  beamedY: number
  hintTextOffset: number
  voltaBracketOffset: number
}

/**
 * Resolve every stave-relative vertical position from the chord-row scale.
 *
 * Geometry assumptions baked in here:
 *   - Barline geometry: y = staveTop + STAVE_TOP_PADDING, height = 32
 *   - Barline midline = staveTop + STAVE_TOP_PADDING + 16 = staveTop + 22
 *   - Non-beamed slash notehead is 12 tall → top = midline - 6 = staveTop + 16
 *   - Beamed slashes are translated by their CENTER → at the midline directly
 */
export function getStaveMetrics(chordScale: number): StaveMetrics {
  const chordBaseline = Math.round(STAVE_CHORD_BASELINE_FACTOR * chordScale)
  const staveTop = Math.round(STAVE_TOP_FACTOR * chordScale)
  const staveY = staveTop + STAVE_TOP_PADDING
  const slashY = staveTop + 16
  const beamedY = staveTop + 22
  const hintTextOffset = -Math.round(HINT_TEXT_OFFSET_FACTOR * chordScale)
  const voltaBracketOffset = -Math.round(VOLTA_BRACKET_OFFSET_FACTOR * chordScale)
  return {
    chordBaseline,
    staveTop,
    staveY,
    slashY,
    beamedY,
    hintTextOffset,
    voltaBracketOffset,
  }
}
