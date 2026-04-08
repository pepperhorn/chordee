export { VOICING_LIBRARY } from "./library"
export {
  queryVoicings,
  findVoicing,
  realizeVoicing,
  realizeVoicingFull,
  voicingPitchClasses,
  mapToVoicingQuality,
  inferStyle,
} from "./query"
export { selectByRange, autoSelectVoicing } from "./select"
export { generateVariants } from "./variants"
export { chordQualityToVoicing, chordToPitchClasses } from "./bridge"
export { noteToMidi, midiToNote, pitchClass } from "./note-utils"
export { normalizeToSharps, spellForKey } from "./spelling"
export type {
  VoicingEntry,
  VoicingQuery,
  VoicingQuality,
  VoicingEra,
  VoicingStyle,
  Hand,
  RealizedNote,
  VoicingVariant,
} from "./types"
