export type RelativeSize = "sm" | "md" | "lg" | "xl" | "2xl"

export const RELATIVE_SIZE_SCALE: Record<RelativeSize, number> = {
  sm: 0.75,
  md: 1.0,
  lg: 1.25,
  xl: 1.5,
  "2xl": 2.0,
}

export const RELATIVE_SIZES: { value: RelativeSize; label: string }[] = [
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
  { value: "xl", label: "X-Large" },
  { value: "2xl", label: "2X-Large" },
]

export interface FontConfig {
  /** Master scale applied on top of every per-font size below.
   *  Lets users bump everything up/down without re-tweaking each field. */
  globalScale: RelativeSize
  heading: string
  headingSize: RelativeSize
  headingColor?: string
  subtitle: string
  subtitleSize: RelativeSize
  subtitleColor?: string
  body: string
  bodySize: RelativeSize
  bodyColor?: string
  lyric: string
  lyricSize: RelativeSize
  lyricColor?: string
  dynamic: string
  dynamicSize: RelativeSize
  dynamicColor?: string
  chord: string
  chordSize: RelativeSize
  chordColor?: string
  timeSignature: string
  timeSignatureSize: RelativeSize
  timeSignatureColor?: string
  rehearsal: string
  rehearsalSize: RelativeSize
  rehearsalColor?: string
  clef: string
  clefSize: RelativeSize
  clefColor?: string
  barline: string
  barlineSize: RelativeSize
  barlineColor?: string
  lineSpacing: RelativeSize
}

export const DEFAULT_FONT_CONFIG: FontConfig = {
  globalScale: "md",
  heading: "PetalumaScript",
  headingSize: "lg",
  subtitle: "PetalumaScript",
  subtitleSize: "md",
  body: "Inter, system-ui, sans-serif",
  bodySize: "md",
  lyric: "Inter, system-ui, sans-serif",
  lyricSize: "md",
  dynamic: "PetalumaText",
  dynamicSize: "md",
  chord: "PetalumaScript",
  chordSize: "md",
  timeSignature: "PetalumaScript",
  timeSignatureSize: "md",
  rehearsal: "PetalumaScript",
  rehearsalSize: "xl",
  clef: "Petaluma",
  clefSize: "md",
  barline: "Petaluma",
  barlineSize: "md",
  lineSpacing: "md",
}

export const FONT_FAMILIES = [
  { value: "PetalumaScript", label: "Petaluma Script (Handwritten)", notation: false },
  { value: "Petaluma", label: "Petaluma (Notation)", notation: true },
  { value: "PetalumaText", label: "Petaluma Text", notation: false },
  { value: "Bravura", label: "Bravura (Classical)", notation: true },
  { value: "BravuraText", label: "Bravura Text", notation: false },
  { value: "Inter, system-ui, sans-serif", label: "Inter (System)", notation: false },
  { value: "Georgia, serif", label: "Georgia (Serif)", notation: false },
] as const

export type FontFamily = (typeof FONT_FAMILIES)[number]["value"]

/** Notation-capable fonts only — SMuFL families that actually ship the
 *  clef, barline, accidental, and repeat glyphs. Used to restrict the
 *  font picker for fields that MUST render notation symbols (clef, key
 *  signature, barlines); the other font slots can use any family. */
export const NOTATION_FONT_FAMILIES = FONT_FAMILIES.filter((f) => f.notation)

/** Build CSS font shorthand strings from FontConfig for use with Pretext */
export function buildFontStrings(
  config: FontConfig,
  sizes: { chord: number; lyric: number; section: number; rehearsal: number; dynamic: number }
) {
  return {
    chord: `${sizes.chord}px ${config.chord}`,
    lyric: `${sizes.lyric}px ${config.lyric}`,
    section: `700 ${sizes.section}px ${config.heading}`,
    rehearsal: `700 ${sizes.rehearsal}px ${config.heading}`,
    dynamic: `italic ${sizes.dynamic}px ${config.dynamic}`,
  }
}
