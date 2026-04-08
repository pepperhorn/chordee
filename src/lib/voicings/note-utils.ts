/**
 * Minimal note utilities replacing tonal.js dependency.
 * Handles MIDI ↔ scientific pitch notation conversion.
 */

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

const NOTE_TO_SEMITONE: Record<string, number> = {
  C: 0, "C#": 1, Db: 1,
  D: 2, "D#": 3, Eb: 3,
  E: 4, Fb: 4,
  F: 5, "E#": 5, "F#": 6, Gb: 6,
  G: 7, "G#": 8, Ab: 8,
  A: 9, "A#": 10, Bb: 10,
  B: 11, Cb: 11,
}

/**
 * Convert scientific pitch notation to MIDI number.
 * "C4" → 60, "A4" → 69
 */
export function noteToMidi(name: string): number | null {
  const match = name.match(/^([A-G][#b]?)(-?\d+)$/)
  if (!match) return null
  const [, pc, octStr] = match
  const semitone = NOTE_TO_SEMITONE[pc]
  if (semitone === undefined) return null
  const octave = parseInt(octStr)
  return (octave + 1) * 12 + semitone
}

/**
 * Convert MIDI number to scientific pitch notation.
 * 60 → "C4", 69 → "A4"
 */
export function midiToNote(midi: number): string {
  const octave = Math.floor(midi / 12) - 1
  const noteIndex = midi % 12
  return `${NOTE_NAMES[noteIndex]}${octave}`
}

/**
 * Extract pitch class (note name without octave).
 * "C#4" → "C#", "Bb2" → "Bb"
 */
export function pitchClass(name: string): string {
  const match = name.match(/^([A-G][#b]?)/)
  return match ? match[1] : name
}
