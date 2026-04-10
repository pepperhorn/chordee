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
    { key: "2-close", label: "2." },
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

/** The default preset to suggest as the FIRST volta in an empty region. */
export const DEFAULT_OPENING_PRESET: VoltaPreset = { key: "1", label: "1." }

/** The default preset to suggest as the second auto-created volta. */
export const DEFAULT_CLOSING_PRESET: VoltaPreset = { key: "2-close", label: "2." }
