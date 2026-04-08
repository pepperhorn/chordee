import type { VoicingEntry, VoicingQuality } from "./types"
import { noteToMidi } from "./note-utils"
import { queryVoicings } from "./query"

/**
 * Range-aware voicing selection — "Green Zone" algorithm.
 * D3 (50) to C5 (72) is the optimal left-hand register.
 */

const GREEN_ZONE = {
  SWEET_LOW: 50,   // D3
  SWEET_HIGH: 62,  // D4
}

export function selectByRange(
  rootMidi: number,
  quality: VoicingQuality
): VoicingEntry | undefined {
  const typeA = queryVoicings({ quality, style: "Rootless Type A" })
  const typeB = queryVoicings({ quality, style: "Rootless Type B" })

  if (typeA.length === 0 && typeB.length === 0) return undefined
  if (typeA.length === 0) return typeB[0]
  if (typeB.length === 0) return typeA[0]

  const lowestIntervalA = Math.min(...typeA[0].intervals)
  const lowestPitchA = rootMidi + lowestIntervalA

  if (lowestPitchA < GREEN_ZONE.SWEET_LOW) return typeB[0]
  return typeA[0]
}

export function autoSelectVoicing(
  root: string,
  quality: VoicingQuality,
  octave: number = 3,
  preferredStyle?: string
): VoicingEntry | undefined {
  if (preferredStyle) {
    const style = preferredStyle as any
    const matches = queryVoicings({ quality, style })
    if (matches.length > 0) return matches[0]
  }

  const rootMidi = noteToMidi(`${root}${octave}`)
  if (rootMidi == null) return undefined

  return selectByRange(rootMidi, quality)
}
