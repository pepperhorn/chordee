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
