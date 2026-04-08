// ── Time Signatures ────────────────────────────────────────────────────

export const TIME_SIGNATURES = [
  { beats: 2, beatUnit: 2, label: "2/2" },
  { beats: 2, beatUnit: 4, label: "2/4" },
  { beats: 3, beatUnit: 2, label: "3/2" },
  { beats: 3, beatUnit: 4, label: "3/4" },
  { beats: 4, beatUnit: 4, label: "4/4" },
  { beats: 5, beatUnit: 4, label: "5/4" },
  { beats: 5, beatUnit: 8, label: "5/8" },
  { beats: 6, beatUnit: 8, label: "6/8" },
  { beats: 7, beatUnit: 4, label: "7/4" },
  { beats: 7, beatUnit: 8, label: "7/8" },
  { beats: 9, beatUnit: 8, label: "9/8" },
  { beats: 11, beatUnit: 4, label: "11/4" },
  { beats: 11, beatUnit: 8, label: "11/8" },
  { beats: 12, beatUnit: 8, label: "12/8" },
] as const

// ── Beat Divisions ─────────────────────────────────────────────────────

export const DIVISIONS = {
  quarter: { slots: 1 },
  eighth: { slots: 2 },
  eighthTriplet: { slots: 3 },
  sixteenth: { slots: 4 },
  sixteenthTriplet: { slots: 6 },
  thirtySecond: { slots: 8 },
  half: { slots: 1 },
  whole: { slots: 1 },
  quarterTriplet: { slots: 3 },
} as const

// ── Barline Types ──────────────────────────────────────────────────────

export const BARLINE_TYPES = [
  "single",
  "double",
  "final",
  "repeatStart",
  "repeatEnd",
] as const

// ── Articulations ──────────────────────────────────────────────────────

export const ARTICULATIONS = [
  "none",
  "accent",
  "staccato",
  "marcato",
  "legato",
  "staccato-marcato",
  "staccato-accent",
  "legato-marcato",
  "legato-accent",
] as const

// ── Dynamics ───────────────────────────────────────────────────────────

export const DYNAMICS = [
  "ppp",
  "pp",
  "p",
  "mp",
  "mf",
  "f",
  "ff",
  "fff",
  "sfz",
  "fp",
  "cresc",
  "decresc",
] as const

// ── Chord Roots ────────────────────────────────────────────────────────

export const CHORD_ROOTS = [
  "C", "C#", "Db",
  "D", "D#", "Eb",
  "E",
  "F", "F#", "Gb",
  "G", "G#", "Ab",
  "A", "A#", "Bb",
  "B",
] as const

// ── Chord Qualities ────────────────────────────────────────────────────

export const CHORD_QUALITIES = [
  "maj", "min", "dim", "aug",
  "maj7", "min7", "dom7", "dim7", "hdim7", "minmaj7",
  "aug7", "sus2", "sus4", "sus9",
  "add2", "add9", "69", "6", "min6",
  "9", "maj9", "min9", "11", "13",
] as const

// ── Chord Aliases (sorted longest-first for greedy matching) ───────────

export const CHORD_ALIASES: [string, string][] = [
  // Major 7
  ["major7", "maj7"], ["maj7", "maj7"], ["ma7", "maj7"],
  ["Δ7", "maj7"], ["Δ", "maj7"], ["M7", "maj7"],
  // Minor 7
  ["minor7", "min7"], ["min7", "min7"], ["m7", "min7"], ["-7", "min7"],
  // Dominant 7
  ["dom7", "dom7"], ["7", "dom7"],
  // Diminished 7
  ["dim7", "dim7"], ["°7", "dim7"],
  // Half-diminished
  ["m7b5", "hdim7"], ["min7b5", "hdim7"], ["ø7", "hdim7"], ["ø", "hdim7"],
  // Minor-Major 7
  ["minmaj7", "minmaj7"], ["mM7", "minmaj7"], ["m(maj7)", "minmaj7"],
  // Augmented 7
  ["aug7", "aug7"], ["+7", "aug7"],
  // Suspended
  ["sus2", "sus2"], ["sus4", "sus4"], ["sus9", "sus9"], ["sus", "sus4"],
  // Add chords
  ["add2", "add2"], ["add9", "add9"],
  // 6th chords
  ["6/9", "69"], ["69", "69"], ["min6", "min6"], ["m6", "min6"], ["6", "6"],
  // Extended
  ["maj9", "maj9"], ["min9", "min9"], ["m9", "min9"],
  ["9", "9"], ["11", "11"], ["13", "13"],
  // Basic triads
  ["major", "maj"], ["minor", "min"], ["min", "min"], ["m", "min"],
  ["dim", "dim"], ["°", "dim"],
  ["aug", "aug"], ["+", "aug"],
  ["maj", "maj"],
  // Empty = major
  ["", "maj"],
]

// ── Nashville Numbers ──────────────────────────────────────────────────

export const NASHVILLE_NUMBERS = [
  "1", "2", "3", "4", "5", "6", "7",
  "b2", "b3", "b5", "b6", "b7",
  "#1", "#2", "#4", "#5", "#6",
] as const

// ── Navigation Types ───────────────────────────────────────────────────

export const NAVIGATION_TYPES = [
  { type: "segno", label: "Segno (𝄋)" },
  { type: "coda", label: "Coda (𝄌)" },
  { type: "dsCoda", label: "D.S. al Coda" },
  { type: "dsSegno", label: "D.S. al Segno" },
  { type: "dcCoda", label: "D.C. al Coda" },
  { type: "dcFine", label: "D.C. al Fine" },
  { type: "fine", label: "Fine" },
  { type: "toCoda", label: "To Coda (𝄌)" },
] as const

// ── Section Presets ────────────────────────────────────────────────────

export const SECTION_PRESETS = [
  "Intro",
  "Verse",
  "Pre-Chorus",
  "Chorus",
  "Bridge",
  "Interlude",
  "Solo",
  "Outro",
  "Tag",
  "Vamp",
  "Coda",
] as const

// ── Quality Display Symbols ────────────────────────────────────────────

export const QUALITY_SYMBOLS: Record<string, string> = {
  maj: "",
  min: "m",
  dim: "dim",
  aug: "aug",
  maj7: "maj7",
  min7: "m7",
  dom7: "7",
  dim7: "dim7",
  hdim7: "m7b5",
  minmaj7: "m(maj7)",
  aug7: "aug7",
  sus2: "sus2",
  sus4: "sus4",
  sus9: "sus9",
  add2: "add2",
  add9: "add9",
  "69": "6/9",
  "6": "6",
  min6: "m6",
  "9": "9",
  maj9: "maj9",
  min9: "m9",
  "11": "11",
  "13": "13",
}
