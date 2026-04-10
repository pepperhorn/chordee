/**
 * Volta preset labels organized by position-in-region role.
 *
 * - "opening": valid as the FIRST volta in a repeat region
 * - "middle":  valid for endings between the opening and the closing
 * - "closing": valid as the LAST volta in a repeat region
 *
 * Named labels (Vamp, Going On, etc.) appear in all three columns since
 * they don't carry an implicit ordinal.
 *
 * `key` is the stable identifier used for uniqueness checks within a
 * region. `label` is the default display text. The user can edit the
 * label freely after picking a preset; the key stays bound so the
 * preset is still considered "in use" by the uniqueness rule.
 */

export interface VoltaPreset {
  key: string
  label: string
}

export type VoltaColumn = "opening" | "middle" | "closing"

const NAMED: VoltaPreset[] = [
  { key: "vamp", label: "Vamp" },
  { key: "goingOn", label: "Going On" },
  { key: "forSolos", label: "For Solos" },
  { key: "keepRepeating", label: "Keep Repeating" },
]

export const VOLTA_PRESETS: Record<VoltaColumn, VoltaPreset[]> = {
  opening: [
    { key: "1", label: "1." },
    { key: "1-2", label: "1., 2." },
    { key: "1-2-3", label: "1., 2., 3." },
    { key: "1-2-3-4", label: "1., 2., 3., 4." },
    ...NAMED,
  ],
  middle: [
    { key: "2", label: "2." },
    { key: "3", label: "3." },
    { key: "4", label: "4." },
    ...NAMED,
  ],
  closing: [
    // Same key as middle "2." so the uniqueness check (which compares
    // both keys and labels) prevents picking "2." in both columns at
    // once. Saved data using the legacy "2-close" key still resolves
    // to the same label so existing charts upgrade transparently.
    { key: "2", label: "2." },
    { key: "lastX", label: "Last X." },
    ...NAMED,
  ],
}

/** Find a preset by its key in any column. */
export function findVoltaPreset(key: string): VoltaPreset | undefined {
  for (const col of Object.values(VOLTA_PRESETS)) {
    const hit = col.find((p) => p.key === key)
    if (hit) return hit
  }
  return undefined
}

/**
 * Extract the ending ordinal numbers from a volta label so the
 * numbering logic can track which endings are "taken" in a region.
 *
 *   "1."          → [1]
 *   "2."          → [2]
 *   "1., 2."      → [1, 2]       (opening ending that covers passes 1 + 2)
 *   "1., 2., 3."  → [1, 2, 3]
 *   "Last X."     → []           (named, no ordinal)
 *   "Vamp"        → []
 *
 * `suggestNextPreset` uses this to offer "3." after the user picks
 * "1., 2." instead of silently repeating "2.".
 */
export function parseVoltaOrdinals(label: string): number[] {
  const matches = label.match(/\d+/g)
  if (!matches) return []
  return matches.map((m) => parseInt(m, 10)).filter((n) => !Number.isNaN(n))
}

/** Build a preset for a given ordinal, using an existing VOLTA_PRESETS
 *  entry when one matches, otherwise synthesizing a fresh `{ key, label }`. */
export function presetForOrdinal(n: number): VoltaPreset {
  const labelStr = `${n}.`
  for (const col of [VOLTA_PRESETS.middle, VOLTA_PRESETS.closing, VOLTA_PRESETS.opening]) {
    const match = col.find((p) => p.label === labelStr)
    if (match) return match
  }
  return { key: `${n}`, label: labelStr }
}

/** The default preset to suggest as the FIRST volta in an empty region. */
export const DEFAULT_OPENING_PRESET: VoltaPreset = { key: "1", label: "1." }

/** The default preset to suggest as the second auto-created ending. */
export const DEFAULT_CLOSING_PRESET: VoltaPreset = { key: "2", label: "2." }
