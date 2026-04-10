import { z } from "zod"

// ── Beat Slot ──────────────────────────────────────────────────────────

export const ChordSchema = z.object({
  root: z.string(),
  quality: z.string(),
  bass: z.string().optional(),
  extensions: z.array(z.string()).optional(),
})

export const NashvilleChordSchema = z.object({
  degree: z.string(),
  quality: z.string().optional(),
})

export const SlashSchema = z.object({
  articulation: z.string().default("none"),
  tied: z.boolean().default(false),
  rest: z.boolean().default(false),
  stem: z.boolean().default(false),
  stemDirection: z.enum(["up", "down"]).default("up"),
})

export const BeatSlotSchema = z.object({
  id: z.string(),
  chord: ChordSchema.nullable().default(null),
  nashvilleChord: NashvilleChordSchema.nullable().default(null),
  noChord: z.boolean().default(false),
  slash: SlashSchema.default({}),
})

// ── Beat ───────────────────────────────────────────────────────────────

export const DivisionSchema = z.enum([
  "quarter",
  "eighth",
  "eighthTriplet",
  "sixteenth",
  "sixteenthTriplet",
  "thirtySecond",
  "half",
  "whole",
  "quarterTriplet",
])

export const BeatSchema = z.object({
  id: z.string(),
  division: DivisionSchema.default("quarter"),
  dynamics: z.string().optional(),
  lyrics: z.string().optional(),
  slots: z.array(BeatSlotSchema),
})

// ── Measure ────────────────────────────────────────────────────────────

export const BarlineSchema = z.enum([
  "single",
  "double",
  "final",
  "repeatStart",
  "repeatEnd",
])

export const VoltaSchema = z.object({
  /** Stable id of the repeat region this volta belongs to. Set on the
   *  `repeatStart` measure as `repeatRegionId`. */
  regionId: z.string(),
  /** Display label — preset (e.g. "1.", "Last X.") or user-edited free text. */
  label: z.string(),
  /** The preset key the label was last derived from, used for uniqueness
   *  checks within a region. Free-text overrides keep the original key
   *  so they don't collide with the preset they sprouted from. */
  presetKey: z.string().optional(),
})

export const MeasureSchema = z.object({
  id: z.string(),
  instruction: z.string().optional(),
  barlineStart: BarlineSchema.default("single"),
  barlineEnd: BarlineSchema.default("single"),
  repeatStart: z.boolean().default(false),
  repeatEnd: z.boolean().default(false),
  repeatCount: z.number().default(2),
  ending: z.number().optional(),
  wholeRest: z.boolean().default(false),
  beats: z.array(BeatSchema),
  /** Stable id of the repeat region opened on this measure. Only set when
   *  `barlineStart === "repeatStart"`. Identifies a region across edits. */
  repeatRegionId: z.string().optional(),
  /** Volta bracket starting at this measure (extends right until the next
   *  bar that has a volta in the same region, or until the region ends). */
  volta: VoltaSchema.optional(),
})

// ── Section ────────────────────────────────────────────────────────────

export const TimeSignatureSchema = z.object({
  beats: z.number().min(1).max(16),
  beatUnit: z.union([z.literal(2), z.literal(4), z.literal(8), z.literal(16)]),
})

export const NavigationSchema = z.object({
  type: z.enum([
    "segno",
    "coda",
    "dsSegno",
    "dsCoda",
    "dcCoda",
    "dcFine",
    "fine",
    "toCoda",
  ]),
})

export const SectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  timeSignature: TimeSignatureSchema.default({ beats: 4, beatUnit: 4 }),
  rehearsalMark: z.string().optional(),
  navigation: NavigationSchema.optional(),
  measures: z.array(MeasureSchema),
})

// ── Chart ──────────────────────────────────────────────────────────────

export const ClefSchema = z.enum([
  "none",
  "treble",
  "alto",
  "tenor",
  "bass",
  "percussion",
])

export const ChartMetaSchema = z.object({
  title: z.string().default("Untitled"),
  subtitle: z.string().default(""),
  composer: z.string().default(""),
  arranger: z.string().default(""),
  style: z.string().default(""),
  key: z.string().default("C"),
  tempo: z.number().default(120),
  tempoDivisor: z.enum(["whole", "half", "quarter", "eighth", "sixteenth"]).default("quarter"),
  tempoText: z.string().default(""),
  showTempo: z.boolean().default(true),
  notationType: z.enum(["standard", "nashville"]).default("standard"),
  measuresPerLine: z.number().default(4),
  clef: ClefSchema.default("treble"),
  clefDisplay: z.enum(["start", "section", "eachLine"]).default("start"),
  showClef: z.boolean().default(false),
  showKeySignature: z.boolean().default(true),
  copyright: z.string().default(""),
  footerText: z.string().default(""),
})

export const ChordChartSchema = z.object({
  version: z.literal("1.0"),
  meta: ChartMetaSchema,
  sections: z.array(SectionSchema),
})

// ── Derived Types ──────────────────────────────────────────────────────

export type Chord = z.infer<typeof ChordSchema>
export type NashvilleChord = z.infer<typeof NashvilleChordSchema>
export type Slash = z.infer<typeof SlashSchema>
export type BeatSlot = z.infer<typeof BeatSlotSchema>
export type Division = z.infer<typeof DivisionSchema>
export type Beat = z.infer<typeof BeatSchema>
export type Barline = z.infer<typeof BarlineSchema>
export type Volta = z.infer<typeof VoltaSchema>
export type Measure = z.infer<typeof MeasureSchema>
export type TimeSignature = z.infer<typeof TimeSignatureSchema>
export type Navigation = z.infer<typeof NavigationSchema>
export type Section = z.infer<typeof SectionSchema>
export type Clef = z.infer<typeof ClefSchema>
export type ChartMeta = z.infer<typeof ChartMetaSchema>
export type ChordChart = z.infer<typeof ChordChartSchema>

// ── Selection ──────────────────────────────────────────────────────────

export interface Selection {
  type: "section" | "measure" | "beat" | "slot"
  sectionId: string
  measureId?: string
  beatId?: string
  slotId?: string
}
