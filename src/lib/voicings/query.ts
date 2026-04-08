import type { VoicingEntry, VoicingQuery, VoicingQuality, VoicingStyle, RealizedNote, Hand } from "./types"
import { VOICING_LIBRARY } from "./library"
import { noteToMidi, midiToNote, pitchClass as getPitchClass } from "./note-utils"
import { spellForKey } from "./spelling"

/**
 * Map a chord quality string to a VoicingQuality.
 * Check order matters — specific types before general ones.
 */
export function mapToVoicingQuality(chordType: string): VoicingQuality | undefined {
  const t = chordType.toLowerCase()

  if (t.includes("alt")) return "alt"
  if (t.includes("dim7") || t.includes("diminished seventh")) return "dim7"
  if (t.includes("m7b5") || t.includes("half") || t.includes("hdim")) return "m7b5"
  if (t.includes("sus")) return "sus4"
  if (t.includes("min") || t === "m") {
    if (t === "min" || t === "minor") return "min7"
    if (t.includes("6/9")) return "m6/9"
    if (t.includes("6")) return "min6"
    return "min7"
  }
  if (t.includes("maj") || t.includes("major")) {
    if (t === "maj" || t === "major") return "maj7"
    return "maj7"
  }
  if (t.includes("dom") || t.includes("7") || t.includes("9") || t.includes("13") || t.includes("11")) return "dom7"
  if (t.includes("6/9")) return "6/9"
  if (t.includes("6")) return "maj6"

  return undefined
}

export function inferStyle(styleHint: string): VoicingStyle | undefined {
  const lower = styleHint.toLowerCase().trim()
  const MAP: Record<string, VoicingStyle> = {
    "bud powell": "Shell",
    "bebop": "Shell",
    "bill evans": "Rootless Type A",
    "rootless": "Rootless Type A",
    "mccoy tyner": "Quartal",
    "modal": "Quartal",
    "herbie hancock": "Upper Structure",
    "barry harris": "Drop 2",
    "drop 2": "Drop 2",
    "spread": "Spread",
    "nestico": "4-Note Closed",
  }
  for (const [keyword, style] of Object.entries(MAP)) {
    if (lower.includes(keyword)) return style
  }
  return undefined
}

export function queryVoicings(query: VoicingQuery): VoicingEntry[] {
  return VOICING_LIBRARY.filter((v) => {
    if (query.quality && v.quality !== query.quality) return false
    if (query.era && v.tags.era !== query.era) return false
    if (query.style && v.tags.style !== query.style) return false
    if (query.artist) {
      const lower = query.artist.toLowerCase()
      if (!v.tags.artist?.toLowerCase().includes(lower)) return false
    }
    return true
  })
}

export function realizeVoicingFull(
  root: string,
  voicing: VoicingEntry,
  octave: number = 3
): RealizedNote[] {
  const rootMidi = noteToMidi(`${root}${octave}`)
  if (rootMidi == null) return []

  return voicing.intervals.map((interval, i) => {
    const midi = rootMidi + interval
    const noteName = midiToNote(midi)
    const pc = getPitchClass(noteName)
    const spelled = spellForKey(pc, root)
    const hand: Hand = voicing.hands?.[i] ?? "LH"
    return { note: noteName, midi, pitchClass: spelled, hand }
  })
}

export function realizeVoicing(
  root: string,
  voicing: VoicingEntry,
  octave: number = 3
): string[] {
  return realizeVoicingFull(root, voicing, octave).map((n) => n.note)
}

export function voicingPitchClasses(
  root: string,
  voicing: VoicingEntry,
  octave: number = 3
): string[] {
  return realizeVoicingFull(root, voicing, octave).map((n) => n.pitchClass)
}

export function findVoicing(
  quality: VoicingQuality,
  styleHint?: string
): VoicingEntry | undefined {
  const style = styleHint ? inferStyle(styleHint) : undefined

  if (style) {
    const matches = queryVoicings({ quality, style })
    if (matches.length > 0) return matches[0]

    if (style === "Rootless Type A") {
      const typeB = queryVoicings({ quality, style: "Rootless Type B" })
      if (typeB.length > 0) return typeB[0]
    }
  }

  const any = queryVoicings({ quality })
  return any.length > 0 ? any[0] : undefined
}
