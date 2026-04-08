import type { VoicingQuality } from "./types"
import { noteToMidi, midiToNote, pitchClass } from "./note-utils"

/**
 * Map chordee's Chord.quality values to chordl VoicingQuality.
 * Extended chords (9, 11, 13) map to their base seventh quality for voicing selection.
 */
const QUALITY_MAP: Record<string, VoicingQuality> = {
  maj: "maj7",
  min: "min7",
  dim: "dim7",
  aug: "dom7",
  maj7: "maj7",
  min7: "min7",
  dom7: "dom7",
  dim7: "dim7",
  hdim7: "m7b5",
  minmaj7: "maj7",
  aug7: "dom7",
  sus2: "sus4",
  sus4: "sus4",
  sus9: "sus4",
  add2: "maj7",
  add9: "maj7",
  "69": "6/9",
  "6": "maj6",
  min6: "min6",
  "9": "dom7",
  maj9: "maj7",
  min9: "min7",
  "11": "dom7",
  "13": "dom7",
}

export function chordQualityToVoicing(quality: string): VoicingQuality | undefined {
  return QUALITY_MAP[quality]
}

/**
 * Build the chord tones as pitch classes for a given root + quality.
 * Used for generating inversions and algorithmic variants.
 * Returns notes in root position order.
 */
export function chordToPitchClasses(root: string, quality: string): string[] {
  // Map quality to interval set (semitones from root)
  const QUALITY_INTERVALS: Record<string, number[]> = {
    maj: [0, 4, 7],
    min: [0, 3, 7],
    dim: [0, 3, 6],
    aug: [0, 4, 8],
    maj7: [0, 4, 7, 11],
    min7: [0, 3, 7, 10],
    dom7: [0, 4, 7, 10],
    dim7: [0, 3, 6, 9],
    hdim7: [0, 3, 6, 10],
    minmaj7: [0, 3, 7, 11],
    aug7: [0, 4, 8, 10],
    sus2: [0, 2, 7],
    sus4: [0, 5, 7],
    sus9: [0, 5, 7, 14],
    add2: [0, 2, 4, 7],
    add9: [0, 4, 7, 14],
    "69": [0, 4, 7, 9, 14],
    "6": [0, 4, 7, 9],
    min6: [0, 3, 7, 9],
    "9": [0, 4, 7, 10, 14],
    maj9: [0, 4, 7, 11, 14],
    min9: [0, 3, 7, 10, 14],
    "11": [0, 4, 7, 10, 14, 17],
    "13": [0, 4, 7, 10, 14, 21],
  }

  const intervals = QUALITY_INTERVALS[quality] ?? [0, 4, 7]
  const rootMidi = noteToMidi(`${root}4`)
  if (rootMidi == null) return [root]

  return intervals.map((interval) => {
    const midi = rootMidi + interval
    return pitchClass(midiToNote(midi))
  })
}
