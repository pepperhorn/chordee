import type { VoicingVariant, VoicingQuality, VoicingEntry } from "./types"
import { VOICING_LIBRARY } from "./library"
import { voicingPitchClasses, findVoicing } from "./query"
import { normalizeToSharps } from "./spelling"

function isRootPosition(notes: string[], root: string): boolean {
  if (notes.length === 0) return false
  return normalizeToSharps(notes[0]) === normalizeToSharps(root)
}

/**
 * Generate voicing variants for cycling through on repeated plays.
 *
 * Sources: library voicings, inversions, algorithmic (open, drop 2, simplified).
 */
export function generateVariants(
  root: string,
  quality: VoicingQuality | undefined,
  resolvedNotes: string[],
  count: number = 6,
  options?: {
    styleHint?: string
    excludeIds?: string[]
  },
): VoicingVariant[] {
  const excludeIds = new Set(options?.excludeIds ?? [])
  const candidates: VoicingVariant[] = []
  const seenHashes = new Set<string>()

  const hash = (notes: string[]): string => notes.join(",")

  const addCandidate = (v: VoicingVariant): boolean => {
    const h = hash(v.notes)
    if (seenHashes.has(h) || excludeIds.has(v.id)) return false
    seenHashes.add(h)
    candidates.push(v)
    return true
  }

  // Slot A: default voicing
  let slotAEntry: VoicingEntry | undefined
  if (options?.styleHint && quality) {
    slotAEntry = findVoicing(quality, options.styleHint)
  }

  if (slotAEntry) {
    const notes = voicingPitchClasses(root, slotAEntry)
    addCandidate({
      id: slotAEntry.id,
      label: slotAEntry.tags.style,
      notes,
      handHints: slotAEntry.hands,
      source: "library",
    })
  } else {
    const defaultNotes = [...resolvedNotes]
    const label = isRootPosition(defaultNotes, root) ? "Root position" : `From ${defaultNotes[0]}`
    addCandidate({
      id: "root-position",
      label,
      notes: defaultNotes,
      source: "inversion",
    })
  }

  // Library voicings (one per style)
  if (quality) {
    const byStyle = new Map<string, VoicingEntry>()
    for (const entry of VOICING_LIBRARY) {
      if (entry.quality !== quality) continue
      if (excludeIds.has(entry.id)) continue
      if (slotAEntry && entry.id === slotAEntry.id) continue
      if (!byStyle.has(entry.tags.style)) {
        byStyle.set(entry.tags.style, entry)
      }
    }

    for (const [style, entry] of byStyle) {
      const notes = voicingPitchClasses(root, entry)
      addCandidate({
        id: entry.id,
        label: style,
        notes,
        handHints: entry.hands,
        source: "library",
      })
    }
  }

  // Inversions
  const INVERSION_LABELS = ["1st inv", "2nd inv", "3rd inv", "4th inv", "5th inv"]
  for (let inv = 1; inv < resolvedNotes.length && inv <= 5; inv++) {
    const rotated = [...resolvedNotes.slice(inv), ...resolvedNotes.slice(0, inv)]
    addCandidate({
      id: `inv-${inv}`,
      label: INVERSION_LABELS[inv - 1] ?? `${inv}th inv`,
      notes: rotated,
      source: "inversion",
    })
  }

  // Algorithmic variants
  if (resolvedNotes.length >= 3) {
    const open = [resolvedNotes[0], ...resolvedNotes.slice(2), resolvedNotes[1]]
    addCandidate({ id: "algo-open", label: "Open voicing", notes: open, source: "algorithmic" })

    const drop2 = [...resolvedNotes]
    const secondFromTop = drop2.splice(-2, 1)[0]
    drop2.unshift(secondFromTop)
    addCandidate({ id: "algo-drop2", label: "Drop 2", notes: drop2, source: "algorithmic" })
  }

  if (resolvedNotes.length >= 4) {
    const simplified = [resolvedNotes[0], resolvedNotes[1], resolvedNotes[resolvedNotes.length - 1]]
    addCandidate({ id: "algo-simplified", label: "Simplified", notes: simplified, source: "algorithmic" })
  }

  return candidates.slice(0, count)
}
