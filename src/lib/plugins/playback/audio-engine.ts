import { Soundfont } from "smplr"
import type { Chord } from "@/lib/schema"
import {
  chordQualityToVoicing,
  chordToPitchClasses,
  realizeVoicingFull,
  generateVariants,
  noteToMidi,
  VOICING_LIBRARY,
} from "@/lib/voicings"

let audioContext: AudioContext | null = null
let piano: any = null
let guitar: any = null
let bass: any = null
let loaded = false
let loadingPromise: Promise<void> | null = null

export async function ensureLoaded(
  onLoadStart: () => void,
  onLoadEnd: () => void
): Promise<void> {
  if (loaded) return
  if (loadingPromise) return loadingPromise

  onLoadStart()

  loadingPromise = (async () => {
    audioContext = new AudioContext()
    const [p, g, b] = await Promise.all([
      new Soundfont(audioContext, { instrument: "acoustic_grand_piano" }).load,
      new Soundfont(audioContext, { instrument: "electric_guitar_jazz" }).load,
      new Soundfont(audioContext, { instrument: "acoustic_bass" }).load,
    ])
    piano = p
    guitar = g
    bass = b
    loaded = true
    onLoadEnd()
  })()

  return loadingPromise
}

export interface PlayChordResult {
  voicingLabel: string
}

// Guitar practical range: E2 (40) to E5 (76), chord voicings mostly E3–B4
const GUITAR_RANGE = { min: 40, max: 76 }
const GUITAR_MAX_NOTES = 5 // 6 strings minus 1 for bass

/**
 * Adapt piano voicing MIDI notes for guitar:
 * - Clamp to guitar range, shifting octaves as needed
 * - Limit to 5 notes max (drop lowest-priority notes)
 */
function adaptForGuitar(midiNotes: number[]): number[] {
  // Shift notes into guitar range
  let adapted = midiNotes.map((midi) => {
    while (midi < GUITAR_RANGE.min) midi += 12
    while (midi > GUITAR_RANGE.max) midi -= 12
    return midi
  })

  // Deduplicate (shifting can create unisons)
  adapted = [...new Set(adapted)]

  // Sort ascending
  adapted.sort((a, b) => a - b)

  // Limit to 5 notes — keep lowest and highest, trim from the middle
  if (adapted.length > GUITAR_MAX_NOTES) {
    // Keep the outer notes for voicing clarity, drop inner duplicates/less important tones
    const keep = GUITAR_MAX_NOTES
    const bottom = adapted.slice(0, Math.ceil(keep / 2))
    const top = adapted.slice(-(Math.floor(keep / 2)))
    adapted = [...new Set([...bottom, ...top])].sort((a, b) => a - b)
    // If still too many, just truncate
    adapted = adapted.slice(0, GUITAR_MAX_NOTES)
  }

  return adapted
}

/**
 * Play a chord voicing with bass note.
 *
 * @param chord - The chord from the chart schema
 * @param voicingIndex - Which voicing variant to use (cycles through available variants)
 * @param instrument - "piano" or "guitar" for the chord voicing instrument
 * @returns Info about which voicing was used
 */
export async function playChord(
  chord: Chord,
  voicingIndex: number,
  instrument: "piano" | "guitar",
  useBass: boolean = true
): Promise<PlayChordResult> {
  if (!loaded || !audioContext || !bass) {
    return { voicingLabel: "Not loaded" }
  }

  // Resume AudioContext if suspended (browser autoplay policy)
  if (audioContext.state === "suspended") {
    await audioContext.resume()
  }

  const chordInstrument = instrument === "piano" ? piano : guitar

  // Bass note: slash chord bass or root, in octave 2
  const bassRoot = chord.bass || chord.root
  const bassMidi = noteToMidi(`${bassRoot}2`)

  // Get voicing quality
  const voicingQuality = chordQualityToVoicing(chord.quality)

  // Get pitch classes for variant generation
  const pitchClasses = chordToPitchClasses(chord.root, chord.quality)

  // Generate variants and pick by index
  const variants = generateVariants(chord.root, voicingQuality, pitchClasses, 10)
  const variant = variants[voicingIndex % variants.length]

  // Determine MIDI notes for the chord voicing
  let chordMidiNotes: number[] = []

  if (variant.source === "library") {
    // Look up the specific library entry by variant ID
    const entry = VOICING_LIBRARY.find((v) => v.id === variant.id)
    if (entry) {
      const realized = realizeVoicingFull(chord.root, entry, 3)
      chordMidiNotes = realized.map((n) => n.midi)
    }
  }

  // For inversions/algorithmic variants, or if library lookup failed:
  // build from pitch classes in octave 4
  if (chordMidiNotes.length === 0) {
    chordMidiNotes = variant.notes
      .map((pc) => noteToMidi(`${pc}4`))
      .filter((m): m is number => m != null)
  }

  // Adapt voicing for guitar range and note limit
  if (instrument === "guitar") {
    chordMidiNotes = adaptForGuitar(chordMidiNotes)
  }

  // Play bass note on bass instrument or add root to chord instrument
  if (bassMidi != null) {
    if (useBass) {
      bass.start({ note: bassMidi, velocity: 90, duration: 2.5 })
    } else {
      // Play root on the chord instrument in a lower octave
      const rootMidi = noteToMidi(`${bassRoot}3`)
      if (rootMidi != null) {
        chordInstrument.start({ note: rootMidi, velocity: 85, duration: 2.5 })
      }
    }
  }

  // Arpeggiate chord notes with stagger
  const now = audioContext.currentTime
  const bassDelay = 0.05 // offset chord notes slightly after bass
  chordMidiNotes.forEach((midi, i) => {
    chordInstrument.start({
      note: midi,
      velocity: 70,
      time: now + bassDelay + i * 0.05,
      duration: 2.0,
    })
  })

  return { voicingLabel: variant.label }
}

export function stopAll(): void {
  piano?.stop()
  guitar?.stop()
  bass?.stop()
}
