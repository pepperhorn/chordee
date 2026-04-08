import type { VoicingEntry } from "./types"

/**
 * Jazz Piano Voicing Library — vendored from chordl.
 *
 * All intervals are semitones relative to the chord root.
 *
 * Interval reference:
 *   m2=1  M2=2  m3=3  M3=4  P4=5  TT=6  P5=7
 *   m6=8  M6=9  m7=10 M7=11 P8=12 m9=13 M9=14
 *   m10=15 M10=16 P11=17 #11=18 P12=19 m13=20 M13=21
 */

const shells: VoicingEntry[] = [
  {
    id: "shell-maj7-r7",
    name: "Shell Maj7 (Root + 7)",
    quality: "maj7",
    intervals: [0, 11],
    tags: { era: "Bebop", style: "Shell", artist: "Bud Powell", source: "Shell Voicings" },
    range: { min: 36, max: 60 },
  },
  {
    id: "shell-maj7-r3",
    name: "Shell Maj7 (Root + 3)",
    quality: "maj7",
    intervals: [0, 4],
    tags: { era: "Bebop", style: "Shell", artist: "Bud Powell", source: "Shell Voicings" },
    range: { min: 36, max: 60 },
  },
  {
    id: "shell-min7-r7",
    name: "Shell m7 (Root + b7)",
    quality: "min7",
    intervals: [0, 10],
    tags: { era: "Bebop", style: "Shell", artist: "Bud Powell", source: "Shell Voicings" },
    range: { min: 36, max: 60 },
  },
  {
    id: "shell-min7-r3",
    name: "Shell m7 (Root + b3)",
    quality: "min7",
    intervals: [0, 3],
    tags: { era: "Bebop", style: "Shell", artist: "Bud Powell", source: "Shell Voicings" },
    range: { min: 36, max: 60 },
  },
  {
    id: "shell-dom7-r7",
    name: "Shell Dom7 (Root + b7)",
    quality: "dom7",
    intervals: [0, 10],
    tags: { era: "Bebop", style: "Shell", artist: "Bud Powell", source: "Shell Voicings" },
    range: { min: 36, max: 60 },
  },
  {
    id: "shell-dom7-r3",
    name: "Shell Dom7 (Root + 3)",
    quality: "dom7",
    intervals: [0, 4],
    tags: { era: "Bebop", style: "Shell", artist: "Bud Powell", source: "Shell Voicings" },
    range: { min: 36, max: 60 },
  },
]

const rootless: VoicingEntry[] = [
  {
    id: "rootless-maj7-a",
    name: "Rootless Maj7 Type A (3-5-7-9)",
    quality: "maj7",
    intervals: [4, 7, 11, 14],
    tags: { era: "Post-Bop", style: "Rootless Type A", artist: "Bill Evans", source: "Rootless Voicings" },
    range: { min: 50, max: 67 },
  },
  {
    id: "rootless-maj7-b",
    name: "Rootless Maj7 Type B (7-9-3-5)",
    quality: "maj7",
    intervals: [11, 14, 16, 19],
    tags: { era: "Post-Bop", style: "Rootless Type B", artist: "Bill Evans", source: "Rootless Voicings" },
    range: { min: 50, max: 67 },
  },
  {
    id: "rootless-min7-a",
    name: "Rootless m7 Type A (b3-5-b7-9)",
    quality: "min7",
    intervals: [3, 7, 10, 14],
    tags: { era: "Post-Bop", style: "Rootless Type A", artist: "Bill Evans", source: "Rootless Voicings" },
    range: { min: 50, max: 67 },
  },
  {
    id: "rootless-min7-b",
    name: "Rootless m7 Type B (b7-9-b3-5)",
    quality: "min7",
    intervals: [10, 14, 15, 19],
    tags: { era: "Post-Bop", style: "Rootless Type B", artist: "Bill Evans", source: "Rootless Voicings" },
    range: { min: 50, max: 67 },
  },
  {
    id: "rootless-dom7-a",
    name: "Rootless Dom7 Type A (3-13-b7-9)",
    quality: "dom7",
    intervals: [4, 9, 10, 14],
    tags: { era: "Post-Bop", style: "Rootless Type A", artist: "Bill Evans", source: "Rootless Voicings" },
    range: { min: 50, max: 67 },
  },
  {
    id: "rootless-dom7-b",
    name: "Rootless Dom7 Type B (b7-9-3-13)",
    quality: "dom7",
    intervals: [10, 14, 16, 21],
    tags: { era: "Post-Bop", style: "Rootless Type B", artist: "Bill Evans", source: "Rootless Voicings" },
    range: { min: 50, max: 67 },
  },
  {
    id: "rootless-alt-a",
    name: "Rootless Alt Type A (3-b7-#9-b13)",
    quality: "alt",
    intervals: [4, 10, 15, 20],
    tags: { era: "Post-Bop", style: "Rootless Type A", artist: "Bill Evans", source: "Altered Voicings" },
    range: { min: 50, max: 67 },
  },
  {
    id: "rootless-alt-b",
    name: "Rootless Alt Type B (b7-#9-3-b13)",
    quality: "alt",
    intervals: [10, 15, 16, 20],
    tags: { era: "Post-Bop", style: "Rootless Type B", artist: "Bill Evans", source: "Altered Voicings" },
    range: { min: 50, max: 67 },
  },
  {
    id: "rootless-m7b5-a",
    name: "Rootless m7b5 Type A (b3-b5-b7-9)",
    quality: "m7b5",
    intervals: [3, 6, 10, 14],
    tags: { era: "Post-Bop", style: "Rootless Type A", artist: "Bill Evans", source: "Rootless Voicings" },
    range: { min: 50, max: 67 },
  },
  {
    id: "rootless-m7b5-b",
    name: "Rootless m7b5 Type B (b7-9-b3-b5)",
    quality: "m7b5",
    intervals: [10, 14, 15, 18],
    tags: { era: "Post-Bop", style: "Rootless Type B", artist: "Bill Evans", source: "Rootless Voicings" },
    range: { min: 50, max: 67 },
  },
]

const quartal: VoicingEntry[] = [
  {
    id: "quartal-3note",
    name: "Quartal Stack (3 notes)",
    quality: "sus4",
    intervals: [0, 5, 10],
    tags: { era: "Modal", style: "Quartal", artist: "McCoy Tyner", source: "Quartal Voicings" },
    range: { min: 48, max: 72 },
  },
  {
    id: "quartal-4note",
    name: "Quartal Stack (4 notes)",
    quality: "min7",
    intervals: [0, 5, 10, 15],
    tags: { era: "Modal", style: "Quartal", artist: "McCoy Tyner", source: "Quartal Voicings" },
    range: { min: 48, max: 72 },
  },
  {
    id: "modal-so-what",
    name: "So What Chord (3 P4ths + M3)",
    quality: "min7",
    intervals: [0, 5, 10, 15, 19],
    tags: { era: "Modal", style: "Quartal", artist: "McCoy Tyner", source: "Quartal Voicings" },
    range: { min: 48, max: 72 },
  },
]

const upperStructures: VoicingEntry[] = [
  {
    id: "us-II",
    name: "Upper Structure II (Lydian Dominant)",
    quality: "dom7",
    intervals: [4, 10, 14, 18, 21],
    hands: ["LH", "LH", "RH", "RH", "RH"],
    tags: { era: "Modern", style: "Upper Structure", artist: "Herbie Hancock", source: "Upper Structures" },
    range: { min: 48, max: 72 },
  },
  {
    id: "us-bVI",
    name: "Upper Structure bVI (Altered)",
    quality: "alt",
    intervals: [4, 10, 20, 24, 27],
    hands: ["LH", "LH", "RH", "RH", "RH"],
    tags: { era: "Modern", style: "Upper Structure", artist: "Herbie Hancock", source: "Upper Structures" },
    range: { min: 48, max: 72 },
  },
]

const drop2: VoicingEntry[] = [
  {
    id: "drop2-maj6",
    name: "Drop 2 Maj6 (5th in bass)",
    quality: "maj6",
    intervals: [-5, 0, 4, 9],
    tags: { era: "Hard Bop", style: "Drop 2", artist: "Barry Harris", source: "Drop 2 Voicings" },
    range: { min: 48, max: 72 },
  },
  {
    id: "drop2-min7",
    name: "Drop 2 m7 (5th in bass)",
    quality: "min7",
    intervals: [-5, 0, 3, 10],
    tags: { era: "Hard Bop", style: "Drop 2", artist: "Bill Evans", source: "Drop 2 Voicings" },
    range: { min: 48, max: 72 },
  },
  {
    id: "drop2-dom7",
    name: "Drop 2 Dom7 (5th in bass)",
    quality: "dom7",
    intervals: [-5, 0, 4, 10],
    tags: { era: "Hard Bop", style: "Drop 2", source: "Drop 2 Voicings" },
    range: { min: 48, max: 72 },
  },
  {
    id: "drop2-m7b5",
    name: "Drop 2 m7b5 (b5 in bass)",
    quality: "m7b5",
    intervals: [-6, 0, 3, 10],
    tags: { era: "Hard Bop", style: "Drop 2", source: "Drop 2 Voicings" },
    range: { min: 48, max: 72 },
  },
]

const spread: VoicingEntry[] = [
  {
    id: "spread-maj7",
    name: "Spread Maj7 (3+7 low, 9+5 high)",
    quality: "maj7",
    intervals: [0, 4, 11, 14, 19],
    tags: { era: "Modern", style: "Spread", source: "Big Band Arranging" },
    range: { min: 36, max: 72 },
  },
  {
    id: "spread-min7",
    name: "Spread m7 (3+7 low, 9+5 high)",
    quality: "min7",
    intervals: [0, 3, 10, 14, 19],
    tags: { era: "Modern", style: "Spread", source: "Big Band Arranging" },
    range: { min: 36, max: 72 },
  },
  {
    id: "spread-dom7",
    name: "Spread Dom7 (3+7 low, 9+13 high)",
    quality: "dom7",
    intervals: [0, 4, 10, 14, 21],
    tags: { era: "Modern", style: "Spread", source: "Big Band Arranging" },
    range: { min: 36, max: 72 },
  },
]

const fourNoteClosed: VoicingEntry[] = [
  {
    id: "4close-maj7",
    name: "4-Note Closed Maj7 (1-3-7-9)",
    quality: "maj7",
    intervals: [0, 4, 11, 14],
    tags: { era: "Modern", style: "4-Note Closed", artist: "Sammy Nestico", source: "Big Band Arranging" },
    range: { min: 48, max: 72 },
  },
  {
    id: "4close-min7",
    name: "4-Note Closed m7 (1-3-7-9)",
    quality: "min7",
    intervals: [0, 3, 10, 14],
    tags: { era: "Modern", style: "4-Note Closed", artist: "Sammy Nestico", source: "Big Band Arranging" },
    range: { min: 48, max: 72 },
  },
  {
    id: "4close-dom7",
    name: "4-Note Closed Dom7 (3-13-7-9)",
    quality: "dom7",
    intervals: [4, 9, 10, 14],
    tags: { era: "Modern", style: "4-Note Closed", artist: "Sammy Nestico", source: "Big Band Arranging" },
    range: { min: 48, max: 72 },
  },
  {
    id: "4close-m7b5",
    name: "4-Note Closed m7b5 (1-b3-b5-9)",
    quality: "m7b5",
    intervals: [0, 3, 6, 14],
    tags: { era: "Modern", style: "4-Note Closed", artist: "Sammy Nestico", source: "Big Band Arranging" },
    range: { min: 48, max: 72 },
  },
]

export const VOICING_LIBRARY: VoicingEntry[] = [
  ...shells,
  ...rootless,
  ...quartal,
  ...upperStructures,
  ...drop2,
  ...spread,
  ...fourNoteClosed,
]
