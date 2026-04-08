const FLAT_TO_SHARP: Record<string, string> = {
  Db: "C#", Eb: "D#", Gb: "F#", Ab: "G#", Bb: "A#",
}

const SHARP_TO_FLAT: Record<string, string> = {
  "C#": "Db", "D#": "Eb", "F#": "Gb", "G#": "Ab", "A#": "Bb",
}

const FLAT_KEYS = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"])

export function normalizeToSharps(note: string): string {
  return FLAT_TO_SHARP[note] ?? note
}

export function spellForKey(pc: string, key: string): string {
  if (FLAT_KEYS.has(key)) {
    return SHARP_TO_FLAT[pc] ?? pc
  }
  return FLAT_TO_SHARP[pc] ?? pc
}
