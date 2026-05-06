import type { Chord, NashvilleChord } from "./schema"

// Pitch-class index (0 = C). Sharps and flats both map to the same pc.
const PITCH_CLASSES: Record<string, number> = {
  C: 0, "C#": 1, Db: 1,
  D: 2, "D#": 3, Eb: 3,
  E: 4, Fb: 4, "E#": 5,
  F: 5, "F#": 6, Gb: 6,
  G: 7, "G#": 8, Ab: 8,
  A: 9, "A#": 10, Bb: 10,
  B: 11, Cb: 11, "B#": 0,
}

// Default accidental preference per key — sharps for sharp keys, flats for flat keys.
const SHARP_KEYS = new Set(["G", "D", "A", "E", "B", "F#", "C#"])

// Chromatic degree labels indexed by semitones above tonic (0..11),
// keyed by accidental preference.
const DEGREE_SHARP = ["1", "#1", "2", "#2", "3", "4", "#4", "5", "#5", "6", "#6", "7"]
const DEGREE_FLAT = ["1", "b2", "2", "b3", "3", "4", "b5", "5", "b6", "6", "b7", "7"]

// Reverse: scale degree → semitone offset.
const DEGREE_TO_SEMITONE: Record<string, number> = {
  "1": 0, "b2": 1, "#1": 1, "2": 2, "b3": 3, "#2": 3, "3": 4,
  "4": 5, "#4": 6, "b5": 6, "5": 7, "#5": 8, "b6": 8,
  "6": 9, "#6": 10, "b7": 10, "7": 11,
}

function parseTonic(key: string): { pc: number; preferSharps: boolean } {
  // key is e.g. "C", "Gm", "F#", "Bb m", "Ebmaj"
  const trimmed = key.trim()
  const match = trimmed.match(/^([A-G])([#b]?)/)
  if (!match) return { pc: 0, preferSharps: false }
  const letter = match[1] + (match[2] || "")
  const pc = PITCH_CLASSES[letter] ?? 0
  return { pc, preferSharps: SHARP_KEYS.has(letter) }
}

function rootToPc(root: string): number {
  return PITCH_CLASSES[root] ?? 0
}

function semitoneToDegree(semitones: number, preferSharps: boolean): string {
  const i = ((semitones % 12) + 12) % 12
  return preferSharps ? DEGREE_SHARP[i] : DEGREE_FLAT[i]
}

function degreeToSemitone(degree: string): number {
  return DEGREE_TO_SEMITONE[degree] ?? 0
}

function pcToRoot(pc: number, preferSharps: boolean): string {
  const sharp = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
  const flat = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"]
  return (preferSharps ? sharp : flat)[((pc % 12) + 12) % 12]
}

/** Quality goes through unchanged — Nashville quality strings match chord quality strings. */
export function chordToNashville(chord: Chord, key: string): NashvilleChord {
  const { pc: tonic, preferSharps } = parseTonic(key)
  const rootPc = rootToPc(chord.root)
  const semis = rootPc - tonic
  const degree = semitoneToDegree(semis, preferSharps)
  return { degree, quality: chord.quality }
}

export function nashvilleToChord(nash: NashvilleChord, key: string): Chord {
  const { pc: tonic, preferSharps } = parseTonic(key)
  const semis = degreeToSemitone(nash.degree)
  const rootPc = (tonic + semis) % 12
  return {
    root: pcToRoot(rootPc, preferSharps),
    quality: nash.quality || "maj",
  }
}

/** Format a Nashville chord into its display string, e.g. "4m7" or "b7". */
export function formatNashville(nash: NashvilleChord): string {
  return nash.degree + (nash.quality && nash.quality !== "maj" ? qualitySuffix(nash.quality) : "")
}

function qualitySuffix(quality: string): string {
  // Nashville convention: minor = "m", dom7 = "7", maj7 = "maj7", etc.
  // Reuse the same suffixes the chord display uses.
  const map: Record<string, string> = {
    maj: "",
    min: "m",
    dim: "°",
    aug: "+",
    maj7: "maj7",
    min7: "m7",
    dom7: "7",
    dim7: "°7",
    hdim7: "ø7",
    minmaj7: "mMaj7",
    aug7: "+7",
    sus2: "sus2",
    sus4: "sus4",
    sus9: "sus9",
    add2: "add2",
    add9: "add9",
    "6": "6",
    "69": "6/9",
    min6: "m6",
    "9": "9",
    maj9: "maj9",
    min9: "m9",
    "11": "11",
    "13": "13",
  }
  return map[quality] ?? quality
}
