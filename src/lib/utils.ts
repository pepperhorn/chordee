import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { nanoid } from "nanoid"
import { DIVISIONS, QUALITY_SYMBOLS } from "./constants"
import type {
  Beat,
  BeatSlot,
  Chord,
  ChordChart,
  Division,
  Measure,
  Section,
  TimeSignature,
} from "./schema"

// ── Tailwind class merge utility ───────────────────────────────────────

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── ID generation ──────────────────────────────────────────────────────

export function generateId(): string {
  return nanoid(8)
}

// ── Deep clone ─────────────────────────────────────────────────────────

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

// ── Factory Functions ──────────────────────────────────────────────────

export function createBeatSlot(): BeatSlot {
  return {
    id: generateId(),
    chord: null,
    nashvilleChord: null,
    noChord: false,
    slash: {
      articulation: "none",
      tied: false,
      rest: false,
      stem: false,
      stemDirection: "up",
    },
  }
}

export function createBeat(division: Division = "quarter"): Beat {
  const slotCount = DIVISIONS[division].slots
  return {
    id: generateId(),
    division,
    slots: Array.from({ length: slotCount }, () => createBeatSlot()),
  }
}

export function createMeasure(
  timeSignature: TimeSignature = { beats: 4, beatUnit: 4 }
): Measure {
  return {
    id: generateId(),
    barlineStart: "single",
    barlineEnd: "single",
    repeatStart: false,
    repeatEnd: false,
    repeatCount: 2,
    wholeRest: false,
    beats: Array.from({ length: timeSignature.beats }, () => createBeat()),
  }
}

export function createSection(name: string = "Intro"): Section {
  return {
    id: generateId(),
    name,
    timeSignature: { beats: 4, beatUnit: 4 },
    measures: Array.from({ length: 4 }, () => createMeasure()),
  }
}

export function createEmptyChart(): ChordChart {
  return {
    version: "1.0",
    meta: {
      title: "Untitled",
      subtitle: "",
      composer: "",
      arranger: "",
      style: "",
      key: "C",
      tempo: 120,
      tempoDivisor: "quarter",
      tempoText: "",
      showTempo: true,
      notationType: "standard",
      measuresPerLine: 4,
      clef: "treble",
      clefDisplay: "start",
      showClef: false,
      showKeySignature: true,
    },
    sections: [createSection("Intro")],
  }
}

// ── Formatting ─────────────────────────────────────────────────────────

export function formatChord(chord: Chord): string {
  const quality = QUALITY_SYMBOLS[chord.quality] ?? chord.quality
  const ext = chord.extensions?.join("") ?? ""
  const bass = chord.bass ? `/${chord.bass}` : ""
  return `${chord.root}${quality}${ext}${bass}`
}

export function getQualitySymbol(quality: string): string {
  return QUALITY_SYMBOLS[quality] ?? quality
}

export function formatTimeSignature(ts: TimeSignature): string {
  return `${ts.beats}/${ts.beatUnit}`
}

// ── Rhythmic Spacing Helpers ───────────────────────────────────────────

export const RHYTHMIC_BASE_PX = 24

export function rhythmicSlotMin(division: Division): number {
  const slotCount = DIVISIONS[division].slots
  return (4 / slotCount) * RHYTHMIC_BASE_PX
}

export function measureMinWidth(measure: Measure): number {
  let total = 0
  for (const beat of measure.beats) {
    total += beat.slots.length * rhythmicSlotMin(beat.division)
  }
  return total + 24 // padding
}

/**
 * Find the inherited chord for a slot by walking backwards through
 * the chart from the given position. Returns the most recent non-null
 * chord to the left, or null if none exists.
 */
export function getInheritedChord(
  chart: ChordChart,
  sectionId: string,
  measureId: string,
  beatId: string,
  slotId: string
): { chord: Chord; inherited: boolean } | null {
  // Flatten all slots in order across the entire chart
  for (const section of chart.sections) {
    for (const measure of section.measures) {
      for (const beat of measure.beats) {
        for (const slot of beat.slots) {
          if (
            section.id === sectionId &&
            measure.id === measureId &&
            beat.id === beatId &&
            slot.id === slotId
          ) {
            // Found target — if it has a chord, return it (not inherited)
            if (slot.chord) return { chord: slot.chord, inherited: false }
            // Otherwise walk backwards from here
            return walkBackForChord(chart, sectionId, measureId, beatId, slotId)
          }
        }
      }
    }
  }
  return null
}

function walkBackForChord(
  chart: ChordChart,
  sectionId: string,
  measureId: string,
  beatId: string,
  slotId: string
): { chord: Chord; inherited: boolean } | null {
  let found = false
  // Walk in reverse
  const sections = [...chart.sections].reverse()
  for (const section of sections) {
    const measures = [...section.measures].reverse()
    for (const measure of measures) {
      const beats = [...measure.beats].reverse()
      for (const beat of beats) {
        const slots = [...beat.slots].reverse()
        for (const slot of slots) {
          if (found) {
            // N.C. breaks inheritance — nothing inherits past it
            if (slot.noChord) return null
            if (slot.chord) return { chord: slot.chord, inherited: true }
          }
          if (
            section.id === sectionId &&
            measure.id === measureId &&
            beat.id === beatId &&
            slot.id === slotId
          ) {
            found = true
          }
        }
      }
    }
  }
  return null
}

export function isMeasureSimple(measure: Measure): boolean {
  return measure.beats.every(
    (b) => b.division === "quarter" || b.division === "eighth"
  )
}
