import type { Clef } from "./schema"

/**
 * Key signature data: maps key names to number of sharps (+) or flats (-).
 * Major keys listed; minor keys share the same signature (relative minor).
 */
const KEY_MAP: Record<string, number> = {
  // Major keys
  "C": 0, "G": 1, "D": 2, "A": 3, "E": 4, "B": 5, "F#": 6, "C#": 7,
  "F": -1, "Bb": -2, "Eb": -3, "Ab": -4, "Db": -5, "Gb": -6, "Cb": -7,
  // Minor keys (same accidentals as relative major)
  "Am": 0, "Em": 1, "Bm": 2, "F#m": 3, "C#m": 4, "G#m": 5, "D#m": 6, "A#m": 7,
  "Dm": -1, "Gm": -2, "Cm": -3, "Fm": -4, "Bbm": -5, "Ebm": -6, "Abm": -7,
}

/**
 * Returns the number of sharps (positive) or flats (negative) for a key.
 * Returns 0 for unrecognized keys.
 */
export function getKeyAccidentals(key: string): number {
  return KEY_MAP[key] ?? KEY_MAP[key.replace("♯", "#").replace("♭", "b")] ?? 0
}

/**
 * Staff positions for sharps/flats per clef.
 * Position 0 = bottom staff line, 1 = first space, 2 = second line, etc.
 * A 5-line staff has positions 0 (bottom) through 8 (top line).
 */

// Order of sharps: F C G D A E B
const SHARP_POSITIONS: Record<string, number[]> = {
  treble:     [8, 5, 9, 6, 3, 7, 4],
  alto:       [7, 4, 8, 5, 2, 6, 3],
  tenor:      [5, 2, 6, 3, 0, 4, 1],
  bass:       [6, 3, 7, 4, 1, 5, 2],
  percussion: [6, 3, 7, 4, 1, 5, 2], // same as bass
}

// Order of flats: B E A D G C F
const FLAT_POSITIONS: Record<string, number[]> = {
  treble:     [4, 7, 3, 6, 2, 5, 1],
  alto:       [3, 6, 2, 5, 1, 4, 0],
  tenor:      [1, 4, 0, 3, -1, 2, -2],
  bass:       [2, 5, 1, 4, 0, 3, -1],
  percussion: [2, 5, 1, 4, 0, 3, -1],
}

export interface KeySigAccidental {
  type: "sharp" | "flat"
  /** Staff position: 0=bottom line, 2=second line, etc. */
  position: number
}

/**
 * Returns the accidentals to render for a given key and clef.
 */
export function getKeySignatureAccidentals(
  key: string,
  clef: Clef
): KeySigAccidental[] {
  if (clef === "none") return []

  const count = getKeyAccidentals(key)
  if (count === 0) return []

  const isSharp = count > 0
  const positions = isSharp
    ? SHARP_POSITIONS[clef] ?? SHARP_POSITIONS.treble
    : FLAT_POSITIONS[clef] ?? FLAT_POSITIONS.treble

  const n = Math.abs(count)
  return positions.slice(0, n).map((position) => ({
    type: isSharp ? "sharp" : "flat",
    position,
  }))
}

/**
 * SMuFL codepoints for clef glyphs (Petaluma / Bravura).
 */
export const CLEF_GLYPHS: Record<string, { char: string; yOffset: number }> = {
  treble:     { char: "\uE050", yOffset: 2 },    // gClef — reference: 2nd line (G4)
  alto:       { char: "\uE05C", yOffset: 4 },    // cClef — reference: middle line (C4)
  tenor:      { char: "\uE05C", yOffset: 6 },    // cClef — reference: 4th line (C4 tenor)
  bass:       { char: "\uE062", yOffset: 6 },    // fClef — reference: 4th line (F3)
  percussion: { char: "\uE069", yOffset: 4 },    // unpitchedPercussionClef1 — center
}

/**
 * SMuFL accidental glyphs.
 */
export const ACCIDENTAL_GLYPHS = {
  sharp: "\uE262",
  flat: "\uE260",
  natural: "\uE261",
}

/**
 * Width estimate for clef + key signature, used by the layout engine.
 */
export function estimateClefKeySigWidth(
  key: string,
  clef: Clef,
  fontSize: number
): number {
  if (clef === "none") return 0

  const clefWidth = fontSize * 1.2
  const accidentals = getKeySignatureAccidentals(key, clef)
  const accidentalWidth = accidentals.length * (fontSize * 0.45)
  const gap = accidentals.length > 0 ? fontSize * 0.3 : 0

  return clefWidth + gap + accidentalWidth + fontSize * 0.4 // trailing padding
}
